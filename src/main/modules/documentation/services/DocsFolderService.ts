import type { EventBus } from '../../../shared/event-bus/event-bus';
import type { WorkspaceServiceContract } from '../../workspace';
import { DocFolder } from '../domain/DocFolder';
import { DocFolderSignature } from '../domain/DocFolderSignature';
import { DocsFolderDetector } from '../domain/DocsFolderDetector';
import { Document } from '../domain/Document';
import type { DocsFolderConfigStore } from '../infrastructure/DocsFolderConfigStore';
import type { DocumentJsonRepository } from '../infrastructure/DocumentJsonRepository';
import type { DocumentScanner } from '../infrastructure/DocumentScanner';
import { DomainException } from '../../../shared/errors/domain-exception';

const DOCUMENT_EXTENSIONS = /\.(md|txt|rst|adoc|mdx)$/i;

/**
 * Docs-folder lifecycle: registration, relocation detection and file sync.
 * Behavior is ported verbatim from the legacy handlers + the sync IPC
 * (including its quirks — see comments at each site).
 */
export class DocsFolderService {
  constructor(
    private readonly config: DocsFolderConfigStore,
    private readonly documents: DocumentJsonRepository,
    private readonly scanner: DocumentScanner,
    private readonly detector: DocsFolderDetector,
    private readonly workspace: () => WorkspaceServiceContract,
    private readonly events: EventBus,
    private readonly generateId: () => string
  ) {}

  async register(workspaceId: string, suggestedPath?: string): Promise<void> {
    const rootPath = workspaceId;
    await this.config.requireConfig(rootPath);

    let folder: DocFolder;

    if (suggestedPath) {
      let normalizedPath = suggestedPath;
      // Legacy normalized first, then converted an absolute pick to a
      // workspace-relative path.
      normalizedPath = normalizedPath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
      if (this.isAbsolute(normalizedPath)) {
        normalizedPath = this.relative(rootPath, normalizedPath);
      }

      if (!(await this.scanner.exists(rootPath, normalizedPath))) {
        throw this.folderError('FOLDER_NOT_EXIST', `Folder '${normalizedPath}' does not exist`);
      }
      if (!(await this.scanner.isDirectory(rootPath, normalizedPath))) {
        throw this.folderError('PATH_NOT_DIRECTORY', `Path '${normalizedPath}' is not a directory`);
      }

      const files = await this.scanner.scanFolder(rootPath, normalizedPath);
      const signature = DocFolderSignature.calculateFrom(files);
      folder = new DocFolder(
        this.generateId(),
        normalizedPath,
        signature,
        files.filter((f) => !f.isDirectory).length
      );
    } else {
      const candidates = await this.buildCandidates(rootPath);
      folder = this.detector.detect(candidates);
    }

    // Secure folder change: migrate paths instead of deleting, preserving
    // document IDs and future links.
    const existingFolder = await this.config.readDocFolder(rootPath);
    if (existingFolder && existingFolder.path !== folder.path) {
      await this.migrateDocumentPaths(rootPath, existingFolder.path, folder.path);
    }

    await this.config.saveDocFolder(rootPath, folder);
    await this.syncAndEmitDocuments(rootPath, folder.path);
  }

  async detectRelocation(workspaceId: string): Promise<void> {
    const rootPath = workspaceId;
    const existingFolder = await this.config.readDocFolder(rootPath);
    if (!existingFolder) {
      throw this.folderError(
        'NO_DOCS_FOLDER_REGISTERED',
        'No docs folder registered for this workspace'
      );
    }

    if (await this.scanner.exists(rootPath, existingFolder.path)) {
      return;
    }

    const candidates = await this.buildCandidates(rootPath);
    const relocated = this.detector.detect(candidates, existingFolder);

    if (relocated.path !== existingFolder.path) {
      await this.config.saveDocFolder(rootPath, relocated);
      await this.migrateDocumentPaths(rootPath, existingFolder.path, relocated.path);
    }
  }

