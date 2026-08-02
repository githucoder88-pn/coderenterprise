/**
 * Test Helpers
 *
 * Shared utilities for test suites.
 */

import { EventBus, type IEventBus } from '../core/event-bus.js';
import type { ILogger } from '../telemetry/logger.js';
import type { AuthenticatedUser, Timestamps } from '../types/index.js';

export function createMockLogger(): ILogger {
  return {
    fatal: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

export function createMockEventBus(): IEventBus {
  return new EventBus();
}

export function createMockUser(overrides?: Partial<AuthenticatedUser>): AuthenticatedUser {
  return {
    uid: 'test-uid',
    email: 'test@example.com',
    organizationId: 'org-1',
    role: 'admin',
    permissions: ['admin:all'],
    ...overrides,
  };
}

export function createTimestamps(): Timestamps {
  return {
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function waitForEvent(
  eventBus: IEventBus,
  eventName: string,
  timeoutMs = 5000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for event: ${eventName}`));
    }, timeoutMs);

    eventBus.on(eventName as any, () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
