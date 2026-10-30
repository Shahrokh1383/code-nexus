import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import type { WorkspaceDto } from '@shared/ipc/workspace';
import { METADATA_FOLDER_NAME, DoclinkFolder } from './doclink-folder';

interface WorkspaceSchema {
  id: string;
  rootPath: string;
  metadataFolderPath: string;
  createdAt: string;
  lastScanAt: string | null;
}

/**
 * `.doclink/workspace.json` store. Single-record file; read failures surface
 * as "not found" exactly like the legacy repository did.
 */
export class WorkspaceStore {
  private readonly filename = 'workspace.json';

  constructor(
    private readonly doclink: DoclinkFolder,
    private readonly file: AtomicJsonFile
  ) {}

  async find(rootPath: string): Promise<WorkspaceSchema | null> {
    try {
      const raw = await this.file.readJson<WorkspaceSchema>(
        this.doclink.doclinkFilePath(rootPath, this.filename)
      );
      if (raw.id !== rootPath) {
        return null;
      }
      return raw;
    } catch {
      return null;
    }
  }

  async save(workspace: WorkspaceDto): Promise<void> {
    const schema: WorkspaceSchema = {
      id: workspace.id,
      rootPath: workspace.rootPath,
      metadataFolderPath: workspace.metadataFolderPath,
      createdAt: workspace.createdAt,
      lastScanAt: workspace.lastScanAt,
    };
    await this.file.writeJson(this.doclink.doclinkFilePath(workspace.rootPath, this.filename), schema);
  }

  toDto(schema: WorkspaceSchema): WorkspaceDto {
    return {
      id: schema.id,
      rootPath: schema.rootPath,
      metadataFolderPath: schema.metadataFolderPath || METADATA_FOLDER_NAME,
      createdAt: schema.createdAt,
      lastScanAt: schema.lastScanAt,
    };
  }
}