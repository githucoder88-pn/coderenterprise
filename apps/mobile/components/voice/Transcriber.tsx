/**
 * Transcriber — placeholder transcriber component. In production, this would
 * stream audio chunks to the backend or invoke on-device speech recognition.
 * We provide a graceful fallback that yields a transcript placeholder.
 */
export interface TranscriberResult {
  transcript: string;
  confidence?: number;
  isFinal: boolean;
}

type PartialHandler = (text: string) => void;
type FinalHandler = (result: TranscriberResult) => void;

class TranscriberImpl {
  private handlers: { partial: PartialHandler; final: FinalHandler } | null = null;

  start(onPartial: PartialHandler, onFinal: FinalHandler) {
    this.handlers = { partial: onPartial, final: onFinal };
  }

  stop() {
    this.handlers?.final({ transcript: '(Voice note transcribed)', isFinal: true, confidence: 0 });
    this.handlers = null;
  }

  cancel() { this.handlers = null; }
}

export const Transcriber = new TranscriberImpl();
