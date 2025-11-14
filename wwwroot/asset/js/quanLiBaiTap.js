// Exercise Management JavaScript

const EXERCISE_BASE_ENDPOINT = '/Admin/QuanLiBaiTap';
const EXERCISE_DATA_ENDPOINT = `${EXERCISE_BASE_ENDPOINT}/Data`;
const EXERCISE_DETAIL_ENDPOINT = exerciseId => `${EXERCISE_BASE_ENDPOINT}/${exerciseId}/Detail`;
const EXERCISE_MUSCLE_GROUPS_ENDPOINT = `${EXERCISE_BASE_ENDPOINT}/MuscleGroups`;
const EXERCISE_EQUIPMENT_ENDPOINT = `${EXERCISE_BASE_ENDPOINT}/Equipment`;

// State Management
let exercisesData = [];
let filteredExercisesData = [];
let exerciseSummary = null;
let exerciseCurrentPage = 1;
const exerciseItemsPerPage = 12;
let currentExerciseView = 'grid'; // 'grid' or 'list'
let isFetchingExercises = false;
let exercisesLoadError = null;
let hasLoadedExercises = false;
let currentExerciseId = null;
let isSavingExercise = false;
let isDeletingExercise = false;
let pendingDeleteExerciseId = null;
let muscleGroupsList = [];
let equipmentList = [];

// Helper function
function el(id) {
    return document.getElementById(id);
}

