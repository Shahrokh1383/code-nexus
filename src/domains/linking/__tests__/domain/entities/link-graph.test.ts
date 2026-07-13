import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { FileNodeId } from '../../../../filesystem/domain/value-objects/file-node-id';
import { LinksMigratedEvent } from '../../../domain/events/links-migrated';
import { CodeToDocLink } from '../../../domain/entities/code-to-doc-link';
import { LinkGraph } from '../../../domain/entities/link-graph';

describe('LinkGraph', () => {
  it('should migrate code links from parent to children and emit LinksMigratedEvent', () => {
    const graph = LinkGraph.create();
    const parentDocId = DocumentId.generate();
    const child1DocId = DocumentId.generate();
    const child2DocId = DocumentId.generate();
    const codeFileId = new FileNodeId('file-1');

    const parentLink = CodeToDocLink.create(codeFileId, parentDocId);
    graph.addCodeLink(parentLink);
    graph.clearDomainEvents(); // Clear creation events

    // Execute migration
    const migratedLinks = graph.migrateCodeLinksFromParent(parentDocId, [child1DocId, child2DocId]);

    // Assertions
    expect(migratedLinks).toHaveLength(2);
    expect(migratedLinks[0].documentId.equals(child1DocId)).toBe(true);
    expect(migratedLinks[0].type.isInherited()).toBe(true);
    expect(migratedLinks[1].documentId.equals(child2DocId)).toBe(true);

    // Parent link should be removed
    expect(graph.findByCodeFile(codeFileId)).toHaveLength(2);
    expect(graph.findByDocument(parentDocId).codeLinks).toHaveLength(0);

    // Event should be emitted
    const events = graph.getDomainEvents();
    expect(events).toHaveLength(4);
    
    const migratedEvent = events.find(e => e instanceof LinksMigratedEvent) as LinksMigratedEvent;
    expect(migratedEvent).toBeDefined();
    expect(migratedEvent.parentDocumentId).toBe(parentDocId.value);
    expect(migratedEvent.childDocumentIds).toHaveLength(2);
    expect(migratedEvent.migratedLinkIds).toHaveLength(2);
    
    // Verify the individual events are present
    const createdEvents = events.filter(e => e.eventType === 'LinkCreatedEvent');
    expect(createdEvents).toHaveLength(2);
    const brokenEvents = events.filter(e => e.eventType === 'LinkBrokenEvent');
    expect(brokenEvents).toHaveLength(1);
  });

  it('should correctly find links by document', () => {
    const graph = LinkGraph.create();
    const docId = DocumentId.generate();
    const codeFileId = new FileNodeId('file-1');

    graph.addCodeLink(CodeToDocLink.create(codeFileId, docId));
    graph.clearDomainEvents();

    const result = graph.findByDocument(docId);
    expect(result.codeLinks).toHaveLength(1);
    expect(result.childDocumentLinks).toHaveLength(0);
    expect(result.parentDocumentLinks).toHaveLength(0);
  });
});