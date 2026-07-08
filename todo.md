# CodeNexus - Phased Implementation Roadmap
### Aligned with the CodeNexus Immutable Constitution v1.0

---

## Overview

This roadmap breaks the CodeNexus project into 10 discrete phases. Each phase builds upon the previous ones while maintaining strict adherence to the Constitution's File-Isolation Mandate, Onion Architecture, and Bounded Context isolation. 

**Rule:** You may NOT skip phases. Each phase must be fully implemented and tested before proceeding to the next.

---

## Phase 1: Shared Kernel (The Foundation)
**Objective:** Build the common language and base classes used by ALL Bounded Contexts.
**Constitution References:** Section I (SOLID, KISS), Section V (Step 3: Define Domain Events), Section VII (Commandment 5: Value Objects)

### Files to Create

#### Domain Primitives
- `src/domains/shared-kernel/types/identifier.ts` — Base `Identifier` class. Wraps string/UUID. Provides `equals()`, `toString()`, `value` getter. All entity IDs extend this.
- `src/domains/shared-kernel/types/result.ts` — `Result<T, E>` monad. `ok(value)` and `fail(error)` factories. `isSuccess`, `isFailure`, `getValue()`, `getError()` methods. ZERO exceptions in Domain layer.
- `src/domains/shared-kernel/types/maybe.ts` — `Maybe<T>` monad. `some(value)`, `none()` factories. `isSome()`, `isNone()`, `map()`, `flatMap()` methods. Eliminates null checks in domain logic.
- `src/domains/shared-kernel/types/date-time.ts` — `DateTime` value object. Wraps native Date. Immutable. Provides `now()`, `toISO()`, `addDays()`, `diffInDays()`. Prevents raw Date manipulation across contexts.

#### Domain Events Infrastructure
- `src/domains/shared-kernel/events/domain-event.ts` — Base `DomainEvent` abstract class. Properties: `eventId` (Identifier), `occurredOn` (DateTime), `eventType` (string). All events extend this.
- `src/domains/shared-kernel/events/event-bus.ts` — `EventBus` class. Methods: `register(eventType, handler)`, `emit(event)`. In-memory, async. Handlers are executed sequentially but non-blocking. EventBus is a SINGLETON shared across all contexts.
- `src/domains/shared-kernel/events/domain-event-handler.interface.ts` — `IDomainEventHandler<T>` interface. `handle(event: T): Promise<void>`.

#### Exceptions
- `src/domains/shared-kernel/exceptions/domain-exception.ts` — Base `DomainException` class. Extends Error. Properties: `code` (string), `message` (string), `context` (object). Self-describing.
- `src/domains/shared-kernel/exceptions/not-found-exception.ts` — `NotFoundException` extends DomainException. Used when an entity is not found in a repository.
- `src/domains/shared-kernel/exceptions/invalid-state-exception.ts` — `InvalidStateException` extends DomainException. Used when an entity invariant is violated.

#### Utilities
- `src/domains/shared-kernel/utils/hash-utils.ts` — `HashUtils` static class. `sha256(content: string): string`. Normalizes line endings to LF before hashing. Cross-platform consistent.
- `src/domains/shared-kernel/utils/path-utils.ts` — `PathUtils` static class. `normalize(path: string): string` (converts to forward slashes, removes trailing slash). `join(...paths): string`. `relative(from, to): string`. `isWithin(parent, child): boolean` (prevents path traversal attacks).
- `src/domains/shared-kernel/utils/uuid-generator.ts` — `UuidGenerator` static class. `generate(): string`. Uses `uuid` v4 library. Abstracted to allow mocking in tests.

#### Application Layer Base
- `src/domains/shared-kernel/application/command.interface.ts` — `ICommand` marker interface. Empty. Used for type safety in handlers.
- `src/domains/shared-kernel/application/query.interface.ts` — `IQuery` marker interface. Empty.
- `src/domains/shared-kernel/application/command-handler.interface.ts` — `ICommandHandler<TCommand, TResult>` interface. `execute(command: TCommand): Promise<TResult>`.
- `src/domains/shared-kernel/application/query-handler.interface.ts` — `IQueryHandler<TQuery, TResult>` interface. `execute(query: TQuery): Promise<TResult>`.

#### Repository Base
- `src/domains/shared-kernel/repository/repository.interface.ts` — `IRepository<T>` interface. Methods: `findById(id)`, `save(entity)`, `delete(id)`, `exists(id)`. All domain repositories extend this.

### Deliverables
- [ ] All Value Object base classes pass unit tests (equality, immutability, validation)
- [ ] EventBus correctly registers and emits events asynchronously
- [ ] Result monad handles success and failure paths without exceptions
- [ ] PathUtils correctly normalizes Windows paths to forward slashes
- [ ] HashUtils produces identical hashes for CRLF and LF content

---

## Phase 2: Project Context (Workspace & Initialization)
**Objective:** Enable workspace selection, `.doclink` folder creation, and project configuration persistence.
**Duration Estimate:** 2-3 days
**Dependencies:** Phase 1 (Shared Kernel)
**Constitution References:** Section VI.1 (`.doclink` Folder), Section VI.8 (Sub-folder Scoping), Section VII (Commandments 9, 10)

### Files to Create

#### Domain Layer
- `src/domains/project/domain/entities/workspace.ts` — `Workspace` aggregate root. Properties: `id` (WorkspaceId), `rootPath` (WorkspacePath), `metadataFolderPath` (string, always `.doclink`), `createdAt` (DateTime), `lastScanAt` (Maybe<DateTime>). Invariant: `rootPath` must be an absolute, existing directory.
- `src/domains/project/domain/entities/project-config.ts` — `ProjectConfig` entity. Properties: `workspaceId` (WorkspaceId), `docsFolderPath` (Maybe<string>), `ignorePatterns` (string[]), `schemaVersion` (string). Methods: `updateDocsFolder(path)`, `addIgnorePattern(pattern)`, `removeIgnorePattern(pattern)`.
- `src/domains/project/domain/value-objects/workspace-id.ts` — Extends `Identifier`. No additional logic.
- `src/domains/project/domain/value-objects/workspace-path.ts` — Extends Value Object base. Validates path exists, is absolute, is a directory. Normalizes to forward slashes.
- `src/domains/project/domain/value-objects/metadata-folder-name.ts` — Value object. Always returns `.doclink`. Immutable constant.
- `src/domains/project/domain/events/workspace-initialized.ts` — `WorkspaceInitializedEvent` extends DomainEvent. Payload: `workspaceId`, `rootPath`.
- `src/domains/project/domain/events/workspace-scope-changed.ts` — `WorkspaceScopeChangedEvent` extends DomainEvent. Payload: `workspaceId`, `oldRootPath`, `newRootPath`.
- `src/domains/project/domain/repository/workspace-repository.interface.ts` — `IWorkspaceRepository` interface. Methods: `findById`, `save`, `delete`, `findByPath`.
- `src/domains/project/domain/repository/project-config-repository.interface.ts` — `IProjectConfigRepository` interface. Methods: `findByWorkspaceId`, `save`.

