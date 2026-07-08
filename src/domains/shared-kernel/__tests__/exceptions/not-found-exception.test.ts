import { NotFoundException } from '../../exceptions/not-found-exception';

describe('NotFoundException', () => {
  it('should format message with entity and identifier', () => {
    const ex = new NotFoundException('Document', 'doc-123');
    expect(ex.code).toBe('NOT_FOUND');
    expect(ex.message).toBe("Document with identifier 'doc-123' was not found");
    expect(ex.context).toEqual({ entity: 'Document', identifier: 'doc-123' });
    expect(ex.name).toBe('NotFoundException');
  });
});