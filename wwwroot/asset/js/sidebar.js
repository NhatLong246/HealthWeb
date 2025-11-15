// Sidebar component - Loads sidebar from admin.html structure
// This ensures all pages use the same sidebar

function loadSidebar() {
    const currentPage = getCurrentPage();
    
    const sidebarHTML = `
        <aside class="sidebar">
            <div class="sidebar-header">
                <h2><i class="fas fa-dumbbell"></i> WebHealthy</h2>
                <p class="admin-title">Quản trị viên</p>
            </div>
            
            <nav class="sidebar-nav">
                <ul>
                    <li class="nav-item ${currentPage === 'thongke' ? 'active' : ''}">
                        <a href="/Admin/ThongKe" class="nav-link">
                            <i class="fas fa-chart-line"></i>
                            <span>Thống kê tổng quan</span>
                        </a>
                    </li>
                    <li class="nav-item ${currentPage === 'quanliuser' ? 'active' : ''}">
                        <a href="/Admin/QuanLiUser" class="nav-link">
                            <i class="fas fa-users"></i>
                            <span>Quản lý người dùng</span>
                        </a>
                    </li>
                    <li class="nav-item ${currentPage === 'quanlipt' ? 'active' : ''}">
                        <a href="/Admin/QuanLiPT" class="nav-link">
                            <i class="fas fa-user-tie"></i>
                            <span>Quản lý huấn luyện viên</span>
                        </a>
                    </li>
                    <li class="nav-item ${currentPage === 'quanlibaitap' ? 'active' : ''}">
                        <a href="/Admin/QuanLiBaiTap" class="nav-link">
                            <i class="fas fa-dumbbell"></i>
                            <span>Quản lý bài tập</span>
                        </a>
                    </li>
                    <li class="nav-item ${currentPage === 'quanlidinhduong' ? 'active' : ''}">
                        <a href="/Admin/QuanLiDinhDuong" class="nav-link">
                            <i class="fas fa-apple-alt"></i>
                            <span>Quản lý dinh dưỡng</span>
                        </a>
                    </li>
                    <li class="nav-item ${currentPage === 'quanligiaodich' ? 'active' : ''}">
                        <a href="/Admin/QuanLiGiaoDich" class="nav-link">
                            <i class="fas fa-money-bill-wave"></i>
                            <span>Quản lý giao dịch</span>
                        </a>
                    </li>
                    <li class="nav-item ${currentPage === 'hethongbaomat' ? 'active' : ''}">
                        <a href="/Admin/HeThongBaoMat" class="nav-link">
                            <i class="fas fa-cog"></i>
                            <span>Hệ thống & bảo mật</span>
                        </a>
                    </li>
                </ul>
            </nav>
            
            <div class="sidebar-footer">
                <div class="user-profile">
                    <i class="fas fa-user-circle"></i>
                    <span>Admin User</span>
                </div>
                <button class="logout-btn">
                    <i class="fas fa-sign-out-alt"></i>
                    Đăng xuất
                </button>
            </div>
        </aside>
    `;
    
    // Find existing sidebar and replace it, or find comment and replace it
    const existingSidebar = document.querySelector('.sidebar');
    if (existingSidebar) {
        existingSidebar.outerHTML = sidebarHTML;
    } else {
        // Look for the comment placeholder
        const adminContainer = document.querySelector('.admin-container');
        if (adminContainer) {
            const mainContent = adminContainer.querySelector('.main-content');
            if (mainContent) {
                mainContent.insertAdjacentHTML('beforebegin', sidebarHTML);
            } else {
                // If no main-content, insert at the beginning of admin-container
                adminContainer.insertAdjacentHTML('afterbegin', sidebarHTML);
            }
        }
    }
    
    // Attach logout button event listener
    attachLogoutHandler();
}

// Attach logout button event handler
function attachLogoutHandler() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        // Remove existing event listeners to avoid duplicates
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        newLogoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            // Wait for dialog.js to load if not already loaded
            if (typeof customConfirm === 'undefined') {
                // Wait a bit for dialog.js to load
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Show confirmation dialog using custom dialog system
            if (typeof customConfirm === 'function') {
                try {
                    const confirmed = await customConfirm('Bạn có chắc chắn muốn đăng xuất?', 'Xác nhận đăng xuất', 'question');
                    if (confirmed) {
                        window.location.href = '/Admin/Logout';
                    }
                } catch (error) {
                    console.error('Error showing logout confirmation:', error);
                    // Fallback to browser confirm
                    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                        window.location.href = '/Admin/Logout';
                    }
                }
            } else {
                // Fallback: use browser confirm if custom dialog not available
                if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                    window.location.href = '/Admin/Logout';
                }
            }
        });
    }
}

function getCurrentPage() {
    const path = window.location.pathname.toLowerCase();
    const segments = path.split('/').filter(Boolean);

    if (segments.length >= 2 && segments[0] === 'admin') {
        return segments[1];
    }

    // fallback: check filename (e.g., when served as static HTML)
    const filename = window.location.href.split('/').pop()?.toLowerCase() || '';
    if (filename.includes('thongke')) return 'thongke';
    if (filename.includes('quanliuser')) return 'quanliuser';
    if (filename.includes('quanlipt')) return 'quanlipt';
    if (filename.includes('quanlibaitap')) return 'quanlibaitap';
    if (filename.includes('quanlidinhduong')) return 'quanlidinhduong';
    if (filename.includes('quanligiaodich')) return 'quanligiaodich';
    if (filename.includes('hethongbaomat')) return 'hethongbaomat';

    return 'thongke';
}

// Load sidebar when DOM is ready
(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSidebar);
    } else {
        // DOM already loaded, but wait a bit to ensure all elements are available
        setTimeout(loadSidebar, 0);
    }
})();

