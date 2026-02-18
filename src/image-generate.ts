/**
 * Image generation logic for wopr-plugin-imagegen.
 *
 * Multi-provider image generation. Saves generated images to
 * WOPR_HOME/attachments/generated/.
 */

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { OpenAIDalleProvider } from "./providers/openai-dalle.js";

// ---------------------------------------------------------------------------
// Provider abstraction
// ---------------------------------------------------------------------------

export interface ImageGenerationRequest {
  prompt: string;
  size?: string;
  quality?: string;
  style?: string;
}

export interface ImageGenerationResult {
  filePath: string;
  sizeBytes: number;
  revisedPrompt?: string;
}

export interface ImageGenerationProvider {
  readonly name: string;
  generate(request: ImageGenerationRequest, outputPath: string): Promise<ImageGenerationResult>;
}

// ---------------------------------------------------------------------------
// Config interface
// ---------------------------------------------------------------------------

export interface ImageGenPluginConfig {
  provider?: string;
  apiKey?: string;
}

// ---------------------------------------------------------------------------
// Output directory
// ---------------------------------------------------------------------------

function getGeneratedDir(): string {
  const woprHome = process.env.WOPR_HOME ?? join(process.env.HOME ?? "/tmp", ".wopr");
  return join(woprHome, "attachments", "generated");
}

function ensureOutputDir(): string {
  const dir = getGeneratedDir();
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Provider resolution
// ---------------------------------------------------------------------------

function getProvider(config: ImageGenPluginConfig): ImageGenerationProvider {
  const providerName = config.provider ?? "openai-dalle";
  const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY;

  if (providerName === "openai-dalle") {
    if (!apiKey) {
      throw new Error(
        "OpenAI API key not configured. Set apiKey in plugin config, " +
          "or set the OPENAI_API_KEY environment variable.",
      );
    }
    return new OpenAIDalleProvider(apiKey);
  }

  throw new Error(`Unknown image generation provider: ${providerName}. Supported: openai-dalle`);
}

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function handleImageGenerate(
  args: Record<string, unknown>,
  config: ImageGenPluginConfig,
): Promise<{ content: Array<{ type: "text" | "image" | "resource"; text?: string }>; isError?: boolean }> {
  const prompt = typeof args.prompt === "string" ? args.prompt : "";
  const size = typeof args.size === "string" ? args.size : undefined;
  const quality = typeof args.quality === "string" ? args.quality : undefined;
  const style = typeof args.style === "string" ? args.style : undefined;

  if (!prompt || prompt.trim().length === 0) {
    return {
      content: [{ type: "text" as const, text: "Error: prompt cannot be empty" }],
      isError: true,
    };
  }

  try {
    const outputDir = ensureOutputDir();
    const provider = getProvider(config);
    const filename = `${randomUUID()}.png`;
    const outputPath = join(outputDir, filename);

    const result = await provider.generate({ prompt, size, quality, style }, outputPath);

    const response: Record<string, unknown> = {
      filePath: result.filePath,
      sizeBytes: result.sizeBytes,
      provider: provider.name,
    };
    if (result.revisedPrompt) {
      response.revisedPrompt = result.revisedPrompt;
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Image generation failed: ${message}` }],
      isError: true,
    };
  }
}
