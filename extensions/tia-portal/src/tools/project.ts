import { Type } from "@sinclair/typebox";
import type { TiaBridgeClient } from "../bridge.js";
import { textResult } from "../types.js";

export function createOpenProjectTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_open_project",
    label: "Open TIA Project",
    description:
      "Open a TIA Portal project file (.ap18/.ap19). TIA Portal must be running. Only one project can be open at a time.",
    parameters: Type.Object(
      {
        project_path: Type.String({
          description:
            "Absolute path to the TIA Portal project file (e.g. C:\\Projects\\MyPlc\\MyPlc.ap18).",
        }),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const result = await bridge.openProject(params.project_path as string);
      return textResult(
        result.success ? `Project opened: ${result.message}` : `Failed: ${result.message}`,
      );
    },
  };
}

export function createCloseProjectTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_close_project",
    label: "Close TIA Project",
    description: "Close the currently open TIA Portal project.",
    parameters: Type.Object({}, { additionalProperties: false }),
    execute: async () => {
      const result = await bridge.closeProject();
      return textResult(result.success ? "Project closed." : "Failed to close project.");
    },
  };
}

export function createSaveProjectTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_save_project",
    label: "Save TIA Project",
    description: "Save the currently open TIA Portal project.",
    parameters: Type.Object({}, { additionalProperties: false }),
    execute: async () => {
      const result = await bridge.saveProject();
      return textResult(result.success ? "Project saved." : "Failed to save project.");
    },
  };
}

export function createProjectTreeTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_project_tree",
    label: "TIA Project Tree",
    description:
      "List the project tree structure showing devices, program blocks, tag tables, and other items. Optionally filter to a subtree path.",
    parameters: Type.Object(
      {
        filter_path: Type.Optional(
          Type.String({
            description:
              "Optional path to filter the tree (e.g. 'PLC_1/Program blocks'). Returns the full tree if omitted.",
          }),
        ),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const nodes = await bridge.getProjectTree(params.filter_path as string | undefined);
      return textResult(JSON.stringify(nodes, null, 2));
    },
  };
}
