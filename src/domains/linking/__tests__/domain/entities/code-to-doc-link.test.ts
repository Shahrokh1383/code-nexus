import { DateTime } from '../../../../shared-kernel/types/date-time';
import { Maybe } from '../../../../shared-kernel/types/maybe';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { FileNodeId } from '../../../../filesystem/domain/value-objects/file-node-id';
import { LinkBrokenEvent } from '../../../domain/events/link-broken';
import { LinkCreatedEvent } from '../../../domain/events/link-created';
import { CodeToDocLink } from '../../../domain/entities/code-to-doc-link';
import { LinkId } from '../../../domain/value-objects/link-id';
import { LinkType } from '../../../domain/value-objects/link-type';

describe('CodeToDocLink', () => {
  const codeFileId = new FileNodeId('file-1');
  const documentId = DocumentId.generate();

  it('should create a direct link and emit LinkCreatedEvent', () => {
    const link = CodeToDocLink.create(codeFileId, documentId);

    expect(link.codeFileId.equals(codeFileId)).toBe(true);
    expect(link.documentId.equals(documentId)).toBe(true);
    expect(link.type.isDirect()).toBe(true);
    expect(link.migratedAt.isNone).toBe(true);

    const events = link.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(LinkCreatedEvent);
    expect((events[0] as LinkCreatedEvent).category).toBe('code');
  });

  it('should mark link as inherited and update migratedAt', () => {
    const link = CodeToDocLink.create(codeFileId, documentId);
    link.clearDomainEvents(); // Clear creation event

    link.markAsInherited();

    expect(link.type.isInherited()).toBe(true);
    expect(link.migratedAt.isSome).toBe(true);
  });

  it('should not change state if already inherited', () => {
    const link = CodeToDocLink.create(codeFileId, documentId);
    link.markAsInherited();
    const firstMigratedAt = link.migratedAt.getOrElse(DateTime.now());
    
    // Simulate time passing
    link.markAsInherited(); 
    const secondMigratedAt = link.migratedAt.getOrElse(DateTime.now());

    expect(firstMigratedAt.equals(secondMigratedAt)).toBe(true);
  });

  it('should emit LinkBrokenEvent when broken', () => {
    const link = CodeToDocLink.create(codeFileId, documentId);
    link.clearDomainEvents();

    link.break();

    const events = link.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(LinkBrokenEvent);
  });

  it('should reconstitute without emitting events', () => {
    const id = LinkId.generate();
    const link = CodeToDocLink.reconstitute(
      id, codeFileId, documentId, LinkType.inherited(), DateTime.now(), Maybe.some(DateTime.now())
    );

    expect(link.id.equals(id)).toBe(true);
    expect(link.getDomainEvents()).toHaveLength(0);
  });
});