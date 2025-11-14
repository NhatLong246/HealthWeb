// System & Security Management JavaScript

// Sample Data
const sampleSystemLogs = [
    { id: 1, ThoiGian: '2025-01-16T10:30:25', MucDoLog: 'Info', UserID: 'user_0001', NoiDung: 'Người dùng đăng nhập thành công' },
    { id: 2, ThoiGian: '2025-01-16T10:25:10', MucDoLog: 'Error', UserID: null, NoiDung: 'Lỗi kết nối database: Connection timeout' },
    { id: 3, ThoiGian: '2025-01-16T10:20:05', MucDoLog: 'Warning', UserID: 'user_0002', NoiDung: 'Nhiều lần đăng nhập sai từ IP: 192.168.1.100' },
    { id: 4, ThoiGian: '2025-01-16T10:15:00', MucDoLog: 'Info', UserID: null, NoiDung: 'Hệ thống backup tự động hoàn thành' },
    { id: 5, ThoiGian: '2025-01-16T10:10:30', MucDoLog: 'Info', UserID: 'user_0003', NoiDung: 'Người dùng đã tạo mục tiêu mới' }
];

const sampleFiles = [
    { TapTinID: 1, TenTapTin: 'avatar_user_0001.jpg', UserID: 'user_0001', LoaiFile: 'Image', MucDich: 'AnhDaiDien', KichThuoc: 245760, NgayUpload: '2025-01-15T08:00:00', DaXoa: 0 },
    { TapTinID: 2, TenTapTin: 'chung_chi_PT_001.pdf', UserID: 'ptr_0001', LoaiFile: 'PDF', MucDich: 'ChungChi', KichThuoc: 1024000, NgayUpload: '2025-01-14T14:30:00', DaXoa: 0 },
    { TapTinID: 3, TenTapTin: 'bao_cao_thang_1.xlsx', UserID: 'admin', LoaiFile: 'Excel', MucDich: 'BaoCao', KichThuoc: 512000, NgayUpload: '2025-01-10T09:00:00', DaXoa: 0 },
    { TapTinID: 4, TenTapTin: 'video_tap_luyen_001.mp4', UserID: 'user_0002', LoaiFile: 'Video', MucDich: 'VideoTap', KichThuoc: 15728640, NgayUpload: '2025-01-12T16:20:00', DaXoa: 0 }
];

const sampleFeatures = [
    { TinhNangID: 1, TenTinhNang: 'Unlimited_Goals', MoTa: 'Tạo không giới hạn mục tiêu', ConHoatDong: 1 },
    { TinhNangID: 2, TenTinhNang: 'PT_Booking', MoTa: 'Đặt lịch với huấn luyện viên', ConHoatDong: 1 },
    { TinhNangID: 3, TenTinhNang: 'Advanced_Analytics', MoTa: 'Phân tích chi tiết sức khỏe', ConHoatDong: 1 },
    { TinhNangID: 4, TenTinhNang: 'Cloud_Sync', MoTa: 'Đồng bộ dữ liệu lên cloud', ConHoatDong: 1 },
    { TinhNangID: 5, TenTinhNang: 'Export_Reports', MoTa: 'Xuất báo cáo PDF', ConHoatDong: 1 }
];

const sampleResetTokens = [
    { UserID: 'user_0001', Username: 'john_doe', ResetToken: 'abc123xyz789', ResetTokenExpiry: '2025-01-16T11:00:00', CreatedDate: '2025-01-16T10:30:00' },
    { UserID: 'user_0002', Username: 'jane_smith', ResetToken: 'def456uvw012', ResetTokenExpiry: '2025-01-16T10:45:00', CreatedDate: '2025-01-16T10:15:00' }
];

// State Management
let systemLogsData = [];
let filesData = [];
let featuresData = [];
let resetTokensData = [];

