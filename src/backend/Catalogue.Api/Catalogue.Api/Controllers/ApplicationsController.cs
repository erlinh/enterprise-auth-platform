using Catalogue.Api.Models;
using Catalogue.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Shared.Auth;

namespace Catalogue.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ApplicationsController : ControllerBase
{
    private readonly ICatalogueService _catalogueService;
    private readonly ILogger<ApplicationsController> _logger;

    public ApplicationsController(
        ICatalogueService catalogueService,
        ILogger<ApplicationsController> logger)
    {
        _catalogueService = catalogueService;
        _logger = logger;
    }

    /// <summary>
    /// Get all applications the current user can access.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApplicationListResponse>> GetApplications([FromQuery] string? category = null)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        _logger.LogInformation("User {UserId} requesting application list", userId);

        var response = await _catalogueService.GetAccessibleApplicationsAsync(userId, category);
        return Ok(response);
    }

    /// <summary>
    /// Get details for a specific application.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApplicationDto>> GetApplication(string id)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var app = await _catalogueService.GetApplicationDetailsAsync(userId, id);
        if (app == null)
        {
            return NotFound();
        }

        return Ok(app);
    }

    /// <summary>
    /// Get available categories.
    /// </summary>
    [HttpGet("categories")]
    public async Task<ActionResult<IEnumerable<string>>> GetCategories(
        [FromServices] IApplicationRepository repository)
    {
        var categories = await repository.GetCategoriesAsync();
        return Ok(categories);
    }

    /// <summary>
    /// Get current user info - useful for debugging auth.
    /// </summary>
    [HttpGet("me")]
    public ActionResult GetCurrentUser()
    {
        var userId = User.GetObjectId();
        var tenantId = User.GetTenantId();
        var claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList();
        
        return Ok(new
        {
            userId,
            tenantId,
            name = User.Identity?.Name,
            isAuthenticated = User.Identity?.IsAuthenticated,
            claims
        });
    }

    /// <summary>
    /// Simple test endpoint that returns hardcoded apps (no SpiceDB).
    /// </summary>
    [HttpGet("simple")]
    public ActionResult GetSimpleApplications()
    {
        var userId = User.GetObjectId() ?? "unknown";
        _logger.LogInformation("Simple endpoint called by user {UserId}", userId);
        
        // Return hardcoded apps for testing
        return Ok(new
        {
            applications = new[]
            {
                new { id = "analytics", name = "Analytics Dashboard", description = "Business intelligence", category = "Analytics" },
                new { id = "docs", name = "Document Manager", description = "Manage documents", category = "Productivity" },
            },
            totalCount = 2,
            userId
        });
    }
}

