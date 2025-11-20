// Daily Bookings Management JavaScript

let currentBookingId = null;
let currentClientId = null;
let currentGoal = null;
let selectedTemplateIds = []; // Support multiple selection
let templateDetails = {}; // Store set/rep/rest time for each template: { templateId: { sets, reps, restTime } }

// Change date
function changeDate(days) {
    const dateInput = document.getElementById('selectedDate');
    const currentDate = new Date(dateInput.value);
    currentDate.setDate(currentDate.getDate() + days);
    dateInput.value = currentDate.toISOString().split('T')[0];
    loadBookingsForDate();
}

// Go to today
function goToToday() {
    const dateInput = document.getElementById('selectedDate');
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];
    loadBookingsForDate();
}

// Load bookings for selected date
async function loadBookingsForDate() {
    const dateInput = document.getElementById('selectedDate');
    const date = dateInput.value;
    
    // Hiển thị loading state
    const bookingsList = document.getElementById('bookingsList');
    if (bookingsList) {
        bookingsList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>';
    }
    
    try {
        const response = await fetch(`/PT/DailyBookings/Data?date=${encodeURIComponent(date)}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        let result;
        try {
            result = await response.json();
        } catch (jsonError) {
            console.error('Error parsing JSON response:', jsonError);
            const text = await response.text();
            console.error('Response text:', text);
            throw new Error('Không thể parse response từ server');
        }
        
        console.log('API Response:', result);
        console.log('API Response (stringified):', JSON.stringify(result, null, 2));
        
        if (result.success) {
            if (result.data) {
                console.log('Data received:', result.data);
                console.log('Data keys:', Object.keys(result.data));
                console.log('Bookings property:', result.data.bookings);
                console.log('Bookings property (alternative):', result.data.Bookings);
                console.log('Bookings count:', result.data.bookings?.length ?? result.data.Bookings?.length ?? 0);
                
                // Handle both camelCase and PascalCase
                const bookingsData = result.data.bookings || result.data.Bookings || [];
                const templatesData = result.data.availableTemplates || result.data.AvailableTemplates || [];
                const dataToUse = {
                    bookings: Array.isArray(bookingsData) ? bookingsData : [],
                    availableTemplates: Array.isArray(templatesData) ? templatesData : [],
                    templates: Array.isArray(templatesData) ? templatesData : [], // Alias for compatibility
                    selectedDate: result.data.selectedDate || result.data.SelectedDate
                };
                
                // Update global data for use in modal
                window.dailyBookingsData = dataToUse;
                
                console.log('Processed data:', dataToUse);
                updateBookingsList(dataToUse);
            } else {
                console.warn('API returned success but no data');
                if (bookingsList) {
                    bookingsList.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-calendar-times"></i>
                            <p>Không có lịch hẹn nào trong ngày này</p>
                        </div>
                    `;
                }
                if (bookingCount) {
                    bookingCount.textContent = '(0 buổi)';
                }
            }
        } else {
            const errorMsg = result.message || 'Không thể tải dữ liệu';
            console.error('API returned error:', result);
            if (bookingsList) {
                bookingsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>${escapeHtml(errorMsg)}</p>
                    </div>
                `;
            }
            if (bookingCount) {
                bookingCount.textContent = '(0 buổi)';
            }
            showToast(errorMsg, 'error');
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        const errorMsg = 'Có lỗi xảy ra khi tải dữ liệu: ' + error.message;
        if (bookingsList) {
            bookingsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Không thể tải dữ liệu</p>
                </div>
            `;
        }
        showToast('Có lỗi xảy ra khi tải dữ liệu', 'error');
    }
}

