using Microsoft.Extensions.Options;
using Microsoft.OpenApi.Models;
using System.Configuration;
using System.Reflection;
using WebApplication1.Helpers;
using WebApplication1.Models;
using WebApplication1.Services;

var builder = WebApplication.CreateBuilder(args);
var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";
var config = new ConfigurationBuilder()
        .AddJsonFile("appsettings.json", optional: false)
        .Build();
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
                      builder =>
                      {
                          builder.AllowAnyOrigin().AllowAnyHeader();
                      });
});
// Add dbContext
builder.Services.AddDbContext<DBContext>();

// add options configuation
builder.Services.Configure<DatabaseConnectionOptions>(config.GetSection("ConnectionStrings"));


builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
// service/interface 相依綁定
builder.Services.AddScoped<IGetIgDataService, GetIgDataService>();
builder.Services.AddScoped<IGetTokenService, GetTokenService>();
builder.Services.AddScoped<IExtendTokenService, ExtendTokenService>();
builder.Services.AddScoped<IArtistService, ArtistService>();
// 註冊 Swagger 產生器
builder.Services.AddSwaggerGen(options =>
{
    // API 服務簡介
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Version = "v1",
        Title = "IGallery API",
        Description = "Provide Powerful APIs for IGallery!",
        TermsOfService = new Uri("https://github.com/Feilian1999/IGallery"),
        Contact = new OpenApiContact
        {
            Name = "IGallery Team",
            Email = "leo000111444@gmail.com",
            Url = new Uri("https://github.com/Feilian1999/IGallery"),
        }
    });

    options.AddSecurityDefinition("Bearer",
    new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT Authorization"
    });

    options.AddSecurityRequirement(
    new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });

    // 讀取 XML 檔案產生 API 說明
    //var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    //var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    //options.IncludeXmlComments(xmlPath);
});


var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors(MyAllowSpecificOrigins);
app.UseAuthorization();

app.MapControllers();

app.Run();
