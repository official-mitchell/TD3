/**
 * Structured error response helper. Phase 2.3: consistent error bodies per Implementation Plan 2.3.2.
 */
import { Response } from 'express';

export interface ErrorResponseBody {
  message: string;
  error?: string;
}

export function sendError(
  res: Response,
  status: number,
  message: string,
  error?: unknown
): Response {
  const body: ErrorResponseBody = { message };
  if (error !== undefined) {
    body.error = error instanceof Error ? error.message : String(error);
  }
  return res.status(status).json(body);
}
