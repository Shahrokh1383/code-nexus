import { type JSX } from 'react';

interface FileIconProps {
  name: string;
  isDirectory: boolean;
  isExpanded?: boolean;
}

export function FileIcon({ name, isDirectory, isExpanded }: FileIconProps): JSX.Element {
  if (isDirectory) {
    return <i className={`fa-solid ${isExpanded ? 'fa-folder-open' : 'fa-folder'} text-warning`} />;
  }

  const ext = name.split('.').pop()?.toLowerCase() || '';
  let iconClass = 'fa-file-lines text-secondary';

  if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) iconClass = 'fa-file-code text-primary';
  else if (['json', 'md', 'txt'].includes(ext)) iconClass = 'fa-file-lines text-info';
  else if (['css', 'scss'].includes(ext)) iconClass = 'fa-file-code text-secondary';
  else if (['png', 'jpg', 'jpeg', 'svg'].includes(ext)) iconClass = 'fa-file-image text-success';

  return <i className={`fa-solid ${iconClass}`} />;
}