// Filter Variables
let logSearch = '';
let logLevelFilter = '';
let logDateFrom = '';
let logDateTo = '';
let logPage = 1;
const logPageSize = 20;

let fileSearch = '';
let fileTypeFilter = '';
let filePurposeFilter = '';
let filePage = 1;
const filePageSize = 10;

// Helper function
function el(id) {
    return document.getElementById(id);
}

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

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Match date range
function matchDateRange(iso, from, to) {
    if (!from && !to) return true;
    const d = new Date(iso);
    if (from) { 
        const f = new Date(from); 
        f.setHours(0, 0, 0, 0); 
        if (d < f) return false; 
    }
    if (to) { 
        const t = new Date(to); 
        t.setHours(23, 59, 59, 999); 
        if (d > t) return false; 
    }
    return true;
}

// Escape HTML
function escapeHtml(s) {
    return String(s || '').replace(/[&<>"]+/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
    }[m]));
}

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Initialize system tabs
function initSystemTabs() {
    const systemTabs = document.querySelectorAll('#system .tab-btn');
    const systemPanels = document.querySelectorAll('#system .system-panel');
    
    systemTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Update active tab
            systemTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding panel
            systemPanels.forEach(panel => {
                panel.style.display = 'none';
            });
            
            const activePanel = document.getElementById(`panel-${tabId}`);
            if (activePanel) {
                activePanel.style.display = 'block';
                // Load data when panel is shown
                if (tabId === 'logs') {
                    renderSystemLogs();
                } else if (tabId === 'files') {
                    renderFiles();
                } else if (tabId === 'features') {
                    renderFeatures();
                } else if (tabId === 'security') {
                    renderResetTokens();
                }
            }
        });
    });
}

// Initialize System Module
function initializeSystem() {
    console.log('⚙️ Initializing System module...');
    
    // Initialize data
    systemLogsData = [...sampleSystemLogs];
    filesData = [...sampleFiles];
    featuresData = [...sampleFeatures];
    resetTokensData = [...sampleResetTokens];
    
    // Initialize tabs
    initSystemTabs();
    
    // System Settings Form
    const systemSettingsForm = document.getElementById('system-settings-form');
    if (systemSettingsForm) {
        systemSettingsForm.addEventListener('submit', saveSystemSettings);
    }
    
    // Security Settings Form
    const securitySettingsForm = document.getElementById('security-settings-form');
    if (securitySettingsForm) {
        securitySettingsForm.addEventListener('submit', saveSecuritySettings);
    }
    
    // File Upload
    const btnUploadFile = document.getElementById('btn-upload-file');
    if (btnUploadFile) {
        btnUploadFile.addEventListener('click', openFileUploadModal);
    }
    
    // Log Filters
    const logSearchInput = document.getElementById('log-search');
    if (logSearchInput) {
        logSearchInput.addEventListener('input', () => {
            logSearch = logSearchInput.value.toLowerCase();
            applyLogFilters();
        });
    }
    
    const logLevelSelect = document.getElementById('log-level-filter');
    if (logLevelSelect) {
        logLevelSelect.addEventListener('change', () => {
            logLevelFilter = logLevelSelect.value;
            applyLogFilters();
        });
    }
    
    ['log-date-from', 'log-date-to'].forEach(id => {
        const elm = document.getElementById(id);
        if (elm) {
            elm.addEventListener('input', () => {
                logDateFrom = document.getElementById('log-date-from')?.value || '';
                logDateTo = document.getElementById('log-date-to')?.value || '';
                applyLogFilters();
            });
        }
    });
    
    // File Filters
    const fileSearchInput = document.getElementById('file-search');
    if (fileSearchInput) {
        fileSearchInput.addEventListener('input', () => {
            fileSearch = fileSearchInput.value.toLowerCase();
            applyFileFilters();
        });
    }
    
    const fileTypeSelect = document.getElementById('file-type-filter');
    if (fileTypeSelect) {
        fileTypeSelect.addEventListener('change', () => {
            fileTypeFilter = fileTypeSelect.value;
            applyFileFilters();
        });
    }
    
    const filePurposeSelect = document.getElementById('file-purpose-filter');
    if (filePurposeSelect) {
        filePurposeSelect.addEventListener('change', () => {
            filePurposeFilter = filePurposeSelect.value;
            applyFileFilters();
        });
    }
    
    // Export Logs
    const btnExportLogs = document.getElementById('btn-export-logs');
    if (btnExportLogs) {
        btnExportLogs.addEventListener('click', exportSystemLogs);
    }
    
    // Initial render
    renderSystemLogs();
    renderFiles();
    renderFeatures();
    renderResetTokens();
    
    console.log('✅ System module initialized');
}

