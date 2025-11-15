let currentRating = 0;
let currentSession = null;

document.addEventListener('DOMContentLoaded', function() {
    loadHistory(); // Load history instead of sessions
    setupStarRating();
    setupCommentCounter();
});

// Load sessions (deprecated - use loadHistory instead)
async function loadSessions() {
    // Redirect to loadHistory
    await loadHistory();
}

// Render sessions (deprecated - use renderHistory instead)
function renderSessions(sessions) {
    // Use renderHistory instead
    renderHistory(sessions);
}

// Format date
function formatDate(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Open rating modal
function openRatingModal(ptId, bookingId, ptName, ptAvatar, sessionType, sessionDate) {
    currentSession = { ptId, bookingId, ptName, ptAvatar, sessionType, sessionDate };
    currentRating = 0;

    const modal = document.getElementById('ratingModal');
    const ptInfo = document.getElementById('ratingPtInfo');
    const ptIdInput = document.getElementById('ratingPtId');
    const bookingIdInput = document.getElementById('ratingBookingId');
    const ratingValueInput = document.getElementById('ratingValue');
    const commentTextarea = document.getElementById('ratingComment');

    if (!modal || !ptInfo || !ptIdInput || !bookingIdInput || !ratingValueInput || !commentTextarea) return;

    // Set PT info
    const dateObj = new Date(sessionDate);
    ptInfo.innerHTML = `
        <div class="pt-info-avatar">
            <img src="${escapeHtml(ptAvatar)}" alt="${escapeHtml(ptName)}" onerror="this.onerror=null; this.src='/images/default-avatar.png';">
        </div>
        <div class="pt-info-details">
            <h3>${escapeHtml(ptName)}</h3>
            <p><i class="fas fa-dumbbell"></i> ${escapeHtml(sessionType)}</p>
            <p><i class="fas fa-calendar-alt"></i> ${formatDate(dateObj)}</p>
        </div>
    `;

    // Set form values
    ptIdInput.value = ptId;
    bookingIdInput.value = bookingId || '';
    ratingValueInput.value = '';
    commentTextarea.value = '';
    currentRating = 0;

    // Reset stars
    resetStars();

    // Show modal
    modal.style.display = 'block';
}

// Close rating modal
function closeRatingModal() {
    const modal = document.getElementById('ratingModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentSession = null;
    currentRating = 0;
}

// Setup star rating
function setupStarRating() {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            setRating(rating);
        });

        star.addEventListener('mouseenter', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            highlightStars(rating);
        });
    });

    const starContainer = document.getElementById('starRating');
    if (starContainer) {
        starContainer.addEventListener('mouseleave', function() {
            highlightStars(currentRating);
        });
    }
}

// Set rating
function setRating(rating) {
    currentRating = rating;
    const ratingValueInput = document.getElementById('ratingValue');
    if (ratingValueInput) {
        ratingValueInput.value = rating;
    }
    highlightStars(rating);
}

// Highlight stars
function highlightStars(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        const starRating = index + 1;
        if (starRating <= rating) {
            star.innerHTML = '<i class="fas fa-star"></i>';
            star.classList.add('active');
        } else {
            star.innerHTML = '<i class="far fa-star"></i>';
            star.classList.remove('active');
        }
    });
}

// Reset stars
function resetStars() {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.innerHTML = '<i class="far fa-star"></i>';
        star.classList.remove('active');
    });
}

// Setup comment counter
function setupCommentCounter() {
    const commentTextarea = document.getElementById('ratingComment');
    const charCount = document.getElementById('charCount');
    
    if (commentTextarea && charCount) {
        commentTextarea.addEventListener('input', function() {
            const length = this.value.length;
            charCount.textContent = length;
            
            if (length > 500) {
                charCount.style.color = '#ef4444';
            } else {
                charCount.style.color = '#64748b';
            }
        });
    }
}

// Submit rating
async function submitRating(event) {
    event.preventDefault();

    const ptIdInput = document.getElementById('ratingPtId');
    const bookingIdInput = document.getElementById('ratingBookingId');
    const ratingValueInput = document.getElementById('ratingValue');
    const commentTextarea = document.getElementById('ratingComment');

    if (!ptIdInput || !ratingValueInput) return;

    const ptId = ptIdInput.value;
    const bookingId = bookingIdInput ? bookingIdInput.value : '';
    const rating = parseInt(ratingValueInput.value);
    const comment = commentTextarea ? commentTextarea.value.trim() : '';

    if (!rating || rating < 1 || rating > 5) {
        showWarning('Vui lòng chọn số sao từ 1 đến 5');
        return;
    }

    if (comment.length > 500) {
        showWarning('Bình luận không được vượt quá 500 ký tự');
        return;
    }

    try {
        const response = await fetch('/Rating/Submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                ptId: ptId,
                bookingId: bookingId || null,
                rating: rating,
                comment: comment || null
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Đánh giá đã được gửi thành công!');
            closeRatingModal();
            loadHistory(); // Reload history
        } else {
            showError(data.message || 'Có lỗi xảy ra khi gửi đánh giá');
        }
    } catch (error) {
        console.error('Error submitting rating:', error);
        showError('Có lỗi xảy ra: ' + error.message);
    }
}

// Utility functions
function showLoading() {
    const loading = document.getElementById('loadingState');
    if (loading) {
        loading.style.display = 'block';
    } else {
        console.warn('loadingState element not found');
    }
}

function hideLoading() {
    const loading = document.getElementById('loadingState');
    if (loading) {
        loading.style.display = 'none';
    }
}

function showEmptyState() {
    const empty = document.getElementById('emptyState');
    if (empty) {
        empty.style.display = 'block';
    } else {
        console.warn('emptyState element not found');
    }
}

