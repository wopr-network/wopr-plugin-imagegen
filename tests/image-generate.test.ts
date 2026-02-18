import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { handleImageGenerate } from "../src/image-generate.js";

// Mock the OpenAIDalleProvider module
vi.mock("../src/providers/openai-dalle.js", () => ({
  OpenAIDalleProvider: vi.fn().mockImplementation(() => ({
    name: "openai-dalle",
    generate: vi.fn().mockResolvedValue({
      filePath: "/tmp/test-output.png",
      sizeBytes: 1024,
      revisedPrompt: "a revised prompt",
    }),
  })),
}));

// Mock fs
vi.mock("node:fs", () => ({
  mkdirSync: vi.fn(),
}));

describe("handleImageGenerate", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: "test-key-123" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns error for empty prompt", async () => {
    const result = await handleImageGenerate({ prompt: "" }, {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("prompt cannot be empty");
  });

  it("returns error for missing prompt", async () => {
    const result = await handleImageGenerate({}, {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("prompt cannot be empty");
  });

  it("returns error for whitespace-only prompt", async () => {
    const result = await handleImageGenerate({ prompt: "   " }, {});
    expect(result.isError).toBe(true);
  });

  it("generates image successfully with valid prompt", async () => {
    const result = await handleImageGenerate(
      { prompt: "a cat in space" },
      { apiKey: "test-key" },
    );
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0].text!);
    expect(response.filePath).toBeDefined();
    expect(response.sizeBytes).toBe(1024);
    expect(response.provider).toBe("openai-dalle");
    expect(response.revisedPrompt).toBe("a revised prompt");
  });

  it("passes size, quality, and style args when provided", async () => {
    const result = await handleImageGenerate(
      { prompt: "test", size: "512", quality: "hd", style: "vivid" },
      { apiKey: "test-key" },
    );
    expect(result.isError).toBeUndefined();
  });

  it("ignores non-string args gracefully", async () => {
    const result = await handleImageGenerate(
      { prompt: "test", size: 512, quality: null },
      { apiKey: "test-key" },
    );
    expect(result.isError).toBeUndefined();
  });

  it("throws for unknown provider", async () => {
    const result = await handleImageGenerate(
      { prompt: "test" },
      { provider: "unknown-provider", apiKey: "key" },
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown image generation provider");
  });

  it("throws when no API key available for openai-dalle", async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await handleImageGenerate(
      { prompt: "test" },
      { provider: "openai-dalle" },
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("API key not configured");
  });

  it("uses OPENAI_API_KEY env var when config apiKey not set", async () => {
    process.env.OPENAI_API_KEY = "env-key";
    const result = await handleImageGenerate(
      { prompt: "test" },
      {},
    );
    expect(result.isError).toBeUndefined();
  });
});
