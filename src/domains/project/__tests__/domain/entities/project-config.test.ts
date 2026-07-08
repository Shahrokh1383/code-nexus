import { ProjectConfig } from '../../../domain/entities/project-config';
import { WorkspaceId } from '../../../domain/value-objects/workspace-id';
import { Maybe } from '../../../../shared-kernel/types/maybe';

describe('ProjectConfig', () => {
  const createConfig = (): ProjectConfig => {
    return new ProjectConfig(
      new WorkspaceId('ws-1'),
      Maybe.some('docs'),
      ['node_modules/', '.git/'],
      '1.0'
    );
  };

  it('should expose all properties', () => {
    const config = createConfig();
    expect(config.workspaceId.value).toBe('ws-1');
    expect(config.docsFolderPath.getOrNull()).toBe('docs');
    expect(config.ignorePatterns).toEqual(['node_modules/', '.git/']);
    expect(config.schemaVersion).toBe('1.0');
  });

  it('should update docs folder path', () => {
    const config = createConfig();
    config.updateDocsFolderPath('documentation');
    expect(config.docsFolderPath.getOrNull()).toBe('documentation');
  });

  it('should add ignore pattern', () => {
    const config = createConfig();
    config.addIgnorePattern('dist/');
    expect(config.ignorePatterns).toContain('dist/');
  });

  it('should not add duplicate ignore pattern', () => {
    const config = createConfig();
    config.addIgnorePattern('node_modules/');
    expect(config.ignorePatterns.filter((p) => p === 'node_modules/').length).toBe(1);
  });

  it('should remove ignore pattern', () => {
    const config = createConfig();
    config.removeIgnorePattern('.git/');
    expect(config.ignorePatterns).not.toContain('.git/');
  });

  it('should return copy of ignore patterns', () => {
    const config = createConfig();
    const patterns = config.ignorePatterns;
    patterns.push('new');
    expect(config.ignorePatterns).not.toContain('new');
  });
});