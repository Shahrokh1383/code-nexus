import { memo, type JSX } from 'react';

interface FileIconProps {
  name: string;
  isDirectory: boolean;
  isExpanded?: boolean;
}

const CODE_EXTS = new Set(['ts', 'tsx', 'js', 'jsx']);
const TEXT_EXTS = new Set(['json', 'md', 'txt']);
const STYLE_EXTS = new Set(['css', 'scss']);
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'svg']);

function resolveIconClass(name: string): string {
  const lastDot = name.lastIndexOf('.');
  const ext = lastDot > 0 ? name.slice(lastDot + 1).toLowerCase() : '';
  if (CODE_EXTS.has(ext)) return 'fa-file-code text-primary';
  if (TEXT_EXTS.has(ext)) return 'fa-file-lines text-info';
  if (STYLE_EXTS.has(ext)) return 'fa-file-code text-secondary';
  if (IMAGE_EXTS.has(ext)) return 'fa-file-image text-success';
  return 'fa-file-lines text-secondary';
}

function FileIconImpl({ name, isDirectory, isExpanded }: FileIconProps): JSX.Element {
  if (isDirectory) {
    return <i className={`fa-solid ${isExpanded ? 'fa-folder-open' : 'fa-folder'} text-warning`} />;
  }
  return <i className={`fa-solid ${resolveIconClass(name)}`} />;
}

export const FileIcon = memo(FileIconImpl);