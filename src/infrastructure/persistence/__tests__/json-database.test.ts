jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn(),
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

  it('should write JSON atomically using a temp file and rename', async () => {
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.rename as jest.Mock).mockResolvedValue(undefined);

    await db.write('test.json', { key: 'value' });

    // Ensure directory is created before writing
    expect(fs.mkdir).toHaveBeenCalledWith('/test/project/.doclink', { recursive: true });
    
    // Verify atomic write pattern: write to .tmp file first
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/^\/test\/project\/\.doclink\/test\.json\.tmp\.\d+$/),
      JSON.stringify({ key: 'value' }, null, 2),
      'utf-8'
    );
    
    // Verify rename from .tmp to final path
    expect(fs.rename).toHaveBeenCalledWith(
      expect.stringMatching(/^\/test\/project\/\.doclink\/test\.json\.tmp\.\d+$/),
      '/test/project/.doclink/test.json'
    );
  });

  it('should write text file atomically using a temp file and rename', async () => {
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.rename as jest.Mock).mockResolvedValue(undefined);

    await db.writeTextFile('.docignore', 'content');

    expect(fs.mkdir).toHaveBeenCalledWith('/test/project/.doclink', { recursive: true });
    
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/^\/test\/project\/\.doclink\/\.docignore\.tmp\.\d+$/),
      'content',
      'utf-8'
    );
    
    expect(fs.rename).toHaveBeenCalledWith(
      expect.stringMatching(/^\/test\/project\/\.doclink\/\.docignore\.tmp\.\d+$/),
      '/test/project/.doclink/.docignore'
    );
  });

  it('should read text file', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue('text content');

    const content = await db.readTextFile('.docignore');

    expect(content).toBe('text content');
    expect(fs.readFile).toHaveBeenCalledWith('/test/project/.doclink/.docignore', 'utf-8');
  });
});