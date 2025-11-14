document.addEventListener('DOMContentLoaded', function() {
    // File upload preview
    const fileInputs = ['avatarFile', 'cccdFile', 'certFile'];
    fileInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        const area = input.closest('.file-upload-area');
        if (input && area) {
            input.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const fileSize = (file.size / 1024 / 1024).toFixed(2);
                    area.querySelector('p').textContent = file.name;
                    area.querySelector('small').textContent = `${fileSize} MB`;
                }
            });
        }
    });
});

