import { PathUtils } from '../../../shared/utils/path-utils';

const METADATA_FOLDER_NAME = '.doclink';

/**
 * Local duplicate of documentation's doclink-path helper. The 5 lines are
 * intentionally duplicated rather than imported from another module's
 * infrastructure (Constitution §2 — module boundaries are sacred).
 */
export function doclinkFilePath(rootPath: string, filename: string): string {
  return PathUtils.join(rootPath, METADATA_FOLDER_NAME, filename);
}