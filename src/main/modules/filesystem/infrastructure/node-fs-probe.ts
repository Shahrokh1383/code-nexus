import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Node fs probe used by session reconciliation to check whether indexed
 * paths still exist on disk. The only fs touch in the file-system module
 * outside the watcher and the atomic file writer.
 */
export class NodeFsProbe {
  exists(absolutePath: string): boolean {
    return existsSync(absolutePath);
  }

  absolutePath(rootPath: string, relativePath: string): string {
    return join(rootPath, relativePath);
  }
}