#### Application Layer
- `src/domains/project/application/commands/initialize-workspace.command.ts` — `InitializeWorkspaceCommand` implements ICommand. Payload: `rootPath: string`.
- `src/domains/project/application/handlers/initialize-workspace.handler.ts` — `InitializeWorkspaceHandler` implements ICommandHandler. Logic: Validate path exists. Create `.doclink` folder. Create `config.json` with schema version. Create `.docignore` with default patterns. Create `Workspace` aggregate. Emit `WorkspaceInitializedEvent`. Return `Result<Workspace, DomainException>`.
- `src/domains/project/application/commands/change-workspace-scope.command.ts` — `ChangeWorkspaceScopeCommand`. Payload: `newRootPath: string`.
- `src/domains/project/application/handlers/change-workspace-scope.handler.ts` — Validates new path. Stops current watcher (via EventBus). Clears caches. Creates new `.doclink` if needed. Emits `WorkspaceScopeChangedEvent`.
- `src/domains/project/application/queries/get-workspace.query.ts` — `GetWorkspaceQuery`. Payload: `workspaceId: string`.
- `src/domains/project/application/handlers/get-workspace.handler.ts` — Returns workspace DTO.
- `src/domains/project/application/dto/workspace.dto.ts` — Plain object. Properties: `id`, `rootPath`, `metadataFolderPath`, `createdAt`, `lastScanAt`.
- `src/domains/project/application/dto/project-config.dto.ts` — Plain object. Properties: `docsFolderPath`, `ignorePatterns`, `schemaVersion`.

#### Infrastructure Layer
- `src/domains/project/infrastructure/repository/workspace-json.repository.ts` — Implements `IWorkspaceRepository`. Reads/writes `workspace.json` inside `.doclink`. Uses `JsonDatabase` adapter.
- `src/domains/project/infrastructure/repository/project-config-json.repository.ts` — Implements `IProjectConfigRepository`. Reads/writes `config.json` inside `.doclink`.
- `src/infrastructure/persistence/json-database.ts` — `JsonDatabase` adapter. Methods: `read<T>(filename): Promise<T>`, `write<T>(filename, data): Promise<void>`. Atomic writes (write to temp file, fs.rename). Creates `.doclink` if missing. Schema version validation.
- `src/infrastructure/persistence/database-schema.ts` — Schema definitions and version constants. Current version: `1.0`.
- `src/infrastructure/persistence/migration/schema-migrator.ts` — `SchemaMigrator`. Checks schema version on load. If outdated, runs migration functions. Currently only supports version `1.0`.

#### Electron IPC
- `.electron/ipc/handlers/project-handlers.ts` — Registers IPC channels: `project:initialize`, `project:getWorkspace`, `project:changeScope`. Maps to Application Handlers.

#### Presentation Layer
- `src/presentation/hooks/useWorkspace.ts` — Custom React hook. Exposes: `initialize(rootPath)`, `workspace` (state), `isLoading`, `error`. Calls IPC via `useIpc` hook.
- `src/presentation/pages/WorkspaceSetupPage.tsx` — UI for selecting workspace folder. Shows folder picker dialog. Displays loading state. On success, navigates to Dashboard.
- `src/presentation/stores/workspace.store.ts` — Zustand store. Holds current workspace state. Updated by `useWorkspace` hook.

### Deliverables
- [ ] User can select a folder; `.doclink` is created with `config.json` and `.docignore`
- [ ] `config.json` contains relative paths, schema version, and default ignore patterns
- [ ] `.doclink` folder is hidden (dot prefix) and under 1KB after initialization
- [ ] Changing workspace scope creates a new isolated `.doclink` at the new root
- [ ] All paths in `.doclink` are relative to workspace root

---

## Phase 3: FileSystem Context (Scanning & Watching)
**Objective:** Deep project scanning, real-time file watching, ignore pattern enforcement, and file tree building.
**Duration Estimate:** 3-4 days
**Dependencies:** Phase 2 (Project Context)
**Constitution References:** Section VI.2 (File System & Watching), Section VII (Commandments 1, 2, 15)

### Files to Create

#### Domain Layer
- `src/domains/filesystem/domain/entities/file-node.ts` — `FileNode` entity. Properties: `id` (FileNodeId), `path` (FilePath), `name` (string), `parentPath` (FilePath), `size` (number), `lastModified` (DateTime), `hash` (Maybe<FileHash>), `isDirectory` (boolean). Invariant: `path` must be within workspace root.
- `src/domains/filesystem/domain/entities/folder-node.ts` — `FolderNode` entity. Properties: `id` (FolderNodeId), `path` (FilePath), `name` (string), `children` (FileNode[] | FolderNode[]). Methods: `addChild(node)`, `removeChild(id)`, `getAllDescendants(): FileNode[]`.
- `src/domains/filesystem/domain/value-objects/file-node-id.ts` — Extends Identifier.
- `src/domains/filesystem/domain/value-objects/folder-node-id.ts` — Extends Identifier.
- `src/domains/filesystem/domain/value-objects/file-path.ts` — Extends Value Object. Validates path is relative to workspace root. Normalizes slashes. Prevents path traversal (`../`).
- `src/domains/filesystem/domain/value-objects/file-hash.ts` — Extends Value Object. Wraps SHA-256 hex string. Validates length (64 chars).
- `src/domains/filesystem/domain/value-objects/ignore-pattern.ts` — Extends Value Object. Wraps glob pattern string. Validates syntax (no invalid glob characters). Methods: `matches(path: string): boolean`.
- `src/domains/filesystem/domain/value-objects/file-size.ts` — Extends Value Object. Wraps number (bytes). Validates non-negative.
- `src/domains/filesystem/domain/events/file-discovered.ts` — `FileDiscoveredEvent`. Payload: `fileNodeId`, `path`, `isDirectory`.
- `src/domains/filesystem/domain/events/file-modified.ts` — `FileModifiedEvent`. Payload: `fileNodeId`, `path`, `newHash`.
- `src/domains/filesystem/domain/events/file-deleted.ts` — `FileDeletedEvent`. Payload: `fileNodeId`, `path`.
- `src/domains/filesystem/domain/events/file-moved.ts` — `FileMovedEvent`. Payload: `fileNodeId`, `oldPath`, `newPath`.
- `src/domains/filesystem/domain/events/scan-completed.ts` — `ScanCompletedEvent`. Payload: `workspaceId`, `fileCount`, `folderCount`, `durationMs`.
- `src/domains/filesystem/domain/repository/filesystem-repository.interface.ts` — `IFileSystemRepository`. Methods: `findById`, `findByPath`, `save`, `delete`, `findAll`, `findChildrenOf`, `findByPattern`.
- `src/domains/filesystem/domain/services/scan-project.service.ts` — `ScanProjectService`. Domain service. Orchestrates scanning logic. Takes a root path and ignore patterns. Returns a tree of FileNodes and FolderNodes. Emits `FileDiscoveredEvent` for each file found. Emits `ScanCompletedEvent` at the end. This is PURE logic — it does not touch the actual file system. It receives file metadata from an adapter.

#### Application Layer
- `src/domains/filesystem/application/commands/scan-project.command.ts` — `ScanProjectCommand`. Payload: `workspaceId: string`.
- `src/domains/filesystem/application/handlers/scan-project.handler.ts` — `ScanProjectHandler`. Fetches workspace config. Reads ignore patterns. Calls `ScanProjectService` with file metadata from `NodeFsAdapter`. Saves results to `IFileSystemRepository`. Emits `ScanCompletedEvent`.
- `src/domains/filesystem/application/commands/add-ignore-pattern.command.ts` — `AddIgnorePatternCommand`. Payload: `workspaceId: string`, `pattern: string`.
- `src/domains/filesystem/application/handlers/add-ignore-pattern.handler.ts` — Validates pattern. Updates `ProjectConfig`. Re-saves config. Does NOT re-scan immediately.
- `src/domains/filesystem/application/commands/remove-ignore-pattern.command.ts` — `RemoveIgnorePatternCommand`. Payload: `workspaceId: string`, `pattern: string`.
- `src/domains/filesystem/application/handlers/remove-ignore-pattern.handler.ts` — Removes pattern from config.
- `src/domains/filesystem/application/queries/get-file-tree.query.ts` — `GetFileTreeQuery`. Payload: `workspaceId: string`, `parentPath?: string`.
- `src/domains/filesystem/application/handlers/get-file-tree.handler.ts` — Returns tree DTO. Lazy-loads children if `parentPath` provided.
- `src/domains/filesystem/application/queries/get-ignored-files.query.ts` — `GetIgnoredFilesQuery`. Returns list of currently ignored patterns.
- `src/domains/filesystem/application/dto/file-node.dto.ts` — Plain object. Properties: `id`, `path`, `name`, `size`, `lastModified`, `isDirectory`.
- `src/domains/filesystem/application/dto/folder-node.dto.ts` — Plain object. Properties: `id`, `path`, `name`, `children`.
- `src/domains/filesystem/application/dto/file-tree.dto.ts` — Plain object. Properties: `root`, `totalFiles`, `totalFolders`.

