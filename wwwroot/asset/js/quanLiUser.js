// User Management JavaScript

// State Management
let currentUsers = [];
let currentSummary = null;
let userProfilesCache = new Map();
let filteredUsers = [];
let currentPage = 1;
let itemsPerPage = 12;
let selectedUserIds = new Set();
let currentUserId = null;
let isInitialized = false;
let isLoadingData = true; // Set to true initially to show loading state
let loadError = null;
let hasLoadedOnce = false;
let currentAbortController = null;
const DATA_ENDPOINT = '/Admin/QuanLiUser/Data';
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
let dateFilterPreset = 'all';
let dateFilterRange = { start: null, end: null };
let isDateRangeDropdownOpen = false;
let hasDateFilterSelection = false;
let dateRangeErrorTimeout = null;

const statusClassMap = {
    'active': 'active',
    'locked': 'locked',
    'pendingverify': 'pending',
    'pending': 'pending',
    'suspended': 'suspended'
};

function pickValue(source, keys, fallback = undefined) {
    if (!source) return fallback;

    for (const key of keys) {
        if (source[key] !== undefined) {
            return source[key];
        }
    }

    const lowerLookup = Object.create(null);
    for (const key of Object.keys(source)) {
        lowerLookup[key.toLowerCase()] = source[key];
    }

    for (const key of keys) {
        const lowerKey = key.toLowerCase();
        if (lowerLookup[lowerKey] !== undefined) {
            return lowerLookup[lowerKey];
        }
    }

    return fallback;
}

function normalizeUserCard(raw) {
    if (!raw) return null;
    const get = (keys, fallback) => pickValue(raw, keys, fallback);
    return {
        userId: get(['userId', 'UserId'], ''),
        username: get(['username', 'Username'], ''),
        email: get(['email', 'Email'], '-'),
        phone: get(['phone', 'Phone'], '-'),
        fullName: get(['fullName', 'FullName'], get(['username', 'Username'], '')), 
        role: get(['role', 'Role'], 'Client'),
        status: get(['status', 'Status'], 'Active'),
        createdDate: get(['createdDate', 'CreatedDate'], null),
        lastLogin: get(['lastLogin', 'LastLogin'], null),
        streak: get(['streak', 'Streak'], 0),
        lastLogDate: get(['lastLogDate', 'LastLogDate'], null),
        goalCompletion: get(['goalCompletion', 'GoalCompletion'], 0),
        openGoals: get(['openGoals', 'OpenGoals'], 0),
        nutritionCompliance: get(['nutritionCompliance', 'NutritionCompliance'], 0),
        workoutCompliance: get(['workoutCompliance', 'WorkoutCompliance'], 0),
        exercises: get(['exercises', 'Exercises'], 0),
        missedWorkoutAlerts: get(['missedWorkoutAlerts', 'MissedWorkoutAlerts'], 0),
        menus: get(['menus', 'Menus'], 0),
        language: get(['language', 'Language'], 'vi'),
        timezone: get(['timezone', 'Timezone'], 'SE Asia Standard Time'),
        dateOfBirth: get(['dateOfBirth', 'DateOfBirth'], null),
        gender: get(['gender', 'Gender'], '-'),
        trainingGoal: get(['trainingGoal', 'TrainingGoal'], '-'),
        avatarUrl: get(['avatarUrl', 'AvatarUrl'], null)
    };
}

function normalizeSummary(raw) {
    if (!raw) return null;
    const get = (keys, fallback) => pickValue(raw, keys, fallback);
    return {
        totalUsers: get(['totalUsers', 'TotalUsers'], 0),
        averageGoalCompletion: get(['averageGoalCompletion', 'AverageGoalCompletion'], 0),
        totalExercises: get(['totalExercises', 'TotalExercises'], 0),
        totalMissedWorkoutAlerts: get(['totalMissedWorkoutAlerts', 'TotalMissedWorkoutAlerts'], 0),
        totalMenus: get(['totalMenus', 'TotalMenus'], 0)
    };
}

function normalizeHealthRecord(raw) {
    const get = (keys, fallback) => pickValue(raw, keys, fallback);
    return {
        recordId: get(['recordId', 'RecordId'], ''),
        date: get(['date', 'Date'], null),
        steps: get(['steps', 'Steps'], null),
        calories: get(['calories', 'Calories'], null),
        sleepHours: get(['sleepHours', 'SleepHours'], null),
        weight: get(['weight', 'Weight'], null),
        height: get(['height', 'Height'], null),
        bmi: get(['bmi', 'Bmi'], null),
        waterIntake: get(['waterIntake', 'WaterIntake'], null),
        diseaseCode: get(['diseaseCode', 'DiseaseCode'], null),
        diseaseName: get(['diseaseName', 'DiseaseName'], null),
        notes: get(['notes', 'Notes'], null)
    };
}

function normalizeGoal(raw) {
    const get = (keys, fallback) => pickValue(raw, keys, fallback);
    return {
        goalId: get(['goalId', 'GoalId'], ''),
        goalType: get(['goalType', 'GoalType'], ''),
        targetValue: get(['targetValue', 'TargetValue'], 0),
        currentProgress: get(['currentProgress', 'CurrentProgress'], 0),
        startDate: get(['startDate', 'StartDate'], null),
        endDate: get(['endDate', 'EndDate'], null),
        isCompleted: get(['isCompleted', 'IsCompleted'], false),
        notes: get(['notes', 'Notes'], null)
    };
}

function normalizeWorkoutPlan(raw) {
    const get = (keys, fallback) => pickValue(raw, keys, fallback);
    return {
        assignmentId: get(['assignmentId', 'AssignmentId'], 0),
        planName: get(['planName', 'PlanName'], '-'),
        planGoal: get(['planGoal', 'PlanGoal'], null),
        status: get(['status', 'Status'], 'Active'),
        startDate: get(['startDate', 'StartDate'], null),
        endDate: get(['endDate', 'EndDate'], null),
        currentWeek: get(['currentWeek', 'CurrentWeek'], null),
        completionRate: get(['completionRate', 'CompletionRate'], null),
        assignedBy: get(['assignedBy', 'AssignedBy'], null)
    };
}

function normalizeNutritionPlan(raw) {
    const get = (keys, fallback) => pickValue(raw, keys, fallback);
    return {
        assignmentId: get(['assignmentId', 'AssignmentId'], 0),
        planName: get(['planName', 'PlanName'], '-'),
        planType: get(['planType', 'PlanType'], null),
        status: get(['status', 'Status'], 'Active'),
        startDate: get(['startDate', 'StartDate'], null),
        endDate: get(['endDate', 'EndDate'], null),
        adherenceRate: get(['adherenceRate', 'AdherenceRate'], null),
        assignedBy: get(['assignedBy', 'AssignedBy'], null)
    };
}

function normalizeAchievement(raw) {
    const get = (keys, fallback) => pickValue(raw, keys, fallback);
    return {
        achievementId: get(['achievementId', 'AchievementId'], 0),
        badgeName: get(['badgeName', 'BadgeName'], ''),
        score: get(['score', 'Score'], 0),
        achievedAt: get(['achievedAt', 'AchievedAt'], null),
        description: get(['description', 'Description'], null)
    };
}

