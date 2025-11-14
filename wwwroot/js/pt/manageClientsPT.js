let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    // Client-side filtering only (data already rendered from server)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    document.querySelectorAll('#statusFilters .filter-tab').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('#statusFilters .filter-tab').forEach(tab => tab.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            applyFilters();
        });
    });
});

function applyFilters() {
    const tableBody = document.getElementById('clientsTableBody');
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    const searchTerm = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    let visibleCount = 0;

    rows.forEach(row => {
        if (row.classList.contains('empty-state')) {
            return; // Skip empty state row
        }

        const status = row.getAttribute('data-status') || '';
        const text = row.textContent.toLowerCase();

        // Filter by status
        const statusMatch = currentFilter === 'all' || status === currentFilter;

        // Filter by search term
        const searchMatch = !searchTerm || text.includes(searchTerm);

        if (statusMatch && searchMatch) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // Update count
    const countElement = document.getElementById('clientsCount');
    if (countElement) {
        countElement.textContent = `${visibleCount} khách hàng`;
    }

    // Show empty state if no results
    const hasVisibleRows = rows.some(row => row.style.display !== 'none' && !row.classList.contains('empty-state'));
    let emptyStateRow = tableBody.querySelector('.empty-state-row');
    
    if (!hasVisibleRows && !emptyStateRow) {
        emptyStateRow = document.createElement('tr');
        emptyStateRow.className = 'empty-state-row';
        emptyStateRow.innerHTML = `
            <td colspan="6" class="empty-state">
                <i class="fas fa-users"></i>
                <p>Không tìm thấy khách hàng nào</p>
            </td>
        `;
        tableBody.appendChild(emptyStateRow);
    } else if (hasVisibleRows && emptyStateRow) {
        emptyStateRow.remove();
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatStatusLabel(status) {
    switch ((status || '').toLowerCase()) {
        case 'active':
            return 'Hoạt động';
        case 'inactive':
            return 'Không hoạt động';
        default:
            return 'Chờ duyệt';
    }
}

function formatRelativeTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
}

function formatUsername(username) {
    if (!username) {
        return '';
    }
    return String.fromCharCode(64) + username;
}

// Client Detail Modal Functions
async function openClientDetail(clientId) {
    const modal = document.getElementById('clientDetailModal');
    const content = document.getElementById('clientDetailContent');
    
    if (!modal || !content) {
        console.error('Modal elements not found');
        return;
    }
    
    modal.classList.add('active');
    content.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Đang tải thông tin...</p>
        </div>
    `;

    try {
        const response = await fetch(`/PT/Clients/Detail/${encodeURIComponent(clientId)}`, { 
            credentials: 'include',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();
        if (!html || html.trim() === '') {
            throw new Error('Không nhận được dữ liệu từ máy chủ');
        }

        content.innerHTML = html;
    } catch (error) {
        console.error('Error loading client detail:', error);
        content.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${escapeHtml(error.message || 'Không thể tải thông tin khách hàng')}</p>
            </div>
        `;
    }
}

function closeClientDetail() {
    const modal = document.getElementById('clientDetailModal');
    modal.classList.remove('active');
}

// Event listeners for modal
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('clientDetailModal');
    const closeBtn = document.getElementById('closeClientModal');
    const overlay = modal?.querySelector('.modal-overlay');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeClientDetail);
    }

    if (overlay) {
        overlay.addEventListener('click', closeClientDetail);
    }

    // Close on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal?.classList.contains('active')) {
            closeClientDetail();
        }
    });
});

// Get anti-forgery token
function getToken() {
    return document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';
}

// Accept client request
async function acceptClientRequest(requestId, clientId) {
    if (!confirm('Bạn có chắc chắn muốn chấp nhận yêu cầu này?')) {
        return;
    }

    try {
        const response = await fetch('/PT/Requests/Accept', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': getToken()
            },
            body: JSON.stringify({
                requestId: requestId
            })
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message);
            // Đóng modal và reload trang để cập nhật danh sách với trạng thái mới
            closeClientDetail();
            window.location.reload();
        } else {
            alert(result.message || 'Có lỗi xảy ra khi chấp nhận yêu cầu');
        }
    } catch (error) {
        console.error('Error accepting request:', error);
        alert('Có lỗi xảy ra khi chấp nhận yêu cầu');
    }
}

// Show reject reason box
function showRejectReasonBox(requestId, clientId) {
    const reasonBox = document.getElementById(`rejectReasonBox_${clientId}`);
    if (reasonBox) {
        reasonBox.style.display = 'block';
        const textarea = document.getElementById(`rejectReasonInput_${clientId}`);
        if (textarea) {
            textarea.focus();
        }
    }
}

// Hide reject reason box
function hideRejectReasonBox(clientId) {
    const reasonBox = document.getElementById(`rejectReasonBox_${clientId}`);
    if (reasonBox) {
        reasonBox.style.display = 'none';
        const textarea = document.getElementById(`rejectReasonInput_${clientId}`);
        if (textarea) {
            textarea.value = '';
        }
    }
}

// Reject client request
async function rejectClientRequest(requestId, clientId) {
    const reasonInput = document.getElementById(`rejectReasonInput_${clientId}`);
    const reason = reasonInput?.value?.trim();

    if (!reason || reason === '') {
        alert('Vui lòng nhập lý do từ chối');
        return;
    }

    try {
        const response = await fetch('/PT/Requests/Reject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': getToken()
            },
            body: JSON.stringify({
                requestId: requestId,
                reason: reason
            })
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message);
            // Đóng modal và reload trang để xóa client khỏi danh sách
            closeClientDetail();
            window.location.reload();
        } else {
            alert(result.message || 'Có lỗi xảy ra khi từ chối yêu cầu');
        }
    } catch (error) {
        console.error('Error rejecting request:', error);
        alert('Có lỗi xảy ra khi từ chối yêu cầu');
    }
}