#### Infrastructure Layer
- `src/domains/filesystem/infrastructure/repository/filesystem-json.repository.ts` — Implements `IFileSystemRepository`. Stores file tree in `.doclink/file-index.json`. Structure: `{ version, lastScan, files: { [relativePath]: { hash, lastModified, size } } }`. Lightweight. No file content.
- `src/domains/filesystem/infrastructure/adapters/node-fs.adapter.ts` — `NodeFsAdapter`. Methods: `readDir(path): Promise<FileMetadata[]>`, `stat(path): Promise<FileMetadata>`, `exists(path): boolean`. Wraps Node.js `fs` and `path` modules. ONLY this file imports `fs` in the FileSystem context.
- `src/domains/filesystem/infrastructure/adapters/chokidar.adapter.ts` — `ChokidarAdapter`. Methods: `startWatching(rootPath, ignorePatterns): FSWatcher`, `stopWatching(): void`. Wraps `chokidar`. Debounces events (300ms). Emits `FileModifiedEvent`, `FileDeletedEvent`, `FileDiscoveredEvent` via EventBus. Runs in Main process ONLY.
- `src/domains/filesystem/infrastructure/adapters/ignore-parser.adapter.ts` — `IgnoreParserAdapter`. Methods: `parse(patterns): IgnoreMatcher`, `isIgnored(path, matcher): boolean`. Handles glob patterns, negations (`!`), and directory-specific patterns. Uses `minimatch` or custom implementation.

#### Application Orchestration (Cross-Domain)
- `src/application/services/background-watcher.service.ts` — `BackgroundWatcherService`. Orchestrates the ChokidarAdapter. Starts/stops watching based on workspace changes. Listens to `WorkspaceInitializedEvent` and `WorkspaceScopeChangedEvent` via EventBus. This is an Application-layer service, NOT a Domain service.

#### Electron IPC
- `.electron/ipc/handlers/filesystem-handlers.ts` — Registers: `fs:scanProject`, `fs:getFileTree`, `fs:addIgnorePattern`, `fs:removeIgnorePattern`, `fs:getIgnoredFiles`.

#### Presentation Layer
- `src/presentation/hooks/useFileTree.ts` — Hook. Exposes: `fileTree`, `scan()`, `isScanning`, `error`. Calls IPC.
- `src/presentation/hooks/useBackgroundWatcher.ts` — Hook. Listens to IPC events from watcher. Updates file tree state reactively.
- `src/presentation/components/file-tree/FileTree.tsx` — Recursive tree component. Uses virtualized list for large trees.
- `src/presentation/components/file-tree/FileNode.tsx` — Individual file/folder row. Shows icon, name, size, last modified.
- `src/presentation/components/file-tree/FileIcon.tsx` — File type icon using FontAwesome.
- `src/presentation/pages/FileBrowserPage.tsx` — Full page. Shows file tree, scan button, ignore pattern editor.
- `src/presentation/stores/filesystem.store.ts` — Zustand store. Holds file tree, scan status, ignore patterns.

### Deliverables
- [ ] Deep scan of 1000 files completes in under 3 seconds
- [ ] `file-index.json` is under 50KB for 1000 files
- [ ] File watcher detects changes within 300ms of file save
- [ ] Ignore patterns correctly exclude `node_modules/`, `.git/`, build folders
- [ ] Changing a file emits `FileModifiedEvent` via EventBus
- [ ] All paths in `file-index.json` are relative with forward slashes

---

## Phase 4: Documentation Context (Docs Folder & Orphan Detection)
**Objective:** Detect the documentation folder, track documents, identify orphaned docs, and handle folder renaming.
**Duration Estimate:** 2-3 days
**Dependencies:** Phase 3 (FileSystem Context)
**Constitution References:** Section VI.3 (Documentation Folder Resilience), Section VI.7 (Orphaned Documents)

### Files to Create

#### Domain Layer
- `src/domains/documentation/domain/entities/document.ts` — `Document` entity. Properties: `id` (DocumentId), `path` (DocumentPath), `title` (string), `lastModified` (DateTime), `linkCount` (number), `isOrphaned` (boolean). Methods: `markAsOrphaned()`, `markAsLinked()`, `updateTitle(title)`.
- `src/domains/documentation/domain/entities/doc-folder.ts` — `DocFolder` entity. Properties: `id` (DocFolderId), `path` (string), `signature` (DocFolderSignature), `documentCount` (number). Methods: `updateSignature(signature)`, `relocate(newPath)`.
- `src/domains/documentation/domain/value-objects/document-id.ts` — Extends Identifier.
- `src/domains/documentation/domain/value-objects/document-path.ts` — Extends Value Object. Validates path is within docs folder. Relative to workspace root.
- `src/domains/documentation/domain/value-objects/doc-folder-id.ts` — Extends Identifier.
- `src/domains/documentation/domain/value-objects/doc-folder-signature.ts` — `DocFolderSignature` value object. Properties: `fileCount` (number), `topLevelFileNames` (string[]), `directoryDepth` (number). Methods: `calculateFrom(files: FileNode[]): DocFolderSignature`, `similarity(other): number` (0-1 score for fuzzy matching). Used for resilient detection after renaming.
- `src/domains/documentation/domain/events/docs-folder-relocated.ts` — `DocsFolderRelocatedEvent`. Payload: `oldPath`, `newPath`, `signature`.
- `src/domains/documentation/domain/events/document-discovered.ts` — `DocumentDiscoveredEvent`. Payload: `documentId`, `path`, `title`.
- `src/domains/documentation/domain/events/orphan-detected.ts` — `OrphanDetectedEvent`. Payload: `documentId`, `path`.
- `src/domains/documentation/domain/events/document-deleted.ts` — `DocumentDeletedEvent`. Payload: `documentId`, `path`.
- `src/domains/documentation/domain/repository/document-repository.interface.ts` — `IDocumentRepository`. Methods: `findById`, `findByPath`, `findAll`, `findOrphaned`, `save`, `delete`, `findByDocFolder`.
- `src/domains/documentation/domain/repository/doc-folder-repository.interface.ts` — `IDocFolderRepository`. Methods: `findByWorkspaceId`, `save`, `delete`.
- `src/domains/documentation/domain/services/docs-folder-detector.service.ts` — `DocsFolderDetectorService`. Domain service. Logic: Scan workspace root for candidate folders. Score candidates based on: name similarity (docs, Docs, documentation, etc.), content type (high % of .md, .txt files), depth (prefer root-level). Returns `DocFolder` with signature. If existing folder is missing, uses signature to find renamed folder. Emits `DocsFolderRelocatedEvent` if match found.

