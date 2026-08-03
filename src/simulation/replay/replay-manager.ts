/**
 * Replay Manager
 *
 * Records simulation events and provides deterministic replay.
 */

import type { ReplaySession, ReplayEvent } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IReplayManager {
  startRecording(simulationId: string): string;
  recordEvent(sessionId: string, event: Omit<ReplayEvent, 'sequenceNumber'>): void;
  stopRecording(sessionId: string): ReplaySession;
  replay(sessionId: string, handler: (event: ReplayEvent) => void | Promise<void>): Promise<number>;
  getSession(sessionId: string): ReplaySession | null;
  listSessions(simulationId?: string): readonly ReplaySession[];
  exportSession(sessionId: string): string;
  importSession(data: string): ReplaySession;
  compareSessions(sessionIdA: string, sessionIdB: string): { identical: boolean; differences: readonly number[] };
}

export class ReplayManager implements IReplayManager {
  private readonly sessions = new Map<string, ReplaySession>();
  private readonly activeRecordings = new Map<string, { sessionId: string; events: ReplayEvent[]; startTime: number }>();

  constructor(private readonly logger: ILogger) {}

  startRecording(simulationId: string): string {
    const sessionId = `replay-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    this.activeRecordings.set(simulationId, { sessionId, events: [], startTime: Date.now() });
    this.logger.info({ sessionId, simulationId }, 'Recording started');
    return sessionId;
  }

  recordEvent(simulationId: string, event: Omit<ReplayEvent, 'sequenceNumber'>): void {
    const recording = this.activeRecordings.get(simulationId);
    if (!recording) return;
    recording.events.push({ ...event, sequenceNumber: recording.events.length });
  }

  stopRecording(simulationId: string): ReplaySession {
    const recording = this.activeRecordings.get(simulationId);
    if (!recording) throw new Error('No active recording');

    const now = new Date();
    const session: ReplaySession = {
      id: recording.sessionId, simulationId,
      events: recording.events,
      duration: Date.now() - recording.startTime,
      status: 'recorded', metadata: {},
      createdAt: now, updatedAt: now,
    };

    this.sessions.set(session.id, session);
    this.activeRecordings.delete(simulationId);
    this.logger.info({ sessionId: session.id, events: session.events.length, duration: session.duration }, 'Recording stopped');
    return session;
  }

  async replay(sessionId: string, handler: (event: ReplayEvent) => void | Promise<void>): Promise<number> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    this.sessions.set(sessionId, { ...session, status: 'replaying', updatedAt: new Date() });
    let processed = 0;

    for (const event of session.events) {
      try {
        await handler(event);
        processed++;
      } catch (error) {
        this.logger.warn({ sessionId, sequenceNumber: event.sequenceNumber, error }, 'Replay event failed');
      }
    }

    this.sessions.set(sessionId, { ...session, status: 'completed', updatedAt: new Date() });
    return processed;
  }

  getSession(sessionId: string): ReplaySession | null { return this.sessions.get(sessionId) ?? null; }

  listSessions(simulationId?: string): readonly ReplaySession[] {
    const all = [...this.sessions.values()];
    return simulationId ? all.filter((s) => s.simulationId === simulationId) : all;
  }

  exportSession(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    return JSON.stringify(session);
  }

  importSession(data: string): ReplaySession {
    const session = JSON.parse(data) as ReplaySession;
    this.sessions.set(session.id, session);
    return session;
  }

  compareSessions(sessionIdA: string, sessionIdB: string): { identical: boolean; differences: readonly number[] } {
    const a = this.sessions.get(sessionIdA);
    const b = this.sessions.get(sessionIdB);
    if (!a || !b) return { identical: false, differences: [] };

    const differences: number[] = [];
    const maxLen = Math.max(a.events.length, b.events.length);
    for (let i = 0; i < maxLen; i++) {
      const ea = a.events[i];
      const eb = b.events[i];
      if (!ea || !eb || ea.type !== eb.type || JSON.stringify(ea.data) !== JSON.stringify(eb.data)) {
        differences.push(i);
      }
    }

    return { identical: differences.length === 0, differences };
  }
}
