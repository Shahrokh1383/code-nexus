import * as path from 'path';
import { NodeFsAdapter } from '../../../filesystem/infrastructure/adapters/node-fs.adapter';
import {
  DocFolderSignature,
  FileNode,
} from '../../domain/value-objects/doc-folder-signature';

export interface CandidateFolderData {
  path: string;
  files: FileNode[];
  signature: DocFolderSignature;
}

/**
 * Infrastructure adapter that uses the FileSystem domain's NodeFsAdapter
 * to scan candidate folders and calculate DocFolderSignatures.
 *
 * This is an outer-layer dependency. The FileSystem adapter is used as a
 * concrete utility (no domain logic leakage) per Onion Architecture.
 */
export class DocsFolderDetectorAdapter {
  constructor(private readonly nodeFsAdapter: NodeFsAdapter) {}

  /**
   * Scans the workspace root for directory candidates, reads each folder's
   * contents, and returns structured data with pre-calculated signatures.
   */
  async scanWorkspaceCandidates(
    workspaceRoot: string
  ): Promise<CandidateFolderData[]> {
    const rootEntries = await this.nodeFsAdapter.readDir(workspaceRoot);
    const directories = rootEntries.filter((entry) => entry.isDirectory);

    const candidates: CandidateFolderData[] = [];

    for (const dir of directories) {
      const dirAbsolutePath = path.join(workspaceRoot, dir.name);
      const allFiles = await this.nodeFsAdapter.readDirRecursively(dirAbsolutePath);

      const files: FileNode[] = allFiles.map((meta) => ({
        name: meta.name,
        path: meta.path,
        isDirectory: meta.isDirectory,
      }));

      const signature = DocFolderSignature.calculateFrom(files);

      candidates.push({
        path: dir.name,
        files,
        signature,
      });
    }

    return candidates;
  }

  /**
   * Reads a single candidate folder and returns its file nodes.
   */
  async readCandidateFolder(folderPath: string): Promise<FileNode[]> {
    const allFiles = await this.nodeFsAdapter.readDirRecursively(folderPath);

    return allFiles.map((meta) => ({
      name: meta.name,
      path: meta.path,
      isDirectory: meta.isDirectory,
    }));
  }

  /**
   * Calculates a DocFolderSignature from a list of file nodes.
   */
  calculateSignature(files: FileNode[]): DocFolderSignature {
    return DocFolderSignature.calculateFrom(files);
  }
}