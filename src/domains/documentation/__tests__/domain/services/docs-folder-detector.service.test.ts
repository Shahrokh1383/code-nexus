import { EventBus } from '@/domains/shared-kernel/events/event-bus';
import { DocFolder } from '../../../domain/entities/doc-folder';
import { DocFolderId } from '../../../domain/value-objects/doc-folder-id';
import { DocFolderSignature } from '../../../domain/value-objects/doc-folder-signature';
import { DocsFolderRelocatedEvent } from '../../../domain/events/docs-folder-relocated';
import {
  CandidateFolder,
  DocsFolderDetectorService,
} from '../../../domain/services/docs-folder-detector.service';

describe('DocsFolderDetectorService', () => {
  let eventBus: EventBus;
  let service: DocsFolderDetectorService;

  beforeEach(() => {
    eventBus = EventBus.getInstance();
    eventBus.clear();
    service = new DocsFolderDetectorService(eventBus);
  });

  afterEach(() => {
    eventBus.clear();
  });

  const createCandidate = (
    path: string,
    files: Array<{ name: string; path: string; isDirectory: boolean }>
  ): CandidateFolder => ({
    path,
    files,
  });

  it('should fail when no candidates are provided', () => {
    const result = service.detect([]);
    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBe('No candidate folders found');
  });

  it('should select docs folder by name similarity', () => {
    const candidates = [
      createCandidate('src', [
        { name: 'main.ts', path: 'src/main.ts', isDirectory: false },
      ]),
      createCandidate('docs', [
        { name: 'readme.md', path: 'docs/readme.md', isDirectory: false },
      ]),
    ];

    const result = service.detect(candidates);
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()?.path).toBe('docs');
  });

  it('should select docs folder by content type', () => {
    const candidates = [
      createCandidate('assets', [
        { name: 'logo.png', path: 'assets/logo.png', isDirectory: false },
        { name: 'icon.svg', path: 'assets/icon.svg', isDirectory: false },
      ]),
      createCandidate('guides', [
        { name: 'intro.md', path: 'guides/intro.md', isDirectory: false },
        { name: 'setup.md', path: 'guides/setup.md', isDirectory: false },
      ]),
    ];

    const result = service.detect(candidates);
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()?.path).toBe('guides');
  });

  it('should prefer root-level folders', () => {
    const candidates = [
      createCandidate('src/docs', [
        { name: 'readme.md', path: 'src/docs/readme.md', isDirectory: false },
      ]),
      createCandidate('docs', [
        { name: 'readme.md', path: 'docs/readme.md', isDirectory: false },
      ]),
    ];

    const result = service.detect(candidates);
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()?.path).toBe('docs');
  });

  it('should generate a new DocFolderId for new detection', () => {
    const candidates = [
      createCandidate('docs', [
        { name: 'readme.md', path: 'docs/readme.md', isDirectory: false },
      ]),
    ];

    const result = service.detect(candidates);
    const folder = result.getValue();
    expect(folder).toBeDefined();
    expect(folder?.id).toBeDefined();
    expect(folder?.id.value).toHaveLength(36);
  });

  it('should calculate signature for detected folder', () => {
    const candidates = [
      createCandidate('docs', [
        { name: 'readme.md', path: 'docs/readme.md', isDirectory: false },
        { name: 'guide.md', path: 'docs/guide.md', isDirectory: false },
      ]),
    ];

    const result = service.detect(candidates);
    const folder = result.getValue();
    expect(folder?.signature.fileCount).toBe(2);
    expect(folder?.signature.topLevelFileNames).toEqual(['guide.md', 'readme.md']);
  });

  it('should detect renamed folder by signature similarity', () => {
    const existingFiles = [
      { name: 'readme.md', path: 'docs/readme.md', isDirectory: false },
      { name: 'guide.md', path: 'docs/guide.md', isDirectory: false },
    ];
    const existingSignature = DocFolderSignature.calculateFrom(existingFiles);
    const existingFolder = new DocFolder(
      DocFolderId.generate(),
      'docs',
      existingSignature,
      2
    );

    const candidates = [
      createCandidate('documentation', [
        { name: 'readme.md', path: 'documentation/readme.md', isDirectory: false },
        { name: 'guide.md', path: 'documentation/guide.md', isDirectory: false },
      ]),
    ];

    const eventSpy = jest.fn();
    eventBus.register('DocsFolderRelocatedEvent', {
      handle: async (event) => eventSpy(event),
    });

    const result = service.detect(candidates, existingFolder);
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()?.path).toBe('documentation');
    expect(result.getValue()?.id).toBe(existingFolder.id); // Same ID preserved

    expect(eventSpy).toHaveBeenCalledTimes(1);
    const emittedEvent = eventSpy.mock.calls[0][0] as DocsFolderRelocatedEvent;
    expect(emittedEvent.oldPath).toBe('docs');
    expect(emittedEvent.newPath).toBe('documentation');
  });

  it('should not emit relocation event when existing folder still exists', () => {
    const existingFiles = [
      { name: 'readme.md', path: 'docs/readme.md', isDirectory: false },
    ];
    const existingSignature = DocFolderSignature.calculateFrom(existingFiles);
    const existingFolder = new DocFolder(
      DocFolderId.generate(),
      'docs',
      existingSignature,
      1
    );

    const candidates = [
      createCandidate('docs', [
        { name: 'readme.md', path: 'docs/readme.md', isDirectory: false },
      ]),
      createCandidate('documentation', [
        { name: 'readme.md', path: 'documentation/readme.md', isDirectory: false },
      ]),
    ];

    const eventSpy = jest.fn();
    eventBus.register('DocsFolderRelocatedEvent', {
      handle: async (event) => eventSpy(event),
    });

    const result = service.detect(candidates, existingFolder);
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()?.path).toBe('docs');
    expect(eventSpy).not.toHaveBeenCalled();
  });

  it('should not emit relocation event when similarity is below threshold', () => {
    const existingFiles = [
      { name: 'readme.md', path: 'docs/readme.md', isDirectory: false },
      { name: 'guide.md', path: 'docs/guide.md', isDirectory: false },
    ];
    const existingSignature = DocFolderSignature.calculateFrom(existingFiles);
    const existingFolder = new DocFolder(
      DocFolderId.generate(),
      'docs',
      existingSignature,
      2
    );

    const candidates = [
      createCandidate('completely-different', [
        { name: 'a.ts', path: 'completely-different/a.ts', isDirectory: false },
        { name: 'b.ts', path: 'completely-different/b.ts', isDirectory: false },
        { name: 'c.ts', path: 'completely-different/c.ts', isDirectory: false },
      ]),
    ];

    const eventSpy = jest.fn();
    eventBus.register('DocsFolderRelocatedEvent', {
      handle: async (event) => eventSpy(event),
    });

    const result = service.detect(candidates, existingFolder);
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()?.path).toBe('completely-different');
    expect(eventSpy).not.toHaveBeenCalled();
  });

  it('should create new folder when no existing folder provided', () => {
    const candidates = [
      createCandidate('docs', [
        { name: 'readme.md', path: 'docs/readme.md', isDirectory: false },
      ]),
    ];

    const result = service.detect(candidates);
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()?.path).toBe('docs');
  });

  it('should score documentation name highly', () => {
    const candidates = [
      createCandidate('src', [
        { name: 'main.ts', path: 'src/main.ts', isDirectory: false },
      ]),
      createCandidate('documentation', [
        { name: 'readme.md', path: 'documentation/readme.md', isDirectory: false },
      ]),
    ];

    const result = service.detect(candidates);
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()?.path).toBe('documentation');
  });

  it('should handle candidates with mixed content types', () => {
    const candidates = [
      createCandidate('docs', [
        { name: 'readme.md', path: 'docs/readme.md', isDirectory: false },
        { name: 'logo.png', path: 'docs/logo.png', isDirectory: false },
        { name: 'script.js', path: 'docs/script.js', isDirectory: false },
      ]),
    ];

    const result = service.detect(candidates);
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()?.documentCount).toBe(3);
  });
});