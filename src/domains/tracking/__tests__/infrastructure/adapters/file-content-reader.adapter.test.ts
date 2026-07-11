import { FileContentReaderAdapter } from '../../../infrastructure/adapters/file-content-reader.adapter';
import { promises as fs } from 'fs';
import * as path from 'path';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

describe('FileContentReaderAdapter', () => {
  const workspaceRoot = '/mock/workspace';
  let adapter: FileContentReaderAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new FileContentReaderAdapter(workspaceRoot);
  });

  describe('readContent', () => {
    it('should read file content and normalize line endings (CRLF -> LF)', async () => {
      const filePath = 'docs/readme.md';
      const absolutePath = path.join(workspaceRoot, filePath);
      const rawContent = 'line1\r\nline2\r\nline3';
      const normalizedContent = 'line1\nline2\nline3';

      (fs.readFile as jest.Mock).mockResolvedValue(rawContent);

      const result = await adapter.readContent(filePath);

      expect(fs.readFile).toHaveBeenCalledWith(absolutePath, 'utf-8');
      expect(result).toBe(normalizedContent);
    });

    it('should return content unchanged if it already uses LF only', async () => {
      const rawContent = 'line1\nline2\nline3';
      (fs.readFile as jest.Mock).mockResolvedValue(rawContent);

      const result = await adapter.readContent('any.txt');

      expect(result).toBe(rawContent);
    });

    it('should handle empty file', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('');

      const result = await adapter.readContent('empty.txt');

      expect(result).toBe('');
    });

    it('should propagate errors from fs.readFile', async () => {
      const error = new Error('ENOENT: no such file');
      (fs.readFile as jest.Mock).mockRejectedValue(error);

      await expect(adapter.readContent('missing.txt')).rejects.toThrow(
        'ENOENT: no such file'
      );
    });
  });
});