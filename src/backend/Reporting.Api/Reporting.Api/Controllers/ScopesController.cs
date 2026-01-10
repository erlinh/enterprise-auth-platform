using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Reporting.Api.Models;

namespace Reporting.Api.Controllers;

/// <summary>
/// Information about API scopes for service account configuration.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ScopesController : ControllerBase
{
    /// <summary>
    /// Get available API scopes.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public ActionResult<List<ApiScopeInfo>> GetScopes()
    {
        var scopes = new List<ApiScopeInfo>
        {
            new ApiScopeInfo
            {
                Name = "reporting.read",
                Description = "Read access to generate reports",
                Endpoints = new[] { "POST /api/reports/generate", "GET /api/reports/types" }
            },
            new ApiScopeInfo
            {
                Name = "reporting.write",
                Description = "Write access to create scheduled reports",
                Endpoints = new[] { "POST /api/reports/schedule", "DELETE /api/reports/schedule/{id}" }
            },
            new ApiScopeInfo
            {
                Name = "reporting.export",
                Description = "Export reports in various formats",
                Endpoints = new[] { "POST /api/reports/export" }
            },
            new ApiScopeInfo
            {
                Name = "reporting.admin",
                Description = "Administrative access to manage all reports",
                Endpoints = new[] { "All endpoints" }
            }
        };

        return Ok(scopes);
    }

    /// <summary>
    /// Health check for the Reporting API.
    /// </summary>
    [HttpGet("health")]
    [AllowAnonymous]
    public ActionResult GetHealth()
    {
        return Ok(new
        {
            Status = "Healthy",
            Service = "Reporting API",
            Timestamp = DateTime.UtcNow,
            Features = new[]
            {
                "Client Credentials Flow",
                "On-Behalf-Of Flow",
                "Scope-based Authorization"
            }
        });
    }
}

