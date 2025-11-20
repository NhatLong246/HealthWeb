// PT Management JavaScript

// Helper function to format date as YYYY-MM-DD without timezone issues
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to get date string from ISO date string (handles timezone)
function getDateStringFromISO(isoString) {
    const date = new Date(isoString);
    return formatDateLocal(date);
}

// Helper function to format availability JSON to readable format
function formatAvailability(availabilityStr) {
    if (!availabilityStr || availabilityStr === '-') return '-';
    
    try {
        // Try to parse as JSON
        const availability = typeof availabilityStr === 'string' ? JSON.parse(availabilityStr) : availabilityStr;
        
        // Format: "Mon: 8:00-12:00, Wed: 14:00-18:00"
        const dayNames = {
            'Mon': 'Thứ 2',
            'Tue': 'Thứ 3',
            'Wed': 'Thứ 4',
            'Thu': 'Thứ 5',
            'Fri': 'Thứ 6',
            'Sat': 'Thứ 7',
            'Sun': 'CN'
        };
        
        const formatted = Object.entries(availability)
            .map(([day, time]) => `${dayNames[day] || day}: ${time}`)
            .join(', ');
        
        return formatted || availabilityStr;
    } catch (e) {
        // If not JSON, return as is
        return availabilityStr;
    }
}

// State Management
let trainersData = [];
let filteredTrainersData = [];
let currentPTId = null;
let ptSummary = null;

// Schedule Calendar State
let currentScheduleMonth = new Date().getMonth();
let currentScheduleYear = new Date().getFullYear();
let selectedScheduleDate = null;

// Pagination
let ptCurrentPage = 1;
const ptItemsPerPage = 12;

// Pending PT State
let pendingPTData = [];
let filteredPendingPTData = [];
let currentPendingPTId = null;

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
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

// Render PT Cards
function renderPTCards() {
    const grid = document.getElementById('pt-cards-grid');
    const emptyState = document.getElementById('pt-empty-state');
    if (!grid) return;
    
    if (filteredTrainersData.length === 0) {
        grid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        updatePTCount();
        updatePTPagination();
        return;
    }
    
    grid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
    
    const startIndex = (ptCurrentPage - 1) * ptItemsPerPage;
    const endIndex = startIndex + ptItemsPerPage;
    const pageData = filteredTrainersData.slice(startIndex, endIndex);
    
    grid.innerHTML = pageData.map((pt, index) => createPTCard(pt, startIndex + index)).join('');
    
    updatePTPagination();
    updatePTCount();
}

// Create PT Card
function createPTCard(pt, index) {
    // Support both PascalCase (from API) and camelCase (fallback)
    const ptId = pt.PTId ?? pt.ptId ?? pt.UserId ?? pt.userId ?? '-';
    const userId = pt.UserId ?? pt.userId ?? ptId;
    const name = pt.Name ?? pt.name ?? '-';
    const email = pt.Email ?? pt.email ?? '-';
    const specialty = pt.Specialty ?? pt.specialty ?? '-';
    const city = pt.City ?? pt.city ?? '-';
    const pricePerHour = pt.PricePerHour ?? pt.pricePerHour ?? 0;
    const rating = pt.Rating ?? pt.rating ?? 0;
    const currentClients = pt.CurrentClients ?? pt.currentClients ?? 0;
    const revenueThisMonth = pt.RevenueThisMonth ?? pt.revenueThisMonth ?? 0;
    const completionRate = pt.CompletionRate ?? pt.completionRate ?? pt.SuccessRate ?? pt.successRate ?? 0;
    const cancelRate = pt.CancelRate ?? pt.cancelRate ?? 0;
    const verified = pt.Verified ?? pt.verified ?? false;
    const acceptingClients = pt.AcceptingClients ?? pt.acceptingClients ?? false;
    
    const verifiedBadge = verified ? 
        '<span class="status-badge status-active"><i class="fas fa-check-circle"></i> Đã xác minh</span>' : 
        '<span class="status-badge status-pending"><i class="fas fa-clock"></i> Chưa xác minh</span>';
    
    const acceptingBadge = acceptingClients ? 
        '<span class="status-badge status-active"><i class="fas fa-user-check"></i> Đang nhận</span>' : 
        '<span class="status-badge status-inactive"><i class="fas fa-user-times"></i> Không nhận</span>';
    
    return `
        <div class="user-card" style="animation-delay: ${index * 0.05}s">
            <div class="user-card-header">
                <div class="user-avatar-wrapper">
                    <div class="user-avatar" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <div class="user-status-badge-wrapper">
                        ${verifiedBadge}
                    </div>
                </div>
                <div class="user-info">
                    <h3 class="user-name">${name}</h3>
                    <p class="user-id">${ptId}</p>
                </div>
            </div>
            
            <div class="user-card-body">
                <div class="user-info-list">
                    <div class="user-info-item">
                        <i class="fas fa-envelope"></i>
                        <span>${email}</span>
                    </div>
                    <div class="user-info-item">
                        <i class="fas fa-briefcase"></i>
                        <span>${specialty}</span>
                    </div>
                    <div class="user-info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${city}</span>
                    </div>
                    <div class="user-info-item">
                        <i class="fas fa-dollar-sign"></i>
                        <span>${pricePerHour.toLocaleString('vi-VN')} VNĐ/giờ</span>
                    </div>
                </div>
                
                <div class="user-kpi-section">
                    <div class="kpi-mini-item kpi-goal">
                        <i class="fas fa-star"></i>
                        <div>
                            <span class="kpi-label">Điểm TB</span>
                            <span class="kpi-value-small">${rating.toFixed(1)} ⭐</span>
                        </div>
                    </div>
                    <div class="kpi-mini-item kpi-nutrition">
                        <i class="fas fa-users"></i>
                        <div>
                            <span class="kpi-label">Số khách</span>
                            <span class="kpi-value-small">${currentClients}</span>
                        </div>
                    </div>
                    <div class="kpi-mini-item kpi-workout">
                        <i class="fas fa-money-bill-wave"></i>
                        <div>
                            <span class="kpi-label">Doanh thu</span>
                            <span class="kpi-value-small">${(revenueThisMonth / 1000000).toFixed(1)}M</span>
                        </div>
                    </div>
                </div>
                
                <div class="user-metrics">
                    <div class="user-metric-item">
                        <div class="user-metric-label">
                            <span>Tỷ lệ hoàn thành</span>
                            <span class="user-metric-value">${completionRate.toFixed(1)}%</span>
                        </div>
                        <div class="user-metric-bar">
                            <div class="user-metric-fill high" 
                                 style="width: ${Math.min(completionRate, 100)}%; background: linear-gradient(135deg, #50c878 0%, #43e97b 100%);"></div>
                        </div>
                    </div>
                    <div class="user-metric-item">
                        <div class="user-metric-label">
                            <span>Tỷ lệ hủy</span>
                            <span class="user-metric-value">${cancelRate.toFixed(1)}%</span>
                        </div>
                        <div class="user-metric-bar">
                            <div class="user-metric-fill ${cancelRate > 10 ? 'low' : cancelRate > 5 ? 'medium' : 'high'}" 
                                 style="width: ${Math.min(cancelRate, 100)}%"></div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 15px;">
                    ${acceptingBadge}
                </div>
            </div>
            
            <div class="user-card-footer">
                <div class="user-card-actions">
                    <button class="btn-view-details" onclick="viewPTProfile360('${ptId}')">
                        <i class="fas fa-eye"></i>
                        <span>Chi tiết</span>
                    </button>
                    <button class="btn-card-action edit" onclick="event.stopPropagation(); openEditPTModal('${ptId}')" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-card-action delete" onclick="event.stopPropagation(); openDeletePTModal('${ptId}')" title="Xóa">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Load PT table view
function loadPTTableView() {
    const tbody = document.getElementById('pt-table-body');
    if (!tbody) return;
    
    const startIndex = (ptCurrentPage - 1) * ptItemsPerPage;
    const endIndex = startIndex + ptItemsPerPage;
    const pageData = filteredTrainersData.slice(startIndex, endIndex);
    
    tbody.innerHTML = pageData.map(pt => {
        const ptId = pt.PTId ?? pt.ptId ?? pt.UserId ?? pt.userId ?? '-';
        const name = pt.Name ?? pt.name ?? '-';
        const email = pt.Email ?? pt.email ?? '-';
        const specialty = pt.Specialty ?? pt.specialty ?? '-';
        const city = pt.City ?? pt.city ?? '-';
        const pricePerHour = pt.PricePerHour ?? pt.pricePerHour ?? 0;
        const rating = pt.Rating ?? pt.rating ?? 0;
        const currentClients = pt.CurrentClients ?? pt.currentClients ?? 0;
        const verified = pt.Verified ?? pt.verified ?? false;
        const acceptingClients = pt.AcceptingClients ?? pt.acceptingClients ?? false;
        
        return `
        <tr>
            <td><input type="checkbox" data-ptid="${ptId}"></td>
            <td>${ptId}</td>
            <td>${name}</td>
            <td>${email}</td>
            <td>${specialty}</td>
            <td>${city}</td>
            <td>${pricePerHour.toLocaleString('vi-VN')} VNĐ</td>
            <td>${rating.toFixed(1)} ⭐</td>
            <td>${currentClients}</td>
            <td>${verified ? '<span class="status-badge status-active">Đã xác minh</span>' : '<span class="status-badge status-pending">Chưa xác minh</span>'}</td>
            <td>${acceptingClients ? '<span class="status-badge status-active">Đang nhận</span>' : '<span class="status-badge status-inactive">Không nhận</span>'}</td>
            <td>
                <button class="btn-edit" onclick="viewPTProfile360('${ptId}')"><i class="fas fa-eye"></i></button>
            </td>
        </tr>
    `;
    }).join('');
}

// Update PT count
function updatePTCount() {
    const countEl = document.getElementById('pt-count');
    if (countEl) {
        countEl.textContent = filteredTrainersData.length;
    }
}

// Update PT KPI cards from summary data
function updatePTKPIs() {
    if (!ptSummary) return;
    
        const el = id => document.getElementById(id);
    if (el('total-trainers')) el('total-trainers').textContent = ptSummary.TotalTrainers || 0;
    if (el('avg-revenue-per-pt')) el('avg-revenue-per-pt').textContent = (ptSummary.AverageRevenuePerPT || 0).toLocaleString('vi-VN');
    if (el('avg-active-clients')) el('avg-active-clients').textContent = (ptSummary.AverageActiveClients || 0).toFixed(1);
    if (el('cancel-rate')) el('cancel-rate').textContent = (ptSummary.CancelRate || 0).toFixed(1);
    if (el('avg-rating')) el('avg-rating').textContent = (ptSummary.AverageRating || 0).toFixed(1);
    if (el('pt-hiring-rate')) el('pt-hiring-rate').textContent = (ptSummary.PTHiringRate || 0).toFixed(1);
    if (el('avg-bookings-per-week')) el('avg-bookings-per-week').textContent = (ptSummary.AverageBookingsPerWeek || 0).toFixed(1);
}

// Filter PT - Load from API with filters
async function applyPTFilters() {
    const keyword = document.getElementById('pt-search-keyword')?.value || '';
    const specialty = document.getElementById('pt-filter-specialty')?.value || '';
    const city = document.getElementById('pt-filter-city')?.value || '';
    const accepting = document.getElementById('pt-filter-accepting')?.value || '';
    const rating = parseFloat(document.getElementById('pt-filter-rating')?.value) || 0;
    
    try {
        const params = new URLSearchParams();
        if (keyword) params.append('search', keyword);
        if (specialty) params.append('specialty', specialty);
        if (city) params.append('city', city);
        if (accepting) params.append('acceptingClients', accepting === '1');
        if (rating) params.append('minRating', rating);
        
        const response = await fetch(`/Admin/QuanLiPT/Data?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to load PT data');
        
        const data = await response.json();
        trainersData = data.Trainers || [];
        filteredTrainersData = [...trainersData];
        ptSummary = data.Summary;
    
    ptCurrentPage = 1;
        updatePTKPIs();
    renderPTCards();
    loadPTTableView();
    } catch (error) {
        console.error('Error loading PT data:', error);
        showNotification('Lỗi khi tải dữ liệu PT', 'error');
    }
}

