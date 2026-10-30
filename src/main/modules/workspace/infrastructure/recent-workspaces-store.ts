import { join } from 'path';
import { app } from 'electron';
import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import type { RecentWorkspaceDto } from '@shared/ipc/workspace';

const MAX_RECENT_WORKSPACES = 4;

/**
 * `userData/recent-workspaces.json` store — newest first, deduplicated by
 * id or root path, hard-limited to 4 entries, atomically written.
 */
export class RecentWorkspacesStore {
  private readonly filename = 'recent-workspaces.json';

  constructor(private readonly file: AtomicJsonFile) {}

  private get filePath(): string {
    return join(app.getPath('userData'), this.filename);
  }

  async getRecent(): Promise<RecentWorkspaceDto[]> {
    try {
      const data = await this.file.readJson<RecentWorkspaceDto[]>(this.filePath);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async addOrUpdate(entry: RecentWorkspaceDto): Promise<void> {
    const recents = await this.getRecent();
    const filtered = recents.filter(
      (r) => r.id !== entry.id && r.rootPath !== entry.rootPath
    );
    const limited = [entry, ...filtered].slice(0, MAX_RECENT_WORKSPACES);
    await this.file.writeJson(this.filePath, limited);
  }

  async remove(workspaceId: string): Promise<void> {
    const recents = await this.getRecent();
    const filtered = recents.filter((r) => r.id !== workspaceId);
    await this.file.writeJson(this.filePath, filtered);
  }
}