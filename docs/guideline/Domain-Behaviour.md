# Domain Mandates SSOT — CodeNexus
**Executable Single Source of Truth for Domain Behavior**

> This document defines the **unbreakable domain-level contracts** of CodeNexus.
> It is **mandatory and complementary** to the Architecture Constitution.
> Where the Architecture Constitution defines *how modules communicate*, this document defines *what each module must do and must never do*.
> Any deviation is technical debt and must be corrected before merge.

---

## 0. Purpose & Authority

- This document governs **domain behavior**, **data contracts**, **cross-module events**, **service contracts**, **error contracts**, and **UI presentation rules tied to domain concerns**.
- It is the **only** authority for:
  - `.doclink` schema and rules
  - FileSystem scanning & watching behavior
  - Documentation folder detection & resilience
  - Linking cardinality, link types, and migration
  - Tracking hashes, diffs, and commit granularity
  - Warnings placement in UI
  - Orphaned document handling
  - Sub-folder scoping isolation
- Conflicts between this document and any code are resolved in favor of this document.
- Conflicts between this document and the Architecture Constitution are resolved by:
  - Architecture Constitution wins for **structure, boundaries, IPC, DI, error envelope**.
  - Domain Mandates wins for **business rules, data shape, domain invariants**.

---

## 1. Module Ownership Map

Each domain concern has exactly **one owning module**. No other module may implement, duplicate, or bypass it.

| Concern | Owning Module | Exclusive Authority |
|---|---|---|
| Workspace lifecycle (create/open/switch/close) | `project` | Workspace state, `.doclink` root, scoped isolation |
| File scanning & watching | `filesystem` | Node `fs`, `chokidar`, ignore patterns, path normalization |
| Documentation folder detection & resilience | `documentation` | Docs folder identity, fingerprinting, rename detection |
| Code ↔ Document relationships | `linking` | Link graph, link types, split migration |
| Hashing, diff, commit state | `tracking` | SHA-256, line-level diffs, per-document commit |
| App-level configuration | `settings` | OS-specific config.json (NOT workspace `.doclink`) |

**Rule:** If a capability does not fit an existing module with **100% alignment**, create a new module. Never overload an existing one.

---

## 2. The `.doclink` Contract (Immutable Metadata Contract)

The `.doclink` folder is the **absolute source of truth** for all workspace metadata.

### 2.1 Location

- Created at the **root of the scoped workspace**, not the project root.
- If the user scopes a workspace at `src/features/`, then `.doclink/` lives at `src/features/.doclink/`.

### 2.2 Structure

```text
.doclink/
├── meta.json
├── config.json
├── files.json
├── documents.json
└── links.json
```

### 2.3 Schema Shapes

**meta.json**
```json
{
  "schemaVersion": 1,
  "createdAt": "ISO-8601",
  "appVersion": "semver"
}
```

**config.json**
```json
{
  "schemaVersion": 1,
  "workspaceName": "string",
  "docsFolder": "relative/path/with/forward/slashes",
  "ignorePatterns": ["node_modules/", ".git/", "dist/", "build/", ".doclink/", "*.log"],
  "settings": {}
}
```

**files.json**
```json
{
  "schemaVersion": 1,
  "files": {
    "src/index.ts": {
      "hash": "sha256:...",
      "committedHash": "sha256:..."
    }
  }
}
```

**documents.json**
```json
{
  "schemaVersion": 1,
  "documents": {
    "docs/intro.md": {
      "hash": "sha256:...",
      "committedHash": "sha256:..."
    }
  }
}
```

**links.json**
```json
{
  "schemaVersion": 1,
  "links": [
    {
      "file": "src/index.ts",
      "document": "docs/intro.md",
      "type": "DIRECT",
      "createdAt": "ISO-8601"
    }
  ]
}
```

### 2.4 Immutable Rules

1. **NEVER** store file contents inside `.doclink`. Metadata only.
2. **NEVER** use absolute paths. All paths are relative to workspace root.
3. **ALWAYS** use forward slashes (`/`) for stored paths, regardless of OS.
4. **ALWAYS** write atomically: write temp file → `fsync` → rename.
5. **ALWAYS** bump `schemaVersion` on any shape change.
6. **ALWAYS** implement a migration in `schema-migrator` when `schemaVersion` increases.
7. **NEVER** exceed a reasonable size budget: metadata-only, target **< 1MB per 10,000 tracked files**. If exceeded, investigate for bloat.
8. **ALWAYS** ensure `.doclink` is safe to commit to Git (human-readable, deterministic order, no timestamps in per-file entries).
9. **NEVER** delete `.doclink` without explicit user confirmation and a backup step.

