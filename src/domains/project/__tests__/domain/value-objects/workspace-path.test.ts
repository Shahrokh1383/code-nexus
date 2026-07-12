import { WorkspacePath } from '../../../domain/value-objects/workspace-path';

describe('WorkspacePath', () => {
  it('should accept absolute Unix path', () => {
    const path = new WorkspacePath('/home/user/project');
    expect(path.value).toBe('/home/user/project');
  });

  it('should accept absolute Windows path (normalized to lowercase drive letter)', () => {
    const path = new WorkspacePath('C:/Users/project');
    expect(path.value).toBe('c:/Users/project');
  });

  it('should normalize backslashes to forward slashes and lowercase drive letter', () => {
    const path = new WorkspacePath('C:\\Users\\project');
    expect(path.value).toBe('c:/Users/project');
  });

  it('should throw on empty path', () => {
    expect(() => new WorkspacePath('')).toThrow('Workspace path cannot be empty');
  });

  it('should throw on relative path', () => {
    expect(() => new WorkspacePath('relative/path')).toThrow('Workspace path must be absolute');
  });

  it('should throw on path with traversal', () => {
    expect(() => new WorkspacePath('/home/../etc')).toThrow(
      'Workspace path contains invalid traversal segments'
    );
  });

  it('should be equal to another WorkspacePath with same value', () => {
    const p1 = new WorkspacePath('/home/user');
    const p2 = new WorkspacePath('/home/user');
    expect(p1.equals(p2)).toBe(true);
  });

  it('should return value from toString', () => {
    const path = new WorkspacePath('/project');
    expect(path.toString()).toBe('/project');
  });
});