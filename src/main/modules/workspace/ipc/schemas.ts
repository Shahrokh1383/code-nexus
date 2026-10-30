import { z } from 'zod';
import type {
  InitializeWorkspaceInput,
  GetWorkspaceInput,
  ChangeWorkspaceScopeInput,
  CloseWorkspaceInput,
  RemoveRecentWorkspaceInput,
} from '@shared/ipc/workspace';

/**
 * Zod schemas typed against the shared IPC contract types so the schema and
 * the contract cannot drift (Constitution §10). Validation messages preserve
 * the legacy user-facing strings.
 */
export const initializeWorkspaceSchema: z.ZodType<InitializeWorkspaceInput> = z.object({
  rootPath: z.string().min(1, 'Root path cannot be empty'),
});

export const getWorkspaceSchema: z.ZodType<GetWorkspaceInput> = z.object({
  workspaceId: z.string().min(1, 'Invalid workspace ID'),
});

export const changeWorkspaceScopeSchema: z.ZodType<ChangeWorkspaceScopeInput> = z.object({
  workspaceId: z.string().min(1, 'Invalid workspace ID'),
  newRootPath: z.string().min(1, 'Root path cannot be empty'),
});

export const closeWorkspaceSchema: z.ZodType<CloseWorkspaceInput> = z.object({
  workspaceId: z.string().min(1, 'Invalid workspace ID'),
});

export const removeRecentWorkspaceSchema: z.ZodType<RemoveRecentWorkspaceInput> = z.object({
  workspaceId: z.string().min(1, 'Invalid workspace ID'),
});