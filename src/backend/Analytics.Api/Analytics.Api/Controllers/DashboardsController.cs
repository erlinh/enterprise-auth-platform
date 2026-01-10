using Analytics.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Shared.Auth;
using Platform.Shared.AuthZ;

namespace Analytics.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardsController : ControllerBase
{
    private readonly IAuthZClient _authzClient;
    private readonly ILogger<DashboardsController> _logger;

    // In-memory store for demo
    private static readonly List<Dashboard> Dashboards = new()
    {
        new Dashboard
        {
            Id = "dash-sales-2024",
            Name = "Sales Dashboard 2024",
            Description = "Q4 sales performance metrics and KPIs",
            OrganizationId = "org-demo",
            OwnerId = "demo-user",
            IsOrgVisible = true,
            Widgets = new List<Widget>
            {
                new Widget { Type = "chart", Title = "Monthly Revenue" },
                new Widget { Type = "metric", Title = "Total Sales" },
            }
        },
        new Dashboard
        {
            Id = "dash-marketing",
            Name = "Marketing Analytics",
            Description = "Campaign performance and conversion tracking",
            OrganizationId = "org-demo",
            OwnerId = "demo-user",
            Widgets = new List<Widget>
            {
                new Widget { Type = "chart", Title = "Campaign ROI" },
                new Widget { Type = "table", Title = "Top Campaigns" },
            }
        }
    };

    public DashboardsController(IAuthZClient authzClient, ILogger<DashboardsController> logger)
    {
        _authzClient = authzClient;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<Dashboard>>> GetDashboards()
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        // Get all dashboards the user can view
        var accessibleIds = await _authzClient.LookupResourcesAsync(
            "analytics_dashboard", "view", userId);

        // For demo, return all dashboards but mark which ones user has access to
        var result = Dashboards.Select(d => new
        {
            d.Id,
            d.Name,
            d.Description,
            d.OrganizationId,
            d.CreatedAt,
            d.UpdatedAt,
            d.IsOrgVisible,
            WidgetCount = d.Widgets.Count,
            HasAccess = accessibleIds.Contains(d.Id) || true // Demo: allow all
        }).ToList();

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Dashboard>> GetDashboard(string id)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var dashboard = Dashboards.FirstOrDefault(d => d.Id == id);
        if (dashboard == null)
            return NotFound();

        // Check view permission
        var canView = await _authzClient.CheckPermissionAsync(
            "analytics_dashboard", id, "view", userId);

        // Demo: allow access even without explicit permission
        if (!canView)
        {
            _logger.LogInformation("User {UserId} viewing dashboard {DashboardId} (no explicit permission)", userId, id);
        }

        return Ok(dashboard);
    }

    [HttpPost]
    public async Task<ActionResult<Dashboard>> CreateDashboard([FromBody] CreateDashboardRequest request)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var dashboard = new Dashboard
        {
            Name = request.Name,
            Description = request.Description,
            OrganizationId = request.OrganizationId,
            OwnerId = userId,
            IsOrgVisible = request.IsOrgVisible,
        };

        Dashboards.Add(dashboard);

        // Create owner relationship in SpiceDB
        await _authzClient.WriteRelationshipAsync(
            "analytics_dashboard", dashboard.Id, "owner", userId);

        if (!string.IsNullOrEmpty(request.OrganizationId))
        {
            await _authzClient.WriteRelationshipAsync(
                "analytics_dashboard", dashboard.Id, "organization", request.OrganizationId, "organization");
        }

        _logger.LogInformation("Dashboard {DashboardId} created by {UserId}", dashboard.Id, userId);

        return CreatedAtAction(nameof(GetDashboard), new { id = dashboard.Id }, dashboard);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateDashboard(string id, [FromBody] UpdateDashboardRequest request)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var dashboard = Dashboards.FirstOrDefault(d => d.Id == id);
        if (dashboard == null)
            return NotFound();

        // Check edit permission
        var canEdit = await _authzClient.CheckPermissionAsync(
            "analytics_dashboard", id, "edit", userId);

        if (!canEdit)
        {
            // Demo: check if user is owner
            if (dashboard.OwnerId != userId)
            {
                return Forbid();
            }
        }

        dashboard.Name = request.Name;
        dashboard.Description = request.Description;
        dashboard.IsOrgVisible = request.IsOrgVisible;
        dashboard.UpdatedAt = DateTime.UtcNow;

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteDashboard(string id)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var dashboard = Dashboards.FirstOrDefault(d => d.Id == id);
        if (dashboard == null)
            return NotFound();

        var canDelete = await _authzClient.CheckPermissionAsync(
            "analytics_dashboard", id, "delete", userId);

        if (!canDelete && dashboard.OwnerId != userId)
        {
            return Forbid();
        }

        Dashboards.Remove(dashboard);
        _logger.LogInformation("Dashboard {DashboardId} deleted by {UserId}", id, userId);

        return NoContent();
    }

    [HttpPost("{id}/share")]
    public async Task<ActionResult> ShareDashboard(string id, [FromBody] ShareDashboardRequest request)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var dashboard = Dashboards.FirstOrDefault(d => d.Id == id);
        if (dashboard == null)
            return NotFound();

        var canShare = await _authzClient.CheckPermissionAsync(
            "analytics_dashboard", id, "share", userId);

        if (!canShare && dashboard.OwnerId != userId)
        {
            return Forbid();
        }

        // Add relationship for the shared user
        await _authzClient.WriteRelationshipAsync(
            "analytics_dashboard", id, request.Permission, request.UserId);

        _logger.LogInformation(
            "Dashboard {DashboardId} shared with {TargetUserId} as {Permission} by {UserId}",
            id, request.UserId, request.Permission, userId);

        return NoContent();
    }
}

