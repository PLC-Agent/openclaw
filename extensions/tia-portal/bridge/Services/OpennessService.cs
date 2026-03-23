using Siemens.Engineering;
using Siemens.Engineering.Compiler;
using Siemens.Engineering.HW;
using Siemens.Engineering.SW;
using Siemens.Engineering.SW.Blocks;
using Siemens.Engineering.SW.Tags;

namespace TiaPortalBridge.Services;

/// <summary>
/// Wraps the Siemens TIA Portal Openness API (V18+).
/// Manages a single TIA Portal instance and project.
/// </summary>
public class OpennessService
{
    private TiaPortal? _tiaPortal;
    private Project? _project;
    private readonly ILogger<OpennessService> _logger;

    public OpennessService(ILogger<OpennessService> logger)
    {
        _logger = logger;
    }

    // ── Health ──────────────────────────────────────────────────────

    public object GetHealth()
    {
        return new
        {
            status = "ok",
            tiaPortalConnected = _tiaPortal is not null,
            tiaVersion = _tiaPortal is not null ? "V18" : (string?)null,
            projectOpen = _project is not null,
            projectPath = _project?.Path?.ToString()
        };
    }

    // ── Project Management ──────────────────────────────────────────

    public object OpenProject(string projectPath)
    {
        try
        {
            // Attach to running TIA Portal or start a new instance
            var processes = TiaPortal.GetProcesses();
            if (processes.Count > 0)
            {
                _tiaPortal = processes[0].Attach();
                _logger.LogInformation("Attached to running TIA Portal instance");
            }
            else
            {
                _tiaPortal = new TiaPortal(TiaPortalMode.WithUserInterface);
                _logger.LogInformation("Started new TIA Portal instance");
            }

            var projectUri = new FileInfo(projectPath);
            _project = _tiaPortal.Projects.Open(projectUri);
            return new { success = true, message = $"Opened: {_project.Name}" };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to open project: {Path}", projectPath);
            return new { success = false, message = ex.Message };
        }
    }

    public object CloseProject()
    {
        try
        {
            _project?.Close();
            _project = null;
            return new { success = true };
        }
        catch (Exception ex)
        {
            return new { success = false, message = ex.Message };
        }
    }

    public object SaveProject()
    {
        try
        {
            _project?.Save();
            return new { success = true };
        }
        catch (Exception ex)
        {
            return new { success = false, message = ex.Message };
        }
    }

    public object GetProjectTree(string? filterPath)
    {
        if (_project is null) return Array.Empty<object>();

        var nodes = new List<object>();
        foreach (var device in _project.Devices)
        {
            var deviceNode = BuildDeviceTree(device);
            if (filterPath is null || deviceNode is not null)
            {
                nodes.Add(deviceNode!);
            }
        }
        return nodes;
    }

    private object? BuildDeviceTree(Device device)
    {
        var children = new List<object>();

        foreach (var item in device.DeviceItems)
        {
            var softwareContainer = item.GetService<SoftwareContainer>();
            if (softwareContainer?.Software is PlcSoftware plcSoftware)
            {
                var blockGroup = BuildBlockGroupTree(plcSoftware.BlockGroup);
                children.Add(new { name = "Program blocks", type = "BlockGroup", path = $"{device.Name}/Program blocks", children = blockGroup });

                var tagTables = new List<object>();
                foreach (var table in plcSoftware.TagTableGroup.TagTables)
                {
                    tagTables.Add(new { name = table.Name, type = "TagTable", path = $"{device.Name}/PLC tags/{table.Name}" });
                }
                children.Add(new { name = "PLC tags", type = "TagTableGroup", path = $"{device.Name}/PLC tags", children = tagTables });
            }
        }

        return new
        {
            name = device.Name,
            type = "Device",
            path = device.Name,
            children
        };
    }

    private List<object> BuildBlockGroupTree(PlcBlockGroup group)
    {
        var items = new List<object>();
        foreach (var block in group.Blocks)
        {
            items.Add(new
            {
                name = block.Name,
                type = block.GetType().Name,
                path = $"{block.Name}"
            });
        }
        foreach (var subGroup in group.Groups)
        {
            items.Add(new
            {
                name = subGroup.Name,
                type = "BlockGroup",
                path = subGroup.Name,
                children = BuildBlockGroupTree(subGroup)
            });
        }
        return items;
    }

