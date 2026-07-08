import { Identifier } from '../../../shared-kernel/types/identifier';
import { WorkspaceId } from '../../domain/value-objects/workspace-id';
import { WorkspacePath } from '../../domain/value-objects/workspace-path';
import { MetadataFolderName } from '../../domain/value-objects/metadata-folder-name';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { Maybe } from '../../../shared-kernel/types/maybe';
import { Workspace } from '../../domain/entities/workspace';
import { IWorkspaceRepository } from '../../domain/repository/workspace-repository.interface';
import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { WorkspaceSchema } from '../../../../infrastructure/persistence/database-schema';

export class WorkspaceJsonRepository implements IWorkspaceRepository {
  private readonly filename = 'workspace.json';

  constructor(private readonly db: JsonDatabase) {}

  async findById(id: Identifier): Promise<Workspace | null> {
    try {
      const raw = await this.db.read<WorkspaceSchema>(this.filename);
      if (raw.id !== id.value) {
        return null;
      }
      return this.mapToEntity(raw);
    } catch {
      return null;
    }
  }

  async findByPath(path: WorkspacePath): Promise<Workspace | null> {
    try {
      const raw = await this.db.read<WorkspaceSchema>(this.filename);
      if (raw.rootPath !== path.value) {
        return null;
      }
      return this.mapToEntity(raw);
    } catch {
      return null;
    }
  }

  async save(entity: Workspace): Promise<void> {
    const schema: WorkspaceSchema = {
      id: entity.id.value,
      rootPath: entity.rootPath.value,
      metadataFolderPath: entity.metadataFolderPath.value,
      createdAt: entity.createdAt.toISO(),
      lastScanAt: entity.lastScanAt.getOrNull()?.toISO() ?? null,
    };

    await this.db.write(this.filename, schema);
  }

  async delete(id: Identifier): Promise<void> {
    void id;
    throw new Error('Workspace deletion not implemented');
  }

  async exists(id: Identifier): Promise<boolean> {
    const found = await this.findById(id);
    return found !== null;
  }

  private mapToEntity(raw: WorkspaceSchema): Workspace {
    return new Workspace(
      new WorkspaceId(raw.id),
      new WorkspacePath(raw.rootPath),
      new MetadataFolderName(),
      DateTime.fromISO(raw.createdAt),
      raw.lastScanAt ? Maybe.some(DateTime.fromISO(raw.lastScanAt)) : Maybe.none<DateTime>()
    );
  }
}