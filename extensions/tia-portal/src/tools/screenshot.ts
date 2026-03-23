import { Type } from "@sinclair/typebox";
import type { TiaBridgeClient } from "../bridge.js";
import { imageResult } from "../types.js";

export function createScreenshotTool(bridge: TiaBridgeClient, defaultQuality: number) {
  return {
    name: "tia_screenshot",
    label: "TIA Screenshot",
    description:
      "Capture a screenshot of the current TIA Portal window. Returns a base64-encoded PNG image that can be analyzed visually to understand the current state of the editor.",
    parameters: Type.Object(
      {
        quality: Type.Optional(
          Type.Number({
            description: "Image quality (1-100). Higher means larger but sharper image.",
            minimum: 1,
            maximum: 100,
          }),
        ),
      },
      { additionalProperties: false },
    ),
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const quality = typeof params.quality === "number" ? params.quality : defaultQuality;
      const result = await bridge.screenshot(quality);
      return imageResult(`Screenshot captured (${result.width}x${result.height})`, result.image);
    },
  };
}
