import type { TiaPortalPluginConfig } from "./types.js";

const DEFAULT_BRIDGE_PORT = 19847;
const DEFAULT_TIA_VERSION = "V18";
const DEFAULT_SCREENSHOT_QUALITY = 80;
const DEFAULT_OPERATION_TIMEOUT_MS = 60_000;

/** Resolve plugin config with defaults applied. */
export function resolvePluginConfig(
  raw: Record<string, unknown> | undefined,
): TiaPortalPluginConfig {
  const cfg = raw ?? {};
  return {
    bridgePort: typeof cfg.bridgePort === "number" ? cfg.bridgePort : DEFAULT_BRIDGE_PORT,
    bridgePath: typeof cfg.bridgePath === "string" ? cfg.bridgePath : null,
    tiaVersion: typeof cfg.tiaVersion === "string" ? cfg.tiaVersion : DEFAULT_TIA_VERSION,
    autoStartBridge: typeof cfg.autoStartBridge === "boolean" ? cfg.autoStartBridge : true,
    screenshotQuality:
      typeof cfg.screenshotQuality === "number"
        ? cfg.screenshotQuality
        : DEFAULT_SCREENSHOT_QUALITY,
    operationTimeoutMs:
      typeof cfg.operationTimeoutMs === "number"
        ? cfg.operationTimeoutMs
        : DEFAULT_OPERATION_TIMEOUT_MS,
  };
}
