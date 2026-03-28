# ADR-0010: Dead Code Detection with Knip

## Status

Accepted

## Context

In a large monorepo with 80+ extensions and multiple entry points, unused exports, dependencies, and files accumulate over time. Dead code increases bundle size, confuses contributors, and creates a false sense of API surface.

## Decision

Use Knip (`knip.config.ts`) for automated dead code detection:

- Configured with multiple entry points (CLI, hooks, plugin SDK exports, extensions)
- Detects unused exports, unused dependencies, unused files, and unlisted dependencies
- Runs as part of the quality gate alongside lint and format checks

## Consequences

- Unused code is detected automatically, keeping the codebase lean.
- Multiple entry point configuration prevents false positives from the diverse module graph.
- Contributors get early feedback when they leave unused exports or dependencies behind.
- Configuration must be maintained as new entry points or export surfaces are added.
