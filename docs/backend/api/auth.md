# Authentication API

Base: `/auth`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/sign-in` | No | Email + password sign-in |
| POST | `/sign-up` | No | Create a new account |
| POST | `/sign-out` | Yes | Invalidate current token |
| GET | `/me` | Yes | Current user |
| POST | `/refresh` | Refresh token | Swap refresh for new access |

## POST /auth/sign-in

### Request
```json
{ "email": "you@example.com", "password": "••••••••" }
```

### Response 200
```json
{
  "data": {
    "user": { "uid": "u_123", "email": "you@example.com", "displayName": "You", "organizationId": "o_1", "role": "owner" },
    "tokens": { "accessToken": "eyJhbGciOi…", "refreshToken": "eyJhbGciOi…", "expiresIn": 900 }
  }
}
```

### Errors
- `401 INVALID_CREDENTIALS` — email/password wrong
- `429 RATE_LIMITED` — too many attempts
- `400 VALIDATION_ERROR` — malformed body

## POST /auth/sign-up
Body: `{ "email": "...", "password": "...", "displayName": "..." }`
Response: same shape as sign-in. Auto-creates a personal organization.

## POST /auth/sign-out
Invalidates the refresh token. Returns 204.

## GET /auth/me
Returns current user from the bearer token.
