/**
 * Test Setup
 *
 * Global test configuration and mocks.
 */

import { vi } from 'vitest';

// Mock Firebase Admin SDK
vi.mock('firebase-admin', () => {
  const mockFirestore = {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
    set: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    listCollections: vi.fn().mockResolvedValue([]),
    settings: vi.fn(),
    runTransaction: vi.fn((fn: Function) => fn({})),
    batch: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      commit: vi.fn().mockResolvedValue(undefined),
    }),
  };

  const mockAuth = {
    createUser: vi.fn().mockResolvedValue({
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      disabled: false,
      emailVerified: false,
      metadata: { creationTime: new Date().toISOString() },
    }),
    getUser: vi.fn().mockResolvedValue({
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      disabled: false,
      emailVerified: false,
      metadata: { creationTime: new Date().toISOString(), lastSignInTime: undefined },
      customClaims: { role: 'member', organizationId: 'org-1' },
    }),
    getUserByEmail: vi.fn().mockResolvedValue({
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      disabled: false,
      emailVerified: false,
      metadata: { creationTime: new Date().toISOString(), lastSignInTime: undefined },
      customClaims: { role: 'member', organizationId: 'org-1' },
    }),
    updateUser: vi.fn().mockResolvedValue({
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      disabled: false,
      emailVerified: false,
      metadata: { creationTime: new Date().toISOString() },
    }),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: 'test-uid',
      email: 'test@example.com',
      role: 'member',
      organizationId: 'org-1',
    }),
    createCustomToken: vi.fn().mockResolvedValue('mock-token'),
    revokeRefreshTokens: vi.fn().mockResolvedValue(undefined),
    listUsers: vi.fn().mockResolvedValue({
      users: [],
      pageToken: undefined,
    }),
  };

  const mockStorage = {
    bucket: vi.fn().mockReturnValue({
      file: vi.fn().mockReturnValue({
        save: vi.fn().mockResolvedValue(undefined),
        download: vi.fn().mockResolvedValue([Buffer.from('test'), {}]),
        getMetadata: vi.fn().mockResolvedValue([{ metadata: {} }]),
        delete: vi.fn().mockResolvedValue(undefined),
        getSignedUrl: vi.fn().mockResolvedValue(['https://signed-url.example.com']),
        copy: vi.fn().mockResolvedValue(undefined),
      }),
      exists: vi.fn().mockResolvedValue([true]),
      getFiles: vi.fn().mockResolvedValue([[], {}]),
    }),
  };

  return {
    default: {
      apps: [],
      initializeApp: vi.fn(),
      credential: {
        cert: vi.fn(),
        applicationDefault: vi.fn(),
      },
      firestore: Object.assign(() => mockFirestore, { FieldValue: { serverTimestamp: vi.fn() } }),
      auth: () => mockAuth,
      storage: () => mockStorage,
    },
    apps: [],
  };
});

// Mock ioredis
vi.mock('ioredis', () => {
  const Redis = vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(-1),
    incr: vi.fn().mockResolvedValue(1),
    decr: vi.fn().mockResolvedValue(0),
    incrby: vi.fn().mockResolvedValue(1),
    hset: vi.fn().mockResolvedValue(1),
    hget: vi.fn().mockResolvedValue(null),
    hgetall: vi.fn().mockResolvedValue({}),
    hdel: vi.fn().mockResolvedValue(1),
    lpush: vi.fn().mockResolvedValue(1),
    rpush: vi.fn().mockResolvedValue(1),
    lrange: vi.fn().mockResolvedValue([]),
    lrem: vi.fn().mockResolvedValue(0),
    llen: vi.fn().mockResolvedValue(0),
    keys: vi.fn().mockResolvedValue([]),
    scan: vi.fn().mockResolvedValue(['0', []]),
    pipeline: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue([]),
    }),
    ping: vi.fn().mockResolvedValue('PONG'),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }));
  return { default: Redis };
});
