# Database

The primary datastore is **Firebase Firestore** (document database). **Redis** is used for ephemeral state (cache, queues, rate limits, pub/sub).

## Collections (Firestore)
See `src/database/schema.ts` for the logical schema and index definitions.

| Collection | Purpose | Key fields | Indexes |
|------------|---------|------------|---------|
| `users` | User accounts | uid, email, displayName, orgId, role | email (unique), orgId |
| `organizations` | Orgs/teams | id, name, ownerId, plan, createdAt | ownerId |
| `teams` | Teams within orgs | id, orgId, name, members[] | orgId |
| `conversations` | Conversation metadata | id, ownerId, orgId, title, model, provider, updatedAt | ownerId+updatedAt, orgId |
| `messages` | Subcollection `/conversations/{cid}/messages/{mid}` | id, role, content, attachments, createdAt, tokenUsage | createdAt |
| `workspaces` | Workspace metadata | id, ownerId, orgId, name, repoUrl, slug, indexedAt | ownerId, orgId |
| `workspace_files` | Per-workspace files (subcollection) | path, hash, mtime, size | path |
| `providers` | Configured AI providers (per org or system) | id, vendor, apiKey (encrypted), enabled, priority | vendor, enabled |
| `models` | Model registry | id, providerId, name, capabilities, contextWindow, cost | providerId, name |
| `prompts` | Saved prompts | id, ownerId, title, body, tags | ownerId |
| `apiKeys` | API keys | id, ownerId, hashedKey, scopes, lastUsedAt | ownerId, hashedKey (unique) |
| `secrets` | Encrypted user/org secrets | id, ownerId, name, ciphertext, iv, tag | ownerId |
| `audit` | Append-only audit log | id, actorId, action, resource, timestamp, meta | actorId, timestamp |
| `extensions` | Installed extensions | id, ownerId, slug, version, enabled, permissions | ownerId, slug |
| `notifications` | In-app notifications | id, userId, type, title, body, readAt, createdAt | userId+readAt |
| `billing_customers` | Billing linkage | orgId, stripeCustomerId | orgId |
| `subscriptions` | Subscriptions | orgId, planId, status, currentPeriodEnd | orgId, status |
| `invoices` | Billing invoices | orgId, amount, status, issuedAt | orgId+issuedAt |
| `agent_runs` | Agent execution logs | id, goalId, agent, status, startedAt, completedAt, checkpointId | goalId, status |
| `checkpoints` | Orchestrator checkpoints | id, runId, state snapshot, createdAt | runId |
| `marketplace_packages` | Published extensions | slug, version, authorId, signature, downloads | slug |

## Redis keyspace
All keys prefixed with `ce:` (configurable via `REDIS_KEY_PREFIX`).

| Key pattern | Purpose | TTL |
|-------------|---------|-----|
| `ce:rl:<key>` | Rate-limit counters | window |
| `ce:sess:<jti>` | Refresh-token / session blacklist | 7d |
| `ce:cache:<…>` | General cache | varies |
| `ce:cb:<provider>` | Circuit-breaker state | 5m |
| `ce:bull:*` | BullMQ queue data | per queue |
| `ce:events:*` | Distributed event bus channels | volatile |

## Migrations
There is no formal migration framework; schema changes are additive and versioned. When a field is deprecated:
1. Start writing both old and new fields.
2. Migrate reads to the new field.
3. Run a backfill script via `tsx src/database/seeds/<migration>.ts`.
4. Remove the old field after all clients are upgraded.

## Seeds
`npm run db:seed` runs `src/database/seeds/index.ts` which creates dev users, a demo org, sample conversations, and default providers/models.

## Backups
- Firestore: enable point-in-time recovery in production.
- Redis: AOF persistence (enabled in `docker-compose.yml`) is for cache/queue durability only; do not rely on Redis as authoritative storage.

See also:
- `docs/security/` for encryption of secrets/API keys.
- `docs/telemetry/` for audit-log retention.
