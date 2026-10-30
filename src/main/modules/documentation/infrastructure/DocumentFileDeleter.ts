import { promises as fs } from 'fs';
import * as path from 'path';
import { PathUtils } from '../../../shared/utils/path-utils';

/**
 * Deletes physical document files inside the workspace root.
*/
export class DocumentFileDeleter {
  async deleteFile(rootPath: string, relativePath: string): Promise<void> {
    const absolutePath = path.join(rootPath, PathUtils.normalize(relativePath));
    await fs.unlink(absolutePath.replace(/\\/g, '/'));
  }
}