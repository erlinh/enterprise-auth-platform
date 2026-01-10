using System.Security.Claims;

namespace Platform.Shared.Auth;

/// <summary>
/// Extension methods for extracting claims from ClaimsPrincipal.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Gets the user's Object ID (oid claim) - the primary identifier for SpiceDB.
    /// </summary>
    public static string? GetObjectId(this ClaimsPrincipal principal)
    {
        return principal.FindFirstValue("oid") 
            ?? principal.FindFirstValue("http://schemas.microsoft.com/identity/claims/objectidentifier");
    }

    /// <summary>
    /// Gets the user's Tenant ID (tid claim).
    /// </summary>
    public static string? GetTenantId(this ClaimsPrincipal principal)
    {
        return principal.FindFirstValue("tid")
            ?? principal.FindFirstValue("http://schemas.microsoft.com/identity/claims/tenantid");
    }

    /// <summary>
    /// Gets the Identity Provider (idp claim) - indicates federated users.
    /// </summary>
    public static string? GetIdentityProvider(this ClaimsPrincipal principal)
    {
        return principal.FindFirstValue("idp")
            ?? principal.FindFirstValue("http://schemas.microsoft.com/identity/claims/identityprovider");
    }

    /// <summary>
    /// Gets the user's email or UPN.
    /// </summary>
    public static string? GetEmail(this ClaimsPrincipal principal)
    {
        return principal.FindFirstValue("preferred_username")
            ?? principal.FindFirstValue(ClaimTypes.Email)
            ?? principal.FindFirstValue("email")
            ?? principal.FindFirstValue(ClaimTypes.Upn);
    }

    /// <summary>
    /// Gets the user's display name.
    /// </summary>
    public static string? GetDisplayName(this ClaimsPrincipal principal)
    {
        return principal.FindFirstValue("name")
            ?? principal.FindFirstValue(ClaimTypes.Name);
    }

    /// <summary>
    /// Gets the platform organization ID (custom claim).
    /// </summary>
    public static string? GetPlatformOrgId(this ClaimsPrincipal principal)
    {
        return principal.FindFirstValue("platform_org_id");
    }

    /// <summary>
    /// Gets the federation source (custom claim).
    /// </summary>
    public static string? GetFederationSource(this ClaimsPrincipal principal)
    {
        return principal.FindFirstValue("federation_source");
    }

    /// <summary>
    /// Checks if the user is a federated/external user.
    /// </summary>
    public static bool IsFederatedUser(this ClaimsPrincipal principal)
    {
        var idp = principal.GetIdentityProvider();
        var tid = principal.GetTenantId();
        
        // If idp is different from tid, user is federated
        return !string.IsNullOrEmpty(idp) && idp != tid;
    }

    /// <summary>
    /// Gets the app roles assigned to the user.
    /// </summary>
    public static IEnumerable<string> GetAppRoles(this ClaimsPrincipal principal)
    {
        return principal.FindAll("roles").Select(c => c.Value);
    }

    /// <summary>
    /// Gets the security groups the user belongs to.
    /// </summary>
    public static IEnumerable<string> GetGroups(this ClaimsPrincipal principal)
    {
        return principal.FindAll("groups").Select(c => c.Value);
    }

    /// <summary>
    /// Checks if the user has a specific app role.
    /// </summary>
    public static bool HasAppRole(this ClaimsPrincipal principal, string role)
    {
        return principal.GetAppRoles().Contains(role, StringComparer.OrdinalIgnoreCase);
    }
}

