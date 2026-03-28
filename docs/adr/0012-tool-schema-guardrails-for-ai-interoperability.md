# ADR-0012: Tool Schema Guardrails for AI Interoperability

## Status

Accepted

## Context

The project defines tool schemas consumed by AI models (e.g., for agent tool use). Some AI tool validators have strict requirements that go beyond standard JSON Schema. Schemas using `anyOf`/`oneOf`/`allOf` or reserved property names like `format` can cause validation failures at runtime.

## Decision

Enforce the following guardrails for tool input schemas:

1. **No `Type.Union`** in tool input schemas (no `anyOf`/`oneOf`/`allOf` in the generated JSON Schema)
2. **Use `stringEnum`/`optionalStringEnum`** (Type.Unsafe enum) for string list types instead of unions
3. **Use `Type.Optional(...)`** instead of `... | null` for optional fields
4. **Top-level schema must be `type: "object"` with `properties`**
5. **Avoid raw `format` property names** in schemas; some validators treat it as a reserved keyword

## Consequences

- Tool schemas are compatible with the widest range of AI model validators.
- Developers must use specific helper types rather than standard TypeBox unions, adding a learning curve.
- Schema validation errors are caught at definition time rather than at runtime during AI interactions.
- The restrictions are more conservative than JSON Schema allows, but this prevents hard-to-debug runtime failures.
