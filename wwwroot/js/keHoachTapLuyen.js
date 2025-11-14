// Dữ liệu từ database
let currentPlan = null;
let exercises = [];
let currentWeek = 1; // Tuần hiện tại
let showingAllExercises = false; // Flag để biết đang hiển thị tất cả hay theo ngày

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

  // Tạo thumbnail từ video URL hoặc icon mặc định
  const img = document.createElement("img");
  if (ex.videoUrl) {
    // Lấy thumbnail từ YouTube nếu có
    const videoId = getYouTubeVideoId(ex.videoUrl);
    if (videoId) {
      img.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      img.alt = ex.tenBaiTap;
    } else {
      img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='120'%3E%3Crect fill='%23e0e0e0' width='220' height='120'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3EKhông có ảnh%3C/text%3E%3C/svg%3E";
      img.alt = ex.tenBaiTap;
    }
  } else {
    img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='120'%3E%3Crect fill='%23e0e0e0' width='220' height='120'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3EKhông có ảnh%3C/text%3E%3C/svg%3E";
    img.alt = ex.tenBaiTap;
  }
  img.onerror = function() {
    this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='120'%3E%3Crect fill='%23e0e0e0' width='220' height='120'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3EKhông có ảnh%3C/text%3E%3C/svg%3E";
  };

  const content = document.createElement("div");
  content.className = "content";
  const h4 = document.createElement("h4");
  h4.textContent = ex.tenBaiTap;
  const p = document.createElement("p");
  const exerciseInfo = [];
  if (ex.soHiep && ex.soLan) {
    exerciseInfo.push(`${ex.soHiep} hiệp x ${ex.soLan} lần`);
  }
  if (ex.thoiGianPhut) {
    exerciseInfo.push(`${ex.thoiGianPhut} phút`);
  }
  p.textContent = exerciseInfo.length > 0 ? exerciseInfo.join(" • ") : "Nội dung bài tập";

  const open = document.createElement("button");
  open.className = "btn primary open-btn";
  open.textContent = "Bắt đầu bài tập";
  open.addEventListener("click", () => openDetail(ex.chiTietId));

  content.appendChild(h4);
  content.appendChild(p);

  wrapper.appendChild(img);
  wrapper.appendChild(content);
  wrapper.appendChild(open);
  return wrapper;
}

// Helper: Lấy video ID từ YouTube URL
function getYouTubeVideoId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Render danh sách bài tập
function renderList() {
  if (!listContainer) return;
  listContainer.innerHTML = "";
  
  if (exercises.length === 0) {
    listContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--muted);">Chưa có bài tập nào trong kế hoạch</div>';
    return;
  }
  
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
  if (!weekGrid) return;
  weekGrid.innerHTML = "";
  const start = startOfWeek(now);
  const names = ["Th2","Th3","Th4","Th5","Th6","Th7","CN"];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() + i);
    const node = document.createElement("div");
    const dayOfWeek = i + 1; // 1 = Monday, 7 = Sunday
    node.className = "day" + (sameDate(dayDate, now) ? " now" : "");
    node.innerHTML = `<span>${names[i]}</span><b>${dayDate.getDate()}</b>`;
    node.style.cursor = "pointer";
    node.addEventListener("click", () => {
      // Load bài tập cho ngày được chọn
      loadExercisesForDay(currentWeek, dayOfWeek);
      // Highlight ngày được chọn
      weekGrid.querySelectorAll(".day").forEach(d => d.classList.remove("selected"));
      node.classList.add("selected");
      // Reset nút "Xem tất cả"
      if (btnViewAllExercises) btnViewAllExercises.classList.remove('active');
      if (btnAddNewExercise) btnAddNewExercise.classList.remove('active');
    });
    weekGrid.appendChild(node);
  }
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  if (rangeLabel) rangeLabel.textContent = `${formatDate(start)} - ${formatDate(end)}`;
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

