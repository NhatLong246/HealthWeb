using System.Threading;
using System.Threading.Tasks;
using HealthWeb.Models.ViewModels.Admin;

namespace HealthWeb.Services;

public interface IPTAdminService
{
    Task<PTManagementDataDto> GetPTManagementDataAsync(
        string? search = null,
        string? specialty = null,
        string? city = null,
        bool? acceptingClients = null,
        double? minRating = null,
        bool? verifiedOnly = true,
        CancellationToken cancellationToken = default);
    
    Task<PTManagementDataDto> GetPendingPTDataAsync(
        string? search = null,
        string? specialty = null,
        CancellationToken cancellationToken = default);

    Task<PTProfile360Dto?> GetPTProfile360Async(string ptId, CancellationToken cancellationToken = default);

    Task<PTCardDto?> ToggleAcceptingClientsAsync(string ptId, bool acceptingClients, CancellationToken cancellationToken = default);

    Task<PTCardDto?> ApprovePTAsync(string userId, string? note, CancellationToken cancellationToken = default);

    Task<bool> RejectPTAsync(string userId, CancellationToken cancellationToken = default);
    
    Task<bool> ConfirmBookingAsync(string bookingId, CancellationToken cancellationToken = default);
    
    Task<bool> CancelBookingAsync(string bookingId, string? reason, CancellationToken cancellationToken = default);
    
    Task<PTCardDto?> UpdatePTAsync(string ptId, UpdatePTRequest request, CancellationToken cancellationToken = default);
    
    Task<bool> DeletePTAsync(string ptId, CancellationToken cancellationToken = default);
}

