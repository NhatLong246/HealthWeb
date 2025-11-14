using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HealthWeb.Models.EF;
using HealthWeb.Models.ViewModels.Admin;
using Microsoft.EntityFrameworkCore;

namespace HealthWeb.Services;

public class TransactionAdminService : ITransactionAdminService
{
    private readonly ApplicationDbContext _context;

    public TransactionAdminService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<TransactionManagementDataDto> GetTransactionManagementDataAsync(
        string? search = null,
        string? paymentMethod = null,
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Base query with includes
            var query = _context.GiaoDiches
                .AsNoTracking()
                .Include(g => g.KhachHang)
                .Include(g => g.Pt)
                    .ThenInclude(pt => pt.User)
                .Include(g => g.DatLich)
                .AsQueryable();

            // Apply filters
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(g =>
                    g.GiaoDichId.ToLower().Contains(searchLower) ||
                    (g.KhachHang.HoTen != null && g.KhachHang.HoTen.ToLower().Contains(searchLower)) ||
                    (g.KhachHang.Username != null && g.KhachHang.Username.ToLower().Contains(searchLower)) ||
                    (g.Pt.User != null && g.Pt.User.HoTen != null && g.Pt.User.HoTen.ToLower().Contains(searchLower)) ||
                    (g.DatLichId != null && g.DatLichId.ToLower().Contains(searchLower)));
            }

            if (!string.IsNullOrWhiteSpace(paymentMethod))
            {
                // Payment methods: Momo, ZaloPay, VNPay (as stored in database)
                // No mapping needed as these are the same in Vietnamese and English
                query = query.Where(g => g.PhuongThucThanhToan == paymentMethod);
            }

            if (dateFrom.HasValue)
            {
                var fromDate = dateFrom.Value.Date;
                query = query.Where(g => g.NgayGiaoDich.HasValue && g.NgayGiaoDich.Value.Date >= fromDate);
            }

            if (dateTo.HasValue)
            {
                var toDate = dateTo.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(g => g.NgayGiaoDich.HasValue && g.NgayGiaoDich.Value <= toDate);
            }

            // Get all transactions
            var transactions = await query
                .OrderByDescending(g => g.NgayGiaoDich)
                .ToListAsync(cancellationToken);

            // Map to DTOs
            var transactionDtos = transactions.Select(MapToTransactionDto).ToList();

            // Calculate summary (only for completed transactions)
            // Only count transactions with status "Completed" (exclude "Pending", "Refunded", etc.)
            var completedTransactions = transactionDtos
                .Where(t => string.Equals(t.PaymentStatus, "Completed", StringComparison.OrdinalIgnoreCase))
                .ToList();

            var totalRevenue = completedTransactions.Sum(t => t.Amount);
            var totalCommission = completedTransactions.Sum(t => t.Commission ?? 0);
            var totalPTRevenue = completedTransactions.Sum(t => t.PTRevenue ?? 0);
            var totalTransactions = completedTransactions.Count;
            var averageTransactionAmount = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

            // Generate revenue chart data (group by month)
            var revenueChartData = GenerateRevenueChartData(completedTransactions);

