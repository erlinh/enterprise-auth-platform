namespace Catalogue.Api.Models;

/// <summary>
/// DTO for returning application data to clients.
/// </summary>
public class ApplicationDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string IconUrl { get; set; } = string.Empty;
    public string LaunchUrl { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool IsFeatured { get; set; }
    public bool IsBeta { get; set; }
    public UserAccessLevel AccessLevel { get; set; }
}

/// <summary>
/// Represents the user's access level to an application.
/// </summary>
public class UserAccessLevel
{
    public bool CanLaunch { get; set; }
    public bool CanAdmin { get; set; }
    public string PermissionSummary { get; set; } = string.Empty;
}

/// <summary>
/// Response containing a list of applications with metadata.
/// </summary>
public class ApplicationListResponse
{
    public List<ApplicationDto> Applications { get; set; } = new();
    public int TotalCount { get; set; }
    public Dictionary<string, int> CategoryCounts { get; set; } = new();
}

/// <summary>
/// User's favorite applications.
/// </summary>
public class UserFavorites
{
    public string UserId { get; set; } = string.Empty;
    public List<string> ApplicationIds { get; set; } = new();
    public DateTime UpdatedAt { get; set; }
}

