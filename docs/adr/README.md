# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) documenting significant architectural decisions in this project. These ADRs can serve as a reference for other projects that follow the same architecture.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0000](0000-use-adrs.md) | Use Architecture Decision Records | Accepted |
| [0001](0001-esm-typescript-with-strict-typing.md) | ESM TypeScript with Strict Typing | Accepted |
| [0002](0002-pnpm-monorepo-with-workspace-packages.md) | PNPM Monorepo with Workspace Packages | Accepted |
| [0003](0003-plugin-sdk-boundary-via-subpath-exports.md) | Plugin SDK Boundary via Subpath Exports | Accepted |
| [0004](0004-lazy-loading-for-cli-startup-performance.md) | Lazy Loading for CLI Startup Performance | Accepted |
| [0005](0005-oxlint-and-oxfmt-for-linting-and-formatting.md) | Oxlint and Oxfmt for Linting and Formatting | Accepted |
| [0006](0006-vitest-with-colocated-tests-and-coverage-thresholds.md) | Vitest with Colocated Tests and Coverage Thresholds | Accepted |
| [0007](0007-commander-based-cli-with-dependency-injection.md) | Commander-based CLI with Dependency Injection | Accepted |
| [0008](0008-multi-channel-architecture-with-channel-agnostic-core.md) | Multi-channel Architecture with Channel-agnostic Core | Accepted |
| [0009](0009-json5-configuration-with-validation-and-audit-logging.md) | JSON5 Configuration with Validation and Audit Logging | Accepted |
| [0010](0010-dead-code-detection-with-knip.md) | Dead Code Detection with Knip | Accepted |
| [0011](0011-ci-with-scope-detection-and-platform-matrix.md) | CI with Scope Detection and Platform Matrix | Accepted |
| [0012](0012-tool-schema-guardrails-for-ai-interoperability.md) | Tool Schema Guardrails for AI Interoperability | Accepted |

## How to Use These ADRs

These ADRs document the architectural patterns used in this project. When starting a new project that follows the same architecture:

1. **Read the ADRs** to understand the decisions and their rationale
2. **Adopt selectively** - not every decision applies to every project
3. **Create new ADRs** when you make decisions that diverge from these
4. **Reference the original** when adapting a decision for your context

## Adding New ADRs

1. Create a new file: `NNNN-short-title.md` (next sequential number)
2. Use the standard template: Status, Context, Decision, Consequences
3. Add the entry to this index
4. ADRs are immutable once accepted; create a new ADR to supersede
