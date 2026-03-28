# ADR-0007: Commander-based CLI with Dependency Injection

## Status

Accepted

## Context

The project exposes a CLI (`openclaw`) with dozens of commands spanning configuration, messaging, channel management, agent orchestration, and more. The CLI needs to:

- Support a large command surface without monolithic entrypoint bloat
- Be testable without requiring real channel connections or API keys
- Start quickly despite the large dependency graph (see ADR-0004)

## Decision

Build the CLI on Commander.js with the following architectural patterns:

**Command registration:**
- Commands organized by domain in `src/commands/` (agent, backup, config, message, onboard, setup, etc.)
- Registered via route definitions in `src/cli/program/routes.ts`
- Pre-action hooks (`src/cli/program/preaction.ts`) and config guards (`src/cli/program/config-guard.ts`) gate commands

**Dependency injection:**
- `createDefaultDeps()` in `src/cli/deps.ts` provides the runtime dependency bag
- Dependencies are lazy-loaded (ADR-0004): channel send functions, runtime surfaces
- Tests can substitute mock dependencies without touching global state

**Option handling:**
- Centralized option definitions: `src/cli/argv.ts`, `src/cli/command-options.ts`, `src/cli/channel-options.ts`
- Profile-aware: `src/cli/profile.ts` handles multi-profile switching
- Cross-platform normalization: `src/cli/windows-argv.ts`

**UI patterns:**
- Progress indicators via `src/cli/progress.ts` (OSC progress + clack spinners)
- Table output via `src/terminal/table.ts` (ANSI-safe wrapping)
- Shared color palette via `src/terminal/palette.ts` (no hardcoded colors)

## Consequences

- New commands are added by creating a command module and registering a route; no monolithic switch statement.
- Dependency injection makes commands testable in isolation.
- Lazy-loaded deps keep CLI startup fast for all commands, not just the one being invoked.
- Commander.js provides built-in help generation, completion, and argument parsing.
- The centralized option definitions prevent inconsistent flag names across commands.
