export interface FileIndexEntry {
  id: string;
  hash: string | null;
  lastModified: string;
  isDirectory: boolean;
}

export interface FileIndexFile {
  version: string;
  lastScan: string | null;
  cleanExit: boolean;
  files: Record<string, FileIndexEntry>;
}

export interface IndexedPath {
  path: string;
  entry: FileIndexEntry;
}

export function emptyIndex(): FileIndexFile {
  return { version: '1.0', lastScan: null, cleanExit: false, files: {} };
}