// Reset PT filters
async function resetPTFilters() {
    document.getElementById('pt-search-keyword').value = '';
    document.getElementById('pt-filter-specialty').value = '';
    document.getElementById('pt-filter-city').value = '';
    document.getElementById('pt-filter-accepting').value = '';
    document.getElementById('pt-filter-rating').value = '';
    
    await applyPTFilters();
}

// View PT Profile 360
async function viewPTProfile360(ptid) {
    try {
        const response = await fetch(`/Admin/QuanLiPT/${encodeURIComponent(ptid)}/Profile360`);
        if (!response.ok) throw new Error('Failed to load PT profile');
        
        const data = await response.json();
        const pt = data.BasicInfo ?? data.basicInfo;
        
    if (!pt) return;
    
    currentPTId = ptid;
    
    // Support both PascalCase (from API) and camelCase (fallback)
    const ptId = pt.PTId ?? pt.ptId ?? pt.UserId ?? pt.userId ?? '-';
    const name = pt.Name ?? pt.name ?? '-';
    const email = pt.Email ?? pt.email ?? '-';
    const experience = pt.Experience ?? pt.experience ?? 0;
    const city = pt.City ?? pt.city ?? '-';
    const pricePerHour = pt.PricePerHour ?? pt.pricePerHour ?? 0;
    const specialty = pt.Specialty ?? pt.specialty ?? '-';
    const certificate = pt.Certificate ?? pt.certificate ?? '-';
    const bio = pt.Bio ?? pt.bio ?? '-';
    const availability = pt.Availability ?? pt.availability ?? '';
    const verified = pt.Verified ?? pt.verified ?? false;
    const acceptingClients = pt.AcceptingClients ?? pt.acceptingClients ?? false;
    
    // Fill info tab
        document.getElementById('pt-detail-id').textContent = ptId;
        document.getElementById('pt-detail-name').textContent = name;
        document.getElementById('pt-detail-email').textContent = email;
        document.getElementById('pt-detail-experience').textContent = experience + ' năm';
        document.getElementById('pt-detail-city').textContent = city;
        document.getElementById('pt-detail-price').textContent = pricePerHour.toLocaleString('vi-VN');
        document.getElementById('pt-detail-specialty').textContent = specialty;
        document.getElementById('pt-detail-certificate').textContent = certificate;
        // Bio and availability - use innerHTML/textContent based on element type
        const bioEl = document.getElementById('pt-detail-bio');
        if (bioEl) {
            if (bioEl.tagName === 'P') {
                bioEl.textContent = bio;
            } else {
                bioEl.textContent = bio;
            }
        }
        const availabilityEl = document.getElementById('pt-detail-availability');
        if (availabilityEl) {
            const formattedAvailability = formatAvailability(availability);
            if (availabilityEl.tagName === 'PRE') {
                availabilityEl.textContent = formattedAvailability;
            } else {
                availabilityEl.textContent = formattedAvailability;
            }
        }
    document.getElementById('pt-detail-verified').innerHTML = verified ? 
        '<span class="status-badge status-active">Đã xác minh</span>' : 
        '<span class="status-badge status-pending">Chưa xác minh</span>';
    
    const toggleSwitch = document.getElementById('toggle-accepting-clients');
    if (toggleSwitch) {
            toggleSwitch.checked = acceptingClients === true;
        }
        
        // Update button active state
        const toggleButton = document.getElementById('btn-toggle-accepting');
        if (toggleButton) {
            if (acceptingClients === true) {
                toggleButton.classList.add('active');
            } else {
                toggleButton.classList.remove('active');
            }
        }
        document.getElementById('pt-detail-current-clients').textContent = pt.currentClients || 0;
        document.getElementById('pt-detail-rating').textContent = (pt.rating || 0).toFixed(1);
        document.getElementById('pt-detail-success-rate').textContent = (pt.successRate || 0).toFixed(1);
        
        // Document links - show/hide based on availability
        const avatarLink = document.getElementById('pt-detail-avatar-link');
        const avatarNone = document.getElementById('pt-detail-avatar-none');
        const cccdLink = document.getElementById('pt-detail-cccd-link');
        const cccdNone = document.getElementById('pt-detail-cccd-none');
        const portraitLink = document.getElementById('pt-detail-portrait-link');
        const portraitNone = document.getElementById('pt-detail-portrait-none');
        const documentLink = document.getElementById('pt-detail-document-link');
        const documentNone = document.getElementById('pt-detail-document-none');
        
        if (avatarLink && avatarNone) {
            if (pt.avatarUrl) {
                avatarLink.href = pt.avatarUrl;
                avatarLink.style.display = 'inline-flex';
                avatarNone.style.display = 'none';
            } else {
                avatarLink.style.display = 'none';
                avatarNone.style.display = 'inline';
            }
        }
        if (cccdLink && cccdNone) {
            if (pt.cccdUrl) {
                cccdLink.href = pt.cccdUrl;
                cccdLink.style.display = 'inline-flex';
                cccdNone.style.display = 'none';
            } else {
                cccdLink.style.display = 'none';
                cccdNone.style.display = 'inline';
            }
        }
        if (portraitLink && portraitNone) {
            if (pt.portraitUrl) {
                portraitLink.href = pt.portraitUrl;
                portraitLink.style.display = 'inline-flex';
                portraitNone.style.display = 'none';
            } else {
                portraitLink.style.display = 'none';
                portraitNone.style.display = 'inline';
            }
        }
        if (documentLink && documentNone) {
            if (pt.documentUrl) {
                documentLink.href = pt.documentUrl;
                documentLink.style.display = 'inline-flex';
                documentNone.style.display = 'none';
            } else {
                documentLink.style.display = 'none';
                documentNone.style.display = 'inline';
            }
        }
        
        // Reviews tab
        renderPTReviews(data.Reviews ?? data.reviews ?? []);
        
        // Clients tab
        renderPTClients(data.Clients ?? data.clients ?? []);
    
    // Performance tab
        const perf = data.Performance ?? data.performance ?? {};
        document.getElementById('pt-performance-revenue').textContent = (perf.RevenueThisMonth ?? perf.revenueThisMonth ?? 0).toLocaleString('vi-VN');
        document.getElementById('pt-performance-bookings').textContent = perf.TotalBookings ?? perf.totalBookings ?? 0;
        document.getElementById('pt-performance-cancel-rate').textContent = (perf.CancelRate ?? perf.cancelRate ?? 0).toFixed(1);
        document.getElementById('pt-performance-bookings-week').textContent = (perf.BookingsPerWeek ?? perf.bookingsPerWeek ?? 0).toFixed(1);
        
        // Store schedule data
        const schedule = data.Schedule ?? data.schedule ?? [];
        if (schedule && schedule.length > 0) {
            const scheduleData = schedule.map(s => ({
                id: s.ScheduleId ?? s.scheduleId,
                userId: s.UserId ?? s.userId,
                userName: s.UserName ?? s.userName,
                userEmail: s.UserEmail ?? s.userEmail,
                dateTime: new Date(s.DateTime ?? s.dateTime),
                duration: s.Duration ?? s.duration ?? 60,
                status: s.Status ?? s.status,
                type: s.Type ?? s.type,
                location: s.Location ?? s.location,
                rating: s.Rating ?? s.rating,
                review: s.Review ?? s.review,
                reviewDate: (s.ReviewDate ?? s.reviewDate) ? new Date(s.ReviewDate ?? s.reviewDate) : null
            }));
            
            const ptInData = trainersData.find(p => (p.PTId ?? p.ptId ?? p.UserId ?? p.userId) === ptid);
            if (ptInData) {
                ptInData.scheduleData = scheduleData;
            } else {
                // Create new entry if not found
                trainersData.push({
                    PTId: ptid,
                    ptId: ptid,
                    scheduleData: scheduleData
                });
            }
        }
        
        // Load schedule when modal opens (will use stored data)
    loadPTSchedule(ptid);
    
    openModal('modal-pt-profile360');
    initProfile360Tabs();
    } catch (error) {
        console.error('Error loading PT profile:', error);
        showNotification('Lỗi khi tải thông tin PT', 'error');
    }
}

