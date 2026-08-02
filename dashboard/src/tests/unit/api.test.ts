import { describe, it, expect } from 'vitest';
import { ApiError } from '@/lib/api';

describe('ApiError', () => {
  it('should create an API error', () => {
    const error = new ApiError(404, 'NOT_FOUND', 'Resource not found');
    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Resource not found');
    expect(error.name).toBe('ApiError');
  });

  it('should include details', () => {
    const error = new ApiError(400, 'VALIDATION', 'Invalid input', { field: 'email' });
    expect(error.details).toEqual({ field: 'email' });
  });
});
