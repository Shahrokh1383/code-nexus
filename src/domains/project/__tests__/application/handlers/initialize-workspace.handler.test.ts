jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
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
import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../infrastructure/persistence/migration/schema-migrator';
import { DATABASE_SCHEMA_VERSION } from '../../../../infrastructure/persistence/database-schema';
import { EventBus } from '../../../../shared-kernel/events/event-bus';

describe('InitializeWorkspaceHandler', () => {
  let handler: InitializeWorkspaceHandler;
  let workspaceRepo: WorkspaceJsonRepository;
  let configRepo: ProjectConfigJsonRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    EventBus.getInstance().clear();

    const db = new JsonDatabase('/test/project');
    workspaceRepo = new WorkspaceJsonRepository(db);
    configRepo = new ProjectConfigJsonRepository(db, new SchemaMigrator(DATABASE_SCHEMA_VERSION));
    handler = new InitializeWorkspaceHandler(workspaceRepo, configRepo);
  });

  it('should fail when path does not exist', async () => {
    (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

    const result = await handler.execute(new InitializeWorkspaceCommand('/nonexistent'));

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('ENOENT');
  });

  it('should succeed when path exists', async () => {
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.rename as jest.Mock).mockResolvedValue(undefined);

    const result = await handler.execute(new InitializeWorkspaceCommand('/test/project'));

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBeDefined();
    expect(result.getValue()?.rootPath).toBe('/test/project');
  });

  it('should emit WorkspaceInitializedEvent on success', async () => {
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.rename as jest.Mock).mockResolvedValue(undefined);

    const eventSpy = jest.fn();
    EventBus.getInstance().register('WorkspaceInitialized', {
      handle: eventSpy,
    });

    await handler.execute(new InitializeWorkspaceCommand('/test/project'));

    expect(eventSpy).toHaveBeenCalledTimes(1);
  });
});