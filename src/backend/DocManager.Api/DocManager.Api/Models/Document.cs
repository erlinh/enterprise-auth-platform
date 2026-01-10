namespace DocManager.Api.Models;

public class Folder
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string? ParentId { get; set; }
    public string OrganizationId { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public bool IsOrgVisible { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Document
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string? FolderId { get; set; }
    public string OrganizationId { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string ContentType { get; set; } = "text/plain";
    public long Size { get; set; }
    public bool IsOrgVisible { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class CreateFolderRequest
{
    public string Name { get; set; } = string.Empty;
    public string? ParentId { get; set; }
    public string OrganizationId { get; set; } = string.Empty;
    public bool IsOrgVisible { get; set; }
}

public class CreateDocumentRequest
{
    public string Name { get; set; } = string.Empty;
    public string? FolderId { get; set; }
    public string OrganizationId { get; set; } = string.Empty;
    public string ContentType { get; set; } = "text/plain";
    public long Size { get; set; }
    public bool IsOrgVisible { get; set; }
}

public class ShareRequest
{
    public string UserId { get; set; } = string.Empty;
    public string Permission { get; set; } = "viewer"; // viewer, editor, commenter
}

