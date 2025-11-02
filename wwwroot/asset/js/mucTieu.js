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
    function populateDetail(card){
        const panel = document.getElementById('exerciseDetail');
        if(!panel) return;
        const title = card.getAttribute('data-title') || '';
        const sessions = card.getAttribute('data-sessions') || '';
        const time = card.getAttribute('data-time') || '';
        const effect = card.getAttribute('data-effect') || '';
        const calories = card.getAttribute('data-calories') || '';
        const scheme = card.getAttribute('data-scheme') || '';
        const diff = card.getAttribute('data-difficulty') || '';
        const image = card.getAttribute('data-image') || '';
        const guide = card.getAttribute('data-guide') || '';

        const setText = (id, val)=>{ const el = document.getElementById(id); if(el) el.textContent = val; };
        setText('dSessions', sessions);
        setText('dTime', time);
        setText('dEffect', effect);
        setText('dCalories', calories);
        setText('dScheme', scheme);
        setText('dDiff', diff);
        const imgEl = document.getElementById('dImage');
        if(imgEl) imgEl.style.backgroundImage = image ? 'url("'+image+'")' : '';
        const guideEl = document.getElementById('dGuide');
        if(guideEl){ guideEl.textContent = guide; }

        const header = panel.querySelector('h2');
        if(header){ header.textContent = 'Chi Tiết Bài Tập • ' + title; }
        panel.hidden = false;
    }

    document.addEventListener('click', function(e){
        const rawTarget = e.target;
        if(!(rawTarget instanceof HTMLElement)) return;
        const card = rawTarget.closest('.exercise-card');
        if(!card) return;
        populateDetail(card);
    });

    // Auto-load first card on ready
    window.addEventListener('DOMContentLoaded', function(){
        const first = document.querySelector('.exercise-card');
        if(first) populateDetail(first);
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

