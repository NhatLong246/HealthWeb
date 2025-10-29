// Home page JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    
    // Search functionality
    const searchBtn = document.querySelector('.search-btn');
    const searchInput = document.querySelector('.search-input input');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', function() {
            const query = searchInput.value.trim();
            if (query) {
                window.location.href = `/Books/Search?q=${encodeURIComponent(query)}`;
            }
        });
        
        // Search on Enter key
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query) {
                    window.location.href = `/Books/Search?q=${encodeURIComponent(query)}`;
                }
            }
        });
    }
    
    // Filter radio buttons
    const filterOptions = document.querySelectorAll('.filter-option input[type="radio"]');
    filterOptions.forEach(option => {
        option.addEventListener('change', function() {
            const filter = this.value;
            console.log('Filter selected:', filter);
            
            // TODO: Implement filter functionality
            // This would typically make an AJAX call to filter books
        });
    });
    
    // Favorite buttons
    const favoriteBtns = document.querySelectorAll('.btn-favorite');
    favoriteBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const icon = this.querySelector('i');
            
            if (icon.classList.contains('far')) {
                // Add to favorites
                icon.classList.remove('far');
                icon.classList.add('fas');
                this.style.color = '#ef4444';
                
                // Show success message
                showNotification('Đã thêm vào yêu thích!', 'success');
            } else {
                // Remove from favorites
                icon.classList.remove('fas');
                icon.classList.add('far');
                this.style.color = '#6b7280';
                
                // Show success message
                showNotification('Đã xóa khỏi yêu thích!', 'info');
            }
        });
    });
    
    // Read buttons
    const readBtns = document.querySelectorAll('.btn-read');
    readBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const bookCard = this.closest('.book-card');
            const bookTitle = bookCard.querySelector('.book-info h3').textContent;
            
            // Show loading state
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
            this.disabled = true;
            
            // Simulate loading delay
            setTimeout(() => {
                // Redirect to reader page
                window.location.href = `/Reader/Read?book=${encodeURIComponent(bookTitle)}`;
            }, 1000);
        });
    });
    
    // Category cards
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const categoryName = this.querySelector('h3').textContent;
            window.location.href = `/Books/Category?name=${encodeURIComponent(categoryName)}`;
        });
    });
    
    // Newsletter form
    const newsletterForm = document.querySelector('.newsletter-form');
    const newsletterInput = document.querySelector('.newsletter-form input');
    const newsletterBtn = document.querySelector('.newsletter-form button');
    
    if (newsletterForm && newsletterInput && newsletterBtn) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = newsletterInput.value.trim();
            if (!email) {
                showNotification('Vui lòng nhập email!', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('Email không hợp lệ!', 'error');
                return;
            }
            
            // Show loading state
            newsletterBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng ký...';
            newsletterBtn.disabled = true;
            
            // Simulate API call
            setTimeout(() => {
                newsletterBtn.innerHTML = 'Đăng ký thành công!';
                newsletterBtn.style.background = '#10b981';
                newsletterInput.value = '';
                
                showNotification('Đăng ký nhận thông báo thành công!', 'success');
                
                // Reset button after 3 seconds
                setTimeout(() => {
                    newsletterBtn.innerHTML = 'Đăng ký';
                    newsletterBtn.disabled = false;
                    newsletterBtn.style.background = '';
                }, 3000);
            }, 2000);
        });
    }
    
    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
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
    
    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.book-card, .category-card, .feature-card');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // Header scroll effect
    const header = document.querySelector('header');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down
            header.style.transform = 'translateY(-100%)';
        } else {
            // Scrolling up
            header.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    });
    
    // Utility functions
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Initialize tooltips for book cards
    const bookCards = document.querySelectorAll('.book-card');
    bookCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            const title = this.querySelector('.book-info h3').textContent;
            this.setAttribute('title', title);
        });
    });
    
    // Add loading animation for images (if any)
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('load', function() {
            this.style.opacity = '1';
        });
        
        img.addEventListener('error', function() {
            this.style.display = 'none';
        });
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        // Focus search input with Ctrl+K
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            const searchInputElement = document.querySelector('.search-input input');
            if (searchInputElement) {
                searchInputElement.focus();
            }
        }
        
        // Close modals with Escape
        if (e.key === 'Escape') {
            // TODO: Close any open modals
        }
    });
    
    // ---- Goals Section ----
    (function initGoals(){
        const chips = document.querySelectorAll('.goal-chip');
        if(chips.length===0) return;
        const ring = document.querySelector('.progress-ring');
        const percentEl = document.querySelector('.progress-percent');
        const resetBtn = document.querySelector('.goals-reset');

        const storageKey = 'healthweb_goals_' + new Date().toISOString().slice(0,10);
        const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');

        chips.forEach(ch =>{
            const key = ch.getAttribute('data-key');
            if(saved[key]) ch.classList.add('active');
            ch.addEventListener('click', ()=>{
                ch.classList.toggle('active');
                persist();
                update();
            });
        });

        resetBtn && resetBtn.addEventListener('click', ()=>{
            chips.forEach(c=>c.classList.remove('active'));
            localStorage.removeItem(storageKey);
            update();
        });

        function persist(){
            const data = {};
            chips.forEach(c=>{ data[c.getAttribute('data-key')] = c.classList.contains('active'); });
            localStorage.setItem(storageKey, JSON.stringify(data));
        }

        function update(){
            const total = chips.length;
            const done = Array.from(chips).filter(c=>c.classList.contains('active')).length;
            const p = Math.round(done/total*100);
            if(ring) ring.style.setProperty('--p', p + '%');
            if(percentEl) percentEl.textContent = p + '%';
        }
        update();
    })();

    // ---- BMI / TDEE ----
    (function initBMI(){
        const calcBtn = document.querySelector('.bmi-calc');
        if(!calcBtn) return;
        const hEl = document.getElementById('bmiHeight');
        const wEl = document.getElementById('bmiWeight');
        const aEl = document.getElementById('bmiAge');
        const sEl = document.getElementById('bmiSex');
        const actEl = document.getElementById('bmiActivity');
        const bmiValue = document.getElementById('bmiValue');
        const bmiLabel = document.getElementById('bmiLabel');
        const tdeeValue = document.getElementById('tdeeValue');

        calcBtn.addEventListener('click', ()=>{
            const h = parseFloat(hEl.value || '0');
            const w = parseFloat(wEl.value || '0');
            const age = parseInt(aEl.value || '0');
            const sex = sEl.value;
            const act = parseFloat(actEl.value || '1.55');
            if(!h||!w||!age){ showNotification('Vui lòng nhập đủ chiều cao/cân nặng/tuổi','error'); return; }

            // BMI
            const bmi = w / Math.pow(h/100,2);
            let label = 'Bình thường', color = '#10b981';
            if(bmi < 18.5){ label='Thiếu cân'; color='#f59e0b'; }
            else if(bmi < 25){ label='Bình thường'; color='#10b981'; }
            else if(bmi < 30){ label='Thừa cân'; color='#f97316'; }
            else { label='Béo phì'; color='#ef4444'; }
            bmiValue.textContent = bmi.toFixed(1);
            bmiLabel.textContent = label; bmiLabel.style.backgroundColor = color;

            // Mifflin-St Jeor
            const bmr = sex==='male' ? (10*w + 6.25*h - 5*age + 5) : (10*w + 6.25*h - 5*age - 161);
            const tdee = Math.round(bmr * act);
            tdeeValue.textContent = tdee.toString();
        });
    })();

    console.log('HealthWeb home page enhanced modules initialized');
});