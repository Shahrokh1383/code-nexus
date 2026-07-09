jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
  },
}));

import { promises as fsPromises, existsSync } from 'fs';
import { NodeFsAdapter } from '../../../infrastructure/adapters/node-fs.adapter';

describe('NodeFsAdapter', () => {
  let adapter: NodeFsAdapter;

  beforeEach(() => {
    adapter = new NodeFsAdapter();
    jest.clearAllMocks();
  });

  describe('readDir', () => {
    it('should return file metadata for directory entries', async () => {
      (fsPromises.readdir as jest.Mock).mockResolvedValue([
        { name: 'file.ts', isDirectory: () => false, isFile: () => true },
        { name: 'folder', isDirectory: () => true, isFile: () => false },
      ]);

      (fsPromises.stat as jest.Mock).mockImplementation((path: string) => {
        return Promise.resolve({
          size: path.includes('file.ts') ? 100 : 0,
          mtime: new Date('2024-01-01'),
          isDirectory: () => path.includes('folder'),
        });
      });

      const result = await adapter.readDir('/project');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('file.ts');
      expect(result[0].size).toBe(100);
      expect(result[0].isDirectory).toBe(false);
      expect(result[1].name).toBe('folder');
      expect(result[1].isDirectory).toBe(true);
    });
  });

  describe('stat', () => {
    it('should return metadata for a single file', async () => {
      (fsPromises.stat as jest.Mock).mockResolvedValue({
        size: 250,
        mtime: new Date('2024-06-15'),
        isDirectory: () => false,
      });

      const result = await adapter.stat('/project/readme.md');

      expect(result.name).toBe('readme.md');
      expect(result.size).toBe(250);
      expect(result.isDirectory).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true when file exists', () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      expect(adapter.exists('/project/file.ts')).toBe(true);
    });

    it('should return false when file does not exist', () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      expect(adapter.exists('/project/missing.ts')).toBe(false);
    });
  });

  describe('scanDirectory', () => {
    it('should recursively scan all files', async () => {
      // Use normalized path comparison to be OS-agnostic
      (fsPromises.readdir as jest.Mock).mockImplementation((dirPath: string) => {
        const normalized = dirPath.replace(/\\/g, '/');
        if (normalized === '/project') {
          return Promise.resolve([
            { name: 'readme.md', isDirectory: () => false },
            { name: 'src', isDirectory: () => true },
          ]);
        }
        if (normalized === '/project/src') {
          return Promise.resolve([
            { name: 'index.ts', isDirectory: () => false },
          ]);
        }
        return Promise.resolve([]);
      });

      (fsPromises.stat as jest.Mock).mockImplementation((filePath: string) => {
        const normalized = filePath.replace(/\\/g, '/');
        return Promise.resolve({
          size: 100,
          mtime: new Date('2024-01-01'),
          isDirectory: () => normalized.endsWith('src'),
        });
      });

      const result = await adapter.scanDirectory('/project');

      expect(result).toHaveLength(3);
      const paths = result.map((r) => r.path);
      expect(paths).toContain('readme.md');
      expect(paths).toContain('src');
      expect(paths).toContain('src/index.ts');
    });
  });
});