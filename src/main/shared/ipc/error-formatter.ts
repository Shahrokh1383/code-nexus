import { ZodError } from 'zod';
import type { IpcResponse } from '@shared/ipc/envelope';
import { DomainException } from '../errors/domain-exception';

/**
 * Single error → envelope mapper (Constitution §12/§20).
 * Domain errors keep their code and message; validation errors surface the
 * first Zod issue message; everything else is an unknown error.
 */
export function formatIpcError(error: unknown): IpcResponse<never> {
  if (error instanceof DomainException) {
    return {
      ok: false,
      error: { code: error.code, message: error.message, details: error.details },
    };
  }

  if (error instanceof ZodError) {
    const first = error.issues[0];
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: first ? first.message : 'Invalid request payload',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    };
  }

  return {
    ok: false,
    error: {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Unknown error',
    },
  };
}