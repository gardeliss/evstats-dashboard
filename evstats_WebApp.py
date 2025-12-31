import json
import calendar
import datetime as dt

import requests
import pandas as pd
import streamlit as st


# -----------------------------
# Config
# -----------------------------
st.set_page_config(page_title="EVStats Web App", layout="wide")

MAKERS = ["total", "byd", "volvo" , "hyundai" , "tesla", "geely", "leapmotor" ]
BASE_DAILY = "https://evstats.gr/api/dailyBevModels/"
BASE_MAKER = "https://evstats.gr/api/makerMetrics"

TODAY = dt.date.today()


# -----------------------------
# Helpers
# -----------------------------
@st.cache_data(show_spinner=False)
def fetch_daily(date_str: str) -> dict | None:
    """Fetch daily data for a date YYYY-MM-DD. Returns JSON dict or None."""
    url = f"{BASE_DAILY}{date_str}"
    try:
        r = requests.get(url, timeout=30)
        if r.status_code != 200:
            return None
        data = r.json()
        if isinstance(data, dict):
            return data
        return None
    except Exception:
        return None


def extract_car_models(daily_json: dict) -> dict:
    """
    Extract car models counts from daily JSON.
    Works with the structure you posted:
    json['v1']['cars']['models'] (or v2)
    """
    if not isinstance(daily_json, dict):
        return {}

    for version in ("v2", "v1"):
        try:
            models = daily_json[version]["cars"]["models"]
            if isinstance(models, dict):
                return models
        except Exception:
            pass
    return {}


