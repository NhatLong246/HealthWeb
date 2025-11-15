/**
 * Custom Dialog System - Thay thế alert/confirm mặc định
 * Đồng bộ với dark/light mode của trang web
 */

// Tạo dialog HTML
function createDialogHTML(title, message, type = 'info', showCancel = false) {
    const icons = {
        info: '<i class="fas fa-info-circle"></i>',
        success: '<i class="fas fa-check-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        error: '<i class="fas fa-times-circle"></i>',
        question: '<i class="fas fa-question-circle"></i>'
    };
    
    const icon = icons[type] || icons.info;
    
    return `
        <div class="dialog-overlay" id="customDialogOverlay">
            <div class="dialog-container" id="customDialogContainer">
                <div class="dialog-header">
                    <div class="dialog-icon ${type}">
                        ${icon}
                    </div>
                    <div class="dialog-title">${escapeHtml(title)}</div>
                </div>
                <div class="dialog-body">
                    ${escapeHtml(message)}
                </div>
                <div class="dialog-footer">
                    ${showCancel ? `
                        <button class="dialog-btn dialog-btn-secondary" id="dialogCancelBtn">
                            <i class="fas fa-times"></i> Hủy
                        </button>
                        <button class="dialog-btn dialog-btn-primary" id="dialogConfirmBtn">
                            <i class="fas fa-check"></i> Xác nhận
                        </button>
                    ` : `
                        <button class="dialog-btn dialog-btn-primary" id="dialogOkBtn">
                            <i class="fas fa-check"></i> OK
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

// Escape HTML để tránh XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Hiển thị dialog
function showDialog(title, message, type = 'info', showCancel = false) {
    return new Promise((resolve) => {
        // Xóa dialog cũ nếu có
        const oldDialog = document.getElementById('customDialogOverlay');
        if (oldDialog) {
            oldDialog.remove();
        }
        
        // Tạo dialog mới
        const dialogHTML = createDialogHTML(title, message, type, showCancel);
        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        
        const overlay = document.getElementById('customDialogOverlay');
        const container = document.getElementById('customDialogContainer');
        
        // Xử lý nút OK
        const okBtn = document.getElementById('dialogOkBtn');
        if (okBtn) {
            okBtn.addEventListener('click', () => {
                closeDialog();
                resolve(true);
            });
        }
        
        // Xử lý nút Xác nhận
        const confirmBtn = document.getElementById('dialogConfirmBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                closeDialog();
                resolve(true);
            });
        }
        
        // Xử lý nút Hủy
        const cancelBtn = document.getElementById('dialogCancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                closeDialog();
                resolve(false);
            });
        }
        
        // Đóng khi click vào overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeDialog();
                resolve(false);
            }
        });
        
        // Đóng khi nhấn ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', handleEsc);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        // Focus vào nút chính
        setTimeout(() => {
            if (confirmBtn) {
                confirmBtn.focus();
            } else if (okBtn) {
                okBtn.focus();
            }
        }, 100);
    });
}

// Đóng dialog
function closeDialog() {
    const overlay = document.getElementById('customDialogOverlay');
    const container = document.getElementById('customDialogContainer');
    
    if (overlay && container) {
        overlay.classList.add('closing');
        container.classList.add('closing');
        
        setTimeout(() => {
            overlay.remove();
        }, 200);
    }
}

// Thay thế alert()
window.customAlert = function(message, title = 'Thông báo', type = 'info') {
    return showDialog(title, message, type, false);
};

// Thay thế confirm()
window.customConfirm = function(message, title = 'Xác nhận', type = 'question') {
    return showDialog(title, message, type, true);
};

// Override alert và confirm mặc định (chỉ khi cần thiết)
// Lưu ý: window.alert và window.confirm mặc định không trả về Promise
// Nên tốt nhất là sử dụng customAlert và customConfirm trực tiếp

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showDialog, customAlert, customConfirm };
}

