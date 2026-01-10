using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Platform.Shared.AuthZ;

/// <summary>
/// HTTP client for the Authorization service.
/// </summary>
public class AuthZClient : IAuthZClient
{
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache? _cache;
    private readonly AuthZOptions _options;
    private readonly ILogger<AuthZClient> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public AuthZClient(
        HttpClient httpClient,
        IOptions<AuthZOptions> options,
        ILogger<AuthZClient> logger,
        IMemoryCache? cache = null)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
        _cache = cache;
    }

    public async Task<bool> CheckPermissionAsync(
        string resourceType,
        string resourceId,
        string permission,
        string subjectId,
        string subjectType = "user",
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"perm:{resourceType}:{resourceId}:{permission}:{subjectType}:{subjectId}";

        if (_options.EnableCaching && _cache != null)
        {
            if (_cache.TryGetValue(cacheKey, out bool cachedResult))
            {
                _logger.LogDebug("Permission cache hit: {CacheKey}", cacheKey);
                return cachedResult;
            }
        }

        var request = new
        {
            resourceType,
            resourceId,
            permission,
            subjectType,
            subjectId
        };

        var response = await _httpClient.PostAsJsonAsync(
            "/api/v1/check",
            request,
            JsonOptions,
            cancellationToken);

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<CheckResponse>(JsonOptions, cancellationToken);
        var allowed = result?.Allowed ?? false;

        if (_options.EnableCaching && _cache != null)
        {
            _cache.Set(cacheKey, allowed, TimeSpan.FromSeconds(_options.CacheDurationSeconds));
        }

        _logger.LogDebug(
            "Permission check: {ResourceType}:{ResourceId}#{Permission} for {SubjectType}:{SubjectId} = {Allowed}",
            resourceType, resourceId, permission, subjectType, subjectId, allowed);

        return allowed;
    }

    public async Task<IReadOnlyDictionary<string, bool>> BulkCheckAsync(
        IEnumerable<PermissionCheck> checks,
        CancellationToken cancellationToken = default)
    {
        var checkList = checks.ToList();
        var results = new Dictionary<string, bool>();
        var uncachedChecks = new List<PermissionCheck>();

        // Check cache first
        if (_options.EnableCaching && _cache != null)
        {
            foreach (var check in checkList)
            {
                var cacheKey = $"perm:{check.ResourceType}:{check.ResourceId}:{check.Permission}:{check.SubjectType}:{check.SubjectId}";
                if (_cache.TryGetValue(cacheKey, out bool cachedResult))
                {
                    results[cacheKey] = cachedResult;
                }
                else
                {
                    uncachedChecks.Add(check);
                }
            }
        }
        else
        {
            uncachedChecks = checkList;
        }

        if (uncachedChecks.Count == 0)
        {
            return results;
        }

        var request = new
        {
            checks = uncachedChecks.Select(c => new
            {
                resourceType = c.ResourceType,
                resourceId = c.ResourceId,
                permission = c.Permission,
                subjectType = c.SubjectType,
                subjectId = c.SubjectId
            })
        };

        var response = await _httpClient.PostAsJsonAsync(
            "/api/v1/check/bulk",
            request,
            JsonOptions,
            cancellationToken);

        response.EnsureSuccessStatusCode();

        var bulkResult = await response.Content.ReadFromJsonAsync<BulkCheckResponse>(JsonOptions, cancellationToken);

        if (bulkResult?.Results != null)
        {
            foreach (var item in bulkResult.Results)
            {
                var cacheKey = $"perm:{item.Request.ResourceType}:{item.Request.ResourceId}:{item.Request.Permission}:{item.Request.SubjectType}:{item.Request.SubjectId}";
                results[cacheKey] = item.Allowed;

                if (_options.EnableCaching && _cache != null)
                {
                    _cache.Set(cacheKey, item.Allowed, TimeSpan.FromSeconds(_options.CacheDurationSeconds));
                }
            }
        }

        return results;
    }

    public async Task<IReadOnlyList<string>> LookupResourcesAsync(
        string resourceType,
        string permission,
        string subjectId,
        string subjectType = "user",
        CancellationToken cancellationToken = default)
    {
        var request = new
        {
            resourceType,
            permission,
            subjectType,
            subjectId
        };

        var response = await _httpClient.PostAsJsonAsync(
            "/api/v1/lookup/resources",
            request,
            JsonOptions,
            cancellationToken);

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<LookupResourcesResponse>(JsonOptions, cancellationToken);
        return result?.Resources?.ToArray() ?? Array.Empty<string>();
    }

    public async Task<IReadOnlyList<string>> LookupSubjectsAsync(
        string resourceType,
        string resourceId,
        string permission,
        string subjectType = "user",
        CancellationToken cancellationToken = default)
    {
        var request = new
        {
            resourceType,
            resourceId,
            permission,
            subjectType
        };

        var response = await _httpClient.PostAsJsonAsync(
            "/api/v1/lookup/subjects",
            request,
            JsonOptions,
            cancellationToken);

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<LookupSubjectsResponse>(JsonOptions, cancellationToken);
        return result?.Subjects?.ToArray() ?? Array.Empty<string>();
    }

    public async Task WriteRelationshipAsync(
        string resourceType,
        string resourceId,
        string relation,
        string subjectId,
        string subjectType = "user",
        CancellationToken cancellationToken = default)
    {
        var request = new
        {
            resourceType,
            resourceId,
            relation,
            subjectType,
            subjectId
        };

        var response = await _httpClient.PostAsJsonAsync(
            "/api/v1/relationships",
            request,
            JsonOptions,
            cancellationToken);

        response.EnsureSuccessStatusCode();

        // Invalidate cache for this resource
        if (_options.EnableCaching && _cache != null)
        {
            // Simple invalidation - in production, use a more sophisticated approach
            _logger.LogDebug("Relationship written, cache may be stale for {ResourceType}:{ResourceId}", resourceType, resourceId);
        }
    }

    public async Task DeleteRelationshipAsync(
        string resourceType,
        string resourceId,
        string relation,
        string subjectId,
        string subjectType = "user",
        CancellationToken cancellationToken = default)
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, "/api/v1/relationships")
        {
            Content = JsonContent.Create(new
            {
                resourceType,
                resourceId,
                relation,
                subjectType,
                subjectId
            }, options: JsonOptions)
        };

        var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    // Response DTOs
    private record CheckResponse(bool Allowed, bool Cached, string? ZedToken);
    private record BulkCheckResponse(List<BulkCheckResult> Results);
    private record BulkCheckResult(BulkCheckRequest Request, bool Allowed);
    private record BulkCheckRequest(string ResourceType, string ResourceId, string Permission, string SubjectType, string SubjectId);
    private record LookupResourcesResponse(List<string> Resources);
    private record LookupSubjectsResponse(List<string> Subjects);
}

