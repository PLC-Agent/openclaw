using System.Diagnostics;
using FlaUI.Core.AutomationElements;
using FlaUI.Core.Conditions;
using FlaUI.Core.Input;
using FlaUI.UIA3;

namespace TiaPortalBridge.Services;

/// <summary>
/// UI Automation service using FlaUI to interact with the TIA Portal desktop application.
/// Provides click, type, keyboard, element search, and menu navigation.
/// </summary>
public class UiAutomationService
{
    private readonly ILogger<UiAutomationService> _logger;

    public UiAutomationService(ILogger<UiAutomationService> logger)
    {
        _logger = logger;
    }

    private Window? GetTiaPortalWindow()
    {
        using var automation = new UIA3Automation();
        var processes = Process.GetProcessesByName("Siemens.Automation.Portal");
        if (processes.Length == 0)
        {
            _logger.LogWarning("TIA Portal process not found");
            return null;
        }

        var app = FlaUI.Core.Application.Attach(processes[0]);
        return app.GetMainWindow(automation, TimeSpan.FromSeconds(5));
    }

    public object Click(int x, int y)
    {
        try
        {
            var window = GetTiaPortalWindow();
            if (window is null) return new { success = false };

            var rect = window.BoundingRectangle;
            Mouse.Click(new System.Drawing.Point(rect.X + x, rect.Y + y));
            return new { success = true };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Click failed at ({X},{Y})", x, y);
            return new { success = false };
        }
    }

    public object DoubleClick(int x, int y)
    {
        try
        {
            var window = GetTiaPortalWindow();
            if (window is null) return new { success = false };

            var rect = window.BoundingRectangle;
            Mouse.DoubleClick(new System.Drawing.Point(rect.X + x, rect.Y + y));
            return new { success = true };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Double-click failed at ({X},{Y})", x, y);
            return new { success = false };
        }
    }

    public object RightClick(int x, int y)
    {
        try
        {
            var window = GetTiaPortalWindow();
            if (window is null) return new { success = false };

            var rect = window.BoundingRectangle;
            Mouse.RightClick(new System.Drawing.Point(rect.X + x, rect.Y + y));
            return new { success = true };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Right-click failed at ({X},{Y})", x, y);
            return new { success = false };
        }
    }

    public object TypeText(string text)
    {
        try
        {
            Keyboard.Type(text);
            return new { success = true };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Type failed");
            return new { success = false };
        }
    }

