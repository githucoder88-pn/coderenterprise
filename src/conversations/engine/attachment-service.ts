/**
 * Attachment Service
 *
 * Multi-modal attachment handling: images, audio, files, code, URLs.
 */

import type { Attachment, AttachmentType } from './types.js';
import type { ILogger } from '../../telemetry/logger.js';

interface AttachmentConfig {
  readonly maxFileSize: number; // bytes
  readonly allowedMimeTypes: readonly string[];
  readonly imageMaxDimension: number;
  readonly audioMaxDuration: number; // seconds
}

const DEFAULT_CONFIG: AttachmentConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
    'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/m4a', 'audio/webm',
    'application/pdf', 'text/plain', 'text/csv', 'text/markdown',
    'application/json', 'application/xml',
    'application/javascript', 'text/typescript', 'text/x-python',
    'application/zip', 'application/gzip',
  ],
  imageMaxDimension: 4096,
  audioMaxDuration: 300,
};

export interface IAttachmentService {
  create(messageId: string, type: AttachmentType, data: string, mimeType: string, name: string): Promise<Attachment>;
  createFromUrl(messageId: string, url: string, name: string): Promise<Attachment>;
  get(id: string): Attachment | null;
  getByMessage(messageId: string): readonly Attachment[];
  processForProvider(attachment: Attachment): Promise<{ type: string; data: Record<string, unknown> }>;
  validate(data: string, mimeType: string, type: AttachmentType): { valid: boolean; error?: string };
  delete(id: string): void;
}

export class AttachmentService implements IAttachmentService {
  private readonly attachments = new Map<string, Attachment>();

  constructor(
    private readonly logger: ILogger,
    private readonly config: AttachmentConfig = DEFAULT_CONFIG,
  ) {}

  async create(
    messageId: string, type: AttachmentType, data: string, mimeType: string, name: string,
  ): Promise<Attachment> {
    const validation = this.validate(data, mimeType, type);
    if (!validation.valid) throw new Error(validation.error);

    const id = crypto.randomUUID();
    const now = new Date();
    const size = Buffer.byteLength(data, 'base64');

    let dimensions: { width: number; height: number } | undefined;
    let duration: number | undefined;

    if (type === 'image') {
      dimensions = await this.getImageDimensions(data);
    } else if (type === 'audio') {
      duration = await this.getAudioDuration(data);
    }

    const attachment: Attachment = {
      id, messageId, type, name, mimeType, size,
      url: null, base64Data: data, textContent: type === 'file' ? await this.extractText(data) : null,
      metadata: {}, processingStatus: 'completed', dimensions, duration,
      createdAt: now, updatedAt: now,
    };

    this.attachments.set(id, attachment);
    this.logger.debug({ id, type, name, size }, 'Attachment created');
    return attachment;
  }

  async createFromUrl(messageId: string, url: string, name: string): Promise<Attachment> {
    const id = crypto.randomUUID();
    const now = new Date();

    const attachment: Attachment = {
      id, messageId, type: 'url', name, mimeType: 'text/url', size: 0,
      url, base64Data: null, textContent: null, metadata: { sourceUrl: url },
      processingStatus: 'completed', createdAt: now, updatedAt: now,
    };

    this.attachments.set(id, attachment);
    return attachment;
  }

  get(id: string): Attachment | null {
    return this.attachments.get(id) ?? null;
  }

  getByMessage(messageId: string): readonly Attachment[] {
    return [...this.attachments.values()].filter((a) => a.messageId === messageId);
  }

  async processForProvider(attachment: Attachment): Promise<{ type: string; data: Record<string, unknown> }> {
    switch (attachment.type) {
      case 'image':
        return {
          type: 'image_url',
          data: {
            image_url: {
              url: attachment.base64Data
                ? `data:${attachment.mimeType};base64,${attachment.base64Data}`
                : attachment.url,
              detail: 'auto',
            },
          },
        };
      case 'audio':
        return {
          type: 'input_audio',
          data: {
            input_audio: {
              data: attachment.base64Data,
              format: attachment.mimeType.includes('wav') ? 'wav' : 'mp3',
            },
          },
        };
      case 'file':
      case 'code':
        return {
          type: 'text',
          data: { text: attachment.textContent ?? `[File: ${attachment.name}]` },
        };
      case 'url':
        return {
          type: 'text',
          data: { text: `[URL: ${attachment.url}]` },
        };
      default:
        return { type: 'text', data: { text: `[Attachment: ${attachment.name}]` } };
    }
  }

  validate(data: string, mimeType: string, type: AttachmentType): { valid: boolean; error?: string } {
    const size = Buffer.byteLength(data, 'base64');

    if (size > this.config.maxFileSize) {
      return { valid: false, error: `File exceeds maximum size of ${this.config.maxFileSize / 1024 / 1024}MB` };
    }

    if (!this.config.allowedMimeTypes.includes(mimeType) && type !== 'url') {
      return { valid: false, error: `MIME type ${mimeType} is not allowed` };
    }

    if (type === 'image' && !mimeType.startsWith('image/')) {
      return { valid: false, error: 'Invalid MIME type for image attachment' };
    }

    if (type === 'audio' && !mimeType.startsWith('audio/')) {
      return { valid: false, error: 'Invalid MIME type for audio attachment' };
    }

    return { valid: true };
  }

  delete(id: string): void {
    this.attachments.delete(id);
  }

  private async getImageDimensions(_base64: string): Promise<{ width: number; height: number } | undefined> {
    // In production, use sharp/jimp for image metadata
    return undefined;
  }

  private async getAudioDuration(_base64: string): Promise<number | undefined> {
    // In production, use ffprobe for audio metadata
    return undefined;
  }

  private async extractText(base64: string): Promise<string | null> {
    try {
      return Buffer.from(base64, 'base64').toString('utf8').slice(0, 100_000);
    } catch {
      return null;
    }
  }
}
