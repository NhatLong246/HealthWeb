using HealthWeb.Models.ViewModels;

namespace HealthWeb.Services;

public interface IRatingService
{
    Task<List<CompletedSessionViewModel>> GetCompletedSessionsForRatingAsync(string userId);
    Task<List<SessionHistoryViewModel>> GetSessionHistoryAsync(string userId);
    Task<bool> HasRatedSessionAsync(string userId, string ptId, string? bookingId = null);
    Task<(bool success, string message)> SubmitRatingAsync(string userId, string ptId, int rating, string? comment, string? bookingId = null);
}

