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

function initLoginValidation(){ const loginForm=document.querySelector('.auth-form'); if(!loginForm) return; loginForm.addEventListener('submit', function(e){ e.preventDefault(); const username=document.getElementById('username').value.trim(); const password=document.getElementById('password').value; let isValid=true; if(!username){showFieldError(document.getElementById('username'),'Tên đăng nhập là bắt buộc'); isValid=false;} if(!password){showFieldError(document.getElementById('password'),'Mật khẩu là bắt buộc'); isValid=false;} if(!isValid){showNotification('Vui lòng kiểm tra lại thông tin','error'); return;} const submitBtn=loginForm.querySelector('.auth-btn'); const originalText=submitBtn.innerHTML; submitBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...'; submitBtn.disabled=true; setTimeout(()=>{ showNotification('Đăng nhập thành công!','success'); setTimeout(()=>{ window.location.href='/'; },1000); },2000); }); }

function initRegisterValidation(){ const registerForm=document.querySelector('.auth-form'); if(!registerForm) return; registerForm.addEventListener('submit', function(e){ e.preventDefault(); const firstName=document.getElementById('firstName').value.trim(); const lastName=document.getElementById('lastName').value.trim(); const email=document.getElementById('email').value.trim(); const username=document.getElementById('username').value.trim(); const password=document.getElementById('password').value; const confirmPassword=document.getElementById('confirmPassword').value; const birthDate=document.getElementById('birthDate').value; const agreeTerms=document.querySelector('input[name="agreeTerms"]')?.checked; let isValid=true; if(!firstName){showFieldError(document.getElementById('firstName'),'Họ là bắt buộc'); isValid=false;} if(!lastName){showFieldError(document.getElementById('lastName'),'Tên là bắt buộc'); isValid=false;} if(!email){showFieldError(document.getElementById('email'),'Email là bắt buộc'); isValid=false;} else if(!isValidEmail(email)){showFieldError(document.getElementById('email'),'Email không hợp lệ'); isValid=false;} if(!username){showFieldError(document.getElementById('username'),'Tên đăng nhập là bắt buộc'); isValid=false;} if(!password){showFieldError(document.getElementById('password'),'Mật khẩu là bắt buộc'); isValid=false;} else if(password.length<8){showFieldError(document.getElementById('password'),'Mật khẩu phải có ít nhất 8 ký tự'); isValid=false;} if(!confirmPassword){showFieldError(document.getElementById('confirmPassword'),'Xác nhận mật khẩu là bắt buộc'); isValid=false;} else if(password!==confirmPassword){showFieldError(document.getElementById('confirmPassword'),'Mật khẩu xác nhận không khớp'); isValid=false;} if(!birthDate){showFieldError(document.getElementById('birthDate'),'Ngày sinh là bắt buộc'); isValid=false;} if(!agreeTerms){showNotification('Vui lòng đồng ý với điều khoản sử dụng','error'); isValid=false;} if(!isValid){showNotification('Vui lòng kiểm tra lại thông tin','error'); return;} const submitBtn=registerForm.querySelector('.auth-btn'); submitBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Đang tạo tài khoản...'; submitBtn.disabled=true; setTimeout(()=>{ showNotification('Đăng ký thành công! Chào mừng bạn đến với HealthWeb!','success'); setTimeout(()=>{ window.location.href='/Account/Login'; },2000); },2000); }); }

function initForgotPasswordValidation(){ const forgotPasswordForm=document.querySelector('.auth-form'); if(!forgotPasswordForm) return; forgotPasswordForm.addEventListener('submit', function(e){ e.preventDefault(); const email=document.getElementById('email').value.trim(); if(!email){showFieldError(document.getElementById('email'),'Email là bắt buộc'); showNotification('Vui lòng nhập email','error'); return;} if(!isValidEmail(email)){showFieldError(document.getElementById('email'),'Email không hợp lệ'); showNotification('Email không hợp lệ','error'); return;} const submitBtn=forgotPasswordForm.querySelector('.auth-btn'); const originalText=submitBtn.innerHTML; submitBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Đang gửi...'; submitBtn.disabled=true; setTimeout(()=>{ showNotification('Email đặt lại mật khẩu đã được gửi!','success'); submitBtn.innerHTML=originalText; submitBtn.disabled=false; },2000); }); }

function initSocialLogin(){ document.querySelectorAll('.social-btn').forEach(button=>{ button.addEventListener('click', function(e){ e.preventDefault(); const provider=this.classList.contains('google-btn')?'Google':'Facebook'; showNotification(`Đang chuyển hướng đến ${provider}...`,'info'); setTimeout(()=>{ showNotification(`Tính năng đăng nhập ${provider} sẽ được cập nhật sớm!`,'info'); },1000); }); }); }

document.addEventListener('DOMContentLoaded', function(){ initPasswordStrength(); initRealTimeValidation(); initLoginValidation(); initRegisterValidation(); initForgotPasswordValidation(); initSocialLogin(); });
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

// Show notification with improved styling
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
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
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
function initLoginValidation() {
    const loginForm = document.querySelector('.auth-form');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.querySelector('input[name="rememberMe"]')?.checked;
        
        // Validate all fields
        let isValid = true;
        
        if (!username) { showFieldError(document.getElementById('username'), 'Tên đăng nhập là bắt buộc'); isValid = false; }
        
        if (!password) {
            showFieldError(document.getElementById('password'), 'Mật khẩu là bắt buộc');
            isValid = false;
        }
        
        if (!isValid) {
            showNotification('Vui lòng kiểm tra lại thông tin', 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = loginForm.querySelector('.auth-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
        submitBtn.disabled = true;
        
        // Simulate login process (replace with actual API call)
        setTimeout(() => {
            try { localStorage.setItem('hw_is_auth','true'); localStorage.setItem('hw_username', username); } catch {}
            showNotification('Đăng nhập thành công!', 'success');
            // Redirect to dashboard or home page
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        }, 2000);
    });
}

// Register form validation
function initRegisterValidation() {
    const registerForm = document.querySelector('.auth-form');
    if (!registerForm) return;
    
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const birthDate = document.getElementById('birthDate').value;
        const agreeTerms = document.querySelector('input[name="agreeTerms"]')?.checked;
        
        // Validate all fields
        let isValid = true;
        
        if (!firstName) {
            showFieldError(document.getElementById('firstName'), 'Họ là bắt buộc');
            isValid = false;
        }
        
        if (!lastName) {
            showFieldError(document.getElementById('lastName'), 'Tên là bắt buộc');
            isValid = false;
        }
        
        if (!email) {
            showFieldError(document.getElementById('email'), 'Email là bắt buộc');
            isValid = false;
        } else if (!isValidEmail(email)) {
            showFieldError(document.getElementById('email'), 'Email không hợp lệ');
            isValid = false;
        }
        
        if (!username) {
            showFieldError(document.getElementById('username'), 'Tên đăng nhập là bắt buộc');
            isValid = false;
        }
        
        if (!password) {
            showFieldError(document.getElementById('password'), 'Mật khẩu là bắt buộc');
            isValid = false;
        } else if (password.length < 8) {
            showFieldError(document.getElementById('password'), 'Mật khẩu phải có ít nhất 8 ký tự');
            isValid = false;
        }
        
        if (!confirmPassword) {
            showFieldError(document.getElementById('confirmPassword'), 'Xác nhận mật khẩu là bắt buộc');
            isValid = false;
        } else if (password !== confirmPassword) {
            showFieldError(document.getElementById('confirmPassword'), 'Mật khẩu xác nhận không khớp');
            isValid = false;
        }
        
        if (!birthDate) {
            showFieldError(document.getElementById('birthDate'), 'Ngày sinh là bắt buộc');
            isValid = false;
        }
        
        if (!agreeTerms) {
            showNotification('Vui lòng đồng ý với điều khoản sử dụng', 'error');
            isValid = false;
        }
        
        if (!isValid) {
            showNotification('Vui lòng kiểm tra lại thông tin', 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = registerForm.querySelector('.auth-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo tài khoản...';
        submitBtn.disabled = true;
        
        // Simulate registration process (replace with actual API call)
        setTimeout(() => {
            try { localStorage.setItem('hw_is_auth','true'); } catch {}
            showNotification('Đăng ký thành công! Chào mừng bạn đến với HealthWeb!', 'success');
            // Redirect to login page
            setTimeout(() => {
                window.location.href = '/Account/Login';
            }, 2000);
        }, 2000);
    });
}

// Forgot password form validation
function initForgotPasswordValidation() {
    const forgotPasswordForm = document.querySelector('.auth-form');
    if (!forgotPasswordForm) return;
    
    forgotPasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        
        if (!email) {
            showFieldError(document.getElementById('email'), 'Email là bắt buộc');
            showNotification('Vui lòng nhập email', 'error');
            return;
        }
        
        if (!isValidEmail(email)) {
            showFieldError(document.getElementById('email'), 'Email không hợp lệ');
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