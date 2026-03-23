using TiaPortalBridge.Services;

var builder = WebApplication.CreateBuilder(args);

// Parse port from command line or use default
var port = args.Length > 0 && int.TryParse(args[0], out var p) ? p : 19847;

builder.WebHost.UseUrls($"http://127.0.0.1:{port}");
builder.Services.AddSingleton<OpennessService>();
builder.Services.AddSingleton<UiAutomationService>();
builder.Services.AddSingleton<ScreenshotService>();

var app = builder.Build();

// ── Health ──────────────────────────────────────────────────────────────────
app.MapGet("/health", (OpennessService openness) =>
{
    var health = openness.GetHealth();
    return Results.Ok(health);
});

// ── Project Management ──────────────────────────────────────────────────────
app.MapPost("/project/open", async (HttpContext ctx, OpennessService openness) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<ProjectOpenRequest>();
    if (body?.Path is null) return Results.BadRequest("Missing 'path'");
    var result = openness.OpenProject(body.Path);
    return Results.Ok(result);
});

app.MapPost("/project/close", (OpennessService openness) =>
{
    var result = openness.CloseProject();
    return Results.Ok(result);
});

app.MapPost("/project/save", (OpennessService openness) =>
{
    var result = openness.SaveProject();
    return Results.Ok(result);
});

app.MapGet("/project/tree", (HttpContext ctx, OpennessService openness) =>
{
    var filterPath = ctx.Request.Query["path"].FirstOrDefault();
    var tree = openness.GetProjectTree(filterPath);
    return Results.Ok(tree);
});

// ── Blocks ──────────────────────────────────────────────────────────────────
app.MapGet("/blocks/{name}", (string name, HttpContext ctx, OpennessService openness) =>
{
    var format = ctx.Request.Query["format"].FirstOrDefault();
    var block = openness.GetBlock(name, format);
    return block is not null ? Results.Ok(block) : Results.NotFound();
});

app.MapPut("/blocks/{name}", async (string name, HttpContext ctx, OpennessService openness) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<BlockWriteRequest>();
    if (body?.Source is null) return Results.BadRequest("Missing 'source'");
    var result = openness.WriteBlock(name, body.Source, body.Language);
    return Results.Ok(result);
});

app.MapPost("/blocks/import", async (HttpContext ctx, OpennessService openness) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<BlockImportRequest>();
    if (body?.FilePath is null) return Results.BadRequest("Missing 'filePath'");
    var result = openness.ImportBlock(body.FilePath);
    return Results.Ok(result);
});

app.MapPost("/blocks/{name}/export", async (string name, HttpContext ctx, OpennessService openness) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<BlockExportRequest>();
    if (body?.OutputPath is null) return Results.BadRequest("Missing 'outputPath'");
    var result = openness.ExportBlock(name, body.OutputPath, body.Format);
    return Results.Ok(result);
});

// ── Compile & Download ──────────────────────────────────────────────────────
app.MapPost("/compile", async (HttpContext ctx, OpennessService openness) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<CompileRequest>();
    var result = openness.Compile(body?.Target);
    return Results.Ok(result);
});

app.MapPost("/download", async (HttpContext ctx, OpennessService openness) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<DownloadRequest>();
    if (body?.Target is null) return Results.BadRequest("Missing 'target'");
    var result = openness.Download(body.Target, body.Simulation ?? false);
    return Results.Ok(result);
});

// ── Tags ────────────────────────────────────────────────────────────────────
app.MapGet("/tags/{tableName}", (string tableName, OpennessService openness) =>
{
    var tags = openness.GetTagTable(tableName);
    return Results.Ok(tags);
});

app.MapPut("/tags/{tableName}/{tagName}", async (string tableName, string tagName, HttpContext ctx, OpennessService openness) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<TagUpdateRequest>();
    var result = openness.WriteTag(tableName, tagName, body);
    return Results.Ok(result);
});

// ── Hardware & Diagnostics ──────────────────────────────────────────────────
app.MapGet("/hardware", (OpennessService openness) =>
{
    var devices = openness.GetHardwareConfig();
    return Results.Ok(devices);
});

app.MapGet("/diagnostics", (OpennessService openness) =>
{
    var diagnostics = openness.GetDiagnostics();
    return Results.Ok(diagnostics);
});

// ── UI Automation ───────────────────────────────────────────────────────────
app.MapGet("/ui/screenshot", (HttpContext ctx, ScreenshotService screenshot) =>
{
    var quality = int.TryParse(ctx.Request.Query["quality"].FirstOrDefault(), out var q) ? q : 80;
    var result = screenshot.Capture(quality);
    return Results.Ok(result);
});

app.MapPost("/ui/click", async (HttpContext ctx, UiAutomationService ui) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<ClickRequest>();
    if (body is null) return Results.BadRequest("Missing body");
    var result = ui.Click(body.X, body.Y);
    return Results.Ok(result);
});

app.MapPost("/ui/double-click", async (HttpContext ctx, UiAutomationService ui) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<ClickRequest>();
    if (body is null) return Results.BadRequest("Missing body");
    var result = ui.DoubleClick(body.X, body.Y);
    return Results.Ok(result);
});

app.MapPost("/ui/right-click", async (HttpContext ctx, UiAutomationService ui) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<ClickRequest>();
    if (body is null) return Results.BadRequest("Missing body");
    var result = ui.RightClick(body.X, body.Y);
    return Results.Ok(result);
});

app.MapPost("/ui/type", async (HttpContext ctx, UiAutomationService ui) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<TypeRequest>();
    if (body?.Text is null) return Results.BadRequest("Missing 'text'");
    var result = ui.TypeText(body.Text);
    return Results.Ok(result);
});

app.MapPost("/ui/key", async (HttpContext ctx, UiAutomationService ui) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<KeyRequest>();
    if (body?.Keys is null) return Results.BadRequest("Missing 'keys'");
    var result = ui.KeyPress(body.Keys);
    return Results.Ok(result);
});

app.MapPost("/ui/find", async (HttpContext ctx, UiAutomationService ui) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<FindElementRequest>();
    if (body?.Query is null) return Results.BadRequest("Missing 'query'");
    var elements = ui.FindElement(body.Query, body.By);
    return Results.Ok(elements);
});

app.MapPost("/ui/menu", async (HttpContext ctx, UiAutomationService ui) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<MenuClickRequest>();
    if (body?.Path is null) return Results.BadRequest("Missing 'path'");
    var result = ui.MenuClick(body.Path);
    return Results.Ok(result);
});

app.Run();

// ── Request DTOs ────────────────────────────────────────────────────────────
record ProjectOpenRequest(string? Path);
record BlockWriteRequest(string? Source, string? Language);
record BlockImportRequest(string? FilePath);
record BlockExportRequest(string? OutputPath, string? Format);
record CompileRequest(string? Target);
record DownloadRequest(string? Target, bool? Simulation);
record TagUpdateRequest(string? DataType, string? Address, string? Comment);
record ClickRequest(int X, int Y);
record TypeRequest(string? Text);
record KeyRequest(string? Keys);
record FindElementRequest(string? Query, string? By);
record MenuClickRequest(string? Path);
