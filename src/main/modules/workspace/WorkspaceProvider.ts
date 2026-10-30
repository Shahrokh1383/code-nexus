import type { ModuleProvider } from '../../kernel/module-provider';
import type { ServiceContainer } from '../../kernel/service-container';
import { AtomicJsonFileToken } from '../../shared/persistence/atomic-json-file';
import { EventBusToken } from '../../shared/event-bus/event-bus';
import { LoggerToken } from '../../shared/logger/logger';
import { DoclinkFolder } from './infrastructure/doclink-folder';
import { WorkspaceStore } from './infrastructure/workspace-store';
import { ConfigStore } from './infrastructure/config-store';
import { RecentWorkspacesStore } from './infrastructure/recent-workspaces-store';
import { WorkspaceService } from './services/WorkspaceService';
import { WorkspaceServiceToken } from './services/contracts/WorkspaceServiceContract';
import { FileSystemServiceToken } from '../filesystem/services/contracts/FileSystemServiceContract';
import { registerWorkspaceIpc } from './ipc';

export class WorkspaceProvider implements ModuleProvider {
  register(c: ServiceContainer): void {
    c.bind(WorkspaceServiceToken, (container) => {
      const file = container.resolve(AtomicJsonFileToken);
      const doclink = new DoclinkFolder(file);
      return new WorkspaceService(
        doclink,
        new WorkspaceStore(doclink, file),
        new ConfigStore(doclink, file),
        new RecentWorkspacesStore(file),
        container.resolve(EventBusToken),
        container.resolve(LoggerToken).child('workspace'),
        // Legal cross-module channel: resolve the file-system contract lazily
        // so boot order between the two modules never matters.
        () => container.resolve(FileSystemServiceToken)
      );
    });
  }

  boot(c: ServiceContainer): void {
    registerWorkspaceIpc(c, c.resolve(LoggerToken).child('workspace:ipc'));
  }
}