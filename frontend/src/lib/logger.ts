/**
 * Frontend structured logger. Phase 18.3.1.
 * In production: suppress log/warn, emit only error.
 * In development: all levels with structured output.
 */
export function log(event: string, meta?: object): void {
  if (import.meta.env.PROD) return;
  const entry = { event, ...(meta && { meta }), timestamp: new Date().toISOString() };
  console.log(`[log] ${entry.event}`, meta ?? '');
}

export function warn(event: string, meta?: object): void {
  if (import.meta.env.PROD) return;
  const entry = { event, ...(meta && { meta }), timestamp: new Date().toISOString() };
  console.warn(`[warn] ${entry.event}`, meta ?? '');
}

export function error(event: string, meta?: object): void {
  const entry = { event, ...(meta && { meta }), timestamp: new Date().toISOString() };
  console.error(`[error] ${entry.event}`, meta ?? '');
}
