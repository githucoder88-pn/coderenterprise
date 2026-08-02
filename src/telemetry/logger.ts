/**
 * Pino Logger
 *
 * Structured, high-performance logging with request correlation.
 */

import pino, { type Logger as PinoLogger, type LoggerOptions } from 'pino';

export interface ILogger {
  fatal(obj: Record<string, unknown> | string, msg?: string): void;
  error(obj: Record<string, unknown> | string, msg?: string): void;
  warn(obj: Record<string, unknown> | string, msg?: string): void;
  info(obj: Record<string, unknown> | string, msg?: string): void;
  debug(obj: Record<string, unknown> | string, msg?: string): void;
  trace(obj: Record<string, unknown> | string, msg?: string): void;
  child(bindings: Record<string, unknown>): ILogger;
}

class PinoLoggerAdapter implements ILogger {
  constructor(private readonly pino: PinoLogger) {}

  fatal(obj: Record<string, unknown> | string, msg?: string): void {
    if (typeof obj === 'string') {
      this.pino.fatal(obj);
    } else {
      this.pino.fatal(obj, msg);
    }
  }

  error(obj: Record<string, unknown> | string, msg?: string): void {
    if (typeof obj === 'string') {
      this.pino.error(obj);
    } else {
      this.pino.error(obj, msg);
    }
  }

  warn(obj: Record<string, unknown> | string, msg?: string): void {
    if (typeof obj === 'string') {
      this.pino.warn(obj);
    } else {
      this.pino.warn(obj, msg);
    }
  }

  info(obj: Record<string, unknown> | string, msg?: string): void {
    if (typeof obj === 'string') {
      this.pino.info(obj);
    } else {
      this.pino.info(obj, msg);
    }
  }

  debug(obj: Record<string, unknown> | string, msg?: string): void {
    if (typeof obj === 'string') {
      this.pino.debug(obj);
    } else {
      this.pino.debug(obj, msg);
    }
  }

  trace(obj: Record<string, unknown> | string, msg?: string): void {
    if (typeof obj === 'string') {
      this.pino.trace(obj);
    } else {
      this.pino.trace(obj, msg);
    }
  }

  child(bindings: Record<string, unknown>): ILogger {
    return new PinoLoggerAdapter(this.pino.child(bindings));
  }
}

export interface LoggerConfig {
  level?: string;
  pretty?: boolean;
  name?: string;
}

export function createLogger(config: LoggerConfig = {}): ILogger {
  const options: LoggerOptions = {
    level: config.level ?? 'info',
    name: config.name ?? 'coderenterprise',
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.body.password',
        'req.body.token',
        'password',
        'token',
        'secret',
        'apiKey',
        'privateKey',
      ],
      censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  let transport: pino.TransportSingleOptions | undefined;
  if (config.pretty) {
    transport = {
      target: 'pino-pretty',
      options: { colorize: true },
    };
  }

  const pinoLogger = pino(options, transport ? pino.transport(transport) : undefined);
  return new PinoLoggerAdapter(pinoLogger);
}
