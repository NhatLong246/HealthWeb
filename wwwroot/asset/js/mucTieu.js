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

// Load danh sách mẫu tập luyện theo mục tiêu
async function loadMauTapLuyenByMucTieu(mucTieu) {
    const container = document.getElementById('suggestedExercisesList');
    if (!container) return;

    // Hiển thị loading state
    container.innerHTML = `
        <div class="loading-exercises" style="width: 100%; text-align: center; padding: 2rem;">
            <i class="fas fa-spinner"></i>
            <p style="margin-top: 1rem;">Đang tải danh sách bài tập...</p>
        </div>
    `;

    try {
        console.log('Loading workout templates for mucTieu:', mucTieu);
        const response = await fetch(`/MucTieu/GetMauTapLuyenByMucTieu?mucTieu=${encodeURIComponent(mucTieu)}`);
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
        
        // Chọn icon phù hợp dựa trên tên bài tập
        let iconClass = 'fas fa-dumbbell';
        const tenBaiTap = (exercise.TenMauTapLuyen || '').toLowerCase();
        if (tenBaiTap.includes('yoga') || tenBaiTap.includes('dẻo')) {
            iconClass = 'fas fa-spa';
        } else if (tenBaiTap.includes('chạy') || tenBaiTap.includes('cardio')) {
            iconClass = 'fas fa-running';
        } else if (tenBaiTap.includes('bụng') || tenBaiTap.includes('core')) {
            iconClass = 'fas fa-circle';
        } else if (tenBaiTap.includes('chân') || tenBaiTap.includes('đùi')) {
            iconClass = 'fas fa-walking';
        }
        
        card.innerHTML = `
            <div class="tile-media">
                <i class="${iconClass}"></i>
            </div>
            <div class="tile-footer">
                <span>${exercise.TenMauTapLuyen || 'Chưa có tên'}</span>
                <button class="btn danger">Thay đổi</button>
            </div>
        `;
        
        container.appendChild(card);
    });

    // Auto-load chi tiết bài tập đầu tiên
    const firstCard = container.querySelector('.exercise-card');
    if (firstCard) {
        firstCard.classList.add('selected');
        loadExerciseDetail(firstCard.getAttribute('data-mau-tap-luyen-id'));
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

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val || '0';
    };

    setText('dSessions', data.SoBuoiTap || data.SoTuan || 0);
    setText('dTime', data.TongThoiGian || data.CaloUocTinh || 0);
    setText('dEffect', data.HieuQua || 'Trung bình');
    setText('dCalories', data.TongCalo || data.CaloUocTinh || 0);
    setText('dScheme', data.Scheme || '');
    setText('dDiff', data.DoKho || 'Trung bình');

    const guideEl = document.getElementById('dGuide');
    if (guideEl) {
        guideEl.textContent = data.HuongDan || data.MoTa || '';
    }

    const header = panel.querySelector('h2');
    if (header) {
        header.textContent = 'Chi Tiết Bài Tập • ' + (data.TenMauTapLuyen || '');
    }

    // Cập nhật thống kê tổng quan
    updateStatsSummary(data);

    panel.hidden = false;
}

// Cập nhật thống kê tổng quan
function updateStatsSummary(data) {
    const totalTimeEl = document.querySelector('.stat-card.pink strong');
    const totalSessionsEl = document.querySelector('.stat-card.yellow strong');
    const performanceEl = document.querySelector('.stat-card.green strong');
    const pointsEl = document.querySelector('.stat-card.blue strong');

    if (totalTimeEl) {
        totalTimeEl.textContent = data.TongThoiGian || data.CaloUocTinh || 0;
    }
    if (totalSessionsEl) {
        totalSessionsEl.textContent = data.SoBuoiTap || data.SoTuan || 0;
    }
    if (performanceEl) {
        performanceEl.textContent = data.HieuQua || 'Trung bình';
    }
    if (pointsEl) {
        // Tính điểm dựa trên số lần sử dụng và điểm trung bình
        const points = Math.round((data.DiemTrungBinh || 0) * (data.SoLanSuDung || 0) * 10);
        pointsEl.textContent = points || 0;
    }
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
        e.preventDefault();
        document.querySelectorAll('[data-group="'+group+'"]').forEach(el=>el.classList.remove('selected'));
        t.classList.add('selected');

        // Khi click vào mục tiêu, load danh sách bài tập
        if(group === 'goal'){
            const value = t.getAttribute('data-value');
            const mucTieu = mucTieuMapping[value];
            if(mucTieu) {
                console.log('Goal selected:', value, '-> MucTieu:', mucTieu);
                loadMauTapLuyenByMucTieu(mucTieu);
            }
        }

        if(group === 'place'){
            const value = t.getAttribute('data-value');
            document.querySelectorAll('.equip-section').forEach(s=>s.classList.add('hidden'));
            const target = document.querySelector('.equip-section[data-place="'+value+'"]');
            if(target) target.classList.remove('hidden');
        }
    });
})();

