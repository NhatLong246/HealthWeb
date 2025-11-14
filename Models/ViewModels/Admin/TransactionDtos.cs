using System;
using System.Collections.Generic;

namespace HealthWeb.Models.ViewModels.Admin;

public class TransactionManagementDataDto
{
    public IEnumerable<TransactionDto> Transactions { get; set; } = Array.Empty<TransactionDto>();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public TransactionSummaryDto Summary { get; set; } = new();
    public IEnumerable<TransactionRevenueChartDto> RevenueChartData { get; set; } = Array.Empty<TransactionRevenueChartDto>();
}

public class TransactionSummaryDto
{
    public double TotalRevenue { get; set; }
    public double TotalCommission { get; set; }
    public double TotalPTRevenue { get; set; }
    public int TotalTransactions { get; set; }
    public double AverageTransactionAmount { get; set; }
}

public class TransactionDto
{
    public string TransactionId { get; set; } = string.Empty;
    public string BookingId { get; set; } = string.Empty;
    public string CustomerId { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string PTId { get; set; } = string.Empty;
    public string PTName { get; set; } = string.Empty;
    public double Amount { get; set; }
    public double? Commission { get; set; }
    public double? PTRevenue { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public DateTime? TransactionDate { get; set; }
    public string? ServiceName { get; set; }
    public string? BookingType { get; set; }
    public DateTime? BookingDateTime { get; set; }
    public string? BookingStatus { get; set; }
}

public class TransactionRevenueChartDto
{
    public string Period { get; set; } = string.Empty;
    public double Revenue { get; set; }
    public double Commission { get; set; }
    public double PTRevenue { get; set; }
    public int TransactionCount { get; set; }
}

public class TransactionDetailDto
{
    public TransactionDto Transaction { get; set; } = new();
    public BookingDetailDto? Booking { get; set; }
}

public class BookingDetailDto
{
    public string BookingId { get; set; } = string.Empty;
    public DateTime BookingDateTime { get; set; }
    public string? BookingType { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
    public bool? AllowHealthView { get; set; }
}

