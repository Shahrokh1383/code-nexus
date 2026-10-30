import { z } from 'zod';
import type {
  GetFileTreeInput,
  AddIgnorePatternInput,
  RemoveIgnorePatternInput,
  GetIgnoredFilesInput,
} from '@shared/ipc/filesystem';

/**
 * Zod schemas typed against the shared IPC contract types.
 * Validation messages preserve the legacy user-facing strings.
 */
export const getFileTreeSchema: z.ZodType<GetFileTreeInput> = z.object({
  workspaceId: z.string().min(1, 'Invalid workspace ID'),
  parentPath: z.string().min(1).optional(),
});

export const addIgnorePatternSchema: z.ZodType<AddIgnorePatternInput> = z.object({
  workspaceId: z.string().min(1, 'Invalid workspace ID'),
  pattern: z.string().min(1, 'Ignore pattern cannot be empty'),
});

export const removeIgnorePatternSchema: z.ZodType<RemoveIgnorePatternInput> = z.object({
  workspaceId: z.string().min(1, 'Invalid workspace ID'),
  pattern: z.string().min(1, 'Ignore pattern cannot be empty'),
});

export const getIgnoredFilesSchema: z.ZodType<GetIgnoredFilesInput> = z.object({
  workspaceId: z.string().min(1, 'Invalid workspace ID'),
});