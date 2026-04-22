// Configuration
const MAKERS = ["total", "byd", "tesla", "volvo", "hyundai", "geely", "leapmotor", "volkswagen", "bmw", "changan deepal"];

// CORS Proxy
const CORS_PROXY = "https://corsproxy.io/?";

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
    displayCurrentMonth();
    setupEventListeners();
    // Load maker metrics on page load
    fetchMakerMetrics();
});

function displayCurrentMonth() {
    const today = new Date();
    const month = MONTH_NAMES[today.getMonth()];
    const year = today.getFullYear();
    document.getElementById('currentPeriod').textContent = `${month} ${year}`;
}

function setupEventListeners() {
    document.getElementById('fetchBtn').addEventListener('click', fetchCurrentMonthData);
    document.getElementById('retryBtn').addEventListener('click', () => {
        hideError();
        fetchCurrentMonthData();
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
async function fetchDaily(dateStr, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const url = `${CORS_PROXY}${encodeURIComponent(BASE_DAILY + dateStr)}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(15000)
            });
            
            if (!response.ok) {
                if (attempt < retries) {
                    console.warn(`⚠️ Attempt ${attempt + 1} failed for ${dateStr}, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
                console.error(`API Error: ${response.status} - ${dateStr}`);
                return null;
            }
            
            const data = await response.json();
            console.log(`✓ Fetched data for ${dateStr}`);
            return data;
        } catch (error) {
            if (attempt < retries) {
                console.warn(`⚠️ Attempt ${attempt + 1} error for ${dateStr}, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            console.error('Fetch error for', dateStr, ':', error.message);
            return null;
        }
    }
    return null;
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

async function fetchCurrentMonthData() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // JavaScript months are 0-indexed
    
    hideError();
    showLoading();
    
    const daysInMonth = new Date(year, month, 0).getDate();
    const aggregated = {};
    const dailyRows = [];
    
    let totalDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        if (currentDate <= today) totalDays++;
    }
    
    let fetchedDays = 0;
    
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
            const numCount = parseInt(count) || 0;
            row[model] = numCount;
            // Aggregate: sum all counts for the month
            aggregated[model] = (aggregated[model] || 0) + numCount;
        }
        
        dailyRows.push(row);
        
        // Update progress
        fetchedDays++;
        const loadingText = document.querySelector('.loading-state p');
        if (loadingText) {
            loadingText.textContent = `Φόρτωση δεδομένων... (${fetchedDays}/${totalDays} ημέρες)`;
        }
    }
    
    hideLoading();
    
    if (dailyRows.length === 0) {
        showError('Δεν βρέθηκαν δεδομένα για τον τρέχοντα μήνα');
        return;
    }
    
    dailyData = dailyRows;
    
    // Create summary sorted by count (highest first)
    summaryData = Object.entries(aggregated)
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count);
    
    renderDailySection(year, month);
}

async function fetchMakerMetrics() {
    showLoading();
    
    try {
        const [monthData, quarterData, yearData] = await Promise.all([
            fetchMakerData('month', 18),
            fetchMakerData('quarter', 12),
            fetchMakerData('year', 10)
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

async function fetchMakerData(timePeriod, limitPeriods) {
    const params = new URLSearchParams({
        filterMakers: JSON.stringify(MAKERS),
        timePeriod: timePeriod
    });
    
    try {
        const apiUrl = `${BASE_MAKER}?${params.toString()}`;
        console.log(`🔍 Fetching ${timePeriod} maker data...`);
        
        const url = `${CORS_PROXY}${encodeURIComponent(apiUrl)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(20000)
        });
        
        console.log(`📊 Maker ${timePeriod} response status:`, response.status);
        
        if (!response.ok) {
            console.error(`❌ Maker ${timePeriod} API error:`, response.status);
            return { periods: [], data: {} };
        }
        
        const json = await response.json();
        console.log(`✓ Maker ${timePeriod} data received`);
        
        let periods = json.periods || [];
        let data = json.data || {};
        
        // Unwrap nested data if needed
        if (data.data && typeof data.data === 'object') {
            data = data.data;
        }
        
        // Get last N periods
        periods = periods.slice(-limitPeriods);
        
        // Slice data arrays to match
        for (const maker of MAKERS) {
            if (Array.isArray(data[maker])) {
                data[maker] = data[maker].slice(-limitPeriods);
            }
        }
        
        console.log(`✅ Maker ${timePeriod} processed: ${periods.length} periods`);
        return { periods, data };
    } catch (error) {
        console.error(`❌ Fetch maker ${timePeriod} error:`, error.message);
        return { periods: [], data: {} };
    }
}

// UI Functions
function renderDailySection(year, month) {
    // Show section
    document.getElementById('dailySection').style.display = 'block';
    
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
    
    const modelArray = Array.from(models).sort();
    
    // Add headers
    modelArray.forEach(model => {
        const th = document.createElement('th');
        th.textContent = model;
        thead.appendChild(th);
    });
    
    // Add rows (reverse to show newest first - most recent on top)
    const reversedData = [...dailyData].reverse();
    reversedData.forEach(day => {
        const tr = document.createElement('tr');
        
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDateDisplay(day.date);
        dateCell.style.fontWeight = '600';
        tr.appendChild(dateCell);
        
        modelArray.forEach(model => {
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
    
    // Summary is already sorted (highest first)
    summaryData.forEach((item, index) => {
        const tr = document.createElement('tr');
        
        const rankCell = document.createElement('td');
        rankCell.textContent = index + 1;
        rankCell.style.fontWeight = '700';
        rankCell.style.color = 'var(--primary-light)';
        tr.appendChild(rankCell);
        
        const modelCell = document.createElement('td');
        modelCell.textContent = item.model;
        tr.appendChild(modelCell);
        
        const countCell = document.createElement('td');
        countCell.textContent = item.count.toLocaleString('el-GR');
        countCell.style.fontWeight = '600';
        tr.appendChild(countCell);
        
        tbody.appendChild(tr);
    });
}

function renderMakerTable(tableId, data) {
    const table = document.getElementById(tableId);
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    
    if (!data || !data.periods || data.periods.length === 0) {
        thead.innerHTML = '<tr><th colspan="11" style="text-align: center; color: var(--warning);">⚠️ Δεν υπάρχουν δεδομένα</th></tr>';
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
    
    // Create rows - REVERSED to show newest first (most recent on top)
    tbody.innerHTML = '';
    const reversedPeriods = [...data.periods].reverse();
    
    reversedPeriods.forEach((period, idx) => {
        const reverseIdx = data.periods.length - 1 - idx;
        const tr = document.createElement('tr');
        
        const periodCell = document.createElement('td');
        periodCell.textContent = period;
        periodCell.style.fontWeight = '600';
        tr.appendChild(periodCell);
        
        MAKERS.forEach(maker => {
            const td = document.createElement('td');
            const value = data.data[maker]?.[reverseIdx] || 0;
            td.textContent = Math.round(value).toLocaleString('el-GR');
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