// Summary interactions: load detail on tile click
(function(){
    document.addEventListener('click', function(e){
        const rawTarget = e.target;
        if(!(rawTarget instanceof HTMLElement)) return;
        
        // Bỏ qua nếu click vào button "Thay đổi"
        if(rawTarget.closest('.btn.danger')) return;
        
        const card = rawTarget.closest('.exercise-card');
        if(!card) return;
        
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

    function generateTimes(){
        const list = [];
        for(let h=5; h<=22; h++){
            for(let m of [0,30]){
                const hh = String(h).padStart(2,'0');
                const mm = String(m).padStart(2,'0');
                list.push(hh+':'+mm);
            }
        }
        return list;
    }
    const times = generateTimes();

    function buildMenu(target, type){
        closeMenu();
        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';
        const options = type==='day'?days: type==='session'?sessions: times;
        options.forEach(text=>{
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = text;
            btn.addEventListener('click', ()=>{
                target.textContent = text;
                closeMenu();
            });
            menu.appendChild(btn);
        });
        target.parentElement && target.parentElement.appendChild(menu);
        openMenu = menu;
    }

    function closeMenu(){
        if(openMenu && openMenu.parentElement){ openMenu.parentElement.removeChild(openMenu); }
        openMenu = undefined;
    }

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

    // Add row functionality
    function createRow(){
        const row = document.createElement('div');
        row.className = 'grid-row';
        row.innerHTML = '\n\
            <button class="pill schedule-picker" data-type="day">Thứ 2</button>\n\
            <button class="pill schedule-picker" data-type="session">Sáng</button>\n\
            <button class="pill schedule-picker" data-type="time-start">07:00</button>\n\
            <button class="pill schedule-picker" data-type="time-end">11:00</button>\n';
        return row;
    }

    window.addEventListener('DOMContentLoaded', function(){
        const addBtn = document.getElementById('addSession');
        const grid = document.querySelector('.session-grid');
        if(addBtn && grid){
            addBtn.addEventListener('click', function(){
                grid.appendChild(createRow());
            });
        }
    });
})();

// Off-days: add new day by user input
(function(){
    function createOffChip(label){
        const btn = document.createElement('button');
        btn.className = 'pill selectable';
        btn.setAttribute('data-group', 'off');
        btn.type = 'button';
        btn.textContent = label;
        return btn;
    }

    window.addEventListener('DOMContentLoaded', function(){
        const addOffBtn = document.getElementById('addOffDay');
        const list = document.getElementById('offDaysList');
        if(!addOffBtn || !list) return;
        addOffBtn.addEventListener('click', function(){
            const input = window.prompt('Nhập ngày không tập (ví dụ: T3, 15/11, Nghỉ lễ)');
            if(!input) return;
            const label = input.trim();
            if(label.length === 0) return;
            // prevent overly long labels
            const finalLabel = label.length > 20 ? label.slice(0,20) : label;
            list.appendChild(createOffChip(finalLabel));
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
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(function(pos){
                const center = [pos.coords.latitude, pos.coords.longitude];
                initMap(center);
                setTimeout(() => mapInstance.invalidateSize(), 50);
                fetchNearbyGyms(center);
            }, function(){
                initMap(fallback);
                setTimeout(() => mapInstance.invalidateSize(), 50);
                fetchNearbyGyms(fallback);
            }, { enableHighAccuracy: true, timeout: 8000 });
        }else{
            initMap(fallback);
            setTimeout(() => mapInstance.invalidateSize(), 50);
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

