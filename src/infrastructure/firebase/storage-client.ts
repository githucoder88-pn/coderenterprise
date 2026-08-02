/**
 * Firebase Cloud Storage Client Adapter
 *
 * Type-safe wrapper around Firebase Admin Storage.
 */

import * as admin from 'firebase-admin';
import { nanoid } from 'nanoid';
import type { ILogger } from '../../telemetry/logger.js';

export interface IStorageUploadParams {
  readonly bucket: string;
  readonly path: string;
  readonly data: Buffer;
  readonly contentType: string;
  readonly metadata?: Record<string, string>;
}

export interface IStorageDownloadResult {
  readonly data: Buffer;
  readonly metadata: Record<string, string>;
}

export interface IStorageFile {
  readonly name: string;
  readonly size: number;
  readonly contentType: string;
  readonly timeCreated: string;
  readonly updated: string;
  readonly md5Hash?: string;
}

export interface IStorageClient {
  upload(params: IStorageUploadParams): Promise<string>;
  download(bucket: string, path: string): Promise<IStorageDownloadResult>;
  delete(bucket: string, path: string): Promise<void>;
  getSignedUrl(
    bucket: string,
    path: string,
    expiresInMs?: number,
  ): Promise<string>;
  listFiles(
    bucket: string,
    prefix?: string,
    maxResults?: number,
  ): Promise<readonly IStorageFile[]>;
  copy(
    sourceBucket: string,
    sourcePath: string,
    destBucket: string,
    destPath: string,
  ): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export class StorageClientAdapter implements IStorageClient {
  private readonly storage: admin.storage.Storage;

  constructor(
    private readonly defaultBucket: string,
    private readonly logger: ILogger,
  ) {
    this.storage = admin.storage();
    this.logger.info({ bucket: defaultBucket }, 'Firebase Storage initialized');
  }

  async upload(params: IStorageUploadParams): Promise<string> {
    const filePath = params.path || `${nanoid()}`;
    const bucket = this.storage.bucket(params.bucket || this.defaultBucket);
    const file = bucket.file(filePath);

    await file.save(params.data, {
      contentType: params.contentType,
      metadata: {
        metadata: params.metadata,
      },
    });

    this.logger.debug({ path: filePath, size: params.data.length }, 'File uploaded');
    return filePath;
  }

  async download(
    bucket: string,
    path: string,
  ): Promise<IStorageDownloadResult> {
    const file = this.storage.bucket(bucket || this.defaultBucket).file(path);
    const [data, metadata] = await Promise.all([
      file.download(),
      file.getMetadata(),
    ]);

    return {
      data,
      metadata: (metadata[0]?.metadata as Record<string, string>) ?? {},
    };
  }

  async delete(bucket: string, path: string): Promise<void> {
    await this.storage.bucket(bucket || this.defaultBucket).file(path).delete();
    this.logger.debug({ path }, 'File deleted');
  }

  async getSignedUrl(
    bucket: string,
    path: string,
    expiresInMs?: number,
  ): Promise<string> {
    const file = this.storage.bucket(bucket || this.defaultBucket).file(path);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + (expiresInMs ?? 3600_000),
    });
    return url;
  }

  async listFiles(
    bucket: string,
    prefix?: string,
    maxResults?: number,
  ): Promise<readonly IStorageFile[]> {
    const [files] = await this.storage
      .bucket(bucket || this.defaultBucket)
      .getFiles({
        prefix,
        maxResults: maxResults ?? 1000,
      });

    return files.map((f) => ({
      name: f.name,
      size: Number(f.metadata?.size ?? 0),
      contentType: (f.metadata?.contentType as string) ?? 'application/octet-stream',
      timeCreated: (f.metadata?.timeCreated as string) ?? '',
      updated: (f.metadata?.updated as string) ?? '',
      md5Hash: (f.metadata?.md5Hash as string) ?? undefined,
    }));
  }

  async copy(
    sourceBucket: string,
    sourcePath: string,
    destBucket: string,
    destPath: string,
  ): Promise<void> {
    const src = this.storage.bucket(sourceBucket).file(sourcePath);
    await src.copy(this.storage.bucket(destBucket).file(destPath));
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.storage.bucket(this.defaultBucket).exists();
      return true;
    } catch {
      return false;
    }
  }
}