#### Application Layer
- `src/domains/documentation/application/commands/register-docs-folder.command.ts` — `RegisterDocsFolderCommand`. Payload: `workspaceId: string`, `suggestedPath?: string`.
- `src/domains/documentation/application/handlers/register-docs-folder.handler.ts` — If `suggestedPath` provided, validates and uses it. If not, calls `DocsFolderDetectorService`. Saves `DocFolder`. Scans folder for documents. Creates `Document` entities. Emits `DocumentDiscoveredEvent` for each. Checks for orphans. Emits `OrphanDetectedEvent` if any.
- `src/domains/documentation/application/commands/detect-docs-folder-relocation.command.ts` — `DetectDocsFolderRelocationCommand`. Payload: `workspaceId: string`.
- `src/domains/documentation/application/handlers/detect-docs-folder-relocation.handler.ts` — Checks if stored docs folder path still exists. If not, calls `DocsFolderDetectorService` to find by signature. If found, updates path. Emits `DocsFolderRelocatedEvent`.
- `src/domains/documentation/application/commands/delete-document.command.ts` — `DeleteDocumentCommand`. Payload: `documentId: string`.
- `src/domains/documentation/application/handlers/delete-document.handler.ts` — Finds document. Deletes physical file via `NodeFsAdapter`. Removes from repository. Emits `DocumentDeletedEvent`.
- `src/domains/documentation/application/queries/get-all-documents.query.ts` — `GetAllDocumentsQuery`. Payload: `workspaceId: string`.
- `src/domains/documentation/application/handlers/get-all-documents.handler.ts` — Returns all documents with orphan status.
- `src/domains/documentation/application/queries/get-orphaned-documents.query.ts` — `GetOrphanedDocumentsQuery`.
- `src/domains/documentation/application/handlers/get-orphaned-documents.handler.ts` — Returns only orphaned documents.
- `src/domains/documentation/application/dto/document.dto.ts` — Plain object. Properties: `id`, `path`, `title`, `lastModified`, `linkCount`, `isOrphaned`.
- `src/domains/documentation/application/dto/doc-folder.dto.ts` — Plain object. Properties: `id`, `path`, `signature`, `documentCount`.

#### Infrastructure Layer
- `src/domains/documentation/infrastructure/repository/document-json.repository.ts` — Implements `IDocumentRepository`. Stores in `.doclink/documents.json`. Structure: `{ version, docsFolderPath, documents: [] }`.
- `src/domains/documentation/infrastructure/repository/doc-folder-json.repository.ts` — Implements `IDocFolderRepository`. Stores in `.doclink/config.json` (same file as ProjectConfig, different section).
- `src/domains/documentation/infrastructure/adapters/docs-folder-detector.adapter.ts` — `DocsFolderDetectorAdapter`. Implements the signature calculation. Uses `NodeFsAdapter` to read candidate folders. Calculates `DocFolderSignature`. Scores candidates. Returns best match.

#### Electron IPC
- `.electron/ipc/handlers/documentation-handlers.ts` — Registers: `docs:registerFolder`, `docs:detectRelocation`, `docs:getAll`, `docs:getOrphaned`, `docs:deleteDocument`.

#### Presentation Layer
- `src/presentation/hooks/useDocuments.ts` — Hook. Exposes: `documents`, `docsFolder`, `registerFolder(path)`, `detectRelocation()`, `deleteDocument(id)`, `isLoading`.
- `src/presentation/components/document-list/DocumentList.tsx` — List of documents. Grouped by folder. Shows orphan badge.
- `src/presentation/components/document-list/DocumentCard.tsx` — Individual document card. Shows title, path, link count, orphan status.
- `src/presentation/components/document-list/OrphanBadge.tsx` — Warning badge for orphaned documents. Red color, warning icon.
- `src/presentation/pages/DocumentManagerPage.tsx` — Full page. Shows docs folder info, document list, orphan section, folder relocation detection button.
- `src/presentation/stores/documentation.store.ts` — Zustand store. Holds documents, docs folder, orphan count.

### Deliverables
- [ ] System auto-detects `docs/` folder at initialization
- [ ] Renaming `docs/` to `Docs/` is detected automatically on next app launch
- [ ] Orphaned documents (no code links) are flagged with warning badge
- [ ] User can delete orphaned documents from UI; file and metadata both removed
- [ ] Document list updates in real-time when docs folder changes

---

## Phase 5: Tracking Context (Hashing, Diff Detection, Baseline Commits)
**Objective:** Calculate content hashes, detect changes, manage per-document commit state, and track line-level diffs.
**Duration Estimate:** 3-4 days
**Dependencies:** Phase 3 (FileSystem Context)
**Constitution References:** Section VI.5 (Tracking & Granular Commits), Section VII (Commandments 11, 15)

### Files to Create

#### Domain Layer
- `src/domains/tracking/domain/entities/file-hash.ts` — `FileHash` entity. Properties: `id` (FileHashId), `filePath` (FilePath), `hashValue` (HashValue), `committedAt` (Maybe<DateTime>), `commitId` (Maybe<CommitId>). Methods: `updateHash(newHash)`, `commit(commitId)`.
- `src/domains/tracking/domain/entities/content-diff.ts` — `ContentDiff` entity. Properties: `id` (DiffId), `filePath` (FilePath), `oldHash` (HashValue), `newHash` (HashValue), `addedLines` (DiffLine[]), `removedLines` (DiffLine[]), `modifiedLines` (DiffLine[]). Methods: `isEmpty(): boolean`.
- `src/domains/tracking/domain/entities/granular-commit.ts` — `GranularCommit` aggregate root. Properties: `id` (CommitId), `documentId` (DocumentId), `fileHashes` (FileHash[]), `committedAt` (DateTime), `status` (CommitStatus: PENDING | APPROVED). Methods: `approve()`, `getLinkedFiles(): FilePath[]`.
- `src/domains/tracking/domain/value-objects/file-hash-id.ts` — Extends Identifier.
- `src/domains/tracking/domain/value-objects/diff-id.ts` — Extends Identifier.
- `src/domains/tracking/domain/value-objects/commit-id.ts` — Extends Identifier.
- `src/domains/tracking/domain/value-objects/hash-value.ts` — Extends Value Object. Wraps SHA-256 hex string. Validates 64 chars. Factory: `fromContent(content: string)` (normalizes LF).
- `src/domains/tracking/domain/value-objects/diff-line.ts` — `DiffLine` value object. Properties: `lineNumber` (number), `content` (string), `type` (ADDED | REMOVED | MODIFIED).
- `src/domains/tracking/domain/value-objects/commit-status.ts` — Enum-like value object. `PENDING` or `APPROVED`. Immutable.
- `src/domains/tracking/domain/events/changes-detected.ts` — `ChangesDetectedEvent`. Payload: `filePath`, `oldHash`, `newHash`, `diffId`.
- `src/domains/tracking/domain/events/commit-approved.ts` — `CommitApprovedEvent`. Payload: `commitId`, `documentId`, `filePaths`.
- `src/domains/tracking/domain/events/review-required.ts` — `ReviewRequiredEvent`. Payload: `documentId`, `filePath`, `changeType`.
- `src/domains/tracking/domain/repository/tracking-repository.interface.ts` — `ITrackingRepository`. Methods: `findHashByPath`, `saveHash`, `findCommitById`, `saveCommit`, `findPendingCommits`, `findCommitsByDocument`.
- `src/domains/tracking/domain/services/diff-calculator.service.ts` — `DiffCalculatorService`. Domain service. Takes old content and new content. Returns `ContentDiff`. Algorithm: Line-by-line comparison (simple LCS or Myers diff). Optimized for code files. PURE logic — no file system access.
- `src/domains/tracking/domain/services/hash-comparison.service.ts` — `HashComparisonService`. Domain service. Takes `HashValue` old and new. Returns `boolean` (changed). If changed, returns `ChangesDetectedEvent`.

