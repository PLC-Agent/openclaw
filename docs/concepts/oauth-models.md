---
summary: "How OpenAI OAuth and model selection are implemented internally"
read_when:
  - You want to understand the OpenAI OAuth implementation end-to-end
  - You want to trace model discovery, selection, and runtime resolution
  - You are adding a new provider or modifying the model pipeline
title: "OAuth and Model Selection Internals"
---

# OAuth and Model Selection Internals

This page describes the internal implementation of OpenAI OAuth and the model
selection pipeline. For user-facing configuration, see
[OAuth](/concepts/oauth) and [Models CLI](/concepts/models).

## OpenAI OAuth Implementation

### Key source files

| File                                             | Role                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `src/plugins/provider-openai-codex-oauth.ts`     | Main OAuth flow orchestration (`loginOpenAICodexOAuth`)            |
| `src/plugins/provider-openai-codex-oauth-tls.ts` | TLS preflight against `auth.openai.com`                            |
| `src/plugins/provider-oauth-flow.ts`             | Generic VPS-aware OAuth handlers (local browser vs headless paste) |
| `src/agents/auth-profiles/oauth.ts`              | Credential resolution and file-locked token refresh                |
| `src/agents/auth-profiles/store.ts`              | Read/write `auth-profiles.json`                                    |
| `src/agents/auth-profiles/types.ts`              | `OAuthCredential` type definition                                  |
| `src/agents/auth-profiles/credential-state.ts`   | Token expiry evaluation                                            |
| `extensions/openai/openai-codex-provider.ts`     | OpenAI Codex provider plugin (model catalog, refresh handler)      |

### Login flow

The entry point is `loginOpenAICodexOAuth()`, triggered by
`openclaw onboard` (auth choice `openai-codex`) or
`openclaw models auth login --provider openai-codex`.

1. **TLS preflight** -- `runOpenAIOAuthTlsPreflight()` validates that the host
   can reach `auth.openai.com` over TLS. If it fails, diagnostic hints are
   returned via `formatOpenAIOAuthTlsPreflightFix()`.

2. **PKCE exchange** (delegated to `@mariozechner/pi-ai`):
   - Generate a PKCE verifier/challenge pair and a random `state` value.
   - Open `https://auth.openai.com/oauth/authorize` with scopes
     `openid profile email`.
   - Capture the callback on `http://127.0.0.1:1455/auth/callback` (local
     environment) or prompt the user to paste the redirect URL (headless/VPS).
     The handler is created by `createVpsAwareOAuthHandlers()` in
     `src/plugins/provider-oauth-flow.ts`.
   - Exchange the authorization code at `https://auth.openai.com/oauth/token`.

3. **Storage** -- The resulting tokens are stored via `upsertAuthProfile()` into
   `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` as an
   `OAuthCredential`:

   ```typescript
   {
     type: "oauth",
     provider: "openai-codex",
     access: string,    // access token
     refresh: string,   // refresh token
     expires: number,   // expiry timestamp (ms since epoch)
     accountId?: string, // extracted from access token JWT
     email?: string
   }
   ```

### Token refresh

At runtime, `resolveApiKeyForProfile()` checks the `expires` timestamp:

- **Not expired** -- return the stored access token directly.
- **Expired** -- call `refreshOAuthTokenWithLock()`, which acquires a file lock
  before refreshing. This prevents concurrent CLI instances from racing and
  invalidating each other's tokens.

The refresh itself delegates to `getOAuthApiKey()` from `@mariozechner/pi-ai`.

### Token sink pattern

`auth-profiles.json` acts as a **token sink** -- a single credential store
shared across CLI instances. This reduces the chance of one tool (for example
OpenClaw and Codex CLI) invalidating the other's refresh token when the provider
rotates tokens on each refresh.

## Model Selection Pipeline

### Key source files

