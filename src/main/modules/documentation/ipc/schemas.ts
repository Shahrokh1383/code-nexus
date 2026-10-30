import { z } from 'zod';
import type {
  RegisterDocsFolderInput,
  DetectRelocationInput,
  GetAllDocumentsInput,
  GetDeletedDocumentsInput,
  GetOrphanedDocumentsInput,
  SyncFilesInput,
  SoftDeleteDocumentInput,
  PermanentDeleteDocumentInput,
  RestoreDocumentInput,
} from '@shared/ipc/documentation';

/**
 * Zod schemas typed against the shared IPC contract types so the schema and
 * the contract cannot drift (Constitution §10). Validation messages preserve
 * the legacy user-facing strings.
 */
const workspaceId = z.string().min(1, 'Invalid workspace ID');

export const registerDocsFolderSchema: z.ZodType<RegisterDocsFolderInput> = z.object({
  workspaceId,
  suggestedPath: z.string().optional(),
});

export const detectRelocationSchema: z.ZodType<DetectRelocationInput> = z.object({ workspaceId });

export const getAllDocumentsSchema: z.ZodType<GetAllDocumentsInput> = z.object({ workspaceId });

export const getDeletedDocumentsSchema: z.ZodType<GetDeletedDocumentsInput> = z.object({ workspaceId });

export const getOrphanedDocumentsSchema: z.ZodType<GetOrphanedDocumentsInput> = z.object({ workspaceId });

export const syncFilesSchema: z.ZodType<SyncFilesInput> = z.object({ workspaceId });

export const softDeleteDocumentSchema: z.ZodType<SoftDeleteDocumentInput> = z.object({
  workspaceId,
  documentId: z.string().min(1, 'Invalid document ID'),
});

export const permanentDeleteDocumentSchema: z.ZodType<PermanentDeleteDocumentInput> = z.object({
  workspaceId,
  documentId: z.string().min(1, 'Invalid document ID'),
});

export const restoreDocumentSchema: z.ZodType<RestoreDocumentInput> = z.object({
  workspaceId,
  documentId: z.string().min(1, 'Invalid document ID'),
});