#### Application Layer
- `src/domains/tracking/application/commands/record-hash.command.ts` — `RecordHashCommand`. Payload: `filePath: string`, `content: string`.
- `src/domains/tracking/application/handlers/record-hash.handler.ts` — Calculates hash. Compares with stored hash. If changed, creates `ContentDiff`. Saves new hash as PENDING. Emits `ChangesDetectedEvent`. Emits `ReviewRequiredEvent`.
- `src/domains/tracking/application/commands/detect-changes.command.ts` — `DetectChangesCommand`. Payload: `filePath: string`. Triggered by FileSystem watcher.
- `src/domains/tracking/application/handlers/detect-changes.handler.ts` — Reads file content via adapter. Calls `record-hash` logic. If file is linked to documents, emits `ReviewRequiredEvent` for each linked document.
- `src/domains/tracking/application/commands/approve-commit.command.ts` — `ApproveCommitCommand`. Payload: `documentId: string`.
- `src/domains/tracking/application/handlers/approve-commit.handler.ts` — Finds all PENDING hashes linked to this document. Marks them as APPROVED. Creates `GranularCommit`. Emits `CommitApprovedEvent`. ONLY affects this document's hashes. Other documents remain PENDING.
- `src/domains/tracking/application/queries/get-pending-changes.query.ts` — `GetPendingChangesQuery`. Payload: `documentId?: string`.
- `src/domains/tracking/application/handlers/get-pending-changes.handler.ts` — Returns all PENDING hashes. If `documentId` provided, filters to files linked to that document.
- `src/domains/tracking/application/queries/get-commit-history.query.ts` — `GetCommitHistoryQuery`. Payload: `documentId: string`.
- `src/domains/tracking/application/handlers/get-commit-history.handler.ts` — Returns approved commits for document, sorted by date.
- `src/domains/tracking/application/dto/file-hash.dto.ts` — Plain object. Properties: `filePath`, `hashValue`, `committedAt`, `status`.
- `src/domains/tracking/application/dto/content-diff.dto.ts` — Plain object. Properties: `filePath`, `oldHash`, `newHash`, `addedLines`, `removedLines`, `modifiedLines`.
- `src/domains/tracking/application/dto/granular-commit.dto.ts` — Plain object. Properties: `id`, `documentId`, `filePaths`, `committedAt`, `status`.

#### Infrastructure Layer
- `src/domains/tracking/infrastructure/repository/tracking-json.repository.ts` — Implements `ITrackingRepository`. Stores in `.doclink/commits.json` and `.doclink/file-index.json` (hash section). Structure: `{ version, commits: [], pendingHashes: {} }`.
- `src/domains/tracking/infrastructure/adapters/diff-calculator.adapter.ts` — `DiffCalculatorAdapter`. Implements the diff algorithm. Takes two strings. Returns line arrays. Used by `DiffCalculatorService`.
- `src/domains/tracking/infrastructure/adapters/hash-generator.adapter.ts` — `HashGeneratorAdapter`. Wraps `HashUtils` from shared-kernel. Used by `HashComparisonService`.
- `src/domains/tracking/infrastructure/adapters/file-content-reader.adapter.ts` — `FileContentReaderAdapter`. Reads file content as string. Normalizes line endings to LF. ONLY infrastructure file that reads file content.

#### Application Orchestration (Cross-Domain)
- `src/application/sagas/file-change-reaction.saga.ts` — `FileChangeReactionSaga`. Listens to `FileModifiedEvent` from FileSystem context. Calls `DetectChangesCommand` in Tracking context. Listens to `ChangesDetectedEvent`. Calls Linking context to find linked documents. Emits `ReviewRequiredEvent` for each linked document. This saga bridges FileSystem → Tracking → Notification.

#### Electron IPC
- `.electron/ipc/handlers/tracking-handlers.ts` — Registers: `tracking:recordHash`, `tracking:detectChanges`, `tracking:approveCommit`, `tracking:getPendingChanges`, `tracking:getCommitHistory`.

#### Presentation Layer
- `src/presentation/hooks/useTracking.ts` — Hook. Exposes: `pendingChanges`, `commitHistory`, `approveCommit(docId)`, `isLoading`.
- `src/presentation/components/tracking/PendingChangesList.tsx` — Shows pending changes grouped by document. Each item shows file path, old/new hash, diff summary.
- `src/presentation/components/tracking/DiffViewer.tsx` — Side-by-side diff view. Shows added lines (green), removed lines (red), modified lines (yellow). Uses monospaced font.
- `src/presentation/components/tracking/CommitButton.tsx` — Button to approve commit for a specific document. Disabled if no pending changes for that document.
- `src/presentation/components/tracking/CommitHistory.tsx` — List of approved commits for a document. Shows timestamp, files committed.
- `src/presentation/stores/tracking.store.ts` — Zustand store. Holds pending changes, commit history.

### Deliverables
- [ ] SHA-256 hashes are calculated for all files during scan
- [ ] Modifying a file updates its hash and marks it as PENDING
- [ ] Diff viewer shows exact line changes (added/removed/modified)
- [ ] Approving a commit for Document A only clears hashes linked to Document A
- [ ] Document B's pending changes remain active after Document A's commit
- [ ] Commit history is persisted in `.doclink/commits.json`
- [ ] Hash comparison is identical across Windows, macOS, and Linux

---

## Phase 6: Linking Context (Many-to-Many Links & Auto Migration)
**Objective:** Create and manage code-to-document links, handle document splits, and auto-migrate links via Saga.
**Duration Estimate:** 3-4 days
**Dependencies:** Phase 4 (Documentation), Phase 5 (Tracking)
**Constitution References:** Section VI.4 (Linking & Many-to-Many), Section VI.5 (Document Split), Section VII (Commandment 4)

### Files to Create

#### Domain Layer
- `src/domains/linking/domain/entities/code-to-doc-link.ts` — `CodeToDocLink` aggregate root. Properties: `id` (LinkId), `codeFileId` (FileNodeId), `documentId` (DocumentId), `type` (LinkType), `createdAt` (DateTime), `migratedAt` (Maybe<DateTime>). Methods: `markAsInherited()`, `break()`.
- `src/domains/linking/domain/entities/link-graph.ts` — `LinkGraph` entity. Properties: `id` (LinkGraphId), `links` (CodeToDocLink[]). Methods: `addLink(link)`, `removeLink(id)`, `findByDocument(docId)`, `findByCodeFile(fileId)`, `findByCodeFileAndDocument(fileId, docId)`, `migrateLinks(oldDocId, newDocIds): CodeToDocLink[]`.
- `src/domains/linking/domain/value-objects/link-id.ts` — Extends Identifier.
- `src/domains/linking/domain/value-objects/link-graph-id.ts` — Extends Identifier.
- `src/domains/linking/domain/value-objects/link-type.ts` — Enum-like value object. `DIRECT` or `INHERITED`. Immutable.
- `src/domains/linking/domain/events/link-created.ts` — `LinkCreatedEvent`. Payload: `linkId`, `codeFileId`, `documentId`, `type`.
- `src/domains/linking/domain/events/link-broken.ts` — `LinkBrokenEvent`. Payload: `linkId`, `codeFileId`, `documentId`, `reason`.
- `src/domains/linking/domain/events/links-migrated.ts` — `LinksMigratedEvent`. Payload: `oldDocumentId`, `newDocumentIds`, `migratedLinkCount`.
- `src/domains/linking/domain/repository/link-repository.interface.ts` — `ILinkRepository`. Methods: `findById`, `findByDocument`, `findByCodeFile`, `findByCodeFileAndDocument`, `save`, `delete`, `findAll`.
- `src/domains/linking/domain/services/link-migration.service.ts` — `LinkMigrationService`. Domain service. Takes `oldDocumentId` and `newDocumentIds`. Finds all DIRECT links to old document. Creates new INHERITED links to each new document. Returns migrated links. Emits `LinksMigratedEvent`. PURE logic.

