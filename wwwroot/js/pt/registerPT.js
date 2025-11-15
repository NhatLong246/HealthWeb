document.addEventListener('DOMContentLoaded', function() {
    // File upload preview
    const fileInputs = ['avatarFile', 'cccdFile', 'certFile'];
    fileInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        const area = input.closest('.file-upload-area');
        if (input && area) {
            input.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const fileSize = (file.size / 1024 / 1024).toFixed(2);
                    area.querySelector('p').textContent = file.name;
                    area.querySelector('small').textContent = `${fileSize} MB`;
                }
            });
        }
    });

    // Nếu user đã đăng nhập, disable các trường thông tin tài khoản
    const usernameInput = document.getElementById('username');
    if (!usernameInput) {
        // User đã đăng nhập, các trường password không hiển thị
        console.log('User đã đăng nhập, sử dụng thông tin tài khoản hiện tại');
    }

    // Hiển thị thông báo thành công nếu có
    const successMessage = document.querySelector('.success-message');
    if (successMessage) {
        // Sử dụng toast notification nếu có
        if (typeof showSuccess === 'function') {
            const message = successMessage.querySelector('span')?.textContent || successMessage.textContent;
            showSuccess(message);
        } else if (typeof showToast === 'function') {
            const message = successMessage.querySelector('span')?.textContent || successMessage.textContent;
            showToast(message, 'success');
        }
        
        // Tự động ẩn message sau 5 giây
        setTimeout(() => {
            if (successMessage) {
                successMessage.style.transition = 'opacity 0.3s ease';
                successMessage.style.opacity = '0';
                setTimeout(() => {
                    successMessage.remove();
                }, 300);
            }
        }, 5000);
    }
});

