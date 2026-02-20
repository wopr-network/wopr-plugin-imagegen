# wopr-plugin-imagegen

`@wopr-network/wopr-plugin-imagegen` — Image generation capability plugin for WOPR. Provides `/imagine` command in any channel.

## Commands

```bash
npm run build     # tsc
npm run dev       # tsc --watch
npm run check     # biome check + tsc --noEmit (run before committing)
npm run lint:fix  # biome check --fix src/
npm run format    # biome format --write src/
npm test          # vitest run
```

**Linter/formatter is Biome.** Never add ESLint/Prettier config.

## Architecture

```
src/
  index.ts              # Plugin entry — exports WOPRPlugin default
  config-schema.ts      # ConfigSchema for image generation settings
  imagine-command.ts     # /imagine command handler logic
  prompt-parser.ts       # Parses prompt text and extracts --flags
  types.ts               # Re-exports from plugin-types + local types
```

## Plugin Contract

This plugin imports ONLY from `@wopr-network/plugin-types` — never from wopr core internals.

```typescript
import type { WOPRPlugin, WOPRPluginContext } from "@wopr-network/plugin-types";
```

The default export must satisfy `WOPRPlugin`. The plugin receives `WOPRPluginContext` at `init()` time.

## How It Works

1. User types `/imagine a cat in a tuxedo` in any channel
2. Channel plugin (Discord/Slack/etc.) invokes the registered `ChannelCommand`
3. Plugin parses the prompt and flags
4. Plugin calls `ctx.inject()` with a `[capability:image-generation]` request
5. Core routes via socket layer (WOP-376) — checks credits, picks adapter
6. Image URL is returned and sent to channel

**This plugin does NOT:**
- Import adapter code (Replicate, Nano Banana, etc.)
- Know about credits, billing, or cost
- Know which channel it's running on (channel-agnostic)

## Issue Tracking

All issues in **Linear** (team: WOPR). Issue descriptions start with `**Repo:** wopr-network/wopr-plugin-imagegen`.

## Session Memory

At the start of every WOPR session, **read `~/.wopr-memory.md` if it exists.** It contains recent session context: which repos were active, what branches are in flight, and how many uncommitted changes exist. Use it to orient quickly without re-investigating.

The `Stop` hook writes to this file automatically at session end. Only non-main branches are recorded — if everything is on `main`, nothing is written for that repo.