// Get anti-forgery token
function getToken() {
    return document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';
}

// Accept request
async function acceptRequest(requestId) {
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
            // Remove the request card from the list
            const requestCard = document.querySelector(`[data-request-id="${requestId}"]`);
            if (requestCard) {
                requestCard.style.transition = 'opacity 0.3s';
                requestCard.style.opacity = '0';
                setTimeout(() => {
                    requestCard.remove();
                    // Check if list is empty
                    const requestsList = document.getElementById('requestsList');
                    if (requestsList && requestsList.children.length === 0) {
                        requestsList.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-inbox"></i>
                                <p>Chưa có yêu cầu nào</p>
                            </div>
                        `;
                    }
                }, 300);
            }
        } else {
            alert(result.message || 'Có lỗi xảy ra khi chấp nhận yêu cầu');
        }
    } catch (error) {
        console.error('Error accepting request:', error);
        alert('Có lỗi xảy ra khi chấp nhận yêu cầu');
    }
}

// Open reject modal
function openRejectModal(requestId) {
    const modal = document.getElementById('rejectModal');
    const requestIdInput = document.getElementById('rejectRequestId');
    const reasonTextarea = document.getElementById('rejectReason');
    
    if (modal && requestIdInput) {
        requestIdInput.value = requestId;
        if (reasonTextarea) {
            reasonTextarea.value = '';
        }
        modal.style.display = 'block';
    }
}

// Close reject modal
function closeRejectModal() {
    const modal = document.getElementById('rejectModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Reject request
async function rejectRequest(event) {
    event.preventDefault();

    const requestId = document.getElementById('rejectRequestId')?.value;
    const reason = document.getElementById('rejectReason')?.value;

    if (!requestId || !reason || reason.trim() === '') {
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
                reason: reason.trim()
            })
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message);
            closeRejectModal();
            // Remove the request card from the list
            const requestCard = document.querySelector(`[data-request-id="${requestId}"]`);
            if (requestCard) {
                requestCard.style.transition = 'opacity 0.3s';
                requestCard.style.opacity = '0';
                setTimeout(() => {
                    requestCard.remove();
                    // Check if list is empty
                    const requestsList = document.getElementById('requestsList');
                    if (requestsList && requestsList.children.length === 0) {
                        requestsList.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-inbox"></i>
                                <p>Chưa có yêu cầu nào</p>
                            </div>
                        `;
                    }
                }, 300);
            }
        } else {
            alert(result.message || 'Có lỗi xảy ra khi từ chối yêu cầu');
        }
    } catch (error) {
        console.error('Error rejecting request:', error);
        alert('Có lỗi xảy ra khi từ chối yêu cầu');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('rejectModal');
    if (event.target == modal) {
        closeRejectModal();
    }
}

// Close modal on Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeRejectModal();
    }
});

