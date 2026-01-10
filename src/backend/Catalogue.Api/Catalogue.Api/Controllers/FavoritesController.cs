using Catalogue.Api.Models;
using Catalogue.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Shared.Auth;

namespace Catalogue.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FavoritesController : ControllerBase
{
    private readonly ICatalogueService _catalogueService;

    public FavoritesController(ICatalogueService catalogueService)
    {
        _catalogueService = catalogueService;
    }

    /// <summary>
    /// Get the current user's favorite applications.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<UserFavorites>> GetFavorites()
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var favorites = await _catalogueService.GetFavoritesAsync(userId);
        return Ok(favorites);
    }

    /// <summary>
    /// Set the current user's favorite applications.
    /// </summary>
    [HttpPut]
    public async Task<ActionResult> SetFavorites([FromBody] SetFavoritesRequest request)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        await _catalogueService.SetFavoritesAsync(userId, request.ApplicationIds);
        return NoContent();
    }

    /// <summary>
    /// Add an application to favorites.
    /// </summary>
    [HttpPost("{applicationId}")]
    public async Task<ActionResult> AddFavorite(string applicationId)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var favorites = await _catalogueService.GetFavoritesAsync(userId);
        if (!favorites.ApplicationIds.Contains(applicationId))
        {
            favorites.ApplicationIds.Add(applicationId);
            await _catalogueService.SetFavoritesAsync(userId, favorites.ApplicationIds);
        }

        return NoContent();
    }

    /// <summary>
    /// Remove an application from favorites.
    /// </summary>
    [HttpDelete("{applicationId}")]
    public async Task<ActionResult> RemoveFavorite(string applicationId)
    {
        var userId = User.GetObjectId();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var favorites = await _catalogueService.GetFavoritesAsync(userId);
        favorites.ApplicationIds.Remove(applicationId);
        await _catalogueService.SetFavoritesAsync(userId, favorites.ApplicationIds);

        return NoContent();
    }
}

public class SetFavoritesRequest
{
    public List<string> ApplicationIds { get; set; } = new();
}

