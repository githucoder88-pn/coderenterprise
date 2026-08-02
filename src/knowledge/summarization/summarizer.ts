/**
 * Summarizer
 *
 * Extractive summarization for context compression.
 */

import type { SummaryRequest, SummaryResult } from '../types.js';

export interface ISummarizer {
  summarize(request: SummaryRequest): SummaryResult;
  extractKeyPoints(content: string, maxPoints?: number): readonly string[];
  compressContext(content: string, maxTokens: number): string;
}

export class Summarizer implements ISummarizer {
  summarize(request: SummaryRequest): SummaryResult {
    const maxLength = request.maxLength ?? 200;
    const sentences = this.extractSentences(request.content);

    let summary: string;
    let keyPoints: readonly string[];

    switch (request.style) {
      case 'bullet_points':
        keyPoints = this.extractKeyPoints(request.content);
        summary = keyPoints.map((p) => `• ${p}`).join('\n');
        break;
      case 'detailed':
        keyPoints = this.extractKeyPoints(request.content, 10);
        summary = sentences.slice(0, Math.ceil(sentences.length * 0.4)).join(' ');
        break;
      case 'brief':
      default:
        keyPoints = this.extractKeyPoints(request.content, 3);
        summary = sentences.slice(0, Math.ceil(sentences.length * 0.2)).join(' ');
        break;
    }

    if (summary.length > maxLength) {
      summary = summary.slice(0, maxLength - 3) + '…';
    }

    return { summary, keyPoints, tokenCount: Math.ceil(summary.length / 4) };
  }

  extractKeyPoints(content: string, maxPoints = 5): readonly string[] {
    const sentences = this.extractSentences(content);
    // Score sentences by position and keyword density
    const scored = sentences.map((s, i) => ({
      sentence: s,
      score: this.scoreSentence(s, i, sentences.length),
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPoints)
      .map((s) => s.sentence.trim())
      .filter((s) => s.length > 10);
  }

  compressContext(content: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (content.length <= maxChars) return content;

    const keyPoints = this.extractKeyPoints(content, 20);
    let compressed = '';
    for (const point of keyPoints) {
      if (compressed.length + point.length > maxChars) break;
      compressed += point + '\n';
    }

    return compressed;
  }

  private extractSentences(content: string): string[] {
    return content
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
  }

  private scoreSentence(sentence: string, index: number, total: number): number {
    let score = 0;
    // Position bonus (first and last sentences score higher)
    if (index < total * 0.2) score += 3;
    if (index > total * 0.8) score += 1;
    // Length bonus (prefer medium-length sentences)
    const words = sentence.split(/\s+/).length;
    if (words >= 5 && words <= 30) score += 2;
    // Keyword bonus
    const keywords = ['important', 'key', 'summary', 'conclusion', 'result', 'defined', 'implements', 'export'];
    for (const kw of keywords) {
      if (sentence.toLowerCase().includes(kw)) score += 1;
    }
    return score;
  }
}