// Load PT Schedule
async function loadPTSchedule(ptid) {
    try {
        // Try to get from local data first
        let pt = trainersData.find(p => (p.PTId ?? p.ptId ?? p.UserId ?? p.userId) === ptid);
        let scheduleData = pt?.scheduleData || [];
        
        // If no schedule data, fetch from API
        if (scheduleData.length === 0) {
            const response = await fetch(`/Admin/QuanLiPT/${encodeURIComponent(ptid)}/Profile360`);
            if (response.ok) {
                const data = await response.json();
                const schedule = data.Schedule ?? data.schedule ?? [];
                if (schedule && schedule.length > 0) {
                    scheduleData = schedule.map(s => ({
                        id: s.ScheduleId ?? s.scheduleId,
                        userId: s.UserId ?? s.userId,
                        userName: s.UserName ?? s.userName,
                        userEmail: s.UserEmail ?? s.userEmail,
                        dateTime: new Date(s.DateTime ?? s.dateTime),
                        duration: s.Duration ?? s.duration ?? 60,
                        status: s.Status ?? s.status,
                        type: s.Type ?? s.type,
                        location: s.Location ?? s.location,
                        rating: s.Rating ?? s.rating,
                        review: s.Review ?? s.review,
                        reviewDate: (s.ReviewDate ?? s.reviewDate) ? new Date(s.ReviewDate ?? s.reviewDate) : null
                    }));
                    
                    // Store in local data
                    if (pt) {
                        pt.scheduleData = scheduleData;
                    } else {
                        trainersData.push({
                            ptId: ptid,
                            scheduleData: scheduleData
                        });
                    }
                }
            }
        }
        
        // Set calendar to show month with most bookings, or current month
        if (scheduleData.length > 0) {
            const firstBooking = scheduleData[0];
            const bookingDate = new Date(firstBooking.dateTime);
            currentScheduleMonth = bookingDate.getMonth();
            currentScheduleYear = bookingDate.getFullYear();
        } else {
    const now = new Date();
            currentScheduleMonth = now.getMonth();
            currentScheduleYear = now.getFullYear();
        }
        
    renderScheduleCalendar(scheduleData);
    renderPTSchedule(scheduleData, 'all');
    } catch (error) {
        console.error('Error loading schedule:', error);
        renderScheduleCalendar([]);
        renderPTSchedule([], 'all');
    }
}

