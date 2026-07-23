import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { ILinkRepository } from '../../../domain/repository/link-repository.interface';
import { CreateBulkCodeLinksHandler } from '../../../application/handlers/create-bulk-code-links.handler';
import { CreateBulkCodeLinksCommand } from '../../../application/commands/create-bulk-code-links.command';

describe('CreateBulkCodeLinksHandler', () => {
  let handler: CreateBulkCodeLinksHandler;
  let mockRepo: jest.Mocked<ILinkRepository>;
  let eventBus: EventBus;

  beforeEach(() => {
    mockRepo = {
      findByCodeFileAndDocument: jest.fn(),
      save: jest.fn(),
    } as any;

    handler = new CreateBulkCodeLinksHandler(mockRepo);
    eventBus = EventBus.getInstance();
    eventBus.clear();
  });

  afterEach(() => {
    eventBus.clear();
  });

  it('should create all links when none exist', async () => {
    const command = new CreateBulkCodeLinksCommand(['file-1', 'file-2'], 'doc-1');
    mockRepo.findByCodeFileAndDocument.mockResolvedValue(null);

    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);
    const value = result.getValue()!;
    expect(value.createdCount).toBe(2);
    expect(value.skippedCount).toBe(0);
    expect(mockRepo.save).toHaveBeenCalledTimes(2);
  });

  it('should skip existing links', async () => {
    const command = new CreateBulkCodeLinksCommand(['file-1', 'file-2'], 'doc-1');
    // First call returns an existing link, second returns null
    mockRepo.findByCodeFileAndDocument
      .mockResolvedValueOnce({} as any)   // existing
      .mockResolvedValueOnce(null);       // new

    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);
    const value = result.getValue()!;
    expect(value.createdCount).toBe(1);
    expect(value.skippedCount).toBe(1);
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should emit domain events for each created link', async () => {
    const command = new CreateBulkCodeLinksCommand(['file-1'], 'doc-1');
    mockRepo.findByCodeFileAndDocument.mockResolvedValue(null);

    const emittedEvents: any[] = [];
    eventBus.register('LinkCreatedEvent', {
      handle: async (event) => {
        emittedEvents.push(event);
      },
    });

    await handler.execute(command);

    expect(emittedEvents.length).toBeGreaterThanOrEqual(1);
    const linkEvent = emittedEvents[0];
    expect(linkEvent.category).toBe('code');
  });

  it('should return failure on repository error', async () => {
    const command = new CreateBulkCodeLinksCommand(['file-1'], 'doc-1');
    mockRepo.findByCodeFileAndDocument.mockRejectedValue(new Error('DB down'));

    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toContain('DB down');
  });
});