import { WorkspaceId } from '../../../domain/value-objects/workspace-id';

describe('WorkspaceId', () => {
  it('should create with a valid UUID string', () => {
    const id = new WorkspaceId('550e8400-e29b-41d4-a716-446655440000');
    expect(id.value).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('should throw on empty string', () => {
    expect(() => new WorkspaceId('')).toThrow('Identifier value cannot be empty');
  });

  it('should throw on whitespace-only string', () => {
    expect(() => new WorkspaceId('   ')).toThrow('Identifier value cannot be empty');
  });

  it('should trim whitespace', () => {
    const id = new WorkspaceId('  abc  ');
    expect(id.value).toBe('abc');
  });

  it('should return value from toString', () => {
    const id = new WorkspaceId('test-id');
    expect(id.toString()).toBe('test-id');
  });

  it('should be equal to another WorkspaceId with same value', () => {
    const id1 = new WorkspaceId('same');
    const id2 = new WorkspaceId('same');
    expect(id1.equals(id2)).toBe(true);
  });

  it('should not be equal to another WorkspaceId with different value', () => {
    const id1 = new WorkspaceId('a');
    const id2 = new WorkspaceId('b');
    expect(id1.equals(id2)).toBe(false);
  });
});