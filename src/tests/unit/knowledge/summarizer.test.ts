/**
 * Summarizer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Summarizer } from '../../../knowledge/summarization/summarizer.js';

describe('Summarizer', () => {
  let summarizer: Summarizer;

  beforeEach(() => { summarizer = new Summarizer(); });

  const longText = 'This is the first sentence about the API. The API uses TypeScript and Node.js for the backend. ' +
    'It supports multiple providers including OpenAI and Anthropic. The system handles authentication via JWT tokens. ' +
    'Database operations use Firebase Firestore. Caching is done through Redis for performance. ' +
    'The workspace engine supports semantic search across code files. This is the final sentence.';

  describe('summarize', () => {
    it('should produce a brief summary', () => {
      const result = summarizer.summarize({ content: longText, style: 'brief' });
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.tokenCount).toBeGreaterThan(0);
    });

    it('should produce bullet points', () => {
      const result = summarizer.summarize({ content: longText, style: 'bullet_points' });
      expect(result.summary).toContain('•');
      expect(result.keyPoints.length).toBeGreaterThan(0);
    });

    it('should produce detailed summary', () => {
      const result = summarizer.summarize({ content: longText, style: 'detailed', maxLength: 500 });
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.keyPoints.length).toBeGreaterThanOrEqual(3);
    });

    it('should respect maxLength', () => {
      const result = summarizer.summarize({ content: longText, maxLength: 50 });
      expect(result.summary.length).toBeLessThanOrEqual(53); // 50 + '…'
    });
  });

  describe('extractKeyPoints', () => {
    it('should extract key points', () => {
      const points = summarizer.extractKeyPoints(longText, 5);
      expect(points.length).toBeGreaterThan(0);
      expect(points.length).toBeLessThanOrEqual(5);
    });

    it('should filter short sentences', () => {
      const points = summarizer.extractKeyPoints('Short. This is a longer sentence with more content.');
      expect(points.every((p) => p.length > 10)).toBe(true);
    });
  });

  describe('compressContext', () => {
    it('should compress within token budget', () => {
      const compressed = summarizer.compressContext(longText, 50);
      expect(Math.ceil(compressed.length / 4)).toBeLessThanOrEqual(60);
    });

    it('should return full content if under budget', () => {
      const text = 'Short text';
      expect(summarizer.compressContext(text, 1000)).toBe(text);
    });
  });
});
