# ADR-0004: Lazy Loading for CLI Startup Performance

## Status

Accepted

## Context

The CLI imports a large dependency graph including channel adapters, AI providers, native modules, and extension code. Eagerly loading all modules at startup would make the CLI feel sluggish, especially for simple commands like `openclaw config get`.

## Decision

Use a lazy-loading pattern with dedicated runtime boundaries. The core abstractions are:

- **`createLazyRuntimeSurface()`**: generic lazy loader that defers module loading until first use, with a selector function to extract the needed API surface
- **`createLazyRuntimeModule()`**: caches an entire dynamically imported module
- **`createLazyRuntimeNamedExport()`**: caches a single named export
- **`createLazyRuntimeMethod()`**: caches a method with bound arguments

Key rules:

1. **Never mix static and dynamic imports for the same module** in production code. If a module is lazily loaded somewhere, it must be lazily loaded everywhere.
2. **Create dedicated `*.runtime.ts` boundary files** for lazy-loaded modules. These re-export from the real module and serve as the dynamic import target.
3. **Run `pnpm build` after refactors** touching lazy-loading boundaries and check for `[INEFFECTIVE_DYNAMIC_IMPORT]` warnings.

The `createDefaultDeps` pattern in `src/cli/deps.ts` applies this to channel send functions, deferring channel module loading until a message actually needs to be sent.

## Consequences

- CLI startup remains fast regardless of how many extensions/channels are installed.
- The lazy-loading pattern is type-safe: selectors and cached values preserve TypeScript types.
- Promise caching prevents redundant module loads across multiple call sites.
- The "no mixed imports" rule requires discipline but prevents subtle bugs where a static import defeats the lazy-loading strategy.
- Build-time warnings (`[INEFFECTIVE_DYNAMIC_IMPORT]`) catch regressions automatically.
