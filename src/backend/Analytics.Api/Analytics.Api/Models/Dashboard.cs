namespace Analytics.Api.Models;

public class Dashboard
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public bool IsOrgVisible { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<Widget> Widgets { get; set; } = new();
}

public class Widget
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Type { get; set; } = string.Empty; // chart, table, metric, etc.
    public string Title { get; set; } = string.Empty;
    public object? Config { get; set; }
}

public class CreateDashboardRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public bool IsOrgVisible { get; set; }
}

public class UpdateDashboardRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsOrgVisible { get; set; }
}

public class ShareDashboardRequest
{
    public string UserId { get; set; } = string.Empty;
    public string Permission { get; set; } = "viewer"; // viewer, editor
}

