/**
 * Replay Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReplayManager } from '../../../simulation/replay/replay-manager.js';
import { createMockLogger } from '../../helpers.js';

describe('ReplayManager', () => {
  let manager: ReplayManager;

  beforeEach(() => { manager = new ReplayManager(createMockLogger()); });

  describe('record and replay', () => {
    it('should record and replay events', async () => {
      const simId = 'sim-1';
      manager.startRecording(simId);
      manager.recordEvent(simId, { timestamp: Date.now(), type: 'input', data: { text: 'hello' } });
      manager.recordEvent(simId, { timestamp: Date.now() + 100, type: 'output', data: { text: 'world' } });
      const session = manager.stopRecording(simId);

      expect(session.events.length).toBe(2);
      expect(session.status).toBe('recorded');

      const replayed: unknown[] = [];
      await manager.replay(session.id, (event) => { replayed.push(event.data); });
      expect(replayed.length).toBe(2);
    });
  });

  describe('export / import', () => {
    it('should export and import sessions', async () => {
      manager.startRecording('sim-1');
      manager.recordEvent('sim-1', { timestamp: Date.now(), type: 'input', data: 'test' });
      const session = manager.stopRecording('sim-1');

      const exported = manager.exportSession(session.id);
      const imported = manager.importSession(exported);
      expect(imported.id).toBe(session.id);
      expect(imported.events.length).toBe(1);
    });
  });

  describe('compareSessions', () => {
    it('should detect identical sessions', async () => {
      manager.startRecording('s1');
      manager.recordEvent('s1', { timestamp: 1, type: 'input', data: 'a' });
      const a = manager.stopRecording('s1');

      manager.startRecording('s2');
      manager.recordEvent('s2', { timestamp: 1, type: 'input', data: 'a' });
      const b = manager.stopRecording('s2');

      const comparison = manager.compareSessions(a.id, b.id);
      expect(comparison.identical).toBe(true);
    });

    it('should detect differences', async () => {
      manager.startRecording('s1');
      manager.recordEvent('s1', { timestamp: 1, type: 'input', data: 'a' });
      const a = manager.stopRecording('s1');

      manager.startRecording('s2');
      manager.recordEvent('s2', { timestamp: 1, type: 'input', data: 'b' });
      const b = manager.stopRecording('s2');

      const comparison = manager.compareSessions(a.id, b.id);
      expect(comparison.identical).toBe(false);
      expect(comparison.differences.length).toBeGreaterThan(0);
    });
  });
});
