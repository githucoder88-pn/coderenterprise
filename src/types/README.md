# types

**Purpose:** Shared TypeScript types.

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |

## Public exports

- `Prettify`
- `Optional`
- `RequiredKeys`
- `OptionalKeys`
- `DeepPartial`
- `DeepReadonly`
- `Nullable`
- `AsyncResult`
- `Brand`
- `Result`
- `ok`
- `err`
- `unwrap`
- `PaginationParams`
- `PaginatedResponse`
- `createPaginatedResponse`
- `Timestamps`
- `SoftDeletable`
- `AuthenticatedUser`
- `RequestContext`
- `ErrorCode`
- `AppError`
- `createError`
- `DomainEvent`
- `DomainEventPayload`
- `ApiResponse`
- `HttpMethod`
- `Permission`
- `Role`
- `ROLE_PERMISSIONS`

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
