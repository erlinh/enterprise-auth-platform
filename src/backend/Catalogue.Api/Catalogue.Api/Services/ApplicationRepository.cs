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
            IconUrl = "/icons/analytics.svg",
            LaunchUrl = "/analytics",
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
            IconUrl = "/icons/documents.svg",
            LaunchUrl = "/documents",
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
            Description = "API for data aggregation and report generation",
            IconUrl = "/icons/api.svg",
            LaunchUrl = "/api-docs/reporting",
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
            IconUrl = "/icons/admin.svg",
            LaunchUrl = "/admin",
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
            Id = "team-calendar",
            Name = "Team Calendar",
            Description = "Shared calendar for team scheduling and event management",
            IconUrl = "/icons/calendar.svg",
            LaunchUrl = "/calendar",
            Category = "Productivity",
            Status = ApplicationStatus.Active,
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
            IconUrl = "/icons/expense.svg",
            LaunchUrl = "/expenses",
            Category = "Finance",
            Status = ApplicationStatus.Active,
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