#### Application Layer
- `src/domains/linking/application/commands/create-link.command.ts` — `CreateLinkCommand`. Payload: `codeFileId: string`, `documentId: string`.
- `src/domains/linking/application/handlers/create-link.handler.ts` — Validates both file and document exist. Checks for duplicate. Creates `CodeToDocLink` with type `DIRECT`. Saves. Emits `LinkCreatedEvent`. If document was orphaned, triggers orphan clearance via EventBus.
- `src/domains/linking/application/commands/remove-link.command.ts` — `RemoveLinkCommand`. Payload: `linkId: string`.
- `src/domains/linking/application/handlers/remove-link.handler.ts` — Finds link. Removes from repository. Emits `LinkBrokenEvent`. Checks if document becomes orphaned. If so, emits `OrphanDetectedEvent`.
- `src/domains/linking/application/commands/migrate-links.command.ts` — `MigrateLinksCommand`. Payload: `oldDocumentId: string`, `newDocumentIds: string[]`.
- `src/domains/linking/application/handlers/migrate-links.handler.ts` — Calls `LinkMigrationService`. Saves migrated links. Emits `LinksMigratedEvent`.
- `src/domains/linking/application/queries/get-links-for-document.query.ts` — `GetLinksForDocumentQuery`. Payload: `documentId: string`.
- `src/domains/linking/application/handlers/get-links-for-document.handler.ts` — Returns all links for document, with type (DIRECT/INHERITED).
- `src/domains/linking/application/queries/get-links-for-codefile.query.ts` — `GetLinksForCodeFileQuery`. Payload: `codeFileId: string`.
- `src/domains/linking/application/handlers/get-links-for-codefile.handler.ts` — Returns all documents linked to a code file.
- `src/domains/linking/application/queries/get-unlinked-codefiles.query.ts` — `GetUnlinkedCodeFilesQuery`. Payload: `workspaceId: string`.
- `src/domains/linking/application/handlers/get-unlinked-codefiles.handler.ts` — Returns all code files with ZERO links. Used for "Unlinked Code Files" alert.
- `src/domains/linking/application/dto/code-to-doc-link.dto.ts` — Plain object. Properties: `id`, `codeFileId`, `documentId`, `type`, `createdAt`, `migratedAt`.
- `src/domains/linking/application/dto/link-graph.dto.ts` — Plain object. Properties: `documentId`, `linkedFiles` (array of file paths + link types).

#### Infrastructure Layer
- `src/domains/linking/infrastructure/repository/link-json.repository.ts` — Implements `ILinkRepository`. Stores in `.doclink/links.json`. Structure: `{ version, links: [] }`. Each link: `{ id, codeFileId, documentId, type, createdAt, migratedAt }`. Lightweight.
- `src/domains/linking/infrastructure/adapters/link-migration.engine.ts` — `LinkMigrationEngine`. Implements the migration algorithm. Used by `LinkMigrationService`. PURE logic.

#### Application Orchestration (Cross-Domain)
- `src/application/sagas/document-split.saga.ts` — `DocumentSplitSaga`. Listens to `DocumentDeletedEvent` from Documentation context. Checks if deleted document had child documents (links to other documents). If yes, calls `MigrateLinksCommand`. After migration, emits `LinksMigratedEvent`. Then checks each child document for orphaned status. This is the CRITICAL saga for the document split feature.

#### Electron IPC
- `.electron/ipc/handlers/linking-handlers.ts` — Registers: `linking:createLink`, `linking:removeLink`, `linking:migrateLinks`, `linking:getLinksForDocument`, `linking:getLinksForCodeFile`, `linking:getUnlinkedCodeFiles`.

#### Presentation Layer
- `src/presentation/hooks/useLinks.ts` — Hook. Exposes: `links`, `createLink(fileId, docId)`, `removeLink(linkId)`, `getLinksForDocument(docId)`, `getLinksForCodeFile(fileId)`, `isLoading`.
- `src/presentation/components/linking/LinkCreator.tsx` — UI for creating links. Shows file tree + document list. Drag-and-drop or select-based linking.
- `src/presentation/components/linking/LinkGraph.tsx` — Visual graph of links. Shows documents as nodes, code files as nodes, lines as edges. Color-coded by link type (DIRECT = solid, INHERITED = dashed).
- `src/presentation/components/linking/LinkBadge.tsx` — Small badge showing link count on a document or file. Clickable to show linked items.
- `src/presentation/components/linking/UnlinkedFilesAlert.tsx` — Alert panel showing code files with no links. User can click to link them.
- `src/presentation/pages/LinkingPage.tsx` — Full page. Split view: file tree on left, document list on right, link graph in center. Link creation UI.
- `src/presentation/stores/linking.store.ts` — Zustand store. Holds links, link graph, unlinked files.

### Deliverables
- [ ] User can link a code file to multiple documents
- [ ] User can link a document to multiple code files
- [ ] Deleting a parent document auto-migrates links to child documents (INHERITED type)
- [ ] INHERITED links are visually distinct from DIRECT links in UI
- [ ] Unlinked code files are shown in a dedicated alert panel
- [ ] `links.json` remains under 10KB for 500 links

---

## Phase 7: Notification Context (Warnings, Review Queue, Orphaned Docs)
**Objective:** Aggregate warnings, manage the review queue, and display alerts in a dedicated full-page UI.
**Duration Estimate:** 2-3 days
**Dependencies:** Phase 6 (Linking)
**Constitution References:** Section VI.6 (Notification & Review Queue), Section VII (Commandment 12)

### Files to Create

#### Domain Layer
- `src/domains/notification/domain/entities/warning.ts` — `Warning` entity. Properties: `id` (WarningId), `type` (WarningType), `documentId` (Maybe<DocumentId>), `filePath` (Maybe<FilePath>), `message` (string), `createdAt` (DateTime), `isCleared` (boolean), `clearedAt` (Maybe<DateTime>). Methods: `clear()`, `isActive(): boolean`.
- `src/domains/notification/domain/entities/review-queue.ts` — `ReviewQueue` aggregate root. Properties: `id` (QueueId), `workspaceId` (WorkspaceId), `warnings` (Warning[]), `unlinkedFiles` (FilePath[]), `orphanedDocuments` (DocumentPath[]). Methods: `addWarning(warning)`, `clearWarning(id)`, `addUnlinkedFile(path)`, `removeUnlinkedFile(path)`, `addOrphanedDocument(path)`, `removeOrphanedDocument(path)`, `getActiveWarnings(): Warning[]`.
- `src/domains/notification/domain/value-objects/warning-id.ts` — Extends Identifier.
- `src/domains/notification/domain/value-objects/queue-id.ts` — Extends Identifier.
- `src/domains/notification/domain/value-objects/warning-type.ts` — Enum-like value object. `OUTDATED` (linked code changed), `ORPHAN` (document has no links), `UNLINKED` (code file has no links).
- `src/domains/notification/domain/value-objects/severity.ts` — Enum-like value object. `LOW`, `MEDIUM`, `HIGH`. `OUTDATED` = HIGH, `ORPHAN` = MEDIUM, `UNLINKED` = LOW.
- `src/domains/notification/domain/events/warning-issued.ts` — `WarningIssuedEvent`. Payload: `warningId`, `type`, `documentId`, `filePath`.
- `src/domains/notification/domain/events/warning-cleared.ts` — `WarningClearedEvent`. Payload: `warningId`, `reason`.
- `src/domains/notification/domain/repository/notification-repository.interface.ts` — `INotificationRepository`. Methods: `findWarningById`, `findActiveWarnings`, `findWarningsByDocument`, `saveWarning`, `deleteWarning`, `findReviewQueue`, `saveReviewQueue`.
- `src/domains/notification/domain/services/warning-aggregator.service.ts` — `WarningAggregatorService`. Domain service. Takes a `ChangesDetectedEvent` and finds all linked documents. Creates a `Warning` of type `OUTDATED` for each linked document. PURE logic.

