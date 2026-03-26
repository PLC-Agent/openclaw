---
summary: "Comprehensive overview of the Agents concept: data model, lifecycle, routing, and UI surfaces"
read_when:
  - You want a high-level understanding of agents in OpenClaw
  - You need to understand the full agents system end-to-end
title: "Agents Overview"
---

# Agents Overview

An **agent** in OpenClaw is a fully isolated, autonomous AI entity with its own workspace, identity, sessions, authentication, and tool/skill configuration. The Gateway can host a single agent (default) or many agents side-by-side, each with distinct personalities, channel bindings, and security boundaries.

This document covers the agents concept end-to-end: data model, lifecycle, routing, and every UI surface where agents appear.

## What is an agent?

An agent is a scoped "brain" comprising three pillars:

| Pillar | Location | Purpose |
|--------|----------|---------|
| **Workspace** | `~/.openclaw/workspace` (or per-agent) | Operating instructions, persona files, memory, local skills |
| **State directory** | `~/.openclaw/agents/<agentId>/agent` | Auth profiles, model registry, per-agent config |
| **Session store** | `~/.openclaw/agents/<agentId>/sessions` | Chat history (JSONL), routing state, transcript metadata |

In single-agent mode (default), the `agentId` is `main`. In multi-agent mode, each entry in `agents.list[]` defines an isolated agent.

### Data model

Each agent is defined by an `AgentConfig`:

- **`id`** — unique identifier (e.g. `"main"`, `"coding"`, `"family"`)
- **`name`** — display name (optional, falls back to identity name or id)
- **`workspace`** — path to the agent's home directory
- **`model`** — primary model and optional fallbacks (e.g. `"anthropic/claude-opus-4-6"`)
- **`identity`** — name, emoji, avatar, theme color
- **`skills`** — allowlist of enabled skills (empty = all skills)
- **`tools`** — allow/deny lists for tool access
- **`sandbox`** — per-agent sandboxing mode and scope
- **`groupChat`** — mention patterns for group chat routing
- **`subagents`** — sub-agent parallelism, allowed agents, model overrides
- **`heartbeat`** — periodic background run configuration
- **`runtime`** — `"embedded"` (default) or `"acp"` (external harness)

### Identity

Each agent can have a visual identity:

- **Name** — the agent's self-identified name
- **Emoji** — a representative emoji
- **Avatar** — image path (workspace-relative, HTTP URL, or data URI)
- **Theme** — UI accent color

Identity is resolved from: config `agents.list[].identity` > `IDENTITY.md` in workspace > web UI editor. In the UI, the display name is resolved as: `agent.name` > `identity.name` > `agent.id`.

## Workspace and bootstrap files

The workspace is the agent's home directory. It contains operating instructions that are injected into the agent's context at the start of every session:

| File | Purpose |
|------|---------|
| `AGENTS.md` | Operating instructions and memory rules |
| `SOUL.md` | Persona, tone, and boundaries |
| `USER.md` | User profile and preferred address |
| `IDENTITY.md` | Agent name, vibe, emoji |
| `TOOLS.md` | User-maintained tool notes (guidance only, does not gate tools) |
| `BOOTSTRAP.md` | One-time first-run ritual (deleted after completion) |
| `HEARTBEAT.md` | Optional checklist for periodic heartbeat runs |
| `BOOT.md` | Optional startup checklist on gateway restart |
| `memory/YYYY-MM-DD.md` | Daily memory logs |
| `skills/` | Workspace-specific skills (override bundled/managed) |

Missing files produce a marker line; large files are truncated. Limits: `bootstrapMaxChars` (default 20000) and `bootstrapTotalMaxChars` (default 150000).

Full workspace layout: [Agent workspace](/concepts/agent-workspace).

## Agent lifecycle (the agent loop)

The agent loop is the full execution cycle for a single turn:

1. **Intake** — `agent` RPC validates params, resolves session, returns `{ runId, acceptedAt }` immediately
2. **Context assembly** — workspace bootstrap files, skills, and system prompt are assembled
3. **Model inference** — the model generates a response, potentially with tool calls
4. **Tool execution** — tools run and produce results; tool events are streamed
5. **Streaming** — assistant deltas are emitted as `assistant` stream events
6. **Persistence** — session transcript is written to the JSONL store
7. **Reply shaping** — final payloads are assembled, `NO_REPLY` tokens filtered, duplicates removed

Runs are serialized per session (session lane) to prevent races. Global concurrency is capped by `maxConcurrent` (default 4 agents, 8 sub-agents).

Detailed walkthrough: [Agent loop](/concepts/agent-loop).

## Multi-agent routing

When multiple agents are configured, inbound messages are routed via **bindings** — deterministic rules that match on channel, account, peer, guild, team, or roles.

### Binding priority (most-specific wins)

1. `peer` match (exact DM/group/channel id)
2. `parentPeer` match (thread inheritance)
3. `guildId + roles` (Discord role routing)
4. `guildId` (Discord)
5. `teamId` (Slack)
6. `accountId` match for a channel
7. Channel-level match (`accountId: "*"`)
8. Fallback to default agent

