// Search Clients PT - JavaScript chỉ dùng cho filter, sort và hiệu ứng UI
// Dữ liệu được load từ server bằng Razor qua form GET

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

    // Form submit sẽ reload trang với filter mới (server-side)
    const searchForm = document.querySelector('form[method="get"]');
    if (searchForm) {
        // Auto-submit khi thay đổi filter
        ['goalFilter', 'locationFilter', 'timeFilter', 'budgetFilter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', function() {
                    searchForm.submit();
                });
            }
        });
    }
});

function contactClient(clientId) {
    // TODO: Open contact/message modal
    console.log('Contact client:', clientId);
    alert('Tính năng đang phát triển!');
}

function viewProfile(clientId) {
    // Load profile từ server qua partial view
    if (!profileModal || !profileContent) {
        return;
    }

    profileContent.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Đang tải thông tin...</p>
        </div>
    `;

    profileModal.classList.add('show');
    profileModal.setAttribute('aria-hidden', 'false');

    // Fetch profile từ server
    fetch(`/PT/Clients/Detail/${encodeURIComponent(clientId)}`, {
        credentials: 'include',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Không thể tải thông tin');
        }
        return response.text();
    })
    .then(html => {
        profileContent.innerHTML = html;
    })
    .catch(error => {
        console.error('Error loading profile:', error);
        profileContent.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Không thể tải thông tin khách hàng</p>
            </div>
        `;
    });
}

function closeClientProfile() {
    if (!profileModal) {
        return;
    }
    profileModal.classList.remove('show');
    profileModal.setAttribute('aria-hidden', 'true');
}
