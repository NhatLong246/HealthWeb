// Nutrition Management JavaScript

const NUTRITION_BASE_ENDPOINT = '/Admin/QuanLiDinhDuong';
const NUTRITION_DATA_ENDPOINT = `${NUTRITION_BASE_ENDPOINT}/Data`;
const NUTRITION_DETAIL_ENDPOINT = foodId => `${NUTRITION_BASE_ENDPOINT}/${encodeURIComponent(foodId)}/Detail`;

// State Management
let foodsData = [];
let filteredFoodsData = [];
let nutritionSummary = null;
let currentFoodPage = 1;
const foodsPerPage = 12;
let isFetchingFoods = false;
let foodsLoadError = null;
let hasLoadedFoods = false;
let filtersDirty = false;
let lastAppliedFilters = null;
let currentEditingFoodId = null;
let isSavingFood = false;
let isDeletingFood = false;

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

async function refreshFoodsAfterMutation() {
    const pendingFiltersDirty = filtersDirty;
    const criteriaToReapply = lastAppliedFilters ? { ...lastAppliedFilters } : null;

    await loadFoodsFromServer(true);

    if (criteriaToReapply) {
        applyFilters(criteriaToReapply, false);
    }

    filtersDirty = pendingFiltersDirty;
    updateApplyButtonState();
}

function setFoodFormLoading(isLoading, loadingLabel = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...') {
    const form = el('food-form');
    if (!form) return;

    form.querySelectorAll('input, select, textarea').forEach(input => {
        input.disabled = isLoading;
    });

    const saveBtn = el('btn-save-food');
    if (saveBtn) {
        saveBtn.disabled = isLoading;
        saveBtn.innerHTML = isLoading
            ? loadingLabel
            : '<i class="fas fa-save"></i> Lưu món ăn';
    }

    const cancelBtn = form.querySelector('.btn-cancel');
    if (cancelBtn) {
        cancelBtn.disabled = isLoading;
    }
}

function setDeleteButtonLoading(isLoading) {
    const deleteBtn = el('btn-delete-food');
    if (!deleteBtn || deleteBtn.style.display === 'none') return;

    deleteBtn.disabled = isLoading;
    deleteBtn.innerHTML = isLoading
        ? '<i class="fas fa-spinner fa-spin"></i> Đang xóa...'
        : '<i class="fas fa-trash"></i> Xóa';
}

function resetFoodFormState() {
    currentEditingFoodId = null;
    const deleteBtn = el('btn-delete-food');
    if (deleteBtn) {
        deleteBtn.style.display = 'none';
        deleteBtn.dataset.foodId = '';
        setDeleteButtonLoading(false);
    }
    setFoodFormLoading(false);
    const form = el('food-form');
    if (form) {
        form.reset();
    }
    // Đảm bảo reset cả số lượng
    if (el('food-unit-quantity')) {
        el('food-unit-quantity').value = '';
    }
    if (el('food-form-title')) {
        el('food-form-title').textContent = 'Thêm món ăn mới';
    }
}

function getFoodFormData() {
    const quantity = (el('food-unit-quantity')?.value || '').trim();
    const unit = (el('food-unit')?.value || '').trim();
    
    // Kết hợp số lượng và đơn vị
    let combinedUnit = '';
    if (quantity && unit) {
        combinedUnit = `${quantity}${unit}`;
    } else if (unit) {
        combinedUnit = unit;
    } else if (quantity) {
        combinedUnit = quantity;
    }
    
    return {
        name: (el('food-name')?.value || '').trim(),
        unit: combinedUnit,
        imageUrl: (el('food-image')?.value || '').trim() || null,
        calories: Number(el('food-calories')?.value || 0),
        protein: Number(el('food-protein')?.value || 0),
        fat: Number(el('food-fat')?.value || 0),
        carb: Number(el('food-carb')?.value || 0)
    };
}

function validateFoodFormData(data) {
    if (!data.name) {
        throw new Error('Vui lòng nhập tên món ăn.');
    }
    const unitSelect = el('food-unit');
    if (!unitSelect || !unitSelect.value) {
        throw new Error('Vui lòng chọn đơn vị.');
    }
    if (Number.isNaN(data.calories) || data.calories < 0) {
        throw new Error('Lượng calo không hợp lệ.');
    }
    if (Number.isNaN(data.protein) || data.protein < 0) {
        throw new Error('Protein không hợp lệ.');
    }
    if (Number.isNaN(data.fat) || data.fat < 0) {
        throw new Error('Chất béo không hợp lệ.');
    }
    if (Number.isNaN(data.carb) || data.carb < 0) {
        throw new Error('Carb không hợp lệ.');
    }
}

