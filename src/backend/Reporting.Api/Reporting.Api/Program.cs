using Platform.Shared.Auth;
using Platform.Shared.AuthZ;

var builder = WebApplication.CreateBuilder(args);

// Load local configuration overrides (not committed to git)
builder.Configuration.AddJsonFile("appsettings.local.json", optional: true, reloadOnChange: true);

builder.Services.AddControllers();
builder.Services.AddEntraIdAuthentication(builder.Configuration);
builder.Services.AddAuthZClient(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

builder.Services.AddHealthChecks();

var app = builder.Build();

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