// Update bookings list
function updateBookingsList(data) {
    const bookingsList = document.getElementById('bookingsList');
    const bookingCount = document.getElementById('bookingCount');
    
    console.log('updateBookingsList called with:', data);
    console.log('Data type:', typeof data);
    console.log('Data keys:', data ? Object.keys(data) : 'null');
    
    if (!data) {
        console.error('Data is null or undefined');
        if (bookingsList) {
            bookingsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Dữ liệu không hợp lệ</p>
                </div>
            `;
        }
        if (bookingCount) {
            bookingCount.textContent = '(0 buổi)';
        }
        return;
    }
    
    // Handle both camelCase and PascalCase
    const bookings = Array.isArray(data.bookings) ? data.bookings : 
                     Array.isArray(data.Bookings) ? data.Bookings : [];
    
    console.log('Bookings array:', bookings);
    console.log('Bookings length:', bookings.length);
    
    if (bookings.length > 0) {
        console.log('First booking:', bookings[0]);
        console.log('First booking keys:', Object.keys(bookings[0]));
    }
    
    bookingCount.textContent = `(${bookings.length} buổi)`;
    
    if (bookings.length === 0) {
        bookingsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>Không có lịch hẹn nào trong ngày này</p>
            </div>
        `;
        return;
    }
    
    bookingsList.innerHTML = bookings.map(booking => {
        // Handle both camelCase and PascalCase
        const status = booking.status || booking.Status || 'Pending';
        const statusText = status === 'Pending' ? 'Chờ duyệt' : 
                          status === 'Confirmed' ? 'Đã xác nhận' : status;
        
        const startTimeValue = booking.startTime || booking.StartTime;
        const endTimeValue = booking.endTime || booking.EndTime;
        const bookingId = booking.bookingId || booking.BookingId;
        const clientName = booking.clientName || booking.ClientName || 'Khách hàng';
        const type = booking.type || booking.Type || 'In-person';
        const hasAssignedWorkout = booking.hasAssignedWorkout || booking.HasAssignedWorkout || false;
        const assignedWorkoutName = booking.assignedWorkoutName || booking.AssignedWorkoutName;
        const goal = booking.goal || booking.Goal || null;
        
        console.log('Processing booking:', { bookingId, startTimeValue, endTimeValue, status, goal });
        
        const startTime = startTimeValue ? new Date(startTimeValue).toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }) : 'N/A';
        const endTime = endTimeValue ? new Date(endTimeValue).toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }) : 'N/A';
        
        const clientId = booking.clientId || booking.ClientId;
        
        return `
            <div class="booking-card" data-booking-id="${bookingId}">
                <div class="booking-header">
                    <div class="booking-client-info">
                        <div class="client-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="client-details">
                            <h3>${escapeHtml(clientName)}</h3>
                            <p class="booking-time">
                                <i class="fas fa-clock"></i> ${startTime} - ${endTime}
                            </p>
                        </div>
                    </div>
                    <div class="booking-status">
                        <span class="status-badge status-${status.toLowerCase()}">
                            ${statusText}
                        </span>
                    </div>
                </div>
                <div class="booking-body">
                    <div class="booking-info-row">
                        <span><i class="fas fa-dumbbell"></i> ${escapeHtml(type)}</span>
                    </div>
                    ${(booking.goal || booking.Goal) ? `
                        <div class="booking-info-row">
                            <span><i class="fas fa-bullseye"></i> Mục tiêu: <strong>${escapeHtml(booking.goal || booking.Goal)}</strong></span>
                        </div>
                    ` : ''}
                    ${hasAssignedWorkout ? `
                        <div class="assigned-workout">
                            <i class="fas fa-check-circle"></i>
                            <span>Đã giao: <strong>${escapeHtml(assignedWorkoutName || 'N/A')}</strong></span>
                        </div>
                    ` : `
                        <div class="no-workout">
                            <i class="fas fa-exclamation-circle"></i>
                            <span>Chưa giao bài tập</span>
                        </div>
                    `}
                </div>
                <div class="booking-actions">
                    ${status === 'Pending' ? `
                        <button class="btn-accept" onclick="acceptBooking('${bookingId}', '${clientId}')">
                            <i class="fas fa-check"></i> Xác nhận
                        </button>
                        <button class="btn-reject" onclick="rejectBooking('${bookingId}', '${clientId}')">
                            <i class="fas fa-times"></i> Từ chối
                        </button>
                    ` : ''}
                    ${status === 'Confirmed' ? `
                        <button class="btn-assign-workout" onclick="openAssignWorkoutModal('${bookingId}', '${clientId}', ${hasAssignedWorkout}, '${goal ? escapeHtml(goal) : ''}')">
                            <i class="fas fa-dumbbell"></i> 
                            ${hasAssignedWorkout ? 'Đổi bài tập' : 'Giao bài tập'}
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Accept booking
async function acceptBooking(bookingId, clientId) {
    console.log('acceptBooking called with:', { bookingId, clientId });
    
    // Check if customConfirm is available
    if (typeof customConfirm === 'undefined') {
        console.error('customConfirm is not defined');
        if (!confirm('Bạn có chắc chắn muốn xác nhận lịch hẹn này?')) {
            return;
        }
    } else {
        const confirmed = await customConfirm(
            'Bạn có chắc chắn muốn xác nhận lịch hẹn này?',
            'Xác nhận lịch hẹn',
            'question'
        );
        
        if (!confirmed) return;
    }
    
    try {
        // Get anti-forgery token
        const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';
        
        const response = await fetch('/PT/Requests/Accept', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token
            },
            credentials: 'include',
            body: JSON.stringify({ RequestId: bookingId }) 
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Accept booking response:', result);
        
        if (result.success) {
            showToast(result.message || 'Đã xác nhận lịch hẹn thành công', 'success');
            // Reload bookings after a short delay
            setTimeout(() => {
                loadBookingsForDate();
            }, 500);
        } else {
            showToast(result.message || 'Không thể xác nhận lịch hẹn', 'error');
        }
    } catch (error) {
        console.error('Error accepting booking:', error);
        showToast('Có lỗi xảy ra khi xác nhận lịch hẹn: ' + error.message, 'error');
    }
}

