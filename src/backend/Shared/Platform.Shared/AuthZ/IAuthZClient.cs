namespace Platform.Shared.AuthZ;

/// <summary>
/// Client interface for the Authorization service.
/// </summary>
public interface IAuthZClient
{
    /// <summary>
    /// Checks if a subject has a permission on a resource.
    /// </summary>
    Task<bool> CheckPermissionAsync(
        string resourceType,
        string resourceId,
        string permission,
        string subjectId,
        string subjectType = "user",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks multiple permissions in a single request.
    /// </summary>
    Task<IReadOnlyDictionary<string, bool>> BulkCheckAsync(
        IEnumerable<PermissionCheck> checks,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Looks up all resources of a type that a subject can access with a permission.
    /// </summary>
    Task<IReadOnlyList<string>> LookupResourcesAsync(
        string resourceType,
        string permission,
        string subjectId,
        string subjectType = "user",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Looks up all subjects that have a permission on a resource.
    /// </summary>
    Task<IReadOnlyList<string>> LookupSubjectsAsync(
        string resourceType,
        string resourceId,
        string permission,
        string subjectType = "user",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Writes a relationship between a resource and subject.
    /// </summary>
    Task WriteRelationshipAsync(
        string resourceType,
        string resourceId,
        string relation,
        string subjectId,
        string subjectType = "user",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a relationship between a resource and subject.
    /// </summary>
    Task DeleteRelationshipAsync(
        string resourceType,
        string resourceId,
        string relation,
        string subjectId,
        string subjectType = "user",
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Represents a single permission check in a bulk request.
/// </summary>
public record PermissionCheck(
    string ResourceType,
    string ResourceId,
    string Permission,
    string SubjectId,
    string SubjectType = "user");

