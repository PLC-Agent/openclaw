import { definePluginEntry, type AnyAgentTool, type OpenClawPluginApi } from "./runtime-api.js";
import { TiaBridgeClient } from "./src/bridge.js";
import { resolvePluginConfig } from "./src/config.js";
import {
  createReadBlockTool,
  createWriteBlockTool,
  createImportBlockTool,
  createExportBlockTool,
} from "./src/tools/blocks.js";
import { createCompileTool, createDownloadTool } from "./src/tools/compile-download.js";
import { createHardwareConfigTool, createDiagnosticsTool } from "./src/tools/hardware.js";
import {
  createClickTool,
  createTypeTextTool,
  createKeyPressTool,
  createFindElementTool,
  createMenuClickTool,
} from "./src/tools/navigate.js";
import {
  createOpenProjectTool,
  createCloseProjectTool,
  createSaveProjectTool,
  createProjectTreeTool,
} from "./src/tools/project.js";
import { createScreenshotTool } from "./src/tools/screenshot.js";
import { createReadTagsTool, createWriteTagTool } from "./src/tools/tags.js";

export default definePluginEntry({
  id: "tia-portal",
  name: "TIA Portal Control",
  description:
    "Control Siemens TIA Portal V18+ for PLC programming. Provides tools for project management, block editing, compiling, downloading, tag management, hardware inspection, and UI automation via a .NET bridge sidecar.",
  register(api: OpenClawPluginApi) {
    if (api.registrationMode !== "full") {
      return;
    }

    const cfg = resolvePluginConfig(api.pluginConfig);
    const bridge = new TiaBridgeClient({ port: cfg.bridgePort, timeoutMs: cfg.operationTimeoutMs });

    // ── Openness API tools ─────────────────────────────────────────
    api.registerTool(createOpenProjectTool(bridge) as AnyAgentTool);
    api.registerTool(createCloseProjectTool(bridge) as AnyAgentTool);
    api.registerTool(createSaveProjectTool(bridge) as AnyAgentTool);
    api.registerTool(createProjectTreeTool(bridge) as AnyAgentTool);
    api.registerTool(createReadBlockTool(bridge) as AnyAgentTool);
    api.registerTool(createWriteBlockTool(bridge) as AnyAgentTool);
    api.registerTool(createImportBlockTool(bridge) as AnyAgentTool);
    api.registerTool(createExportBlockTool(bridge) as AnyAgentTool);
    api.registerTool(createCompileTool(bridge) as AnyAgentTool);
    api.registerTool(createDownloadTool(bridge) as AnyAgentTool);
    api.registerTool(createReadTagsTool(bridge) as AnyAgentTool);
    api.registerTool(createWriteTagTool(bridge) as AnyAgentTool);
    api.registerTool(createHardwareConfigTool(bridge) as AnyAgentTool);
    api.registerTool(createDiagnosticsTool(bridge) as AnyAgentTool);

    // ── UI Automation tools ────────────────────────────────────────
    api.registerTool(createScreenshotTool(bridge, cfg.screenshotQuality) as AnyAgentTool);
    api.registerTool(createClickTool(bridge) as AnyAgentTool);
    api.registerTool(createTypeTextTool(bridge) as AnyAgentTool);
    api.registerTool(createKeyPressTool(bridge) as AnyAgentTool);
    api.registerTool(createFindElementTool(bridge) as AnyAgentTool);
    api.registerTool(createMenuClickTool(bridge) as AnyAgentTool);

    // ── Bridge lifecycle service ───────────────────────────────────
    api.registerService({
      id: "tia-portal-bridge",
      start: async (ctx) => {
        ctx.logger.info(`TIA Portal bridge service started (port ${cfg.bridgePort})`);
        // The bridge sidecar (.NET process) is expected to be started manually
        // or via the autoStartBridge config. Full auto-start with child_process
        // spawning will be implemented when the .NET bridge is built and packaged.
        try {
          const health = await bridge.health();
          const status = health.tiaPortalConnected
            ? `connected (${health.tiaVersion})`
            : "not connected";
          ctx.logger.info(
            `Bridge health: TIA Portal ${status}, project open: ${health.projectOpen}`,
          );
        } catch {
          ctx.logger.warn(
            `TIA Portal bridge not reachable at port ${cfg.bridgePort}. Start the bridge manually or set autoStartBridge.`,
          );
        }
      },
    });
  },
});
