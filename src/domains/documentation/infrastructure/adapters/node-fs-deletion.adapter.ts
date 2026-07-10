import { promises as fs } from 'fs';
import * as path from 'path';
import { PathUtils } from '../../../shared-kernel/utils/path-utils';
import { IFileDeletionPort } from '../../application/ports/file-deletion-port.interface';

export class NodeFsDeletionAdapter implements IFileDeletionPort {
  constructor(private readonly workspaceRoot: string) {}

  async deleteFile(relativePath: string): Promise<void> {
    const absolutePath = path.join(this.workspaceRoot, PathUtils.normalize(relativePath));
    await fs.unlink(absolutePath);
  }
}