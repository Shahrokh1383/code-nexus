import { RecentWorkspacesAdapter, RecentWorkspaceDto } from '../recent-workspaces.adapter';
import { promises as fs } from 'fs';

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/userData'),
  },
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('RecentWorkspacesAdapter', () => {
  let adapter: RecentWorkspacesAdapter;

  beforeEach(() => {
    adapter = new RecentWorkspacesAdapter();
    (fs.readFile as jest.Mock).mockReset();
    (fs.writeFile as jest.Mock).mockReset();
  });

  it('should return empty array if file read fails', async () => {
    (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));
    const result = await adapter.getRecent();
    expect(result).toEqual([]);
  });

  it('should add new workspace to the top and limit to 4', async () => {
    const existing: RecentWorkspaceDto[] = [
      { id: '1', rootPath: '/p1', lastOpened: '2023-01-01' },
      { id: '2', rootPath: '/p2', lastOpened: '2023-01-02' },
      { id: '3', rootPath: '/p3', lastOpened: '2023-01-03' },
      { id: '4', rootPath: '/p4', lastOpened: '2023-01-04' },
    ];
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existing));

    const newWs: RecentWorkspaceDto = { id: '5', rootPath: '/p5', lastOpened: '2023-01-05' };
    await adapter.addOrUpdate(newWs);

    expect(fs.writeFile).toHaveBeenCalledTimes(1);
    const writtenData = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
    expect(writtenData.length).toBe(4);
    expect(writtenData[0].id).toBe('5');
    expect(writtenData.find((w: RecentWorkspaceDto) => w.id === '4')).toBeUndefined();
  });

  it('should remove workspace by id', async () => {
    const existing: RecentWorkspaceDto[] = [
      { id: '1', rootPath: '/p1', lastOpened: '2023-01-01' },
      { id: '2', rootPath: '/p2', lastOpened: '2023-01-02' },
    ];
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existing));

    await adapter.remove('1');

    expect(fs.writeFile).toHaveBeenCalledTimes(1);
    const writtenData = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
    expect(writtenData.length).toBe(1);
    expect(writtenData[0].id).toBe('2');
  });
});