### 2.5 Owning Module

- Only the `project` module may create or delete `.doclink/`.
- Only `filesystem`, `documentation`, `linking`, and `tracking` modules may write their respective files (via infrastructure adapters).
- No other module may touch `.doclink`.

---

## 3. FileSystem Module Mandates

### 3.1 Exclusive Authority

- The `filesystem` module is the **only** module allowed to:
  - import Node.js `fs`
  - import `chokidar`
  - perform path normalization
  - apply ignore patterns
  - perform initial scans
  - perform real-time watching

### 3.2 Rules

1. **Renderer never touches fs.** All file operations go through IPC → `filesystem` service.
2. **Path normalization is mandatory.** All stored paths use forward slashes. All incoming paths are normalized on entry.
3. **LF normalization for hashing.** Before any hash is computed, line endings are normalized to LF. This prevents cross-OS hash mismatches.
4. **Debouncing is mandatory.** Real-time watch events are debounced (default: **300ms**) to batch rapid changes.
5. **Ignore patterns apply to BOTH scan and watch.** The same `.docignore` resolution logic is used in both paths.
6. **Default ignore list** (applied unless user overrides):
   - `node_modules/`
   - `.git/`
   - `dist/`
   - `build/`
   - `.doclink/`
   - `*.log`
7. **Cross-platform path safety.** Path resolution handles Windows separators, symlinks, and case-insensitive file systems.
8. **Rename detection.** Chokidar reports renames as `unlink` + `add`. The module MUST correlate these within the debounce window to emit a single `FileRenamed` event when possible. If correlation is impossible, emit `FileDeleted` + `FileCreated`.

### 3.3 Events Emitted

- `ScanStarted`
- `ScanCompleted`
- `FileCreated`
- `FileModified`
- `FileDeleted`
- `FileRenamed`
- `WatchStarted`
- `WatchStopped`
- `WatchError`

### 3.4 Service Contract (Public)

```ts
export interface FileSystemServiceContract {
  scan(workspaceRoot: string): Promise<ScanResult>;
  startWatch(workspaceRoot: string): Promise<void>;
  stopWatch(): Promise<void>;
  normalizePath(p: string): string;
  computeContentHash(absolutePath: string): Promise<string>;
}
```

### 3.5 Forbidden

- Direct `fs` in any other module.
- Storing absolute paths in `.doclink`.
- Hashing without LF normalization.
- Watching without debouncing.
- Applying ignore patterns only in scan or only in watch.

---

## 4. Documentation Module Mandates

### 4.1 Exclusive Authority

- The `documentation` module is the **only** module allowed to determine which folder contains the project's documentation.

### 4.2 Rules

1. **Docs folder path** is stored in `.doclink/config.json` as a **relative path**.
2. **Rename resilience is mandatory.** If the folder is renamed (e.g., `docs` → `Docs`), the module MUST detect this via **content-based fingerprinting**:
   - file count signature
   - directory structure signature
   - fuzzy file-name matching
   and update the stored path automatically.
3. **Case-insensitive matching** is mandatory.
4. **Nested structures of any depth** are supported.
5. **A rename is NOT a user error.** It must NEVER trigger data loss or re-initialization.
6. **Ambiguity resolution.** If two candidate folders match the fingerprint, the module MUST emit a `DocsFolderAmbiguous` event and refuse to auto-switch. User confirmation is required via UI.

### 4.3 Events Emitted

- `DocumentationFolderDetected`
- `DocumentationFolderChanged`
- `DocsFolderAmbiguous`
- `DocumentCreated`
- `DocumentModified`
- `DocumentDeleted`
- `OrphanedDocumentDetected`
- `OrphanedDocumentResolved`

### 4.4 Service Contract (Public)

```ts
export interface DocumentationServiceContract {
  getDocsFolder(): string | null;
  setDocsFolder(relativePath: string): Promise<void>;
  detectDocsFolder(workspaceRoot: string): Promise<string | null>;
  listDocuments(): Promise<DocumentDescriptor[]>;
  fingerprintFolder(absolutePath: string): Promise<FolderFingerprint>;
}
```

### 4.5 Forbidden