@st.cache_data(show_spinner=False)
def fetch_month_daily_aggregated(year: int, month: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Fetch all days of selected month up to TODAY (no future dates),
    aggregate models into one summary list.

    Returns:
      daily_df: rows = day, columns = model counts (sparse, wide)
      summary_df: model total counts for month (sorted desc)
    """
    last_day = calendar.monthrange(year, month)[1]
    start = dt.date(year, month, 1)
    end = dt.date(year, month, last_day)

    if start > TODAY:
        return pd.DataFrame(), pd.DataFrame()

    # clamp to today
    end = min(end, TODAY)

    aggregated = {}   # model -> total count
    daily_rows = []   # list of dicts with Date + model counts

    cur = start
    while cur <= end:
        date_str = cur.strftime("%Y-%m-%d")
        js = fetch_daily(date_str)

        models = extract_car_models(js) if js else {}
        row = {"Date": date_str}  # date only, no time
        for m, c in models.items():
            row[m] = c
            aggregated[m] = aggregated.get(m, 0) + int(c)

        daily_rows.append(row)
        cur += dt.timedelta(days=1)

    daily_df = pd.DataFrame(daily_rows).fillna(0)

    # Build summary (one list): model totals
    if aggregated:
        summary_df = (
            pd.DataFrame([{"Model": k, "Count": v} for k, v in aggregated.items()])
            .sort_values("Count", ascending=False)
            .reset_index(drop=True)
        )
    else:
        summary_df = pd.DataFrame(columns=["Model", "Count"])

    return daily_df, summary_df


@st.cache_data(show_spinner=False)
def fetch_maker_metrics(time_period: str) -> pd.DataFrame:
    """
    Fetch maker metrics for a given timePeriod in {"month","quarter","year"}.

    Expected response (per your hint):
      {
        "counts": ...,
        "data": { "tesla": [...], "byd": [...], ... }  OR sometimes nested,
        "periods": [...]
      }

    Output dataframe columns:
      Period, total, tesla, byd, leapmotor, geely
    Last periods:
      - month: last 18
      - quarter: last 12
      - year: last 10
    """
    if time_period not in {"month", "quarter", "year"}:
        return pd.DataFrame()

    params = {
        "filterMakers": json.dumps(MAKERS),
        "timePeriod": time_period
    }

    try:
        r = requests.get(BASE_MAKER, params=params, timeout=30)
        if r.status_code != 200:
            return pd.DataFrame()

        js = r.json()
        if not isinstance(js, dict):
            return pd.DataFrame()

        periods = js.get("periods", [])
        data = js.get("data", {})

        # If "data" is nested, try to unwrap common patterns
        # (this keeps it robust even if API changes slightly)
        if isinstance(data, dict) and "data" in data and isinstance(data["data"], dict):
            data = data["data"]

        if not isinstance(periods, list) or not isinstance(data, (dict, list)):
            return pd.DataFrame()

        # Build frame assuming data is dict of maker -> list aligned with periods
        df = pd.DataFrame({"Period": periods})

        if isinstance(data, dict):
            for maker in MAKERS:
                series = data.get(maker, [])
                if isinstance(series, list) and len(series) == len(periods):
                    df[maker] = series
                else:
                    # fallback: fill with NaN if missing/misaligned
                    df[maker] = [None] * len(periods)

        else:
            # If API ever returns list-of-rows, handle it (rare)
            # Expect each entry to be dict with maker keys
            # We'll map by index to periods
            for maker in MAKERS:
                col = []
                for i in range(len(periods)):
                    try:
                        entry = data[i]
                        col.append(entry.get(maker))
                    except Exception:
                        col.append(None)
                df[maker] = col

        # Drop fields you said you don't want (acc/bevshare) if they exist
        for col in ("acc", "bevshare"):
            if col in df.columns:
                df = df.drop(columns=[col])

        # Convert to numeric where possible
        for maker in MAKERS:
            if maker in df.columns:
                df[maker] = pd.to_numeric(df[maker], errors="coerce").fillna(0)

        # Keep only the last N periods
        if time_period == "month":
            df = df.tail(18)
        elif time_period == "quarter":
            df = df.tail(12)
        else:  # year
            df = df.tail(10)

        df = df.reset_index(drop=True)
        return df

    except Exception:
        return pd.DataFrame()


def maker_latest_list(df: pd.DataFrame) -> pd.DataFrame:
    """Return a small list/table with latest values for each maker."""
    if df.empty:
        return pd.DataFrame(columns=["Maker", "Latest"])

    latest = df.iloc[-1]
    out = []
    for maker in MAKERS:
        if maker in df.columns:
            out.append({"Maker": maker, "Latest": int(latest[maker])})
    return pd.DataFrame(out).sort_values("Latest", ascending=False).reset_index(drop=True)


# -----------------------------
# UI
# -----------------------------
st.title("EVStats – Monthly Daily Cars + Maker Metrics")




with st.sidebar:
    st.header("Inputs")
    year = st.number_input("Year", min_value=2013, max_value=TODAY.year, value=TODAY.year, step=1)
    month = st.number_input("Month", min_value=1, max_value=12, value=TODAY.month, step=1)

    st.caption("Daily fetch will stop at today's date (no future days).")

    fetch_clicked = st.button("🚀 Fetch data")

    


# -----------------------------
# Daily Data (Cars)
# -----------------------------
st.subheader("Daily Data (Cars)")

daily_df, summary_df = fetch_month_daily_aggregated(int(year), int(month))

if daily_df.empty:
    st.warning("No daily data found for that month (or it’s in the future).")
else:
    # Make tables smaller (you already use height=300)
    st.dataframe(daily_df, height=300, use_container_width=True)

    st.subheader("Monthly Summary (Cars) – One list (aggregated)")
    st.dataframe(summary_df, height=300, use_container_width=True)


# -----------------------------
# Maker Metrics
# -----------------------------

mm_month = fetch_maker_metrics("month")
mm_quarter = fetch_maker_metrics("quarter")
mm_year = fetch_maker_metrics("year")


st.subheader("🏭 Maker Metrics (Tables Only)")

def show_maker_table(df, title):
    st.subheader(title)

    if df.empty:
        st.info(f"No data for {title}")
        return

    # Sort so newest period is on top
    df_sorted = df.sort_values(by="Period", ascending=False)

    st.dataframe(
        df_sorted,
        height=350,
        use_container_width=True
    )


# Monthly
show_maker_table(mm_month, "Monthly Maker Metrics (Last 18 Months)")

# Quarterly
show_maker_table(mm_quarter, "Quarterly Maker Metrics (Last 18 Quarters)")

# Yearly
show_maker_table(mm_year, "Yearly Maker Metrics")


