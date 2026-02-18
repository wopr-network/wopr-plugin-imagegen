import { vi, describe, it, expect, beforeEach } from "vitest";
import plugin from "../src/index.js";

function createMockCtx(configOverrides: Record<string, unknown> = {}) {
  return {
    getConfig: vi.fn(() => ({ provider: "openai-dalle", ...configOverrides })),
    registerA2AServer: vi.fn(),
    registerExtension: vi.fn(),
    log: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  };
}

describe("wopr-plugin-imagegen plugin", () => {
  let mockCtx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    mockCtx = createMockCtx();
  });

  it("has correct plugin metadata", () => {
    expect(plugin.name).toBe("wopr-plugin-imagegen");
    expect(plugin.version).toBe("1.0.0");
  });

  it("has a manifest with image-gen capability", () => {
    expect(plugin.manifest).toBeDefined();
    expect(plugin.manifest!.capabilities).toContain("image-gen");
    expect(plugin.manifest!.provides!.capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "image-gen", id: "wopr-imagegen-dalle" }),
      ]),
    );
  });

  it("has configSchema with provider and apiKey fields", () => {
    const fields = plugin.manifest!.configSchema!.fields;
    expect(fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "provider" }),
        expect.objectContaining({ name: "apiKey", type: "password", secret: true }),
      ]),
    );
  });

  it("registers A2A server with image_generate tool on init", async () => {
    await plugin.init(mockCtx as any);
    expect(mockCtx.registerA2AServer).toHaveBeenCalledTimes(1);
    const serverConfig = mockCtx.registerA2AServer.mock.calls[0][0];
    expect(serverConfig.name).toBe("imagegen");
    expect(serverConfig.version).toBe("1.0.0");
    expect(serverConfig.tools).toHaveLength(1);
    expect(serverConfig.tools[0].name).toBe("image_generate");
  });

  it("image_generate tool has correct input schema", async () => {
    await plugin.init(mockCtx as any);
    const tool = mockCtx.registerA2AServer.mock.calls[0][0].tools[0];
    expect(tool.inputSchema.required).toEqual(["prompt"]);
    expect(tool.inputSchema.properties).toHaveProperty("prompt");
    expect(tool.inputSchema.properties).toHaveProperty("size");
    expect(tool.inputSchema.properties).toHaveProperty("quality");
    expect(tool.inputSchema.properties).toHaveProperty("style");
  });

  it("skips A2A registration when registerA2AServer is not available", async () => {
    const ctx = { ...mockCtx, registerA2AServer: undefined };
    await plugin.init(ctx as any);
    // Should not throw
  });

  it("logs info on init", async () => {
    await plugin.init(mockCtx as any);
    expect(mockCtx.log.info).toHaveBeenCalledWith("[wopr-plugin-imagegen] initialized");
  });

  it("shutdown completes without error", async () => {
    await expect(plugin.shutdown()).resolves.toBeUndefined();
  });
});
