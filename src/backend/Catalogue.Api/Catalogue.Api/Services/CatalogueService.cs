using Catalogue.Api.Models;
using Platform.Shared.AuthZ;

namespace Catalogue.Api.Services;

/// <summary>
/// Service for computing accessible applications based on SpiceDB authorization.
/// Users only see applications they have explicit permission to view/launch.
/// </summary>
public interface ICatalogueService
{
    Task<ApplicationListResponse> GetAccessibleApplicationsAsync(string userId, string? category = null);
    Task<ApplicationDto?> GetApplicationDetailsAsync(string userId, string applicationId);
    Task<UserFavorites> GetFavoritesAsync(string userId);
    Task SetFavoritesAsync(string userId, List<string> applicationIds);
}

public class CatalogueService : ICatalogueService
{
    private readonly IApplicationRepository _repository;
    private readonly IAuthZClient _authzClient;
    private readonly ILogger<CatalogueService> _logger;

    // In-memory favorites store - in production, use a database
    private static readonly Dictionary<string, UserFavorites> FavoritesStore = new();

    public CatalogueService(
        IApplicationRepository repository,
        IAuthZClient authzClient,
        ILogger<CatalogueService> logger)
    {
        _repository = repository;
        _authzClient = authzClient;
        _logger = logger;
    }

    public async Task<ApplicationListResponse> GetAccessibleApplicationsAsync(string userId, string? category = null)
    {
        _logger.LogInformation("Getting accessible applications for user {UserId}", userId);

        // Get all applications from repository
        var allApps = await _repository.GetAllAsync();
        if (!string.IsNullOrEmpty(category))
        {
            allApps = allApps.Where(a => a.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
        }

        var appList = allApps.ToList();
        _logger.LogInformation("Found {Count} applications in repository", appList.Count);

        var accessibleApps = new List<ApplicationDto>();
        var categoryCounts = new Dictionary<string, int>();

        // Build permission checks for all apps
        var permissionChecks = appList.SelectMany(app => new[]
        {
            new PermissionCheck("application", app.Id, "can_view_in_catalogue", userId),
            new PermissionCheck("application", app.Id, "can_launch", userId),
            new PermissionCheck("application", app.Id, "manage", userId)
        }).ToList();

        // Check permissions in bulk
        IReadOnlyDictionary<string, bool> permissionResults = new Dictionary<string, bool>();
        try
        {
            permissionResults = await _authzClient.BulkCheckAsync(permissionChecks);
            _logger.LogInformation("Permission check returned {Count} results", permissionResults.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Permission check failed - user will see no applications");
            // Return empty list if permission check fails
            return new ApplicationListResponse
            {
                Applications = new List<ApplicationDto>(),
                TotalCount = 0,
                CategoryCounts = new Dictionary<string, int>()
            };
        }

        // Filter applications based on SpiceDB permissions
        foreach (var app in appList)
        {
            var viewKey = $"perm:application:{app.Id}:can_view_in_catalogue:user:{userId}";
            var launchKey = $"perm:application:{app.Id}:can_launch:user:{userId}";
            var adminKey = $"perm:application:{app.Id}:manage:user:{userId}";

            var canView = permissionResults.TryGetValue(viewKey, out var view) && view;
            var canLaunch = permissionResults.TryGetValue(launchKey, out var launch) && launch;
            var canAdmin = permissionResults.TryGetValue(adminKey, out var admin) && admin;

            _logger.LogDebug("App {AppId}: canView={CanView}, canLaunch={CanLaunch}, canAdmin={CanAdmin}",
                app.Id, canView, canLaunch, canAdmin);

            // User must have can_view_in_catalogue OR can_launch OR manage permission to see the app
            if (!canView && !canLaunch && !canAdmin)
            {
                _logger.LogDebug("User {UserId} does not have access to app {AppId}", userId, app.Id);
                continue;
            }

            accessibleApps.Add(new ApplicationDto
            {
                Id = app.Id,
                Name = app.Name,
                Description = app.Description,
                IconUrl = app.IconUrl,
                LaunchUrl = app.LaunchUrl,
                Category = app.Category,
                Status = app.Status.ToString(),
                IsFeatured = app.IsFeatured,
                IsBeta = app.IsBeta,
                AccessLevel = new UserAccessLevel
                {
                    CanLaunch = canLaunch || canAdmin,
                    CanAdmin = canAdmin,
                    PermissionSummary = canAdmin ? "Full Access" : (canLaunch ? "Standard Access" : "View Only")
                }
            });

            // Count by category
            if (!categoryCounts.ContainsKey(app.Category))
                categoryCounts[app.Category] = 0;
            categoryCounts[app.Category]++;
        }

        _logger.LogInformation("User {UserId} has access to {Count} of {Total} applications",
            userId, accessibleApps.Count, appList.Count);

        return new ApplicationListResponse
        {
            Applications = accessibleApps,
            TotalCount = accessibleApps.Count,
            CategoryCounts = categoryCounts
        };
    }

    public async Task<ApplicationDto?> GetApplicationDetailsAsync(string userId, string applicationId)
    {
        var app = await _repository.GetByIdAsync(applicationId);
        if (app == null)
            return null;

        // Check permissions
        var canView = await _authzClient.CheckPermissionAsync(
            "application", applicationId, "can_view_in_catalogue", userId);

        var canLaunch = await _authzClient.CheckPermissionAsync(
            "application", applicationId, "can_launch", userId);

        var canAdmin = await _authzClient.CheckPermissionAsync(
            "application", applicationId, "manage", userId);

        // User must have at least view permission
        if (!canView && !canLaunch && !canAdmin)
        {
            _logger.LogWarning("User {UserId} attempted to access app {AppId} without permission",
                userId, applicationId);
            return null;
        }

        return new ApplicationDto
        {
            Id = app.Id,
            Name = app.Name,
            Description = app.Description,
            IconUrl = app.IconUrl,
            LaunchUrl = app.LaunchUrl,
            Category = app.Category,
            Status = app.Status.ToString(),
            IsFeatured = app.IsFeatured,
            IsBeta = app.IsBeta,
            AccessLevel = new UserAccessLevel
            {
                CanLaunch = canLaunch || canAdmin,
                CanAdmin = canAdmin,
                PermissionSummary = canAdmin ? "Full Access" : (canLaunch ? "Standard Access" : "View Only")
            }
        };
    }

    public Task<UserFavorites> GetFavoritesAsync(string userId)
    {
        if (FavoritesStore.TryGetValue(userId, out var favorites))
        {
            return Task.FromResult(favorites);
        }

        return Task.FromResult(new UserFavorites
        {
            UserId = userId,
            ApplicationIds = new List<string>(),
            UpdatedAt = DateTime.UtcNow
        });
    }

    public Task SetFavoritesAsync(string userId, List<string> applicationIds)
    {
        FavoritesStore[userId] = new UserFavorites
        {
            UserId = userId,
            ApplicationIds = applicationIds,
            UpdatedAt = DateTime.UtcNow
        };

        return Task.CompletedTask;
    }
}
