import { CommitId } from '../../../domain/value-objects/commit-id';

describe('CommitId', () => {
  it('should create with valid value', () => {
    const id = new CommitId('commit-123');
    expect(id.value).toBe('commit-123');
  });

  it('should throw on empty value', () => {
    expect(() => new CommitId('')).toThrow('Identifier value cannot be empty');
  });

  it('should equal same value', () => {
    const a = new CommitId('commit-123');
    const b = new CommitId('commit-123');
    expect(a.equals(b)).toBe(true);
  });

  it('should not equal different value', () => {
    const a = new CommitId('commit-123');
    const b = new CommitId('commit-456');
    expect(a.equals(b)).toBe(false);
  });

  it('should convert to string', () => {
    const id = new CommitId('commit-123');
    expect(id.toString()).toBe('commit-123');
  });
});