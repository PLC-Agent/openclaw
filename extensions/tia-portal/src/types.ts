/** Build a text-only tool result compatible with AgentToolResult. */
export function textResult(text: string) {
  return {
    content: [{ type: "text" as const, text }],
    details: { text },
  };
}

/** Build a tool result with an image. */
export function imageResult(text: string, imageBase64: string) {
  return {
    content: [
      { type: "text" as const, text },
      {
        type: "image" as const,
        source: { type: "base64" as const, media_type: "image/png" as const, data: imageBase64 },
      },
    ],
    details: { text },
  };
}

/** Connection state of the .NET bridge sidecar. */
export type BridgeState = "disconnected" | "starting" | "connected" | "attached" | "error";

/** Result of a health check against the bridge. */
export type BridgeHealthResponse = {
  status: "ok" | "error";
  tiaPortalConnected: boolean;
  tiaVersion: string | null;
  projectOpen: boolean;
  projectPath: string | null;
};

/** A node in the TIA Portal project tree. */
export type ProjectTreeNode = {
  name: string;
  type: string;
  path: string;
  children?: ProjectTreeNode[];
};

/** Block source returned by the bridge. */
export type BlockSource = {
  name: string;
  language: "scl" | "lad" | "fbd" | "stl" | "graph";
  source: string;
  format: "scl" | "xml";
};

/** Compile result from the bridge. */
export type CompileResult = {
  success: boolean;
  errorCount: number;
  warningCount: number;
  messages: CompileMessage[];
};

export type CompileMessage = {
  severity: "error" | "warning" | "info";
  message: string;
  path: string | null;
};

/** Download result from the bridge. */
export type DownloadResult = {
  success: boolean;
  message: string;
};

/** Tag table entry. */
export type TagEntry = {
  name: string;
  dataType: string;
  address: string;
  comment: string;
};

/** Hardware device in the project. */
export type HardwareDevice = {
  name: string;
  type: string;
  orderNumber: string;
  modules: HardwareModule[];
};

export type HardwareModule = {
  name: string;
  type: string;
  slot: number;
};

/** Diagnostic entry from TIA Portal. */
export type DiagnosticEntry = {
  severity: "error" | "warning" | "info";
  message: string;
  source: string | null;
  timestamp: string | null;
};

/** UI element found via automation. */
export type UiElement = {
  name: string;
  automationId: string;
  controlType: string;
  boundingRect: { x: number; y: number; width: number; height: number };
};

/** Plugin configuration resolved from openclaw config. */
export type TiaPortalPluginConfig = {
  bridgePort: number;
  bridgePath: string | null;
  tiaVersion: string;
  autoStartBridge: boolean;
  screenshotQuality: number;
  operationTimeoutMs: number;
};