function normalizeNotification(raw) {
    const get = (keys, fallback) => pickValue(raw, keys, fallback);
    return {
        notificationId: get(['notificationId', 'NotificationId'], 0),
        type: get(['type', 'Type'], null),
        content: get(['content', 'Content'], ''),
        createdAt: get(['createdAt', 'CreatedAt'], null),
        isRead: get(['isRead', 'IsRead'], false)
    };
}

function normalizeTransaction(raw) {
    const get = (keys, fallback) => pickValue(raw, keys, fallback);
    return {
        transactionId: get(['transactionId', 'TransactionId'], ''),
        bookingId: get(['bookingId', 'BookingId'], null),
        amount: get(['amount', 'Amount'], 0),
        commission: get(['commission', 'Commission'], null),
        netAmount: get(['netAmount', 'NetAmount'], null),
        method: get(['method', 'Method'], null),
        status: get(['status', 'Status'], 'Pending'),
        createdAt: get(['createdAt', 'CreatedAt'], null)
    };
}

function normalizePtAccess(raw) {
    const get = (keys, fallback) => pickValue(raw, keys, fallback);
    return {
        accessId: get(['accessId', 'AccessId'], 0),
        ptId: get(['ptId', 'PtId'], ''),
        ptName: get(['ptName', 'PtName'], ''),
        grantedAt: get(['grantedAt', 'GrantedAt'], null),
        isActive: get(['isActive', 'IsActive'], false)
    };
}

function normalizeProfileDetail(raw) {
    if (!raw) return {
        healthRecords: [],
        goals: [],
        workoutPlans: [],
        nutritionPlans: [],
        achievements: [],
        notifications: [],
        transactions: [],
        ptAccesses: []
    };

    const getCollection = (name) => {
        const value = pickValue(raw, [name, name.charAt(0).toUpperCase() + name.slice(1)], []);
        return Array.isArray(value) ? value : [];
    };

    return {
        healthRecords: getCollection('healthRecords').map(normalizeHealthRecord),
        goals: getCollection('goals').map(normalizeGoal),
        workoutPlans: getCollection('workoutPlans').map(normalizeWorkoutPlan),
        nutritionPlans: getCollection('nutritionPlans').map(normalizeNutritionPlan),
        achievements: getCollection('achievements').map(normalizeAchievement),
        notifications: getCollection('notifications').map(normalizeNotification),
        transactions: getCollection('transactions').map(normalizeTransaction),
        ptAccesses: getCollection('ptAccesses').map(normalizePtAccess)
    };
}

async function loadUsersFromServer(forceReload = false) {
    // Cancel previous request if still in progress
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }

    if (isLoadingData && !forceReload) {
        console.warn('⚠️ Data fetch already in progress, skipping duplicate request.');
        return;
    }

    if (!forceReload && hasLoadedOnce) {
        console.log('ℹ️ Users data already loaded, skipping fetch.');
        return;
    }

    console.log('📡 Fetching users data from server...');
    isLoadingData = true;
    loadError = null;
    userProfilesCache.clear();

    // Create new AbortController for this request
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    renderUsersCards();

    let requestWasAborted = false;
    try {
        const response = await fetch(DATA_ENDPOINT, {
            headers: {
                'Accept': 'application/json'
            },
            signal: signal
        });

        if (!response.ok) {
            throw new Error(`Máy chử phản hồi mã ${response.status}`);
        }

        const payload = await response.json();
        console.log('📥 Payload người dùng nhận được:', payload);
        const usersRaw = Array.isArray(payload?.users) ? payload.users : Array.isArray(payload?.Users) ? payload.Users : [];
        const summaryRaw = payload?.summary ?? payload?.Summary ?? null;

        currentUsers = usersRaw.map(item => {
            const normalized = normalizeUserCard(item);
            console.log('🔎 User raw vs normalized', item, normalized);
            return normalized;
        }).filter(Boolean);
        currentSummary = normalizeSummary(summaryRaw);
        filteredUsers = [...currentUsers];
        currentPage = 1;
        hasLoadedOnce = true;

        console.log(`✅ Đã tải ${usersRaw.length} người dùng từ máy chủ.`);
    } catch (error) {
        // Don't log error if request was aborted
        if (error.name === 'AbortError') {
            console.log('ℹ️ Request was cancelled.');
            requestWasAborted = true;
            // Don't update state or UI for aborted requests
            return;
        }
        console.error('❌ Không thể tải dữ liệu người dùng:', error);
        loadError = error?.message || 'Không thể tải dữ liệu người dùng.';
        currentUsers = [];
        filteredUsers = [];
        currentSummary = null;
        // Mark as loaded once even on error, so we show error state instead of loading state
        hasLoadedOnce = true;
    } finally {
        // Only update UI if request was not aborted
        if (!requestWasAborted) {
            isLoadingData = false;
            currentAbortController = null;
            updateKPICards();
            renderUsersCards();
        } else {
            // Just clean up the controller, but keep loading state if this was the first load
            currentAbortController = null;
        }
    }
}

function reloadUsersData() {
    loadUsersFromServer(true);
}

async function initializeUsersManagement() {
    console.log('=== Initializing users management ===');
    
    // Check if section exists
    const usersSection = document.getElementById('users');
    if (!usersSection) {
        console.error('❌ Users section not found!');
        return;
    }
    
    // Show loading state immediately
    isLoadingData = true;
    renderUsersCards();
    
    // Always attach event listeners and initialize pagination if needed
    if (!isInitialized) {
        isInitialized = true;
        console.log('Attaching event listeners...');
        attachEventListeners();
        attachUserViewToggle();
        initializeDateRangeFilter();
        initializePagination();
        initProfile360Tabs();
    }
    
    await loadUsersFromServer(true);

    console.log('=== Initialization complete ===');
}

// Also initialize on DOMContentLoaded for first load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Checking for users section...');
    const usersSection = document.getElementById('users');
    if (usersSection) {
        console.log('Users section found, initializing...');
        // Show loading state immediately when DOM is ready
        isLoadingData = true;
        renderUsersCards();
        // Then initialize after a short delay
        setTimeout(() => {
            initializeUsersManagement().catch(error => {
                console.error('❌ Initialization failed:', error);
            });
        }, 100);
    }
});

// Make function globally available
window.initializeUsersManagement = initializeUsersManagement;

