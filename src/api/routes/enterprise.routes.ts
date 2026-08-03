/**
 * Enterprise API Routes
 */

import { Hono } from 'hono';
import type { OrganizationHierarchy } from '../../enterprise/organizations/organization-hierarchy.js';
import type { PolicyEngine } from '../../enterprise/policies/policy-engine.js';
import type { ComplianceEngine } from '../../enterprise/compliance/compliance-engine.js';
import type { SecurityManager } from '../../enterprise/security/security-manager.js';
import type { DeploymentManager } from '../../enterprise/deployments/deployment-manager.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, createError } from '../../types/index.js';
import { CreateOrganizationSchema, CreateTeamSchema, CreatePolicySchema } from '../../enterprise/types.js';

export function createEnterpriseRouter(
  orgs: OrganizationHierarchy,
  policies: PolicyEngine,
  compliance: ComplianceEngine,
  security: SecurityManager,
  deployments: DeploymentManager,
  _logger: ILogger,
): Hono {
  const app = new Hono();

  // ─── Organizations ──────────────────────────────────────────────────────

  app.post('/organizations', async (c) => {
    const body = await c.req.json();
    const parsed = CreateOrganizationSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const user = c.get('user');
    const result = await orgs.createOrganization(parsed.data.name, parsed.data.slug, user.uid, parsed.data.plan);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  app.get('/organizations/:id', async (c) => {
    const org = await orgs.getOrganization(c.req.param('id'));
    if (!org) throw createError(ErrorCode.NOT_FOUND, 'Organization not found');
    return c.json({ success: true, data: org });
  });

  app.patch('/organizations/:id', async (c) => {
    const body = await c.req.json();
    const result = await orgs.updateOrganization(c.req.param('id'), body);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  // ─── Departments ────────────────────────────────────────────────────────

  app.get('/organizations/:orgId/departments', async (c) => {
    return c.json({ success: true, data: await orgs.getDepartments(c.req.param('orgId')) });
  });

  app.post('/organizations/:orgId/departments', async (c) => {
    const body = await c.req.json();
    const result = await orgs.createDepartment(c.req.param('orgId'), body.name, body.description ?? '');
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  // ─── Teams ──────────────────────────────────────────────────────────────

  app.get('/organizations/:orgId/teams', async (c) => {
    return c.json({ success: true, data: await orgs.getTeams(c.req.param('orgId')) });
  });

  app.post('/organizations/:orgId/teams', async (c) => {
    const body = await c.req.json();
    const parsed = CreateTeamSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const result = await orgs.createTeam(c.req.param('orgId'), parsed.data.name, parsed.data.description, parsed.data.departmentId ?? undefined);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  // ─── Members ────────────────────────────────────────────────────────────

  app.get('/organizations/:orgId/members', async (c) => {
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 50);
    const result = await orgs.getMembers(c.req.param('orgId'), { page, limit });
    return c.json({ success: true, data: result });
  });

  app.post('/organizations/:orgId/members', async (c) => {
    const body = await c.req.json();
    const result = await orgs.addMember(c.req.param('orgId'), body.userId, body.role ?? 'developer', body.teamIds);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  app.patch('/organizations/:orgId/members/:userId/role', async (c) => {
    const body = await c.req.json();
    const result = await orgs.updateMemberRole(c.req.param('orgId'), c.req.param('userId'), body.role);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.delete('/organizations/:orgId/members/:userId', async (c) => {
    const result = await orgs.removeMember(c.req.param('orgId'), c.req.param('userId'));
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  // ─── Projects ───────────────────────────────────────────────────────────

  app.get('/organizations/:orgId/projects', async (c) => {
    const page = Number(c.req.query('page') ?? 1);
    const result = await orgs.getProjects(c.req.param('orgId'), { page, limit: 20 });
    return c.json({ success: true, data: result });
  });

  app.post('/organizations/:orgId/projects', async (c) => {
    const body = await c.req.json();
    const result = await orgs.createProject(c.req.param('orgId'), body.name, body.description ?? '', body.teamId);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  // ─── Policies ───────────────────────────────────────────────────────────

  app.get('/organizations/:orgId/policies', async (c) => {
    return c.json({ success: true, data: policies.getPolicies(c.req.param('orgId')) });
  });

  app.post('/organizations/:orgId/policies', async (c) => {
    const body = await c.req.json();
    const parsed = CreatePolicySchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const policy = policies.createPolicy({
      ...parsed.data,
      organizationId: c.req.param('orgId'),
      enabled: true,
      metadata: {},
      rules: parsed.data.rules.map((r) => ({
        ...r,
        conditions: r.conditions ?? null,
        principals: r.principals ?? null,
      })),
    });
    return c.json({ success: true, data: policy }, 201);
  });

  app.post('/policies/evaluate', async (c) => {
    const body = await c.req.json();
    const decision = policies.evaluate(body);
    return c.json({ success: true, data: decision });
  });

  // ─── Compliance ─────────────────────────────────────────────────────────

  app.get('/organizations/:orgId/compliance', async (c) => {
    const report = await compliance.getAuditReport(c.req.param('orgId'));
    return c.json({ success: true, data: report });
  });

  app.get('/organizations/:orgId/compliance/evaluate', async (c) => {
    const result = await compliance.evaluate(c.req.param('orgId'));
    return c.json({ success: true, data: result });
  });

  // ─── Security ───────────────────────────────────────────────────────────

  app.get('/organizations/:orgId/security/policy', async (c) => {
    const policy = security.getPolicy(c.req.param('orgId'));
    return c.json({ success: true, data: policy });
  });

  app.post('/organizations/:orgId/security/validate-password', async (c) => {
    const body = await c.req.json();
    const result = security.validatePassword(c.req.param('orgId'), body.password);
    return c.json({ success: true, data: result });
  });

  // ─── Deployments ────────────────────────────────────────────────────────

  app.get('/organizations/:orgId/deployments', async (c) => {
    const projectId = c.req.query('projectId');
    return c.json({ success: true, data: await deployments.list(c.req.param('orgId'), projectId ?? undefined) });
  });

  app.post('/organizations/:orgId/deployments', async (c) => {
    const body = await c.req.json();
    const user = c.get('user');
    const result = await deployments.create(c.req.param('orgId'), body.projectId, body.environment, body.version, user.uid);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  app.post('/deployments/:id/deploy', async (c) => {
    const result = await deployments.deploy(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/deployments/:id/rollback', async (c) => {
    const result = await deployments.rollback(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  return app;
}