- Any other module deciding the docs folder.
- Storing absolute docs folder paths.
- Failing on case differences.
- Triggering re-initialization on rename.

---

## 5. Linking Module Mandates

### 5.1 Exclusive Authority

- The `linking` module is the **only** module allowed to manage relationships between code files and documents.

### 5.2 Rules

1. **Many-to-many is mandatory.** One code file MAY link to multiple documents. One document MAY link to multiple code files. **No artificial cardinality limits.**
2. **Link types:**
   - `DIRECT` — user-created.
   - `INHERITED` — auto-created during document split migration.
   The UI MUST visually distinguish these types.
3. **Document split migration is mandatory.**
   When a parent document is deleted after being linked to child documents, the **Saga** (`document-split.saga.ts`) MUST automatically migrate all code file links from the parent to **ALL** children.
   - This is non-negotiable.
   - Users must NEVER manually re-link files after a split.
   - Migration is atomic: either all links migrate or none.
4. **Link integrity.** A link whose target file or document no longer exists MUST be removed by the module and a `LinkRemoved` event emitted.
5. **Duplicate prevention.** A `DIRECT` link between the same file and document MUST NOT be created twice. Idempotent creation.

### 5.3 Events Emitted

- `LinkCreated`
- `LinkRemoved`
- `LinksMigrated`
- `LinkMigrationFailed`

### 5.4 Service Contract (Public)

```ts
export interface LinkingServiceContract {
  createLink(file: string, document: string, type: LinkType): Promise<void>;
  removeLink(file: string, document: string): Promise<void>;
  getLinksForFile(file: string): Promise<LinkDescriptor[]>;
  getLinksForDocument(document: string): Promise<LinkDescriptor[]>;
  migrateLinks(fromDocument: string, toDocuments: string[]): Promise<MigrationResult>;
}
```

### 5.5 Forbidden

- Any other module writing `links.json`.
- Limiting cardinality.
- Manual relinking after split.
- Partial migration on split (must be all-or-nothing).

---

## 6. Tracking Module Mandates

### 6.1 Exclusive Authority

- The `tracking` module is the **only** module allowed to calculate content hashes, detect diffs, and manage commit state.

### 6.2 Rules

1. **Hash algorithm:** SHA-256 of **normalized file content** (LF line endings).
2. **Metadata MUST NOT affect the hash.** Timestamps, permissions, ownership, and extended attributes are excluded.
3. **Granular per-document commits are mandatory.**
   - There is **NO global "commit all" button.**
   - Approving a commit for Document A **ONLY** updates the stored state for that document and clears its pending status.
   - Other documents with pending changes MUST remain pending until individually reviewed and committed.
4. **Line-level diff detection is mandatory.** Added, removed, and modified lines MUST be surfaced in the review UI.
5. **Pending state definition:**
   - A file or document is **pending** if `hash !== committedHash`.
   - A document with no `committedHash` is **pending from creation**.
6. **Commit atomicity.** Approving a commit updates `committedHash` in one atomic write to `.doclink/{files,documents}.json`.

### 6.3 Events Emitted

- `PendingChangesDetected`
- `PendingChangesCleared`
- `CommitApproved`
- `CommitRejected`
- `HashMismatchDetected`

### 6.4 Service Contract (Public)

```ts
export interface TrackingServiceContract {
  computeHash(relativePath: string): Promise<string>;
  getPendingChanges(): Promise<PendingChange[]>;
  approveCommit(relativePath: string): Promise<void>;
  rejectCommit(relativePath: string): Promise<void>;
  computeLineDiff(relativePath: string): Promise<LineDiff>;
}
```

### 6.5 Forbidden

- Global commit functionality.
- Hashing without LF normalization.
- Hashing metadata.
- Silent commit state mutation outside `tracking`.

---

## 7. Warnings & UI Display Mandates

### 7.1 Rule

Warnings (outdated files, orphaned documents, unlinked files) are **NOT** managed by a separate Notification module.

### 7.2 Placement

Each concern is displayed **inline** within its **owning context's dedicated full-page view**:

| Warning | Owning Module | Page |
|---|---|---|
| Outdated files (code changed after commit) | `tracking` | Tracking page (pending changes list, aggregated counts) |
| Orphaned documents (docs with zero links) | `documentation` | Documentation page (dedicated orphaned section) |
| Unlinked code files (code files with no document link) | `linking` | Linking page (unlinked files list) |

