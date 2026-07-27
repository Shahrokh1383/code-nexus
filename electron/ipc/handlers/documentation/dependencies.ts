// electron/ipc/handlers/documentation/dependencies.ts
import { JsonDatabase } from '../../../../src/infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../src/infrastructure/persistence/migration/schema-migrator';
import { DATABASE_SCHEMA_VERSION } from '../../../../src/infrastructure/persistence/database-schema';
import { ProjectConfigJsonRepository } from '../../../../src/domains/project/infrastructure/repository/project-config-json.repository';
import { DocFolderJsonRepository } from '../../../../src/domains/documentation/infrastructure/repository/doc-folder-json.repository';
import { DocumentJsonRepository } from '../../../../src/domains/documentation/infrastructure/repository/document-json.repository';
import { NodeFsDocumentScannerAdapter } from '../../../../src/domains/documentation/infrastructure/adapters/node-fs-document-scanner.adapter';
import { NodeFsDeletionAdapter } from '../../../../src/domains/documentation/infrastructure/adapters/node-fs-deletion.adapter';

export interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function validateWorkspaceId(workspaceId: unknown): string | null {
  if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) return null;
  return workspaceId.trim();
}

export async function handleIpcCall<T>(
  workspaceId: unknown,
  handler: (rootPath: string) => Promise<IpcResponse<T>>
): Promise<IpcResponse<T>> {
  const rootPath = validateWorkspaceId(workspaceId);
  if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
  try {
    return await handler(rootPath);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function createDocumentationDependencies(rootPath: string) {
  const db = new JsonDatabase(rootPath);
  const schemaMigrator = new SchemaMigrator(DATABASE_SCHEMA_VERSION);
  const configRepo = new ProjectConfigJsonRepository(db, schemaMigrator);
  const docFolderRepo = new DocFolderJsonRepository(db);
  const documentRepo = new DocumentJsonRepository(db, rootPath);
  const scanner = new NodeFsDocumentScannerAdapter(rootPath);
  const deletionAdapter = new NodeFsDeletionAdapter(rootPath);
  return { configRepo, docFolderRepo, documentRepo, scanner, deletionAdapter };
}