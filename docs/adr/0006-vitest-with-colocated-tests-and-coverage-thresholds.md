# ADR-0006: Vitest with Colocated Tests and Coverage Thresholds

## Status

Accepted

## Context

The project needs a test framework that supports:

- Fast execution for a large TypeScript codebase
- Multiple test tiers (unit, e2e, live/integration)
- Coverage enforcement to prevent regression
- Memory-conscious execution (large test suite on varied hardware)

## Decision

Use Vitest as the test framework with the following conventions:

**Test organization:**
- Unit tests: colocated as `*.test.ts` alongside source files
- E2E tests: `*.e2e.test.ts`
- Live tests (real API keys): `*.live.test.ts`, gated behind `LIVE=1` or `OPENCLAW_LIVE_TEST=1`

**Configuration tiers:**
- `vitest.config.ts`: base config (forks pool, 3-16 workers depending on env)
- `vitest.unit.config.ts`: scoped unit tests with env-driven includes/excludes
- `vitest.e2e.config.ts`: end-to-end tests
- `vitest.extensions.config.ts`: extension-specific tests
- `vitest.live.config.ts`: live integration tests

**Coverage thresholds (V8 provider):**
- Lines: 70%, Functions: 70%, Branches: 55%, Statements: 70%
- Coverage scope: `src/**/*.ts` only (excludes extensions, apps, UI, test utilities)

**Memory management:**
- `OPENCLAW_TEST_PROFILE=low` with `OPENCLAW_TEST_SERIAL_GATEWAY=1` for constrained environments
- Worker count capped at 16 maximum
- Forks pool (not threads) for isolation

**CI integration:**
- `pnpm test` is the default landing bar for pushes to `main`
- Scoped tests (`pnpm test -- <path> -t "pattern"`) for targeted validation during development
- Scoped tests supplement but do not replace the full suite gate

## Consequences

- Colocated tests are easy to find and maintain alongside the code they test.
- Coverage thresholds prevent gradual erosion of test coverage.
- Multiple test tiers allow fast feedback loops (unit) while still supporting thorough validation (e2e, live).
- Memory-conscious pooling prevents OOM failures on CI runners and developer machines.
- The forks pool adds slight overhead compared to threads but provides better isolation.
