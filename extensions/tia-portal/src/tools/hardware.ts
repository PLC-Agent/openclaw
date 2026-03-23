import { Type } from "@sinclair/typebox";
import type { TiaBridgeClient } from "../bridge.js";
import { textResult } from "../types.js";

export function createHardwareConfigTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_hardware_config",
    label: "TIA Hardware Config",
    description:
      "Read the hardware configuration of the current project, including devices, modules, and slot assignments.",
    parameters: Type.Object({}, { additionalProperties: false }),
    execute: async () => {
      const devices = await bridge.getHardwareConfig();
      if (devices.length === 0) {
        return textResult("No hardware devices found in the project.");
      }
      const lines: string[] = [`Hardware configuration (${devices.length} devices):\n`];
      for (const dev of devices) {
        lines.push(`${dev.name} (${dev.type}, ${dev.orderNumber})`);
        for (const mod of dev.modules) {
          lines.push(`  Slot ${mod.slot}: ${mod.name} (${mod.type})`);
        }
      }
      return textResult(lines.join("\n"));
    },
  };
}

export function createDiagnosticsTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_diagnostics",
    label: "TIA Diagnostics",
    description:
      "Read current diagnostic messages from TIA Portal, including compile errors, warnings, and system messages.",
    parameters: Type.Object({}, { additionalProperties: false }),
    execute: async () => {
      const entries = await bridge.getDiagnostics();
      if (entries.length === 0) {
        return textResult("No diagnostic messages.");
      }
      const lines = entries.map((e) => {
        const src = e.source ? ` (${e.source})` : "";
        const ts = e.timestamp ? ` [${e.timestamp}]` : "";
        return `[${e.severity.toUpperCase()}]${src}${ts} ${e.message}`;
      });
      return textResult(`${entries.length} diagnostic messages:\n\n${lines.join("\n")}`);
    },
  };
}
