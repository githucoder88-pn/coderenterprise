/**
 * Deployment Manager
 *
 * Manages deployments across environments with rollback support.
 */

import type { Deployment } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, type Result } from '../../types/index.js';

export interface IDeploymentManager {
  create(orgId: string, projectId: string, environment: Deployment['environment'], version: string, deployedBy: string): Promise<Result<Deployment>>;
  deploy(id: string): Promise<Result<Deployment>>;
  rollback(id: string): Promise<Result<Deployment>>;
  get(id: string): Promise<Deployment | null>;
  list(orgId: string, projectId?: string): Promise<readonly Deployment[]>;
  getHistory(orgId: string, environment: string): Promise<readonly Deployment[]>;
}

export class DeploymentManager implements IDeploymentManager {
  private readonly deployments = new Map<string, Deployment>();

  constructor(private readonly logger: ILogger) {}

  async create(orgId: string, projectId: string, environment: Deployment['environment'], version: string, deployedBy: string): Promise<Result<Deployment>> {
    const now = new Date();
    const deployment: Deployment = {
      id: crypto.randomUUID(), organizationId: orgId, projectId, environment,
      version, status: 'pending', deployedBy, deployedAt: null,
      rollbackVersion: null, metadata: {}, createdAt: now, updatedAt: now,
    };
    this.deployments.set(deployment.id, deployment);
    this.logger.info({ deploymentId: deployment.id, environment, version }, 'Deployment created');
    return { success: true, data: deployment };
  }

  async deploy(id: string): Promise<Result<Deployment>> {
    const deployment = this.deployments.get(id);
    if (!deployment) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Deployment not found', timestamp: new Date() } };

    this.deployments.set(id, { ...deployment, status: 'deploying', updatedAt: new Date() });

    // Simulate deployment
    const updated = { ...deployment, status: 'deployed' as const, deployedAt: new Date(), updatedAt: new Date() };
    this.deployments.set(id, updated);
    this.logger.info({ deploymentId: id, version: deployment.version }, 'Deployment completed');
    return { success: true, data: updated };
  }

  async rollback(id: string): Promise<Result<Deployment>> {
    const deployment = this.deployments.get(id);
    if (!deployment) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Deployment not found', timestamp: new Date() } };

    const previous = [...this.deployments.values()]
      .filter((d) => d.projectId === deployment.projectId && d.environment === deployment.environment && d.status === 'deployed' && d.id !== id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    if (!previous) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'No previous deployment to rollback to', timestamp: new Date() } };

    const updated = { ...deployment, status: 'rolled_back' as const, rollbackVersion: previous.version, updatedAt: new Date() };
    this.deployments.set(id, updated);
    this.logger.info({ deploymentId: id, rollbackTo: previous.version }, 'Deployment rolled back');
    return { success: true, data: updated };
  }

  async get(id: string): Promise<Deployment | null> { return this.deployments.get(id) ?? null; }

  async list(orgId: string, projectId?: string): Promise<readonly Deployment[]> {
    return [...this.deployments.values()].filter((d) =>
      d.organizationId === orgId && (!projectId || d.projectId === projectId),
    );
  }

  async getHistory(orgId: string, environment: string): Promise<readonly Deployment[]> {
    return [...this.deployments.values()]
      .filter((d) => d.organizationId === orgId && d.environment === environment)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