// Render Schedule Calendar
function renderScheduleCalendar(scheduleData) {
    const calendarDays = document.getElementById('schedule-calendar-days');
    const calendarTitle = document.getElementById('schedule-calendar-title');
    if (!calendarDays || !calendarTitle) return;
    
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
                       'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    calendarTitle.textContent = `${monthNames[currentScheduleMonth]}, ${currentScheduleYear}`;
    
    const firstDay = new Date(currentScheduleYear, currentScheduleMonth, 1);
    const lastDay = new Date(currentScheduleYear, currentScheduleMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const prevMonth = new Date(currentScheduleYear, currentScheduleMonth, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    let html = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const date = new Date(currentScheduleYear, currentScheduleMonth - 1, day);
        html += `<div class="calendar-day other-month" data-date="${formatDateLocal(date)}">${day}</div>`;
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentScheduleYear, currentScheduleMonth, day);
        const dateStr = formatDateLocal(date);
        const todayStr = formatDateLocal(today);
        const isToday = dateStr === todayStr;
        const isSelected = selectedScheduleDate && dateStr === selectedScheduleDate;
        
        // Get sessions for this date - compare by date string to avoid timezone issues
        const daySessions = scheduleData.filter(s => {
            const sessionDateStr = getDateStringFromISO(s.dateTime);
            return sessionDateStr === dateStr;
        });
        
        const hasSessions = daySessions.length > 0;
        
        // Determine status color based on sessions
        let statusClass = '';
        let statusColor = '';
        if (hasSessions) {
            // Check if any session is cancelled (red) - cancelled takes priority
            const hasCancelled = daySessions.some(s => s.status === 'cancelled');
            if (hasCancelled) {
                statusClass = 'has-cancelled';
                statusColor = '#f56565'; // Red
            } else {
                // Check status based on date - compare by date string
                const dateStrCompare = dateStr;
                const todayStrCompare = todayStr;
                
                // Check actual status from sessions
                const hasCompleted = daySessions.some(s => s.status === 'completed');
                const hasConfirmed = daySessions.some(s => s.status === 'confirmed' || s.status === 'ongoing');
                
                if (dateStrCompare < todayStrCompare) {
                    // Past date - should be completed (green)
                    statusClass = 'has-completed';
                    statusColor = '#48bb78'; // Green
                } else if (dateStrCompare === todayStrCompare) {
                    // Today - should be confirmed (blue)
                    statusClass = 'has-confirmed-today';
                    statusColor = '#4299e1'; // Blue
                } else {
                    // Future - should be confirmed (orange/yellow)
                    statusClass = 'has-confirmed-future';
                    statusColor = '#ed8936'; // Orange
                }
            }
        }
        
        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (hasSessions) classes += ' has-sessions ' + statusClass;
        if (isSelected) classes += ' selected';
        
        const style = statusColor ? `style="background-color: ${statusColor}; color: white;"` : '';
        html += `<div class="${classes}" data-date="${dateStr}" onclick="selectScheduleDate('${dateStr}')" ${style}>${day}</div>`;
    }
    
    const totalCells = 42;
    const remainingCells = totalCells - (startingDayOfWeek + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
        const date = new Date(currentScheduleYear, currentScheduleMonth + 1, day);
        html += `<div class="calendar-day other-month" data-date="${formatDateLocal(date)}">${day}</div>`;
    }
    
    calendarDays.innerHTML = html;
}

// Change Schedule Month
function changeScheduleMonth(delta) {
    currentScheduleMonth += delta;
    if (currentScheduleMonth < 0) {
        currentScheduleMonth = 11;
        currentScheduleYear--;
    } else if (currentScheduleMonth > 11) {
        currentScheduleMonth = 0;
        currentScheduleYear++;
    }
    
    const pt = trainersData.find(p => (p.PTId ?? p.ptId ?? p.UserId ?? p.userId) === currentPTId);
    if (pt && pt.scheduleData) {
        renderScheduleCalendar(pt.scheduleData);
    }
}

// Select Schedule Date
function selectScheduleDate(dateStr) {
    selectedScheduleDate = dateStr;
    const pt = trainersData.find(p => (p.PTId ?? p.ptId ?? p.UserId ?? p.userId) === currentPTId);
    if (!pt || !pt.scheduleData) return;
    
    renderScheduleCalendar(pt.scheduleData);
    
    // Filter by date string to avoid timezone issues
    const filtered = pt.scheduleData.filter(s => {
        const sessionDateStr = getDateStringFromISO(s.dateTime);
        return sessionDateStr === dateStr;
    });
    
    const activeFilter = document.querySelector('.schedule-filter-btn.active')?.dataset.filter || 'all';
    let finalFiltered = filtered;
    if (activeFilter !== 'all') {
        finalFiltered = filtered.filter(s => s.status === activeFilter);
    }
    
    renderPTScheduleList(finalFiltered);
}

// Render PT Schedule List
function renderPTSchedule(scheduleData, filterStatus = 'all') {
    const container = document.getElementById('pt-schedule-list');
    if (!container) return;
    
    let filtered = scheduleData;
    
    if (filterStatus !== 'all') {
        filtered = scheduleData.filter(s => s.status === filterStatus);
    }
    
    if (selectedScheduleDate) {
        // Filter by date string to avoid timezone issues
        filtered = filtered.filter(s => {
            const sessionDateStr = getDateStringFromISO(s.dateTime);
            return sessionDateStr === selectedScheduleDate;
        });
    }
    
    renderPTScheduleList(filtered);
}

