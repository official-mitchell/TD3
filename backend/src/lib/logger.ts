/**
 * Structured logger for application events. Phase 18.1.2.
 * JSON in production, human-readable in development.
 */
type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  meta?: Record<string, unknown>;
}

function formatEntry(level: LogLevel, event: string, meta?: Record<string, unknown>): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
  };
}

function output(level: LogLevel, event: string, meta?: Record<string, unknown>): void {
  const entry = formatEntry(level, event, meta);
  const isProd = process.env.NODE_ENV === 'production';
  const out = isProd ? JSON.stringify(entry) : `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.event}${meta ? ' ' + JSON.stringify(meta) : ''}`;
  if (level === 'error') {
    console.error(out);
  } else if (level === 'warn') {
    console.warn(out);
  } else {
    console.log(out);
  }
}

export const logger = {
  info: (event: string, meta?: Record<string, unknown>) => output('info', event, meta),
  warn: (event: string, meta?: Record<string, unknown>) => output('warn', event, meta),
  error: (event: string, meta?: Record<string, unknown>) => output('error', event, meta),
};
