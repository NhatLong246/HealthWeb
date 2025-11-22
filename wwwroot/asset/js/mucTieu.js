// Mapping từ data-value sang tên MucTieu trong database
const mucTieuMapping = {
    'giam-can': 'Giảm Cân',
    'co-tay': 'Cơ Tay',
    'co-bung': 'Cơ Bụng',
    'co-chan': 'Cơ Chân',
    'co-dui': 'Cơ Đùi',
    'co-mong': 'Cơ Mông',
    'co-nguc': 'Cơ Ngực',
    'co-vai': 'Cơ Vai',
    'co-xo': 'Cơ Xô',
    'co-co': 'Cơ Cổ'
};

// Lưu trữ thông tin mục tiêu và bài tập được chọn
let selectedMucTieu = null;
let selectedMauTapLuyenId = null; // Giữ lại để tương thích
let selectedMauTapLuyenData = null;
let selectedMauTapLuyenIds = new Set(); // Danh sách bài tập đã chọn (mới)
let currentMucTieuId = null; // Mục tiêu hiện tại
let selectedCoGoals = new Set(); // Danh sách các mục tiêu cơ đã chọn (tối đa 2)
const MAX_CO_GOALS = 2; // Số lượng mục tiêu cơ tối đa có thể chọn
let globalExercisesData = []; // Lưu exercisesData để dùng khi lưu lịch


// Kiểm tra và load bài tập nếu đã chọn đủ thông tin
async function checkAndLoadExercises() {
    const trinhDo = getSelectedValue('level');
    
    // Chỉ load bài tập khi đã chọn đủ: mục tiêu và trình độ
    if (trinhDo) {
        // Nếu có nhiều mục tiêu cơ, load bài tập cho TẤT CẢ các mục tiêu cơ đã chọn
        if (selectedCoGoals.size > 0) {
            // Load bài tập cho tất cả các mục tiêu cơ
            await loadMauTapLuyenByMultipleMucTieu(Array.from(selectedCoGoals));
        } else if (selectedMucTieu) {
            // Nếu chỉ có 1 mục tiêu (Giảm Cân hoặc 1 mục tiêu cơ), load như cũ
            await loadMauTapLuyenByMucTieu(selectedMucTieu);
        }
        
        // Nếu đã có mục tiêu, thử load danh sách bài tập đã chọn
        if (currentMucTieuId && typeof loadSelectedExercisesList === 'function') {
            loadSelectedExercisesList();
        }
    } else if (selectedMucTieu || selectedCoGoals.size > 0) {
        // Nếu đã chọn mục tiêu nhưng chưa chọn trình độ, hiển thị thông báo
        const container = document.getElementById('suggestedExercisesList');
        if (container) {
            container.innerHTML = `
                <div class="no-data-message" style="width: 100%; text-align: center; padding: 2rem;">
                    <i class="fas fa-info-circle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>Vui lòng chọn trình độ hiện tại với bài tập để xem danh sách bài tập phù hợp</p>
                </div>
            `;
        }
    } else {
        // Nếu không có mục tiêu nào được chọn, xóa danh sách bài tập
        const container = document.getElementById('suggestedExercisesList');
        if (container) {
            container.innerHTML = '';
        }
    }
}

// Load danh sách mẫu tập luyện cho nhiều mục tiêu cơ cùng lúc
async function loadMauTapLuyenByMultipleMucTieu(coGoalValues) {
    const container = document.getElementById('suggestedExercisesList');
    if (!container) return;

    // Lấy trình độ hiện tại
    const level = getSelectedValue('level');
    if (!level) {
        container.innerHTML = `
            <div class="no-data-message" style="width: 100%; text-align: center; padding: 2rem;">
                <i class="fas fa-info-circle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>Vui lòng chọn trình độ hiện tại với bài tập trước</p>
            </div>
        `;
        return;
    }

    // Hiển thị loading state
    container.innerHTML = `
        <div class="loading-exercises" style="width: 100%; text-align: center; padding: 2rem;">
            <i class="fas fa-spinner"></i>
            <p style="margin-top: 1rem;">Đang tải danh sách bài tập phù hợp với trình độ của bạn...</p>
        </div>
    `;

    try {
        console.log('Loading workout templates for multiple mucTieu:', coGoalValues, 'level:', level);
        
        // Bước 1: Đảm bảo có currentMucTieuId và load danh sách đã chọn để sync selectedMauTapLuyenIds
        if (!currentMucTieuId) {
            const mucTieuResult = await createMucTieuIfNeeded();
            if (mucTieuResult.success) {
                currentMucTieuId = mucTieuResult.mucTieuId;
            }
        }
        
        // Bước 2: Load danh sách bài tập đã chọn từ database để sync selectedMauTapLuyenIds
        if (currentMucTieuId) {
            try {
                const selectedResponse = await fetch(`/MucTieu/GetBaiTapDaChon?mucTieuId=${encodeURIComponent(currentMucTieuId)}`);
                const selectedResult = await selectedResponse.json();
                if (selectedResult.success && selectedResult.data) {
                    // Sync selectedMauTapLuyenIds với database
                    selectedMauTapLuyenIds.clear();
                    selectedResult.data.forEach(item => {
                        selectedMauTapLuyenIds.add(item.MauTapLuyenId);
                    });
                    console.log('Synced selected exercises from database:', Array.from(selectedMauTapLuyenIds));
                }
            } catch (err) {
                console.warn('Could not load selected exercises:', err);
            }
        }
        
        // Bước 3: Load bài tập cho TẤT CẢ các mục tiêu cơ đã chọn
        const allExercises = [];
        const seenIds = new Set(); // Để loại bỏ trùng lặp
        
        for (const goalValue of coGoalValues) {
            const mucTieu = mucTieuMapping[goalValue];
            if (!mucTieu) continue;
            
            try {
                const response = await fetch(`/MucTieu/GetMauTapLuyenByMucTieu?mucTieu=${encodeURIComponent(mucTieu)}&level=${encodeURIComponent(level)}`);
                const result = await response.json();
                
                if (result.success && result.data) {
                    // Thêm bài tập vào danh sách, loại bỏ trùng lặp
                    result.data.forEach(exercise => {
                        if (!seenIds.has(exercise.MauTapLuyenId)) {
                            seenIds.add(exercise.MauTapLuyenId);
                            allExercises.push(exercise);
                        }
                    });
                    console.log(`Loaded ${result.data.length} exercises for ${mucTieu}`);
                }
            } catch (error) {
                console.error(`Error loading exercises for ${mucTieu}:`, error);
            }
        }
        
        if (allExercises.length > 0) {
            console.log(`Total unique exercises loaded: ${allExercises.length}`);
            renderSuggestedExercises(allExercises);
        } else {
            console.warn('No exercises found for selected goals');
            showNoExercisesMessage();
        }
    } catch (error) {
        console.error('Error loading workout templates for multiple goals:', error);
        showNoExercisesMessage();
    }
}

// Load danh sách mẫu tập luyện theo mục tiêu và trình độ
async function loadMauTapLuyenByMucTieu(mucTieu) {
    const container = document.getElementById('suggestedExercisesList');
    if (!container) return;

    // Lưu mục tiêu được chọn (nếu chưa có)
    if (!selectedMucTieu) {
        selectedMucTieu = mucTieu;
    }

    // Lấy trình độ hiện tại
    const level = getSelectedValue('level');
    if (!level) {
        container.innerHTML = `
            <div class="no-data-message" style="width: 100%; text-align: center; padding: 2rem;">
                <i class="fas fa-info-circle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>Vui lòng chọn trình độ hiện tại với bài tập trước</p>
            </div>
        `;
        return;
    }

    // Hiển thị loading state
    container.innerHTML = `
        <div class="loading-exercises" style="width: 100%; text-align: center; padding: 2rem;">
            <i class="fas fa-spinner"></i>
            <p style="margin-top: 1rem;">Đang tải danh sách bài tập phù hợp với trình độ của bạn...</p>
        </div>
    `;

    try {
        console.log('Loading workout templates for mucTieu:', mucTieu, 'level:', level);
        
        // Bước 1: Đảm bảo có currentMucTieuId và load danh sách đã chọn để sync selectedMauTapLuyenIds
        if (!currentMucTieuId) {
            const mucTieuResult = await createMucTieuIfNeeded();
            if (mucTieuResult.success) {
                currentMucTieuId = mucTieuResult.mucTieuId;
            }
        }
        
        // Bước 2: Load danh sách bài tập đã chọn từ database để sync selectedMauTapLuyenIds
        if (currentMucTieuId) {
            try {
                const selectedResponse = await fetch(`/MucTieu/GetBaiTapDaChon?mucTieuId=${encodeURIComponent(currentMucTieuId)}`);
                const selectedResult = await selectedResponse.json();
                if (selectedResult.success && selectedResult.data) {
                    // Sync selectedMauTapLuyenIds với database
                    selectedMauTapLuyenIds.clear();
                    selectedResult.data.forEach(item => {
                        selectedMauTapLuyenIds.add(item.MauTapLuyenId);
                    });
                    console.log('Synced selected exercises from database:', Array.from(selectedMauTapLuyenIds));
                }
            } catch (err) {
                console.warn('Could not load selected exercises:', err);
            }
        }
        
        // Bước 3: Gửi cả mucTieu và level để filter theo DoKho
        const response = await fetch(`/MucTieu/GetMauTapLuyenByMucTieu?mucTieu=${encodeURIComponent(mucTieu)}&level=${encodeURIComponent(level)}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            console.log('Loaded workout templates:', result.data);
            renderSuggestedExercises(result.data);
        } else {
            console.error('Failed to load workout templates:', result.message);
            showNoExercisesMessage();
        }
    } catch (error) {
        console.error('Error loading workout templates:', error);
        showNoExercisesMessage();
    }
}

// Hàm lấy YouTube video ID từ URL
function getYouTubeVideoId(url) {
    if (!url) {
        console.warn('getYouTubeVideoId: URL is null or empty');
        return null;
    }
    
    // Loại bỏ khoảng trắng ở đầu và cuối
    url = url.trim();
    
    // Format: https://www.youtube.com/shorts/VIDEO_ID (YouTube Shorts)
    if (url.includes('youtube.com/shorts/')) {
        const shortsMatch = url.match(/shorts\/([^?\n&#]+)/);
        if (shortsMatch) {
            console.log('getYouTubeVideoId: Found Shorts URL, videoId:', shortsMatch[1]);
            return shortsMatch[1];
        }
    }
    
    // Nếu đã là embed URL
    if (url.includes('youtube.com/embed/') || url.includes('youtu.be/embed/')) {
        const match = url.match(/embed\/([^?&#]+)/);
        if (match) {
            console.log('getYouTubeVideoId: Found embed URL, videoId:', match[1]);
            return match[1];
        }
    }
    
    // Format: https://www.youtube.com/watch?v=VIDEO_ID
    if (url.includes('youtube.com/watch')) {
        const watchMatch = url.match(/[?&]v=([^&\n?#]+)/);
        if (watchMatch) {
            console.log('getYouTubeVideoId: Found watch URL, videoId:', watchMatch[1]);
            return watchMatch[1];
        }
    }
    
    // Format: youtu.be/VIDEO_ID
    if (url.includes('youtu.be/')) {
        const shortMatch = url.match(/youtu\.be\/([^?\n&#]+)/);
        if (shortMatch) {
            console.log('getYouTubeVideoId: Found short URL, videoId:', shortMatch[1]);
            return shortMatch[1];
        }
    }
    
    // Format: youtube.com/v/VIDEO_ID
    if (url.includes('youtube.com/v/')) {
        const vMatch = url.match(/youtube\.com\/v\/([^?\n&#]+)/);
        if (vMatch) {
            console.log('getYouTubeVideoId: Found /v/ URL, videoId:', vMatch[1]);
            return vMatch[1];
        }
    }
    
    // Nếu URL chỉ là video ID (11 ký tự)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
        console.log('getYouTubeVideoId: URL is already a video ID:', url);
        return url;
    }
    
    console.warn('getYouTubeVideoId: Cannot parse video ID from URL:', url);
    return null;
}

// Hàm chuyển đổi YouTube URL sang embed URL với các tham số tối ưu
function getYouTubeEmbedUrl(url, useNoCookie = true) {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;
    
    // Sử dụng youtube-nocookie.com để tránh một số vấn đề với cookies và permissions
    // Thêm các tham số để tắt JavaScript API và tránh lỗi Permissions API
    const baseUrl = useNoCookie 
        ? `https://www.youtube-nocookie.com/embed/${videoId}`
        : `https://www.youtube.com/embed/${videoId}`;
    
    // Tham số quan trọng:
    // - enablejsapi=0: Tắt JavaScript API (tránh lỗi Permissions API)
    // - rel=0: Không hiển thị video liên quan
    // - modestbranding=1: Giảm branding
    // - playsinline=1: Phát inline trên mobile
    return `${baseUrl}?enablejsapi=0&rel=0&modestbranding=1&playsinline=1&origin=${window.location.origin}`;
}

// Hàm lấy YouTube thumbnail URL
function getYouTubeThumbnail(url) {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;
    
    // Sử dụng thumbnail chất lượng cao
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Render danh sách bài tập được đề xuất
function renderSuggestedExercises(exercises) {
    const container = document.getElementById('suggestedExercisesList');
    if (!container) return;

    if (!exercises || exercises.length === 0) {
        showNoExercisesMessage();
        return;
    }

    container.innerHTML = '';
    
    exercises.forEach(exercise => {
        const card = document.createElement('div');
        card.className = 'tile with-action exercise-card';
        card.setAttribute('data-mau-tap-luyen-id', exercise.MauTapLuyenId);
        card.setAttribute('data-title', exercise.TenMauTapLuyen || '');
        card.setAttribute('data-sessions', exercise.SoTuan || 0);
        card.setAttribute('data-time', exercise.CaloUocTinh || 0);
        card.setAttribute('data-effect', exercise.DiemTrungBinh >= 4.5 ? 'Tốt' : exercise.DiemTrungBinh >= 3.5 ? 'Khá' : 'Trung bình');
        card.setAttribute('data-calories', exercise.CaloUocTinh || 0);
        card.setAttribute('data-scheme', `${exercise.SoTuan || 0} tuần`);
        card.setAttribute('data-difficulty', exercise.DoKho === 'Beginner' ? 'Dễ' : exercise.DoKho === 'Intermediate' ? 'Trung bình' : 'Khó');
        
        // CHỈ hiển thị icon, KHÔNG hiển thị video thumbnail ở danh sách đề xuất
        // Video chỉ xem được ở phần Chi Tiết Bài Tập
        let mediaContent = '';
        
        // Chọn icon phù hợp dựa trên tên bài tập hoặc mục tiêu
        let iconClass = 'fas fa-dumbbell';
        const tenBaiTap = (exercise.TenMauTapLuyen || '').toLowerCase();
        
        if (tenBaiTap.includes('yoga') || tenBaiTap.includes('dẻo') || tenBaiTap.includes('stretch')) {
            iconClass = 'fas fa-spa';
        } else if (tenBaiTap.includes('chạy') || tenBaiTap.includes('cardio') || tenBaiTap.includes('running')) {
            iconClass = 'fas fa-running';
        } else if (tenBaiTap.includes('bụng') || tenBaiTap.includes('core') || tenBaiTap.includes('abs') || tenBaiTap.includes('crunch') || tenBaiTap.includes('plank')) {
            iconClass = 'fas fa-circle';
        } else if (tenBaiTap.includes('chân') || tenBaiTap.includes('đùi') || tenBaiTap.includes('leg') || tenBaiTap.includes('squat') || tenBaiTap.includes('lunge')) {
            iconClass = 'fas fa-walking';
        } else if (tenBaiTap.includes('tay') || tenBaiTap.includes('arm') || tenBaiTap.includes('bicep') || tenBaiTap.includes('tricep') || tenBaiTap.includes('curl')) {
            iconClass = 'fas fa-hand-fist';
        } else if (tenBaiTap.includes('ngực') || tenBaiTap.includes('chest') || tenBaiTap.includes('push')) {
            iconClass = 'fas fa-heart';
        } else if (tenBaiTap.includes('vai') || tenBaiTap.includes('shoulder') || tenBaiTap.includes('press')) {
            iconClass = 'fas fa-dumbbell';
        } else if (tenBaiTap.includes('lưng') || tenBaiTap.includes('back') || tenBaiTap.includes('pull')) {
            iconClass = 'fas fa-dumbbell';
        } else if (tenBaiTap.includes('mông') || tenBaiTap.includes('glute') || tenBaiTap.includes('hip')) {
            iconClass = 'fas fa-running';
        }
        
        mediaContent = `<div class="tile-media"><i class="${iconClass}"></i></div>`;
        
        const exerciseName = exercise.TenMauTapLuyen || 'Chưa có tên';
        // Tạo HTML với tên bài tập riêng biệt - không dùng tile-footer để tránh conflict
        card.innerHTML = `
            ${mediaContent}
            <div class="exercise-title-wrapper" style="padding: 0.75rem; padding-bottom: 0.5rem; width: 100%; box-sizing: border-box; background: inherit;">
                <div class="exercise-title-text" style="font-weight: 600; font-size: 0.95rem; line-height: 1.4; word-wrap: break-word; width: 100%; text-align: left; display: block; margin: 0; padding: 0;">${exerciseName}</div>
            </div>
            <div class="tile-footer" style="display: flex; justify-content: center; align-items: center; padding: 0.5rem 0.75rem 0.75rem 0.75rem; width: 100%; box-sizing: border-box;">
                <button class="btn exercise-select-btn ${selectedMauTapLuyenIds.has(exercise.MauTapLuyenId) ? 'selected' : ''}" 
                        data-mau-tap-luyen-id="${exercise.MauTapLuyenId}" 
                        style="padding: 0.5rem 1rem; font-size: 0.875rem; border-radius: 0.375rem; cursor: pointer; transition: all 0.2s;">
                    ${selectedMauTapLuyenIds.has(exercise.MauTapLuyenId) ? '<i class="fas fa-check"></i> Đã chọn' : '<i class="fas fa-plus"></i> Chọn'}
                </button>
            </div>
        `;
        
        // Debug: Log để kiểm tra
        console.log('Exercise card created:', {
            name: exerciseName,
            hasName: !!exerciseName,
            cardElement: card,
            innerHTML: card.innerHTML.substring(0, 200)
        });
        
        container.appendChild(card);
    });

    // Thêm event listener cho button Chọn/Hủy
    container.querySelectorAll('.exercise-select-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            // Disable button tạm thời để tránh double click
            const originalHTML = this.innerHTML;
            this.disabled = true;
            this.style.opacity = '0.6';
            
            try {
                const mauTapLuyenId = parseInt(this.getAttribute('data-mau-tap-luyen-id'));
                const isSelected = selectedMauTapLuyenIds.has(mauTapLuyenId);
                
                console.log('Button clicked - mauTapLuyenId:', mauTapLuyenId, 'isSelected:', isSelected, 'currentMucTieuId:', currentMucTieuId);
                
                if (isSelected) {
                    // Đã chọn -> Hủy chọn
                    await removeBaiTapFromMucTieu(mauTapLuyenId);
                } else {
                    // Chưa chọn -> Chọn
                    await addBaiTapToMucTieu(mauTapLuyenId);
                }
            } catch (error) {
                console.error('Error in button click handler:', error);
                alert('Đã xảy ra lỗi: ' + error.message);
            } finally {
                // Re-enable button
                this.disabled = false;
                this.style.opacity = '1';
            }
        });
    });

    // Cập nhật trạng thái button cho các bài tập đã chọn
    updateSelectedExercisesDisplay();

    // Auto-load chi tiết bài tập đầu tiên
    const firstCard = container.querySelector('.exercise-card');
    if (firstCard) {
        firstCard.classList.add('selected');
        const mauTapLuyenId = firstCard.getAttribute('data-mau-tap-luyen-id');
        if (mauTapLuyenId) {
            loadExerciseDetail(parseInt(mauTapLuyenId));
        }
    }
}

// Hiển thị thông báo không có bài tập
function showNoExercisesMessage() {
    const container = document.getElementById('suggestedExercisesList');
    if (!container) return;
    
    container.innerHTML = `
        <div class="no-data-message" style="width: 100%; text-align: center; padding: 2rem;">
            <i class="fas fa-info-circle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
            <p>Không tìm thấy bài tập nào cho mục tiêu này</p>
        </div>
    `;
}