// Modal Functions
function openModal(modalId) {
    const modal = el(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = el(modalId);
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
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

async function fetchJson(url, options = {}, defaultErrorMessage = 'Đã xảy ra lỗi.') {
    const mergedOptions = {
        headers: {
            Accept: 'application/json',
            ...(options.headers ?? {})
        },
        ...options
    };

    const response = await fetch(url, mergedOptions);

    if (!response.ok) {
        let message = defaultErrorMessage;
        try {
            const errorData = await response.json();
            message = errorData?.title ?? errorData?.message ?? errorData?.error ?? message;
        } catch (error) {
            // no-op
        }
        throw new Error(message);
    }

    if (response.status === 204) {
        return null;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

function buildJsonOptions(method, payload) {
    return {
        method,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify(payload ?? {})
    };
}

async function refreshExercisesAfterMutation() {
    await loadExercisesFromServer(true);
}

function setExerciseFormLoading(isLoading, loadingLabel = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...') {
    const form = el('exercise-form');
    if (!form) return;

    form.querySelectorAll('input, select, textarea').forEach(input => {
        input.disabled = isLoading;
    });

    const saveBtn = form.querySelector('button[type="submit"]');
    if (saveBtn) {
        saveBtn.disabled = isLoading;
        if (isLoading) {
            saveBtn.innerHTML = loadingLabel;
        } else {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Lưu bài tập';
        }
    }

    const cancelBtn = form.querySelector('.btn-cancel');
    if (cancelBtn) {
        cancelBtn.disabled = isLoading;
    }
}

function setDeleteButtonLoading(isLoading) {
    const deleteBtn = el('btn-delete-exercise');
    if (!deleteBtn || deleteBtn.style.display === 'none') return;

    deleteBtn.disabled = isLoading;
    deleteBtn.innerHTML = isLoading
        ? '<i class="fas fa-spinner fa-spin"></i> Đang xóa...'
        : '<i class="fas fa-trash"></i> Xóa';
}

function resetExerciseFormState() {
    currentExerciseId = null;
    const deleteBtn = el('btn-delete-exercise');
    if (deleteBtn) {
        deleteBtn.style.display = 'none';
        deleteBtn.dataset.exerciseId = '';
        setDeleteButtonLoading(false);
    }
    setExerciseFormLoading(false);
    const form = el('exercise-form');
    if (form) {
        form.reset();
    }
    if (el('exercise-form-title')) {
        el('exercise-form-title').textContent = 'Thêm bài tập mới';
    }
}

function getExerciseFormData() {
    return {
        name: (el('exercise-name')?.value || '').trim(),
        muscleGroup: (el('exercise-muscle-group-form')?.value || '').trim(),
        difficulty: Number(el('exercise-difficulty')?.value || 3),
        equipment: (el('exercise-equipment')?.value || '').trim(),
        caloriesPerMinute: Number(el('exercise-calories')?.value || 0),
        imageUrl: (el('exercise-image')?.value || '').trim() || null,
        videoUrl: (el('exercise-video')?.value || '').trim() || null,
        warnings: (el('exercise-warnings')?.value || '').trim() || null,
        instructions: (el('exercise-instructions')?.value || '').trim() || null,
        description: (el('exercise-description')?.value || '').trim() || null,
        hidden: false
    };
}

function validateExerciseFormData(data) {
    if (!data.name) {
        throw new Error('Vui lòng nhập tên bài tập.');
    }
    if (!data.muscleGroup) {
        throw new Error('Vui lòng chọn nhóm cơ.');
    }
    if (Number.isNaN(data.difficulty) || data.difficulty < 2 || data.difficulty > 4) {
        throw new Error('Độ khó phải từ 2 đến 4.');
    }
    if (!data.equipment) {
        throw new Error('Vui lòng chọn thiết bị.');
    }
    if (Number.isNaN(data.caloriesPerMinute) || data.caloriesPerMinute < 0) {
        throw new Error('Calo/phút không hợp lệ.');
    }
}

function normalizeExercise(raw) {
    if (!raw) return null;
    return {
        id: raw.ExerciseId ?? raw.exerciseId ?? raw.id ?? 0,
        name: raw.Name ?? raw.name ?? 'Không xác định',
        muscleGroup: raw.MuscleGroup ?? raw.muscleGroup ?? 'Toàn thân',
        difficulty: Number(raw.Difficulty ?? raw.difficulty ?? 3),
        difficultyText: raw.DifficultyText ?? raw.difficultyText ?? 'Trung bình',
        equipment: raw.Equipment ?? raw.equipment ?? 'Không cần',
        caloriesPerMinute: Number(raw.CaloriesPerMinute ?? raw.caloriesPerMinute ?? 0),
        imageUrl: raw.ImageUrl ?? raw.imageUrl ?? null,
        videoUrl: raw.VideoUrl ?? raw.videoUrl ?? null,
        warnings: raw.Warnings ?? raw.warnings ?? null,
        instructions: raw.Instructions ?? raw.instructions ?? null,
        description: raw.Description ?? raw.description ?? null,
        hidden: raw.Hidden ?? raw.hidden ?? false,
        createdAt: raw.CreatedAt ?? raw.createdAt ?? new Date().toISOString().split('T')[0],
        timesUsed: Number(raw.TimesUsed ?? raw.timesUsed ?? 0)
    };
}

function normalizeSummary(raw) {
    if (!raw) return null;
    return {
        TotalExercises: Number(raw.TotalExercises ?? 0),
        AverageDifficulty: Number(raw.AverageDifficulty ?? 0)
    };
}

async function loadExercisesFromServer(forceReload = false) {
    if (isFetchingExercises && !forceReload) {
        return;
    }

    isFetchingExercises = true;
    exercisesLoadError = null;
    renderExerciseCards();

    try {
        const response = await fetch(EXERCISE_DATA_ENDPOINT, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Máy chủ phản hồi mã ${response.status}`);
        }

        const payload = await response.json();
        const exercisesRaw = Array.isArray(payload?.Exercises) ? payload.Exercises : [];
        const summaryRaw = payload?.Summary ?? null;

        exercisesData = exercisesRaw.map(normalizeExercise).filter(Boolean);
        filteredExercisesData = [...exercisesData];
        exerciseSummary = normalizeSummary(summaryRaw);
        exerciseCurrentPage = 1;
        hasLoadedExercises = true;
        exercisesLoadError = null;
    } catch (error) {
        console.error('❌ Không thể tải dữ liệu bài tập:', error);
        exercisesLoadError = error?.message ?? 'Không thể tải dữ liệu bài tập.';
        exercisesData = [];
        filteredExercisesData = [];
        exerciseSummary = null;
        hasLoadedExercises = false;
    } finally {
        isFetchingExercises = false;
        renderExerciseCards();
        updateExerciseKPIs();
    }
}

// Render exercise cards
function renderExerciseCards() {
    const grid = el('exercise-cards-grid');
    const emptyState = el('exercises-empty-state');
    if (!grid) return;

    if (isFetchingExercises) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin" style="font-size: 2em; color: #667eea;"></i><p>Đang tải dữ liệu...</p></div>';
        if (emptyState) emptyState.style.display = 'none';
        return;
    }

    if (exercisesLoadError) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #f56565;"><i class="fas fa-exclamation-triangle" style="font-size: 2em;"></i><p>${exercisesLoadError}</p><button onclick="loadExercisesFromServer(true)" class="btn-primary" style="margin-top: 10px;">Thử lại</button></div>`;
        if (emptyState) emptyState.style.display = 'none';
        return;
    }

    const startIndex = (exerciseCurrentPage - 1) * exerciseItemsPerPage;
    const endIndex = startIndex + exerciseItemsPerPage;
    const paginatedData = filteredExercisesData.slice(startIndex, endIndex);

    if (paginatedData.length === 0) {
        grid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        updateExercisePagination();
        return;
    }

    grid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';

    grid.innerHTML = paginatedData.map((exercise, index) => createExerciseCard(exercise, startIndex + index)).join('');
    updateExercisePagination();
}

// Create exercise card HTML
function createExerciseCard(exercise, index) {
    const difficultyStars = '⭐'.repeat(exercise.difficulty) + '○'.repeat(5 - exercise.difficulty);
    const exerciseImage = exercise.imageUrl || 'https://via.placeholder.com/300x200?text=Exercise';
    const gradientColors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
    ];
    const cardGradient = gradientColors[index % gradientColors.length];

    return `
        <div class="exercise-card-compact" onclick="viewExerciseDetail(${exercise.id})" style="cursor: pointer;">
            <div class="exercise-card-image-wrapper">
                <img src="${exerciseImage}" alt="${exercise.name}" class="exercise-card-image" onerror="this.src='https://via.placeholder.com/300x200?text=Exercise'">
                <div class="exercise-card-overlay"></div>
                <div class="exercise-card-difficulty-badge">
                    ${difficultyStars}
                </div>
            </div>
            <div class="exercise-card-content">
                <h4 class="exercise-card-title">${exercise.name}</h4>
                <div class="exercise-card-tags">
                    <span class="exercise-tag" style="background: ${cardGradient}">
                        <i class="fas fa-fire"></i> ${exercise.muscleGroup}
                    </span>
                    <span class="exercise-tag" style="background: ${cardGradient}">
                        <i class="fas fa-star"></i> ${exercise.difficultyText || 'Trung bình'}
                    </span>
                </div>
                <div class="exercise-card-meta">
                    <div class="exercise-meta-item">
                        <i class="fas fa-dumbbell"></i>
                        <span>${exercise.equipment}</span>
                    </div>
                    <div class="exercise-meta-item">
                        <i class="fas fa-fire"></i>
                        <span>${exercise.caloriesPerMinute.toFixed(1)} kcal/phút</span>
                    </div>
                </div>
            </div>
            <div class="exercise-card-actions" onclick="event.stopPropagation();">
                <button class="exercise-action-btn btn-view" onclick="viewExerciseDetail(${exercise.id})" title="Xem chi tiết">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="exercise-action-btn btn-edit-ex" onclick="editExercise(${exercise.id})" title="Chỉnh sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="exercise-action-btn btn-delete" onclick="openDeleteConfirmModal(${exercise.id})" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Load exercise table view
function loadExerciseTableView() {
    const tbody = el('exercise-table-body');
    if (!tbody) return;

    if (isFetchingExercises) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</td></tr>';
        return;
    }

    if (exercisesLoadError) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: #f56565;"><i class="fas fa-exclamation-triangle"></i> ${exercisesLoadError}</td></tr>`;
        return;
    }

    const startIndex = (exerciseCurrentPage - 1) * exerciseItemsPerPage;
    const endIndex = startIndex + exerciseItemsPerPage;
    const paginatedData = filteredExercisesData.slice(startIndex, endIndex);

    if (paginatedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px;">Không có dữ liệu</td></tr>';
        updateExercisePagination();
        return;
    }

    tbody.innerHTML = paginatedData.map(exercise => {
        const difficultyStars = '⭐'.repeat(exercise.difficulty) + '○'.repeat(5 - exercise.difficulty);

        return `
            <tr>
                <td>${exercise.id}</td>
                <td><strong>${exercise.name}</strong></td>
                <td>${exercise.muscleGroup}</td>
                <td>${exercise.difficultyText || 'Trung bình'}</td>
                <td>${exercise.equipment}</td>
                <td>${exercise.caloriesPerMinute.toFixed(1)} kcal</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-view" onclick="viewExerciseDetail(${exercise.id})" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-edit" onclick="editExercise(${exercise.id})" title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="openDeleteConfirmModal(${exercise.id})" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    updateExercisePagination();
}

// Update exercise KPIs
function updateExerciseKPIs() {
    if (exerciseSummary) {
        if (el('total-exercises-kpi')) el('total-exercises-kpi').textContent = exerciseSummary.TotalExercises;
        if (el('avg-difficulty-kpi')) el('avg-difficulty-kpi').textContent = exerciseSummary.AverageDifficulty.toFixed(1);
    } else {
        const total = exercisesData.length;
        const avgDifficulty = exercisesData.length > 0
            ? (exercisesData.reduce((sum, e) => sum + e.difficulty, 0) / exercisesData.length).toFixed(1)
            : 0;

        if (el('total-exercises-kpi')) el('total-exercises-kpi').textContent = total;
        if (el('avg-difficulty-kpi')) el('avg-difficulty-kpi').textContent = avgDifficulty;
    }
}

// Apply filters
function applyExerciseFilters() {
    if (!hasLoadedExercises) {
        return;
    }

    const searchTerm = (el('exercise-search')?.value || '').toLowerCase();
    const muscleGroup = el('filter-muscle-group')?.value || '';
    const difficulty = el('filter-difficulty')?.value || '';
    const equipment = el('filter-equipment')?.value || '';
    
    filteredExercisesData = exercisesData.filter(exercise => {
        const matchesSearch = !searchTerm || exercise.name.toLowerCase().includes(searchTerm);
        const matchesMuscleGroup = !muscleGroup || exercise.muscleGroup === muscleGroup;
        
        // Map difficulty filter value to difficulty number
        let matchesDifficulty = true;
        if (difficulty) {
            const difficultyMap = {
                'Beginner': 2,
                'Intermediate': 3,
                'Advanced': 4
            };
            const targetDifficulty = difficultyMap[difficulty];
            matchesDifficulty = exercise.difficulty === targetDifficulty;
        }
        
        const matchesEquipment = !equipment || exercise.equipment === equipment;

        return matchesSearch && matchesMuscleGroup && matchesDifficulty && matchesEquipment;
    });

    exerciseCurrentPage = 1;
    if (currentExerciseView === 'grid') {
        renderExerciseCards();
    } else {
        loadExerciseTableView();
    }
    updateExerciseKPIs();
}

// Reset filters
function resetExerciseFilters() {
    if (el('exercise-search')) el('exercise-search').value = '';
    if (el('filter-muscle-group')) el('filter-muscle-group').value = '';
    if (el('filter-difficulty')) el('filter-difficulty').value = '';
    if (el('filter-equipment')) el('filter-equipment').value = '';
    applyExerciseFilters();
}

// Helper function to convert YouTube URL to embed URL
function getYouTubeEmbedUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    // Trim whitespace
    url = url.trim();
    if (!url) return null;
    
    // Extract video ID from various YouTube URL formats
    let videoId = null;
    
    // Pattern 1: youtube.com/watch?v=VIDEO_ID
    let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
        videoId = match[1];
    }
    
    // Pattern 2: youtube.com/watch?feature=...&v=VIDEO_ID
    if (!videoId) {
        match = url.match(/youtube\.com\/watch\?.*[&?]v=([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
            videoId = match[1];
        }
    }
    
    // Pattern 3: youtube.com/v/VIDEO_ID
    if (!videoId) {
        match = url.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
            videoId = match[1];
        }
    }
    
    // Pattern 4: youtube.com/embed/VIDEO_ID
    if (!videoId) {
        match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
            videoId = match[1];
        }
    }
    
    // Pattern 5: youtu.be/VIDEO_ID
    if (!videoId) {
        match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
            videoId = match[1];
        }
    }
    
    // Pattern 6: youtube.com/shorts/VIDEO_ID
    if (!videoId) {
        match = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
            videoId = match[1];
        }
    }
    
    // Pattern 7: m.youtube.com/watch?v=VIDEO_ID (mobile)
    if (!videoId) {
        match = url.match(/m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
            videoId = match[1];
        }
    }
    
    // Pattern 8: www.youtube.com/watch?v=VIDEO_ID
    if (!videoId) {
        match = url.match(/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
            videoId = match[1];
        }
    }
    
    // If we found a video ID, return embed URL
    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // If it's already an embed URL, return as is
    if (url.includes('youtube.com/embed/')) {
        return url;
    }
    
    // If no match, return null
    return null;
}

// View exercise detail
async function viewExerciseDetail(exerciseId) {
    if (!exerciseId) return;

    try {
        const detail = await fetchJson(EXERCISE_DETAIL_ENDPOINT(exerciseId));
        if (!detail) {
            showNotification('Không tìm thấy bài tập.', 'error');
            return;
        }

        const exercise = normalizeExercise(detail);
        if (!exercise) return;

        const detailContent = el('exercise-detail-content');
        if (!detailContent) return;

        // Debug: Log video URL
        console.log('📹 Video URL từ API:', exercise.videoUrl);
        console.log('📹 Detail object:', detail);

        const difficultyStars = '⭐'.repeat(exercise.difficulty) + '○'.repeat(5 - exercise.difficulty);
        const embedUrl = getYouTubeEmbedUrl(exercise.videoUrl);
        console.log('📹 Embed URL:', embedUrl);
        const exerciseImage = exercise.imageUrl || 'https://via.placeholder.com/400x300?text=Exercise';

        const headerGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

        detailContent.innerHTML = `
            <div class="exercise-detail-container">
                <!-- Header with Image and Title -->
                <div class="exercise-detail-header" style="background: ${headerGradient};">
                    <div class="exercise-detail-header-image">
                        <img src="${exerciseImage}" alt="${exercise.name}" onerror="this.src='https://via.placeholder.com/400x300?text=Exercise'">
                        <div class="exercise-detail-header-overlay"></div>
                    </div>
                    <div class="exercise-detail-header-content">
                        <div class="exercise-detail-title-section">
                            <h2 class="exercise-detail-title">${exercise.name}</h2>
                        </div>
                        <div class="exercise-detail-quick-info">
                            <div class="quick-info-item">
                                <div class="quick-info-icon" style="background: rgba(255, 255, 255, 0.2);">
                                    <i class="fas fa-fire"></i>
                                </div>
                                <div class="quick-info-content">
                                    <span class="quick-info-label">Nhóm cơ</span>
                                    <span class="quick-info-value">${exercise.muscleGroup}</span>
                                </div>
                            </div>
                            <div class="quick-info-item">
                                <div class="quick-info-icon" style="background: rgba(255, 255, 255, 0.2);">
                                    <i class="fas fa-star"></i>
                                </div>
                                <div class="quick-info-content">
                                    <span class="quick-info-label">Độ khó</span>
                                    <span class="quick-info-value">${difficultyStars}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Video Section -->
                ${exercise.videoUrl ? `
                    <div class="exercise-detail-section exercise-video-section">
                        <div class="section-header">
                            <div class="section-header-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                                <i class="fas fa-video"></i>
                            </div>
                            <h3 class="section-title">Video hướng dẫn</h3>
                        </div>
                        ${embedUrl ? `
                            <div class="video-wrapper-enhanced">
                                <iframe 
                                    src="${embedUrl}" 
                                    frameborder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowfullscreen
                                    class="exercise-video-iframe">
                                </iframe>
                            </div>
                        ` : `
                            <div class="video-link-wrapper-enhanced" style="padding: 20px; text-align: center;">
                                <p style="margin-bottom: 15px; color: var(--text-secondary);">
                                    <i class="fas fa-info-circle"></i> 
                                    Video URL không hợp lệ hoặc không phải YouTube. Vui lòng kiểm tra lại link.
                                </p>
                            </div>
                        `}
                        <div class="video-link-wrapper-enhanced">
                            <a href="${exercise.videoUrl}" target="_blank" class="btn-youtube-link">
                                <i class="fab fa-youtube"></i>
                                <span>Mở trên YouTube</span>
                                <i class="fas fa-external-link-alt"></i>
                            </a>
                        </div>
                    </div>
                ` : ''}

                <!-- Info Cards Grid -->
                <div class="exercise-detail-section">
                    <div class="section-header">
                        <div class="section-header-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <i class="fas fa-info-circle"></i>
                        </div>
                        <h3 class="section-title">Thông tin chi tiết</h3>
                    </div>
                    <div class="exercise-info-cards-grid">
                        <div class="exercise-info-card">
                            <div class="info-card-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                <i class="fas fa-fire"></i>
                            </div>
                            <div class="info-card-content">
                                <span class="info-card-label">Nhóm cơ</span>
                                <span class="info-card-value">${exercise.muscleGroup}</span>
                            </div>
                        </div>
                        <div class="exercise-info-card">
                            <div class="info-card-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                                <i class="fas fa-star"></i>
                            </div>
                            <div class="info-card-content">
                                <span class="info-card-label">Độ khó</span>
                                <span class="info-card-value">${difficultyStars} <small>(${exercise.difficulty}/5)</small></span>
                            </div>
                        </div>
                        <div class="exercise-info-card">
                            <div class="info-card-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                                <i class="fas fa-dumbbell"></i>
                            </div>
                            <div class="info-card-content">
                                <span class="info-card-label">Thiết bị</span>
                                <span class="info-card-value">${exercise.equipment}</span>
                            </div>
                        </div>
                        <div class="exercise-info-card">
                            <div class="info-card-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                                <i class="fas fa-fire"></i>
                            </div>
                            <div class="info-card-content">
                                <span class="info-card-label">Calo/phút</span>
                                <span class="info-card-value">${exercise.caloriesPerMinute.toFixed(1)} <small>kcal</small></span>
                            </div>
                        </div>
                        <div class="exercise-info-card">
                            <div class="info-card-icon" style="background: linear-gradient(135deg, #30cfd0 0%, #330867 100%);">
                                <i class="fas fa-calendar"></i>
                            </div>
                            <div class="info-card-content">
                                <span class="info-card-label">Ngày tạo</span>
                                <span class="info-card-value">${new Date(exercise.createdAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                        </div>
                        <div class="exercise-info-card">
                            <div class="info-card-icon" style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);">
                                <i class="fas fa-chart-line"></i>
                            </div>
                            <div class="info-card-content">
                                <span class="info-card-label">Số lần sử dụng</span>
                                <span class="info-card-value">${exercise.timesUsed || 0} <small>lần</small></span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Description Section -->
                ${exercise.description ? `
                    <div class="exercise-detail-section exercise-description-section">
                        <div class="section-header">
                            <div class="section-header-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                                <i class="fas fa-info-circle"></i>
                            </div>
                            <h3 class="section-title">Mô tả</h3>
                        </div>
                        <div class="description-box">
                            <p>${exercise.description}</p>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Instructions Section -->
                ${exercise.instructions ? `
                    <div class="exercise-detail-section exercise-instructions-section">
                        <div class="section-header">
                            <div class="section-header-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                                <i class="fas fa-list-ol"></i>
                            </div>
                            <h3 class="section-title">Hướng dẫn thực hiện</h3>
                        </div>
                        <div class="instructions-box">
                            <div class="instructions-content">${exercise.instructions.split('\n').map((step, idx) => 
                                `<div class="instruction-step">
                                    <div class="step-number">${idx + 1}</div>
                                    <div class="step-content">${step.trim()}</div>
                                </div>`
                            ).join('')}</div>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Warnings Section -->
                ${exercise.warnings ? `
                    <div class="exercise-detail-section exercise-warnings-section">
                        <div class="section-header">
                            <div class="section-header-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <h3 class="section-title">Cảnh báo</h3>
                        </div>
                        <div class="warning-box-enhanced">
                            <div class="warning-icon">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <div class="warning-content">
                                <p>${exercise.warnings}</p>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        // Set edit button handler
        const editBtn = el('btn-edit-exercise-from-detail');
        if (editBtn) {
            editBtn.onclick = () => {
                closeExerciseDetailModal();
                editExercise(exerciseId);
            };
        }

        openModal('modal-exercise-detail');
    } catch (error) {
        console.error('❌ Không thể tải chi tiết bài tập:', error);
        showNotification(error.message || 'Không thể tải chi tiết bài tập.', 'error');
    }
}

// Edit exercise
function editExercise(exerciseId) {
    if (!exerciseId) {
        // Create new
        resetExerciseFormState();
        if (el('exercise-form-title')) el('exercise-form-title').textContent = 'Thêm bài tập mới';
        openModal('modal-exercise-form');
        return;
    }

    const exercise = exercisesData.find(e => e.id === exerciseId);
    if (!exercise) {
        showNotification('Không tìm thấy bài tập.', 'error');
        return;
    }

    currentExerciseId = exerciseId;
    if (el('exercise-form-title')) el('exercise-form-title').textContent = 'Chỉnh sửa bài tập';
    if (el('exercise-id')) el('exercise-id').value = exercise.id;
    if (el('exercise-name')) el('exercise-name').value = exercise.name;
    if (el('exercise-muscle-group-form')) el('exercise-muscle-group-form').value = exercise.muscleGroup;
    if (el('exercise-difficulty')) el('exercise-difficulty').value = exercise.difficulty.toString();
    if (el('exercise-equipment')) el('exercise-equipment').value = exercise.equipment;
    if (el('exercise-calories')) el('exercise-calories').value = exercise.caloriesPerMinute;
    if (el('exercise-image')) el('exercise-image').value = exercise.imageUrl || '';
    if (el('exercise-video')) el('exercise-video').value = exercise.videoUrl || '';
    if (el('exercise-warnings')) el('exercise-warnings').value = exercise.warnings || '';
    if (el('exercise-instructions')) el('exercise-instructions').value = exercise.instructions || '';
    if (el('exercise-description')) el('exercise-description').value = exercise.description || '';
    const deleteBtn = el('btn-delete-exercise');
    if (deleteBtn) {
        deleteBtn.style.display = 'block';
        deleteBtn.dataset.exerciseId = exerciseId;
    }

    openModal('modal-exercise-form');
}

// Save exercise
async function saveExercise(event) {
    event.preventDefault();
    if (isSavingExercise) return;

    try {
        const formData = getExerciseFormData();
        validateExerciseFormData(formData);

        isSavingExercise = true;
        setExerciseFormLoading(true);

        if (currentExerciseId) {
            // Update
            const updated = await fetchJson(
                `${EXERCISE_BASE_ENDPOINT}/${currentExerciseId}`,
                buildJsonOptions('PUT', formData),
                'Không thể cập nhật bài tập.'
            );
            
            if (updated) {
                showNotification('Cập nhật bài tập thành công!', 'success');
                await refreshExercisesAfterMutation();
                closeExerciseModal();
            }
        } else {
            // Create
            const created = await fetchJson(
                EXERCISE_BASE_ENDPOINT,
                buildJsonOptions('POST', formData),
                'Không thể tạo bài tập.'
            );
            
            if (created) {
                showNotification('Tạo bài tập thành công!', 'success');
                await refreshExercisesAfterMutation();
                closeExerciseModal();
            }
        }
    } catch (error) {
        console.error('❌ Lỗi khi lưu bài tập:', error);
        showNotification(error.message || 'Không thể lưu bài tập.', 'error');
    } finally {
        isSavingExercise = false;
        setExerciseFormLoading(false);
    }
}

// Pagination
function updateExercisePagination() {
    const pagination = el('exercise-pagination');
    if (!pagination) return;

    const totalPages = Math.ceil(filteredExercisesData.length / exerciseItemsPerPage);
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '<div class="pagination-controls">';
    html += `<button class="pagination-btn" onclick="goToExercisePage(${exerciseCurrentPage - 1})" 
                     ${exerciseCurrentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
             </button>`;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= exerciseCurrentPage - 2 && i <= exerciseCurrentPage + 2)) {
            html += `<button class="pagination-btn ${i === exerciseCurrentPage ? 'active' : ''}" 
                             onclick="goToExercisePage(${i})">${i}</button>`;
        } else if (i === exerciseCurrentPage - 3 || i === exerciseCurrentPage + 3) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
    }

    html += `<button class="pagination-btn" onclick="goToExercisePage(${exerciseCurrentPage + 1})" 
                     ${exerciseCurrentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
             </button>`;
    html += '</div>';

    pagination.innerHTML = html;
}

function goToExercisePage(page) {
    const totalPages = Math.ceil(filteredExercisesData.length / exerciseItemsPerPage);
    if (page < 1 || page > totalPages) return;
    exerciseCurrentPage = page;
    if (currentExerciseView === 'grid') {
        renderExerciseCards();
    } else {
        loadExerciseTableView();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// View toggle
function attachExerciseViewToggle() {
    const toggleBtns = document.querySelectorAll('#exercises .view-toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            toggleBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentExerciseView = view;

            const cardsView = el('exercises-cards-view');
            const tableView = el('exercises-table-view');

            if (view === 'grid') {
                if (cardsView) cardsView.style.display = 'block';
                if (tableView) tableView.style.display = 'none';
                renderExerciseCards();
            } else {
                if (cardsView) cardsView.style.display = 'none';
                if (tableView) tableView.style.display = 'block';
                loadExerciseTableView();
            }
        });
    });
}

// Modal functions
function closeExerciseModal() {
    closeModal('modal-exercise-form');
    resetExerciseFormState();
}

function closeExerciseDetailModal() {
    closeModal('modal-exercise-detail');
}

// Load muscle groups and equipment from server
async function loadMuscleGroupsAndEquipment() {
    try {
        // Load muscle groups
        const muscleGroupsResponse = await fetch(EXERCISE_MUSCLE_GROUPS_ENDPOINT, {
            headers: { 'Accept': 'application/json' }
        });
        if (muscleGroupsResponse.ok) {
            muscleGroupsList = await muscleGroupsResponse.json();
            populateMuscleGroupSelects();
        }

        // Load equipment
        const equipmentResponse = await fetch(EXERCISE_EQUIPMENT_ENDPOINT, {
            headers: { 'Accept': 'application/json' }
        });
        if (equipmentResponse.ok) {
            equipmentList = await equipmentResponse.json();
            populateEquipmentSelects();
        }
    } catch (error) {
        console.error('❌ Không thể tải danh sách nhóm cơ và thiết bị:', error);
    }
}

// Populate muscle group selects
function populateMuscleGroupSelects() {
    const filterSelect = el('filter-muscle-group');
    const formSelect = el('exercise-muscle-group-form');
    
    const populateSelect = (select) => {
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="">' + (select === filterSelect ? 'Tất cả' : 'Chọn nhóm cơ...') + '</option>';
        muscleGroupsList.forEach(mg => {
            const option = document.createElement('option');
            option.value = mg;
            option.textContent = mg;
            select.appendChild(option);
        });
        if (currentValue) {
            select.value = currentValue;
        }
    };

    populateSelect(filterSelect);
    populateSelect(formSelect);
}

// Populate equipment selects
function populateEquipmentSelects() {
    const filterSelect = el('filter-equipment');
    const formSelect = el('exercise-equipment');
    
    const populateSelect = (select) => {
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="">' + (select === filterSelect ? 'Tất cả' : 'Chọn thiết bị...') + '</option>';
        equipmentList.forEach(eq => {
            const option = document.createElement('option');
            option.value = eq;
            option.textContent = eq;
            select.appendChild(option);
        });
        if (currentValue) {
            select.value = currentValue;
        }
    };

    populateSelect(filterSelect);
    populateSelect(formSelect);
}

// Initialize Exercises Module
async function initializeExercises() {
    console.log('💪 Initializing Exercises module...');
    
    // Load muscle groups and equipment first
    await loadMuscleGroupsAndEquipment();
    
    // Setup add button
    const addBtn = el('btn-add-exercise');
    if (addBtn) {
        addBtn.addEventListener('click', () => editExercise(null));
    }

    // Setup delete button
    const deleteBtn = el('btn-delete-exercise');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const exerciseId = deleteBtn.dataset.exerciseId;
            if (exerciseId) {
                openDeleteConfirmModal(Number(exerciseId));
            }
        });
    }

    // Setup form submit
    const form = el('exercise-form');
    if (form) {
        form.addEventListener('submit', saveExercise);
    }

    // Setup view toggle
    attachExerciseViewToggle();

    // Setup apply filter button (manual filter application)
    const applyFilterBtn = el('btn-apply-exercise-filter');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', applyExerciseFilters);
    }

    // Load data from server
    await loadExercisesFromServer();
    
    console.log('✅ Exercises module initialized');
}

// Delete confirmation modal
function openDeleteConfirmModal(exerciseId) {
    pendingDeleteExerciseId = exerciseId;
    const modal = el('modal-delete-exercise-confirm');
    if (modal) {
        openModal('modal-delete-exercise-confirm');
    }
}

function closeDeleteConfirmModal() {
    if (isDeletingExercise) {
        return; // Prevent closing while deleting
    }
    pendingDeleteExerciseId = null;
    setDeleteConfirmButtonLoading(false);
    const modal = el('modal-delete-exercise-confirm');
    if (modal) {
        closeModal('modal-delete-exercise-confirm');
    }
}

function setDeleteConfirmButtonLoading(isLoading) {
    const confirmBtn = el('btn-confirm-delete-exercise');
    const cancelBtn = el('btn-cancel-delete-exercise');
    
    if (confirmBtn) {
        confirmBtn.disabled = isLoading;
        confirmBtn.innerHTML = isLoading
            ? '<i class="fas fa-spinner fa-spin"></i> Đang xóa...'
            : '<i class="fas fa-trash"></i> Có, xóa bài tập';
    }
    if (cancelBtn) {
        cancelBtn.disabled = isLoading;
    }
}

async function confirmDeleteExercise() {
    if (!pendingDeleteExerciseId || isDeletingExercise) {
        return;
    }

    try {
        isDeletingExercise = true;
        setDeleteConfirmButtonLoading(true);

        await fetchJson(
            `${EXERCISE_BASE_ENDPOINT}/${pendingDeleteExerciseId}`,
            { method: 'DELETE' },
            'Không thể xóa bài tập.'
        );

        showNotification('Xóa bài tập thành công!', 'success');
        closeDeleteConfirmModal();
        await refreshExercisesAfterMutation();
    } catch (error) {
        console.error('❌ Lỗi khi xóa bài tập:', error);
        showNotification(error.message || 'Không thể xóa bài tập.', 'error');
    } finally {
        isDeletingExercise = false;
        setDeleteConfirmButtonLoading(false);
    }
}

// Export for global access
window.initializeExercises = initializeExercises;
window.viewExerciseDetail = viewExerciseDetail;
window.editExercise = editExercise;
window.saveExercise = saveExercise;
window.resetExerciseFilters = resetExerciseFilters;
window.goToExercisePage = goToExercisePage;
window.closeExerciseModal = closeExerciseModal;
window.closeExerciseDetailModal = closeExerciseDetailModal;
window.openDeleteConfirmModal = openDeleteConfirmModal;
window.closeDeleteConfirmModal = closeDeleteConfirmModal;
window.confirmDeleteExercise = confirmDeleteExercise;
window.confirmDeleteExercise = confirmDeleteExercise;