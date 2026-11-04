import { z } from 'zod';
import type {
  CreateLinkInput,
  RemoveLinkInput,
  CreateDocumentLinkInput,
  RemoveDocumentLinkInput,
  MigrateLinksInput,
  GetLinksForDocumentInput,
  GetLinksForCodeFileInput,
  GetUnlinkedCodeFilesInput,
  GetDocumentChildrenInput,
  GetDocumentParentsInput,
  CreateBulkCodeLinksInput,
} from '@shared/ipc/linking';

const workspaceId = z
  .string({
    required_error: 'Invalid workspace ID',
    invalid_type_error: 'Invalid workspace ID',
  })
  .min(1, 'Invalid workspace ID');

const id = z.string().min(1);

export const createLinkSchema: z.ZodType<CreateLinkInput> = z.object({
  workspaceId,
  codeFileId: id,
  documentId: id,
});

export const removeLinkSchema: z.ZodType<RemoveLinkInput> = z.object({
  workspaceId,
  linkId: id,
});

export const createDocumentLinkSchema: z.ZodType<CreateDocumentLinkInput> = z.object({
  workspaceId,
  parentDocumentId: id,
  childDocumentId: id,
});

export const removeDocumentLinkSchema: z.ZodType<RemoveDocumentLinkInput> = z.object({
  workspaceId,
  linkId: id,
});

export const migrateLinksSchema: z.ZodType<MigrateLinksInput> = z.object({
  workspaceId,
  oldDocumentId: id,
  newDocumentIds: z.array(id),
});

export const getLinksForDocumentSchema: z.ZodType<GetLinksForDocumentInput> = z.object({
  workspaceId,
  documentId: id,
});

export const getLinksForCodeFileSchema: z.ZodType<GetLinksForCodeFileInput> = z.object({
  workspaceId,
  codeFileId: id,
});

export const getUnlinkedCodeFilesSchema: z.ZodType<GetUnlinkedCodeFilesInput> = z.object({
  workspaceId,
});

export const getDocumentChildrenSchema: z.ZodType<GetDocumentChildrenInput> = z.object({
  workspaceId,
  parentDocumentId: id,
});

export const getDocumentParentsSchema: z.ZodType<GetDocumentParentsInput> = z.object({
  workspaceId,
  childDocumentId: id,
});

export const createBulkCodeLinksSchema: z.ZodType<CreateBulkCodeLinksInput> = z.object({
  workspaceId,
  codeFileIds: z.array(id).min(1),
  documentId: id,
});