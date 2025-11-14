// Statistics Dashboard JavaScript
(function() {
    'use strict';

    // Global state
    let statisticsData = null;
    let charts = {};
    let currentDateRange = { from: null, to: null };
    let chartAnimationsPlayed = {
        gender: false,
        age: false
    };

    // Date Range Filter State (similar to quanLiUser.js)
    // Helper functions for date manipulation (must be defined before DATE_RANGE_PRESETS)
    function startOfDay(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function endOfDay(date) {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
    }

    function clampToToday(date, isStart = false) {
        if (!date) return null;
        const candidate = new Date(date);
        const todayEnd = endOfDay(new Date());
        if (candidate.getTime() > todayEnd.getTime()) {
            return isStart ? startOfDay(todayEnd) : todayEnd;
        }
        return candidate;
    }

    const DATE_RANGE_PRESETS = {
        all: {
            label: 'Tất cả thời gian',
            description: 'Không lọc theo ngày',
            quick: true,
            getRange: () => ({ start: null, end: null })
        },
        today: {
            label: 'Hôm nay',
            quick: true,
            getRange: () => {
                const today = new Date();
                return {
                    start: startOfDay(today),
                    end: endOfDay(today)
                };
            }
        },
        last7: {
            label: '7 ngày gần đây',
            quick: true,
            getRange: () => {
                const now = new Date();
                const end = endOfDay(now);
                const startReference = new Date(now);
                startReference.setDate(now.getDate() - 6);
                const start = startOfDay(startReference);
                return { start, end };
            }
        },
        last30: {
            label: '30 ngày gần đây',
            quick: true,
            getRange: () => {
                const now = new Date();
                const end = endOfDay(now);
                const startReference = new Date(now);
                startReference.setDate(now.getDate() - 29);
                const start = startOfDay(startReference);
                return { start, end };
            }
        },
        thisMonth: {
            label: 'Tháng này',
            quick: true,
            getRange: () => {
                const now = new Date();
                const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
                const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
                return { start, end };
            }
        },
        lastMonth: {
            label: 'Tháng trước',
            quick: true,
            getRange: () => {
                const now = new Date();
                const start = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
                const end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
                return { start, end };
            }
        },
        custom: {
            label: 'Tùy chỉnh',
            quick: false,
            getRange: (start, end) => {
                const normalizedStart = start ? startOfDay(start) : null;
                const normalizedEnd = end ? endOfDay(end) : null;
                return {
                    start: clampToToday(normalizedStart, true),
                    end: clampToToday(normalizedEnd, false)
                };
            }
        }
    };
    let isDateRangeDropdownOpen = false;
    let dateRangeErrorTimeout = null;

    // Register Chart.js plugins
    function registerChartPlugins() {
        if (typeof Chart !== 'undefined' && Chart.register) {
            // Register datalabels plugin if available
            if (typeof ChartDataLabels !== 'undefined') {
                try {
                    Chart.register(ChartDataLabels);
                } catch (e) {
                    console.warn('ChartDataLabels plugin registration failed:', e);
                }
            }
        }
    }

    // Register plugins when Chart.js is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerChartPlugins);
    } else {
        registerChartPlugins();
    }

    // Common chart configuration
    const chartDefaults = {
        animation: {
            duration: 1500,
            easing: 'easeOutQuart',
            delay: (context) => {
                let delay = 0;
                if (context.type === 'data' && context.mode === 'default') {
                    delay = context.dataIndex * 100;
                }
                return delay;
            }
        },
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    font: {
                        size: 12,
                        weight: '500'
                    }
                }
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: {
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 13
                },
                cornerRadius: 8,
                displayColors: true
            }
        }
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function() {
        initializeTabs();
        initializeDateRangeFilters();
        loadOverviewData();
        loadRecentActivities();
        setupTabSwitching();
        // Load data for the active tab (user-analytics is active by default)
        const activeTab = document.querySelector('.analytics-tab-card.active');
        if (activeTab) {
            const tabName = activeTab.dataset.tab;
            loadTabData(tabName);
        }
    });

    // Initialize analytics tabs
    function initializeTabs() {
        const tabCards = document.querySelectorAll('.analytics-tab-card');
        tabCards.forEach(card => {
            card.addEventListener('click', function() {
                const tabName = this.dataset.tab;
                switchTab(tabName);
            });
        });
    }

    // Switch between analytics tabs
    function switchTab(tabName) {
        // Destroy charts from previous tab to ensure fresh data
        destroyAllCharts();
        
        // Update active tab card
        document.querySelectorAll('.analytics-tab-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active panel
        document.querySelectorAll('.analytics-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        const panel = document.getElementById(`panel-${tabName}`);
        if (panel) {
            panel.classList.add('active');
            loadTabData(tabName);
        }
    }

    // Map tab name to API endpoint name
    function getApiEndpointName(tabName) {
        const mapping = {
            'user-analytics': 'UserAnalytics',
            'pt-analytics': 'PTAnalytics',
            'health-analytics': 'HealthAnalytics',
            'goals-analytics': 'GoalsAnalytics',
            'nutrition-analytics': 'NutritionAnalytics',
            'finance-analytics': 'FinanceAnalytics'
        };
        return mapping[tabName] || tabName;
    }

    // Load data for specific tab
    async function loadTabData(tabName) {
        try {
            const endpointName = getApiEndpointName(tabName);
            let url = `/Admin/ThongKe/${endpointName}`;
            
            // Get date range from header picker (overview) for all tabs
            let dateFrom = null;
            let dateTo = null;
            
            // Only send date params if a specific filter is selected (not 'all' and has valid dates)
            if (dateFilterPreset !== 'all' && dateFilterRange.start && dateFilterRange.end) {
                dateFrom = dateFilterRange.start;
                dateTo = dateFilterRange.end;
            }
            // If preset is 'all' or no selection, dateFrom and dateTo remain null (don't send query params)
            
            if (dateFrom && dateTo) {
                // Format dates as ISO strings, ensuring they're Date objects
                const fromDate = dateFrom instanceof Date ? dateFrom : new Date(dateFrom);
                const toDate = dateTo instanceof Date ? dateTo : new Date(dateTo);
                url += `?dateFrom=${encodeURIComponent(fromDate.toISOString())}&dateTo=${encodeURIComponent(toDate.toISOString())}`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load data');
            const data = await response.json();

            switch(tabName) {
                case 'user-analytics':
                    renderUserAnalytics(data.UserAnalytics ?? data.userAnalytics ?? data);
                    break;
                case 'pt-analytics':
                    renderPTAnalytics(data.PTAnalytics ?? data.ptAnalytics ?? data);
                    break;
                case 'health-analytics':
                    renderHealthAnalytics(data.HealthAnalytics ?? data.healthAnalytics ?? data);
                    break;
                case 'goals-analytics':
                    renderGoalsAnalytics(data.GoalsAnalytics ?? data.goalsAnalytics ?? data);
                    break;
                case 'nutrition-analytics':
                    renderNutritionAnalytics(data.NutritionAnalytics ?? data.nutritionAnalytics ?? data);
                    break;
                case 'finance-analytics':
                    renderFinanceAnalytics(data.FinanceAnalytics ?? data.financeAnalytics ?? data);
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${tabName}:`, error);
        }
    }

    // Load overview statistics
    async function loadOverviewData() {
        try {
            let url = '/Admin/ThongKe/Data';
            
            // Get date range from header picker
            let dateFrom = null;
            let dateTo = null;
            
            // Only send date params if a specific filter is selected (not 'all' and has valid dates)
            if (dateFilterPreset !== 'all' && dateFilterRange.start && dateFilterRange.end) {
                dateFrom = dateFilterRange.start;
                dateTo = dateFilterRange.end;
            }
            // If preset is 'all' or no selection, dateFrom and dateTo remain null (don't send query params)
            
            if (dateFrom && dateTo) {
                // Format dates as ISO strings, ensuring they're Date objects
                const fromDate = dateFrom instanceof Date ? dateFrom : new Date(dateFrom);
                const toDate = dateTo instanceof Date ? dateTo : new Date(dateTo);
                url += `?dateFrom=${encodeURIComponent(fromDate.toISOString())}&dateTo=${encodeURIComponent(toDate.toISOString())}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load overview data');
            statisticsData = await response.json();
            
            updateOverviewStats(statisticsData.Overview ?? statisticsData.overview);
            // Don't render user analytics here, it will be rendered when tab is loaded
        } catch (error) {
            console.error('Error loading overview data:', error);
        }
    }

    // Update overview statistics cards
    function updateOverviewStats(overview) {
        if (!overview) return;
        
        // Get current date filter info
        const isAllTime = dateFilterPreset === 'all' || !hasDateFilterSelection;
        const preset = DATE_RANGE_PRESETS[dateFilterPreset];
        
        // Determine title labels based on filter
        let userTitle, trainerTitle, revenueTitle, activityTitle;
        
        if (isAllTime) {
            userTitle = 'Tổng người dùng';
            trainerTitle = 'Tổng huấn luyện viên';
            revenueTitle = 'Tổng doanh thu';
            activityTitle = 'Tổng hoạt động';
        } else {
            userTitle = 'Người dùng mới';
            trainerTitle = 'PT mới';
            
            // Revenue title based on preset
            if (preset) {
                if (dateFilterPreset === 'today') {
                    revenueTitle = 'Doanh thu hôm nay';
                } else if (dateFilterPreset === 'last7') {
                    revenueTitle = 'Doanh thu 7 ngày gần đây';
                } else if (dateFilterPreset === 'last30') {
                    revenueTitle = 'Doanh thu 30 ngày gần đây';
                } else if (dateFilterPreset === 'thisMonth') {
                    revenueTitle = 'Doanh thu tháng này';
                } else if (dateFilterPreset === 'lastMonth') {
                    revenueTitle = 'Doanh thu tháng trước';
                } else if (dateFilterPreset === 'custom' && dateFilterRange.start && dateFilterRange.end) {
                    const startDate = formatDateForDisplay(dateFilterRange.start);
                    const endDate = formatDateForDisplay(dateFilterRange.end);
                    revenueTitle = `Doanh thu ${startDate} - ${endDate}`;
                } else {
                    revenueTitle = 'Doanh thu';
                }
            } else {
                revenueTitle = 'Doanh thu';
            }
            
            // Activity title based on preset
            if (preset) {
                activityTitle = preset.label ? `Hoạt động ${preset.label.toLowerCase()}` : 'Hoạt động';
            } else if (dateFilterPreset === 'custom' && dateFilterRange.start && dateFilterRange.end) {
                const startDate = formatDateForDisplay(dateFilterRange.start);
                const endDate = formatDateForDisplay(dateFilterRange.end);
                activityTitle = `Hoạt động ${startDate} - ${endDate}`;
            } else {
                activityTitle = 'Hoạt động';
            }
        }
        
        // Update card titles
        const userCardTitle = document.querySelector('.stat-card:nth-child(1) h3');
        const trainerCardTitle = document.querySelector('.stat-card:nth-child(2) h3');
        const revenueCardTitle = document.querySelector('.stat-card:nth-child(3) h3');
        const activityCardTitle = document.querySelector('.stat-card:nth-child(4) h3');
        
        if (userCardTitle) userCardTitle.textContent = userTitle;
        if (trainerCardTitle) trainerCardTitle.textContent = trainerTitle;
        if (revenueCardTitle) revenueCardTitle.textContent = revenueTitle;
        if (activityCardTitle) activityCardTitle.textContent = activityTitle;
        
        // Support both PascalCase (from API) and camelCase (fallback)
        const totalUsers = overview.TotalUsers ?? overview.totalUsers ?? 0;
        const totalTrainers = overview.TotalTrainers ?? overview.totalTrainers ?? 0;
        const monthlyRevenue = Math.round(overview.MonthlyRevenue ?? overview.monthlyRevenue ?? 0);
        const todayActivity = overview.TodayActivity ?? overview.todayActivity ?? 0;
        const userGrowthPercent = overview.UserGrowthPercent ?? overview.userGrowthPercent ?? 0;
        const trainerGrowthPercent = overview.TrainerGrowthPercent ?? overview.trainerGrowthPercent ?? 0;
        const revenueGrowthPercent = overview.RevenueGrowthPercent ?? overview.revenueGrowthPercent ?? 0;
        const activityGrowthPercent = overview.ActivityGrowthPercent ?? overview.activityGrowthPercent ?? 0;
        
        animateNumber('.stat-card:nth-child(1) .stat-number', totalUsers);
        animateNumber('.stat-card:nth-child(2) .stat-number', totalTrainers);
        animateNumber('.stat-card:nth-child(3) .stat-number', monthlyRevenue);
        animateNumber('.stat-card:nth-child(4) .stat-number', todayActivity);

        // Update growth percentages
        updateGrowthPercent('.stat-card:nth-child(1) .stat-change', userGrowthPercent);
        updateGrowthPercent('.stat-card:nth-child(2) .stat-change', trainerGrowthPercent);
        updateGrowthPercent('.stat-card:nth-child(3) .stat-change', revenueGrowthPercent);
        updateGrowthPercent('.stat-card:nth-child(4) .stat-change', activityGrowthPercent);
    }

    // Animate number counting
    function animateNumber(selector, target) {
        const element = document.querySelector(selector);
        if (!element) return;
        
        const start = 0;
        const duration = 1500;
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(start + (target - start) * progress);
            
            element.textContent = formatNumber(current);
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = formatNumber(target);
            }
        }
        
        requestAnimationFrame(update);
    }

    // Format number with thousand separators
    function formatNumber(num) {
        if (num == null || num === undefined || isNaN(num)) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // Update growth percentage
    function updateGrowthPercent(selector, percent) {
        const element = document.querySelector(selector);
        if (!element) return;
        
        const percentValue = percent ?? 0;
        const isPositive = percentValue >= 0;
        element.classList.toggle('positive', isPositive);
        element.classList.toggle('negative', !isPositive);
        
        const percentText = element.querySelector('span') || element;
        percentText.textContent = `${isPositive ? '+' : ''}${percentValue.toFixed(1)}%`;
    }

    // Render User Analytics
    function renderUserAnalytics(data) {
        if (!data) return;

        // Support both PascalCase (from API) and camelCase (fallback)
        const totalUsers = data.TotalUsers ?? data.totalUsers ?? 0;
        const dau = data.DailyActiveUsers ?? data.dailyActiveUsers ?? 0;
        const dauPercent = data.DailyActiveUsersPercent ?? data.dailyActiveUsersPercent ?? 0;
        const mau = data.MonthlyActiveUsers ?? data.monthlyActiveUsers ?? 0;
        const mauPercent = data.MonthlyActiveUsersPercent ?? data.monthlyActiveUsersPercent ?? 0;
        const retention7 = data.RetentionRate7Days ?? data.retentionRate7Days ?? 0;
        const retention30 = data.RetentionRate30Days ?? data.retentionRate30Days ?? 0;
        const genderDistribution = data.GenderDistribution ?? data.genderDistribution;
        const ageDistribution = data.AgeDistribution ?? data.ageDistribution;
        const topUsers = data.TopUsers ?? data.topUsers ?? [];

        // Update metrics
        updateTextContent('.analytics-card:nth-child(1) .metric-value', formatNumber(totalUsers));

        updateTextContent('.analytics-card:nth-child(2) .metric-item:first-child .metric-value-small', 
            `${formatNumber(dau)} <span class="percentage">${dauPercent.toFixed(1)}%</span>`);
        updateTextContent('.analytics-card:nth-child(2) .metric-item:last-child .metric-value-small', 
            `${formatNumber(mau)} <span class="percentage">${mauPercent.toFixed(1)}%</span>`);

        updateTextContent('.analytics-card:nth-child(3) .metric-item:first-child .metric-value-small', `${retention7.toFixed(1)}%`);
        updateTextContent('.analytics-card:nth-child(3) .metric-item:last-child .metric-value-small', `${retention30.toFixed(1)}%`);


        // Render charts with new implementation
        if (genderDistribution) {
            renderGenderChartNew(genderDistribution);
        }
        if (ageDistribution) {
            renderAgeChartNew(ageDistribution);
        }

        // Render top users
        renderTopUsers(topUsers);
    }

    // ============================================
    // NEW CHART IMPLEMENTATIONS - Fresh Code
    // ============================================

    // New Gender Distribution Chart - Fresh implementation
    function renderGenderChartNew(data) {
        const canvas = document.getElementById('userGenderChart');
        if (!canvas || !data) return;

        // Always destroy existing chart to ensure clean render
        if (charts.userGenderChart) {
            charts.userGenderChart.destroy();
            delete charts.userGenderChart;
            chartAnimationsPlayed.gender = false;
        }

        const male = data.Male ?? data.male ?? 0;
        const female = data.Female ?? data.female ?? 0;
        const total = male + female;

        // Light, pastel color scheme
        const chartColors = {
            male: '#60a5fa',    // Light blue
            female: '#f87171'   // Light red/pink
        };

        // Reset canvas
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        canvas.style.opacity = '1';
        canvas.style.visibility = 'visible';
        
        charts.userGenderChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Nam', 'Nữ'],
                datasets: [{
                    data: [male || 0, female || 0],
                    backgroundColor: [chartColors.male, chartColors.female],
                    borderColor: ['#93c5fd', '#fca5a5'],
                    borderWidth: 2,
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: window.devicePixelRatio || 2,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10
                    }
                },
                cutout: '60%',
                animation: {
                    animateRotate: true,
                    animateScale: false,
                    duration: 1200,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: {
                                size: 15,
                                weight: 'bold'
                            },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                    return {
                                        text: `${label}: ${value} (${percent}%)`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: data.datasets[0].borderColor[i],
                                        lineWidth: 6,
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        padding: 12,
                        titleFont: { size: 15, weight: 'bold' },
                        bodyFont: { size: 14 },
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                return `${context.label}: ${value} người (${percent}%)`;
                            }
                        }
                    },
                    datalabels: {
                        display: total > 0,
                        color: '#ffffff',
                        font: { size: 16, weight: '600' },
                        formatter: (value, ctx) => {
                            if (value === 0) return '';
                            const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                            return `${value}\n${percent}%`;
                        },
                        textStrokeColor: '#000000',
                        textStrokeWidth: 2
                    }
                },
                transitions: {
                    active: {
                        animation: {
                            duration: 0
                        }
                    }
                }
            }
        });

        // Chart.js animation will handle the rotation, no need for GSAP
        // Just mark animation as played
        chartAnimationsPlayed.gender = true;
    }

    // New Age Distribution Chart - Fresh implementation
    function renderAgeChartNew(data) {
        const canvas = document.getElementById('userAgeChart');
        if (!canvas || !data) return;

        // Always destroy existing chart to ensure clean render
        if (charts.userAgeChart) {
            charts.userAgeChart.destroy();
            delete charts.userAgeChart;
            chartAnimationsPlayed.age = false;
        }

        const ageGroups = [
            { label: 'Dưới 18', value: data.Under18 ?? data.under18 ?? 0, color: '#93c5fd' },
            { label: '18-25', value: data.Age18_25 ?? data.age18_25 ?? 0, color: '#86efac' },
            { label: '26-45', value: data.Age26_45 ?? data.age26_45 ?? 0, color: '#fcd34d' },
            { label: 'Trên 45', value: data.Over45 ?? data.over45 ?? 0, color: '#fca5a5' }
        ];

        // Reset canvas
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        canvas.style.opacity = '1';
        canvas.style.visibility = 'visible';
        
        charts.userAgeChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: ageGroups.map(g => g.label),
                datasets: [{
                    label: 'Số lượng',
                    data: ageGroups.map(g => g.value),
                    backgroundColor: ageGroups.map(g => g.color),
                    borderColor: ageGroups.map(g => {
                        // Lighter shade for border
                        const colors = {
                            '#93c5fd': '#bfdbfe',
                            '#86efac': '#bbf7d0',
                            '#fcd34d': '#fde68a',
                            '#fca5a5': '#fecaca'
                        };
                        return colors[g.color] || g.color;
                    }),
                    borderWidth: 2,
                    borderRadius: 0,
                    borderSkipped: false,
                    base: 0,  // Ensure bars start from y = 0
                    maxBarThickness: 120,  // Increase bar width
                    barPercentage: 0.8,  // 80% of available width
                    categoryPercentage: 0.9  // 90% of category width
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: window.devicePixelRatio || 2,
                layout: {
                    padding: {
                        top: 20,
                        bottom: 40,
                        left: 20,
                        right: 20
                    }
                },
                indexAxis: 'x',
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMax: Math.max(...ageGroups.map(g => g.value), 1),
                        ticks: {
                            stepSize: 1,
                            font: { size: 14, weight: 'bold' },
                            color: '#1f2937',
                            padding: 10
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            lineWidth: 1
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 13, weight: 'bold' },
                            color: '#1f2937',
                            padding: 15,
                            maxRotation: 0,
                            minRotation: 0
                        },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        padding: 12,
                        titleFont: { size: 15, weight: 'bold' },
                        bodyFont: { size: 14 }
                    },
                    datalabels: {
                        display: false  // Remove data labels as requested
                    }
                },
                animation: {
                    duration: 900,
                    easing: 'easeOutCubic',
                    delay: (context) => {
                        // Stagger animation for each bar
                        return context.dataIndex * 100;
                    }
                },
                transitions: {
                    active: {
                        animation: {
                            duration: 0
                        }
                    }
                },
                animations: {
                    y: {
                        from: (ctx) => {
                            // Start from bottom (y = 0 value position)
                            const chart = ctx.chart;
                            const yScale = chart.scales.y;
                            return yScale.getPixelForValue(0);
                        },
                        type: 'number',
                        easing: 'easeOutCubic',
                        duration: 900,
                        delay: (ctx) => ctx.dataIndex * 100
                    }
                }
            }
        });

        // GSAP animation - only once after chart is fully rendered
        if (typeof gsap !== 'undefined' && !chartAnimationsPlayed.age) {
            chartAnimationsPlayed.age = true;
            // Wait for chart to be fully rendered and layout to stabilize
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    gsap.to(canvas, {
                        opacity: 1,
                        y: 0,
                        duration: 0.5,
                        ease: "power2.out"
                    });
                });
            });
        } else {
            // If animation already played, just show the chart
            canvas.style.opacity = '1';
        }
    }


    // Load and render recent activities
    async function loadRecentActivities() {
        try {
            const response = await fetch('/Admin/ThongKe/RecentActivities?limit=20');
            if (!response.ok) throw new Error('Failed to load recent activities');
            const activities = await response.json();
            renderRecentActivities(activities);
        } catch (error) {
            console.error('Error loading recent activities:', error);
        }
    }

    // Render Recent Activities
    function renderRecentActivities(activities) {
        const container = document.getElementById('recent-activities-list');
        if (!container) return;

        container.innerHTML = '';

        // Handle undefined or null
        if (!activities || !Array.isArray(activities)) {
            container.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">Chưa có hoạt động nào</p>';
            return;
        }

        if (activities.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">Chưa có hoạt động nào</p>';
            return;
        }

        activities.forEach(activity => {
            // Support both PascalCase (from API) and camelCase (fallback)
            const timestamp = activity.Timestamp ?? activity.timestamp;
            const type = activity.Type ?? activity.type ?? '';
            const icon = activity.Icon ?? activity.icon ?? 'fa-circle';
            const title = activity.Title ?? activity.title ?? '';
            const description = activity.Description ?? activity.description ?? '';
            
            // Validate timestamp
            if (!timestamp) {
                console.warn('Activity missing timestamp:', activity);
                return;
            }
            
            const timeAgo = getTimeAgo(timestamp);
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.setAttribute('data-category', type);

            activityItem.innerHTML = `
                <div class="activity-icon-wrapper">
                    <i class="fas ${icon} activity-icon"></i>
                </div>
                <div class="activity-content">
                    <p><strong>${title}:</strong> ${description}</p>
                    <span class="activity-time">${timeAgo}</span>
                </div>
            `;

            container.appendChild(activityItem);
        });
    }

    // Helper function to calculate time ago
    function getTimeAgo(timestamp) {
        if (!timestamp) return 'Không xác định';
        
        const now = new Date();
        let time;
        
        // Handle both string and Date object
        if (timestamp instanceof Date) {
            time = timestamp;
        } else if (typeof timestamp === 'string') {
            time = new Date(timestamp);
        } else {
            console.warn('Invalid timestamp format:', timestamp);
            return 'Không xác định';
        }
        
        // Check if date is valid
        if (isNaN(time.getTime())) {
            console.warn('Invalid date:', timestamp);
            return 'Không xác định';
        }
        
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return time.toLocaleDateString('vi-VN');
    }

    // Render Top Users List
    function renderTopUsers(users) {
        const container = document.querySelector('#panel-user-analytics .top-list');
        if (!container) return;
        
        // Handle undefined or null
        if (!users || !Array.isArray(users)) {
            container.innerHTML = '<div class="empty-state">Không có dữ liệu</div>';
            return;
        }

        container.innerHTML = users.map((user, index) => {
            // Support both PascalCase (from API) and camelCase (fallback)
            const name = user.Name ?? user.name ?? 'Không xác định';
            const healthLogs = user.HealthLogs ?? user.healthLogs ?? 0;
            const goals = user.Goals ?? user.goals ?? 0;
            
            return `
            <div class="top-item">
                <span class="rank">${index + 1}</span>
                <span class="name">${name}</span>
                <span class="stat">${healthLogs} log sức khỏe</span>
                <span class="badge success">${goals} mục tiêu</span>
            </div>
        `;
        }).join('');
    }

    // Render PT Analytics
    function renderPTAnalytics(data) {
        if (!data) return;

        // Support both PascalCase (from API) and camelCase (fallback)
        const totalPTs = data.TotalPTs ?? data.totalPTs ?? 0;
        const active = data.Active ?? data.active ?? 0;
        const onLeave = data.OnLeave ?? data.onLeave ?? 0;
        const notAcceptingClients = data.NotAcceptingClients ?? data.notAcceptingClients ?? 0;
        const averageClientsPerPT = data.AverageClientsPerPT ?? data.averageClientsPerPT ?? 0;
        const averageRevenuePerPT = data.AverageRevenuePerPT ?? data.averageRevenuePerPT ?? 0;
        const averageRating = data.AverageRating ?? data.averageRating ?? 0;
        const cancelRate = data.CancelRate ?? data.cancelRate ?? 0;
        const totalBookings = data.TotalBookings ?? data.totalBookings ?? 0;
        const cancelledBookings = data.CancelledBookings ?? data.cancelledBookings ?? 0;
        const ptRevenue = data.PTRevenue ?? data.ptRevenue ?? [];
        const topPTs = data.TopPTs ?? data.topPTs ?? [];

        updateTextContent('#panel-pt-analytics .analytics-card:nth-child(1) .metric-value', formatNumber(totalPTs));
        // Card 2: Trạng thái PT
        const statusCard = document.querySelector('#panel-pt-analytics .analytics-card:nth-child(2)');
        if (statusCard) {
            const statusItems = statusCard.querySelectorAll('.metric-item .metric-value-small');
            if (statusItems.length >= 1) statusItems[0].textContent = formatNumber(active);
            if (statusItems.length >= 2) statusItems[1].textContent = formatNumber(onLeave);
            if (statusItems.length >= 3) statusItems[2].textContent = formatNumber(notAcceptingClients);
        }
        
        // Card 3: Hiệu suất PT
        const performanceCard = document.querySelector('#panel-pt-analytics .analytics-card:nth-child(3)');
        if (performanceCard) {
            const performanceItems = performanceCard.querySelectorAll('.metric-item .metric-value-small');
            if (performanceItems.length >= 1) performanceItems[0].textContent = averageClientsPerPT.toFixed(1);
            if (performanceItems.length >= 2) performanceItems[1].textContent = formatNumber(Math.round(averageRevenuePerPT)) + ' VNĐ';
            if (performanceItems.length >= 3) performanceItems[2].textContent = `${averageRating.toFixed(1)}/5 ⭐`;
        }
        updateTextContent('#panel-pt-analytics .analytics-card:nth-child(4) .metric-value', `${cancelRate.toFixed(1)}%`);
        updateTextContent('#panel-pt-analytics .analytics-card:nth-child(4) .metric-details span:first-child strong', formatNumber(totalBookings));
        updateTextContent('#panel-pt-analytics .analytics-card:nth-child(4) .metric-details span:last-child strong', formatNumber(cancelledBookings));

        renderPTRevenueChart(ptRevenue);
        renderTopPTs(topPTs);
    }

    // Render PT Revenue Chart
    function renderPTRevenueChart(data) {
        const canvas = document.getElementById('ptRevenueChart');
        if (!canvas) return;

        if (charts.ptRevenueChart) {
            charts.ptRevenueChart.destroy();
        }

        // Handle undefined or null
        if (!data || !Array.isArray(data) || data.length === 0) {
            return;
        }

        const labels = data.map(d => d.PTName ?? d.ptName ?? '');
        const revenues = data.map(d => d.Revenue ?? d.revenue ?? 0);

        charts.ptRevenueChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Doanh thu (VNĐ)',
                    data: revenues,
                    backgroundColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Render Top PTs
    function renderTopPTs(pts) {
        const container = document.querySelector('#panel-pt-analytics .top-list');
        if (!container) return;
        
        // Handle undefined or null
        if (!pts || !Array.isArray(pts)) {
            container.innerHTML = '<div class="empty-state">Không có dữ liệu</div>';
            return;
        }

        container.innerHTML = pts.map((pt, index) => {
            // Support both PascalCase (from API) and camelCase (fallback)
            const name = pt.Name ?? pt.name ?? 'Không xác định';
            const revenue = pt.Revenue ?? pt.revenue ?? 0;
            const rating = pt.Rating ?? pt.rating ?? 0;
            
            return `
            <div class="top-item">
                <span class="rank">${index + 1}</span>
                <span class="name">${name}</span>
                <span class="stat">${formatNumber(Math.round(revenue))} VNĐ</span>
                <span class="badge success">${rating.toFixed(1)} ⭐</span>
            </div>
        `;
        }).join('');
    }

    // Render Health Analytics
    function renderHealthAnalytics(data) {
        if (!data) return;

        // Support both PascalCase (from API) and camelCase (fallback)
        const averageBMI = data.AverageBMI ?? data.averageBMI ?? 0;
        const averageHeight = data.AverageHeight ?? data.averageHeight ?? 0;
        const averageWeight = data.AverageWeight ?? data.averageWeight ?? 0;
        const averageWaterIntake = data.AverageWaterIntake ?? data.averageWaterIntake ?? 0;
        const bmiDistribution = data.BMIDistribution ?? data.bmiDistribution ?? {};
        const healthLogRate = data.HealthLogRate ?? data.healthLogRate ?? 0;
        const usersLogging5DaysPerWeek = data.UsersLogging5DaysPerWeek ?? data.usersLogging5DaysPerWeek ?? 0;
        const bmiTrend = data.BMITrend ?? data.bmiTrend ?? [];
        const diseaseTrend = data.DiseaseTrend ?? data.diseaseTrend ?? [];
        const userLevels = data.UserLevels ?? data.userLevels ?? [];

        // Card 1: Chỉ số trung bình
        const averageCard = document.querySelector('#panel-health-analytics .analytics-card:nth-child(1)');
        if (averageCard) {
            const averageItems = averageCard.querySelectorAll('.metric-item .metric-value-small');
            if (averageItems.length >= 1) averageItems[0].textContent = averageBMI.toFixed(1);
            if (averageItems.length >= 2) averageItems[1].textContent = `${averageHeight.toFixed(1)} cm`;
            if (averageItems.length >= 3) averageItems[2].textContent = `${averageWeight.toFixed(1)} kg`;
            if (averageItems.length >= 4) averageItems[3].textContent = `${averageWaterIntake.toFixed(1)} lít`;
        }

        // Card 2: Phân bố BMI
        const bmiCard = document.querySelector('#panel-health-analytics .analytics-card:nth-child(2)');
        if (bmiCard) {
            const bmiItems = bmiCard.querySelectorAll('.metric-item .metric-value-small');
            if (bmiItems.length >= 1) bmiItems[0].textContent = `${(bmiDistribution.Normal ?? bmiDistribution.normal ?? 0).toFixed(1)}%`;
            if (bmiItems.length >= 2) bmiItems[1].textContent = `${(bmiDistribution.Overweight ?? bmiDistribution.overweight ?? 0).toFixed(1)}%`;
            if (bmiItems.length >= 3) bmiItems[2].textContent = `${(bmiDistribution.Obese ?? bmiDistribution.obese ?? 0).toFixed(1)}%`;
            if (bmiItems.length >= 4) bmiItems[3].textContent = `${(bmiDistribution.Underweight ?? bmiDistribution.underweight ?? 0).toFixed(1)}%`;
        }

        // Card 3: Tỷ lệ người dùng có bệnh nền
        updateTextContent('#panel-health-analytics .analytics-card:nth-child(3) .metric-value', `${healthLogRate.toFixed(1)}%`);
        updateTextContent('#panel-health-analytics .analytics-card:nth-child(3) .metric-details span:first-child strong', formatNumber(usersLogging5DaysPerWeek));

        renderBMITrendChart(bmiTrend);
        renderDiseaseTrendChart(diseaseTrend);
        renderUserLevelChart(userLevels);
    }

    // Helper function to calculate nice Y-axis ticks (max 5 ticks)
    function calculateNiceTicks(min, max, maxTicks = 5) {
        const range = max - min;
        
        // If range is very small or zero, add padding
        if (range === 0 || range < 0.1) {
            const center = min;
            const padding = Math.max(1, center * 0.1);
            return {
                min: Math.floor(center - padding),
                max: Math.ceil(center + padding),
                step: 1
            };
        }

        // Add some padding to the range (10% on each side)
        const paddedMin = min - range * 0.1;
        const paddedMax = max + range * 0.1;
        const paddedRange = paddedMax - paddedMin;

        // Calculate rough step
        const roughStep = paddedRange / (maxTicks - 1);
        
        // Find nice step (round to nice numbers: 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, etc.)
        let magnitude, normalizedStep;
        
        if (roughStep < 1) {
            // For small steps, use decimal places
            magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
            normalizedStep = roughStep / magnitude;
        } else {
            magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
            normalizedStep = roughStep / magnitude;
        }
        
        let niceStep;
        if (normalizedStep <= 1) niceStep = 1 * magnitude;
        else if (normalizedStep <= 2) niceStep = 2 * magnitude;
        else if (normalizedStep <= 5) niceStep = 5 * magnitude;
        else niceStep = 10 * magnitude;
        
        // Calculate nice min and max
        const niceMin = Math.floor(paddedMin / niceStep) * niceStep;
        const niceMax = Math.ceil(paddedMax / niceStep) * niceStep;
        
        // Ensure we have at least 2 ticks and at most maxTicks
        const actualTicks = Math.floor((niceMax - niceMin) / niceStep) + 1;
        if (actualTicks > maxTicks) {
            // Increase step to reduce number of ticks
            const newStep = (niceMax - niceMin) / (maxTicks - 1);
            const newMagnitude = Math.pow(10, Math.floor(Math.log10(newStep)));
            const newNormalized = newStep / newMagnitude;
            let adjustedStep;
            if (newNormalized <= 1) adjustedStep = 1 * newMagnitude;
            else if (newNormalized <= 2) adjustedStep = 2 * newMagnitude;
            else if (newNormalized <= 5) adjustedStep = 5 * newMagnitude;
            else adjustedStep = 10 * newMagnitude;
            
            return {
                min: Math.floor(paddedMin / adjustedStep) * adjustedStep,
                max: Math.ceil(paddedMax / adjustedStep) * adjustedStep,
                step: adjustedStep
            };
        }
        
        return {
            min: niceMin,
            max: niceMax,
            step: niceStep
        };
    }

    // Render BMI Trend Chart
    function renderBMITrendChart(data) {
        const canvas = document.getElementById('bmiTrendChart');
        if (!canvas) return;

        if (charts.bmiTrendChart) {
            charts.bmiTrendChart.destroy();
        }

        // Reset canvas
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!data || data.length === 0) return;

        // Support both PascalCase (from API) and camelCase (fallback)
        const labels = data.map(d => {
            const dateStr = d.Date ?? d.date;
            return dateStr ? new Date(dateStr).toLocaleDateString('vi-VN') : '';
        });
        const bmis = data.map(d => {
            const avgBMI = d.AverageBMI ?? d.averageBMI ?? 0;
            return parseFloat(avgBMI.toFixed(1));
        });
        
        // Calculate nice Y-axis ticks
        const minBMI = Math.min(...bmis);
        const maxBMI = Math.max(...bmis);
        
        // For BMI with small range, use 0.5 step and show from floor to ceil
        let niceTicks;
        if (maxBMI - minBMI < 2) {
            // Small range: use 0.5 step, show from floor(min) to ceil(max)
            niceTicks = {
                min: Math.floor(minBMI),
                max: Math.ceil(maxBMI),
                step: 0.5
            };
        } else {
            niceTicks = calculateNiceTicks(minBMI, maxBMI, 5);
        }
        
        // For BMI, if step is less than 1, allow decimal display
        const useDecimals = niceTicks.step < 1;

        charts.bmiTrendChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'BMI trung bình',
                    data: bmis,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 30,
                        left: 20,
                        right: 20
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `BMI: ${context.parsed.y.toFixed(1)}`;
                            }
                        }
                    },
                    datalabels: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        min: niceTicks.min,
                        max: niceTicks.max,
                        ticks: {
                            stepSize: niceTicks.step,
                            callback: function(value) {
                                // For BMI, show 1 decimal if step < 1, otherwise show integer
                                if (useDecimals) {
                                    return value.toFixed(1);
                                }
                                return Math.round(value);
                            },
                            font: {
                                size: 10
                            },
                            padding: 8,
                            precision: useDecimals ? 1 : 0
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    }
                }
            },
            plugins: []
        });
    }

    // Render Disease Trend Chart (Xu hướng người mắc bệnh nền)
    function renderDiseaseTrendChart(data) {
        try {
            const canvas = document.getElementById('diseaseTrendChart');
            if (!canvas) {
                console.warn('Disease trend chart canvas not found');
                return;
            }

            if (charts.diseaseTrendChart) {
                charts.diseaseTrendChart.destroy();
            }

            // Reset canvas
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (!data || data.length === 0) {
                console.warn('Disease trend data is empty');
                return;
        }

        // Support both PascalCase (from API) and camelCase (fallback)
        const labels = data.map(d => {
            const dateStr = d.Date ?? d.date;
            return dateStr ? new Date(dateStr).toLocaleDateString('vi-VN') : '';
        });
        const userCounts = data.map(d => d.UserCount ?? d.userCount ?? 0);
        
        // Calculate nice Y-axis ticks
        const minCount = Math.min(...userCounts);
        const maxCount = Math.max(...userCounts);
        
        // For user counts, always use integer steps
        // Calculate range and determine step
        const countRange = maxCount - minCount;
        let niceTicks;
        let step = 1;
        
        if (countRange === 0) {
            // If all values are same, show from 0 to max+1
            niceTicks = {
                min: 0,
                max: maxCount + 1,
                step: 1
            };
        } else if (countRange <= 2) {
            // Small range: step = 1
            niceTicks = {
                min: Math.max(0, minCount - 1),
                max: maxCount + 1,
                step: 1
            };
        } else {
            // Larger range: calculate nice step
            const roughStep = countRange / 4; // Aim for 5 ticks
            if (roughStep <= 1) step = 1;
            else if (roughStep <= 2) step = 2;
            else if (roughStep <= 5) step = 5;
            else step = Math.ceil(roughStep / 5) * 5;
            
            niceTicks = {
                min: Math.max(0, Math.floor(minCount / step) * step),
                max: Math.ceil(maxCount / step) * step,
                step: step
            };
        }

        charts.diseaseTrendChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Số người mắc bệnh nền',
                    data: userCounts,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 30,
                        left: 20,
                        right: 20
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Số người: ${context.parsed.y}`;
                            }
                        }
                    },
                    datalabels: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        min: Math.max(0, Math.floor(niceTicks.min)),
                        max: Math.ceil(niceTicks.max),
                        ticks: {
                            stepSize: Math.max(1, Math.round(niceTicks.step)),
                            callback: function(value) {
                                // Always show integer for user counts
                                const intValue = Math.round(value);
                                return intValue;
                            },
                            font: {
                                size: 10
                            },
                            padding: 8,
                            precision: 0
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    }
                }
            },
            plugins: []
        });
        } catch (error) {
            console.error('Error rendering disease trend chart:', error);
        }
    }

    // Render User Level Chart (Trình độ người dùng)
    function renderUserLevelChart(data) {
        try {
            const canvas = document.getElementById('userLevelChart');
            if (!canvas) {
                console.warn('User level chart canvas not found');
                return;
            }

            if (charts.userLevelChart) {
                charts.userLevelChart.destroy();
            }

            // Reset canvas
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (!data || data.length === 0) {
                console.warn('User level data is empty');
                return;
            }

        // Support both PascalCase (from API) and camelCase (fallback)
        const labels = data.map(d => d.Level ?? d.level ?? 'Không xác định');
        const userCounts = data.map(d => d.UserCount ?? d.userCount ?? 0);

        // Color scheme for different levels
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

        charts.userLevelChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Số người dùng',
                    data: userCounts,
                    backgroundColor: labels.map((_, i) => colors[i % colors.length]),
                    borderColor: labels.map((_, i) => colors[i % colors.length]),
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20,
                        left: 20,
                        right: 20
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Số người dùng: ${context.parsed.y}`;
                            }
                        }
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: function(value) {
                            return value;
                        },
                        font: {
                            size: 11,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
        } catch (error) {
            console.error('Error rendering user level chart:', error);
        }
    }

    // Render Goals Analytics
    function renderGoalsAnalytics(data) {
        if (!data) return;

        // Support both PascalCase (from API) and camelCase (fallback)
        const totalGoals = data.TotalGoals ?? data.totalGoals ?? 0;
        const completedGoals = data.CompletedGoals ?? data.completedGoals ?? 0;
        const inProgressGoals = data.InProgressGoals ?? data.inProgressGoals ?? 0;
        const cancelledGoals = data.CancelledGoals ?? data.cancelledGoals ?? 0;
        const completedPercent = data.CompletedPercent ?? data.completedPercent ?? 0;
        const inProgressPercent = data.InProgressPercent ?? data.inProgressPercent ?? 0;
        const cancelledPercent = data.CancelledPercent ?? data.cancelledPercent ?? 0;
        const averageCompletionDays = data.AverageCompletionDays ?? data.averageCompletionDays ?? 0;
        const goalTypeDistribution = data.GoalTypeDistribution ?? data.goalTypeDistribution ?? [];
        const topGoalTypes = data.TopGoalTypes ?? data.topGoalTypes ?? [];

        // Card 1: Tổng mục tiêu
        updateTextContent('#panel-goals-analytics .analytics-card:nth-child(1) .metric-value', formatNumber(totalGoals));
        updateTextContent('#panel-goals-analytics .analytics-card:nth-child(1) .metric-details span:first-child strong', formatNumber(completedGoals));
        updateTextContent('#panel-goals-analytics .analytics-card:nth-child(1) .metric-details span:nth-child(2) strong', formatNumber(inProgressGoals));
        updateTextContent('#panel-goals-analytics .analytics-card:nth-child(1) .metric-details span:last-child strong', formatNumber(cancelledGoals));

        // Card 2: Phân bố mục tiêu theo trạng thái
        const statusCard = document.querySelector('#panel-goals-analytics .analytics-card:nth-child(2)');
        if (statusCard) {
            const statusItems = statusCard.querySelectorAll('.metric-item .metric-value-small');
            if (statusItems.length >= 1) statusItems[0].textContent = `${completedPercent.toFixed(1)}%`;
            if (statusItems.length >= 2) statusItems[1].textContent = `${inProgressPercent.toFixed(1)}%`;
            if (statusItems.length >= 3) statusItems[2].textContent = `${cancelledPercent.toFixed(1)}%`;
        }

        // Card 3: Thời gian hoàn thành TB
        updateTextContent('#panel-goals-analytics .analytics-card:nth-child(3) .metric-value', `${Math.round(averageCompletionDays)} ngày`);

        renderGoalsTypeChart(goalTypeDistribution);
        // Load workout type distribution data for the chart
        loadWorkoutTypeDistribution();
        renderTopGoalTypes(topGoalTypes);
    }

    // Render Goals Type Chart
    function renderGoalsTypeChart(data) {
        const canvas = document.getElementById('goalsTypeChart');
        if (!canvas) return;

        if (charts.goalsTypeChart) {
            charts.goalsTypeChart.destroy();
        }

        // Handle undefined or null
        if (!data || !Array.isArray(data) || data.length === 0) {
            return;
        }

        // Support both PascalCase (from API) and camelCase (fallback)
        const labels = data.map(d => d.GoalType ?? d.goalType ?? '');
        const counts = data.map(d => d.Count ?? d.count ?? 0);

        charts.goalsTypeChart = new Chart(canvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: counts,
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Load Workout Type Distribution data
    async function loadWorkoutTypeDistribution() {
        try {
            let url = '/Admin/ThongKe/WorkoutAnalytics';
            
            // Get date range from header picker
            let dateFrom = null;
            let dateTo = null;
            
            if (dateFilterPreset !== 'all' && dateFilterRange.start && dateFilterRange.end) {
                dateFrom = dateFilterRange.start;
                dateTo = dateFilterRange.end;
            }
            
            if (dateFrom && dateTo) {
                const fromDate = dateFrom instanceof Date ? dateFrom : new Date(dateFrom);
                const toDate = dateTo instanceof Date ? dateTo : new Date(dateTo);
                url += `?dateFrom=${encodeURIComponent(fromDate.toISOString())}&dateTo=${encodeURIComponent(toDate.toISOString())}`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load workout type distribution');
            const data = await response.json();
            
            // Render the chart with typeDistribution data
            const typeDistribution = data.TypeDistribution ?? data.typeDistribution ?? [];
            renderWorkoutTypeChart(typeDistribution);
        } catch (error) {
            console.error('Error loading workout type distribution:', error);
            // Render empty chart on error
            renderWorkoutTypeChart([]);
        }
    }

    // Render Top Goal Types
    function renderTopGoalTypes(types) {
        const container = document.querySelector('#panel-goals-analytics .top-list');
        if (!container) return;
        
        // Handle undefined or null
        if (!types || !Array.isArray(types)) {
            container.innerHTML = '<div class="empty-state">Không có dữ liệu</div>';
            return;
        }

        container.innerHTML = types.map((type, index) => {
            // Support both PascalCase (from API) and camelCase (fallback)
            const goalType = type.GoalType ?? type.goalType ?? 'Không xác định';
            const count = type.Count ?? type.count ?? 0;
            
            return `
            <div class="top-item">
                <span class="rank">${index + 1}</span>
                <span class="name">${goalType}</span>
                <span class="stat">${formatNumber(count)} mục tiêu</span>
            </div>
        `;
        }).join('');
    }


    // Render Workout Type Chart
    function renderWorkoutTypeChart(data) {
        const canvas = document.getElementById('workoutTypeChart');
        if (!canvas) return;

        if (charts.workoutTypeChart) {
            charts.workoutTypeChart.destroy();
        }

        // Handle undefined or null
        if (!data || !Array.isArray(data) || data.length === 0) {
            return;
        }

        // Support both PascalCase (from API) and camelCase (fallback)
        const labels = data.map(d => d.Type ?? d.type ?? '');
        const counts = data.map(d => d.Count ?? d.count ?? 0);

        charts.workoutTypeChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: counts,
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }


    // Render Nutrition Analytics
    function renderNutritionAnalytics(data) {
        if (!data) return;

        // Support both PascalCase (from API) and camelCase (fallback)
        const activePlans = data.ActivePlans ?? data.activePlans ?? 0;
        const averageCaloriesPerDay = data.AverageCaloriesPerDay ?? data.averageCaloriesPerDay ?? 0;
        const macroDistribution = data.MacroDistribution ?? data.macroDistribution ?? {};
        
        // Debug: log macro distribution data
        console.log('Nutrition Analytics Data:', data);
        console.log('Macro Distribution:', macroDistribution);

        updateTextContent('#panel-nutrition-analytics .analytics-card:nth-child(1) .metric-value', formatNumber(activePlans));
        updateTextContent('#panel-nutrition-analytics .analytics-card:nth-child(2) .metric-value', Math.round(averageCaloriesPerDay));
        
        // Update macro distribution with proper fallback (display as average grams, not percentage)
        const protein = macroDistribution.Protein ?? macroDistribution.protein ?? 0;
        const carbs = macroDistribution.Carbs ?? macroDistribution.carbs ?? 0;
        const fat = macroDistribution.Fat ?? macroDistribution.fat ?? 0;
        
        console.log('Macro values:', { protein, carbs, fat });
        console.log('Full macro object:', macroDistribution);
        
        // Display as average grams (always show value, even if 0)
        const proteinText = protein > 0 ? `${protein.toFixed(1)}g` : '0g';
        const carbsText = carbs > 0 ? `${carbs.toFixed(1)}g` : '0g';
        const fatText = fat > 0 ? `${fat.toFixed(1)}g` : '0g';
        
        // Use correct selector - find by label text to ensure accuracy
        // Find the card with "Phân bố macro TB" title
        const allCards = document.querySelectorAll('#panel-nutrition-analytics .analytics-card');
        let macroCard = null;
        
        for (const card of allCards) {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.trim() === 'Phân bố macro TB') {
                macroCard = card;
                break;
            }
        }
        
        // Fallback to nth-child(3) if not found by title
        if (!macroCard) {
            macroCard = document.querySelector('#panel-nutrition-analytics .analytics-card:nth-child(3)');
        }
        
        if (macroCard) {
            // Find elements by their label text
            const allMetricItems = macroCard.querySelectorAll('.metric-item');
            console.log('All metric items found:', allMetricItems.length);
            
            allMetricItems.forEach((item, index) => {
                const label = item.querySelector('.metric-label');
                const valueElement = item.querySelector('.metric-value-small');
                
                if (label && valueElement) {
                    const labelText = label.textContent.trim();
                    console.log(`Item ${index}: label="${labelText}", element=`, valueElement);
                    
                    if (labelText === 'Protein') {
                        valueElement.textContent = proteinText;
                        console.log('Updated Protein:', proteinText);
                    } else if (labelText === 'Carbs') {
                        valueElement.textContent = carbsText;
                        console.log('Updated Carbs:', carbsText);
                    } else if (labelText === 'Fat') {
                        valueElement.textContent = fatText;
                        console.log('Updated Fat:', fatText);
                    }
                }
            });
        } else {
            console.error('Macro card not found!');
        }

        const top3FavoriteFoods = data.Top3FavoriteFoods ?? data.top3FavoriteFoods ?? [];
        renderTop3FavoriteFoodsChart(top3FavoriteFoods);
        renderNutritionMacroChart(macroDistribution);
    }

    // Render Top Foods by Macro Nutrients Chart (bar chart)
    // Shows: Highest Protein, Highest Carbohydrate, Highest Fat
    function renderTop3FavoriteFoodsChart(data) {
        const canvas = document.getElementById('nutritionCalorieTrendChart');
        if (!canvas) return;

        if (charts.nutritionCalorieTrendChart) {
            charts.nutritionCalorieTrendChart.destroy();
        }

        if (!data || data.length === 0) {
            // No data available, show empty chart
            charts.nutritionCalorieTrendChart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Giá trị (g)',
                        data: [],
                        backgroundColor: '#f59e0b'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
            return;
        }

        // Data contains: [Top Protein Food, Top Carbs Food, Top Fat Food]
        // Support both PascalCase (from API) and camelCase (fallback)
        const proteinFood = data[0] ?? {};
        const carbsFood = data[1] ?? {};
        const fatFood = data[2] ?? {};

        const labels = [
            proteinFood.FoodName ?? proteinFood.foodName ?? 'Giàu đạm nhất',
            carbsFood.FoodName ?? carbsFood.foodName ?? 'Giàu Carbohydrate nhất',
            fatFood.FoodName ?? fatFood.foodName ?? 'Giàu chất béo nhất'
        ];
        
        const values = [
            proteinFood.LogCount ?? proteinFood.logCount ?? 0,
            carbsFood.LogCount ?? carbsFood.logCount ?? 0,
            fatFood.LogCount ?? fatFood.logCount ?? 0
        ];

        console.log('Top Foods by Macro Nutrients:', { labels, values, rawData: data });

        charts.nutritionCalorieTrendChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Giá trị (g)',
                    data: values,
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + 'g';
                            }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Giá trị: ' + context.parsed.y + 'g';
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        anchor: 'end',
                        align: 'top',
                        formatter: function(value) {
                            return value + 'g';
                        },
                        color: '#333',
                        font: {
                            weight: 'bold'
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    // Render Nutrition Macro Chart (display as percentage distribution)
    function renderNutritionMacroChart(data) {
        const canvas = document.getElementById('nutritionMacroChart');
        if (!canvas) return;

        if (charts.nutritionMacroChart) {
            charts.nutritionMacroChart.destroy();
        }

        // Handle both uppercase and lowercase property names
        const protein = data?.Protein ?? data?.protein ?? 0;
        const carbs = data?.Carbs ?? data?.carbs ?? 0;
        const fat = data?.Fat ?? data?.fat ?? 0;

        console.log('Macro chart data (grams):', { protein, carbs, fat });

        // Calculate total for percentage calculation
        const total = protein + carbs + fat;

        if (!data || total === 0) {
            // No data available, show empty chart
        charts.nutritionMacroChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Protein', 'Carbs', 'Fat'],
                datasets: [{
                        data: [0, 0, 0],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': 0%';
                                }
                            }
                    }
                }
            }
        });
            return;
        }

        // Calculate percentages
        const proteinPercent = (protein / total) * 100;
        const carbsPercent = (carbs / total) * 100;
        const fatPercent = (fat / total) * 100;

        console.log('Macro percentages:', { proteinPercent, carbsPercent, fatPercent });

        charts.nutritionMacroChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Protein', 'Carbs', 'Fat'],
                datasets: [{
                    data: [proteinPercent, carbsPercent, fatPercent],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed.toFixed(1) + '%';
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        formatter: function(value) {
                            return value.toFixed(1) + '%';
                        },
                        color: '#fff',
                        font: {
                            weight: 'bold',
                            size: 14
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }


    // Render Finance Analytics
    function renderFinanceAnalytics(data) {
        if (!data) return;

        // Support both PascalCase (from API) and camelCase (fallback)
        const totalTransactions = data.TotalTransactions ?? data.totalTransactions ?? 0;
        const successfulTransactions = data.SuccessfulTransactions ?? data.successfulTransactions ?? 0;
        const failedTransactions = data.FailedTransactions ?? data.failedTransactions ?? 0;
        const averageRevenuePerPT = data.AverageRevenuePerPT ?? data.averageRevenuePerPT ?? 0;
        const paymentMethodDistribution = data.PaymentMethodDistribution ?? data.paymentMethodDistribution ?? [];
        const revenueTrend = data.RevenueTrend ?? data.revenueTrend ?? [];

        // Card 1: Tổng giao dịch
        updateTextContent('#panel-finance-analytics .analytics-card:nth-child(1) .metric-value', formatNumber(totalTransactions));
        updateTextContent('#panel-finance-analytics .analytics-card:nth-child(1) .metric-details span:nth-child(1) strong', formatNumber(successfulTransactions));
        updateTextContent('#panel-finance-analytics .analytics-card:nth-child(1) .metric-details span:nth-child(2) strong', formatNumber(failedTransactions));

        // Card 2: TB doanh thu/PT
        updateTextContent('#panel-finance-analytics .analytics-card:nth-child(2) .metric-value', formatNumber(Math.round(averageRevenuePerPT)));

        renderPaymentMethodChart(paymentMethodDistribution);
        renderRevenueTrendChart(revenueTrend);
    }

    // Render Payment Method Chart
    function renderPaymentMethodChart(data) {
        const canvas = document.getElementById('paymentMethodChart');
        if (!canvas) return;

        if (charts.paymentMethodChart) {
            charts.paymentMethodChart.destroy();
        }

        // Handle undefined or null
        if (!data || !Array.isArray(data) || data.length === 0) {
            return;
        }

        const labels = data.map(d => d.Method ?? d.method ?? '');
        const amounts = data.map(d => d.Amount ?? d.amount ?? 0);

        charts.paymentMethodChart = new Chart(canvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: amounts,
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Render Revenue Trend Chart
    function renderRevenueTrendChart(data) {
        const canvas = document.getElementById('revenueTrendChart');
        if (!canvas) return;

        if (charts.revenueTrendChart) {
            charts.revenueTrendChart.destroy();
        }

        if (!data || data.length === 0) {
        charts.revenueTrendChart = new Chart(canvas, {
                type: 'bar',
            data: {
                    labels: [],
                    datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
            return;
        }

        // Handle undefined or null
        if (!data || !Array.isArray(data)) {
            return;
        }
        
        // Support both PascalCase (from API) and camelCase (fallback)
        const labels = data.map(d => {
            const dateStr = d.Date ?? d.date;
            return dateStr ? new Date(dateStr).toLocaleDateString('vi-VN') : '';
        });
        const revenues = data.map(d => d.Revenue ?? d.revenue ?? 0);
        const profits = data.map(d => d.Profit ?? d.profit ?? 0);

        charts.revenueTrendChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Tổng doanh thu',
                        data: revenues,
                        backgroundColor: '#3b82f6',
                        borderRadius: 8,
                        borderSkipped: false
                    },
                    {
                        label: 'Lợi nhuận PT',
                        data: profits,
                        backgroundColor: '#10b981',
                        borderRadius: 8,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatNumber(value) + ' VNĐ';
                            }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + formatNumber(context.parsed.y) + ' VNĐ';
                            }
                        }
                    }
                }
            }
        });
    }


    // Setup tab switching
    function setupTabSwitching() {
        // Default to user-analytics tab
        switchTab('user-analytics');
    }

    // Initialize date range filters (similar to quanLiUser.js)
    function initializeDateRangeFilters() {
        // Initialize date range picker (using same structure as quanLiUser)
        const toggleButton = document.getElementById('filter-date-range-btn');
        const dropdown = document.getElementById('filter-date-range-dropdown');

        if (!toggleButton || !dropdown) {
            console.warn('⚠️ Date range elements not found, skipping initialization.');
            return;
        }

        // Generate dropdown content
        dropdown.innerHTML = getDateRangeDropdownTemplate();

        // Event listeners
        toggleButton.addEventListener('click', event => {
            event.stopPropagation();
            toggleDateRangeDropdown();
        });

        dropdown.addEventListener('click', event => {
            event.stopPropagation();
        });

        document.addEventListener('click', handleOutsideClickForDateRange);
        document.addEventListener('keydown', handleEscapeKeyForDateRange);

        bindDateRangeDropdownEvents(dropdown);
        setDateFilterRange(null, null, 'all', false);
    }

    function getDateRangeDropdownTemplate() {
        const quickOrder = ['all', 'today', 'last7', 'last30', 'thisMonth', 'lastMonth'];
        const quickOptions = quickOrder
            .filter(key => DATE_RANGE_PRESETS[key])
            .map(key => {
                const preset = DATE_RANGE_PRESETS[key];
                if (!preset) return '';
                return `
                    <button type="button" class="quick-option" data-preset="${key}">
                        <i class="fas fa-calendar-day"></i> ${preset.label}
                    </button>
                `;
            })
            .join('');

        return `
            <div class="quick-options">
                <div class="options-section">
                    <div class="options-title">
                        <i class="fas fa-bolt"></i> Khoảng thời gian nhanh
                    </div>
                    <div class="quick-options-grid">
                        ${quickOptions}
                        <button type="button" class="quick-option custom-option" data-preset="custom">
                            <i class="fas fa-sliders-h"></i> Tùy chỉnh
                        </button>
                    </div>
                </div>
            </div>
            <div class="custom-range-panel">
                <div class="custom-range-header">
                    <h4><i class="fas fa-calendar-check"></i> Chọn khoảng tùy chỉnh</h4>
                    <p>Chọn khoảng ngày cụ thể để lọc dữ liệu thống kê.</p>
                </div>
                <div class="custom-range-body">
                    <div class="date-input-group">
                        <label for="filter-date-start">Từ ngày</label>
                        <input type="date" id="filter-date-start" class="date-input">
                    </div>
                    <div class="date-input-group">
                        <label for="filter-date-end">Đến ngày</label>
                        <input type="date" id="filter-date-end" class="date-input">
                    </div>
                </div>
                <div class="custom-range-footer">
                    <button type="button" class="btn-reset-date" data-action="clear">
                        <i class="fas fa-eraser"></i> Xóa lọc
                    </button>
                    <button type="button" class="btn-apply-date" data-action="apply">
                        <i class="fas fa-check"></i> Áp dụng
                    </button>
                </div>
            </div>
            <div class="date-range-feedback">
                <i class="fas fa-info-circle"></i>
                <span>Không áp dụng lọc theo ngày.</span>
            </div>
            <div class="date-range-error">
                <i class="fas fa-exclamation-triangle"></i>
                <span class="date-range-error-text"></span>
            </div>
        `;
    }

    function bindDateRangeDropdownEvents(dropdown) {
        dropdown.querySelectorAll('[data-preset]').forEach(button => {
            button.addEventListener('click', () => applyQuickDatePreset(button.dataset.preset));
        });

        const applyButton = dropdown.querySelector('[data-action="apply"]');
        if (applyButton) {
            applyButton.addEventListener('click', () => handleCustomDateRangeApply(dropdown));
        }

        const clearButton = dropdown.querySelector('[data-action="clear"]');
        if (clearButton) {
            clearButton.addEventListener('click', () => resetDateFilter());
        }

        const startInput = dropdown.querySelector('#filter-date-start');
        const endInput = dropdown.querySelector('#filter-date-end');
        [startInput, endInput].forEach(input => {
            if (input) {
                input.addEventListener('input', () => clearDateRangeError(dropdown));
            }
        });
    }

    function toggleDateRangeDropdown() {
        const dropdown = document.getElementById('filter-date-range-dropdown');
        if (!dropdown) return;

        if (isDateRangeDropdownOpen && dropdown.classList.contains('active')) {
            closeDateRangeDropdown();
        } else {
            openDateRangeDropdown();
        }
    }

    function openDateRangeDropdown() {
        const dropdown = document.getElementById('filter-date-range-dropdown');
        if (!dropdown) return;

        isDateRangeDropdownOpen = true;
        dropdown.classList.add('active');
        updateDateRangeDropdownUI();
    }

    function closeDateRangeDropdown() {
        const dropdown = document.getElementById('filter-date-range-dropdown');
        if (!dropdown) return;

        isDateRangeDropdownOpen = false;
        dropdown.classList.remove('active');
    }

    function handleOutsideClickForDateRange(event) {
        if (!isDateRangeDropdownOpen) return;

        const dropdown = document.getElementById('filter-date-range-dropdown');
        const toggleButton = document.getElementById('filter-date-range-btn');

        if (!dropdown || !toggleButton) return;

        if (!dropdown.contains(event.target) && !toggleButton.contains(event.target)) {
            closeDateRangeDropdown();
        }
    }

    function handleEscapeKeyForDateRange(event) {
        if (event.key === 'Escape' && isDateRangeDropdownOpen) {
            closeDateRangeDropdown();
        }
    }

    function applyQuickDatePreset(presetKey) {
        const preset = DATE_RANGE_PRESETS[presetKey];
        if (!preset) {
            console.warn(`⚠️ Unknown date range preset: ${presetKey}`);
            return;
        }

        if (presetKey === 'custom') {
            // Just show custom panel, don't apply yet
            const dropdown = document.getElementById('filter-date-range-dropdown');
                if (dropdown) {
                    dropdown.querySelector('.custom-range-panel')?.classList.add('active');
            }
            return;
        }

        const { start, end } = preset.getRange();
        setDateFilterRange(start, end, presetKey, true);
        clearDateRangeError(document.getElementById('filter-date-range-dropdown'));
        closeDateRangeDropdown();
    }

    function handleCustomDateRangeApply(dropdown) {
        const startInput = dropdown.querySelector('#filter-date-start');
        const endInput = dropdown.querySelector('#filter-date-end');

        if (!startInput || !endInput) {
            return;
        }

        const startValue = startInput.value ? new Date(startInput.value) : null;
        const endValue = endInput.value ? new Date(endInput.value) : null;

        if (!startValue || !endValue) {
            showDateRangeError(dropdown, 'Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc.');
            if (!startValue) {
                startInput.focus();
            } else {
                endInput.focus();
            }
            return;
        }

        if (startValue && endValue && startValue > endValue) {
            showDateRangeError(dropdown, 'Ngày bắt đầu không thể lớn hơn ngày kết thúc.');
            startInput.focus();
            return;
        }

        const todayEnd = endOfDay(new Date());
        if (startValue.getTime() > todayEnd.getTime() || endValue.getTime() > todayEnd.getTime()) {
            const todayLabel = formatDateForDisplay(todayEnd);
            showDateRangeError(dropdown, `Không thể lọc vượt quá ngày hiện tại (${todayLabel}).`);
            if (endValue.getTime() > todayEnd.getTime()) {
                endInput.focus();
            } else {
                startInput.focus();
            }
            return;
        }

        const { start, end } = DATE_RANGE_PRESETS.custom.getRange(startValue, endValue);
        setDateFilterRange(start, end, 'custom', true);
        clearDateRangeError(dropdown);
        closeDateRangeDropdown();
    }

    function resetDateFilter() {
        setDateFilterRange(null, null, 'all', false);
        closeDateRangeDropdown();
    }

    // Store date filter state
    let dateFilterPreset = 'all';
    let dateFilterRange = { start: null, end: null };
    let hasDateFilterSelection = false;

    function setDateFilterRange(start, end, presetKey = 'custom', userInitiated = true) {
        dateFilterPreset = presetKey;
        const normalizedStart = start ? startOfDay(start) : null;
        const normalizedEnd = end ? endOfDay(end) : null;
        let clampedStart = clampToToday(normalizedStart, true);
        let clampedEnd = clampToToday(normalizedEnd, false);

        if (clampedStart && clampedEnd && clampedStart.getTime() > clampedEnd.getTime()) {
            clampedStart = startOfDay(clampedEnd);
        }

        dateFilterRange = {
            start: clampedStart,
            end: clampedEnd
        };

        if (!userInitiated) {
            hasDateFilterSelection = false;
        } else if (presetKey === 'all' && !clampedStart && !clampedEnd) {
            hasDateFilterSelection = false;
        } else {
            hasDateFilterSelection = Boolean(clampedStart || clampedEnd);
        }

        // Update currentDateRange for API calls
            currentDateRange.from = clampedStart;
            currentDateRange.to = clampedEnd;

        clearDateRangeError(document.getElementById('filter-date-range-dropdown'));
        updateDateRangeButtonLabel();
        updateDateRangeDropdownUI();

        // Reload data if user initiated
        if (userInitiated) {
            // Destroy all existing charts before reloading data
            destroyAllCharts();
            
                loadOverviewData();
                const activeTab = document.querySelector('.analytics-tab-card.active');
                if (activeTab) {
                    loadTabData(activeTab.dataset.tab);
            }
        }
    }

    // Destroy all charts to ensure fresh data is rendered
    function destroyAllCharts() {
        Object.keys(charts).forEach(chartKey => {
            if (charts[chartKey] && typeof charts[chartKey].destroy === 'function') {
                try {
                    charts[chartKey].destroy();
                } catch (e) {
                    console.warn(`Error destroying chart ${chartKey}:`, e);
                }
            }
            delete charts[chartKey];
        });
        
        // Reset animation flags
        chartAnimationsPlayed = {
            gender: false,
            age: false
        };
    }

    function updateDateRangeButtonLabel() {
        const labelElement = document.getElementById('filter-date-range-text');
        if (!labelElement) return;

        if (!hasDateFilterSelection) {
            labelElement.textContent = 'Chọn khoảng thời gian';
            return;
        }

        const preset = DATE_RANGE_PRESETS[dateFilterPreset];
        if (preset && dateFilterPreset !== 'custom') {
            labelElement.textContent = preset.label;
            return;
        }

        const { start, end } = dateFilterRange;
        if (!start && !end) {
            labelElement.textContent = 'Chọn khoảng thời gian';
            return;
        }

        const startLabel = start ? formatDateForDisplay(start) : '...';
        const endLabel = end ? formatDateForDisplay(end) : '...';
        labelElement.textContent = `${startLabel} - ${endLabel}`;
    }

    function updateDateRangeDropdownUI() {
        const dropdown = document.getElementById('filter-date-range-dropdown');
        if (!dropdown) return;

        const shouldHighlight = hasDateFilterSelection || dateFilterPreset !== 'all';
        dropdown.querySelectorAll('[data-preset]').forEach(button => {
            const isActivePreset = button.dataset.preset === dateFilterPreset;
            button.classList.toggle('active', shouldHighlight && isActivePreset);
        });

        dropdown.classList.toggle('custom-mode', dateFilterPreset === 'custom');

        const startInput = dropdown.querySelector('#filter-date-start');
        const endInput = dropdown.querySelector('#filter-date-end');

        if (startInput) {
            startInput.value = formatDateInputValue(dateFilterRange.start);
        }
        if (endInput) {
            endInput.value = formatDateInputValue(dateFilterRange.end);
        }

        const customPanel = dropdown.querySelector('.custom-range-panel');
        if (customPanel) {
            customPanel.classList.toggle('active', dateFilterPreset === 'custom');
        }
    }

    function showDateRangeError(dropdown, message) {
        if (!dropdown) return;
        const errorContainer = dropdown.querySelector('.date-range-error');
        const errorText = dropdown.querySelector('.date-range-error-text');
        if (!errorContainer || !errorText) return;

        errorText.textContent = message;
        errorContainer.classList.add('visible');

        if (dateRangeErrorTimeout) {
            clearTimeout(dateRangeErrorTimeout);
        }

        dateRangeErrorTimeout = setTimeout(() => {
            errorContainer.classList.remove('visible');
            dateRangeErrorTimeout = null;
        }, 4500);
    }

    function clearDateRangeError(dropdown) {
        if (!dropdown) return;
        const errorContainer = dropdown.querySelector('.date-range-error');
        if (!errorContainer) return;
        errorContainer.classList.remove('visible');
        const errorText = dropdown.querySelector('.date-range-error-text');
        if (errorText) {
            errorText.textContent = '';
        }
        if (dateRangeErrorTimeout) {
            clearTimeout(dateRangeErrorTimeout);
            dateRangeErrorTimeout = null;
        }
    }

    function formatDateInputValue(date) {
        if (!date) return '';
        const normalized = new Date(date);
        const year = normalized.getFullYear();
        const month = String(normalized.getMonth() + 1).padStart(2, '0');
        const day = String(normalized.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatDateForDisplay(date) {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // Helper function to update text content
    function updateTextContent(selector, content) {
        const element = document.querySelector(selector);
        if (element) {
            element.innerHTML = content;
        }
    }

    // Export functions for date picker integration
    window.statisticsDashboard = {
        reloadData: function(dateFrom, dateTo) {
            currentDateRange.from = dateFrom;
            currentDateRange.to = dateTo;
            loadOverviewData();
            const activeTab = document.querySelector('.analytics-tab-card.active');
            if (activeTab) {
                loadTabData(activeTab.dataset.tab);
            }
        }
    };
})();


