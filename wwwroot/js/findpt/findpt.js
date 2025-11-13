// Global variables
let currentPTs = [];
let currentPTDetail = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadPTs();
    
    // Search on Enter key
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchPTs();
        }
    });
    
    // Auto search on filter change
    const filters = ['locationFilter', 'specializationFilter', 'maxPriceFilter', 'minExperienceFilter'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', debounce(searchPTs, 500));
            element.addEventListener('input', debounce(searchPTs, 500));
        }
    });
});

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
    showLoading();
    hideEmptyState();
    
    try {
        const search = document.getElementById('searchInput').value.trim();
        const location = document.getElementById('locationFilter').value;
        const specialization = document.getElementById('specializationFilter').value;
        const maxPrice = document.getElementById('maxPriceFilter').value ? parseFloat(document.getElementById('maxPriceFilter').value) : null;
        const minExperience = document.getElementById('minExperienceFilter').value ? parseInt(document.getElementById('minExperienceFilter').value) : null;
        
        const response = await fetch(`/FindPT/Search?search=${encodeURIComponent(search || '')}&location=${encodeURIComponent(location || '')}&specialization=${encodeURIComponent(specialization || '')}&maxPrice=${maxPrice || ''}&minExperience=${minExperience || ''}`);
        const data = await response.json();
        
        if (data.success) {
            currentPTs = data.data;
            renderPTs(currentPTs);
            updateResultsCount(currentPTs.length);
        } else {
            showError(data.message || 'Không thể tải danh sách huấn luyện viên');
        }
    } catch (error) {
        console.error('Error loading PTs:', error);
        showError('Có lỗi xảy ra khi tải danh sách');
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
    document.getElementById('searchInput').value = '';
    document.getElementById('locationFilter').value = '';
    document.getElementById('specializationFilter').value = '';
    document.getElementById('maxPriceFilter').value = '';
    document.getElementById('minExperienceFilter').value = '';
    loadPTs();
}

// Render PTs
function renderPTs(pts) {
    const grid = document.getElementById('ptCardsGrid');
    
    if (!pts || pts.length === 0) {
        grid.innerHTML = '';
        showEmptyState();
        return;
    }
    
    hideEmptyState();
    
    grid.innerHTML = pts.map(pt => `
        <div class="pt-card">
            <div class="pt-card-header">
                <img src="${pt.avatar}" alt="${pt.name}" class="pt-avatar" onerror="this.src='/images/default-avatar.png'">
                <div class="pt-info">
                    <h3>${escapeHtml(pt.name)}</h3>
                    <span class="pt-username">@${escapeHtml(pt.username)}</span>
                </div>
                ${pt.verified ? '<span class="pt-verified"><i class="fas fa-check-circle"></i> Đã xác minh</span>' : ''}
            </div>
            
            <div class="pt-specialization">
                <i class="fas fa-dumbbell"></i>
                <span>${escapeHtml(pt.specialization)}</span>
            </div>
            
            <div class="pt-stats">
                <div class="pt-stat">
                    <div class="pt-stat-value">${pt.experience}</div>
                    <div class="pt-stat-label">Năm kinh nghiệm</div>
                </div>
                <div class="pt-stat">
                    <div class="pt-stat-value">${pt.reviewCount || 0}</div>
                    <div class="pt-stat-label">Đánh giá</div>
                </div>
                <div class="pt-stat">
                    <div class="pt-stat-value">${pt.currentClients || 0}</div>
                    <div class="pt-stat-label">Khách hàng</div>
                </div>
            </div>
            
            <div class="pt-rating">
                <div class="pt-rating-stars">
                    ${generateStars(pt.rating)}
                </div>
                <span class="pt-rating-text">${pt.rating.toFixed(1)} (${pt.reviewCount || 0} đánh giá)</span>
            </div>
            
            <div class="pt-price">
                ${formatPrice(pt.pricePerHour)}/giờ
            </div>
            
            <div class="pt-card-footer">
                <button class="btn-view-details" onclick="viewPTDetails('${pt.ptId}')">
                    <i class="fas fa-info-circle"></i> Chi tiết
                </button>
                <button class="btn-request" onclick="openRequestModal('${pt.ptId}')" ${!pt.available ? 'disabled' : ''}>
                    <i class="fas fa-paper-plane"></i> Gửi yêu cầu
                </button>
            </div>
        </div>
    `).join('');
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
            alert(data.message || 'Không thể tải thông tin huấn luyện viên');
        }
    } catch (error) {
        console.error('Error loading PT details:', error);
        alert('Có lỗi xảy ra khi tải thông tin');
    }
}

// Render PT Detail
function renderPTDetail(pt) {
    const content = document.getElementById('ptDetailContent');
    
    content.innerHTML = `
        <div class="pt-detail-header">
            <div class="pt-detail-avatar-wrapper">
                <img src="${pt.avatar}" alt="${pt.name}" class="pt-detail-avatar" onerror="this.src='/images/default-avatar.png'">
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
}

// Open Request Modal
function openRequestModal(ptId) {
    document.getElementById('requestPtId').value = ptId;
    
    // Set minimum date to today
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('requestDateTime').min = now.toISOString().slice(0, 16);
    
    // Set default to tomorrow at 9 AM
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    document.getElementById('requestDateTime').value = tomorrow.toISOString().slice(0, 16);
    
    document.getElementById('requestModal').style.display = 'block';
}

// Close Request Modal
function closeRequestModal() {
    document.getElementById('requestModal').style.display = 'none';
    document.getElementById('requestForm').reset();
}

// Close PT Detail Modal
function closePTDetailModal() {
    document.getElementById('ptDetailModal').style.display = 'none';
}

// Submit Request
async function submitRequest(event) {
    event.preventDefault();
    
    const ptId = document.getElementById('requestPtId').value;
    const dateTime = document.getElementById('requestDateTime').value;
    const sessionType = document.getElementById('requestSessionType').value;
    const notes = document.getElementById('requestNotes').value;
    
    // Get userId from localStorage (fallback if session is not available)
    const userId = localStorage.getItem('hw_userId') || sessionStorage.getItem('hw_userId');
    
    if (!userId) {
        alert('Vui lòng đăng nhập để gửi yêu cầu');
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
                dateTime: dateTime,
                sessionType: sessionType,
                notes: notes,
                userId: userId // Include userId in request
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.message || 'Đã gửi yêu cầu thành công!');
            closeRequestModal();
            // Optionally reload PTs or show success message
        } else {
            alert(data.message || 'Có lỗi xảy ra khi gửi yêu cầu');
        }
    } catch (error) {
        console.error('Error submitting request:', error);
        alert('Có lỗi xảy ra khi gửi yêu cầu');
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
    document.getElementById('resultsCount').textContent = `Tìm thấy ${count} huấn luyện viên`;
}

function showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('ptCardsGrid').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('ptCardsGrid').style.display = 'grid';
}

function showEmptyState() {
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('ptCardsGrid').style.display = 'none';
}

function hideEmptyState() {
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('ptCardsGrid').style.display = 'grid';
}

function showError(message) {
    alert(message);
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

