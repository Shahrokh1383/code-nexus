import { JsonDatabase } from '../../../../src/infrastructure/persistence/json-database';
import { LinkJsonRepository } from '../../../../src/domains/linking/infrastructure/repository/link-json.repository';
import { DocumentLinkJsonRepository } from '../../../../src/domains/linking/infrastructure/repository/document-link-json.repository';
import { DocumentJsonRepository } from '../../../../src/domains/documentation/infrastructure/repository/document-json.repository';
import { DocumentLinkValidatorService } from '../../../../src/domains/linking/domain/services/document-link-validator.service';
import { LinkMigrationService } from '../../../../src/domains/linking/domain/services/link-migration.service';
import { FilesystemCodeFileQueryAdapter } from './adapter';
import { setCurrentWorkspaceRoot } from './workspace-context';

export interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function validateWorkspaceId(workspaceId: unknown): string | null {
  if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) return null;
  return workspaceId.trim();
}

export function createLinkingDependencies(rootPath: string) {
  const db = new JsonDatabase(rootPath);
  const linkRepo = new LinkJsonRepository(rootPath);
  const docLinkRepo = new DocumentLinkJsonRepository(rootPath);
  const documentRepo = new DocumentJsonRepository(db, rootPath);

  const validator = new DocumentLinkValidatorService(docLinkRepo);
  const migrationService = new LinkMigrationService();
  const codeFilePort = new FilesystemCodeFileQueryAdapter(db);

  return { linkRepo, docLinkRepo, documentRepo, validator, migrationService, codeFilePort };
}

export async function handleIpcCall<T>(
  workspaceId: unknown,
  handler: (rootPath: string) => Promise<IpcResponse<T>>
): Promise<IpcResponse<T>> {
  const rootPath = validateWorkspaceId(workspaceId);
  if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
  setCurrentWorkspaceRoot(rootPath);
  try {
    return await handler(rootPath);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}