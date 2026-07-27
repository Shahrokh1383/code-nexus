import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createDocumentationDependencies, IpcResponse } from './dependencies';
import { WorkspaceId } from '../../../../src/domains/project/domain/value-objects/workspace-id';
import { Document } from '../../../../src/domains/documentation/domain/entities/document';
import { DocumentId } from '../../../../src/domains/documentation/domain/value-objects/document-id';
import { DocumentPath } from '../../../../src/domains/documentation/domain/value-objects/document-path';
import { DateTime } from '../../../../src/domains/shared-kernel/types/date-time';
import { EventBus } from '../../../../src/domains/shared-kernel/events/event-bus';
import { DocumentDeletedEvent } from '../../../../src/domains/documentation/domain/events/document-deleted';
import { PathUtils } from '../../../../src/domains/shared-kernel/utils/path-utils';
import { DetectDocsFolderRelocationCommand } from '../../../../src/domains/documentation/application/commands/detect-docs-folder-relocation.command';
import { DetectDocsFolderRelocationHandler } from '../../../../src/domains/documentation/application/handlers/detect-docs-folder-relocation.handler';
import { DocsFolderDetectorService } from '../../../../src/domains/documentation/domain/services/docs-folder-detector.service';

const DOCUMENT_EXTENSIONS = /\.(md|txt|rst|adoc|mdx)$/i;

export function registerSyncFilesIpcHandler(): void {
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_SYNC_FILES,
    async (_event, workspaceId: unknown) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { documentRepo, configRepo, scanner, docFolderRepo } = createDocumentationDependencies(rootPath);
        let config = await configRepo.findByWorkspaceId(new WorkspaceId(rootPath));
        let docsFolderPath = config?.docsFolderPath.getOrNull();
        
        if (!docsFolderPath) return { success: true };

        // AUTO-RELOCATION (VS Code Style)
        const folderExists = await scanner.exists(docsFolderPath);
        if (!folderExists) {
          const detectorService = new DocsFolderDetectorService(EventBus.getInstance());
          const relocateHandler = new DetectDocsFolderRelocationHandler(docFolderRepo, configRepo, detectorService, scanner, documentRepo);
          await relocateHandler.execute(new DetectDocsFolderRelocationCommand(rootPath));
          
          // Reload config after relocation
          config = await configRepo.findByWorkspaceId(new WorkspaceId(rootPath));
          docsFolderPath = config?.docsFolderPath.getOrNull();
          if (!docsFolderPath) return { success: true };
        }

        const allFiles = await scanner.scanFolder(docsFolderPath);
        const documentFiles = allFiles.filter((f) => !f.isDirectory && DOCUMENT_EXTENSIONS.test(f.name));
        const currentFilePaths = documentFiles.map((f) => PathUtils.join(docsFolderPath, f.path));

        const existingDocs = await documentRepo.findAll();
        const existingNonDeleted = existingDocs.filter((d) => !d.deleted);

        // Delete documents no longer on disk
        for (const doc of existingNonDeleted) {
          if (!currentFilePaths.includes(doc.path.value)) {
            await documentRepo.delete(doc.id);
            await EventBus.getInstance().emit(new DocumentDeletedEvent(doc.id, doc.path));
          }
        }

        // Add new documents discovered
        const existingAllPaths = new Set(existingDocs.map((d) => d.path.value));
        const newPaths = currentFilePaths.filter((p) => !existingAllPaths.has(p));
        
        for (const newPath of newPaths) {
          const segments = newPath.split('/');
          const fileName = segments[segments.length - 1];
          const title = fileName.replace(/\.[^/.]+$/, '').charAt(0).toUpperCase() + fileName.replace(/\.[^/.]+$/, '').slice(1);
          const document = new Document(DocumentId.generate(), new DocumentPath(newPath), title, DateTime.now(), 0);
          await documentRepo.save(document);
        }

        return { success: true };
      })
  );
}