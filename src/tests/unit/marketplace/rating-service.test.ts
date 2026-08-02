/**
 * Rating Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RatingService } from '../../../marketplace/ratings/rating-service.js';
import { createMockLogger } from '../../helpers.js';

describe('RatingService', () => {
  let service: RatingService;

  beforeEach(() => { service = new RatingService(createMockLogger()); });

  describe('rate', () => {
    it('should submit a rating', async () => {
      const result = await service.rate('pkg-1', 'user-1', 4);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.score).toBe(4);
    });

    it('should clamp rating to 1-5', async () => {
      const r1 = await service.rate('pkg-1', 'u1', 0);
      const r2 = await service.rate('pkg-1', 'u2', 10);
      expect(r1.data!.score).toBe(1);
      expect(r2.data!.score).toBe(5);
    });

    it('should update existing rating', async () => {
      await service.rate('pkg-1', 'user-1', 3);
      await service.rate('pkg-1', 'user-1', 5);
      const avg = await service.getAverageRating('pkg-1');
      expect(avg).toBe(5);
    });
  });

  describe('review', () => {
    it('should create a review', async () => {
      const result = await service.review('pkg-1', 'v1', 'user-1', 5, 'Great!', 'Love it');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Great!');
        expect(result.data.rating).toBe(5);
      }
    });

    it('should also submit a rating', async () => {
      await service.review('pkg-1', 'v1', 'user-1', 4, 'Good', 'Nice work');
      const avg = await service.getAverageRating('pkg-1');
      expect(avg).toBe(4);
    });
  });

  describe('getAverageRating', () => {
    it('should compute average', async () => {
      await service.rate('pkg-1', 'u1', 5);
      await service.rate('pkg-1', 'u2', 3);
      await service.rate('pkg-1', 'u3', 4);
      const avg = await service.getAverageRating('pkg-1');
      expect(avg).toBeCloseTo(4.0, 1);
    });

    it('should return 0 for no ratings', async () => {
      expect(await service.getAverageRating('pkg-empty')).toBe(0);
    });
  });

  describe('getRatingDistribution', () => {
    it('should return distribution', async () => {
      await service.rate('pkg-1', 'u1', 5);
      await service.rate('pkg-1', 'u2', 5);
      await service.rate('pkg-1', 'u3', 3);
      const dist = await service.getRatingDistribution('pkg-1');
      expect(dist[5]).toBe(2);
      expect(dist[3]).toBe(1);
      expect(dist[1]).toBe(0);
    });
  });

  describe('markHelpful', () => {
    it('should increment helpful count', async () => {
      const review = (await service.review('pkg-1', 'v1', 'u1', 4, 'Good', 'Works well')).data!;
      await service.markHelpful(review.id);
      await service.markHelpful(review.id);
      const updated = await service.getReview(review.id);
      expect(updated!.helpful).toBe(2);
    });
  });

  describe('respondToReview', () => {
    it('should add publisher response', async () => {
      const review = (await service.review('pkg-1', 'v1', 'u1', 3, 'OK', 'Decent')).data!;
      await service.respondToReview(review.id, 'Thank you for your feedback!');
      const updated = await service.getReview(review.id);
      expect(updated!.response).not.toBeNull();
      expect(updated!.response!.body).toContain('Thank you');
    });
  });
});
