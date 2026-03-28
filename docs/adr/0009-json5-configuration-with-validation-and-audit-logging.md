# ADR-0009: JSON5 Configuration with Validation and Audit Logging

## Status

Accepted

## Context

The application has complex configuration needs: channel credentials, provider API keys, gateway settings, plugin configuration, and per-profile overrides. Configuration must be:

- Human-editable (comments, trailing commas)
- Validated at load time to catch errors early
- Auditable for security-sensitive changes
- Composable (include other config files)

## Decision

Use JSON5 as the configuration file format with the following infrastructure:

**Configuration system (`src/config/`):**
- `io.ts`: loading with validation, migration, and file-include support
- `paths.ts`: platform-aware state directories and config file candidates
- `types.ts`: strongly-typed `OpenClawConfig` type
- `validation.ts`: plugin-aware schema validation
- `runtime-overrides.ts`: runtime override support for CLI flags

**Key features:**
- JSON5 parsing allows comments and trailing commas in config files
- File includes with circular dependency detection
- Environment variable substitution
- Configuration migration for schema changes across versions
- Audit logging to `.openclaw/config-audit.jsonl` for all config writes

**Storage layout:**
- `~/.openclaw/`: default state directory (configurable via `OPENCLAW_STATE_DIR`)
- `~/.openclaw/credentials/`: isolated credential storage
- `~/.openclaw/sessions/`: session data
- `~/.openclaw/agents/<agentId>/sessions/`: agent session logs

## Consequences

- JSON5 is more human-friendly than JSON for hand-edited config files.
- Schema validation catches misconfiguration at load time rather than at runtime failure.
- Audit logging provides traceability for configuration changes, important for security-sensitive credentials.
- File includes enable modular configuration (e.g., separate files for channel credentials).
- Circular dependency detection in includes prevents infinite loops.
- Runtime overrides allow CLI flags to temporarily alter behavior without persisting changes.