// Render Users Cards
function renderUsersCards() {
    console.log('=== renderUsersCards() called ===');
    
    const cardsGrid = document.getElementById('users-cards-grid');
    const emptyState = document.getElementById('users-empty-state');
    
    if (!cardsGrid) {
        console.error('❌ users-cards-grid element not found!');
        return;
    }

    if (isLoadingData) {
        cardsGrid.innerHTML = `<div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #667eea; margin-bottom: 20px;"></i>
            <p style="font-size: 16px; color: #7f8c8d; margin: 0;">Đang tải dữ liệu người dùng...</p>
        </div>`;
        cardsGrid.style.display = 'grid';
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        return;
    }

    if (loadError) {
        cardsGrid.innerHTML = `<div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f56565; margin-bottom: 20px;"></i>
            <p style="font-size: 16px; color: #7f8c8d; margin-bottom: 20px;">${loadError}</p>
            <button class="btn-primary" style="margin-top: 16px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;" onclick="reloadUsersData()">Thử lại</button>
        </div>`;
        cardsGrid.style.display = 'grid';
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        updateUsersCount();
        updatePagination();
        return;
    }
    
    // Only show empty state if we've loaded data at least once
    if (!hasLoadedOnce) {
        // Still loading for the first time, show loading state
        cardsGrid.innerHTML = `<div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #667eea; margin-bottom: 20px;"></i>
            <p style="font-size: 16px; color: #7f8c8d; margin: 0;">Đang tải dữ liệu người dùng...</p>
        </div>`;
        cardsGrid.style.display = 'grid';
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        return;
    }
    
    if (!filteredUsers || filteredUsers.length === 0) {
        console.warn('⚠️ No users to display after loading');
        cardsGrid.innerHTML = '';
        cardsGrid.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'flex';
        }
        updateUsersCount();
        updatePagination();
        return;
    }
    
    cardsGrid.innerHTML = '';
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageUsers = filteredUsers.slice(start, end);
    
    console.log(`Page ${currentPage}: Showing users ${start} to ${end - 1} out of ${filteredUsers.length}`);
    
    if (pageUsers.length === 0) {
        console.warn('⚠️ No users for this page');
        cardsGrid.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'flex';
        }
        updateUsersCount();
        updatePagination();
        return;
    }
    
    cardsGrid.style.display = 'grid';
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    console.log(`🔄 Rendering ${pageUsers.length} user cards...`);
    
    pageUsers.forEach((user, index) => {
        const card = createUserCard(user, index);
        if (card) {
            cardsGrid.appendChild(card);
        }
    });
    
    // Also update table view if it's currently visible
    const tableContainer = document.getElementById('users-table-container');
    if (tableContainer && tableContainer.style.display !== 'none') {
        loadUserTableView();
    }
    
    updateUsersCount();
    updatePagination();
}

// Load User Table View
function loadUserTableView() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageUsers = filteredUsers.slice(start, end);
    
    tbody.innerHTML = pageUsers.map(user => {
        const statusClass = getStatusClass(user.status);
        const statusLabel = getStatusLabel(user.status);
        const roleLabel = getRoleLabel(user.role);
        const createdDate = user.createdDate ? new Date(user.createdDate).toLocaleDateString('vi-VN') : '-';
        
        return `
        <tr>
            <td><input type="checkbox" data-userid="${user.userId}"></td>
            <td>${user.userId || '-'}</td>
            <td>${user.fullName || '-'}</td>
            <td>${user.email || '-'}</td>
            <td>${user.phone || '-'}</td>
            <td>${roleLabel}</td>
            <td><span class="status-badge status-${statusClass}">${statusLabel}</span></td>
            <td>${createdDate}</td>
            <td>
                <button class="btn-edit" onclick="viewProfile360('${user.userId}')" title="Xem chi tiết">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `;
    }).join('');
}

// View toggle
function attachUserViewToggle() {
    const viewBtns = document.querySelectorAll('#users .view-toggle .view-btn');
    const cardsGrid = document.getElementById('users-cards-grid');
    const emptyState = document.getElementById('users-empty-state');
    const pagination = document.getElementById('users-pagination');
    const tableContainer = document.getElementById('users-table-container');
    
    viewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.dataset.view;
            
            viewBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            if (view === 'grid') {
                // Show grid view elements
                if (cardsGrid) cardsGrid.style.display = 'grid';
                if (emptyState) emptyState.style.display = filteredUsers.length === 0 ? 'flex' : 'none';
                if (pagination) pagination.style.display = 'flex';
                // Hide table view
                if (tableContainer) tableContainer.style.display = 'none';
            } else {
                // Hide grid view elements (users-header stays visible)
                if (cardsGrid) cardsGrid.style.display = 'none';
                if (emptyState) emptyState.style.display = 'none';
                if (pagination) pagination.style.display = 'none';
                // Show table view
                if (tableContainer) tableContainer.style.display = 'block';
                loadUserTableView();
            }
        });
    });
}

// Helper function to get status class
function getStatusClass(status) {
    if (!status) return 'pending';
    const statusLower = status.toLowerCase();
    return statusClassMap[statusLower] || 'pending';
}

