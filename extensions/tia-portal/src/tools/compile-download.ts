import { Type } from "@sinclair/typebox";
import { optionalStringEnum } from "openclaw/plugin-sdk/agent-runtime";
import type { TiaBridgeClient } from "../bridge.js";
import { textResult } from "../types.js";

export function createCompileTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_compile",
    label: "Compile TIA Project",
    description:
      "Compile the current TIA Portal project or a specific device/block. Returns compile errors and warnings.",
    parameters: Type.Object(
      {
        target: Type.Optional(
          Type.String({
            description:
              "Optional compile target (device or block name). Compiles the entire project if omitted.",
          }),
        ),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const result = await bridge.compile((params.target as string) || undefined);
      const lines: string[] = [
        `Compile ${result.success ? "succeeded" : "FAILED"}`,
        `Errors: ${result.errorCount}, Warnings: ${result.warningCount}`,
      ];
      if (result.messages.length > 0) {
        lines.push("", "Messages:");
        for (const msg of result.messages) {
          const loc = msg.path ? ` (${msg.path})` : "";
          lines.push(`  [${msg.severity.toUpperCase()}]${loc} ${msg.message}`);
        }
      }
      return textResult(lines.join("\n"));
    },
  };
}

export function createDownloadTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_download",
    label: "Download to PLC",
    description:
      "Download the compiled project to a PLC or PLCSIM instance. The project must be compiled first.",
    parameters: Type.Object(
      {
        target: Type.String({
          description: "Target device name (e.g. 'PLC_1') or IP address.",
        }),
        mode: optionalStringEnum(["plc", "simulation"] as const, {
          description: "Download to a physical PLC or to PLCSIM (default: plc).",
        }),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const result = await bridge.download(params.target as string, {
        simulation: params.mode === "simulation",
      });
      return textResult(
        result.success
          ? `Download complete: ${result.message}`
          : `Download failed: ${result.message}`,
      );
    },
  };
}
