// Data mẫu các bài tập
const exercises = [
  {
    id: 1,
    title: "Bài tập thứ nhất: Deadlift",
    desc: "Tập trung nhóm cơ lưng và đùi sau.",
    guide: "Giữ lưng thẳng, nâng tạ gần thân người.",
    sets: 45,
    rest: 30,
    kcal: 320,
    thumb: "images/ex1.jpg"
  },
  {
    id: 2,
    title: "Bài tập thứ hai: Bench Press",
    desc: "Tác động ngực, vai trước và tay sau.",
    guide: "Hạ tạ chậm, thở đều và đẩy mạnh lên.",
    sets: 36,
    rest: 45,
    kcal: 280,
    thumb: "images/ex2.jpg"
  }
];

// Tham chiếu DOM
const listContainer = document.getElementById("exercise-list");
const viewSchedule = document.getElementById("view-schedule");
const viewDetail = document.getElementById("view-detail");
const btnBack = document.getElementById("btnBack");
// Schedule DOM
const rangeTabs = document.getElementById("rangeTabs");
const rangeLabel = document.getElementById("rangeLabel");
const weekGrid = document.getElementById("weekGrid");
const monthGrid = document.getElementById("monthGrid");
const yearGrid = document.getElementById("yearGrid");

// Detail refs
const dTitle = document.getElementById("detail-title");
const dThumb = document.getElementById("detail-thumb");
const dDesc = document.getElementById("detail-desc");
const dGuide = document.getElementById("detail-guide");
// metric values handled later

// Timer refs
const timerEl = document.getElementById("timer");
const btnStart = document.getElementById("btnStart");
const btnPause = document.getElementById("btnPause");
const btnReset = document.getElementById("btnReset");
const btnDone = document.getElementById("btnDone");
const sessionList = document.getElementById("sessionList");
const sparkDetail = document.getElementById("sparkDetail");
const sparkAll = document.getElementById("sparkAll");
const recentList = document.getElementById("recentList");
const timerWrap = document.getElementById("timerWrap");
const timerSweep = document.getElementById("timerSweep");

// Helper: tạo phần tử bài tập trong danh sách
function createExerciseItem(ex) {
  const wrapper = document.createElement("div");
  wrapper.className = "exercise-item";
  // micro interaction on hover (optional)
  if (window.gsap) {
    wrapper.addEventListener('mouseenter', () => {
      gsap.to(wrapper, { scale: 1.02, duration: .18, ease: 'power2.out' });
    });
    wrapper.addEventListener('mouseleave', () => {
      gsap.to(wrapper, { scale: 1, duration: .18, ease: 'power2.out' });
    });
  }

  const img = document.createElement("img");
  img.alt = ex.title;
  img.src = ex.thumb;

  const content = document.createElement("div");
  content.className = "content";
  const h4 = document.createElement("h4");
  h4.textContent = ex.title;
  const p = document.createElement("p");
  p.textContent = "Nội dung bài tập";

  const open = document.createElement("button");
  open.className = "btn primary open-btn";
  open.textContent = "Bắt đầu bài tập";
  open.addEventListener("click", () => openDetail(ex.id));

  content.appendChild(h4);
  content.appendChild(p);

  wrapper.appendChild(img);
  wrapper.appendChild(content);
  wrapper.appendChild(open);
  return wrapper;
}

// Render danh sách bài tập
function renderList() {
  listContainer.innerHTML = "";
  exercises.forEach(ex => listContainer.appendChild(createExerciseItem(ex)));
}

// ---------- LỊCH THỰC TẾ ----------
function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - day);
  d.setHours(0,0,0,0);
  return d;
}

function formatDate(d) {
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function renderWeek(now = new Date()) {
  weekGrid.innerHTML = "";
  const start = startOfWeek(now);
  const names = ["Th2","Th3","Th4","Th5","Th6","Th7","CN"];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() + i);
    const node = document.createElement("div");
    node.className = "day" + (sameDate(dayDate, now) ? " now" : "");
    node.innerHTML = `<span>${names[i]}</span><b>${dayDate.getDate()}</b>`;
    weekGrid.appendChild(node);
  }
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  rangeLabel.textContent = `${formatDate(start)} - ${formatDate(end)}`;
}