// Reject booking
async function rejectBooking(bookingId, clientId) {
    console.log('rejectBooking called with:', { bookingId, clientId });
    
    // Sử dụng customPrompt thay vì prompt mặc định
    let reason;
    if (typeof customPrompt !== 'undefined') {
        reason = await customPrompt(
            'Vui lòng nhập lý do từ chối lịch hẹn này:',
            'Từ chối lịch hẹn',
            'Nhập lý do từ chối...',
            ''
        );
    } else {
        // Fallback nếu customPrompt không có
        reason = prompt('Vui lòng nhập lý do từ chối:');
    }
    
    if (!reason || reason.trim() === '') {
        if (reason === null) {
            // User cancelled
            return;
        }
        showToast('Vui lòng nhập lý do từ chối', 'warning');
        return;
    }
    
    try {
        // Get anti-forgery token
        const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';
        
        const response = await fetch('/PT/Requests/Reject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token
            },
            credentials: 'include',
            body: JSON.stringify({ RequestId: bookingId, Reason: reason.trim() }) // PascalCase vì PropertyNamingPolicy = null
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Reject booking response:', result);
        
        if (result.success) {
            showToast(result.message || 'Đã từ chối lịch hẹn', 'success');
            // Reload bookings after a short delay
            setTimeout(() => {
                loadBookingsForDate();
            }, 500);
        } else {
            showToast(result.message || 'Không thể từ chối lịch hẹn', 'error');
        }
    } catch (error) {
        console.error('Error rejecting booking:', error);
        showToast('Có lỗi xảy ra khi từ chối lịch hẹn: ' + error.message, 'error');
    }
}