// Load chi tiết bài tập
async function loadExerciseDetail(mauTapLuyenId) {
    const panel = document.getElementById('exerciseDetail');
    if (!panel) return;

    // Hiển thị loading state
    panel.hidden = false;
    const guideEl = document.getElementById('dGuide');
    if (guideEl) {
        guideEl.innerHTML = '<i class="fas fa-spinner" style="animation: spin 1s linear infinite;"></i> Đang tải chi tiết...';
    }

    try {
        console.log('Loading exercise detail for mauTapLuyenId:', mauTapLuyenId);
        const response = await fetch(`/MucTieu/GetChiTietMauTapLuyen?mauTapLuyenId=${mauTapLuyenId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            console.log('Loaded exercise detail:', result.data);
            populateDetailFromData(result.data);
        } else {
            console.error('Failed to load exercise detail:', result.message);
            if (guideEl) {
                guideEl.textContent = 'Không thể tải chi tiết bài tập';
            }
        }
    } catch (error) {
        console.error('Error loading exercise detail:', error);
        if (guideEl) {
            guideEl.textContent = 'Đã xảy ra lỗi khi tải chi tiết';
        }
    }
}

// Populate chi tiết bài tập từ dữ liệu API
function populateDetailFromData(data) {
    const panel = document.getElementById('exerciseDetail');
    if (!panel) return;

    // Lưu dữ liệu bài tập được chọn
    selectedMauTapLuyenId = data.MauTapLuyenId;
    selectedMauTapLuyenData = data;

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val || '0';
    };

    // Số buổi tập: Tổng số buổi tập
    setText('dSessions', data.SoBuoiTap || 0);
    
    // Thời lượng phút: Lấy từ ThoiLuongPhut (trung bình từ ChiTietMauTapLuyen)
    setText('dTime', data.ThoiLuongPhut || 0);
    
    // Hiệu quả
    setText('dEffect', data.HieuQua || 'Trung bình');
    
    // Calorie ĐT bình quân: Calo ước tính mỗi buổi
    setText('dCalories', data.CaloUocTinh || 0);
    
    // Scheme: Sets - Reps (x-y)
    setText('dScheme', data.Scheme || '-');
    
    // Mức độ
    setText('dDiff', data.DoKho || 'Trung bình');

    // Ẩn phần dImage (video đầu tiên) - chỉ hiển thị video trong danh sách dGuide
    const mediaEl = document.getElementById('dImage');
    if (mediaEl) {
        // Xóa nội dung hoặc ẩn phần này
        mediaEl.innerHTML = '';
        mediaEl.style.display = 'none';
    }

    // Hiển thị danh sách bài tập trong phần "Nội dung bài tập" (dGuide) - chỉ hiển thị video và hướng dẫn
    const guideEl = document.getElementById('dGuide');
    if (guideEl) {
        if (data.ChiTietBaiTap && data.ChiTietBaiTap.length > 0) {
            let guideHtml = '<div class="exercise-list">';
            
            // Hiển thị tất cả các bài tập với video và thông tin chi tiết
            data.ChiTietBaiTap.forEach((bt, index) => {
                // Xây dựng phần hướng dẫn (GhiChu)
                let huongDanHtml = '';
                if (bt.GhiChu) {
                    huongDanHtml = `
                        <div style="margin-top: 0.75rem; padding: 0.75rem; background: rgba(59, 130, 246, 0.1); border-left: 3px solid rgba(59, 130, 246, 0.5); border-radius: 4px;">
                            <div style="font-weight: 600; margin-bottom: 0.5rem; color: #60a5fa; font-size: 0.875rem;">
                                <i class="fas fa-info-circle"></i> Hướng dẫn:
                            </div>
                            <div style="font-size: 0.875rem; color: #cbd5e1; line-height: 1.6; white-space: pre-line;">
                                ${bt.GhiChu}
                            </div>
                        </div>
                    `;
                }
                
                // Hiển thị video nếu có
                if (bt.VideoUrl) {
                    const videoId = getYouTubeVideoId(bt.VideoUrl);
                    const thumbnailUrl = getYouTubeThumbnail(bt.VideoUrl);
                    if (videoId && thumbnailUrl) {
                        guideHtml += `
                            <div class="exercise-item" style="margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid rgba(59, 130, 246, 0.2);">
                                <div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; background: #000; cursor: pointer; margin-bottom: 0.75rem;" 
                                     data-video-id="${videoId}" 
                                     data-video-url="${bt.VideoUrl}"
                                     onclick="loadYouTubeVideo(this)">
                                    <img src="${thumbnailUrl}" 
                                         alt="${bt.TenbaiTap || 'Exercise video'}" 
                                         style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"
                                         loading="lazy"
                                         onerror="this.src='https://img.youtube.com/vi/${videoId}/mqdefault.jpg'">
                                    <div class="play-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); border-radius: 50%; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; pointer-events: none; transition: background 0.3s;">
                                        <i class="fas fa-play" style="color: white; font-size: 24px; margin-left: 4px;"></i>
                                    </div>
                                </div>
                                ${huongDanHtml}
                            </div>
                        `;
                    } else {
                        // Nếu không có video hợp lệ, chỉ hiển thị hướng dẫn
                        guideHtml += `
                            <div class="exercise-item" style="margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid rgba(59, 130, 246, 0.2);">
                                ${huongDanHtml}
                            </div>
                        `;
                    }
                } else {
                    // Nếu không có video, chỉ hiển thị hướng dẫn
                    guideHtml += `
                        <div class="exercise-item" style="margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid rgba(59, 130, 246, 0.2);">
                            ${huongDanHtml}
                        </div>
                    `;
                }
            });
            guideHtml += '</div>';
            guideEl.innerHTML = guideHtml;
        } else {
            guideEl.textContent = data.HuongDan || data.MoTa || '';
        }
    }

    const header = panel.querySelector('h2');
    if (header) {
        header.textContent = 'Chi Tiết Bài Tập • ' + (data.TenMauTapLuyen || '');
    }

    // Hiển thị thông tin bổ sung
    const additionalInfo = document.getElementById('detailAdditionalInfo');
    if (additionalInfo) {
        let hasAdditionalInfo = false;
        
        // Thiết bị cần
        if (data.ThietBiCan) {
            const thietBiEl = document.getElementById('detailThietBi');
            const thietBiValueEl = document.getElementById('detailThietBiValue');
            if (thietBiEl && thietBiValueEl) {
                thietBiEl.style.display = 'block';
                thietBiValueEl.textContent = data.ThietBiCan;
                hasAdditionalInfo = true;
            }
        }
        
        // Số tuần
        if (data.SoTuan) {
            const soTuanEl = document.getElementById('detailSoTuan');
            const soTuanValueEl = document.getElementById('detailSoTuanValue');
            if (soTuanEl && soTuanValueEl) {
                soTuanEl.style.display = 'block';
                soTuanValueEl.textContent = `${data.SoTuan} tuần`;
                hasAdditionalInfo = true;
            }
        }
        
        // Số lần sử dụng
        if (data.SoLanSuDung !== null && data.SoLanSuDung !== undefined) {
            const soLanSuDungEl = document.getElementById('detailSoLanSuDung');
            const soLanSuDungValueEl = document.getElementById('detailSoLanSuDungValue');
            if (soLanSuDungEl && soLanSuDungValueEl) {
                soLanSuDungEl.style.display = 'block';
                soLanSuDungValueEl.textContent = data.SoLanSuDung;
                hasAdditionalInfo = true;
            }
        }
        
        // Mô tả
        if (data.MoTa) {
            const moTaEl = document.getElementById('detailMoTa');
            const moTaValueEl = document.getElementById('detailMoTaValue');
            if (moTaEl && moTaValueEl) {
                moTaEl.style.display = 'block';
                moTaValueEl.textContent = data.MoTa;
                hasAdditionalInfo = true;
            }
        }
        
        // Hiển thị phần thông tin bổ sung nếu có
        additionalInfo.style.display = hasAdditionalInfo ? 'block' : 'none';
    }

    // Cập nhật thống kê tổng quan
    // Không cần cập nhật stats nữa vì đã xóa phần thống kê
    // updateStatsSummary(data);

    panel.hidden = false;
}

// Cập nhật thống kê tổng quan
// Cập nhật ngày dự kiến hoàn thành dựa trên lịch đã được xác nhận
function updateDateRangeFromSchedule() {
    const dateRangeContent = document.getElementById('dateRangeContent');
    if (!dateRangeContent) return;
    
    // Kiểm tra xem có lịch đã được xác nhận không
    if (previewScheduleData && previewScheduleData.length > 0) {
        // Lấy ngày bắt đầu từ tuần đầu tiên
        const firstWeek = previewScheduleData[0];
        const startDate = firstWeek.startDate ? new Date(firstWeek.startDate) : null;
        
        // Lấy ngày kết thúc từ tuần cuối cùng
        const lastWeek = previewScheduleData[previewScheduleData.length - 1];
        const endDate = lastWeek.endDate ? new Date(lastWeek.endDate) : 
                       (lastWeek.startDate ? new Date(lastWeek.startDate.getTime() + 6 * 24 * 60 * 60 * 1000) : null);
        
        if (startDate && endDate) {
            const startStr = startDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const endStr = endDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            dateRangeContent.textContent = `${startStr} - ${endStr} • Dự kiến hoàn thành`;
        } else {
            dateRangeContent.textContent = 'Chưa có lịch tập';
        }
    } else {
        dateRangeContent.textContent = 'Chưa có lịch tập';
    }
}

// Kiểm tra xem một goal-item có bị disable không
function isGoalDisabled(goalValue) {
    // Nếu đã chọn "Giảm Cân", disable tất cả mục tiêu cơ
    if (selectedMucTieu === 'Giảm Cân' && goalValue !== 'giam-can') {
        return goalValue.startsWith('co-');
    }
    
    // Nếu đã chọn mục tiêu cơ, disable "Giảm Cân"
    if (goalValue === 'giam-can' && selectedCoGoals.size > 0) {
        return true;
    }
    
    // Nếu đã chọn 2 mục tiêu cơ, disable các mục tiêu cơ chưa được chọn
    if (goalValue.startsWith('co-') && selectedCoGoals.size >= MAX_CO_GOALS && !selectedCoGoals.has(goalValue)) {
        return true;
    }
    
    return false;
}

// Cập nhật trạng thái của tất cả goal-item (enable/disable)
function updateGoalItemsState() {
    const allGoalItems = document.querySelectorAll('[data-group="goal"]');
    allGoalItems.forEach(item => {
        const value = item.getAttribute('data-value');
        const isDisabled = isGoalDisabled(value);
        
        if (isDisabled) {
            item.classList.add('disabled');
            item.style.opacity = '0.5';
            item.style.cursor = 'not-allowed';
            item.style.pointerEvents = 'none';
        } else {
            item.classList.remove('disabled');
            item.style.opacity = '1';
            item.style.cursor = 'pointer';
            item.style.pointerEvents = 'auto';
        }
    });
}

// Đếm số mục tiêu cơ đã chọn
function getSelectedCoGoalsCount() {
    const selectedCoItems = document.querySelectorAll('[data-group="goal"].selected[data-value^="co-"]');
    return selectedCoItems.length;
}

(function(){
    // Toggle selections one-per-group
    document.addEventListener('click', function(e){
        const rawTarget = e.target;
        if(!(rawTarget instanceof HTMLElement)) return;
        const t = rawTarget.closest('[data-group]');
        if(!t) return;
        const group = t.getAttribute('data-group');
        if(!group) return;

        // Xử lý riêng cho goal group (cho phép chọn nhiều mục tiêu cơ)
        if(group === 'goal'){
            const value = t.getAttribute('data-value');
            const isCoGoal = value.startsWith('co-');
            const isGiamCan = value === 'giam-can';
            
            // Kiểm tra validation trước khi cho phép chọn
            if (isGoalDisabled(value)) {
                e.preventDefault();
                // Hiển thị thông báo
                if (isGiamCan && selectedCoGoals.size > 0) {
                    alert('Không thể chọn "Giảm Cân" khi đã chọn mục tiêu liên quan đến cơ. Vui lòng bỏ chọn các mục tiêu cơ trước.');
                } else if (isCoGoal && selectedMucTieu === 'Giảm Cân') {
                    alert('Không thể chọn mục tiêu liên quan đến cơ khi đã chọn "Giảm Cân". Vui lòng bỏ chọn "Giảm Cân" trước.');
                } else if (isCoGoal && selectedCoGoals.size >= MAX_CO_GOALS && !t.classList.contains('selected')) {
                    alert(`Bạn chỉ có thể chọn tối đa ${MAX_CO_GOALS} mục tiêu cơ tại một thời điểm. Vui lòng bỏ chọn một mục tiêu cơ trước.`);
                }
                return;
            }
            
            e.preventDefault();
            
            // Nếu click vào "Giảm Cân"
            if (isGiamCan) {
                // Nếu đã được chọn, bỏ chọn
                if (t.classList.contains('selected')) {
                    t.classList.remove('selected');
                    selectedMucTieu = null;
                    selectedCoGoals.clear();
                } else {
                    // Bỏ chọn tất cả mục tiêu cơ
                    document.querySelectorAll('[data-group="goal"][data-value^="co-"]').forEach(el => {
                        el.classList.remove('selected');
                        selectedCoGoals.delete(el.getAttribute('data-value'));
                    });
                    // Chọn "Giảm Cân"
                    document.querySelectorAll('[data-group="goal"]').forEach(el => el.classList.remove('selected'));
                    t.classList.add('selected');
                    selectedMucTieu = 'Giảm Cân';
                    selectedCoGoals.clear();
                }
            } 
            // Nếu click vào mục tiêu cơ
            else if (isCoGoal) {
                // Bỏ chọn "Giảm Cân" nếu có
                const giamCanItem = document.querySelector('[data-group="goal"][data-value="giam-can"]');
                if (giamCanItem && giamCanItem.classList.contains('selected')) {
                    giamCanItem.classList.remove('selected');
                    selectedMucTieu = null;
                }
                
                // Toggle mục tiêu cơ (cho phép chọn/bỏ chọn nhiều)
                if (t.classList.contains('selected')) {
                    // Bỏ chọn
                    t.classList.remove('selected');
                    selectedCoGoals.delete(value);
                } else {
                    // Chọn (nếu chưa đạt giới hạn)
                    if (selectedCoGoals.size < MAX_CO_GOALS) {
                        t.classList.add('selected');
                        selectedCoGoals.add(value);
                    } else {
                        alert(`Bạn chỉ có thể chọn tối đa ${MAX_CO_GOALS} mục tiêu cơ tại một thời điểm.`);
                        return;
                    }
                }
                
                // Cập nhật selectedMucTieu (lấy mục tiêu cơ đầu tiên nếu có, hoặc null nếu không có)
                if (selectedCoGoals.size > 0) {
                    const firstCoGoal = Array.from(selectedCoGoals)[0];
                    selectedMucTieu = mucTieuMapping[firstCoGoal];
                } else {
                    selectedMucTieu = null;
                }
            }
            
            // Cập nhật trạng thái của tất cả goal-item
            updateGoalItemsState();
            
            // Kiểm tra nếu đã chọn đủ thông tin (mục tiêu, trình độ) thì load bài tập
            if (selectedMucTieu) {
                console.log('Goal selected:', value, '-> MucTieu:', selectedMucTieu, 'CoGoals:', Array.from(selectedCoGoals));
                checkAndLoadExercises();
            } else {
                // Xóa danh sách bài tập nếu không có mục tiêu nào được chọn
                const container = document.getElementById('suggestedExercisesList');
                if (container) {
                    container.innerHTML = '';
            }
            }
            return;
        }
        
        // Xử lý cho các group khác (level, etc.) - chỉ cho phép chọn 1
        e.preventDefault();
        document.querySelectorAll('[data-group="'+group+'"]').forEach(el=>el.classList.remove('selected'));
        t.classList.add('selected');

        // Khi chọn trình độ, kiểm tra và load bài tập
        if(group === 'level'){
            checkAndLoadExercises();
        }
    });
    
    // Khởi tạo trạng thái ban đầu
    updateGoalItemsState();
})();

// Summary interactions: load detail on tile click
(function(){
    document.addEventListener('click', function(e){
        const rawTarget = e.target;
        if(!(rawTarget instanceof HTMLElement)) return;
        
        // Bỏ qua nếu click vào button "Thay đổi"
        if(rawTarget.closest('.btn.danger')) return;
        
        // Bỏ qua nếu click vào iframe hoặc video element (tránh trigger YouTube player)
        if(rawTarget.closest('iframe') || rawTarget.closest('video')) return;
        
        const card = rawTarget.closest('.exercise-card');
        if(!card) return;
        
        // Ngăn chặn event propagation để tránh trigger YouTube player
        // Không preventDefault để vẫn có thể load detail
        e.stopPropagation();
        
        // Highlight card được chọn
        document.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        
        // Lấy mauTapLuyenId từ data attribute
        const mauTapLuyenId = card.getAttribute('data-mau-tap-luyen-id');
        if(mauTapLuyenId) {
            loadExerciseDetail(parseInt(mauTapLuyenId));
        } else {
            // Fallback: sử dụng data attributes cũ nếu có
            const title = card.getAttribute('data-title') || '';
            const sessions = card.getAttribute('data-sessions') || '';
            const time = card.getAttribute('data-time') || '';
            const effect = card.getAttribute('data-effect') || '';
            const calories = card.getAttribute('data-calories') || '';
            const scheme = card.getAttribute('data-scheme') || '';
            const diff = card.getAttribute('data-difficulty') || '';
            const guide = card.getAttribute('data-guide') || '';

            const panel = document.getElementById('exerciseDetail');
            if(!panel) return;

            const setText = (id, val)=>{ const el = document.getElementById(id); if(el) el.textContent = val; };
            setText('dSessions', sessions);
            setText('dTime', time);
            setText('dEffect', effect);
            setText('dCalories', calories);
            setText('dScheme', scheme);
            setText('dDiff', diff);
            
            const guideEl = document.getElementById('dGuide');
            if(guideEl){ guideEl.textContent = guide; }

            const header = panel.querySelector('h2');
            if(header){ header.textContent = 'Chi Tiết Bài Tập • ' + title; }
            panel.hidden = false;
        }
    });
})();

// Schedule pickers
(function(){
    let openMenu;
    const days = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
    const sessions = ['Sáng','Chiều','Tối'];

    // Ràng buộc thời gian theo buổi
    const sessionTimeRanges = {
        'Sáng': { min: '04:00', max: '12:00' },
        'Chiều': { min: '12:00', max: '18:00' },
        'Tối': { min: '18:00', max: '23:00' }
    };

    function generateTimes(sessionType = null, timeStart = null){
        const list = [];
        let minHour = 5;
        let maxHour = 22;
        
        // Nếu có sessionType, giới hạn thời gian theo buổi
        if (sessionType && sessionTimeRanges[sessionType]) {
            const range = sessionTimeRanges[sessionType];
            const [minH, minM] = range.min.split(':').map(Number);
            const [maxH, maxM] = range.max.split(':').map(Number);
            minHour = minH;
            maxHour = maxH;
            // Nếu max là 23:00, cho phép đến 23:00
            if (maxH === 23) maxHour = 23;
        }
        
        // Nếu có timeStart, tính minHour từ timeStart (cho time-end)
        if (timeStart) {
            const [startH, startM] = timeStart.split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            // Tính giờ tối thiểu cho time-end (phải sau timeStart ít nhất 30 phút)
            const minEndMinutes = startMinutes + 30;
            const minEndHour = Math.floor(minEndMinutes / 60);
            const minEndMin = minEndMinutes % 60;
            
            // Nếu minEndHour vượt quá minHour từ sessionType, dùng minEndHour
            if (minEndHour > minHour || (minEndHour === minHour && minEndMin > 0)) {
                minHour = minEndHour;
            }
        }
        
        for(let h=minHour; h<=maxHour; h++){
            for(let m of [0,30]){
                // Bỏ qua nếu vượt quá max
                if (sessionType && sessionTimeRanges[sessionType]) {
                    const [maxH, maxM] = sessionTimeRanges[sessionType].max.split(':').map(Number);
                    if (h > maxH || (h === maxH && m > maxM)) continue;
                }
                
                // Nếu có timeStart, bỏ qua các giờ <= timeStart
                if (timeStart) {
                    const [startH, startM] = timeStart.split(':').map(Number);
                    const currentMinutes = h * 60 + m;
                    const startMinutes = startH * 60 + startM;
                    // Chỉ hiển thị các giờ sau timeStart ít nhất 30 phút
                    if (currentMinutes <= startMinutes) continue;
                }
                
                const hh = String(h).padStart(2,'0');
                const mm = String(m).padStart(2,'0');
                list.push(hh+':'+mm);
            }
        }
        return list;
    }

    function validateTimeRange(sessionType, timeStart, timeEnd){
        if (!sessionType || !sessionTimeRanges[sessionType]) return true;
        
        const range = sessionTimeRanges[sessionType];
        const [minH, minM] = range.min.split(':').map(Number);
        const [maxH, maxM] = range.max.split(':').map(Number);
        const [startH, startM] = timeStart.split(':').map(Number);
        const [endH, endM] = timeEnd.split(':').map(Number);
        
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const minMinutes = minH * 60 + minM;
        const maxMinutes = maxH * 60 + maxM;
        
        return startMinutes >= minMinutes && endMinutes <= maxMinutes && startMinutes < endMinutes;
    }

    function buildMenu(target, type){
        closeMenu();
        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';
        
        let options = [];
        if (type === 'day') {
            options = days;
        } else if (type === 'session') {
            // Lấy thứ từ row chứa button này
            const row = target.closest('.grid-row');
            const dayBtn = row ? row.querySelector('[data-type="day"]') : null;
            const dayText = dayBtn ? dayBtn.textContent.trim() : null;
            
            // Nếu có thứ, chỉ hiển thị các buổi chưa có trong thứ đó (loại trừ row hiện tại)
            if (dayText) {
                options = getAvailableSessionsForDay(dayText, row);
                // Nếu không còn buổi nào, vẫn hiển thị tất cả để người dùng biết
                if (options.length === 0) {
            options = sessions;
                }
            } else {
                options = sessions;
            }
        } else if (type === 'time-start' || type === 'time-end') {
            // Lấy session type từ row chứa button này
            const row = target.closest('.grid-row');
            const sessionBtn = row ? row.querySelector('[data-type="session"]') : null;
            const sessionType = sessionBtn ? sessionBtn.textContent.trim() : null;
            
            // Nếu là time-end, lấy time-start để filter
            let timeStart = null;
            if (type === 'time-end') {
                const timeStartBtn = row ? row.querySelector('[data-type="time-start"]') : null;
                timeStart = timeStartBtn ? timeStartBtn.textContent.trim() : null;
            }
            
            options = generateTimes(sessionType, timeStart);
        }
        
        options.forEach(text=>{
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = text;
            btn.addEventListener('click', ()=>{
                target.textContent = text;
                
                // Nếu thay đổi day, kiểm tra trùng và tự động chuyển buổi nếu cần
                if (type === 'day') {
                    const row = target.closest('.grid-row');
                    if (row) {
                        const sessionBtn = row.querySelector('[data-type="session"]');
                        const dayText = text; // Day mới
                        const buoi = sessionBtn ? sessionBtn.textContent.trim() : 'Sáng';
                        
                        // Kiểm tra xem buổi này đã có trong thứ mới chưa (loại trừ row hiện tại)
                        if (isDuplicateSession(dayText, buoi, '', '', row)) {
                            // Tự động chuyển sang buổi tiếp theo chưa có
                            const nextBuoi = getNextAvailableSession(dayText, buoi);
                            if (sessionBtn) {
                                sessionBtn.textContent = nextBuoi;
                                
                                // Cập nhật giờ theo buổi mới
                                const sessionRanges = {
                                    'Sáng': { min: '05:00', max: '11:00' },
                                    'Chiều': { min: '12:00', max: '18:00' },
                                    'Tối': { min: '19:00', max: '23:00' }
                                };
                                
                                if (sessionRanges[nextBuoi]) {
                                    const timeStartBtn = row.querySelector('[data-type="time-start"]');
                                    const timeEndBtn = row.querySelector('[data-type="time-end"]');
                                    if (timeStartBtn) timeStartBtn.textContent = sessionRanges[nextBuoi].min;
                                    if (timeEndBtn) timeEndBtn.textContent = sessionRanges[nextBuoi].max;
                                }
                            }
                        }
                    }
                }
                
                // Nếu thay đổi session, validate và cập nhật time-start và time-end
                if (type === 'session') {
                    const row = target.closest('.grid-row');
                    if (row) {
                        const dayBtn = row.querySelector('[data-type="day"]');
                        const dayText = dayBtn ? dayBtn.textContent.trim() : null;
                        
                        // Kiểm tra xem buổi này đã có trong thứ này chưa (loại trừ row hiện tại)
                        if (dayText && isDuplicateSession(dayText, text, '', '', row)) {
                            alert(`Buổi "${text}" đã tồn tại trong ${dayText}! Vui lòng chọn buổi khác.`);
                            closeMenu();
                            return; // Không thay đổi
                        }
                        
                        const timeStartBtn = row.querySelector('[data-type="time-start"]');
                        const timeEndBtn = row.querySelector('[data-type="time-end"]');
                        const timeStart = timeStartBtn ? timeStartBtn.textContent.trim() : '';
                        const timeEnd = timeEndBtn ? timeEndBtn.textContent.trim() : '';
                        
                        // Validate và điều chỉnh nếu cần
                        if (!validateTimeRange(text, timeStart, timeEnd)) {
                            const range = sessionTimeRanges[text];
                            if (timeStartBtn) timeStartBtn.textContent = range.min;
                            if (timeEndBtn) timeEndBtn.textContent = range.max;
                        }
                    }
                }
                
                // Nếu thay đổi time-start, cập nhật lại time-end nếu cần
                if (type === 'time-start') {
                    const row = target.closest('.grid-row');
                    if (row) {
                        const sessionBtn = row.querySelector('[data-type="session"]');
                        const timeStartBtn = row.querySelector('[data-type="time-start"]');
                        const timeEndBtn = row.querySelector('[data-type="time-end"]');
                        
                        if (sessionBtn && timeStartBtn && timeEndBtn) {
                            const sessionType = sessionBtn.textContent.trim();
                            const timeStart = timeStartBtn.textContent.trim();
                            const timeEnd = timeEndBtn.textContent.trim();
                            
                            // Kiểm tra xem time-end có còn hợp lệ không (phải sau time-start)
                            const [startH, startM] = timeStart.split(':').map(Number);
                            const [endH, endM] = timeEnd.split(':').map(Number);
                            const startMinutes = startH * 60 + startM;
                            const endMinutes = endH * 60 + endM;
                            
                            // Nếu time-end <= time-start, tự động cập nhật time-end
                            if (endMinutes <= startMinutes) {
                                // Tính time-end mới (sau time-start ít nhất 30 phút)
                                const newEndMinutes = startMinutes + 30;
                                const newEndH = Math.floor(newEndMinutes / 60);
                                const newEndM = newEndMinutes % 60;
                                
                                // Kiểm tra xem có vượt quá max của session không
                                const range = sessionTimeRanges[sessionType];
                                if (range) {
                                    const [maxH, maxM] = range.max.split(':').map(Number);
                                    const maxMinutes = maxH * 60 + maxM;
                                    
                                    if (newEndMinutes > maxMinutes) {
                                        // Nếu vượt quá, dùng max của session
                                        timeEndBtn.textContent = range.max;
                                    } else {
                                        // Nếu không, dùng giá trị mới
                                        timeEndBtn.textContent = `${String(newEndH).padStart(2,'0')}:${String(newEndM).padStart(2,'0')}`;
                                    }
                                } else {
                                    timeEndBtn.textContent = `${String(newEndH).padStart(2,'0')}:${String(newEndM).padStart(2,'0')}`;
                                }
                            }
                            
                            // Validate lại
                            const finalTimeStart = timeStartBtn.textContent.trim();
                            const finalTimeEnd = timeEndBtn.textContent.trim();
                            if (!validateTimeRange(sessionType, finalTimeStart, finalTimeEnd)) {
                                const range = sessionTimeRanges[sessionType];
                                if (range) {
                                    timeStartBtn.textContent = range.min;
                                    timeEndBtn.textContent = range.max;
                                }
                            }
                        }
                    }
                }
                
                // Nếu thay đổi time-end, validate
                if (type === 'time-end') {
                    const row = target.closest('.grid-row');
                    if (row) {
                        const sessionBtn = row.querySelector('[data-type="session"]');
                        const timeStartBtn = row.querySelector('[data-type="time-start"]');
                        const timeEndBtn = row.querySelector('[data-type="time-end"]');
                        
                        if (sessionBtn && timeStartBtn && timeEndBtn) {
                            const sessionType = sessionBtn.textContent.trim();
                            const timeStart = timeStartBtn.textContent.trim();
                            const timeEnd = timeEndBtn.textContent.trim();
                            
                            if (!validateTimeRange(sessionType, timeStart, timeEnd)) {
                                alert(`Thời gian không hợp lệ cho buổi "${sessionType}". Thời gian kết thúc phải sau thời gian bắt đầu.`);
                                // Tính lại time-end hợp lệ
                                const [startH, startM] = timeStart.split(':').map(Number);
                                const startMinutes = startH * 60 + startM;
                                const newEndMinutes = startMinutes + 30;
                                const newEndH = Math.floor(newEndMinutes / 60);
                                const newEndM = newEndMinutes % 60;
                                
                                const range = sessionTimeRanges[sessionType];
                                if (range) {
                                    const [maxH, maxM] = range.max.split(':').map(Number);
                                    const maxMinutes = maxH * 60 + maxM;
                                    
                                    if (newEndMinutes > maxMinutes) {
                                        timeEndBtn.textContent = range.max;
                                    } else {
                                        timeEndBtn.textContent = `${String(newEndH).padStart(2,'0')}:${String(newEndM).padStart(2,'0')}`;
                                    }
                                } else {
                                    timeEndBtn.textContent = `${String(newEndH).padStart(2,'0')}:${String(newEndM).padStart(2,'0')}`;
                                }
                            }
                        }
                    }
                }
                
                closeMenu();
            });
            menu.appendChild(btn);
        });
        
        // Tính toán vị trí của button và đặt menu ở đó
        const rect = target.getBoundingClientRect();
        menu.style.top = (rect.bottom + 4) + 'px';
        menu.style.left = rect.left + 'px';
        menu.style.width = rect.width + 'px';
        
        // Append menu vào body để tránh bị che bởi overflow hidden
        document.body.appendChild(menu);
        openMenu = menu;
    }

    function closeMenu(){
        if(openMenu && openMenu.parentElement){ openMenu.parentElement.removeChild(openMenu); }
        openMenu = undefined;
    }

    // Không đóng menu khi scroll - chỉ đóng khi click outside
    // (Đã loại bỏ logic scroll để tránh đóng menu khi cuộn trong dropdown)

    // Đóng menu khi window resize
    window.addEventListener('resize', function(){
        closeMenu();
    });

    document.addEventListener('click', function(e){
        const rt = e.target;
        if(!(rt instanceof HTMLElement)) return;
        const picker = rt.closest('.schedule-picker');
        if(picker){
            e.preventDefault();
            const type = picker.getAttribute('data-type');
            if(!type) return;
            buildMenu(picker, type);
            return;
        }
        // click outside
        if(!rt.closest('.dropdown-menu')) closeMenu();
    });

    // Helper: Lấy danh sách các buổi đã có trong một thứ
    function getSessionsForDay(dayText, excludeRow = null) {
        const scheduleRows = document.querySelectorAll('.session-grid .grid-row');
        const sessions = [];
        
        scheduleRows.forEach(row => {
            // Bỏ qua row hiện tại nếu được chỉ định
            if (excludeRow && row === excludeRow) return;
            
            const dayBtn = row.querySelector('[data-type="day"]');
            if (dayBtn && dayBtn.textContent.trim() === dayText) {
                const sessionBtn = row.querySelector('[data-type="session"]');
                const timeStartBtn = row.querySelector('[data-type="time-start"]');
                const timeEndBtn = row.querySelector('[data-type="time-end"]');
                
                if (sessionBtn && timeStartBtn && timeEndBtn) {
                    sessions.push({
                        buoi: sessionBtn.textContent.trim(),
                        gioBatDau: timeStartBtn.textContent.trim(),
                        gioKetThuc: timeEndBtn.textContent.trim()
                    });
                }
            }
        });
        
        return sessions;
    }
    
    // Helper: Kiểm tra xem một buổi có trùng với buổi khác không
    // Trùng nếu: cùng thứ, cùng buổi (Sáng/Chiều/Tối) - không quan tâm giờ
    function isDuplicateSession(dayText, buoi, gioBatDau, gioKetThuc, excludeRow = null) {
        const existingSessions = getSessionsForDay(dayText, excludeRow);
        // Kiểm tra xem đã có buổi cùng tên (Sáng/Chiều/Tối) trong thứ này chưa
        return existingSessions.some(s => s.buoi === buoi);
    }
    
    // Helper: Kiểm tra xem một thứ đã full buổi chưa (có đủ 3 buổi: Sáng, Chiều, Tối)
    function isDayFull(dayText) {
        const sessions = getSessionsForDay(dayText);
        const buoiSet = new Set(sessions.map(s => s.buoi));
        return buoiSet.has('Sáng') && buoiSet.has('Chiều') && buoiSet.has('Tối');
    }
    
    // Helper: Tìm thứ tiếp theo chưa full
    function getNextAvailableDay(startDay = 'Thứ 2') {
        const dayOrder = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
        const startIndex = dayOrder.indexOf(startDay);
        
        if (startIndex === -1) return 'Thứ 2';
        
        // Tìm từ thứ hiện tại đến cuối
        for (let i = startIndex; i < dayOrder.length; i++) {
            if (!isDayFull(dayOrder[i])) {
                return dayOrder[i];
            }
        }
        
        // Nếu tất cả đều full, quay lại từ đầu
        for (let i = 0; i < startIndex; i++) {
            if (!isDayFull(dayOrder[i])) {
                return dayOrder[i];
            }
        }
        
        // Nếu tất cả đều full, trả về thứ đầu tiên
        return dayOrder[0];
    }
    
    // Helper: Tìm buổi tiếp theo chưa có trong thứ
    function getNextAvailableSession(dayText, startSession = 'Sáng') {
        const sessionOrder = ['Sáng', 'Chiều', 'Tối'];
        const existingSessions = getSessionsForDay(dayText);
        const existingBuoiSet = new Set(existingSessions.map(s => s.buoi));
        
        const startIndex = sessionOrder.indexOf(startSession);
        if (startIndex === -1) {
            // Nếu startSession không hợp lệ, tìm buổi đầu tiên chưa có
            for (const buoi of sessionOrder) {
                if (!existingBuoiSet.has(buoi)) {
                    return buoi;
                }
            }
            return 'Sáng'; // Mặc định nếu tất cả đều có
        }
        
        // Tìm từ buổi hiện tại đến cuối
        for (let i = startIndex; i < sessionOrder.length; i++) {
            if (!existingBuoiSet.has(sessionOrder[i])) {
                return sessionOrder[i];
            }
        }
        
        // Nếu tất cả đều có, quay lại từ đầu
        for (let i = 0; i < startIndex; i++) {
            if (!existingBuoiSet.has(sessionOrder[i])) {
                return sessionOrder[i];
            }
        }
        
        // Nếu tất cả đều có, trả về buổi đầu tiên
        return sessionOrder[0];
    }
    
    // Helper: Lấy danh sách buổi chưa có trong thứ
    function getAvailableSessionsForDay(dayText, excludeRow = null) {
        const allSessions = ['Sáng', 'Chiều', 'Tối'];
        const existingSessions = getSessionsForDay(dayText, excludeRow);
        const existingBuoiSet = new Set(existingSessions.map(s => s.buoi));
        
        return allSessions.filter(buoi => !existingBuoiSet.has(buoi));
    }

    // Add row functionality
    function createRow(dayText = null, buoi = 'Sáng', gioBatDau = '07:00', gioKetThuc = '11:00'){
        // Nếu không chỉ định dayText, tìm thứ tiếp theo chưa full
        let targetDay = dayText || 'Thứ 2';
        
        // Kiểm tra xem thứ mặc định đã full chưa
        if (!dayText && isDayFull(targetDay)) {
            targetDay = getNextAvailableDay();
        }
        
        // Kiểm tra trùng lặp - nếu trùng, tự động chuyển sang buổi khác
        if (isDuplicateSession(targetDay, buoi, gioBatDau, gioKetThuc)) {
            // Tìm buổi tiếp theo chưa có trong thứ này
            const nextBuoi = getNextAvailableSession(targetDay, buoi);
            
            // Nếu không còn buổi nào, chuyển sang thứ tiếp theo
            if (nextBuoi === buoi && isDayFull(targetDay)) {
                targetDay = getNextAvailableDay(targetDay);
                buoi = getNextAvailableSession(targetDay);
            } else {
                buoi = nextBuoi;
            }
            
            // Cập nhật giờ theo buổi mới
            const sessionRanges = {
                'Sáng': { min: '05:00', max: '11:00' },
                'Chiều': { min: '12:00', max: '18:00' },
                'Tối': { min: '19:00', max: '23:00' }
            };
            
            if (sessionRanges[buoi]) {
                gioBatDau = sessionRanges[buoi].min;
                gioKetThuc = sessionRanges[buoi].max;
            }
        }
        
        const row = document.createElement('div');
        row.className = 'grid-row';
        row.innerHTML = `\n\
            <button class="pill schedule-picker" data-type="day">${targetDay}</button>\n\
            <button class="pill schedule-picker" data-type="session">${buoi}</button>\n\
            <button class="pill schedule-picker" data-type="time-start">${gioBatDau}</button>\n\
            <button class="pill schedule-picker" data-type="time-end">${gioKetThuc}</button>\n\
            <button class="btn-delete-session" title="Xóa buổi tập">\n\
                <i class="fas fa-trash"></i>\n\
            </button>\n`;
        
        // Thêm event listener cho nút xóa
        const deleteBtn = row.querySelector('.btn-delete-session');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                deleteSessionRow(row);
            });
            
            // Hover effect
        }
        
        return row;
    }
    
    // Xóa buổi tập
    function deleteSessionRow(row) {
        const grid = document.querySelector('.session-grid');
        if (!grid) return;
        
        // Đếm số row hiện tại (không tính grid-head)
        const rows = grid.querySelectorAll('.grid-row');
        if (rows.length <= 1) {
            alert('Phải có ít nhất một buổi tập!');
            return;
        }
        
        // Xóa row
        row.remove();
        
        // Trigger check để cập nhật preview schedule nếu cần
        if (typeof checkPreviewScheduleConditions === 'function') {
            checkPreviewScheduleConditions();
        }
    }

    window.addEventListener('DOMContentLoaded', function(){
        const addBtn = document.getElementById('addSession');
        const grid = document.querySelector('.session-grid');
        if(addBtn && grid){
            addBtn.addEventListener('click', function(){
                const newRow = createRow();
                if (newRow) {
                    grid.appendChild(newRow);
                }
            });
        }
        
        // Thêm event listener cho các nút xóa đã có trong HTML
        const existingDeleteBtns = document.querySelectorAll('.btn-delete-session');
        existingDeleteBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const row = this.closest('.grid-row');
                if (row) {
                    deleteSessionRow(row);
                }
            });
            
        });
    });
})();


// GYM Map functionality
(function(){
    let mapInstance;
    let userMarker;
    let gymLayer;

    function initMap(center){
        if(!mapInstance){
            mapInstance = L.map('gymMap', { zoomControl: true });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(mapInstance);
        }
        mapInstance.setView(center, 14);
        if(userMarker){ userMarker.remove(); }
        userMarker = L.marker(center).addTo(mapInstance).bindPopup('Vị trí của bạn');
    }

    function fetchNearbyGyms(center){
        if(gymLayer){ gymLayer.clearLayers(); }
        else { gymLayer = L.layerGroup().addTo(mapInstance); }
        const lat = center[0];
        const lon = center[1];
        const query = `[out:json];(node["amenity"="gym"](around:3000,${lat},${lon});node["leisure"="fitness_centre"](around:3000,${lat},${lon});node["sport"="fitness"](around:3000,${lat},${lon}););out center 100;`;
        fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query })
            .then(r => r.json())
            .then(data => {
                if(!data || !data.elements){ return; }
                data.elements.forEach(el => {
                    if(!el.lat || !el.lon) return;
                    const m = L.marker([el.lat, el.lon]).addTo(gymLayer);
                    const name = (el.tags && (el.tags.name || el.tags['name:en'])) || 'Phòng gym';
                    const addr = el.tags && (el.tags['addr:full'] || el.tags['addr:street'] || '');
                    m.bindPopup(`<strong>${name}</strong><br/>${addr}`);
                });
            })
            .catch(() => {});
    }

    function openAndLoad(){
        const wrapper = document.getElementById('gymMapWrapper');
        if(!wrapper) return;
        wrapper.hidden = false;
        const fallback = [21.028511, 105.804817];
        
        // Sử dụng try-catch và bind đúng context để tránh lỗi Illegal invocation
        try {
            if(navigator && navigator.geolocation && typeof navigator.geolocation.getCurrentPosition === 'function'){
                // Bind đúng context để tránh lỗi Illegal invocation
                const getCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
                
                getCurrentPosition(
                    function(pos){
                        try {
                            const center = [pos.coords.latitude, pos.coords.longitude];
                            initMap(center);
                            setTimeout(() => {
                                if(mapInstance) mapInstance.invalidateSize();
                            }, 50);
                            fetchNearbyGyms(center);
                        } catch(err) {
                            console.error('Error initializing map with user location:', err);
                            initMap(fallback);
                            setTimeout(() => {
                                if(mapInstance) mapInstance.invalidateSize();
                            }, 50);
                            fetchNearbyGyms(fallback);
                        }
                    }, 
                    function(error){
                        console.warn('Geolocation error:', error);
                        initMap(fallback);
                        setTimeout(() => {
                            if(mapInstance) mapInstance.invalidateSize();
                        }, 50);
                        fetchNearbyGyms(fallback);
                    }, 
                    { 
                        enableHighAccuracy: true, 
                        timeout: 8000,
                        maximumAge: 60000
                    }
                );
            } else {
                initMap(fallback);
                setTimeout(() => {
                    if(mapInstance) mapInstance.invalidateSize();
                }, 50);
                fetchNearbyGyms(fallback);
            }
        } catch(err) {
            console.error('Error accessing geolocation:', err);
            initMap(fallback);
            setTimeout(() => {
                if(mapInstance) mapInstance.invalidateSize();
            }, 50);
            fetchNearbyGyms(fallback);
        }
    }

    document.addEventListener('DOMContentLoaded', function(){
        const openBtn = document.getElementById('openGymMap');
        if(openBtn){
            openBtn.addEventListener('click', function(e){
                e.preventDefault();
                const wrapper = document.getElementById('gymMapWrapper');
                if(!wrapper) return;
                if(wrapper.hidden){
                    openAndLoad();
                }else{
                    wrapper.hidden = true;
                }
            });
        }
    });
})();

// Hàm load YouTube video khi click vào thumbnail (tránh lỗi Permissions API)
window.loadYouTubeVideo = function(wrapper) {
    if (!wrapper) return;
    
    // Kiểm tra xem đã load video chưa
    if (wrapper.querySelector('iframe')) {
        return; // Đã load rồi, không load lại
    }
    
    const videoId = wrapper.getAttribute('data-video-id');
    const videoUrl = wrapper.getAttribute('data-video-url');
    
    if (!videoId && !videoUrl) return;
    
    // Tạo embed URL với các tham số tối ưu
    const embedUrl = getYouTubeEmbedUrl(videoUrl || `https://www.youtube.com/watch?v=${videoId}`, true);
    if (!embedUrl) return;
    
    // Thay thế thumbnail bằng iframe
    wrapper.innerHTML = `
        <iframe 
            src="${embedUrl}" 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen
            sandbox="allow-scripts allow-same-origin allow-presentation"
            title="Exercise video">
        </iframe>
    `;
    
    // Thêm class để đánh dấu đã load
    wrapper.classList.add('video-loaded');
};

// Global error handler để bắt và xử lý lỗi "Illegal invocation" từ Permissions API
// Lỗi này thường xảy ra khi YouTube player script hoặc extension sử dụng Permissions API không đúng cách
(function(){
    // Bắt lỗi unhandled promise rejection
    window.addEventListener('unhandledrejection', function(event) {
        const errorMsg = event.reason?.message || event.reason?.toString() || '';
        const errorStack = event.reason?.stack || '';
        
        // Bắt lỗi từ YouTube player hoặc Permissions API
        if(errorMsg.includes('Illegal invocation') || 
           errorMsg.includes('Permissions') ||
           errorStack.includes('youtube.com') ||
           errorStack.includes('google.com/js')){
            console.warn('Caught Illegal invocation error (likely from YouTube player or browser extension):', event.reason);
            event.preventDefault(); // Ngăn lỗi hiển thị trong console
            return false;
        }
    }, true);

    // Bắt lỗi global - chỉ log warning, không ngăn chặn hoàn toàn
    const originalErrorHandler = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
        const errorMsg = message || '';
        const errorSource = source || '';
        const errorStack = error?.stack || '';
        
        // Bắt lỗi từ YouTube player hoặc Permissions API
        if((errorMsg.includes('Illegal invocation') || errorMsg.includes('Permissions')) &&
           (errorSource.includes('youtube.com') || errorSource.includes('google.com') || errorStack.includes('youtube'))){
            console.warn('Caught Illegal invocation error (likely from YouTube player):', message);
            return true; // Ngăn lỗi hiển thị mặc định
        }
        // Gọi error handler gốc nếu có
        if(originalErrorHandler) {
            return originalErrorHandler.call(this, message, source, lineno, colno, error);
        }
        return false;
    };

    // Wrap Permissions API nếu có để tránh lỗi từ YouTube player
    if(navigator && navigator.permissions && typeof navigator.permissions.query === 'function'){
        try {
            const originalQuery = navigator.permissions.query.bind(navigator.permissions);
            navigator.permissions.query = function(descriptor) {
                try {
                    return originalQuery(descriptor);
                } catch(err) {
                    const errorMsg = err?.message || err?.toString() || '';
                    if(errorMsg.includes('Illegal invocation')){
                        console.warn('Permissions API query error caught and handled (likely from YouTube player):', err);
                        // Trả về một promise rejected nhưng không throw error
                        return Promise.reject(err);
                    }
                    throw err;
                }
            };
        } catch(e) {
            // Nếu không thể wrap, bỏ qua
            console.warn('Could not wrap Permissions API:', e);
        }
    }
})();

// Reveal on scroll animations
(function(){
    function initRevealAnimations(){
        const groups = document.querySelectorAll('.stats, .detail-badges, .row-list');
        groups.forEach(g => g.classList.add('reveal-stagger'));
        const singles = document.querySelectorAll('.card-group, .tile.with-action, .stat-card, .badge-pill, .thumb');
        singles.forEach(el => el.classList.add('reveal'));

        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if(entry.isIntersecting){
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => io.observe(el));
    }

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', initRevealAnimations);
    }else{
        initRevealAnimations();
    }
})();

