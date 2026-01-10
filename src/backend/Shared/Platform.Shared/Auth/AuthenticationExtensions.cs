using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Identity.Web;

namespace Platform.Shared.Auth;

/// <summary>
/// Extension methods for configuring authentication.
/// </summary>
public static class AuthenticationExtensions
{
    /// <summary>
    /// Adds Microsoft Entra ID JWT Bearer authentication.
    /// </summary>
    public static IServiceCollection AddEntraIdAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var section = configuration.GetSection(EntraIdOptions.SectionName);
        services.Configure<EntraIdOptions>(section);

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddMicrosoftIdentityWebApi(options =>
            {
                configuration.Bind(EntraIdOptions.SectionName, options);
                
                options.TokenValidationParameters.ValidateIssuer = false; // Multi-tenant
                options.TokenValidationParameters.ValidateAudience = true;
                
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = context =>
                    {
                        // Log successful authentication
                        var userId = context.Principal?.GetObjectId();
                        var tenantId = context.Principal?.GetTenantId();
                        
                        context.HttpContext.Items["UserId"] = userId;
                        context.HttpContext.Items["TenantId"] = tenantId;
                        
                        return Task.CompletedTask;
                    },
                    OnAuthenticationFailed = context =>
                    {
                        // Log authentication failures
                        return Task.CompletedTask;
                    }
                };
            }, options =>
            {
                configuration.Bind(EntraIdOptions.SectionName, options);
            });

        return services;
    }

    /// <summary>
    /// Adds Microsoft Entra ID authentication for SPAs using Authorization Code + PKCE.
    /// </summary>
    public static IServiceCollection AddEntraIdAuthenticationForSpa(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        return services.AddEntraIdAuthentication(configuration);
    }
}

