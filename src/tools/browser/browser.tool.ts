/**
 * Browser Tools (headless)
 */

import type { Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { BrowserOpenSchema, BrowserScrapeSchema, BrowserScreenshotSchema } from '../types.js';

function makeResult(ctx: ToolExecutionContext, success: boolean, output: unknown, error: string | null = null): ToolExecutionResult {
  return { executionId: ctx.executionId, toolId: 'browser', success, output, error, durationMs: 0, tokensUsed: 0, metadata: {}, artifacts: [] };
}

export class BrowserOpenTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'browser.open', name: 'Open URL', category: 'browser',
    description: 'Fetch and return page content',
    inputSchema: {}, outputSchema: {}, permissions: ['browser:read'],
    timeout: 30_000, requiresConfirmation: false, dangerous: false, metadata: {},
  };
  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = BrowserOpenSchema.parse(input);
    const res = await fetch(parsed.url, { signal: AbortSignal.timeout(parsed.timeout) });
    const contentType = res.headers.get('content-type') ?? '';
    const body = contentType.includes('html') || contentType.includes('text') ? await res.text() : `[Binary: ${contentType}]`;
    return makeResult(ctx, true, { url: parsed.url, status: res.status, contentType, body: body.slice(0, 100_000) });
  }
}

export class BrowserScrapeTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'browser.scrape', name: 'Scrape Page', category: 'browser',
    description: 'Extract content from a web page',
    inputSchema: {}, outputSchema: {}, permissions: ['browser:read'],
    timeout: 30_000, requiresConfirmation: false, dangerous: false, metadata: {},
  };
  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = BrowserScrapeSchema.parse(input);
    const res = await fetch(parsed.url, { signal: AbortSignal.timeout(15_000) });
    const html = await res.text();

    if (parsed.extract === 'text') {
      const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50_000);
      return makeResult(ctx, true, { url: parsed.url, text });
    }
    if (parsed.extract === 'links') {
      const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter(Boolean);
      return makeResult(ctx, true, { url: parsed.url, links });
    }
    if (parsed.extract === 'html') {
      return makeResult(ctx, true, { url: parsed.url, html: html.slice(0, 100_000) });
    }
    return makeResult(ctx, true, { url: parsed.url, content: html.slice(0, 50_000) });
  }
}

export class BrowserScreenshotTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'browser.screenshot', name: 'Take Screenshot', category: 'browser',
    description: 'Capture a screenshot of a web page',
    inputSchema: {}, outputSchema: {}, permissions: ['browser:read'],
    timeout: 30_000, requiresConfirmation: false, dangerous: false, metadata: {},
  };
  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    // In production, use Playwright/Puppeteer
    const parsed = BrowserScreenshotSchema.parse(input);
    return makeResult(ctx, true, { url: parsed.url, width: parsed.width, height: parsed.height, format: parsed.format, note: 'Screenshot requires Playwright in production' });
  }
}

export const BROWSER_TOOLS = [new BrowserOpenTool(), new BrowserScrapeTool(), new BrowserScreenshotTool()];
