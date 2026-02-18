import { imagegenConfigSchema } from "./config-schema.js";
import { handleImagineCommand, parseImagineResponse } from "./imagine-command.js";
import type {
  A2AToolResult,
  ChannelCommand,
  ImageGenConfig,
  PluginManifest,
  WOPRPlugin,
  WOPRPluginContext,
} from "./types.js";

let ctx: WOPRPluginContext | null = null;
const registeredProviderIds: string[] = [];
let unsubscribeAfterInit: (() => void) | null = null;

const manifest: PluginManifest = {
  name: "@wopr-network/wopr-plugin-imagegen",
  version: "1.0.0",
  description: "Generate images with AI — /imagine in any channel",
  author: "WOPR",
  license: "MIT",
  capabilities: ["image-generation"],
  requires: {
    network: {
      outbound: true,
    },
  },
  provides: {
    capabilities: [],
  },
  icon: "palette",
  category: "creative",
  tags: ["imagegen", "image-generation", "ai", "creative", "imagine"],
  lifecycle: {
    shutdownBehavior: "drain",
    shutdownTimeoutMs: 30_000,
  },
};

function getConfig(): ImageGenConfig {
  return ctx?.getConfig<ImageGenConfig>() ?? {};
}

function buildImagineCommand(): ChannelCommand {
  return {
    name: "imagine",
    description: "Generate an image from a text prompt",
    async handler(cmdCtx) {
      if (!ctx) return;
      await handleImagineCommand(cmdCtx, ctx, getConfig());
    },
  };
}

const plugin: WOPRPlugin = {
  name: "@wopr-network/wopr-plugin-imagegen",
  version: "1.0.0",
  description: "Generate images with AI — /imagine in any channel",
  manifest,

  async init(context: WOPRPluginContext) {
    ctx = context;

    // 1. Register config schema
    ctx.registerConfigSchema("wopr-plugin-imagegen", imagegenConfigSchema);

    // 2. Register A2A tools
    if (ctx.registerA2AServer) {
      ctx.registerA2AServer({
        name: "imagegen",
        version: "1.0",
        tools: [
          {
            name: "imagine",
            description:
              "Generate an image from a text prompt. Returns an image URL. " +
              "Supports optional model, size, and style parameters.",
            inputSchema: {
              type: "object",
              properties: {
                prompt: {
                  type: "string",
                  description: "Text description of the image to generate",
                },
                model: {
                  type: "string",
                  description: "Model to use (flux, sdxl, dall-e). Defaults to plugin config.",
                },
                size: {
                  type: "string",
                  description: "Image dimensions in WxH format (e.g. 1024x1024). Defaults to plugin config.",
                },
                style: {
                  type: "string",
                  description:
                    "Style preset (auto, photorealistic, artistic, anime, pixel-art). Defaults to plugin config.",
                },
                sessionId: {
                  type: "string",
                  description: "Session ID for context (optional).",
                },
              },
              required: ["prompt"],
            },
            async handler(args: Record<string, unknown>): Promise<A2AToolResult> {
              if (!ctx) {
                return {
                  content: [{ type: "text", text: "Plugin not initialized" }],
                  isError: true,
                };
              }

              const prompt = args.prompt;
              if (typeof prompt !== "string" || !prompt) {
                return {
                  content: [{ type: "text", text: "prompt is required and must be a non-empty string" }],
                  isError: true,
                };
              }
              const config = getConfig();
              const model = (args.model as string) ?? config.defaultModel ?? "flux";
              const size = (args.size as string) ?? config.defaultSize ?? "1024x1024";
              const style = (args.style as string) ?? config.defaultStyle ?? "auto";
              const sessionId = (args.sessionId as string) ?? "imagegen:a2a";

              const capabilityMessage = [
                `[capability:image-generation]`,
                `prompt: ${prompt}`,
                `model: ${model}`,
                `size: ${size}`,
                `style: ${style}`,
              ].join("\n");

              try {
                const response = await ctx.inject(sessionId, capabilityMessage, {
                  from: "a2a:imagegen",
                });

                const parsed = parseImagineResponse(response);
                if (parsed.error) {
                  return {
                    content: [{ type: "text", text: `Error: ${parsed.error}` }],
                    isError: true,
                  };
                }
                if (parsed.imageUrl) {
                  return {
                    content: [
                      { type: "image", data: parsed.imageUrl, mimeType: "text/uri-list" },
                      { type: "text", text: `Generated image: ${parsed.imageUrl}` },
                    ],
                  };
                }

                return { content: [{ type: "text", text: response }] };
              } catch (err) {
                return {
                  content: [{ type: "text", text: `Image generation failed: ${err}` }],
                  isError: true,
                };
              }
            },
          },
        ],
      });
      ctx.log.info("Registered imagegen A2A tools");
    }

    // 3. Register /imagine command on all available channel providers
    const imagineCmd = buildImagineCommand();
    const providers = ctx.getChannelProviders?.() ?? [];
    for (const provider of providers) {
      (provider as unknown as { registerCommand: (cmd: ChannelCommand) => void }).registerCommand(imagineCmd);
      registeredProviderIds.push((provider as unknown as { id: string }).id);
      ctx.log.info(`Registered /imagine on channel provider: ${(provider as unknown as { id: string }).id}`);
    }

    // 4. Listen for new channel providers (late-loading plugins)
    if (ctx.events) {
      unsubscribeAfterInit = ctx.events.on("plugin:afterInit", () => {
        if (!ctx) return;
        const currentProviders = ctx.getChannelProviders?.() ?? [];
        for (const provider of currentProviders) {
          const providerId = (provider as unknown as { id: string }).id;
          if (!registeredProviderIds.includes(providerId)) {
            (provider as unknown as { registerCommand: (cmd: ChannelCommand) => void }).registerCommand(
              buildImagineCommand(),
            );
            registeredProviderIds.push(providerId);
            ctx.log.info(`Late-registered /imagine on channel provider: ${providerId}`);
          }
        }
      });
    }

    ctx.log.info("ImageGen plugin initialized");
  },

  async shutdown() {
    unsubscribeAfterInit?.();
    unsubscribeAfterInit = null;
    if (ctx) {
      const providers = ctx.getChannelProviders?.() ?? [];
      for (const provider of providers) {
        try {
          (provider as unknown as { unregisterCommand: (name: string) => void }).unregisterCommand("imagine");
        } catch {
          // Provider may already be gone
        }
      }
    }
    registeredProviderIds.length = 0;
    ctx = null;
  },
};

export default plugin;
