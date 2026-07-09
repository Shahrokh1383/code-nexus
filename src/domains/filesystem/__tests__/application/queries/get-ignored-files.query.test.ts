import { GetIgnoredFilesQuery } from '../../../../application/queries/get-ignored-files.query';

describe('GetIgnoredFilesQuery', () => {
  it('should hold workspaceId', () => {
    const query = new GetIgnoredFilesQuery('workspace-123');
    expect(query.workspaceId).toBe('workspace-123');
  });
});