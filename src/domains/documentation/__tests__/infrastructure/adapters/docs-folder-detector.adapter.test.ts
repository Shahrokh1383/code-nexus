jest.mock('../../../filesystem/infrastructure/adapters/node-fs.adapter');

import { NodeFsAdapter } from '../../../filesystem/infrastructure/adapters/node-fs.adapter';
import { DocsFolderDetectorAdapter } from '../../../infrastructure/adapters/docs-folder-detector.adapter';

describe('DocsFolderDetectorAdapter', () => {
  let mockNodeFsAdapter: jest.Mocked<NodeFsAdapter>;
  let adapter: DocsFolderDetectorAdapter;

  beforeEach(() => {
    mockNodeFsAdapter = {
      scanDirectory: jest.fn(),
      readDir: jest.fn(),
      stat: jest.fn(),
      exists: jest.fn(),
    } as unknown as jest.Mocked<NodeFsAdapter>;

    adapter = new DocsFolderDetectorAdapter(mockNodeFsAdapter);
    jest.clearAllMocks();
  });

  describe('scanWorkspaceCandidates', () => {
    it('should scan workspace root and return candidate folders with signatures', async () => {
      mockNodeFsAdapter.readDir.mockResolvedValue([
        { name: 'src', path: 'src', size: 0, lastModified: new Date(), isDirectory: true },
        { name: 'docs', path: 'docs', size: 0, lastModified: new Date(), isDirectory: true },
        { name: 'readme.md', path: 'readme.md', size: 100, lastModified: new Date(), isDirectory: false },
      ]);

      mockNodeFsAdapter.scanDirectory.mockImplementation(async (dirPath: string) => {
        if (dirPath.includes('docs')) {
          return [
            { name: 'readme.md', path: 'readme.md', size: 100, lastModified: new Date(), isDirectory: false },
            { name: 'guide.md', path: 'guide.md', size: 200, lastModified: new Date(), isDirectory: false },
          ];
        }
        return [
          { name: 'main.ts', path: 'main.ts', size: 300, lastModified: new Date(), isDirectory: false },
        ];
      });

      const result = await adapter.scanWorkspaceCandidates('/workspace');

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('src');
      expect(result[1].path).toBe('docs');
      expect(result[1].signature.fileCount).toBe(2);
      expect(result[1].signature.topLevelFileNames).toEqual(['guide.md', 'readme.md']);
    });

    it('should return empty array when workspace has no directories', async () => {
      mockNodeFsAdapter.readDir.mockResolvedValue([
        { name: 'readme.md', path: 'readme.md', size: 100, lastModified: new Date(), isDirectory: false },
      ]);

      const result = await adapter.scanWorkspaceCandidates('/workspace');

      expect(result).toEqual([]);
    });
  });

  describe('readCandidateFolder', () => {
    it('should read a single folder and return file nodes', async () => {
      mockNodeFsAdapter.scanDirectory.mockResolvedValue([
        { name: 'readme.md', path: 'readme.md', size: 100, lastModified: new Date(), isDirectory: false },
        { name: 'assets', path: 'assets', size: 0, lastModified: new Date(), isDirectory: true },
      ]);

      const result = await adapter.readCandidateFolder('/workspace/docs');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('readme.md');
      expect(result[0].isDirectory).toBe(false);
      expect(result[1].name).toBe('assets');
      expect(result[1].isDirectory).toBe(true);
    });
  });

  describe('calculateSignature', () => {
    it('should calculate signature from file nodes', () => {
      const files = [
        { name: 'readme.md', path: 'readme.md', isDirectory: false },
        { name: 'guide.md', path: 'guide.md', isDirectory: false },
      ];

      const signature = adapter.calculateSignature(files);

      expect(signature.fileCount).toBe(2);
      expect(signature.topLevelFileNames).toEqual(['guide.md', 'readme.md']);
      expect(signature.directoryDepth).toBe(1);
    });
  });
});