  async syncFiles(workspaceId: string): Promise<void> {
    const rootPath = workspaceId;
    let docsFolderPath = await this.config.readDocsFolderPath(rootPath);
    if (!docsFolderPath) return;

    // attempt detection, then re-read the (possibly updated) config.
    const folderExists = await this.scanner.exists(rootPath, docsFolderPath);
    if (!folderExists) {
      await this.detectRelocation(rootPath);
      docsFolderPath = await this.config.readDocsFolderPath(rootPath);
      if (!docsFolderPath) return;
    }

    const allFiles = await this.scanner.scanFolder(rootPath, docsFolderPath);
    const documentFiles = allFiles.filter((f) => !f.isDirectory && DOCUMENT_EXTENSIONS.test(f.name));
    const currentFilePaths = documentFiles.map((f) => this.join(docsFolderPath, f.path));

    const existingDocs = await this.documents.findAll(rootPath);
    const existingNonDeleted = existingDocs.filter((d) => !d.deleted);

    // Delete documents no longer on disk
    for (const doc of existingNonDeleted) {
      if (!currentFilePaths.includes(doc.path)) {
        await this.documents.delete(rootPath, doc.id);
        this.events.emit('DocumentDeleted', { documentId: doc.id, path: doc.path });
      }
    }

    const existingAllPaths = new Set(existingDocs.map((d) => d.path));
    const newPaths = currentFilePaths.filter((p) => !existingAllPaths.has(p));

    for (const newPath of newPaths) {
      const segments = newPath.split('/');
      const fileName = segments[segments.length - 1];
      const document = new Document(
        this.generateId(),
        newPath,
        this.deriveTitle(fileName),
        new Date().toISOString(),
        0
      );
      await this.documents.save(rootPath, document);
    }
  }

  async cleanupDeletedFile(rootPath: string, relativePath: string): Promise<void> {
    const docsFolderPath = await this.config.readDocsFolderPath(rootPath);
    if (!docsFolderPath) return;

    const normalizedFile = this.join(relativePath);
    const normalizedDocs = this.join(docsFolderPath);
    if (!this.isWithin(normalizedDocs, normalizedFile)) return;

    const document = await this.documents.findByPath(rootPath, normalizedFile);
    if (!document) return;

    await this.documents.delete(rootPath, document.id);
    // Emit parity with syncFiles: live disk deletions must trigger the same
    // downstream flows (linking inheritance + link purge) that in-app
    // deletions already trigger via DocumentService.softDelete.
    this.events.emit('DocumentDeleted', { documentId: document.id, path: document.path });
  }

  //Private Helpers

  private async buildCandidates(rootPath: string) {
    const ignorePatterns = await this.workspace().getIgnorePatterns(rootPath);
    return this.scanner.scanWorkspaceForCandidates(rootPath, ignorePatterns);
  }

  private async migrateDocumentPaths(rootPath: string, oldPath: string, newPath: string): Promise<void> {
    const oldDocs = await this.documents.findByDocFolderPath(rootPath, oldPath);
    for (const doc of oldDocs) {
      const relativePath = doc.path.slice(oldPath.length);
      doc.updatePath(this.join(newPath, relativePath));
      await this.documents.save(rootPath, doc);
    }
  }

  private async syncAndEmitDocuments(rootPath: string, docsFolderPath: string): Promise<void> {
    const files = await this.scanner.scanFolder(rootPath, docsFolderPath);
    const documentFiles = files.filter((f) => !f.isDirectory && DOCUMENT_EXTENSIONS.test(f.name));

    for (const file of documentFiles) {
      const relativePath = this.join(docsFolderPath, file.path);
      const existingDoc = await this.documents.findByPath(rootPath, relativePath);

      if (existingDoc) {
        // If it was previously deleted but reappeared, restore it.
        if (existingDoc.deleted) {
          existingDoc.markAsRestored();
          await this.documents.save(rootPath, existingDoc);
        }
      } else {
        const document = new Document(
          this.generateId(),
          relativePath,
          this.deriveTitle(file.name),
          file.lastModified,
          0
        );
        await this.documents.save(rootPath, document);
        this.events.emit('DocumentDiscovered', {
          documentId: document.id,
          path: document.path,
          title: document.title,
        });
      }
    }
  }

  private deriveTitle(fileName: string): string {
    const base = fileName.replace(/\.[^/.]+$/, '');
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  private folderError(code: string, message: string): DomainException {
    return new DomainException(code, message);
  }

  private isAbsolute(path: string): boolean {
    return path.startsWith('/') || /^[A-Za-z]:/.test(path);
  }

  private relative(fromPath: string, toPath: string): string {
    const fromParts = fromPath.split('/').filter((s) => s.length > 0 && s !== '.');
    const toParts = toPath.split('/').filter((s) => s.length > 0 && s !== '.');
    const caseInsensitive = /^[A-Za-z]:$/.test(fromParts[0] ?? '');
    let common = 0;
    while(common < fromParts.length && common < toParts.length && (caseInsensitive ? fromParts[common].toLowerCase() === toParts[common].toLowerCase() : fromParts[common] === toParts[common])
    ) {
      common++;
    }
    const upSegments = fromParts.slice(common).map(() => '..');
    return [...upSegments, ...toParts.slice(common)].join('/');
  }

  private join(...paths: string[]): string {
    return paths.map((p) => p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '')).join('/').replace(/\/+/g, '/');
  }

  private isWithin(parentPath: string, childPath: string): boolean {
    return childPath === parentPath || childPath.startsWith(parentPath + '/');
  }
}