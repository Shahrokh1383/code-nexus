import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { WorkspaceId } from '../../../../project/domain/value-objects/workspace-id';
import { ProjectConfig } from '../../../../project/domain/entities/project-config';
import { IProjectConfigRepository } from '../../../../project/domain/repository/project-config-repository.interface';
import { IDocFolderRepository } from '../../../domain/repository/doc-folder-repository.interface';
import { DocsFolderDetectorService } from '../../../domain/services/docs-folder-detector.service';
import { DocFolder } from '../../../domain/entities/doc-folder';
import { DocFolderId } from '../../../domain/value-objects/doc-folder-id';
import { DocFolderSignature } from '../../../domain/value-objects/doc-folder-signature';
import { DocsFolderRelocatedEvent } from '../../../domain/events/docs-folder-relocated';
import { DetectDocsFolderRelocationCommand } from '../../../application/commands/detect-docs-folder-relocation.command';
import { DetectDocsFolderRelocationHandler } from '../../../application/handlers/detect-docs-folder-relocation.handler';
import { IDocumentFolderScannerPort } from '../../../application/ports/document-folder-scanner-port.interface';

describe('DetectDocsFolderRelocationHandler', () => {
  let eventBus: EventBus;
  let handler: DetectDocsFolderRelocationHandler;
  let mockDocFolderRepo: jest.Mocked<IDocFolderRepository>;
  let mockConfigRepo: jest.Mocked<IProjectConfigRepository>;
  let mockScanner: jest.Mocked<IDocumentFolderScannerPort>;
  let detectorService: DocsFolderDetectorService;

  beforeEach(() => {
    eventBus = EventBus.getInstance();
    eventBus.clear();

    mockDocFolderRepo = {
      findByWorkspaceId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<IDocFolderRepository>;

    mockConfigRepo = {
      findByWorkspaceId: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<IProjectConfigRepository>;

    mockScanner = {
      exists: jest.fn(),
      isDirectory: jest.fn(),
      listDirectories: jest.fn(),
      scanFolder: jest.fn(),
    } as unknown as jest.Mocked<IDocumentFolderScannerPort>;

    detectorService = new DocsFolderDetectorService(eventBus);

    handler = new DetectDocsFolderRelocationHandler(
      mockDocFolderRepo,
      mockConfigRepo,
      detectorService,
      mockScanner
    );
  });

  afterEach(() => {
    eventBus.clear();
  });

  const createDocFolder = (path: string = 'docs'): DocFolder => {
    return new DocFolder(
      DocFolderId.generate(),
      path,
      new DocFolderSignature(2, ['readme.md', 'guide.md'], 1),
      2
    );
  };

    const createConfig = (): ProjectConfig => {
    return new ProjectConfig(
      new WorkspaceId('workspace-123'),
      { getOrNull: () => 'docs', getOrElse: (_v: string) => 'docs', isSome: true, isNone: false, map: jest.fn(), flatMap: jest.fn() } as any,
      [],
      '1.0'
    );
  };

  it('should fail when no docs folder is registered', async () => {
    mockDocFolderRepo.findByWorkspaceId.mockResolvedValue(null);

    const result = await handler.execute(
      new DetectDocsFolderRelocationCommand('workspace-123')
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBe('No docs folder registered for this workspace');
  });

  it('should return success when existing folder still exists', async () => {
    const docFolder = createDocFolder();
    mockDocFolderRepo.findByWorkspaceId.mockResolvedValue(docFolder);
    mockScanner.exists.mockResolvedValue(true);

    const result = await handler.execute(
      new DetectDocsFolderRelocationCommand('workspace-123')
    );

    expect(result.isSuccess).toBe(true);
    expect(mockDocFolderRepo.save).not.toHaveBeenCalled();
  });

  it('should detect relocated folder and save it', async () => {
    const existingFolder = createDocFolder('docs');
    mockDocFolderRepo.findByWorkspaceId.mockResolvedValue(existingFolder);
    mockScanner.exists.mockResolvedValue(false);
    mockScanner.listDirectories.mockResolvedValue(['src', 'documentation']);
    mockScanner.scanFolder.mockImplementation(async (path) => {
      if (path === 'documentation') {
        return [
          { name: 'readme.md', path: 'readme.md', isDirectory: false, lastModified: new Date() },
          { name: 'guide.md', path: 'guide.md', isDirectory: false, lastModified: new Date() },
        ];
      }
      return [
        { name: 'main.ts', path: 'main.ts', isDirectory: false, lastModified: new Date() },
      ];
    });

    const config = createConfig();
    mockConfigRepo.findByWorkspaceId.mockResolvedValue(config);

    const eventSpy = jest.fn();
    eventBus.register('DocsFolderRelocatedEvent', {
      handle: async (event) => eventSpy(event),
    });

    const result = await handler.execute(
      new DetectDocsFolderRelocationCommand('workspace-123')
    );

    expect(result.isSuccess).toBe(true);
    expect(mockDocFolderRepo.save).toHaveBeenCalledTimes(1);
    expect(eventSpy).toHaveBeenCalledTimes(1);
    const emittedEvent = eventSpy.mock.calls[0][0] as DocsFolderRelocatedEvent;
    expect(emittedEvent.oldPath).toBe('docs');
    expect(emittedEvent.newPath).toBe('documentation');
  });

  it('should update project config when folder is relocated', async () => {
    const existingFolder = createDocFolder('docs');
    mockDocFolderRepo.findByWorkspaceId.mockResolvedValue(existingFolder);
    mockScanner.exists.mockResolvedValue(false);
    mockScanner.listDirectories.mockResolvedValue(['documentation']);
    mockScanner.scanFolder.mockResolvedValue([
      { name: 'readme.md', path: 'readme.md', isDirectory: false, lastModified: new Date() },
      { name: 'guide.md', path: 'guide.md', isDirectory: false, lastModified: new Date() },
    ]);

    const config = createConfig();
    mockConfigRepo.findByWorkspaceId.mockResolvedValue(config);

    await handler.execute(new DetectDocsFolderRelocationCommand('workspace-123'));

    expect(mockConfigRepo.save).toHaveBeenCalled();
    const savedConfig = mockConfigRepo.save.mock.calls[0][0] as ProjectConfig;
    expect(savedConfig.docsFolderPath.getOrNull()).toBe('documentation');
  });

  it('should return failure when no relocation candidate matches', async () => {
    const existingFolder = createDocFolder('docs');
    mockDocFolderRepo.findByWorkspaceId.mockResolvedValue(existingFolder);
    mockScanner.exists.mockResolvedValue(false);
    mockScanner.listDirectories.mockResolvedValue(['completely-different']);
    mockScanner.scanFolder.mockResolvedValue([
      { name: 'a.ts', path: 'a.ts', isDirectory: false, lastModified: new Date() },
      { name: 'b.ts', path: 'b.ts', isDirectory: false, lastModified: new Date() },
      { name: 'c.ts', path: 'c.ts', isDirectory: false, lastModified: new Date() },
    ]);

    const result = await handler.execute(
      new DetectDocsFolderRelocationCommand('workspace-123')
    );

    expect(result.isSuccess).toBe(true);
    expect(mockDocFolderRepo.save).toHaveBeenCalledTimes(1);
  });
});