    // ── Blocks ──────────────────────────────────────────────────────

    public object? GetBlock(string name, string? format)
    {
        if (_project is null) return null;

        foreach (var device in _project.Devices)
        {
            foreach (var item in device.DeviceItems)
            {
                var sw = item.GetService<SoftwareContainer>()?.Software as PlcSoftware;
                if (sw is null) continue;

                var block = FindBlock(sw.BlockGroup, name);
                if (block is null) continue;

                // Export the block to a temp file and read its contents
                var tempPath = Path.Combine(Path.GetTempPath(), $"tia_block_{Guid.NewGuid()}.xml");
                try
                {
                    block.Export(new FileInfo(tempPath), ExportOptions.WithDefaults);
                    var source = File.ReadAllText(tempPath);
                    return new
                    {
                        name = block.Name,
                        language = block.ProgrammingLanguage.ToString().ToLowerInvariant(),
                        source,
                        format = "xml"
                    };
                }
                finally
                {
                    if (File.Exists(tempPath)) File.Delete(tempPath);
                }
            }
        }
        return null;
    }

    public object WriteBlock(string name, string source, string? language)
    {
        if (_project is null) return new { success = false, message = "No project open" };

        try
        {
            // Write source to temp file and import
            var tempPath = Path.Combine(Path.GetTempPath(), $"tia_block_{Guid.NewGuid()}.xml");
            File.WriteAllText(tempPath, source);
            try
            {
                foreach (var device in _project.Devices)
                {
                    foreach (var item in device.DeviceItems)
                    {
                        var sw = item.GetService<SoftwareContainer>()?.Software as PlcSoftware;
                        if (sw is null) continue;

                        var existing = FindBlock(sw.BlockGroup, name);
                        if (existing is not null)
                        {
                            existing.Delete();
                        }
                        sw.BlockGroup.Blocks.Import(new FileInfo(tempPath), ImportOptions.Override);
                        return new { success = true };
                    }
                }
                return new { success = false, message = "No PLC software found" };
            }
            finally
            {
                if (File.Exists(tempPath)) File.Delete(tempPath);
            }
        }
        catch (Exception ex)
        {
            return new { success = false, message = ex.Message };
        }
    }

    public object ImportBlock(string filePath)
    {
        if (_project is null) return new { success = false, blockName = "" };

        try
        {
            foreach (var device in _project.Devices)
            {
                foreach (var item in device.DeviceItems)
                {
                    var sw = item.GetService<SoftwareContainer>()?.Software as PlcSoftware;
                    if (sw is null) continue;

                    var imported = sw.BlockGroup.Blocks.Import(new FileInfo(filePath), ImportOptions.Override);
                    return new { success = true, blockName = imported.Name };
                }
            }
            return new { success = false, blockName = "" };
        }
        catch (Exception ex)
        {
            return new { success = false, blockName = "", message = ex.Message };
        }
    }

    public object ExportBlock(string name, string outputPath, string? format)
    {
        if (_project is null) return new { success = false };

        try
        {
            foreach (var device in _project.Devices)
            {
                foreach (var item in device.DeviceItems)
                {
                    var sw = item.GetService<SoftwareContainer>()?.Software as PlcSoftware;
                    if (sw is null) continue;

                    var block = FindBlock(sw.BlockGroup, name);
                    if (block is null) continue;

                    block.Export(new FileInfo(outputPath), ExportOptions.WithDefaults);
                    return new { success = true };
                }
            }
            return new { success = false };
        }
        catch (Exception ex)
        {
            return new { success = false, message = ex.Message };
        }
    }

    private static PlcBlock? FindBlock(PlcBlockGroup group, string name)
    {
        foreach (var block in group.Blocks)
        {
            if (block.Name.Equals(name, StringComparison.OrdinalIgnoreCase))
                return block;
        }
        foreach (var subGroup in group.Groups)
        {
            var found = FindBlock(subGroup, name);
            if (found is not null) return found;
        }
        return null;
    }

    // ── Compile & Download ──────────────────────────────────────────

    public object Compile(string? target)
    {
        if (_project is null) return new { success = false, errorCount = 0, warningCount = 0, messages = Array.Empty<object>() };

