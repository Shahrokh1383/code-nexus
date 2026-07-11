import { ReviewRequiredEvent, ChangeType } from '../../../domain/events/review-required';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';

describe('ReviewRequiredEvent', () => {
  it('should create with correct properties', () => {
    const documentId = new DocumentId('doc-1');
    const filePath = new FilePath('src/app.ts');
    const changeType: ChangeType = 'OUTDATED';

    const event = new ReviewRequiredEvent(documentId, filePath, changeType);

    expect(event.eventType).toBe('ReviewRequiredEvent');
    expect(event.documentId.equals(documentId)).toBe(true);
    expect(event.filePath.equals(filePath)).toBe(true);
    expect(event.changeType).toBe('OUTDATED');
  });

  it('should support all change types', () => {
    const types: ChangeType[] = ['OUTDATED', 'ORPHAN', 'UNLINKED'];
    types.forEach((type) => {
      const event = new ReviewRequiredEvent(
        new DocumentId('doc-1'),
        new FilePath('src/app.ts'),
        type
      );
      expect(event.changeType).toBe(type);
    });
  });

  it('should have eventId and occurredOn', () => {
    const event = new ReviewRequiredEvent(
      new DocumentId('doc-1'),
      new FilePath('src/app.ts'),
      'OUTDATED'
    );
    expect(event.eventId).toBeDefined();
    expect(event.occurredOn).toBeDefined();
  });
});