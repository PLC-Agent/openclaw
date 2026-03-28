# ADR-0008: Multi-channel Architecture with Channel-agnostic Core

## Status

Accepted

## Context

The application supports messaging across many channels (Telegram, Discord, Slack, Signal, iMessage, WhatsApp, MS Teams, Matrix, Zalo, voice calls, and more). Each channel has different APIs, message formats, and capabilities. The core logic (routing, agent orchestration, media handling) should not be coupled to any specific channel.

## Decision

Separate the architecture into a channel-agnostic core and channel-specific adapters:

**Core (channel-agnostic):**
- `src/routing/`: message routing logic
- `src/agents/`: agent orchestration and tool execution
- `src/media/`: media pipeline (understanding, conversion)
- `src/config/`: configuration management
- `src/gateway/`: web gateway server

**Built-in channels:**
- `src/telegram/`, `src/discord/`, `src/slack/`, `src/signal/`, `src/imessage/`, `src/web/`
- Each implements a channel adapter interface

**Extension channels:**
- `extensions/msteams/`, `extensions/matrix/`, `extensions/zalo/`, `extensions/voice-call/`, etc.
- Implement the same adapter interface via the plugin SDK (ADR-0003)

**Enforcement:**
- Lint rule `channel-agnostic-boundaries` prevents channel-specific logic from leaking into core modules
- Lint rule `no-raw-channel-fetch` enforces abstraction layers for channel data access
- All channels (built-in + extension) must be considered when refactoring shared logic (routing, allowlists, pairing, command gating, onboarding)

**Documentation:**
- Core channel docs: `docs/channels/`
- Channel labels and CI labeler rules: `.github/labeler.yml`

## Consequences

- New channels can be added as extensions without modifying core code.
- Core logic is testable without channel-specific mocking.
- Lint rules prevent accidental coupling between core and channel-specific code.
- All channels share the same routing, agent, and media infrastructure.
- Adding a new channel requires updating multiple surfaces (UI, docs, onboarding, labeler config), which is documented but requires diligence.