function openDetail(chiTietId) {
  const ex = exercises.find(e => e.chiTietId === chiTietId);
  if (!ex) return;
  
  if (dTitle) dTitle.textContent = ex.tenBaiTap;
  
  // Hiển thị thumbnail từ video URL
  if (dThumb) {
    if (ex.videoUrl) {
      const videoId = getYouTubeVideoId(ex.videoUrl);
      if (videoId) {
        dThumb.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        dThumb.alt = ex.tenBaiTap;
      } else {
        dThumb.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='180'%3E%3Crect fill='%23e0e0e0' width='100%25' height='180'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3EKhông có ảnh%3C/text%3E%3C/svg%3E";
      }
    } else {
      dThumb.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='180'%3E%3Crect fill='%23e0e0e0' width='100%25' height='180'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3EKhông có ảnh%3C/text%3E%3C/svg%3E";
    }
    dThumb.onerror = function() {
      this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='180'%3E%3Crect fill='%23e0e0e0' width='100%25' height='180'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3EKhông có ảnh%3C/text%3E%3C/svg%3E";
    };
  }
  
  if (dDesc) dDesc.textContent = ex.noiDung || "Nội dung bài tập";
  if (dGuide) dGuide.textContent = ex.huongDan || "Hướng dẫn bài tập";
  
  const byId = (x) => document.getElementById(x);
  if (byId("m-sets")) byId("m-sets").textContent = ex.soHiep || 0;
  if (byId("m-rest")) byId("m-rest").textContent = ex.thoiGianPhut ? `${ex.thoiGianPhut} phút` : "30 giây";
  if (byId("m-quality")) {
    const quality = ex.danhGiaHieuQua >= 4 ? "Tốt" : ex.danhGiaHieuQua >= 3 ? "Khá" : "Trung bình";
    byId("m-quality").textContent = quality;
  }
  if (byId("m-kcal")) byId("m-kcal").textContent = Math.round(ex.caloTieuHaoDuKien || 0);
  if (byId("m-ratio")) {
    const ratio = ex.soHiep && ex.soLan ? `${ex.soLan} / ${ex.soHiep}` : "N/A";
    byId("m-ratio").textContent = ratio;
  }
  if (byId("m-level")) {
    const level = ex.danhGiaDoKho >= 4 ? "Khó" : ex.danhGiaDoKho >= 3 ? "Trung bình" : "Dễ";
    byId("m-level").textContent = level;
  }
  
  currentExerciseId = ex.chiTietId;
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
btnDone?.addEventListener("click", async () => {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
    const now = performance.now();
    elapsed += now - startTime;
  }
  const seconds = Math.floor(elapsed / 1000);
  if (seconds <= 0 || !currentExerciseId) return;
  
  // Lưu vào localStorage (giữ nguyên logic cũ)
  saveSession(currentExerciseId, seconds);
  
  // Tìm bài tập hiện tại
  const currentExercise = exercises.find(e => e.chiTietId === currentExerciseId);
  if (!currentExercise) return;
  
  // Hiển thị modal để nhập thông tin hoàn thành
  showCompleteExerciseModal(currentExercise, seconds);
  
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

// Load dữ liệu từ database
async function loadPlanData() {
  try {
    const response = await fetch('/KeHoachTapLuyen/GetCurrentPlan');
    const data = await response.json();
    
    if (data.success && data.keHoach) {
      currentPlan = data.keHoach;
      // Lưu tất cả bài tập vào biến tạm
      const allExercises = data.keHoach.chiTietBaiTap || [];
      
      console.log('Loaded plan data - Total exercises:', allExercises.length);
      console.log('Exercises:', allExercises);
      
      // Cập nhật thông tin chi tiết
      updatePlanDetails();
      
      // Hiển thị tất cả bài tập mặc định (không filter theo ngày)
      exercises = allExercises;
      renderList();
      
      // Highlight ngày hôm nay trong lịch nhưng không filter bài tập
      const today = new Date();
      const dayOfWeek = today.getDay();
      const ngayTrongTuan = dayOfWeek === 0 ? 7 : dayOfWeek;
      if (weekGrid) {
        const days = weekGrid.querySelectorAll('.day');
        if (days[ngayTrongTuan - 1]) {
          days.forEach(d => d.classList.remove('selected'));
          days[ngayTrongTuan - 1].classList.add('selected');
        }
      }
    } else {
      // Không có kế hoạch
      if (listContainer) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--muted);">Chưa có kế hoạch tập luyện. Vui lòng tạo kế hoạch từ trang Mục tiêu.</div>';
      }
    }
  } catch (error) {
    console.error('Error loading plan data:', error);
    if (listContainer) {
      listContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--danger);">Lỗi khi tải dữ liệu. Vui lòng thử lại sau.</div>';
    }
  }
}

