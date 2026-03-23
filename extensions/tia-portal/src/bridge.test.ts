import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TiaBridgeClient } from "./bridge.js";

describe("TiaBridgeClient", () => {
  let client: TiaBridgeClient;
  let fetchSpy: MockInstance;

  beforeEach(() => {
    client = new TiaBridgeClient({ port: 19847, timeoutMs: 5000 });
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetchJson(data: unknown, status = 200) {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  function mockFetchError(status: number, body: string) {
    fetchSpy.mockResolvedValueOnce(new Response(body, { status }));
  }

  it("health() calls GET /health", async () => {
    const healthData = {
      status: "ok",
      tiaPortalConnected: true,
      tiaVersion: "V18",
      projectOpen: true,
      projectPath: "C:\\Projects\\Test.ap18",
    };
    mockFetchJson(healthData);

    const result = await client.health();
    expect(result).toEqual(healthData);
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://127.0.0.1:19847/health",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("openProject() sends POST with path", async () => {
    mockFetchJson({ success: true, message: "Opened: Test" });

    const result = await client.openProject("C:\\Projects\\Test.ap18");
    expect(result.success).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://127.0.0.1:19847/project/open",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ path: "C:\\Projects\\Test.ap18" }),
      }),
    );
  });

  it("getBlock() URL-encodes block name", async () => {
    mockFetchJson({ name: "Main [OB1]", language: "scl", source: "// code", format: "scl" });

    await client.getBlock("Main [OB1]", "scl");
    const url = fetchSpy.mock.calls[0]?.[0] as string;
    expect(url).toContain(encodeURIComponent("Main [OB1]"));
    expect(url).toContain("format=scl");
  });

  it("compile() sends POST to /compile", async () => {
    mockFetchJson({ success: true, errorCount: 0, warningCount: 2, messages: [] });

    const result = await client.compile("PLC_1");
    expect(result.success).toBe(true);
    expect(result.warningCount).toBe(2);
  });

  it("screenshot() requests from /ui/screenshot", async () => {
    mockFetchJson({ image: "base64data", width: 1920, height: 1080 });

    const result = await client.screenshot(90);
    expect(result.width).toBe(1920);
    const url = fetchSpy.mock.calls[0]?.[0] as string;
    expect(url).toContain("quality=90");
  });

  it("click() sends coordinates to /ui/click", async () => {
    mockFetchJson({ success: true });

    const result = await client.click(100, 200);
    expect(result.success).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://127.0.0.1:19847/ui/click",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ x: 100, y: 200 }),
      }),
    );
  });

  it("throws on HTTP error responses", async () => {
    mockFetchError(500, "Internal Server Error");

    await expect(client.health()).rejects.toThrow("Bridge GET /health returned 500");
  });

  it("throws on network errors", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("fetch failed"));

    await expect(client.health()).rejects.toThrow("fetch failed");
  });

  it("getProjectTree() sends filter path as query param", async () => {
    mockFetchJson([{ name: "PLC_1", type: "Device", path: "PLC_1" }]);

    await client.getProjectTree("PLC_1/Program blocks");
    const url = fetchSpy.mock.calls[0]?.[0] as string;
    expect(url).toContain("path=PLC_1%2FProgram%20blocks");
  });

  it("writeBlock() sends PUT with source", async () => {
    mockFetchJson({ success: true });

    await client.writeBlock("Main [OB1]", "<xml>source</xml>", "xml");
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/blocks/"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ source: "<xml>source</xml>", language: "xml" }),
      }),
    );
  });

  it("menuClick() sends menu path", async () => {
    mockFetchJson({ success: true });

    await client.menuClick("Online > Go online");
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://127.0.0.1:19847/ui/menu",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ path: "Online > Go online" }),
      }),
    );
  });
});
