// Payment Page JavaScript

let currentBookingId = null;
let currentBookingInfo = null;

// Render booking information
function renderBookingInfo(bookingInfo) {
    currentBookingInfo = bookingInfo;
    
    // Check for errors
    if (bookingInfo.error) {
        showError(bookingInfo.error);
        return;
    }

    currentBookingId = bookingInfo.bookingId;

    // Render booking summary
    const bookingSummary = document.getElementById('bookingSummary');
    bookingSummary.innerHTML = `
        <div class="booking-info-item">
            <img src="${escapeHtml(bookingInfo.ptAvatar)}" alt="${escapeHtml(bookingInfo.ptName)}" class="pt-avatar-summary" onerror="this.src='/images/default-avatar.png'">
            <div class="info-content">
                <div class="info-label">Huấn luyện viên</div>
                <div class="info-value">${escapeHtml(bookingInfo.ptName)}</div>
            </div>
        </div>
        
        <div class="booking-info-item">
            <div class="info-icon">
                <i class="fas fa-calendar-alt"></i>
            </div>
            <div class="info-content">
                <div class="info-label">Ngày giờ tập</div>
                <div class="info-value">${escapeHtml(bookingInfo.sessionDate)}</div>
            </div>
        </div>
        
        <div class="booking-info-item">
            <div class="info-icon">
                <i class="fas fa-video"></i>
            </div>
            <div class="info-content">
                <div class="info-label">Loại buổi tập</div>
                <div class="info-value">${escapeHtml(bookingInfo.sessionType)}</div>
            </div>
        </div>
    `;

    // Render payment details
    const paymentDetails = document.getElementById('paymentDetails');
    paymentDetails.innerHTML = `
        <div class="payment-breakdown">
            <div class="payment-line">
                <span class="payment-line-label">Giá theo giờ</span>
                <span class="payment-line-value">${formatPrice(bookingInfo.pricePerHour)}</span>
            </div>
            <div class="payment-line">
                <span class="payment-line-label">Số giờ</span>
                <span class="payment-line-value">${bookingInfo.hours} giờ</span>
            </div>
            <div class="payment-line">
                <span class="payment-line-label">Hoa hồng ứng dụng (15%)</span>
                <span class="payment-line-value">${formatPrice(bookingInfo.appCommission)}</span>
            </div>
            <div class="payment-line">
                <span class="payment-line-label">Tổng thanh toán</span>
                <span class="payment-line-value">${formatPrice(bookingInfo.totalAmount)}</span>
            </div>
            <div class="commission-note">
                <i class="fas fa-info-circle"></i> Số tiền PT nhận: ${formatPrice(bookingInfo.ptAmount)}
            </div>
        </div>
    `;

    // Check if already paid
    if (bookingInfo.hasExistingTransaction && bookingInfo.transactionStatus === "Completed") {
        showAlreadyPaid();
    }
}

// Process payment
async function processPayment() {
    if (!currentBookingId) {
        showError('Không tìm thấy thông tin booking');
        return;
    }

    const payButton = document.getElementById('payButton');
    const originalText = payButton.innerHTML;
    
    try {
        // Disable button
        payButton.disabled = true;
        payButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Đang xử lý...</span>';

        // Get anti-forgery token
        const token = getAntiForgeryToken();

        // Create payment request
        const response = await fetch('/Payment/CreatePayment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify({
                bookingId: currentBookingId
            })
        });

        const data = await response.json();

        if (data.success && data.paymentUrl) {
            // Redirect to MoMo payment page
            window.location.href = data.paymentUrl;
        } else {
            showError(data.message || 'Có lỗi xảy ra khi tạo thanh toán');
            payButton.disabled = false;
            payButton.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        showError('Có lỗi xảy ra khi xử lý thanh toán');
        payButton.disabled = false;
        payButton.innerHTML = originalText;
    }
}

// Cancel payment
function cancelPayment() {
    if (confirm('Bạn có chắc chắn muốn hủy thanh toán?')) {
        window.location.href = '/FindPT';
    }
}

// Show error
function showError(message) {
    const bookingSummary = document.getElementById('bookingSummary');
    const paymentDetails = document.getElementById('paymentDetails');
    
    bookingSummary.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-circle"></i>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
    
    paymentDetails.innerHTML = '';
    
    const payButton = document.getElementById('payButton');
    if (payButton) {
        payButton.disabled = true;
    }
}

// Show already paid message
function showAlreadyPaid() {
    const paymentDetails = document.getElementById('paymentDetails');
    paymentDetails.innerHTML += `
        <div class="error-state" style="background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3); color: #22c55e; margin-top: 1rem;">
            <i class="fas fa-check-circle"></i>
            <p>Booking này đã được thanh toán thành công!</p>
        </div>
    `;
    
    const payButton = document.getElementById('payButton');
    if (payButton) {
        payButton.disabled = true;
        payButton.innerHTML = '<i class="fas fa-check"></i> <span>Đã Thanh Toán</span>';
    }
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
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

function getAntiForgeryToken() {
    const token = document.querySelector('input[name="__RequestVerificationToken"]');
    return token ? token.value : '';
}

// Check payment status on page load (if returning from MoMo)
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    const resultCode = urlParams.get('resultCode');

    if (orderId && resultCode !== null) {
        // User returned from MoMo
        if (resultCode === '0') {
            showSuccess('Thanh toán thành công!');
            // Refresh booking info
            if (currentBookingId) {
                setTimeout(() => {
                    window.location.href = '/FindPT';
                }, 2000);
            }
        } else {
            showError('Thanh toán thất bại. Vui lòng thử lại.');
        }
    }
});

function showSuccess(message) {
    const bookingSummary = document.getElementById('bookingSummary');
    bookingSummary.innerHTML = `
        <div class="error-state" style="background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3); color: #22c55e;">
            <i class="fas fa-check-circle"></i>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

