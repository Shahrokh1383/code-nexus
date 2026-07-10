import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { ProjectConfigSchema } from '../../../../infrastructure/persistence/database-schema';
import { DocFolderId } from '../../domain/value-objects/doc-folder-id';
import { DocFolderSignature } from '../../domain/value-objects/doc-folder-signature';
import { DocFolder } from '../../domain/entities/doc-folder';
import { IDocFolderRepository } from '../../domain/repository/doc-folder-repository.interface';

export class DocFolderJsonRepository implements IDocFolderRepository {
  private readonly filename = 'config.json';

  constructor(private readonly db: JsonDatabase) {}

  async findByWorkspaceId(_workspaceId: string): Promise<DocFolder | null> {
    try {
      const raw = await this.db.read<unknown>(this.filename);
      const schema = raw as ProjectConfigSchema;

      if (!schema.docFolder) {
        return null;
      }

      return this.mapToEntity(schema.docFolder);
    } catch {
      return null;
    }
  }

  async save(docFolder: DocFolder): Promise<void> {
    let raw: unknown;
    try {
      raw = await this.db.read<unknown>(this.filename);
    } catch (error) {
      throw new Error('config.json does not exist');
    }
    const schema = raw as ProjectConfigSchema;

    schema.docFolder = {
      id: docFolder.id.value,
      path: docFolder.path,
      signature: {
        fileCount: docFolder.signature.fileCount,
        topLevelFileNames: docFolder.signature.topLevelFileNames,
        directoryDepth: docFolder.signature.directoryDepth,
      },
      documentCount: docFolder.documentCount,
    };

    await this.db.write(this.filename, schema);
  }

  async delete(_id: DocFolderId): Promise<void> {
    try {
      const raw = await this.db.read<unknown>(this.filename);
      const schema = raw as ProjectConfigSchema;
      schema.docFolder = null;
      await this.db.write(this.filename, schema);
    } catch {
      // config.json doesn't exist — nothing to delete, no error to surface
    }
  }

  private mapToEntity(
    raw: NonNullable<ProjectConfigSchema['docFolder']>
  ): DocFolder {
    return new DocFolder(
      new DocFolderId(raw.id),
      raw.path,
      new DocFolderSignature(
        raw.signature.fileCount,
        raw.signature.topLevelFileNames,
        raw.signature.directoryDepth
      ),
      raw.documentCount
    );
  }
}