// Render Schedule List (helper function)
function renderPTScheduleList(filtered) {
    const container = document.getElementById('pt-schedule-list');
    if (!container) return;
    
    const today = new Date();
    const todayStr = formatDateLocal(today);
    
    filtered.sort((a, b) => {
        // Sort by date first
        const dateCompare = new Date(a.dateTime) - new Date(b.dateTime);
        if (dateCompare !== 0) return dateCompare;
        
        // Then by status priority
        const getStatusPriority = (status, dateTime) => {
            const sessionDateStr = getDateStringFromISO(dateTime);
            
            if (status === 'cancelled') return 0;
            if (status === 'ongoing') return 1;
            if (sessionDateStr === todayStr) return 2; // Today
            if (sessionDateStr < todayStr) return 3; // Past (completed)
            return 4; // Future (confirmed)
        };
        
        const aPriority = getStatusPriority(a.status, a.dateTime);
        const bPriority = getStatusPriority(b.status, b.dateTime);
        return aPriority - bPriority;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px;">
                <i class="fas fa-calendar-times" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                <h3 style="color: var(--text-secondary); margin-bottom: 8px;">Không có lịch</h3>
                <p style="color: var(--text-secondary);">Không có buổi tập nào trong danh mục này.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(session => {
        const dateTime = new Date(session.dateTime);
        const sessionDateStr = getDateStringFromISO(session.dateTime);
        
        // Determine actual status based on date and status
        let actualStatus = session.status;
        let statusConfig = {};
        
        if (session.status === 'cancelled') {
            // Cancelled - red
            statusConfig = {
                badge: '<span class="status-badge" style="background: #f56565; color: white;"><i class="fas fa-times-circle"></i> Đã hủy</span>',
                cardClass: 'status-cancelled'
            };
        } else if (session.status === 'completed' || (sessionDateStr < todayStr)) {
            // Completed (past) - green
            statusConfig = {
                badge: '<span class="status-badge" style="background: #48bb78; color: white;"><i class="fas fa-check-circle"></i> Đã hoàn thành</span>',
                cardClass: 'status-completed'
            };
        } else if (session.status === 'confirmed' || session.status === 'ongoing' || session.status === 'upcoming') {
            if (sessionDateStr === todayStr) {
                // Today - blue
                statusConfig = {
                    badge: '<span class="status-badge" style="background: #4299e1; color: white;"><i class="fas fa-clock"></i> Hôm nay</span>',
                    cardClass: 'status-confirmed-today'
                };
            } else {
                // Future - orange/yellow
                statusConfig = {
                    badge: '<span class="status-badge" style="background: linear-gradient(135deg, #ed8936 0%, #f6ad55 100%); color: white;"><i class="fas fa-clock"></i> Sắp tới</span>',
                    cardClass: 'status-confirmed-future'
                };
            }
        } else {
            // Default
            statusConfig = {
                badge: '<span class="status-badge" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white;"><i class="fas fa-clock"></i> Sắp tới</span>',
                cardClass: 'status-upcoming'
        };
        }
        
        const config = statusConfig;
        
        const reviewSection = session.status === 'completed' && session.review ? `
            <div class="schedule-card-review">
                <div class="schedule-card-review-header">
                    <span style="font-weight: 600; color: var(--text-primary);">Đánh giá:</span>
                    <div class="schedule-card-review-rating">
                        ${Array.from({length: 5}, (_, i) => 
                            `<i class="fas fa-star ${i < session.rating ? '' : 'empty'}"></i>`
                        ).join('')}
                    </div>
                </div>
                <p class="schedule-card-review-text">"${session.review}"</p>
            </div>
        ` : '';
        
        return `
            <div class="schedule-card ${config.cardClass}" data-status="${session.status}">
                <div class="schedule-card-header">
                    <div class="schedule-card-user">
                        <div class="schedule-card-user-name">
                            <i class="fas fa-user"></i>
                            ${session.userName}
                        </div>
                        <div class="schedule-card-user-email">
                            <i class="fas fa-envelope"></i> ${session.userEmail}
                        </div>
                        <div class="schedule-card-date-time">
                            <span><i class="fas fa-calendar-alt"></i> ${dateTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <span><i class="fas fa-clock"></i> ${dateTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span><i class="fas fa-hourglass-half"></i> ${session.duration} phút</span>
                        </div>
                        <div class="schedule-card-meta">
                            <div class="schedule-card-meta-item">
                                <i class="fas fa-dumbbell"></i>
                                <span>${session.type}</span>
                            </div>
                            ${session.location ? `
                            <div class="schedule-card-meta-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${session.location}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    <div>
                        ${config.badge}
                    </div>
                </div>
                ${reviewSection}
            </div>
        `;
    }).join('');
}

// Filter Schedule by Status
function filterScheduleByStatus(status) {
    const pt = trainersData.find(p => (p.PTId ?? p.ptId ?? p.UserId ?? p.userId) === currentPTId);
    if (!pt || !pt.scheduleData) return;
    
    document.querySelectorAll('.schedule-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === status) {
            btn.classList.add('active');
        }
    });
    
    selectedScheduleDate = null;
    renderScheduleCalendar(pt.scheduleData);
    
    renderPTSchedule(pt.scheduleData, status);
}

// Render PT Reviews
function renderPTReviews(reviews) {
    const container = document.getElementById('pt-reviews-list');
    if (!container) return;
    
    if (reviews.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                <div class="empty-icon" style="width: 80px; height: 80px; margin: 0 auto 20px; border-radius: 50%; background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%); display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-star" style="font-size: 40px; color: #fbbf24;"></i>
                </div>
                <h3 style="color: var(--text-primary); margin-bottom: 8px; font-size: 18px;">Chưa có đánh giá nào</h3>
                <p style="color: var(--text-secondary); font-size: 14px;">PT này chưa nhận được đánh giá từ khách hàng</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = reviews.map((review, index) => {
        // Support both PascalCase (from API) and camelCase (fallback)
        const reviewDate = (review.ReviewDate ?? review.reviewDate) ? new Date(review.ReviewDate ?? review.reviewDate) : null;
        const rating = review.Rating ?? review.rating ?? 0;
        const customerName = review.CustomerName ?? review.customerName ?? 'Khách hàng';
        const customerId = review.CustomerId ?? review.customerId ?? '';
        const comment = review.Comment ?? review.comment ?? null;
        
        const stars = Array.from({length: 5}, (_, i) => 
            `<i class="fas fa-star ${i < rating ? '' : 'empty'}" style="color: ${i < rating ? '#fbbf24' : '#e5e7eb'}; transition: all 0.3s ease;"></i>`
        ).join('');
        
        const ratingColors = [
            'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', // 1-2 stars
            'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // 3 stars
            'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', // 4 stars
            'linear-gradient(135deg, #10b981 0%, #059669 100%)'  // 5 stars
        ];
        const colorIndex = rating <= 2 ? 0 : rating === 3 ? 1 : rating === 4 ? 2 : 3;
        
        return `
            <div class="pt-review-card" style="animation-delay: ${index * 0.1}s;">
                <div class="pt-review-header">
                    <div class="pt-review-customer">
                        <div class="pt-review-avatar" style="background: ${ratingColors[colorIndex]};">
                            ${customerName[0].toUpperCase()}
                        </div>
                        <div>
                            <div class="pt-review-name">${customerName}</div>
                            <div class="pt-review-id">${customerId}</div>
                        </div>
                    </div>
                    <div class="pt-review-rating">
                        <div class="pt-review-stars">${stars}</div>
                        ${reviewDate ? `<div class="pt-review-date">${reviewDate.toLocaleDateString('vi-VN')}</div>` : ''}
                    </div>
                </div>
                ${comment ? 
                    `<div class="pt-review-comment">${comment}</div>` : 
                    '<div class="pt-review-comment empty">Không có bình luận</div>'
                }
            </div>
        `;
    }).join('');
}

// Render PT Clients
function renderPTClients(clients) {
    const container = document.getElementById('pt-clients-list');
    if (!container) return;
    
    if (clients.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px; width: 100%;">
                <div class="empty-icon" style="width: 80px; height: 80px; margin: 0 auto 20px; border-radius: 50%; background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-users" style="font-size: 40px; color: #667eea;"></i>
                </div>
                <h3 style="color: var(--text-primary); margin-bottom: 8px; font-size: 18px;">Chưa có khách hàng nào</h3>
                <p style="color: var(--text-secondary); font-size: 14px;">PT này chưa có khách hàng được cấp quyền</p>
            </div>
        `;
        return;
    }
    
    // Add animation delay based on index
    container.innerHTML = clients.map((client, index) => {
        // Support both PascalCase (from API) and camelCase (fallback)
        const accessDate = (client.AccessGrantedDate ?? client.accessGrantedDate) ? new Date(client.AccessGrantedDate ?? client.accessGrantedDate) : null;
        const userId = client.UserId ?? client.userId ?? '';
        const name = client.Name ?? client.name ?? 'Khách hàng';
        const email = client.Email ?? client.email ?? '';
        const isActive = client.IsActive ?? client.isActive ?? false;
        const avatarColors = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
        ];
        const colorIndex = index % avatarColors.length;
        
        return `
            <div class="pt-client-card" style="animation-delay: ${index * 0.1}s;">
                    <div class="pt-client-header">
                    <div class="pt-client-avatar" style="background: ${avatarColors[colorIndex]};">
                        ${name[0].toUpperCase()}
                    </div>
                    <div class="pt-client-info">
                        <div class="pt-client-name">${name}</div>
                        <div class="pt-client-email">${email || userId}</div>
                    </div>
                </div>
                <div class="pt-client-footer">
                    ${accessDate ? `
                        <div class="pt-client-date">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Cấp quyền: ${accessDate.toLocaleDateString('vi-VN')}</span>
                        </div>
                    ` : '<div></div>'}
                    <div class="pt-client-status">
                        ${isActive ? 
                            '<span class="status-badge status-active"><i class="fas fa-check-circle"></i> Đang hoạt động</span>' : 
                            '<span class="status-badge status-inactive"><i class="fas fa-pause-circle"></i> Không hoạt động</span>'
                        }
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Initialize Profile 360 tabs
function initProfile360Tabs() {
    const tabs = document.querySelectorAll('#modal-pt-profile360 .profile360-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('#modal-pt-profile360 .profile360-tab-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            const contentId = tabName === 'info' ? 'pt-tab-info' : 
                             tabName === 'schedule' ? 'pt-tab-schedule' :
                             tabName === 'reviews' ? 'pt-tab-reviews' :
                             tabName === 'clients' ? 'pt-tab-clients' :
                             tabName === 'performance' ? 'pt-tab-performance' : null;
            
            if (contentId) {
                const content = document.getElementById(contentId);
                if (content) content.classList.add('active');
            }
            
            // Reload schedule when schedule tab is opened
            if (tabName === 'schedule' && currentPTId) {
                const now = new Date();
                currentScheduleMonth = now.getMonth();
                currentScheduleYear = now.getFullYear();
                selectedScheduleDate = null;
                loadPTSchedule(currentPTId);
            }
        });
    });
}

// Toggle Accepting Clients
async function toggleAcceptingClients() {
    if (!currentPTId) return;
    
    const toggleSwitch = document.getElementById('toggle-accepting-clients');
    const newStatus = toggleSwitch ? toggleSwitch.checked : false;
    
    try {
        const response = await fetch(`/Admin/QuanLiPT/${encodeURIComponent(currentPTId)}/ToggleAcceptingClients`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ acceptingClients: newStatus })
        });
        
        if (!response.ok) throw new Error('Failed to update accepting clients status');
        
        const updated = await response.json();
        
        // Update local data
        const pt = trainersData.find(p => (p.PTId ?? p.ptId ?? p.UserId ?? p.userId) === currentPTId);
        if (pt) {
            pt.AcceptingClients = updated.AcceptingClients ?? updated.acceptingClients;
            pt.acceptingClients = updated.AcceptingClients ?? updated.acceptingClients;
        }
        
        // Update button active state
        const toggleButton = document.getElementById('btn-toggle-accepting');
        if (toggleButton) {
            if (newStatus) {
                toggleButton.classList.add('active');
            } else {
                toggleButton.classList.remove('active');
            }
        }
        
        showNotification(`Đã ${newStatus ? 'bật' : 'tắt'} nhận khách cho PT!`, 'success');
        
        await applyPTFilters();
    } catch (error) {
        console.error('Error toggling accepting clients:', error);
        showNotification('Lỗi khi cập nhật trạng thái nhận khách', 'error');
        // Revert toggle
        if (toggleSwitch) {
            toggleSwitch.checked = !newStatus;
        }
    }
}

// PT Pagination
function updatePTPagination() {
    const pagination = document.getElementById('pt-pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(filteredTrainersData.length / ptItemsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    html += `<button class="pagination-btn" ${ptCurrentPage === 1 ? 'disabled' : ''} onclick="goToPTPage(${ptCurrentPage - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= ptCurrentPage - 2 && i <= ptCurrentPage + 2)) {
            html += `<button class="pagination-btn ${i === ptCurrentPage ? 'active' : ''}" onclick="goToPTPage(${i})">${i}</button>`;
        } else if (i === ptCurrentPage - 3 || i === ptCurrentPage + 3) {
            html += `<span class="pagination-btn" style="pointer-events: none;">...</span>`;
        }
    }
    
    html += `<button class="pagination-btn" ${ptCurrentPage === totalPages ? 'disabled' : ''} onclick="goToPTPage(${ptCurrentPage + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;
    
    pagination.innerHTML = html;
}

function goToPTPage(page) {
    const totalPages = Math.ceil(filteredTrainersData.length / ptItemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    ptCurrentPage = page;
    renderPTCards();
    loadPTTableView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// View toggle
function attachPTViewToggle() {
    const viewBtns = document.querySelectorAll('#trainers .view-toggle .view-btn');
    const gridContainer = document.getElementById('pt-cards-grid')?.parentElement;
    const tableContainer = document.getElementById('pt-table-container');
    
    viewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.dataset.view;
            
            viewBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            if (view === 'grid') {
                if (gridContainer) gridContainer.style.display = 'block';
                if (tableContainer) tableContainer.style.display = 'none';
            } else {
                if (gridContainer) gridContainer.style.display = 'none';
                if (tableContainer) tableContainer.style.display = 'block';
                loadPTTableView();
            }
        });
    });
}

// Pending PT Functions
function renderPendingPTCards() {
    const grid = document.getElementById('pending-pt-cards-grid');
    const emptyState = document.getElementById('pending-empty-state');
    if (!grid) return;
    
    if (filteredPendingPTData.length === 0) {
        grid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    grid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
    
    grid.innerHTML = filteredPendingPTData.map((pt, index) => createPendingPTCard(pt, index)).join('');
}

function createPendingPTCard(pt, index) {
    // Support both PascalCase (from API) and camelCase (fallback)
    const userId = pt.UserId ?? pt.userId ?? pt.PTId ?? pt.ptId ?? '-';
    const name = pt.Name ?? pt.name ?? '-';
    const email = pt.Email ?? pt.email ?? '-';
    const specialty = pt.Specialty ?? pt.specialty ?? '-';
    const city = pt.City ?? pt.city ?? '-';
    const pricePerHour = pt.PricePerHour ?? pt.pricePerHour ?? 0;
    const registrationDate = pt.RegistrationDate ?? pt.registrationDate;
    
    return `
        <div class="user-card" style="animation-delay: ${index * 0.05}s">
            <div class="user-card-header">
                <div class="user-avatar-wrapper">
                    <div class="user-avatar" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                        <i class="fas fa-user-clock"></i>
                    </div>
                    <div class="user-status-badge-wrapper">
                        <span class="status-badge status-pending"><i class="fas fa-clock"></i> Chờ xác minh</span>
                    </div>
                </div>
                <div class="user-info">
                    <h3 class="user-name">${name}</h3>
                    <p class="user-id">${userId}</p>
                </div>
            </div>
            
            <div class="user-card-body">
                <div class="user-info-list">
                    <div class="user-info-item">
                        <i class="fas fa-envelope"></i>
                        <span>${email}</span>
                    </div>
                    <div class="user-info-item">
                        <i class="fas fa-briefcase"></i>
                        <span>${specialty}</span>
                    </div>
                    <div class="user-info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${city}</span>
                    </div>
                    <div class="user-info-item">
                        <i class="fas fa-dollar-sign"></i>
                        <span>${pricePerHour.toLocaleString('vi-VN')} VNĐ/giờ</span>
                    </div>
                    <div class="user-info-item">
                        <i class="fas fa-calendar"></i>
                        <span>Đăng ký: ${registrationDate ? new Date(registrationDate).toLocaleDateString('vi-VN') : 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <div class="user-card-footer">
                <div class="user-card-actions">
                    <button class="btn-view-details" onclick="viewPTRegistrationDetail('${userId}')">
                        <i class="fas fa-eye"></i>
                        <span>Xem hồ sơ</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function filterPendingPT() {
    const keyword = document.getElementById('pending-search')?.value.toLowerCase() || '';
    const specialty = document.getElementById('pending-filter-specialty')?.value || '';
    
    filteredPendingPTData = pendingPTData.filter(pt => {
        // Support both PascalCase (from API) and camelCase (fallback)
        const name = pt.Name ?? pt.name ?? '';
        const email = pt.Email ?? pt.email ?? '';
        const userId = pt.UserId ?? pt.userId ?? pt.PTId ?? pt.ptId ?? '';
        const ptSpecialty = pt.Specialty ?? pt.specialty ?? '';
        
        const matchKeyword = !keyword || 
            (name && name.toLowerCase().includes(keyword)) || 
            (email && email.toLowerCase().includes(keyword)) || 
            (userId && userId.toLowerCase().includes(keyword));
        
        const matchSpecialty = !specialty || ptSpecialty === specialty;
        
        return matchKeyword && matchSpecialty;
    });
    
    renderPendingPTCards();
}

async function openVerifyPendingModal() {
    try {
        console.log('Loading pending PTs...');
        const response = await fetch('/Admin/QuanLiPT/Pending');
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to load pending PTs:', response.status, errorText);
            throw new Error(`Failed to load pending PTs: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Pending PTs data:', data);
        
        pendingPTData = data.Trainers ?? data.trainers ?? [];
        console.log('Pending PTs count:', pendingPTData.length);
        console.log('Pending PTs:', pendingPTData);
        
        filteredPendingPTData = [...pendingPTData];
    
        const badge = document.getElementById('pending-pt-count');
        if (badge) {
            badge.textContent = pendingPTData.length;
            badge.style.display = pendingPTData.length > 0 ? 'inline-block' : 'none';
        }
    
        renderPendingPTCards();
    
        // Remove existing event listeners to avoid duplicates
        const searchInput = document.getElementById('pending-search');
        const specialtyFilter = document.getElementById('pending-filter-specialty');
        
        if (searchInput) {
            searchInput.removeEventListener('input', filterPendingPT);
            searchInput.addEventListener('input', filterPendingPT);
        }
        
        if (specialtyFilter) {
            specialtyFilter.removeEventListener('change', filterPendingPT);
            specialtyFilter.addEventListener('change', filterPendingPT);
        }
    
        openModal('modal-pending-verification');
    } catch (error) {
        console.error('Error loading pending PTs:', error);
        showNotification('Lỗi khi tải danh sách PT chờ xác minh: ' + error.message, 'error');
    }
}

function viewPTRegistrationDetail(userid) {
    const pt = pendingPTData.find(p => (p.UserId ?? p.userId ?? p.PTId ?? p.ptId) === userid) || 
               trainersData.find(p => (p.UserId ?? p.userId ?? p.PTId ?? p.ptId) === userid);
    if (!pt) return;
    
    currentPendingPTId = userid;
    fillRegistrationDetail(pt);
}

function fillRegistrationDetail(pt) {
    // Support both PascalCase (from API) and camelCase (fallback)
    const userId = pt.UserId ?? pt.userId ?? pt.PTId ?? pt.ptId ?? '-';
    const name = pt.Name ?? pt.name ?? '-';
    const email = pt.Email ?? pt.email ?? '-';
    const experience = pt.Experience ?? pt.experience ?? 0;
    const city = pt.City ?? pt.city ?? '-';
    const pricePerHour = pt.PricePerHour ?? pt.pricePerHour ?? 0;
    const specialty = pt.Specialty ?? pt.specialty ?? '-';
    const certificate = pt.Certificate ?? pt.certificate ?? '-';
    const bio = pt.Bio ?? pt.bio ?? '-';
    const availability = pt.Availability ?? pt.availability ?? '-';
    const registrationDate = pt.RegistrationDate ?? pt.registrationDate;
    const avatarUrl = pt.AvatarUrl ?? pt.avatarUrl;
    const cccdUrl = pt.CCCDUrl ?? pt.cccdUrl;
    const portraitUrl = pt.PortraitUrl ?? pt.portraitUrl;
    const documentUrl = pt.DocumentUrl ?? pt.documentUrl;
    
    document.getElementById('reg-userid').textContent = userId;
    document.getElementById('reg-name').textContent = name;
    document.getElementById('reg-email').textContent = email;
    document.getElementById('reg-experience').textContent = experience + ' năm';
    document.getElementById('reg-city').textContent = city;
    document.getElementById('reg-price').textContent = pricePerHour.toLocaleString('vi-VN');
    document.getElementById('reg-specialty').textContent = specialty;
    document.getElementById('reg-certificate').textContent = certificate;
    document.getElementById('reg-bio').textContent = bio;
    document.getElementById('reg-availability').textContent = availability;
    document.getElementById('reg-date').textContent = registrationDate ? new Date(registrationDate).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN');
    
    document.getElementById('reg-avatar-link').href = avatarUrl || '#';
    document.getElementById('reg-cccd-link').href = cccdUrl || '#';
    document.getElementById('reg-portrait-link').href = portraitUrl || '#';
    document.getElementById('reg-document-link').href = documentUrl || '#';
    
    openModal('modal-pt-registration-detail');
}

async function approvePTRegistration() {
    if (!currentPendingPTId) return;
    
    const note = document.getElementById('verification-note')?.value || '';
    
    try {
        const response = await fetch(`/Admin/QuanLiPT/${encodeURIComponent(currentPendingPTId)}/Approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ note: note })
        });
        
        if (!response.ok) throw new Error('Failed to approve PT');
    
    showNotification('Đã duyệt và xác minh PT thành công! PT đã được thêm vào danh sách.', 'success');
    
    closeModal('modal-pt-registration-detail');
    closeModal('modal-pending-verification');
    
        // Reload data
        await applyPTFilters();
        await openVerifyPendingModal();
    } catch (error) {
        console.error('Error approving PT:', error);
        showNotification('Lỗi khi duyệt PT', 'error');
    }
}

async function rejectPTRegistration() {
    if (!currentPendingPTId) return;
    
    if (!confirm('Bạn có chắc chắn muốn từ chối hồ sơ này? Hành động này có thể không thể hoàn tác.')) {
        return;
    }
    
    try {
        const response = await fetch(`/Admin/QuanLiPT/${encodeURIComponent(currentPendingPTId)}/Reject`, {
            method: 'POST'
        });
        
        if (!response.ok) throw new Error('Failed to reject PT');
        
        showNotification('Đã từ chối hồ sơ PT.', 'info');
        
        closeModal('modal-pt-registration-detail');
        closeModal('modal-pending-verification');
        
        // Reload pending PTs
        await openVerifyPendingModal();
    } catch (error) {
        console.error('Error rejecting PT:', error);
        showNotification('Lỗi khi từ chối PT', 'error');
    }
}

async function updatePendingPTCount() {
    try {
        const response = await fetch('/Admin/QuanLiPT/Pending');
        if (!response.ok) return;
        
        const data = await response.json();
        const pendingCount = data.trainers?.length || 0;
    const badge = document.getElementById('pending-pt-count');
    if (badge) {
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
        }
    } catch (error) {
        console.error('Error updating pending PT count:', error);
    }
}

// Initialize Trainers Module
async function initializeTrainers() {
    console.log('👨‍🏫 Initializing Trainers module...');
    
    attachPTViewToggle();
    
    document.getElementById('pt-btn-apply-filter')?.addEventListener('click', () => applyPTFilters());
    document.getElementById('pt-btn-reset-filter')?.addEventListener('click', () => resetPTFilters());
    document.getElementById('pt-btn-export')?.addEventListener('click', exportPTsToExcel);
    
    // Debounce search input
    let searchTimeout;
    document.getElementById('pt-search-keyword')?.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => applyPTFilters(), 500);
    });
    
    // Setup city select to show only 5 options when clicked
    setupCitySelect();
    
    // Load initial data
    await applyPTFilters();
    await updatePendingPTCount();
    
    console.log('✅ Trainers module initialized');
}