function getFilterCriteriaFromInputs() {
    const parseNumber = value => {
        const numeric = parseFloat(value);
        return Number.isNaN(numeric) ? 0 : numeric;
    };

    return {
        search: (el('food-search')?.value || '').trim(),
        unit: (el('filter-unit')?.value || '').trim(),
        caloriesMin: parseNumber(el('filter-calories-min')?.value),
        proteinMin: parseNumber(el('filter-protein-min')?.value),
        fatMin: parseNumber(el('filter-fat-min')?.value),
        carbMin: parseNumber(el('filter-carb-min')?.value)
    };
}

function applyFilters(criteria, markAsApplied = true) {
    if (!hasLoadedFoods) {
        return;
    }

    const normalized = {
        search: (criteria.search ?? '').toLowerCase(),
        unit: (criteria.unit ?? '').toLowerCase(),
        caloriesMin: Number(criteria.caloriesMin ?? 0) || 0,
        proteinMin: Number(criteria.proteinMin ?? 0) || 0,
        fatMin: Number(criteria.fatMin ?? 0) || 0,
        carbMin: Number(criteria.carbMin ?? 0) || 0
    };

    filteredFoodsData = foodsData.filter(food => {
        const matchSearch = !normalized.search || (food.TenMonAn ?? '').toLowerCase().includes(normalized.search);
        const matchUnit = !normalized.unit || (food.DonViTinh ?? '').toLowerCase().includes(normalized.unit);
        const matchCalories = (food.LuongCalo ?? 0) >= normalized.caloriesMin;
        const matchProtein = (food.Protein ?? 0) >= normalized.proteinMin;
        const matchFat = (food.ChatBeo ?? 0) >= normalized.fatMin;
        const matchCarb = (food.Carbohydrate ?? 0) >= normalized.carbMin;

        return matchSearch && matchUnit && matchCalories && matchProtein && matchFat && matchCarb;
    });

    currentFoodPage = 1;

    const viewMode = document.querySelector('#nutrition .view-toggle-btn.active')?.dataset.view || 'grid';
    if (viewMode === 'grid') {
        renderFoodCards();
    } else {
        loadFoodTableView();
    }

    updateFoodKPIs();

    if (markAsApplied) {
        lastAppliedFilters = { ...normalized };
        filtersDirty = false;
    }

    updateApplyButtonState();
}

function normalizeFood(raw) {
    if (!raw) return null;
    return {
        MonAnID: raw.foodId ?? raw.MonAnID ?? '',
        TenMonAn: raw.name ?? raw.TenMonAn ?? 'Không xác định',
        DonViTinh: raw.unit ?? raw.DonViTinh ?? '-',
        HinhAnh: raw.imageUrl ?? raw.HinhAnh ?? null,
        LuongCalo: Number(raw.calories ?? raw.LuongCalo ?? 0),
        Protein: Number(raw.protein ?? raw.Protein ?? 0),
        ChatBeo: Number(raw.fat ?? raw.ChatBeo ?? 0),
        Carbohydrate: Number(raw.carb ?? raw.Carbohydrate ?? 0)
    };
}

function normalizeSummary(raw) {
    if (!raw) return null;
    return {
        TotalFoods: Number(raw.totalFoods ?? 0),
        AverageCalories: Number(raw.averageCalories ?? 0),
        TotalProtein: Number(raw.totalProtein ?? 0),
        TotalFat: Number(raw.totalFat ?? 0),
        TotalCarb: Number(raw.totalCarb ?? 0)
    };
}

