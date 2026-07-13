import { DateTime } from '../../../../shared-kernel/types/date-time';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { DocumentLinkBrokenEvent } from '../../../domain/events/document-link-broken';
import { DocumentLinkCreatedEvent } from '../../../domain/events/document-link-created';
import { DocumentToDocumentLink } from '../../../domain/entities/document-to-document-link';
import { DocumentLinkId } from '../../../domain/value-objects/document-link-id';
import { LinkType } from '../../../domain/value-objects/link-type';

describe('DocumentToDocumentLink Entity', () => {
  const parentDocId = DocumentId.generate();
  const childDocId = DocumentId.generate();

  it('should create a direct link and emit DocumentLinkCreatedEvent', () => {
    const link = DocumentToDocumentLink.create(parentDocId, childDocId);

    // Verify state
    expect(link.parentDocumentId.equals(parentDocId)).toBe(true);
    expect(link.childDocumentId.equals(childDocId)).toBe(true);
    expect(link.type.isDirect()).toBe(true);

    // Verify event emission
    const events = link.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(DocumentLinkCreatedEvent);
    
    const createdEvent = events[0] as DocumentLinkCreatedEvent;
    expect(createdEvent.linkId.equals(link.id)).toBe(true);
    expect(createdEvent.parentDocumentId).toBe(parentDocId.value);
    expect(createdEvent.childDocumentId).toBe(childDocId.value);
  });

  it('should mark link as inherited and update type', () => {
    const link = DocumentToDocumentLink.create(parentDocId, childDocId);
    link.clearDomainEvents(); // Clear creation event to isolate this test

    link.markAsInherited();

    expect(link.type.isInherited()).toBe(true);
  });

  it('should be idempotent when marking as inherited multiple times', () => {
    const link = DocumentToDocumentLink.create(parentDocId, childDocId);
    
    link.markAsInherited();
    const typeAfterFirstCall = link.type;
    
    // Attempt to mark as inherited again
    link.markAsInherited(); 
    const typeAfterSecondCall = link.type;

    expect(typeAfterFirstCall.equals(typeAfterSecondCall)).toBe(true);
    expect(link.type.isInherited()).toBe(true);
  });

  it('should emit DocumentLinkBrokenEvent when broken', () => {
    const link = DocumentToDocumentLink.create(parentDocId, childDocId);
    link.clearDomainEvents(); // Clear creation event

    link.break();

    const events = link.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(DocumentLinkBrokenEvent);
    
    const brokenEvent = events[0] as DocumentLinkBrokenEvent;
    expect(brokenEvent.linkId.equals(link.id)).toBe(true);
    expect(brokenEvent.parentDocumentId).toBe(parentDocId.value);
    expect(brokenEvent.childDocumentId).toBe(childDocId.value);
  });

  it('should reconstitute from persistence without emitting domain events', () => {
    const id = DocumentLinkId.generate();
    const createdAt = DateTime.now();
    
    const link = DocumentToDocumentLink.reconstitute(
      id, 
      parentDocId, 
      childDocId, 
      LinkType.inherited(), 
      createdAt
    );

    // Verify state
    expect(link.id.equals(id)).toBe(true);
    expect(link.parentDocumentId.equals(parentDocId)).toBe(true);
    expect(link.childDocumentId.equals(childDocId)).toBe(true);
    expect(link.type.isInherited()).toBe(true);
    expect(link.createdAt.toDate().getTime()).toBe(createdAt.toDate().getTime());

    // Verify no events are emitted during reconstitution
    expect(link.getDomainEvents()).toHaveLength(0);
  });
});