import type {
  BridgeHealthResponse,
  BlockSource,
  CompileResult,
  DiagnosticEntry,
  DownloadResult,
  HardwareDevice,
  ProjectTreeNode,
  TagEntry,
  UiElement,
} from "./types.js";

/**
 * HTTP client for the TIA Portal .NET bridge sidecar.
 *
 * All methods throw on network/HTTP errors so callers can surface
 * meaningful messages to the agent.
 */
export class TiaBridgeClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(opts: { port: number; timeoutMs?: number }) {
    this.baseUrl = `http://127.0.0.1:${opts.port}`;
    this.timeoutMs = opts.timeoutMs ?? 60_000;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Bridge ${method} ${path} returned ${res.status}: ${text.slice(0, 500)}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  private post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  // ── Health ───────────────────────────────────────────────────────

  async health(): Promise<BridgeHealthResponse> {
    return this.get<BridgeHealthResponse>("/health");
  }

  // ── Project management ───────────────────────────────────────────

  async openProject(projectPath: string): Promise<{ success: boolean; message: string }> {
    return this.post("/project/open", { path: projectPath });
  }

  async closeProject(): Promise<{ success: boolean }> {
    return this.post("/project/close");
  }

  async saveProject(): Promise<{ success: boolean }> {
    return this.post("/project/save");
  }

  async getProjectTree(filterPath?: string): Promise<ProjectTreeNode[]> {
    const qs = filterPath ? `?path=${encodeURIComponent(filterPath)}` : "";
    return this.get<ProjectTreeNode[]>(`/project/tree${qs}`);
  }

  // ── Blocks ───────────────────────────────────────────────────────

  async getBlock(blockName: string, format?: string): Promise<BlockSource> {
    const qs = format ? `?format=${encodeURIComponent(format)}` : "";
    return this.get<BlockSource>(`/blocks/${encodeURIComponent(blockName)}${qs}`);
  }

  async writeBlock(
    blockName: string,
    source: string,
    language?: string,
  ): Promise<{ success: boolean }> {
    return this.put(`/blocks/${encodeURIComponent(blockName)}`, { source, language });
  }

  async importBlock(filePath: string): Promise<{ success: boolean; blockName: string }> {
    return this.post("/blocks/import", { filePath });
  }

  async exportBlock(
    blockName: string,
    outputPath: string,
    format?: string,
  ): Promise<{ success: boolean }> {
    return this.post(`/blocks/${encodeURIComponent(blockName)}/export`, { outputPath, format });
  }

  // ── Compile & Download ───────────────────────────────────────────

  async compile(target?: string): Promise<CompileResult> {
    return this.post("/compile", target ? { target } : undefined);
  }

  async download(target: string, options?: { simulation?: boolean }): Promise<DownloadResult> {
    return this.post("/download", { target, ...options });
  }

  // ── Tags ─────────────────────────────────────────────────────────

  async getTagTable(tableName: string): Promise<TagEntry[]> {
    return this.get<TagEntry[]>(`/tags/${encodeURIComponent(tableName)}`);
  }

  async writeTag(
    tableName: string,
    tagName: string,
    update: { dataType?: string; address?: string; comment?: string },
  ): Promise<{ success: boolean }> {
    return this.put(
      `/tags/${encodeURIComponent(tableName)}/${encodeURIComponent(tagName)}`,
      update,
    );
  }

  // ── Hardware ─────────────────────────────────────────────────────

  async getHardwareConfig(): Promise<HardwareDevice[]> {
    return this.get<HardwareDevice[]>("/hardware");
  }

  // ── Diagnostics ──────────────────────────────────────────────────

  async getDiagnostics(): Promise<DiagnosticEntry[]> {
    return this.get<DiagnosticEntry[]>("/diagnostics");
  }

  // ── UI Automation ────────────────────────────────────────────────

  async screenshot(quality?: number): Promise<{ image: string; width: number; height: number }> {
    const qs = quality ? `?quality=${quality}` : "";
    return this.get(`/ui/screenshot${qs}`);
  }

  async click(x: number, y: number): Promise<{ success: boolean }> {
    return this.post("/ui/click", { x, y });
  }

  async doubleClick(x: number, y: number): Promise<{ success: boolean }> {
    return this.post("/ui/double-click", { x, y });
  }

  async rightClick(x: number, y: number): Promise<{ success: boolean }> {
    return this.post("/ui/right-click", { x, y });
  }

  async typeText(text: string): Promise<{ success: boolean }> {
    return this.post("/ui/type", { text });
  }

  async keyPress(keys: string): Promise<{ success: boolean }> {
    return this.post("/ui/key", { keys });
  }

  async findElement(query: string, by?: string): Promise<UiElement[]> {
    return this.post<UiElement[]>("/ui/find", { query, by });
  }

  async menuClick(menuPath: string): Promise<{ success: boolean }> {
    return this.post("/ui/menu", { path: menuPath });
  }
}