// Cập nhật thông tin chi tiết kế hoạch
function updatePlanDetails() {
  if (!currentPlan) return;
  
  // Cập nhật thông tin trong details-grid
  const detailsGrid = document.querySelector('.details-grid');
  if (detailsGrid && currentPlan.mucTieu) {
    const ngayBatDau = new Date(currentPlan.mucTieu.ngayBatDau);
    const ngayKetThuc = currentPlan.mucTieu.ngayKetThuc ? new Date(currentPlan.mucTieu.ngayKetThuc) : null;
    const today = new Date();
    
    // Tính số ngày còn lại
    let soNgayConLai = 0;
    if (ngayKetThuc) {
      const diffTime = ngayKetThuc - today;
      soNgayConLai = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (soNgayConLai < 0) soNgayConLai = 0;
    }
    
    // Cập nhật các thông tin
    const details = detailsGrid.querySelectorAll('div');
    if (details.length >= 4) {
      if (details[0]) {
        const strong = details[0].querySelector('strong');
        if (strong) strong.textContent = ngayBatDau.toLocaleDateString('vi-VN');
      }
      if (details[1]) {
        const strong = details[1].querySelector('strong');
        if (strong) strong.textContent = soNgayConLai;
      }
      if (details[2]) {
        const strong = details[2].querySelector('strong');
        if (strong) {
          // Xác định buổi tập dựa trên thời gian
          const hour = today.getHours();
          if (hour < 12) strong.textContent = "Sáng";
          else if (hour < 18) strong.textContent = "Chiều";
          else strong.textContent = "Tối";
        }
      }
      if (details[3]) {
        const strong = details[3].querySelector('strong');
        if (strong && ngayKetThuc) {
          strong.textContent = ngayKetThuc.toLocaleDateString('vi-VN');
        }
      }
    }
  }
  
  // Cập nhật stats
  const stats = document.querySelector('.stats');
  if (stats && currentPlan) {
    const statCards = stats.querySelectorAll('.stat');
    if (statCards.length >= 3) {
      // Kcal ước tính
      if (statCards[0]) {
        const badge = statCards[0].querySelector('.badge');
        if (badge) {
          const totalKcal = (currentPlan.caloTieuHaoMoiBuoi || 0) * (currentPlan.soBuoi || 0);
          badge.textContent = Math.round(totalKcal);
        }
      }
      // Hiệu quả
      if (statCards[1]) {
        const badge = statCards[1].querySelector('.badge');
        if (badge && currentPlan.soBuoi && currentPlan.soTuan) {
          const completed = Math.floor((currentPlan.soBuoi * currentPlan.soTuan) * 0.7); // Giả sử 70% hoàn thành
          badge.textContent = `${completed}/${currentPlan.soBuoi * currentPlan.soTuan}`;
        }
      }
      // Mức độ
      if (statCards[2]) {
        const badge = statCards[2].querySelector('.badge');
        if (badge) {
          const mucDo = currentPlan.mucDo === 'Beginner' ? 'Dễ' : 
                       currentPlan.mucDo === 'Intermediate' ? 'Trung bình' : 'Khó';
          badge.textContent = mucDo;
        }
      }
    }
  }
}

// Load bài tập cho tuần hiện tại
async function loadExercisesForCurrentWeek() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  const ngayTrongTuan = dayOfWeek === 0 ? 7 : dayOfWeek; // Chuyển sang 1-7 (Monday-Sunday)
  await loadExercisesForDay(currentWeek, ngayTrongTuan);
  
  // Highlight ngày hôm nay trong lịch
  if (weekGrid) {
    const days = weekGrid.querySelectorAll('.day');
    if (days[ngayTrongTuan - 1]) {
      days.forEach(d => d.classList.remove('selected'));
      days[ngayTrongTuan - 1].classList.add('selected');
    }
  }
}

