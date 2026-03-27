# ⚠️ This package has moved

This package is now maintained in the [wopr-plugins monorepo](https://github.com/wopr-network/wopr-plugins/tree/main/packages/plugin-imagegen).

This repository is archived and no longer accepts contributions.

---

# @wopr-network/wopr-plugin-imagegen

> AI image generation plugin for WOPR — use `/imagine` in any channel to generate images via DALL-E, Replicate, and more.

## Install

```bash
npm install @wopr-network/wopr-plugin-imagegen
```

## Usage

```bash
wopr plugin install github:wopr-network/wopr-plugin-imagegen
```

Then configure via `wopr configure --plugin @wopr-network/wopr-plugin-imagegen`.

## Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | string | No | Image provider: `openai` (default), `replicate` |
| `openai_api_key` | string | Yes (OpenAI) | OpenAI API key for DALL-E generation |
| `replicate_api_token` | string | Yes (Replicate) | Replicate API token |
| `default_size` | string | No | Default image size, e.g. `1024x1024` |
| `default_model` | string | No | Default model, e.g. `dall-e-3` |

## What it does

The imagegen plugin adds a `/imagine <prompt>` command to any connected channel, allowing users to generate AI images on demand. It supports multiple providers (OpenAI DALL-E, Replicate) with configurable fallback, and exposes image generation as an A2A tool so agents can programmatically create images mid-conversation.

## License

MIT