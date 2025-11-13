// Copied from BookReaderWebApp/wwwroot/js/auth.js
// Authentication JavaScript Functions

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const toggleBtn = input.parentElement.querySelector('.password-toggle i');
    if (input.type === 'password') {
        input.type = 'text';
        toggleBtn.className = 'fas fa-eye-slash';
        toggleBtn.title = 'Ẩn mật khẩu';
    } else {
        input.type = 'password';
        toggleBtn.className = 'fas fa-eye';
        toggleBtn.title = 'Hiện mật khẩu';
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type = 'info') {
    document.querySelectorAll('.notification').forEach(n => n.remove());
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<div style="display:flex;align-items:center;gap:.5rem;"><i class="fas ${getNotificationIcon(type)}"></i><span>${message}</span></div>`;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => { notification.classList.remove('show'); setTimeout(()=>notification.remove(),300); }, 4000);
}

function getNotificationIcon(type){ switch(type){case 'success':return 'fa-check-circle';case 'error':return 'fa-exclamation-circle';case 'warning':return 'fa-exclamation-triangle';default:return 'fa-info-circle';} }

function initPasswordStrength(){ const passwordInput=document.getElementById('password'); if(!passwordInput) return; passwordInput.addEventListener('input', function(){ const password=this.value; const strengthFill=document.getElementById('strengthFill'); const strengthText=document.getElementById('strengthText'); if(!strengthFill||!strengthText) return; let strength=0; let text='Yếu'; let color='#ef4444'; if(password.length>=8) strength++; if(password.length>=12) strength++; if(/[a-z]/.test(password)) strength++; if(/[A-Z]/.test(password)) strength++; if(/[0-9]/.test(password)) strength++; if(/[^A-Za-z0-9]/.test(password)) strength++; if(/(.)\1{2,}/.test(password)) strength=Math.max(0,strength-1); if(/123|abc|qwe|password|admin/i.test(password)) strength=Math.max(0,strength-2); const percentage=Math.min(100,(strength/6)*100); if(percentage<=20){text='Rất yếu';color='#ef4444';} else if(percentage<=40){text='Yếu';color='#f97316';} else if(percentage<=60){text='Trung bình';color='#f59e0b';} else if(percentage<=80){text='Khá';color='#10b981';} else {text='Mạnh';color='#22c55e';} strengthFill.style.width=percentage+'%'; strengthFill.style.backgroundColor=color; strengthText.textContent=text; strengthText.style.color=color; }); }

function initRealTimeValidation(){ const inputs=document.querySelectorAll('.auth-form input[required]'); inputs.forEach(input=>{ input.addEventListener('blur', function(){ validateField(this);}); input.addEventListener('input', function(){ clearFieldError(this);});}); }

function validateField(field){ const value=field.value.trim(); const fieldName=field.name; clearFieldError(field); switch(fieldName){ case 'email': if(!value){showFieldError(field,'Email là bắt buộc');} else if(!isValidEmail(value)){showFieldError(field,'Email không hợp lệ');} break; case 'password': if(!value){showFieldError(field,'Mật khẩu là bắt buộc');} else if(value.length<8){showFieldError(field,'Mật khẩu phải có ít nhất 8 ký tự');} break; case 'confirmPassword': const password=document.getElementById('password')?.value; if(!value){showFieldError(field,'Xác nhận mật khẩu là bắt buộc');} else if(password&&value!==password){showFieldError(field,'Mật khẩu xác nhận không khớp');} break; case 'firstName': case 'lastName': if(!value){showFieldError(field,`${fieldName==='firstName'?'Họ':'Tên'} là bắt buộc`);} else if(value.length<2){showFieldError(field,`${fieldName==='firstName'?'Họ':'Tên'} phải có ít nhất 2 ký tự`);} break; case 'username': if(!value){showFieldError(field,'Tên đăng nhập là bắt buộc');} else if(value.length<3){showFieldError(field,'Tên đăng nhập phải có ít nhất 3 ký tự');} else if(!/^[a-zA-Z0-9_]+$/.test(value)){showFieldError(field,'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới');} break; case 'birthDate': if(!value){showFieldError(field,'Ngày sinh là bắt buộc');} else { const birthDate=new Date(value); const today=new Date(); const age=today.getFullYear()-birthDate.getFullYear(); if(age<13){showFieldError(field,'Bạn phải ít nhất 13 tuổi để đăng ký'); } } break; } }

function showFieldError(field,message){ const wrapper=field.closest('.input-wrapper')||field.closest('.form-group'); if(!wrapper) return; clearFieldError(field); field.style.borderColor='#ef4444'; wrapper.style.position='relative'; const errorDiv=document.createElement('div'); errorDiv.className='field-error'; errorDiv.textContent=message; errorDiv.style.cssText='color:#ef4444;font-size:.8rem;margin-top:.25rem;display:flex;align-items:center;gap:.25rem;'; wrapper.appendChild(errorDiv); }
function clearFieldError(field){ const wrapper=field.closest('.input-wrapper')||field.closest('.form-group'); if(!wrapper) return; field.style.borderColor=''; const errorDiv=wrapper.querySelector('.field-error'); if(errorDiv) errorDiv.remove(); }

// Authentication JavaScript Functions

// Password toggle functionality
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const toggleBtn = input.parentElement.querySelector('.password-toggle i');
    
    if (input.type === 'password') {
        input.type = 'text';
        toggleBtn.className = 'fas fa-eye-slash';
        toggleBtn.title = 'Ẩn mật khẩu';
    } else {
        input.type = 'password';
        toggleBtn.className = 'fas fa-eye';
        toggleBtn.title = 'Hiện mật khẩu';
    }
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show notification with improved styling (REPLACE function cũ)
// Function này sẽ được định nghĩa lại ở đây để override function cũ
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Thêm style inline để đảm bảo hiển thị
    notification.style.cssText += `
        position: fixed;
        top: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    
    if (type === 'error') {
        notification.style.background = '#ef4444';
    } else if (type === 'success') {
        notification.style.background = '#4ade80';
    } else {
        notification.style.background = '#3b82f6';
    }
    
    document.body.appendChild(notification);
    
    // Trigger animation - quan trọng: phải có delay để browser render trước
    requestAnimationFrame(() => {
        setTimeout(() => {
            notification.classList.add('show');
            notification.style.transform = 'translateX(0)';
        }, 100);
    });
    
    // Auto remove after 5 seconds (tăng lên 5 giây để user có thời gian đọc)
    setTimeout(() => {
        notification.classList.remove('show');
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Get notification icon based on type
function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

// Password strength checker with improved algorithm
function initPasswordStrength() {
    const passwordInput = document.getElementById('password');
    if (!passwordInput) return;
    
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');
        
        if (!strengthFill || !strengthText) return;
        
        let strength = 0;
        let text = 'Yếu';
        let color = '#ef4444';
        
        // Length check
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        
        // Character variety checks
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        // Common patterns check (negative points)
        if (/(.)\1{2,}/.test(password)) strength = Math.max(0, strength - 1); // Repeated characters
        if (/123|abc|qwe|password|admin/i.test(password)) strength = Math.max(0, strength - 2); // Common patterns
        
        // Calculate percentage and set text/color
        const percentage = Math.min(100, (strength / 6) * 100);
        
        if (percentage <= 20) {
            text = 'Rất yếu';
            color = '#ef4444';
        } else if (percentage <= 40) {
            text = 'Yếu';
            color = '#f97316';
        } else if (percentage <= 60) {
            text = 'Trung bình';
            color = '#f59e0b';
        } else if (percentage <= 80) {
            text = 'Khá';
            color = '#10b981';
        } else {
            text = 'Mạnh';
            color = '#22c55e';
        }
        
        strengthFill.style.width = percentage + '%';
        strengthFill.style.backgroundColor = color;
        strengthText.textContent = text;
        strengthText.style.color = color;
    });
}

// Real-time form validation
function initRealTimeValidation() {
    const inputs = document.querySelectorAll('.auth-form input[required]');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            clearFieldError(this);
        });
    });
}

