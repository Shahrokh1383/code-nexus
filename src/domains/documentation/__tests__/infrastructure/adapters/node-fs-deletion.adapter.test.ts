jest.mock('fs', () => ({
  promises: {
    unlink: jest.fn(),
  },
}));

import { promises as fs } from 'fs';
import { NodeFsDeletionAdapter } from '../../../infrastructure/adapters/node-fs-deletion.adapter';

describe('NodeFsDeletionAdapter', () => {
  let adapter: NodeFsDeletionAdapter;
  const workspaceRoot = '/test/workspace';

  beforeEach(() => {
    adapter = new NodeFsDeletionAdapter(workspaceRoot);
    jest.clearAllMocks();
  });

  it('should delete file at relative path', async () => {
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);

    await adapter.deleteFile('docs/readme.md');

    expect(fs.unlink).toHaveBeenCalledWith('/test/workspace/docs/readme.md');
  });

  it('should throw when file does not exist', async () => {
    (fs.unlink as jest.Mock).mockRejectedValue(new Error('ENOENT'));

    await expect(adapter.deleteFile('missing.md')).rejects.toThrow('ENOENT');
  });
});