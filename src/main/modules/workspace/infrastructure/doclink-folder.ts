import { access, mkdir } from 'fs/promises';
import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import { PathUtils } from '../../../shared/utils/path-utils';

export const METADATA_FOLDER_NAME = '.doclink';
const DOCIGNORE_CONTENT = 'node_modules/\n.git/\ndist/\nbuild/\n.doclink/\n*.log\n';

/**
 * Workspace-scoped `.doclink` folder management: the only place the metadata
 * folder is created and the `.docignore` marker file is written.
 */
export class DoclinkFolder {
  constructor(private readonly file: AtomicJsonFile) {}

  doclinkPath(rootPath: string): string {
    return PathUtils.join(rootPath, METADATA_FOLDER_NAME);
  }

  doclinkFilePath(rootPath: string, filename: string): string {
    return PathUtils.join(rootPath, METADATA_FOLDER_NAME, filename);
  }

  /** Fails with the underlying fs error when the root does not exist. */
  async ensureRootAccessible(rootPath: string): Promise<void> {
    await access(rootPath);
  }

  async ensureDoclink(rootPath: string): Promise<void> {
    await mkdir(this.doclinkPath(rootPath), { recursive: true });
  }

  async writeDocignoreMarker(rootPath: string): Promise<void> {
    await this.file.writeText(this.doclinkFilePath(rootPath, '.docignore'), DOCIGNORE_CONTENT);
  }
}