using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using FlaUI.UIA3;

namespace TiaPortalBridge.Services;

/// <summary>
/// Captures screenshots of the TIA Portal window as base64-encoded PNG images.
/// </summary>
public class ScreenshotService
{
    private readonly ILogger<ScreenshotService> _logger;

    public ScreenshotService(ILogger<ScreenshotService> logger)
    {
        _logger = logger;
    }

    public object Capture(int quality = 80)
    {
        try
        {
            using var automation = new UIA3Automation();
            var processes = Process.GetProcessesByName("Siemens.Automation.Portal");
            if (processes.Length == 0)
            {
                return new { image = "", width = 0, height = 0 };
            }

            var app = FlaUI.Core.Application.Attach(processes[0]);
            var window = app.GetMainWindow(automation, TimeSpan.FromSeconds(5));
            if (window is null)
            {
                return new { image = "", width = 0, height = 0 };
            }

            var rect = window.BoundingRectangle;
            using var bitmap = new Bitmap(rect.Width, rect.Height);
            using (var graphics = Graphics.FromImage(bitmap))
            {
                graphics.CopyFromScreen(rect.X, rect.Y, 0, 0, new Size(rect.Width, rect.Height));
            }

            using var ms = new MemoryStream();
            bitmap.Save(ms, ImageFormat.Png);
            var base64 = Convert.ToBase64String(ms.ToArray());

            return new
            {
                image = base64,
                width = rect.Width,
                height = rect.Height
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Screenshot capture failed");
            return new { image = "", width = 0, height = 0 };
        }
    }
}
