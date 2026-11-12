import { TrackedFilePath } from './TrackedFilePath';
import { HashValue } from './FileHash';

export enum DiffLineType {
  ADDED = 'ADDED',
  REMOVED = 'REMOVED',
  MODIFIED = 'MODIFIED',
}

export class DiffLine {
  constructor(
    public readonly lineNumber: number,
    public readonly content: string,
    public readonly type: DiffLineType,
  ) {}
}

export class DiffId {
  constructor(public readonly value: string) {}
}

export class ContentDiff {
  constructor(
    public readonly id: DiffId,
    public readonly filePath: TrackedFilePath,
    public readonly oldHash: HashValue,
    public readonly newHash: HashValue,
    public readonly addedLines: readonly DiffLine[],
    public readonly removedLines: readonly DiffLine[],
    public readonly modifiedLines: readonly DiffLine[],
  ) {}
}