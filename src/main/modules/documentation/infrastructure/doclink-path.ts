import { PathUtils } from '../../../shared/utils/path-utils';

const METADATA_FOLDER_NAME = '.doclink';

export function doclinkFilePath(rootPath: string, filename: string): string {
  return PathUtils.join(rootPath, METADATA_FOLDER_NAME, filename);
}