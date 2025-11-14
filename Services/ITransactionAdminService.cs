using System.Threading;
using System.Threading.Tasks;
using HealthWeb.Models.ViewModels.Admin;

namespace HealthWeb.Services;

public interface ITransactionAdminService
{
    Task<TransactionManagementDataDto> GetTransactionManagementDataAsync(
        string? search = null,
        string? paymentMethod = null,
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default);

    Task<TransactionDetailDto?> GetTransactionDetailAsync(
        string transactionId,
        CancellationToken cancellationToken = default);
}

