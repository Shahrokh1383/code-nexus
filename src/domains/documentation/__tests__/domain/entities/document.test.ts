import { DateTime } from '@/domains/shared-kernel/types/date-time';
import { Document } from '../../../domain/entities/document';
import { DocumentId } from '../../../domain/value-objects/document-id';
import { DocumentPath } from '../../../domain/value-objects/document-path';

describe('Document', () => {
  const createDocument = (linkCount: number = 0): Document => {
    return new Document(
      DocumentId.generate(),
      new DocumentPath('docs/readme.md'),
      'Readme',
      DateTime.now(),
      linkCount
    );
  };

  it('should create a document with all properties', () => {
    const id = DocumentId.generate();
    const path = new DocumentPath('docs/guide.md');
    const lastModified = DateTime.now();

    const doc = new Document(id, path, 'Guide', lastModified, 2);

    expect(doc.id).toBe(id);
    expect(doc.path).toBe(path);
    expect(doc.title).toBe('Guide');
    expect(doc.lastModified).toBe(lastModified);
    expect(doc.linkCount).toBe(2);
    expect(doc.isOrphaned).toBe(false);
  });

  it('should mark document as orphaned when link count is zero', () => {
    const doc = createDocument(0);
    expect(doc.isOrphaned).toBe(true);
  });

  it('should mark document as not orphaned when link count is positive', () => {
    const doc = createDocument(3);
    expect(doc.isOrphaned).toBe(false);
  });

  it('should reject empty title', () => {
    expect(() => createDocument().updateTitle('')).toThrow(
      'Document title cannot be empty'
    );
  });

  it('should reject whitespace-only title', () => {
    expect(() => createDocument().updateTitle('   ')).toThrow(
      'Document title cannot be empty'
    );
  });

  it('should update title', () => {
    const doc = createDocument();
    doc.updateTitle('New Title');
    expect(doc.title).toBe('New Title');
  });

  it('should trim title on update', () => {
    const doc = createDocument();
    doc.updateTitle('  Trimmed  ');
    expect(doc.title).toBe('Trimmed');
  });

  it('should mark as orphaned', () => {
    const doc = createDocument(3);
    doc.markAsOrphaned();
    expect(doc.isOrphaned).toBe(true);
    expect(doc.linkCount).toBe(0);
  });

  it('should mark as linked', () => {
    const doc = createDocument(0);
    doc.markAsLinked();
    expect(doc.isOrphaned).toBe(false);
  });

  it('should update link count and orphan status', () => {
    const doc = createDocument(0);
    doc.updateLinkCount(5);
    expect(doc.linkCount).toBe(5);
    expect(doc.isOrphaned).toBe(false);
  });

  it('should mark as orphaned when link count updated to zero', () => {
    const doc = createDocument(5);
    doc.updateLinkCount(0);
    expect(doc.isOrphaned).toBe(true);
  });

  it('should reject negative link count', () => {
    expect(() => createDocument().updateLinkCount(-1)).toThrow(
      'Link count cannot be negative'
    );
  });

  it('should reject negative link count in constructor', () => {
    expect(() => new Document(
      DocumentId.generate(),
      new DocumentPath('docs/test.md'),
      'Test',
      DateTime.now(),
      -1
    )).toThrow('Link count cannot be negative');
  });

  it('should update last modified', () => {
    const doc = createDocument();
    const newDate = DateTime.fromISO('2024-01-01T00:00:00.000Z');
    doc.updateLastModified(newDate);
    expect(doc.lastModified.equals(newDate)).toBe(true);
  });
});