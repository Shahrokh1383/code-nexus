import { CodeToDocLink } from './CodeToDocLink';

export interface MigrationResult {
  migratedLinks: CodeToDocLink[];
  brokenLinkIds: string[];
}

export class LinkMigration {
  migrate(newDocumentIds: string[], existingLinks: CodeToDocLink[]): MigrationResult {
    const directLinks = existingLinks.filter((l) => l.type === 'DIRECT');
    const migratedLinks: CodeToDocLink[] = [];

    for (const oldLink of directLinks) {
      for (const newDocId of newDocumentIds) {
        const newLink = CodeToDocLink.create(oldLink.codeFileId, newDocId);
        newLink.markAsInherited();
        migratedLinks.push(newLink);
      }
    }

    return {
      migratedLinks,
      brokenLinkIds: directLinks.map((l) => l.id),
    };
  }
}