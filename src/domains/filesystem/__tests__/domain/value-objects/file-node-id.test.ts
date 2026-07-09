import { FileNodeId } from '../../../domain/value-objects/file-node-id';

describe('FileNodeId', () => {
  it('should create a valid FileNodeId', () => {
    const id = new FileNodeId('file-123');
    expect(id.value).toBe('file-123');
  });

  it('should throw when value is empty', () => {
    expect(() => new FileNodeId('')).toThrow('Identifier value cannot be empty');
  });

  it('should throw when value is whitespace only', () => {
    expect(() => new FileNodeId('   ')).toThrow('Identifier value cannot be empty');
  });

  it('should equal another FileNodeId with the same value', () => {
    const id1 = new FileNodeId('abc');
    const id2 = new FileNodeId('abc');
    expect(id1.equals(id2)).toBe(true);
  });

  it('should not equal another FileNodeId with a different value', () => {
    const id1 = new FileNodeId('abc');
    const id2 = new FileNodeId('def');
    expect(id1.equals(id2)).toBe(false);
  });

  it('should return value from toString', () => {
    const id = new FileNodeId('xyz');
    expect(id.toString()).toBe('xyz');
  });
});