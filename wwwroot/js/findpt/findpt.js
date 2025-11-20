// Global variables
let currentPTs = [];
let currentPTDetail = null;
let currentUserId = null;
let currentPTPricePerHour = 0; // Lưu giá mỗi giờ của PT hiện tại

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Load userId from server session
        await loadUserId();
        
        // Load PTs
        loadPTs();
        
        // Search on Enter key
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    searchPTs();
                }
            });
        }
        
        // Auto search on filter change
        const filters = ['locationFilter', 'specializationFilter'];
        filters.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener('change', debounce(searchPTs, 500));
                element.addEventListener('input', debounce(searchPTs, 500));
            }
        });
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Có lỗi xảy ra khi khởi tạo trang');
    }
});

// Load userId from server session
async function loadUserId() {
    try {
        const response = await fetch('/Account/GetCurrentUserId', {
            credentials: 'same-origin'
        });
        const data = await response.json();
        if (data.success && data.userId) {
            currentUserId = data.userId;
            // Also save to localStorage for fallback
            localStorage.setItem('hw_userId', data.userId);
        }
    } catch (error) {
        console.error('Error loading userId:', error);
        // Fallback to localStorage
        currentUserId = localStorage.getItem('hw_userId') || sessionStorage.getItem('hw_userId');
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Load PTs
async function loadPTs() {
    try {
        showLoading();
        hideEmptyState();
        
        const searchInput = document.getElementById('searchInput');
        const locationFilter = document.getElementById('locationFilter');
        const specializationFilter = document.getElementById('specializationFilter');
        
        const search = searchInput ? searchInput.value.trim() : '';
        const location = locationFilter ? locationFilter.value : '';
        const specialization = specializationFilter ? specializationFilter.value : '';
        
        const response = await fetch(`/FindPT/Search?search=${encodeURIComponent(search || '')}&location=${encodeURIComponent(location || '')}&specialization=${encodeURIComponent(specialization || '')}`, {
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            currentPTs = data.data || [];
            renderPTs(currentPTs);
            updateResultsCount(currentPTs.length);
            updateActiveFilters(search, location, specialization);
        } else {
            showError(data.message || 'Không thể tải danh sách huấn luyện viên');
            currentPTs = [];
            renderPTs([]);
        }
    } catch (error) {
        console.error('Error loading PTs:', error);
        showError('Có lỗi xảy ra khi tải danh sách: ' + error.message);
        currentPTs = [];
        renderPTs([]);
    } finally {
        hideLoading();
    }
}

// Search PTs
function searchPTs() {
    loadPTs();
}

// Clear filters
function clearFilters() {
    const searchInput = document.getElementById('searchInput');
    const locationFilter = document.getElementById('locationFilter');
    const specializationFilter = document.getElementById('specializationFilter');
    
    if (searchInput) searchInput.value = '';
    if (locationFilter) locationFilter.value = '';
    if (specializationFilter) specializationFilter.value = '';
    
    // Clear active filters display
    updateActiveFilters('', '', '');
    
    loadPTs();
}

// Generate avatar placeholder with gradient
function generateAvatarPlaceholder(name, className = 'pt-avatar') {
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    return `<div class="${className} pt-avatar-placeholder" title="${escapeHtml(name)}">
        <span class="pt-avatar-initial">${initial}</span>
    </div>`;
}

// Generate avatar HTML (with gradient placeholder if no avatar)
function generateAvatarHTML(avatar, name, className = 'pt-avatar') {
    // Check if avatar is valid
    if (avatar && avatar !== '/images/default-avatar.png' && avatar !== '' && avatar !== null && avatar !== undefined) {
        // Return img tag - we'll handle error with event listener after render
        return `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}" class="${className}" data-pt-name="${escapeHtml(name)}" data-pt-class="${className}">`;
    }
    return generateAvatarPlaceholder(name, className);
}

// Setup avatar error handlers after rendering
function setupAvatarErrorHandlers() {
    document.querySelectorAll('.pt-avatar[data-pt-name], .pt-detail-avatar[data-pt-name]').forEach(img => {
        img.addEventListener('error', function() {
            const name = this.getAttribute('data-pt-name');
            const className = this.getAttribute('data-pt-class') || 'pt-avatar';
            this.outerHTML = generateAvatarPlaceholder(name, className);
        });
    });
}

// Render PTs
function renderPTs(pts) {
    const grid = document.getElementById('ptCardsGrid');
    
    if (!grid) {
        console.error('ptCardsGrid element not found');
        return;
    }
    
    if (!pts || pts.length === 0) {
        grid.innerHTML = '';
        showEmptyState();
        return;
    }
    
    hideEmptyState();
    
    try {
        grid.innerHTML = pts.map(pt => {
            // Handle both camelCase and PascalCase
            const name = escapeHtml(pt.name || pt.Name || 'Không có tên');
            const username = escapeHtml(pt.username || pt.Username || '');
            const avatar = pt.avatar || pt.Avatar || '';
            const specialization = escapeHtml(pt.specialization || pt.Specialization || 'Chưa có');
            const experience = pt.experience || pt.Experience || 0;
            const reviewCount = pt.reviewCount || pt.ReviewCount || 0;
            const currentClients = pt.currentClients || pt.CurrentClients || 0;
            const rating = pt.rating || pt.Rating || 0;
            const pricePerHour = pt.pricePerHour || pt.PricePerHour || 0;
            const ptId = pt.ptId || pt.PtId || pt.id || pt.Id || '';
            const verified = pt.verified || pt.Verified || false;
            const available = pt.available !== false && pt.Available !== false;
            
            return `
                <div class="pt-card">
                    <div class="pt-card-header">
                        ${generateAvatarHTML(avatar, name, 'pt-avatar')}
                        <div class="pt-info">
                            <h3>${name}</h3>
                            <span class="pt-username">@${username}</span>
                        </div>
                        ${verified ? '<span class="pt-verified"><i class="fas fa-check-circle"></i> Đã xác minh</span>' : ''}
                    </div>
                    
                    <div class="pt-specialization">
                        <i class="fas fa-dumbbell"></i>
                        <span>${specialization}</span>
                    </div>
                    
                    <div class="pt-stats">
                        <div class="pt-stat">
                            <div class="pt-stat-value">${experience}</div>
                            <div class="pt-stat-label">Năm kinh nghiệm</div>
                        </div>
                        <div class="pt-stat">
                            <div class="pt-stat-value">${reviewCount}</div>
                            <div class="pt-stat-label">Đánh giá</div>
                        </div>
                        <div class="pt-stat">
                            <div class="pt-stat-value">${currentClients}</div>
                            <div class="pt-stat-label">Khách hàng</div>
                        </div>
                    </div>
                    
                    <div class="pt-rating">
                        <div class="pt-rating-stars">
                            ${generateStars(rating)}
                        </div>
                        <span class="pt-rating-text">${rating.toFixed(1)} (${reviewCount} đánh giá)</span>
                    </div>
                    
                    <div class="pt-price">
                        ${formatPrice(pricePerHour)}/giờ
                    </div>
                    
                    <div class="pt-card-footer">
                        <button class="btn-view-details" onclick="viewPTDetails('${escapeHtml(ptId)}')">
                            <i class="fas fa-info-circle"></i> Chi tiết
                        </button>
                        <button class="btn-request" onclick="openRequestModal('${escapeHtml(ptId)}')" ${!available ? 'disabled' : ''}>
                            <i class="fas fa-paper-plane"></i> Gửi yêu cầu
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Setup error handlers for avatars after rendering
        setupAvatarErrorHandlers();
    } catch (error) {
        console.error('Error rendering PTs:', error);
        grid.innerHTML = '';
        showError('Có lỗi xảy ra khi hiển thị danh sách');
        showEmptyState();
    }
}

// Generate stars
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

// View PT Details
async function viewPTDetails(ptId) {
    try {
        const response = await fetch(`/FindPT/Details/${ptId}`);
        const data = await response.json();
        
        if (data.success) {
            currentPTDetail = data.data;
            renderPTDetail(currentPTDetail);
            document.getElementById('ptDetailModal').style.display = 'block';
        } else {
            await customAlert(data.message || 'Không thể tải thông tin huấn luyện viên', 'Lỗi', 'error');
        }
    } catch (error) {
        console.error('Error loading PT details:', error);
        await customAlert('Có lỗi xảy ra khi tải thông tin', 'Lỗi', 'error');
    }
}

// Render PT Detail
function renderPTDetail(pt) {
    const content = document.getElementById('ptDetailContent');
    
    content.innerHTML = `
        <div class="pt-detail-header">
            <div class="pt-detail-avatar-wrapper">
                ${generateAvatarHTML(pt.avatar, pt.name, 'pt-detail-avatar')}
            </div>
            <div class="pt-detail-info">
                <div class="pt-detail-name-row">
                    <h2>${escapeHtml(pt.name)}</h2>
                    ${pt.verified ? '<span class="pt-verified-badge"><i class="fas fa-check-circle"></i> Đã xác minh</span>' : ''}
                </div>
                <p class="pt-username">@${escapeHtml(pt.username)}</p>
                <div class="pt-rating">
                    <div class="pt-rating-stars">${generateStars(pt.rating)}</div>
                    <span class="pt-rating-text">${pt.rating.toFixed(1)} (${pt.reviewCount} đánh giá)</span>
                </div>
            </div>
        </div>
        
        <div class="pt-detail-stats-grid">
            <div class="pt-detail-stat-card">
                <div class="pt-stat-value">${pt.experience}</div>
                <div class="pt-stat-label">Năm kinh nghiệm</div>
            </div>
            <div class="pt-detail-stat-card">
                <div class="pt-stat-value">${pt.reviewCount}</div>
                <div class="pt-stat-label">Đánh giá</div>
            </div>
            <div class="pt-detail-stat-card">
                <div class="pt-stat-value">${pt.currentClients}</div>
                <div class="pt-stat-label">Khách hàng hiện tại</div>
            </div>
            <div class="pt-detail-stat-card">
                <div class="pt-stat-value">${formatPrice(pt.pricePerHour)}</div>
                <div class="pt-stat-label">Giá/giờ</div>
            </div>
        </div>
        
        <div class="pt-detail-info-list">
            <div class="pt-detail-info-item">
                <div class="info-icon"><i class="fas fa-dumbbell"></i></div>
                <div class="info-content">
                    <div class="info-label">Chuyên môn</div>
                    <div class="info-value">${escapeHtml(pt.specialization)}</div>
                </div>
            </div>
            
            <div class="pt-detail-info-item">
                <div class="info-icon"><i class="fas fa-map-marker-alt"></i></div>
                <div class="info-content">
                    <div class="info-label">Địa điểm</div>
                    <div class="info-value">${escapeHtml(pt.location)}</div>
                </div>
            </div>
            
            <div class="pt-detail-info-item">
                <div class="info-icon"><i class="fas fa-certificate"></i></div>
                <div class="info-content">
                    <div class="info-label">Chứng chỉ</div>
                    <div class="info-value">${escapeHtml(pt.certificates)}</div>
                </div>
            </div>
            
            <div class="pt-detail-info-item">
                <div class="info-icon"><i class="fas fa-clock"></i></div>
                <div class="info-content">
                    <div class="info-label">Giờ rảnh</div>
                    <div class="info-value available-hours-value">${formatAvailableHours(pt.availableHours)}</div>
                </div>
            </div>
        </div>
        
        <div class="pt-detail-bio-section">
            <div class="section-header">
                <i class="fas fa-user"></i>
                <h3>Tiểu sử</h3>
            </div>
            <p class="bio-content">${escapeHtml(pt.bio)}</p>
        </div>
        
        ${pt.reviews && pt.reviews.length > 0 ? `
            <div class="pt-detail-reviews-section">
                <div class="section-header">
                    <i class="fas fa-star"></i>
                    <h3>Đánh giá gần đây</h3>
                </div>
                <div class="reviews-list">
                    ${pt.reviews.map(review => `
                        <div class="review-card">
                            <div class="review-header">
                                <strong class="reviewer-name">${escapeHtml(review.clientName)}</strong>
                                <div class="review-rating">${generateStars(review.rating)}</div>
                            </div>
                            <p class="review-comment">${escapeHtml(review.comment)}</p>
                            <small class="review-date">${formatDate(review.date)}</small>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        <div class="pt-detail-action">
            <button class="btn-request-training" onclick="closePTDetailModal(); openRequestModal('${pt.ptId}');" ${!pt.available ? 'disabled' : ''}>
                <i class="fas fa-paper-plane"></i> Gửi yêu cầu tập luyện
            </button>
        </div>
    `;
    
    // Setup error handler for detail avatar
    setupAvatarErrorHandlers();
}

// Open Request Modal
function openRequestModal(ptId) {
    document.getElementById('requestPtId').value = ptId;
    
    // Reset form
    document.getElementById('requestForm').reset();
    document.getElementById('requestGoal').value = '';
    document.getElementById('requestNotes').value = '';
    
    // Reset date schedule container
    const dateContainer = document.getElementById('dateScheduleContainer');
    if (dateContainer) {
        dateContainer.innerHTML = '';
    }
    dateScheduleCounter = 0;
    
    // Lấy giá mỗi giờ của PT
    const pt = currentPTs.find(p => (p.ptId || p.PtId || p.id || p.Id) === ptId);
    if (pt) {
        currentPTPricePerHour = pt.pricePerHour || pt.PricePerHour || 0;
    } else if (currentPTDetail && (currentPTDetail.ptId || currentPTDetail.PtId) === ptId) {
        currentPTPricePerHour = currentPTDetail.pricePerHour || currentPTDetail.PricePerHour || 0;
    } else {
        currentPTPricePerHour = 0;
    }
    
    // Cập nhật tổng tiền
    updateTotalPrice();
    
    document.getElementById('requestModal').style.display = 'block';
}

// Add date schedule item
let dateScheduleCounter = 0;
function addDateSchedule() {
    const container = document.getElementById('dateScheduleContainer');
    if (!container) return;
    
    dateScheduleCounter++;
    const scheduleId = `schedule-${dateScheduleCounter}`;
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    
    const scheduleItem = document.createElement('div');
    scheduleItem.className = 'date-schedule-item';
    scheduleItem.id = scheduleId;
    scheduleItem.innerHTML = `
        <div class="date-schedule-header">
            <div class="date-schedule-date">
                <label><i class="fas fa-calendar"></i> Chọn ngày</label>
                <input type="date" class="schedule-date-input" min="${minDate}" required>
            </div>
            <button type="button" class="btn-remove-date" onclick="removeDateSchedule('${scheduleId}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="date-schedule-times">
            <div class="time-slot">
                <label><i class="fas fa-clock"></i> Giờ bắt đầu</label>
                <input type="time" class="schedule-time-start" required>
            </div>
            <div class="time-slot">
                <label><i class="fas fa-clock"></i> Giờ kết thúc</label>
                <input type="time" class="schedule-time-end" required>
            </div>
        </div>
    `;
    
    container.appendChild(scheduleItem);
    
    // Add validation for time inputs
    const startInput = scheduleItem.querySelector('.schedule-time-start');
    const endInput = scheduleItem.querySelector('.schedule-time-end');
    
    if (startInput && endInput) {
        startInput.addEventListener('change', function() {
            validateTimeRange(this, endInput);
            updateTotalPrice();
        });
        endInput.addEventListener('change', function() {
            validateTimeRange(startInput, this);
            updateTotalPrice();
        });
    }
}

// Remove date schedule item
function removeDateSchedule(scheduleId) {
    const item = document.getElementById(scheduleId);
    if (item) {
        item.remove();
        updateTotalPrice();
    }
}

// Validate time range
function validateTimeRange(startInput, endInput) {
    if (startInput.value && endInput.value) {
        if (startInput.value >= endInput.value) {
            showWarning('Giờ kết thúc phải sau giờ bắt đầu');
            endInput.value = '';
            updateTotalPrice();
        } else {
            updateTotalPrice();
        }
    } else {
        updateTotalPrice();
    }
}

// Calculate total hours from all schedules
function calculateTotalHours() {
    let totalHours = 0;
    
    document.querySelectorAll('.date-schedule-item').forEach(item => {
        const startInput = item.querySelector('.schedule-time-start');
        const endInput = item.querySelector('.schedule-time-end');
        
        if (startInput && endInput && startInput.value && endInput.value) {
            const startTime = startInput.value.split(':');
            const endTime = endInput.value.split(':');
            
            const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
            const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);
            
            const hours = (endMinutes - startMinutes) / 60;
            if (hours > 0) {
                totalHours += hours;
            }
        }
    });
    
    return totalHours;
}

// Update total price display
function updateTotalPrice() {
    const totalHours = calculateTotalHours();
    const totalPrice = totalHours * currentPTPricePerHour;
    
    // Tìm hoặc tạo phần hiển thị tổng tiền
    let priceDisplay = document.getElementById('totalPriceDisplay');
    
    if (!priceDisplay) {
        // Tạo phần hiển thị tổng tiền nếu chưa có
        const formActions = document.querySelector('.form-actions');
        if (formActions) {
            priceDisplay = document.createElement('div');
            priceDisplay.id = 'totalPriceDisplay';
            priceDisplay.className = 'total-price-display';
            priceDisplay.style.cssText = 'margin-bottom: 1rem; padding: 1rem; background: #f0f0f0; border-radius: 8px; text-align: center;';
            formActions.parentNode.insertBefore(priceDisplay, formActions);
        }
    }
    
    if (priceDisplay) {
        if (totalHours > 0 && currentPTPricePerHour > 0) {
            priceDisplay.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span><i class="fas fa-clock"></i> Tổng số giờ:</span>
                    <strong>${totalHours.toFixed(1)} giờ</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span><i class="fas fa-money-bill-wave"></i> Giá mỗi giờ:</span>
                    <strong>${formatPrice(currentPTPricePerHour)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; border-top: 2px solid #ddd;">
                    <span style="font-size: 1.1em; font-weight: bold;"><i class="fas fa-calculator"></i> Tổng tiền:</span>
                    <strong style="font-size: 1.2em; color: #667eea;">${formatPrice(totalPrice)}</strong>
                </div>
            `;
        } else {
            priceDisplay.innerHTML = `
                <div style="color: #999; text-align: center;">
                    <i class="fas fa-info-circle"></i> Vui lòng chọn ngày và thời gian để tính tổng tiền
                </div>
            `;
        }
    }
}

// Close Request Modal
function closeRequestModal() {
    document.getElementById('requestModal').style.display = 'none';
    document.getElementById('requestForm').reset();
    // Reset date schedule container and counter
    const dateContainer = document.getElementById('dateScheduleContainer');
    if (dateContainer) {
        dateContainer.innerHTML = '';
    }
    dateScheduleCounter = 0;
    currentPTPricePerHour = 0;
}

// Close PT Detail Modal
function closePTDetailModal() {
    document.getElementById('ptDetailModal').style.display = 'none';
}

// Submit Request
async function submitRequest(event) {
    event.preventDefault();
    
    const ptId = document.getElementById('requestPtId').value;
    const goal = document.getElementById('requestGoal').value;
    const notes = document.getElementById('requestNotes').value;
    
    // Validate goal
    if (!goal) {
        showWarning('Vui lòng chọn mục tiêu luyện tập');
        return;
    }
    
    // Collect selected dates and times
    const selectedSchedules = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    document.querySelectorAll('.date-schedule-item').forEach(item => {
        const dateInput = item.querySelector('.schedule-date-input');
        const startInput = item.querySelector('.schedule-time-start');
        const endInput = item.querySelector('.schedule-time-end');
        
        const selectedDate = dateInput?.value;
        const startTime = startInput?.value;
        const endTime = endInput?.value;
        
        if (!selectedDate) {
            showWarning('Vui lòng chọn ngày cho tất cả các mục đã thêm');
            return;
        }
        
        // Validate date is after today
        const dateObj = new Date(selectedDate);
        dateObj.setHours(0, 0, 0, 0);
        if (dateObj <= today) {
            showWarning('Ngày được chọn phải sau ngày hiện tại');
            return;
        }
        
        if (!startTime || !endTime) {
            showWarning('Vui lòng nhập đầy đủ giờ bắt đầu và giờ kết thúc');
            return;
        }
        
        if (startTime >= endTime) {
            showWarning('Giờ kết thúc phải sau giờ bắt đầu');
            return;
        }
        
        // Get day of week from date
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = dayNames[dateObj.getDay()];
        
        selectedSchedules.push({
            date: selectedDate,
            day: dayOfWeek,
            startTime: startTime,
            endTime: endTime
        });
    });
    
    if (selectedSchedules.length === 0) {
        showWarning('Vui lòng thêm ít nhất một ngày và nhập thời gian rảnh');
        return;
    }
    
    // Get userId - try currentUserId first, then localStorage
    let userId = currentUserId || localStorage.getItem('hw_userId') || sessionStorage.getItem('hw_userId');
    
    // If still no userId, try to load from server
    if (!userId) {
        try {
            const response = await fetch('/Account/GetCurrentUserId', {
                credentials: 'same-origin'
            });
            const data = await response.json();
            if (data.success && data.userId) {
                userId = data.userId;
                currentUserId = userId;
                localStorage.setItem('hw_userId', userId);
            }
        } catch (error) {
            console.error('Error getting userId:', error);
        }
    }
    
    if (!userId) {
        // Hiển thị dialog cho cảnh báo quan trọng
        await customAlert('Vui lòng đăng nhập để gửi yêu cầu', 'Yêu cầu đăng nhập', 'warning');
        window.location.href = '/Account/Login';
        return;
    }
    
    try {
        const response = await fetch('/FindPT/SendRequest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': getAntiForgeryToken()
            },
            body: JSON.stringify({
                ptId: ptId,
                goal: goal,
                schedules: selectedSchedules,
                notes: notes,
                userId: userId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Hiển thị dialog thay vì toast cho thông báo quan trọng
            await customAlert(data.message || 'Đã gửi yêu cầu thành công!', 'Thành công', 'success');
            closeRequestModal();
        } else {
            // Hiển thị dialog cho lỗi quan trọng
            await customAlert(data.message || 'Có lỗi xảy ra khi gửi yêu cầu', 'Lỗi', 'error');
        }
    } catch (error) {
        console.error('Error submitting request:', error);
        await customAlert('Có lỗi xảy ra khi gửi yêu cầu', 'Lỗi', 'error');
    }
}

// Get Anti-Forgery Token
function getAntiForgeryToken() {
    const token = document.querySelector('input[name="__RequestVerificationToken"]');
    return token ? token.value : '';
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function formatAvailableHours(availableHours) {
    if (!availableHours || availableHours === 'Chưa cập nhật') {
        return 'Chưa cập nhật';
    }
    
    try {
        // Parse JSON string
        const hours = typeof availableHours === 'string' ? JSON.parse(availableHours) : availableHours;
        
        // Map English day names to Vietnamese
        const dayMap = {
            'Mon': 'Thứ 2',
            'Tue': 'Thứ 3',
            'Wed': 'Thứ 4',
            'Thu': 'Thứ 5',
            'Fri': 'Thứ 6',
            'Sat': 'Thứ 7',
            'Sun': 'Chủ nhật',
            'Monday': 'Thứ 2',
            'Tuesday': 'Thứ 3',
            'Wednesday': 'Thứ 4',
            'Thursday': 'Thứ 5',
            'Friday': 'Thứ 6',
            'Saturday': 'Thứ 7',
            'Sunday': 'Chủ nhật'
        };
        
        // Convert to array and format
        const formattedHours = Object.entries(hours)
            .map(([day, time]) => {
                const vietnameseDay = dayMap[day] || day;
                return `<div class="available-hour-item"><span class="available-day">${vietnameseDay}:</span> <span class="available-time">${time}</span></div>`;
            })
            .join('');
        
        return `<div class="available-hours-list">${formattedHours}</div>`;
    } catch (error) {
        // If parsing fails, return as is
        return escapeHtml(availableHours);
    }
}

function updateResultsCount(count) {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        resultsCount.textContent = `Tìm thấy ${count} huấn luyện viên`;
    }
}

// Update active filters display
function updateActiveFilters(search, location, specialization) {
    const activeFiltersDisplay = document.getElementById('activeFiltersDisplay');
    const activeFiltersList = document.getElementById('activeFiltersList');
    
    if (!activeFiltersDisplay || !activeFiltersList) return;
    
    const filters = [];
    
    if (search && search.trim()) {
        filters.push({
            type: 'search',
            label: 'Tìm kiếm',
            value: search.trim(),
            icon: 'fa-search'
        });
    }
    
    if (location && location.trim()) {
        filters.push({
            type: 'location',
            label: 'Thành phố',
            value: location.trim(),
            icon: 'fa-map-marker-alt'
        });
    }
    
    if (specialization && specialization.trim()) {
        filters.push({
            type: 'specialization',
            label: 'Chuyên môn',
            value: specialization.trim(),
            icon: 'fa-dumbbell'
        });
    }
    
    if (filters.length > 0) {
        activeFiltersList.innerHTML = filters.map(filter => `
            <span class="active-filter-tag">
                <i class="fas ${filter.icon}"></i>
                <span class="filter-label">${escapeHtml(filter.label)}:</span>
                <span class="filter-value">${escapeHtml(filter.value)}</span>
            </span>
        `).join('');
        activeFiltersDisplay.style.display = 'flex';
    } else {
        activeFiltersDisplay.style.display = 'none';
        activeFiltersList.innerHTML = '';
    }
}

function showLoading() {
    const loadingState = document.getElementById('loadingState');
    const ptCardsGrid = document.getElementById('ptCardsGrid');
    if (loadingState) loadingState.style.display = 'block';
    if (ptCardsGrid) ptCardsGrid.style.display = 'none';
}

function hideLoading() {
    const loadingState = document.getElementById('loadingState');
    const ptCardsGrid = document.getElementById('ptCardsGrid');
    if (loadingState) loadingState.style.display = 'none';
    if (ptCardsGrid) ptCardsGrid.style.display = 'grid';
}

function showEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const ptCardsGrid = document.getElementById('ptCardsGrid');
    if (emptyState) emptyState.style.display = 'block';
    if (ptCardsGrid) ptCardsGrid.style.display = 'none';
}

function hideEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const ptCardsGrid = document.getElementById('ptCardsGrid');
    if (emptyState) emptyState.style.display = 'none';
    if (ptCardsGrid) ptCardsGrid.style.display = 'grid';
}

function showError(message) {
    if (typeof showToast === 'function') {
        showToast(message, 'error');
    } else if (typeof window.showError === 'function') {
        window.showError(message);
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    const ptDetailModal = document.getElementById('ptDetailModal');
    const requestModal = document.getElementById('requestModal');
    
    if (event.target == ptDetailModal) {
        closePTDetailModal();
    }
    if (event.target == requestModal) {
        closeRequestModal();
    }
}

