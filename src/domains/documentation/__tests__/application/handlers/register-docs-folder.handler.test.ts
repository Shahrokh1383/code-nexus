import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { WorkspaceId } from '../../../../project/domain/value-objects/workspace-id';
import { ProjectConfig } from '../../../../project/domain/entities/project-config';
import { IProjectConfigRepository } from '../../../../project/domain/repository/project-config-repository.interface';
import { IDocFolderRepository } from '../../../domain/repository/doc-folder-repository.interface';
import { IDocumentRepository } from '../../../domain/repository/document-repository.interface';
import { DocsFolderDetectorService } from '../../../domain/services/docs-folder-detector.service';
import { RegisterDocsFolderCommand } from '../../../application/commands/register-docs-folder.command';
import { RegisterDocsFolderHandler } from '../../../application/handlers/register-docs-folder.handler';
import { IDocumentFolderScannerPort } from '../../../application/ports/document-folder-scanner-port.interface';

describe('RegisterDocsFolderHandler', () => {
  let eventBus: EventBus;
  let handler: RegisterDocsFolderHandler;
  let mockDocFolderRepo: jest.Mocked<IDocFolderRepository>;
  let mockDocumentRepo: jest.Mocked<IDocumentRepository>;
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

    mockDocumentRepo = {
      findById: jest.fn(),
      findByPath: jest.fn(),
      findAll: jest.fn(),
      findOrphaned: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findByDocFolderPath: jest.fn(),
    } as unknown as jest.Mocked<IDocumentRepository>;

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

    handler = new RegisterDocsFolderHandler(
      mockDocFolderRepo,
      mockDocumentRepo,
      mockConfigRepo,
      detectorService,
      mockScanner
    );
  });

  afterEach(() => {
    eventBus.clear();
  });

  const createConfig = (): ProjectConfig => {
    return new ProjectConfig(
      new WorkspaceId('workspace-123'),
      { getOrNull: () => null, getOrElse: (v: string) => v, isSome: false, isNone: true, map: jest.fn(), flatMap: jest.fn() } as any,
      [],
      '1.0'
    );
  };

  it('should fail when project config is not found', async () => {
    mockConfigRepo.findByWorkspaceId.mockResolvedValue(null);

    const result = await handler.execute(
      new RegisterDocsFolderCommand('workspace-123')
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBe('Project configuration not found');
  });

  it('should register with suggested path when valid', async () => {
    const config = createConfig();
    mockConfigRepo.findByWorkspaceId.mockResolvedValue(config);
    mockScanner.exists.mockResolvedValue(true);
    mockScanner.isDirectory.mockResolvedValue(true);
    mockScanner.scanFolder.mockResolvedValue([
      { name: 'readme.md', path: 'readme.md', isDirectory: false, lastModified: new Date('2024-01-01') },
    ]);

    const result = await handler.execute(
      new RegisterDocsFolderCommand('workspace-123', 'docs')
    );

    expect(result.isSuccess).toBe(true);
    expect(mockDocFolderRepo.save).toHaveBeenCalledTimes(1);
    expect(mockConfigRepo.save).toHaveBeenCalledTimes(1);
    expect(mockDocumentRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should fail when suggested path does not exist', async () => {
    const config = createConfig();
    mockConfigRepo.findByWorkspaceId.mockResolvedValue(config);
    mockScanner.exists.mockResolvedValue(false);

    const result = await handler.execute(
      new RegisterDocsFolderCommand('workspace-123', 'missing')
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('does not exist');
  });

  it('should fail when suggested path is not a directory', async () => {
    const config = createConfig();
    mockConfigRepo.findByWorkspaceId.mockResolvedValue(config);
    mockScanner.exists.mockResolvedValue(true);
    mockScanner.isDirectory.mockResolvedValue(false);

    const result = await handler.execute(
      new RegisterDocsFolderCommand('workspace-123', 'file.txt')
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('not a directory');
  });

  it('should auto-detect docs folder when no suggested path', async () => {
    const config = createConfig();
    mockConfigRepo.findByWorkspaceId.mockResolvedValue(config);
    mockScanner.listDirectories.mockResolvedValue(['src', 'docs']);
    mockScanner.scanFolder.mockImplementation(async (path) => {
      if (path === 'docs') {
        return [
          { name: 'readme.md', path: 'readme.md', isDirectory: false, lastModified: new Date() },
        ];
      }
      return [
        { name: 'main.ts', path: 'main.ts', isDirectory: false, lastModified: new Date() },
      ];
    });

    const result = await handler.execute(
      new RegisterDocsFolderCommand('workspace-123')
    );

    expect(result.isSuccess).toBe(true);
    expect(mockDocFolderRepo.save).toHaveBeenCalledTimes(1);
    expect(mockConfigRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should emit DocumentDiscoveredEvent for each document', async () => {
    const config = createConfig();
    mockConfigRepo.findByWorkspaceId.mockResolvedValue(config);
    mockScanner.exists.mockResolvedValue(true);
    mockScanner.isDirectory.mockResolvedValue(true);
    mockScanner.scanFolder.mockResolvedValue([
      { name: 'readme.md', path: 'readme.md', isDirectory: false, lastModified: new Date() },
      { name: 'guide.md', path: 'guide.md', isDirectory: false, lastModified: new Date() },
    ]);

    const eventSpy = jest.fn();
    eventBus.register('DocumentDiscoveredEvent', {
      handle: async (event) => eventSpy(event),
    });

    await handler.execute(new RegisterDocsFolderCommand('workspace-123', 'docs'));

    expect(eventSpy).toHaveBeenCalledTimes(2);
    expect(eventSpy.mock.calls[0][0].title).toBe('Readme');
    expect(eventSpy.mock.calls[1][0].title).toBe('Guide');
  });

  it('should emit OrphanDetectedEvent for documents with zero links', async () => {
    const config = createConfig();
    mockConfigRepo.findByWorkspaceId.mockResolvedValue(config);
    mockScanner.exists.mockResolvedValue(true);
    mockScanner.isDirectory.mockResolvedValue(true);
    mockScanner.scanFolder.mockResolvedValue([
      { name: 'readme.md', path: 'readme.md', isDirectory: false, lastModified: new Date() },
    ]);

    const eventSpy = jest.fn();
    eventBus.register('OrphanDetectedEvent', {
      handle: async (event) => eventSpy(event),
    });

    await handler.execute(new RegisterDocsFolderCommand('workspace-123', 'docs'));

    expect(eventSpy).toHaveBeenCalledTimes(1);
  });

  it('should update project config with docs folder path', async () => {
    const config = createConfig();
    mockConfigRepo.findByWorkspaceId.mockResolvedValue(config);
    mockScanner.exists.mockResolvedValue(true);
    mockScanner.isDirectory.mockResolvedValue(true);
    mockScanner.scanFolder.mockResolvedValue([
      { name: 'readme.md', path: 'readme.md', isDirectory: false, lastModified: new Date() },
    ]);

    await handler.execute(new RegisterDocsFolderCommand('workspace-123', 'docs'));

    expect(mockConfigRepo.save).toHaveBeenCalled();
    const savedConfig = mockConfigRepo.save.mock.calls[0][0] as ProjectConfig;
    expect(savedConfig.docsFolderPath.getOrNull()).toBe('docs');
  });

  it('should skip non-document files when creating documents', async () => {
    const config = createConfig();
    mockConfigRepo.findByWorkspaceId.mockResolvedValue(config);
    mockScanner.exists.mockResolvedValue(true);
    mockScanner.isDirectory.mockResolvedValue(true);
    mockScanner.scanFolder.mockResolvedValue([
      { name: 'readme.md', path: 'readme.md', isDirectory: false, lastModified: new Date() },
      { name: 'logo.png', path: 'logo.png', isDirectory: false, lastModified: new Date() },
      { name: 'assets', path: 'assets', isDirectory: true, lastModified: new Date() },
    ]);

    await handler.execute(new RegisterDocsFolderCommand('workspace-123', 'docs'));

    expect(mockDocumentRepo.save).toHaveBeenCalledTimes(1);
  });
});