#### Application Layer
- `src/domains/notification/application/commands/issue-warning.command.ts` — `IssueWarningCommand`. Payload: `type: WarningType`, `documentId?: string`, `filePath?: string`, `message: string`.
- `src/domains/notification/application/handlers/issue-warning.handler.ts` — Creates `Warning`. Saves to repository. Emits `WarningIssuedEvent`.
- `src/domains/notification/application/commands/clear-warning.command.ts` — `ClearWarningCommand`. Payload: `warningId: string`, `reason: string`.
- `src/domains/notification/application/handlers/clear-warning.handler.ts` — Finds warning. Marks as cleared. Saves. Emits `WarningClearedEvent`.
- `src/domains/notification/application/queries/get-review-queue.query.ts` — `GetReviewQueueQuery`. Payload: `workspaceId: string`.
- `src/domains/notification/application/handlers/get-review-queue.handler.ts` — Returns `ReviewQueue` with all active warnings, unlinked files, and orphaned documents. Sorted by severity and date.
- `src/domains/notification/application/queries/get-warnings-for-document.query.ts` — `GetWarningsForDocumentQuery`. Payload: `documentId: string`.
- `src/domains/notification/application/handlers/get-warnings-for-document.handler.ts` — Returns active warnings for a specific document.
- `src/domains/notification/application/dto/warning.dto.ts` — Plain object. Properties: `id`, `type`, `severity`, `documentId`, `filePath`, `message`, `createdAt`, `isCleared`.
- `src/domains/notification/application/dto/review-queue.dto.ts` — Plain object. Properties: `totalWarnings`, `warningsByType`, `unlinkedFiles`, `orphanedDocuments`.

#### Infrastructure Layer
- `src/domains/notification/infrastructure/repository/notification-json.repository.ts` — Implements `INotificationRepository`. Stores in `.doclink/warnings.json`. Structure: `{ version, warnings: [] }`. Lightweight.
- `src/domains/notification/infrastructure/adapters/ui-notifier.adapter.ts` — `UiNotifierAdapter`. Sends IPC messages to renderer to update React state. Does NOT use OS notifications or popups. Only updates the ReviewQueuePage state.

#### Application Orchestration (Cross-Domain)
- `src/application/services/auto-link-migration.service.ts` — `AutoLinkMigrationService`. Listens to `LinksMigratedEvent`. Checks each new document for orphaned status. If links were migrated, clears ORPHAN warnings for those documents. Listens to `LinkCreatedEvent`. Clears UNLINKED warning for the code file. Clears ORPHAN warning for the document.
- `src/application/services/workspace-init.service.ts` — `WorkspaceInitService`. Orchestrates the full workspace initialization. Calls `InitializeWorkspaceHandler`, then `ScanProjectHandler`, then `RegisterDocsFolderHandler`, then `RecordHashHandler` for all files. Emits `WorkspaceReadyEvent` when complete.

#### EventBus Subscribers (Cross-Domain Wiring)
- `src/domains/notification/application/handlers/changes-detected-subscriber.ts` — Listens to `ChangesDetectedEvent` from Tracking context. Calls `WarningAggregatorService`. Issues `OUTDATED` warnings for all linked documents.
- `src/domains/notification/application/handlers/link-created-subscriber.ts` — Listens to `LinkCreatedEvent` from Linking context. Clears `ORPHAN` warning for the document. Clears `UNLINKED` warning for the code file.
- `src/domains/notification/application/handlers/document-deleted-subscriber.ts` — Listens to `DocumentDeletedEvent` from Documentation context. Clears all warnings for the deleted document.
- `src/domains/notification/application/handlers/commit-approved-subscriber.ts` — Listens to `CommitApprovedEvent` from Tracking context. Clears `OUTDATED` warnings for the approved document ONLY.

#### Electron IPC
- `.electron/ipc/handlers/notification-handlers.ts` — Registers: `notification:getReviewQueue`, `notification:getWarningsForDocument`, `notification:clearWarning`.

#### Presentation Layer
- `src/presentation/hooks/useWarnings.ts` — Hook. Exposes: `reviewQueue`, `warnings`, `clearWarning(id)`, `isLoading`.
- `src/presentation/components/alerts/ReviewQueue.tsx` — Main review queue component. Lists all warnings grouped by type. Shows severity badge, timestamp, document/file info. NO popups. NO modals.
- `src/presentation/components/alerts/WarningItem.tsx` — Individual warning row. Color-coded by severity (red = HIGH, yellow = MEDIUM, blue = LOW). Shows action button (Review, Link, Delete).
- `src/presentation/components/alerts/CommitPanel.tsx` — Panel within ReviewQueue. Shows pending commits for a document. Includes diff preview and "Approve" button.
- `src/presentation/pages/ReviewQueuePage.tsx` — **FULL PAGE** (not a popup). Dedicated route `/review-queue`. Shows complete review queue. Filterable by type, severity, document. Sortable by date.
- `src/presentation/stores/notification.store.ts` — Zustand store. Holds review queue, warning count, unread status.

### Deliverables
- [ ] Modifying a linked code file creates an `OUTDATED` warning for EACH linked document
- [ ] ReviewQueuePage shows all warnings in a structured, filterable list
- [ ] Approving a commit for Document A clears ONLY Document A's warnings
- [ ] Document B's warnings remain visible until individually addressed
- [ ] Orphaned documents appear in review queue with ORPHAN type
- [ ] Unlinked code files appear in review queue with UNLINKED type
- [ ] ZERO modal popups, toast notifications, or browser alerts anywhere in the app

---

## Phase 8: Presentation Layer Polish & User Experience
**Objective:** Complete the UI, ensure user-friendliness, implement navigation, and add the ignore pattern editor.
**Duration Estimate:** 3-4 days
**Dependencies:** Phase 7 (Notification)
**Constitution References:** Section I (KISS, User-Friendly), Section VI.2 (Ignore Patterns), Section VII (Commandment 12)

### Files to Create

#### Layout & Navigation
- `src/presentation/components/layout/Sidebar.tsx` — Navigation sidebar. Links to: Dashboard, File Browser, Documents, Linking, Review Queue, Settings. Shows badge counts for Review Queue.
- `src/presentation/components/layout/Navbar.tsx` — Top bar. Shows current workspace name, app logo, quick actions (Scan, Open Review Queue).
- `src/presentation/components/layout/WorkspaceSelector.tsx` — Dropdown to switch between recently opened workspaces. Shows path, last opened date.
- `src/presentation/components/common/Badge.tsx` — Reusable badge component. Color variants. Used for warning counts, link counts, orphan status.
- `src/presentation/components/common/Modal.tsx` — **FORBIDDEN for warnings.** Only used for confirmations (delete document, overwrite link). Must be explicitly justified.
- `src/presentation/components/common/TreeView.tsx` — Reusable recursive tree component. Collapsible nodes. Used for file tree and document tree.
- `src/presentation/components/common/EmptyState.tsx` — Friendly empty state illustration + message. Used when no files, no documents, no links exist yet.
- `src/presentation/components/common/LoadingSpinner.tsx` — Animated loading indicator. Bootstrap spinner + custom styling.

#### Pages
- `src/presentation/pages/DashboardPage.tsx` — Home page. Overview cards: Total Files, Total Documents, Active Links, Pending Warnings. Quick action buttons. Recent activity feed.
- `src/presentation/pages/SettingsPage.tsx` — Settings page. Ignore pattern editor (textarea with .gitignore syntax). Docs folder path display (read-only, with "Detect Relocation" button). Workspace info. App version.
- `src/presentation/pages/DocumentManagerPage.tsx` — (Enhanced from Phase 4). Add document preview pane. Add "Delete Orphan" button with confirmation modal.

#### Hooks
- `src/presentation/hooks/useIpc.ts` — Base IPC hook. Wraps `window.electronAPI`. Handles loading states, error states, request cancellation.
- `src/presentation/hooks/useBackgroundWatcher.ts` — (Enhanced). Listen to real-time file events from Main process. Update UI state without manual refresh.
- `src/presentation/hooks/useNavigation.ts` — React Router navigation helper. Programmatic navigation with history.

