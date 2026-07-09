import { app } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface RecentWorkspaceDto {
  id: string;
  rootPath: string;
  lastOpened: string;
}

export class RecentWorkspacesAdapter {
  private readonly filePath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, 'recent-workspaces.json');
  }

  async getRecent(): Promise<RecentWorkspaceDto[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async addOrUpdate(workspace: RecentWorkspaceDto): Promise<void> {
    const recents = await this.getRecent();
    // Remove existing entries with same ID or rootPath to prevent duplicates
    const filtered = recents.filter(r => r.id !== workspace.id && r.rootPath !== workspace.rootPath);
    
    // Add to top
    filtered.unshift(workspace);
    
    // Limit to 4 recent items (KISS principle)
    const limited = filtered.slice(0, 4);
    
    await fs.writeFile(this.filePath, JSON.stringify(limited, null, 2), 'utf-8');
  }

  async remove(workspaceId: string): Promise<void> {
    const recents = await this.getRecent();
    const filtered = recents.filter(r => r.id !== workspaceId);
    await fs.writeFile(this.filePath, JSON.stringify(filtered, null, 2), 'utf-8');
  }
}