// Setup city select to limit visible options
function setupCitySelect() {
    const citySelects = document.querySelectorAll('#pt-filter-city, #edit-pt-city');
    
    citySelects.forEach(select => {
        // Keep as normal dropdown (size = 1) by default
        select.size = 1;
        let clickOutsideHandler = null;
        
        select.addEventListener('mousedown', function(e) {
            // When clicked, show 5 options
            if (this.size === 1) {
                this.size = 5;
            }
        });
        
        select.addEventListener('focus', function() {
            // When focused, ALWAYS reset to show 5 options (important for subsequent clicks)
            this.size = 5;
            
            // Remove previous handler if exists
            if (clickOutsideHandler) {
                document.removeEventListener('click', clickOutsideHandler);
            }
            
            // Add handler to close when clicking outside
            clickOutsideHandler = function(e) {
                if (!select.contains(e.target)) {
                    select.size = 1;
                    document.removeEventListener('click', clickOutsideHandler);
                    clickOutsideHandler = null;
                }
            };
            
            setTimeout(() => {
                document.addEventListener('click', clickOutsideHandler);
            }, 0);
        });
        
        select.addEventListener('blur', function() {
            // When losing focus, back to dropdown
            this.size = 1;
            if (clickOutsideHandler) {
                document.removeEventListener('click', clickOutsideHandler);
                clickOutsideHandler = null;
            }
        });
        
        select.addEventListener('change', function() {
            // After selection, back to dropdown immediately
            this.size = 1;
            if (clickOutsideHandler) {
                document.removeEventListener('click', clickOutsideHandler);
                clickOutsideHandler = null;
            }
            // Blur after a short delay to ensure change event completes
            setTimeout(() => {
                this.blur();
            }, 50);
        });
    });
}

