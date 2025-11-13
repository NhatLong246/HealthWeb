document.addEventListener('DOMContentLoaded', function() {
    loadDashboardStats();
    loadRecentBookings();
});

async function loadDashboardStats() {
    const totalClientsEl = document.getElementById('totalClients');
    const todayBookingsEl = document.getElementById('todayBookings');
    const monthlyRevenueEl = document.getElementById('monthlyRevenue');
    const ratingEl = document.getElementById('rating');

    try {
        const response = await fetch('/PT/Dashboard/StatsData', { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        if (!result.success || !result.data) {
            throw new Error(result.message || 'Không thể tải thống kê');
        }

        const data = result.data;
        const totalClients = data.totalClients ?? 0;
        const todayBookings = data.todayBookings ?? 0;
        const monthlyRevenueValue = Number(data.monthlyRevenue ?? 0);
        const ratingValue = Number(data.rating ?? 0);
        const reviewsCount = data.reviews ?? 0;
        const formattedRevenue = `${formatCurrency(monthlyRevenueValue)}đ`;

        totalClientsEl.textContent = totalClients;
        document.getElementById('totalClientsSummary').textContent = `${totalClients} khách đang hoạt động`;

        todayBookingsEl.textContent = todayBookings;
        document.getElementById('todayBookingsSummary').textContent = `${todayBookings} buổi trong hôm nay`;

        monthlyRevenueEl.textContent = formattedRevenue;
        document.getElementById('monthlyRevenueSummary').textContent = `${formattedRevenue} trong tháng này`;

        ratingEl.textContent = ratingValue.toFixed(1);
        document.getElementById('ratingReviews').textContent = `${reviewsCount} đánh giá`;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        totalClientsEl.textContent = '--';
        todayBookingsEl.textContent = '--';
        monthlyRevenueEl.textContent = '--';
        ratingEl.textContent = '--';
        document.getElementById('totalClientsSummary').textContent = 'Không thể tải dữ liệu';
        document.getElementById('todayBookingsSummary').textContent = 'Không thể tải dữ liệu';
        document.getElementById('monthlyRevenueSummary').textContent = 'Không thể tải dữ liệu';
        document.getElementById('ratingReviews').textContent = 'Đang cập nhật';
    }
}

async function loadRecentBookings() {
    const bookingsList = document.getElementById('bookingsList');

    try {
        const response = await fetch('/PT/Dashboard/RecentBookings', { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        if (!result.success || !Array.isArray(result.data)) {
            throw new Error(result.message || 'Không thể tải lịch hẹn');
        }

        const bookings = result.data;

        if (bookings.length === 0) {
            bookingsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>Chưa có lịch hẹn nào</p>
                </div>
            `;
            return;
        }

        bookingsList.innerHTML = bookings.map(booking => {
            const startTime = safeParseDate(booking.startTime);
            const timeLabel = startTime
                ? startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                : 'Chưa xác định';
            const dateLabel = startTime ? formatBookingDate(startTime) : 'Chưa xác định';
            const usernameLabel = booking.username ? `@@${booking.username}` : '';
            const statusText = booking.status || 'Pending';
            const statusClass = getStatusClass(statusText);
            const typeLabel = booking.type || 'Chưa cập nhật';

            return `
                <div class="booking-item">
                    <div class="booking-header">
                        <div class="booking-client">
                            <div class="booking-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="booking-info">
                                <h4>${escapeHtml(booking.clientName)}</h4>
                                <p>${escapeHtml(usernameLabel)}</p>
                            </div>
                        </div>
                        <span class="booking-status ${statusClass}">
                            ${escapeHtml(statusText)}
                        </span>
                    </div>
                    <div class="booking-details">
                        <span><i class="fas fa-clock"></i> ${escapeHtml(timeLabel)}</span>
                        <span><i class="fas fa-calendar"></i> ${escapeHtml(dateLabel)}</span>
                        <span><i class="fas fa-dumbbell"></i> ${escapeHtml(typeLabel)}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading recent bookings:', error);
        bookingsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${escapeHtml(error.message || 'Không thể tải lịch hẹn')}</p>
            </div>
        `;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatCurrency(amount) {
    const value = Number(amount) || 0;
    return value.toLocaleString('vi-VN');
}

function safeParseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatBookingDate(date) {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffInTime = targetDate.getTime() - startOfToday.getTime();
    const diffInDays = Math.round(diffInTime / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Hôm nay';
    if (diffInDays === 1) return 'Ngày mai';
    if (diffInDays === -1) return 'Hôm qua';
    return targetDate.toLocaleDateString('vi-VN');
}

function getStatusClass(status) {
    const value = (status || '').toLowerCase();
    if (value.includes('confirm') || value.includes('xác nhận')) return 'status-confirmed';
    if (value.includes('cancel') || value.includes('hủy')) return 'status-cancelled';
    return 'status-pending';
}

