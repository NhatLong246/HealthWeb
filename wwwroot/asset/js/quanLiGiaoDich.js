// Transaction Management JavaScript

// State Management
let transactionsData = []; // Data already filtered by server
let transactionSummary = null;
let revenueChartData = [];
let currentTransactionPage = 1;
const transactionsPerPage = 20;
let isLoadingData = true; // Set to true initially to show loading state
let loadError = null;
let hasLoadedOnce = false;
let currentAbortController = null;
const DATA_ENDPOINT = '/Admin/QuanLiGiaoDich/Data';

// Date Range Filter
const DATE_RANGE_PRESETS = {
    all: {
        label: 'Tất cả thời gian',
        description: 'Không lọc theo ngày',
        quick: true,
        getRange: () => ({ start: null, end: null })
    },
    today: {
        label: 'Hôm nay',
        quick: true,
        getRange: () => {
            const today = new Date();
            return {
                start: startOfDay(today),
                end: endOfDay(today)
            };
        }
    },
    last7: {
        label: '7 ngày gần đây',
        quick: true,
        getRange: () => {
            const now = new Date();
            const end = endOfDay(now);
            const startReference = new Date(now);
            startReference.setDate(now.getDate() - 6);
            const start = startOfDay(startReference);
            return { start, end };
        }
    },
    last30: {
        label: '30 ngày gần đây',
        quick: true,
        getRange: () => {
            const now = new Date();
            const end = endOfDay(now);
            const startReference = new Date(now);
            startReference.setDate(now.getDate() - 29);
            const start = startOfDay(startReference);
            return { start, end };
        }
    },
    thisMonth: {
        label: 'Tháng này',
        quick: true,
        getRange: () => {
            const now = new Date();
            const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
            const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
            return { start, end };
        }
    },
    lastMonth: {
        label: 'Tháng trước',
        quick: true,
        getRange: () => {
            const now = new Date();
            const start = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
            const end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
            return { start, end };
        }
    },
    custom: {
        label: 'Tùy chỉnh',
        quick: false,
        getRange: (start, end) => {
            const normalizedStart = start ? startOfDay(start) : null;
            const normalizedEnd = end ? endOfDay(end) : null;
            return {
                start: clampToToday(normalizedStart, true),
                end: clampToToday(normalizedEnd, false)
            };
        }
    }
};
let dateFilterPreset = 'all';
let dateFilterRange = { start: null, end: null };
let isDateRangeDropdownOpen = false;
let hasDateFilterSelection = false;
let dateRangeErrorTimeout = null;

// Payment Method Mapping (Payment methods: Momo, ZaloPay, VNPay - no mapping needed)
// These are the same in Vietnamese and English, so we just use them directly
const PAYMENT_METHODS = ['Momo', 'ZaloPay', 'VNPay'];

// Date Helper Functions
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

function clampToToday(date, isStart = false) {
    if (!date) return null;
    const candidate = new Date(date);
    const todayEnd = endOfDay(new Date());
    if (candidate.getTime() > todayEnd.getTime()) {
        return isStart ? startOfDay(todayEnd) : todayEnd;
    }
    return candidate;
}