// Export for global access
// Export PTs to Excel
async function exportPTsToExcel() {
    try {
        // Get current filter values
        const searchKeyword = document.getElementById('pt-search-keyword')?.value || '';
        const specialty = document.getElementById('pt-filter-specialty')?.value || '';
        const city = document.getElementById('pt-filter-city')?.value || '';
        const accepting = document.getElementById('pt-filter-accepting')?.value || '';
        const minRating = document.getElementById('pt-filter-rating')?.value || '';
        
        // Build query parameters
        const params = new URLSearchParams();
        if (searchKeyword) params.append('search', searchKeyword);
        if (specialty) params.append('specialty', specialty);
        if (city) params.append('city', city);
        if (accepting !== '') params.append('acceptingClients', accepting === '1');
        if (minRating) params.append('minRating', minRating);
        
        const url = `/Admin/QuanLiPT/ExportExcel?${params.toString()}`;
        
        // Show loading notification
        showNotification('Đang xuất file Excel...', 'info');
        
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
            showNotification('Đã xuất file Excel thành công!', 'success');
        }, 500);
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showNotification('Lỗi khi xuất file Excel: ' + error.message, 'error');
    }
}

window.initializeTrainers = initializeTrainers;
window.viewPTProfile360 = viewPTProfile360;
window.toggleAcceptingClients = toggleAcceptingClients;
window.goToPTPage = goToPTPage;
window.openVerifyPendingModal = openVerifyPendingModal;
window.viewPTRegistrationDetail = viewPTRegistrationDetail;
window.approvePTRegistration = approvePTRegistration;
window.rejectPTRegistration = rejectPTRegistration;
window.filterScheduleByStatus = filterScheduleByStatus;
window.changeScheduleMonth = changeScheduleMonth;
window.selectScheduleDate = selectScheduleDate;
window.closeModal = closeModal;
window.openEditPTModal = openEditPTModal;
window.openDeletePTModal = openDeletePTModal;
window.confirmDeletePT = confirmDeletePT;
window.exportPTsToExcel = exportPTsToExcel;