// Load bài tập cho ngày cụ thể
async function loadExercisesForDay(tuan, ngayTrongTuan) {
  try {
    showingAllExercises = false;
    console.log(`Loading exercises for Tuan: ${tuan}, NgayTrongTuan: ${ngayTrongTuan}`);
    const response = await fetch(`/KeHoachTapLuyen/GetExercisesByDay?tuan=${tuan}&ngayTrongTuan=${ngayTrongTuan}`);
    const data = await response.json();
    
    console.log('GetExercisesByDay response:', data);
    
    if (data.success && data.exercises) {
      exercises = data.exercises;
      console.log(`Loaded ${exercises.length} exercises for day`);
      renderList();
    } else {
      console.warn('No exercises found for this day');
      exercises = [];
      renderList();
    }
  } catch (error) {
    console.error('Error loading exercises for day:', error);
    exercises = [];
    renderList();
  }
}

// Load tất cả bài tập trong kế hoạch
async function loadAllExercises() {
  try {
    showingAllExercises = true;
    console.log('Loading all exercises...');
    const response = await fetch('/KeHoachTapLuyen/GetAllExercises');
    const data = await response.json();
    
    console.log('GetAllExercises response:', data);
    
    if (data.success && data.exercises) {
      exercises = data.exercises;
      console.log(`Loaded ${exercises.length} total exercises`);
      renderList();
    } else {
      console.warn('No exercises found');
      exercises = [];
      renderList();
    }
  } catch (error) {
    console.error('Error loading all exercises:', error);
    exercises = [];
    renderList();
  }
}

// Xử lý nút "Xem tất cả bài tập"
const btnViewAllExercises = document.getElementById('btnViewAllExercises');
if (btnViewAllExercises) {
  btnViewAllExercises.addEventListener('click', async () => {
    await loadAllExercises();
    // Highlight nút
    btnViewAllExercises.classList.add('active');
    const btnAddNew = document.getElementById('btnAddNewExercise');
    if (btnAddNew) btnAddNew.classList.remove('active');
  });
}

// Xử lý nút "Thêm mới bài tập"
const btnAddNewExercise = document.getElementById('btnAddNewExercise');
if (btnAddNewExercise) {
  btnAddNewExercise.addEventListener('click', () => {
    // Chuyển đến trang Mục tiêu với tham số để quay lại
    const returnUrl = encodeURIComponent(window.location.pathname);
    window.location.href = `/MucTieu?returnUrl=${returnUrl}&action=addExercise`;
  });
}

// Kiểm tra nếu quay lại từ trang MucTieu với thông tin thêm bài tập
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  const mauTapLuyenId = urlParams.get('mauTapLuyenId');
  const baiTapIds = urlParams.get('baiTapIds');
  
  if (action === 'addExercise' && mauTapLuyenId) {
    // Thêm bài tập vào kế hoạch
    addExercisesFromTemplate(parseInt(mauTapLuyenId), baiTapIds ? JSON.parse(decodeURIComponent(baiTapIds)) : null);
    
    // Xóa tham số từ URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  loadPlanData();
  // init schedule
  if (rangeTabs) switchRange("week");
});

// Hàm thêm bài tập từ mẫu vào kế hoạch
async function addExercisesFromTemplate(mauTapLuyenId, baiTapIds) {
  try {
    const response = await fetch('/KeHoachTapLuyen/AddExercisesFromTemplate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mauTapLuyenId: mauTapLuyenId,
        baiTapIds: baiTapIds
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Reload danh sách bài tập
      if (showingAllExercises) {
        await loadAllExercises();
      } else {
        // Load lại bài tập cho ngày hiện tại
        const today = new Date();
        const dayOfWeek = today.getDay();
        const ngayTrongTuan = dayOfWeek === 0 ? 7 : dayOfWeek;
        await loadExercisesForDay(currentWeek, ngayTrongTuan);
      }
      
      // Hiển thị thông báo thành công
      alert(data.message || 'Đã thêm bài tập thành công');
    } else {
      alert(data.message || 'Có lỗi xảy ra khi thêm bài tập');
    }
  } catch (error) {
    console.error('Error adding exercises:', error);
    alert('Có lỗi xảy ra khi thêm bài tập');
  }
}

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

// ========== NHẬT KÝ HOÀN THÀNH BÀI TẬP ==========

