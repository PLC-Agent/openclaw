import { describe, expect, it } from "vitest";
import { resolvePluginConfig } from "./config.js";

describe("resolvePluginConfig", () => {
  it("returns defaults when no config is provided", () => {
    const cfg = resolvePluginConfig(undefined);
    expect(cfg).toEqual({
      bridgePort: 19847,
      bridgePath: null,
      tiaVersion: "V18",
      autoStartBridge: true,
      screenshotQuality: 80,
      operationTimeoutMs: 60_000,
    });
  });

  it("returns defaults for empty config", () => {
    const cfg = resolvePluginConfig({});
    expect(cfg.bridgePort).toBe(19847);
    expect(cfg.autoStartBridge).toBe(true);
  });

  it("applies overrides", () => {
    const cfg = resolvePluginConfig({
      bridgePort: 9999,
      bridgePath: "C:\\custom\\bridge.exe",
      tiaVersion: "V19",
      autoStartBridge: false,
      screenshotQuality: 50,
      operationTimeoutMs: 120_000,
    });
    expect(cfg).toEqual({
      bridgePort: 9999,
      bridgePath: "C:\\custom\\bridge.exe",
      tiaVersion: "V19",
      autoStartBridge: false,
      screenshotQuality: 50,
      operationTimeoutMs: 120_000,
    });
  });

  it("ignores invalid types and uses defaults", () => {
    const cfg = resolvePluginConfig({
      bridgePort: "not-a-number",
      autoStartBridge: "yes",
    });
    expect(cfg.bridgePort).toBe(19847);
    expect(cfg.autoStartBridge).toBe(true);
  });
});