function hideEmptyState() {
    const empty = document.getElementById('emptyState');
    if (empty) {
        empty.style.display = 'none';
    }
}

function showSessionsList() {
    const list = document.getElementById('sessionsList');
    if (list) {
        list.style.display = 'block';
    } else {
        console.error('sessionsList element not found');
    }
}

function hideSessionsList() {
    const list = document.getElementById('sessionsList');
    if (list) {
        list.style.display = 'none';
    }
}

function showError(message) {
    if (typeof showToast === 'function') {
        showToast(message, 'error');
    } else if (typeof window.showError === 'function') {
        window.showError(message);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('ratingModal');
    if (event.target == modal) {
        closeRatingModal();
    }
}

// Load history
async function loadHistory() {
    try {
        console.log('Loading history...');
        showLoading();
        hideEmptyState();
        hideSessionsList();

        const response = await fetch('/Rating/History', {
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json'
            }
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response data:', data);

        if (data.success) {
            const history = data.data || [];
            console.log('History items:', history.length);
            if (history.length === 0) {
                showEmptyState();
            } else {
                renderHistory(history);
                showSessionsList();
            }
        } else {
            console.error('API returned error:', data.message);
            showError(data.message || 'Không thể tải lịch sử buổi tập');
            showEmptyState();
        }
    } catch (error) {
        console.error('Error loading history:', error);
        showError('Có lỗi xảy ra khi tải lịch sử: ' + error.message);
        showEmptyState();
    } finally {
        hideLoading();
    }
}

// Render history
function renderHistory(history) {
    const container = document.getElementById('sessionsList');
    if (!container) {
        console.error('sessionsList container not found!');
        return;
    }

    console.log('Rendering history:', history.length, 'items');

    if (history.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = history.map(session => {
        const sessionDate = new Date(session.sessionDate || session.SessionDate);
        const ptName = session.ptName || session.PtName || 'N/A';
        const ptAvatar = session.ptAvatar || session.PtAvatar || '/images/default-avatar.png';
        const sessionType = session.sessionType || session.SessionType || 'Online';
        const status = session.status || session.Status || 'Pending';
        const hasRated = session.hasRated || session.HasRated || false;
        const rating = session.rating || session.Rating;
        const ratingComment = session.ratingComment || session.RatingComment;
        const bookingId = session.bookingId || session.BookingId || '';
        const ptId = session.ptId || session.PtId || '';

        // Map status to Vietnamese
        const statusMap = {
            'Pending': 'Chờ xác nhận',
            'Confirmed': 'Đã xác nhận',
            'Completed': 'Đã hoàn thành',
            'Cancelled': 'Đã hủy',
            'Chờ xác nhận': 'Chờ xác nhận',
            'Đã xác nhận': 'Đã xác nhận',
            'Đã hoàn thành': 'Đã hoàn thành',
            'Đã hủy': 'Đã hủy'
        };
        const statusText = statusMap[status] || status;

        // Status badge class
        const statusClass = status === 'Completed' || status === 'Đã hoàn thành' 
            ? 'status-completed' 
            : status === 'Cancelled' || status === 'Đã hủy'
            ? 'status-cancelled'
            : status === 'Confirmed' || status === 'Đã xác nhận'
            ? 'status-confirmed'
            : 'status-pending';

        return `
            <div class="session-card ${hasRated ? 'rated' : ''}" data-booking-id="${escapeHtml(bookingId)}" data-pt-id="${escapeHtml(ptId)}">
                <div class="session-card-header">
                    <div class="session-pt-info">
                        <div class="session-pt-avatar">
                            <img src="${escapeHtml(ptAvatar)}" alt="${escapeHtml(ptName)}" onerror="this.onerror=null; this.src='/images/default-avatar.png';">
                        </div>
                        <div class="session-pt-details">
                            <h3>${escapeHtml(ptName)}</h3>
                            <p class="session-type">
                                <i class="fas fa-dumbbell"></i> ${escapeHtml(sessionType)}
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span class="status-badge ${statusClass}">${escapeHtml(statusText)}</span>
                        ${!hasRated && (status === 'Completed' || status === 'Đã hoàn thành') ? `
                            <button class="btn-rate" onclick="openRatingModal('${escapeHtml(ptId)}', '${escapeHtml(bookingId)}', '${escapeHtml(ptName)}', '${escapeHtml(ptAvatar)}', '${escapeHtml(sessionType)}', '${sessionDate.toISOString()}')">
                                <i class="fas fa-star"></i> Đánh giá
                            </button>
                        ` : hasRated ? `
                            <span class="rated-badge">
                                <i class="fas fa-check-circle"></i> Đã đánh giá
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="session-card-body">
                    <div class="session-date">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${formatDate(sessionDate)}</span>
                    </div>
                    ${session.notes || session.Notes ? `
                        <div class="session-notes">
                            <i class="fas fa-sticky-note"></i>
                            <span>${escapeHtml(session.notes || session.Notes)}</span>
                        </div>
                    ` : ''}
                    ${hasRated && rating ? `
                        <div class="history-rating">
                            <div class="history-rating-stars">
                                ${Array.from({ length: 5 }, (_, i) => 
                                    i < rating 
                                        ? '<i class="fas fa-star"></i>' 
                                        : '<i class="far fa-star"></i>'
                                ).join('')}
                                <span class="rating-value">${rating}/5</span>
                            </div>
                            ${ratingComment ? `
                                <div class="history-rating-comment">
                                    <i class="fas fa-comment"></i>
                                    <span>${escapeHtml(ratingComment)}</span>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}


