import { FileIndexRebuiltEvent } from '../../../domain/events/file-index-rebuilt';

describe('FileIndexRebuiltEvent', () => {
  it('should store the provided set of file paths', () => {
    const paths = new Set<string>(['src/index.ts', 'src/utils.ts']);
    const event = new FileIndexRebuiltEvent(paths);

    expect(event.eventType).toBe('FileIndexRebuilt');
    expect(event.filePaths).toBe(paths);
    expect(event.filePaths.size).toBe(2);
    expect(event.filePaths.has('src/index.ts')).toBe(true);
  });

  it('should accept an empty set', () => {
    const paths = new Set<string>();
    const event = new FileIndexRebuiltEvent(paths);

    expect(event.eventType).toBe('FileIndexRebuilt');
    expect(event.filePaths.size).toBe(0);
  });
});