// Hiển thị modal để nhập thông tin hoàn thành bài tập
function showCompleteExerciseModal(exercise, seconds) {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const displayMinutes = minutes % 60;
  const displaySeconds = seconds % 60;
  const timeStr = hours > 0 
    ? `${hours}:${displayMinutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`
    : `${displayMinutes}:${displaySeconds.toString().padStart(2, '0')}`;

  // Tạo modal HTML
  const modalHTML = `
    <div id="completeExerciseModal" class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
      <div class="modal-content" style="background: var(--bg, #fff); padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
        <h3 style="margin-top: 0;">Hoàn thành bài tập: ${exercise.tenBaiTap}</h3>
        <form id="completeExerciseForm">
          <div class="field" style="margin-bottom: 1rem;">
            <label>Thời gian tập (phút)</label>
            <input type="number" id="thoiLuongThucTe" value="${minutes}" min="0" step="1" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border, #ddd); border-radius: 4px;">
          </div>
          ${exercise.soHiep ? `
          <div class="field" style="margin-bottom: 1rem;">
            <label>Số hiệp thực tế</label>
            <input type="number" id="soHiepThucTe" value="${exercise.soHiep}" min="0" step="1" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border, #ddd); border-radius: 4px;">
          </div>
          ` : ''}
          ${exercise.soLan ? `
          <div class="field" style="margin-bottom: 1rem;">
            <label>Số lần thực tế</label>
            <input type="number" id="soLanThucTe" value="${exercise.soLan}" min="0" step="1" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border, #ddd); border-radius: 4px;">
          </div>
          ` : ''}
          <div class="field" style="margin-bottom: 1rem;">
            <label>Calo tiêu hao (ước tính)</label>
            <input type="number" id="caloTieuHao" value="${exercise.caloTieuHaoDuKien || 0}" min="0" step="0.1" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border, #ddd); border-radius: 4px;">
          </div>
          <div class="field" style="margin-bottom: 1rem;">
            <label>Đánh giá bài tập (1-5)</label>
            <select id="danhGiaBaiTap" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border, #ddd); border-radius: 4px;">
              <option value="5">5 - Xuất sắc</option>
              <option value="4" selected>4 - Tốt</option>
              <option value="3">3 - Bình thường</option>
              <option value="2">2 - Khó</option>
              <option value="1">1 - Rất khó</option>
            </select>
          </div>
          <div class="field" style="margin-bottom: 1rem;">
            <label>Ghi chú (tùy chọn)</label>
            <textarea id="ghiChu" rows="3" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border, #ddd); border-radius: 4px; resize: vertical;"></textarea>
          </div>
          <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button type="button" class="btn ghost" id="btnCancelComplete" style="flex: 1;">Hủy</button>
            <button type="submit" class="btn primary" style="flex: 1;">Lưu</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Thêm modal vào DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('completeExerciseModal');
  const form = document.getElementById('completeExerciseForm');
  const btnCancel = document.getElementById('btnCancelComplete');

  // Xử lý submit form
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      chiTietId: exercise.chiTietId,
      thoiLuongThucTePhut: parseInt(document.getElementById('thoiLuongThucTe').value) || null,
      soHiepThucTe: exercise.soHiep ? parseInt(document.getElementById('soHiepThucTe').value) || null : null,
      soLanThucTe: exercise.soLan ? parseInt(document.getElementById('soLanThucTe').value) || null : null,
      caloTieuHao: parseFloat(document.getElementById('caloTieuHao').value) || null,
      danhGiaBaiTap: parseInt(document.getElementById('danhGiaBaiTap').value) || null,
      ghiChu: document.getElementById('ghiChu').value || null
    };

    const success = await completeExercise(data);
    if (success) {
      modal.remove();
      // Reload nhật ký
      loadExerciseJournal();
      // Hiển thị thông báo thành công
      alert('Đã lưu nhật ký hoàn thành bài tập!');
    }
  });

  // Xử lý hủy
  btnCancel.addEventListener('click', () => {
    modal.remove();
  });

  // Đóng khi click bên ngoài
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Gọi API để hoàn thành bài tập
async function completeExercise(data) {
  try {
    const response = await fetch('/KeHoachTapLuyen/CompleteExercise', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (result.success) {
      return true;
    } else {
      alert(result.message || 'Lỗi khi lưu nhật ký');
      return false;
    }
  } catch (error) {
    console.error('Error completing exercise:', error);
    alert('Lỗi khi lưu nhật ký');
    return false;
  }
}

// Load nhật ký hoàn thành bài tập
async function loadExerciseJournal() {
  const journalContainer = document.getElementById('exercise-journal');
  if (!journalContainer) return;

  try {
    journalContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--muted);">Đang tải nhật ký...</div>';
    
    const response = await fetch('/KeHoachTapLuyen/GetExerciseJournal?limit=50');
    const data = await response.json();

    if (data.success && data.journal) {
      renderExerciseJournal(data.journal);
    } else {
      journalContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--muted);">Chưa có nhật ký hoàn thành bài tập</div>';
    }
  } catch (error) {
    console.error('Error loading exercise journal:', error);
    journalContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--danger, #ef4444);">Lỗi khi tải nhật ký</div>';
  }
}

// Render nhật ký hoàn thành bài tập
function renderExerciseJournal(journal) {
  const journalContainer = document.getElementById('exercise-journal');
  if (!journalContainer) return;

  if (journal.length === 0) {
    journalContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--muted);">Chưa có nhật ký hoàn thành bài tập</div>';
    return;
  }

  // Nhóm theo ngày
  const groupedByDate = {};
  journal.forEach(entry => {
    const date = entry.ngayHoanThanh;
    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }
    groupedByDate[date].push(entry);
  });

  // Render HTML
  let html = '<div class="journal-list">';
  
  Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a)).forEach(date => {
    const entries = groupedByDate[date];
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('vi-VN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    html += `<div class="journal-date-group" style="margin-bottom: 2rem;">`;
    html += `<h4 style="margin-bottom: 1rem; color: var(--primary, #ea580c);">${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</h4>`;
    
    entries.forEach(entry => {
      html += `<div class="journal-entry" style="background: var(--card-bg, #f9fafb); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border-left: 3px solid var(--primary, #ea580c);">`;
      html += `<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">`;
      html += `<strong style="font-size: 1.1rem;">${entry.tenBaiTap}</strong>`;
      if (entry.danhGiaBaiTap) {
        const stars = '⭐'.repeat(entry.danhGiaBaiTap);
        html += `<span style="color: var(--warning, #f59e0b);">${stars}</span>`;
      }
      html += `</div>`;
      
      html += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; font-size: 0.9rem; color: var(--muted, #6b7280);">`;
      if (entry.soHiepThucTe && entry.soLanThucTe) {
        html += `<div><span style="font-weight: 600;">Hiệp/Lần:</span> ${entry.soHiepThucTe} x ${entry.soLanThucTe}</div>`;
      }
      if (entry.thoiLuongThucTePhut) {
        html += `<div><span style="font-weight: 600;">Thời gian:</span> ${entry.thoiLuongThucTePhut} phút</div>`;
      }
      if (entry.caloTieuHao) {
        html += `<div><span style="font-weight: 600;">Calo:</span> ${entry.caloTieuHao.toFixed(0)} kcal</div>`;
      }
      html += `</div>`;
      
      if (entry.ghiChu) {
        html += `<div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border, #e5e7eb); font-style: italic; color: var(--muted, #6b7280);">${entry.ghiChu}</div>`;
      }
      
      html += `</div>`;
    });
    
    html += `</div>`;
  });
  
  html += '</div>';
  journalContainer.innerHTML = html;

  // Animation
  if (window.gsap) {
    gsap.from(journalContainer.querySelectorAll('.journal-entry'), {
      opacity: 0,
      y: 20,
      stagger: 0.05,
      duration: 0.3,
      ease: 'power2.out'
    });
  }
}

// Event listener cho nút refresh journal
const btnRefreshJournal = document.getElementById('btnRefreshJournal');
if (btnRefreshJournal) {
  btnRefreshJournal.addEventListener('click', () => {
    loadExerciseJournal();
  });
}

// Load nhật ký khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
  // Delay một chút để đảm bảo DOM đã sẵn sàng
  setTimeout(() => {
    loadExerciseJournal();
  }, 500);
});

// remove 3D tilt & parallax (revert to simpler state)


