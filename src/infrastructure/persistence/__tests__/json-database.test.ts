jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    rename: jest.fn(),
  },
}));

import { promises as fs } from 'fs';
import { JsonDatabase } from '../json-database';

describe('JsonDatabase', () => {
  let db: JsonDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    db = new JsonDatabase('/test/project');
  });

  it('should create doclink folder', async () => {
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

    await db.ensureDoclinkExists();

    expect(fs.mkdir).toHaveBeenCalledWith('/test/project/.doclink', { recursive: true });
  });

  it('should read JSON file', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue('{"key": "value"}');

    const data = await db.read<Record<string, string>>('test.json');

    expect(data).toEqual({ key: 'value' });
    expect(fs.readFile).toHaveBeenCalledWith('/test/project/.doclink/test.json', 'utf-8');
  });

  it('should write JSON atomically', async () => {
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.rename as jest.Mock).mockResolvedValue(undefined);

    await db.write('test.json', { key: 'value' });

    expect(fs.writeFile).toHaveBeenCalledWith(
      '/test/project/.doclink/test.json.tmp',
      JSON.stringify({ key: 'value' }, null, 2),
      'utf-8'
    );
    expect(fs.rename).toHaveBeenCalledWith(
      '/test/project/.doclink/test.json.tmp',
      '/test/project/.doclink/test.json'
    );
  });

  it('should write text file atomically', async () => {
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.rename as jest.Mock).mockResolvedValue(undefined);

    await db.writeTextFile('.docignore', 'content');

    expect(fs.writeFile).toHaveBeenCalledWith(
      '/test/project/.doclink/.docignore.tmp',
      'content',
      'utf-8'
    );
  });

  it('should read text file', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue('text content');

    const content = await db.readTextFile('.docignore');

    expect(content).toBe('text content');
  });
});