jest.mock('fs', () => ({
  promises: {
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
import { JsonDatabase } from '../../../../../infrastructure/persistence/json-database';
import { EventBus } from '../../../../shared-kernel/events/event-bus';

describe('ChangeWorkspaceScopeHandler', () => {
  let handler: ChangeWorkspaceScopeHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    EventBus.getInstance().clear();

    const db = new JsonDatabase('/test/project');
    const workspaceRepo = new WorkspaceJsonRepository(db);
    handler = new ChangeWorkspaceScopeHandler(workspaceRepo);
  });

  it('should fail when workspace is not found (read error treated as not found)', async () => {
    // Simulate any repository error (e.g., disk full) — findById returns null
    (fs.readFile as jest.Mock).mockRejectedValue(new Error('Disk full'));

    const result = await handler.execute(
      new ChangeWorkspaceScopeCommand('ws-1', '/new/path')
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBe('Workspace not found');
  });

  it('should fail when workspace ID does not match stored data', async () => {
    // File exists but contains a different workspace
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({
        id: 'ws-other',
        rootPath: '/test/project',
        metadataFolderPath: '.doclink',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastScanAt: null,
      })
    );

    const result = await handler.execute(
      new ChangeWorkspaceScopeCommand('ws-1', '/new/path')
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBe('Workspace not found');
  });

  it('should emit WorkspaceScopeChangedEvent when workspace exists', async () => {
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