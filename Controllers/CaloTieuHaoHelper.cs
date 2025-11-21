namespace HealthWeb.Controllers;

/// <summary>
/// Helper class để tính toán calo tiêu hao dự kiến cho các bài tập
/// </summary>
public static class CaloTieuHaoHelper
{
    /// <summary>
    /// Tính calo tiêu hao dự kiến dựa trên thời gian tập và loại bài tập
    /// </summary>
    /// <param name="thoiGianPhut">Thời gian tập (phút) - ưu tiên từ người dùng</param>
    /// <param name="soHiep">Số hiệp (Sets) - cho bài tập về cơ</param>
    /// <param name="soLan">Số lần (Reps) - cho bài tập về cơ</param>
    /// <param name="mucTieu">Mục tiêu tập luyện: "Giảm Cân" hoặc tên cơ (ví dụ: "Cơ Tay", "Cơ Bụng")</param>
    /// <param name="caloUocTinhMau">Calo ước tính từ mẫu tập luyện (nếu có)</param>
    /// <returns>Calo tiêu hao dự kiến</returns>
    public static double TinhCaloTieuHao(
        int? thoiGianPhut,
        int? soHiep,
        int? soLan,
        string? mucTieu = null,
        int? caloUocTinhMau = null)
    {
        // Nếu có thời gian tập từ người dùng, ưu tiên tính theo thời gian
        if (thoiGianPhut.HasValue && thoiGianPhut.Value > 0)
        {
            return TinhCaloTheoThoiGian(thoiGianPhut.Value, mucTieu, caloUocTinhMau);
        }

        // Nếu không có thời gian nhưng có Sets và Reps (bài tập về cơ)
        if (soHiep.HasValue && soLan.HasValue && soHiep.Value > 0 && soLan.Value > 0)
        {
            return TinhCaloTheoSetsReps(soHiep.Value, soLan.Value, mucTieu);
        }

        // Nếu có calo ước tính từ mẫu, sử dụng giá trị đó
        if (caloUocTinhMau.HasValue && caloUocTinhMau.Value > 0)
        {
            return caloUocTinhMau.Value;
        }

        // Giá trị mặc định
        return 200;
    }

    /// <summary>
    /// Tính calo theo thời gian tập (phút)
    /// </summary>
    private static double TinhCaloTheoThoiGian(int thoiGianPhut, string? mucTieu, int? caloUocTinhMau)
    {
        // Xác định loại bài tập dựa trên mục tiêu
        bool laBaiTapGiamCan = mucTieu != null && 
            (mucTieu.Contains("Giảm Cân", StringComparison.OrdinalIgnoreCase) ||
             mucTieu.Contains("Yoga", StringComparison.OrdinalIgnoreCase) ||
             mucTieu.Contains("Cardio", StringComparison.OrdinalIgnoreCase));

        // Nếu có calo ước tính từ mẫu, tính theo tỷ lệ
        if (caloUocTinhMau.HasValue && caloUocTinhMau.Value > 0)
        {
            // Giả sử caloUocTinhMau là cho 30 phút, tính tỷ lệ
            double caloMoiPhut = caloUocTinhMau.Value / 30.0;
            return thoiGianPhut * caloMoiPhut;
        }

        // Công thức mặc định dựa trên loại bài tập
        if (laBaiTapGiamCan)
        {
            // Bài tập giảm cân/yoga: 3-6 calo/phút (trung bình 4.5 calo/phút)
            // Cường độ thấp-trung bình
            return thoiGianPhut * 4.5;
        }
        else
        {
            // Bài tập về cơ: 6-12 calo/phút (trung bình 9 calo/phút)
            // Cường độ trung bình-cao
            return thoiGianPhut * 9.0;
        }
    }

    /// <summary>
    /// Tính calo theo Sets và Reps (khi không có thời gian)
    /// </summary>
    private static double TinhCaloTheoSetsReps(int soHiep, int soLan, string? mucTieu)
    {
        // Công thức: Sets * Reps * hệ số
        // Hệ số phụ thuộc vào độ khó và loại bài tập
        
        // Tính tổng số lần lặp lại
        int tongLanLap = soHiep * soLan;
        
        // Hệ số calo mỗi lần lặp lại
        // Bài tập cơ thông thường: 0.8-1.2 calo/rep (trung bình 1.0)
        double heSoCaloMoiRep = 1.0;
        
        // Nếu là bài tập nặng (có thể xác định qua mục tiêu hoặc số reps ít)
        if (soLan <= 8 && soHiep >= 3)
        {
            // Bài tập nặng: 1.5 calo/rep
            heSoCaloMoiRep = 1.5;
        }
        else if (soLan >= 15)
        {
            // Bài tập nhẹ, nhiều reps: 0.6 calo/rep
            heSoCaloMoiRep = 0.6;
        }
        
        return tongLanLap * heSoCaloMoiRep;
    }
}