### 7.3 Hard Rules

1. **Full-page views only.**
2. **NEVER** use modal popups.
3. **NEVER** use toast notifications.
4. **NEVER** use browser `alert()`.
5. **Auto-clear.** Warnings MUST clear automatically when the root cause is resolved (commit approved, link created, orphan deleted).
6. **Discoverability.** Each page MUST surface a count badge or indicator for its warnings so the user knows where to look. Discoverability UI is defined in the Renderer, but the **count data** must come from the owning module's service contract.

---

## 8. Orphaned Documents Mandates

### 8.1 Detection

- The `documentation` module MUST detect documents that exist in the docs folder but have **ZERO** links to code files.
- Detection runs after every `ScanCompleted`, `LinkCreated`, and `LinkRemoved`.

### 8.2 Display

- Orphaned documents MUST be displayed in a **dedicated section** of the Documentation page.
- They MUST have a **distinct visual warning badge**.

### 8.3 Deletion

- Users MUST be able to delete orphaned documents directly from the application.
- Deletion MUST remove **both** the physical file **AND** its metadata record in `.doclink/documents.json`.
- **Before deletion**, the user MUST be presented with the document's content (or a summary) to confirm it is truly obsolete.
- Deletion MUST be atomic across physical file and metadata.

### 8.4 Events

- `OrphanedDocumentDetected`
- `OrphanedDocumentResolved`
- `OrphanedDocumentDeleted`

### 8.5 Forbidden

- Silent deletion.
- Deleting without content preview.
- Leaving orphaned metadata after physical deletion (or vice versa).

---

## 9. Sub-folder Scoping Mandates (Workspace Isolation)

### 9.1 Rule

A user MAY initialize a workspace at any sub-folder depth within a project.

### 9.2 Isolation Rules

1. **Strict isolation.** When scoped to a sub-folder, the application MUST NOT access, scan, or display files outside the scoped folder.
2. **`.doclink` location.** Created at the **root of the scoped folder**, not the project root.
3. **No traversal.** Path resolution MUST reject any path that escapes the scoped root (`..` traversal must be blocked).
4. **Watcher lifecycle.** Switching workspaces MUST:
   - stop the current file watcher
   - clear all in-memory caches
   - start a new watcher for the new scope
   - re-run initial scan for the new scope
5. **Navigation between scoped workspaces** is handled by the `project` module.

### 9.3 Events

- `WorkspaceOpened`
- `WorkspaceClosed`
- `WorkspaceSwitched`
- `WorkspaceScopeViolation`

### 9.4 Forbidden

- Accessing files outside scope.
- Reusing watcher across scopes.
- Retaining caches from a previous scope.

---

## 10. Cross-Module Event Contracts

All events live in `src/main/shared/event-bus/event-contracts.ts` inside `DomainEventMap`.

| Event | Emitted By | Consumed By (examples) |
|---|---|---|
| `WorkspaceOpened` | `project` | `filesystem`, `documentation`, `tracking` |
| `WorkspaceClosed` | `project` | all modules |
| `WorkspaceSwitched` | `project` | all modules |
| `WorkspaceScopeViolation` | `project` | `filesystem`, `documentation` |
| `ScanStarted` | `filesystem` | `tracking` |
| `ScanCompleted` | `filesystem` | `documentation`, `linking`, `tracking` |
| `FileCreated` | `filesystem` | `tracking`, `linking` |
| `FileModified` | `filesystem` | `tracking` |
| `FileDeleted` | `filesystem` | `tracking`, `linking` |
| `FileRenamed` | `filesystem` | `tracking`, `linking` |
| `WatchStarted` | `filesystem` | `project` |
| `WatchStopped` | `filesystem` | `project` |
| `WatchError` | `filesystem` | `project` |
| `DocumentationFolderDetected` | `documentation` | `project` |
| `DocumentationFolderChanged` | `documentation` | `linking`, `tracking` |
| `DocsFolderAmbiguous` | `documentation` | `project` |
| `DocumentCreated` | `documentation` | `linking`, `tracking` |
| `DocumentModified` | `documentation` | `tracking` |
| `DocumentDeleted` | `documentation` | `linking`, `tracking` |
| `OrphanedDocumentDetected` | `documentation` | `project` |
| `OrphanedDocumentResolved` | `documentation` | `project` |
| `OrphanedDocumentDeleted` | `documentation` | `linking`, `tracking` |
| `LinkCreated` | `linking` | `tracking` |
| `LinkRemoved` | `linking` | `tracking` |
| `LinksMigrated` | `linking` | `tracking` |
| `LinkMigrationFailed` | `linking` | `project` |
| `PendingChangesDetected` | `tracking` | `project` |
| `PendingChangesCleared` | `tracking` | `project` |
| `CommitApproved` | `tracking` | `linking` |
| `CommitRejected` | `tracking` | `project` |
| `HashMismatchDetected` | `tracking` | `project` |

