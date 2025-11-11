-- Add Daily, Weekly, and Monthly ranking data for current dates
USE HealthTracker;
GO

-- Insert Weekly rankings (current week)
INSERT INTO XepHang (UserID, ChuKy, TongDiem, ThuHang, NgayBatDauChuKy, NgayKetThucChuKy)
VALUES
('user_0001','Weekly',250,2,DATEADD(day, -(DATEPART(WEEKDAY, GETDATE()) - 2), CAST(GETDATE() AS DATE)),DATEADD(day, 6 + (7 - DATEPART(WEEKDAY, GETDATE())), CAST(GETDATE() AS DATE))),
('user_0002','Weekly',300,1,DATEADD(day, -(DATEPART(WEEKDAY, GETDATE()) - 2), CAST(GETDATE() AS DATE)),DATEADD(day, 6 + (7 - DATEPART(WEEKDAY, GETDATE())), CAST(GETDATE() AS DATE))),
('user_0003','Weekly',210,3,DATEADD(day, -(DATEPART(WEEKDAY, GETDATE()) - 2), CAST(GETDATE() AS DATE)),DATEADD(day, 6 + (7 - DATEPART(WEEKDAY, GETDATE())), CAST(GETDATE() AS DATE))),
('user_0004','Weekly',160,5,DATEADD(day, -(DATEPART(WEEKDAY, GETDATE()) - 2), CAST(GETDATE() AS DATE)),DATEADD(day, 6 + (7 - DATEPART(WEEKDAY, GETDATE())), CAST(GETDATE() AS DATE))),
('user_0005','Weekly',120,7,DATEADD(day, -(DATEPART(WEEKDAY, GETDATE()) - 2), CAST(GETDATE() AS DATE)),DATEADD(day, 6 + (7 - DATEPART(WEEKDAY, GETDATE())), CAST(GETDATE() AS DATE))),
('user_0006','Weekly',240,4,DATEADD(day, -(DATEPART(WEEKDAY, GETDATE()) - 2), CAST(GETDATE() AS DATE)),DATEADD(day, 6 + (7 - DATEPART(WEEKDAY, GETDATE())), CAST(GETDATE() AS DATE)));

-- Insert Daily rankings (today)
INSERT INTO XepHang (UserID, ChuKy, TongDiem, ThuHang, NgayBatDauChuKy, NgayKetThucChuKy)
VALUES
('user_0001','Daily',120,2,CAST(GETDATE() AS DATE),CAST(GETDATE() AS DATE)),
('user_0002','Daily',150,1,CAST(GETDATE() AS DATE),CAST(GETDATE() AS DATE)),
('user_0003','Daily',110,3,CAST(GETDATE() AS DATE),CAST(GETDATE() AS DATE)),
('user_0004','Daily',100,5,CAST(GETDATE() AS DATE),CAST(GETDATE() AS DATE)),
('user_0005','Daily',90,6,CAST(GETDATE() AS DATE),CAST(GETDATE() AS DATE)),
('user_0006','Daily',105,4,CAST(GETDATE() AS DATE),CAST(GETDATE() AS DATE));

-- Insert Monthly rankings (current month)
INSERT INTO XepHang (UserID, ChuKy, TongDiem, ThuHang, NgayBatDauChuKy, NgayKetThucChuKy)
VALUES
('user_0001','Monthly',5500,2,CAST(DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) AS DATE),CAST(DATEADD(month, 1, DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0)) AS DATE)),
('user_0002','Monthly',6500,1,CAST(DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) AS DATE),CAST(DATEADD(month, 1, DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0)) AS DATE)),
('user_0003','Monthly',4800,3,CAST(DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) AS DATE),CAST(DATEADD(month, 1, DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0)) AS DATE)),
('user_0004','Monthly',4200,5,CAST(DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) AS DATE),CAST(DATEADD(month, 1, DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0)) AS DATE)),
('user_0005','Monthly',3800,6,CAST(DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) AS DATE),CAST(DATEADD(month, 1, DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0)) AS DATE)),
('user_0006','Monthly',4500,4,CAST(DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) AS DATE),CAST(DATEADD(month, 1, DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0)) AS DATE));

GO