// Helper: Lấy giá trị được chọn từ các chip/button
function getSelectedValue(groupName) {
    const selected = document.querySelector(`[data-group="${groupName}"].selected`);
    if (!selected) return null;
    return selected.getAttribute('data-value') || null;
}

// Helper: Thu thập lịch tập từ schedule grid (không cần Tuần nữa)
function collectScheduleData() {
    const scheduleRows = document.querySelectorAll('.session-grid .grid-row');
    const lichTap = [];
    
    scheduleRows.forEach(row => {
        const dayBtn = row.querySelector('[data-type="day"]');
        const sessionBtn = row.querySelector('[data-type="session"]');
        const timeStartBtn = row.querySelector('[data-type="time-start"]');
        const timeEndBtn = row.querySelector('[data-type="time-end"]');
        
        if (dayBtn && sessionBtn && timeStartBtn && timeEndBtn) {
            // Chuyển đổi "Thứ 2" -> 1, "Thứ 3" -> 2, ...
            const dayText = dayBtn.textContent.trim();
            const dayMap = {
                'Thứ 2': 1, 'Thứ 3': 2, 'Thứ 4': 3, 'Thứ 5': 4,
                'Thứ 6': 5, 'Thứ 7': 6, 'Chủ nhật': 7
            };
            const ngayTrongTuan = dayMap[dayText];
            
            if (ngayTrongTuan) {
                lichTap.push({
                    NgayTrongTuan: ngayTrongTuan,
                    Buoi: sessionBtn.textContent.trim(), // 'Sáng', 'Chiều', 'Tối'
                    GioBatDau: timeStartBtn.textContent.trim(), // '07:00'
                    GioKetThuc: timeEndBtn.textContent.trim() // '11:00'
                });
            }
        }
    });
    
    return lichTap;
}

// Helper: Thu thập ngày không thể tập
function collectNgayKhongTap() {
    const ngayKhongTap = [];
    
    // Chỉ thu thập các ngày tùy chỉnh (bao gồm cả ngày lễ đã được thêm vào danh sách)
    // Vì bây giờ khi tick holiday, nó sẽ tự động thêm ngày cụ thể vào customHolidaysList
    document.querySelectorAll('.custom-holiday-item').forEach(item => {
        const date = item.getAttribute('data-date');
        if (date) {
            ngayKhongTap.push({
                Loai: 'custom',
                GiaTri: date // Format: 'YYYY-MM-DD'
            });
        }
    });
    
    return ngayKhongTap;
}


