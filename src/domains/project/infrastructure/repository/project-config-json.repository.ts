import { WorkspaceId } from '../../domain/value-objects/workspace-id';
import { Maybe } from '../../../shared-kernel/types/maybe';
import { ProjectConfig } from '../../domain/entities/project-config';
import { IProjectConfigRepository } from '../../domain/repository/project-config-repository.interface';
import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../infrastructure/persistence/migration/schema-migrator';
import { ProjectConfigSchema, DocFolderSchema } from '../../../../infrastructure/persistence/database-schema';

export class ProjectConfigJsonRepository implements IProjectConfigRepository {
  private readonly filename = 'config.json';

  constructor(
    private readonly db: JsonDatabase,
    private readonly migrator: SchemaMigrator
  ) {}

  async findByWorkspaceId(workspaceId: WorkspaceId): Promise<ProjectConfig | null> {
    try {
      const raw = await this.db.read<Record<string, unknown>>(this.filename);
      const migrated = this.migrator.migrate(raw) as unknown as ProjectConfigSchema;

      if (migrated.workspaceId !== workspaceId.value) {
        return null;
      }

      return this.mapToEntity(migrated);
    } catch {
      return null;
    }
  }

  async save(config: ProjectConfig): Promise<void> {
    let existingDocFolder: DocFolderSchema | null | undefined = undefined;
    try {
      const raw = await this.db.read<Record<string, unknown>>(this.filename);
      const migrated = this.migrator.migrate(raw) as unknown as ProjectConfigSchema;
      existingDocFolder = migrated.docFolder;
    } catch {
      // config.json does not exist yet — first-time initialization
    }

    const schema: ProjectConfigSchema = {
      workspaceId: config.workspaceId.value,
      docsFolderPath: config.docsFolderPath.getOrNull(),
      ignorePatterns: config.ignorePatterns,
      schemaVersion: config.schemaVersion,
      docFolder: existingDocFolder ?? null,
    };

    await this.db.write(this.filename, schema);
  }

  private mapToEntity(raw: ProjectConfigSchema): ProjectConfig {
    return new ProjectConfig(
      new WorkspaceId(raw.workspaceId),
      raw.docsFolderPath ? Maybe.some(raw.docsFolderPath) : Maybe.none<string>(),
      [...raw.ignorePatterns],
      raw.schemaVersion
    );
  }
}