// System Settings Functions
function saveSystemSettings(e) {
    e.preventDefault();
    const systemName = document.getElementById('system-name').value;
    const systemEmail = document.getElementById('system-email').value;
    const maintenanceMode = document.getElementById('maintenance-mode').checked;
    const maintenanceMessage = document.getElementById('maintenance-message').value;
    
    // Save to localStorage or send to server
    localStorage.setItem('systemSettings', JSON.stringify({
        systemName,
        systemEmail,
        maintenanceMode,
        maintenanceMessage
    }));
    
    showNotification('Đã lưu cài đặt hệ thống', 'success');
}

function resetSystemSettings() {
    document.getElementById('system-name').value = 'WebHealthy';
    document.getElementById('system-email').value = 'admin@webhealthy.com';
    document.getElementById('maintenance-mode').checked = false;
    document.getElementById('maintenance-message').value = 'Hệ thống đang được bảo trì. Vui lòng quay lại sau.';
}

// Security Settings Functions
function saveSecuritySettings(e) {
    e.preventDefault();
    const maxLoginAttempts = document.getElementById('max-login-attempts').value;
    const lockoutDuration = document.getElementById('lockout-duration').value;
    const resetTokenExpiry = document.getElementById('reset-token-expiry').value;
    const strongPassword = document.getElementById('strong-password').checked;
    
    // Save to localStorage or send to server
    localStorage.setItem('securitySettings', JSON.stringify({
        maxLoginAttempts,
        lockoutDuration,
        resetTokenExpiry,
        strongPassword
    }));
    
    showNotification('Đã lưu cài đặt bảo mật', 'success');
}

function resetSecuritySettings() {
    document.getElementById('max-login-attempts').value = 5;
    document.getElementById('lockout-duration').value = 30;
    document.getElementById('reset-token-expiry').value = 30;
    document.getElementById('strong-password').checked = true;
}

// System Logs Functions
function renderSystemLogs() {
    const tbody = document.getElementById('logs-table-body');
    if (!tbody) return;
    
    let rows = systemLogsData.filter(log =>
        (!logSearch || 
            (log.NoiDung && log.NoiDung.toLowerCase().includes(logSearch)) || 
            (log.UserID && log.UserID.toLowerCase().includes(logSearch))) &&
        (!logLevelFilter || log.MucDoLog === logLevelFilter) &&
        matchDateRange(log.ThoiGian, logDateFrom, logDateTo)
    );
    
    const start = (logPage - 1) * logPageSize;
    const end = start + logPageSize;
    const pageRows = rows.slice(start, end);
    
    if (pageRows.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; padding:24px; color:#999;">
                    <i class="fas fa-file-alt" style="font-size: 32px; margin-bottom: 8px; display: block; opacity: 0.3;"></i>
                    Không có log nào
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = pageRows.map(log => {
            const levelClass = log.MucDoLog.toLowerCase();
            const levelIcon = log.MucDoLog === 'Info' ? 'fa-info-circle' : log.MucDoLog === 'Error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle';
            return `
                <tr class="log-row">
                    <td class="log-time">${formatDate(log.ThoiGian)}</td>
                    <td>
                        <span class="log-level ${levelClass}">
                            <i class="fas ${levelIcon}"></i> ${log.MucDoLog}
                        </span>
                    </td>
                    <td>${log.UserID || '<span style="color:#999;">-</span>'}</td>
                    <td class="log-message">${escapeHtml(log.NoiDung)}</td>
                </tr>
            `;
        }).join('');
    }
    renderLogPagination(rows.length);
}

