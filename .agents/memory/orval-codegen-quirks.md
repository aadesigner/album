---
name: Orval codegen quirks
description: Constraints for lib/api-spec/openapi.yaml to avoid Orval 8.21 / Zod v3 collisions
---

## Rules (all apply to this project)
1. No `format: email` — Orval 8.21 generates `zod.email()` which doesn't exist in zod v3
2. Free-form object schemas → use `type: string` (JSON serialized), not `type: object` with no props
3. Inline multipart/form-data body → MUST be extracted to a named component schema (e.g. ImageUpload).
   Inline bodies collide: Orval generates OperationIdBody in api.ts AND types/. A $ref to a differently-named component breaks the collision.
4. No operationId collision with schema names — UploadImageBody collision was fixed by extracting to ImageUpload schema component.
5. Component schema names must not equal `{operationId}Response`/`{operationId}Body` — Orval auto-derives those exact const names from the operationId, and a same-named component schema collides. E.g. for operationId `changePassword`, the response schema must be named something other than `ChangePasswordResponse` (used `ChangePasswordResult` instead).

**Why:** Workspace pins zod v3 (not v4). Orval 8.21 generates some zod v4 syntax for certain OpenAPI keywords.