let selectedMonthCell = null;
let selectedDateCell = null;

function renderMonth(now = new Date()) {
  monthGrid.innerHTML = "";
  // header DOW
  const head = document.createElement("div");
  head.className = "head";
  ["Th2","Th3","Th4","Th5","Th6","Th7","CN"].forEach(n => {
    const d = document.createElement("div");
    d.className = "dow";
    d.textContent = n;
    head.appendChild(d);
  });
  monthGrid.appendChild(head);

  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7; // Mon start
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  for (let i = 0; i < offset; i++) monthGrid.appendChild(cell(""));
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d);
    const c = cell(d, sameDate(date, new Date()));
    if (c) {
      c.style.cursor = "pointer";
      c.addEventListener("click", () => {
        if (selectedDateCell) selectedDateCell.classList.remove("selected");
        c.classList.add("selected");
        selectedDateCell = c;
        rangeLabel.textContent = date.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
      });
      monthGrid.appendChild(c);
    }
  }
  const title = now.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  rangeLabel.textContent = title.charAt(0).toUpperCase() + title.slice(1);

  function cell(text, today=false) {
    const c = document.createElement("div");
    c.className = "cell" + (today ? " today" : "");
    c.textContent = text;
    return c;
  }
}

function renderYear(now = new Date()) {
  yearGrid.innerHTML = "";
  for (let m = 0; m < 12; m++) {
    const box = document.createElement("div");
    box.className = "mon";
    const date = new Date(now.getFullYear(), m, 1);
    box.textContent = date.toLocaleDateString("vi-VN", { month: "short" });
    box.dataset.month = String(m);
    box.addEventListener("click", () => {
      // activate Month tab and render that month
      rangeTabs.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
      const monthTab = rangeTabs.querySelector('[data-range="month"]');
      if (monthTab) monthTab.classList.add("active");
      switchRange("month", new Date(now.getFullYear(), m, 1));
    });
    yearGrid.appendChild(box);
  }
  rangeLabel.textContent = `Năm ${now.getFullYear()}`;
}

function sameDate(a, b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function switchRange(range, date = new Date()){
  // explicitly control visibility and the hidden attribute to avoid layout stacking
  const show = (el, display) => { if (!el) return; el.hidden = false; el.style.display = display; };
  const hide = (el) => { if (!el) return; el.hidden = true; el.style.display = "none"; };

  if (range === 'week') {
    show(weekGrid, 'flex'); hide(monthGrid); hide(yearGrid); renderWeek(date);
  } else if (range === 'month') {
    hide(weekGrid); show(monthGrid, 'grid'); hide(yearGrid); renderMonth(date);
  } else if (range === 'year') {
    hide(weekGrid); hide(monthGrid); show(yearGrid, 'grid'); renderYear(date);
  }
  // animate newly visible range
  if (window.gsap) {
    const target = range === 'week' ? weekGrid : range === 'month' ? monthGrid : yearGrid;
    const children = target ? target.children : [];
    if (children && children.length) {
      gsap.from(children, { opacity: 0, y: 10, stagger: 0.04, duration: .28, ease: 'power2.out' });
    }
  }
}

// tab events
rangeTabs.addEventListener("click", (e)=>{
  const btn = e.target.closest(".tab");
  if(!btn) return;
  rangeTabs.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  btn.classList.add("active");
  switchRange(btn.dataset.range);
});

// Điều hướng
function showView(id) {
  const toDetail = id !== "schedule";
  const incoming = toDetail ? viewDetail : viewSchedule;
  const outgoing = toDetail ? viewSchedule : viewDetail;
  if (window.gsap) {
    gsap.to(outgoing, { opacity: 0, y: 6, duration: .18, ease: 'power2.out', onComplete: () => {
      outgoing.classList.remove('active');
      incoming.classList.add('active');
      gsap.fromTo(incoming, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: .22, ease: 'power2.out' });
    }});
  } else {
    if (toDetail) {
      viewDetail.classList.add("active");
      viewSchedule.classList.remove("active");
    } else {
      viewSchedule.classList.add("active");
      viewDetail.classList.remove("active");
    }
  }
}

