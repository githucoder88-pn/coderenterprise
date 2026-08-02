/**
 * Database Schema — Firestore Collection Definitions
 *
 * Defines all collections, their fields, indexes, and relationships.
 * This is the single source of truth for the data model.
 */

export const COLLECTIONS = {
  users: {
    fields: ['email', 'displayName', 'photoURL', 'organizationId', 'role', 'status', 'metadata', 'lastLoginAt', 'emailVerified'],
    indexes: [['organizationId', 'status'], ['email']],
  },
  organizations: {
    fields: ['name', 'slug', 'plan', 'ownerId', 'memberCount', 'status', 'metadata', 'settings'],
    indexes: [['ownerId'], ['slug']],
  },
  projects: {
    fields: ['name', 'organizationId', 'workspaceId', 'description', 'status', 'metadata'],
    indexes: [['organizationId', 'status']],
  },
  workspaces: {
    fields: ['name', 'slug', 'organizationId', 'description', 'status', 'memberCount', 'settings', 'metadata'],
    indexes: [['organizationId', 'status'], ['slug']],
  },
  conversations: {
    fields: ['workspaceId', 'organizationId', 'userId', 'title', 'model', 'provider', 'systemPrompt', 'messageCount', 'totalTokens', 'totalCost', 'status', 'currentBranchId', 'lastMessageAt', 'metadata'],
    indexes: [['userId', 'status'], ['workspaceId', 'status'], ['organizationId']],
  },
  messages: {
    fields: ['conversationId', 'branchId', 'parentId', 'role', 'content', 'contentType', 'attachments', 'toolCalls', 'toolResults', 'tokenUsage', 'version', 'versions', 'status', 'error', 'rating', 'feedback', 'metadata', 'sequenceNumber', 'isEdited', 'editHistory'],
    indexes: [['conversationId', 'branchId', 'sequenceNumber']],
  },
  attachments: {
    fields: ['messageId', 'type', 'name', 'mimeType', 'size', 'url', 'base64Data', 'textContent', 'metadata', 'processingStatus'],
    indexes: [['messageId']],
  },
  prompts: {
    fields: ['name', 'content', 'organizationId', 'workspaceId', 'userId', 'description', 'tags', 'variables', 'isPublic', 'version', 'usageCount', 'metadata'],
    indexes: [['organizationId', 'isPublic'], ['tags']],
  },
  prompt_templates: {
    fields: ['organizationId', 'name', 'description', 'template', 'variables', 'category', 'tags', 'version', 'isPublic', 'usageCount', 'rating', 'metadata'],
    indexes: [['organizationId', 'category'], ['isPublic', 'rating']],
  },
  providers: {
    fields: ['name', 'displayName', 'baseUrl', 'enabled', 'capabilities', 'config', 'metadata'],
    indexes: [['name']],
  },
  models: {
    fields: ['modelId', 'provider', 'displayName', 'description', 'capabilities', 'contextWindow', 'maxOutputTokens', 'pricing', 'tags', 'deprecated', 'status', 'metadata'],
    indexes: [['provider', 'status'], ['status']],
  },
  model_capabilities: {
    fields: ['modelId', 'capability', 'supported', 'maxTokens', 'metadata'],
    indexes: [['modelId'], ['capability']],
  },
  api_keys: {
    fields: ['name', 'keyPrefix', 'hashedKey', 'organizationId', 'userId', 'permissions', 'status', 'lastUsedAt', 'expiresAt', 'rateLimit', 'metadata'],
    indexes: [['organizationId', 'status'], ['hashedKey']],
  },
  billing_accounts: {
    fields: ['organizationId', 'plan', 'status', 'balance', 'currency', 'paymentMethodId', 'metadata'],
    indexes: [['organizationId']],
  },
  subscriptions: {
    fields: ['organizationId', 'planId', 'status', 'currentPeriodStart', 'currentPeriodEnd', 'cancelAt', 'metadata'],
    indexes: [['organizationId', 'status']],
  },
  usage_records: {
    fields: ['organizationId', 'userId', 'model', 'provider', 'promptTokens', 'completionTokens', 'totalTokens', 'cost', 'conversationId', 'messageId', 'timestamp'],
    indexes: [['organizationId', 'timestamp'], ['userId', 'timestamp'], ['model', 'timestamp']],
  },
  tool_executions: {
    fields: ['toolId', 'userId', 'organizationId', 'conversationId', 'input', 'output', 'status', 'error', 'durationMs', 'metadata'],
    indexes: [['userId', 'toolId'], ['organizationId', 'status']],
  },
  events: {
    fields: ['event', 'aggregateId', 'aggregateType', 'data', 'metadata', 'occurredAt'],
    indexes: [['event', 'occurredAt'], ['aggregateId']],
  },
  audit_logs: {
    fields: ['action', 'actorId', 'targetId', 'targetType', 'data', 'ip', 'userAgent', 'organizationId'],
    indexes: [['actorId', 'createdAt'], ['targetId'], ['organizationId', 'createdAt']],
  },
  notifications: {
    fields: ['userId', 'organizationId', 'type', 'title', 'body', 'actionUrl', 'channel', 'priority', 'read', 'readAt', 'metadata'],
    indexes: [['userId', 'read', 'createdAt']],
  },
  extensions: {
    fields: ['name', 'slug', 'description', 'version', 'organizationId', 'userId', 'type', 'status', 'config', 'permissions', 'installCount', 'metadata'],
    indexes: [['organizationId', 'status'], ['slug']],
  },
  webhooks: {
    fields: ['url', 'events', 'organizationId', 'userId', 'secret', 'active', 'failureCount', 'lastTriggeredAt', 'lastResponseStatus', 'metadata'],
    indexes: [['organizationId', 'active']],
  },
  webhook_deliveries: {
    fields: ['webhookId', 'event', 'payload', 'responseStatus', 'responseBody', 'durationMs', 'attempt', 'status', 'error'],
    indexes: [['webhookId', 'createdAt']],
  },
  secrets: {
    fields: ['name', 'encryptedValue', 'iv', 'tag', 'organizationId'],
    indexes: [['organizationId']],
  },
  invoices: {
    fields: ['organizationId', 'amount', 'currency', 'status', 'lineItems', 'dueDate', 'paidAt', 'pdfUrl'],
    indexes: [['organizationId', 'status']],
  },
  payment_intents: {
    fields: ['organizationId', 'amount', 'currency', 'status', 'description', 'providerPaymentId', 'failureReason', 'metadata'],
    indexes: [['organizationId', 'status']],
  },
  payment_methods: {
    fields: ['organizationId', 'type', 'last4', 'brand', 'expiryMonth', 'expiryYear', 'isDefault', 'providerMethodId'],
    indexes: [['organizationId']],
  },
  memory_entries: {
    fields: ['userId', 'organizationId', 'conversationId', 'type', 'content', 'summary', 'importance', 'accessCount', 'lastAccessedAt', 'embedding', 'tags', 'expiresAt', 'metadata'],
    indexes: [['userId', 'type'], ['organizationId', 'importance']],
  },
  notification_preferences: {
    fields: ['userId', 'email', 'inApp', 'push', 'webhook', 'types'],
    indexes: [['userId']],
  },
  organization_members: {
    fields: ['organizationId', 'userId', 'role', 'joinedAt'],
    indexes: [['organizationId'], ['userId']],
  },
} as const;

export type CollectionName = keyof typeof COLLECTIONS;

/**
 * Get the Firestore indexes needed for a collection.
 */
export function getIndexes(collection: CollectionName): readonly (readonly string[])[] {
  return COLLECTIONS[collection]?.indexes ?? [];
}

/**
 * Get the fields for a collection.
 */
export function getFields(collection: CollectionName): readonly string[] {
  return COLLECTIONS[collection]?.fields ?? [];
}
