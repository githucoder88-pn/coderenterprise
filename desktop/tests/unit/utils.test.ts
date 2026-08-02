/**
 * Desktop Utility Tests
 */

import { describe, it, expect } from 'vitest';
import { cn, formatNumber, formatCurrency, truncate } from '../../renderer/lib/utils.js';

describe('cn', () => {
  it('should merge tailwind classes', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    expect(cn('text-red-500', false && 'text-blue-500')).toBe('text-red-500');
  });
});

describe('formatNumber', () => {
  it('should format large numbers', () => {
    expect(formatNumber(1_500_000)).toBe('1.5M');
    expect(formatNumber(5_400)).toBe('5.4K');
    expect(formatNumber(42)).toBe('42');
  });
});

describe('formatCurrency', () => {
  it('should format USD', () => {
    expect(formatCurrency(99.99)).toContain('99.99');
    expect(formatCurrency(0)).toContain('0');
  });
});

describe('truncate', () => {
  it('should truncate', () => {
    expect(truncate('hello world', 5)).toBe('hello…');
    expect(truncate('hi', 10)).toBe('hi');
  });
});
