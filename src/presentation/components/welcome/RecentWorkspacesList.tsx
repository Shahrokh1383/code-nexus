import { type JSX, memo } from 'react';
import { RecentWorkspace } from '../../hooks/useRecentWorkspaces';

interface RecentWorkspacesListProps {
  recents: RecentWorkspace[];
  onSelect: (rootPath: string) => void;
  onRemove: (workspaceId: string) => void;
}

const formatRelativeDate = (dateString: string): string => {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
};

const getFolderName = (rootPath: string): string => {
  const parts = rootPath.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] || rootPath;
};

export const RecentWorkspacesList = memo(function RecentWorkspacesList({
  recents,
  onSelect,
  onRemove,
}: RecentWorkspacesListProps): JSX.Element {
  if (recents.length === 0) {
    return <></>;
  }

  return (
    <div className="recent-workspaces">
      <h3 className="recent-workspaces__title">Recent Projects</h3>
      <ul className="recent-workspaces__list">
        {recents.map((ws) => (
          <li key={ws.id} className="recent-workspaces__item">
            <button
              className="recent-workspaces__open"
              onClick={() => onSelect(ws.rootPath)}
              aria-label={`Open ${getFolderName(ws.rootPath)}`}
            >
              <i className="fa-solid fa-folder text-warning" />
              <div className="recent-workspaces__info">
                <span className="recent-workspaces__name">
                  {getFolderName(ws.rootPath)}
                </span>
                <span className="recent-workspaces__path">{ws.rootPath}</span>
              </div>
              <span className="recent-workspaces__date">
                {formatRelativeDate(ws.lastOpened)}
              </span>
            </button>
            <button
              className="recent-workspaces__remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(ws.id);
              }}
              aria-label={`Remove ${getFolderName(ws.rootPath)} from recent`}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});