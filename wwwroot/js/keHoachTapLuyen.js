// Dữ liệu từ database
let currentPlan = null;
let exercises = [];
let currentWeek = 1; // Tuần hiện tại

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

// Load dữ liệu từ database
async function loadPlanData() {
  try {
    const response = await fetch('/KeHoachTapLuyen/GetCurrentPlan');
    const data = await response.json();
    
    if (data.success && data.keHoach) {
      currentPlan = data.keHoach;
      exercises = data.keHoach.chiTietBaiTap || [];
      
      // Cập nhật thông tin chi tiết
      updatePlanDetails();
      
      // Render danh sách bài tập
      renderList();
      
      // Load bài tập cho tuần hiện tại
      loadExercisesForCurrentWeek();
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
    const response = await fetch(`/KeHoachTapLuyen/GetExercisesByDay?tuan=${tuan}&ngayTrongTuan=${ngayTrongTuan}`);
    const data = await response.json();
    
    if (data.success && data.exercises) {
      exercises = data.exercises;
      renderList();
    } else {
      exercises = [];
      renderList();
    }
  } catch (error) {
    console.error('Error loading exercises for day:', error);
    exercises = [];
    renderList();
  }
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
  loadPlanData();
  // init schedule
  if (rangeTabs) switchRange("week");
});

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