    public object KeyPress(string keys)
    {
        try
        {
            // Parse key combination like "Ctrl+S", "F7", "Ctrl+Shift+D"
            var parts = keys.Split('+', StringSplitOptions.TrimEntries);
            var virtualKeys = new List<FlaUI.Core.WindowsAPI.VirtualKeyShort>();

            foreach (var part in parts)
            {
                var key = part.ToUpperInvariant() switch
                {
                    "CTRL" or "CONTROL" => FlaUI.Core.WindowsAPI.VirtualKeyShort.CONTROL,
                    "SHIFT" => FlaUI.Core.WindowsAPI.VirtualKeyShort.SHIFT,
                    "ALT" => FlaUI.Core.WindowsAPI.VirtualKeyShort.ALT,
                    "ENTER" or "RETURN" => FlaUI.Core.WindowsAPI.VirtualKeyShort.RETURN,
                    "TAB" => FlaUI.Core.WindowsAPI.VirtualKeyShort.TAB,
                    "ESCAPE" or "ESC" => FlaUI.Core.WindowsAPI.VirtualKeyShort.ESCAPE,
                    "DELETE" or "DEL" => FlaUI.Core.WindowsAPI.VirtualKeyShort.DELETE,
                    "BACKSPACE" => FlaUI.Core.WindowsAPI.VirtualKeyShort.BACK,
                    "F1" => FlaUI.Core.WindowsAPI.VirtualKeyShort.F1,
                    "F2" => FlaUI.Core.WindowsAPI.VirtualKeyShort.F2,
                    "F3" => FlaUI.Core.WindowsAPI.VirtualKeyShort.F3,
                    "F4" => FlaUI.Core.WindowsAPI.VirtualKeyShort.F4,
                    "F5" => FlaUI.Core.WindowsAPI.VirtualKeyShort.F5,
                    "F6" => FlaUI.Core.WindowsAPI.VirtualKeyShort.F6,
                    "F7" => FlaUI.Core.WindowsAPI.VirtualKeyShort.F7,
                    "F8" => FlaUI.Core.WindowsAPI.VirtualKeyShort.F8,
                    "F9" => FlaUI.Core.WindowsAPI.VirtualKeyShort.F9,
                    "F10" => FlaUI.Core.WindowsAPI.VirtualKeyShort.F10,
                    "F11" => FlaUI.Core.WindowsAPI.VirtualKeyShort.F11,
                    "F12" => FlaUI.Core.WindowsAPI.VirtualKeyShort.F12,
                    _ when part.Length == 1 => (FlaUI.Core.WindowsAPI.VirtualKeyShort)char.ToUpper(part[0]),
                    _ => throw new ArgumentException($"Unknown key: {part}")
                };
                virtualKeys.Add(key);
            }

            if (virtualKeys.Count == 1)
            {
                Keyboard.Press(virtualKeys[0]);
                Keyboard.Release(virtualKeys[0]);
            }
            else
            {
                // Hold modifiers, press last key, release all
                for (int i = 0; i < virtualKeys.Count - 1; i++)
                    Keyboard.Press(virtualKeys[i]);
                Keyboard.Press(virtualKeys[^1]);
                Keyboard.Release(virtualKeys[^1]);
                for (int i = virtualKeys.Count - 2; i >= 0; i--)
                    Keyboard.Release(virtualKeys[i]);
            }

            return new { success = true };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Key press failed: {Keys}", keys);
            return new { success = false };
        }
    }

    public object FindElement(string query, string? by)
    {
        try
        {
            var window = GetTiaPortalWindow();
            if (window is null) return Array.Empty<object>();

            using var automation = new UIA3Automation();
            var cf = automation.ConditionFactory;

            ConditionBase condition = (by?.ToLowerInvariant()) switch
            {
                "name" => cf.ByName(query),
                "automation_id" => cf.ByAutomationId(query),
                _ => new OrCondition(cf.ByName(query), cf.ByAutomationId(query))
            };

            var elements = window.FindAllDescendants(condition);
            return elements.Select(el => new
            {
                name = el.Name,
                automationId = el.AutomationId,
                controlType = el.ControlType.ToString(),
                boundingRect = new
                {
                    x = el.BoundingRectangle.X,
                    y = el.BoundingRectangle.Y,
                    width = el.BoundingRectangle.Width,
                    height = el.BoundingRectangle.Height
                }
            }).ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Find element failed: {Query}", query);
            return Array.Empty<object>();
        }
    }

    public object MenuClick(string menuPath)
    {
        try
        {
            var window = GetTiaPortalWindow();
            if (window is null) return new { success = false };

            var parts = menuPath.Split(" > ", StringSplitOptions.TrimEntries);
            if (parts.Length == 0) return new { success = false };

            // Find and click the top-level menu
            var menuBar = window.FindFirstDescendant(cf => cf.ByControlType(FlaUI.Core.Definitions.ControlType.MenuBar));
            if (menuBar is null) return new { success = false };

            AutomationElement? current = menuBar;
            foreach (var part in parts)
            {
                var menuItem = current.FindFirstDescendant(cf => cf.ByName(part));
                if (menuItem is null) return new { success = false };
                menuItem.Click();
                Thread.Sleep(200); // Wait for submenu to open
                current = menuItem;
            }

            return new { success = true };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Menu click failed: {Path}", menuPath);
            return new { success = false };
        }
    }
}