function createUserCard(user, index) {
    try {
        if (!user) return null;
        
        const card = document.createElement('div');
        card.className = 'user-card';
        card.dataset.userId = user.userId;
        card.style.animationDelay = `${index * 0.05}s`;
        
        const goalCompletionValue = typeof user.goalCompletion === 'number' ? Math.round(user.goalCompletion) : 0;
        const openGoalsValue = Number.isFinite(user.openGoals) ? user.openGoals : 0;
        const nutritionComplianceValue = typeof user.nutritionCompliance === 'number' ? Math.round(user.nutritionCompliance) : 0;
        const workoutComplianceValue = typeof user.workoutCompliance === 'number' ? Math.round(user.workoutCompliance) : 0;
        const trainingGoalValue = user.trainingGoal || '-';
        const phoneValue = user.phone || '-';
        const emailValue = user.email || '-';
        const roleLabel = getRoleLabel(user.role);
        const genderValue = (user.gender || '').toLowerCase();

        const avatarGradient = genderValue === 'nam' || genderValue === 'male'
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    
        card.innerHTML = `
            <div class="user-card-header">
                <div class="user-avatar" style="background: ${avatarGradient};">
                    <i class="fas fa-user"></i>
                </div>
            </div>
            
            <div class="user-card-body">
                <h3 class="user-name">${user.fullName}</h3>
                <p class="user-id">${user.userId}</p>
                
                <div class="user-info-list">
                    <div class="user-info-item">
                        <i class="fas fa-phone"></i>
                        <span>${phoneValue}</span>
                    </div>
                    <div class="user-info-item">
                        <i class="fas fa-envelope"></i>
                        <span>${emailValue}</span>
                    </div>
                    <div class="user-info-item">
                        <i class="fas fa-user-tag"></i>
                        <span>${roleLabel}</span>
                    </div>
                    <div class="user-info-item">
                        <i class="fas fa-bullseye"></i>
                        <span>${trainingGoalValue}</span>
                    </div>
                </div>
                
                <div class="user-kpi-section">
                    <div class="kpi-mini-item kpi-goal">
                        <i class="fas fa-bullseye"></i>
                        <div>
                            <span class="kpi-label">Hoàn thành mục tiêu</span>
                            <span class="kpi-value-small">${goalCompletionValue}% (${openGoalsValue} mở)</span>
                            <div class="kpi-progress-bar">
                                <div class="kpi-progress-fill high" style="width: ${goalCompletionValue}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="kpi-mini-item kpi-nutrition">
                        <i class="fas fa-utensils"></i>
                        <div>
                            <span class="kpi-label">Tuân thủ ăn</span>
                            <span class="kpi-value-small">${nutritionComplianceValue}%</span>
                            <div class="kpi-progress-bar">
                                <div class="kpi-progress-fill high" style="width: ${nutritionComplianceValue}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="kpi-mini-item kpi-workout">
                        <i class="fas fa-dumbbell"></i>
                        <div>
                            <span class="kpi-label">Tuân thủ tập</span>
                            <span class="kpi-value-small">${workoutComplianceValue}%</span>
                            <div class="kpi-progress-bar">
                                <div class="kpi-progress-fill high" style="width: ${workoutComplianceValue}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="user-card-footer">
                <button class="btn-view-details" onclick="viewProfile360('${user.userId}')">
                    <i class="fas fa-eye"></i> Xem chi tiết
                </button>
                <div class="user-card-actions">
                    <button class="btn-card-action delete" onclick="event.stopPropagation(); openDeleteModal('${user.userId}')" title="Xóa người dùng">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
        
        return card;
    } catch (error) {
        console.error(`❌ Error creating card for user ${user.userId}:`, error);
        return null;
    }
}

// Update KPI Cards
function updateKPICards() {
    const totalEl = document.getElementById('total-users');
    const goalEl = document.getElementById('goal-completion');
    const exercisesEl = document.getElementById('total-exercises');
    const missedWorkoutAlertsEl = document.getElementById('missed-workout-alerts');
    const menusEl = document.getElementById('total-menus');
    
    const summary = currentSummary || {
        totalUsers: Array.isArray(currentUsers) ? currentUsers.length : 0,
        averageGoalCompletion: 0,
        totalExercises: 0,
        totalMissedWorkoutAlerts: 0,
        totalMenus: 0
    };

    if (totalEl) totalEl.textContent = summary.totalUsers ?? 0;
    if (goalEl) goalEl.textContent = summary.averageGoalCompletion ?? 0;
    if (exercisesEl) exercisesEl.textContent = summary.totalExercises ?? 0;
    if (missedWorkoutAlertsEl) missedWorkoutAlertsEl.textContent = summary.totalMissedWorkoutAlerts ?? 0;
    if (menusEl) menusEl.textContent = summary.totalMenus ?? 0;
}

// Attach Event Listeners
function attachEventListeners() {
    // Filter button
    const btnApplyFilter = document.getElementById('btn-apply-filter');
    if (btnApplyFilter) {
        btnApplyFilter.addEventListener('click', applyFilters);
    }
    
    // Reset filter button
    const btnResetFilter = document.getElementById('btn-reset-filter');
    if (btnResetFilter) {
        btnResetFilter.addEventListener('click', resetFilters);
    }
    
    
    // Delete user modal confirm button
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', confirmDeleteUser);
    }
    
    // Delete type radio buttons
    const deleteTypeRadios = document.querySelectorAll('input[name="delete-type"]');
    deleteTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const warningBox = document.getElementById('hard-delete-warning');
            if (warningBox) {
                warningBox.style.display = this.value === 'hard' ? 'block' : 'none';
            }
        });
    });
    
    // Export Excel button
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportUsersToExcel);
    }
}

// Export Users to Excel
async function exportUsersToExcel() {
    try {
        // Get current filter values
        const searchKeyword = document.getElementById('search-keyword')?.value || '';
        const dateRangeText = document.getElementById('filter-date-range-text')?.textContent || '';
        
        // Build query parameters
        const params = new URLSearchParams();
        if (searchKeyword) params.append('search', searchKeyword);
        
        // Parse date range if available
        // Note: This is a simplified version - you may need to adjust based on your date range picker implementation
        const dateRange = getCurrentDateRange();
        if (dateRange.start) {
            params.append('dateFrom', dateRange.start.toISOString().split('T')[0]);
        }
        if (dateRange.end) {
            params.append('dateTo', dateRange.end.toISOString().split('T')[0]);
        }
        
        const url = `/Admin/QuanLiUser/ExportExcel?${params.toString()}`;
        
        // Show loading notification
        showNotification('Đang xuất file Excel...', 'info');
        
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = '';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success notification after a short delay
        setTimeout(() => {
            showNotification('Đã xuất file Excel thành công!', 'success');
        }, 500);
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showNotification('Lỗi khi xuất file Excel: ' + error.message, 'error');
    }
}

// Helper function to get current date range
function getCurrentDateRange() {
    if (typeof getActiveDateRange === 'function') {
        return getActiveDateRange();
    }
    return { start: null, end: null };
}

function initializeDateRangeFilter() {
    const toggleButton = document.getElementById('filter-date-range-btn');
    const dropdown = document.getElementById('filter-date-range-dropdown');

    if (!toggleButton || !dropdown) {
        console.warn('⚠️ Date range elements not found, skipping initialization.');
        return;
    }

    dropdown.innerHTML = getDateRangeDropdownTemplate();
    toggleButton.addEventListener('click', event => {
        event.stopPropagation();
        toggleDateRangeDropdown();
    });

    dropdown.addEventListener('click', event => {
        // Prevent closing when interacting inside dropdown
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
                <p>Chọn khoảng ngày cụ thể để lọc danh sách người dùng theo ngày tạo.</p>
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
                <button type="button" class="btn-reset-date" id="filter-date-clear">
                    <i class="fas fa-eraser"></i> Xóa lọc
                </button>
                <button type="button" class="btn-apply-date" id="filter-date-apply">
                    <i class="fas fa-check"></i> Áp dụng
                </button>
            </div>
        </div>
        <div class="date-range-feedback" id="filter-date-feedback">
            <i class="fas fa-info-circle"></i>
            <span>Không áp dụng lọc theo ngày.</span>
        </div>
        <div class="date-range-error" id="filter-date-error">
            <i class="fas fa-exclamation-triangle"></i>
            <span id="filter-date-error-text"></span>
        </div>
    `;
}

function bindDateRangeDropdownEvents(dropdown) {
    dropdown.querySelectorAll('[data-preset]').forEach(button => {
        button.addEventListener('click', () => applyQuickDatePreset(button.dataset.preset));
    });

    const applyButton = dropdown.querySelector('#filter-date-apply');
    if (applyButton) {
        applyButton.addEventListener('click', handleCustomDateRangeApply);
    }

    const clearButton = dropdown.querySelector('#filter-date-clear');
    if (clearButton) {
        clearButton.addEventListener('click', resetDateFilter);
    }

    const startInput = dropdown.querySelector('#filter-date-start');
    const endInput = dropdown.querySelector('#filter-date-end');
    [startInput, endInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => clearDateRangeError());
        }
    });

}

function toggleDateRangeDropdown() {
    if (isDateRangeDropdownOpen) {
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
    if (!hasDateFilterSelection && dateFilterPreset === 'custom') {
        dateFilterPreset = 'all';
        updateDateRangeDropdownUI();
    }
    updateDateRangeFeedback();
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
        dateFilterPreset = 'custom';
        updateDateRangeDropdownUI();
        clearDateRangeError();
        setDateRangeFeedbackPending('Chọn khoảng ngày và nhấn Áp dụng.');
        return;
    }

    const { start, end } = preset.getRange();
    setDateFilterRange(start, end, presetKey, true);
    clearDateRangeError();
    closeDateRangeDropdown();
}

