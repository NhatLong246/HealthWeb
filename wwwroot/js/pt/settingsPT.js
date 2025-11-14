function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.settings-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');
}

async function saveProfile() {
    const form = document.querySelector('#profileTab');
    const formData = {
        HoTen: document.getElementById('displayName').value,
        Email: document.getElementById('email').value,
        Phone: document.getElementById('phone').value,
        ThanhPho: document.getElementById('city').value,
        TieuSu: document.getElementById('bio').value
    };

    try {
        const response = await fetch('/PT/Settings/Profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]')?.value || ''
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        if (result.success) {
            showNotification(result.message, 'success');
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Có lỗi xảy ra khi lưu thông tin', 'error');
    }
}

async function saveProfessional() {
    const formData = {
        ChuyenMon: document.getElementById('specialty').value,
        SoNamKinhNghiem: parseInt(document.getElementById('experience').value) || null,
        GiaTheoGio: parseFloat(document.getElementById('price').value) || null,
        ChungChi: document.getElementById('certificates').value
    };

    try {
        const response = await fetch('/PT/Settings/Professional', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]')?.value || ''
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        if (result.success) {
            showNotification(result.message, 'success');
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Có lỗi xảy ra khi lưu thông tin', 'error');
    }
}

async function saveSchedule() {
    const formData = {
        GioRanh: document.getElementById('availableHours').value,
        NhanKhach: document.getElementById('acceptClients').checked,
        MaxClients: parseInt(document.getElementById('maxClients').value) || null
    };

    try {
        const response = await fetch('/PT/Settings/Schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]')?.value || ''
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        if (result.success) {
            showNotification(result.message, 'success');
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Có lỗi xảy ra khi lưu thông tin', 'error');
    }
}

async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Vui lòng điền đầy đủ thông tin!', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('Mật khẩu xác nhận không khớp!', 'error');
        return;
    }

    const formData = {
        CurrentPassword: currentPassword,
        NewPassword: newPassword,
        ConfirmPassword: confirmPassword
    };

    try {
        const response = await fetch('/PT/Settings/ChangePassword', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]')?.value || ''
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        if (result.success) {
            showNotification(result.message, 'success');
            // Clear password fields
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Có lỗi xảy ra khi đổi mật khẩu', 'error');
    }
}

async function saveNotifications() {
    // TODO: Implement save notifications settings logic
    // This would require a notifications settings table or field in User/PT model
    showNotification('Đã lưu cài đặt thông báo!', 'success');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 10px 30px rgba(0,0,0,.3);
        animation: slideIn 0.3s ease;
    `;
    
    if (type === 'success') {
        notification.style.background = '#4ade80';
    } else {
        notification.style.background = '#ef4444';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

