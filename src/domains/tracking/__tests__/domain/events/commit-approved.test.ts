import { CommitApprovedEvent } from '../../../domain/events/commit-approved';
import { CommitId } from '../../../domain/value-objects/commit-id';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';

describe('CommitApprovedEvent', () => {
  it('should create with correct properties', () => {
    const commitId = new CommitId('commit-1');
    const documentId = new DocumentId('doc-1');
    const filePaths = [new FilePath('src/a.ts'), new FilePath('src/b.ts')];

    const event = new CommitApprovedEvent(commitId, documentId, filePaths);

    expect(event.eventType).toBe('CommitApprovedEvent');
    expect(event.commitId.equals(commitId)).toBe(true);
    expect(event.documentId.equals(documentId)).toBe(true);
    expect(event.filePaths.length).toBe(2);
    expect(event.filePaths[0].value).toBe('src/a.ts');
  });

  it('should have eventId and occurredOn', () => {
    const event = new CommitApprovedEvent(
      new CommitId('commit-1'),
      new DocumentId('doc-1'),
      []
    );
    expect(event.eventId).toBeDefined();
    expect(event.occurredOn).toBeDefined();
  });
});