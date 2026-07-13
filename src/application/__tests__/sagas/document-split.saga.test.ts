import { EventBus } from '../../../domains/shared-kernel/events/event-bus';
import { DocumentDeletedEvent } from '../../../domains/documentation/domain/events/document-deleted';
import { DocumentId } from '../../../domains/documentation/domain/value-objects/document-id';
import { DocumentPath } from '../../../domains/documentation/domain/value-objects/document-path';
import { DocumentSplitSaga } from '../../sagas/document-split.saga';
import { GetDocumentChildrenHandler } from '../../../domains/linking/application/handlers/get-document-children.handler';
import { MigrateLinksHandler } from '../../../domains/linking/application/handlers/migrate-links.handler';
import { IDocumentRepository } from '../../../domains/documentation/domain/repository/document-repository.interface';
import { ILinkRepository } from '../../../domains/linking/domain/repository/link-repository.interface';
import { Result } from '../../../domains/shared-kernel/types/result';
import { OrphanDetectedEvent } from '../../../domains/documentation/domain/events/orphan-detected';

describe('DocumentSplitSaga', () => {
  let saga: DocumentSplitSaga;
  let mockGetChildrenHandler: jest.Mocked<GetDocumentChildrenHandler>;
  let mockMigrateLinksHandler: jest.Mocked<MigrateLinksHandler>;
  let mockDocRepo: jest.Mocked<IDocumentRepository>;
  let mockLinkRepo: jest.Mocked<ILinkRepository>;
  let eventBus: EventBus;

  beforeEach(() => {
    mockGetChildrenHandler = { execute: jest.fn() } as any;
    mockMigrateLinksHandler = { execute: jest.fn() } as any;
    mockDocRepo = { findById: jest.fn() } as any;
    mockLinkRepo = { findByDocument: jest.fn() } as any;

    saga = new DocumentSplitSaga(
      mockGetChildrenHandler,
      mockMigrateLinksHandler,
      mockDocRepo,
      mockLinkRepo
    );
    
    eventBus = EventBus.getInstance();
    eventBus.clear();
  });

  it('should migrate links and emit OrphanDetectedEvent if child has no code links', async () => {
    const parentDocId = DocumentId.generate();
    const childDocId = DocumentId.generate();
    const childDocPath = new DocumentPath('docs/child.md');
    
    const event = new DocumentDeletedEvent(parentDocId, new DocumentPath('docs/parent.md'));

    mockGetChildrenHandler.execute.mockResolvedValue(Result.ok([childDocId.value]));
    mockMigrateLinksHandler.execute.mockResolvedValue(Result.ok(undefined));
    mockDocRepo.findById.mockResolvedValue({ id: childDocId, path: childDocPath } as any);
    mockLinkRepo.findByDocument.mockResolvedValue([]); // Zero code links

    let orphanEventEmitted = false;
    eventBus.register('OrphanDetectedEvent', {
      handle: async (e: OrphanDetectedEvent) => {
        orphanEventEmitted = true;
        expect(e.documentId.equals(childDocId)).toBe(true);
      }
    });

    saga.register();
    await eventBus.emit(event);

    expect(mockMigrateLinksHandler.execute).toHaveBeenCalledTimes(1);
    expect(orphanEventEmitted).toBe(true);
  });

  it('should NOT emit OrphanDetectedEvent if child still has code links', async () => {
    const parentDocId = DocumentId.generate();
    const childDocId = DocumentId.generate();
    
    const event = new DocumentDeletedEvent(parentDocId, new DocumentPath('docs/parent.md'));

    mockGetChildrenHandler.execute.mockResolvedValue(Result.ok([childDocId.value]));
    mockMigrateLinksHandler.execute.mockResolvedValue(Result.ok(undefined));
    mockDocRepo.findById.mockResolvedValue({ id: childDocId } as any);
    mockLinkRepo.findByDocument.mockResolvedValue([{}] as any); // Has 1 code link

    let orphanEventEmitted = false;
    eventBus.register('OrphanDetectedEvent', {
      handle: async () => { orphanEventEmitted = true; }
    });

    saga.register();
    await eventBus.emit(event);

    expect(orphanEventEmitted).toBe(false);
  });
});