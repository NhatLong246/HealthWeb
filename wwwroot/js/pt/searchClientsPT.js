let currentClients = [];
let profileModal = null;
let profileContent = null;

document.addEventListener('DOMContentLoaded', function() {
    profileModal = document.getElementById('clientProfileModal');
    profileContent = document.getElementById('clientProfileContent');

    const closeButton = document.getElementById('closeClientProfile');
    if (closeButton) {
        closeButton.addEventListener('click', closeClientProfile);
    }

    if (profileModal) {
        profileModal.addEventListener('click', function(event) {
            if (event.target === profileModal) {
                closeClientProfile();
            }
        });
    }

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && profileModal && profileModal.classList.contains('show')) {
            closeClientProfile();
        }
    });

    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchClients();
        }
    });

    document.getElementById('sortSelect').addEventListener('change', () => sortClients());

    ['goalFilter', 'locationFilter', 'timeFilter', 'budgetFilter'].forEach(id => {
        document.getElementById(id).addEventListener('change', searchClients);
    });

    searchClients();
});

async function loadClientsFromServer(filters) {
    const grid = document.getElementById('clientsGrid');
    grid.innerHTML = `
        <div class="empty-results" style="grid-column: 1 / -1;">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Đang tải khách hàng...</p>
        </div>
    `;

    try {
        const url = new URL('/PT/SearchClients/List', window.location.origin);
        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                url.searchParams.append(key, value);
            }
        });

        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Không thể kết nối đến máy chủ');
        }

        const result = await response.json();
        if (!result.success || !Array.isArray(result.data)) {
            throw new Error(result.message || 'Không thể tải danh sách khách hàng');
        }

        currentClients = result.data.map(normalizeClientData);
        sortClients();
    } catch (error) {
        console.error('Error loading clients:', error);
        grid.innerHTML = `
            <div class="empty-results" style="grid-column: 1 / -1;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${escapeHtml(error.message || 'Không thể tải danh sách khách hàng')}</p>
            </div>
        `;
        document.getElementById('resultNumber').textContent = '0';
    }
}

function normalizeClientData(client) {
    const activityDate = client.activity ? new Date(client.activity) : null;
    return {
        ...client,
        username: client.username || '',
        goal: client.goal || 'Chưa cập nhật',
        location: client.location || 'Chưa cập nhật',
        stats: {
            sessions: Number(client.stats?.sessions ?? 0),
            hours: Number(client.stats?.hours ?? 0),
            rating: Number(client.stats?.rating ?? 0)
        },
        tags: Array.isArray(client.tags) ? client.tags : [],
        activityDate,
        activityLabel: activityDate ? formatRelativeTime(activityDate) : 'Chưa có lịch hẹn',
        createdDate: client.createdDate ? new Date(client.createdDate) : null
    };
}

async function searchClients() {
    const filters = {
        search: document.getElementById('searchInput').value.trim(),
        goal: document.getElementById('goalFilter').value,
        location: document.getElementById('locationFilter').value,
        time: document.getElementById('timeFilter').value,
        budget: document.getElementById('budgetFilter').value
    };

    await loadClientsFromServer(filters);
}

function sortClients(render = true) {
    const sortBy = document.getElementById('sortSelect').value;
    const sorted = [...currentClients];

    switch (sortBy) {
        case 'newest':
            sorted.sort((a, b) => {
                const dateA = a.createdDate ? a.createdDate.getTime() : 0;
                const dateB = b.createdDate ? b.createdDate.getTime() : 0;
                return dateB - dateA;
            });
            break;
        case 'activity':
            sorted.sort((a, b) => {
                const dateA = a.activityDate ? a.activityDate.getTime() : 0;
                const dateB = b.activityDate ? b.activityDate.getTime() : 0;
                return dateB - dateA;
            });
            break;
        case 'goals':
            sorted.sort((a, b) => (b.stats.sessions ?? 0) - (a.stats.sessions ?? 0));
            break;
        default:
            break;
    }

    if (render) {
        displayClients(sorted);
    }

    return sorted;
}

