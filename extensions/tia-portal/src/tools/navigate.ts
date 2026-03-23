import { Type } from "@sinclair/typebox";
import { optionalStringEnum } from "openclaw/plugin-sdk/agent-runtime";
import type { TiaBridgeClient } from "../bridge.js";
import { textResult } from "../types.js";

export function createClickTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_click",
    label: "TIA Click",
    description: "Click at a specific screen coordinate in the TIA Portal window.",
    parameters: Type.Object(
      {
        x: Type.Number({
          description: "X coordinate (pixels from left edge of TIA Portal window).",
        }),
        y: Type.Number({
          description: "Y coordinate (pixels from top edge of TIA Portal window).",
        }),
        button: optionalStringEnum(["left", "right", "double"] as const, {
          description: "Mouse button / action. Defaults to left click.",
        }),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const x = params.x as number;
      const y = params.y as number;
      const button = (params.button as string) || "left";
      let result: { success: boolean };
      if (button === "right") {
        result = await bridge.rightClick(x, y);
      } else if (button === "double") {
        result = await bridge.doubleClick(x, y);
      } else {
        result = await bridge.click(x, y);
      }
      return textResult(result.success ? `Clicked (${button}) at (${x}, ${y}).` : "Click failed.");
    },
  };
}

export function createTypeTextTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_type_text",
    label: "TIA Type Text",
    description: "Type text at the current cursor position in TIA Portal.",
    parameters: Type.Object(
      {
        text: Type.String({ description: "Text to type." }),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const result = await bridge.typeText(params.text as string);
      return textResult(result.success ? "Text typed." : "Failed to type text.");
    },
  };
}

export function createKeyPressTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_key_press",
    label: "TIA Key Press",
    description:
      "Press a keyboard shortcut in TIA Portal (e.g. 'Ctrl+S' to save, 'F7' to compile, 'Ctrl+Shift+D' to download).",
    parameters: Type.Object(
      {
        keys: Type.String({
          description:
            "Key combination using '+' as separator (e.g. 'Ctrl+S', 'F7', 'Ctrl+Shift+D', 'Enter').",
        }),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const result = await bridge.keyPress(params.keys as string);
      return textResult(result.success ? `Key pressed: ${params.keys}` : "Key press failed.");
    },
  };
}

export function createFindElementTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_find_element",
    label: "TIA Find Element",
    description:
      "Find UI elements in TIA Portal by name or automation ID. Returns element details including bounding rectangle for clicking.",
    parameters: Type.Object(
      {
        query: Type.String({
          description: "Search text to match against element name or automation ID.",
        }),
        by: optionalStringEnum(["name", "automation_id", "any"] as const, {
          description: "Search mode: 'name', 'automation_id', or 'any' (default).",
        }),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const elements = await bridge.findElement(
        params.query as string,
        (params.by as string) || undefined,
      );
      if (elements.length === 0) {
        return textResult(`No UI elements found matching '${params.query}'.`);
      }
      const lines = elements.map(
        (el) =>
          `${el.name} [${el.controlType}] id=${el.automationId} rect=(${el.boundingRect.x},${el.boundingRect.y},${el.boundingRect.width}x${el.boundingRect.height})`,
      );
      return textResult(`Found ${elements.length} elements:\n\n${lines.join("\n")}`);
    },
  };
}

export function createMenuClickTool(bridge: TiaBridgeClient) {
  return {
    name: "tia_menu_click",
    label: "TIA Menu Click",
    description:
      "Navigate and click a menu item in TIA Portal by path (e.g. 'Online > Go online', 'Edit > Undo').",
    parameters: Type.Object(
      {
        menu_path: Type.String({
          description: "Menu path using ' > ' as separator (e.g. 'Online > Go online').",
        }),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const result = await bridge.menuClick(params.menu_path as string);
      return textResult(
        result.success
          ? `Menu item clicked: ${params.menu_path}`
          : `Failed to click menu: ${params.menu_path}`,
      );
    },
  };
}
