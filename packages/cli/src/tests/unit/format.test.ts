/**
 * Format Utility Tests
 */

import { describe, it, expect } from 'vitest';
import { formatNumber, formatCurrency, formatDuration, truncate } from '../../ui/format.js';

describe('formatNumber', () => {
  it('should format billions', () => { expect(formatNumber(1_500_000_000)).toBe('1.5B'); });
  it('should format millions', () => { expect(formatNumber(2_500_000)).toBe('2.5M'); });
  it('should format thousands', () => { expect(formatNumber(5_400)).toBe('5.4K'); });
  it('should return raw small numbers', () => { expect(formatNumber(42)).toBe('42'); });
  it('should handle zero', () => { expect(formatNumber(0)).toBe('0'); });
});

describe('formatCurrency', () => {
  it('should format USD', () => { expect(formatCurrency(99.99)).toContain('99.99'); });
  it('should handle zero', () => { expect(formatCurrency(0)).toContain('0.00'); });
  it('should handle large amounts', () => { expect(formatCurrency(1234.56)).toContain('1,234.56'); });
});

describe('formatDuration', () => {
  it('should format milliseconds', () => { expect(formatDuration(450)).toBe('450ms'); });
  it('should format seconds', () => { expect(formatDuration(2500)).toBe('2.5s'); });
  it('should format minutes', () => { expect(formatDuration(125000)).toBe('2m 5s'); });
});

describe('truncate', () => {
  it('should truncate long strings', () => { expect(truncate('hello world', 5)).toBe('hello…'); });
  it('should not truncate short strings', () => { expect(truncate('hi', 10)).toBe('hi'); });
});
