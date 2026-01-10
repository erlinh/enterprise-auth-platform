namespace Platform.Shared.AuthZ;

/// <summary>
/// Configuration options for the Authorization service client.
/// </summary>
public class AuthZOptions
{
    public const string SectionName = "AuthZ";

    /// <summary>
    /// The base URL of the Authorization service.
    /// </summary>
    public string ServiceUrl { get; set; } = "http://localhost:3010";

    /// <summary>
    /// Timeout for authorization requests in seconds.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 5;

    /// <summary>
    /// Whether to cache permission results locally.
    /// </summary>
    public bool EnableCaching { get; set; } = true;

    /// <summary>
    /// Local cache duration in seconds.
    /// </summary>
    public int CacheDurationSeconds { get; set; } = 30;
}

