/**
 * Pagination Tests
 */

import { describe, it, expect } from 'vitest';
import { createPaginatedResponse } from '../../../types/index.js';

describe('Pagination', () => {
  describe('createPaginatedResponse', () => {
    it('should create correct pagination metadata', () => {
      const data = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const result = createPaginatedResponse(data, 100, { page: 1, limit: 3 });

      expect(result.data).toEqual(data);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 3,
        total: 100,
        totalPages: 34,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should handle last page', () => {
      const data = [{ id: '1' }];
      const result = createPaginatedResponse(data, 10, { page: 5, limit: 2 });

      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(true);
      expect(result.pagination.totalPages).toBe(5);
    });

    it('should handle single page', () => {
      const data = [{ id: '1' }];
      const result = createPaginatedResponse(data, 1, { page: 1, limit: 10 });

      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(false);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should handle empty data', () => {
      const result = createPaginatedResponse([], 0, { page: 1, limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should handle middle page', () => {
      const data = [{ id: '5' }, { id: '6' }];
      const result = createPaginatedResponse(data, 20, { page: 3, limit: 2 });

      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
      expect(result.pagination.totalPages).toBe(10);
    });
  });
});