If multiple bindings match in the same tier, the first in config order wins. All fields in a binding use AND semantics.

### CLI management

```bash
openclaw agents add coding --workspace ~/.openclaw/workspace-coding
openclaw agents bind --agent coding --bind discord:guild-a
openclaw agents list --bindings
openclaw agents unbind --agent coding --bind discord:guild-a
openclaw agents delete coding
```

Full routing details: [Multi-agent routing](/concepts/multi-agent).

## Sub-agents

Agents can spawn background sub-agents via the `sessions_spawn` tool. Sub-agents run in isolated sessions with their own concurrency limits:

- **Max concurrent sub-agents**: 8 (default)
- **Max spawn depth**: 1 (default, prevents deep nesting)
- **Max children per agent**: 5 (default)
- **Auto-cleanup**: 60 minutes (default)

Sub-agent management commands: `/subagents list`, `/subagents kill`, `/subagents log`, `/subagents spawn`.

Details: [Sub-agents](/tools/subagents).

## Authentication

Each agent has isolated auth profiles at:

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

Main agent credentials are not shared automatically. To share credentials between agents, copy the `auth-profiles.json` file.

---

# UI surfaces

Agents appear across four platforms: the **web control UI**, the **macOS app**, the **iOS app**, and the **CLI**. Each surface exposes different levels of agent management.

## Web control UI

The web UI is the primary management surface for agents. It lives under the **Agent** navigation tab group (route: `/agents`) alongside Skills and Nodes tabs.

### Agent selection

At the top of the agents view, a **toolbar** provides:

- **Agent dropdown** — lists all configured agents with their display name and a "(default)" badge for the default agent. Selecting an agent reloads the active panel's data for that agent.
- **Actions menu** (three-dot button) — "Copy agent ID" and "Set as default" actions.
- **Refresh button** — reloads the agent list from the gateway.

When no agent is selected, the UI shows a prompt: "Select an agent — Pick an agent to inspect its workspace and tools."

### Six tabbed panels

Once an agent is selected, the view displays six panels via a tab bar. Tabs show count badges when data is loaded (e.g. file count, skill count, cron job count).

#### 1. Overview panel

The overview is the landing panel showing the agent's configuration summary:

- **Workspace path** — clickable link that navigates to the Files panel
- **Primary model** — dropdown selector for model selection. Non-default agents show an "Inherit default" option
- **Model fallbacks** — chip-style tag input for adding/removing fallback models (type and press Enter/comma to add, click X to remove)
- **Skills filter** — shows "all skills" or "N selected"
- **Config actions** — "Reload Config" and "Save" buttons. Save is disabled until changes are made; an unsaved changes warning appears when the config is dirty

#### 2. Files panel

A split-pane file manager for the agent's workspace bootstrap files:

- **Left sidebar** — lists workspace files (AGENTS.md, SOUL.md, IDENTITY.md, USER.md, BOOTSTRAP.md, etc.) with file size and last-modified timestamp
- **Right pane** — displays the selected file's contents with draft tracking
- **Actions per file** — "Reset" (discard draft) and "Save" (persist to disk via RPC)
- **Tab badge** — shows total file count

#### 3. Tools panel

Manages tool availability and policy for the selected agent:

- **Policy profile selector** — choose from profiles (Minimal, Coding, Messaging, Full). Shows the source: "agent override", "global default", or "default"
- **Tool sections** grouped by category:
  - Files: `read`, `write`, `edit`, `apply_patch`
  - Runtime: `exec`, `process`
  - Web: `web_search`, `web_fetch`
  - Memory: `memory_search`, `memory_get`
  - Sessions: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
  - UI: `browser`, `canvas`
  - Messaging: `message`
  - Automation: `cron`, `gateway`
  - Nodes: `nodes`
  - Agents: `agents_list`
  - Media: `image`
- **Per-tool display** — tool name, description, source badge ("core" or "plugin:id"), optional badge, and allowed/denied status indicator
- **Config actions** — "Reload Config" and "Save"

#### 4. Skills panel

Per-agent skill allowlist management:

- **Skill count badge** — shows "N/Total" enabled skills
- **Filter input** — search skills by name, description, or source
- **Skill groups** — grouped and sorted by category
- **Per-skill entry** — name, description, source (bundled/local/workspace), enabled/disabled toggle, status chips for missing dependencies
- **Bulk actions** — "Clear all" (enable all skills by removing the allowlist) and "Disable all" (create empty allowlist)
- **Config actions** — "Reload Config" and "Save"

#### 5. Channels panel

Displays channel bindings and connection status for the selected agent:

- **Agent context card** — workspace path, primary model, identity name, avatar (custom or placeholder), skills filter status, default flag
- **Channel summary** — ordered list of channels with configured accounts, per-account connection status and metadata (phone number, user ID, etc.)
- **Refresh** — manual refresh with last-success timestamp

#### 6. Cron Jobs panel

Agent-specific scheduled task management:

