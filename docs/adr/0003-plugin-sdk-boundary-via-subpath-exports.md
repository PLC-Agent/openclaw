# ADR-0003: Plugin SDK Boundary via Subpath Exports

## Status

Accepted

## Context

With 80+ extensions, the project needs a stable, well-defined contract between the core application and extension code. Without a clear boundary:

- Extensions could depend on internal implementation details
- Core refactors would break extensions in unpredictable ways
- Type safety across the boundary would be hard to enforce

## Decision

Define the plugin SDK as a set of subpath exports from the core package. Extensions import exclusively through these subpaths:

```typescript
// Allowed
import { definePluginEntry } from "openclaw/plugin-sdk/core";
import { type ChannelPlugin } from "openclaw/plugin-sdk/channel-setup";

// Forbidden - blocked by lint rules
import { something } from "../../src/internal-module";
import { other } from "openclaw/plugin-sdk-internal/hidden";
```

Enforcement mechanisms:

- **Lint rule `no-extension-src-imports`**: blocks direct imports from `src/` in extensions
- **Lint rule `no-plugin-sdk-internal`**: blocks imports from `plugin-sdk-internal`
- **Lint rule `no-relative-outside-package`**: blocks relative imports escaping the extension directory
- **Lint rule `plugin-sdk-subpaths-exported`**: ensures all SDK subpaths are properly declared in tsconfig paths and package.json exports
- **Build step**: generates `.d.ts` files for all SDK subpaths via a dedicated `tsconfig.plugin-sdk.dts.json`

Extensions that need internal access to the core must expose a new public subpath first, which goes through review.

## Consequences

- Extensions have a stable, versioned contract that survives internal refactors.
- New SDK surface requires explicit opt-in (adding a subpath export), preventing accidental API leaks.
- Lint rules catch boundary violations at development time, not just at runtime.
- Adding new SDK subpaths has some ceremony (update exports, tsconfig paths, build config) but this is intentional friction.
- The `definePluginEntry()` API provides a single, typed entry point for all extension types (channels, providers, media, speech, etc.).
