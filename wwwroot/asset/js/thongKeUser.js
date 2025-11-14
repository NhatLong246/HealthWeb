// Thống kê người dùng - HealthWeb
(function() {
    'use strict';

    // Lấy userId từ server
    let userId = null;
    
    async function getUserId() {
        if (userId) {
            console.log('getUserId: Using cached userId:', userId);
            return userId;
        }
        
        try {
            console.log('getUserId: Fetching userId from server...');
            const response = await fetch('/ThongKe/GetCurrentUserId', {
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                console.error('getUserId: Response not ok:', response.status, response.statusText);
                return null;
            }
            
            const result = await response.json();
            console.log('getUserId: Response:', result);
            
            if (result.success && result.userId) {
                userId = result.userId;
                console.log('getUserId: Successfully got userId:', userId);
                return userId;
            } else {
                console.warn('getUserId: Chưa đăng nhập hoặc không thể lấy userId. Result:', result);
                return null;
            }
        } catch (e) {
            console.error('getUserId: Error getting userId:', e);
            return null;
        }
    }
    let progressChart, distributionChart, comparisonChart;
    let healthChart, caloriesChart, macroChart;
    let currentHealthPeriod = '7days';
    let currentNutritionPeriod = '7days';

    // Lấy màu text phù hợp với theme
    function getChartTextColor() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        return isDarkMode ? '#e2e8f0' : '#7c2d12'; // Màu nâu đỏ đậm cho light mode để dễ đọc
    }

    function getChartGridColor() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        return isDarkMode ? 'rgba(226, 232, 240, 0.15)' : 'rgba(124, 45, 18, 0.15)'; // Màu phù hợp với light mode
    }

    // Lấy màu tooltip phù hợp với theme
    function getTooltipColors() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        return {
            backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: isDarkMode ? '#ffffff' : '#7c2d12',
            bodyColor: isDarkMode ? '#e2e8f0' : '#7c2d12',
            borderColor: isDarkMode ? 'rgba(78, 222, 128, 0.3)' : 'rgba(251, 146, 60, 0.4)'
        };
    }

    // Khởi tạo
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('=== THỐNG KÊ PAGE LOADED ===');
        console.log('Checking for required elements...');
        
        // Kiểm tra các phần tử HTML có tồn tại không
        const requiredElements = [
            'totalSessions', 'totalTime', 'totalAchievements', 'goalAchieved',
            'progressChart', 'distributionChart', 'comparisonChart',
            'healthChart', 'caloriesChart', 'macroChart'
        ];
        
        requiredElements.forEach(id => {
            const el = document.getElementById(id);
            if (!el) {
                console.error(`Element #${id} not found!`);
            } else {
                console.log(`Element #${id} found`);
            }
        });
        
        setupExportButtons();
        
        // Lấy userId từ server trước
        console.log('Getting userId from server...');
        const currentUserId = await getUserId();
        console.log('Current userId:', currentUserId);
        
        if (!currentUserId) {
            // Nếu chưa đăng nhập, hiển thị thông báo
            console.warn('Chưa đăng nhập - userId is null or empty');
            showError('Vui lòng đăng nhập để xem thống kê của bạn');
            showNoDataMessage();
        } else {
            // Load dữ liệu thật từ database
            console.log('Đã đăng nhập, đang tải dữ liệu từ database... userId:', currentUserId);
            try {
                await loadAllData();
                console.log('loadAllData completed');
                await loadHealthData();
                console.log('loadHealthData completed');
                await loadNutritionData();
                console.log('loadNutritionData completed');
            } catch (error) {
                console.error('Error loading data:', error);
            }
        }
        
        // Lắng nghe sự kiện thay đổi theme và cập nhật lại charts
        setupThemeChangeListener();
        
        // Setup period selector buttons
        setupPeriodSelectors();
        
        console.log('=== INITIALIZATION COMPLETE ===');
    });
    
    // Hiển thị thông báo không có dữ liệu
    function showNoDataMessage() {
        const containers = [
            document.getElementById('achievementsList'),
            document.getElementById('weightGoalsList')
        ];
        
        containers.forEach(container => {
            if (container) {
                container.innerHTML = '<div class="loading">Chưa có dữ liệu</div>';
            }
        });
    }
    
    // Thiết lập listener để cập nhật charts khi theme thay đổi
    function setupThemeChangeListener() {
        // Sử dụng MutationObserver để theo dõi thay đổi class của body
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    // Theme đã thay đổi, cập nhật lại charts
                    updateChartsTheme();
                }
            });
        });
        
        // Bắt đầu quan sát body element
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
    
    // Cập nhật theme cho tất cả charts
    function updateChartsTheme() {
        const textColor = getChartTextColor();
        const gridColor = getChartGridColor();
        const tooltipColors = getTooltipColors();
        
        // Cập nhật Progress Chart
        if (progressChart) {
            progressChart.options.scales.y.ticks.color = textColor;
            progressChart.options.scales.y.grid.color = gridColor;
            progressChart.options.scales.x.ticks.color = textColor;
            progressChart.options.plugins.tooltip.backgroundColor = tooltipColors.backgroundColor;
            progressChart.options.plugins.tooltip.titleColor = tooltipColors.titleColor;
            progressChart.options.plugins.tooltip.bodyColor = tooltipColors.bodyColor;
            progressChart.options.plugins.tooltip.borderColor = tooltipColors.borderColor;
            progressChart.update('none');
        }
        
        // Cập nhật Distribution Chart
        if (distributionChart) {
            distributionChart.options.plugins.legend.labels.color = textColor;
            distributionChart.options.plugins.tooltip.backgroundColor = tooltipColors.backgroundColor;
            distributionChart.options.plugins.tooltip.titleColor = tooltipColors.titleColor;
            distributionChart.options.plugins.tooltip.bodyColor = tooltipColors.bodyColor;
            distributionChart.options.plugins.tooltip.borderColor = tooltipColors.borderColor;
            distributionChart.update('none');
        }
        
        // Cập nhật Comparison Chart
        if (comparisonChart) {
            comparisonChart.options.scales.y.ticks.color = textColor;
            comparisonChart.options.scales.y.grid.color = gridColor;
            comparisonChart.options.scales.x.ticks.color = textColor;
            comparisonChart.options.plugins.tooltip.backgroundColor = tooltipColors.backgroundColor;
            comparisonChart.options.plugins.tooltip.titleColor = tooltipColors.titleColor;
            comparisonChart.options.plugins.tooltip.bodyColor = tooltipColors.bodyColor;
            comparisonChart.options.plugins.tooltip.borderColor = tooltipColors.borderColor;
            comparisonChart.update('none');
        }
        
        // Cập nhật Health Chart
        if (healthChart) {
            healthChart.options.scales.y.ticks.color = textColor;
            healthChart.options.scales.y.grid.color = gridColor;
            healthChart.options.scales.y.title.color = textColor;
            healthChart.options.scales.y1.ticks.color = textColor;
            healthChart.options.scales.y1.title.color = textColor;
            healthChart.options.scales.x.ticks.color = textColor;
            healthChart.options.plugins.legend.labels.color = textColor;
            healthChart.options.plugins.tooltip.backgroundColor = tooltipColors.backgroundColor;
            healthChart.options.plugins.tooltip.titleColor = tooltipColors.titleColor;
            healthChart.options.plugins.tooltip.bodyColor = tooltipColors.bodyColor;
            healthChart.options.plugins.tooltip.borderColor = tooltipColors.borderColor;
            healthChart.update('none');
        }
        
        // Cập nhật Calories Chart
        if (caloriesChart) {
            caloriesChart.options.scales.y.ticks.color = textColor;
            caloriesChart.options.scales.y.grid.color = gridColor;
            caloriesChart.options.scales.x.ticks.color = textColor;
            caloriesChart.options.plugins.legend.labels.color = textColor;
            caloriesChart.options.plugins.tooltip.backgroundColor = tooltipColors.backgroundColor;
            caloriesChart.options.plugins.tooltip.titleColor = tooltipColors.titleColor;
            caloriesChart.options.plugins.tooltip.bodyColor = tooltipColors.bodyColor;
            caloriesChart.options.plugins.tooltip.borderColor = tooltipColors.borderColor;
            caloriesChart.update('none');
        }
        
        // Cập nhật Macro Chart
        if (macroChart) {
            macroChart.options.scales.y.ticks.color = textColor;
            macroChart.options.scales.y.grid.color = gridColor;
            macroChart.options.scales.x.ticks.color = textColor;
            macroChart.options.plugins.legend.labels.color = textColor;
            macroChart.options.plugins.tooltip.backgroundColor = tooltipColors.backgroundColor;
            macroChart.options.plugins.tooltip.titleColor = tooltipColors.titleColor;
            macroChart.options.plugins.tooltip.bodyColor = tooltipColors.bodyColor;
            macroChart.options.plugins.tooltip.borderColor = tooltipColors.borderColor;
            macroChart.update('none');
        }
    }

    // Tải tất cả dữ liệu
    async function loadAllData() {
        try {
            console.log('Starting loadAllData...');
            // Tải tất cả dữ liệu từ API
            const results = await Promise.allSettled([
                loadOverview(),
                loadWeeklyProgress(),
                loadTrainingDistribution(),
                loadAchievements(),
                loadDetailedStats(),
                loadPerformanceComparison()
            ]);
            
            // Log kết quả của từng function
            const functionNames = ['loadOverview', 'loadWeeklyProgress', 'loadTrainingDistribution', 
                                 'loadAchievements', 'loadDetailedStats', 'loadPerformanceComparison'];
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    console.log(`${functionNames[index]} completed successfully`);
                } else {
                    console.error(`${functionNames[index]} failed:`, result.reason);
                }
            });
            
            console.log('Đã tải xong dữ liệu từ database');
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    // Render progress chart
    function renderProgressChart(data) {
        // Nếu không có dữ liệu, tạo dữ liệu mặc định cho 7 ngày
        if (!data || data.length === 0) {
            const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            data = dayNames.map(day => ({ Day: day, Minutes: 0 }));
        }
        
        const labels = data.map(d => d.Day);
        const minutes = data.map(d => d.Minutes || 0);
        
        if (progressChart) {
            progressChart.destroy();
        }
        
        const ctx = document.getElementById('progressChart');
        if (!ctx) {
            console.error('progressChart element not found');
            return;
        }
        
        console.log('Rendering progress chart with data:', { labels, minutes });
        
        progressChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Phút',
                    data: minutes,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: (() => {
                        const colors = getTooltipColors();
                        return {
                            backgroundColor: colors.backgroundColor,
                            padding: 12,
                            titleColor: colors.titleColor,
                            bodyColor: colors.bodyColor,
                            titleFont: { size: 14, weight: '600' },
                            bodyFont: { size: 13, weight: '500' },
                            borderColor: colors.borderColor,
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    return `Thời gian: ${context.parsed.y} phút`;
                                }
                            }
                        };
                    })()
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: getChartTextColor(),
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            callback: function(value) {
                                return value + ' phút';
                            }
                        },
                        grid: {
                            color: getChartGridColor()
                        }
                    },
                    x: {
                        ticks: {
                            color: getChartTextColor(),
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Render distribution chart
    function renderDistributionChart(data) {
        // Nếu không có dữ liệu, hiển thị thông báo
        if (!data || data.length === 0) {
            const ctx = document.getElementById('distributionChart');
            if (ctx && distributionChart) {
                distributionChart.destroy();
                distributionChart = null;
            }
            console.log('No training distribution data to render');
            return;
        }
        
        const labels = data.map(d => d.Type || 'Khác');
        const counts = data.map(d => d.Count || 0);
        
        const colors = [
            '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', 
            '#ef4444', '#06b6d4', '#ec4899', '#84cc16'
        ];
        
        if (distributionChart) {
            distributionChart.destroy();
        }
        
        const ctx = document.getElementById('distributionChart');
        if (!ctx) {
            console.error('distributionChart element not found');
            return;
        }
        
        console.log('Rendering distribution chart with data:', { labels, counts });
        
        distributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: counts,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: getChartTextColor(),
                            padding: 12,
                            font: { 
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: (() => {
                        const colors = getTooltipColors();
                        return {
                            backgroundColor: colors.backgroundColor,
                            padding: 12,
                            titleColor: colors.titleColor,
                            bodyColor: colors.bodyColor,
                            titleFont: { size: 14, weight: '600' },
                            bodyFont: { size: 13, weight: '500' },
                            borderColor: colors.borderColor,
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${value} buổi (${percentage}%)`;
                                }
                            }
                        };
                    })()
                }
            }
        });
    }
    
    // Render achievements
    function renderAchievements(achievements) {
        const container = document.getElementById('achievementsList');
        if (!container) return;
        
        const colors = ['yellow', 'blue', 'purple'];
        const icons = ['fa-star', 'fa-clock', 'fa-bolt'];
        
        container.innerHTML = achievements.map((ach, index) => {
            const color = colors[index % colors.length];
            const icon = icons[index % icons.length];
            const date = ach.NgayDatDuoc ? new Date(ach.NgayDatDuoc).toLocaleDateString('vi-VN') : '';
            
            return `
                <div class="achievement-item ${color}">
                    <div class="achievement-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="achievement-content">
                        <div class="achievement-title">${ach.TenBadge || 'Thành tựu'}</div>
                        <div class="achievement-desc">${ach.MoTa || ''} ${date ? '• ' + date : ''}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Render comparison chart
    function renderComparisonChart(data) {
        if (comparisonChart) {
            comparisonChart.destroy();
        }
        
        const ctx = document.getElementById('comparisonChart');
        if (!ctx) {
            console.error('comparisonChart element not found');
            return;
        }
        
        const lastWeek = data?.LastWeek || 0;
        const thisWeek = data?.ThisWeek || 0;
        console.log('Rendering comparison chart with data:', { lastWeek, thisWeek });
        
        comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Tuần Trước', 'Tuần Này'],
                datasets: [{
                    label: 'Phút',
                    data: [lastWeek, thisWeek],
                    backgroundColor: ['#94a3b8', '#10b981'],
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: (() => {
                        const colors = getTooltipColors();
                        return {
                            backgroundColor: colors.backgroundColor,
                            padding: 12,
                            titleColor: colors.titleColor,
                            bodyColor: colors.bodyColor,
                            titleFont: { size: 14, weight: '600' },
                            bodyFont: { size: 13, weight: '500' },
                            borderColor: colors.borderColor,
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    return `Thời gian: ${context.parsed.y} phút`;
                                }
                            }
                        };
                    })()
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: getChartTextColor(),
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            callback: function(value) {
                                return value + ' phút';
                            }
                        },
                        grid: {
                            color: getChartGridColor()
                        }
                    },
                    x: {
                        ticks: {
                            color: getChartTextColor(),
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Tải thống kê tổng quan
    async function loadOverview() {
        try {
            const currentUserId = await getUserId();
            if (!currentUserId) {
                console.warn('Không có userId, bỏ qua loadOverview');
                return;
            }
            
            const response = await fetch('/ThongKe/GetOverview', {
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                console.error('GetOverview response not ok:', response.status);
                return;
            }
            
            const result = await response.json();
            console.log('GetOverview raw response:', result);
            
            if (result.success && result.data) {
                const data = result.data;
                console.log('Overview data received:', data);
                console.log('Data keys:', Object.keys(data));
                console.log('TotalSessions:', data.TotalSessions, 'Type:', typeof data.TotalSessions);
                console.log('TotalTimeHours:', data.TotalTimeHours, 'Type:', typeof data.TotalTimeHours);
                console.log('TotalAchievements:', data.TotalAchievements, 'Type:', typeof data.TotalAchievements);
                
                // Luôn hiển thị dữ liệu, kể cả khi là 0
                // Thử cả PascalCase và camelCase
                const totalSessions = data.TotalSessions ?? data.totalSessions ?? 0;
                const totalTimeHours = data.TotalTimeHours ?? data.totalTimeHours ?? 0;
                const totalAchievements = data.TotalAchievements ?? data.totalAchievements ?? 0;
                const goalAchievedPercent = data.GoalAchievedPercent ?? data.goalAchievedPercent ?? 0;
                
                const totalSessionsEl = document.getElementById('totalSessions');
                const totalTimeEl = document.getElementById('totalTime');
                const totalAchievementsEl = document.getElementById('totalAchievements');
                const goalAchievedEl = document.getElementById('goalAchieved');
                
                console.log('Values to display:', { totalSessions, totalTimeHours, totalAchievements, goalAchievedPercent });
                
                if (totalSessionsEl) {
                    totalSessionsEl.textContent = totalSessions;
                    console.log('Set totalSessions to:', totalSessions);
                } else {
                    console.error('totalSessions element not found!');
                }
                if (totalTimeEl) {
                    totalTimeEl.textContent = `${totalTimeHours}h`;
                    console.log('Set totalTime to:', `${totalTimeHours}h`);
                } else {
                    console.error('totalTime element not found!');
                }
                if (totalAchievementsEl) {
                    totalAchievementsEl.textContent = totalAchievements;
                    console.log('Set totalAchievements to:', totalAchievements);
                } else {
                    console.error('totalAchievements element not found!');
                }
                if (goalAchievedEl) {
                    goalAchievedEl.textContent = `${goalAchievedPercent}%`;
                    console.log('Set goalAchieved to:', `${goalAchievedPercent}%`);
                } else {
                    console.error('goalAchieved element not found!');
                }
                
                console.log('Overview data displayed - Sessions:', totalSessions, 'Time:', totalTimeHours, 'Achievements:', totalAchievements);
            } else {
                console.warn('GetOverview không thành công:', result.message || 'Unknown error', result);
            }
        } catch (error) {
            console.error('Error loading overview:', error);
        }
    }

    // Tải tiến độ 7 ngày
    async function loadWeeklyProgress() {
        try {
            const currentUserId = await getUserId();
            if (!currentUserId) return;
            
            const response = await fetch('/ThongKe/GetWeeklyProgress', {
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                console.error('GetWeeklyProgress response not ok:', response.status);
                return;
            }
            
            const result = await response.json();
            console.log('GetWeeklyProgress response:', result);
            
            if (result.success && result.data) {
                // Luôn render chart, kể cả khi tất cả giá trị là 0
                if (result.data.length > 0) {
                    renderProgressChart(result.data);
                    const hasData = result.data.some(d => d.Minutes > 0);
                    console.log('Weekly progress loaded:', result.data, 'Has data:', hasData);
                } else {
                    console.log('GetWeeklyProgress: Không có dữ liệu tiến độ 7 ngày (mảng rỗng)');
                    // Vẫn render chart với dữ liệu rỗng
                    renderProgressChart([]);
                }
            } else {
                console.warn('GetWeeklyProgress không thành công:', result.message || 'Unknown error', result);
                // Render chart rỗng khi có lỗi
                renderProgressChart([]);
            }
        } catch (error) {
            console.error('Error loading weekly progress:', error);
        }
    }

    // Tải phân bố loại tập luyện
    async function loadTrainingDistribution() {
        try {
            const currentUserId = await getUserId();
            if (!currentUserId) return;
            
            const response = await fetch('/ThongKe/GetTrainingDistribution', {
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                console.error('GetTrainingDistribution response not ok:', response.status);
                return;
            }
            
            const result = await response.json();
            console.log('GetTrainingDistribution response:', result);
            
            if (result.success && result.data) {
                // Luôn render chart nếu có dữ liệu (kể cả mảng rỗng)
                if (result.data.length > 0) {
                    renderDistributionChart(result.data);
                    console.log('Training distribution loaded:', result.data);
                } else {
                    console.log('GetTrainingDistribution: Không có dữ liệu phân bố loại tập luyện');
                    // Vẫn render chart rỗng để hiển thị trạng thái
                    renderDistributionChart([]);
                }
            } else {
                console.warn('GetTrainingDistribution không thành công:', result.message || 'Unknown error');
                // Render chart rỗng khi có lỗi
                renderDistributionChart([]);
            }
        } catch (error) {
            console.error('Error loading training distribution:', error);
        }
    }

    // Tải thành tựu
    async function loadAchievements() {
        try {
            const currentUserId = await getUserId();
            if (!currentUserId) return;
            
            const response = await fetch('/ThongKe/GetAchievements', {
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                console.error('GetAchievements response not ok:', response.status);
                return;
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                if (result.data.length > 0) {
                    renderAchievements(result.data);
                    console.log('Achievements loaded:', result.data);
                } else {
                    // Hiển thị thông báo không có thành tựu
                    const container = document.getElementById('achievementsList');
                    if (container) {
                        container.innerHTML = '<div class="loading">Chưa có thành tựu nào</div>';
                    }
                    console.log('Không có thành tựu');
                }
            }
        } catch (error) {
            console.error('Error loading achievements:', error);
        }
    }

    // Tải thống kê chi tiết
    async function loadDetailedStats() {
        try {
            const currentUserId = await getUserId();
            if (!currentUserId) return;
            
            const response = await fetch('/ThongKe/GetDetailedStats', {
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                console.error('GetDetailedStats response not ok:', response.status);
                return;
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                const data = result.data;
                const avgTimeEl = document.getElementById('avgTimePerSession');
                const sessionsPerWeekEl = document.getElementById('sessionsPerWeek');
                const totalCaloriesEl = document.getElementById('totalCalories');
                const consecutiveDaysEl = document.getElementById('consecutiveDays');
                
                if (avgTimeEl) {
                    avgTimeEl.textContent = `${data.AvgTimePerSession || 0}h`;
                }
                if (sessionsPerWeekEl) {
                    sessionsPerWeekEl.textContent = data.SessionsPerWeek || 0;
                }
                if (totalCaloriesEl) {
                    totalCaloriesEl.textContent = data.TotalCalories?.toLocaleString('vi-VN') || 0;
                }
                if (consecutiveDaysEl) {
                    consecutiveDaysEl.textContent = data.ConsecutiveDays || 0;
                }
                console.log('Detailed stats loaded:', data);
            }
        } catch (error) {
            console.error('Error loading detailed stats:', error);
        }
    }

    // Tải so sánh hiệu suất
    async function loadPerformanceComparison() {
        try {
            const currentUserId = await getUserId();
            if (!currentUserId) return;
            
            const response = await fetch('/ThongKe/GetPerformanceComparison', {
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                console.error('GetPerformanceComparison response not ok:', response.status);
                return;
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                renderComparisonChart(result.data);
                console.log('Performance comparison loaded:', result.data);
            } else {
                console.warn('GetPerformanceComparison không thành công:', result.message || 'Unknown error');
                // Render với dữ liệu mặc định
                renderComparisonChart({ LastWeek: 0, ThisWeek: 0 });
            }
        } catch (error) {
            console.error('Error loading performance comparison:', error);
        }
    }

    // Thiết lập nút xuất file
    function setupExportButtons() {
        document.getElementById('exportPdf')?.addEventListener('click', function() {
            alert('Tính năng xuất PDF đang được phát triển');
        });
        
        document.getElementById('exportExcel')?.addEventListener('click', function() {
            alert('Tính năng xuất Excel đang được phát triển');
        });
    }

    // Hiển thị lỗi
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position:fixed;top:20px;right:20px;background:#ef4444;color:#fff;padding:12px 16px;border-radius:10px;z-index:10000;box-shadow:0 10px 30px rgba(0,0,0,.3)';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }

    // Setup period selector buttons
    function setupPeriodSelectors() {
        // Health period selectors
        document.querySelectorAll('.health-nutrition-section:first-of-type .period-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.health-nutrition-section:first-of-type .period-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentHealthPeriod = this.dataset.period;
                // Load lại data từ database
                loadHealthData();
            });
        });

        // Nutrition period selectors
        document.querySelectorAll('.health-nutrition-section:last-of-type .period-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.health-nutrition-section:last-of-type .period-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentNutritionPeriod = this.dataset.period;
                // Load lại data từ database
                loadNutritionData();
            });
        });
    }

    // Load health data
    async function loadHealthData() {
        try {
            const currentUserId = await getUserId();
            if (!currentUserId) return;
            
            const response = await fetch(`/ThongKe/GetHealthStats?period=${currentHealthPeriod}`, {
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                console.error('GetHealthStats response not ok:', response.status);
                return;
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                if (result.data.length > 0) {
                    renderHealthChart(result.data, result.avgChangePerWeek || 0);
                    console.log('Health stats loaded:', result.data, 'avgChangePerWeek:', result.avgChangePerWeek);
                } else {
                    console.log('Không có dữ liệu sức khỏe');
                    // Vẫn render chart với dữ liệu rỗng để hiển thị trạng thái
                    if (healthChart) {
                        healthChart.destroy();
                        healthChart = null;
                    }
                }
            } else {
                console.warn('GetHealthStats không thành công:', result.message || 'Unknown error');
            }
            
            // Load weight goals
            try {
                const goalsResponse = await fetch('/ThongKe/GetWeightGoals', {
                    credentials: 'same-origin'
                });
                
                if (goalsResponse.ok) {
                    const goalsResult = await goalsResponse.json();
                    
                    if (goalsResult.success && goalsResult.data) {
                        if (goalsResult.data.length > 0) {
                            renderWeightGoals(goalsResult.data);
                            console.log('Weight goals loaded:', goalsResult.data);
                        } else {
                            const container = document.getElementById('weightGoalsList');
                            if (container) {
                                container.innerHTML = '<div class="loading">Chưa có mục tiêu cân nặng</div>';
                            }
                            console.log('Không có mục tiêu cân nặng');
                        }
                    }
                }
            } catch (e) {
                console.error('Error loading weight goals:', e);
            }
        } catch (error) {
            console.error('Error loading health data:', error);
        }
    }

    // Render health chart (Weight & BMI)
    function renderHealthChart(data, avgChangePerWeek) {
        try {
            console.log('renderHealthChart called with data:', data, 'avgChangePerWeek:', avgChangePerWeek);
            
            if (healthChart) {
                healthChart.destroy();
            }

            const ctx = document.getElementById('healthChart');
            if (!ctx) {
                console.error('healthChart canvas element not found!');
                return;
            }

        // Parse dates correctly (format: yyyy-MM-dd)
        const labels = data.map(d => {
            if (!d.Date) return '';
            // Handle both Date objects and string formats
            let date;
            if (typeof d.Date === 'string') {
                // Parse yyyy-MM-dd format
                const parts = d.Date.split('-');
                if (parts.length === 3) {
                    date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                } else {
                    date = new Date(d.Date);
                }
            } else {
                date = new Date(d.Date);
            }
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                console.warn('Invalid date:', d.Date);
                return d.Date; // Return original string if invalid
            }
            
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        });
        const weights = data.map(d => d.Weight || 0);
        const bmis = data.map(d => d.BMI || 0);

        // Update summary
        const avgChangeEl = document.getElementById('avgChangePerWeek');
        if (avgChangeEl) {
            avgChangeEl.textContent = `${avgChangePerWeek >= 0 ? '+' : ''}${avgChangePerWeek} kg/tuần`;
        }

        healthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Cân nặng (kg)',
                        data: weights,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        yAxisID: 'y',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'BMI',
                        data: bmis,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: getChartTextColor(),
                            font: { size: 12, weight: '500' }
                        }
                    },
                    tooltip: (() => {
                        const colors = getTooltipColors();
                        return {
                            backgroundColor: colors.backgroundColor,
                            padding: 12,
                            titleColor: colors.titleColor,
                            bodyColor: colors.bodyColor,
                            titleFont: { size: 14, weight: '600' },
                            bodyFont: { size: 13, weight: '500' },
                            borderColor: colors.borderColor,
                            borderWidth: 1
                        };
                    })()
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Cân nặng (kg)',
                            color: getChartTextColor()
                        },
                        ticks: {
                            color: getChartTextColor(),
                            font: { size: 12, weight: '500' }
                        },
                        grid: {
                            color: getChartGridColor()
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'BMI',
                            color: getChartTextColor()
                        },
                        ticks: {
                            color: getChartTextColor(),
                            font: { size: 12, weight: '500' }
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    },
                    x: {
                        ticks: {
                            color: getChartTextColor(),
                            font: { size: 12, weight: '500' }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
        console.log('Health chart rendered successfully');
        } catch (error) {
            console.error('Error rendering health chart:', error);
        }
    }

    // Render weight goals
    function renderWeightGoals(goals) {
        const container = document.getElementById('weightGoalsList');
        if (!container) return;

        if (!goals || goals.length === 0) {
            container.innerHTML = '<div class="loading">Chưa có mục tiêu cân nặng</div>';
            return;
        }

        container.innerHTML = goals.map(goal => {
            const progress = goal.CurrentProgress || 0;
            const target = goal.TargetValue;
            const progressPercent = target > 0 ? Math.min((progress / target) * 100, 100) : 0;
            const statusClass = goal.IsCompleted ? 'completed' : 'active';
            const statusText = goal.IsCompleted ? 'Hoàn thành' : 'Đang thực hiện';

            return `
                <div class="goal-item ${goal.IsCompleted ? 'completed' : ''}">
                    <div class="goal-header">
                        <div class="goal-title">Mục tiêu: ${target} kg</div>
                        <span class="goal-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="goal-progress">
                        Tiến độ: ${progress.toFixed(1)} kg / ${target} kg (${progressPercent.toFixed(1)}%)
                    </div>
                </div>
            `;
        }).join('');
    }

    // Load nutrition data
    async function loadNutritionData() {
        try {
            const currentUserId = await getUserId();
            if (!currentUserId) return;
            
            const response = await fetch(`/ThongKe/GetNutritionStats?period=${currentNutritionPeriod}`, {
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                console.error('GetNutritionStats response not ok:', response.status);
                return;
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                if (result.data.length > 0 && result.summary) {
                    renderCaloriesChart(result.data, result.summary);
                    console.log('Nutrition stats loaded:', result.data, 'summary:', result.summary);
                } else {
                    console.log('Không có dữ liệu dinh dưỡng hoặc thiếu summary. Data:', result.data, 'Summary:', result.summary);
                    // Vẫn render chart với dữ liệu rỗng để hiển thị trạng thái
                    if (caloriesChart) {
                        caloriesChart.destroy();
                        caloriesChart = null;
                    }
                }
            } else {
                console.warn('GetNutritionStats không thành công:', result.message || 'Unknown error', result);
                if (caloriesChart) {
                    caloriesChart.destroy();
                    caloriesChart = null;
                }
            }
            
            // Load macro ratio
            try {
                const macroResponse = await fetch(`/ThongKe/GetMacroRatio?period=${currentNutritionPeriod}`, {
                    credentials: 'same-origin'
                });
                
                if (macroResponse.ok) {
                    const macroResult = await macroResponse.json();
                    
                    if (macroResult.success && macroResult.data) {
                        renderMacroChart(macroResult.data);
                        console.log('Macro ratio loaded:', macroResult.data);
                    } else {
                        console.log('Không có dữ liệu tỷ lệ macro:', macroResult);
                        // Render với dữ liệu mặc định
                        renderMacroChart({ actual: { Protein: 0, Carbs: 0, Fat: 0 }, target: { Protein: 30, Carbs: 40, Fat: 30 } });
                    }
                }
            } catch (e) {
                console.error('Error loading macro ratio:', e);
            }
        } catch (error) {
            console.error('Error loading nutrition data:', error);
        }
    }

    // Render calories chart
    function renderCaloriesChart(data, summary) {
        try {
            console.log('renderCaloriesChart called with data:', data, 'summary:', summary);
            
            if (caloriesChart) {
                caloriesChart.destroy();
            }

            const ctx = document.getElementById('caloriesChart');
            if (!ctx) {
                console.error('caloriesChart canvas element not found!');
                return;
            }

        // Parse dates correctly (format: yyyy-MM-dd)
        const labels = data.map(d => {
            if (!d.Date) return '';
            // Handle both Date objects and string formats
            let date;
            if (typeof d.Date === 'string') {
                // Parse yyyy-MM-dd format
                const parts = d.Date.split('-');
                if (parts.length === 3) {
                    date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                } else {
                    date = new Date(d.Date);
                }
            } else {
                date = new Date(d.Date);
            }
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                console.warn('Invalid date:', d.Date);
                return d.Date; // Return original string if invalid
            }
            
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        });
        const consumed = data.map(d => d.Consumed || 0);
        const burned = data.map(d => d.Burned || 0);

        // Update summary
        const totalConsumedEl = document.getElementById('totalConsumed');
        const totalBurnedEl = document.getElementById('totalBurned');
        const deficitEl = document.getElementById('totalDeficit');
        
        if (totalConsumedEl && summary) {
            totalConsumedEl.textContent = `${summary.totalConsumed?.toLocaleString('vi-VN') || 0} calo`;
        }
        if (totalBurnedEl && summary) {
            totalBurnedEl.textContent = `${summary.totalBurned?.toLocaleString('vi-VN') || 0} calo`;
        }
        if (deficitEl && summary) {
            const deficit = summary.totalDeficit || 0;
            deficitEl.textContent = `${deficit >= 0 ? '+' : ''}${deficit.toLocaleString('vi-VN')} calo`;
            deficitEl.style.color = deficit < 0 ? '#10b981' : '#ef4444';
        }

        caloriesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Tiêu thụ',
                        data: consumed,
                        backgroundColor: '#3b82f6',
                        borderRadius: 8
                    },
                    {
                        label: 'Đốt cháy',
                        data: burned,
                        backgroundColor: '#10b981',
                        borderRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: getChartTextColor(),
                            font: { size: 12, weight: '500' }
                        }
                    },
                    tooltip: (() => {
                        const colors = getTooltipColors();
                        return {
                            backgroundColor: colors.backgroundColor,
                            padding: 12,
                            titleColor: colors.titleColor,
                            bodyColor: colors.bodyColor,
                            titleFont: { size: 14, weight: '600' },
                            bodyFont: { size: 13, weight: '500' },
                            borderColor: colors.borderColor,
                            borderWidth: 1
                        };
                    })()
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: getChartTextColor(),
                            font: { size: 12, weight: '500' },
                            callback: function(value) {
                                return value + ' calo';
                            }
                        },
                        grid: {
                            color: getChartGridColor()
                        }
                    },
                    x: {
                        ticks: {
                            color: getChartTextColor(),
                            font: { size: 12, weight: '500' }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
        console.log('Calories chart rendered successfully');
        } catch (error) {
            console.error('Error rendering calories chart:', error);
        }
    }

    // Render macro chart
    function renderMacroChart(data) {
        try {
            console.log('renderMacroChart called with data:', data);
            
            if (macroChart) {
                macroChart.destroy();
            }

            const ctx = document.getElementById('macroChart');
            if (!ctx) {
                console.error('macroChart canvas element not found!');
                return;
            }

        const actual = data.actual || { Protein: 0, Carbs: 0, Fat: 0 };
        const target = data.target || { Protein: 30, Carbs: 40, Fat: 30 };
        
        // Ensure all values are numbers
        const actualProtein = typeof actual.Protein === 'number' ? actual.Protein : 0;
        const actualCarbs = typeof actual.Carbs === 'number' ? actual.Carbs : 0;
        const actualFat = typeof actual.Fat === 'number' ? actual.Fat : 0;
        const targetProtein = typeof target.Protein === 'number' ? target.Protein : 30;
        const targetCarbs = typeof target.Carbs === 'number' ? target.Carbs : 40;
        const targetFat = typeof target.Fat === 'number' ? target.Fat : 30;

        macroChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Protein', 'Carbs', 'Fat'],
                datasets: [
                    {
                        label: 'Thực tế (%)',
                        data: [actualProtein, actualCarbs, actualFat],
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
                        borderRadius: 8
                    },
                    {
                        label: 'Mục tiêu (%)',
                        data: [targetProtein, targetCarbs, targetFat],
                        backgroundColor: ['rgba(59, 130, 246, 0.3)', 'rgba(16, 185, 129, 0.3)', 'rgba(245, 158, 11, 0.3)'],
                        borderRadius: 8,
                        borderColor: ['#3b82f6', '#10b981', '#f59e0b'],
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: getChartTextColor(),
                            font: { size: 12, weight: '500' }
                        }
                    },
                    tooltip: (() => {
                        const colors = getTooltipColors();
                        return {
                            backgroundColor: colors.backgroundColor,
                            padding: 12,
                            titleColor: colors.titleColor,
                            bodyColor: colors.bodyColor,
                            titleFont: { size: 14, weight: '600' },
                            bodyFont: { size: 13, weight: '500' },
                            borderColor: colors.borderColor,
                            borderWidth: 1
                        };
                    })()
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: getChartTextColor(),
                            font: { size: 12, weight: '500' },
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        grid: {
                            color: getChartGridColor()
                        }
                    },
                    x: {
                        ticks: {
                            color: getChartTextColor(),
                            font: { size: 12, weight: '500' }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });

        // Update legend
        const legendContainer = document.getElementById('macroLegend');
        if (legendContainer) {
            legendContainer.innerHTML = `
                <div class="macro-legend-item">
                    <span class="macro-name">Protein</span>
                    <div class="macro-values">
                        <span class="macro-value">Thực tế: ${actualProtein.toFixed(1)}%</span>
                        <span class="macro-value">Mục tiêu: ${targetProtein.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="macro-legend-item">
                    <span class="macro-name">Carbs</span>
                    <div class="macro-values">
                        <span class="macro-value">Thực tế: ${actualCarbs.toFixed(1)}%</span>
                        <span class="macro-value">Mục tiêu: ${targetCarbs.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="macro-legend-item">
                    <span class="macro-name">Fat</span>
                    <div class="macro-values">
                        <span class="macro-value">Thực tế: ${actualFat.toFixed(1)}%</span>
                        <span class="macro-value">Mục tiêu: ${targetFat.toFixed(1)}%</span>
                    </div>
                </div>
            `;
        }
        
        console.log('Macro chart rendered successfully');
        } catch (error) {
            console.error('Error rendering macro chart:', error);
        }
    }

})();

