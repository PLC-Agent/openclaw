# ADR-0011: CI with Scope Detection and Platform Matrix

## Status

Accepted

## Context

The CI pipeline must validate a large, multi-platform codebase (Linux, macOS, Windows, Android) without wasting resources on unrelated checks. Docs-only changes should not trigger full test suites. Platform-specific changes should only trigger relevant platform jobs.

## Decision

Structure CI (GitHub Actions) with scope detection and conditional execution:

**Always-run jobs:**
- Lint and format checks (fast, catches most issues)

**Conditionally-run jobs:**
- `detect-docs-changes` action skips heavy jobs for docs-only PRs
- Changed-scope detection skips unrelated platform jobs
- Concurrency groups prevent duplicate runs on rapid pushes

**Platform matrix:**
- Linux: primary test and build target
- macOS: native app builds and platform-specific tests
- Windows: cross-platform compatibility
- Android: mobile app builds

**Release workflows (separate):**
- `docker-release.yml`: Docker image builds
- `openclaw-npm-release.yml`: NPM package releases
- `plugin-npm-release.yml`: individual plugin releases

**Quality gates:**
- `pnpm check` (lint + format) and `pnpm test` are the default landing bar
- `pnpm build` is required when changes affect build output, packaging, or module boundaries
- CodeQL for security scanning
- Installation smoke tests for release validation

## Consequences

- CI is fast for narrow changes (docs, single extension) while thorough for broad changes.
- Platform-specific failures are caught without running every platform for every change.
- Separate release workflows isolate the release process from feature development CI.
- Scope detection logic must be maintained as the project structure evolves.
- Concurrency groups prevent resource waste but may cancel in-progress runs on rapid iteration.
