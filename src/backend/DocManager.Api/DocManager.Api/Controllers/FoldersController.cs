using DocManager.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Shared.Auth;
using Platform.Shared.AuthZ;

namespace DocManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FoldersController : ControllerBase
{
    private readonly IAuthZClient _authzClient;
    private readonly ILogger<FoldersController> _logger;

    private static readonly List<Folder> Folders = new()
    {
        new Folder
        {
            Id = "folder-shared",
            Name = "Shared Documents",
            OrganizationId = "org-demo",
            OwnerId = "demo-user",
            IsOrgVisible = true
        },
        new Folder
        {
            Id = "folder-projects",
            Name = "Projects",
            OrganizationId = "org-demo",
            OwnerId = "demo-user"
        }
    };

    public FoldersController(IAuthZClient authzClient, ILogger<FoldersController> logger)
    {
        _authzClient = authzClient;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<Folder>>> GetFolders([FromQuery] string? parentId = null)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var folders = parentId == null
            ? Folders.Where(f => f.ParentId == null).ToList()
            : Folders.Where(f => f.ParentId == parentId).ToList();

        // Check access for each folder
        var accessibleFolders = new List<object>();
        foreach (var folder in folders)
        {
            var canView = await _authzClient.CheckPermissionAsync(
                "docmgr_folder", folder.Id, "view", userId);

            accessibleFolders.Add(new
            {
                folder.Id,
                folder.Name,
                folder.ParentId,
                folder.IsOrgVisible,
                folder.CreatedAt,
                HasAccess = canView || folder.IsOrgVisible || folder.OwnerId == userId
            });
        }

        return Ok(accessibleFolders);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Folder>> GetFolder(string id)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var folder = Folders.FirstOrDefault(f => f.Id == id);
        if (folder == null)
            return NotFound();

        return Ok(folder);
    }

    [HttpPost]
    public async Task<ActionResult<Folder>> CreateFolder([FromBody] CreateFolderRequest request)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var folder = new Folder
        {
            Name = request.Name,
            ParentId = request.ParentId,
            OrganizationId = request.OrganizationId,
            OwnerId = userId,
            IsOrgVisible = request.IsOrgVisible
        };

        Folders.Add(folder);

        await _authzClient.WriteRelationshipAsync(
            "docmgr_folder", folder.Id, "owner", userId);

        if (!string.IsNullOrEmpty(request.ParentId))
        {
            await _authzClient.WriteRelationshipAsync(
                "docmgr_folder", folder.Id, "parent", request.ParentId, "docmgr_folder");
        }

        return CreatedAtAction(nameof(GetFolder), new { id = folder.Id }, folder);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteFolder(string id)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var folder = Folders.FirstOrDefault(f => f.Id == id);
        if (folder == null)
            return NotFound();

        var canDelete = await _authzClient.CheckPermissionAsync(
            "docmgr_folder", id, "delete", userId);

        if (!canDelete && folder.OwnerId != userId)
            return Forbid();

        Folders.Remove(folder);
        return NoContent();
    }
}

