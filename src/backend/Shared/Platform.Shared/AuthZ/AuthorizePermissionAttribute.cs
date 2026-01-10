using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using Platform.Shared.Auth;

namespace Platform.Shared.AuthZ;

/// <summary>
/// Attribute for declarative permission-based authorization.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class AuthorizePermissionAttribute : Attribute, IAsyncAuthorizationFilter
{
    public string ResourceType { get; }
    public string Permission { get; }
    public string? ResourceIdRouteParam { get; set; }
    public string? ResourceIdQueryParam { get; set; }
    public string? StaticResourceId { get; set; }

    public AuthorizePermissionAttribute(string resourceType, string permission)
    {
        ResourceType = resourceType;
        Permission = permission;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        if (!user.Identity?.IsAuthenticated ?? true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var userId = user.GetObjectId();
        if (string.IsNullOrEmpty(userId))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        // Get resource ID from route, query, or static value
        string? resourceId = StaticResourceId;

        if (!string.IsNullOrEmpty(ResourceIdRouteParam))
        {
            resourceId = context.RouteData.Values[ResourceIdRouteParam]?.ToString();
        }
        else if (!string.IsNullOrEmpty(ResourceIdQueryParam))
        {
            resourceId = context.HttpContext.Request.Query[ResourceIdQueryParam].FirstOrDefault();
        }

        if (string.IsNullOrEmpty(resourceId))
        {
            context.Result = new BadRequestObjectResult("Resource ID not provided");
            return;
        }

        var authzClient = context.HttpContext.RequestServices.GetRequiredService<IAuthZClient>();

        var allowed = await authzClient.CheckPermissionAsync(
            ResourceType,
            resourceId,
            Permission,
            userId);

        if (!allowed)
        {
            context.Result = new ForbidResult();
        }
    }
}

