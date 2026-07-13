import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { CodeToDocLink } from '../entities/code-to-doc-link';
import { LinksMigratedEvent } from '../events/links-migrated';

export interface MigrationResult {
  migratedLinks: CodeToDocLink[];
  brokenLinkIds: string[];
  event: LinksMigratedEvent | null;
}

export class LinkMigrationService {
  migrate(
    oldDocumentId: DocumentId, 
    newDocumentIds: DocumentId[], 
    existingLinks: CodeToDocLink[]
  ): MigrationResult {
    const directLinks = existingLinks.filter(l => l.type.isDirect());
    const migratedLinks: CodeToDocLink[] = [];
    
    for (const oldLink of directLinks) {
      for (const newDocId of newDocumentIds) {
        const newLink = CodeToDocLink.create(oldLink.codeFileId, newDocId);
        newLink.markAsInherited();
        migratedLinks.push(newLink);
      }
    }

    let event: LinksMigratedEvent | null = null;
    if (migratedLinks.length > 0) {
      event = new LinksMigratedEvent(
        oldDocumentId.value,
        newDocumentIds.map(id => id.value),
        migratedLinks.map(l => l.id.value)
      );
    }

    return {
      migratedLinks,
      brokenLinkIds: directLinks.map(l => l.id.value),
      event
    };
  }
}