// Thêm bài tập vào mục tiêu
async function addBaiTapToMucTieu(mauTapLuyenId) {
    // Kiểm tra đã chọn mục tiêu chưa
    if (!selectedMucTieu) {
        alert('Vui lòng chọn mục tiêu trước khi chọn bài tập');
        return;
    }

    if (!currentMucTieuId) {
        // Tạo mục tiêu mới nếu chưa có
        const mucTieuResult = await createMucTieuIfNeeded();
        if (!mucTieuResult.success) {
            alert('Lỗi: ' + mucTieuResult.message);
            return;
        }
        currentMucTieuId = mucTieuResult.mucTieuId;
    }

    try {
        const response = await fetch('/MucTieu/AddBaiTapToMucTieu', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                MucTieuId: currentMucTieuId,
                MauTapLuyenId: mauTapLuyenId
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
            selectedMauTapLuyenIds.add(mauTapLuyenId);
            updateSelectedExercisesDisplay();
            updateExerciseButtonState(mauTapLuyenId, true);
            console.log('Đã thêm bài tập vào danh sách đã chọn');
            
            // Reload danh sách đã chọn nếu đang hiển thị
            if (typeof loadSelectedExercisesList === 'function') {
                loadSelectedExercisesList();
            }
        } else {
            console.error('API Error:', result);
            alert('Lỗi: ' + (result.message || 'Không thể thêm bài tập'));
        }
    } catch (error) {
        console.error('Error adding bai tap:', error);
        console.error('Error details:', {
            mauTapLuyenId: mauTapLuyenId,
            currentMucTieuId: currentMucTieuId,
            selectedMucTieu: selectedMucTieu,
            error: error.message,
            stack: error.stack
        });
        alert('Đã xảy ra lỗi khi thêm bài tập: ' + error.message);
    }
}

// Xóa bài tập khỏi mục tiêu
async function removeBaiTapFromMucTieu(mauTapLuyenId) {
    // Đảm bảo có currentMucTieuId trước khi xóa
    if (!currentMucTieuId) {
        // Thử lấy currentMucTieuId nếu chưa có
        if (selectedMucTieu) {
            const mucTieuResult = await createMucTieuIfNeeded();
            if (!mucTieuResult.success || !mucTieuResult.mucTieuId) {
                alert('Không thể xác định mục tiêu. Vui lòng chọn lại mục tiêu.');
                return;
            }
            currentMucTieuId = mucTieuResult.mucTieuId;
        } else {
            alert('Vui lòng chọn mục tiêu trước khi hủy chọn bài tập.');
            return;
        }
    }

    try {
        const response = await fetch('/MucTieu/RemoveBaiTapFromMucTieu', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                MucTieuId: currentMucTieuId,
                MauTapLuyenId: mauTapLuyenId
            })
        });

        const result = await response.json();
        if (result.success) {
            selectedMauTapLuyenIds.delete(mauTapLuyenId);
            updateSelectedExercisesDisplay();
            updateExerciseButtonState(mauTapLuyenId, false);
            console.log('Đã xóa bài tập khỏi danh sách đã chọn');
            
            // Reload danh sách đã chọn nếu đang hiển thị
            if (typeof loadSelectedExercisesList === 'function') {
                loadSelectedExercisesList();
            }
        } else {
            showErrorModal('Lỗi: ' + (result.message || 'Không thể xóa bài tập đã lên lịch'));
            // Khôi phục trạng thái button nếu lỗi
            updateExerciseButtonState(mauTapLuyenId, true);
        }
    } catch (error) {
        console.error('Error removing bai tap:', error);
        alert('Đã xảy ra lỗi khi xóa bài tập: ' + error.message);
        // Khôi phục trạng thái button nếu lỗi
        updateExerciseButtonState(mauTapLuyenId, true);
    }
}

// Tạo mục tiêu mới nếu chưa có (hoặc lấy mục tiêu hiện tại nếu đã có)
async function createMucTieuIfNeeded() {
    if (!selectedMucTieu) {
        return { success: false, message: 'Vui lòng chọn mục tiêu trước' };
    }

    try {
        // Bước 1: Kiểm tra xem đã có mục tiêu chưa hoàn thành cho loại này chưa
        const checkResponse = await fetch(`/MucTieu/GetCurrentMucTieuId?loaiMucTieu=${encodeURIComponent(selectedMucTieu)}`);
        const checkResult = await checkResponse.json();
        
        if (checkResult.success && checkResult.exists && checkResult.mucTieuId) {
            // Đã có mục tiêu, sử dụng MucTieuId hiện tại
            currentMucTieuId = checkResult.mucTieuId;
            console.log('Using existing muc tieu:', currentMucTieuId);
            return { success: true, mucTieuId: checkResult.mucTieuId };
        }

        // Bước 2: Chưa có mục tiêu, tạo mới
        const response = await fetch('/MucTieu/SaveMucTieu', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                LoaiMucTieu: selectedMucTieu,
                GiaTriMucTieu: 0,
                ThuTuHienThi: 0
            })
        });

        const result = await response.json();
        if (result.success) {
            currentMucTieuId = result.mucTieuId;
            console.log('Created new muc tieu:', currentMucTieuId);
            return { success: true, mucTieuId: result.mucTieuId };
        } else {
            return { success: false, message: result.message || 'Không thể tạo mục tiêu' };
        }
    } catch (error) {
        console.error('Error creating muc tieu:', error);
        return { success: false, message: 'Đã xảy ra lỗi khi tạo mục tiêu: ' + error.message };
    }
}

// Cập nhật trạng thái button Chọn/Hủy cho một bài tập
function updateExerciseButtonState(mauTapLuyenId, isSelected) {
    const btn = document.querySelector(`.exercise-select-btn[data-mau-tap-luyen-id="${mauTapLuyenId}"]`);
    if (!btn) return;
    
    if (isSelected) {
        btn.classList.add('selected');
        btn.innerHTML = '<i class="fas fa-check"></i> Đã chọn';
        btn.style.backgroundColor = '#10b981';
        btn.style.color = '#ffffff';
        btn.style.borderColor = '#10b981';
    } else {
        btn.classList.remove('selected');
        btn.innerHTML = '<i class="fas fa-plus"></i> Chọn';
        btn.style.backgroundColor = '';
        btn.style.color = '';
        btn.style.borderColor = '';
    }
}

// Cập nhật hiển thị danh sách bài tập đã chọn
function updateSelectedExercisesDisplay() {
    const count = selectedMauTapLuyenIds.size;
    console.log(`Đã chọn ${count} bài tập`);
    
    // Gọi hàm từ View để cập nhật UI
    if (typeof updateSelectedCountDisplay === 'function') {
        updateSelectedCountDisplay();
    }
    
    // Cập nhật button states
    document.querySelectorAll('.exercise-select-btn').forEach(btn => {
        const mauTapLuyenId = parseInt(btn.getAttribute('data-mau-tap-luyen-id'));
        const isSelected = selectedMauTapLuyenIds.has(mauTapLuyenId);
        updateExerciseButtonState(mauTapLuyenId, isSelected);
    });
}

// Lưu mục tiêu và kế hoạch tập luyện vào database
async function saveMucTieuAndKeHoach() {
    if (!selectedMucTieu || selectedMauTapLuyenIds.size === 0) {
        alert('Vui lòng chọn mục tiêu và ít nhất một bài tập trước khi lên lịch');
        return;
    }

    // Kiểm tra xem đã có preview schedule chưa
    if (!previewScheduleData || previewScheduleData.length === 0) {
        showErrorModal('Vui lòng tạo lịch luyện tập dự kiến trước khi lưu. Nhấn "Tạo lịch" để tạo lịch.');
        return;
    }

    if (!currentMucTieuId) {
        const mucTieuResult = await createMucTieuIfNeeded();
        if (!mucTieuResult.success) {
            alert('Lỗi: ' + mucTieuResult.message);
            return;
        }
        currentMucTieuId = mucTieuResult.mucTieuId;
    }

    const btnAdd = document.getElementById('btnAddExercise');
    if (!btnAdd) return;

    // Disable button và hiển thị loading
    const originalText = btnAdd.textContent;
    btnAdd.disabled = true;
    btnAdd.textContent = 'Đang lưu...';

    try {
        // Thu thập thông tin từ form
        const mucDo = getSelectedValue('level'); // 'Beginner', 'Intermediate', hoặc 'Advanced'
        
        // Giá trị đã là tiếng Anh từ data-value, không cần chuyển đổi
        const doKho = mucDo; // 'Beginner', 'Intermediate', hoặc 'Advanced'

        // Thu thập ngày không thể tập
        const ngayKhongTap = collectNgayKhongTap();
        
        // Chuyển đổi previewScheduleData thành định dạng để gửi lên server
        // Cấu trúc: weeks -> days -> sessions -> exercises
        // QUAN TRỌNG: Tuan và NgayTrongTuan phải được tính dựa trên firstMonday (Thứ 2 của tuần đầu tiên)
        // Tìm ngày đầu tiên có bài tập trong preview schedule để xác định tuần thực tế
        let firstDayWithExercises = null;
        for (const week of previewScheduleData) {
            for (const day of week.days) {
                if (day.sessions && day.sessions.length > 0) {
                    const dayDate = new Date(day.date);
                    dayDate.setHours(0, 0, 0, 0);
                    if (!firstDayWithExercises || dayDate < firstDayWithExercises) {
                        firstDayWithExercises = dayDate;
                    }
                }
            }
        }
        
        // Nếu không tìm thấy ngày nào có bài tập, dùng ngày bắt đầu của tuần đầu tiên
        if (!firstDayWithExercises) {
            const firstWeek = previewScheduleData[0];
            firstDayWithExercises = firstWeek.startDate ? new Date(firstWeek.startDate) : new Date();
            firstDayWithExercises.setHours(0, 0, 0, 0);
        }
        
        // Tính Thứ 2 của tuần chứa ngày đầu tiên có bài tập (hoặc ngày bắt đầu tuần đầu tiên)
        // Đây là firstMonday - điểm tham chiếu cho việc tính Tuan và NgayTrongTuan
        const dayOfWeekFirst = firstDayWithExercises.getDay();
        const ngayTrongTuanFirst = dayOfWeekFirst === 0 ? 7 : dayOfWeekFirst;
        const daysToMonday = ngayTrongTuanFirst - 1;
        const firstMonday = new Date(firstDayWithExercises);
        firstMonday.setDate(firstDayWithExercises.getDate() - daysToMonday);
        firstMonday.setHours(0, 0, 0, 0);
        
        console.log('First day with exercises:', formatDateToYYYYMMDD(firstDayWithExercises));
        console.log('First Monday (reference point):', formatDateToYYYYMMDD(firstMonday));
        
        // Tạo danh sách chi tiết bài tập với Tuan và NgayTrongTuan được tính lại từ firstMonday
        const chiTietBaiTap = [];
        
        console.log('Calculating chiTietBaiTap with firstMonday:', formatDateToYYYYMMDD(firstMonday));
        
        previewScheduleData.forEach(week => {
            week.days.forEach(day => {
                // Chỉ xử lý các ngày có bài tập
                if (!day.sessions || day.sessions.length === 0) {
                    return;
                }
                
                // Lấy ngày thực tế từ preview schedule
                // QUAN TRỌNG: day.date có thể là Date object hoặc string, cần normalize
                let dayDate;
                if (day.date instanceof Date) {
                    dayDate = new Date(day.date);
                } else if (typeof day.date === 'string') {
                    // Nếu là string, parse lại để đảm bảo đúng local time
                    dayDate = new Date(day.date + 'T00:00:00'); // Dùng local time
                } else {
                    dayDate = new Date(day.date);
                }
                dayDate.setHours(0, 0, 0, 0);
                
                // QUAN TRỌNG: Format ngày theo local time, KHÔNG dùng toISOString() (tránh timezone issue)
                const dayDateStr = formatDateToYYYYMMDD(dayDate);
                const dayOfWeek = dayDate.getDay();
                const ngayTrongTuanFromDate = dayOfWeek === 0 ? 7 : dayOfWeek;
                
                console.log(`[DEBUG saveMucTieuAndKeHoach] Processing day:`, {
                    dayDateOriginal: day.date,
                    dayDateType: typeof day.date,
                    dayDateIsDate: day.date instanceof Date,
                    dayDateAfterNormalize: dayDate,
                    date: dayDateStr,
                    dayOfWeek: dayOfWeek,
                    ngayTrongTuanFromDate: ngayTrongTuanFromDate,
                    dayName: day.dayName,
                    dayOfWeekFromData: day.dayOfWeek,
                    sessions: day.sessions?.length || 0
                });
                
                // Tính lại Tuan và NgayTrongTuan dựa trên firstMonday
                // Đảm bảo logic này khớp với logic trong KeHoachTapLuyen
                const daysDiff = Math.floor((dayDate - firstMonday) / (1000 * 60 * 60 * 24));
                const calculatedWeek = Math.floor(daysDiff / 7) + 1;
                const calculatedNgayTrongTuan = dayOfWeek === 0 ? 7 : dayOfWeek;
                
                console.log(`[DEBUG saveMucTieuAndKeHoach] Calculated: daysDiff=${daysDiff}, calculatedWeek=${calculatedWeek}, calculatedNgayTrongTuan=${calculatedNgayTrongTuan}`);
                
                day.sessions.forEach(session => {
                    session.exercises.forEach(exercise => {
                        // Tìm MauTapLuyenId từ exercise.name bằng cách tìm trong globalExercisesData
                        let mauTapLuyenId = null;
                        let exerciseOriginalData = null;
                        
                        // Tìm trong globalExercisesData (đã load từ GetChiTietMauTapLuyen)
                        if (globalExercisesData && globalExercisesData.length > 0) {
                            // Tìm trong ChiTietBaiTap của từng mẫu tập luyện
                            let matchedChiTiet = null;
                            let matchedMauTapLuyen = null;
                            
                            for (const mauTapLuyen of globalExercisesData) {
                                if (mauTapLuyen.ChiTietBaiTap && mauTapLuyen.ChiTietBaiTap.length > 0) {
                                    // Tìm bài tập con (ChiTietBaiTap) có tên trùng với exercise.name
                                    matchedChiTiet = mauTapLuyen.ChiTietBaiTap.find(e => e.TenbaiTap === exercise.name);
                                    if (matchedChiTiet) {
                                        matchedMauTapLuyen = mauTapLuyen;
                                        break;
                                    }
                                }
                            }
                            
                            // Nếu không tìm thấy trong ChiTietBaiTap, thử tìm theo TenMauTapLuyen (fallback)
                            if (!matchedChiTiet) {
                                const matchedExercise = globalExercisesData.find(e => e.TenMauTapLuyen === exercise.name);
                                if (matchedExercise) {
                                    matchedMauTapLuyen = matchedExercise;
                                    // Lấy bài tập đầu tiên từ ChiTietBaiTap nếu có
                                    if (matchedExercise.ChiTietBaiTap && matchedExercise.ChiTietBaiTap.length > 0) {
                                        matchedChiTiet = matchedExercise.ChiTietBaiTap[0];
                                    }
                                }
                            }
                            
                            if (matchedMauTapLuyen) {
                                mauTapLuyenId = matchedMauTapLuyen.MauTapLuyenId;
                                // Kết hợp dữ liệu từ ChiTietBaiTap và MauTapLuyen
                                exerciseOriginalData = {
                                    ...matchedChiTiet, // Dữ liệu từ ChiTietBaiTap (có VideoUrl)
                                    TenMauTapLuyen: matchedMauTapLuyen.TenMauTapLuyen,
                                    MauTapLuyenId: matchedMauTapLuyen.MauTapLuyenId
                                };
                                console.log(`[DEBUG saveMucTieuAndKeHoach] Found exercise data:`, {
                                    exerciseName: exercise.name,
                                    VideoUrl: exerciseOriginalData?.VideoUrl || exerciseOriginalData?.videoUrl,
                                    matchedChiTiet: matchedChiTiet,
                                    matchedMauTapLuyen: matchedMauTapLuyen
                                });
                            } else {
                                console.warn(`[DEBUG saveMucTieuAndKeHoach] Could not find exercise data for:`, exercise.name);
                            }
                        }
                        
                        // Nếu vẫn không tìm thấy, thử dùng originalData nếu có
                        if (!mauTapLuyenId && exercise.originalData) {
                            mauTapLuyenId = exercise.originalData.MauTapLuyenId || exercise.originalData.mauTapLuyenId;
                            exerciseOriginalData = exercise.originalData;
                        }
                        
                        // Chỉ thêm nếu tìm thấy MauTapLuyenId
                        if (mauTapLuyenId) {
                            // QUAN TRỌNG: Format ngày theo local time, KHÔNG dùng toISOString() (tránh timezone issue)
                            const ngayTapStr = formatDateToYYYYMMDD(dayDate);
                            
                            // Verify: Kiểm tra ngày trước khi gửi
                            const verifyDate = new Date(ngayTapStr + 'T00:00:00'); // Dùng local time
                            verifyDate.setHours(0, 0, 0, 0);
                            const verifyDayOfWeek = verifyDate.getDay();
                            const verifyNgayTrongTuan = verifyDayOfWeek === 0 ? 7 : verifyDayOfWeek;
                            
                            console.log(`[DEBUG saveMucTieuAndKeHoach] Adding exercise:`, {
                                exerciseName: exercise.name,
                                ngayTapStr: ngayTapStr,
                                dayDateOriginal: day.date,
                                verifyNgayTrongTuan: verifyNgayTrongTuan,
                                calculatedNgayTrongTuan: calculatedNgayTrongTuan,
                                dayOfWeekFromData: day.dayOfWeek,
                                dayName: day.dayName
                            });
                            
                            chiTietBaiTap.push({
                                MauTapLuyenId: mauTapLuyenId,
                                TenBaiTap: exercise.name,
                                SoHiep: exerciseOriginalData?.SoSets || exerciseOriginalData?.soSets || null,
                                SoLan: exerciseOriginalData?.SoReps || exerciseOriginalData?.soReps || null,
                                ThoiLuongPhut: exercise.time,
                                Tuan: calculatedWeek, // Tính lại dựa trên firstMonday để khớp với logic hiển thị (giữ để tương thích)
                                NgayTrongTuan: calculatedNgayTrongTuan, // Tính lại dựa trên ngày thực tế (giữ để tương thích)
                                NgayTap: ngayTapStr, // Ngày cụ thể từ preview schedule (YYYY-MM-DD)
                                ThuTuHienThi: exerciseOriginalData?.ThuTuHienThi || exerciseOriginalData?.thuTuHienThi || 0,
                                VideoUrl: exerciseOriginalData?.VideoUrl || exerciseOriginalData?.videoUrl || null,
                                GhiChu: exerciseOriginalData?.GhiChu || exerciseOriginalData?.ghiChu || null,
                                LichTap: {
                                    Buoi: session.buoi,
                                    GioBatDau: session.gioBatDau,
                                    GioKetThuc: session.gioKetThuc
                                }
                            });
                            
                            console.log(`[DEBUG saveMucTieuAndKeHoach] Added to chiTietBaiTap: ${exercise.name}, NgayTap: ${ngayTapStr}, Tuan: ${calculatedWeek}, NgayTrongTuan: ${calculatedNgayTrongTuan}`);
                        } else {
                            console.warn(`Không tìm thấy MauTapLuyenId cho bài tập: ${exercise.name}`);
                        }
                    });
                });
            });
        });
        
        // Debug: Log toàn bộ dữ liệu trước khi gửi
        console.log(`[DEBUG saveMucTieuAndKeHoach] Total chiTietBaiTap: ${chiTietBaiTap.length}`);
        chiTietBaiTap.forEach((item, index) => {
            console.log(`[DEBUG saveMucTieuAndKeHoach] Item ${index + 1}:`, {
                TenBaiTap: item.TenBaiTap,
                NgayTap: item.NgayTap,
                Tuan: item.Tuan,
                NgayTrongTuan: item.NgayTrongTuan
            });
        });
        
        // Lưu kế hoạch tập luyện từ preview schedule
        const response = await fetch('/MucTieu/SaveKeHoachTapLuyenFromPreviewSchedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                MucTieuId: currentMucTieuId,
                MucDo: doKho,
                NgayBatDau: formatDateToYYYYMMDD(firstMonday), // YYYY-MM-DD (local time)
                NgayKhongTap: ngayKhongTap.length > 0 ? ngayKhongTap : null,
                ChiTietBaiTap: chiTietBaiTap
            })
        });

        const result = await response.json();

        if (result.success) {
            // Hiển thị modal thông báo thành công
            showSuccessModal('Đã lưu kế hoạch tập luyện thành công!', () => {
                // Redirect đến trang Kế hoạch tập luyện sau khi đóng modal
                window.location.href = '/KeHoachTapLuyen';
            });
        } else {
            showErrorModal('Lỗi: ' + (result.message || 'Không thể lưu kế hoạch tập luyện'));
        }
    } catch (error) {
        console.error('Error saving ke hoach tap luyen:', error);
        showErrorModal('Đã xảy ra lỗi khi lưu kế hoạch tập luyện');
    } finally {
        // Restore button
        btnAdd.disabled = false;
        btnAdd.textContent = originalText;
    }
}

// Hàm hiển thị modal thông báo thành công (định nghĩa global để có thể gọi từ bất kỳ đâu)
function showSuccessModal(message, onClose = null) {
    // Xóa modal cũ nếu có
    const existingModal = document.getElementById('notificationModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Tạo modal mới
    const modal = document.createElement('div');
        modal.id = 'notificationModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(5px); animation: fadeIn 0.3s ease;';
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98)); border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 20px; padding: 2.5rem; max-width: 500px; width: 90%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); animation: slideUp 0.3s ease;">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 1.5rem; background: linear-gradient(135deg, #4ade80, #22d3ee); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(74, 222, 128, 0.3);">
                        <i class="fas fa-check-circle" style="font-size: 3rem; color: white;"></i>
                    </div>
                    <h3 style="margin: 0; color: #fff; font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Thành công!</h3>
                </div>
                <p style="color: #cbd5e1; margin-bottom: 2rem; line-height: 1.6; font-size: 1rem; text-align: center;">${message}</p>
                <div style="display: flex; justify-content: center; gap: 1rem;">
                    <button id="notificationModalOk" style="padding: 0.875rem 2rem; background: linear-gradient(135deg, #4ade80, #22d3ee); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(74, 222, 128, 0.3);">
                        <i class="fas fa-check" style="margin-right: 0.5rem;"></i>Đã hiểu
                    </button>
                </div>
            </div>
    `;
    
    document.body.appendChild(modal);
    
    // Thêm animation styles nếu chưa có
    if (!document.getElementById('modalAnimationStyles')) {
        const style = document.createElement('style');
        style.id = 'modalAnimationStyles';
        style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from {
                        transform: translateY(30px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                #notificationModal button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(74, 222, 128, 0.4) !important;
                }
        `;
        document.head.appendChild(style);
    }
    
    // Event listener cho nút OK
    const okButton = modal.querySelector('#notificationModalOk');
    const closeModal = () => {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            modal.remove();
            if (onClose) onClose();
        }, 300);
    };
    
    okButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}
    
