-- ============================================================================
-- CẬP NHẬT VIDEOURL CHO BẢNG ChiTietMauTapLuyen VỚI CÁC LINK YOUTUBE
-- ============================================================================
-- LƯU Ý: Các link YouTube trong file này là các video tutorial phổ biến
-- Bạn nên kiểm tra và cập nhật các link này với video phù hợp nhất cho từng bài tập
-- Có thể tìm kiếm trên YouTube với từ khóa: "[Tên bài tập] tutorial" hoặc "[Tên bài tập] how to"
-- 
-- Các kênh YouTube uy tín để tham khảo:
-- - Athlean-X (Jeff Cavaliere)
-- - Jeremy Ethier (Built With Science)
-- - Calisthenic Movement
-- - Yoga with Adriene
-- - Fitness Blender
-- - POPSUGAR Fitness
-- ============================================================================

USE HealthTracker;
GO

-- TAY TRƯỚC - BICEPS
UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo'
WHERE TenBaiTap = N'Tay Trước - Bottle Curl';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=TwD-YGVP4Bk'
WHERE TenBaiTap = N'Tay Trước - Hammer Curl Với Tạ';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=zC3nLlEvin4'
WHERE TenBaiTap = N'Tay Trước - Preacher Curl';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=0A3k8r0zsUY'
WHERE TenBaiTap = N'Tay Trước - Concentration Curl';

-- TAY SAU - TRICEPS
UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=J0DnG1_S92I'
WHERE TenBaiTap = N'Tay Sau - Diamond Push Ups';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=_gsUck-7M74'
WHERE TenBaiTap = N'Tay Sau - Tricep Pushdown Cáp';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=d_KZxkY_0cM'
WHERE TenBaiTap = N'Tay Sau - Skull Crusher';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=vB5OHsJ3EME'
WHERE TenBaiTap = N'Tay Sau - Rope Pushdown';

-- CHÂN - LEGS
UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=YaXPRqUwItQ'
WHERE TenBaiTap = N'Chân - Bodyweight Squat';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=IZxyjW7MPJQ'
WHERE TenBaiTap = N'Chân - Leg Press';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=QOVaHwm-Q6U'
WHERE TenBaiTap = N'Chân - Calf Raise';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=1Tq3QdYUuHs'
WHERE TenBaiTap = N'Chân - Leg Curl';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=SwZMN66462w'
WHERE TenBaiTap = N'Chân - Step Up';

-- ĐÙI - THIGHS
UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=3XDriUn0udo'
WHERE TenBaiTap = N'Đùi - Lunges';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=YyvSfVjQeL0'
WHERE TenBaiTap = N'Đùi - Leg Extension';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=MeIiIdhvXT4'
WHERE TenBaiTap = N'Đùi - Hack Squat';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=1oed-UmAxFs'
WHERE TenBaiTap = N'Đùi - Goblet Squat';

-- MÔNG - GLUTES
UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=wPM8icPu6H8'
WHERE TenBaiTap = N'Mông - Glute Bridge';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=SEdqd1n0cvg'
WHERE TenBaiTap = N'Mông - Hip Thrust';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=op9kVnSso6Q'
WHERE TenBaiTap = N'Mông - Romanian Deadlift';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=7j-3x1qX1uU'
WHERE TenBaiTap = N'Mông - Cable Kickback';

-- BỤNG - ABS
UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=pSHjTRCQxIw'
WHERE TenBaiTap = N'Bụng - Plank';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=2RrGnjxSsiA'
WHERE TenBaiTap = N'Bụng - Cable Crunch';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=wkD8rjkodUI'
WHERE TenBaiTap = N'Bụng - Russian Twist';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=l4kQd9eWclE'
WHERE TenBaiTap = N'Bụng - Leg Raise';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=Iwyvozckjak'
WHERE TenBaiTap = N'Bụng - Bicycle Crunch';

-- VAI - SHOULDERS
UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=qEwKCR5JCog'
WHERE TenBaiTap = N'Vai - Shoulder Press Với Tạ';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=3VcKaXpzqRo'
WHERE TenBaiTap = N'Vai - Lateral Raise';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=-t7fuZ0KhDA'
WHERE TenBaiTap = N'Vai - Front Raise';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=rep-qVOkqgk'
WHERE TenBaiTap = N'Vai - Rear Delt Fly';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=jaAV-rD45I0'
WHERE TenBaiTap = N'Vai - Upright Row';

-- LƯNG - BACK
UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=eGo4IYlbE5g'
WHERE TenBaiTap = N'Lưng - Pull Ups';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=op9kVnSso6Q'
WHERE TenBaiTap = N'Lưng - Deadlift';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=roCP6wCXPqo'
WHERE TenBaiTap = N'Lưng - Bent Over Row';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=CAwf7n6Luuc'
WHERE TenBaiTap = N'Lưng - Lat Pulldown';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=GZbfZ033f74'
WHERE TenBaiTap = N'Lưng - Seated Row';

-- NGỰC - CHEST
UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=IODxDxX7oi4'
WHERE TenBaiTap = N'Ngực - Push Ups';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=rT7DgCr-3pg'
WHERE TenBaiTap = N'Ngực - Bench Press';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=eozdVDA78K0'
WHERE TenBaiTap = N'Ngực - Fly Machine';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=8iPEnov-lmU'
WHERE TenBaiTap = N'Ngực - Incline Press';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=taI4XduLpTk'
WHERE TenBaiTap = N'Ngực - Cable Crossover';

-- YOGA POSES
UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=Er9L0X5fdyk'
WHERE TenBaiTap = N'Yoga - Tư Thế Cây (Vrksasana)';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=3fSx92UE1SU'
WHERE TenBaiTap = N'Yoga - Tư Thế Chiến Binh 1';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=pSHjTRCQxIw'
WHERE TenBaiTap = N'Yoga - Tư Thế Plank';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=DHV1xqg1Qfw'
WHERE TenBaiTap = N'Yoga - Tư Thế Downward Dog';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=JDcdhTuycOI'
WHERE TenBaiTap = N'Yoga - Tư Thế Cobra';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=S9W1xqJ8_9M'
WHERE TenBaiTap = N'Yoga - Tư Thế Triangle';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=0VqJx2lqZ1E'
WHERE TenBaiTap = N'Yoga - Tư Thế Wheel';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=St5B7hnMLjg'
WHERE TenBaiTap = N'Yoga - Tư Thế Headstand';

UPDATE ChiTietMauTapLuyen
SET VideoUrl = 'https://www.youtube.com/watch?v=FLd88Bug6Tg'
WHERE TenBaiTap = N'Yoga - Tư Thế Lotus';

GO

-- Kiểm tra kết quả
SELECT BaiTapID, TenBaiTap, VideoUrl
FROM ChiTietMauTapLuyen
WHERE VideoUrl LIKE 'https://www.youtube.com%'
ORDER BY BaiTapID;

