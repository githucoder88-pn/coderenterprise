import { describe, it, expect } from 'vitest';
import { cn, formatNumber, formatCurrency, formatDate, truncate, getInitials, slugify } from '@/lib/utils';

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-500', false && 'text-blue-500')).toBe('text-red-500');
    expect(cn('base', undefined, 'extra')).toBe('base extra');
  });
});

describe('formatNumber', () => {
  it('should format millions', () => { expect(formatNumber(1500000)).toBe('1.5M'); });
  it('should format thousands', () => { expect(formatNumber(5400)).toBe('5.4K'); });
  it('should return raw for small numbers', () => { expect(formatNumber(42)).toBe('42'); });
});

describe('formatCurrency', () => {
  it('should format USD', () => { expect(formatCurrency(99.99)).toContain('99.99'); });
  it('should format zero', () => { expect(formatCurrency(0)).toContain('0.00'); });
});

describe('truncate', () => {
  it('should truncate long strings', () => { expect(truncate('hello world', 5)).toBe('hello…'); });
  it('should not truncate short strings', () => { expect(truncate('hi', 5)).toBe('hi'); });
});

describe('getInitials', () => {
  it('should get initials', () => { expect(getInitials('John Doe')).toBe('JD'); });
  it('should handle single name', () => { expect(getInitials('Alice')).toBe('A'); });
});

describe('slugify', () => {
  it('should slugify strings', () => { expect(slugify('Hello World!')).toBe('hello-world'); });
  it('should handle special chars', () => { expect(slugify('My @Project #1')).toBe('my-project-1'); });
});