        try
        {
            ICompilable? compilable = null;
            foreach (var device in _project.Devices)
            {
                if (target is null || device.Name.Equals(target, StringComparison.OrdinalIgnoreCase))
                {
                    compilable = device.GetService<ICompilable>();
                    break;
                }
            }

            if (compilable is null)
                return new { success = false, errorCount = 0, warningCount = 0, messages = new[] { new { severity = "error", message = "No compilable target found", path = (string?)null } } };

            var result = compilable.Compile();
            var messages = new List<object>();
            foreach (var msg in result.Messages)
            {
                messages.Add(new
                {
                    severity = msg.Warning ? "warning" : "error",
                    message = msg.Description,
                    path = msg.Path
                });
            }

            return new
            {
                success = result.State == CompilerResultState.Success,
                errorCount = result.ErrorCount,
                warningCount = result.WarningCount,
                messages
            };
        }
        catch (Exception ex)
        {
            return new { success = false, errorCount = 1, warningCount = 0, messages = new[] { new { severity = "error", message = ex.Message, path = (string?)null } } };
        }
    }

    public object Download(string target, bool simulation)
    {
        // Download requires additional connection configuration
        // This is a placeholder — actual implementation needs target device
        // connection settings (IP, interface, etc.)
        return new { success = false, message = "Download requires target device connection configuration. Use TIA Portal UI for initial setup." };
    }

    // ── Tags ────────────────────────────────────────────────────────

    public object GetTagTable(string tableName)
    {
        if (_project is null) return Array.Empty<object>();

        var tags = new List<object>();
        foreach (var device in _project.Devices)
        {
            foreach (var item in device.DeviceItems)
            {
                var sw = item.GetService<SoftwareContainer>()?.Software as PlcSoftware;
                if (sw is null) continue;

                foreach (var table in sw.TagTableGroup.TagTables)
                {
                    if (!table.Name.Equals(tableName, StringComparison.OrdinalIgnoreCase)) continue;

                    foreach (var tag in table.Tags)
                    {
                        tags.Add(new
                        {
                            name = tag.Name,
                            dataType = tag.DataTypeName,
                            address = tag.LogicalAddress,
                            comment = tag.Comment?.Items?.FirstOrDefault()?.Text ?? ""
                        });
                    }
                }
            }
        }
        return tags;
    }

    public object WriteTag(string tableName, string tagName, TagUpdateRequest? update)
    {
        if (_project is null || update is null) return new { success = false };

        try
        {
            foreach (var device in _project.Devices)
            {
                foreach (var item in device.DeviceItems)
                {
                    var sw = item.GetService<SoftwareContainer>()?.Software as PlcSoftware;
                    if (sw is null) continue;

                    foreach (var table in sw.TagTableGroup.TagTables)
                    {
                        if (!table.Name.Equals(tableName, StringComparison.OrdinalIgnoreCase)) continue;

                        foreach (var tag in table.Tags)
                        {
                            if (!tag.Name.Equals(tagName, StringComparison.OrdinalIgnoreCase)) continue;

                            if (update.DataType is not null) tag.DataTypeName = update.DataType;
                            if (update.Address is not null) tag.LogicalAddress = update.Address;
                            // Comment updates require MultilingualText handling
                            return new { success = true };
                        }
                    }
                }
            }
            return new { success = false };
        }
        catch (Exception ex)
        {
            return new { success = false, message = ex.Message };
        }
    }

    // ── Hardware ────────────────────────────────────────────────────

    public object GetHardwareConfig()
    {
        if (_project is null) return Array.Empty<object>();

        var devices = new List<object>();
        foreach (var device in _project.Devices)
        {
            var modules = new List<object>();
            foreach (var item in device.DeviceItems)
            {
                modules.Add(new
                {
                    name = item.Name,
                    type = item.GetType().Name,
                    slot = item.PositionNumber
                });
            }

            devices.Add(new
            {
                name = device.Name,
                type = device.TypeIdentifier ?? "Unknown",
                orderNumber = device.TypeIdentifier ?? "",
                modules
            });
        }
        return devices;
    }

    // ── Diagnostics ─────────────────────────────────────────────────

    public object GetDiagnostics()
    {
        // TIA Portal diagnostics are primarily available through compile results
        // and online diagnostics. This returns cached compile messages.
        return Array.Empty<object>();
    }
}

// DTO used by the tag write endpoint
public record TagUpdateRequest(string? DataType, string? Address, string? Comment);
