import { ContentDiff } from '../../../domain/entities/content-diff';
import { DiffId } from '../../../domain/value-objects/diff-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { DiffLine, DiffLineType } from '../../../domain/value-objects/diff-line';

describe('ContentDiff', () => {
  const createDiff = (
    added: DiffLine[] = [],
    removed: DiffLine[] = [],
    modified: DiffLine[] = []
  ) => {
    return new ContentDiff(
      new DiffId('diff-1'),
      new FilePath('src/app.ts'),
      new HashValue('a'.repeat(64)),
      new HashValue('b'.repeat(64)),
      added,
      removed,
      modified
    );
  };

  it('should create with all properties', () => {
    const diff = createDiff();
    expect(diff.id.value).toBe('diff-1');
    expect(diff.filePath.value).toBe('src/app.ts');
    expect(diff.oldHash.value).toBe('a'.repeat(64));
    expect(diff.newHash.value).toBe('b'.repeat(64));
  });

  it('should be empty when no changes', () => {
    const diff = createDiff();
    expect(diff.isEmpty()).toBe(true);
  });

  it('should not be empty with added lines', () => {
    const diff = createDiff([new DiffLine(1, 'code', DiffLineType.ADDED)]);
    expect(diff.isEmpty()).toBe(false);
  });

  it('should not be empty with removed lines', () => {
    const diff = createDiff([], [new DiffLine(1, 'code', DiffLineType.REMOVED)]);
    expect(diff.isEmpty()).toBe(false);
  });

  it('should not be empty with modified lines', () => {
    const diff = createDiff([], [], [new DiffLine(1, 'code', DiffLineType.MODIFIED)]);
    expect(diff.isEmpty()).toBe(false);
  });

  it('should return immutable copy of addedLines', () => {
    const added = [new DiffLine(1, 'code', DiffLineType.ADDED)];
    const diff = createDiff(added);
    const returned = diff.addedLines;
    returned.push(new DiffLine(2, 'code2', DiffLineType.ADDED));
    expect(diff.addedLines.length).toBe(1);
  });

  it('should return immutable copy of removedLines', () => {
    const removed = [new DiffLine(1, 'code', DiffLineType.REMOVED)];
    const diff = createDiff([], removed);
    const returned = diff.removedLines;
    returned.push(new DiffLine(2, 'code2', DiffLineType.REMOVED));
    expect(diff.removedLines.length).toBe(1);
  });

  it('should return immutable copy of modifiedLines', () => {
    const modified = [new DiffLine(1, 'code', DiffLineType.MODIFIED)];
    const diff = createDiff([], [], modified);
    const returned = diff.modifiedLines;
    returned.push(new DiffLine(2, 'code2', DiffLineType.MODIFIED));
    expect(diff.modifiedLines.length).toBe(1);
  });
});