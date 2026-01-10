namespace Platform.Shared.Auth;

/// <summary>
/// Configuration options for Microsoft Entra ID authentication.
/// </summary>
public class EntraIdOptions
{
    public const string SectionName = "AzureAd";

    /// <summary>
    /// The Azure AD tenant ID. Use "organizations" for multi-tenant apps.
    /// </summary>
    public string TenantId { get; set; } = "organizations";

    /// <summary>
    /// The application (client) ID from the app registration.
    /// </summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>
    /// The client secret (only for confidential clients).
    /// </summary>
    public string? ClientSecret { get; set; }

    /// <summary>
    /// The Azure AD instance. Defaults to Azure public cloud.
    /// </summary>
    public string Instance { get; set; } = "https://login.microsoftonline.com/";

    /// <summary>
    /// The audience for token validation. Defaults to the client ID.
    /// </summary>
    public string? Audience { get; set; }

    /// <summary>
    /// Whether to validate the issuer. Set to false for multi-tenant apps.
    /// </summary>
    public bool ValidateIssuer { get; set; } = false;
}