// Hàm hiển thị modal thông báo lỗi (định nghĩa global để có thể gọi từ bất kỳ đâu)
function showErrorModal(message) {
    // Xóa modal cũ nếu có
    const existingModal = document.getElementById('notificationModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Tạo modal mới
    const modal = document.createElement('div');
    modal.id = 'notificationModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(5px); animation: fadeIn 0.3s ease;';
    
    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98)); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 20px; padding: 2.5rem; max-width: 500px; width: 90%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); animation: slideUp 0.3s ease;">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="width: 80px; height: 80px; margin: 0 auto 1.5rem; background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: white;"></i>
                </div>
                <h3 style="margin: 0; color: #fff; font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Có lỗi xảy ra</h3>
            </div>
            <p style="color: #cbd5e1; margin-bottom: 2rem; line-height: 1.6; font-size: 1rem; text-align: center;">${message}</p>
            <div style="display: flex; justify-content: center; gap: 1rem;">
                <button id="notificationModalOk" style="padding: 0.875rem 2rem; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);">
                    <i class="fas fa-times" style="margin-right: 0.5rem;"></i>Đã hiểu
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listener cho nút OK
    const okButton = modal.querySelector('#notificationModalOk');
    const closeModal = () => {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            modal.remove();
        }, 300);
    };
    
    okButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

// Event listener cho nút "Thêm bài tập"
document.addEventListener('DOMContentLoaded', function() {
    const btnAdd = document.getElementById('btnAddExercise');
    if (btnAdd) {
        btnAdd.addEventListener('click', saveMucTieuAndKeHoach);
    }
    
    // Xử lý "Ngày không thể tập"
    const addCustomHolidayBtn = document.getElementById('addCustomHoliday');
    const customHolidayDateInput = document.getElementById('customHolidayDate');
    const customHolidaysList = document.getElementById('customHolidaysList');
    
    if (addCustomHolidayBtn && customHolidayDateInput && customHolidaysList) {
        addCustomHolidayBtn.addEventListener('click', function() {
            const dateValue = customHolidayDateInput.value;
            if (!dateValue) {
                showNotificationModal('Vui lòng chọn ngày trước khi thêm vào danh sách.', 'warning');
                return;
            }
            
            // Kiểm tra xem ngày đã được thêm chưa
            const existingItems = customHolidaysList.querySelectorAll(`[data-date="${dateValue}"]`);
            if (existingItems.length > 0) {
                showNotificationModal('Ngày này đã được thêm vào danh sách rồi.', 'info');
                return;
            }
            
            // Tạo item mới
            const dateObj = new Date(dateValue);
            const dateStr = dateObj.toLocaleDateString('vi-VN', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            });
            
            const item = document.createElement('div');
            item.className = 'custom-holiday-item';
            item.setAttribute('data-date', dateValue);
            item.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; color: #ef4444; font-size: 0.875rem;';
            item.innerHTML = `
                <span>${dateStr}</span>
                <button type="button" class="remove-custom-holiday" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0; font-size: 1rem;">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            // Thêm event listener cho nút xóa
            const removeBtn = item.querySelector('.remove-custom-holiday');
            if (removeBtn) {
                removeBtn.addEventListener('click', function() {
                    item.remove();
                });
            }
            
            customHolidaysList.appendChild(item);
            customHolidayDateInput.value = ''; // Reset input
        });
    }
    
    // Xử lý checkbox ngày lễ - tự động thêm/xóa ngày vào danh sách
    const holidayCheckboxes = document.querySelectorAll('.holiday-checkbox');
    holidayCheckboxes.forEach(checkbox => {
        // Thêm event listener để cập nhật style và thêm/xóa ngày
        checkbox.addEventListener('change', function() {
            const label = this.closest('label');
            const holidayType = this.getAttribute('data-holiday');
            const customHolidaysList = document.getElementById('customHolidaysList');
            
            if (!customHolidaysList || !holidayType) return;
            
            // Cập nhật style
            if (label) {
                if (this.checked) {
                    label.style.background = 'rgba(59, 130, 246, 0.25)';
                    label.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                    label.style.color = '#60a5fa';
                } else {
                    label.style.background = 'rgba(59, 130, 246, 0.1)';
                    label.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                    label.style.color = '#cbd5e1';
                }
            }
            
            if (this.checked) {
                // Thêm ngày lễ vào danh sách
                const currentYear = new Date().getFullYear();
                const holidayDates = getHolidayDates(holidayType, currentYear);
                
                holidayDates.forEach(date => {
                    // Format ngày thành YYYY-MM-DD
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const dateValue = `${year}-${month}-${day}`;
                    
                    // Kiểm tra xem ngày đã được thêm chưa
                    const existingItems = customHolidaysList.querySelectorAll(`[data-date="${dateValue}"]`);
                    if (existingItems.length > 0) return; // Đã có rồi, bỏ qua
                    
                    // Tạo item mới
                    const dateObj = new Date(date);
                    const dateStr = dateObj.toLocaleDateString('vi-VN', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                    });
                    
                    const item = document.createElement('div');
                    item.className = 'custom-holiday-item';
                    item.setAttribute('data-date', dateValue);
                    item.setAttribute('data-holiday-type', holidayType); // Đánh dấu để xóa sau
                    item.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; color: #ef4444; font-size: 0.875rem;';
                    item.innerHTML = `
                        <span>${dateStr}</span>
                        <button type="button" class="remove-custom-holiday" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0; font-size: 1rem;">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    
                    // Thêm event listener cho nút xóa
                    const removeBtn = item.querySelector('.remove-custom-holiday');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', function() {
                            item.remove();
                            // Bỏ tick checkbox khi xóa
                            checkbox.checked = false;
                            checkbox.dispatchEvent(new Event('change'));
                        });
                    }
                    
                    customHolidaysList.appendChild(item);
                }); // End forEach holidayDates
            } else {
                // Xóa tất cả ngày lễ khỏi danh sách
                const holidayItems = customHolidaysList.querySelectorAll(`[data-holiday-type="${holidayType}"]`);
                holidayItems.forEach(item => {
                    item.remove();
                });
            }
        });
        
        // Trigger change event để cập nhật style và thêm ngày ban đầu nếu đã checked
        if (checkbox.checked) {
            checkbox.dispatchEvent(new Event('change'));
        }
    });
    
    // Khởi tạo logic cho "Lịch luyện tập dự kiến"
    initPreviewSchedule();
});

// Hàm hiển thị modal thông báo (giữ lại để tương thích)
function showNotificationModal(message, type = 'info') {
    if (type === 'error') {
        showErrorModal(message);
    } else {
        showSuccessModal(message);
    }
}

// ========== LỊCH LUYỆN TẬP DỰ KIẾN ==========

let previewScheduleStartOption = null; // 'thisWeek' hoặc 'nextWeek'
let previewScheduleData = null; // Dữ liệu lịch đã tạo

// Khởi tạo logic cho "Lịch luyện tập dự kiến"
function initPreviewSchedule() {
    // Kiểm tra điều kiện hiển thị nút "Tạo lịch"
    checkPreviewScheduleConditions();
    
    // Lắng nghe thay đổi trong schedule - sử dụng event delegation
    document.addEventListener('click', function(e) {
        if (e.target.closest('.schedule-picker') || e.target.closest('#addSession')) {
            setTimeout(() => {
                checkPreviewScheduleConditions();
            }, 100);
        }
    });
    
    // Lắng nghe thay đổi trong selected exercises - override hàm updateSelectedExercisesDisplay
    const originalUpdateSelected = window.updateSelectedExercisesDisplay;
    window.updateSelectedExercisesDisplay = function() {
        if (originalUpdateSelected) originalUpdateSelected();
        checkPreviewScheduleConditions();
    };
    
    // Không dùng setInterval nữa vì nó gây reset state khi click button
    
    // Event listeners cho các nút
    const btnCreateSchedule = document.getElementById('btnCreateSchedule');
    const btnStartThisWeek = document.getElementById('btnStartThisWeek');
    const btnStartNextWeek = document.getElementById('btnStartNextWeek');
    
    if (btnCreateSchedule) {
        btnCreateSchedule.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showPreviewScheduleOptions();
        });
    }
    
    if (btnStartThisWeek) {
        btnStartThisWeek.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            previewScheduleStartOption = 'thisWeek';
            // Tạo lịch ngay để người dùng xem
            generatePreviewSchedule('thisWeek');
        });
    }
    
    if (btnStartNextWeek) {
        btnStartNextWeek.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            previewScheduleStartOption = 'nextWeek';
            // Tạo lịch ngay để người dùng xem
            generatePreviewSchedule('nextWeek');
        });
    }
    
    // Event listener cho nút "Quay lại"
    const btnBackToCreate = document.getElementById('btnBackToCreate');
    if (btnBackToCreate) {
        btnBackToCreate.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Reset về trạng thái ban đầu
            previewScheduleStartOption = null;
            previewScheduleData = null; // Xóa dữ liệu lịch đã tạo
            
            // Ẩn options và calendar
            const optionsDiv = document.getElementById('previewScheduleOptions');
            const calendarDiv = document.getElementById('previewScheduleCalendar');
            if (optionsDiv) optionsDiv.style.display = 'none';
            if (calendarDiv) {
                calendarDiv.style.display = 'none';
                calendarDiv.innerHTML = ''; // Xóa nội dung lịch
            }
            
            // Hiển thị lại nút "Tạo lịch"
            const actionsDiv = document.getElementById('previewScheduleActions');
            if (actionsDiv) actionsDiv.style.display = 'block';
        });
    }
}

// Reset trạng thái preview schedule về ban đầu
function resetPreviewScheduleState() {
    previewScheduleStartOption = null;
    previewScheduleData = null;
    
    // Ẩn options và calendar
    const optionsDiv = document.getElementById('previewScheduleOptions');
    const calendarDiv = document.getElementById('previewScheduleCalendar');
    if (optionsDiv) {
        optionsDiv.style.display = 'none';
        // Xóa nút xác nhận nếu có
        const confirmBtn = document.getElementById('btnConfirmSchedule');
        if (confirmBtn) {
            confirmBtn.closest('div').remove();
        }
    }
    if (calendarDiv) {
        calendarDiv.style.display = 'none';
        calendarDiv.innerHTML = '';
    }
    
    // Cập nhật lại ngày dự kiến hoàn thành
    updateDateRangeFromSchedule();
    
    // Hiển thị lại nút "Tạo lịch"
    const actionsDiv = document.getElementById('previewScheduleActions');
    if (actionsDiv) {
        actionsDiv.innerHTML = `
            <button class="btn start-orange" id="btnCreateSchedule" style="padding: 0.75rem 1.5rem; font-size: 1rem;">
                <i class="fas fa-calendar-plus"></i> Tạo lịch
            </button>
        `;
        actionsDiv.style.display = 'block';
        
        // Thêm lại event listener cho nút "Tạo lịch"
        const btnCreateSchedule = actionsDiv.querySelector('#btnCreateSchedule');
        if (btnCreateSchedule) {
            btnCreateSchedule.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showPreviewScheduleOptions();
            });
        }
    }
}

// Kiểm tra điều kiện để hiển thị nút "Tạo lịch"
function checkPreviewScheduleConditions() {
    const scheduleData = collectScheduleData();
    const hasSelectedExercises = selectedMauTapLuyenIds && selectedMauTapLuyenIds.size > 0;
    const hasSchedule = scheduleData && scheduleData.length > 0;
    
    const emptyDiv = document.getElementById('previewScheduleEmpty');
    const actionsDiv = document.getElementById('previewScheduleActions');
    const optionsDiv = document.getElementById('previewScheduleOptions');
    const calendarDiv = document.getElementById('previewScheduleCalendar');
    
    // Nếu đang hiển thị options hoặc calendar, không reset
    if (previewScheduleStartOption !== null) {
        return; // Giữ nguyên trạng thái hiện tại
    }
    
    if (hasSelectedExercises && hasSchedule) {
        // Đã chọn đủ, hiển thị nút "Tạo lịch"
        if (emptyDiv) emptyDiv.style.display = 'none';
        if (actionsDiv) actionsDiv.style.display = 'block';
        if (optionsDiv) optionsDiv.style.display = 'none';
        if (calendarDiv) calendarDiv.style.display = 'none';
    } else {
        // Chưa chọn đủ, hiển thị thông báo
        if (emptyDiv) emptyDiv.style.display = 'block';
        if (actionsDiv) actionsDiv.style.display = 'none';
        if (optionsDiv) optionsDiv.style.display = 'none';
        if (calendarDiv) {
            calendarDiv.style.display = 'none';
            calendarDiv.innerHTML = '';
        }
    }
}

// Hiển thị options "Bắt đầu trong tuần này" / "Bắt đầu vào tuần sau"
function showPreviewScheduleOptions() {
    const actionsDiv = document.getElementById('previewScheduleActions');
    const optionsDiv = document.getElementById('previewScheduleOptions');
    
    if (actionsDiv) actionsDiv.style.display = 'none';
    if (optionsDiv) optionsDiv.style.display = 'flex';
}


// Helper: Chuyển đổi ngày lễ thành ngày cụ thể
function getHolidayDates(holidayType, year) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Tính toán ngày lễ theo năm, nếu đã qua thì lấy năm sau
    const getTetDates = (y) => {
        const tetDates = [];
        // Tết Nguyên Đán thường kéo dài từ 29/12 (âm lịch) đến mùng 3 Tết
        // Năm 2025: Tết là 29/1/2025 (mùng 1 Tết)
        if (y === 2025) {
            tetDates.push(new Date(2025, 0, 29)); // 29/1/2025
            tetDates.push(new Date(2025, 0, 30)); // 30/1/2025
            tetDates.push(new Date(2025, 0, 31)); // 31/1/2025
            tetDates.push(new Date(2025, 1, 1));  // 1/2/2025
            tetDates.push(new Date(2025, 1, 2));  // 2/2/2025
        } else if (y === 2026) {
            tetDates.push(new Date(2026, 1, 17)); // 17/2/2026
            tetDates.push(new Date(2026, 1, 18)); // 18/2/2026
            tetDates.push(new Date(2026, 1, 19)); // 19/2/2026
            tetDates.push(new Date(2026, 1, 20)); // 20/2/2026
            tetDates.push(new Date(2026, 1, 21)); // 21/2/2026
        } else if (y === 2027) {
            tetDates.push(new Date(2027, 1, 6));  // 6/2/2027
            tetDates.push(new Date(2027, 1, 7));  // 7/2/2027
            tetDates.push(new Date(2027, 1, 8));  // 8/2/2027
            tetDates.push(new Date(2027, 1, 9));  // 9/2/2027
            tetDates.push(new Date(2027, 1, 10)); // 10/2/2027
        } else {
            // Mặc định: giả sử Tết vào cuối tháng 1
            tetDates.push(new Date(y, 0, 29));
            tetDates.push(new Date(y, 0, 30));
            tetDates.push(new Date(y, 0, 31));
            tetDates.push(new Date(y, 1, 1));
            tetDates.push(new Date(y, 1, 2));
        }
        return tetDates;
    };
    
    const holidays = {
        'tet': (() => {
            // Lấy Tết của năm hiện tại
            let tetDates = getTetDates(year);
            // Kiểm tra xem Tết đã qua chưa (so sánh với ngày cuối cùng của Tết)
            const lastTetDate = tetDates[tetDates.length - 1];
            if (lastTetDate < today) {
                // Tết đã qua, lấy Tết năm sau
                tetDates = getTetDates(year + 1);
            }
            return tetDates;
        })(),
        'giang-sinh': (() => {
            // Giáng Sinh: 25/12
            const christmas = new Date(year, 11, 25);
            if (christmas < today) {
                // Đã qua, lấy năm sau
                return [new Date(year + 1, 11, 25)];
            }
            return [christmas];
        })(),
        'quoc-khanh': (() => {
            // Quốc Khánh: 2/9
            const nationalDay = new Date(year, 8, 2);
            if (nationalDay < today) {
                // Đã qua, lấy năm sau
                return [new Date(year + 1, 8, 2)];
            }
            return [nationalDay];
        })(),
        'le-lao-dong': (() => {
            // Lễ Lao Động: 1/5
            const laborDay = new Date(year, 4, 1);
            if (laborDay < today) {
                // Đã qua, lấy năm sau
                return [new Date(year + 1, 4, 1)];
            }
            return [laborDay];
        })()
    };
    return holidays[holidayType] || [];
}

// Helper: Lấy danh sách ngày không thể tập dưới dạng Date
function getBlockedDates() {
    const ngayKhongTap = collectNgayKhongTap();
    const blockedDates = [];
    const currentYear = new Date().getFullYear();
    
    ngayKhongTap.forEach(item => {
        if (item.Loai === 'custom') {
            // Ngày tùy chỉnh: format 'YYYY-MM-DD'
            const date = new Date(item.GiaTri);
            if (!isNaN(date.getTime())) {
                date.setHours(0, 0, 0, 0); // Reset time để so sánh chính xác
                blockedDates.push(date);
            }
        } else if (item.Loai === 'holiday') {
            // Ngày lễ: lấy danh sách ngày từ holiday type
            const holidayDates = getHolidayDates(item.GiaTri, currentYear);
            holidayDates.forEach(d => {
                d.setHours(0, 0, 0, 0); // Reset time để so sánh chính xác
            });
            blockedDates.push(...holidayDates);
        }
    });
    
    return blockedDates;
}

// Helper: Kiểm tra xem một ngày có bị chặn không
function isDateBlocked(date, blockedDates) {
    if (!date || !blockedDates || blockedDates.length === 0) return false;
    
    // Reset time component để so sánh chỉ ngày
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    const dateStr = formatDateForComparison(dateToCheck);
    
    return blockedDates.some(blocked => {
        if (!blocked) return false;
        const blockedDate = new Date(blocked);
        blockedDate.setHours(0, 0, 0, 0);
        return formatDateForComparison(blockedDate) === dateStr;
    });
}