function displayClients(clients) {
    const grid = document.getElementById('clientsGrid');
    document.getElementById('resultNumber').textContent = clients.length;

    if (clients.length === 0) {
        grid.innerHTML = `
            <div class="empty-results" style="grid-column: 1 / -1;">
                <i class="fas fa-users"></i>
                <p>Không tìm thấy khách hàng nào phù hợp</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = clients.map(client => `
        <div class="client-card">
            <div class="client-header">
                <div class="client-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="client-info">
                    <h3>${escapeHtml(client.name)}</h3>
                    <p>${escapeHtml(formatUsername(client.username))} • ${escapeHtml(client.location)}</p>
                </div>
            </div>

            <div class="client-tags">
                ${client.tags.length > 0 ? client.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('') : '<span class="tag">Chưa cập nhật</span>'}
            </div>

            <div class="client-stats">
                <div class="stat-item">
                    <div class="stat-value">${client.stats.sessions}</div>
                    <div class="stat-label">Buổi tập</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${client.stats.hours}h</div>
                    <div class="stat-label">Tổng giờ</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${client.stats.rating.toFixed(1)}</div>
                    <div class="stat-label">Đánh giá</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${escapeHtml(client.goal)}</div>
                    <div class="stat-label">Mục tiêu</div>
                </div>
            </div>

            <div class="client-actions">
                <button class="action-btn btn-primary" onclick="contactClient('${client.id}')">
                    <i class="fas fa-envelope"></i> Liên hệ
                </button>
                <button class="action-btn btn-secondary" onclick="viewProfile('${client.id}')">
                    <i class="fas fa-user-circle"></i> Xem profile
                </button>
            </div>
        </div>
    `).join('');
}

function contactClient(clientId) {
    // TODO: Open contact/message modal
    console.log('Contact client:', clientId);
    alert('Tính năng đang phát triển!');
}

function viewProfile(clientId) {
    if (!profileModal || !profileContent) {
        return;
    }

    const client = currentClients.find(c => c.id === clientId);
    if (!client) {
        return;
    }

    profileContent.innerHTML = `
        <div class="client-profile-header">
            <div class="client-profile-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="client-profile-info">
                <h3>${escapeHtml(client.name)}</h3>
                <p><i class="fas fa-at"></i> ${escapeHtml(formatUsername(client.username))}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(client.location || 'Chưa cập nhật')}</p>
                <p><i class="fas fa-bullseye"></i> Mục tiêu chính: ${escapeHtml(client.goal || 'Đang cập nhật')}</p>
            </div>
        </div>

        <div class="client-profile-section">
            <h4><i class="fas fa-chart-line"></i> Thống kê tập luyện</h4>
            <div class="client-profile-stats">
                <div class="client-profile-stat">
                    <div class="value">${client.stats?.sessions ?? 0}</div>
                    <div class="label">Tổng buổi tập</div>
                </div>
                <div class="client-profile-stat">
                    <div class="value">${client.stats?.hours ?? 0}h</div>
                    <div class="label">Tổng giờ tập</div>
                </div>
                <div class="client-profile-stat">
                    <div class="value">${client.stats?.rating ?? '0.0'}</div>
                    <div class="label">Đánh giá trung bình</div>
                </div>
                <div class="client-profile-stat">
                    <div class="value">${escapeHtml(client.activity || 'Không rõ')}</div>
                    <div class="label">Hoạt động gần đây</div>
                </div>
            </div>
        </div>

        <div class="client-profile-section">
            <h4><i class="fas fa-tags"></i> Sở thích & nhu cầu</h4>
            <div class="client-profile-tags">
                ${(client.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('') || '<span class="tag">Chưa cập nhật</span>'}
            </div>
        </div>

        <div class="client-profile-section">
            <h4><i class="fas fa-comments"></i> Ghi chú nhanh</h4>
            <p style="opacity: 0.8;">
                Khách hàng quan tâm đến chương trình phù hợp với mục tiêu ${escapeHtml(client.goal || '...')}.
                Hãy chủ động liên hệ để trao đổi chi tiết và đề xuất lộ trình luyện tập.
            </p>
        </div>

        <div class="client-actions" style="margin-top: 1.5rem;">
            <button class="action-btn btn-primary" onclick="contactClient('${client.id}')">
                <i class="fas fa-paper-plane"></i> Liên hệ ngay
            </button>
            <button class="action-btn btn-secondary" onclick="closeClientProfile()">
                <i class="fas fa-times-circle"></i> Đóng lại
            </button>
        </div>
    `;

    profileModal.classList.add('show');
    profileModal.setAttribute('aria-hidden', 'false');
}

function closeClientProfile() {
    if (!profileModal) {
        return;
    }
    profileModal.classList.remove('show');
    profileModal.setAttribute('aria-hidden', 'true');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatRelativeTime(date) {
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