#### Styles
- `src/presentation/styles/custom-bootstrap.scss` — Complete Bootstrap 5.3.8 theme override. Custom colors matching CodeNexus branding. Card styles. Button styles. Form styles.
- `src/presentation/styles/animations.scss` — CSS animations for page transitions, loading states, warning pulses.
- `src/presentation/styles/variables.scss` — SCSS variables. Primary color, secondary color, warning colors, spacing scale, font stack.

#### Stores (Zustand)
- `src/presentation/stores/workspace.store.ts` — (Enhanced). Add workspace history, recent files.
- `src/presentation/stores/filesystem.store.ts` — (Enhanced). Add search/filter for file tree.
- `src/presentation/stores/documentation.store.ts` — (Enhanced). Add document search, sorting.
- `src/presentation/stores/linking.store.ts` — (Enhanced). Add link filtering, graph layout options.
- `src/presentation/stores/tracking.store.ts` — (Enhanced). Add diff view preferences.
- `src/presentation/stores/notification.store.ts` — (Enhanced). Add warning filters, read/unread state.
- `src/presentation/stores/ui.store.ts` — NEW. UI state: sidebar collapsed, theme (light/dark), active page, modal states (for confirmations only).

### Deliverables
- [ ] All pages are accessible via sidebar navigation
- [ ] Dashboard shows meaningful overview statistics
- [ ] ReviewQueuePage is a full-page route, not a popup
- [ ] Ignore patterns can be edited in Settings and take effect immediately
- [ ] UI is responsive and works on 1366x768 and 1920x1080
- [ ] Dark mode toggle works (Bootstrap dark theme variables)
- [ ] No user confusion: all actions have clear labels, icons, and feedback

---

## Phase 9: Integration, Testing, and Packaging
**Objective:** End-to-end testing, performance validation, cross-platform verification, and Electron packaging.
**Duration Estimate:** 3-5 days
**Dependencies:** All previous phases
**Constitution References:** Section IX (Immutable Checklist), Section VII (Commandments 13, 14)

### Files to Create

#### Unit Tests
- `tests/unit/shared-kernel/result.test.ts` — Result monad: success path, failure path, chaining.
- `tests/unit/shared-kernel/maybe.test.ts` — Maybe monad: some, none, map, flatMap.
- `tests/unit/shared-kernel/event-bus.test.ts` — EventBus: register, emit, async handling, error isolation.
- `tests/unit/project/domain/workspace.test.ts` — Workspace entity: invariants, path validation.
- `tests/unit/filesystem/domain/file-node.test.ts` — FileNode: path validation, directory flag.
- `tests/unit/filesystem/domain/ignore-pattern.test.ts` — IgnorePattern: glob validation, matching logic.
- `tests/unit/documentation/domain/doc-folder-signature.test.ts` — Signature: calculation, similarity scoring.
- `tests/unit/tracking/domain/hash-value.test.ts` — HashValue: length validation, content hashing.
- `tests/unit/tracking/domain/content-diff.test.ts` — ContentDiff: line comparison, empty check.
- `tests/unit/linking/domain/code-to-doc-link.test.ts` — Link: creation, type, inheritance.
- `tests/unit/linking/domain/link-migration.test.ts` — Migration: parent to children, link count preservation.
- `tests/unit/notification/domain/warning.test.ts` — Warning: creation, clearing, active check.

#### Integration Tests
- `tests/integration/workspace-init.test.ts` — Full workspace initialization: folder selection, .doclink creation, config validation.
- `tests/integration/file-scanning.test.ts` — Scan 1000 files, verify file-index.json size, verify tree structure.
- `tests/integration/file-watching.test.ts` — Modify file, detect change within 300ms, verify hash update.
- `tests/integration/docs-folder-detection.test.ts` — Detect docs folder, rename it, detect relocation.
- `tests/integration/link-creation.test.ts` — Create link, verify links.json, verify UI update.
- `tests/integration/link-migration.test.ts` — Split document, delete parent, verify auto-migration to children.
- `tests/integration/granular-commit.test.ts` — Modify two linked files, approve commit for one document, verify other still pending.
- `tests/integration/orphan-detection.test.ts` — Create document without links, verify orphan warning, link it, verify warning cleared.
- `tests/integration/ignore-patterns.test.ts` — Add pattern, verify excluded files not in tree, remove pattern, verify files appear.

#### E2E Tests (Playwright + Electron)
- `tests/e2e/code-nexus.spec.ts` — Full workflow:
  1. Open app
  2. Select workspace folder
  3. Verify .doclink created
  4. Verify docs folder detected
  5. Link a code file to a document
  6. Modify the code file
  7. Verify warning appears in ReviewQueuePage
  8. Open document, review changes
  9. Approve commit
  10. Verify warning cleared
  11. Create child document, link parent to child
  12. Delete parent document
  13. Verify links migrated to child
  14. Delete orphaned document
  15. Verify document removed from UI and file system

#### Performance Tests
- `tests/performance/scan-performance.test.ts` — Scan projects of 100, 1000, 5000, 10000 files. Measure time. Assert < 3s for 1000 files.
- `tests/performance/metadata-size.test.ts` — Verify .doclink folder size for projects of various sizes. Assert < 50KB for 1000 files.
- `tests/performance/watcher-performance.test.ts` — Rapidly modify 100 files. Verify all changes detected. Measure debounce efficiency.

#### Build & Package
- `package.json` scripts: `test`, `test:unit`, `test:integration`, `test:e2e`, `build`, `build:win`, `build:mac`, `build:linux`, `dist`.
- `electron-builder.json` — Final configuration. Code signing (if certificates available). Auto-updater setup.

### Deliverables
- [ ] 95%+ unit test coverage for Domain layer
- [ ] 80%+ integration test coverage for Application layer
- [ ] E2E test passes full workflow in under 5 minutes
- [ ] .doclink folder under 50KB for 1000-file project
- [ ] Scan completes in under 3 seconds for 1000-file project
- [ ] App packages successfully for Windows (.exe), macOS (.dmg), Linux (.AppImage)
- [ ] No `fs` imports in renderer process (verified by static analysis)
- [ ] No cross-context imports (verified by dependency graph analysis)
- [ ] All paths in .doclink are relative (verified by JSON schema test)

---

## Appendix A: File Count Estimates by Phase

| Phase | New Files | Cumulative | Notes |
|-------|-----------|------------|-------|
| Phase 0 | 15 | 15 | Scaffolding |
| Phase 1 | 20 | 35 | Shared Kernel |
| Phase 2 | 25 | 60 | Project Context |
| Phase 3 | 35 | 95 | FileSystem Context |
| Phase 4 | 25 | 120 | Documentation Context |
| Phase 5 | 30 | 150 | Tracking Context |
| Phase 6 | 30 | 180 | Linking Context |
| Phase 7 | 25 | 205 | Notification Context |
| Phase 8 | 20 | 225 | Presentation Polish |
| Phase 9 | 30 | 255 | Tests & Build |

**Total Estimated Files: ~255** (all under 200 lines, most under 100 lines)

---

## Appendix B: Constitution Compliance Checklist Per Phase

Before marking any phase as complete, verify:

- [ ] All new files are under 200 lines of code
- [ ] No existing files were bloated (only modified for exact SRP extensions)
- [ ] Domain layer contains ZERO external dependencies (no Electron, no React, no fs)
- [ ] All cross-context communication uses EventBus (no direct imports)
- [ ] All paths in .doclink JSON files are relative with forward slashes
- [ ] All hashes are SHA-256 with LF-normalized content
- [ ] Repository pattern is used for all persistence
- [ ] Value Objects are used for all primitives in domain logic
- [ ] Result<T,E> monad is used instead of exceptions in domain logic
- [ ] Unit tests exist for all new domain entities and value objects

---