// Validate individual field
function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    
    clearFieldError(field);
    
    switch(fieldName) {
        case 'email':
            if (!value) {
                showFieldError(field, 'Email là bắt buộc');
            } else if (!isValidEmail(value)) {
                showFieldError(field, 'Email không hợp lệ');
            }
            break;
            
        case 'password':
            if (!value) {
                showFieldError(field, 'Mật khẩu là bắt buộc');
            } else if (value.length < 8) {
                showFieldError(field, 'Mật khẩu phải có ít nhất 8 ký tự');
            }
            break;
            
        case 'confirmPassword':
            const password = document.getElementById('password')?.value;
            if (!value) {
                showFieldError(field, 'Xác nhận mật khẩu là bắt buộc');
            } else if (password && value !== password) {
                showFieldError(field, 'Mật khẩu xác nhận không khớp');
            }
            break;
            
        case 'firstName':
        case 'lastName':
            if (!value) {
                showFieldError(field, `${fieldName === 'firstName' ? 'Họ' : 'Tên'} là bắt buộc`);
            } else if (value.length < 2) {
                showFieldError(field, `${fieldName === 'firstName' ? 'Họ' : 'Tên'} phải có ít nhất 2 ký tự`);
            }
            break;
            
        case 'username':
            if (!value) {
                showFieldError(field, 'Tên đăng nhập là bắt buộc');
            } else if (value.length < 3) {
                showFieldError(field, 'Tên đăng nhập phải có ít nhất 3 ký tự');
            } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                showFieldError(field, 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới');
            }
            break;
            
        case 'birthDate':
            if (!value) {
                showFieldError(field, 'Ngày sinh là bắt buộc');
            } else {
                const birthDate = new Date(value);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                if (age < 13) {
                    showFieldError(field, 'Bạn phải ít nhất 13 tuổi để đăng ký');
                }
            }
            break;
    }
}

