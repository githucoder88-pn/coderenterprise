/**
 * Request Logger Middleware
 *
 * Logs every request/response with timing and correlation.
 */

import { createMiddleware } from 'hono/factory';
import type { ILogger } from '../telemetry/logger.js';
import type { IMetrics } from '../telemetry/metrics.js';

export function requestLoggerMiddleware(logger: ILogger, metrics: IMetrics) {
  return createMiddleware(async (c, next) => {
    const start = performance.now();
    const requestId = c.get('requestId') ?? 'unknown';

    const reqLogger = logger.child({
      requestId,
      method: c.req.method,
      path: c.req.path,
    });

    reqLogger.info('Request started');

    await next();

    const duration = performance.now() - start;
    const status = c.res.status;

    reqLogger.info(
      {
        status,
        duration: `${duration.toFixed(2)}ms`,
      },
      'Request completed',
    );

    metrics.histogram('http_request_duration_ms', duration, {
      method: c.req.method,
      path: c.req.routePath ?? c.req.path,
      status: String(status),
    });

    metrics.increment('http_requests_total', {
      method: c.req.method,
      status: String(status),
    });
  });
}