function applyLogFilters() {
    logPage = 1;
    renderSystemLogs();
}

function resetLogFilters() {
    logSearch = '';
    logLevelFilter = '';
    logDateFrom = '';
    logDateTo = '';
    ['log-search', 'log-level-filter', 'log-date-from', 'log-date-to'].forEach(id => {
        const elm = document.getElementById(id);
        if (elm) elm.value = '';
    });
    applyLogFilters();
}

function renderLogPagination(total) {
    const container = document.getElementById('logs-pagination');
    if (!container) return;
    const totalPages = Math.ceil(total / logPageSize) || 1;
    if (totalPages <= 1) { 
        container.innerHTML = ''; 
        return; 
    }
    const prevDisabled = logPage === 1 ? 'disabled' : '';
    const nextDisabled = logPage === totalPages ? 'disabled' : '';
    container.innerHTML = `
        <button class="pagination-btn" ${prevDisabled} onclick="goLogPage(${logPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
        <span class="pagination-info">${logPage}/${totalPages}</span>
        <button class="pagination-btn" ${nextDisabled} onclick="goLogPage(${logPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
}

function goLogPage(p) { 
    if (p < 1) return; 
    logPage = p; 
    renderSystemLogs(); 
}

function exportSystemLogs() {
    const filteredLogs = systemLogsData.filter(log =>
        (!logSearch || 
            (log.NoiDung && log.NoiDung.toLowerCase().includes(logSearch)) || 
            (log.UserID && log.UserID.toLowerCase().includes(logSearch))) &&
        (!logLevelFilter || log.MucDoLog === logLevelFilter) &&
        matchDateRange(log.ThoiGian, logDateFrom, logDateTo)
    );
    
    const csv = 'Thời gian,Mức độ,UserID,Nội dung\n' + 
        filteredLogs.map(log => 
            `"${formatDate(log.ThoiGian)}","${log.MucDoLog}","${log.UserID || ''}","${log.NoiDung}"`
        ).join('\n');
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `system_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Đã xuất logs thành công', 'success');
}

