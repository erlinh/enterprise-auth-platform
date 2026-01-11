using Catalogue.Api.Models;

namespace Catalogue.Api.Services;

/// <summary>
/// In-memory repository for applications. In production, this would be backed by a database.
/// </summary>
public interface IApplicationRepository
{
    Task<IEnumerable<Application>> GetAllAsync();
    Task<Application?> GetByIdAsync(string id);
    Task<IEnumerable<Application>> GetByCategoryAsync(string category);
    Task<IEnumerable<string>> GetCategoriesAsync();
}

public class InMemoryApplicationRepository : IApplicationRepository
{
    private static readonly List<Application> Applications = new()
    {
        new Application
        {
            Id = "analytics-dashboard",
            Name = "Analytics Dashboard",
            Description = "Business intelligence and reporting tool with customizable dashboards",
            IconUrl = "📊",
            LaunchUrl = "http://localhost:3001",
            Category = "Analytics",
            Status = ApplicationStatus.Active,
            IsFeatured = true,
            SsoConfig = new SsoConfig
            {
                ClientId = "analytics-client",
                Scopes = new[] { "analytics.read", "analytics.write" }
            }
        },
        new Application
        {
            Id = "document-manager",
            Name = "Document Manager",
            Description = "Document storage and collaboration with folder hierarchy and sharing",
            IconUrl = "📁",
            LaunchUrl = "http://localhost:3002",
            Category = "Productivity",
            Status = ApplicationStatus.Active,
            IsFeatured = true,
            SsoConfig = new SsoConfig
            {
                ClientId = "docmgr-client",
                Scopes = new[] { "documents.read", "documents.write" }
            }
        },
        new Application
        {
            Id = "reporting-api",
            Name = "Reporting API",
            Description = "RESTful APIs for enterprise data reporting and integration",
            IconUrl = "📡",
            LaunchUrl = "http://localhost:3003",
            Category = "Developer Tools",
            Status = ApplicationStatus.Active,
            SsoConfig = new SsoConfig
            {
                ClientId = "reporting-client",
                Scopes = new[] { "reporting.read", "reporting.write", "reporting.admin" }
            }
        },
        new Application
        {
            Id = "admin-portal",
            Name = "Admin Portal",
            Description = "Platform administration for managing users, organizations, and permissions",
            IconUrl = "⚙️",
            LaunchUrl = "http://localhost:3005",
            Category = "Administration",
            Status = ApplicationStatus.Active,
            SsoConfig = new SsoConfig
            {
                ClientId = "admin-client",
                Scopes = new[] { "platform.admin" }
            }
        },
        new Application
        {
            Id = "spicedb-admin",
            Name = "SpiceDB Admin",
            Description = "Manage authorization schema, users, organizations, and permissions",
            IconUrl = "🛡️",
            LaunchUrl = "http://localhost:3020",
            Category = "Administration",
            Status = ApplicationStatus.Active,
            SsoConfig = new SsoConfig
            {
                ClientId = "spicedb-admin-client",
                Scopes = new[] { "authz.admin" }
            }
        },
        new Application
        {
            Id = "team-calendar",
            Name = "Team Calendar",
            Description = "Shared calendar for team scheduling and event management",
            IconUrl = "📅",
            LaunchUrl = "http://localhost:3004",
            Category = "Productivity",
            Status = ApplicationStatus.ComingSoon,
            SsoConfig = new SsoConfig
            {
                ClientId = "calendar-client",
                Scopes = new[] { "calendar.read", "calendar.write" }
            }
        },
        new Application
        {
            Id = "expense-tracker",
            Name = "Expense Tracker",
            Description = "Track and manage business expenses with approval workflows",
            IconUrl = "💰",
            LaunchUrl = "http://localhost:3006",
            Category = "Finance",
            Status = ApplicationStatus.ComingSoon,
            IsBeta = true,
            SsoConfig = new SsoConfig
            {
                ClientId = "expense-client",
                Scopes = new[] { "expenses.read", "expenses.write" }
            }
        }
    };

    public Task<IEnumerable<Application>> GetAllAsync()
    {
        return Task.FromResult<IEnumerable<Application>>(Applications);
    }

    public Task<Application?> GetByIdAsync(string id)
    {
        var app = Applications.FirstOrDefault(a => a.Id == id);
        return Task.FromResult(app);
    }

    public Task<IEnumerable<Application>> GetByCategoryAsync(string category)
    {
        var apps = Applications.Where(a => a.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
        return Task.FromResult(apps);
    }

    public Task<IEnumerable<string>> GetCategoriesAsync()
    {
        var categories = Applications.Select(a => a.Category).Distinct();
        return Task.FromResult(categories);
    }
}