function handleCustomDateRangeApply() {
    const startInput = document.getElementById('filter-date-start');
    const endInput = document.getElementById('filter-date-end');

    if (!startInput || !endInput) {
        return;
    }

    const startValue = startInput.value ? new Date(startInput.value) : null;
    const endValue = endInput.value ? new Date(endInput.value) : null;

    if (!startValue || !endValue) {
        showDateRangeError('Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc.');
        if (!startValue) {
            startInput.focus();
        } else {
            endInput.focus();
        }
        return;
    }

    if (startValue && endValue && startValue > endValue) {
        showDateRangeError('Ngày bắt đầu không thể lớn hơn ngày kết thúc.');
        startInput.focus();
        return;
    }

    const todayEnd = endOfDay(new Date());
    if (startValue.getTime() > todayEnd.getTime() || endValue.getTime() > todayEnd.getTime()) {
        const todayLabel = formatDate(todayEnd);
        showDateRangeError(`Không thể lọc vượt quá ngày hiện tại (${todayLabel}).`);
        if (endValue.getTime() > todayEnd.getTime()) {
            endInput.focus();
        } else {
            startInput.focus();
        }
        return;
    }

    const { start, end } = DATE_RANGE_PRESETS.custom.getRange(startValue, endValue);
    setDateFilterRange(start, end, 'custom', true);
    clearDateRangeError();
    closeDateRangeDropdown();
}

function resetDateFilter() {
    setDateFilterRange(null, null, 'all', false);
    closeDateRangeDropdown();
}

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
    } else if (presetKey === 'all' && !dateFilterRange.start && !dateFilterRange.end) {
        hasDateFilterSelection = true;
    } else {
        hasDateFilterSelection = Boolean(dateFilterRange.start || dateFilterRange.end);
    }

    clearDateRangeError();
    updateDateRangeButtonLabel();
    updateDateRangeDropdownUI();
    updateDateRangeFeedback();
}

