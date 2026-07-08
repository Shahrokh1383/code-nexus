jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    rename: jest.fn(),
    readFile: jest.fn(),
  },
}));

import { promises as fs } from 'fs';
import { InitializeWorkspaceHandler } from '../../../application/handlers/initialize-workspace.handler';
import { InitializeWorkspaceCommand } from '../../../application/commands/initialize-workspace.command';
import { WorkspaceJsonRepository } from '../../../infrastructure/repository/workspace-json.repository';
import { ProjectConfigJsonRepository } from '../../../infrastructure/repository/project-config-json.repository';
import { JsonDatabase } from '../../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../../infrastructure/persistence/migration/schema-migrator';
import { DATABASE_SCHEMA_VERSION } from '../../../../../infrastructure/persistence/database-schema';
import { EventBus } from '../../../../shared-kernel/events/event-bus';

describe('InitializeWorkspaceHandler', () => {
  let handler: InitializeWorkspaceHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    EventBus.getInstance().clear();

    const db = new JsonDatabase('/test/project');
    const workspaceRepo = new WorkspaceJsonRepository(db);
    const configRepo = new ProjectConfigJsonRepository(
      db,
      new SchemaMigrator(DATABASE_SCHEMA_VERSION)
    );
    handler = new InitializeWorkspaceHandler(workspaceRepo, configRepo);
  });

  it('should succeed and emit WorkspaceInitializedEvent', async () => {
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.rename as jest.Mock).mockResolvedValue(undefined);

    const eventSpy = jest.fn();
    EventBus.getInstance().register('WorkspaceInitialized', {
      handle: eventSpy,
    });

    const result = await handler.execute(
      new InitializeWorkspaceCommand('/test/project')
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBeDefined();
    expect(result.getValue()?.rootPath).toBe('/test/project');
    expect(eventSpy).toHaveBeenCalledTimes(1);
  });

  it('should fail when database write fails', async () => {
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Disk full'));

    const result = await handler.execute(
      new InitializeWorkspaceCommand('/test/project')
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('Disk full');
  });

  it('should generate unique workspace IDs on each call', async () => {
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.rename as jest.Mock).mockResolvedValue(undefined);

    const first = await handler.execute(new InitializeWorkspaceCommand('/first'));
    const second = await handler.execute(new InitializeWorkspaceCommand('/second'));

    const id1 = first.getValue()?.id;
    const id2 = second.getValue()?.id;

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });
});