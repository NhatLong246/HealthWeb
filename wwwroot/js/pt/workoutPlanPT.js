// Workout Plan Management - UI only, no business logic

let exerciseCounter = 0;
const daysOfWeek = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Open workout plan modal
function openWorkoutPlanModal(clientId, goal) {
    const modal = document.getElementById('workoutPlanModal');
    const clientIdInput = document.getElementById('workoutPlanClientId');
    const goalInput = document.getElementById('workoutPlanGoal');
    
    if (!modal || !clientIdInput || !goalInput) return;
    
    clientIdInput.value = clientId;
    goalInput.value = goal || 'Chưa có mục tiêu';
    
    // Reset form
    document.getElementById('workoutPlanName').value = '';
    document.getElementById('workoutPlanWeeks').value = '4';
    document.getElementById('workoutPlanSessionsPerWeek').value = '3';
    document.getElementById('workoutPlanTemplate').value = '';
    document.getElementById('workoutExercisesList').innerHTML = '';
    exerciseCounter = 0;
    
    // Load all templates from database
    loadAllWorkoutTemplates(goal);
    
    modal.style.display = 'flex';
}


// Close workout plan modal
function closeWorkoutPlanModal() {
    const modal = document.getElementById('workoutPlanModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Load all workout templates from database
async function loadAllWorkoutTemplates(clientGoal = null) {
    const select = document.getElementById('workoutPlanTemplate');
    if (!select) return;
    
    try {
        // Load all templates from database
        const url = clientGoal && clientGoal !== 'Chưa có mục tiêu' 
            ? `/PT/WorkoutTemplates?goal=${encodeURIComponent(clientGoal)}`
            : '/PT/WorkoutTemplates';
        
        const response = await fetch(url);
        const result = await response.json();
        
        select.innerHTML = '<option value="">-- Chọn template hoặc tạo mới --</option>';
        
        if (result.success && result.data && result.data.length > 0) {
            result.data.forEach(template => {
                const option = document.createElement('option');
                option.value = template.templateId || template.TemplateId;
                const name = template.name || template.Name || '';
                const exerciseCount = template.exerciseCount || template.ExerciseCount || 0;
                const weeks = template.weeks || template.Weeks || 0;
                const goal = template.goal || template.Goal || '';
                
                // Hiển thị template với thông tin đầy đủ
                let displayText = name;
                if (exerciseCount > 0) {
                    displayText += ` (${exerciseCount} bài tập`;
                    if (weeks > 0) {
                        displayText += `, ${weeks} tuần`;
                    }
                    displayText += ')';
                }
                if (goal) {
                    displayText += ` - ${goal}`;
                }
                
                option.textContent = displayText;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

// Load workout templates by goal (deprecated - use loadAllWorkoutTemplates instead)
async function loadWorkoutTemplates(goal) {
    await loadAllWorkoutTemplates(goal);
}

// Load template exercises
async function loadTemplateExercises() {
    const select = document.getElementById('workoutPlanTemplate');
    const templateId = select?.value;
    
    if (!templateId) {
        return;
    }
    
    try {
        const response = await fetch(`/PT/WorkoutTemplate/${templateId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const data = result.data;
            const exercises = data.exercises || data.Exercises || [];
            
            if (exercises.length > 0) {
                const exercisesList = document.getElementById('workoutExercisesList');
                if (!exercisesList) return;
                
                exercisesList.innerHTML = '';
                exerciseCounter = 0;
                
                exercises.forEach(exercise => {
                    addExerciseRow(exercise);
                });
                
                // Update weeks if available
                const weeks = data.weeks || data.Weeks;
                if (weeks) {
                    document.getElementById('workoutPlanWeeks').value = weeks;
                }
            }
        }
    } catch (error) {
        console.error('Error loading template exercises:', error);
        await customAlert('Không thể tải bài tập từ template', 'Lỗi', 'error');
    }
}

// Add exercise row
function addExerciseRow(exerciseData = null) {
    const exercisesList = document.getElementById('workoutExercisesList');
    if (!exercisesList) return;
    
    exerciseCounter++;
    
    // Helper function to get value with fallback for both camelCase and PascalCase
    const getValue = (obj, camelKey, pascalKey, defaultValue = '') => {
        if (!obj) return defaultValue;
        return obj[camelKey] ?? obj[pascalKey] ?? defaultValue;
    };
    
    const exerciseId = exerciseData ? (getValue(exerciseData, 'exerciseId', 'ExerciseId', exerciseCounter)) : exerciseCounter;
    const name = getValue(exerciseData, 'name', 'Name', '');
    const sets = getValue(exerciseData, 'sets', 'Sets', '');
    const reps = getValue(exerciseData, 'reps', 'Reps', '');
    const durationMinutes = getValue(exerciseData, 'durationMinutes', 'DurationMinutes', '');
    const week = getValue(exerciseData, 'week', 'Week', 1);
    const dayOfWeek = getValue(exerciseData, 'dayOfWeek', 'DayOfWeek', 1);
    const order = getValue(exerciseData, 'order', 'Order', exerciseCounter);
    const videoUrl = getValue(exerciseData, 'videoUrl', 'VideoUrl', '');
    const notes = getValue(exerciseData, 'notes', 'Notes', '');
    
    const row = document.createElement('div');
    row.className = 'exercise-row';
    row.dataset.exerciseId = exerciseId;
    
    row.innerHTML = `
        <div class="exercise-row-header">
            <h5>Bài tập ${exerciseCounter}</h5>
            <button type="button" class="btn-remove-exercise" onclick="removeExerciseRow(this)">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="exercise-row-content">
            <div class="form-group">
                <label><i class="fas fa-list"></i> Chọn template cho bài tập này (tùy chọn)</label>
                <select class="form-control exercise-template" onchange="loadTemplateForExercise(this, ${exerciseCounter})">
                    <option value="">-- Chọn template hoặc nhập thủ công --</option>
                </select>
            </div>
            <div class="form-group">
                <label>Tên bài tập <span class="required">*</span></label>
                <input type="text" class="form-control exercise-name" value="${escapeHtml(name)}" required>
            </div>
            <div class="form-row">
                <div class="form-group" style="flex: 1;">
                    <label>Số hiệp</label>
                    <input type="number" class="form-control exercise-sets" min="0" value="${sets}">
                </div>
                <div class="form-group" style="flex: 1;">
                    <label>Số lần/hiệp</label>
                    <input type="number" class="form-control exercise-reps" min="0" value="${reps}">
                </div>
                <div class="form-group" style="flex: 1;">
                    <label>Thời gian (phút)</label>
                    <input type="number" class="form-control exercise-duration" min="0" value="${durationMinutes}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group" style="flex: 1;">
                    <label>Tuần</label>
                    <input type="number" class="form-control exercise-week" min="1" value="${week}">
                </div>
                <div class="form-group" style="flex: 1;">
                    <label>Ngày trong tuần</label>
                    <select class="form-control exercise-day">
                        ${[1, 2, 3, 4, 5, 6, 7].map(day => 
                            `<option value="${day}" ${dayOfWeek === day ? 'selected' : ''}>${daysOfWeek[day] || 'Thứ ' + day}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group" style="flex: 1;">
                    <label>Thứ tự</label>
                    <input type="number" class="form-control exercise-order" min="0" value="${order}">
                </div>
            </div>
            <div class="form-group">
                <label>Video URL (tùy chọn)</label>
                <input type="url" class="form-control exercise-video" value="${escapeHtml(videoUrl)}">
            </div>
            <div class="form-group">
                <label>Ghi chú (tùy chọn)</label>
                <textarea class="form-control exercise-notes" rows="2">${escapeHtml(notes)}</textarea>
            </div>
        </div>
    `;
    
    exercisesList.appendChild(row);
    
    // Load templates for this exercise's dropdown
    const goal = document.getElementById('workoutPlanGoal')?.value;
    if (goal && goal !== 'Chưa có mục tiêu') {
        loadTemplatesForExercise(row, goal);
    }
}

// Load templates for a specific exercise dropdown
async function loadTemplatesForExercise(exerciseRow, goal) {
    const templateSelect = exerciseRow.querySelector('.exercise-template');
    if (!templateSelect) return;
    
    try {
        // Load all templates from database (filter by goal if provided)
        const url = goal && goal !== 'Chưa có mục tiêu'
            ? `/PT/WorkoutTemplates?goal=${encodeURIComponent(goal)}`
            : '/PT/WorkoutTemplates';
        
        const response = await fetch(url);
        const result = await response.json();
        
        templateSelect.innerHTML = '<option value="">-- Chọn template hoặc nhập thủ công --</option>';
        
        if (result.success && result.data && result.data.length > 0) {
            result.data.forEach(template => {
                const option = document.createElement('option');
                option.value = template.templateId || template.TemplateId;
                const name = template.name || template.Name || '';
                const exerciseCount = template.exerciseCount || template.ExerciseCount || 0;
                const weeks = template.weeks || template.Weeks || 0;
                const templateGoal = template.goal || template.Goal || '';
                
                let displayText = name;
                if (exerciseCount > 0) {
                    displayText += ` (${exerciseCount} bài tập`;
                    if (weeks > 0) {
                        displayText += `, ${weeks} tuần`;
                    }
                    displayText += ')';
                }
                if (templateGoal) {
                    displayText += ` - ${templateGoal}`;
                }
                
                option.textContent = displayText;
                templateSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading templates for exercise:', error);
    }
}

// Load template exercises for a specific exercise row
async function loadTemplateForExercise(selectElement, exerciseNumber) {
    const templateId = selectElement.value;
    if (!templateId) return;
    
    const exerciseRow = selectElement.closest('.exercise-row');
    if (!exerciseRow) return;
    
    try {
        const response = await fetch(`/PT/WorkoutTemplate/${templateId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const data = result.data;
            const exercises = data.exercises || data.Exercises || [];
            
            if (exercises.length > 0) {
                // Load first exercise from template into this exercise row
                const firstExercise = exercises[0];
                const nameInput = exerciseRow.querySelector('.exercise-name');
                const setsInput = exerciseRow.querySelector('.exercise-sets');
                const repsInput = exerciseRow.querySelector('.exercise-reps');
                const durationInput = exerciseRow.querySelector('.exercise-duration');
                const weekInput = exerciseRow.querySelector('.exercise-week');
                const daySelect = exerciseRow.querySelector('.exercise-day');
                const videoInput = exerciseRow.querySelector('.exercise-video');
                const notesTextarea = exerciseRow.querySelector('.exercise-notes');
                
                if (nameInput) {
                    nameInput.value = firstExercise.name || firstExercise.Name || '';
                }
                if (setsInput) {
                    setsInput.value = firstExercise.sets || firstExercise.Sets || '';
                }
                if (repsInput) {
                    repsInput.value = firstExercise.reps || firstExercise.Reps || '';
                }
                if (durationInput) {
                    durationInput.value = firstExercise.durationMinutes || firstExercise.DurationMinutes || '';
                }
                if (weekInput) {
                    weekInput.value = firstExercise.week || firstExercise.Week || 1;
                }
                if (daySelect) {
                    const dayOfWeek = firstExercise.dayOfWeek || firstExercise.DayOfWeek || 1;
                    daySelect.value = dayOfWeek;
                }
                if (videoInput) {
                    videoInput.value = firstExercise.videoUrl || firstExercise.VideoUrl || '';
                }
                if (notesTextarea) {
                    notesTextarea.value = firstExercise.notes || firstExercise.Notes || '';
                }
            }
        }
    } catch (error) {
        console.error('Error loading template for exercise:', error);
        await customAlert('Không thể tải bài tập từ template', 'Lỗi', 'error');
    }
}

// Remove exercise row
function removeExerciseRow(button) {
    const row = button.closest('.exercise-row');
    if (row) {
        row.remove();
        // Recalculate exercise numbers
        const rows = document.querySelectorAll('.exercise-row');
        rows.forEach((r, index) => {
            const header = r.querySelector('.exercise-row-header h5');
            if (header) {
                header.textContent = `Bài tập ${index + 1}`;
            }
        });
    }
}

// Save workout plan
async function saveWorkoutPlan() {
    const clientId = document.getElementById('workoutPlanClientId')?.value;
    const planName = document.getElementById('workoutPlanName')?.value;
    const weeks = parseInt(document.getElementById('workoutPlanWeeks')?.value);
    const sessionsPerWeek = parseInt(document.getElementById('workoutPlanSessionsPerWeek')?.value);
    
    if (!clientId) {
        await customAlert('Lỗi: Không tìm thấy ID khách hàng', 'Lỗi', 'error');
        return;
    }
    
    if (!planName || !planName.trim()) {
        await customAlert('Vui lòng nhập tên kế hoạch', 'Cảnh báo', 'warning');
        // Focus vào input
        const nameInput = document.getElementById('workoutPlanName');
        if (nameInput) {
            nameInput.focus();
        }
        return;
    }
    
    if (!weeks || weeks < 1 || weeks > 52) {
        await customAlert('Số tuần phải từ 1 đến 52', 'Cảnh báo', 'warning');
        // Focus vào input
        const weeksInput = document.getElementById('workoutPlanWeeks');
        if (weeksInput) {
            weeksInput.focus();
        }
        return;
    }
    
    if (!sessionsPerWeek || sessionsPerWeek < 1 || sessionsPerWeek > 7) {
        await customAlert('Số buổi/tuần phải từ 1 đến 7', 'Cảnh báo', 'warning');
        // Focus vào input
        const sessionsInput = document.getElementById('workoutPlanSessionsPerWeek');
        if (sessionsInput) {
            sessionsInput.focus();
        }
        return;
    }
    
    // Collect exercises
    const exerciseRows = document.querySelectorAll('.exercise-row');
    const exercises = [];
    
    for (let index = 0; index < exerciseRows.length; index++) {
        const row = exerciseRows[index];
        const name = row.querySelector('.exercise-name')?.value?.trim();
        if (!name) {
            await customAlert(`Vui lòng nhập tên bài tập cho bài tập ${index + 1}`, 'Cảnh báo', 'warning');
            // Focus vào input
            const nameInput = row.querySelector('.exercise-name');
            if (nameInput) {
                nameInput.focus();
            }
            return;
        }
        
        exercises.push({
            exerciseId: parseInt(row.dataset.exerciseId) || (index + 1),
            name: name,
            sets: parseInt(row.querySelector('.exercise-sets')?.value) || null,
            reps: parseInt(row.querySelector('.exercise-reps')?.value) || null,
            durationMinutes: parseInt(row.querySelector('.exercise-duration')?.value) || null,
            week: parseInt(row.querySelector('.exercise-week')?.value) || 1,
            dayOfWeek: parseInt(row.querySelector('.exercise-day')?.value) || 1,
            order: parseInt(row.querySelector('.exercise-order')?.value) || (index + 1),
            videoUrl: row.querySelector('.exercise-video')?.value?.trim() || null,
            notes: row.querySelector('.exercise-notes')?.value?.trim() || null
        });
    }
    
    if (exercises.length === 0) {
        await customAlert('Vui lòng thêm ít nhất một bài tập', 'Cảnh báo', 'warning');
        return;
    }
    
    // Prepare data
    const planData = {
        clientId: clientId,
        plan: {
            planName: planName,
            weeks: weeks,
            sessionsPerWeek: sessionsPerWeek,
            durationPerSession: 60, // Default
            difficulty: 'Beginner', // Default
            exercises: exercises
        }
    };
    
    // Get anti-forgery token
    const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
    if (!token) {
        await customAlert('Lỗi: Không tìm thấy token bảo mật', 'Lỗi', 'error');
        return;
    }
    
    try {
        const response = await fetch('/PT/WorkoutPlan/Create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify(planData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            await customAlert(result.message || 'Đã tạo kế hoạch tập luyện thành công', 'Thành công', 'success');
            closeWorkoutPlanModal();
            // Reload client detail to show new plan
            const currentClientId = clientId;
            if (currentClientId) {
                // Trigger reload of client detail if modal is open
                const detailModal = document.getElementById('clientDetailModal');
                if (detailModal && detailModal.style.display !== 'none') {
                    // Reload client detail
                    if (typeof openClientDetail === 'function') {
                        openClientDetail(currentClientId);
                    }
                }
            }
        } else {
            await customAlert(result.message || 'Có lỗi xảy ra khi tạo kế hoạch', 'Lỗi', 'error');
        }
    } catch (error) {
        console.error('Error saving workout plan:', error);
        await customAlert('Có lỗi xảy ra khi lưu kế hoạch', 'Lỗi', 'error');
    }
}

// Load client workout plan
async function loadClientWorkoutPlan(clientId) {
    if (!clientId) return;
    
    try {
        const response = await fetch(`/PT/WorkoutPlan/${clientId}`);
        const result = await response.json();
        
        const planContent = document.getElementById(`workoutPlanContent_${clientId}`);
        if (!planContent) return;
        
        if (result.success && result.data) {
            const plan = result.data;
            const planName = plan.planName || plan.PlanName || 'Kế hoạch tập luyện';
            const weeks = plan.weeks || plan.Weeks || 0;
            const sessionsPerWeek = plan.sessionsPerWeek || plan.SessionsPerWeek || 0;
            const durationPerSession = plan.durationPerSession || plan.DurationPerSession || 60;
            const exercises = plan.exercises || plan.Exercises || [];
            
            planContent.innerHTML = `
                <div class="workout-plan-display">
                    <h5>${escapeHtml(planName)}</h5>
                    <div class="plan-info">
                        <span><i class="fas fa-calendar-week"></i> ${weeks} tuần</span>
                        <span><i class="fas fa-calendar-day"></i> ${sessionsPerWeek} buổi/tuần</span>
                        <span><i class="fas fa-clock"></i> ${durationPerSession} phút/buổi</span>
                    </div>
                    <div class="plan-exercises">
                        <h6>Danh sách bài tập (${exercises.length} bài):</h6>
                        <ul>
                            ${exercises.map(ex => {
                                const exName = ex.name || ex.Name || '';
                                const exSets = ex.sets || ex.Sets;
                                const exReps = ex.reps || ex.Reps;
                                const exDuration = ex.durationMinutes || ex.DurationMinutes;
                                const exWeek = ex.week || ex.Week || 1;
                                const exDayOfWeek = ex.dayOfWeek || ex.DayOfWeek || 1;
                                
                                return `
                                    <li>
                                        <strong>${escapeHtml(exName)}</strong>
                                        ${exSets ? ` - ${exSets} hiệp` : ''}
                                        ${exReps ? ` x ${exReps} lần` : ''}
                                        ${exDuration ? ` - ${exDuration} phút` : ''}
                                        <span class="exercise-meta">(Tuần ${exWeek}, ${daysOfWeek[exDayOfWeek] || 'Thứ ' + exDayOfWeek})</span>
                                    </li>
                                `;
                            }).join('')}
                        </ul>
                    </div>
                </div>
            `;
        } else {
            planContent.innerHTML = '<p style="opacity: 0.6; margin: 1rem 0;">Chưa có kế hoạch tập luyện</p>';
        }
    } catch (error) {
        console.error('Error loading workout plan:', error);
    }
}

// Initialize: Load workout plan when client detail is shown
document.addEventListener('DOMContentLoaded', function() {
    // This will be called after client detail is loaded
    // The loadClientWorkoutPlan function will be called from manageClientsPT.js
});

