using Catalogue.Api.Services;
using Platform.Shared.Auth;
using Platform.Shared.AuthZ;

var builder = WebApplication.CreateBuilder(args);

// Add controllers
builder.Services.AddControllers();

// Add authentication
builder.Services.AddEntraIdAuthentication(builder.Configuration);

// Add authorization client
builder.Services.AddAuthZClient(builder.Configuration);

// Add application services
builder.Services.AddSingleton<IApplicationRepository, InMemoryApplicationRepository>();
builder.Services.AddScoped<ICatalogueService, CatalogueService>();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:3000", "http://localhost:5000")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// Add health checks
builder.Services.AddHealthChecks();

var app = builder.Build();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
