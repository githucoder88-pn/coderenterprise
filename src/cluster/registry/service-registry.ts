/**
 * Service Registry
 *
 * Service discovery for distributed components.
 * Tracks service instances, health, and endpoints.
 */

import type { ILogger } from '../../telemetry/logger.js';

export interface ServiceInstance {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly host: string;
  readonly port: number;
  readonly protocol: 'http' | 'grpc' | 'tcp';
  readonly healthPath: string;
  readonly tags: readonly string[];
  readonly metadata: Record<string, unknown>;
  readonly registeredAt: Date;
  readonly lastHealthCheck: Date;
  readonly healthy: boolean;
}

export interface IServiceRegistry {
  register(instance: Omit<ServiceInstance, 'registeredAt' | 'lastHealthCheck' | 'healthy'>): void;
  deregister(id: string): void;
  get(name: string): readonly ServiceInstance[];
  getHealthy(name: string): readonly ServiceInstance[];
  getById(id: string): ServiceInstance | null;
  healthCheck(id: string, healthy: boolean): void;
  getAll(): readonly ServiceInstance[];
  getStats(): { total: number; healthy: number; byName: Record<string, number> };
}

export class ServiceRegistry implements IServiceRegistry {
  private readonly instances = new Map<string, ServiceInstance>();

  constructor(private readonly logger: ILogger) {}

  register(instance: Omit<ServiceInstance, 'registeredAt' | 'lastHealthCheck' | 'healthy'>): void {
    const now = new Date();
    const full: ServiceInstance = { ...instance, registeredAt: now, lastHealthCheck: now, healthy: true };
    this.instances.set(instance.id, full);
    this.logger.info({ id: instance.id, name: instance.name, host: instance.host }, 'Service registered');
  }

  deregister(id: string): void {
    this.instances.delete(id);
    this.logger.info({ id }, 'Service deregistered');
  }

  get(name: string): readonly ServiceInstance[] {
    return [...this.instances.values()].filter((i) => i.name === name);
  }

  getHealthy(name: string): readonly ServiceInstance[] {
    return [...this.instances.values()].filter((i) => i.name === name && i.healthy);
  }

  getById(id: string): ServiceInstance | null {
    return this.instances.get(id) ?? null;
  }

  healthCheck(id: string, healthy: boolean): void {
    const instance = this.instances.get(id);
    if (instance) {
      this.instances.set(id, { ...instance, healthy, lastHealthCheck: new Date() });
    }
  }

  getAll(): readonly ServiceInstance[] {
    return [...this.instances.values()];
  }

  getStats(): { total: number; healthy: number; byName: Record<string, number> } {
    const all = [...this.instances.values()];
    const byName: Record<string, number> = {};
    for (const i of all) byName[i.name] = (byName[i.name] ?? 0) + 1;
    return { total: all.length, healthy: all.filter((i) => i.healthy).length, byName };
  }
}
