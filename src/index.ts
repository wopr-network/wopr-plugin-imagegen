/**
 * wopr-plugin-imagegen
 *
 * Image generation plugin for WOPR. Provides:
 * - image_generate A2A tool (DALL-E via OpenAI)
 * - image-gen capability provider registration via manifest
 */

import type { WOPRPlugin, WOPRPluginContext } from "@wopr-network/plugin-types";
import { handleImageGenerate, type ImageGenPluginConfig } from "./image-generate.js";

const plugin: WOPRPlugin = {
  name: "wopr-plugin-imagegen",
  version: "1.0.0",
  description: "Image generation via DALL-E and more",

  manifest: {
    name: "@wopr-network/wopr-plugin-imagegen",
    version: "1.0.0",
    description: "Image generation plugin for WOPR — DALL-E, Replicate, and more",
    license: "MIT",
    repository: "https://github.com/wopr-network/wopr-plugin-imagegen",
    capabilities: ["image-gen"],
    requires: {
      env: [],
      network: {
        outbound: true,
        hosts: ["api.openai.com"],
      },
    },
    provides: {
      capabilities: [
        {
          type: "image-gen",
          id: "wopr-imagegen-dalle",
          displayName: "Image Generation (DALL-E)",
          tier: "byok",
        },
      ],
    },
    configSchema: {
      title: "Image Generation Settings",
      description: "Configure your image generation provider and credentials",
      fields: [
        {
          name: "provider",
          type: "select",
          label: "Provider",
          description: "Image generation provider to use",
          default: "openai-dalle",
          options: [{ value: "openai-dalle", label: "OpenAI DALL-E 3" }],
          required: false,
        },
        {
          name: "apiKey",
          type: "password",
          label: "OpenAI API Key",
          description: "Your OpenAI API key for DALL-E image generation",
          secret: true,
          required: false,
        },
      ],
    },
    icon: "🎨",
    category: "image",
    tags: ["image", "generation", "dalle", "openai", "ai"],
  },

  async init(ctx: WOPRPluginContext) {
    const config = ctx.getConfig<ImageGenPluginConfig>();

    if (ctx.registerA2AServer) {
      ctx.registerA2AServer({
        name: "imagegen",
        version: "1.0.0",
        tools: [
          {
            name: "image_generate",
            description:
              "Generate an image from a text prompt using AI (DALL-E). Returns the file path of the generated image.",
            inputSchema: {
              type: "object",
              properties: {
                prompt: {
                  type: "string",
                  description: "Text description of the image to generate",
                },
                size: {
                  type: "string",
                  enum: ["256", "512", "1024"],
                  description: "Image size in pixels (256, 512, or 1024). Default: 1024",
                },
                quality: {
                  type: "string",
                  enum: ["standard", "hd"],
                  description: "Image quality: standard or hd. Default: standard",
                },
                style: {
                  type: "string",
                  enum: ["natural", "vivid"],
                  description: "Image style: natural or vivid. Default: natural",
                },
              },
              required: ["prompt"],
            },
            handler: (args) => handleImageGenerate(args, config),
          },
        ],
      });
    }

    ctx.log.info("[wopr-plugin-imagegen] initialized");
  },

  async shutdown() {
    // No persistent state or timers to clean up.
  },
};

export default plugin;