// File Management Functions
function renderFiles() {
    const tbody = document.getElementById('files-table-body');
    if (!tbody) return;
    
    let rows = filesData.filter(file =>
        (!fileSearch || 
            file.TenTapTin.toLowerCase().includes(fileSearch) || 
            file.UserID.toLowerCase().includes(fileSearch)) &&
        (!fileTypeFilter || file.LoaiFile === fileTypeFilter) &&
        (!filePurposeFilter || file.MucDich === filePurposeFilter) &&
        file.DaXoa === 0
    );
    
    const start = (filePage - 1) * filePageSize;
    const end = start + filePageSize;
    const pageRows = rows.slice(start, end);
    
    if (pageRows.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; padding:24px; color:#999;">
                    <i class="fas fa-folder-open" style="font-size: 32px; margin-bottom: 8px; display: block; opacity: 0.3;"></i>
                    Không có file nào
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = pageRows.map(file => {
            const typeClass = file.LoaiFile.toLowerCase();
            const typeIcon = file.LoaiFile === 'Image' ? 'fa-image' : 
                           file.LoaiFile === 'PDF' ? 'fa-file-pdf' : 
                           file.LoaiFile === 'Excel' ? 'fa-file-excel' : 
                           file.LoaiFile === 'Video' ? 'fa-file-video' : 'fa-file';
            const sizeFormatted = formatFileSize(file.KichThuoc);
            return `
                <tr class="file-row">
                    <td><strong>${file.TapTinID}</strong></td>
                    <td><strong>${escapeHtml(file.TenTapTin)}</strong></td>
                    <td>${file.UserID}</td>
                    <td>
                        <span class="file-type-badge ${typeClass}">
                            <i class="fas ${typeIcon}"></i> ${file.LoaiFile}
                        </span>
                    </td>
                    <td>${file.MucDich}</td>
                    <td>${sizeFormatted}</td>
                    <td>${formatDate(file.NgayUpload)}</td>
                    <td><span class="status-badge active">Active</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action btn-view" title="Tải xuống" onclick="downloadFile(${file.TapTinID})">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="btn-action btn-delete" title="Xóa" onclick="deleteFile(${file.TapTinID})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    renderFilePagination(rows.length);
}

function applyFileFilters() {
    filePage = 1;
    renderFiles();
}

function resetFileFilters() {
    fileSearch = '';
    fileTypeFilter = '';
    filePurposeFilter = '';
    ['file-search', 'file-type-filter', 'file-purpose-filter'].forEach(id => {
        const elm = document.getElementById(id);
        if (elm) elm.value = '';
    });
    applyFileFilters();
}

function renderFilePagination(total) {
    const container = document.getElementById('files-pagination');
    if (!container) return;
    const totalPages = Math.ceil(total / filePageSize) || 1;
    if (totalPages <= 1) { 
        container.innerHTML = ''; 
        return; 
    }
    const prevDisabled = filePage === 1 ? 'disabled' : '';
    const nextDisabled = filePage === totalPages ? 'disabled' : '';
    container.innerHTML = `
        <button class="pagination-btn" ${prevDisabled} onclick="goFilePage(${filePage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
        <span class="pagination-info">${filePage}/${totalPages}</span>
        <button class="pagination-btn" ${nextDisabled} onclick="goFilePage(${filePage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
}

function goFilePage(p) { 
    if (p < 1) return; 
    filePage = p; 
    renderFiles(); 
}

function downloadFile(fileId) {
    const file = filesData.find(f => f.TapTinID === fileId);
    if (file) {
        showNotification(`Đang tải xuống: ${file.TenTapTin}`, 'info');
        // Implement download logic
    }
}

function deleteFile(fileId) {
    if (confirm('Bạn có chắc chắn muốn xóa file này?')) {
        const file = filesData.find(f => f.TapTinID === fileId);
        if (file) {
            file.DaXoa = 1;
            file.NgayXoa = new Date().toISOString();
            applyFileFilters();
            showNotification('Đã xóa file', 'success');
        }
    }
}

function openFileUploadModal() {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const newFile = {
                TapTinID: filesData.length + 1,
                TenTapTin: file.name,
                UserID: 'admin',
                LoaiFile: getFileType(file.name),
                MucDich: 'BaoCao',
                KichThuoc: file.size,
                NgayUpload: new Date().toISOString(),
                DaXoa: 0
            };
            filesData.unshift(newFile);
        });
        renderFiles();
        showNotification(`Đã tải lên ${files.length} file`, 'success');
    };
    input.click();
}

function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'Image';
    if (ext === 'pdf') return 'PDF';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return 'Excel';
    if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) return 'Video';
    return 'Document';
}

