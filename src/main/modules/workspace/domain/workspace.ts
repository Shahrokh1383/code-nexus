import { DomainException } from '../../../shared/errors/domain-exception';
import { PathUtils } from '../../../shared/utils/path-utils';

/**
 * Workspace root path validation (ports the legacy WorkspacePath value object).
 * The normalized absolute root path doubles as the stable workspace ID.
 */
export function normalizeWorkspaceRoot(raw: string): string {
  const normalized = PathUtils.normalize(raw);

  if (!normalized || normalized.length === 0) {
    throw new DomainException('WORKSPACE_PATH_EMPTY', 'Workspace path cannot be empty');
  }

  const isAbsoluteUnix = normalized.startsWith('/');
  const isAbsoluteWindows = /^[A-Za-z]:\//.test(normalized);
  if (!isAbsoluteUnix && !isAbsoluteWindows) {
    throw new DomainException(
      'WORKSPACE_PATH_NOT_ABSOLUTE',
      'Workspace path must be absolute'
    );
  }

  if (normalized.includes('..')) {
    throw new DomainException(
      'WORKSPACE_PATH_TRAVERSAL',
      'Workspace path contains invalid traversal segments'
    );
  }

  return normalized;
}

export function workspaceFolderName(rootPath: string): string {
  const segments = rootPath.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? 'Workspace';
}