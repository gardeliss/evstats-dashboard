// Configuration
const MAKERS = ["total", "byd", "tesla", "volvo", "hyundai", "geely", "leapmotor", "volkswagen", "bmw", "changan deepal"];

// CORS Proxy - Use one of these:
// Option 1: allOrigins (recommended)
const CORS_PROXY = "https://api.allorigins.win/raw?url=";
// Option 2: corsproxy.io (backup)
// const CORS_PROXY = "https://corsproxy.io/?";

const BASE_DAILY = "https://evstats.gr/api/dailyBevModels/";
const BASE_MAKER = "https://evstats.gr/api/makerMetrics";

const MONTH_NAMES = [
    "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
    "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"
];

// State
let dailyData = [];
let summaryData = [];
let makerMonthData = null;
let makerQuarterData = null;
let makerYearData = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeDateInputs();
    setupEventListeners();
    fetchMakerMetrics();
});

function initializeDateInputs() {
    const today = new Date();
    const yearInput = document.getElementById('year');
    const monthInput = document.getElementById('month');
    
    yearInput.value = today.getFullYear();
    yearInput.max = today.getFullYear();
    monthInput.value = today.getMonth() + 1;
}

function setupEventListeners() {
    document.getElementById('fetchBtn').addEventListener('click', fetchDailyData);
    document.getElementById('retryBtn').addEventListener('click', () => {
        hideError();
        fetchDailyData();
    });
    
    // Period tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const period = e.target.dataset.period;
            switchMakerTab(period);
        });
    });
}

// API Calls
async function fetchDaily(dateStr) {
    try {
        const url = `${CORS_PROXY}${encodeURIComponent(BASE_DAILY + dateStr)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error(`API Error: ${response.status} - ${dateStr}`);
            return null;
        }
        
        const data = await response.json();
        console.log(`✓ Fetched data for ${dateStr}:`, data);
        return data;
    } catch (error) {
        console.error('Fetch error for', dateStr, ':', error);
        return null;
    }
}

function extractCarModels(dailyJson) {
    if (!dailyJson || typeof dailyJson !== 'object') {
        return {};
    }
    
    // Try v2 first, then v1
    for (const version of ['v2', 'v1']) {
        try {
            const models = dailyJson[version]?.cars?.models;
            if (models && typeof models === 'object') {
                return models;
            }
        } catch (e) {
            continue;
        }
    }
    
    return {};
}

async function fetchMonthDailyAggregated(year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const startDate = new Date(year, month - 1, 1);
    
    // Don't fetch future months
    if (startDate > today) {
        return { daily: [], summary: [] };
    }
    
    const aggregated = {};
    const dailyRows = [];
    
    showLoading();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        
        // Stop at today
        if (currentDate > today) {
            break;
        }
        
        const dateStr = formatDate(currentDate);
        const data = await fetchDaily(dateStr);
        const models = extractCarModels(data);
        
        const row = { date: dateStr };
        
        for (const [model, count] of Object.entries(models)) {
            row[model] = parseInt(count) || 0;
            aggregated[model] = (aggregated[model] || 0) + (parseInt(count) || 0);
        }
        
        dailyRows.push(row);
    }
    
    // Create summary
    const summary = Object.entries(aggregated)
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count);
    
    hideLoading();
    
    return { daily: dailyRows, summary };
}

async function fetchMakerMetrics() {
    showLoading();
    
    try {
        const [monthData, quarterData, yearData] = await Promise.all([
            fetchMakerData('month'),
            fetchMakerData('quarter'),
            fetchMakerData('year')
        ]);
        
        makerMonthData = monthData;
        makerQuarterData = quarterData;
        makerYearData = yearData;
        
        renderMakerTable('makerMonthTable', makerMonthData);
        renderMakerTable('makerQuarterTable', makerQuarterData);
        renderMakerTable('makerYearTable', makerYearData);
        
        hideLoading();
    } catch (error) {
        console.error('Error fetching maker metrics:', error);
        hideLoading();
    }
}

async function fetchMakerData(timePeriod) {
    const params = new URLSearchParams({
        filterMakers: JSON.stringify(MAKERS),
        timePeriod: timePeriod
    });
    
    try {
        const apiUrl = `${BASE_MAKER}?${params}`;
        const url = `${CORS_PROXY}${encodeURIComponent(apiUrl)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            return { periods: [], data: {} };
        }
        
        const json = await response.json();
        
        let periods = json.periods || [];
        let data = json.data || {};
        
        // Unwrap nested data if needed
        if (data.data && typeof data.data === 'object') {
            data = data.data;
        }
        
        // Limit periods
        const limit = timePeriod === 'month' ? 18 : timePeriod === 'quarter' ? 12 : 10;
        periods = periods.slice(-limit);
        
        // Slice data arrays to match
        for (const maker of MAKERS) {
            if (Array.isArray(data[maker])) {
                data[maker] = data[maker].slice(-limit);
            }
        }
        
        return { periods, data };
    } catch (error) {
        console.error('Fetch maker error:', error);
        return { periods: [], data: {} };
    }
}