// Helper: Format ngày để so sánh (YYYY-MM-DD) - dùng local time, không dùng UTC
function formatDateForComparison(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper: Format ngày theo YYYY-MM-DD từ local date (tránh timezone issue với toISOString)
function formatDateToYYYYMMDD(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Tạo lịch dự kiến dựa trên schedule và exercises
async function generatePreviewSchedule(startOption) {
    const scheduleData = collectScheduleData();
    
    // Debug: Log scheduleData để kiểm tra
    console.log(`[DEBUG generatePreviewSchedule] scheduleData:`, scheduleData);
    scheduleData.forEach(s => {
        console.log(`[DEBUG generatePreviewSchedule] Schedule: NgayTrongTuan=${s.NgayTrongTuan}, Buoi=${s.Buoi}, GioBatDau=${s.GioBatDau}, GioKetThuc=${s.GioKetThuc}`);
    });
    
    if (!scheduleData || scheduleData.length === 0) {
        alert('Vui lòng chọn lịch tập trước');
        return;
    }
    
    if (!selectedMauTapLuyenIds || selectedMauTapLuyenIds.size === 0) {
        alert('Vui lòng chọn ít nhất một bài tập');
        return;
    }
    
    // Lấy danh sách ngày không thể tập
    const blockedDates = getBlockedDates();
    
    // Tính ngày bắt đầu
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset giờ để so sánh ngày chính xác
    let startDate = new Date(today);
    
    if (startOption === 'thisWeek') {
        // Bắt đầu từ thứ 2 của tuần này, nhưng không được là quá khứ
        const dayOfWeek = today.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ...
        const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 1 - dayOfWeek);
        startDate.setDate(today.getDate() + daysToMonday);
        startDate.setHours(0, 0, 0, 0);
        
        // Nếu thứ 2 của tuần này là quá khứ, bắt đầu từ hôm nay
        if (startDate < today) {
            startDate = new Date(today);
        }
    } else if (startOption === 'nextWeek') {
        // Bắt đầu từ thứ 2 của tuần sau
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 8 : (dayOfWeek === 1 ? 7 : 8 - dayOfWeek);
        startDate.setDate(today.getDate() + daysToMonday);
        startDate.setHours(0, 0, 0, 0);
    }
    
    // Lấy danh sách bài tập đã chọn
    const exerciseIds = Array.from(selectedMauTapLuyenIds);
    const exercisesData = [];
    
    // Load chi tiết các bài tập
    for (const exerciseId of exerciseIds) {
        try {
            const response = await fetch(`/MucTieu/GetChiTietMauTapLuyen?mauTapLuyenId=${exerciseId}`);
            const result = await response.json();
            if (result.success && result.data) {
                exercisesData.push(result.data);
            }
        } catch (error) {
            console.error(`Error loading exercise ${exerciseId}:`, error);
        }
    }
    
    // Lưu vào biến global để dùng khi lưu lịch
    globalExercisesData = exercisesData;
    
    // Tạo danh sách bài tập cần phân phối (queue)
    const exerciseQueue = exercisesData.map(exercise => ({
        name: exercise.TenMauTapLuyen,
        time: exercise.ThoiLuongPhut || 30,
        calo: exercise.CaloUocTinh || 0,
        difficulty: exercise.DoKho || 'Trung bình',
        originalData: exercise
    }));
    
    // Tính số tuần dựa trên độ khó của bài tập
    // Quy tắc: Dễ = 4 tuần, Trung bình = 6 tuần, Nâng cao = 8 tuần
    const getWeeksByDifficulty = (difficulty) => {
        const diffLower = (difficulty || '').toLowerCase().trim();
        if (diffLower === 'beginner' || diffLower === 'dễ' || diffLower === 'easy') {
            return 4;
        } else if (diffLower === 'intermediate' || diffLower === 'trung bình' || diffLower === 'medium') {
            return 6;
        } else if (diffLower === 'advanced' || diffLower === 'nâng cao' || diffLower === 'khó' || diffLower === 'hard') {
            return 8;
        }
        // Mặc định là trung bình nếu không xác định được
        return 6;
    };
    
    // Tìm độ khó cao nhất trong các bài tập đã chọn
    const difficultyLevels = {
        'Dễ': 1,
        'Beginner': 1,
        'Easy': 1,
        'Trung bình': 2,
        'Intermediate': 2,
        'Medium': 2,
        'Nâng cao': 3,
        'Advanced': 3,
        'Khó': 3,
        'Hard': 3
    };
    
    let maxDifficulty = 'Trung bình';
    let maxDifficultyLevel = 2;
    
    exerciseQueue.forEach(exercise => {
        const diff = (exercise.difficulty || 'Trung bình').trim();
        const level = difficultyLevels[diff] || difficultyLevels[diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase()] || 2;
        if (level > maxDifficultyLevel) {
            maxDifficultyLevel = level;
            maxDifficulty = diff;
        }
    });
    
    // Tính số tuần dựa trên độ khó cao nhất
    const maxWeeks = getWeeksByDifficulty(maxDifficulty);
    
    // Tính số ngày có trong schedule (không bị chặn) để rải đều bài tập
    const getAvailableDaysInWeek = (weekStartDate, blockedDayHandling, actualStartDate = null, weekEndDate = null) => {
        const availableDays = [];
        
        // QUAN TRỌNG: Đảm bảo bắt đầu từ Thứ 2 của tuần
        // Tính Thứ 2 của tuần chứa weekStartDate
        const getMondayOfWeek = (date) => {
            const d = new Date(date);
            const day = d.getDay();
            const diff = day === 0 ? 6 : day - 1; // Thứ 2 = 1, diff = 0; CN = 0, diff = 6
            d.setDate(d.getDate() - diff);
            d.setHours(0, 0, 0, 0);
            return d;
        };
        
        const weekStartMonday = getMondayOfWeek(weekStartDate);
        const startDateToUse = actualStartDate && actualStartDate >= weekStartMonday ? actualStartDate : weekStartMonday;
        const endDateToUse = weekEndDate || (() => {
            const end = new Date(weekStartMonday);
            end.setDate(weekStartMonday.getDate() + 6); // Chủ nhật (6 ngày sau Thứ 2)
            return end;
        })();
        
        // Tính số ngày cần kiểm tra (từ Thứ 2 đến Chủ nhật)
        const daysDiff = Math.ceil((endDateToUse - startDateToUse) / (1000 * 60 * 60 * 24)) + 1;
        
        console.log(`[DEBUG getAvailableDaysInWeek] weekStartDate=${formatDateToYYYYMMDD(weekStartDate)}, weekStartMonday=${formatDateToYYYYMMDD(weekStartMonday)}, startDateToUse=${formatDateToYYYYMMDD(startDateToUse)}, endDateToUse=${formatDateToYYYYMMDD(endDateToUse)}, daysDiff=${daysDiff}`);
        
        for (let dayOffset = 0; dayOffset < daysDiff; dayOffset++) {
            const currentDate = new Date(startDateToUse);
            currentDate.setDate(startDateToUse.getDate() + dayOffset);
            
            // Kiểm tra xem ngày này có vượt quá endDateToUse không
            if (currentDate > endDateToUse) break;
            
            const dayOfWeek = currentDate.getDay();
            const ngayTrongTuan = dayOfWeek === 0 ? 7 : dayOfWeek;
            const isBlocked = isDateBlocked(currentDate, blockedDates);
            const matchingSchedules = scheduleData.filter(s => s.NgayTrongTuan === ngayTrongTuan);
            
            console.log(`[DEBUG getAvailableDaysInWeek] dayOffset=${dayOffset}, currentDate=${formatDateToYYYYMMDD(currentDate)}, dayOfWeek=${dayOfWeek}, ngayTrongTuan=${ngayTrongTuan}, matchingSchedules=${matchingSchedules.length}, isBlocked=${isBlocked}`);
            
            // Kiểm tra xem ngày này có nên được tính vào available days không
            let shouldInclude = false;
            if (matchingSchedules.length > 0) {
                if (!isBlocked) {
                    shouldInclude = true;
                } else if (blockedDayHandling) {
                    // Nếu có ngày thay thế và đây là ngày thay thế, thì tính vào
                    if (blockedDayHandling.choice === 'choose-replacement-day' && blockedDayHandling.selectedDay) {
                        const replacementDateStr = formatDateForComparison(blockedDayHandling.selectedDay.date);
                        const currentDateStr = formatDateForComparison(currentDate);
                        if (replacementDateStr === currentDateStr) {
                            shouldInclude = true;
                        }
                    } else if (blockedDayHandling.choice === 'move-to-other-days') {
                        // Tự động di chuyển, không tính ngày bị chặn
                        shouldInclude = false;
                    } else if (blockedDayHandling.choice === 'move-to-next-week') {
                        // Chuyển sang tuần sau, không tính ngày bị chặn
                        shouldInclude = false;
                    }
                }
            }
            
            if (shouldInclude) {
                availableDays.push({
                    date: new Date(currentDate),
                    dayOfWeek: ngayTrongTuan,
                    schedules: matchingSchedules
                });
            }
        }
        return availableDays;
    };
    
    // Kiểm tra xem có ngày nào bị chặn nhưng có lịch tập không (trước khi tạo lịch)
    // Sử dụng maxWeeks đã tính từ độ khó
    const allBlockedDaysWithSchedule = [];
    for (let week = 0; week < maxWeeks; week++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + (week * 7));
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const currentDate = new Date(weekStart);
            currentDate.setDate(weekStart.getDate() + dayOffset);
            const dayOfWeek = currentDate.getDay();
            const ngayTrongTuan = dayOfWeek === 0 ? 7 : dayOfWeek;
            const isBlocked = isDateBlocked(currentDate, blockedDates);
            const matchingSchedules = scheduleData.filter(s => s.NgayTrongTuan === ngayTrongTuan);
            
            if (matchingSchedules.length > 0 && isBlocked) {
                allBlockedDaysWithSchedule.push({
                    date: new Date(currentDate),
                    dayOfWeek: ngayTrongTuan,
                    dayName: getDayName(ngayTrongTuan),
                    schedules: matchingSchedules,
                    weekNumber: week + 1
                });
            }
        }
    }
    
    // Xử lý ngày bị chặn: tự động di chuyển bài tập sang ngày khác trong tuần
    let blockedDayHandling = null;
    let actualMaxWeeks = maxWeeks; // Số tuần thực tế
    if (allBlockedDaysWithSchedule.length > 0) {
        // Mặc định: tự động di chuyển bài tập sang ngày khác trong tuần
        blockedDayHandling = { choice: 'move-to-other-days' };
    }
    
    // Tạo lịch theo tuần (số tuần phụ thuộc vào độ khó của bài tập)
    const weeks = [];
    let pendingExercises = []; // Bài tập chưa được phân phối
    
    // Track các bài tập bị chặn khi chọn "nextWeekAfterEnd" - sẽ chuyển sang tuần sau tuần kết thúc
    let blockedExercisesForNextWeekAfterEnd = [];
    
    // Track các bài tập bị chặn khi chọn "choose-replacement-day" - sẽ chuyển sang ngày thay thế
    let blockedExercisesForReplacement = [];
    
    // Track số tuần mỗi bài tập đã được phân phối
    const exerciseWeekCount = new Map(); // Map<exerciseName, count>
    
    // Tính ngày bắt đầu của tuần đầu tiên (thứ 2 của tuần chứa startDate)
    const getWeekStart = (date) => {
        const dayOfWeek = date.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ...
        const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 1 - dayOfWeek);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() + daysToMonday);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    };
    
    // Tính ngày kết thúc của tuần (chủ nhật)
    const getWeekEnd = (weekStartDate) => {
        const weekEnd = new Date(weekStartDate);
        weekEnd.setDate(weekStartDate.getDate() + 6); // Chủ nhật (6 ngày sau thứ 2)
        weekEnd.setHours(23, 59, 59, 999);
        return weekEnd;
    };
    
    // Tính tuần đầu tiên: từ startDate đến chủ nhật của tuần đó
    const firstWeekStart = getWeekStart(startDate);
    const firstWeekEnd = getWeekEnd(firstWeekStart);
    
    for (let week = 0; week < actualMaxWeeks; week++) {
        let weekStart, weekEnd;
        
        // QUAN TRỌNG: Tất cả các tuần đều tính từ firstWeekStart (Thứ 2 của tuần đầu tiên)
        // Đảm bảo các tuần liên tiếp không bị nhảy
        weekStart = new Date(firstWeekStart);
        weekStart.setDate(firstWeekStart.getDate() + (week * 7));
        weekStart.setHours(0, 0, 0, 0);
        weekEnd = getWeekEnd(weekStart);
        
        // Debug: Log thông tin tuần
        console.log(`[DEBUG generatePreviewSchedule] Week ${week + 1}: weekStart=${formatDateToYYYYMMDD(weekStart)}, weekEnd=${formatDateToYYYYMMDD(weekEnd)}, firstWeekStart=${formatDateToYYYYMMDD(firstWeekStart)}`);
        
        // Đối với tuần đầu tiên, nếu startDate không phải Thứ 2, vẫn hiển thị đúng tuần
        // nhưng chỉ lấy availableDays từ startDate trở đi
        const weekData = {
            weekNumber: week + 1,
            startDate: new Date(weekStart),
            endDate: new Date(weekEnd),
            days: []
        };
        
        // Lấy danh sách ngày có sẵn trong tuần (không bị chặn)
        // Đối với tuần đầu tiên, chỉ lấy từ startDate đến cuối tuần
        const availableDays = getAvailableDaysInWeek(weekStart, blockedDayHandling, week === 0 ? startDate : null, weekEnd);
        
        // Vẫn tạo tuần ngay cả khi không có ngày nào có sẵn (để hiển thị tuần trống)
        // Chỉ bỏ qua nếu thực sự không có schedule nào trong tuần
        const hasAnySchedule = scheduleData.some(s => {
            // Kiểm tra xem có ngày nào trong tuần này có schedule không
            for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
                const currentDate = new Date(weekStart);
                currentDate.setDate(weekStart.getDate() + dayOffset);
                const dayOfWeek = currentDate.getDay();
                const ngayTrongTuan = dayOfWeek === 0 ? 7 : dayOfWeek;
                if (s.NgayTrongTuan === ngayTrongTuan) {
                    return true;
                }
            }
            return false;
        });
        
        // Tính số bài tập cần phân phối cho tuần này
        // Ưu tiên pending exercises trước, sau đó mới lấy từ queue
        const exercisesToDistributeThisWeek = [];
        
        // Thêm pending exercises trước
        pendingExercises.forEach(ex => {
            if (!exercisesToDistributeThisWeek.some(e => e.name === ex.name)) {
                exercisesToDistributeThisWeek.push({...ex});
            }
        });
        
        // Thêm các bài tập từ queue cho tuần này
        // Logic: Đảm bảo mỗi bài tập được phân phối đủ số tuần theo độ khó
        // - Bài tập dễ (4 tuần): chỉ trong tuần 1-4
        // - Bài tập trung bình (6 tuần): trong tuần 1-6
        // - Bài tập nâng cao (8 tuần): trong tuần 1-8
        exerciseQueue.forEach(ex => {
            const alreadyInPending = pendingExercises.some(e => e.name === ex.name);
            const exerciseWeeks = getWeeksByDifficulty(ex.difficulty);
            const currentWeekCount = exerciseWeekCount.get(ex.name) || 0;
            
            // Bài tập cần được phân phối trong số tuần theo độ khó
            // Nếu đã phân phối đủ số tuần, không thêm nữa
            // Nếu chưa đủ, tiếp tục thêm vào các tuần tiếp theo
            const shouldInclude = currentWeekCount < exerciseWeeks;
            
            // Chỉ thêm nếu:
            // 1. Không đang trong pending
            // 2. Chưa đủ số tuần cần thiết
            // 3. Chưa có trong danh sách phân phối tuần này
            // 4. Tuần hiện tại nằm trong phạm vi tuần của bài tập (ví dụ: bài 4 tuần chỉ trong tuần 1-4)
            const weekNumber = week + 1;
            const isInWeekRange = weekNumber <= exerciseWeeks;
            
            if (!alreadyInPending && shouldInclude && isInWeekRange &&
                !exercisesToDistributeThisWeek.some(e => e.name === ex.name)) {
                exercisesToDistributeThisWeek.push({...ex});
            }
        });
        
        // Nếu tuần này không có ngày hợp lý (tất cả đều bị chặn), vẫn tạo tuần nhưng chuyển bài tập sang tuần sau
        if (availableDays.length === 0 && hasAnySchedule) {
            // Tuần này có schedule nhưng tất cả đều bị chặn
            // Thêm tất cả bài tập cần phân phối vào pending để chuyển sang tuần sau
            exercisesToDistributeThisWeek.forEach(exercise => {
                const alreadyInPending = pendingExercises.some(e => e.name === exercise.name);
                if (!alreadyInPending) {
                    pendingExercises.push({...exercise});
                }
            });
            // Vẫn tạo tuần (có thể trống) để hiển thị, không bỏ qua
            // Tiếp tục xử lý để tạo weekData với days = []
        }
        
        // QUAN TRỌNG: KHÔNG BAO GIỜ bỏ qua tuần để đảm bảo tính liên tục
        // Luôn tạo và hiển thị tất cả các tuần, ngay cả khi không có bài tập
        // Điều này đảm bảo các tuần hiển thị liên tiếp không bị nhảy
        console.log(`[DEBUG generatePreviewSchedule] Processing week ${week + 1}: availableDays=${availableDays.length}, hasAnySchedule=${hasAnySchedule}, exercisesToDistribute=${exercisesToDistributeThisWeek.length}`);
        
        // Thêm pending exercises trước
        pendingExercises.forEach(ex => {
            if (!exercisesToDistributeThisWeek.some(e => e.name === ex.name)) {
                exercisesToDistributeThisWeek.push({...ex});
            }
        });
        
        // Thêm các bài tập từ queue cho tuần này
        // Logic: Đảm bảo mỗi bài tập được phân phối đủ số tuần theo độ khó
        // - Bài tập dễ (4 tuần): chỉ trong tuần 1-4
        // - Bài tập trung bình (6 tuần): trong tuần 1-6
        // - Bài tập nâng cao (8 tuần): trong tuần 1-8
        exerciseQueue.forEach(ex => {
            const alreadyInPending = pendingExercises.some(e => e.name === ex.name);
            const exerciseWeeks = getWeeksByDifficulty(ex.difficulty);
            const currentWeekCount = exerciseWeekCount.get(ex.name) || 0;
            
            // Bài tập cần được phân phối trong số tuần theo độ khó
            // Nếu đã phân phối đủ số tuần, không thêm nữa
            // Nếu chưa đủ, tiếp tục thêm vào các tuần tiếp theo
            const shouldInclude = currentWeekCount < exerciseWeeks;
            
            // Chỉ thêm nếu:
            // 1. Không đang trong pending
            // 2. Chưa đủ số tuần cần thiết
            // 3. Chưa có trong danh sách phân phối tuần này
            // 4. Tuần hiện tại nằm trong phạm vi tuần của bài tập (ví dụ: bài 4 tuần chỉ trong tuần 1-4)
            const weekNumber = week + 1;
            const isInWeekRange = weekNumber <= exerciseWeeks;
            
            if (!alreadyInPending && shouldInclude && isInWeekRange &&
                !exercisesToDistributeThisWeek.some(e => e.name === ex.name)) {
                exercisesToDistributeThisWeek.push({...ex});
            }
        });
        
        // Rải đều bài tập vào các ngày có sẵn (round-robin)
        // Tạo map để lưu bài tập cho mỗi ngày
        const exercisesPerDayMap = new Map();
        // Track các bài tập đã được phân phối trong tuần này
        const distributedExercisesThisWeek = new Set();
        
        if (exercisesToDistributeThisWeek.length > 0 && availableDays.length > 0) {
            // Rải đều bài tập vào các ngày (round-robin)
            exercisesToDistributeThisWeek.forEach((exercise, index) => {
                const dayIndex = index % availableDays.length;
                const dayKey = formatDateForComparison(availableDays[dayIndex].date);
                if (!exercisesPerDayMap.has(dayKey)) {
                    exercisesPerDayMap.set(dayKey, []);
                }
                exercisesPerDayMap.get(dayKey).push({...exercise});
            });
        }
        
        // Xử lý blocked days theo lựa chọn của người dùng
        // Nếu người dùng chọn "Di chuyển bài tập sang ngày khác" hoặc "Lựa chọn 1 ngày để bù"
        // thì các ngày bị chặn sẽ được xử lý trong logic phân phối
        
        // Tạo lịch cho các ngày trong tuần
        // Pass 1: Phân phối bài tập vào các ngày không bị chặn
        // QUAN TRỌNG: CHỈ tạo dayData cho các ngày có trong availableDays (đã được filter theo schedule)
        // Điều này đảm bảo chỉ tạo ngày phù hợp với lịch tập người dùng chọn
        
        // Debug: Log availableDays để kiểm tra
        console.log(`[DEBUG generatePreviewSchedule] Week ${week + 1}: availableDays count=${availableDays.length}`);
        availableDays.forEach((availableDay, idx) => {
            const dateStr = availableDay.date ? formatDateToYYYYMMDD(new Date(availableDay.date)) : 'N/A';
            console.log(`[DEBUG generatePreviewSchedule]   availableDays[${idx}]: date=${dateStr}, dayOfWeek=${availableDay.dayOfWeek}, schedules=${availableDay.schedules?.length || 0}`);
        });
        
        // Lặp qua availableDays thay vì lặp qua tất cả các ngày trong tuần
        // Điều này đảm bảo chỉ tạo dayData cho các ngày có lịch tập
        for (const availableDay of availableDays) {
            const currentDate = new Date(availableDay.date);
            currentDate.setHours(0, 0, 0, 0);
            
            const dayOfWeek = currentDate.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ...
            const ngayTrongTuan = dayOfWeek === 0 ? 7 : dayOfWeek; // Chuyển Chủ nhật thành 7
            
            // Debug: Log từng ngày
            const currentDateStr = formatDateToYYYYMMDD(currentDate);
            console.log(`[DEBUG generatePreviewSchedule] Week ${week + 1}, Processing availableDay: date=${currentDateStr}, dayOfWeek=${dayOfWeek}, ngayTrongTuan=${ngayTrongTuan}, dayOfWeekFromData=${availableDay.dayOfWeek}`);
            
            // Kiểm tra xem ngày này có bị chặn không
            const isBlocked = isDateBlocked(currentDate, blockedDates);
            
            // Tìm schedule phù hợp với ngày này (lấy từ availableDay.schedules)
            const matchingSchedules = availableDay.schedules || scheduleData.filter(s => s.NgayTrongTuan === ngayTrongTuan);
            
            // Debug: Log matching schedules
            if (matchingSchedules.length > 0) {
                console.log(`[DEBUG generatePreviewSchedule] Found ${matchingSchedules.length} matching schedules for ${currentDateStr} (ngayTrongTuan=${ngayTrongTuan})`);
            }
            
            // Xử lý ngày bị chặn dựa trên lựa chọn của người dùng
            let shouldSkipBlockedDay = false;
            if (isBlocked && matchingSchedules.length > 0 && blockedDayHandling) {
                if (blockedDayHandling.choice === 'move-to-next-week') {
                    // Bỏ qua ngày bị chặn, sẽ chuyển sang tuần sau
                    shouldSkipBlockedDay = true;
                } else if (blockedDayHandling.choice === 'nextWeekAfterEnd') {
                    // Di dời sang tuần tiếp theo của tuần kết thúc - bỏ qua hoàn toàn trong tuần hiện tại
                    shouldSkipBlockedDay = true;
                } else if (blockedDayHandling.choice === 'choose-replacement-day' && blockedDayHandling.selectedDay) {
                    // Nếu ngày này là ngày thay thế, không skip để thêm bài tập vào đây
                    const replacementDateStr = formatDateForComparison(blockedDayHandling.selectedDay.date);
                    const currentDateStr = formatDateForComparison(currentDate);
                    if (replacementDateStr !== currentDateStr) {
                        // Không phải ngày thay thế, skip ngày bị chặn
                        shouldSkipBlockedDay = true;
                    }
                    // Nếu là ngày thay thế, shouldSkipBlockedDay = false, tiếp tục xử lý
                } else if (blockedDayHandling.choice === 'move-to-other-days') {
                    // Tự động di chuyển sang ngày khác, bỏ qua ngày bị chặn
                    shouldSkipBlockedDay = true;
                }
            }
            
            if (matchingSchedules.length > 0 && (!isBlocked || !shouldSkipBlockedDay)) {
                const dayData = {
                    date: new Date(currentDate),
                    dayOfWeek: ngayTrongTuan,
                    dayName: getDayName(ngayTrongTuan),
                    sessions: []
                };
                
                // Lấy bài tập đã được rải đều cho ngày này
                const dayKey = formatDateForComparison(currentDate);
                let exercisesForThisDay = exercisesPerDayMap.get(dayKey) || [];
                
                // Nếu đây là ngày thay thế và có bài tập bị chặn, thêm vào đây
                if (blockedDayHandling && blockedDayHandling.choice === 'choose-replacement-day' && blockedDayHandling.selectedDay) {
                    const replacementDateStr = formatDateForComparison(blockedDayHandling.selectedDay.date);
                    const currentDateStr = formatDateForComparison(currentDate);
                    if (replacementDateStr === currentDateStr && blockedExercisesForReplacement.length > 0) {
                        // Đây là ngày thay thế, thêm bài tập từ các ngày bị chặn
                        blockedExercisesForReplacement.forEach(exercise => {
                            if (!exercisesForThisDay.some(e => e.name === exercise.name)) {
                                exercisesForThisDay.push({...exercise});
                            }
                        });
                        // Xóa bài tập đã thêm vào ngày thay thế
                        blockedExercisesForReplacement = [];
                    }
                }
                
                // Nếu không có bài tập được phân bổ, thử lấy từ pending (chỉ khi không có bài tập nào được phân bổ cho ngày này)
                // KHÔNG lấy từ pending nếu chọn "choose-replacement-day" (chỉ thêm vào ngày thay thế)
                if (exercisesForThisDay.length === 0 && pendingExercises.length > 0 && 
                    (!blockedDayHandling || blockedDayHandling.choice !== 'choose-replacement-day')) {
                    // Lấy 1 bài từ pending (rải đều)
                    const pendingIndex = weekData.days.length % pendingExercises.length;
                    if (pendingExercises[pendingIndex]) {
                        exercisesForThisDay.push({...pendingExercises[pendingIndex]});
                    }
                }
                
                matchingSchedules.forEach(schedule => {
                    const sessionData = {
                        buoi: schedule.Buoi,
                        gioBatDau: schedule.GioBatDau,
                        gioKetThuc: schedule.GioKetThuc,
                        exercises: []
                    };
                    
                    // Tính thời gian có sẵn (phút)
                    const [startH, startM] = schedule.GioBatDau.split(':').map(Number);
                    const [endH, endM] = schedule.GioKetThuc.split(':').map(Number);
                    const availableMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                    
                    // Phân phối bài tập (tối đa 3 bài/buổi, phụ thuộc vào thời gian)
                    // Quy tắc: 
                    // - >= 120 phút: tối đa 3 bài
                    // - >= 60 phút: tối đa 2 bài
                    // - < 60 phút: tối đa 1 bài
                    let totalTimeUsed = 0;
                    const maxExercises = availableMinutes >= 120 ? 3 : (availableMinutes >= 60 ? 2 : 1);
                    
                    // Phân phối bài tập từ danh sách đã được rải đều cho ngày này
                    let exerciseIndex = 0;
                    let usedExerciseNames = new Set(); // Track các bài tập đã dùng trong buổi này
                    
                    while (sessionData.exercises.length < maxExercises && 
                           exerciseIndex < exercisesForThisDay.length) {
                        const exercise = exercisesForThisDay[exerciseIndex];
                        
                        // Kiểm tra exercise có tồn tại và có đủ thông tin không
                        if (!exercise || typeof exercise.time !== 'number') {
                            exerciseIndex++;
                            continue;
                        }
                        
                        // Kiểm tra xem có thể thêm bài tập này không
                        if (totalTimeUsed + exercise.time <= availableMinutes) {
                            // Kiểm tra xem bài tập này đã được thêm chưa (tránh trùng lặp trong cùng buổi)
                            const alreadyAdded = usedExerciseNames.has(exercise.name);
                            
                            if (!alreadyAdded) {
                                sessionData.exercises.push({...exercise});
                                totalTimeUsed += exercise.time;
                                usedExerciseNames.add(exercise.name);
                                distributedExercisesThisWeek.add(exercise.name); // Đánh dấu đã phân phối
                                
                                // Tăng số tuần đã phân phối cho bài tập này
                                const currentCount = exerciseWeekCount.get(exercise.name) || 0;
                                exerciseWeekCount.set(exercise.name, currentCount + 1);
                                
                                // Xóa khỏi pending nếu có
                                const pendingIndex = pendingExercises.findIndex(e => e.name === exercise.name);
                                if (pendingIndex >= 0) {
                                    pendingExercises.splice(pendingIndex, 1);
                                }
                                
                                // Xóa khỏi exercisesForThisDay để không dùng lại
                                const dayIndex = exercisesForThisDay.findIndex(e => e.name === exercise.name);
                                if (dayIndex >= 0) {
                                    exercisesForThisDay.splice(dayIndex, 1);
                                    exerciseIndex--; // Giảm index vì đã xóa 1 phần tử
                                }
                            }
                        }
                        
                        exerciseIndex++;
                    }
                    
                    // Nếu vẫn chưa có bài tập nào, thêm ít nhất 1 bài (nếu có)
                    if (sessionData.exercises.length === 0 && exercisesForThisDay.length > 0) {
                        const firstExercise = exercisesForThisDay[0];
                        // Kiểm tra firstExercise có tồn tại và có đủ thông tin không
                        if (firstExercise && typeof firstExercise.time === 'number') {
                        sessionData.exercises.push({
                            name: firstExercise.name,
                            time: Math.min(firstExercise.time, availableMinutes),
                                calo: firstExercise.calo || 0,
                                difficulty: firstExercise.difficulty || 'Trung bình'
                        });
                        distributedExercisesThisWeek.add(firstExercise.name); // Đánh dấu đã phân phối
                        
                        // Tăng số tuần đã phân phối cho bài tập này
                        const currentCount = exerciseWeekCount.get(firstExercise.name) || 0;
                        exerciseWeekCount.set(firstExercise.name, currentCount + 1);
                        
                        // Xóa khỏi pending nếu có
                        const pendingIndex = pendingExercises.findIndex(e => e.name === firstExercise.name);
                        if (pendingIndex >= 0) {
                            pendingExercises.splice(pendingIndex, 1);
                        }
                        
                        // Xóa khỏi exercisesForThisDay
                        exercisesForThisDay.shift();
                        }
                    }
                    
                    if (sessionData.exercises.length > 0) {
                        dayData.sessions.push(sessionData);
                    }
                });
                
                if (dayData.sessions.length > 0) {
                    weekData.days.push(dayData);
                }
            } else if (matchingSchedules.length > 0 && isBlocked) {
                // Ngày bị chặn - đánh dấu bài tập cần chuyển sang ngày khác
                if (blockedDayHandling && blockedDayHandling.choice === 'nextWeekAfterEnd') {
                    // Lưu bài tập bị chặn để chuyển sang tuần sau tuần kết thúc (không phân phối trong tuần hiện tại)
                    matchingSchedules.forEach(schedule => {
                        const [startH, startM] = schedule.GioBatDau.split(':').map(Number);
                        const [endH, endM] = schedule.GioKetThuc.split(':').map(Number);
                        const availableMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                        const maxExercises = availableMinutes >= 120 ? 3 : (availableMinutes >= 60 ? 2 : 1);
                        
                        // Lấy bài tập từ exercisesToDistributeThisWeek cho ngày này (nếu có)
                        const dayKey = formatDateForComparison(currentDate);
                        const exercisesForThisDay = exercisesPerDayMap.get(dayKey) || [];
                        
                        // Nếu có bài tập đã được phân bổ cho ngày bị chặn, lưu lại để chuyển sang tuần sau
                        exercisesForThisDay.slice(0, maxExercises).forEach(exercise => {
                            if (exercise && !blockedExercisesForNextWeekAfterEnd.some(e => e.name === exercise.name)) {
                                blockedExercisesForNextWeekAfterEnd.push({...exercise});
                            }
                        });
                        
                        // Nếu không có bài tập từ exercisesPerDayMap, lấy từ exerciseQueue
                        if (exercisesForThisDay.length === 0) {
                            for (let i = 0; i < maxExercises && i < exerciseQueue.length; i++) {
                                const exercise = exerciseQueue[i];
                                const alreadyBlocked = blockedExercisesForNextWeekAfterEnd.some(e => e.name === exercise.name);
                                const alreadyDistributed = weekData.days.some(day => 
                                    day.sessions.some(session => 
                                        session.exercises.some(e => e.name === exercise.name)
                                    )
                                );
                                
                                if (!alreadyBlocked && !alreadyDistributed) {
                                    blockedExercisesForNextWeekAfterEnd.push({...exercise});
                                }
                            }
                        }
                    });
                } else if (blockedDayHandling && blockedDayHandling.choice === 'choose-replacement-day') {
                    // Lưu bài tập bị chặn để chuyển sang ngày thay thế (không thêm vào pending)
                    matchingSchedules.forEach(schedule => {
                        const [startH, startM] = schedule.GioBatDau.split(':').map(Number);
                        const [endH, endM] = schedule.GioKetThuc.split(':').map(Number);
                        const availableMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                        const maxExercises = availableMinutes >= 120 ? 3 : (availableMinutes >= 60 ? 2 : 1);
                        
                        // Lấy bài tập từ exercisesToDistributeThisWeek cho ngày này (nếu có)
                        const dayKey = formatDateForComparison(currentDate);
                        const exercisesForThisDay = exercisesPerDayMap.get(dayKey) || [];
                        
                        // Lưu bài tập từ ngày bị chặn để chuyển sang ngày thay thế
                        exercisesForThisDay.slice(0, maxExercises).forEach(exercise => {
                            if (exercise && !blockedExercisesForReplacement.some(e => e.name === exercise.name)) {
                                blockedExercisesForReplacement.push({...exercise});
                            }
                        });
                        
                        // Nếu không có bài tập từ exercisesPerDayMap, lấy từ exerciseQueue
                        if (exercisesForThisDay.length === 0) {
                            for (let i = 0; i < maxExercises && i < exerciseQueue.length; i++) {
                                const exercise = exerciseQueue[i];
                                const alreadyBlocked = blockedExercisesForReplacement.some(e => e.name === exercise.name);
                                const alreadyDistributed = weekData.days.some(day => 
                                    day.sessions.some(session => 
                                        session.exercises.some(e => e.name === exercise.name)
                                    )
                                );
                                
                                if (!alreadyBlocked && !alreadyDistributed) {
                                    blockedExercisesForReplacement.push({...exercise});
                                }
                            }
                        }
                    });
                } else {
                    // Option "move-to-other-days": thêm bài tập vào pending để phân phối tự động sang các ngày khác
                matchingSchedules.forEach(schedule => {
                    const [startH, startM] = schedule.GioBatDau.split(':').map(Number);
                    const [endH, endM] = schedule.GioKetThuc.split(':').map(Number);
                    const availableMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                    const maxExercises = availableMinutes >= 120 ? 3 : (availableMinutes >= 60 ? 2 : 1);
                    
                    // Thêm bài tập vào pending (sẽ được phân phối vào các ngày khác trong tuần hoặc tuần sau)
                    // Chỉ thêm nếu chưa có trong pending và chưa được phân phối
                    for (let i = 0; i < maxExercises && i < exerciseQueue.length; i++) {
                        const exercise = exerciseQueue[i];
                        const alreadyPending = pendingExercises.some(e => e.name === exercise.name);
                        const alreadyDistributed = weekData.days.some(day => 
                            day.sessions.some(session => 
                                session.exercises.some(e => e.name === exercise.name)
                            )
                        );
                        
                        if (!alreadyPending && !alreadyDistributed) {
                            pendingExercises.push({...exercise});
                        }
                    }
                });
                }
            }
        }
        
        // Thêm các bài tập chưa được phân phối trong tuần này vào pending
        exercisesToDistributeThisWeek.forEach(exercise => {
            if (!distributedExercisesThisWeek.has(exercise.name)) {
                // Kiểm tra xem đã có trong pending chưa
                const alreadyInPending = pendingExercises.some(e => e.name === exercise.name);
                if (!alreadyInPending) {
                    pendingExercises.push({...exercise});
                }
            }
        });
        
        // Pass 2: Phân phối lại bài tập pending vào các ngày còn trống trong tuần
        // Bỏ qua Pass 2 nếu chọn "nextWeekAfterEnd" hoặc "choose-replacement-day" - không phân phối lại trong tuần hiện tại
        if (pendingExercises.length > 0 && 
            (!blockedDayHandling || 
             (blockedDayHandling.choice !== 'nextWeekAfterEnd' && blockedDayHandling.choice !== 'choose-replacement-day'))) {
            // Sử dụng dayStart và dayEnd của tuần hiện tại (không phải weekStart) để đảm bảo chỉ thêm ngày trong phạm vi tuần
            let pass2DayStart, pass2DayEnd;
            if (week === 0) {
                pass2DayStart = new Date(startDate);
                pass2DayEnd = new Date(weekEnd);
            } else {
                pass2DayStart = new Date(weekStart);
                pass2DayEnd = new Date(weekEnd);
            }
            
            const pass2DaysInWeek = Math.ceil((pass2DayEnd.getTime() - pass2DayStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            
            for (let dayOffset = 0; dayOffset < pass2DaysInWeek && pendingExercises.length > 0; dayOffset++) {
                const currentDate = new Date(pass2DayStart);
                currentDate.setDate(pass2DayStart.getDate() + dayOffset);
                
                // Kiểm tra xem ngày này có vượt quá dayEnd không
                if (currentDate > pass2DayEnd) break;
                
                if (isDateBlocked(currentDate, blockedDates)) continue;
                
                const dayOfWeek = currentDate.getDay();
                const ngayTrongTuan = dayOfWeek === 0 ? 7 : dayOfWeek;
                const matchingSchedules = scheduleData.filter(s => s.NgayTrongTuan === ngayTrongTuan);
                
                if (matchingSchedules.length === 0) continue;
                
                // Tìm hoặc tạo dayData cho ngày này
                let dayData = weekData.days.find(d => 
                    formatDateForComparison(d.date) === formatDateForComparison(currentDate)
                );
                
                if (!dayData) {
                    dayData = {
                        date: new Date(currentDate),
                        dayOfWeek: ngayTrongTuan,
                        dayName: getDayName(ngayTrongTuan),
                        sessions: []
                    };
                    weekData.days.push(dayData);
                }
                
                // Phân phối bài tập pending vào các buổi còn trống
                matchingSchedules.forEach(schedule => {
                    // Tìm hoặc tạo session
                    let sessionData = dayData.sessions.find(s => 
                        s.gioBatDau === schedule.GioBatDau && 
                        s.gioKetThuc === schedule.GioKetThuc
                    );
                    
                    if (!sessionData) {
                        sessionData = {
                            buoi: schedule.Buoi,
                            gioBatDau: schedule.GioBatDau,
                            gioKetThuc: schedule.GioKetThuc,
                            exercises: []
                        };
                        dayData.sessions.push(sessionData);
                    }
                    
                    const [startH, startM] = schedule.GioBatDau.split(':').map(Number);
                    const [endH, endM] = schedule.GioKetThuc.split(':').map(Number);
                    const availableMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                    const maxExercises = availableMinutes >= 120 ? 3 : (availableMinutes >= 60 ? 2 : 1);
                    
                    let totalTimeUsed = sessionData.exercises.reduce((sum, ex) => {
                        return sum + (ex && typeof ex.time === 'number' ? ex.time : 0);
                    }, 0);
                    
                    // Thêm bài tập từ pending vào buổi này nếu còn chỗ
                    let exerciseIndex = 0;
                    while (sessionData.exercises.length < maxExercises && 
                           exerciseIndex < pendingExercises.length) {
                        const exercise = pendingExercises[exerciseIndex];
                        
                        // Kiểm tra exercise có tồn tại và có đủ thông tin không
                        if (!exercise || typeof exercise.time !== 'number') {
                            exerciseIndex++;
                            continue;
                        }
                        
                        if (totalTimeUsed + exercise.time <= availableMinutes) {
                            const alreadyAdded = sessionData.exercises.some(e => e.name === exercise.name);
                            
                            if (!alreadyAdded) {
                                sessionData.exercises.push(exercise);
                                totalTimeUsed += exercise.time;
                                
                                // Tăng số tuần đã phân phối cho bài tập này
                                const currentCount = exerciseWeekCount.get(exercise.name) || 0;
                                exerciseWeekCount.set(exercise.name, currentCount + 1);
                                
                                // Xóa khỏi pending
                                pendingExercises.splice(exerciseIndex, 1);
                                exerciseIndex--; // Giảm index vì đã xóa 1 phần tử
                            } else {
                                exerciseIndex++;
                            }
                        } else {
                            exerciseIndex++;
                        }
                    }
                });
            }
        }
        
        // QUAN TRỌNG: Luôn thêm tuần vào danh sách, ngay cả khi không có bài tập
        // Đảm bảo tất cả các tuần đều được hiển thị liên tiếp, không bỏ qua bất kỳ tuần nào
        weeks.push(weekData);
        console.log(`[DEBUG generatePreviewSchedule] Added week ${weekData.weekNumber} to weeks array: ${formatDateToYYYYMMDD(weekData.startDate)} - ${formatDateToYYYYMMDD(weekData.endDate)}, days=${weekData.days.length}`);
    }
    
    // Nếu vẫn còn bài tập chưa được phân phối hoặc chưa đủ số tuần, tăng số tuần
    // Kiểm tra xem có bài tập nào chưa đủ số tuần không
    let needMoreWeeks = false;
    exerciseQueue.forEach(ex => {
        const exerciseWeeks = getWeeksByDifficulty(ex.difficulty);
        const currentWeekCount = exerciseWeekCount.get(ex.name) || 0;
        if (currentWeekCount < exerciseWeeks) {
            needMoreWeeks = true;
        }
    });
    
    if (pendingExercises.length > 0 || needMoreWeeks) {
        // Hiển thị thông báo cho người dùng
        const blockedCount = blockedDates.length;
        if (blockedCount > 0) {
            console.log(`Có ${pendingExercises.length} bài tập chưa được phân phối do trùng với ${blockedCount} ngày không thể tập. Đang chuyển sang tuần tiếp theo...`);
        }
        
        // Thêm tuần bổ sung (sau actualMaxWeeks) nếu còn bài tập chưa được phân phối hoặc chưa đủ số tuần
        // Đảm bảo mỗi bài tập được phân phối đủ số tuần theo độ khó
        let additionalWeek = actualMaxWeeks;
        // Tính số tuần tối đa cần thêm: dựa trên số bài tập chưa đủ tuần
        let maxAdditionalWeeks = actualMaxWeeks;
        exerciseQueue.forEach(ex => {
            const exerciseWeeks = getWeeksByDifficulty(ex.difficulty);
            const currentWeekCount = exerciseWeekCount.get(ex.name) || 0;
            if (currentWeekCount < exerciseWeeks) {
                // Cần thêm ít nhất (exerciseWeeks - currentWeekCount) tuần nữa
                maxAdditionalWeeks = Math.max(maxAdditionalWeeks, actualMaxWeeks + (exerciseWeeks - currentWeekCount) + 2);
            }
        });
        
        // Nếu có pending exercises, cần thêm ít nhất 1 tuần nữa
        if (pendingExercises.length > 0) {
            maxAdditionalWeeks = Math.max(maxAdditionalWeeks, actualMaxWeeks + 5);
        }
        
        // Đảm bảo có đủ tuần để phân phối tất cả bài tập
        while ((pendingExercises.length > 0 || needMoreWeeks) && additionalWeek < maxAdditionalWeeks) {
            additionalWeek++;
            const weekStart = new Date(startDate);
            weekStart.setDate(startDate.getDate() + ((additionalWeek - 1) * 7));
            
            const weekData = {
                weekNumber: additionalWeek,
                startDate: new Date(weekStart),
                endDate: new Date(weekStart),
                days: []
            };
            weekData.endDate.setDate(weekStart.getDate() + 6);
            weekData.endDate.setHours(23, 59, 59, 999);
            
            // Lấy danh sách ngày có sẵn trong tuần này (không bị chặn)
            const availableDays = getAvailableDaysInWeek(weekStart, blockedDayHandling, null, weekData.endDate);
            
            // Nếu tuần này không có ngày hợp lý, chuyển tất cả bài tập sang tuần sau
            if (availableDays.length === 0) {
                additionalWeek++;
                continue;
            }
            
            // Tính số bài tập cần phân phối cho tuần này
            const exercisesToDistributeThisWeek = [];
            
            // Nếu đây là tuần đầu tiên sau actualMaxWeeks và có bài tập bị chặn từ nextWeekAfterEnd, thêm vào trước
            if (additionalWeek === actualMaxWeeks + 1 && blockedExercisesForNextWeekAfterEnd.length > 0) {
                blockedExercisesForNextWeekAfterEnd.forEach(ex => {
                    if (!exercisesToDistributeThisWeek.some(e => e.name === ex.name)) {
                        exercisesToDistributeThisWeek.push({...ex});
                    }
                });
                // Xóa khỏi danh sách bị chặn sau khi đã thêm vào tuần này
                blockedExercisesForNextWeekAfterEnd = [];
            }
            
            // Thêm pending exercises
            pendingExercises.forEach(ex => {
                if (!exercisesToDistributeThisWeek.some(e => e.name === ex.name)) {
                    exercisesToDistributeThisWeek.push({...ex});
                }
            });
            
            // Thêm các bài tập từ queue nếu chưa đủ số tuần
            exerciseQueue.forEach(ex => {
                const exerciseWeeks = getWeeksByDifficulty(ex.difficulty);
                const currentWeekCount = exerciseWeekCount.get(ex.name) || 0;
                const shouldInclude = currentWeekCount < exerciseWeeks;
                
                if (shouldInclude && !exercisesToDistributeThisWeek.some(e => e.name === ex.name)) {
                    exercisesToDistributeThisWeek.push({...ex});
                }
            });
            
            // Track các bài tập đã được phân phối trong tuần này
            const distributedExercisesThisWeek = new Set();
            
            // Phân phối bài tập còn lại vào tuần này
            for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
                const currentDate = new Date(weekStart);
                currentDate.setDate(weekStart.getDate() + dayOffset);
                
                if (isDateBlocked(currentDate, blockedDates)) continue;
                
                const dayOfWeek = currentDate.getDay();
                const ngayTrongTuan = dayOfWeek === 0 ? 7 : dayOfWeek;
                const matchingSchedules = scheduleData.filter(s => s.NgayTrongTuan === ngayTrongTuan);
                
                if (matchingSchedules.length > 0 && exercisesToDistributeThisWeek.length > 0) {
                    const dayData = {
                        date: new Date(currentDate),
                        dayOfWeek: ngayTrongTuan,
                        dayName: getDayName(ngayTrongTuan),
                        sessions: []
                    };
                    
                    matchingSchedules.forEach(schedule => {
                        const sessionData = {
                            buoi: schedule.Buoi,
                            gioBatDau: schedule.GioBatDau,
                            gioKetThuc: schedule.GioKetThuc,
                            exercises: []
                        };
                        
                        const [startH, startM] = schedule.GioBatDau.split(':').map(Number);
                        const [endH, endM] = schedule.GioKetThuc.split(':').map(Number);
                        const availableMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                        const maxExercises = availableMinutes >= 120 ? 3 : (availableMinutes >= 60 ? 2 : 1);
                        
                        // Rải đều bài tập vào ngày này
                        const exercisesForThisDay = exercisesToDistributeThisWeek.filter(ex => 
                            !distributedExercisesThisWeek.has(ex.name)
                        );
                        
                        let totalTimeUsed = 0;
                        let exerciseIndex = 0;
                        let usedExerciseNames = new Set();
                        
                        while (sessionData.exercises.length < maxExercises && 
                               exerciseIndex < exercisesForThisDay.length &&
                               totalTimeUsed < availableMinutes) {
                            const exercise = exercisesForThisDay[exerciseIndex];
                            
                            // Kiểm tra exercise có tồn tại và có đủ thông tin không
                            if (!exercise || typeof exercise.time !== 'number') {
                                exerciseIndex++;
                                continue;
                            }
                            
                            if (totalTimeUsed + exercise.time <= availableMinutes && 
                                !usedExerciseNames.has(exercise.name)) {
                                sessionData.exercises.push({...exercise});
                                totalTimeUsed += exercise.time;
                                usedExerciseNames.add(exercise.name);
                                distributedExercisesThisWeek.add(exercise.name);
                                
                                // Tăng số tuần đã phân phối cho bài tập này
                                const currentCount = exerciseWeekCount.get(exercise.name) || 0;
                                exerciseWeekCount.set(exercise.name, currentCount + 1);
                                
                                // Xóa khỏi pending nếu có
                                const pendingIndex = pendingExercises.findIndex(e => e.name === exercise.name);
                                if (pendingIndex >= 0) {
                                    pendingExercises.splice(pendingIndex, 1);
                                }
                            }
                            exerciseIndex++;
                        }
                        
                        if (sessionData.exercises.length > 0) {
                            dayData.sessions.push(sessionData);
                        }
                    });
                    
                    if (dayData.sessions.length > 0) {
                        weekData.days.push(dayData);
                    }
                }
            }
            
            // Thêm tuần vào danh sách nếu có bài tập hoặc để hiển thị tuần trống
            weeks.push(weekData);
            
            // Kiểm tra lại xem còn bài tập nào chưa đủ số tuần không
            needMoreWeeks = false;
            exerciseQueue.forEach(ex => {
                const exerciseWeeks = getWeeksByDifficulty(ex.difficulty);
                const currentWeekCount = exerciseWeekCount.get(ex.name) || 0;
                if (currentWeekCount < exerciseWeeks) {
                    needMoreWeeks = true;
                }
            });
        }
    }
    
    // Lưu dữ liệu lịch
    previewScheduleData = weeks;
    
    // Debug: Log previewScheduleData để kiểm tra ngày
    console.log(`[DEBUG generatePreviewSchedule] Total weeks: ${weeks.length}, actualMaxWeeks: ${actualMaxWeeks}`);
    weeks.forEach((week, weekIdx) => {
        console.log(`[DEBUG generatePreviewSchedule] Week ${week.weekNumber} (index ${weekIdx}): startDate=${formatDateToYYYYMMDD(week.startDate)}, endDate=${formatDateToYYYYMMDD(week.endDate)}, days=${week.days.length}`);
        week.days.forEach(day => {
            const dayStr = day.date ? formatDateToYYYYMMDD(new Date(day.date)) : 'N/A';
            const dayOfWeek = day.date ? new Date(day.date).getDay() : 'N/A';
            const ngayTrongTuan = dayOfWeek === 0 ? 7 : (dayOfWeek === 'N/A' ? 'N/A' : dayOfWeek);
            console.log(`[DEBUG generatePreviewSchedule]   Day: ${dayStr}, dayOfWeek=${dayOfWeek}, ngayTrongTuan=${ngayTrongTuan}, dayName=${day.dayName}, dayOfWeekFromData=${day.dayOfWeek}, sessions=${day.sessions?.length || 0}`);
        });
    });
    
    // Kiểm tra xem có tuần nào bị thiếu không
    if (weeks.length < actualMaxWeeks) {
        console.warn(`[DEBUG generatePreviewSchedule] WARNING: Expected ${actualMaxWeeks} weeks but only got ${weeks.length} weeks!`);
        for (let i = 0; i < actualMaxWeeks; i++) {
            const expectedWeekStart = new Date(firstWeekStart);
            expectedWeekStart.setDate(firstWeekStart.getDate() + (i * 7));
            const expectedWeekEnd = getWeekEnd(expectedWeekStart);
            const foundWeek = weeks.find(w => formatDateToYYYYMMDD(w.startDate) === formatDateToYYYYMMDD(expectedWeekStart));
            if (!foundWeek) {
                console.error(`[DEBUG generatePreviewSchedule] MISSING WEEK ${i + 1}: ${formatDateToYYYYMMDD(expectedWeekStart)} - ${formatDateToYYYYMMDD(expectedWeekEnd)}`);
            }
        }
    }
    
    // Cập nhật ngày dự kiến hoàn thành
    updateDateRangeFromSchedule();
    
    // Render lịch
    renderPreviewSchedule(weeks);
}