function openDetail(id) {
  const ex = exercises.find(e => e.id === id);
  if (!ex) return;
  // Extract exercise name from title (e.g., "Bài tập thứ nhất: Deadlift" -> "Deadlift")
  const nameMatch = ex.title.match(/:\s*(.+)/);
  dTitle.textContent = nameMatch ? nameMatch[1].trim() : ex.title;
  dThumb.src = ex.thumb;
  dDesc.textContent = ex.desc;
  dGuide.textContent = ex.guide;
  const byId = (x)=>document.getElementById(x);
  byId("m-sets").textContent = ex.sets;
  byId("m-rest").textContent = ex.rest;
  byId("m-quality").textContent = ex.quality || "Tốt";
  byId("m-kcal").textContent = ex.kcal;
  byId("m-ratio").textContent = ex.ratio || "15 / 3 - 5 / 1";
  byId("m-level").textContent = ex.level || "Khó";
  currentExerciseId = ex.id;
  showView("detail");
  renderSessions(currentExerciseId);
}

btnBack.addEventListener("click", () => showView("schedule"));

// Đồng hồ đếm thời gian
let startTime = 0; // ms epoch khi bắt đầu
let elapsed = 0;   // ms đã chạy tích lũy
let rafId = null;
let currentExerciseId = null;
let sweepTween = null;
let resetTween = null;

// Visual feedback for actions
function animateAction(kind){
  if (!window.gsap) return;
  const tl = gsap.timeline();
  const wrap = timerWrap;
  const t = timerEl;
  if (!wrap || !t) return;
  const baseGlow = { duration:.22, ease:'power2.out' };
  if (kind === 'start'){
    tl.to(t, { scale:1.06, color:'#e8fff4', duration:.16, ease:'power2.out' })
      .to(t, { scale:1, color:'#e9f2ff', duration:.18, ease:'power2.out' })
      .fromTo(wrap, { boxShadow:'0 0 0 0 rgba(31,191,117,0.0)' }, { boxShadow:'0 0 0 10px rgba(31,191,117,0.22)', ...baseGlow }, '<')
      .to(wrap, { boxShadow:'0 0 0 0 rgba(31,191,117,0.0)', duration:.28, ease:'power2.out' });
  }
  if (kind === 'pause'){
    tl.to(t, { x:2, yoyo:true, repeat:5, duration:.04, ease:'power1.inOut' })
      .to(wrap, { boxShadow:'0 0 0 10px rgba(255,205,60,0.22)', ...baseGlow }, 0)
      .to(wrap, { boxShadow:'0 0 0 0 rgba(255,205,60,0.0)', duration:.28, ease:'power2.out' });
  }
  if (kind === 'done'){
    tl.to(t, { scale:1.08, color:'#e8fff4', duration:.16, ease:'back.out(2)' })
      .to(t, { scale:1, color:'#e9f2ff', duration:.22, ease:'power2.out' })
      .fromTo(wrap, { boxShadow:'0 0 0 0 rgba(31,191,117,0.0)' }, { boxShadow:'0 0 0 12px rgba(31,191,117,0.28)', ...baseGlow }, '<')
      .to(wrap, { boxShadow:'0 0 0 0 rgba(31,191,117,0.0)', duration:.32, ease:'power2.out' });
  }
  if (kind === 'reset'){
    // Calm pulse + scale-in instead of spin
    tl.fromTo(t, { scale:.96, filter:'brightness(1.15)' }, { scale:1, filter:'brightness(1)', duration:.24, ease:'power2.out' })
      .fromTo(wrap, { boxShadow:'0 0 0 0 rgba(45,126,247,0.0)' }, { boxShadow:'0 0 0 10px rgba(45,126,247,0.22)', ...baseGlow }, 0)
      .to(wrap, { boxShadow:'0 0 0 0 rgba(45,126,247,0.0)', duration:.28, ease:'power2.out' });
  }
}

