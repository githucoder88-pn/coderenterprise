/**
 * Runtime Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RuntimeManager } from '../../../runtime/orchestrator/runtime-manager.js';
import { createMockLogger } from '../../helpers.js';

describe('RuntimeManager', () => {
  let runtime: RuntimeManager;

  beforeEach(() => { runtime = new RuntimeManager(createMockLogger()); });

  describe('createWorkflow', () => {
    it('should create a workflow', async () => {
      const result = await runtime.createWorkflow('Build REST API', 'supervised');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.goal).toBe('Build REST API');
        expect(result.data.status).toBe('draft');
        expect(result.data.mode).toBe('supervised');
      }
    });

    it('should set approvalRequired for supervised mode', async () => {
      const result = await runtime.createWorkflow('Test', 'supervised');
      expect(result.data!.approvalRequired).toBe(true);
    });

    it('should not require approval for autonomous mode', async () => {
      const result = await runtime.createWorkflow('Test', 'autonomous', { approvalRequired: false });
      expect(result.data!.approvalRequired).toBe(false);
    });
  });

  describe('startWorkflow', () => {
    it('should start a workflow and generate plan', async () => {
      const wf = (await runtime.createWorkflow('Build API', 'automatic')).data!;
      const result = await runtime.startWorkflow(wf.id);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('executing');
        expect(result.data.plan).not.toBeNull();
        expect(result.data.plan!.steps.length).toBeGreaterThan(0);
        expect(result.data.tasks.length).toBeGreaterThan(0);
      }
    });

    it('should fail to start a non-draft workflow', async () => {
      const wf = (await runtime.createWorkflow('Test', 'automatic')).data!;
      await runtime.startWorkflow(wf.id);
      const result = await runtime.startWorkflow(wf.id);
      expect(result.success).toBe(false);
    });

    it('should generate required agents and tools', async () => {
      const wf = (await runtime.createWorkflow('Build API', 'automatic')).data!;
      const started = await runtime.startWorkflow(wf.id);
      if (started.success) {
        expect(started.data.plan!.requiredAgents).toContain('coder');
        expect(started.data.plan!.requiredAgents).toContain('reviewer');
        expect(started.data.plan!.requiredAgents).toContain('tester');
      }
    });
  });

  describe('pauseWorkflow / resumeWorkflow', () => {
    it('should pause and resume', async () => {
      const wf = (await runtime.createWorkflow('Test', 'automatic')).data!;
      await runtime.startWorkflow(wf.id);

      runtime.pauseWorkflow(wf.id);
      expect(runtime.getWorkflow(wf.id)!.status).toBe('paused');

      await runtime.resumeWorkflow(wf.id);
      expect(runtime.getWorkflow(wf.id)!.status).toBe('executing');
    });
  });

  describe('cancelWorkflow', () => {
    it('should cancel a workflow', async () => {
      const wf = (await runtime.createWorkflow('Test', 'automatic')).data!;
      runtime.cancelWorkflow(wf.id);
      expect(runtime.getWorkflow(wf.id)!.status).toBe('cancelled');
    });
  });

  describe('completeTask / failTask', () => {
    it('should complete tasks and advance workflow', async () => {
      const wf = (await runtime.createWorkflow('Test', 'automatic')).data!;
      await runtime.startWorkflow(wf.id);
      const tasks = runtime.getWorkflow(wf.id)!.tasks;

      // Complete first task
      const result = await runtime.completeTask(wf.id, tasks[0]!.id, 'Task output');
      expect(result.success).toBe(true);
      expect(result.data!.status).toBe('completed');
    });

    it('should fail and enter correcting state', async () => {
      const wf = (await runtime.createWorkflow('Test', 'automatic')).data!;
      await runtime.startWorkflow(wf.id);
      const tasks = runtime.getWorkflow(wf.id)!.tasks;

      await runtime.failTask(wf.id, tasks[0]!.id, 'Error occurred');
      expect(runtime.getWorkflow(wf.id)!.status).toBe('correcting');
    });
  });

  describe('correctTask', () => {
    it('should reset task to running for correction', async () => {
      const wf = (await runtime.createWorkflow('Test', 'automatic')).data!;
      await runtime.startWorkflow(wf.id);
      const tasks = runtime.getWorkflow(wf.id)!.tasks;

      await runtime.failTask(wf.id, tasks[0]!.id, 'Error');
      const result = await runtime.correctTask(wf.id, tasks[0]!.id);
      expect(result.success).toBe(true);
      expect(result.data!.status).toBe('running');
      expect(result.data!.correctionAttempts).toBe(1);
    });

    it('should fail after max corrections', async () => {
      const wf = (await runtime.createWorkflow('Test', 'automatic', { maxRetries: 1 })).data!;
      await runtime.startWorkflow(wf.id);
      const tasks = runtime.getWorkflow(wf.id)!.tasks;

      // Exhaust corrections
      for (let i = 0; i < 3; i++) {
        await runtime.failTask(wf.id, tasks[0]!.id, 'Error');
        if (i < 2) await runtime.correctTask(wf.id, tasks[0]!.id);
      }

      const result = await runtime.correctTask(wf.id, tasks[0]!.id);
      expect(result.success).toBe(false);
    });
  });

  describe('validateTask', () => {
    it('should validate and update task status', async () => {
      const wf = (await runtime.createWorkflow('Test', 'automatic')).data!;
      await runtime.startWorkflow(wf.id);
      const tasks = runtime.getWorkflow(wf.id)!.tasks;

      runtime.validateTask(wf.id, tasks[0]!.id, true, [
        { name: 'output_format', passed: true, message: 'Valid JSON' },
        { name: 'completeness', passed: true, message: 'All fields present' },
      ]);

      const task = runtime.getWorkflow(wf.id)!.tasks[0]!;
      expect(task.validation?.passed).toBe(true);
      expect(task.validation?.score).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return workflow statistics', async () => {
      await runtime.createWorkflow('A', 'automatic');
      await runtime.createWorkflow('B', 'supervised');
      const stats = runtime.getStats();
      expect(stats.total).toBe(2);
      expect(stats.byMode['automatic']).toBe(1);
      expect(stats.byMode['supervised']).toBe(1);
    });
  });
});
