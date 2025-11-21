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
    
    // Health info dialogs - chỉ khởi tạo nếu element tồn tại
    const healthDialog = document.getElementById('healthDialog');
    
    if (!healthDialog) {
        // Element không tồn tại - có thể không phải trang cần dialog này
        // Không log error vì đây là bình thường trên một số trang
        // console.log('Health dialog element not found - this is normal on some pages');
    } else {
        // Chỉ khởi tạo dialog nếu element tồn tại
        const healthDialogOverlay = healthDialog.querySelector('.health-dialog-overlay');
        const healthDialogClose = healthDialog.querySelector('.health-dialog-close');
        const healthDialogIcon = healthDialog.querySelector('.health-dialog-icon');
        const healthDialogTitle = healthDialog.querySelector('.health-dialog-title');
        const healthDialogBody = healthDialog.querySelector('.health-dialog-body');
    
        // Nội dung cho mỗi dialog
        const healthDialogContent = {
        exercise: {
            icon: '<i class="fas fa-person-running"></i>',
            title: '150 phút/tuần',
            body: `
                <p><strong>Tập thể dục vừa phải 150 phút mỗi tuần</strong> là khuyến nghị của Tổ chức Y tế Thế giới (WHO) để duy trì sức khỏe tim mạch.</p>
                <p><strong>Lợi ích:</strong></p>
                <ul>
                    <li>Giảm 30% nguy cơ mắc bệnh tim mạch</li>
                    <li>Cải thiện tuần hoàn máu và huyết áp</li>
                    <li>Tăng cường sức bền và năng lượng</li>
                    <li>Giảm stress và cải thiện tâm trạng</li>
                    <li>Hỗ trợ kiểm soát cân nặng</li>
                </ul>
                <p><strong>Gợi ý:</strong> Chia thành 5 buổi/tuần, mỗi buổi 30 phút với các hoạt động như đi bộ nhanh, đạp xe, bơi lội, hoặc khiêu vũ.</p>
            `
        },
        nutrition: {
            icon: '<i class="fas fa-apple-whole"></i>',
            title: '400g rau quả/ngày',
            body: `
                <p><strong>Ăn ít nhất 400g rau quả mỗi ngày</strong> (tương đương 5 phần) giúp cung cấp đầy đủ chất dinh dưỡng cần thiết cho cơ thể.</p>
                <p><strong>Lợi ích:</strong></p>
                <ul>
                    <li>Bổ sung chất xơ hỗ trợ tiêu hóa</li>
                    <li>Cung cấp vitamin và khoáng chất thiết yếu</li>
                    <li>Giảm nguy cơ bệnh tim, đột quỵ và ung thư</li>
                    <li>Hỗ trợ kiểm soát đường huyết</li>
                    <li>Tăng cường hệ miễn dịch</li>
                </ul>
                <p><strong>Gợi ý:</strong> Kết hợp nhiều màu sắc (xanh lá, đỏ, vàng, tím) để đa dạng dinh dưỡng. Một phần tương đương: 1 quả táo, 1 bát rau sống, hoặc 1/2 bát rau nấu chín.</p>
            `
        },
        sleep: {
            icon: '<i class="fas fa-moon"></i>',
            title: '7–8 giờ/ngày',
            body: `
                <p><strong>Ngủ đủ 7-8 giờ mỗi đêm</strong> là thời lượng tối ưu để cơ thể phục hồi và tái tạo năng lượng.</p>
                <p><strong>Lợi ích:</strong></p>
                <ul>
                    <li>Phục hồi thể chất và tinh thần</li>
                    <li>Cải thiện trí nhớ và khả năng tập trung</li>
                    <li>Tăng cường hệ miễn dịch</li>
                    <li>Điều hòa hormone và trao đổi chất</li>
                    <li>Giảm nguy cơ bệnh tim, tiểu đường và béo phì</li>
                </ul>
                <p><strong>Mẹo ngủ ngon:</strong> Tạo thói quen đi ngủ đúng giờ, tránh ánh sáng xanh trước khi ngủ, giữ phòng ngủ mát mẻ và tối, tránh caffeine sau 2 giờ chiều.</p>
            `
        },
        water: {
            icon: '<i class="fas fa-droplet"></i>',
            title: '1.5–2 lít nước',
            body: `
                <p><strong>Uống 1.5-2 lít nước mỗi ngày</strong> (tương đương 6-8 cốc) giúp duy trì các chức năng cơ thể hoạt động tốt.</p>
                <p><strong>Lợi ích:</strong></p>
                <ul>
                    <li>Hỗ trợ trao đổi chất và tiêu hóa</li>
                    <li>Giữ cho da khỏe mạnh và đàn hồi</li>
                    <li>Điều hòa thân nhiệt</li>
                    <li>Giúp não hoạt động tốt hơn, tăng tỉnh táo</li>
                    <li>Hỗ trợ vận chuyển chất dinh dưỡng</li>
                </ul>
                <p><strong>Dấu hiệu thiếu nước:</strong> Khát nước, nước tiểu sẫm màu, mệt mỏi, đau đầu. Hãy uống nước đều đặn trong ngày, không đợi đến khi khát.</p>
            `
        },
        steps: {
            icon: '<i class="fas fa-heart-pulse"></i>',
            title: '10.000 bước',
            body: `
                <p><strong>Đi bộ 10.000 bước mỗi ngày</strong> là mục tiêu được khuyến nghị để duy trì sức khỏe tim mạch và thể chất.</p>
                <p><strong>Lợi ích:</strong></p>
                <ul>
                    <li>Cải thiện sức khỏe tim mạch</li>
                    <li>Tăng cường sức bền và sức mạnh cơ bắp</li>
                    <li>Hỗ trợ giảm cân và duy trì cân nặng</li>
                    <li>Cải thiện tâm trạng và giảm stress</li>
                    <li>Tăng mật độ xương, giảm nguy cơ loãng xương</li>
                </ul>
                <p><strong>Mẹo đạt mục tiêu:</strong> Đi cầu thang bộ thay vì thang máy, đỗ xe xa hơn, đi bộ trong giờ nghỉ trưa, hoặc sử dụng máy đếm bước để theo dõi.</p>
            `
        },
        balance: {
            icon: '<i class="fas fa-scale-balanced"></i>',
            title: 'Cân bằng năng lượng',
            body: `
                <p><strong>Cân bằng năng lượng</strong> là nguyên tắc cơ bản để duy trì cân nặng ổn định: năng lượng nạp vào = năng lượng tiêu hao.</p>
                <p><strong>Nguyên tắc:</strong></p>
                <ul>
                    <li>Ăn vừa đủ calo theo nhu cầu cơ thể</li>
                    <li>Kết hợp dinh dưỡng hợp lý và vận động thường xuyên</li>
                    <li>Chọn thực phẩm giàu dinh dưỡng, ít calo rỗng</li>
                    <li>Lắng nghe tín hiệu đói và no của cơ thể</li>
                    <li>Duy trì thói quen ăn uống đều đặn</li>
                </ul>
                <p><strong>Lưu ý:</strong> Để giảm cân, tạo thâm hụt calo nhẹ (500-750 kcal/ngày). Để tăng cân, tăng calo từ thực phẩm lành mạnh. Luôn kết hợp với tập thể dục.</p>
            `
        }
    };
    
        // Mở dialog khi click vào book-card
        // Đợi một chút để đảm bảo DOM đã sẵn sàng
        setTimeout(() => {
            const bookCards = document.querySelectorAll('.book-card[data-dialog]');
            
            // Chỉ log warning nếu thực sự cần book cards (có thể không có trên một số trang)
            if (bookCards.length === 0) {
                // Không log warning vì đây là bình thường trên một số trang
                // console.log('No book cards with data-dialog attribute found - this is normal on some pages');
                return; // Thoát sớm nếu không có book cards
            }
            
            bookCards.forEach((card, index) => {
                console.log(`Setting up click handler for card ${index + 1}:`, card);
                
                // Xóa event listener cũ nếu có
                const newCard = card.cloneNode(true);
                card.parentNode.replaceChild(newCard, card);
                
                newCard.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    const dialogType = this.getAttribute('data-dialog');
                    console.log('Card clicked, dialog type:', dialogType);
                    
                    if (!dialogType) {
                        console.error('No data-dialog attribute found!');
                        return;
                    }
                    
                    const content = healthDialogContent[dialogType];
                    
                    if (!healthDialog) {
                        console.error('Health dialog element not found!');
                        return;
                    }
                    
                    if (!content) {
                        console.error('Dialog content not found for type:', dialogType);
                        return;
                    }
                    
                    // Lấy icon từ card
                    const cardIcon = this.querySelector('.book-cover i');
                    if (cardIcon && healthDialogIcon) {
                        healthDialogIcon.innerHTML = cardIcon.outerHTML;
                    }
                    
                    if (healthDialogTitle) healthDialogTitle.textContent = content.title;
                    if (healthDialogBody) healthDialogBody.innerHTML = content.body;
                    
                    healthDialog.classList.add('active');
                    document.body.style.overflow = 'hidden'; // Ngăn scroll khi dialog mở
                    
                    console.log('Dialog opened successfully');
                }, true); // Sử dụng capture phase để chặn sớm nhất
            });
        }, 100);
        
        // Đóng dialog
        function closeHealthDialog() {
            if (healthDialog) {
                healthDialog.classList.remove('active');
                document.body.style.overflow = ''; // Khôi phục scroll
            }
        }
        
        if (healthDialogClose) {
            healthDialogClose.addEventListener('click', closeHealthDialog);
        }
        
        if (healthDialogOverlay) {
            healthDialogOverlay.addEventListener('click', closeHealthDialog);
        }
        
        // Đóng bằng phím ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && healthDialog?.classList.contains('active')) {
                closeHealthDialog();
            }
        });
    } // Kết thúc block if (healthDialog)
    
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
    
    // Category cards - Đã chuyển thành thẻ thông tin, không còn clickable
    // Vô hiệu hóa hoàn toàn khả năng click
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        // Ngăn chặn mọi sự kiện click
        card.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }, true); // Sử dụng capture phase để chặn sớm nhất
        
        // Ngăn chặn các sự kiện khác
        card.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }, true);
        
        card.addEventListener('mouseup', function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }, true);
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