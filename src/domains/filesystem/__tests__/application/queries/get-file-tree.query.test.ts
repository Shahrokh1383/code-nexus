import { GetFileTreeQuery } from '../../../application/queries/get-file-tree.query';

describe('GetFileTreeQuery', () => {
  it('should hold workspaceId without parentPath', () => {
    const query = new GetFileTreeQuery('workspace-123');
    expect(query.workspaceId).toBe('workspace-123');
    expect(query.parentPath).toBeUndefined();
  });

  it('should hold workspaceId with parentPath', () => {
    const query = new GetFileTreeQuery('workspace-123', 'src/components');
    expect(query.workspaceId).toBe('workspace-123');
    expect(query.parentPath).toBe('src/components');
  });
});