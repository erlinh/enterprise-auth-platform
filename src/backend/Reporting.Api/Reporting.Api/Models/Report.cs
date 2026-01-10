namespace Reporting.Api.Models;

public class ReportRequest
{
    public string ReportType { get; set; } = string.Empty; // sales, marketing, finance
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? OrganizationId { get; set; }
    public Dictionary<string, string> Parameters { get; set; } = new();
}

public class ReportResult
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ReportType { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public string GeneratedBy { get; set; } = string.Empty;
    public object Data { get; set; } = new { };
    public ReportMetadata Metadata { get; set; } = new();
}

public class ReportMetadata
{
    public int RowCount { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string[] Columns { get; set; } = Array.Empty<string>();
}

public class ApiScopeInfo
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string[] Endpoints { get; set; } = Array.Empty<string>();
}

