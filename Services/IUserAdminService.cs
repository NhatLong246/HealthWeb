using System.Threading;
using System.Threading.Tasks;
using HealthWeb.Models.ViewModels.Admin;

namespace HealthWeb.Services;

public interface IUserAdminService
{
    Task<UserManagementDataDto> GetUserManagementDataAsync(CancellationToken cancellationToken = default);

    Task<UserProfileDetailDto?> GetUserProfileAsync(string userId, CancellationToken cancellationToken = default);
    
    Task<bool> GrantPTAccessAsync(string userId, string ptId, CancellationToken cancellationToken = default);
    
    Task<bool> RevokePTAccessAsync(string userId, string ptId, CancellationToken cancellationToken = default);
}
