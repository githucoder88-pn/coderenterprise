/**
 * Rating & Review Service
 *
 * Manages ratings, reviews, and quality scoring for marketplace packages.
 */

import type { Review, Rating } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, type Result, type PaginationParams, type PaginatedResponse } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export interface IRatingService {
  rate(packageId: string, userId: string, score: number): Promise<Result<Rating>>;
  review(packageId: string, versionId: string, userId: string, rating: number, title: string, body: string): Promise<Result<Review>>;
  getReviews(packageId: string, pagination: PaginationParams): Promise<PaginatedResponse<Review>>;
  getReview(id: string): Promise<Review | null>;
  respondToReview(reviewId: string, body: string): Promise<Result<void>>;
  markHelpful(reviewId: string): Promise<Result<void>>;
  reportReview(reviewId: string, reason: string): Promise<Result<void>>;
  getAverageRating(packageId: string): Promise<number>;
  getRatingDistribution(packageId: string): Promise<Record<number, number>>;
  getRecentReviews(limit?: number): Promise<readonly Review[]>;
  deleteReview(reviewId: string): Promise<Result<void>>;
}

export class RatingService implements IRatingService {
  private readonly ratings = new Map<string, Rating[]>();
  private readonly reviews = new Map<string, Review>();

  constructor(private readonly logger: ILogger) {}

  async rate(packageId: string, userId: string, score: number): Promise<Result<Rating>> {
    const clampedScore = Math.max(1, Math.min(5, Math.round(score)));
    const now = new Date();

    // Update existing rating or create new
    const existing = this.ratings.get(packageId) ?? [];
    const idx = existing.findIndex((r) => r.userId === userId);
    const rating: Rating = { id: crypto.randomUUID(), packageId, userId, score: clampedScore, createdAt: now, updatedAt: now };

    if (idx >= 0) {
      existing[idx] = rating;
    } else {
      existing.push(rating);
    }
    this.ratings.set(packageId, existing);

    this.logger.info({ packageId, userId, score: clampedScore }, 'Rating submitted');
    return { success: true, data: rating };
  }

  async review(packageId: string, versionId: string, userId: string, rating: number, title: string, body: string): Promise<Result<Review>> {
    // Also submit rating
    await this.rate(packageId, userId, rating);

    const now = new Date();
    const review: Review = {
      id: crypto.randomUUID(), packageId, versionId, userId,
      rating: Math.max(1, Math.min(5, Math.round(rating))),
      title, body, helpful: 0, reported: false, response: null,
      createdAt: now, updatedAt: now,
    };

    this.reviews.set(review.id, review);
    this.logger.info({ reviewId: review.id, packageId, rating: review.rating }, 'Review submitted');
    return { success: true, data: review };
  }

  async getReviews(packageId: string, pagination: PaginationParams): Promise<PaginatedResponse<Review>> {
    const reviews = [...this.reviews.values()]
      .filter((r) => r.packageId === packageId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = (pagination.page - 1) * pagination.limit;
    return createPaginatedResponse(reviews.slice(start, start + pagination.limit), reviews.length, pagination);
  }

  async getReview(id: string): Promise<Review | null> { return this.reviews.get(id) ?? null; }

  async respondToReview(reviewId: string, body: string): Promise<Result<void>> {
    const review = this.reviews.get(reviewId);
    if (!review) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Review not found', timestamp: new Date() } };
    this.reviews.set(reviewId, { ...review, response: { body, at: new Date() }, updatedAt: new Date() });
    return { success: true, data: undefined };
  }

  async markHelpful(reviewId: string): Promise<Result<void>> {
    const review = this.reviews.get(reviewId);
    if (!review) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Review not found', timestamp: new Date() } };
    this.reviews.set(reviewId, { ...review, helpful: review.helpful + 1, updatedAt: new Date() });
    return { success: true, data: undefined };
  }

  async reportReview(reviewId: string, reason: string): Promise<Result<void>> {
    const review = this.reviews.get(reviewId);
    if (!review) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Review not found', timestamp: new Date() } };
    this.reviews.set(reviewId, { ...review, reported: true, updatedAt: new Date() });
    this.logger.warn({ reviewId, reason }, 'Review reported');
    return { success: true, data: undefined };
  }

  async getAverageRating(packageId: string): Promise<number> {
    const ratings = this.ratings.get(packageId) ?? [];
    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
  }

  async getRatingDistribution(packageId: string): Promise<Record<number, number>> {
    const ratings = this.ratings.get(packageId) ?? [];
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of ratings) dist[r.score] = (dist[r.score] ?? 0) + 1;
    return dist;
  }

  async getRecentReviews(limit = 20): Promise<readonly Review[]> {
    return [...this.reviews.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async deleteReview(reviewId: string): Promise<Result<void>> {
    this.reviews.delete(reviewId);
    return { success: true, data: undefined };
  }
}
