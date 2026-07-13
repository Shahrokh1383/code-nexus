import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { FileNodeId } from '../../../filesystem/domain/value-objects/file-node-id';
import { CodeToDocLink } from '../../domain/entities/code-to-doc-link';
import { LinkMigrationService } from '../../domain/services/link-migration.service';

describe('LinkMigrationService', () => {
  let service: LinkMigrationService;

  beforeEach(() => {
    service = new LinkMigrationService();
  });

  it('should migrate DIRECT links to new documents and mark them as INHERITED', () => {
    const oldDocId = DocumentId.generate();
    const newDoc1 = DocumentId.generate();
    const newDoc2 = DocumentId.generate();
    const codeFileId = new FileNodeId('file-1');

    const existingLink = CodeToDocLink.create(codeFileId, oldDocId);
    existingLink.clearDomainEvents(); 

    const result = service.migrate(oldDocId, [newDoc1, newDoc2], [existingLink]);

    expect(result.migratedLinks).toHaveLength(2);
    expect(result.migratedLinks[0].documentId.equals(newDoc1)).toBe(true);
    expect(result.migratedLinks[0].type.isInherited()).toBe(true);
    expect(result.migratedLinks[1].documentId.equals(newDoc2)).toBe(true);
    
    expect(result.brokenLinkIds).toContain(existingLink.id.value);
    expect(result.event).not.toBeNull();
    expect(result.event!.childDocumentIds).toHaveLength(2);
  });

  it('should ignore INHERITED links during migration', () => {
    const oldDocId = DocumentId.generate();
    const newDocId = DocumentId.generate();
    const codeFileId = new FileNodeId('file-1');

    const existingLink = CodeToDocLink.create(codeFileId, oldDocId);
    existingLink.markAsInherited(); 
    existingLink.clearDomainEvents();

    const result = service.migrate(oldDocId, [newDocId], [existingLink]);

    expect(result.migratedLinks).toHaveLength(0);
    expect(result.brokenLinkIds).toHaveLength(0);
    expect(result.event).toBeNull();
  });
});