| File                                         | Role                                                         |
| -------------------------------------------- | ------------------------------------------------------------ |
| `src/agents/model-catalog.ts`                | Load and cache the model catalog from all sources            |
| `src/agents/model-selection.ts`              | Parse/normalize model refs, build allowlists and alias index |
| `src/agents/models-config.ts`                | Generate `models.json` from discovery + config merge         |
| `src/commands/model-picker.ts`               | Interactive CLI model picker                                 |
| `src/agents/pi-embedded-runner/model.ts`     | Runtime model resolution for API calls                       |
| `src/plugins/provider-runtime.ts`            | Plugin hook orchestration (resolve, normalize, augment)      |
| `extensions/openai/openai-codex-provider.ts` | OpenAI plugin: catalog, normalization, compat flags          |

### Model discovery

The model catalog (`ModelCatalogEntry[]`) is assembled from three sources:

1. **PI SDK registry** -- built-in models from `@mariozechner/pi-ai`
   (`ModelRegistry`).
2. **Provider plugins** -- each plugin exposes a `catalog` hook that returns its
   own models. Plugins can also suppress built-in models via
   `suppressBuiltInModel` or add entries via `augmentModelCatalog`.
3. **User config** -- `models.providers.<id>.models[]` in the config file.
   These are merged into `models.json` under the agent directory.

The merge is handled by `ensureOpenClawModelsJson()` in
`src/agents/models-config.ts`, which writes an atomic `models.json` with
mode `0600`.

### Model selection (user-facing)

1. The catalog is loaded and optionally filtered by the allowlist
   (`agents.defaults.models`). If the allowlist is empty, all discovered models
   are available.
2. The CLI picker (`promptDefaultModel`) groups models by provider when there
   are more than 30 entries across multiple providers. Each entry shows context
   window size, reasoning support, and auth status hints.
3. The user selects a model (for example `openai/gpt-5.4`), which is stored in
   `agents.defaults.model` in the config file.

### Runtime resolution

When a chat message needs to be sent, the model reference goes through several
resolution stages:

1. **Config lookup** -- `resolveConfiguredModelRef()` reads
   `agents.defaults.model.primary` (with fallbacks).
2. **Parsing** -- `parseModelRef()` splits `"openai/gpt-5.4"` into
   `ModelRef { provider: "openai", model: "gpt-5.4" }`.
3. **Alias resolution** -- `buildModelAliasIndex()` maps user-defined aliases
   (from `agents.defaults.models.<key>.alias`) to full model references.
4. **Plugin hooks** (in order):
   - `resolveDynamicModel` -- synchronous lookup for forward-compat models.
   - `prepareDynamicModel` -- async fetch (network refresh) if needed.
   - `normalizeResolvedModel` -- provider-specific rewrites (for example OpenAI
     swaps `openai-completions` to `openai-responses` API mode).
5. **Final object** -- A fully resolved `ProviderRuntimeModel` is passed to the
   PI embedded runner. It includes `id`, `name`, `api` type, `baseUrl`,
   `headers`, `contextWindow`, `maxTokens`, cost info, reasoning flag, input
   types, and compat flags.

### Key types

```typescript
// Parsed model reference
type ModelRef = { provider: string; model: string };

// Catalog entry (discovery output)
type ModelCatalogEntry = {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  reasoning?: boolean;
  input?: ("text" | "image" | "document")[];
};

// Config value (string shorthand or structured)
type AgentModelConfig =
  | string
  | {
      primary?: string;
      fallbacks?: string[];
    };
```

### Defaults

When no model is configured:

- Default provider: `anthropic`
- Default model: `claude-opus-4-6`
- Default context window: `200_000` tokens

If the default provider has no credentials, OpenClaw picks the first available
provider's first model from the catalog.

## Related docs

- [OAuth](/concepts/oauth) -- user-facing OAuth setup and multi-account patterns
- [Models CLI](/concepts/models) -- CLI commands, allowlists, aliases, scanning
- [Model failover](/concepts/model-failover) -- auth profile rotation and cooldowns
- [Model providers](/concepts/model-providers) -- provider overview and examples