function getActiveDateRange() {
    return { ...dateFilterRange };
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

    const startLabel = start ? formatDate(start) : '...';
    const endLabel = end ? formatDate(end) : '...';
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

function setDateRangeFeedbackPending(message) {
    const feedback = document.getElementById('filter-date-feedback');
    if (!feedback) return;
    feedback.classList.add('pending');
    const text = feedback.querySelector('span');
    if (text) {
        text.textContent = message;
    }
    const icon = feedback.querySelector('i');
    if (icon) {
        icon.className = 'fas fa-calendar-plus';
    }
}

function updateDateRangeFeedback() {
    const feedback = document.getElementById('filter-date-feedback');
    if (!feedback) return;

    feedback.classList.remove('pending');
    const text = feedback.querySelector('span');
    const icon = feedback.querySelector('i');
    if (!text || !icon) {
        return;
    }

    if (!hasDateFilterSelection || dateFilterPreset === 'all') {
        feedback.classList.remove('active');
        text.textContent = 'Không áp dụng lọc theo ngày.';
        icon.className = 'fas fa-info-circle';
        return;
    }

    feedback.classList.add('active');
    if (dateFilterPreset !== 'custom') {
        const preset = DATE_RANGE_PRESETS[dateFilterPreset];
        text.textContent = preset ? `Khoảng nhanh: ${preset.label}` : 'Đang áp dụng bộ lọc ngày.';
        icon.className = 'fas fa-filter';
        return;
    }

    const { start, end } = dateFilterRange;
    const startLabel = start ? formatDate(start) : '...';
    const endLabel = end ? formatDate(end) : '...';
    text.textContent = `Từ ${startLabel} đến ${endLabel} (tối đa đến hôm nay)`;
    icon.className = 'fas fa-calendar-week';
}

function showDateRangeError(message) {
    const container = document.getElementById('filter-date-error');
    const text = document.getElementById('filter-date-error-text');
    if (!container || !text) {
        alert(message);
        return;
    }

    text.textContent = message;
    container.classList.add('visible');

    if (dateRangeErrorTimeout) {
        clearTimeout(dateRangeErrorTimeout);
    }

    dateRangeErrorTimeout = setTimeout(() => {
        container.classList.remove('visible');
        dateRangeErrorTimeout = null;
    }, 4500);
}

function clearDateRangeError() {
    const container = document.getElementById('filter-date-error');
    if (!container) return;
    container.classList.remove('visible');
    const text = document.getElementById('filter-date-error-text');
    if (text) {
        text.textContent = '';
    }
    if (dateRangeErrorTimeout) {
        clearTimeout(dateRangeErrorTimeout);
        dateRangeErrorTimeout = null;
    }
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

function formatDateInputValue(date) {
    if (!date) return '';
    const normalized = new Date(date);
    const year = normalized.getFullYear();
    const month = String(normalized.getMonth() + 1).padStart(2, '0');
    const day = String(normalized.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

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

// Apply Filters
function applyFilters() {
    const keyword = document.getElementById('search-keyword').value.toLowerCase();
    const { start, end } = getActiveDateRange();
    
    filteredUsers = currentUsers.filter(user => {
        if (keyword) {
            const searchText = `${user.userId} ${user.username} ${user.email} ${user.fullName}`.toLowerCase();
            if (!searchText.includes(keyword)) return false;
        }

        if (start || end) {
            const createdDate = toDate(user.createdDate);
            if (!createdDate) {
                return false;
            }
            if (start && createdDate < start) {
                return false;
            }
            if (end && createdDate > end) {
                return false;
            }
        }
        return true;
    });
    
    currentPage = 1;
    renderUsersCards();
    updateKPICards();
}

// Reset Filters
function resetFilters() {
    document.getElementById('search-keyword').value = '';
    setDateFilterRange(null, null, 'all', false);
    
    filteredUsers = [...currentUsers];
    currentPage = 1;
    renderUsersCards();
    updateKPICards();
}

function setSectionState(selector, icon, title, description = '') {
    const container = document.querySelector(selector);
    if (!container) return;
    container.innerHTML = `
        <div class="section-state">
            <div class="section-state-icon"><i class="${icon}"></i></div>
            <div class="section-state-content">
                <h4>${title}</h4>
                ${description ? `<p>${description}</p>` : ''}
            </div>
        </div>
    `;
}

function setSectionLoading(selector, title = 'Đang tải dữ liệu...') {
    setSectionState(selector, 'fas fa-spinner fa-spin', title);
}

function setSectionEmpty(selector, title, description = '') {
    setSectionState(selector, 'fas fa-inbox', title, description);
}

function setSectionError(selector, title = 'Không thể tải dữ liệu', description = 'Vui lòng thử lại sau.') {
    setSectionState(selector, 'fas fa-triangle-exclamation', title, description);
}

function renderHealthRecords(records) {
    const container = document.getElementById('health-records-list');
    if (!container) return;

    if (!records || records.length === 0) {
        container.innerHTML = `<div class="section-state">
            <div class="section-state-icon"><i class="fas fa-heartbeat"></i></div>
            <div class="section-state-content">
                <h4>Chưa có bản ghi sức khỏe nào</h4>
                <p>Khi người dùng cập nhật sức khỏe, dữ liệu sẽ được hiển thị tại đây.</p>
            </div>
        </div>`;
        return;
    }

    const html = records.map(record => `
        <div class="health-record-card">
            <header>
                <div class="record-date"><i class="fas fa-calendar-day"></i> ${formatDate(record.date)}</div>
                ${record.diseaseName ? `<span class="health-warning"><i class="fas fa-heartbeat"></i> ${record.diseaseName}</span>` : ''}
            </header>
            <div class="record-grid">
                <div><strong>${formatNumber(record.steps)}</strong><span>Bước</span></div>
                <div><strong>${formatNumber(record.calories)}</strong><span>Kcal</span></div>
                <div><strong>${formatNumber(record.weight, '-')}</strong><span>Cân nặng (kg)</span></div>
                <div><strong>${formatNumber(record.bmi, '-')}</strong><span>BMI</span></div>
                <div><strong>${formatNumber(record.waterIntake, '-')}</strong><span>Nước (L)</span></div>
                <div><strong>${formatNumber(record.sleepHours, '-')}</strong><span>Ngủ (h)</span></div>
            </div>
            ${record.notes ? `<footer><i class="fas fa-sticky-note"></i> ${record.notes}</footer>` : ''}
        </div>
    `).join('');

    container.innerHTML = html;
}

function renderGoals(goals) {
    const container = document.getElementById('goals-list');
    if (!container) return;

    if (!goals || goals.length === 0) {
        setSectionEmpty('#goals-list', 'Chưa có mục tiêu nào.', 'Tạo mục tiêu để theo dõi tiến độ người dùng.');
        return;
    }

    const html = goals.map(goal => {
        const progress = normalizePercentage(goal.currentProgress);
        const completedClass = goal.isCompleted ? 'goal-card completed' : 'goal-card';
        return `
            <div class="${completedClass}">
                <header>
                    <h4><i class="fas fa-bullseye"></i> ${goal.goalType}</h4>
                    <span class="goal-progress-value">${formatPercentage(goal.currentProgress)}%</span>
                </header>
                <div class="goal-progress-bar">
                    <div style="width:${progress}%"></div>
                </div>
                <ul>
                    <li><label>Mục tiêu</label><span>${formatNumber(goal.targetValue)}</span></li>
                    <li><label>Bắt đầu</label><span>${formatDate(goal.startDate)}</span></li>
                    <li><label>Kết thúc</label><span>${formatDate(goal.endDate)}</span></li>
                    <li><label>Trạng thái</label><span>${goal.isCompleted ? 'Đã hoàn thành' : 'Đang thực hiện'}</span></li>
                </ul>
                <footer>${goal.notes || 'Không có ghi chú'}</footer>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="goal-grid">${html}</div>`;
}

function renderWorkoutPlans(plans) {
    const container = document.getElementById('workout-plans-list');
    const summary = document.getElementById('workout-plan-count');
    if (!container) {
        console.warn('⚠️ workout-plans-list element not found');
        return;
    }

    if (summary) {
        summary.textContent = `${plans?.length ?? 0} kế hoạch`;
    }

    if (!plans || plans.length === 0) {
        container.innerHTML = `<div class="section-state">
            <div class="section-state-icon"><i class="fas fa-dumbbell"></i></div>
            <div class="section-state-content">
                <h4>Chưa có kế hoạch tập luyện</h4>
                <p>Hãy phân công một kế hoạch tập luyện để người dùng bắt đầu.</p>
            </div>
        </div>`;
        return;
    }

    const html = plans.map(plan => {
        const statusLabel = plan.status || 'Đang cập nhật';
        const statusClass = statusLabel ? statusLabel.toString().toLowerCase().replace(/\s+/g, '-') : 'pending';
        return `
        <div class="plan-card">
            <header>
                <h4><i class="fas fa-dumbbell"></i> ${plan.planName || 'Kế hoạch chưa rõ'}</h4>
                <span class="status ${statusClass}">${statusLabel}</span>
            </header>
            <ul>
                <li><label>Mục tiêu</label><span>${plan.planGoal || '-'}</span></li>
                <li><label>Bắt đầu</label><span>${formatDate(plan.startDate)}</span></li>
                <li><label>Kết thúc</label><span>${formatDate(plan.endDate)}</span></li>
                <li><label>Tuần hiện tại</label><span>${plan.currentWeek ?? '-'}</span></li>
                <li><label>Tỷ lệ hoàn thành</label><span>${formatPercentage(plan.completionRate)}%</span></li>
                <li><label>Người giao</label><span>${plan.assignedBy || '-'}</span></li>
            </ul>
        </div>
    `;
    }).join('');

    container.innerHTML = html;
}

function renderNutritionPlans(plans) {
    const container = document.getElementById('nutrition-plans-list');
    const summary = document.getElementById('nutrition-plan-count');
    if (!container) {
        console.warn('⚠️ nutrition-plans-list element not found');
        return;
    }

    if (summary) {
        summary.textContent = `${plans?.length ?? 0} kế hoạch`;
    }

    if (!plans || plans.length === 0) {
        container.innerHTML = `<div class="section-state">
            <div class="section-state-icon"><i class="fas fa-utensils"></i></div>
            <div class="section-state-content">
                <h4>Chưa có kế hoạch dinh dưỡng</h4>
                <p>Phân công kế hoạch dinh dưỡng phù hợp với mục tiêu của người dùng.</p>
            </div>
        </div>`;
        return;
    }

    const html = plans.map(plan => {
        const statusLabel = plan.status || 'Đang cập nhật';
        const statusClass = statusLabel ? statusLabel.toString().toLowerCase().replace(/\s+/g, '-') : 'pending';
        return `
        <div class="plan-card nutrition">
            <header>
                <h4><i class="fas fa-utensils"></i> ${plan.planName || 'Kế hoạch chưa rõ'}</h4>
                <span class="status ${statusClass}">${statusLabel}</span>
            </header>
            <ul>
                <li><label>Loại kế hoạch</label><span>${plan.planType || '-'}</span></li>
                <li><label>Bắt đầu</label><span>${formatDate(plan.startDate)}</span></li>
                <li><label>Kết thúc</label><span>${formatDate(plan.endDate)}</span></li>
                <li><label>Tỷ lệ tuân thủ</label><span>${formatPercentage(plan.adherenceRate)}%</span></li>
                <li><label>Người giao</label><span>${plan.assignedBy || '-'}</span></li>
            </ul>
        </div>
    `;
    }).join('');

    container.innerHTML = html;
}

function renderAchievements(achievements) {
    const container = document.getElementById('achievements-list');
    if (!container) return;

    if (!achievements || achievements.length === 0) {
        setSectionEmpty('#achievements-list', 'Chưa có thành tựu nào.');
        return;
    }

    const html = achievements.map(item => `
        <div class="achievement-card">
            <header>
                <h4><i class="fas fa-trophy"></i> ${item.badgeName}</h4>
                <span class="score">${formatNumber(item.score)}</span>
            </header>
            <div class="achievement-body">
                <div><label>Ngày đạt</label><span>${formatDate(item.achievedAt)}</span></div>
                <p>${item.description || 'Không có mô tả'}</p>
            </div>
        </div>
    `).join('');

    container.innerHTML = `<div class="achievement-grid">${html}</div>`;
}

function renderNotifications(notifications) {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    if (!notifications || notifications.length === 0) {
        setSectionEmpty('#notifications-list', 'Chưa có thông báo nào.');
        return;
    }

    const html = notifications.map(item => `
        <div class="notification-item ${item.isRead ? 'read' : 'unread'}">
            <div class="notification-header">
                <span><i class="fas fa-bell"></i> ${item.type || 'Thông báo'}</span>
                <time>${formatDateTime(item.createdAt)}</time>
            </div>
            <p>${item.content}</p>
        </div>
    `).join('');

    container.innerHTML = html;
}

function renderTransactions(transactions) {
    const list = document.getElementById('transactions-list');
    const counter = document.getElementById('transactions-count');

    if (counter) {
        counter.textContent = `${transactions?.length ?? 0} giao dịch`;
    }

    if (!list) {
        // Fallback to legacy table body if exists
        const tbody = document.getElementById('profile-transactions-list');
        if (!tbody) return;
        if (!transactions || transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Chưa có giao dịch nào.</td></tr>`;
            return;
        }
        tbody.innerHTML = transactions.map(tx => `
            <tr>
                <td>${tx.transactionId}</td>
                <td>${tx.bookingId || '-'}</td>
                <td>${formatCurrency(tx.amount)}</td>
                <td>${tx.method || '-'}</td>
                <td>${formatDateTime(tx.createdAt)}</td>
                <td>${tx.status}</td>
            </tr>
        `).join('');
        return;
    }

    if (!transactions || transactions.length === 0) {
        list.innerHTML = `<div class="section-state">
            <div class="section-state-icon"><i class="fas fa-wallet"></i></div>
            <div class="section-state-content">
                <h4>Chưa có giao dịch nào</h4>
                <p>Những lần thanh toán của người dùng sẽ hiển thị tại đây.</p>
            </div>
        </div>`;
        return;
    }

    list.innerHTML = transactions.map(tx => {
        const statusLabel = tx.status || 'Pending';
        const statusClass = statusLabel.toString().toLowerCase().replace(/\s+/g, '-');
        return `
        <div class="transaction-card">
            <div class="transaction-card__header">
                <span class="transaction-id">${tx.transactionId}</span>
                <span class="transaction-status ${statusClass}">${statusLabel}</span>
            </div>
            <div class="transaction-card__body">
                <div class="transaction-row">
                    <label>Mã đặt lịch</label>
                    <span>${tx.bookingId || '-'}</span>
                </div>
                <div class="transaction-row">
                    <label>Số tiền</label>
                    <span class="amount">${formatCurrency(tx.amount)}</span>
                </div>
                <div class="transaction-row">
                    <label>Phương thức</label>
                    <span>${tx.method || '-'}</span>
                </div>
                <div class="transaction-row">
                    <label>Ngày giờ</label>
                    <span>${formatDateTime(tx.createdAt)}</span>
                </div>
            </div>
        </div>
    `;
    }).join('');
}

function renderPtAccessList(ptAccesses) {
    const container = document.getElementById('pt-access-list');
    if (!container) return;

    if (!ptAccesses || ptAccesses.length === 0) {
        setSectionEmpty('#pt-access-list', 'Chưa có PT nào được cấp quyền.');
        return;
    }

    const html = ptAccesses.map(item => `
        <div class="pt-access-card ${item.isActive ? 'active' : 'inactive'}">
            <header>
                <h4><i class="fas fa-user-tie"></i> ${item.ptName}</h4>
                <span class="status-badge ${item.isActive ? 'status-active' : 'status-inactive'}">
                    ${item.isActive ? 'Đang hoạt động' : 'Đã thu hồi'}
                </span>
            </header>
            <div class="pt-access-body">
                <div><label>Mã PT</label><span>${item.ptId}</span></div>
                <div><label>Ngày cấp</label><span>${formatDate(item.grantedAt)}</span></div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}


async function ensureUserProfileData(userId, forceReload = false) {
    if (!forceReload && userProfilesCache.has(userId)) {
        console.log(`📦 Lấy hồ sơ ${userId} từ cache`);
        return userProfilesCache.get(userId);
    }

    if (forceReload && userProfilesCache.has(userId)) {
        userProfilesCache.delete(userId);
    }

    console.log(`🚀 Gọi API chi tiết hồ sơ cho user ${userId}`);
    const response = await fetch(`/Admin/QuanLiUser/${encodeURIComponent(userId)}/Detail`, {
        headers: {
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        console.error('❌ API trả về lỗi:', response.status, response.statusText);
        throw new Error(`Máy chử phản hồi mã ${response.status}`);
    }

    const dataRaw = await response.json();
    console.log('✅ Nhận dữ liệu hồ sơ', dataRaw);
    const data = normalizeProfileDetail(dataRaw);
    userProfilesCache.set(userId, data);
    return data;
}

async function loadUserProfileDetails(userId) {
    const sectionSelectors = [
        '#health-records-list',
        '#goals-list',
        '#workout-plans-list',
        '#nutrition-plans-list',
        '#achievements-list',
        '#notifications-list',
        '#pt-access-list'
    ];

    sectionSelectors.forEach(selector => setSectionLoading(selector));
    const transactionsList = document.getElementById('transactions-list');
    if (transactionsList) {
        transactionsList.innerHTML = `<div class="section-state">
            <div class="section-state-icon"><i class="fas fa-spinner fa-spin"></i></div>
            <div class="section-state-content">
                <h4>Đang tải dữ liệu giao dịch...</h4>
            </div>
        </div>`;
    }

    try {
        const profile = await ensureUserProfileData(userId);
        renderHealthRecords(profile.healthRecords);
        renderGoals(profile.goals);
        renderWorkoutPlans(profile.workoutPlans);
        renderNutritionPlans(profile.nutritionPlans);
        renderAchievements(profile.achievements);
        renderNotifications(profile.notifications);
        renderTransactions(profile.transactions);
        renderPtAccessList(profile.ptAccesses);
    } catch (error) {
        console.error('❌ Không thể tải dữ liệu chi tiết người dùng:', error);
        sectionSelectors.forEach(selector => setSectionError(selector));
        if (transactionsList) {
            transactionsList.innerHTML = `<div class="section-state">
                <div class="section-state-icon"><i class="fas fa-triangle-exclamation"></i></div>
                <div class="section-state-content">
                    <h4>Không thể tải dữ liệu giao dịch</h4>
                    <p>Vui lòng thử tải lại sau.</p>
                </div>
            </div>`;
        }
    }
}

// View Profile 360°
async function viewProfile360(userId) {
    console.log(`🔍 Mở hồ sơ 360° cho user ${userId}`);
    let user = currentUsers.find(u => u.userId === userId);

    if (!user) {
        // fallback khi currentUsers không còn giữ tham chiếu (ví dụ sau khi lọc)
        user = filteredUsers.find(u => u.userId === userId);
    }

    openModal('profile360-modal');

    if (!user) {
        setSectionError('#health-records-list', 'Không tìm thấy dữ liệu người dùng.', 'Vui lòng tải lại danh sách và thử lại.');
        setSectionError('#goals-list');
        setSectionError('#workout-plans-list');
        setSectionError('#nutrition-plans-list');
        setSectionError('#achievements-list');
        setSectionError('#notifications-list');
        setSectionError('#pt-access-list');
        const txList = document.getElementById('transactions-list');
        if (txList) {
            txList.innerHTML = '';
        }
        showNotification('Không tìm thấy dữ liệu người dùng, vui lòng tải lại trang.', 'error');
        return;
    }
    
    currentUserId = userId;
    const normalizedStatusKey = typeof user.status === 'string' ? user.status.toLowerCase().replace(/\s+/g, '') : 'active';
    const goalCompletionValue = typeof user.goalCompletion === 'number' ? Math.round(user.goalCompletion) : 0;
    const nutritionComplianceValue = typeof user.nutritionCompliance === 'number' ? Math.round(user.nutritionCompliance) : 0;
    const workoutComplianceValue = typeof user.workoutCompliance === 'number' ? Math.round(user.workoutCompliance) : 0;
    
    // Fill profile data
    document.getElementById('profile360-username').textContent = safeText(user.fullName, safeText(user.username, user.userId));
    document.getElementById('profile-userid').textContent = safeText(user.userId);
    document.getElementById('profile-username').textContent = safeText(user.username);
    document.getElementById('profile-email').textContent = safeText(user.email);
    document.getElementById('profile-fullname').textContent = safeText(user.fullName, safeText(user.username, user.userId));
    document.getElementById('profile-phone').textContent = safeText(user.phone);
    document.getElementById('profile-dob').textContent = formatDate(user.dateOfBirth);
    document.getElementById('profile-gender').textContent = safeText(user.gender);
    const statusBadge = document.getElementById('profile-status');
    statusBadge.textContent = safeText(getStatusLabel(user.status));
    const badgeClass = statusClassMap[normalizedStatusKey] || 'active';
    statusBadge.className = `status-badge ${badgeClass}`;
    document.getElementById('profile-role').textContent = safeText(getRoleLabel(user.role));
    document.getElementById('profile-language').textContent = safeText(user.language);
    document.getElementById('profile-timezone').textContent = safeText(user.timezone);
    document.getElementById('profile-created').textContent = formatDate(user.createdDate);
    document.getElementById('profile-lastlogin').textContent = formatDate(user.lastLogin);
    document.getElementById('profile-streak').textContent = safeNumber(user.streak, 0);
    document.getElementById('profile-lastlog').textContent = formatDate(user.lastLogDate);
    document.getElementById('profile-goalcompletion').textContent = `${safeNumber(goalCompletionValue, 0)}%`;
    document.getElementById('profile-opengoals').textContent = safeNumber(user.openGoals, 0);
    document.getElementById('profile-nutritioncompliance').textContent = `${safeNumber(nutritionComplianceValue, 0)}%`;
    document.getElementById('profile-workoutcompliance').textContent = `${safeNumber(workoutComplianceValue, 0)}%`;
    
    try {
        await loadUserProfileDetails(userId);
    } catch (error) {
        console.error('❌ Lỗi khi tải chi tiết hồ sơ:', error);
    }
}

// Initialize Profile 360 Tabs
function initProfile360Tabs() {
    const tabs = document.querySelectorAll('.profile360-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.profile360-tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            const content = document.getElementById(`tab-${tabName}`);
            if (content) {
                content.classList.add('active');
            }
        });
    });
}

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal on overlay click
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        const modal = e.target.closest('.modal');
        if (modal) {
            closeModal(modal.id);
        }
    }
});




function openDeleteModal(userId) {
    const user = currentUsers.find(u => u.userId === userId);
    if (!user) return;
    currentUserId = userId;
    document.getElementById('delete-userid').value = user.userId;
    document.getElementById('delete-username').value = user.username;
    document.getElementById('delete-email').value = user.email;
    openModal('delete-user-modal');
}

function confirmDeleteUser() {
    const deleteType = document.querySelector('input[name="delete-type"]:checked').value;
    const reason = document.getElementById('delete-reason').value;
    
    if (!reason) {
        alert('Vui lòng nhập lý do xóa');
        return;
    }
    
    if (deleteType === 'hard') {
        if (!confirm('Bạn có chắc muốn XÓA CỨNG? Hành động này không thể hoàn tác!')) {
            return;
        }
    }
    
    const index = currentUsers.findIndex(u => u.userId === currentUserId);
    if (index > -1) {
        currentUsers.splice(index, 1);
    }
    
    showNotification(`${deleteType === 'hard' ? 'Xóa cứng' : 'Xóa mềm'} người dùng thành công!`, 'success');
    closeModal('delete-user-modal');
    
    applyFilters();
    renderUsersCards();
    updateKPICards();
}

// Pagination
function initializePagination() {
    updatePagination();
}

function updatePagination() {
    const pagination = document.getElementById('users-pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button class="pagination-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    html += `<button class="pagination-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
    </button>`;
    
    pagination.innerHTML = html;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderUsersCards();
    updatePagination();
    
    const cardsWrapper = document.querySelector('.users-cards-wrapper');
    if (cardsWrapper) {
        cardsWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Utility Functions
function normalizePercentage(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return 0;
    }
    const number = Number(value);
    if (!isFinite(number)) {
        return 0;
    }
    return Math.min(100, Math.max(0, Math.round(number)));
}

function formatPercentage(value, fallback = 0) {
    if (value === null || value === undefined || isNaN(value)) {
        return fallback;
    }
    const number = Number(value);
    if (!isFinite(number)) {
        return fallback;
    }
    return Math.round(number);
}

function formatNumber(value, fallback = 0) {
    if (value === null || value === undefined || isNaN(value)) {
        return fallback;
    }
    const number = Number(value);
    return new Intl.NumberFormat('vi-VN').format(number);
}

function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return '0 ₫';
    }
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(Number(value));
}

function toDate(value) {
    if (!value) {
        return null;
    }
    try {
        if (typeof value === 'string' && value.trim() !== '') {
            return new Date(value);
        }
        if (value instanceof Date) {
            return value;
        }
        return new Date(value);
    } catch {
        return null;
    }
}

function formatDate(value) {
    const date = toDate(value);
    if (!date || isNaN(date.getTime())) {
        return '-';
    }
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatDateTime(value) {
    const date = toDate(value);
    if (!date || isNaN(date.getTime())) {
        return '-';
    }
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getRoleLabel(role) {
    if (!role) {
        return 'Khách hàng';
    }

    const normalized = role.toLowerCase();

    switch (normalized) {
        case 'pt':
            return 'Huấn luyện viên';
        case 'admin':
            return 'Quản trị viên';
        case 'client':
        default:
            return 'Khách hàng';
    }
}

function getStatusLabel(status) {
    const labels = {
        'Active': 'Hoạt động',
        'Locked': 'Đã khóa',
        'PendingVerify': 'Chờ xác thực',
        'Suspended': 'Tạm ngưng'
    };
    return labels[status] || status;
}

function updateUsersCount() {
    const countElement = document.getElementById('users-count');
    if (countElement) {
        const count = (filteredUsers && Array.isArray(filteredUsers)) ? filteredUsers.length : 0;
        countElement.textContent = count;
    }
}

// Copy to clipboard
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.select();
        document.execCommand('copy');
        showNotification('Đã sao chép vào clipboard!', 'success');
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    const bgColor = type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#667eea';
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function safeText(value, fallback = '-') {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string' && value.trim() === '') return fallback;
    return value;
}

function safeNumber(value, fallback = 0) {
    if (value === null || value === undefined) return fallback;
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return number;
}

// Make functions globally available
window.viewProfile360 = viewProfile360;
window.openDeleteModal = openDeleteModal;
window.closeModal = closeModal;
window.goToPage = goToPage;
window.copyToClipboard = copyToClipboard;
window.reloadUsersData = reloadUsersData;