// Features Management Functions
function renderFeatures() {
    const tbody = document.getElementById('features-table-body');
    if (!tbody) return;
    
    if (featuresData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:24px; color:#999;">
                    <i class="fas fa-star" style="font-size: 32px; margin-bottom: 8px; display: block; opacity: 0.3;"></i>
                    Không có tính năng nào
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = featuresData.map(feature => {
            const statusClass = feature.ConHoatDong ? 'active' : 'inactive';
            return `
                <tr class="feature-row">
                    <td><strong>${feature.TinhNangID}</strong></td>
                    <td><strong>${escapeHtml(feature.TenTinhNang)}</strong></td>
                    <td>${escapeHtml(feature.MoTa)}</td>
                    <td>
                        <span class="feature-status-badge ${statusClass}">
                            ${feature.ConHoatDong ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action btn-edit" title="Chỉnh sửa" onclick="editFeature(${feature.TinhNangID})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action ${feature.ConHoatDong ? 'btn-delete' : 'btn-view'}" 
                                    title="${feature.ConHoatDong ? 'Vô hiệu hóa' : 'Kích hoạt'}" 
                                    onclick="toggleFeature(${feature.TinhNangID})">
                                <i class="fas ${feature.ConHoatDong ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

function editFeature(id) {
    const feature = featuresData.find(f => f.TinhNangID === id);
    if (feature) {
        alert(`Chỉnh sửa tính năng: ${feature.TenTinhNang}`);
    }
}

function toggleFeature(id) {
    const feature = featuresData.find(f => f.TinhNangID === id);
    if (feature) {
        feature.ConHoatDong = !feature.ConHoatDong;
        renderFeatures();
        showNotification(`Đã ${feature.ConHoatDong ? 'kích hoạt' : 'vô hiệu hóa'} tính năng ${feature.TenTinhNang}`, 'success');
    }
}

// Reset Tokens Management Functions
function renderResetTokens() {
    const tbody = document.getElementById('reset-tokens-table-body');
    if (!tbody) return;
    
    const now = new Date();
    const activeTokens = resetTokensData.filter(token => {
        const expiry = new Date(token.ResetTokenExpiry);
        return expiry > now;
    });
    
    if (activeTokens.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:24px; color:#999;">
                    <i class="fas fa-key" style="font-size: 32px; margin-bottom: 8px; display: block; opacity: 0.3;"></i>
                    Không có token nào đang hoạt động
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = activeTokens.map(token => {
            const expiry = new Date(token.ResetTokenExpiry);
            const isExpired = expiry <= now;
            const statusClass = isExpired ? 'expired' : 'active';
            return `
                <tr class="token-row">
                    <td>${token.UserID}</td>
                    <td>${token.Username}</td>
                    <td>
                        <code style="background:#f5f5f5; padding:4px 8px; border-radius:4px; font-size:12px;">
                            ${token.ResetToken.substring(0, 20)}...
                        </code>
                    </td>
                    <td>${formatDate(token.CreatedDate)}</td>
                    <td>${formatDate(token.ResetTokenExpiry)}</td>
                    <td>
                        <span class="subscription-status-badge ${statusClass}">
                            ${isExpired ? 'Hết hạn' : 'Hoạt động'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action btn-delete" title="Vô hiệu hóa" onclick="revokeResetToken('${token.UserID}')">
                                <i class="fas fa-ban"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

function revokeResetToken(userId) {
    if (confirm('Bạn có chắc chắn muốn vô hiệu hóa token này?')) {
        const token = resetTokensData.find(t => t.UserID === userId);
        if (token) {
            token.ResetTokenExpiry = new Date().toISOString();
            renderResetTokens();
            showNotification('Đã vô hiệu hóa token', 'success');
        }
    }
}

// Export for global access
window.initializeSystem = initializeSystem;
window.saveSystemSettings = saveSystemSettings;
window.saveSecuritySettings = saveSecuritySettings;
window.resetSystemSettings = resetSystemSettings;
window.resetSecuritySettings = resetSecuritySettings;
window.resetLogFilters = resetLogFilters;
window.resetFileFilters = resetFileFilters;
window.goLogPage = goLogPage;
window.goFilePage = goFilePage;
window.downloadFile = downloadFile;
window.deleteFile = deleteFile;
window.openFileUploadModal = openFileUploadModal;
window.editFeature = editFeature;
window.toggleFeature = toggleFeature;
window.revokeResetToken = revokeResetToken;
window.exportSystemLogs = exportSystemLogs;

