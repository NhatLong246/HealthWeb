// Schedule PT - JavaScript chỉ dùng cho view toggle và hiệu ứng UI
// Dữ liệu được load từ server bằng Razor

let currentView = 'grid';

document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo view mặc định
    switchView('grid');
});

function switchView(view) {
    currentView = view;
    
    const gridView = document.getElementById('calendarGrid');
    const listView = document.getElementById('scheduleList');
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    
    if (view === 'grid') {
        if (gridView) gridView.style.display = 'grid';
        if (listView) listView.classList.remove('active');
        if (gridBtn) gridBtn.classList.add('active');
        if (listBtn) listBtn.classList.remove('active');
    } else {
        if (gridView) gridView.style.display = 'none';
        if (listView) listView.classList.add('active');
        if (gridBtn) gridBtn.classList.remove('active');
        if (listBtn) listBtn.classList.add('active');
    }
}

function viewBooking(clientName) {
    // TODO: Open booking details modal
    console.log('View booking for:', clientName);
    alert('Chi tiết lịch hẹn cho: ' + clientName);
}
