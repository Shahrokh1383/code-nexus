import { LinkCreatedEvent, LinkCategory } from '../../../domain/events/link-created';
import { LinkId } from '../../../domain/value-objects/link-id';

describe('LinkCreatedEvent', () => {
  it('should contain the link id, category, and source/target ids', () => {
    const linkId = LinkId.generate();
    const category: LinkCategory = 'code';
    const event = new LinkCreatedEvent(linkId, category, 'file-1', 'doc-1');

    expect(event.eventType).toBe('LinkCreatedEvent');
    expect(event.linkId).toBe(linkId);
    expect(event.category).toBe('code');
    expect(event.sourceId).toBe('file-1');
    expect(event.targetId).toBe('doc-1');
  });

  it('should work for document-to-document links', () => {
    const linkId = LinkId.generate();
    const event = new LinkCreatedEvent(linkId, 'doc', 'doc-parent', 'doc-child');

    expect(event.category).toBe('doc');
    expect(event.sourceId).toBe('doc-parent');
  });
});