**Rule:** Adding a new event requires updating `DomainEventMap` and adding it to this table.

---

## 11. Cross-Module Service Contracts

Each module MUST expose a public service contract if any other module needs synchronous access.
Contracts live in `src/main/modules/{context}/services/contracts/`.

- `FileSystemServiceContract` (Section 3.4)
- `DocumentationServiceContract` (Section 4.4)
- `LinkingServiceContract` (Section 5.4)
- `TrackingServiceContract` (Section 6.4)
- `ProjectServiceContract` (defined by `project`)

**Rules:**

- Contracts are the **only** legal synchronous cross-module channel.
- Contracts MUST be pure TypeScript interfaces.
- Contracts MUST NOT import infrastructure or Node APIs.
- Tokens use `Symbol('...')` and are exported from the contract file.
- No module may import another module's internal services, entities, adapters, or infrastructure.

---

## 12. Domain Error Contracts

Each module defines its own `DomainException` subclasses in `src/main/modules/{context}/domain/errors/`.

| Module | Error Codes |
|---|---|
| `project` | `WorkspaceAlreadyOpen`, `WorkspaceNotOpen`, `WorkspaceScopeViolation` |
| `filesystem` | `FileNotFound`, `PathOutsideWorkspace`, `IgnorePatternInvalid`, `WatchFailed` |
| `documentation` | `DocsFolderNotFound`, `DocsFolderAmbiguous`, `FingerprintFailed` |
| `linking` | `LinkAlreadyExists`, `InvalidLinkTarget`, `MigrationFailed` |
| `tracking` | `HashMismatch`, `CommitConflict`, `DiffFailed` |

**Rules:**

- IPC handlers do NOT catch domain exceptions; the global error formatter converts them into `IpcFailure`.
- Renderer hooks check `res.ok` before reading data.
- Silent failures are forbidden.

---

## 13. Domain Immutable Checklist

Before every commit, verify:

- [ ] No `fs` or `path` imports outside the `filesystem` module.
- [ ] No module other than `documentation` decides the docs folder.
- [ ] No module other than `linking` writes `links.json`.
- [ ] No module other than `tracking` computes hashes or commit state.
- [ ] No module other than `project` creates/deletes `.doclink/`.
- [ ] All `.doclink` paths are relative and use forward slashes.
- [ ] All hashes use LF-normalized content.
- [ ] No global commit functionality added.
- [ ] No modal/toast/alert for warnings.
- [ ] Warnings clear automatically when root cause resolved.
- [ ] Orphaned document deletion removes physical file AND metadata, with content preview.
- [ ] Split migration migrates links to **all** children atomically.
- [ ] Watcher stops and caches clear on workspace switch.
- [ ] No path escapes scoped workspace root.
- [ ] New events added to `DomainEventMap` and Section 10 table.
- [ ] New service contracts are pure interfaces and exposed via tokens.
- [ ] New domain errors are added to Section 12 and implemented as `DomainException` subclasses.

---

## 14. Enforcement & Amendment

1. **This document is immutable in spirit.** Changes must go through an explicit **Amendment** process.
2. **Amendment process:**
   - Propose change with rationale.
   - Identify affected modules.
   - Update this document with a **new version number** and changelog.
   - Update any dependent contracts, events, or migrations.
   - Add migration if `.doclink` schema changes.
3. **Code review MUST reject** any PR that violates this document, even if tests pass.
4. **CI SHOULD** include a lint rule or test that asserts the checklist items where technically feasible (e.g., forbidding `fs` imports outside `filesystem`).
5. **Conflict resolution order:**
   - Architecture Constitution → for structure, boundaries, IPC, DI, error envelope.
   - This document → for domain rules, data shape, invariants.
   - Code → never wins.

---

*This document is the complete Domain Mandates SSOT for CodeNexus. Any deviation is technical debt and must be corrected.*