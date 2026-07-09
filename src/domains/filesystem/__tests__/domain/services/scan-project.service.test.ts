import { ScanProjectService, FileMetadata } from '../../../../domain/services/scan-project.service';
import { FilePath } from '../../../../domain/value-objects/file-path';
import { IgnorePattern } from '../../../../domain/value-objects/ignore-pattern';
import { FileDiscoveredEvent } from '../../../../domain/events/file-discovered';
import { ScanCompletedEvent } from '../../../../domain/events/scan-completed';
import { FolderNode } from '../../../../domain/entities/folder-node';

describe('ScanProjectService', () => {
  const service = new ScanProjectService();

  const createMetadata = (overrides: Partial<FileMetadata> & { path: string; name: string }): FileMetadata => ({
    size: 100,
    lastModified: new Date('2024-01-01T00:00:00.000Z'),
    isDirectory: false,
    ...overrides,
  });

  it('should return empty tree when no files are provided', () => {
    const rootPath = new FilePath('.');
    const result = service.scan(rootPath, [], []);

    expect(result.fileCount).toBe(0);
    expect(result.folderCount).toBe(1);
    expect(result.rootFolder.children).toHaveLength(0);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toBeInstanceOf(ScanCompletedEvent);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should discover a single file in root', () => {
    const rootPath = new FilePath('.');
    const files = [createMetadata({ path: 'readme.md', name: 'readme.md' })];

    const result = service.scan(rootPath, [], files);

    expect(result.fileCount).toBe(1);
    expect(result.folderCount).toBe(1);
    expect(result.rootFolder.children).toHaveLength(1);
    expect(result.events.filter(e => e instanceof FileDiscoveredEvent)).toHaveLength(1);
    expect(result.events.filter(e => e instanceof ScanCompletedEvent)).toHaveLength(1);
  });

  it('should build a nested tree structure', () => {
    const rootPath = new FilePath('.');
    const files = [
      createMetadata({ path: 'src', name: 'src', isDirectory: true, size: 0 }),
      createMetadata({ path: 'src/components', name: 'components', isDirectory: true, size: 0 }),
      createMetadata({ path: 'src/components/Button.tsx', name: 'Button.tsx' }),
      createMetadata({ path: 'src/App.tsx', name: 'App.tsx' }),
    ];

    const result = service.scan(rootPath, [], files);

    expect(result.fileCount).toBe(2);
    expect(result.folderCount).toBe(3); // root + src + components
    expect(result.rootFolder.children).toHaveLength(1);

    const srcFolder = result.rootFolder.children[0] as FolderNode;
    expect(srcFolder.name).toBe('src');
    expect(srcFolder.children).toHaveLength(2);

    const discoveredPaths = result.events
      .filter(e => e instanceof FileDiscoveredEvent)
      .map(e => (e as FileDiscoveredEvent).path.value);

    expect(discoveredPaths).toContain('src');
    expect(discoveredPaths).toContain('src/components');
    expect(discoveredPaths).toContain('src/components/Button.tsx');
    expect(discoveredPaths).toContain('src/App.tsx');
  });

  it('should filter out ignored files and directories', () => {
    const rootPath = new FilePath('.');
    const files = [
      createMetadata({ path: 'src/index.ts', name: 'index.ts' }),
      createMetadata({ path: 'node_modules', name: 'node_modules', isDirectory: true, size: 0 }),
      createMetadata({ path: 'node_modules/lodash/index.js', name: 'index.js' }),
      createMetadata({ path: 'dist/bundle.js', name: 'bundle.js' }),
    ];

    const ignorePatterns = [
      new IgnorePattern('node_modules/'),
      new IgnorePattern('dist/'),
    ];

    const result = service.scan(rootPath, ignorePatterns, files);

    expect(result.fileCount).toBe(1);
    expect(result.rootFolder.children).toHaveLength(1);

    const discoveredPaths = result.events
      .filter(e => e instanceof FileDiscoveredEvent)
      .map(e => (e as FileDiscoveredEvent).path.value);

    expect(discoveredPaths).toContain('src/index.ts');
    expect(discoveredPaths).not.toContain('node_modules');
    expect(discoveredPaths).not.toContain('node_modules/lodash/index.js');
    expect(discoveredPaths).not.toContain('dist');
    expect(discoveredPaths).not.toContain('dist/bundle.js');
  });

  it('should filter using glob patterns', () => {
    const rootPath = new FilePath('.');
    const files = [
      createMetadata({ path: 'readme.md', name: 'readme.md' }),
      createMetadata({ path: 'debug.log', name: 'debug.log' }),
      createMetadata({ path: 'error.log', name: 'error.log' }),
    ];

    const ignorePatterns = [new IgnorePattern('*.log')];

    const result = service.scan(rootPath, ignorePatterns, files);

    expect(result.fileCount).toBe(1);
    const discoveredPaths = result.events
      .filter(e => e instanceof FileDiscoveredEvent)
      .map(e => (e as FileDiscoveredEvent).path.value);
    expect(discoveredPaths).toContain('readme.md');
    expect(discoveredPaths).not.toContain('debug.log');
  });

  it('should emit ScanCompletedEvent with correct stats', () => {
    const rootPath = new FilePath('.');
    const files = [
      createMetadata({ path: 'a.ts', name: 'a.ts' }),
      createMetadata({ path: 'b.ts', name: 'b.ts' }),
      createMetadata({ path: 'src', name: 'src', isDirectory: true, size: 0 }),
    ];

    const result = service.scan(rootPath, [], files);

    const scanCompleted = result.events.find(e => e instanceof ScanCompletedEvent) as ScanCompletedEvent;
    expect(scanCompleted).toBeDefined();
    expect(scanCompleted.workspaceId).toBe('.');
    expect(scanCompleted.fileCount).toBe(2);
    expect(scanCompleted.folderCount).toBe(2);
    expect(scanCompleted.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should skip files whose parent folder is not in the tree', () => {
    const rootPath = new FilePath('src');
    const files = [
      createMetadata({ path: 'src/index.ts', name: 'index.ts' }),
      createMetadata({ path: 'unrelated/file.ts', name: 'file.ts' }),
    ];

    const result = service.scan(rootPath, [], files);

    expect(result.fileCount).toBe(1);
    const discoveredPaths = result.events
      .filter(e => e instanceof FileDiscoveredEvent)
      .map(e => (e as FileDiscoveredEvent).path.value);
    expect(discoveredPaths).toContain('src/index.ts');
    expect(discoveredPaths).not.toContain('unrelated/file.ts');
  });

  it('should handle a directory-only tree', () => {
    const rootPath = new FilePath('.');
    const files = [
      createMetadata({ path: 'docs', name: 'docs', isDirectory: true, size: 0 }),
      createMetadata({ path: 'docs/api', name: 'api', isDirectory: true, size: 0 }),
    ];

    const result = service.scan(rootPath, [], files);

    expect(result.fileCount).toBe(0);
    expect(result.folderCount).toBe(3);
    expect(result.events.filter(e => e instanceof FileDiscoveredEvent)).toHaveLength(2);
  });
});