function formatDateInputValue(date) {
    if (!date) return '';
    const normalized = new Date(date);
    const year = normalized.getFullYear();
    const month = String(normalized.getMonth() + 1).padStart(2, '0');
    const day = String(normalized.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function
function el(id) {
    return document.getElementById(id);
}

// Helper function to pick value from multiple possible keys
function pickValue(source, keys, fallback = undefined) {
    if (!source) return fallback;

    for (const key of keys) {
        if (source[key] !== undefined) {
            return source[key];
        }
    }

    // Try case-insensitive lookup
    const lowerLookup = Object.create(null);
    for (const key of Object.keys(source)) {
        lowerLookup[key.toLowerCase()] = source[key];
    }

    for (const key of keys) {
        const lowerKey = key.toLowerCase();
        if (lowerLookup[lowerKey] !== undefined) {
            return lowerLookup[lowerKey];
        }
    }

    return fallback;
}

// Normalize transaction data from API
function normalizeTransaction(raw) {
    if (!raw) return null;
    const get = (keys, fallback) => pickValue(raw, keys, fallback);
    return {
        transactionId: get(['transactionId', 'TransactionId'], ''),
        bookingId: get(['bookingId', 'BookingId'], ''),
        customerId: get(['customerId', 'CustomerId'], ''),
        customerName: get(['customerName', 'CustomerName'], ''),
        ptId: get(['ptId', 'PTId', 'ptid', 'PTid'], ''),
        ptName: get(['ptName', 'PTName', 'ptname', 'PTname'], ''),
        amount: get(['amount', 'Amount'], 0),
        commission: get(['commission', 'Commission'], 0),
        ptRevenue: get(['ptRevenue', 'PTRevenue', 'ptrevenue', 'PTrevenue'], 0),
        paymentStatus: get(['paymentStatus', 'PaymentStatus'], 'Pending'),
        paymentMethod: get(['paymentMethod', 'PaymentMethod'], ''),
        transactionDate: get(['transactionDate', 'TransactionDate'], null),
        serviceName: get(['serviceName', 'ServiceName'], ''),
        bookingType: get(['bookingType', 'BookingType'], ''),
        bookingDateTime: get(['bookingDateTime', 'BookingDateTime'], null),
        bookingStatus: get(['bookingStatus', 'BookingStatus'], '')
    };
}

// Normalize summary data
function normalizeSummary(raw) {
    if (!raw) return null;
    const get = (keys, fallback) => pickValue(raw, keys, fallback);
    return {
        totalRevenue: get(['totalRevenue', 'TotalRevenue'], 0),
        totalCommission: get(['totalCommission', 'TotalCommission'], 0),
        totalPTRevenue: get(['totalPTRevenue', 'TotalPTRevenue'], 0),
        totalTransactions: get(['totalTransactions', 'TotalTransactions'], 0),
        averageTransactionAmount: get(['averageTransactionAmount', 'AverageTransactionAmount'], 0)
    };
}

// Load transactions from server
async function loadTransactionsFromServer(forceReload = false) {
    // Cancel previous request if still in progress
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }

    if (isLoadingData && !forceReload) {
        console.warn('⚠️ Data fetch already in progress, skipping duplicate request.');
        return;
    }

    if (!forceReload && hasLoadedOnce) {
        console.log('ℹ️ Transactions data already loaded, skipping fetch.');
        return;
    }

    console.log('📡 Fetching transactions data from server...');
    isLoadingData = true;
    loadError = null;

    // Create new AbortController for this request
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    renderTransactionsTable();

    try {
        // Get filter values
        const search = el('transaction-search')?.value || '';
        // Payment methods: Momo, ZaloPay, VNPay (no mapping needed)
        const paymentMethod = el('filter-payment-method')?.value || '';
        
        // Get date range from date filter
        const { start: dateFrom, end: dateTo } = getActiveDateRange();
        
        // Build query parameters
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (paymentMethod) params.append('paymentMethod', paymentMethod);
        if (dateFrom) {
            params.append('dateFrom', formatDateInputValue(dateFrom));
        }
        if (dateTo) {
            params.append('dateTo', formatDateInputValue(dateTo));
        }

        const url = `${DATA_ENDPOINT}${params.toString() ? '?' + params.toString() : ''}`;
        
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json'
            },
            signal: signal
        });

        if (!response.ok) {
            throw new Error(`Máy chủ phản hồi mã ${response.status}`);
        }

        const payload = await response.json();
        console.log('📥 Payload giao dịch nhận được:', payload);
        
        const transactionsRaw = Array.isArray(payload?.transactions) 
            ? payload.transactions 
            : Array.isArray(payload?.Transactions) 
                ? payload.Transactions 
                : [];
        const summaryRaw = payload?.summary ?? payload?.Summary ?? null;
        const chartDataRaw = Array.isArray(payload?.revenueChartData)
            ? payload.revenueChartData
            : Array.isArray(payload?.RevenueChartData)
                ? payload.RevenueChartData
                : [];

        transactionsData = transactionsRaw.map(normalizeTransaction).filter(Boolean);
        transactionSummary = normalizeSummary(summaryRaw);
        revenueChartData = chartDataRaw;
        currentTransactionPage = 1;
        hasLoadedOnce = true;

        console.log(`✅ Đã tải ${transactionsData.length} giao dịch từ máy chủ.`);
    } catch (error) {
        // Don't log error if request was aborted
        if (error.name === 'AbortError') {
            console.log('ℹ️ Request was cancelled.');
            return;
        }
        console.error('❌ Không thể tải dữ liệu giao dịch:', error);
        loadError = error?.message || 'Không thể tải dữ liệu giao dịch.';
        transactionsData = [];
        transactionSummary = null;
        revenueChartData = [];
    } finally {
        isLoadingData = false;
        currentAbortController = null;
        updateTransactionKPIs();
        renderTransactionsTable();
        renderRevenueChart();
    }
}

// Reload transactions data
function reloadTransactionsData() {
    loadTransactionsFromServer(true);
}

// Modal Functions
function openModal(modalId) {
    const modal = el(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = el(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal on overlay click
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        const modal = e.target.closest('.modal');
        if (modal) {
            closeModal(modal.id);
        }
    }
});

// Show Notification
function showNotification(message, type = 'info') {
    const bgColor = type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#667eea';
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Format currency
function formatCurrency(amount) {
    if (amount == null || amount === undefined || isNaN(amount)) {
        return '0 ₫';
    }
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(Number(amount));
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
    const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
    } catch {
        return '-';
    }
}

// Get status badge class
function getStatusBadgeClass(status) {
    const statusMap = {
        'Pending': 'warning',
        'Completed': 'success',
        'Hoàn thành': 'success',
        'Failed': 'danger',
        'Refunded': 'danger',
        'Đã hoàn tiền': 'danger'
    };
    const normalizedStatus = (status || '').toLowerCase();
    if (normalizedStatus.includes('completed') || normalizedStatus.includes('hoàn thành')) return 'success';
    if (normalizedStatus.includes('pending') || normalizedStatus.includes('đang xử lý')) return 'warning';
    if (normalizedStatus.includes('failed') || normalizedStatus.includes('thất bại') || normalizedStatus.includes('refunded') || normalizedStatus.includes('hoàn tiền')) return 'danger';
    return 'secondary';
}

// Get status text
function getStatusText(status) {
    const statusMap = {
        'Pending': 'Đang xử lý',
        'Completed': 'Hoàn thành',
        'Hoàn thành': 'Hoàn thành',
        'Failed': 'Thất bại',
        'Refunded': 'Đã hoàn tiền',
        'Đã hoàn tiền': 'Đã hoàn tiền'
    };
    return statusMap[status] || status || 'N/A';
}

// Get payment method text (Payment methods: Momo, ZaloPay, VNPay - no mapping needed)
function getPaymentMethodText(method) {
    if (!method) return 'N/A';
    return method;
}

