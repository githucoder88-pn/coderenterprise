/**
 * Container Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Container, createToken } from '../../../core/container.js';

interface UserService {
  getById(id: string): Promise<string>;
}

interface EmailService {
  send(to: string, subject: string): Promise<void>;
}

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('registerSingleton', () => {
    it('should resolve a singleton', () => {
      const token = createToken<UserService>('UserService');
      const instance: UserService = { getById: async (id) => `user-${id}` };

      container.registerSingleton(token, () => instance);

      const resolved1 = container.resolve(token);
      const resolved2 = container.resolve(token);

      expect(resolved1).toBe(instance);
      expect(resolved1).toBe(resolved2); // Same instance
    });

    it('should call factory only once', () => {
      const token = createToken<UserService>('UserService');
      const factory = vi.fn().mockReturnValue({ getById: async () => '' });

      container.registerSingleton(token, factory);
      container.resolve(token);
      container.resolve(token);

      expect(factory).toHaveBeenCalledOnce();
    });
  });

  describe('registerTransient', () => {
    it('should create new instance on every resolve', () => {
      const token = createToken<UserService>('UserService');
      const factory = vi.fn().mockReturnValue({ getById: async () => '' });

      container.registerTransient(token, factory);
      container.resolve(token);
      container.resolve(token);

      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe('bindInstance', () => {
    it('should bind an existing instance', () => {
      const token = createToken<EmailService>('EmailService');
      const instance: EmailService = { send: async () => {} };

      container.bindInstance(token, instance);

      expect(container.resolve(token)).toBe(instance);
    });
  });

  describe('has', () => {
    it('should return true for registered token', () => {
      const token = createToken<string>('Test');
      container.bindInstance(token, 'hello');
      expect(container.has(token)).toBe(true);
    });

    it('should return false for unregistered token', () => {
      const token = createToken<string>('Test');
      expect(container.has(token)).toBe(false);
    });
  });

  describe('tryResolve', () => {
    it('should return instance if registered', () => {
      const token = createToken<string>('Test');
      container.bindInstance(token, 'hello');
      expect(container.tryResolve(token)).toBe('hello');
    });

    it('should return undefined if not registered', () => {
      const token = createToken<string>('Test');
      expect(container.tryResolve(token)).toBeUndefined();
    });
  });

  describe('child containers', () => {
    it('should inherit parent registrations', () => {
      const token = createToken<string>('Test');
      container.bindInstance(token, 'parent');

      const child = container.createChild();
      expect(child.resolve(token)).toBe('parent');
    });

    it('should allow child to override parent', () => {
      const token = createToken<string>('Test');
      container.bindInstance(token, 'parent');

      const child = container.createChild();
      child.bindInstance(token, 'child');

      expect(container.resolve(token)).toBe('parent');
      expect(child.resolve(token)).toBe('child');
    });
  });

  describe('clear', () => {
    it('should clear all registrations', () => {
      const token = createToken<string>('Test');
      container.bindInstance(token, 'hello');
      container.clear();

      expect(container.has(token)).toBe(false);
    });
  });

  describe('dispose', () => {
    it('should dispose singletons with dispose method', async () => {
      const disposeFn = vi.fn();
      const token = createToken<{ dispose(): void }>('Disposable');
      container.bindInstance(token, { dispose: disposeFn });

      await container.dispose();

      expect(disposeFn).toHaveBeenCalledOnce();
    });
  });

  describe('error handling', () => {
    it('should throw when resolving unregistered token', () => {
      const token = createToken<string>('Missing');
      expect(() => container.resolve(token)).toThrow('No registration found');
    });
  });
});
