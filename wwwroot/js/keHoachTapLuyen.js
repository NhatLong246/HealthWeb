// Dữ liệu từ database
let currentPlan = null;
let exercises = [];
let currentWeek = 1; // Tuần hiện tại
let ngayBatDau = null; // Ngày bắt đầu của kế hoạch
let ngayDaTap = []; // Danh sách ngày đã tập
let ngayCoLichTap = []; // Danh sách ngày có lịch tập
let scheduleInfo = null; // Thông tin lịch tập luyện
let currentViewDate = new Date(); // Ngày hiện tại đang xem trong lịch
let currentRange = "week"; // Range hiện tại: "week", "month", "year"
let startedExercises = new Set(); // Set các chiTietId đã được bắt đầu (click "Bắt đầu bài tập")
let isWorkoutCompleted = false; // Trạng thái hoàn thành của buổi tập hiện tại

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
const dVideo = document.getElementById("detail-video");
const dVideoDirect = document.getElementById("detail-video-direct");
const dVideoPlaceholder = document.getElementById("detail-video-placeholder");
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

  // Tạo video container thay vì thumbnail
  const videoContainer = document.createElement("div");
  videoContainer.className = "exercise-video-container";
  videoContainer.style.cssText = "width: 100%; height: 120px; border-radius: 8px; overflow: hidden; background: #e0e0e0; position: relative; pointer-events: none;"; // pointer-events: none để không thể click
  
  console.log('createExerciseItem - Exercise:', ex.tenBaiTap, 'videoUrl:', ex.videoUrl);
  
  if (ex.videoUrl) {
    console.log('createExerciseItem - Has videoUrl, creating video embed for:', ex.videoUrl);
    
    // Kiểm tra xem có phải YouTube URL không
    const isYouTubeUrl = ex.videoUrl.includes('youtube.com') || 
                         ex.videoUrl.includes('youtu.be') ||
                         ex.videoUrl.includes('youtube.com/shorts');
    
    console.log('createExerciseItem - Is YouTube URL:', isYouTubeUrl);
    
    if (isYouTubeUrl) {
      // Lấy video ID từ YouTube URL
    const videoId = getYouTubeVideoId(ex.videoUrl);
      console.log('createExerciseItem - Extracted YouTube videoId:', videoId);
      
    if (videoId) {
        // Tạo YouTube iframe embed (không có controls, không thể click)
        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=0&mute=1&loop=1&playlist=${videoId}&modestbranding=1&rel=0&showinfo=0&disablekb=1&fs=0&iv_load_policy=3&playsinline=1`;
        console.log('createExerciseItem - Creating YouTube iframe with embedUrl:', embedUrl);
        
        const iframe = document.createElement("iframe");
        iframe.src = embedUrl;
        iframe.style.cssText = "width: 100%; height: 100%; border: none; pointer-events: none;";
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
        iframe.setAttribute("allowfullscreen", "false");
        iframe.setAttribute("loading", "lazy");
        videoContainer.appendChild(iframe);
        console.log('createExerciseItem - ✅ Created YouTube iframe for videoId:', videoId);
    } else {
        console.error('createExerciseItem - ❌ Could not extract videoId from YouTube URL:', ex.videoUrl);
        videoContainer.innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #999; font-size: 0.875rem;">Không thể tải video YouTube</div>';
    }
  } else {
      // Không phải YouTube URL, thử dùng video tag (cho video trực tiếp)
      console.log('createExerciseItem - Not YouTube URL, creating HTML5 video tag');
      const video = document.createElement("video");
      video.src = ex.videoUrl;
      video.style.cssText = "width: 100%; height: 100%; object-fit: cover; pointer-events: none;";
      video.setAttribute("muted", "true");
      video.setAttribute("loop", "true");
      video.setAttribute("playsinline", "true");
      video.setAttribute("preload", "metadata");
      // Không thêm controls để người dùng không thể click
      videoContainer.appendChild(video);
      console.log('createExerciseItem - Created HTML5 video tag for:', ex.videoUrl);
    }
  } else {
    // Không có videoUrl, hiển thị placeholder
    console.warn('createExerciseItem - ❌ No videoUrl for exercise:', ex.tenBaiTap);
    videoContainer.innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #999; font-size: 0.875rem;">Không có video</div>';
  }
  
  const img = videoContainer; // Giữ tên biến img để tương thích với code cũ

  const content = document.createElement("div");
  content.className = "content";
  const h4 = document.createElement("h4");
  
  // Lấy thông tin buổi để hiển thị trong tên bài tập
  let buoiText = '';
  
  // Ưu tiên 1: Sử dụng lichTap đã được parse sẵn từ API
  if (ex.lichTap) {
    const buoi = ex.lichTap.Buoi || ex.lichTap.buoi;
    if (buoi) {
      buoiText = ` (${buoi})`;
    }
  } 
  // Ưu tiên 2: Parse từ canhBao nếu có
  else if (ex.canhBao) {
    const trimmedCanhBao = ex.canhBao.trim();
    // Chỉ parse nếu là JSON hợp lệ
    if (trimmedCanhBao.startsWith('{') || trimmedCanhBao.startsWith('[')) {
      try {
        const canhBaoJson = JSON.parse(ex.canhBao);
        if (canhBaoJson && canhBaoJson.LichTap && canhBaoJson.LichTap.Buoi) {
          buoiText = ` (${canhBaoJson.LichTap.Buoi})`;
        }
      } catch (e) {
        // Nếu không parse được, thử parse từ format khác
        try {
          const lichTapMatch = ex.canhBao.match(/"LichTap":\s*({[^}]+})/);
          if (lichTapMatch) {
            const lichTap = JSON.parse(lichTapMatch[1]);
            if (lichTap.Buoi) {
              buoiText = ` (${lichTap.Buoi})`;
            }
          }
        } catch (e2) {
          // Ignore parse errors
        }
      }
    }
  }
  
  h4.textContent = ex.tenBaiTap + buoiText; // Hiển thị: "Yoga - Tư Thế Plank (Sáng)"
  
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
  open.dataset.chiTietId = ex.chiTietId;
  
  // Kiểm tra xem buổi tập đã hoàn thành chưa hoặc bài tập đã được bắt đầu chưa
  const shouldDisable = isWorkoutCompleted || ex.isCompleted || startedExercises.has(ex.chiTietId);
  
  console.log(`createExerciseItem - ${ex.tenBaiTap}: isWorkoutCompleted=${isWorkoutCompleted}, ex.isCompleted=${ex.isCompleted}, startedExercises.has=${startedExercises.has(ex.chiTietId)}, shouldDisable=${shouldDisable}`);
  
  if (shouldDisable) {
    open.classList.add("started");
    open.textContent = "Đã bắt đầu";
    open.disabled = true;
    open.style.opacity = "0.6";
    open.style.cursor = "not-allowed";
    // Không thêm event listener khi đã disable
  } else {
  open.textContent = "Bắt đầu bài tập";
    open.addEventListener("click", () => {
      // Đánh dấu bài tập đã được bắt đầu
      startedExercises.add(ex.chiTietId);
      open.classList.add("started");
      open.textContent = "Đã bắt đầu";
      open.disabled = true;
      open.style.opacity = "0.6";
      open.style.cursor = "not-allowed";
      
      // Kiểm tra và cập nhật trạng thái nút "Hoàn thành"
      updateCompleteButtonState();
      
      // Mở chi tiết bài tập
      openDetail(ex.chiTietId);
    });
  }

  content.appendChild(h4);
  content.appendChild(p);

  wrapper.appendChild(img);
  wrapper.appendChild(content);
  wrapper.appendChild(open);
  return wrapper;
}

// Helper: Lấy video ID từ YouTube URL
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
  
  // Fallback: regex cũ
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
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

// Render danh sách bài tập - Nhóm theo buổi
function renderList() {
  if (!listContainer) return;
  listContainer.innerHTML = "";
  
  if (exercises.length === 0) {
    listContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--muted);">Chưa có bài tập nào trong kế hoạch</div>';
    return;
  }
  
  // Nhóm bài tập theo buổi
  const exercisesByBuoi = {};
  const exercisesWithoutBuoi = [];
  
  exercises.forEach(ex => {
    let buoi = null;
    
    // Ưu tiên 1: Sử dụng lichTap đã được parse sẵn từ API
    if (ex.lichTap) {
      buoi = ex.lichTap.Buoi || ex.lichTap.buoi;
    }
    // Ưu tiên 2: Parse từ canhBao nếu có
    else if (ex.canhBao) {
      const trimmedCanhBao = ex.canhBao.trim();
      // Chỉ parse nếu là JSON hợp lệ
      if (trimmedCanhBao.startsWith('{') || trimmedCanhBao.startsWith('[')) {
        try {
          const canhBaoJson = JSON.parse(ex.canhBao);
          if (canhBaoJson && canhBaoJson.LichTap && canhBaoJson.LichTap.Buoi) {
            buoi = canhBaoJson.LichTap.Buoi;
          }
        } catch (e) {
          // Thử parse từ format khác
          try {
            const lichTapMatch = ex.canhBao.match(/"LichTap":\s*({[^}]+})/);
            if (lichTapMatch) {
              const lichTap = JSON.parse(lichTapMatch[1]);
              if (lichTap.Buoi) {
                buoi = lichTap.Buoi;
              }
            }
          } catch (e2) {
            // Ignore parse errors
          }
        }
      }
    }
    
    if (buoi) {
      if (!exercisesByBuoi[buoi]) {
        exercisesByBuoi[buoi] = [];
      }
      exercisesByBuoi[buoi].push(ex);
    } else {
      exercisesWithoutBuoi.push(ex);
    }
  });
  
  // Sắp xếp buổi theo thứ tự: Sáng, Chiều, Tối
  const buoiOrder = ['Sáng', 'Chiều', 'Tối'];
  const sortedBuois = Object.keys(exercisesByBuoi).sort((a, b) => {
    const indexA = buoiOrder.indexOf(a);
    const indexB = buoiOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  
  // Render bài tập theo buổi
  sortedBuois.forEach((buoi, buoiIndex) => {
    // Tạo container cho mỗi buổi
    const buoiContainer = document.createElement('div');
    buoiContainer.className = 'buoi-container';
    buoiContainer.style.cssText = 'margin-top: ' + (buoiIndex === 0 ? '0' : '2rem') + ';';
    
    // Tạo header cho buổi
    const buoiHeader = document.createElement('div');
    buoiHeader.className = 'buoi-header';
    buoiHeader.innerHTML = `
      <div class="buoi-header-content">
        <span class="buoi-icon">⏰</span>
        <span class="buoi-title">Buổi ${buoi}</span>
      </div>
    `;
    buoiContainer.appendChild(buoiHeader);
    
    // Tạo container cho các bài tập trong buổi này
    const exercisesContainer = document.createElement('div');
    exercisesContainer.className = 'buoi-exercises';
    exercisesContainer.style.cssText = 'display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;';
    
    // Render các bài tập trong buổi này
    exercisesByBuoi[buoi].forEach(ex => {
      exercisesContainer.appendChild(createExerciseItem(ex));
    });
    
    buoiContainer.appendChild(exercisesContainer);
    listContainer.appendChild(buoiContainer);
  });
  
  // Render bài tập không có buổi (nếu có) - KHÔNG hiển thị header "Bài tập khác"
  if (exercisesWithoutBuoi.length > 0) {
    exercisesWithoutBuoi.forEach(ex => {
      listContainer.appendChild(createExerciseItem(ex));
    });
  }
  
  // Nếu không có buổi nào, render như cũ (không có header)
  if (sortedBuois.length === 0 && exercisesWithoutBuoi.length === 0) {
    exercises.forEach(ex => listContainer.appendChild(createExerciseItem(ex)));
  }
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

// Format date for API (YYYY-MM-DD)
function formatDateForAPI(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Load bài tập cho một ngày cụ thể
async function loadExercisesForDate(date) {
  try {
    const dateStr = formatDateForAPI(date);
    console.log(`Loading exercises for date: ${dateStr}`);
    
    const response = await fetch(`/KeHoachTapLuyen/GetExercisesByDay?ngay=${dateStr}`);
    const data = await response.json();
    
    console.log('[loadExercisesForDate] GetExercisesByDay response for date:', dateStr, data);
    console.log('[loadExercisesForDate] isWorkoutCompleted from API:', data.isWorkoutCompleted);
    console.log('[loadExercisesForDate] exercises count:', data.exercises?.length || 0);
    if (data.exercises) {
      console.log('[loadExercisesForDate] Each exercise isCompleted:', 
        data.exercises.map(ex => ({ chiTietId: ex.chiTietId, tenBaiTap: ex.tenBaiTap, isCompleted: ex.isCompleted })));
    }
    
    if (data.success && data.exercises) {
      exercises = data.exercises;
      // QUAN TRỌNG: Lấy trạng thái hoàn thành từ API (phải kiểm tra cả undefined và null)
      isWorkoutCompleted = data.isWorkoutCompleted === true; // Chỉ true khi thực sự là true
      console.log(`[loadExercisesForDate] Loaded ${exercises.length} exercises for date ${dateStr}`);
      console.log(`[loadExercisesForDate] isWorkoutCompleted from API: ${data.isWorkoutCompleted}, set to: ${isWorkoutCompleted}`);
      console.log('[loadExercisesForDate] Full API response:', JSON.stringify(data, null, 2));
      
      // Reset startedExercises khi load bài tập mới cho ngày khác
      startedExercises.clear();
      
      // Nếu buổi tập đã hoàn thành, đánh dấu tất cả bài tập đã được bắt đầu
      if (isWorkoutCompleted) {
        console.log('[loadExercisesForDate] Workout is completed, marking all exercises as started');
        exercises.forEach(ex => {
          startedExercises.add(ex.chiTietId);
          console.log(`[loadExercisesForDate] Marked exercise ${ex.chiTietId} (${ex.tenBaiTap}) as started`);
        });
      } else {
        console.log('[loadExercisesForDate] Workout is NOT completed');
      }
      
      // Log videoUrl của từng bài tập và kiểm tra xem có phải YouTube URL không
      exercises.forEach((ex, index) => {
        const isYouTube = ex.videoUrl && (
          ex.videoUrl.includes('youtube.com') || 
          ex.videoUrl.includes('youtu.be') ||
          ex.videoUrl.includes('youtube.com/shorts')
        );
        console.log(`Exercise ${index + 1}: ${ex.tenBaiTap}`, {
          videoUrl: ex.videoUrl,
          isYouTube: isYouTube,
          hasVideoUrl: !!ex.videoUrl,
          isCompleted: ex.isCompleted
        });
      });
      // Render danh sách bài tập (sẽ sử dụng isWorkoutCompleted và ex.isCompleted)
      renderList();
      
      // Cập nhật trạng thái nút "Hoàn thành" sau khi render
      updateCompleteButtonState();
      
      // Log để debug
      console.log('[loadExercisesForDate] After processing - isWorkoutCompleted:', isWorkoutCompleted);
      console.log('[loadExercisesForDate] After processing - startedExercises.size:', startedExercises.size);
      console.log('[loadExercisesForDate] After processing - exercises with isCompleted:', 
        exercises.map(ex => ({ 
          chiTietId: ex.chiTietId,
          tenBaiTap: ex.tenBaiTap, 
          isCompleted: ex.isCompleted,
          inStartedSet: startedExercises.has(ex.chiTietId)
        })));
      
      // Cập nhật thông tin chi tiết (luôn gọi để hiển thị thông tin tổng hợp)
      updatePlanDetails();
    } else {
      console.warn(`No exercises found for date ${dateStr}`);
      exercises = [];
      isWorkoutCompleted = false; // Reset trạng thái khi không có bài tập
      renderList();
      
      // Reset thông tin chi tiết khi không có bài tập
      updatePlanDetails();
      
      // Cập nhật trạng thái nút "Hoàn thành"
      updateCompleteButtonState();
    }
  } catch (error) {
    console.error('Error loading exercises for date:', error);
    exercises = [];
    renderList();
  }
}

function renderWeek(now = new Date()) {
  if (!weekGrid) return;
  weekGrid.innerHTML = "";
  const start = startOfWeek(now);
  const names = ["Th2","Th3","Th4","Th5","Th6","Th7","CN"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Tính tuần hiện tại dựa trên ngày bắt đầu nếu có
  if (ngayBatDau) {
    const startDate = new Date(ngayBatDau);
    startDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((start - startDate) / (1000 * 60 * 60 * 24));
    currentWeek = Math.floor(daysDiff / 7) + 1;
    if (currentWeek < 1) currentWeek = 1;
  } else {
    // Mặc định tuần 1 nếu chưa có ngày bắt đầu
    currentWeek = 1;
  }
  
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() + i);
    dayDate.setHours(0, 0, 0, 0);
    const dayOfWeek = i + 1; // 1 = Monday, 7 = Sunday
    const node = document.createElement("div");
    
    // Kiểm tra trạng thái ngày
    const isToday = sameDate(dayDate, today);
    const dateStr = formatDateForAPI(dayDate);
    const hasExercises = ngayCoLichTap.includes(dateStr);
    const isCompleted = ngayDaTap.includes(dateStr);
    const isPast = dayDate < today;
    const isFuture = dayDate > today;
    
    let className = "day";
    if (isToday) className += " now";
    if (hasExercises) className += " has-exercises";
    if (isCompleted) className += " completed";
    if (isPast && !isCompleted && hasExercises) className += " missed";
    if (isFuture && hasExercises) className += " upcoming";
    
    node.className = className;
    node.innerHTML = `<span>${names[i]}</span><b>${dayDate.getDate()}</b>`;
    node.style.cursor = "pointer";
    node.dataset.date = dateStr;
    node.addEventListener("click", async () => {
      // Load bài tập cho ngày được chọn
      await loadExercisesForDate(dayDate);
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < offset; i++) monthGrid.appendChild(cell(""));
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d);
    date.setHours(0, 0, 0, 0);
    const isToday = sameDate(date, today);
    const dateStr = formatDateForAPI(date);
    const hasExercises = ngayCoLichTap.includes(dateStr);
    const isCompleted = ngayDaTap.includes(dateStr);
    const isPast = date < today;
    const isFuture = date > today;
    
    const c = cell(d, isToday, hasExercises, isCompleted, isPast && !isCompleted, isFuture);
    if (c) {
      c.style.cursor = "pointer";
      c.dataset.date = dateStr;
      c.addEventListener("click", async () => {
        if (selectedDateCell) selectedDateCell.classList.remove("selected");
        c.classList.add("selected");
        selectedDateCell = c;
        rangeLabel.textContent = date.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
        // Load bài tập cho ngày được chọn
        await loadExercisesForDate(date);
      });
      monthGrid.appendChild(c);
    }
  }
  const title = now.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  rangeLabel.textContent = title.charAt(0).toUpperCase() + title.slice(1);

  function cell(text, today = false, hasExercises = false, isCompleted = false, isMissed = false, isFuture = false) {
    if (text === "") {
      const c = document.createElement("div");
      c.className = "cell empty";
      return c;
    }
    const c = document.createElement("div");
    let className = "cell";
    if (today) className += " today";
    if (hasExercises) className += " has-exercises";
    if (isCompleted) className += " completed";
    if (isMissed) className += " missed";
    if (isFuture && hasExercises) className += " upcoming";
    c.className = className;
    c.textContent = text;
    return c;
  }
}

function renderYear(now = new Date()) {
  yearGrid.innerHTML = "";
  
  // Hiển thị các năm (5 năm trước và 5 năm sau năm hiện tại)
  const currentYear = now.getFullYear();
  const startYear = currentYear - 5;
  const endYear = currentYear + 5;
  
  for (let year = startYear; year <= endYear; year++) {
    const box = document.createElement("div");
    box.className = "mon";
    if (year === currentYear) {
      box.classList.add("current-year");
      box.style.background = "rgba(59, 130, 246, 0.2)";
      box.style.border = "2px solid rgba(59, 130, 246, 0.5)";
    }
    box.textContent = year.toString();
    box.dataset.year = String(year);
    box.addEventListener("click", () => {
      // Chuyển sang view tháng của năm được chọn
      rangeTabs.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
      const monthTab = rangeTabs.querySelector('[data-range="month"]');
      if (monthTab) monthTab.classList.add("active");
      currentRange = "month";
      currentViewDate = new Date(year, 0, 1); // Tháng 1 của năm được chọn
      switchRange("month", currentViewDate);
    });
    yearGrid.appendChild(box);
  }
  
  if (rangeLabel) rangeLabel.textContent = `Năm ${currentYear}`;
}

function sameDate(a, b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function switchRange(range, date = null){
  // Sử dụng currentViewDate nếu không có date được truyền vào
  if (!date) {
    date = currentViewDate;
  } else {
    currentViewDate = new Date(date);
  }
  
  currentRange = range;
  
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

// Xử lý nút Previous và Next
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");

if (btnPrev) {
  btnPrev.addEventListener("click", () => {
    const newDate = new Date(currentViewDate);
    if (currentRange === "week") {
      newDate.setDate(newDate.getDate() - 7); // Trừ 7 ngày
    } else if (currentRange === "month") {
      newDate.setMonth(newDate.getMonth() - 1); // Trừ 1 tháng
    } else if (currentRange === "year") {
      newDate.setFullYear(newDate.getFullYear() - 1); // Trừ 1 năm
    }
    currentViewDate = newDate;
    switchRange(currentRange, newDate);
  });
}

if (btnNext) {
  btnNext.addEventListener("click", () => {
    const newDate = new Date(currentViewDate);
    if (currentRange === "week") {
      newDate.setDate(newDate.getDate() + 7); // Cộng 7 ngày
    } else if (currentRange === "month") {
      newDate.setMonth(newDate.getMonth() + 1); // Cộng 1 tháng
    } else if (currentRange === "year") {
      newDate.setFullYear(newDate.getFullYear() + 1); // Cộng 1 năm
    }
    currentViewDate = newDate;
    switchRange(currentRange, newDate);
  });
}

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

// Helper: Lấy thumbnail từ YouTube URL
function getYouTubeThumbnail(url) {
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    // Ưu tiên maxresdefault (chất lượng cao nhất), fallback về mqdefault nếu không có
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  return null;
}

// Helper: Lấy embed URL từ YouTube URL
function getYouTubeEmbedUrl(url, autoplay = false) {
  if (!url) return null;
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}${autoplay ? '?autoplay=1' : ''}`;
}

// Helper: Load YouTube video vào iframe (đặt trong window để có thể gọi từ onclick)
window.loadYouTubeVideo = function(wrapper) {
  if (!wrapper) {
    console.warn('loadYouTubeVideo: wrapper is null');
    return;
  }
  
  // Kiểm tra xem đã load video chưa
  if (wrapper.querySelector('iframe')) {
    console.log('loadYouTubeVideo: Video already loaded');
    return; // Đã load rồi, không load lại
  }
  
  const videoId = wrapper.getAttribute('data-video-id');
  const videoUrl = wrapper.getAttribute('data-video-url');
  
  console.log('loadYouTubeVideo: videoId=', videoId, 'videoUrl=', videoUrl);
  
  if (!videoId && !videoUrl) {
    console.warn('loadYouTubeVideo: No videoId or videoUrl found');
    return;
  }
  
  // Tạo embed URL với các tham số tối ưu
  const embedUrl = getYouTubeEmbedUrl(videoUrl || `https://www.youtube.com/watch?v=${videoId}`, true);
  if (!embedUrl) {
    console.error('loadYouTubeVideo: Failed to create embed URL from:', videoUrl || videoId);
    return;
  }
  
  console.log('loadYouTubeVideo: Embedding video with URL:', embedUrl);
  
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
  console.log('loadYouTubeVideo: Video iframe created successfully');
};

async function openDetail(chiTietId) {
  console.log('openDetail called with chiTietId:', chiTietId);
  
  // Test: Kiểm tra dữ liệu raw trong database trước
  try {
    const testResponse = await fetch(`/KeHoachTapLuyen/TestExerciseData?chiTietId=${chiTietId}`);
    const testData = await testResponse.json();
    console.log('TestExerciseData (raw database data):', testData);
    console.log('TestExerciseData (full):', JSON.stringify(testData, null, 2));
  } catch (error) {
    console.error('Error in TestExerciseData:', error);
  }
  
  // LUÔN tải từ database để đảm bảo có dữ liệu đầy đủ
  let ex = null;
  try {
    console.log(`Loading exercise detail from database for chiTietId: ${chiTietId}`);
    const response = await fetch(`/KeHoachTapLuyen/GetExerciseDetail?chiTietId=${chiTietId}`);
    const data = await response.json();
    
    console.log('GetExerciseDetail response:', data);
    console.log('GetExerciseDetail response (full):', JSON.stringify(data, null, 2));
    
    if (data.success && data.exercise) {
      ex = data.exercise;
      console.log('Loaded exercise from database:', ex);
      console.log('Exercise data (full):', JSON.stringify(ex, null, 2));
    } else {
      console.error('Failed to load exercise from database:', data.message);
      // Thử tìm trong mảng exercises như fallback
      ex = exercises.find(e => e.chiTietId === chiTietId);
      if (!ex) {
        alert('Không thể tải thông tin bài tập: ' + (data.message || 'Không tìm thấy bài tập'));
        return;
      }
      console.log('Using exercise from local array as fallback:', ex);
    }
  } catch (error) {
    console.error('Error loading exercise from database:', error);
    // Thử tìm trong mảng exercises như fallback
    ex = exercises.find(e => e.chiTietId === chiTietId);
    if (!ex) {
      alert('Lỗi khi tải thông tin bài tập: ' + error.message);
      return;
    }
    console.log('Using exercise from local array as fallback:', ex);
  }
  
  if (!ex) {
    console.error('No exercise data found');
    return;
  }
  
  console.log('Displaying exercise detail:', ex);
  
  // Cập nhật tiêu đề giống như trong MucTieu
  if (dTitle) dTitle.textContent = 'Chi Tiết Bài Tập • ' + (ex.tenBaiTap || '');
  
  // Cập nhật các metrics
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
      const displayVal = val !== null && val !== undefined ? String(val) : '0';
      el.textContent = displayVal;
      console.log(`Set ${id} to:`, displayVal, '(original value:', val, ')');
    } else {
      console.error(`Element with id ${id} not found!`);
    }
  };
  
  // Số buổi tập: Sử dụng soBuoiTap từ API (đã tính toán) hoặc soHiep
  const soBuoiTap = ex.soBuoiTap != null ? ex.soBuoiTap : (ex.soHiep != null ? ex.soHiep : 0);
  console.log('Setting m-sets to:', soBuoiTap, '(soBuoiTap:', ex.soBuoiTap, ', soHiep:', ex.soHiep, ')');
  setText('m-sets', soBuoiTap);
  
  // Thời lượng phút: ThoiGianPhut
  const thoiLuongPhut = ex.thoiGianPhut != null ? ex.thoiGianPhut : 0;
  console.log('Setting m-rest to:', thoiLuongPhut, '(thoiGianPhut:', ex.thoiGianPhut, ')');
  setText('m-rest', thoiLuongPhut);
  
  // Hiệu quả: Sử dụng hieuQua từ API (đã tính toán) hoặc tính từ danhGiaHieuQua
  const quality = ex.hieuQua || (ex.danhGiaHieuQua != null && ex.danhGiaHieuQua !== undefined 
    ? (ex.danhGiaHieuQua >= 4 ? "Tốt" : ex.danhGiaHieuQua >= 3 ? "Khá" : "Trung bình")
    : "Trung bình");
  console.log('Setting m-quality to:', quality, '(hieuQua:', ex.hieuQua, ', danhGiaHieuQua:', ex.danhGiaHieuQua, ')');
  setText('m-quality', quality);
  
  // Calo/buổi: CaloTieuHaoDuKien
  const calo = ex.caloTieuHaoDuKien != null ? Math.round(ex.caloTieuHaoDuKien) : 0;
  console.log('Setting m-kcal to:', calo, '(caloTieuHaoDuKien:', ex.caloTieuHaoDuKien, ')');
  setText('m-kcal', calo);
  
  // Sets - Reps: Sử dụng scheme từ API (đã tính toán) hoặc tính từ soHiep và soLan
  const scheme = ex.scheme || (ex.soHiep && ex.soLan ? `${ex.soHiep}-${ex.soLan}` : '-');
  console.log('Setting m-ratio to:', scheme, '(scheme:', ex.scheme, ', soHiep:', ex.soHiep, ', soLan:', ex.soLan, ')');
  setText('m-ratio', scheme);
  
  // Mức độ: Sử dụng doKho từ API (đã tính toán) hoặc tính từ danhGiaDoKho
  const level = ex.doKho || (ex.danhGiaDoKho != null && ex.danhGiaDoKho !== undefined
    ? (ex.danhGiaDoKho >= 4 ? "Khó" : ex.danhGiaDoKho >= 3 ? "Trung bình" : "Dễ")
    : "Trung bình");
  console.log('Setting m-level to:', level, '(doKho:', ex.doKho, ', danhGiaDoKho:', ex.danhGiaDoKho, ')');
  setText('m-level', level);
  
  // Hiển thị video và hướng dẫn giống như trong MucTieu
  const videoContainer = document.getElementById('detail-video-container');
  const guideEl = document.getElementById('detail-guide');
  
  if (videoContainer) {
    console.log('Setting up video container, ex.videoUrl:', ex.videoUrl);
    if (ex.videoUrl) {
      const videoId = getYouTubeVideoId(ex.videoUrl);
      const thumbnailUrl = getYouTubeThumbnail(ex.videoUrl);
      console.log('Video setup - videoId:', videoId, 'thumbnailUrl:', thumbnailUrl);
      
      if (videoId && thumbnailUrl) {
        videoContainer.innerHTML = `
          <div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; background: #000; cursor: pointer; margin-bottom: 0.75rem;" 
               data-video-id="${videoId}" 
               data-video-url="${ex.videoUrl}"
               onclick="window.loadYouTubeVideo(this)">
            <img src="${thumbnailUrl}" 
                 alt="${ex.tenBaiTap || 'Exercise video'}" 
                 style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"
                 loading="lazy"
                 onerror="this.src='https://img.youtube.com/vi/${videoId}/mqdefault.jpg'">
            <div class="play-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); border-radius: 50%; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; pointer-events: none; transition: background 0.3s;">
              <i class="fas fa-play" style="color: white; font-size: 24px; margin-left: 4px;"></i>
            </div>
          </div>
        `;
        console.log('YouTube video wrapper created with videoId:', videoId);
      } else {
        console.log('Not a YouTube URL, trying direct video:', ex.videoUrl);
        // Nếu không phải YouTube, thử dùng video trực tiếp
        videoContainer.innerHTML = `
          <video controls style="width: 100%; max-height: 400px; border-radius: 8px;">
            <source src="${ex.videoUrl}" type="video/mp4">
            Trình duyệt của bạn không hỗ trợ video.
          </video>
        `;
      }
    } else {
      console.log('No videoUrl found, showing placeholder');
      videoContainer.innerHTML = '<div style="width: 100%; height: 300px; background: #e0e0e0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;">Không có video</div>';
    }
  } else {
    console.error('Video container element not found!');
  }
  
  // Hiển thị thông tin bổ sung (nếu có)
  const additionalInfo = document.getElementById('detailAdditionalInfo');
  if (additionalInfo) {
    let hasAdditionalInfo = false;
    
    // Thiết bị cần
    if (ex.thietBiCan) {
      const thietBiEl = document.getElementById('detailThietBi');
      const thietBiValueEl = document.getElementById('detailThietBiValue');
      if (thietBiEl && thietBiValueEl) {
        thietBiEl.style.display = 'block';
        thietBiValueEl.textContent = ex.thietBiCan;
        hasAdditionalInfo = true;
      }
    }
    
    // Số tuần
    if (ex.soTuan) {
      const soTuanEl = document.getElementById('detailSoTuan');
      const soTuanValueEl = document.getElementById('detailSoTuanValue');
      if (soTuanEl && soTuanValueEl) {
        soTuanEl.style.display = 'block';
        soTuanValueEl.textContent = `${ex.soTuan} tuần`;
        hasAdditionalInfo = true;
      }
    }
    
    // Đã sử dụng
    if (ex.soLanSuDung) {
      const soLanSuDungEl = document.getElementById('detailSoLanSuDung');
      const soLanSuDungValueEl = document.getElementById('detailSoLanSuDungValue');
      if (soLanSuDungEl && soLanSuDungValueEl) {
        soLanSuDungEl.style.display = 'block';
        soLanSuDungValueEl.textContent = ex.soLanSuDung;
        hasAdditionalInfo = true;
      }
    }
    
    // Mô tả
    if (ex.moTa) {
      const moTaEl = document.getElementById('detailMoTa');
      const moTaValueEl = document.getElementById('detailMoTaValue');
      if (moTaEl && moTaValueEl) {
        moTaEl.style.display = 'block';
        moTaValueEl.textContent = ex.moTa;
        hasAdditionalInfo = true;
      }
    }
    
    additionalInfo.style.display = hasAdditionalInfo ? 'block' : 'none';
  }
  
  // Hiển thị hướng dẫn (chỉ hiển thị huongDan, không hiển thị noiDung)
  if (guideEl) {
    let guideHtml = '';
    if (ex.huongDan) {
      guideHtml = `
        <div style="margin-top: 0.75rem; padding: 0.75rem; background: rgba(59, 130, 246, 0.1); border-left: 3px solid rgba(59, 130, 246, 0.5); border-radius: 4px;">
          <div style="font-weight: 600; margin-bottom: 0.5rem; color: #60a5fa; font-size: 0.875rem;">
            <i class="fas fa-info-circle"></i> Hướng dẫn:
          </div>
          <div style="font-size: 0.875rem; color: #cbd5e1; line-height: 1.6; white-space: pre-line;">
            ${ex.huongDan}
          </div>
        </div>
      `;
    }
    guideEl.innerHTML = guideHtml || '<div style="color: #cbd5e1; font-size: 0.875rem;">Không có hướng dẫn</div>';
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
      
      // Lấy ngày bắt đầu từ mục tiêu hoặc ngày tạo kế hoạch
      if (data.keHoach.mucTieu && data.keHoach.mucTieu.ngayBatDau) {
        ngayBatDau = data.keHoach.mucTieu.ngayBatDau;
      } else if (data.keHoach.ngayTao) {
        const ngayTao = new Date(data.keHoach.ngayTao);
        ngayBatDau = formatDateForAPI(ngayTao);
      }
      
      // Load thông tin lịch tập luyện (ngày đã tập, ngày có lịch tập)
      await loadScheduleInfo();
      
      // Lưu tất cả bài tập vào biến tạm
      const allExercises = data.keHoach.chiTietBaiTap || [];
      
      console.log('Loaded plan data - Total exercises:', allExercises.length);
      console.log('Ngay bat dau:', ngayBatDau);
      console.log('Ngay da tap:', ngayDaTap.length);
      console.log('Ngay co lich tap:', ngayCoLichTap.length);
      
      // Cập nhật thông tin chi tiết
      updatePlanDetails();
      
      // Cập nhật lại khi có bài tập được chọn
      if (exercises.length > 0) {
        updatePlanDetails();
      }
      
      // Load bài tập cho ngày hôm nay
      const today = new Date();
      await loadExercisesForDate(today);
      
      // Highlight ngày hôm nay trong lịch
      if (weekGrid) {
        const days = weekGrid.querySelectorAll('.day');
        const dayOfWeek = today.getDay();
        const ngayTrongTuan = dayOfWeek === 0 ? 7 : dayOfWeek;
        if (days[ngayTrongTuan - 1]) {
          days.forEach(d => d.classList.remove('selected'));
          days[ngayTrongTuan - 1].classList.add('selected');
        }
      }
      
      // Setup event listener cho nút "Hủy Kế Hoạch"
      const btnCancelPlan = document.getElementById('btnCancelPlan');
      if (btnCancelPlan) {
        btnCancelPlan.addEventListener('click', handleCancelPlan);
      }
      
      // Refresh lịch để hiển thị các class mới
      if (rangeTabs) {
        const activeTab = rangeTabs.querySelector('.tab.active');
        if (activeTab) {
          switchRange(activeTab.dataset.range);
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

// Load thông tin lịch tập luyện (ngày đã tập, ngày có lịch tập)
async function loadScheduleInfo() {
  try {
    // Tính khoảng thời gian để lấy thông tin (3 tháng trước và sau)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(today.getMonth() - 3);
    const endDate = new Date(today);
    endDate.setMonth(today.getMonth() + 3);
    
    const response = await fetch(`/KeHoachTapLuyen/GetScheduleInfo?startDate=${formatDateForAPI(startDate)}&endDate=${formatDateForAPI(endDate)}`);
    const data = await response.json();
    
    if (data.success) {
      scheduleInfo = data;
      ngayDaTap = data.ngayDaTap || [];
      ngayCoLichTap = data.ngayCoLichTap || [];
      console.log('Loaded schedule info:', data);
    }
  } catch (error) {
    console.error('Error loading schedule info:', error);
    ngayDaTap = [];
    ngayCoLichTap = [];
  }
}

// Cập nhật thông tin chi tiết kế hoạch
function updatePlanDetails() {
  console.log('[updatePlanDetails] Called - currentPlan:', !!currentPlan, 'exercises.length:', exercises.length);
  
  // Reset về giá trị mặc định
  const gioBatDauEl = document.getElementById('detail-gio-bat-dau');
  const gioKetThucEl = document.getElementById('detail-gio-ket-thuc');
  const buoiEl = document.getElementById('detail-buoi');
  
  if (!currentPlan || exercises.length === 0) {
    // Reset về giá trị mặc định nếu không có bài tập
    console.log('[updatePlanDetails] No plan or exercises, resetting to defaults');
    if (gioBatDauEl) gioBatDauEl.textContent = '--:--';
    if (gioKetThucEl) gioKetThucEl.textContent = '--:--';
    if (buoiEl) buoiEl.textContent = '--';
    return;
  }
  
  // Lấy TẤT CẢ bài tập trong danh sách hiện tại (đã được filter theo ngày trong loadExercisesForDate)
  const exercisesForToday = exercises; // exercises đã được filter theo ngày
  
  console.log('[updatePlanDetails] exercisesForToday.length:', exercisesForToday.length);
  console.log('[updatePlanDetails] exercisesForToday:', exercisesForToday.map(ex => ({
    chiTietId: ex.chiTietId,
    tenBaiTap: ex.tenBaiTap,
    hasLichTap: !!ex.lichTap,
    lichTap: ex.lichTap,
    hasCanhBao: !!ex.canhBao,
    canhBaoLength: ex.canhBao ? ex.canhBao.length : 0,
    canhBaoPreview: ex.canhBao ? (ex.canhBao.length > 100 ? ex.canhBao.substring(0, 100) + '...' : ex.canhBao) : 'null'
  })));
  
  if (exercisesForToday.length === 0) {
    // Không có bài tập nào, reset về giá trị mặc định
    console.log('[updatePlanDetails] No exercises for today, resetting to defaults');
    if (gioBatDauEl) gioBatDauEl.textContent = '--:--';
    if (gioKetThucEl) gioKetThucEl.textContent = '--:--';
    if (buoiEl) buoiEl.textContent = '--';
    return;
  }
  
  // Parse thông tin LichTap từ TẤT CẢ bài tập để lấy thông tin tổng hợp
  const allLichTap = [];
  
  exercisesForToday.forEach((ex, index) => {
    // Ưu tiên 1: Sử dụng lichTap đã được parse sẵn từ API (nếu có)
    if (ex.lichTap) {
      console.log(`[updatePlanDetails] Exercise ${index + 1} (${ex.tenBaiTap}) - Using lichTap from API:`, ex.lichTap);
      
      // LichTap có thể là object với property names khác nhau (PascalCase hoặc camelCase)
      const gioBatDau = ex.lichTap.GioBatDau || ex.lichTap.gioBatDau || ex.lichTap.GioBatDau;
      const gioKetThuc = ex.lichTap.GioKetThuc || ex.lichTap.gioKetThuc || ex.lichTap.GioKetThuc;
      const buoi = ex.lichTap.Buoi || ex.lichTap.buoi || ex.lichTap.Buoi;
      
      if (gioBatDau || gioKetThuc || buoi) {
        allLichTap.push({
          gioBatDau: gioBatDau,
          gioKetThuc: gioKetThuc,
          buoi: buoi
        });
        console.log(`[updatePlanDetails] Exercise ${index + 1} - Added LichTap:`, { gioBatDau, gioKetThuc, buoi });
      } else {
        console.warn(`[updatePlanDetails] Exercise ${index + 1} (${ex.tenBaiTap}) - lichTap exists but has no valid properties:`, ex.lichTap);
      }
      return;
    }
    
    // Ưu tiên 2: Parse từ canhBao nếu có
    let foundLichTap = false;
    
    if (ex.canhBao) {
      const trimmedCanhBao = ex.canhBao.trim();
      // Chỉ parse nếu là JSON hợp lệ
      if (trimmedCanhBao.startsWith('{') || trimmedCanhBao.startsWith('[')) {
        try {
          const canhBaoJson = JSON.parse(ex.canhBao);
          console.log(`[updatePlanDetails] Exercise ${index + 1} (${ex.tenBaiTap}) - Parsed canhBaoJson:`, canhBaoJson);
          
          if (canhBaoJson && canhBaoJson.LichTap) {
            const lichTap = canhBaoJson.LichTap;
            console.log(`[updatePlanDetails] Exercise ${index + 1} (${ex.tenBaiTap}) - LichTap from CanhBao:`, lichTap);
            
            allLichTap.push({
              gioBatDau: lichTap.GioBatDau,
              gioKetThuc: lichTap.GioKetThuc,
              buoi: lichTap.Buoi
            });
            foundLichTap = true;
          }
        } catch (e) {
          console.warn(`[updatePlanDetails] Error parsing CanhBao JSON for exercise ${index + 1} (${ex.tenBaiTap}):`, e);
        }
      } else {
        console.log(`[updatePlanDetails] Exercise ${index + 1} (${ex.tenBaiTap}) - canhBao is plain text, will try NoiDung`);
      }
    }
    
    // Ưu tiên 3: Parse từ NoiDung nếu chưa tìm thấy trong CanhBao
    if (!foundLichTap && ex.noiDung) {
      const trimmedNoiDung = ex.noiDung.trim();
      
      // Kiểm tra xem có phải JSON không
      if (trimmedNoiDung.startsWith('{') || trimmedNoiDung.startsWith('[')) {
        try {
          const noiDungJson = JSON.parse(ex.noiDung);
          if (noiDungJson && noiDungJson.LichTap) {
            const lichTap = noiDungJson.LichTap;
            console.log(`[updatePlanDetails] Exercise ${index + 1} (${ex.tenBaiTap}) - LichTap from NoiDung:`, lichTap);
            
            allLichTap.push({
              gioBatDau: lichTap.GioBatDau,
              gioKetThuc: lichTap.GioKetThuc,
              buoi: lichTap.Buoi
            });
            foundLichTap = true;
          }
        } catch (e) {
          // Nếu NoiDung có nhiều phần (separated by |), tìm phần có LichTap
          if (ex.noiDung.includes('|') && ex.noiDung.includes('LichTap')) {
            const parts = ex.noiDung.split('|');
            for (const part of parts) {
              const trimmedPart = part.trim();
              if (trimmedPart.startsWith('{') && trimmedPart.includes('LichTap')) {
                try {
                  const partJson = JSON.parse(trimmedPart);
                  if (partJson && partJson.LichTap) {
                    const lichTap = partJson.LichTap;
                    console.log(`[updatePlanDetails] Exercise ${index + 1} (${ex.tenBaiTap}) - LichTap from NoiDung (multi-part):`, lichTap);
                    
                    allLichTap.push({
                      gioBatDau: lichTap.GioBatDau,
                      gioKetThuc: lichTap.GioKetThuc,
                      buoi: lichTap.Buoi
                    });
                    foundLichTap = true;
                    break;
                  }
                } catch (e2) {
                  // Continue to next part
                }
              }
            }
          }
        }
      }
    }
    
    if (!foundLichTap) {
      console.warn(`[updatePlanDetails] Exercise ${index + 1} (${ex.tenBaiTap}) - No LichTap found in lichTap, canhBao, or noiDung`);
    }
  });
  
  console.log('[updatePlanDetails] allLichTap:', allLichTap);
  console.log('[updatePlanDetails] allLichTap.length:', allLichTap.length);
  
  if (allLichTap.length === 0) {
    // Không có thông tin LichTap nào, reset về giá trị mặc định
    console.warn('[updatePlanDetails] No LichTap info found in any exercise, resetting to defaults');
    if (gioBatDauEl) gioBatDauEl.textContent = '--:--';
    if (gioKetThucEl) gioKetThucEl.textContent = '--:--';
    if (buoiEl) buoiEl.textContent = '--';
    return;
  }
  
  // Lấy tất cả các buổi khác nhau
  const allBuoi = [];
  allLichTap.forEach(lt => {
    if (lt.buoi && !allBuoi.includes(lt.buoi)) {
      allBuoi.push(lt.buoi);
    }
  });
  
  // Lấy giờ bắt đầu sớm nhất và giờ kết thúc muộn nhất
  let minGioBatDau = null;
  let maxGioKetThuc = null;
  
  allLichTap.forEach(lt => {
    if (lt.gioBatDau) {
      if (!minGioBatDau || lt.gioBatDau < minGioBatDau) {
        minGioBatDau = lt.gioBatDau;
      }
    }
    if (lt.gioKetThuc) {
      if (!maxGioKetThuc || lt.gioKetThuc > maxGioKetThuc) {
        maxGioKetThuc = lt.gioKetThuc;
      }
    }
  });
  
  // Xác định giá trị hiển thị
  let gioBatDau = minGioBatDau || '--:--';
  let gioKetThuc = maxGioKetThuc || '--:--';
  let buoi = allBuoi.length > 0 ? allBuoi.join(', ') : '--';
  
  console.log('[updatePlanDetails] Final values:', { gioBatDau, gioKetThuc, buoi, allBuoiCount: allBuoi.length });
  
  // Cập nhật thông tin trong details-grid
  if (gioBatDauEl) {
    gioBatDauEl.textContent = gioBatDau;
    console.log('[updatePlanDetails] ✅ Updated detail-gio-bat-dau to:', gioBatDau);
  } else {
    console.error('[updatePlanDetails] ❌ Element detail-gio-bat-dau not found!');
  }
  
  if (gioKetThucEl) {
    gioKetThucEl.textContent = gioKetThuc;
    console.log('[updatePlanDetails] ✅ Updated detail-gio-ket-thuc to:', gioKetThuc);
  } else {
    console.error('[updatePlanDetails] ❌ Element detail-gio-ket-thuc not found!');
  }
  
  if (buoiEl) {
    buoiEl.textContent = buoi;
    console.log('[updatePlanDetails] ✅ Updated detail-buoi to:', buoi);
  } else {
    console.error('[updatePlanDetails] ❌ Element detail-buoi not found!');
  }
}

// Load bài tập cho tuần hiện tại
async function loadExercisesForCurrentWeek() {
  const today = new Date();
  await loadExercisesForDate(today);
  
  // Highlight ngày hôm nay trong lịch
  if (weekGrid) {
    const days = weekGrid.querySelectorAll('.day');
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
    const ngayTrongTuan = dayOfWeek === 0 ? 7 : dayOfWeek; // Chuyển sang 1-7 (Monday-Sunday)
    if (days[ngayTrongTuan - 1]) {
      days.forEach(d => d.classList.remove('selected'));
      days[ngayTrongTuan - 1].classList.add('selected');
    }
  }
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
  
  // Event listener cho nút "Hoàn thành"
  const btnComplete = document.getElementById('btnComplete');
  if (btnComplete) {
    btnComplete.addEventListener('click', completeWorkoutSession);
    // Ban đầu disable nút
    updateCompleteButtonState();
  }
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
        // Load lại bài tập cho ngày hiện tại
        const today = new Date();
        await loadExercisesForDate(today);
      
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

  // Metrics stagger - Updated to match new HTML structure
  if (window.gsap) {
    const badgePills = document.querySelectorAll('.detail-badges .badge-pill');
    if (badgePills.length > 0) {
      gsap.from(badgePills, { opacity: 0, y: 16, scale: .98, duration: .4, stagger: .08, ease: 'power2.out', scrollTrigger: { trigger: '#detail-info', start: 'top 80%' } });
    }

    // Count-up numbers on badges
    document.querySelectorAll('.badge-pill strong').forEach((numEl) => {
      const text = numEl.textContent.trim();
      const final = Number(text.replace(/[^0-9.]/g, '')) || null;
      if (final !== null && !isNaN(final)) {
    const obj = { val: 0 };
    gsap.to(obj, { val: final, duration: 1.2, ease: 'power1.out', scrollTrigger: { trigger: numEl, start: 'top 85%' }, onUpdate: () => {
          // Giữ nguyên format nếu là số nguyên
          if (Number.isInteger(final)) {
      numEl.textContent = Math.round(obj.val);
          } else {
            numEl.textContent = obj.val.toFixed(1);
          }
    }});
      }
  });
  }

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

// ========== HOÀN THÀNH BÀI TẬP ==========

// Hiển thị modal để nhập thông tin hoàn thành bài tập
// Helper function: Tính calo tiêu hao dựa trên thời gian tập và loại bài tập
function tinhCaloTieuHao(thoiGianPhut, soHiep, soLan, loaiMucTieu, caloUocTinhMau) {
  if (!thoiGianPhut || thoiGianPhut <= 0) {
    // Nếu không có thời gian, tính theo Sets/Reps hoặc dùng giá trị mặc định
    if (soHiep && soLan && soHiep > 0 && soLan > 0) {
      const tongLanLap = soHiep * soLan;
      let heSoCaloMoiRep = 1.0;
      if (soLan <= 8 && soHiep >= 3) {
        heSoCaloMoiRep = 1.5; // Bài tập nặng
      } else if (soLan >= 15) {
        heSoCaloMoiRep = 0.6; // Bài tập nhẹ
      }
      return tongLanLap * heSoCaloMoiRep;
    }
    return caloUocTinhMau || 200;
  }

  // Xác định loại bài tập
  const laBaiTapGiamCan = loaiMucTieu && (
    loaiMucTieu.includes('Giảm Cân') ||
    loaiMucTieu.includes('Yoga') ||
    loaiMucTieu.includes('Cardio')
  );

  // Nếu có calo ước tính từ mẫu, tính theo tỷ lệ
  if (caloUocTinhMau && caloUocTinhMau > 0) {
    const caloMoiPhut = caloUocTinhMau / 30.0;
    return thoiGianPhut * caloMoiPhut;
  }

  // Công thức mặc định dựa trên loại bài tập
  if (laBaiTapGiamCan) {
    // Bài tập giảm cân/yoga: 4.5 calo/phút
    return thoiGianPhut * 4.5;
  } else {
    // Bài tập về cơ: 9.0 calo/phút
    return thoiGianPhut * 9.0;
  }
}

function showCompleteExerciseModal(exercise, seconds) {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const displayMinutes = minutes % 60;
  const displaySeconds = seconds % 60;
  const timeStr = hours > 0 
    ? `${hours}:${displayMinutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`
    : `${displayMinutes}:${displaySeconds.toString().padStart(2, '0')}`;

  // Tính calo tiêu hao dựa trên thời gian tập thực tế
  const loaiMucTieu = currentPlan?.mucTieu?.loaiMucTieu || null;
  const caloUocTinhMau = exercise.caloTieuHaoDuKien || null;
  let caloTieuHaoTinhToan = tinhCaloTieuHao(
    minutes > 0 ? minutes : exercise.thoiGianPhut,
    exercise.soHiep,
    exercise.soLan,
    loaiMucTieu,
    caloUocTinhMau
  );
  
  // Làm tròn đến 1 chữ số thập phân
  caloTieuHaoTinhToan = Math.round(caloTieuHaoTinhToan * 10) / 10;

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
            <input type="number" id="caloTieuHao" value="${caloTieuHaoTinhToan}" min="0" step="0.1" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border, #ddd); border-radius: 4px;">
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
  const thoiLuongInput = document.getElementById('thoiLuongThucTe');
  const caloTieuHaoInput = document.getElementById('caloTieuHao');

  // Cập nhật calo khi thời gian tập thay đổi
  if (thoiLuongInput && caloTieuHaoInput) {
    thoiLuongInput.addEventListener('input', () => {
      const thoiGianMoi = parseInt(thoiLuongInput.value) || 0;
      let caloMoi = tinhCaloTieuHao(
        thoiGianMoi > 0 ? thoiGianMoi : exercise.thoiGianPhut,
        exercise.soHiep,
        exercise.soLan,
        loaiMucTieu,
        caloUocTinhMau
      );
      // Làm tròn đến 1 chữ số thập phân
      caloMoi = Math.round(caloMoi * 10) / 10;
      caloTieuHaoInput.value = caloMoi;
    });
  }

  // Xử lý submit form
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const caloTieuHaoValue = parseFloat(caloTieuHaoInput.value) || 0;
    // Làm tròn đến 1 chữ số thập phân trước khi gửi
    const caloTieuHaoRounded = Math.round(caloTieuHaoValue * 10) / 10;
    
    const data = {
      chiTietId: exercise.chiTietId,
      thoiLuongThucTePhut: parseInt(thoiLuongInput.value) || null,
      soHiepThucTe: exercise.soHiep ? parseInt(document.getElementById('soHiepThucTe').value) || null : null,
      soLanThucTe: exercise.soLan ? parseInt(document.getElementById('soLanThucTe').value) || null : null,
      caloTieuHao: caloTieuHaoRounded,
      danhGiaBaiTap: parseInt(document.getElementById('danhGiaBaiTap').value) || null,
      ghiChu: document.getElementById('ghiChu').value || null
    };

    const success = await completeExercise(data);
    if (success) {
      modal.remove();
      // Reload thông tin lịch
      await loadScheduleInfo(); // Reload để cập nhật ngày đã tập
      // Refresh lịch để hiển thị trạng thái mới
      if (rangeTabs) {
        const activeTab = rangeTabs.querySelector('.tab.active');
        if (activeTab) {
          switchRange(activeTab.dataset.range);
        }
      }
      // Hiển thị thông báo thành công bằng modal tùy chỉnh
      showSuccessModal('Đã lưu nhật ký hoàn thành bài tập!', null);
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
      showErrorModal(result.message || 'Lỗi khi lưu nhật ký');
      return false;
    }
  } catch (error) {
    console.error('Error completing exercise:', error);
    alert('Lỗi khi lưu nhật ký');
    return false;
  }
}

// Kiểm tra và cập nhật trạng thái nút "Hoàn thành"
function updateCompleteButtonState() {
  const btnComplete = document.getElementById('btnComplete');
  if (!btnComplete) return;
  
  // Nếu buổi tập đã hoàn thành
  if (isWorkoutCompleted) {
    btnComplete.disabled = true;
    btnComplete.style.opacity = '0.6';
    btnComplete.style.cursor = 'not-allowed';
    btnComplete.textContent = 'Đã hoàn thành';
    btnComplete.title = 'Buổi tập này đã được hoàn thành.';
    return;
  }
  
  // Kiểm tra xem tất cả bài tập đã được bắt đầu chưa
  const allExercisesStarted = exercises.length > 0 && 
                              exercises.every(ex => startedExercises.has(ex.chiTietId));
  
  if (allExercisesStarted) {
    btnComplete.disabled = false;
    btnComplete.style.opacity = '1';
    btnComplete.style.cursor = 'pointer';
    btnComplete.textContent = 'Hoàn thành';
    btnComplete.title = 'Tất cả bài tập đã được bắt đầu. Bấm để hoàn thành buổi tập.';
    } else {
    btnComplete.disabled = true;
    btnComplete.style.opacity = '0.5';
    btnComplete.style.cursor = 'not-allowed';
    btnComplete.textContent = 'Hoàn thành';
    const startedCount = startedExercises.size;
    const totalCount = exercises.length;
    btnComplete.title = `Bạn cần bắt đầu tất cả bài tập trước khi hoàn thành. Đã bắt đầu: ${startedCount}/${totalCount}`;
  }
}

// Hoàn thành buổi tập (tất cả bài tập trong ngày)
async function completeWorkoutSession() {
  if (exercises.length === 0) {
    alert('Không có bài tập nào để hoàn thành');
    return;
  }

  // Kiểm tra lại xem tất cả bài tập đã được bắt đầu chưa
  const allExercisesStarted = exercises.every(ex => startedExercises.has(ex.chiTietId));
  if (!allExercisesStarted) {
    const startedCount = startedExercises.size;
    const totalCount = exercises.length;
    alert(`Bạn cần bắt đầu tất cả bài tập trước khi hoàn thành. Đã bắt đầu: ${startedCount}/${totalCount}`);
    return;
  }
  
  // Hiển thị modal xác nhận
  const confirmed = await showConfirmModal(
    'Xác nhận hoàn thành buổi tập',
    `Bạn có chắc chắn muốn hoàn thành buổi tập hôm nay? (${exercises.length} bài tập)`
  );
  if (!confirmed) return;
  
  try {
    // Lấy ngày từ currentViewDate hoặc ngày hiện tại
    const selectedDate = currentViewDate || new Date();
    const dateStr = formatDateForAPI(selectedDate);
    
    console.log('completeWorkoutSession - Sending request with:', {
      ngay: dateStr,
      chiTietIds: exercises.map(ex => ex.chiTietId),
      exerciseCount: exercises.length
    });
    
    const response = await fetch('/KeHoachTapLuyen/CompleteWorkoutSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ngay: dateStr,
        chiTietIds: exercises.map(ex => ex.chiTietId)
      })
    });
    
    const result = await response.json();
    if (result.success) {
      // Đánh dấu buổi tập đã hoàn thành ngay lập tức (không cần đợi reload)
      isWorkoutCompleted = true;
      
      console.log('completeWorkoutSession - Success, isWorkoutCompleted set to true');
      
      // Kiểm tra xem mục tiêu đã hoàn thành chưa
      try {
        const checkGoalResponse = await fetch('/KeHoachTapLuyen/CheckGoalCompleted');
        const checkGoalResult = await checkGoalResponse.json();
        
        console.log('completeWorkoutSession - CheckGoalCompleted result:', checkGoalResult);
        
        if (checkGoalResult.success && checkGoalResult.isGoalCompleted) {
          // Mục tiêu đã hoàn thành - hiển thị modal đặc biệt
          showGoalCompletedModal(() => {
            // Redirect đến trang Mục tiêu
            window.location.href = '/MucTieu';
          });
        } else {
          // Chỉ hoàn thành buổi tập, chưa hoàn thành mục tiêu
          showSuccessModal('Đã hoàn thành buổi tập thành công!', () => {
            // Reload lại danh sách bài tập để cập nhật trạng thái từ database
            const reloadDate = currentViewDate || new Date();
            console.log('completeWorkoutSession - Reloading exercises for date:', formatDateForAPI(reloadDate));
            loadExercisesForDate(reloadDate).then(() => {
              // Reload lại schedule info để cập nhật ngày đã tập
              loadScheduleInfo();
            });
          });
        }
      } catch (error) {
        console.error('Error checking goal completion:', error);
        // Nếu lỗi khi kiểm tra, vẫn hiển thị modal thành công bình thường
        showSuccessModal('Đã hoàn thành buổi tập thành công!', () => {
          const reloadDate = currentViewDate || new Date();
          loadExercisesForDate(reloadDate).then(() => {
            loadScheduleInfo();
          });
        });
      }
    } else {
      showErrorModal(result.message || 'Lỗi khi hoàn thành buổi tập');
    }
  } catch (error) {
    console.error('Error completing workout session:', error);
    showErrorModal('Lỗi khi hoàn thành buổi tập');
  }
}

// ========== HỦY KẾ HOẠCH ==========

// Xử lý hủy kế hoạch
async function handleCancelPlan() {
  // Hiển thị modal xác nhận
  const confirmed = await showConfirmModal(
    'Xác nhận hủy kế hoạch',
    'Bạn có chắc chắn muốn hủy kế hoạch tập luyện hiện tại? Sau khi hủy, bạn có thể tạo mục tiêu mới nhưng sẽ mất toàn bộ tiến độ của kế hoạch này.'
  );
  
  if (!confirmed) return;
  
  try {
    const response = await fetch('/KeHoachTapLuyen/CancelPlan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('CancelPlan - Success, redirecting to MucTieu');
      showSuccessModal('Đã hủy kế hoạch tập luyện thành công!', () => {
        // Redirect đến trang Mục tiêu để tạo mục tiêu mới
        // Sử dụng window.location.replace để đảm bảo không thể quay lại
        window.location.replace('/MucTieu');
      });
    } else {
      console.error('CancelPlan - Error:', result.message);
      showErrorModal(result.message || 'Lỗi khi hủy kế hoạch');
    }
  } catch (error) {
    console.error('Error cancelling plan:', error);
    showErrorModal('Lỗi khi hủy kế hoạch');
  }
}

// ========== MODAL FUNCTIONS ==========

// Hàm hiển thị modal hoàn thành mục tiêu
function showGoalCompletedModal(onClose) {
  // Tạo modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;
    backdrop-filter: blur(5px);
  `;
  
  // Tạo modal content với thiết kế đặc biệt cho hoàn thành mục tiêu
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 24px;
    padding: 40px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.4s ease;
    text-align: center;
    color: #fff;
  `;
  
  modalContent.innerHTML = `
    <div style="font-size: 4rem; margin-bottom: 20px; animation: bounce 0.6s ease;">
      🎉
    </div>
    <h2 style="margin: 0 0 16px 0; font-size: 2rem; font-weight: 700; color: #fff;">
      Chúc Mừng!
    </h2>
    <p style="margin: 0 0 32px 0; font-size: 1.1rem; color: rgba(255, 255, 255, 0.95); line-height: 1.6;">
      Bạn đã hoàn thành mục tiêu tập luyện của mình!<br>
      Hãy tiếp tục duy trì thói quen tốt này nhé!
    </p>
    <button class="btn-go-to-goal" style="
      padding: 14px 32px;
      border: none;
      border-radius: 12px;
      background: #fff;
      color: #667eea;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
      transition: all 0.3s;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      width: 100%;
    ">Đến Trang Mục Tiêu</button>
  `;
  
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  // Thêm animation styles
  if (!document.getElementById('goal-completed-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'goal-completed-modal-styles';
    style.textContent = `
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from {
          transform: translateY(50px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      .btn-go-to-goal:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      }
      .btn-go-to-goal:active {
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
  }
  
  // Event listener cho nút
  const btnGoToGoal = modalContent.querySelector('.btn-go-to-goal');
  btnGoToGoal.addEventListener('click', () => {
    modalOverlay.style.animation = 'fadeOut 0.3s ease';
    modalContent.style.animation = 'slideDown 0.4s ease';
    setTimeout(() => {
      document.body.removeChild(modalOverlay);
      if (onClose) onClose();
    }, 300);
  });
  
  // Đóng khi click vào overlay
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.style.animation = 'fadeOut 0.3s ease';
      modalContent.style.animation = 'slideDown 0.4s ease';
      setTimeout(() => {
        document.body.removeChild(modalOverlay);
        if (onClose) onClose();
      }, 300);
    }
  });
}

// Hàm hiển thị modal xác nhận
function showConfirmModal(title, message) {
  return new Promise((resolve) => {
    // Tạo modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    `;
    
    // Tạo modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: var(--card, #fff);
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
    `;
    
    modalContent.innerHTML = `
      <h3 style="margin: 0 0 16px 0; font-size: 1.25rem; color: var(--text, #333); font-weight: 600;">
        ${title}
      </h3>
      <p style="margin: 0 0 24px 0; color: var(--muted, #666); font-size: 0.95rem; line-height: 1.5;">
        ${message}
      </p>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="btn-cancel" style="
          padding: 10px 20px;
          border: 1px solid var(--border, #ddd);
          border-radius: 8px;
          background: transparent;
          color: var(--text, #333);
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        ">Hủy</button>
        <button class="btn-confirm" style="
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          background: var(--primary, #4ade80);
          color: #fff;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s;
        ">Xác nhận</button>
      </div>
    `;
    
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Event listeners
    const btnCancel = modalContent.querySelector('.btn-cancel');
    const btnConfirm = modalContent.querySelector('.btn-confirm');
    
    const closeModal = (result) => {
      modalOverlay.style.animation = 'fadeOut 0.2s ease';
      modalContent.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => {
        document.body.removeChild(modalOverlay);
        resolve(result);
      }, 200);
    };
    
    btnCancel.addEventListener('click', () => closeModal(false));
    btnConfirm.addEventListener('click', () => closeModal(true));
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal(false);
    });
    
    // Hover effects
    btnCancel.addEventListener('mouseenter', () => {
      btnCancel.style.background = 'var(--hover-bg, rgba(0,0,0,0.05))';
    });
    btnCancel.addEventListener('mouseleave', () => {
      btnCancel.style.background = 'transparent';
    });
    btnConfirm.addEventListener('mouseenter', () => {
      btnConfirm.style.opacity = '0.9';
      btnConfirm.style.transform = 'translateY(-1px)';
    });
    btnConfirm.addEventListener('mouseleave', () => {
      btnConfirm.style.opacity = '1';
      btnConfirm.style.transform = 'translateY(0)';
    });
  });
}

// Hàm hiển thị modal thông báo thành công
function showSuccessModal(message, onClose = null) {
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: var(--card, #fff);
    border-radius: 16px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease;
    text-align: center;
  `;
  
  modalContent.innerHTML = `
    <div style="font-size: 3rem; margin-bottom: 16px;">✅</div>
    <h3 style="margin: 0 0 12px 0; font-size: 1.25rem; color: var(--text, #333); font-weight: 600;">
      Thành công
    </h3>
    <p style="margin: 0 0 24px 0; color: var(--muted, #666); font-size: 0.95rem; line-height: 1.5;">
      ${message}
    </p>
    <button class="btn-close" style="
      padding: 10px 24px;
      border: none;
      border-radius: 8px;
      background: var(--primary, #4ade80);
      color: #fff;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.2s;
    ">Đóng</button>
  `;
  
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  const btnClose = modalContent.querySelector('.btn-close');
  const closeModal = () => {
    modalOverlay.style.animation = 'fadeOut 0.2s ease';
    modalContent.style.animation = 'slideDown 0.3s ease';
    setTimeout(() => {
      document.body.removeChild(modalOverlay);
      if (onClose) onClose();
    }, 200);
  };
  
  btnClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  
  btnClose.addEventListener('mouseenter', () => {
    btnClose.style.opacity = '0.9';
    btnClose.style.transform = 'translateY(-1px)';
  });
  btnClose.addEventListener('mouseleave', () => {
    btnClose.style.opacity = '1';
    btnClose.style.transform = 'translateY(0)';
  });
}

// Hàm hiển thị modal thông báo lỗi
function showErrorModal(message) {
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: var(--card, #fff);
    border-radius: 16px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease;
    text-align: center;
  `;
  
  modalContent.innerHTML = `
    <div style="font-size: 3rem; margin-bottom: 16px;">❌</div>
    <h3 style="margin: 0 0 12px 0; font-size: 1.25rem; color: var(--text, #333); font-weight: 600;">
      Lỗi
    </h3>
    <p style="margin: 0 0 24px 0; color: var(--muted, #666); font-size: 0.95rem; line-height: 1.5;">
      ${message}
    </p>
    <button class="btn-close" style="
      padding: 10px 24px;
      border: none;
      border-radius: 8px;
      background: var(--danger, #ff5c5c);
      color: #fff;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.2s;
    ">Đóng</button>
  `;
  
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  const btnClose = modalContent.querySelector('.btn-close');
  const closeModal = () => {
    modalOverlay.style.animation = 'fadeOut 0.2s ease';
    modalContent.style.animation = 'slideDown 0.3s ease';
  setTimeout(() => {
      document.body.removeChild(modalOverlay);
    }, 200);
  };
  
  btnClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  
  btnClose.addEventListener('mouseenter', () => {
    btnClose.style.opacity = '0.9';
    btnClose.style.transform = 'translateY(-1px)';
  });
  btnClose.addEventListener('mouseleave', () => {
    btnClose.style.opacity = '1';
    btnClose.style.transform = 'translateY(0)';
  });
}

// Thêm CSS animations
if (!document.getElementById('modal-animations')) {
  const style = document.createElement('style');
  style.id = 'modal-animations';
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideDown {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(20px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// remove 3D tilt & parallax (revert to simpler state)


