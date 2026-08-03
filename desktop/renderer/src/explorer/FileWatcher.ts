export class FileWatcher {
  private timer: number | null = null;

  start(callback: () => void, intervalMs = 5000): () => void {
    this.stop();
    this.timer = window.setInterval(callback, intervalMs);
    return () => this.stop();
  }

  stop(): void {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
  }
}
