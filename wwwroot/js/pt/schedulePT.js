let currentWeek = 0; // 0 = this week, -1 = last week, 1 = next week
let currentView = 'grid';

document.addEventListener('DOMContentLoaded', function() {
    updateCalendar();
});

function previousWeek() {
    currentWeek--;
    updateCalendar();
}

function nextWeek() {
    currentWeek++;
    updateCalendar();
}

function switchView(view) {
    currentView = view;
    
    if (view === 'grid') {
        document.getElementById('calendarGrid').style.display = 'grid';
        document.getElementById('scheduleList').classList.remove('active');
        document.getElementById('gridViewBtn').classList.add('active');
        document.getElementById('listViewBtn').classList.remove('active');
    } else {
        document.getElementById('calendarGrid').style.display = 'none';
        document.getElementById('scheduleList').classList.add('active');
        document.getElementById('gridViewBtn').classList.remove('active');
        document.getElementById('listViewBtn').classList.add('active');
    }
    updateCalendar();
}

async function updateCalendar() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (currentWeek * 7)); // Monday
    
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    
    // Update date display
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const dateStr = currentWeek === 0 ? 'Tuần này' : 
                    currentWeek === -1 ? 'Tuần trước' :
                    currentWeek === 1 ? 'Tuần sau' :
                    `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
    document.getElementById('currentDate').textContent = dateStr;
    
    try {
        const bookings = await loadBookings(startOfWeek);
        if (currentView === 'grid') {
            renderGridView(startOfWeek, days, bookings);
        } else {
            renderListView(startOfWeek, dayNames, bookings);
        }
    } catch (error) {
        console.error('Error updating calendar:', error);
        showScheduleError(error.message || 'Không thể tải lịch trình');
    }
}

function formatDate(date) {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function loadBookings(startOfWeek) {
    const grid = document.getElementById('calendarGrid');
    const list = document.getElementById('scheduleList');

    grid.innerHTML = '<div></div>';
    if (list) {
        list.innerHTML = `
            <div class="empty-schedule">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Đang tải lịch hẹn...</p>
            </div>
        `;
    }

    try {
        const startParam = startOfWeek.toISOString().split('T')[0];
        const response = await fetch(`/PT/Schedule/Week?start=${startParam}`, { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Không thể kết nối đến máy chủ');
        }

        const result = await response.json();
        if (!result.success || !Array.isArray(result.data)) {
            throw new Error(result.message || 'Không thể tải lịch hẹn');
        }

        return result.data.map(booking => normalizeBookingForWeek(booking, startOfWeek));
    } catch (error) {
        throw error;
    }
}

function normalizeBookingForWeek(booking, startOfWeek) {
    const bookingDate = booking.startTime ? new Date(booking.startTime) : null;
    let dayIndex = 1;
    let timeLabel = '00:00';

    if (bookingDate) {
        const jsDay = bookingDate.getDay(); // 0-6
        dayIndex = ((jsDay + 6) % 7) + 1; // convert Sunday=0 to 7
        timeLabel = bookingDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    return {
        id: booking.id,
        clientName: booking.clientName || 'Khách hàng',
        time: timeLabel,
        duration: booking.duration ?? 60,
        day: dayIndex,
        status: booking.status || 'Pending',
        type: booking.type || '1-on-1',
        notes: booking.notes || '',
        startDateTime: bookingDate
    };
}

function renderGridView(startOfWeek, days, bookings) {
    const grid = document.getElementById('calendarGrid');
    
    // Clear existing content except first empty cell
    grid.innerHTML = '<div></div>';
    
    // Create day headers
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    days.forEach((day, index) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + index);
        date.setHours(0, 0, 0, 0);
        
        const isToday = date.getTime() === today.getTime();
        const header = document.createElement('div');
        header.className = `day-header ${isToday ? 'today' : ''}`;
        header.innerHTML = `
            <div>${day}</div>
            <div style="font-size: 0.85rem; opacity: 0.7; margin-top: 0.3rem;">${date.getDate()}/${date.getMonth() + 1}</div>
        `;
        grid.appendChild(header);
    });
    
    // Create time slots (6 AM to 10 PM)
    const timeSlots = [];
    for (let hour = 6; hour < 22; hour++) {
        timeSlots.push(hour);
    }
    
    timeSlots.forEach(hour => {
        // Time label
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-slot';
        timeLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
        grid.appendChild(timeLabel);
        
        // Cells for each day
        days.forEach((day, dayIndex) => {
            const cell = document.createElement('div');
            cell.className = 'time-cell';
            
            // Find bookings for this time slot
            const cellBookings = bookings.filter(b => {
                const bookingTime = parseInt(b.time.split(':')[0]);
                const bookingDay = b.day;
                return bookingDay === dayIndex + 1 && bookingTime === hour;
            });
            
            if (cellBookings.length > 0) {
                cell.classList.add('has-booking');
                const booking = cellBookings[0];
                const badge = document.createElement('div');
                badge.className = `booking-badge ${booking.status.toLowerCase()}`;
                badge.textContent = booking.clientName.split(' ').pop();
                badge.title = `${booking.clientName} - ${booking.time} (${booking.type || '1-on-1'})`;
                cell.appendChild(badge);
            }
            
            grid.appendChild(cell);
        });
    });
}

function renderListView(startOfWeek, dayNames, bookings) {
    const list = document.getElementById('scheduleList');
    list.innerHTML = '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    dayNames.forEach((dayName, index) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + index);
        date.setHours(0, 0, 0, 0);
        
        const dayBookings = bookings.filter(b => b.day === index + 1);
        
        const daySection = document.createElement('div');
        daySection.className = 'schedule-day';
        
        const isToday = date.getTime() === today.getTime();
        const dateStr = `${dayName}, ${formatDate(date)}`;
        
        daySection.innerHTML = `
            <div class="schedule-day-header">
                <span>${dateStr}${isToday ? ' <span style="color: #4ade80;">(Hôm nay)</span>' : ''}</span>
                <span style="font-size: 0.9rem; opacity: 0.7;">${dayBookings.length} buổi</span>
            </div>
            <div class="day-bookings">
                ${dayBookings.length > 0 ? 
                    dayBookings.map(booking => `
                        <div class="booking-card ${booking.status.toLowerCase()}" onclick="viewBooking('${escapeHtml(booking.clientName)}')">
                            <div class="booking-card-header">
                                <div class="booking-client-info">
                                    <div class="booking-avatar">
                                        <i class="fas fa-user"></i>
                                    </div>
                                    <div class="booking-client-details">
                                        <h4>${escapeHtml(booking.clientName)}</h4>
                                        <p>${booking.time} - ${calculateEndTime(booking.time, booking.duration)}</p>
                                    </div>
                                </div>
                                <span class="booking-status-badge status-${booking.status.toLowerCase()}">
                                    ${booking.status}
                                </span>
                            </div>
                            <div class="booking-details">
                                <span><i class="fas fa-clock"></i> ${booking.duration} phút</span>
                                <span><i class="fas fa-dumbbell"></i> ${escapeHtml(booking.type || '1-on-1')}</span>
                            </div>
                        </div>
                    `).join('') :
                    '<div class="empty-schedule"><i class="fas fa-calendar-times"></i><p>Không có lịch hẹn</p></div>'
                }
            </div>
        `;
        
        list.appendChild(daySection);
    });
}

function calculateEndTime(startTime, duration) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, minutes, 0, 0);
    start.setMinutes(start.getMinutes() + duration);
    return `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
}

function viewBooking(clientName) {
    // TODO: Open booking details modal
    console.log('View booking for:', clientName);
    alert('Chi tiết lịch hẹn cho: ' + clientName);
}

function showScheduleError(message) {
    const grid = document.getElementById('calendarGrid');
    const list = document.getElementById('scheduleList');

    if (grid) {
        grid.innerHTML = `
            <div class="empty-schedule" style="grid-column: 1 / -1;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }

    if (list) {
        list.innerHTML = `
            <div class="empty-schedule">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${escapeHtml(message)}</p>
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