// UI Functions
async function fetchDailyData() {
    const year = parseInt(document.getElementById('year').value);
    const month = parseInt(document.getElementById('month').value);
    
    hideError();
    
    const result = await fetchMonthDailyAggregated(year, month);
    
    if (result.daily.length === 0) {
        showError('Δεν βρέθηκαν δεδομένα για τον επιλεγμένο μήνα (ή είναι μελλοντικός μήνας)');
        return;
    }
    
    dailyData = result.daily;
    summaryData = result.summary;
    
    renderDailySection(year, month);
}

function renderDailySection(year, month) {
    // Show section
    document.getElementById('dailySection').style.display = 'block';
    
    // Update period badge
    document.getElementById('selectedPeriod').textContent = `${MONTH_NAMES[month - 1]} ${year}`;
    
    // Update stats
    document.getElementById('totalDays').textContent = dailyData.length;
    
    const uniqueModels = new Set();
    dailyData.forEach(day => {
        Object.keys(day).forEach(key => {
            if (key !== 'date') uniqueModels.add(key);
        });
    });
    document.getElementById('totalModels').textContent = uniqueModels.size;
    
    const totalRegs = summaryData.reduce((sum, item) => sum + item.count, 0);
    document.getElementById('totalRegistrations').textContent = totalRegs.toLocaleString('el-GR');
    
    // Render tables
    renderDailyTable();
    renderSummaryTable();
}

function renderDailyTable() {
    const table = document.getElementById('dailyTable');
    const thead = table.querySelector('thead tr');
    const tbody = table.querySelector('tbody');
    
    // Clear
    thead.innerHTML = '<th>Ημερομηνία</th>';
    tbody.innerHTML = '';
    
    if (dailyData.length === 0) return;
    
    // Get all unique models
    const models = new Set();
    dailyData.forEach(day => {
        Object.keys(day).forEach(key => {
            if (key !== 'date') models.add(key);
        });
    });
    
    // Add headers
    models.forEach(model => {
        const th = document.createElement('th');
        th.textContent = model;
        thead.appendChild(th);
    });
    
    // Add rows (reverse to show newest first)
    const reversedData = [...dailyData].reverse();
    reversedData.forEach(day => {
        const tr = document.createElement('tr');
        
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDateDisplay(day.date);
        tr.appendChild(dateCell);
        
        models.forEach(model => {
            const td = document.createElement('td');
            td.textContent = day[model] || 0;
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
}

function renderSummaryTable() {
    const tbody = document.getElementById('summaryTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    summaryData.forEach(item => {
        const tr = document.createElement('tr');
        
        const modelCell = document.createElement('td');
        modelCell.textContent = item.model;
        tr.appendChild(modelCell);
        
        const countCell = document.createElement('td');
        countCell.textContent = item.count.toLocaleString('el-GR');
        tr.appendChild(countCell);
        
        tbody.appendChild(tr);
    });
}

function renderMakerTable(tableId, data) {
    const table = document.getElementById(tableId);
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    
    if (!data || !data.periods || data.periods.length === 0) {
        thead.innerHTML = '<tr><th>Δεν υπάρχουν δεδομένα</th></tr>';
        tbody.innerHTML = '';
        return;
    }
    
    // Create headers
    thead.innerHTML = '<tr><th>Περίοδος</th></tr>';
    const headerRow = thead.querySelector('tr');
    
    MAKERS.forEach(maker => {
        const th = document.createElement('th');
        th.textContent = capitalizeFirst(maker);
        headerRow.appendChild(th);
    });
    
    // Create rows (reverse to show newest first)
    tbody.innerHTML = '';
    const reversedPeriods = [...data.periods].reverse();
    
    reversedPeriods.forEach((period, idx) => {
        const reverseIdx = data.periods.length - 1 - idx;
        const tr = document.createElement('tr');
        
        const periodCell = document.createElement('td');
        periodCell.textContent = period;
        tr.appendChild(periodCell);
        
        MAKERS.forEach(maker => {
            const td = document.createElement('td');
            const value = data.data[maker]?.[reverseIdx] || 0;
            td.textContent = value.toLocaleString('el-GR');
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
}

function switchMakerTab(period) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.period === period) {
            btn.classList.add('active');
        }
    });
    
    // Update content
    document.querySelectorAll('.maker-data').forEach(div => {
        div.classList.remove('active');
    });
    
    const targetId = `maker${capitalizeFirst(period)}`;
    document.getElementById(targetId).classList.add('active');
}

// Helper Functions
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showLoading() {
    document.getElementById('loadingState').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorState').style.display = 'block';
}

function hideError() {
    document.getElementById('errorState').style.display = 'none';
}
