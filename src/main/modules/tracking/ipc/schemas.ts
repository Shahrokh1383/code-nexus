import { z } from 'zod';
import type {
  RecordHashInput,
  DetectChangesInput,
  ApproveCommitInput,
  GetPendingChangesInput,
  GetCommitHistoryInput,
  GetFileDiffInput,
  GetAllPendingStatusInput,
} from '@shared/ipc/tracking';

const workspaceId = z
  .string({ required_error: 'Invalid workspace ID', invalid_type_error: 'Invalid workspace ID' })
  .min(1, 'Invalid workspace ID');
const id = z.string().min(1);

export const recordHashSchema: z.ZodType<RecordHashInput> = z.object({
  workspaceId, filePath: id, content: z.string(),
});

export const detectChangesSchema: z.ZodType<DetectChangesInput> = z.object({
  workspaceId, filePath: id,
});

export const approveCommitSchema: z.ZodType<ApproveCommitInput> = z.object({
  workspaceId, documentId: id,
});

export const getPendingChangesSchema: z.ZodType<GetPendingChangesInput> = z.object({
  workspaceId, documentId: id.optional(),
});

export const getCommitHistorySchema: z.ZodType<GetCommitHistoryInput> = z.object({
  workspaceId, documentId: id,
});

export const getFileDiffSchema: z.ZodType<GetFileDiffInput> = z.object({
  workspaceId, filePath: id,
});

export const getAllPendingStatusSchema: z.ZodType<GetAllPendingStatusInput> = z.object({
  workspaceId,
});