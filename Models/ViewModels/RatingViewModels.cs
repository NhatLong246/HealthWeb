namespace HealthWeb.Models.ViewModels;

public class CompletedSessionViewModel
{
    public string BookingId { get; set; } = null!;
    public string PtId { get; set; } = null!;
    public string PtName { get; set; } = null!;
    public string? PtAvatar { get; set; }
    public DateTime SessionDate { get; set; }
    public string SessionType { get; set; } = null!;
    public string? Notes { get; set; }
    public bool HasRated { get; set; }
}

public class RatingViewModel
{
    public List<CompletedSessionViewModel> Sessions { get; set; } = new();
}

public class SubmitRatingRequest
{
    public string PtId { get; set; } = null!;
    public string? BookingId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
}

public class SessionHistoryViewModel
{
    public string BookingId { get; set; } = null!;
    public string PtId { get; set; } = null!;
    public string PtName { get; set; } = null!;
    public string? PtAvatar { get; set; }
    public DateTime SessionDate { get; set; }
    public string SessionType { get; set; } = null!;
    public string Status { get; set; } = null!; // Pending, Confirmed, Completed, Cancelled
    public string? Notes { get; set; }
    public bool HasRated { get; set; }
    public int? Rating { get; set; } // Điểm đánh giá nếu đã đánh giá
    public string? RatingComment { get; set; } // Bình luận đánh giá nếu có
}

