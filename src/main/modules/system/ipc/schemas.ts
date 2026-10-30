import { z } from 'zod';
import type { ReportErrorInput } from '@shared/ipc/system';

/**
 * System Zod schemas typed against the shared contract .
 */
export const reportErrorSchema: z.ZodType<ReportErrorInput> = z.object({
  message: z.string().min(1, 'Error message cannot be empty'),
  stack: z.string().optional(),
});