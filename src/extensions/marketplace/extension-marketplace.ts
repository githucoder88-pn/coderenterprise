/**
 * Extension Marketplace
 *
 * Browse, search, install, rate, and review extensions.
 */

import type { MarketplaceExtension, Publisher, ExtensionReview, ExtensionManifest } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, type Result, type PaginationParams, type PaginatedResponse } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export interface IExtensionMarketplace {
  search(query: string, pagination: PaginationParams): Promise<PaginatedResponse<MarketplaceExtension>>;
  getById(id: string): Promise<MarketplaceExtension | null>;
  getByCategory(category: string, pagination: PaginationParams): Promise<PaginatedResponse<MarketplaceExtension>>;
  getFeatured(limit?: number): Promise<readonly MarketplaceExtension[]>;
  getPopular(limit?: number): Promise<readonly MarketplaceExtension[]>;
  getPublisher(id: string): Promise<Publisher | null>;
  getReviews(extensionId: string, pagination: PaginationParams): Promise<PaginatedResponse<ExtensionReview>>;
  publish(manifest: ExtensionManifest, publisherId: string): Promise<Result<MarketplaceExtension>>;
  rate(extensionId: string, userId: string, rating: number, title: string, body: string): Promise<Result<ExtensionReview>>;
  getCategories(): Promise<readonly string[]>;
}

export class ExtensionMarketplace implements IExtensionMarketplace {
  private readonly extensions = new Map<string, MarketplaceExtension>();
  private readonly publishers = new Map<string, Publisher>();
  private readonly reviews = new Map<string, ExtensionReview[]>();

  constructor(
    private readonly logger: ILogger,
  ) {}

  async search(query: string, pagination: PaginationParams): Promise<PaginatedResponse<MarketplaceExtension>> {
    const q = query.toLowerCase();
    const results = [...this.extensions.values()].filter((e) =>
      e.manifest.name.toLowerCase().includes(q) || e.manifest.description.toLowerCase().includes(q) ||
      e.manifest.keywords.some((k) => k.toLowerCase().includes(q)),
    ).sort((a, b) => b.downloadCount - a.downloadCount);

    const start = (pagination.page - 1) * pagination.limit;
    return createPaginatedResponse(results.slice(start, start + pagination.limit), results.length, pagination);
  }

  async getById(id: string): Promise<MarketplaceExtension | null> { return this.extensions.get(id) ?? null; }

  async getByCategory(category: string, pagination: PaginationParams): Promise<PaginatedResponse<MarketplaceExtension>> {
    const results = [...this.extensions.values()].filter((e) => e.categories.includes(category));
    const start = (pagination.page - 1) * pagination.limit;
    return createPaginatedResponse(results.slice(start, start + pagination.limit), results.length, pagination);
  }

  async getFeatured(limit = 10): Promise<readonly MarketplaceExtension[]> {
    return [...this.extensions.values()].filter((e) => e.featured).slice(0, limit);
  }

  async getPopular(limit = 20): Promise<readonly MarketplaceExtension[]> {
    return [...this.extensions.values()].sort((a, b) => b.downloadCount - a.downloadCount).slice(0, limit);
  }

  async getPublisher(id: string): Promise<Publisher | null> { return this.publishers.get(id) ?? null; }

  async getReviews(extensionId: string, pagination: PaginationParams): Promise<PaginatedResponse<ExtensionReview>> {
    const reviews = this.reviews.get(extensionId) ?? [];
    const start = (pagination.page - 1) * pagination.limit;
    return createPaginatedResponse(reviews.slice(start, start + pagination.limit), reviews.length, pagination);
  }

  async publish(manifest: ExtensionManifest, publisherId: string): Promise<Result<MarketplaceExtension>> {
    if (this.extensions.has(manifest.id)) {
      return { success: false, error: { code: ErrorCode.CONFLICT, message: `Extension ${manifest.id} already exists`, timestamp: new Date() } };
    }

    const now = new Date();
    const extension: MarketplaceExtension = {
      id: manifest.id, manifest,
      publisher: this.publishers.get(publisherId) ?? {
        id: publisherId, name: manifest.publisher, email: '', verified: false, extensionCount: 0, joinedAt: now,
      },
      downloadCount: 0, rating: 0, reviewCount: 0, verified: false, featured: false,
      categories: manifest.categories, screenshots: [], changelog: '', pricing: null,
      createdAt: now, updatedAt: now,
    };

    this.extensions.set(manifest.id, extension);
    this.logger.info({ id: manifest.id, publisher: manifest.publisher }, 'Extension published to marketplace');
    return { success: true, data: extension };
  }

  async rate(extensionId: string, userId: string, rating: number, title: string, body: string): Promise<Result<ExtensionReview>> {
    const ext = this.extensions.get(extensionId);
    if (!ext) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Extension not found', timestamp: new Date() } };

    const now = new Date();
    const review: ExtensionReview = {
      id: crypto.randomUUID(), extensionId, userId,
      rating: Math.max(1, Math.min(5, rating)), title, body, helpful: 0,
      createdAt: now, updatedAt: now,
    };

    if (!this.reviews.has(extensionId)) this.reviews.set(extensionId, []);
    this.reviews.get(extensionId)!.push(review);

    // Recalculate average rating
    const allReviews = this.reviews.get(extensionId)!;
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    this.extensions.set(extensionId, { ...ext, rating: avgRating, reviewCount: allReviews.length, updatedAt: now });

    return { success: true, data: review };
  }

  async getCategories(): Promise<readonly string[]> {
    const categories = new Set<string>();
    for (const ext of this.extensions.values()) {
      for (const cat of ext.categories) categories.add(cat);
    }
    return [...categories].sort();
  }
}
