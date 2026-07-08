jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    rename: jest.fn(),
    mkdir: jest.fn(),
  },
}));

import { promises as fs } from 'fs';
import { WorkspaceJsonRepository } from '../../../infrastructure/repository/workspace-json.repository';
import { JsonDatabase } from '../../../../../infrastructure/persistence/json-database';
import { Workspace } from '../../../domain/entities/workspace';
import { WorkspaceId } from '../../../domain/value-objects/workspace-id';
import { WorkspacePath } from '../../../domain/value-objects/workspace-path';
import { MetadataFolderName } from '../../../domain/value-objects/metadata-folder-name';
import { DateTime } from '../../../../shared-kernel/types/date-time';
import { Maybe } from '../../../../shared-kernel/types/maybe';

describe('WorkspaceJsonRepository', () => {
  let repo: WorkspaceJsonRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    const db = new JsonDatabase('/test/project');
    repo = new WorkspaceJsonRepository(db);
  });

  it('should save and retrieve workspace', async () => {
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.rename as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({
        id: 'ws-1',
        rootPath: '/test/project',
        metadataFolderPath: '.doclink',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastScanAt: null,
      })
    );

    const workspace = new Workspace(
      new WorkspaceId('ws-1'),
      new WorkspacePath('/test/project'),
      new MetadataFolderName(),
      DateTime.fromISO('2026-01-01T00:00:00.000Z'),
      Maybe.none<DateTime>()
    );

    await repo.save(workspace);

    const found = await repo.findById(new WorkspaceId('ws-1'));
    expect(found).not.toBeNull();
    expect(found?.id.value).toBe('ws-1');
  });

  it('should return null when workspace not found', async () => {
    (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));

    const found = await repo.findById(new WorkspaceId('missing'));
    expect(found).toBeNull();
  });

  it('should return null when id does not match', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({
        id: 'ws-2',
        rootPath: '/test/project',
        metadataFolderPath: '.doclink',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastScanAt: null,
      })
    );

    const found = await repo.findById(new WorkspaceId('ws-1'));
    expect(found).toBeNull();
  });
});