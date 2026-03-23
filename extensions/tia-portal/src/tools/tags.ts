import { Type } from "@sinclair/typebox";
import type { TiaBridgeClient } from "../bridge.js";
import { textResult } from "../types.js";

export function createReadTagsTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_read_tags",
    label: "Read TIA Tags",
    description:
      "Read all entries from a PLC tag table, including name, data type, address, and comment.",
    parameters: Type.Object(
      {
        table_name: Type.String({
          description: "Tag table name (e.g. 'Default tag table').",
        }),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const tags = await bridge.getTagTable(params.table_name as string);
      if (tags.length === 0) {
        return textResult("Tag table is empty or not found.");
      }
      const header = `Tag table: ${params.table_name} (${tags.length} entries)\n`;
      const rows = tags.map((t) => `  ${t.name}\t${t.dataType}\t${t.address}\t${t.comment || ""}`);
      return textResult(header + rows.join("\n"));
    },
  };
}

export function createWriteTagTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_write_tag",
    label: "Write TIA Tag",
    description:
      "Update a tag entry in a PLC tag table. You can change data type, address, or comment.",
    parameters: Type.Object(
      {
        table_name: Type.String({
          description: "Tag table name.",
        }),
        tag_name: Type.String({
          description: "Name of the tag to update.",
        }),
        data_type: Type.Optional(
          Type.String({ description: "New data type (e.g. 'Bool', 'Int', 'Real')." }),
        ),
        address: Type.Optional(
          Type.String({ description: "New address (e.g. '%I0.0', '%M100.0', '%DB1.DBX0.0')." }),
        ),
        comment: Type.Optional(Type.String({ description: "New comment for the tag." })),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const result = await bridge.writeTag(params.table_name as string, params.tag_name as string, {
        dataType: (params.data_type as string) || undefined,
        address: (params.address as string) || undefined,
        comment: (params.comment as string) || undefined,
      });
      return textResult(result.success ? "Tag updated." : "Failed to update tag.");
    },
  };
}
