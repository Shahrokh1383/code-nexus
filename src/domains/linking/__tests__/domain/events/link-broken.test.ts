import { LinkBrokenEvent } from '../../../domain/events/link-broken';
import { LinkId } from '../../../domain/value-objects/link-id';

describe('LinkBrokenEvent', () => {
  it('should store the link id, category, and source/target ids', () => {
    const linkId = LinkId.generate();
    const event = new LinkBrokenEvent(linkId, 'code', 'file-1', 'doc-1');

    expect(event.eventType).toBe('LinkBrokenEvent');
    expect(event.linkId).toBe(linkId);
    expect(event.category).toBe('code');
    expect(event.sourceId).toBe('file-1');
    expect(event.targetId).toBe('doc-1');
  });
});