import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { app } from 'electron';
import { createServiceToken, type ServiceToken } from '../../kernel/service-container';

/** Container token for the root logger. */
export const LoggerToken: ServiceToken<Logger> = createServiceToken<Logger>('Logger');

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY_PATTERN = /password|token|secret|api[-_]?key/i;
const LOG_FILE_NAME = 'codenexus.log';

interface LogEntry {
  ts: string;
  level: LogLevel;
  context: string;
  message: string;
  [key: string]: unknown;
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : redact(item);
    }
    return result;
  }
  return value;
}

/**
 * Structured JSON logger (Constitution §15). One line per entry, written to the
 * OS-specific app logs directory. `console.log` is forbidden everywhere else.
 */
export class Logger {
  private constructor(
    private readonly context: string,
    private readonly minLevel: LogLevel,
    private readonly filePath: string
  ) {}

  static create(context: string): Logger {
    const envLevel = process.env.CODEXUS_LOG_LEVEL;
    const minLevel: LogLevel =
      envLevel === 'debug' || envLevel === 'info' || envLevel === 'warn' || envLevel === 'error'
        ? envLevel
        : 'info';
    let filePath = join(app.getPath('logs'), LOG_FILE_NAME);
    try {
      void mkdir(app.getPath('logs'), { recursive: true });
    } catch {
      filePath = join(app.getPath('userData'), LOG_FILE_NAME);
    }
    return new Logger(context, minLevel, filePath);
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`, this.minLevel, this.filePath);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.write('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.write('error', message, meta);
  }

  fatal(message: string, meta?: Record<string, unknown>): void {
    this.write('error', `FATAL: ${message}`, meta);
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return;
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...(meta ? (redact(meta) as Record<string, unknown>) : {}),
    };
    // Best-effort: a failing log sink must never take the app down.
    appendFile(this.filePath, `${JSON.stringify(entry)}\n`, 'utf-8').catch(() => undefined);
  }
}