async function loadFoodsFromServer(forceReload = false) {
    if (isFetchingFoods && !forceReload) {
        return;
    }

    isFetchingFoods = true;
    foodsLoadError = null;
    renderFoodCards();

    try {
        const response = await fetch(NUTRITION_DATA_ENDPOINT, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Máy chủ phản hồi mã ${response.status}`);
        }

        const payload = await response.json();
        const foodsRaw = Array.isArray(payload?.foods) ? payload.foods : [];
        const summaryRaw = payload?.summary ?? null;

        foodsData = foodsRaw.map(normalizeFood).filter(Boolean);
        filteredFoodsData = [...foodsData];
        nutritionSummary = normalizeSummary(summaryRaw);
        currentFoodPage = 1;
        hasLoadedFoods = true;
        foodsLoadError = null;
        filtersDirty = false;
    } catch (error) {
        console.error('❌ Không thể tải dữ liệu dinh dưỡng:', error);
        foodsLoadError = error?.message ?? 'Không thể tải dữ liệu dinh dưỡng.';
        foodsData = [];
        filteredFoodsData = [];
        nutritionSummary = null;
        hasLoadedFoods = false;
        filtersDirty = false;
    } finally {
        isFetchingFoods = false;
        renderFoodCards();
        updateFoodKPIs();
        loadFoodTableView();
        updateApplyButtonState();
    }
}

function reloadFoodsData() {
    loadFoodsFromServer(true).catch(error => {
        console.error('❌ Không thể tải lại dữ liệu món ăn:', error);
    });
}

// Render food cards
function renderFoodCards() {
    const grid = el('food-cards-grid');
    const emptyState = el('foods-empty-state');
    
    if (!grid) return;

    if (isFetchingFoods) {
        grid.style.display = 'grid';
        grid.innerHTML = `
            <div class="data-loading-state" style="grid-column: 1 / -1;">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Đang tải dữ liệu món ăn...</p>
            </div>`;
        if (emptyState) emptyState.style.display = 'none';
        return;
    }

    if (foodsLoadError) {
        grid.style.display = 'grid';
        grid.innerHTML = `
            <div class="data-error-state" style="grid-column: 1 / -1;">
                <i class="fas fa-triangle-exclamation"></i>
                <p>${foodsLoadError}</p>
                <button class="btn-primary" onclick="reloadFoodsData()">Thử lại</button>
            </div>`;
        if (emptyState) emptyState.style.display = 'none';
        updateFoodPagination();
        return;
    }
    
    const start = (currentFoodPage - 1) * foodsPerPage;
    const end = start + foodsPerPage;
    const paginatedFoods = filteredFoodsData.slice(start, end);
    
    if (paginatedFoods.length === 0) {
        grid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        updateFoodPagination();
        return;
    }
    
    grid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
    
    grid.innerHTML = paginatedFoods.map((food, index) => createFoodCard(food, start + index)).join('');
    updateFoodPagination();
}

// Create food card
function createFoodCard(food, index) {
    const gradients = [
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    ];
    const gradientIndex = index % gradients.length;
    const cardGradient = gradients[gradientIndex];
    
    return `
        <div class="food-card-enhanced" data-food-id="${food.MonAnID}" style="animation-delay: ${index * 0.05}s;">
            <div class="food-card-image-container">
                ${food.HinhAnh ? 
                    `<img src="${food.HinhAnh}" alt="${food.TenMonAn}" class="food-card-image" loading="lazy" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">` 
                    : ''
                }
                <div class="food-card-image-fallback" style="background: ${cardGradient}; display: ${food.HinhAnh ? 'none' : 'flex'};">
                    <i class="fas fa-utensils"></i>
                </div>
                <div class="food-card-overlay-gradient"></div>
                <div class="food-card-unit-badge">
                    <i class="fas fa-weight"></i>
                    <span>${food.DonViTinh}</span>
                </div>
            </div>
            
            <div class="food-card-body">
                <h3 class="food-card-title">${food.TenMonAn}</h3>
                
                <div class="food-nutrition-grid">
                    <div class="nutrition-item nutrition-calories" data-animation-delay="0.1s">
                        <div class="nutrition-icon-wrapper">
                            <i class="fas fa-fire nutrition-icon"></i>
                        </div>
                        <div class="nutrition-content">
                            <div class="nutrition-value">${food.LuongCalo}</div>
                            <div class="nutrition-label">kcal</div>
                        </div>
                    </div>
                    
                    <div class="nutrition-item nutrition-protein" data-animation-delay="0.2s">
                        <div class="nutrition-icon-wrapper">
                            <i class="fas fa-drumstick-bite nutrition-icon"></i>
                        </div>
                        <div class="nutrition-content">
                            <div class="nutrition-value">${food.Protein}</div>
                            <div class="nutrition-label">Protein</div>
                        </div>
                    </div>
                    
                    <div class="nutrition-item nutrition-fat" data-animation-delay="0.3s">
                        <div class="nutrition-icon-wrapper">
                            <i class="fas fa-bacon nutrition-icon"></i>
                        </div>
                        <div class="nutrition-content">
                            <div class="nutrition-value">${food.ChatBeo}</div>
                            <div class="nutrition-label">Fat</div>
                        </div>
                    </div>
                    
                    <div class="nutrition-item nutrition-carb" data-animation-delay="0.4s">
                        <div class="nutrition-icon-wrapper">
                            <i class="fas fa-bread-slice nutrition-icon"></i>
                        </div>
                        <div class="nutrition-content">
                            <div class="nutrition-value">${food.Carbohydrate}</div>
                            <div class="nutrition-label">Carb</div>
                        </div>
                    </div>
                </div>
                
                <div class="food-card-actions">
                    <button class="food-action-btn btn-view-food" onclick="viewFoodDetail('${food.MonAnID}')" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                        <span>Xem</span>
                    </button>
                    <button class="food-action-btn btn-edit-food" onclick="editFood('${food.MonAnID}')" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                        <span>Sửa</span>
                    </button>
                    <button class="food-action-btn btn-remove-food" onclick="deleteFood('${food.MonAnID}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                        <span>Xóa</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Load food table view
function loadFoodTableView() {
    const tbody = el('food-table-body');
    if (!tbody) return;
    
    if (isFetchingFoods) {
        tbody.innerHTML = `<tr><td colspan="9" class="table-loading">Đang tải dữ liệu...</td></tr>`;
        return;
    }

    if (foodsLoadError) {
        tbody.innerHTML = `<tr><td colspan="9" class="table-error">${foodsLoadError}</td></tr>`;
        return;
    }
    
    const start = (currentFoodPage - 1) * foodsPerPage;
    const end = start + foodsPerPage;
    const paginatedFoods = filteredFoodsData.slice(start, end);
    
    if (paginatedFoods.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="table-empty">Không có dữ liệu món ăn.</td></tr>`;
        return;
    }

    tbody.innerHTML = paginatedFoods.map(food => `
        <tr>
            <td>${food.MonAnID}</td>
            <td><strong>${food.TenMonAn}</strong></td>
            <td>${food.DonViTinh}</td>
            <td>${food.LuongCalo}</td>
            <td>${food.Protein}</td>
            <td>${food.ChatBeo}</td>
            <td>${food.Carbohydrate}</td>
            <td>
                ${food.HinhAnh ? 
                    `<img src="${food.HinhAnh}" alt="${food.TenMonAn}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" onerror="this.style.display='none';">` 
                    : '<i class="fas fa-image" style="color: #ccc;"></i>'
                }
            </td>
            <td>
                <button class="btn-card-action edit" onclick="viewFoodDetail('${food.MonAnID}')" title="Xem chi tiết">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-card-action edit" onclick="editFood('${food.MonAnID}')" title="Chỉnh sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-card-action delete" onclick="deleteFood('${food.MonAnID}')" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    updateFoodPagination();
}

// Update food count
function updateFoodCount() {
    const summary = nutritionSummary ?? {
        TotalFoods: foodsData.length
    };
    
    if (el('total-foods-kpi')) el('total-foods-kpi').textContent = summary.TotalFoods ?? 0;
}

// Update food KPIs
function updateFoodKPIs() {
    updateFoodCount();

    const summary = nutritionSummary ?? {
        AverageCalories: foodsData.length ? foodsData.reduce((sum, f) => sum + f.LuongCalo, 0) / foodsData.length : 0
    };

    if (el('avg-calories-kpi')) {
        el('avg-calories-kpi').textContent = Math.round(summary.AverageCalories ?? 0);
    }
}

// Apply food filters
function applyFoodFilters() {
    if (!hasLoadedFoods) {
        return;
    }

    const criteria = getFilterCriteriaFromInputs();
    applyFilters(criteria, true);
}

// Reset food filters
function resetFoodFilters() {
    if (el('food-search')) el('food-search').value = '';
    if (el('filter-unit')) el('filter-unit').value = '';
    if (el('filter-calories-min')) el('filter-calories-min').value = '';
    if (el('filter-protein-min')) el('filter-protein-min').value = '';
    if (el('filter-fat-min')) el('filter-fat-min').value = '';
    if (el('filter-carb-min')) el('filter-carb-min').value = '';
    
    applyFoodFilters();
}

function calculatePercentage(value, food) {
    const total = (food.Protein ?? 0) + (food.ChatBeo ?? 0) + (food.Carbohydrate ?? 0);
    return total > 0 ? Math.round((value / total) * 100) : 0;
}

// View food detail
async function viewFoodDetail(foodId) {
    const fallback = foodsData.find(f => f.MonAnID === foodId);
    if (!fallback) {
        showNotification('Không tìm thấy món ăn', 'error');
        return;
    }
    
    let detail = null;
    try {
        const response = await fetch(NUTRITION_DETAIL_ENDPOINT(foodId), {
            headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
            detail = await response.json();
        }
    } catch (error) {
        console.warn('⚠️ Không thể tải chi tiết món ăn, sử dụng dữ liệu cục bộ.', error);
    }

    const proteinPercent = detail?.proteinPercentage ?? detail?.ProteinPercentage ?? calculatePercentage(fallback.Protein, fallback);
    const fatPercent = detail?.fatPercentage ?? detail?.FatPercentage ?? calculatePercentage(fallback.ChatBeo, fallback);
    const carbPercent = detail?.carbPercentage ?? detail?.CarbPercentage ?? calculatePercentage(fallback.Carbohydrate, fallback);
    
    const content = el('food-detail-content');
    if (!content) return;
    
    content.innerHTML = `
        <div class="food-detail-container">
            <!-- Hero Section with Image -->
            <div class="food-detail-hero">
                <div class="food-detail-image-wrapper">
                    ${fallback.HinhAnh ? 
                        `<img src="${fallback.HinhAnh}" alt="${fallback.TenMonAn}" class="food-detail-image" loading="lazy">` 
                        : `<div class="food-detail-image-placeholder">
                            <i class="fas fa-utensils"></i>
                        </div>`
                    }
                    <div class="food-detail-image-overlay"></div>
                </div>
                
                <div class="food-detail-header">
                    <div class="food-detail-title-section">
                        <h1 class="food-detail-title">${fallback.TenMonAn}</h1>
                        <div class="food-detail-id">
                            <i class="fas fa-hashtag"></i>
                            <span>ID: ${fallback.MonAnID}</span>
                        </div>
                    </div>
                    
                    <div class="food-detail-quick-stats">
                        <div class="quick-stat-card">
                            <div class="quick-stat-icon calories-icon">
                                <i class="fas fa-fire"></i>
                            </div>
                            <div class="quick-stat-content">
                                <div class="quick-stat-value">${fallback.LuongCalo}</div>
                                <div class="quick-stat-label">kcal</div>
                            </div>
                        </div>
                        <div class="quick-stat-card">
                            <div class="quick-stat-icon unit-icon">
                                <i class="fas fa-weight"></i>
                            </div>
                            <div class="quick-stat-content">
                                <div class="quick-stat-value">${fallback.DonViTinh}</div>
                                <div class="quick-stat-label">Đơn vị</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Nutrition Details Section -->
            <div class="food-detail-nutrition">
                <div class="food-detail-section-header">
                    <div class="section-header-icon-wrapper">
                        <i class="fas fa-chart-pie"></i>
                    </div>
                    <h2 class="section-title">Thông tin dinh dưỡng chi tiết</h2>
                </div>
                
                <!-- Macro Nutrients Grid -->
                <div class="food-nutrition-detail-grid">
                    <div class="nutrition-detail-card calories-card" data-animation-delay="0.1s">
                        <div class="nutrition-detail-icon-wrapper">
                            <div class="nutrition-detail-icon calories-icon-bg">
                                <i class="fas fa-fire"></i>
                            </div>
                            <div class="nutrition-detail-pulse"></div>
                        </div>
                        <div class="nutrition-detail-content">
                            <div class="nutrition-detail-label">Lượng calo</div>
                            <div class="nutrition-detail-value">${fallback.LuongCalo}</div>
                            <div class="nutrition-detail-unit">kcal</div>
                            <div class="nutrition-detail-description">Năng lượng cung cấp</div>
                        </div>
                    </div>
                    
                    <div class="nutrition-detail-card protein-card" data-animation-delay="0.2s">
                        <div class="nutrition-detail-icon-wrapper">
                            <div class="nutrition-detail-icon protein-icon-bg">
                                <i class="fas fa-drumstick-bite"></i>
                            </div>
                            <div class="nutrition-detail-pulse"></div>
                        </div>
                        <div class="nutrition-detail-content">
                            <div class="nutrition-detail-label">Protein</div>
                            <div class="nutrition-detail-value">${fallback.Protein}</div>
                            <div class="nutrition-detail-unit">gram</div>
                            <div class="nutrition-detail-description">${proteinPercent}% tổng macro</div>
                        </div>
                    </div>
                    
                    <div class="nutrition-detail-card fat-card" data-animation-delay="0.3s">
                        <div class="nutrition-detail-icon-wrapper">
                            <div class="nutrition-detail-icon fat-icon-bg">
                                <i class="fas fa-bacon"></i>
                            </div>
                            <div class="nutrition-detail-pulse"></div>
                        </div>
                        <div class="nutrition-detail-content">
                            <div class="nutrition-detail-label">Chất béo</div>
                            <div class="nutrition-detail-value">${fallback.ChatBeo}</div>
                            <div class="nutrition-detail-unit">gram</div>
                            <div class="nutrition-detail-description">${fatPercent}% tổng macro</div>
                        </div>
                    </div>
                    
                    <div class="nutrition-detail-card carb-card" data-animation-delay="0.4s">
                        <div class="nutrition-detail-icon-wrapper">
                            <div class="nutrition-detail-icon carb-icon-bg">
                                <i class="fas fa-bread-slice"></i>
                            </div>
                            <div class="nutrition-detail-pulse"></div>
                        </div>
                        <div class="nutrition-detail-content">
                            <div class="nutrition-detail-label">Carbohydrate</div>
                            <div class="nutrition-detail-value">${fallback.Carbohydrate}</div>
                            <div class="nutrition-detail-unit">gram</div>
                            <div class="nutrition-detail-description">${carbPercent}% tổng macro</div>
                        </div>
                    </div>
                </div>
                
                <!-- Macro Breakdown Chart -->
                <div class="food-macro-breakdown">
                    <div class="macro-breakdown-header">
                        <h3 class="macro-breakdown-title">
                            <i class="fas fa-chart-pie"></i>
                            Phân bổ Macro
                        </h3>
                    </div>
                    <div class="macro-breakdown-content">
                        <div class="macro-breakdown-bar">
                            <div class="macro-bar-segment protein-segment" style="width: ${proteinPercent}%"></div>
                            <div class="macro-bar-segment fat-segment" style="width: ${fatPercent}%"></div>
                            <div class="macro-bar-segment carb-segment" style="width: ${carbPercent}%"></div>
                        </div>
                        <div class="macro-breakdown-legend">
                            <div class="macro-legend-item">
                                <span class="legend-color protein-color"></span>
                                <span>Protein: ${fallback.Protein}g (${proteinPercent}%)</span>
                            </div>
                            <div class="macro-legend-item">
                                <span class="legend-color fat-color"></span>
                                <span>Fat: ${fallback.ChatBeo}g (${fatPercent}%)</span>
                            </div>
                            <div class="macro-legend-item">
                                <span class="legend-color carb-color"></span>
                                <span>Carb: ${fallback.Carbohydrate}g (${carbPercent}%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Setup edit button
    const editBtn = el('btn-edit-food-from-detail');
    if (editBtn) {
        editBtn.onclick = () => {
            closeFoodDetailModal();
            setTimeout(() => editFood(foodId), 300);
        };
    }
    
    openModal('modal-food-detail');
}

// Parse unit string to extract quantity and unit
function parseUnitString(unitString) {
    if (!unitString || typeof unitString !== 'string') {
        return { quantity: '', unit: '' };
    }
    
    const trimmed = unitString.trim();
    
    // Tìm số ở đầu chuỗi (có thể có dấu cách sau số)
    // Pattern: số (có thể có dấu chấm thập phân) + khoảng trắng tùy chọn + đơn vị
    const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
    if (match) {
        const quantity = match[1] || '';
        const unit = (match[2] || '').trim();
        return { quantity, unit };
    }
    
    // Nếu không có số, coi toàn bộ là đơn vị
    return { quantity: '', unit: trimmed };
}

// Edit food (populate form for local preview)
function editFood(foodId) {
    const food = foodId ? foodsData.find(f => f.MonAnID === foodId) : null;
    resetFoodFormState();
    
    const form = el('food-form');
    if (!form) return;
    
    currentEditingFoodId = food ? food.MonAnID : null;
    
    if (food) {
        if (el('food-id')) el('food-id').value = food.MonAnID;
        if (el('food-name')) el('food-name').value = food.TenMonAn;
        
        // Parse DonViTinh để tách số lượng và đơn vị
        const parsed = parseUnitString(food.DonViTinh);
        if (el('food-unit-quantity')) el('food-unit-quantity').value = parsed.quantity;
        if (el('food-unit')) el('food-unit').value = parsed.unit;
        
        if (el('food-calories')) el('food-calories').value = food.LuongCalo;
        if (el('food-protein')) el('food-protein').value = food.Protein;
        if (el('food-fat')) el('food-fat').value = food.ChatBeo;
        if (el('food-carb')) el('food-carb').value = food.Carbohydrate;
        if (el('food-image')) el('food-image').value = food.HinhAnh || '';
        if (el('food-form-title')) el('food-form-title').textContent = 'Chỉnh sửa món ăn';

        const deleteBtn = el('btn-delete-food');
        if (deleteBtn) {
            deleteBtn.style.display = 'inline-flex';
            deleteBtn.dataset.foodId = food.MonAnID;
        }
    } else {
        if (el('food-id')) el('food-id').value = '';
        if (el('food-unit-quantity')) el('food-unit-quantity').value = '';
        if (el('food-unit')) el('food-unit').value = '';
        if (el('food-form-title')) el('food-form-title').textContent = 'Thêm món ăn mới';
    }
    
    setFoodFormLoading(false);
    openModal('modal-food-form');
}

// Save food (create or update)
async function saveFood(event) {
    event.preventDefault();
    if (isSavingFood) return;

    const isEditing = Boolean(currentEditingFoodId);
    const endpoint = isEditing
        ? `${NUTRITION_BASE_ENDPOINT}/${encodeURIComponent(currentEditingFoodId)}`
        : NUTRITION_BASE_ENDPOINT;
    const method = isEditing ? 'PUT' : 'POST';

    try {
        const payload = getFoodFormData();
        validateFoodFormData(payload);

        isSavingFood = true;
        setFoodFormLoading(true);

        await fetchJson(endpoint, buildJsonOptions(method, payload), isEditing ? 'Không thể cập nhật món ăn.' : 'Không thể thêm món ăn.');

        await refreshFoodsAfterMutation();
        showNotification(isEditing ? 'Cập nhật món ăn thành công.' : 'Thêm món ăn thành công.', 'success');
    closeFoodModal();
    } catch (error) {
        console.error('❌ Lưu món ăn thất bại:', error);
        showNotification(error?.message ?? 'Không thể lưu món ăn.', 'error');
        setFoodFormLoading(false);
    } finally {
        isSavingFood = false;
    }
}

// Delete confirmation modal
let pendingDeleteFoodId = null;

function openDeleteConfirmModal(foodId) {
    pendingDeleteFoodId = foodId;
    const modal = el('modal-delete-confirm');
    if (modal) {
        openModal('modal-delete-confirm');
    }
}

function closeDeleteConfirmModal() {
    if (isDeletingFood) {
        return; // Prevent closing while deleting
    }
    pendingDeleteFoodId = null;
    setDeleteConfirmButtonLoading(false);
    const modal = el('modal-delete-confirm');
    if (modal) {
        closeModal('modal-delete-confirm');
    }
}

function setDeleteConfirmButtonLoading(isLoading) {
    const confirmBtn = el('btn-confirm-delete');
    const cancelBtn = el('btn-cancel-delete');
    
    if (confirmBtn) {
        confirmBtn.disabled = isLoading;
        confirmBtn.innerHTML = isLoading
            ? '<i class="fas fa-spinner fa-spin"></i> Đang xóa...'
            : '<i class="fas fa-trash"></i> Có, xóa món ăn';
    }
    
    if (cancelBtn) {
        cancelBtn.disabled = isLoading;
    }
}

async function confirmDeleteFood() {
    if (!pendingDeleteFoodId || isDeletingFood) {
        return;
    }

    const foodId = pendingDeleteFoodId;
    const isEditingCurrent = currentEditingFoodId === foodId;

    try {
        isDeletingFood = true;
        setDeleteConfirmButtonLoading(true);
        
        if (isEditingCurrent) {
            setDeleteButtonLoading(true);
            setFoodFormLoading(true, '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...');
        }

        await fetchJson(
            `${NUTRITION_BASE_ENDPOINT}/${encodeURIComponent(foodId)}`,
            { method: 'DELETE', headers: { Accept: 'application/json' } },
            'Không thể xóa món ăn.'
        );

        closeDeleteConfirmModal();
        showNotification('Đã xóa món ăn.', 'success');

        if (isEditingCurrent) {
            closeFoodModal();
        }

        const detailModal = el('modal-food-detail');
        if (detailModal && detailModal.classList.contains('active')) {
            closeFoodDetailModal();
        }

        await refreshFoodsAfterMutation();
    } catch (error) {
        console.error('❌ Xóa món ăn thất bại:', error);
        showNotification(error?.message ?? 'Không thể xóa món ăn.', 'error');
        setDeleteConfirmButtonLoading(false);
    } finally {
        isDeletingFood = false;
        if (isEditingCurrent) {
            setDeleteButtonLoading(false);
            setFoodFormLoading(false);
        }
    }
}

// Delete food - opens confirmation modal
function deleteFood(foodId) {
    if (!foodId || isDeletingFood) return;
    openDeleteConfirmModal(foodId);
}

// Update food pagination
function updateFoodPagination() {
    const pagination = el('food-pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(filteredFoodsData.length / foodsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = `<button class="pagination-btn" onclick="goToFoodPage(${currentFoodPage - 1})" ${currentFoodPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentFoodPage - 1 && i <= currentFoodPage + 1)) {
            html += `<button class="pagination-btn ${i === currentFoodPage ? 'active' : ''}" onclick="goToFoodPage(${i})">${i}</button>`;
        } else if (i === currentFoodPage - 2 || i === currentFoodPage + 2) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
    }
    
    html += `<button class="pagination-btn" onclick="goToFoodPage(${currentFoodPage + 1})" ${currentFoodPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
    </button>`;
    
    pagination.innerHTML = html;
}

// Go to food page
function goToFoodPage(page) {
    const totalPages = Math.ceil(filteredFoodsData.length / foodsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentFoodPage = page;
    
    const viewMode = document.querySelector('#nutrition .view-toggle-btn.active')?.dataset.view || 'grid';
    if (viewMode === 'grid') {
        renderFoodCards();
    } else {
        loadFoodTableView();
    }
    
    const section = document.getElementById('nutrition');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Attach food view toggle
function attachFoodViewToggle() {
    const toggleBtns = document.querySelectorAll('#nutrition .view-toggle-btn');
    
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            toggleBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const view = this.dataset.view;
            const cardsView = el('foods-cards-view');
            const tableView = el('foods-table-view');
            
            if (view === 'grid') {
                if (cardsView) cardsView.style.display = 'block';
                if (tableView) tableView.style.display = 'none';
                renderFoodCards();
            } else {
                if (cardsView) cardsView.style.display = 'none';
                if (tableView) tableView.style.display = 'block';
                loadFoodTableView();
            }
        });
    });
}

// Close food modal
function closeFoodModal() {
    closeModal('modal-food-form');
    resetFoodFormState();
}

// Close food detail modal
function closeFoodDetailModal() {
    closeModal('modal-food-detail');
}

// Initialize Nutrition Module
async function initializeNutrition() {
    console.log('🥗 Initializing Nutrition module...');
    
    foodsData = [];
    filteredFoodsData = [];
    nutritionSummary = null;
    currentFoodPage = 1;
    hasLoadedFoods = false;
    filtersDirty = false;
    
    // Setup filters
    if (el('food-search')) {
        el('food-search').addEventListener('input', () => {
            markFiltersDirty();
        });
        el('food-search').addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                applyFoodFilters();
            }
        });
    }
    ['filter-unit', 'filter-calories-min', 'filter-protein-min', 'filter-fat-min', 'filter-carb-min'].forEach(id => {
        const elm = el(id);
        if (elm) {
            elm.addEventListener('change', markFiltersDirty);
            if (elm.type === 'number') {
                elm.addEventListener('input', markFiltersDirty);
            }
        }
    });
    const applyBtn = el('btn-apply-food-filter');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            applyFoodFilters();
        });
    }
    
    // Setup add button (placeholder)
    const addBtn = el('btn-add-food');
    if (addBtn) {
        addBtn.addEventListener('click', () => editFood(null));
    }

    const deleteBtn = el('btn-delete-food');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (currentEditingFoodId) {
                deleteFood(currentEditingFoodId);
            }
        });
    }

    // Setup delete confirmation modal
    const confirmDeleteBtn = el('btn-confirm-delete');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            confirmDeleteFood();
        });
    }

    // Close delete modal on overlay click
    const deleteModal = el('modal-delete-confirm');
    if (deleteModal) {
        const overlay = deleteModal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                closeDeleteConfirmModal();
            });
        }
    }
    
    // Setup view toggle
    attachFoodViewToggle();
    
    await loadFoodsFromServer();
    updateApplyButtonState();
    
    console.log('✅ Nutrition module initialized');
}

function markFiltersDirty() {
    filtersDirty = true;
    updateApplyButtonState();
}

function updateApplyButtonState() {
    const applyBtn = el('btn-apply-food-filter');
    if (!applyBtn) return;
    if (!hasLoadedFoods) {
        applyBtn.disabled = true;
        return;
    }
    applyBtn.disabled = !filtersDirty;
}

// Export for global access
window.initializeNutrition = initializeNutrition;
window.viewFoodDetail = viewFoodDetail;
window.editFood = editFood;
window.saveFood = saveFood;
window.deleteFood = deleteFood;
window.closeDeleteConfirmModal = closeDeleteConfirmModal;
window.resetFoodFilters = resetFoodFilters;
window.goToFoodPage = goToFoodPage;
window.closeFoodModal = closeFoodModal;
window.closeFoodDetailModal = closeFoodDetailModal;
window.reloadFoodsData = reloadFoodsData;