            return new TransactionManagementDataDto
            {
                Transactions = transactionDtos,
                GeneratedAt = DateTime.UtcNow,
                Summary = new TransactionSummaryDto
                {
                    TotalRevenue = totalRevenue,
                    TotalCommission = totalCommission,
                    TotalPTRevenue = totalPTRevenue,
                    TotalTransactions = totalTransactions,
                    AverageTransactionAmount = averageTransactionAmount
                },
                RevenueChartData = revenueChartData
            };
        }
        catch (OperationCanceledException)
        {
            return new TransactionManagementDataDto
            {
                Transactions = new List<TransactionDto>(),
                GeneratedAt = DateTime.UtcNow,
                Summary = new TransactionSummaryDto(),
                RevenueChartData = new List<TransactionRevenueChartDto>()
            };
        }
    }

    public async Task<TransactionDetailDto?> GetTransactionDetailAsync(
        string transactionId,
        CancellationToken cancellationToken = default)
    {
        var transaction = await _context.GiaoDiches
            .AsNoTracking()
            .Include(g => g.KhachHang)
            .Include(g => g.Pt)
                .ThenInclude(pt => pt.User)
            .Include(g => g.DatLich)
            .FirstOrDefaultAsync(g => g.GiaoDichId == transactionId, cancellationToken);

        if (transaction == null)
        {
            return null;
        }

        var transactionDto = MapToTransactionDto(transaction);
        var bookingDto = transaction.DatLich != null ? new BookingDetailDto
        {
            BookingId = transaction.DatLich.DatLichId,
            BookingDateTime = transaction.DatLich.NgayGioDat,
            BookingType = transaction.DatLich.LoaiBuoiTap,
            Status = transaction.DatLich.TrangThai,
            Notes = transaction.DatLich.GhiChu,
            AllowHealthView = transaction.DatLich.ChoXemSucKhoe
        } : null;

        return new TransactionDetailDto
        {
            Transaction = transactionDto,
            Booking = bookingDto
        };
    }

    private static TransactionDto MapToTransactionDto(Models.Entities.GiaoDich transaction)
    {
        var customerName = !string.IsNullOrWhiteSpace(transaction.KhachHang.HoTen)
            ? transaction.KhachHang.HoTen
            : transaction.KhachHang.Username;

        var ptName = transaction.Pt?.User != null && !string.IsNullOrWhiteSpace(transaction.Pt.User.HoTen)
            ? transaction.Pt.User.HoTen
            : transaction.Ptid;

        var serviceName = transaction.DatLich != null
            ? $"Buổi tập {transaction.DatLich.LoaiBuoiTap ?? "với PT"}"
            : "Dịch vụ PT";

        // Payment methods: Momo, ZaloPay, VNPay (no mapping needed)
        var paymentMethodDisplay = transaction.PhuongThucThanhToan ?? "Unknown";

        return new TransactionDto
        {
            TransactionId = transaction.GiaoDichId,
            BookingId = transaction.DatLichId,
            CustomerId = transaction.KhachHangId,
            CustomerName = customerName,
            PTId = transaction.Ptid,
            PTName = ptName,
            Amount = transaction.SoTien,
            Commission = transaction.HoaHongApp,
            PTRevenue = transaction.SoTienPtnhan,
            PaymentStatus = transaction.TrangThaiThanhToan ?? "Pending",
            PaymentMethod = paymentMethodDisplay, // Return Vietnamese for display
            TransactionDate = transaction.NgayGiaoDich,
            ServiceName = serviceName,
            BookingType = transaction.DatLich?.LoaiBuoiTap,
            BookingDateTime = transaction.DatLich?.NgayGioDat,
            BookingStatus = transaction.DatLich?.TrangThai
        };
    }


    private static List<TransactionRevenueChartDto> GenerateRevenueChartData(List<TransactionDto> transactions)
    {
        if (transactions.Count == 0)
        {
            return new List<TransactionRevenueChartDto>();
        }

        // Group by month
        var monthlyData = transactions
            .Where(t => t.TransactionDate.HasValue)
            .GroupBy(t => new
            {
                Year = t.TransactionDate!.Value.Year,
                Month = t.TransactionDate!.Value.Month
            })
            .Select(g => new TransactionRevenueChartDto
            {
                Period = $"{g.Key.Month:D2}/{g.Key.Year}",
                Revenue = g.Sum(t => t.Amount),
                Commission = g.Sum(t => t.Commission ?? 0),
                PTRevenue = g.Sum(t => t.PTRevenue ?? 0),
                TransactionCount = g.Count()
            })
            .OrderBy(d => d.Period)
            .ToList();

        return monthlyData;
    }
}

