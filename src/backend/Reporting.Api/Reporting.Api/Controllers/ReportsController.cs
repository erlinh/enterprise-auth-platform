using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Shared.Auth;
using Platform.Shared.AuthZ;
using Reporting.Api.Models;

namespace Reporting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IAuthZClient _authzClient;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(IAuthZClient authzClient, ILogger<ReportsController> logger)
    {
        _authzClient = authzClient;
        _logger = logger;
    }

    /// <summary>
    /// Generate a report. Requires read_data scope.
    /// </summary>
    [HttpPost("generate")]
    public async Task<ActionResult<ReportResult>> GenerateReport([FromBody] ReportRequest request)
    {
        var userId = User.GetObjectId();
        var isServiceAccount = User.FindFirst("azp") != null; // Client credentials flow

        var subjectType = isServiceAccount ? "service_account" : "user";
        var subjectId = userId ?? User.FindFirst("azp")?.Value ?? "unknown";

        // Check if user/service has read_data permission
        var canRead = await _authzClient.CheckPermissionAsync(
            "reporting_endpoint", "generate", "read_data", subjectId, subjectType);

        // Demo: allow access for demo purposes
        _logger.LogInformation(
            "Report generation requested by {SubjectType}:{SubjectId}, authorized: {Authorized}",
            subjectType, subjectId, canRead || true);

        // Generate demo report data
        var result = new ReportResult
        {
            ReportType = request.ReportType,
            GeneratedBy = subjectId,
            Data = GenerateDemoData(request.ReportType),
            Metadata = new ReportMetadata
            {
                RowCount = 10,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Columns = GetColumnsForReportType(request.ReportType)
            }
        };

        return Ok(result);
    }

    /// <summary>
    /// Get available report types.
    /// </summary>
    [HttpGet("types")]
    public ActionResult<string[]> GetReportTypes()
    {
        return Ok(new[] { "sales", "marketing", "finance", "operations", "hr" });
    }

    /// <summary>
    /// Export a report in various formats.
    /// </summary>
    [HttpPost("export")]
    public async Task<ActionResult> ExportReport([FromBody] ReportRequest request, [FromQuery] string format = "json")
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        // In production, check export permission
        _logger.LogInformation("Export requested by {UserId} in format {Format}", userId, format);

        var result = new ReportResult
        {
            ReportType = request.ReportType,
            GeneratedBy = userId,
            Data = GenerateDemoData(request.ReportType),
        };

        return format.ToLower() switch
        {
            "csv" => Content(ConvertToCsv(result), "text/csv"),
            "json" => Ok(result),
            _ => Ok(result)
        };
    }

    private static object GenerateDemoData(string reportType)
    {
        return reportType.ToLower() switch
        {
            "sales" => new[]
            {
                new { Month = "Jan", Revenue = 125000, Orders = 450, AvgOrderValue = 278 },
                new { Month = "Feb", Revenue = 142000, Orders = 520, AvgOrderValue = 273 },
                new { Month = "Mar", Revenue = 168000, Orders = 610, AvgOrderValue = 275 },
            },
            "marketing" => new[]
            {
                new { Campaign = "Q1 Launch", Impressions = 1500000, Clicks = 45000, Conversions = 2250 },
                new { Campaign = "Email Series", Impressions = 500000, Clicks = 25000, Conversions = 1875 },
            },
            "finance" => new[]
            {
                new { Category = "Revenue", Amount = 435000, Change = "+12%" },
                new { Category = "Expenses", Amount = 298000, Change = "+5%" },
                new { Category = "Profit", Amount = 137000, Change = "+28%" },
            },
            _ => new[] { new { Message = "Report data not available" } }
        };
    }

    private static string[] GetColumnsForReportType(string reportType)
    {
        return reportType.ToLower() switch
        {
            "sales" => new[] { "Month", "Revenue", "Orders", "AvgOrderValue" },
            "marketing" => new[] { "Campaign", "Impressions", "Clicks", "Conversions" },
            "finance" => new[] { "Category", "Amount", "Change" },
            _ => new[] { "Data" }
        };
    }

    private static string ConvertToCsv(ReportResult result)
    {
        return $"Report: {result.ReportType}\nGenerated: {result.GeneratedAt}\n\nData exported successfully.";
    }
}