// Open assign workout modal
async function openAssignWorkoutModal(bookingId, clientId, hasAssigned, goal) {
    console.log('openAssignWorkoutModal called with:', { bookingId, clientId, hasAssigned, goal });
    
    currentBookingId = bookingId;
    currentClientId = clientId;
    currentGoal = goal || null;
    selectedTemplateIds = [];
    templateDetails = {}; // Reset template details
    
    const modal = document.getElementById('assignWorkoutModal');
    const templateList = document.getElementById('templateList');
    const assignBtn = document.getElementById('assignWorkoutBtn');
    
    if (!modal || !templateList) {
        console.error('Modal or templateList not found');
        showToast('Không tìm thấy modal giao bài tập', 'error');
        return;
    }
    
    // Reset button state
    if (assignBtn) {
        assignBtn.disabled = true;
        assignBtn.style.opacity = '0.5';
    }
    
    // Try to use templates from current data first
    let templates = null;
    if (window.dailyBookingsData && window.dailyBookingsData.templates) {
        templates = window.dailyBookingsData.templates;
        console.log('Using templates from dailyBookingsData:', templates);
    }
    
    // If not available, fetch from API
    if (!templates || templates.length === 0) {
        try {
            console.log('Fetching templates from API...', { goal: currentGoal });
            // Build URL with goal parameter if available
            let url = '/PT/WorkoutTemplates';
            if (currentGoal && currentGoal.trim() !== '') {
                url += `?goal=${encodeURIComponent(currentGoal)}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Templates API response:', result);
            
            // Handle both camelCase and PascalCase
            templates = result.data || result.Data || [];
            
            if (!Array.isArray(templates)) {
                throw new Error('Templates is not an array');
            }
        } catch (error) {
            console.error('Error loading templates:', error);
            showToast('Có lỗi xảy ra khi tải danh sách bài tập: ' + error.message, 'error');
            return;
        }
    }
    
    if (!templates || templates.length === 0) {
        showToast('Không có bài tập nào khả dụng', 'warning');
        return;
    }
    
    // Templates đã được filter theo goal từ API (nếu có goal)
    // Nếu không có goal, hiển thị tất cả templates
    let filteredTemplates = templates;
    
    // Nếu có goal nhưng API không filter (từ dailyBookingsData), filter client-side
    if (currentGoal && currentGoal.trim() !== '' && templates.length > 0) {
        const templateGoal = templates[0].goal || templates[0].Goal;
        // Nếu templates không có goal property hoặc có nhiều goals khác nhau, filter client-side
        const hasMixedGoals = templates.some(t => {
            const tg = t.goal || t.Goal || '';
            return tg && tg.toLowerCase() !== (templateGoal || '').toLowerCase();
        });
        
        if (hasMixedGoals || !templateGoal) {
            filteredTemplates = templates.filter(template => {
                const tg = template.goal || template.Goal || '';
                if (!tg) return false;
                const goalLower = currentGoal.toLowerCase();
                const templateGoalLower = tg.toLowerCase();
                return templateGoalLower.includes(goalLower) || goalLower.includes(templateGoalLower);
            });
            
            console.log(`Client-side filtered templates by goal "${currentGoal}": ${filteredTemplates.length} of ${templates.length}`);
            
            if (filteredTemplates.length === 0) {
                showToast(`Không có bài tập nào phù hợp với mục tiêu "${currentGoal}"`, 'warning');
                // Show all templates as fallback
                filteredTemplates = templates;
            }
        }
    }
    
    // Render templates
    templateList.innerHTML = filteredTemplates.map(template => {
        // Handle both camelCase and PascalCase
        const templateId = template.templateId || template.TemplateId;
        const name = template.name || template.Name || 'N/A';
        const description = template.description || template.Description || '';
        const difficulty = template.difficulty || template.Difficulty || 'Beginner';
        const weeks = template.weeks || template.Weeks || 0;
        const estimatedCalories = template.estimatedCalories || template.EstimatedCalories || 0;
        const rating = template.rating || template.Rating || 0;
        const templateGoal = template.goal || template.Goal || '';
        
        const isSelected = selectedTemplateIds.includes(templateId);
        const details = templateDetails[templateId] || { sets: '', reps: '', restTime: '' };
        
        return `
            <div class="template-item ${isSelected ? 'selected' : ''}" data-template-id="${templateId}">
                <div class="template-checkbox">
                    <input type="checkbox" id="template_${templateId}" onclick="event.stopPropagation(); selectTemplate(${templateId})" ${isSelected ? 'checked' : ''} />
                </div>
                <div class="template-content">
                    <div class="template-header" onclick="selectTemplate(${templateId})">
                        <h4>${escapeHtml(name)}</h4>
                        <p>${escapeHtml(description)}</p>
                        ${templateGoal ? `<p class="template-goal"><i class="fas fa-bullseye"></i> Mục tiêu: ${escapeHtml(templateGoal)}</p>` : ''}
                        <div class="template-meta">
                            <span><i class="fas fa-signal"></i> ${escapeHtml(difficulty)}</span>
                            <span><i class="fas fa-calendar-week"></i> ${weeks} tuần</span>
                            <span><i class="fas fa-fire"></i> ${estimatedCalories} cal</span>
                            <span><i class="fas fa-star"></i> ${rating.toFixed(1)}</span>
                        </div>
                    </div>
                    ${isSelected ? `
                        <div class="template-details-form" onclick="event.stopPropagation();">
                            <h5><i class="fas fa-cog"></i> Chi tiết bài tập</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="sets_${templateId}">
                                        <i class="fas fa-list-ol"></i> Số Set
                                    </label>
                                    <input type="number" id="sets_${templateId}" 
                                           value="${details.sets}" 
                                           min="1" 
                                           placeholder="VD: 3"
                                           onchange="updateTemplateDetails(${templateId}, 'sets', this.value)" />
                                </div>
                                <div class="form-group">
                                    <label for="reps_${templateId}">
                                        <i class="fas fa-redo"></i> Số Rep
                                    </label>
                                    <input type="number" id="reps_${templateId}" 
                                           value="${details.reps}" 
                                           min="1" 
                                           placeholder="VD: 12"
                                           onchange="updateTemplateDetails(${templateId}, 'reps', this.value)" />
                                </div>
                                <div class="form-group">
                                    <label for="restTime_${templateId}">
                                        <i class="fas fa-clock"></i> Thời gian nghỉ (giây)
                                    </label>
                                    <input type="number" id="restTime_${templateId}" 
                                           value="${details.restTime}" 
                                           min="0" 
                                           placeholder="VD: 60"
                                           onchange="updateTemplateDetails(${templateId}, 'restTime', this.value)" />
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    modal.style.display = 'flex';
    console.log('Modal opened with', templates.length, 'templates');
}

// Toggle template selection (support multiple selection)
function selectTemplate(templateId) {
    console.log('selectTemplate called with:', templateId);
    
    const templateIdNum = typeof templateId === 'string' ? parseInt(templateId) : templateId;
    const index = selectedTemplateIds.indexOf(templateIdNum);
    
    // Toggle selection
    if (index > -1) {
        // Deselect
        selectedTemplateIds.splice(index, 1);
        // Remove details if exists
        delete templateDetails[templateIdNum];
    } else {
        // Select
        selectedTemplateIds.push(templateIdNum);
        // Initialize details if not exists
        if (!templateDetails[templateIdNum]) {
            templateDetails[templateIdNum] = { sets: '', reps: '', restTime: '' };
        }
    }
    
    // Re-render template list to show/hide form
    if (window.dailyBookingsData && window.dailyBookingsData.templates) {
        const templates = window.dailyBookingsData.templates;
        const templateList = document.getElementById('templateList');
        if (templateList) {
            // Re-render with updated selection
            const filteredTemplates = currentGoal && currentGoal.trim() !== '' 
                ? templates.filter(t => {
                    const tGoal = t.goal || t.Goal || '';
                    const goalLower = currentGoal.toLowerCase();
                    return tGoal && (tGoal.toLowerCase().includes(goalLower) || goalLower.includes(tGoal.toLowerCase()));
                })
                : templates;
            
            templateList.innerHTML = filteredTemplates.map(template => {
                const tId = template.templateId || template.TemplateId;
                const tName = template.name || template.Name || 'N/A';
                const tDesc = template.description || template.Description || '';
                const tDifficulty = template.difficulty || template.Difficulty || 'Beginner';
                const tWeeks = template.weeks || template.Weeks || 0;
                const tCalories = template.estimatedCalories || template.EstimatedCalories || 0;
                const tRating = template.rating || template.Rating || 0;
                const tGoal = template.goal || template.Goal || '';
                
                const isSelected = selectedTemplateIds.includes(tId);
                const details = templateDetails[tId] || { sets: '', reps: '', restTime: '' };
                
                return `
                    <div class="template-item ${isSelected ? 'selected' : ''}" data-template-id="${tId}">
                        <div class="template-checkbox">
                            <input type="checkbox" id="template_${tId}" onclick="event.stopPropagation(); selectTemplate(${tId})" ${isSelected ? 'checked' : ''} />
                        </div>
                        <div class="template-content">
                            <div class="template-header" onclick="selectTemplate(${tId})">
                                <h4>${escapeHtml(tName)}</h4>
                                <p>${escapeHtml(tDesc)}</p>
                                ${tGoal ? `<p class="template-goal"><i class="fas fa-bullseye"></i> Mục tiêu: ${escapeHtml(tGoal)}</p>` : ''}
                                <div class="template-meta">
                                    <span><i class="fas fa-signal"></i> ${escapeHtml(tDifficulty)}</span>
                                    <span><i class="fas fa-calendar-week"></i> ${tWeeks} tuần</span>
                                    <span><i class="fas fa-fire"></i> ${tCalories} cal</span>
                                    <span><i class="fas fa-star"></i> ${tRating.toFixed(1)}</span>
                                </div>
                            </div>
                            ${isSelected ? `
                                <div class="template-details-form" onclick="event.stopPropagation();">
                                    <h5><i class="fas fa-cog"></i> Chi tiết bài tập</h5>
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label for="sets_${tId}">
                                                <i class="fas fa-list-ol"></i> Số Set
                                            </label>
                                            <input type="number" id="sets_${tId}" 
                                                   value="${details.sets}" 
                                                   min="1" 
                                                   placeholder="VD: 3"
                                                   onchange="updateTemplateDetails(${tId}, 'sets', this.value)" />
                                        </div>
                                        <div class="form-group">
                                            <label for="reps_${tId}">
                                                <i class="fas fa-redo"></i> Số Rep
                                            </label>
                                            <input type="number" id="reps_${tId}" 
                                                   value="${details.reps}" 
                                                   min="1" 
                                                   placeholder="VD: 12"
                                                   onchange="updateTemplateDetails(${tId}, 'reps', this.value)" />
                                        </div>
                                        <div class="form-group">
                                            <label for="restTime_${tId}">
                                                <i class="fas fa-clock"></i> Thời gian nghỉ (giây)
                                            </label>
                                            <input type="number" id="restTime_${tId}" 
                                                   value="${details.restTime}" 
                                                   min="0" 
                                                   placeholder="VD: 60"
                                                   onchange="updateTemplateDetails(${tId}, 'restTime', this.value)" />
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
    
    // Enable/disable assign button based on selection count
    const assignBtn = document.getElementById('assignWorkoutBtn');
    if (assignBtn) {
        if (selectedTemplateIds.length > 0) {
            assignBtn.disabled = false;
            assignBtn.style.opacity = '1';
            console.log('Assign button enabled, selected:', selectedTemplateIds.length, 'templates');
        } else {
            assignBtn.disabled = true;
            assignBtn.style.opacity = '0.5';
            console.log('Assign button disabled, no templates selected');
        }
    } else {
        console.error('Assign button not found!');
    }
}

// Update template details (sets, reps, rest time)
function updateTemplateDetails(templateId, field, value) {
    const templateIdNum = typeof templateId === 'string' ? parseInt(templateId) : templateId;
    if (!templateDetails[templateIdNum]) {
        templateDetails[templateIdNum] = { sets: '', reps: '', restTime: '' };
    }
    templateDetails[templateIdNum][field] = value;
    console.log('Updated template details:', templateDetails);
}

// Close assign workout modal
function closeAssignWorkoutModal() {
    const modal = document.getElementById('assignWorkoutModal');
    const assignBtn = document.getElementById('assignWorkoutBtn');
    modal.style.display = 'none';
    currentBookingId = null;
    currentClientId = null;
    selectedTemplateIds = [];
    templateDetails = {}; // Reset template details
    
    // Reset button state
    if (assignBtn) {
        assignBtn.disabled = true;
        assignBtn.style.opacity = '0.5';
    }
    
    // Clear selection
    document.querySelectorAll('.template-item').forEach(item => {
        item.classList.remove('selected');
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.checked = false;
        }
    });
}

// Assign workout
async function assignWorkout() {
    console.log('assignWorkout called with:', { currentBookingId, selectedTemplateIds });
    
    if (!currentBookingId || !selectedTemplateIds || selectedTemplateIds.length === 0) {
        showToast('Vui lòng chọn ít nhất một bài tập', 'warning');
        return;
    }
    
    try {
        // Get anti-forgery token
        const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';
        
        const response = await fetch('/PT/AssignWorkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token
            },
            credentials: 'include',
            body: JSON.stringify({
                BookingId: currentBookingId,
                TemplateIds: selectedTemplateIds, // Gửi array of template IDs
                TemplateDetails: selectedTemplateIds.map(id => ({
                    TemplateId: id,
                    Sets: templateDetails[id]?.sets || null,
                    Reps: templateDetails[id]?.reps || null,
                    RestTime: templateDetails[id]?.restTime || null
                }))
            }) // PascalCase vì PropertyNamingPolicy = null
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Assign workout response:', result);
        
        if (result.success) {
            showToast(result.message || 'Đã giao bài tập thành công', 'success');
            closeAssignWorkoutModal();
            // Reload bookings after a short delay
            setTimeout(() => {
                loadBookingsForDate();
            }, 500);
        } else {
            showToast(result.message || 'Không thể giao bài tập', 'error');
        }
    } catch (error) {
        console.error('Error assigning workout:', error);
        showToast('Có lỗi xảy ra khi giao bài tập: ' + error.message, 'error');
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Expose functions globally for onclick handlers
window.acceptBooking = acceptBooking;
window.rejectBooking = rejectBooking;
window.openAssignWorkoutModal = openAssignWorkoutModal;
window.closeAssignWorkoutModal = closeAssignWorkoutModal;
window.selectTemplate = selectTemplate;
window.updateTemplateDetails = updateTemplateDetails;
window.assignWorkout = assignWorkout;
window.changeDate = changeDate;
window.goToToday = goToToday;
window.loadBookingsForDate = loadBookingsForDate;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DailyBookingsManagement initialized');
    console.log('Functions available:', {
        acceptBooking: typeof acceptBooking,
        rejectBooking: typeof rejectBooking,
        openAssignWorkoutModal: typeof openAssignWorkoutModal
    });
});