// Show field error
function showFieldError(field, message) {
    if (!field) {
        return;
    }
    const wrapper = field.closest('.input-wrapper') || field.closest('.form-group');
    if (!wrapper) return;
    
    // Remove existing error
    clearFieldError(field);
    
    // Add error styling
    field.style.borderColor = '#ef4444';
    wrapper.style.position = 'relative';
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        color: #ef4444;
        font-size: 0.8rem;
        margin-top: 0.25rem;
        display: flex;
        align-items: center;
        gap: 0.25rem;
    `;
    
    wrapper.appendChild(errorDiv);
}

// Clear field error
function clearFieldError(field) {
    const wrapper = field.closest('.input-wrapper') || field.closest('.form-group');
    if (!wrapper) return;
    
    field.style.borderColor = '';
    const errorDiv = wrapper.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// Login form validation
let loginFormSubmitted = false; // Flag để tránh submit nhiều lần
let loginTimeoutHandle = null; // Handle cho timeout

function initLoginValidation() {
    // CHỈ chạy trên trang Login - kiểm tra xem có field Username và Password không
    const usernameEl = document.getElementById('Username');
    const passwordEl = document.getElementById('Password');
    
    // Nếu không có Username hoặc Password field, đây không phải trang Login
    if (!usernameEl || !passwordEl) {
        return;
    }
    
    const loginForm = document.getElementById('loginForm') || document.querySelector('.auth-form');
    if (!loginForm) {
        return;
    }
    
    // Chỉ attach listener nếu chưa có
    if (loginForm.dataset.listenerAttached === 'true') {
        return;
    }
    loginForm.dataset.listenerAttached = 'true';
    
    loginForm.addEventListener('submit', function(e) {
        // Tránh submit nhiều lần
        if (loginFormSubmitted) {
            e.preventDefault();
            return false;
        }
        
        const username = usernameEl?.value?.trim();
        const password = passwordEl?.value;
        
        // Validate cơ bản phía client
        if (!username) { 
            e.preventDefault();
            if (usernameEl) {
                showFieldError(usernameEl, 'Tên đăng nhập là bắt buộc');
            }
            showNotification('Vui lòng điền đầy đủ thông tin', 'error');
            return false;
        }
        
        if (!password) {
            e.preventDefault();
            if (passwordEl) {
                showFieldError(passwordEl, 'Mật khẩu là bắt buộc');
            }
            showNotification('Vui lòng điền đầy đủ thông tin', 'error');
            return false;
        }
        
        // Đánh dấu đã submit
        loginFormSubmitted = true;
        
        // Nếu validation OK, cho phép form submit đến server
        // Show loading state TRƯỚC KHI form submit
        const submitBtn = loginForm.querySelector('.auth-btn');
        const originalText = submitBtn ? submitBtn.innerHTML : '';
        
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
            submitBtn.disabled = true;
        }
        
        // Clear timeout cũ nếu có
        if (loginTimeoutHandle) {
            clearTimeout(loginTimeoutHandle);
        }
        
        // Nếu sau 8 giây vẫn chưa có response, reset button
        loginTimeoutHandle = setTimeout(() => {
            
            // Kiểm tra xem trang có đổi không (nghĩa là form đã submit và redirect)
            // Nếu vẫn còn ở trang login sau 8 giây, nghĩa là form không submit được hoặc server quá chậm
            const isStillOnLoginPage = window.location.pathname.includes('/Account/Login') || 
                                      window.location.pathname.includes('/Login');
            
            if (isStillOnLoginPage && submitBtn && submitBtn.disabled) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                loginFormSubmitted = false;
                
                // Chỉ hiển thị thông báo khi thực sự offline để tránh báo sai
                try {
                    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                        showNotification('Mất kết nối mạng. Vui lòng kiểm tra Internet và thử lại.', 'error');
                    }
                } catch {
                    // an toàn: không làm gì thêm
                }
            }
        }, 8000);
        
        // QUAN TRỌNG: Không return false và không preventDefault
        // Nếu return false hoặc gọi preventDefault() thì form sẽ KHÔNG submit
        // Ở đây chúng ta KHÔNG làm gì cả = cho phép form submit tự nhiên
        // Không return gì cả hoặc return true = cho phép submit
    });
}

// Register form validation
function initRegisterValidation() {
    const registerForm = document.querySelector('.auth-form');
    if (!registerForm) return;
    
    // Chỉ chạy trên trang Register (có field Email và ConfirmPassword)
    const emailField = document.getElementById('Email');
    const confirmPasswordField = document.getElementById('ConfirmPassword');
    if (!emailField || !confirmPasswordField) {
        return;
    }
    
    registerForm.addEventListener('submit', function(e) {
        // Validate các field trước khi submit
        const firstName = document.getElementById('FirstName')?.value.trim();
        const lastName = document.getElementById('LastName')?.value.trim();
        const email = emailField?.value.trim();
        const username = document.getElementById('Username')?.value.trim();
        const password = document.getElementById('Password')?.value;
        const confirmPassword = confirmPasswordField?.value;
        
        // Validate cơ bản phía client
        let isValid = true;
        
        if (!email) {
            e.preventDefault();
            if (emailField) {
                showFieldError(emailField, 'Email là bắt buộc');
            }
            isValid = false;
        }
        
        if (!password) {
            e.preventDefault();
            const passwordEl = document.getElementById('Password');
            if (passwordEl) {
                showFieldError(passwordEl, 'Mật khẩu là bắt buộc');
            }
            isValid = false;
        }
        
        if (!confirmPassword) {
            e.preventDefault();
            if (confirmPasswordField) {
                showFieldError(confirmPasswordField, 'Xác nhận mật khẩu là bắt buộc');
            }
            isValid = false;
        } else if (password && password !== confirmPassword) {
            e.preventDefault();
            if (confirmPasswordField) {
                showFieldError(confirmPasswordField, 'Mật khẩu xác nhận không khớp');
            }
            isValid = false;
        }
        
        if (!isValid) {
            showNotification('Vui lòng điền đầy đủ thông tin', 'error');
            return;
        }
        
        // Nếu validation OK, cho phép form submit đến server
        // Show loading state
        const submitBtn = registerForm.querySelector('.auth-btn');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo tài khoản...';
            submitBtn.disabled = true;
        }
        
        // Form sẽ submit và server sẽ xử lý
    });
}

// Forgot password form validation
function initForgotPasswordValidation() {
    const forgotPasswordForm = document.querySelector('.auth-form');
    if (!forgotPasswordForm) return;
    
    // Chỉ chạy nếu có trường email (trang ForgotPassword), không phải trang Login
    const emailEl = document.getElementById('email');
    if (!emailEl) {
        // Không phải trang ForgotPassword, bỏ qua
        return;
    }
    
    forgotPasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = emailEl.value.trim();
        
        if (!email) {
            showFieldError(emailEl, 'Email là bắt buộc');
            showNotification('Vui lòng nhập email', 'error');
            return;
        }
        
        if (!isValidEmail(email)) {
            showFieldError(emailEl, 'Email không hợp lệ');
            showNotification('Email không hợp lệ', 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = forgotPasswordForm.querySelector('.auth-btn');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
        submitBtn.disabled = true;
        
        // Simulate password reset process
        setTimeout(() => {
            showNotification('Email đặt lại mật khẩu đã được gửi!', 'success');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }, 2000);
    });
}

// Social login handlers
function initSocialLogin() {
    const socialButtons = document.querySelectorAll('.social-btn');
    
    socialButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const provider = this.classList.contains('google-btn') ? 'Google' : 'Facebook';
            showNotification(`Đang chuyển hướng đến ${provider}...`, 'info');
            
            // Add actual social login implementation here
            setTimeout(() => {
                showNotification(`Tính năng đăng nhập ${provider} sẽ được cập nhật sớm!`, 'info');
            }, 1000);
        });
    });
}

// Initialize all auth functions
document.addEventListener('DOMContentLoaded', function() {
    
    initPasswordStrength();
    initRealTimeValidation();
    initLoginValidation();
    initRegisterValidation();
    initForgotPasswordValidation();
    initSocialLogin();
    
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}); 
