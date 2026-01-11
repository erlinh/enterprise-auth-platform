namespace Catalogue.Api.Models;

/// <summary>
/// Represents an application in the product catalogue.
/// </summary>
public class Application
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string IconUrl { get; set; } = string.Empty;
    public string LaunchUrl { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Active;
    public bool IsFeatured { get; set; }
    public bool IsBeta { get; set; }
    public SsoConfig SsoConfig { get; set; } = new();
}

public class SsoConfig
{
    public string ClientId { get; set; } = string.Empty;
    public string[] Scopes { get; set; } = Array.Empty<string>();
}

public enum ApplicationStatus
{
    Active,
    Maintenance,
    Deprecated,
    ComingSoon
}