// Render lịch dự kiến
function renderPreviewSchedule(weeks) {
    const calendarDiv = document.getElementById('previewScheduleCalendar');
    if (!calendarDiv) return;
    
    // Ẩn options và hiển thị calendar
    const optionsDiv = document.getElementById('previewScheduleOptions');
    if (optionsDiv) optionsDiv.style.display = 'none';
    
    calendarDiv.style.display = 'block';
    calendarDiv.innerHTML = '';
    
    // Render nội dung lịch
    
    if (weeks.length === 0) {
        calendarDiv.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #cbd5e1;">
                <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                <p>Không có lịch tập nào được tạo</p>
            </div>
        `;
        return;
    }
    
    weeks.forEach((week, weekIndex) => {
        const weekDiv = document.createElement('div');
        weekDiv.className = 'preview-schedule-week';
        
        // Debug: Log thông tin tuần khi render
        console.log(`[DEBUG renderPreviewSchedule] Rendering week ${week.weekNumber} (index ${weekIndex}): ${formatDateToYYYYMMDD(week.startDate)} - ${formatDateToYYYYMMDD(week.endDate || new Date(week.startDate.getTime() + 6 * 24 * 60 * 60 * 1000))}, days=${week.days.length}`);
        
        const weekHeader = document.createElement('div');
        weekHeader.style.cssText = 'margin-bottom: 1rem; padding: 0.75rem; background: rgba(78, 222, 128, 0.1); border-radius: 8px; border-left: 3px solid #4ade80;';
        weekHeader.innerHTML = `
            <strong style="color: #4ade80; font-size: 1.1rem;">Tuần ${week.weekNumber}</strong>
            <span style="color: #cbd5e1; font-size: 0.875rem; margin-left: 1rem;">
                ${formatDate(week.startDate)} - ${formatDate(week.endDate || new Date(week.startDate.getTime() + 6 * 24 * 60 * 60 * 1000))}
            </span>
        `;
        weekDiv.appendChild(weekHeader);
        
        // Hiển thị thông báo nếu tuần không có bài tập
        if (week.days.length === 0) {
            const emptyWeekDiv = document.createElement('div');
            emptyWeekDiv.style.cssText = 'text-align: center; padding: 2rem; color: #94a3b8; font-style: italic;';
            emptyWeekDiv.innerHTML = `
                <i class="fas fa-calendar-times" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                <p>Tuần này chưa có lịch tập</p>
            `;
            weekDiv.appendChild(emptyWeekDiv);
        }
        
        week.days.forEach(day => {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'preview-schedule-day';
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'preview-schedule-day-header';
            dayHeader.innerHTML = `
                <div class="preview-schedule-day-title">${day.dayName}, ${formatDate(day.date)}</div>
            `;
            dayDiv.appendChild(dayHeader);
            
            day.sessions.forEach(session => {
                const sessionDiv = document.createElement('div');
                sessionDiv.className = 'preview-schedule-session';
                
                const sessionHeader = document.createElement('div');
                sessionHeader.className = 'preview-schedule-session-header';
                sessionHeader.innerHTML = `
                    <span class="preview-schedule-session-time">${session.gioBatDau} - ${session.gioKetThuc}</span>
                    <span class="preview-schedule-session-buoi">${session.buoi}</span>
                `;
                sessionDiv.appendChild(sessionHeader);
                
                if (session.exercises.length > 0) {
                    const exercisesDiv = document.createElement('div');
                    exercisesDiv.className = 'preview-schedule-exercises';
                    
                    session.exercises.forEach((exercise, exerciseIndex) => {
                        const exerciseDiv = document.createElement('div');
                        exerciseDiv.className = 'preview-schedule-exercise';
                        exerciseDiv.setAttribute('data-exercise-name', exercise.name);
                        exerciseDiv.setAttribute('data-day-date', formatDateForComparison(day.date));
                        exerciseDiv.setAttribute('data-session-time', `${session.gioBatDau}-${session.gioKetThuc}`);
                        exerciseDiv.innerHTML = `
                            <div class="preview-schedule-exercise-content">
                                <div class="preview-schedule-exercise-name">${exercise.name}</div>
                                <div class="preview-schedule-exercise-details">
                                    <span><i class="fas fa-clock"></i> ${exercise.time} phút</span>
                                    <span><i class="fas fa-fire"></i> ${exercise.calo} calo</span>
                                    <span><i class="fas fa-layer-group"></i> ${exercise.difficulty}</span>
                                </div>
                            </div>
                            <button class="btn-move-exercise" title="Di chuyển bài tập" data-exercise-index="${exerciseIndex}">
                                <i class="fas fa-arrows-alt"></i>
                            </button>
                        `;
                        exercisesDiv.appendChild(exerciseDiv);
                    });
                    
                    sessionDiv.appendChild(exercisesDiv);
                }
                
                dayDiv.appendChild(sessionDiv);
            });
            
            weekDiv.appendChild(dayDiv);
        });
        
        calendarDiv.appendChild(weekDiv);
    });
    
    // Thêm event listener cho các nút di chuyển bài tập
    attachMoveExerciseListeners();
    
    // Thêm 2 nút "Xác nhận" và "Hủy" ở dưới cùng của lịch
    const confirmButtonsDiv = document.createElement('div');
    confirmButtonsDiv.style.cssText = 'text-align: center; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(148, 163, 184, 0.2); display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;';
    confirmButtonsDiv.innerHTML = `
        <button class="btn" id="btnConfirmSchedule" style="padding: 0.75rem 1.5rem; font-size: 1rem; background: rgba(74, 222, 128, 0.2); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.3);">
            <i class="fas fa-check"></i> Xác nhận
        </button>
        <button class="btn" id="btnCancelScheduleFromCalendar" style="padding: 0.75rem 1.5rem; font-size: 1rem; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">
            <i class="fas fa-times"></i> Hủy
        </button>
    `;
    calendarDiv.appendChild(confirmButtonsDiv);
    
    // Event listener cho nút "Xác nhận"
    const btnConfirmSchedule = confirmButtonsDiv.querySelector('#btnConfirmSchedule');
    if (btnConfirmSchedule) {
        btnConfirmSchedule.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Xác nhận lịch, ẩn calendar và hiển thị lại phần "Lịch Luyện Tập Dự Kiến" với 2 nút "Xem" và "Hủy"
            calendarDiv.style.display = 'none';
            // Cập nhật ngày dự kiến hoàn thành
            updateDateRangeFromSchedule();
            showScheduleViewButtons();
        });
    }
    
    // Event listener cho nút "Hủy" trong calendar
    const btnCancelFromCalendar = confirmButtonsDiv.querySelector('#btnCancelScheduleFromCalendar');
    if (btnCancelFromCalendar) {
        btnCancelFromCalendar.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Reset về trạng thái ban đầu
            resetPreviewScheduleState();
        });
    }
}

// Hiển thị 2 nút "Xem" và "Hủy" thay thế nút "Tạo lịch"
function showScheduleViewButtons() {
    const actionsDiv = document.getElementById('previewScheduleActions');
    if (!actionsDiv) return;
    
    actionsDiv.innerHTML = `
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn" id="btnViewSchedule" style="padding: 0.75rem 1.5rem; font-size: 1rem; background: rgba(74, 222, 128, 0.2); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.3);">
                <i class="fas fa-eye"></i> Xem
            </button>
            <button class="btn" id="btnCancelSchedule" style="padding: 0.75rem 1.5rem; font-size: 1rem; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">
                <i class="fas fa-times"></i> Hủy
            </button>
        </div>
    `;
    
    actionsDiv.style.display = 'block';
    
    // Event listener cho nút "Xem"
    const btnViewSchedule = actionsDiv.querySelector('#btnViewSchedule');
    if (btnViewSchedule) {
        btnViewSchedule.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Hiển thị lại calendar
            const calendarDiv = document.getElementById('previewScheduleCalendar');
            if (calendarDiv && previewScheduleData) {
                calendarDiv.style.display = 'block';
                calendarDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Highlight lịch trong 1 giây
                const originalBorder = calendarDiv.style.border;
                calendarDiv.style.border = '2px solid #4ade80';
                calendarDiv.style.transition = 'border 0.3s ease';
                setTimeout(() => {
                    calendarDiv.style.border = originalBorder;
                }, 1000);
            }
        });
    }
    
    // Event listener cho nút "Hủy"
    const btnCancelSchedule = actionsDiv.querySelector('#btnCancelSchedule');
    if (btnCancelSchedule) {
        btnCancelSchedule.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Reset về trạng thái ban đầu
            resetPreviewScheduleState();
        });
    }
}

// Gắn event listener cho các nút di chuyển bài tập
function attachMoveExerciseListeners() {
    const moveButtons = document.querySelectorAll('.btn-move-exercise');
    moveButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const exerciseDiv = this.closest('.preview-schedule-exercise');
            if (!exerciseDiv) return;
            
            const exerciseName = exerciseDiv.getAttribute('data-exercise-name');
            const currentDayDate = exerciseDiv.getAttribute('data-day-date');
            const currentSessionTime = exerciseDiv.getAttribute('data-session-time');
            
            showMoveExerciseModal(exerciseName, currentDayDate, currentSessionTime);
        });
    });
}

// Hiển thị modal để chọn ngày đích để di chuyển bài tập
function showMoveExerciseModal(exerciseName, currentDayDate, currentSessionTime) {
    if (!previewScheduleData || previewScheduleData.length === 0) {
        alert('Không có dữ liệu lịch');
        return;
    }
    
    // Tìm bài tập hiện tại trong dữ liệu
    let currentExercise = null;
    let currentWeekIndex = -1;
    let currentDayIndex = -1;
    let currentSessionIndex = -1;
    let currentExerciseIndex = -1;
    
    for (let w = 0; w < previewScheduleData.length; w++) {
        const week = previewScheduleData[w];
        for (let d = 0; d < week.days.length; d++) {
            const day = week.days[d];
            if (formatDateForComparison(day.date) === currentDayDate) {
                for (let s = 0; s < day.sessions.length; s++) {
                    const session = day.sessions[s];
                    if (`${session.gioBatDau}-${session.gioKetThuc}` === currentSessionTime) {
                        for (let e = 0; e < session.exercises.length; e++) {
                            if (session.exercises[e].name === exerciseName) {
                                currentExercise = session.exercises[e];
                                currentWeekIndex = w;
                                currentDayIndex = d;
                                currentSessionIndex = s;
                                currentExerciseIndex = e;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    
    if (!currentExercise) {
        alert('Không tìm thấy bài tập');
        return;
    }
    
    // Lấy schedule data gốc để biết tất cả các ngày có schedule
    const scheduleData = collectScheduleData();
    if (!scheduleData || scheduleData.length === 0) {
        alert('Không có dữ liệu lịch tập');
        return;
    }
    
    // Lấy danh sách ngày không thể tập
    const blockedDates = getBlockedDates();
    
    // Lấy ngày hôm nay (chỉ ngày, không có giờ) để so sánh
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDateStr = formatDateForComparison(today);
    
    // Tạo danh sách các ngày có thể di chuyển đến
    // Tìm tất cả các ngày có schedule trong tất cả các tuần, kể cả những ngày chưa có bài tập
    const availableDays = [];
    previewScheduleData.forEach((week, weekIdx) => {
        // Duyệt qua tất cả 7 ngày trong tuần
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const currentDate = new Date(week.startDate);
            currentDate.setDate(week.startDate.getDate() + dayOffset);
            
            // Kiểm tra xem ngày này có vượt quá endDate không
            if (week.endDate && currentDate > week.endDate) break;
            
            const dayDateStr = formatDateForComparison(currentDate);
            if (dayDateStr === currentDayDate) continue; // Bỏ qua ngày hiện tại
            
            // QUAN TRỌNG: Kiểm tra xem ngày này có phải là ngày quá khứ không
            // Chỉ cho phép di chuyển đến ngày hôm nay hoặc tương lai
            if (dayDateStr < todayDateStr) continue; // Bỏ qua ngày quá khứ
            
            // Kiểm tra xem ngày này có bị chặn không
            if (isDateBlocked(currentDate, blockedDates)) continue;
            
            const dayOfWeek = currentDate.getDay();
            const ngayTrongTuan = dayOfWeek === 0 ? 7 : dayOfWeek;
            
            // Tìm schedule phù hợp với ngày này
            const matchingSchedules = scheduleData.filter(s => s.NgayTrongTuan === ngayTrongTuan);
            
            if (matchingSchedules.length > 0) {
                // Tìm hoặc tạo dayData cho ngày này
                let dayData = week.days.find(d => formatDateForComparison(d.date) === dayDateStr);
                
                matchingSchedules.forEach(schedule => {
                    // Tìm hoặc tạo session cho buổi này
                    let sessionData = null;
                    let sessionIdx = -1;
                    
                    if (dayData) {
                        sessionData = dayData.sessions.find(s => 
                            s.gioBatDau === schedule.GioBatDau && 
                            s.gioKetThuc === schedule.GioKetThuc
                        );
                        if (sessionData) {
                            sessionIdx = dayData.sessions.indexOf(sessionData);
                        }
                    }
                    
                    // Tính thời gian có sẵn
                    const [startH, startM] = schedule.GioBatDau.split(':').map(Number);
                    const [endH, endM] = schedule.GioKetThuc.split(':').map(Number);
                    const availableMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                    const maxExercises = availableMinutes >= 120 ? 3 : (availableMinutes >= 60 ? 2 : 1);
                    
                    // Tính số bài tập hiện tại và thời gian đã sử dụng
                    const currentExerciseCount = sessionData ? sessionData.exercises.length : 0;
                    const totalTimeUsed = sessionData ? sessionData.exercises.reduce((sum, ex) => {
                        return sum + (ex && typeof ex.time === 'number' ? ex.time : 0);
                    }, 0) : 0;
                    
                    // Kiểm tra xem buổi này đã có bài tập trùng tên chưa
                    const hasDuplicateExercise = sessionData ? 
                        sessionData.exercises.some(ex => ex.name === currentExercise.name) : false;
                    
                    // Kiểm tra xem có thể thêm bài tập này không
                    // Không cho phép nếu đã có bài tập trùng tên trong buổi này
                    if (!hasDuplicateExercise && 
                        currentExerciseCount < maxExercises && 
                        totalTimeUsed + currentExercise.time <= availableMinutes) {
                        
                        // Tìm dayIndex và sessionIndex trong week.days
                        let dayIdx = -1;
                        if (dayData) {
                            dayIdx = week.days.indexOf(dayData);
                        } else {
                            // Nếu chưa có dayData, sẽ tạo mới khi di chuyển
                            dayIdx = -1; // Đánh dấu cần tạo mới
                        }
                        
                        availableDays.push({
                            weekIndex: weekIdx,
                            dayIndex: dayIdx,
                            sessionIndex: sessionIdx >= 0 ? sessionIdx : -1, // -1 nếu cần tạo mới
                            weekNumber: week.weekNumber,
                            dayName: getDayName(ngayTrongTuan),
                            date: new Date(currentDate),
                            sessionTime: `${schedule.GioBatDau}-${schedule.GioKetThuc}`,
                            buoi: schedule.Buoi,
                            schedule: schedule // Lưu schedule để tạo mới nếu cần
                        });
                    }
                });
            }
        }
    });
    
    if (availableDays.length === 0) {
        alert('Không có ngày nào có thể di chuyển bài tập đến');
        return;
    }
    
    // Tạo modal
    const modal = document.createElement('div');
    modal.className = 'move-exercise-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: #1e293b;
        border-radius: 12px;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        border: 1px solid rgba(78, 222, 128, 0.3);
    `;
    
    modalContent.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <h3 style="color: #4ade80; margin-bottom: 0.5rem;">Di chuyển bài tập</h3>
            <p style="color: #cbd5e1; font-size: 0.9rem;">${exerciseName}</p>
        </div>
        <div style="margin-bottom: 1.5rem;">
            <label style="color: #cbd5e1; display: block; margin-bottom: 0.5rem;">Chọn ngày đích:</label>
            <div id="availableDaysList" style="display: flex; flex-direction: column; gap: 0.5rem;">
            </div>
        </div>
        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
            <button class="btn" id="cancelMoveBtn" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">Hủy</button>
        </div>
    `;
    
    const daysList = modalContent.querySelector('#availableDaysList');
    availableDays.forEach(dayOption => {
        const dayButton = document.createElement('button');
        dayButton.className = 'btn';
        dayButton.style.cssText = `
            background: rgba(78, 222, 128, 0.1);
            color: #4ade80;
            border: 1px solid rgba(78, 222, 128, 0.3);
            padding: 0.75rem;
            text-align: left;
            cursor: pointer;
            transition: all 0.2s;
        `;
        dayButton.innerHTML = `
            <div style="font-weight: 600;">${dayOption.dayName}, ${formatDate(dayOption.date)}</div>
            <div style="font-size: 0.875rem; opacity: 0.8; margin-top: 0.25rem;">
                ${dayOption.buoi}: ${dayOption.sessionTime}
            </div>
        `;
        dayButton.addEventListener('click', () => {
            moveExercise(
                currentWeekIndex, currentDayIndex, currentSessionIndex, currentExerciseIndex,
                dayOption.weekIndex, dayOption.dayIndex, dayOption.sessionIndex, dayOption
            );
            modal.remove();
        });
        dayButton.addEventListener('mouseenter', () => {
            dayButton.style.background = 'rgba(78, 222, 128, 0.2)';
        });
        dayButton.addEventListener('mouseleave', () => {
            dayButton.style.background = 'rgba(78, 222, 128, 0.1)';
        });
        daysList.appendChild(dayButton);
    });
    
    const cancelBtn = modalContent.querySelector('#cancelMoveBtn');
    cancelBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Đóng modal khi click bên ngoài
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Di chuyển bài tập từ vị trí này sang vị trí khác
function moveExercise(fromWeekIdx, fromDayIdx, fromSessionIdx, fromExerciseIdx,
                      toWeekIdx, toDayIdx, toSessionIdx, dayOption = null) {
    if (!previewScheduleData) return;
    
    // QUAN TRỌNG: Kiểm tra ngày đích có phải là ngày quá khứ không
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDateStr = formatDateForComparison(today);
    
    // Lấy ngày đích từ dayOption hoặc từ previewScheduleData
    let targetDate = null;
    if (dayOption && dayOption.date) {
        targetDate = new Date(dayOption.date);
    } else if (toWeekIdx >= 0 && toDayIdx >= 0 && previewScheduleData[toWeekIdx] && previewScheduleData[toWeekIdx].days[toDayIdx]) {
        targetDate = new Date(previewScheduleData[toWeekIdx].days[toDayIdx].date);
    }
    
    if (targetDate) {
        targetDate.setHours(0, 0, 0, 0);
        const targetDateStr = formatDateForComparison(targetDate);
        if (targetDateStr < todayDateStr) {
            alert('Không thể di chuyển bài tập đến ngày quá khứ. Vui lòng chọn ngày hôm nay hoặc ngày trong tương lai.');
            return;
        }
    }
    
    // Lấy bài tập cần di chuyển
    const exercise = previewScheduleData[fromWeekIdx].days[fromDayIdx]
        .sessions[fromSessionIdx].exercises[fromExerciseIdx];
    
    // Xử lý vị trí đích - kiểm tra trước khi xóa
    const toWeek = previewScheduleData[toWeekIdx];
    
    // Tìm hoặc tạo dayData
    let toDay = null;
    if (toDayIdx >= 0 && toWeek.days[toDayIdx]) {
        toDay = toWeek.days[toDayIdx];
    } else {
        // Cần tạo mới dayData
        if (!dayOption) {
            alert('Không có thông tin để di chuyển bài tập');
            return;
        }
        
        const dayOfWeek = dayOption.date.getDay();
        const ngayTrongTuan = dayOfWeek === 0 ? 7 : dayOfWeek;
        
        toDay = {
            date: new Date(dayOption.date),
            dayOfWeek: ngayTrongTuan,
            dayName: dayOption.dayName,
            sessions: []
        };
        toWeek.days.push(toDay);
        toDayIdx = toWeek.days.length - 1;
    }
    
    // Tìm hoặc tạo sessionData
    let toSession = null;
    if (toSessionIdx >= 0 && toDay.sessions[toSessionIdx]) {
        toSession = toDay.sessions[toSessionIdx];
    } else {
        // Cần tạo mới sessionData
        if (!dayOption || !dayOption.schedule) {
            alert('Không có thông tin để di chuyển bài tập');
            return;
        }
        
        toSession = {
            buoi: dayOption.buoi,
            gioBatDau: dayOption.schedule.GioBatDau,
            gioKetThuc: dayOption.schedule.GioKetThuc,
            exercises: []
        };
        toDay.sessions.push(toSession);
        toSessionIdx = toDay.sessions.length - 1;
    }
    
    // Kiểm tra xem buổi đích đã có bài tập trùng tên chưa (KIỂM TRA TRƯỚC KHI XÓA)
    const hasDuplicateExercise = toSession.exercises.some(ex => ex.name === exercise.name);
    if (hasDuplicateExercise) {
        // Hiển thị thông báo và không cho di chuyển
        alert(`Không thể di chuyển bài tập "${exercise.name}" vào buổi này vì đã có bài tập cùng tên trong buổi đó.`);
        return;
    }
    
    // Bây giờ mới xóa bài tập khỏi vị trí cũ (sau khi đã kiểm tra thành công)
    const fromWeek = previewScheduleData[fromWeekIdx];
    const fromDay = fromWeek.days[fromDayIdx];
    const fromSession = fromDay.sessions[fromSessionIdx];
    
    fromSession.exercises.splice(fromExerciseIdx, 1);
    
    // Xóa session nếu không còn bài tập
    if (fromSession.exercises.length === 0) {
        fromDay.sessions.splice(fromSessionIdx, 1);
    }
    
    // Xóa ngày nếu không còn session nào có bài tập
    const hasExercises = fromDay.sessions.some(s => s.exercises.length > 0);
    if (!hasExercises) {
        fromWeek.days.splice(fromDayIdx, 1);
    }
    
    // Thêm bài tập vào vị trí mới
    toSession.exercises.push(exercise);
    
    // Sắp xếp lại days theo ngày
    toWeek.days.sort((a, b) => a.date - b.date);
    
    // Re-render lịch
    renderPreviewSchedule(previewScheduleData);
}

// Helper: Lấy tên thứ trong tuần
function getDayName(ngayTrongTuan) {
    const days = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    return days[ngayTrongTuan] || '';
}

// Helper: Format ngày
function formatDate(date) {
    return date.toLocaleDateString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
}

