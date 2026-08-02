/**
 * Dependency Injection Container
 *
 * Lightweight, type-safe IoC container using tokens.
 * Supports transient, singleton, and factory registrations.
 */

export type Token<T = unknown> = symbol & { readonly __type?: T };

export function createToken<T>(description: string): Token<T> {
  return Symbol(description) as Token<T>;
}

type RegistrationKind = 'singleton' | 'transient' | 'factory';

interface Registration<T> {
  readonly kind: RegistrationKind;
  readonly factory: () => T;
  instance?: T;
}

export class Container {
  private readonly registrations = new Map<symbol, Registration<unknown>>();
  private readonly _parent?: Container;

  constructor(parent?: Container) {
    this._parent = parent;
  }

  /**
   * Register a singleton instance.
   * The factory is called once, then the result is cached.
   */
  registerSingleton<T>(token: Token<T>, factory: () => T): this {
    this.registrations.set(token, { kind: 'singleton', factory });
    return this;
  }

  /**
   * Register a transient factory.
   * A new instance is created on every resolve.
   */
  registerTransient<T>(token: Token<T>, factory: () => T): this {
    this.registrations.set(token, { kind: 'transient', factory });
    return this;
  }

  /**
   * Register a factory (alias for transient).
   */
  registerFactory<T>(token: Token<T>, factory: () => T): this {
    return this.registerTransient(token, factory);
  }

  /**
   * Bind an existing instance.
   */
  bindInstance<T>(token: Token<T>, instance: T): this {
    this.registrations.set(token, {
      kind: 'singleton',
      factory: () => instance,
      instance,
    });
    return this;
  }

  /**
   * Resolve a dependency by token.
   */
  resolve<T>(token: Token<T>): T {
    const reg = this.registrations.get(token);

    if (!reg) {
      if (this._parent) return this._parent.resolve(token);
      throw new Error(
        `No registration found for token: ${String(token.description ?? token)}`,
      );
    }

    if (reg.kind === 'singleton') {
      if (!reg.instance) {
        reg.instance = reg.factory();
      }
      return reg.instance as T;
    }

    return reg.factory() as T;
  }

  /**
   * Try to resolve a dependency, returning undefined if not found.
   */
  tryResolve<T>(token: Token<T>): T | undefined {
    try {
      return this.resolve(token);
    } catch {
      return undefined;
    }
  }

  /**
   * Check if a token has a registration.
   */
  has(token: Token<unknown>): boolean {
    return this.registrations.has(token) || (this._parent?.has(token) ?? false);
  }

  /**
   * Create a child container that inherits from this one.
   */
  createChild(): Container {
    return new Container(this);
  }

  /**
   * Clear all registrations (useful for testing).
   */
  clear(): void {
    this.registrations.clear();
  }

  /**
   * Dispose all singleton instances.
   */
  async dispose(): Promise<void> {
    for (const reg of this.registrations.values()) {
      if (reg.instance && typeof (reg.instance as any).dispose === 'function') {
        await (reg.instance as any).dispose();
      }
      reg.instance = undefined;
    }
    this.registrations.clear();
  }
}

// ─── Global Container ────────────────────────────────────────────────────────

let _globalContainer: Container | null = null;

export function getContainer(): Container {
  if (!_globalContainer) {
    _globalContainer = new Container();
  }
  return _globalContainer;
}

export function resetContainer(): void {
  if (_globalContainer) {
    _globalContainer.clear();
    _globalContainer = null;
  }
}
