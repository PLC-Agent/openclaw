import { Type } from "@sinclair/typebox";
import { optionalStringEnum } from "openclaw/plugin-sdk/agent-runtime";
import type { TiaBridgeClient } from "../bridge.js";
import { textResult } from "../types.js";

export function createReadBlockTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_read_block",
    label: "Read TIA Block",
    description:
      "Read the source code of a PLC block (FB, FC, OB, DB). Returns SCL for text-based blocks or XML for graphical blocks (LAD/FBD).",
    parameters: Type.Object(
      {
        block_name: Type.String({
          description: "Block name, e.g. 'Main [OB1]', 'MyFunction [FC1]', 'DataBlock [DB10]'.",
        }),
        format: optionalStringEnum(["scl", "xml", "auto"] as const, {
          description:
            "Output format. 'auto' (default) detects based on block programming language.",
        }),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const result = await bridge.getBlock(
        params.block_name as string,
        (params.format as string) || undefined,
      );
      const header = `Block: ${result.name} (${result.language}, ${result.format} format)\n\n`;
      return textResult(header + result.source);
    },
  };
}

export function createWriteBlockTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_write_block",
    label: "Write TIA Block",
    description:
      "Write or update a PLC block's source code. Provide SCL source for text blocks or XML for graphical blocks. The block must already exist in the project.",
    parameters: Type.Object(
      {
        block_name: Type.String({
          description: "Block name to update, e.g. 'Main [OB1]'.",
        }),
        source: Type.String({
          description: "The block source code (SCL text or SimaticML XML).",
        }),
        language: optionalStringEnum(["scl", "xml"] as const, {
          description: "Source language. Defaults to SCL if omitted.",
        }),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const result = await bridge.writeBlock(
        params.block_name as string,
        params.source as string,
        (params.language as string) || undefined,
      );
      return textResult(result.success ? "Block updated successfully." : "Failed to update block.");
    },
  };
}

export function createImportBlockTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_import_block",
    label: "Import TIA Block",
    description:
      "Import a PLC block from an external file (SCL or SimaticML XML) into the current project.",
    parameters: Type.Object(
      {
        file_path: Type.String({
          description: "Absolute path to the block file to import.",
        }),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const result = await bridge.importBlock(params.file_path as string);
      return textResult(
        result.success ? `Block imported: ${result.blockName}` : "Failed to import block.",
      );
    },
  };
}

export function createExportBlockTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_export_block",
    label: "Export TIA Block",
    description: "Export a PLC block to an external file (SCL or SimaticML XML).",
    parameters: Type.Object(
      {
        block_name: Type.String({
          description: "Block name to export.",
        }),
        output_path: Type.String({
          description: "Absolute path for the exported file.",
        }),
        format: optionalStringEnum(["scl", "xml"] as const, {
          description: "Export format. Defaults to the block's native format.",
        }),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const result = await bridge.exportBlock(
        params.block_name as string,
        params.output_path as string,
        (params.format as string) || undefined,
      );
      return textResult(
        result.success ? "Block exported successfully." : "Failed to export block.",
      );
    },
  };
}
