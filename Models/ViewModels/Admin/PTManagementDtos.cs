using System;
using System.Collections.Generic;

namespace HealthWeb.Models.ViewModels.Admin;

public class PTManagementDataDto
{
    public IEnumerable<PTCardDto> Trainers { get; set; } = Array.Empty<PTCardDto>();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public PTManagementSummaryDto Summary { get; set; } = new();
}

public class PTManagementSummaryDto
{
    public int TotalTrainers { get; set; }
    public double AverageRevenuePerPT { get; set; }
    public double AverageActiveClients { get; set; }
    public double CancelRate { get; set; }
    public double AverageRating { get; set; }
    public double PTHiringRate { get; set; }
    public double AverageBookingsPerWeek { get; set; }
}

public class PTCardDto
{
    public string PTId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Specialty { get; set; }
    public string? City { get; set; }
    public double? PricePerHour { get; set; }
    public double? Rating { get; set; }
    public int TotalReviews { get; set; }
    public int CurrentClients { get; set; }
    public bool Verified { get; set; }
    public bool AcceptingClients { get; set; }
    public int? Experience { get; set; }
    public string? Certificate { get; set; }
    public string? Bio { get; set; }
    public string? Availability { get; set; }
    public double? SuccessRate { get; set; }
    public double RevenueThisMonth { get; set; }
    public int TotalBookings { get; set; }
    public double CancelRate { get; set; }
    public double ResponseTime { get; set; }
    public double BookingsPerWeek { get; set; }
    public double CompletionRate { get; set; }
    public DateTime? RegistrationDate { get; set; }
    public string? AvatarUrl { get; set; }
    public string? CCCDUrl { get; set; }
    public string? PortraitUrl { get; set; }
    public string? DocumentUrl { get; set; }
}

public class PTProfile360Dto
{
    public PTCardDto BasicInfo { get; set; } = new();
    public IEnumerable<PTScheduleDto> Schedule { get; set; } = Array.Empty<PTScheduleDto>();
    public IEnumerable<PTBookingDto> Bookings { get; set; } = Array.Empty<PTBookingDto>();
    public IEnumerable<PTReviewDto> Reviews { get; set; } = Array.Empty<PTReviewDto>();
    public IEnumerable<PTClientDto> Clients { get; set; } = Array.Empty<PTClientDto>();
    public PTPerformanceDto Performance { get; set; } = new();
}

public class PTScheduleDto
{
    public string ScheduleId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public DateTime DateTime { get; set; }
    public int? Duration { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? Location { get; set; }
    public int? Rating { get; set; }
    public string? Review { get; set; }
    public DateTime? ReviewDate { get; set; }
}

public class PTBookingDto
{
    public string BookingId { get; set; } = string.Empty;
    public string CustomerId { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public DateTime DateTime { get; set; }
    public string? Type { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class PTReviewDto
{
    public int ReviewId { get; set; }
    public string CustomerId { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public int? Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime? ReviewDate { get; set; }
}

public class PTClientDto
{
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public DateTime? AccessGrantedDate { get; set; }
    public bool IsActive { get; set; }
}

public class PTPerformanceDto
{
    public double RevenueThisMonth { get; set; }
    public int TotalBookings { get; set; }
    public double CancelRate { get; set; }
    public double BookingsPerWeek { get; set; }
}

public class ToggleAcceptingClientsRequest
{
    public bool AcceptingClients { get; set; }
}

public class ApprovePTRequest
{
    public string? Note { get; set; }
}

public class CancelBookingRequest
{
    public string? Reason { get; set; }
}

public class UpdatePTRequest
{
    public string? Specialty { get; set; }
    public string? City { get; set; }
    public double? PricePerHour { get; set; }
    public string? Bio { get; set; }
    public int? Experience { get; set; }
    public string? Certificate { get; set; }
    public string? Availability { get; set; }
    public bool? AcceptingClients { get; set; }
}