- **Job list** — filtered to jobs matching the selected agent's ID
- **Per-job display** — job name, schedule (cron expression or natural language), next run time, last run status, delivery status
- **Job actions** — "Run now", edit, clone, toggle enabled, delete
- **Job details** — channel/account bindings, payload preview, thinking level, timezone

### State management

The web UI controller (`controllers/agents.ts`) manages:

- `agentsList` — all agents plus the default ID, fetched via `agents.list` RPC
- `agentsSelectedId` — currently selected agent (auto-selects default or first on load)
- `toolsCatalog` — per-agent tool catalog, fetched via `tools.catalog` RPC
- Config save flow — saves config, reloads agent list, preserves selection

## macOS app

### Agent events window

The macOS app provides a real-time **Agent Events Window** (`AgentEventsWindow.swift`) for monitoring agent execution:

- **Header** — "Agent Events" title with a "Clear" button
- **Event stream** — scrollable list of recent events (max 400 stored, FIFO)
- **Per-event display**:
  - **Stream badge** — color-coded rounded rectangle: blue (`job`), orange (`tool`), green (`assistant`), gray (other)
  - **Run ID** — monospaced "run [runId]" label
  - **Timestamp** — formatted as HH:mm:ss.SSS
  - **Event data** — pretty-printed JSON (selectable, monospaced)
- **State** — managed by `AgentEventStore.shared` singleton (Observable pattern)

### Workspace bootstrap

The macOS app handles workspace initialization (`AgentWorkspace.swift`):

- Creates template bootstrap files (AGENTS.md, SOUL.md, IDENTITY.md, USER.md, BOOTSTRAP.md, TOOLS.md) from bundled templates
- Validates workspace before bootstrap (safety checks)
- Provides utility functions: `displayPath()`, `resolveWorkspaceURL()`, `isWorkspaceEmpty()`, `hasIdentity()`

### Menu bar

The macOS menu bar app shows agent status and provides gateway restart controls.

## iOS app

The iOS app has a more limited agent surface focused on communication rather than configuration:

- **Chat interface** — communicates with the active agent via the shared OpenClawKit framework
- **Deep link support** — `DeepLinkAgentPromptAlert.swift` handles voice/share shortcuts that route messages to the agent
- **Gateway settings** — basic connection and gateway configuration

iOS does not expose agent switching, workspace editing, or tool/skill management. Those are desktop and web surfaces only.

## CLI

The CLI provides full agent management and execution:

### Agent execution

```bash
openclaw agent --message "status update"
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Query" --thinking medium
openclaw agent --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --local --message "Run locally without gateway"
```

Key flags: `--agent` (target agent), `--to` (session derivation), `--deliver` (send reply to channel), `--thinking`/`--verbose` (persist levels), `--timeout` (execution timeout), `--local` (embedded runtime), `--json` (structured output).

### Agent management

```bash
openclaw agents list [--bindings] [--json]
openclaw agents add <id> [--workspace PATH] [--name NAME] [--model MODEL]
openclaw agents delete <id> [--delete-files]
openclaw agents bind --agent <id> --bind <channel[:account]>
openclaw agents unbind --agent <id> --bind <channel[:account]>
openclaw agents set-identity --agent <id> --avatar <path>
```

### Gateway RPCs

The gateway exposes these agent-related RPC methods:

| Method | Purpose |
|--------|---------|
| `agent` | Execute one agent turn |
| `agent.wait` | Wait for a run to complete |
| `agent.identity` | Fetch agent identity |
| `agents.list` | List all agents |
| `agents.create` | Create a new agent |
| `agents.update` | Update agent config |
| `agents.delete` | Delete an agent |
| `agents.files.list` | List workspace files |
| `agents.files.get` | Read a workspace file |
| `agents.files.set` | Write a workspace file |

---

## Platform comparison

| Capability | Web UI | macOS | iOS | CLI |
|------------|--------|-------|-----|-----|
| Agent selection/switching | Dropdown | N/A (connected agent) | N/A (implicit) | `--agent` flag |
| Overview (workspace, model) | Overview panel | Workspace bootstrap | N/A | `agents list` |
| File editing | Files panel | Template creation | N/A | `agents.files.*` RPC |
| Tool management | Tools panel | N/A | N/A | Config file |
| Skill management | Skills panel | N/A | N/A | Config file |
| Channel bindings | Channels panel | N/A | N/A | `agents bind/unbind` |
| Cron jobs | Cron panel | N/A | N/A | Config file |
| Real-time events | N/A | Agent Events window | N/A | Stream output |
| Chat with agent | N/A | Menu bar | Chat interface | `agent --message` |
| Identity management | Overview panel | Workspace | N/A | `set-identity` |
| Create/delete agents | N/A | N/A | N/A | `agents add/delete` |

---

_See also: [Agent runtime](/concepts/agent), [Agent loop](/concepts/agent-loop), [Agent workspace](/concepts/agent-workspace), [Multi-agent routing](/concepts/multi-agent), [Sub-agents](/tools/subagents)_
