# ADR-0005: Oxlint and Oxfmt for Linting and Formatting

## Status

Accepted

## Context

The project needs fast, consistent linting and formatting across a large TypeScript monorepo. Traditional tools (ESLint, Prettier) can be slow on large codebases. The project also needs custom lint rules to enforce architectural boundaries (see ADR-0003).

## Decision

Use Rust-based tooling for linting and formatting:

- **Oxlint** (`.oxlintrc.json`): linter with plugins for `unicorn`, `typescript`, and `oxc`
  - Error-level categories: correctness, perf, suspicious
  - `typescript/no-explicit-any: error` enforced globally
  - Custom rules enforce import boundaries and architectural constraints
- **Oxfmt** (`.oxfmtrc.jsonc`): formatter
  - 2-space indentation, no tabs
  - Experimental import sorting enabled
  - Experimental `package.json` sorting enabled
- **Pre-commit hooks** via `prek install` run the same checks as CI

Commands:

- `pnpm check`: lint + format check
- `pnpm format`: check formatting
- `pnpm format:fix`: auto-fix formatting

## Consequences

- Linting and formatting are significantly faster than ESLint/Prettier equivalents on this codebase size.
- Architectural boundary enforcement (ADR-0003) is automated, not just documented.
- Import sorting is deterministic, eliminating merge conflicts from import ordering.
- Contributors must use the project's tooling; editor plugins for Oxlint/Oxfmt may be less mature than ESLint/Prettier equivalents.
- Pre-commit hooks ensure CI will not fail due to formatting issues.