// Open Edit PT Modal
async function openEditPTModal(ptId) {
    try {
        // Open modal first
        const modal = document.getElementById('modal-edit-pt');
        if (!modal) {
            showNotification('Không tìm thấy modal chỉnh sửa', 'error');
            return;
        }
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Fetch PT profile data
        const response = await fetch(`/Admin/QuanLiPT/${encodeURIComponent(ptId)}/Profile360`);
        if (!response.ok) throw new Error('Failed to fetch PT data');
        
        const data = await response.json();
        const pt = data.BasicInfo ?? data.basicInfo;
        
        if (!pt) {
            showNotification('Không tìm thấy thông tin PT', 'error');
            closeModal('modal-edit-pt');
            return;
        }
        
        // Helper function to safely set value
        const setValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value || false;
                } else {
                    element.value = value || '';
                }
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
        };
        
        // Support both PascalCase (from API) and camelCase (fallback)
        const ptId = pt.PTId ?? pt.ptId ?? pt.UserId ?? pt.userId ?? '';
        const specialty = pt.Specialty ?? pt.specialty ?? '';
        const city = pt.City ?? pt.city ?? '';
        const pricePerHour = pt.PricePerHour ?? pt.pricePerHour ?? 0;
        const bio = pt.Bio ?? pt.bio ?? '';
        const experience = pt.Experience ?? pt.experience ?? 0;
        const certificate = pt.Certificate ?? pt.certificate ?? '';
        const availability = pt.Availability ?? pt.availability ?? '';
        const acceptingClients = pt.AcceptingClients ?? pt.acceptingClients ?? false;
        
        // Populate form with null checks
        setValue('edit-pt-id', ptId);
        setValue('edit-pt-specialty', specialty);
        setValue('edit-pt-city', city);
        setValue('edit-pt-price', pricePerHour);
        setValue('edit-pt-bio', bio);
        setValue('edit-pt-experience', experience);
        setValue('edit-pt-certificate', certificate);
        setValue('edit-pt-availability', availability);
        setValue('edit-pt-accepting', acceptingClients);
        
        // For select elements, ensure the value is selected
        const specialtySelect = document.getElementById('edit-pt-specialty');
        if (specialtySelect && specialty) {
            specialtySelect.value = specialty;
        }
        const citySelect = document.getElementById('edit-pt-city');
        if (citySelect && city) {
            citySelect.value = city;
        }
    } catch (error) {
        console.error('Error opening edit modal:', error);
        showNotification('Lỗi khi tải thông tin PT', 'error');
        closeModal('modal-edit-pt');
    }
}

// Open Delete PT Modal
function openDeletePTModal(ptId) {
    const modal = document.getElementById('modal-delete-pt');
    if (!modal) {
        showNotification('Không tìm thấy modal xóa', 'error');
        return;
    }
    
    const reasonInput = document.getElementById('delete-pt-reason');
    if (reasonInput) {
        reasonInput.value = '';
    }
    
    modal.dataset.ptId = ptId;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Confirm Delete PT
async function confirmDeletePT() {
    const modal = document.getElementById('modal-delete-pt');
    if (!modal) {
        showNotification('Không tìm thấy modal xóa', 'error');
        return;
    }
    
    const ptId = modal.dataset.ptId;
    if (!ptId) {
        showNotification('Không tìm thấy ID PT', 'error');
        return;
    }
    
    const reasonInput = document.getElementById('delete-pt-reason');
    if (!reasonInput) {
        showNotification('Không tìm thấy ô nhập lý do', 'error');
        return;
    }
    
    const reason = reasonInput.value.trim();
    
    if (!reason) {
        showNotification('Vui lòng nhập lý do xóa', 'warning');
        return;
    }
    
    // Show confirmation dialog
    if (!confirm('Bạn có chắc chắn muốn xóa PT này?\n\nLý do: ' + reason + '\n\nHành động này không thể hoàn tác!')) {
        return;
    }
    
    try {
        const response = await fetch(`/Admin/QuanLiPT/${encodeURIComponent(ptId)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete PT');
        }
        
        const result = await response.json();
        showNotification(result.message || 'Đã xóa PT thành công!', 'success');
        closeModal('modal-delete-pt');
        
        // Reload PT list
        if (typeof applyPTFilters === 'function') {
            await applyPTFilters();
        } else {
            // Fallback: reload page if applyPTFilters is not available
            location.reload();
        }
    } catch (error) {
        console.error('Error deleting PT:', error);
        showNotification(error.message || 'Lỗi khi xóa PT', 'error');
    }
}

// Handle Edit PT Form Submit
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-edit-pt');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const ptId = document.getElementById('edit-pt-id').value;
            const specialty = document.getElementById('edit-pt-specialty').value.trim();
            const city = document.getElementById('edit-pt-city').value.trim();
            const price = parseFloat(document.getElementById('edit-pt-price').value);
            const bio = document.getElementById('edit-pt-bio').value.trim();
            const experience = document.getElementById('edit-pt-experience').value ? 
                parseInt(document.getElementById('edit-pt-experience').value) : null;
            const certificate = document.getElementById('edit-pt-certificate').value.trim();
            const availability = document.getElementById('edit-pt-availability').value.trim();
            const acceptingClients = document.getElementById('edit-pt-accepting').checked;
            
            if (!specialty) {
                showNotification('Vui lòng nhập chuyên môn', 'warning');
                return;
            }
            
            if (isNaN(price) || price < 0) {
                showNotification('Vui lòng nhập giá hợp lệ', 'warning');
                return;
            }
            
            // Validate availability JSON if provided
            if (availability) {
                try {
                    JSON.parse(availability);
                } catch (e) {
                    showNotification('Giờ rảnh không đúng định dạng JSON', 'warning');
                    return;
                }
            }
            
            try {
                const requestBody = {
                    specialty: specialty || null,
                    city: city || null,
                    pricePerHour: price,
                    bio: bio || null,
                    experience: experience,
                    certificate: certificate || null,
                    availability: availability || null,
                    acceptingClients: acceptingClients
                };
                
                const response = await fetch(`/Admin/QuanLiPT/${encodeURIComponent(ptId)}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to update PT');
                }
                
                const updated = await response.json();
                showNotification('Đã cập nhật thông tin PT thành công!', 'success');
                closeModal('modal-edit-pt');
                
                // Reload PT list
                if (typeof applyPTFilters === 'function') {
                    await applyPTFilters();
                } else {
                    location.reload();
                }
            } catch (error) {
                console.error('Error updating PT:', error);
                showNotification(error.message || 'Lỗi khi cập nhật PT', 'error');
            }
        });
    }
});