function format(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function tick() {
  const now = performance.now();
  const total = now - startTime + elapsed;
  timerEl.textContent = format(total);
  rafId = requestAnimationFrame(tick);
}

btnStart.addEventListener("click", () => {
  if (rafId) return; // đang chạy
  startTime = performance.now();
  rafId = requestAnimationFrame(tick);
  // UI running state
  timerWrap?.classList.add('running');
  if (window.gsap && timerSweep){
    if (sweepTween) sweepTween.kill();
    sweepTween = gsap.to(timerSweep, { rotate: 360, transformOrigin: 'bottom center', repeat: -1, duration: 2, ease: 'none' });
  }
  // spin icon briefly
  const icon = document.querySelector('#view-detail .card h3 .title-icon');
  if (icon && window.gsap){ gsap.fromTo(icon,{rotate:0},{rotate:360,duration:.6,ease:'power1.inOut'}); }
  // action feedback
  animateAction('start');
});

btnPause.addEventListener("click", () => {
  if (!rafId) return; // đã dừng
  cancelAnimationFrame(rafId);
  rafId = null;
  const now = performance.now();
  elapsed += now - startTime;
  timerWrap?.classList.remove('running');
  if (sweepTween) sweepTween.pause();
  // action feedback
  animateAction('pause');
});

btnReset.addEventListener("click", () => {
  // stop live count-up if running and accumulate elapsed
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
    const now = performance.now();
    elapsed += now - startTime;
  }
  timerWrap?.classList.remove('running');
  if (sweepTween) { sweepTween.kill(); sweepTween = null; }

  // if nothing to reset visually, just zero out
  const currentMs = Math.max(0, elapsed);
  if (currentMs <= 0) {
    startTime = 0; elapsed = 0; timerEl.textContent = "00:00:00";
    animateAction('reset');
    return;
  }

  // visual feedback
  animateAction('reset');

  // cancel any ongoing reset tween
  if (resetTween && window.gsap) { resetTween.kill(); resetTween = null; }

  // GSAP-based countdown if available, else RAF fallback
  if (window.gsap) {
    const obj = { ms: currentMs };
    resetTween = gsap.to(obj, {
      ms: 0,
      // ultra-fast reset
      duration: 0.1,
      ease: 'none',
      onUpdate: () => { timerEl.textContent = format(obj.ms); },
      onComplete: () => {
        startTime = 0; elapsed = 0; timerEl.textContent = "00:00:00"; resetTween = null;
      }
    });
  } else {
    const start = performance.now();
    // ultra-fast fallback duration (ms)
    const duration = 100;
    function step(t){
      const d = t - start;
      const left = Math.max(0, duration - d);
      const ms = (left / duration) * currentMs;
      timerEl.textContent = format(ms);
      if (left > 0) { requestAnimationFrame(step); }
      else { startTime = 0; elapsed = 0; timerEl.textContent = "00:00:00"; }
    }
    requestAnimationFrame(step);
  }
});

// Ghi nhận lần tập khi bấm Xong
btnDone?.addEventListener("click", () => {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
    const now = performance.now();
    elapsed += now - startTime;
  }
  const seconds = Math.floor(elapsed / 1000);
  if (seconds <= 0 || !currentExerciseId) return;
  saveSession(currentExerciseId, seconds);
  startTime = 0; elapsed = 0; timerEl.textContent = "00:00:00";
  renderSessions(currentExerciseId);
  timerWrap?.classList.remove('running');
  if (sweepTween) { sweepTween.kill(); sweepTween = null; }
  // action feedback
  animateAction('done');
});

