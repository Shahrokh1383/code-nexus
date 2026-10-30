import { DomainException } from '../../../shared/errors/domain-exception';
import { PathUtils } from '../../../shared/utils/path-utils';

/**
 * Relative-path validation for workspace-scoped paths (ports the legacy
 * FilePath value object invariants). Every path stored in `.doclink` and
 * every event payload passes through here.
 */
export function validateRelativePath(raw: string): string {
  const normalized = PathUtils.normalize(raw);

  if (!normalized || normalized.length === 0) {
    throw new DomainException('FILE_PATH_EMPTY', 'File path cannot be empty');
  }

  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
    throw new DomainException(
      'FILE_PATH_ABSOLUTE',
      'File path must be relative to workspace root'
    );
  }

  if (normalized.includes('..')) {
    throw new DomainException(
      'FILE_PATH_TRAVERSAL',
      'File path contains invalid traversal segments'
    );
  }

  return normalized;
}

export function pathNameOf(path: string): string {
  if (path === '.') {
    return '.';
  }
  const segments = path.split('/');
  return segments[segments.length - 1] ?? '';
}

export function parentPathOf(path: string): string {
  if (path === '.') {
    return '.';
  }
  const segments = path.split('/');
  segments.pop();
  return segments.join('/') || '.';
}