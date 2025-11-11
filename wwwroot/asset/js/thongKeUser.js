// Thống kê người dùng - HealthWeb
(function() {
    'use strict';

    // Lấy userId từ localStorage hoặc session
    function getUserId() {
        try {
            // Thử lấy từ localStorage (nếu có)
            const userId = localStorage.getItem('hw_userId');
            if (userId) return userId;
            
            // Hoặc từ sessionStorage
            const sessionUserId = sessionStorage.getItem('hw_userId');
            if (sessionUserId) return sessionUserId;
            
            // Fallback: demo user (có thể thay đổi)
            return 'user_0001';
        } catch (e) {
            console.error('Error getting userId:', e);
            return 'user_0001';
        }
    }

    const userId = getUserId();
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
    document.addEventListener('DOMContentLoaded', function() {
        setupExportButtons();
        // Load sample data ngay để preview (sẽ được thay thế nếu có dữ liệu thật)
        loadSampleData();
        loadSampleHealthData();
        loadSampleNutritionData();
        
        // Sau đó thử load dữ liệu thật từ API
        setTimeout(() => {
            loadAllData();
            loadHealthData();
            loadNutritionData();
        }, 100);
        
        // Lắng nghe sự kiện thay đổi theme và cập nhật lại charts
        setupThemeChangeListener();
        
        // Setup period selector buttons
        setupPeriodSelectors();
    });
    
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
            // Thử tải dữ liệu từ API
            const results = await Promise.allSettled([
                loadOverview(),
                loadWeeklyProgress(),
                loadTrainingDistribution(),
                loadAchievements(),
                loadDetailedStats(),
                loadPerformanceComparison()
            ]);
            
            // Nếu tất cả đều fail hoặc không có dữ liệu, load dữ liệu mẫu
            const allFailed = results.every(r => r.status === 'rejected');
            if (allFailed) {
                console.log('Loading sample data...');
                loadSampleData();
            } else {
                // Kiểm tra nếu có dữ liệu rỗng, load sample data
                setTimeout(() => {
                    if (document.getElementById('totalSessions').textContent === '0' &&
                        document.getElementById('totalTime').textContent === '0h') {
                        loadSampleData();
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            loadSampleData();
        }
    }
    
    // Tải dữ liệu mẫu
    function loadSampleData() {
        console.log('Loading sample data for preview...');
        
        // Sample overview data
        document.getElementById('totalSessions').textContent = '128';
        document.getElementById('totalTime').textContent = '245h';
        document.getElementById('totalAchievements').textContent = '15';
        document.getElementById('goalAchieved').textContent = '78%';
        
        // Sample weekly progress
        const sampleProgress = [
            { Day: 'T2', Minutes: 42 },
            { Day: 'T3', Minutes: 60 },
            { Day: 'T4', Minutes: 30 },
            { Day: 'T5', Minutes: 75 },
            { Day: 'T6', Minutes: 90 },
            { Day: 'T7', Minutes: 50 },
            { Day: 'CN', Minutes: 65 }
        ];
        renderProgressChart(sampleProgress);
        
        // Sample training distribution
        const sampleDistribution = [
            { Type: 'Cardio', Count: 45 },
            { Type: 'Strength', Count: 38 },
            { Type: 'Yoga', Count: 25 },
            { Type: 'Mixed', Count: 20 }
        ];
        renderDistributionChart(sampleDistribution);
        
        // Sample achievements
        const sampleAchievements = [
            { TenBadge: 'Khởi Đầu Tuyệt Vời', MoTa: 'Hoàn thành 10 buổi tập đầu tiên', NgayDatDuoc: new Date() },
            { TenBadge: 'Chăm Chỉ', MoTa: 'Tập luyện 30 ngày liên tiếp', NgayDatDuoc: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
            { TenBadge: 'Năng Lượng Cao', MoTa: 'Đốt cháy 5000 calo trong 1 tuần', NgayDatDuoc: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }
        ];
        renderAchievements(sampleAchievements);
        
        // Sample detailed stats
        document.getElementById('avgTimePerSession').textContent = '1.9h';
        document.getElementById('sessionsPerWeek').textContent = '4.2';
        document.getElementById('totalCalories').textContent = '12,450';
        document.getElementById('consecutiveDays').textContent = '7';
        
        // Sample performance comparison
        renderComparisonChart({ LastWeek: 280, ThisWeek: 390 });
    }
    
    // Render progress chart
    function renderProgressChart(data) {
        const labels = data.map(d => d.Day);
        const minutes = data.map(d => d.Minutes);
        
        if (progressChart) {
            progressChart.destroy();
        }
        
        const ctx = document.getElementById('progressChart');
        if (!ctx) return;
        
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
        const labels = data.map(d => d.Type);
        const counts = data.map(d => d.Count);
        
        const colors = [
            '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', 
            '#ef4444', '#06b6d4', '#ec4899', '#84cc16'
        ];
        
        if (distributionChart) {
            distributionChart.destroy();
        }
        
        const ctx = document.getElementById('distributionChart');
        if (!ctx) return;
        
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
        if (!ctx) return;
        
        comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Tuần Trước', 'Tuần Này'],
                datasets: [{
                    label: 'Phút',
                    data: [data.LastWeek || 0, data.ThisWeek || 0],
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
            const response = await fetch(`/ThongKe/GetOverview?userId=${userId}`);
            const result = await response.json();
            
            if (result.success) {
                const data = result.data;
                document.getElementById('totalSessions').textContent = data.TotalSessions || 0;
                document.getElementById('totalTime').textContent = `${data.TotalTimeHours || 0}h`;
                document.getElementById('totalAchievements').textContent = data.TotalAchievements || 0;
                document.getElementById('goalAchieved').textContent = `${data.GoalAchievedPercent || 0}%`;
            }
        } catch (error) {
            console.error('Error loading overview:', error);
        }
    }

    // Tải tiến độ 7 ngày
    async function loadWeeklyProgress() {
        try {
            const response = await fetch(`/ThongKe/GetWeeklyProgress?userId=${userId}`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                renderProgressChart(result.data);
            }
        } catch (error) {
            console.error('Error loading weekly progress:', error);
        }
    }

    // Tải phân bố loại tập luyện
    async function loadTrainingDistribution() {
        try {
            const response = await fetch(`/ThongKe/GetTrainingDistribution?userId=${userId}`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                renderDistributionChart(result.data);
            }
        } catch (error) {
            console.error('Error loading training distribution:', error);
        }
    }

    // Tải thành tựu
    async function loadAchievements() {
        try {
            const response = await fetch(`/ThongKe/GetAchievements?userId=${userId}`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                renderAchievements(result.data);
            }
        } catch (error) {
            console.error('Error loading achievements:', error);
        }
    }

    // Tải thống kê chi tiết
    async function loadDetailedStats() {
        try {
            const response = await fetch(`/ThongKe/GetDetailedStats?userId=${userId}`);
            const result = await response.json();
            
            if (result.success) {
                const data = result.data;
                document.getElementById('avgTimePerSession').textContent = `${data.AvgTimePerSession || 0}h`;
                document.getElementById('sessionsPerWeek').textContent = data.SessionsPerWeek || 0;
                document.getElementById('totalCalories').textContent = data.TotalCalories?.toLocaleString('vi-VN') || 0;
                document.getElementById('consecutiveDays').textContent = data.ConsecutiveDays || 0;
            }
        } catch (error) {
            console.error('Error loading detailed stats:', error);
        }
    }

    // Tải so sánh hiệu suất
    async function loadPerformanceComparison() {
        try {
            const response = await fetch(`/ThongKe/GetPerformanceComparison?userId=${userId}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                renderComparisonChart(result.data);
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
                // Load lại data (sẽ tự động fallback về sample nếu không có)
                loadHealthData();
                // Nếu không có data thật, load sample với period mới
                setTimeout(() => {
                    if (!healthChart || !healthChart.data || healthChart.data.labels.length === 0) {
                        loadSampleHealthData();
                    }
                }, 200);
            });
        });

        // Nutrition period selectors
        document.querySelectorAll('.health-nutrition-section:last-of-type .period-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.health-nutrition-section:last-of-type .period-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentNutritionPeriod = this.dataset.period;
                // Load lại data (sẽ tự động fallback về sample nếu không có)
                loadNutritionData();
                // Nếu không có data thật, load sample với period mới
                setTimeout(() => {
                    if (!caloriesChart || !caloriesChart.data || caloriesChart.data.labels.length === 0) {
                        loadSampleNutritionData();
                    }
                }, 200);
            });
        });
    }

    // Load health data
    async function loadHealthData() {
        try {
            const response = await fetch(`/ThongKe/GetHealthStats?userId=${userId}&period=${currentHealthPeriod}`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                renderHealthChart(result.data, result.avgChangePerWeek);
            } else {
                // Nếu không có dữ liệu, load sample data
                loadSampleHealthData();
            }
            
            // Load weight goals
            try {
                const goalsResponse = await fetch(`/ThongKe/GetWeightGoals?userId=${userId}`);
                const goalsResult = await goalsResponse.json();
                
                if (goalsResult.success && goalsResult.data && goalsResult.data.length > 0) {
                    renderWeightGoals(goalsResult.data);
                } else {
                    // Nếu không có mục tiêu, vẫn hiển thị sample
                    loadSampleHealthData();
                }
            } catch (e) {
                // Nếu lỗi, vẫn hiển thị sample
                console.error('Error loading weight goals:', e);
            }
        } catch (error) {
            console.error('Error loading health data:', error);
            // Load sample data
            loadSampleHealthData();
        }
    }

    // Render health chart (Weight & BMI)
    function renderHealthChart(data, avgChangePerWeek) {
        if (healthChart) {
            healthChart.destroy();
        }

        const ctx = document.getElementById('healthChart');
        if (!ctx) return;

        const labels = data.map(d => {
            const date = new Date(d.Date);
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        });
        const weights = data.map(d => d.Weight);
        const bmis = data.map(d => d.BMI);

        // Update summary
        document.getElementById('avgChangePerWeek').textContent = 
            `${avgChangePerWeek >= 0 ? '+' : ''}${avgChangePerWeek} kg/tuần`;

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
            const response = await fetch(`/ThongKe/GetNutritionStats?userId=${userId}&period=${currentNutritionPeriod}`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                renderCaloriesChart(result.data, result.summary);
            } else {
                // Nếu không có dữ liệu, load sample data
                loadSampleNutritionData();
            }
            
            // Load macro ratio
            try {
                const macroResponse = await fetch(`/ThongKe/GetMacroRatio?userId=${userId}&period=${currentNutritionPeriod}`);
                const macroResult = await macroResponse.json();
                
                if (macroResult.success && macroResult.data) {
                    renderMacroChart(macroResult.data);
                } else {
                    // Nếu không có dữ liệu, load sample
                    loadSampleNutritionData();
                }
            } catch (e) {
                // Nếu lỗi, vẫn hiển thị sample
                console.error('Error loading macro ratio:', e);
            }
        } catch (error) {
            console.error('Error loading nutrition data:', error);
            // Load sample data
            loadSampleNutritionData();
        }
    }

    // Render calories chart
    function renderCaloriesChart(data, summary) {
        if (caloriesChart) {
            caloriesChart.destroy();
        }

        const ctx = document.getElementById('caloriesChart');
        if (!ctx) return;

        const labels = data.map(d => {
            const date = new Date(d.Date);
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        });
        const consumed = data.map(d => d.Consumed);
        const burned = data.map(d => d.Burned);

        // Update summary
        document.getElementById('totalConsumed').textContent = `${summary.totalConsumed.toLocaleString('vi-VN')} calo`;
        document.getElementById('totalBurned').textContent = `${summary.totalBurned.toLocaleString('vi-VN')} calo`;
        const deficitEl = document.getElementById('totalDeficit');
        const deficit = summary.totalDeficit;
        deficitEl.textContent = `${deficit >= 0 ? '+' : ''}${deficit.toLocaleString('vi-VN')} calo`;
        deficitEl.style.color = deficit < 0 ? '#10b981' : '#ef4444';

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
    }

    // Render macro chart
    function renderMacroChart(data) {
        if (macroChart) {
            macroChart.destroy();
        }

        const ctx = document.getElementById('macroChart');
        if (!ctx) return;

        const actual = data.actual;
        const target = data.target;

        macroChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Protein', 'Carbs', 'Fat'],
                datasets: [
                    {
                        label: 'Thực tế (%)',
                        data: [actual.Protein, actual.Carbs, actual.Fat],
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
                        borderRadius: 8
                    },
                    {
                        label: 'Mục tiêu (%)',
                        data: [target.Protein, target.Carbs, target.Fat],
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
                        <span class="macro-value">Thực tế: ${actual.Protein}%</span>
                        <span class="macro-value">Mục tiêu: ${target.Protein}%</span>
                    </div>
                </div>
                <div class="macro-legend-item">
                    <span class="macro-name">Carbs</span>
                    <div class="macro-values">
                        <span class="macro-value">Thực tế: ${actual.Carbs}%</span>
                        <span class="macro-value">Mục tiêu: ${target.Carbs}%</span>
                    </div>
                </div>
                <div class="macro-legend-item">
                    <span class="macro-name">Fat</span>
                    <div class="macro-values">
                        <span class="macro-value">Thực tế: ${actual.Fat}%</span>
                        <span class="macro-value">Mục tiêu: ${target.Fat}%</span>
                    </div>
                </div>
            `;
        }
    }

    // Sample data for health
    function loadSampleHealthData() {
        console.log('Loading sample health data for preview...');
        
        // Sample data cho 7 ngày
        const sampleData7Days = [
            { Date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], Weight: 70.5, BMI: 23.2 },
            { Date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], Weight: 70.3, BMI: 23.1 },
            { Date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], Weight: 70.1, BMI: 23.0 },
            { Date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], Weight: 69.9, BMI: 23.0 },
            { Date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], Weight: 69.8, BMI: 22.9 },
            { Date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], Weight: 69.6, BMI: 22.9 },
            { Date: new Date().toISOString().split('T')[0], Weight: 69.5, BMI: 22.8 }
        ];
        
        // Sample data cho 1 tháng (30 ngày, mỗi 3 ngày 1 điểm)
        const sampleData1Month = [];
        for (let i = 29; i >= 0; i -= 3) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const weight = 71.0 - (i * 0.05); // Giảm dần từ 71.0 xuống 69.5
            const bmi = 23.3 - (i * 0.008);
            sampleData1Month.push({
                Date: date.toISOString().split('T')[0],
                Weight: Math.round(weight * 10) / 10,
                BMI: Math.round(bmi * 10) / 10
            });
        }
        
        // Sample data cho 3 tháng (90 ngày, mỗi 5 ngày 1 điểm)
        const sampleData3Months = [];
        for (let i = 89; i >= 0; i -= 5) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const weight = 72.5 - (i * 0.033); // Giảm dần từ 72.5 xuống 69.5
            const bmi = 23.8 - (i * 0.011);
            sampleData3Months.push({
                Date: date.toISOString().split('T')[0],
                Weight: Math.round(weight * 10) / 10,
                BMI: Math.round(bmi * 10) / 10
            });
        }
        
        // Render theo period hiện tại
        let dataToRender = sampleData7Days;
        if (currentHealthPeriod === '1month') {
            dataToRender = sampleData1Month;
        } else if (currentHealthPeriod === '3months') {
            dataToRender = sampleData3Months;
        }
        
        renderHealthChart(dataToRender, -0.14);
        
        // Sample weight goals
        renderWeightGoals([
            { 
                TargetValue: 68, 
                CurrentProgress: 69.5, 
                IsCompleted: false,
                StartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                EndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            { 
                TargetValue: 65, 
                CurrentProgress: 69.5, 
                IsCompleted: false,
                StartDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                EndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            { 
                TargetValue: 70, 
                CurrentProgress: 70, 
                IsCompleted: true,
                StartDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                EndDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }
        ]);
    }

    // Sample data for nutrition
    function loadSampleNutritionData() {
        console.log('Loading sample nutrition data for preview...');
        
        // Sample data cho 7 ngày
        const sampleData7Days = [
            { Date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], Consumed: 2200, Burned: 500, Deficit: 1700 },
            { Date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], Consumed: 2400, Burned: 600, Deficit: 1800 },
            { Date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], Consumed: 2100, Burned: 450, Deficit: 1650 },
            { Date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], Consumed: 2300, Burned: 550, Deficit: 1750 },
            { Date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], Consumed: 2200, Burned: 500, Deficit: 1700 },
            { Date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], Consumed: 2500, Burned: 700, Deficit: 1800 },
            { Date: new Date().toISOString().split('T')[0], Consumed: 2100, Burned: 400, Deficit: 1700 }
        ];
        
        // Sample data cho 1 tháng (30 ngày)
        const sampleData1Month = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const consumed = 2000 + Math.floor(Math.random() * 600); // 2000-2600
            const burned = 300 + Math.floor(Math.random() * 500); // 300-800
            sampleData1Month.push({
                Date: date.toISOString().split('T')[0],
                Consumed: consumed,
                Burned: burned,
                Deficit: consumed - burned
            });
        }
        
        // Sample data cho 3 tháng (90 ngày, mỗi 3 ngày 1 điểm)
        const sampleData3Months = [];
        for (let i = 89; i >= 0; i -= 3) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const consumed = 2000 + Math.floor(Math.random() * 600);
            const burned = 300 + Math.floor(Math.random() * 500);
            sampleData3Months.push({
                Date: date.toISOString().split('T')[0],
                Consumed: consumed,
                Burned: burned,
                Deficit: consumed - burned
            });
        }
        
        // Render theo period hiện tại
        let dataToRender = sampleData7Days;
        let summary = {
            totalConsumed: sampleData7Days.reduce((sum, d) => sum + d.Consumed, 0),
            totalBurned: sampleData7Days.reduce((sum, d) => sum + d.Burned, 0),
            totalDeficit: sampleData7Days.reduce((sum, d) => sum + d.Deficit, 0)
        };
        
        if (currentNutritionPeriod === '1month') {
            dataToRender = sampleData1Month;
            summary = {
                totalConsumed: sampleData1Month.reduce((sum, d) => sum + d.Consumed, 0),
                totalBurned: sampleData1Month.reduce((sum, d) => sum + d.Burned, 0),
                totalDeficit: sampleData1Month.reduce((sum, d) => sum + d.Deficit, 0)
            };
        } else if (currentNutritionPeriod === '3months') {
            dataToRender = sampleData3Months;
            summary = {
                totalConsumed: sampleData3Months.reduce((sum, d) => sum + d.Consumed, 0),
                totalBurned: sampleData3Months.reduce((sum, d) => sum + d.Burned, 0),
                totalDeficit: sampleData3Months.reduce((sum, d) => sum + d.Deficit, 0)
            };
        }
        
        renderCaloriesChart(dataToRender, summary);
        
        // Sample macro data với một chút biến động
        const macroVariation = Math.random() * 4 - 2; // -2 đến +2
        renderMacroChart({
            actual: { 
                Protein: 30 + macroVariation, 
                Carbs: 40 - macroVariation, 
                Fat: 30 
            },
            target: { Protein: 30, Carbs: 40, Fat: 30 }
        });
    }
})();

