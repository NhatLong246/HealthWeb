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