// Lưu/hiển thị lịch sử
function loadAllSessions(){
  try { return JSON.parse(localStorage.getItem("exerciseSessions") || "{}"); } catch(e) { return {}; }
}
function saveAllSessions(data){ localStorage.setItem("exerciseSessions", JSON.stringify(data)); }
function saveSession(exId, seconds){
  const all = loadAllSessions();
  if (!all[exId]) all[exId] = [];
  all[exId].push({ t: Date.now(), s: seconds });
  saveAllSessions(all);
}
function renderSessions(exId){
  const all = loadAllSessions();
  const list = all[exId] || [];
  if (sessionList) {
    sessionList.innerHTML = list.slice(-10).reverse().map(item => {
      const when = new Date(item.t).toLocaleString("vi-VN");
      const dur = new Date(item.s*1000).toISOString().substring(11,19);
      return `<li><span>${when}</span><b>${dur}</b></li>`;
    }).join("");
    if (window.gsap){
      gsap.from(sessionList.querySelectorAll('li'), {y:10,opacity:0,stagger:.05,duration:.35,ease:'power2.out'});
    }
  }
  drawSpark(sparkDetail, list.map(i=>i.s));
  const allArr = Object.values(all).flat();
  if (recentList) {
    recentList.innerHTML = allArr.slice(-5).reverse().map(it => {
      const when = new Date(it.t).toLocaleString("vi-VN");
      const dur = Math.round(it.s/60);
      return `<li><span>${when}</span><b>${dur} phút</b></li>`;
    }).join("");
  }
  drawSpark(sparkAll, allArr.map(i=>i.s));
}
function drawSpark(svgEl, series){
  if (!svgEl) return;
  const w = 300, h = 100;
  if (!series || series.length === 0) { svgEl.innerHTML = ""; return; }
  const max = Math.max(...series);
  const pts = series.slice(-20).map((v,i,arr)=>{
    const x = (i/(arr.length-1))*w;
    const y = h - (v/max)*h;
    return `${x},${y}`;
  }).join(" ");
  svgEl.innerHTML = `<polyline fill="none" stroke="#2d7ef7" stroke-width="2" points="${pts}" />`;
}

// Khởi tạo
renderList();
// init schedule
switchRange("week");

// ---------- ANIMATIONS (GSAP) ----------
window.addEventListener("load", () => {
  if (!window.gsap) return;
  gsap.registerPlugin(ScrollTrigger);


  // Fade+up for cards
  gsap.utils.toArray('.card').forEach((el, i) => {
    gsap.from(el, { opacity: 0, y: 20, duration: .5, ease: 'power2.out', delay: i*0.05, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });

  // Metrics stagger
  gsap.from('.metrics .metric', { opacity: 0, y: 16, scale: .98, duration: .4, stagger: .08, ease: 'power2.out', scrollTrigger: { trigger: '#detail-info', start: 'top 80%' } });

  // Bars grow on view
  const barEls = document.querySelectorAll('.barchart .bar');
  barEls.forEach((bar) => {
    const h = getComputedStyle(bar).getPropertyValue('--h') || '80%';
    gsap.fromTo(bar, { height: '0%' }, { height: h, duration: .9, ease: 'power2.out', scrollTrigger: { trigger: bar.closest('.barchart'), start: 'top 85%' } });
  });

  // Count-up numbers on metrics
  document.querySelectorAll('.metric .num').forEach((numEl) => {
    const final = Number(numEl.textContent.replace(/[^0-9]/g, '')) || null;
    if (!final) return;
    const obj = { val: 0 };
    gsap.to(obj, { val: final, duration: 1.2, ease: 'power1.out', scrollTrigger: { trigger: numEl, start: 'top 85%' }, onUpdate: () => {
      numEl.textContent = Math.round(obj.val);
    }});
  });

  // giữ nguyên các hiệu ứng GSAP hiện có
});

// Button ripple interaction
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.btn');
  if(!btn) return;
  btn.classList.add('ripple','active');
  const rect = btn.getBoundingClientRect();
  btn.style.setProperty('--x', `${e.clientX - rect.left}px`);
  btn.style.setProperty('--y', `${e.clientY - rect.top}px`);
  setTimeout(()=>btn.classList.remove('active'), 400);
});

// remove 3D tilt & parallax (revert to simpler state)


