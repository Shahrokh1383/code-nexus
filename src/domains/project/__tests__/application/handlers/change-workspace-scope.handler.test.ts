jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    rename: jest.fn(),
    mkdir: jest.fn(),
  },
}));

import { promises as fs } from 'fs';
import { ChangeWorkspaceScopeHandler } from '../../../application/handlers/change-workspace-scope.handler';
import { ChangeWorkspaceScopeCommand } from '../../../application/commands/change-workspace-scope.command';
import { WorkspaceJsonRepository } from '../../../infrastructure/repository/workspace-json.repository';
import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { Workspace } from '../../../domain/entities/workspace';
import { WorkspaceId } from '../../../domain/value-objects/workspace-id';
import { WorkspacePath } from '../../../domain/value-objects/workspace-path';
import { MetadataFolderName } from '../../../domain/value-objects/metadata-folder-name';
import { DateTime } from '../../../../shared-kernel/types/date-time';
import { Maybe } from '../../../../shared-kernel/types/maybe';

describe('ChangeWorkspaceScopeHandler', () => {
  let handler: ChangeWorkspaceScopeHandler;
  let workspaceRepo: WorkspaceJsonRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    EventBus.getInstance().clear();

    const db = new JsonDatabase('/test/project');
    workspaceRepo = new WorkspaceJsonRepository(db);
    handler = new ChangeWorkspaceScopeHandler(workspaceRepo);
  });

  it('should fail when new path does not exist', async () => {
    (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

    const result = await handler.execute(
      new ChangeWorkspaceScopeCommand('ws-1', '/nonexistent')
    );

    expect(result.isFailure).toBe(true);
  });

  it('should emit WorkspaceScopeChangedEvent when workspace exists', async () => {
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({
        id: 'ws-1',
        rootPath: '/test/project',
        metadataFolderPath: '.doclink',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastScanAt: null,
      })
    );

    const eventSpy = jest.fn();
    EventBus.getInstance().register('WorkspaceScopeChanged', {
      handle: eventSpy,
    });

    const result = await handler.execute(
      new ChangeWorkspaceScopeCommand('ws-1', '/new/path')
    );

    expect(result.isSuccess).toBe(true);
    expect(eventSpy).toHaveBeenCalledTimes(1);
  });
});