using DocManager.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Shared.Auth;
using Platform.Shared.AuthZ;

namespace DocManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IAuthZClient _authzClient;
    private readonly ILogger<DocumentsController> _logger;

    private static readonly List<Document> Documents = new()
    {
        new Document
        {
            Id = "doc-readme",
            Name = "README.md",
            FolderId = "folder-shared",
            OrganizationId = "org-demo",
            OwnerId = "demo-user",
            ContentType = "text/markdown",
            Size = 1024,
            IsOrgVisible = true
        },
        new Document
        {
            Id = "doc-report",
            Name = "Q4 Report.pdf",
            FolderId = "folder-projects",
            OrganizationId = "org-demo",
            OwnerId = "demo-user",
            ContentType = "application/pdf",
            Size = 2048000
        }
    };

    public DocumentsController(IAuthZClient authzClient, ILogger<DocumentsController> logger)
    {
        _authzClient = authzClient;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<Document>>> GetDocuments([FromQuery] string? folderId = null)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var docs = folderId == null
            ? Documents.Where(d => d.FolderId == null).ToList()
            : Documents.Where(d => d.FolderId == folderId).ToList();

        var accessibleDocs = new List<object>();
        foreach (var doc in docs)
        {
            var canView = await _authzClient.CheckPermissionAsync(
                "docmgr_document", doc.Id, "view", userId);

            accessibleDocs.Add(new
            {
                doc.Id,
                doc.Name,
                doc.FolderId,
                doc.ContentType,
                doc.Size,
                doc.IsOrgVisible,
                doc.CreatedAt,
                doc.UpdatedAt,
                HasAccess = canView || doc.IsOrgVisible || doc.OwnerId == userId
            });
        }

        return Ok(accessibleDocs);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Document>> GetDocument(string id)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var doc = Documents.FirstOrDefault(d => d.Id == id);
        if (doc == null)
            return NotFound();

        return Ok(doc);
    }

    [HttpPost]
    public async Task<ActionResult<Document>> CreateDocument([FromBody] CreateDocumentRequest request)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var doc = new Document
        {
            Name = request.Name,
            FolderId = request.FolderId,
            OrganizationId = request.OrganizationId,
            OwnerId = userId,
            ContentType = request.ContentType,
            Size = request.Size,
            IsOrgVisible = request.IsOrgVisible
        };

        Documents.Add(doc);

        await _authzClient.WriteRelationshipAsync(
            "docmgr_document", doc.Id, "owner", userId);

        if (!string.IsNullOrEmpty(request.FolderId))
        {
            await _authzClient.WriteRelationshipAsync(
                "docmgr_document", doc.Id, "folder", request.FolderId, "docmgr_folder");
        }

        return CreatedAtAction(nameof(GetDocument), new { id = doc.Id }, doc);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateDocument(string id, [FromBody] CreateDocumentRequest request)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var doc = Documents.FirstOrDefault(d => d.Id == id);
        if (doc == null)
            return NotFound();

        var canEdit = await _authzClient.CheckPermissionAsync(
            "docmgr_document", id, "edit", userId);

        if (!canEdit && doc.OwnerId != userId)
            return Forbid();

        doc.Name = request.Name;
        doc.ContentType = request.ContentType;
        doc.Size = request.Size;
        doc.IsOrgVisible = request.IsOrgVisible;
        doc.UpdatedAt = DateTime.UtcNow;

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteDocument(string id)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var doc = Documents.FirstOrDefault(d => d.Id == id);
        if (doc == null)
            return NotFound();

        var canDelete = await _authzClient.CheckPermissionAsync(
            "docmgr_document", id, "delete", userId);

        if (!canDelete && doc.OwnerId != userId)
            return Forbid();

        Documents.Remove(doc);
        return NoContent();
    }

    [HttpPost("{id}/share")]
    public async Task<ActionResult> ShareDocument(string id, [FromBody] ShareRequest request)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var doc = Documents.FirstOrDefault(d => d.Id == id);
        if (doc == null)
            return NotFound();

        var canShare = await _authzClient.CheckPermissionAsync(
            "docmgr_document", id, "share", userId);

        if (!canShare && doc.OwnerId != userId)
            return Forbid();

        await _authzClient.WriteRelationshipAsync(
            "docmgr_document", id, request.Permission, request.UserId);

        _logger.LogInformation(
            "Document {DocumentId} shared with {TargetUserId} as {Permission}",
            id, request.UserId, request.Permission);

        return NoContent();
    }
}

