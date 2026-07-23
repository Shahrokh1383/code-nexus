import { LinksMigratedEvent } from '../../../domain/events/links-migrated';

describe('LinksMigratedEvent', () => {
  it('should record the parent, children, and migrated link ids', () => {
    const event = new LinksMigratedEvent(
      'parent-doc',
      ['child-1', 'child-2'],
      ['link-10', 'link-20']
    );

    expect(event.eventType).toBe('LinksMigratedEvent');
    expect(event.parentDocumentId).toBe('parent-doc');
    expect(event.childDocumentIds).toEqual(['child-1', 'child-2']);
    expect(event.migratedLinkIds).toEqual(['link-10', 'link-20']);
  });
});