// Render transactions table
function renderTransactionsTable() {
    const tbody = el('transactions-table-body');
    if (!tbody) return;

    if (isLoadingData) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #667eea; margin-bottom: 20px; display: block;"></i>
                    <p style="color: #7f8c8d; font-size: 16px; margin: 0;">Đang tải dữ liệu giao dịch...</p>
                </td>
            </tr>
        `;
        return;
    }

    if (loadError) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f56565; margin-bottom: 20px; display: block;"></i>
                    <p style="color: #7f8c8d; font-size: 16px; margin-bottom: 20px;">${loadError}</p>
                    <button class="btn-primary" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;" onclick="reloadTransactionsData()">Thử lại</button>
                </td>
            </tr>
        `;
        updateTransactionPagination();
        return;
    }
    
    const start = (currentTransactionPage - 1) * transactionsPerPage;
    const end = start + transactionsPerPage;
    const paginatedTransactions = transactionsData.slice(start, end);
    
    if (paginatedTransactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-receipt" style="font-size: 48px; color: #ccc; margin-bottom: 20px; display: block;"></i>
                    <p style="color: #999; font-size: 16px; margin: 0;">Không tìm thấy giao dịch nào</p>
                </td>
            </tr>
        `;
        updateTransactionPagination();
        return;
    }
    
    tbody.innerHTML = paginatedTransactions.map(txn => {
        const statusClass = getStatusBadgeClass(txn.paymentStatus);
        const statusText = getStatusText(txn.paymentStatus);
        
        return `
        <tr>
            <td><strong>${txn.transactionId || '-'}</strong></td>
            <td>
                <div style="display: flex; flex-direction: column;">
                    <span>${txn.customerName || 'N/A'}</span>
                    <small style="color: #999; font-size: 11px;">${txn.customerId || '-'}</small>
                </div>
            </td>
            <td>
                ${txn.ptName ? `
                    <div style="display: flex; flex-direction: column;">
                        <span>${txn.ptName}</span>
                        <small style="color: #999; font-size: 11px;">${txn.ptId || '-'}</small>
                    </div>
                ` : '<span style="color: #999;">-</span>'}
            </td>
            <td><strong>${formatCurrency(txn.amount)}</strong></td>
            <td>${formatCurrency(txn.commission || 0)}</td>
            <td>${txn.ptRevenue ? formatCurrency(txn.ptRevenue) : '-'}</td>
            <td>${getPaymentMethodText(txn.paymentMethod)}</td>
            <td>${formatDate(txn.transactionDate)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewTransactionDetail('${txn.transactionId}')" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
    
    updateTransactionPagination();
}

// Apply transaction filters - reload from server with new filters
async function applyTransactionFilters() {
    currentTransactionPage = 1;
    hasLoadedOnce = false;
    isLoadingData = true;
    renderTransactionsTable();
    await loadTransactionsFromServer(true);
}

// Reset transaction filters
function resetTransactionFilters() {
    if (el('transaction-search')) el('transaction-search').value = '';
    if (el('filter-payment-method')) el('filter-payment-method').value = '';
    setDateFilterRange(null, null, 'all', false);
    closeDateRangeDropdown();
    applyTransactionFilters();
}

// Get active date range
function getActiveDateRange() {
    return { ...dateFilterRange };
}

// Update transaction KPIs
function updateTransactionKPIs() {
    const summary = transactionSummary || {
        totalRevenue: 0,
        totalCommission: 0,
        totalPTRevenue: 0,
        totalTransactions: 0,
        averageTransactionAmount: 0
    };
    
    if (el('total-revenue-kpi')) {
        const revenueText = formatCurrency(summary.totalRevenue).replace('₫', '').trim();
        el('total-revenue-kpi').textContent = revenueText;
    }
    if (el('total-commission-kpi')) {
        const commissionText = formatCurrency(summary.totalCommission).replace('₫', '').trim();
        el('total-commission-kpi').textContent = commissionText;
    }
    if (el('total-pt-revenue-kpi')) {
        const ptRevenueText = formatCurrency(summary.totalPTRevenue).replace('₫', '').trim();
        el('total-pt-revenue-kpi').textContent = ptRevenueText;
    }
    if (el('total-transactions-kpi')) {
        el('total-transactions-kpi').textContent = summary.totalTransactions || 0;
    }
}

// Render revenue chart
function renderRevenueChart() {
    const chartContainer = el('revenue-chart');
    if (!chartContainer) return;
    
    if (isLoadingData) {
        chartContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #667eea; margin-bottom: 20px;"></i>
                <p style="color: #7f8c8d; font-size: 16px;">Đang tải dữ liệu...</p>
            </div>
        `;
        return;
    }

    const summary = transactionSummary || {
        totalRevenue: 0,
        totalCommission: 0,
        totalPTRevenue: 0,
        totalTransactions: 0,
        averageTransactionAmount: 0
    };
    
    const totalRevenue = summary.totalRevenue || 0;
    const totalCommission = summary.totalCommission || 0;
    const totalPTRevenue = summary.totalPTRevenue || 0;
    const totalTransactions = summary.totalTransactions || 0;
    const avgRevenue = summary.averageTransactionAmount || 0;
    const commissionPercent = totalRevenue > 0 ? Math.round((totalCommission / totalRevenue) * 100) : 0;
    const ptRevenuePercent = totalRevenue > 0 ? Math.round((totalPTRevenue / totalRevenue) * 100) : 0;
    
    chartContainer.innerHTML = `
        <div class="revenue-chart-bars">
            <div class="revenue-bar-item">
                <div class="revenue-bar-label">
                    <span>Tổng doanh thu thuê PT</span>
                    <span class="revenue-bar-value">${formatCurrency(totalRevenue)}</span>
                </div>
                <div class="revenue-bar">
                    <div class="revenue-bar-fill" style="width: 100%; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                        <span class="revenue-bar-percent">100%</span>
                    </div>
                </div>
            </div>
            <div class="revenue-bar-item">
                <div class="revenue-bar-label">
                    <span>Tổng hoa hồng App</span>
                    <span class="revenue-bar-value">${formatCurrency(totalCommission)}</span>
                </div>
                <div class="revenue-bar">
                    <div class="revenue-bar-fill" style="width: ${commissionPercent}%; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                        <span class="revenue-bar-percent">${commissionPercent}%</span>
                    </div>
                </div>
            </div>
            <div class="revenue-bar-item">
                <div class="revenue-bar-label">
                    <span>Doanh thu PT</span>
                    <span class="revenue-bar-value">${formatCurrency(totalPTRevenue)}</span>
                </div>
                <div class="revenue-bar">
                    <div class="revenue-bar-fill" style="width: ${ptRevenuePercent}%; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                        <span class="revenue-bar-percent">${ptRevenuePercent}%</span>
                    </div>
                </div>
            </div>
            <div class="revenue-stats-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 20px;">
                <div class="revenue-stat-item" style="background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); padding: 16px; border-radius: 12px; border: 2px solid #f0f0f0;">
                    <div style="font-size: 12px; font-weight: 600; color: #999; text-transform: uppercase; margin-bottom: 8px;">Số giao dịch</div>
                    <div style="font-size: 24px; font-weight: 700; color: #4facfe;">${totalTransactions}</div>
                </div>
                <div class="revenue-stat-item" style="background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); padding: 16px; border-radius: 12px; border: 2px solid #f0f0f0;">
                    <div style="font-size: 12px; font-weight: 600; color: #999; text-transform: uppercase; margin-bottom: 8px;">Doanh thu TB</div>
                    <div style="font-size: 24px; font-weight: 700; color: #43e97b;">${formatCurrency(avgRevenue)}</div>
                </div>
            </div>
        </div>
    `;
}

// View transaction detail
async function viewTransactionDetail(transactionId) {
    const content = el('transaction-detail-content');
    if (!content) return;
    
    // Show loading state
    content.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #667eea; margin-bottom: 20px;"></i>
            <p style="color: #7f8c8d; font-size: 16px;">Đang tải chi tiết giao dịch...</p>
        </div>
    `;
    
    openModal('modal-transaction-detail');
    
    try {
        const response = await fetch(`/Admin/QuanLiGiaoDich/${encodeURIComponent(transactionId)}/Detail`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Máy chủ phản hồi mã ${response.status}`);
        }

        const payload = await response.json();
        
        // Get transaction from payload - support both nested and flat structure
        const transactionRaw = pickValue(payload, ['transaction', 'Transaction']) || payload;
        const bookingRaw = pickValue(payload, ['booking', 'Booking']) || null;
        
        const transaction = normalizeTransaction(transactionRaw);
        
    if (!transaction) {
            throw new Error('Không tìm thấy dữ liệu giao dịch');
        }
        
        // Normalize booking data
        const booking = bookingRaw ? {
            bookingId: pickValue(bookingRaw, ['bookingId', 'BookingId'], ''),
            bookingDateTime: pickValue(bookingRaw, ['bookingDateTime', 'BookingDateTime'], null),
            bookingType: pickValue(bookingRaw, ['bookingType', 'BookingType'], ''),
            status: pickValue(bookingRaw, ['status', 'Status'], ''),
            notes: pickValue(bookingRaw, ['notes', 'Notes'], ''),
            allowHealthView: pickValue(bookingRaw, ['allowHealthView', 'AllowHealthView'], false)
        } : null;
        
        const commissionPercent = transaction.amount > 0 && transaction.commission > 0 
            ? Math.round((transaction.commission / transaction.amount) * 100) 
            : 0;
    
    content.innerHTML = `
        <div class="transaction-detail-container">
            <!-- Hero Header - Full Width -->
            <div class="transaction-detail-hero">
                <div class="transaction-hero-icon">
                    <i class="fas fa-receipt"></i>
                </div>
                <div class="transaction-hero-content">
                    <div class="transaction-hero-label">Mã giao dịch</div>
                        <h2 class="transaction-hero-id">${transaction.transactionId}</h2>
                    <div class="transaction-hero-date">
                        <i class="fas fa-calendar-alt"></i>
                            ${formatDate(transaction.transactionDate)}
                    </div>
                </div>
            </div>
            
            <!-- Two Column Layout -->
            <div class="transaction-detail-grid-layout">
                <!-- Left Column -->
                <div class="transaction-detail-column">
                    <!-- Transaction Info Card -->
                    <div class="transaction-info-card">
                        <div class="transaction-card-header">
                            <div class="transaction-card-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                <i class="fas fa-info-circle"></i>
                            </div>
                            <h3>Thông tin giao dịch</h3>
                        </div>
                        <div class="transaction-card-body">
                            <div class="transaction-info-item">
                                <div class="info-item-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                                    <i class="fas fa-dumbbell"></i>
                                </div>
                                <div class="info-item-content">
                                    <label>Tên dịch vụ</label>
                                        <span>${transaction.serviceName || 'Dịch vụ PT'}</span>
                                </div>
                            </div>
                            <div class="transaction-info-item">
                                <div class="info-item-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                                    <i class="fas fa-calendar-check"></i>
                                </div>
                                <div class="info-item-content">
                                    <label>Mã đặt lịch</label>
                                        <span class="info-value-code">${transaction.bookingId || 'N/A'}</span>
                                </div>
                            </div>
                                ${booking ? `
                                <div class="transaction-info-item">
                                    <div class="info-item-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                                        <i class="fas fa-clock"></i>
                                    </div>
                                    <div class="info-item-content">
                                        <label>Loại buổi tập</label>
                                        <span>${booking.bookingType || 'N/A'}</span>
                                    </div>
                                </div>
                                <div class="transaction-info-item">
                                    <div class="info-item-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                                        <i class="fas fa-info"></i>
                                    </div>
                                    <div class="info-item-content">
                                        <label>Trạng thái đặt lịch</label>
                                        <span>${booking.status || 'N/A'}</span>
                                    </div>
                                </div>
                                ${booking.bookingDateTime ? `
                                <div class="transaction-info-item">
                                    <div class="info-item-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                                        <i class="fas fa-calendar-alt"></i>
                                    </div>
                                    <div class="info-item-content">
                                        <label>Ngày giờ đặt lịch</label>
                                        <span>${formatDate(booking.bookingDateTime)}</span>
                                    </div>
                                </div>
                                ` : ''}
                                ${booking.notes ? `
                                <div class="transaction-info-item">
                                    <div class="info-item-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                        <i class="fas fa-sticky-note"></i>
                                    </div>
                                    <div class="info-item-content">
                                        <label>Ghi chú</label>
                                        <span>${booking.notes}</span>
                                    </div>
                                </div>
                                ` : ''}
                                ` : ''}
                        </div>
                    </div>
                    
                    <!-- User Info Card -->
                    <div class="transaction-info-card">
                        <div class="transaction-card-header">
                            <div class="transaction-card-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                                <i class="fas fa-users"></i>
                            </div>
                            <h3>Thông tin người dùng</h3>
                        </div>
                        <div class="transaction-card-body">
                            <div class="transaction-user-card">
                                <div class="user-card-avatar" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="user-card-content">
                                    <label>Người mua</label>
                                        <div class="user-card-name">${transaction.customerName || 'N/A'}</div>
                                        <div class="user-card-id">${transaction.customerId || '-'}</div>
                                </div>
                            </div>
                                ${transaction.ptName ? `
                                <div class="transaction-user-card">
                                    <div class="user-card-avatar" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                                        <i class="fas fa-user-tie"></i>
                                    </div>
                                    <div class="user-card-content">
                                        <label>Người nhận (PT)</label>
                                            <div class="user-card-name">${transaction.ptName}</div>
                                            <div class="user-card-id">${transaction.ptId || '-'}</div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Right Column -->
                <div class="transaction-detail-column">
                    <!-- Payment Info Card -->
                    <div class="transaction-payment-card">
                        <div class="transaction-card-header">
                            <div class="transaction-card-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                                <i class="fas fa-money-bill-wave"></i>
                            </div>
                            <h3>Thông tin thanh toán</h3>
                        </div>
                        <div class="transaction-payment-body">
                            <div class="payment-amount-card total">
                                <div class="payment-amount-icon">
                                    <i class="fas fa-wallet"></i>
                                </div>
                                <div class="payment-amount-content">
                                    <label>Tổng tiền</label>
                                        <div class="payment-amount-value">${formatCurrency(transaction.amount)}</div>
                                </div>
                            </div>
                                ${transaction.commission > 0 ? `
                                <div class="payment-amount-card commission">
                                    <div class="payment-amount-icon">
                                        <i class="fas fa-hand-holding-usd"></i>
                                    </div>
                                    <div class="payment-amount-content">
                                        <label>Hoa hồng App <span class="commission-badge">${commissionPercent}%</span></label>
                                            <div class="payment-amount-value">${formatCurrency(transaction.commission)}</div>
                                    </div>
                                </div>
                            ` : ''}
                                ${transaction.ptRevenue > 0 ? `
                                <div class="payment-amount-card pt-revenue">
                                    <div class="payment-amount-icon">
                                        <i class="fas fa-user-tie"></i>
                                    </div>
                                    <div class="payment-amount-content">
                                        <label>PT nhận</label>
                                            <div class="payment-amount-value">${formatCurrency(transaction.ptRevenue)}</div>
                                    </div>
                                </div>
                            ` : ''}
                            <div class="payment-method-item">
                                <div class="payment-method-icon">
                                    <i class="fas fa-credit-card"></i>
                                </div>
                                <div class="payment-method-content">
                                    <label>Phương thức thanh toán</label>
                                        <span class="payment-method-value">${getPaymentMethodText(transaction.paymentMethod)}</span>
                                </div>
                            </div>
                                <div class="payment-method-item">
                                    <div class="payment-method-icon">
                                        <i class="fas fa-info-circle"></i>
                        </div>
                                    <div class="payment-method-content">
                                        <label>Trạng thái thanh toán</label>
                                        <span class="payment-method-value status-badge ${getStatusBadgeClass(transaction.paymentStatus)}">${getStatusText(transaction.paymentStatus)}</span>
                    </div>
                </div>
            </div>
                        </div>
                    </div>
                </div>
        </div>
    `;
    } catch (error) {
        console.error('❌ Lỗi khi tải chi tiết giao dịch:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f56565; margin-bottom: 20px;"></i>
                <p style="color: #7f8c8d; font-size: 16px; margin-bottom: 20px;">${error.message || 'Không thể tải chi tiết giao dịch'}</p>
                <button class="btn-primary" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;" onclick="viewTransactionDetail('${transactionId}')">Thử lại</button>
            </div>
        `;
        showNotification('Không thể tải chi tiết giao dịch', 'error');
    }
}

// Close transaction detail modal
function closeTransactionDetailModal() {
    closeModal('modal-transaction-detail');
}

// Update transaction pagination
function updateTransactionPagination() {
    const pagination = el('transaction-pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(transactionsData.length / transactionsPerPage);
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button class="pagination-btn" onclick="goToTransactionPage(${currentTransactionPage - 1})" ${currentTransactionPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentTransactionPage - 2 && i <= currentTransactionPage + 2)) {
            html += `<button class="pagination-btn ${i === currentTransactionPage ? 'active' : ''}" onclick="goToTransactionPage(${i})">${i}</button>`;
        } else if (i === currentTransactionPage - 3 || i === currentTransactionPage + 3) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
    }
    
    html += `<button class="pagination-btn" onclick="goToTransactionPage(${currentTransactionPage + 1})" ${currentTransactionPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
    </button>`;
    
    pagination.innerHTML = html;
}

// Go to transaction page
function goToTransactionPage(page) {
    const totalPages = Math.ceil(transactionsData.length / transactionsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentTransactionPage = page;
    renderTransactionsTable();
    
    // Scroll to top
    const section = document.getElementById('transactions');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Export transactions to Excel
async function exportTransactions() {
    try {
        // Get current filter values
        const searchKeyword = document.getElementById('transaction-search')?.value || '';
        const paymentMethod = document.getElementById('filter-payment-method')?.value || '';
        const dateRangeText = document.getElementById('filter-date-range-text')?.textContent || '';
        
        // Build query parameters
        const params = new URLSearchParams();
        if (searchKeyword) params.append('search', searchKeyword);
        if (paymentMethod) params.append('paymentMethod', paymentMethod);
        
        // Parse date range if available
        const dateRange = getCurrentTransactionDateRange();
        if (dateRange.start) {
            params.append('dateFrom', dateRange.start.toISOString().split('T')[0]);
        }
        if (dateRange.end) {
            params.append('dateTo', dateRange.end.toISOString().split('T')[0]);
        }
        
        const url = `/Admin/QuanLiGiaoDich/ExportExcel?${params.toString()}`;
        
        // Show loading notification
        showNotification('Đang xuất báo cáo Excel...', 'info');
        
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = '';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success notification after a short delay
        setTimeout(() => {
            showNotification('Đã xuất báo cáo Excel thành công!', 'success');
        }, 500);
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showNotification('Lỗi khi xuất báo cáo Excel: ' + error.message, 'error');
    }
}

// Helper function to get current transaction date range
function getCurrentTransactionDateRange() {
    if (typeof getActiveDateRange === 'function') {
        return getActiveDateRange();
    }
    return { start: null, end: null };
}

// Date Range Filter Functions
function initializeDateRangeFilter() {
    const toggleButton = el('filter-date-range-btn');
    const dropdown = el('filter-date-range-dropdown');

    if (!toggleButton || !dropdown) {
        console.warn('⚠️ Date range elements not found, skipping initialization.');
        return;
    }

    dropdown.innerHTML = getDateRangeDropdownTemplate();
    toggleButton.addEventListener('click', event => {
        event.stopPropagation();
        toggleDateRangeDropdown();
    });

    dropdown.addEventListener('click', event => {
        event.stopPropagation();
    });

    document.addEventListener('click', handleOutsideClickForDateRange);
    document.addEventListener('keydown', handleEscapeKeyForDateRange);

    bindDateRangeDropdownEvents(dropdown);
    setDateFilterRange(null, null, 'all', false);
}

function getDateRangeDropdownTemplate() {
    const quickOrder = ['all', 'today', 'last7', 'last30', 'thisMonth', 'lastMonth'];
    const quickOptions = quickOrder
        .filter(key => DATE_RANGE_PRESETS[key])
        .map(key => {
            const preset = DATE_RANGE_PRESETS[key];
            if (!preset) return '';
            return `
                <button type="button" class="quick-option" data-preset="${key}">
                    <i class="fas fa-calendar-day"></i> ${preset.label}
                </button>
            `;
        })
        .join('');

    return `
        <div class="quick-options">
            <div class="options-section">
                <div class="options-title">
                    <i class="fas fa-bolt"></i> Khoảng thời gian nhanh
                </div>
                <div class="quick-options-grid">
                    ${quickOptions}
                    <button type="button" class="quick-option custom-option" data-preset="custom">
                        <i class="fas fa-sliders-h"></i> Tùy chỉnh
                    </button>
                </div>
            </div>
        </div>
        <div class="custom-range-panel">
            <div class="custom-range-header">
                <h4><i class="fas fa-calendar-check"></i> Chọn khoảng tùy chỉnh</h4>
                <p>Chọn khoảng ngày cụ thể để lọc danh sách giao dịch theo ngày giao dịch.</p>
            </div>
            <div class="custom-range-body">
                <div class="date-input-group">
                    <label for="filter-date-start">Từ ngày</label>
                    <input type="date" id="filter-date-start" class="date-input">
                </div>
                <div class="date-input-group">
                    <label for="filter-date-end">Đến ngày</label>
                    <input type="date" id="filter-date-end" class="date-input">
                </div>
            </div>
            <div class="custom-range-footer">
                <button type="button" class="btn-reset-date" id="filter-date-clear">
                    <i class="fas fa-eraser"></i> Xóa lọc
                </button>
                <button type="button" class="btn-apply-date" id="filter-date-apply">
                    <i class="fas fa-check"></i> Áp dụng
                </button>
            </div>
        </div>
        <div class="date-range-feedback" id="filter-date-feedback">
            <i class="fas fa-info-circle"></i>
            <span>Không áp dụng lọc theo ngày.</span>
        </div>
        <div class="date-range-error" id="filter-date-error">
            <i class="fas fa-exclamation-triangle"></i>
            <span id="filter-date-error-text"></span>
        </div>
    `;
}

function bindDateRangeDropdownEvents(dropdown) {
    dropdown.querySelectorAll('[data-preset]').forEach(button => {
        button.addEventListener('click', () => applyQuickDatePreset(button.dataset.preset));
    });

    const applyButton = dropdown.querySelector('#filter-date-apply');
    if (applyButton) {
        applyButton.addEventListener('click', handleCustomDateRangeApply);
    }

    const clearButton = dropdown.querySelector('#filter-date-clear');
    if (clearButton) {
        clearButton.addEventListener('click', resetDateFilter);
    }

    const startInput = dropdown.querySelector('#filter-date-start');
    const endInput = dropdown.querySelector('#filter-date-end');
    [startInput, endInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => clearDateRangeError());
        }
    });
}

function toggleDateRangeDropdown() {
    if (isDateRangeDropdownOpen) {
        closeDateRangeDropdown();
    } else {
        openDateRangeDropdown();
    }
}

function openDateRangeDropdown() {
    const dropdown = el('filter-date-range-dropdown');
    if (!dropdown) return;

    isDateRangeDropdownOpen = true;
    dropdown.classList.add('active');
    updateDateRangeDropdownUI();
}

function closeDateRangeDropdown() {
    const dropdown = el('filter-date-range-dropdown');
    if (!dropdown) return;

    isDateRangeDropdownOpen = false;
    dropdown.classList.remove('active');
    if (!hasDateFilterSelection && dateFilterPreset === 'custom') {
        dateFilterPreset = 'all';
        updateDateRangeDropdownUI();
    }
    updateDateRangeFeedback();
}

function handleOutsideClickForDateRange(event) {
    if (!isDateRangeDropdownOpen) return;

    const dropdown = el('filter-date-range-dropdown');
    const toggleButton = el('filter-date-range-btn');

    if (!dropdown || !toggleButton) return;

    if (!dropdown.contains(event.target) && !toggleButton.contains(event.target)) {
        closeDateRangeDropdown();
    }
}

function handleEscapeKeyForDateRange(event) {
    if (event.key === 'Escape' && isDateRangeDropdownOpen) {
        closeDateRangeDropdown();
    }
}

function applyQuickDatePreset(presetKey) {
    const preset = DATE_RANGE_PRESETS[presetKey];
    if (!preset) {
        console.warn(`⚠️ Unknown date range preset: ${presetKey}`);
        return;
    }

    if (presetKey === 'custom') {
        dateFilterPreset = 'custom';
        updateDateRangeDropdownUI();
        clearDateRangeError();
        setDateRangeFeedbackPending('Chọn khoảng ngày và nhấn Áp dụng.');
        return;
    }

    // Set date range but don't apply filter yet (user needs to click "Áp dụng" button)
    const { start, end } = preset.getRange();
    setDateFilterRange(start, end, presetKey, true);
    clearDateRangeError();
    closeDateRangeDropdown();
}

function handleCustomDateRangeApply() {
    const startInput = el('filter-date-start');
    const endInput = el('filter-date-end');

    if (!startInput || !endInput) {
        return;
    }

    const startValue = startInput.value ? new Date(startInput.value) : null;
    const endValue = endInput.value ? new Date(endInput.value) : null;

    if (!startValue || !endValue) {
        showDateRangeError('Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc.');
        if (!startValue) {
            startInput.focus();
        } else {
            endInput.focus();
        }
        return;
    }

    if (startValue && endValue && startValue > endValue) {
        showDateRangeError('Ngày bắt đầu không thể lớn hơn ngày kết thúc.');
        startInput.focus();
        return;
    }

    const todayEnd = endOfDay(new Date());
    if (startValue.getTime() > todayEnd.getTime() || endValue.getTime() > todayEnd.getTime()) {
        showDateRangeError('Không thể lọc vượt quá ngày hiện tại.');
        if (endValue.getTime() > todayEnd.getTime()) {
            endInput.focus();
        } else {
            startInput.focus();
        }
        return;
    }

    // Set date range but don't apply filter yet (user needs to click "Áp dụng" button)
    const { start, end } = DATE_RANGE_PRESETS.custom.getRange(startValue, endValue);
    setDateFilterRange(start, end, 'custom', true);
    clearDateRangeError();
    closeDateRangeDropdown();
}

function resetDateFilter() {
    setDateFilterRange(null, null, 'all', false);
    closeDateRangeDropdown();
}

function setDateFilterRange(start, end, presetKey = 'custom', userInitiated = true) {
    dateFilterPreset = presetKey;
    const normalizedStart = start ? startOfDay(start) : null;
    const normalizedEnd = end ? endOfDay(end) : null;
    let clampedStart = clampToToday(normalizedStart, true);
    let clampedEnd = clampToToday(normalizedEnd, false);

    if (clampedStart && clampedEnd && clampedStart.getTime() > clampedEnd.getTime()) {
        clampedStart = startOfDay(clampedEnd);
    }

    dateFilterRange = {
        start: clampedStart,
        end: clampedEnd
    };

    if (!userInitiated) {
        hasDateFilterSelection = false;
    } else if (presetKey === 'all' && !dateFilterRange.start && !dateFilterRange.end) {
        hasDateFilterSelection = true;
    } else {
        hasDateFilterSelection = Boolean(dateFilterRange.start || dateFilterRange.end);
    }

    clearDateRangeError();
    updateDateRangeButtonLabel();
    updateDateRangeDropdownUI();
    updateDateRangeFeedback();
}

function updateDateRangeButtonLabel() {
    const labelElement = el('filter-date-range-text');
    if (!labelElement) return;

    if (!hasDateFilterSelection) {
        labelElement.textContent = 'Chọn khoảng thời gian';
        return;
    }

    const preset = DATE_RANGE_PRESETS[dateFilterPreset];
    if (preset && dateFilterPreset !== 'custom') {
        labelElement.textContent = preset.label;
        return;
    }

    const { start, end } = dateFilterRange;
    if (!start || !end) {
        labelElement.textContent = 'Chọn khoảng thời gian';
        return;
    }

    const startStr = formatDateInputValue(start);
    const endStr = formatDateInputValue(end);
    labelElement.textContent = `${startStr} - ${endStr}`;
}

function updateDateRangeDropdownUI() {
    const dropdown = el('filter-date-range-dropdown');
    if (!dropdown) return;

    const shouldHighlight = hasDateFilterSelection || dateFilterPreset !== 'all';
    dropdown.querySelectorAll('.quick-option').forEach(button => {
        const isActivePreset = button.dataset.preset === dateFilterPreset;
        button.classList.toggle('active', isActivePreset && shouldHighlight);
    });

    dropdown.classList.toggle('custom-mode', dateFilterPreset === 'custom');

    const startInput = dropdown.querySelector('#filter-date-start');
    const endInput = dropdown.querySelector('#filter-date-end');
    if (startInput && endInput) {
        startInput.value = formatDateInputValue(dateFilterRange.start);
        endInput.value = formatDateInputValue(dateFilterRange.end);
    }

    const customPanel = dropdown.querySelector('.custom-range-panel');
    if (customPanel) {
        customPanel.classList.toggle('active', dateFilterPreset === 'custom');
    }
}

function updateDateRangeFeedback() {
    const feedbackElement = el('filter-date-feedback');
    if (!feedbackElement) return;

    if (!hasDateFilterSelection || dateFilterPreset === 'all') {
        feedbackElement.classList.remove('active', 'pending');
        feedbackElement.querySelector('span').textContent = 'Không áp dụng lọc theo ngày.';
    } else {
        feedbackElement.classList.add('active');
        feedbackElement.classList.remove('pending');
        const preset = DATE_RANGE_PRESETS[dateFilterPreset];
        if (preset && dateFilterPreset !== 'custom') {
            feedbackElement.querySelector('span').textContent = `Đang lọc theo: ${preset.label}`;
        } else {
            const { start, end } = dateFilterRange;
            if (start && end) {
                const startStr = formatDateInputValue(start);
                const endStr = formatDateInputValue(end);
                feedbackElement.querySelector('span').textContent = `Đang lọc từ ${startStr} đến ${endStr}`;
            }
        }
    }
}

function setDateRangeFeedbackPending(message) {
    const feedbackElement = el('filter-date-feedback');
    if (!feedbackElement) return;
    feedbackElement.classList.add('pending');
    feedbackElement.classList.remove('active');
    feedbackElement.querySelector('span').textContent = message;
}

function showDateRangeError(message) {
    const errorElement = el('filter-date-error');
    if (!errorElement) return;

    const errorText = errorElement.querySelector('#filter-date-error-text');
    if (errorText) {
        errorText.textContent = message;
    }

    errorElement.classList.add('visible');

    if (dateRangeErrorTimeout) {
        clearTimeout(dateRangeErrorTimeout);
    }

    dateRangeErrorTimeout = setTimeout(() => {
        clearDateRangeError();
    }, 5000);
}

function clearDateRangeError() {
    const errorElement = el('filter-date-error');
    if (!errorElement) return;

    errorElement.classList.remove('visible');

    if (dateRangeErrorTimeout) {
        clearTimeout(dateRangeErrorTimeout);
        dateRangeErrorTimeout = null;
    }
}

// Initialize Transactions Module
async function initializeTransactions() {
    console.log('💰 Initializing Transactions module...');
    
    // Show loading state immediately
    isLoadingData = true;
    renderTransactionsTable();
    updateTransactionKPIs();
    renderRevenueChart();
    
    // Initialize date range filter
    initializeDateRangeFilter();
    
    // Setup apply filter button
    const applyBtn = el('btn-apply-filter');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyTransactionFilters);
    }
    
    // Setup reset filter button
    const resetBtn = el('btn-reset-filter');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetTransactionFilters);
    }
    
    // Setup export button
    const exportBtn = el('btn-export-transactions');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportTransactions);
    }
    
    // Load data from server
    await loadTransactionsFromServer(true);
    
    console.log('✅ Transactions module initialized');
}

// Export for global access
window.initializeTransactions = initializeTransactions;
window.viewTransactionDetail = viewTransactionDetail;
window.resetTransactionFilters = resetTransactionFilters;
window.goToTransactionPage = goToTransactionPage;
window.closeTransactionDetailModal = closeTransactionDetailModal;
window.exportTransactions = exportTransactions;
window.reloadTransactionsData = reloadTransactionsData;
window.applyTransactionFilters = applyTransactionFilters;
