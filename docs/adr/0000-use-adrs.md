# ADR-0000: Use Architecture Decision Records

## Status

Accepted

## Context

As the project grows in complexity with 80+ extensions, multiple platform targets, and a plugin SDK, architectural decisions need to be documented so that contributors and downstream projects can understand the reasoning behind key choices.

Without documented decisions, new contributors must reverse-engineer intent from code, leading to inconsistent patterns and accidental violations of architectural boundaries.

## Decision

We will use Architecture Decision Records (ADRs) to document significant architectural decisions. Each ADR follows the format: Status, Context, Decision, Consequences.

ADRs are stored in `docs/adr/` and numbered sequentially. They are immutable once accepted; superseding decisions create new ADRs that reference the original.

## Consequences

- Architectural intent is discoverable without reading all source code.
- New contributors can onboard faster by reading the ADR index.
- Decisions can be revisited with full context of why they were originally made.
- Slight overhead to write an ADR for each significant decision.
