let currentFilter = 'all';
let clients = [];

document.addEventListener('DOMContentLoaded', function() {
    loadClientsStats();
    loadClients();

    document.getElementById('searchInput').addEventListener('input', applyFilters);

    document.querySelectorAll('#statusFilters .filter-tab').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('#statusFilters .filter-tab').forEach(tab => tab.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            applyFilters();
        });
    });
});

async function loadClientsStats() {
    try {
        const response = await fetch('/PT/Clients/Stats', { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Không thể kết nối đến máy chủ');
        }

        const result = await response.json();
        if (!result.success || !result.data) {
            throw new Error(result.message || 'Không thể tải thống kê');
        }

        document.getElementById('totalClients').textContent = result.data.totalClients ?? 0;
        document.getElementById('activeClients').textContent = result.data.activeClients ?? 0;
        document.getElementById('totalSessions').textContent = result.data.totalSessions ?? 0;
        document.getElementById('avgRating').textContent = (result.data.avgRating ?? 0).toFixed(1);
    } catch (error) {
        console.error('Error loading client stats:', error);
        document.getElementById('totalClients').textContent = '--';
        document.getElementById('activeClients').textContent = '--';
        document.getElementById('totalSessions').textContent = '--';
        document.getElementById('avgRating').textContent = '--';
    }
}

async function loadClients() {
    const tableBody = document.getElementById('clientsTableBody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Đang tải danh sách khách hàng...</p>
            </td>
        </tr>
    `;

    try {
        const response = await fetch('/PT/Clients/List', { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Không thể kết nối đến máy chủ');
        }

        const result = await response.json();
        if (!result.success || !Array.isArray(result.data)) {
            throw new Error(result.message || 'Không thể tải danh sách khách hàng');
        }

        clients = result.data;
        applyFilters();
    } catch (error) {
        console.error('Error loading clients:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${escapeHtml(error.message || 'Không thể tải danh sách khách hàng')}</p>
                </td>
            </tr>
        `;
    }
}

function applyFilters() {
    let filtered = [...clients];

    if (currentFilter !== 'all') {
        filtered = filtered.filter(c => (c.status || '').toLowerCase() === currentFilter);
    }

    const term = document.getElementById('searchInput').value.trim().toLowerCase();
    if (term) {
        filtered = filtered.filter(c =>
            (c.name || '').toLowerCase().includes(term) ||
            (c.username || '').toLowerCase().includes(term) ||
            (c.email || '').toLowerCase().includes(term) ||
            (c.goal || '').toLowerCase().includes(term)
        );
    }

    displayClients(filtered);
}

function displayClients(clientsList) {
    const tbody = document.getElementById('clientsTableBody');
    document.getElementById('clientsCount').textContent = `${clientsList.length} khách hàng`;

    if (clientsList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>Không tìm thấy khách hàng nào</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = clientsList.map(client => `
        <tr>
            <td>
                <div class="client-info">
                    <div class="client-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="client-details">
                        <h4>${escapeHtml(client.name)}</h4>
                        <p>${escapeHtml(formatUsername(client.username))} • ${escapeHtml(client.email)}</p>
                        <p style="opacity: 0.6; font-size: 0.8rem;">
                            ${client.lastActivity ? `Lịch gần nhất: ${escapeHtml(formatRelativeTime(client.lastActivity))}` : 'Chưa có lịch hẹn'}
                        </p>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(client.goal ?? 'Chưa cập nhật')}</td>
            <td>${client.sessions ?? 0}</td>
            <td>
                <span class="status-badge status-${(client.status || 'pending').toLowerCase()}">
                    ${formatStatusLabel(client.status)}
                </span>
            </td>
            <td>
                ${(client.rating ?? 0) > 0 ? `
                    <div style="display: flex; align-items: center; gap: 0.3rem;">
                        <i class="fas fa-star" style="color: #fbbf24;"></i>
                        <span>${Number(client.rating).toFixed(1)}</span>
                    </div>
                ` : '<span style="opacity: 0.5;">Chưa có</span>'}
            </td>
            <td>
                <div class="action-buttons">
                    <a href="/PT/ClientDetail/${client.id}" class="action-btn btn-primary">
                        <i class="fas fa-eye"></i> Xem
                    </a>
                    <a href="/PT/ClientSchedule/${client.id}" class="action-btn btn-secondary">
                        <i class="fas fa-calendar"></i> Lịch
                    </a>
                </div>
            </td>
        </tr>
    `).join('');
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

