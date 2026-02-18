import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { OpenAIDalleProvider } from "../src/providers/openai-dalle.js";

// Mock node:fs/promises
vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe("OpenAIDalleProvider", () => {
  let provider: OpenAIDalleProvider;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    provider = new OpenAIDalleProvider("test-api-key");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("has correct name", () => {
    expect(provider.name).toBe("openai-dalle");
  });

  it("generates an image successfully", async () => {
    const fakeB64 = Buffer.from("fake-image-data").toString("base64");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ b64_json: fakeB64, revised_prompt: "revised" }],
        }),
    });

    const result = await provider.generate(
      { prompt: "a sunset over mountains" },
      "/tmp/output.png",
    );

    expect(result.filePath).toBe("/tmp/output.png");
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.revisedPrompt).toBe("revised");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/images/generations",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  it("resolves size shortcuts", async () => {
    const fakeB64 = Buffer.from("data").toString("base64");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ b64_json: fakeB64 }] }),
    });

    await provider.generate({ prompt: "test", size: "256" }, "/tmp/out.png");

    const callBody = JSON.parse(
      (globalThis.fetch as any).mock.calls[0][1].body,
    );
    expect(callBody.size).toBe("256x256");
  });

  it("defaults size to 1024x1024 for unknown values", async () => {
    const fakeB64 = Buffer.from("data").toString("base64");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ b64_json: fakeB64 }] }),
    });

    await provider.generate({ prompt: "test", size: "999" }, "/tmp/out.png");

    const callBody = JSON.parse(
      (globalThis.fetch as any).mock.calls[0][1].body,
    );
    expect(callBody.size).toBe("1024x1024");
  });

  it("throws on rate limit (429)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve(JSON.stringify({ error: { message: "rate limited" } })),
    });

    await expect(
      provider.generate({ prompt: "test" }, "/tmp/out.png"),
    ).rejects.toThrow("Rate limited");
  });

  it("throws on content policy violation", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () =>
        Promise.resolve(
          JSON.stringify({ error: { message: "content policy violation" } }),
        ),
    });

    await expect(
      provider.generate({ prompt: "bad content" }, "/tmp/out.png"),
    ).rejects.toThrow("Content policy violation");
  });

  it("throws on generic API error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal server error"),
    });

    await expect(
      provider.generate({ prompt: "test" }, "/tmp/out.png"),
    ).rejects.toThrow("DALL-E API error (500)");
  });

  it("throws when API returns no image data", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{}] }),
    });

    await expect(
      provider.generate({ prompt: "test" }, "/tmp/out.png"),
    ).rejects.toThrow("no image data");
  });

  it("throws when data array is empty", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    await expect(
      provider.generate({ prompt: "test" }, "/tmp/out.png"),
    ).rejects.toThrow("no image data");
  });
});
