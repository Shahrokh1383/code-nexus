jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
  },
}));

import { promises as fs } from 'fs';
import { NodeFsDocumentScannerAdapter } from '../../../infrastructure/adapters/node-fs-document-scanner.adapter';

describe('NodeFsDocumentScannerAdapter', () => {
  let adapter: NodeFsDocumentScannerAdapter;
  const workspaceRoot = '/test/workspace';

  beforeEach(() => {
    adapter = new NodeFsDocumentScannerAdapter(workspaceRoot);
    jest.clearAllMocks();
  });

  describe('exists', () => {
    it('should return true for existing path', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const result = await adapter.exists('docs');

      expect(result).toBe(true);
      expect(fs.access).toHaveBeenCalledWith('/test/workspace/docs');
    });

    it('should return false for non-existing path', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const result = await adapter.exists('missing');

      expect(result).toBe(false);
    });
  });

  describe('isDirectory', () => {
    it('should return true for directory', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      const result = await adapter.isDirectory('docs');

      expect(result).toBe(true);
    });

    it('should return false for file', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => false });

      const result = await adapter.isDirectory('docs/readme.md');

      expect(result).toBe(false);
    });
  });

  describe('listDirectories', () => {
    it('should return subdirectory names', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        { name: 'src', isDirectory: () => true },
        { name: 'docs', isDirectory: () => true },
        { name: 'readme.md', isDirectory: () => false },
      ]);

      const result = await adapter.listDirectories('');

      expect(result).toEqual(['src', 'docs']);
    });

    it('should return empty array for non-existing path', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const result = await adapter.listDirectories('missing');

      expect(result).toEqual([]);
    });
  });

  describe('scanFolder', () => {
    it('should scan folder recursively', async () => {
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce([
          { name: 'readme.md', isDirectory: () => false },
          { name: 'assets', isDirectory: () => true },
        ])
        .mockResolvedValueOnce([
          { name: 'logo.png', isDirectory: () => false },
        ]);

      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => false,
        mtime: new Date('2024-01-01'),
      });

      const result = await adapter.scanFolder('docs');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('readme.md');
      expect(result[0].path).toBe('readme.md');
      expect(result[0].isDirectory).toBe(false);
      expect(result[1].name).toBe('assets');
      expect(result[1].path).toBe('assets');
      expect(result[1].isDirectory).toBe(true);
      expect(result[2].name).toBe('logo.png');
      expect(result[2].path).toBe('assets/logo.png');
    });
  });
});