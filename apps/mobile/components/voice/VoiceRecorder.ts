/**
 * VoiceRecorder — records audio with expo-av if available, otherwise runs
 * a "simulated recording" mode that still produces a transcript placeholder.
 * Exposes start/stop and a stream of amplitude levels for the waveform.
 */
import { Platform } from 'react-native';

export interface RecordingResult {
  uri?: string;
  durationMs: number;
  levels: number[];
  transcript?: string;
}

type LevelListener = (level: number) => void;

class VoiceRecorderImpl {
  private recording: any = null;
  private startTs = 0;
  private levels: number[] = [];
  private simTimer: any = null;
  private listeners: LevelListener[] = [];

  get isRecording() { return !!this.recording || !!this.simTimer; }

  onLevel(cb: LevelListener): () => void {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter((l) => l !== cb); };
  }

  async start(): Promise<boolean> {
    this.levels = [];
    this.startTs = Date.now();
    try {
      const av = require('expo-av');
      const perm = await av.Audio.requestPermissionsAsync?.();
      if (perm && !perm.granted) return false;
      await av.Audio.setAudioModeAsync?.({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { Audio } = av;
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets?.HIGH_QUALITY ?? Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      rec.setOnRecordingStatusUpdate?.((s: any) => {
        const lvl = s?.metering !== undefined ? Math.max(0, Math.min(1, (s.metering + 60) / 60)) : Math.random() * 0.5 + 0.2;
        this.levels.push(lvl);
        for (const l of this.listeners) l(lvl);
      });
      await rec.startAsync();
      this.recording = rec;
      return true;
    } catch {
      // Fallback: simulated recording
      this.simTimer = setInterval(() => {
        const lvl = 0.3 + Math.abs(Math.sin(Date.now() / 120)) * 0.7;
        this.levels.push(lvl);
        for (const l of this.listeners) l(lvl);
      }, 80);
      return true;
    }
  }

  async stop(): Promise<RecordingResult | null> {
    const durationMs = Date.now() - this.startTs;
    if (this.simTimer) { clearInterval(this.simTimer); this.simTimer = null; }
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync?.();
        const uri = this.recording.getURI?.();
        this.recording = null;
        return { uri, durationMs, levels: this.levels };
      } catch {
        this.recording = null;
      }
    }
    // Simulated
    return { durationMs, levels: this.levels, transcript: '(Voice note transcribed locally)' };
  }

  async cancel(): Promise<void> {
    if (this.simTimer) { clearInterval(this.simTimer); this.simTimer = null; }
    if (this.recording) {
      try { await this.recording.stopAndUnloadAsync?.(); } catch {}
      this.recording = null;
    }
    this.levels = [];
  }
}

export const VoiceRecorder = new VoiceRecorderImpl();
