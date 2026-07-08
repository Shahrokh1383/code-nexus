jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    rename: jest.fn(),
    mkdir: jest.fn(),
  },
}));

import { promises as fs } from 'fs';
import { ProjectConfigJsonRepository } from '../../../infrastructure/repository/project-config-json.repository';
import { JsonDatabase } from '../../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../../infrastructure/persistence/migration/schema-migrator';
import { DATABASE_SCHEMA_VERSION } from '../../../../../infrastructure/persistence/database-schema';
import { ProjectConfig } from '../../../domain/entities/project-config';
import { WorkspaceId } from '../../../domain/value-objects/workspace-id';
import { Maybe } from '../../../../shared-kernel/types/maybe';

describe('ProjectConfigJsonRepository', () => {
  let repo: ProjectConfigJsonRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    const db = new JsonDatabase('/test/project');
    const migrator = new SchemaMigrator(DATABASE_SCHEMA_VERSION);
    repo = new ProjectConfigJsonRepository(db, migrator);
  });

  it('should save and retrieve config', async () => {
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.rename as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({
        workspaceId: 'ws-1',
        docsFolderPath: 'docs',
        ignorePatterns: ['node_modules/'],
        schemaVersion: DATABASE_SCHEMA_VERSION,
      })
    );

    const config = new ProjectConfig(
      new WorkspaceId('ws-1'),
      Maybe.some('docs'),
      ['node_modules/'],
      DATABASE_SCHEMA_VERSION
    );

    await repo.save(config);

    const found = await repo.findByWorkspaceId(new WorkspaceId('ws-1'));
    expect(found).not.toBeNull();
    expect(found?.workspaceId.value).toBe('ws-1');
    expect(found?.docsFolderPath.getOrNull()).toBe('docs');
  });

  it('should return null when config not found', async () => {
    (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));

    const found = await repo.findByWorkspaceId(new WorkspaceId('missing'));
    expect(found).toBeNull();
  });

  it('should migrate outdated schema', async () => {
    const migrator = new SchemaMigrator(DATABASE_SCHEMA_VERSION);
    migrator.register('0.9', (data) => ({
      ...data,
      docsFolderPath: data.docsPath || null,
    }));

    const db = new JsonDatabase('/test/project');
    repo = new ProjectConfigJsonRepository(db, migrator);

    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({
        workspaceId: 'ws-1',
        docsPath: 'docs',
        ignorePatterns: [],
        schemaVersion: '0.9',
      })
    );

    const found = await repo.findByWorkspaceId(new WorkspaceId('ws-1'));
    expect(found).not.toBeNull();
    expect(found?.docsFolderPath.getOrNull()).toBe('docs');
    expect(found?.schemaVersion).toBe(DATABASE_SCHEMA_VERSION);
  });
});