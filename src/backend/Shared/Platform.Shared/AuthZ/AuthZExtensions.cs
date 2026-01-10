using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Platform.Shared.AuthZ;

/// <summary>
/// Extension methods for configuring the Authorization client.
/// </summary>
public static class AuthZExtensions
{
    /// <summary>
    /// Adds the Authorization client to the service collection.
    /// </summary>
    public static IServiceCollection AddAuthZClient(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var section = configuration.GetSection(AuthZOptions.SectionName);
        services.Configure<AuthZOptions>(section);

        var options = section.Get<AuthZOptions>() ?? new AuthZOptions();

        services.AddMemoryCache();

        services.AddHttpClient<IAuthZClient, AuthZClient>(client =>
        {
            client.BaseAddress = new Uri(options.ServiceUrl);
            client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
        });

        return services;
    }
}

