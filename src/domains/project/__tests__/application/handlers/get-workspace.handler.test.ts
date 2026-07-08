jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    rename: jest.fn(),
    mkdir: jest.fn(),
  },
}));

import { promises as fs } from 'fs';
import { GetWorkspaceHandler } from '../../../application/handlers/get-workspace.handler';
import { GetWorkspaceQuery } from '../../../application/queries/get-workspace.query';
import { WorkspaceJsonRepository } from '../../../infrastructure/repository/workspace-json.repository';
import { JsonDatabase } from '../../../../../infrastructure/persistence/json-database';

describe('GetWorkspaceHandler', () => {
  let handler: GetWorkspaceHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    const db = new JsonDatabase('/test/project');
    const workspaceRepo = new WorkspaceJsonRepository(db);
    handler = new GetWorkspaceHandler(workspaceRepo);
  });

  it('should return workspace DTO when found', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({
        id: 'ws-1',
        rootPath: '/test/project',
        metadataFolderPath: '.doclink',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastScanAt: null,
      })
    );

    const result = await handler.execute(new GetWorkspaceQuery('ws-1'));

    expect(result.isSuccess).toBe(true);
    const dto = result.getValue();
    expect(dto).toBeDefined();
    expect(dto?.id).toBe('ws-1');
    expect(dto?.rootPath).toBe('/test/project');
  });

  it('should return failure when workspace not found', async () => {
    (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));

    const result = await handler.execute(new GetWorkspaceQuery('unknown'));

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBe('Workspace not found');
  });
});