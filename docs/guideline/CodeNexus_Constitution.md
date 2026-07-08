# 🏛️ THE CODENEXUS IMMUTABLE CONSTITUTION
### Single Source of Truth (SSOT) for Architecture, Development, Debugging and Refactoring

This document is immutable. It defines the strict boundaries, workflows, and unbreakable rules of the CodeNexus codebase. Any developer or AI assistant must adhere strictly to these laws to prevent architectural degradation.

---

## I. Core Philosophies & Unbreakable Principles

The CodeNexus codebase is built upon a strict Domain-Driven Design (DDD) foundation with Onion Architecture. Every line of code must respect the following principles:

1. **SRP (Single Responsibility Principle):** Every class, method, and file must have exactly ONE reason to change. A file that handles both file scanning and UI rendering has already failed.
2. **KISS (Keep It Simple Stupid):** Favor simple, readable solutions over clever abstractions. If a plain function solves the problem, do not create a class hierarchy. If a JSON file works, do not add a database.
3. **DRY (Don't Repeat Yourself):** Shared logic must be extracted into the `shared-kernel`, base classes, or specialized utilities. Never copy-paste domain logic across contexts.
4. **SOLID:** Strict adherence to Dependency Inversion (Constructor Injection) and Open/Closed principles. Domain layers depend on abstractions, never on concrete implementations.
5. **Bounded Context Isolation:** The system is divided into distinct domains (**Project, FileSystem, Documentation, Linking, Tracking, Notification**). Domains MUST NOT leak logic into one another. Cross-domain communication occurs ONLY via the EventBus (asynchronous) or injected Domain Services (synchronous, within Application Layer only).
6. **No Over-Engineering:** Every abstraction must earn its existence. If removing a class simplifies the code without losing functionality, remove it. The `.doclink` folder must remain under 50KB for a 1000-file project.

---

## II. The Golden Rule: Strict File-Isolation (The "No-Bloat" Mandate)

This is the most critical rule for scaling the CodeNexus codebase.

**The Law:** *When introducing a new feature, capability, or domain concept, you MUST create NEW files rather than bloating existing ones.*

* **Allowed Modifications:** You may ONLY modify an existing file if the new logic strictly falls under that file's exact, pre-defined Single Responsibility (e.g., adding a new validation rule to an existing `FilePath.value-object.ts`, or adding a new event handler to an existing `EventBus` registry).
* **Forbidden Modifications:** You MUST NOT add new business logic, new domain calculations, new UI components, or new infrastructure adapters to an existing file if it dilutes its primary purpose.
* **Execution Example:** If you need to add a "Export Link Graph to CSV" feature, you DO NOT add an `exportToCsv()` method to the existing `LinkingPage.tsx`. Instead, you create:
  * `src/domains/linking/application/queries/get-link-graph.query.ts`
  * `src/domains/linking/application/handlers/get-link-graph.handler.ts`
  * `src/presentation/components/linking/LinkGraphExportButton.tsx`
  * `src/presentation/hooks/useLinkGraphExport.ts`

* **Why?** This ensures files remain small, highly cohesive, strictly SRP-compliant, and infinitely easier to debug, test, and replace. A 50-line file is a joy to maintain. A 500-line file is a liability.

---

## III. The Request Lifecycle (The DDD Flow)

Every user action, IPC call, or background event MUST follow this exact, unalterable path. Skipping a layer is strictly forbidden.

1. **User Action / System Event:** A user clicks a button, or the file watcher detects a change. This is the trigger.
2. **Presentation Layer (React):** The React component captures the event, calls a custom Hook, which invokes the IPC Client. The component itself contains ZERO business logic. It only renders UI and delegates.
3. **IPC Bridge (Electron):** The IPC Client sends a typed message to the Main Process. The Preload script enforces context isolation. The Main Process receives the message and routes it to the appropriate Handler.
4. **Application Layer (Command/Query Handler):** The Handler receives the DTO, validates it (if needed), and orchestrates domain operations. It calls Domain Services, Repositories, or emits Commands. It contains NO UI logic and NO direct file system calls.
5. **Domain Layer (Entities, Value Objects, Domain Services):** The core business logic executes here. This layer is PURE — it knows nothing about Electron, React, file system APIs, or IPC. It operates on Entities and Value Objects only. It emits Domain Events.
6. **Infrastructure Layer (Repositories, Adapters):** If the domain operation requires persistence, the Domain layer calls a Repository Interface. The Infrastructure layer implements this interface using JSON files, file system APIs, or hash calculators. The Domain layer never knows which implementation is used.
7. **EventBus (Cross-Domain Communication):** If the operation affects another Bounded Context (e.g., a file change triggers a warning in the Notification context), the originating context emits a Domain Event. The EventBus delivers it to the subscribing context's handler. Contexts NEVER import each other's classes directly.
8. **Response Path:** The result flows back through the Repository → Domain Service → Application Handler → IPC Response → React Hook → React Component → UI Update.

---

## IV. Step-by-Step Guide: Adding a New Feature

When tasked with adding a new feature, follow this exact sequence to maintain architectural integrity:

1. **Identify the Bounded Context:** Does this belong to Project, FileSystem, Documentation, Linking, Tracking, or Notification? If it spans multiple contexts, identify the primary owner and use the EventBus for secondary effects.
2. **Define Domain Events:** Before writing any code, define the Domain Events that will be emitted. Events are the API between contexts. Name them in past tense (e.g., `FileModifiedEvent`, `LinkCreatedEvent`).
3. **Create or Extend Domain Entities/Value Objects:** If the feature introduces a new business concept, create it in `src/domains/{context}/domain/entities/` or `value-objects/`. If it extends an existing concept, ensure the modification does not violate SRP.
4. **Create the Application Layer:**
   * If reading data: Create a Query in `src/domains/{context}/application/queries/` and a Handler in `src/domains/{context}/application/handlers/`.
   * If writing data: Create a Command in `src/domains/{context}/application/commands/` and a Handler in `src/domains/{context}/application/handlers/`.
   * If the feature is a long-running process (e.g., document split with link migration): Create a Saga in `src/application/sagas/`.
5. **Create or Extend Infrastructure:**
   * If persistence is needed: Create a Repository implementation in `src/domains/{context}/infrastructure/repository/` or extend the existing JSON database schema.
   * If external APIs are needed: Create an Adapter in `src/domains/{context}/infrastructure/adapters/`.
6. **Create the IPC Handler (Main Process):** In `.electron/ipc/handlers/`, create or extend a handler group to wire the IPC channel to the Application Handler.
7. **Create the React Hook (Renderer Process):** In `src/presentation/hooks/`, create a custom hook that calls the IPC Client and manages React state.
8. **Create the UI Component:** In `src/presentation/components/` or `pages/`, create the React component. It must use the custom Hook and contain ZERO business logic.
9. **Register the Route:** If this is a new page, add it to the React Router configuration in `App.tsx`.
10. **Wire up Cross-Domain Side Effects:** If this feature triggers actions in another context (e.g., creating a link triggers a warning check), register an EventBus subscriber in the affected context's Application layer.

---

## V. Step-by-Step Guide: Debugging & Refactoring

When tracking down a bug or planning a refactor, use this top-down trace methodology:

1. **Trace the UI Entry Point:** Identify the React component and Hook that initiated the action. Verify the correct IPC channel is called with the correct payload.
2. **Trace the IPC Handler:** In `.electron/ipc/handlers/`, verify the IPC handler is registered and correctly routes to the Application Handler.
3. **Check the Application Handler:** Verify the handler receives the correct DTO, performs any necessary validation, and delegates to the correct Domain Service or Repository.
4. **Check the Domain Layer:** This is where 90% of business logic bugs live. Verify Entity invariants, Value Object validation, and Domain Event emission. Check for missing edge cases (e.g., empty arrays, null values, path traversal).
5. **Check the Infrastructure Layer:** If data is incorrect or missing, verify the Repository implementation reads/writes the correct JSON files in `.doclink/`. Verify file system adapters handle paths correctly (cross-platform separators, relative vs absolute).
6. **Check the EventBus:** If a cross-domain side effect did not occur, verify the Domain Event was emitted and that the subscribing handler is registered correctly. Check for typos in event class names.
7. **Check the File Watcher:** If real-time changes are not detected, verify the Chokidar watcher is watching the correct path, ignore patterns are not excluding the file, and the debounce timer is not swallowing rapid changes.
8. **Refactoring Strategy:** If a file has grown too large (violating SRP/KISS), break it down using the **File-Isolation Mandate**. Extract specific sub-domains into new files. For example, if `FileNode.ts` handles both tree structure and hash calculation, split it into `FileNode.ts` and `FileHash.ts` (Value Object).

---

## VI. Domain-Specific Mandates

### 1. The `.doclink` Folder (The Immutable Metadata Contract)
* The `.doclink` folder is the **absolute Source of Truth** for all project metadata.
* **NEVER** store file contents inside `.doclink`. Only store paths, hashes, links, and lightweight configuration.
* **NEVER** use absolute paths inside `.doclink` JSON files. All paths must be relative to the workspace root to ensure portability across machines and OSes.
* The `.doclink` folder must be treated as a **user-data artifact**. It is created by the application, managed by the application, and must be safe to commit to Git. Its total size must never exceed 50KB for a 1000-file project.
* If the schema of any JSON file in `.doclink` changes, you MUST implement a schema migration in `src/infrastructure/persistence/migration/schema-migrator.ts` and bump the version field in the JSON files.

### 2. File System & Watching
* The `FileSystem` context is the **only** context allowed to interact with the Node.js `fs` module or `chokidar`.
* **NEVER** use `fs` directly in the Renderer process (React). All file system operations MUST go through the IPC bridge to the Main process.
* The file watcher must use **debouncing** (default: 300ms) to batch rapid changes and prevent UI thrashing.
* Ignore patterns (`.docignore`) must be applied during BOTH the initial scan AND real-time watching. The default ignore list includes: `node_modules/`, `.git/`, `dist/`, `build/`, `.doclink/`, and `*.log`.
* Path normalization is MANDATORY. All stored paths must use forward slashes (`/`) regardless of the host OS. All hashes must be calculated on content with LF line endings to prevent OS-specific hash mismatches.

### 3. Documentation Folder Resilience
* The `Documentation` context is the **only** context allowed to determine which folder contains the project's documentation.
* The docs folder path is stored in `.doclink/config.json` as a **relative path**.
* If the folder is renamed (e.g., `docs` → `Docs`), the system MUST detect this via **content-based fingerprinting** (file count, directory structure signature, fuzzy file name matching) and update the stored path automatically. This is NOT a user error and must NOT trigger data loss or re-initialization.
* The docs folder detection logic MUST be case-insensitive and resilient to nested structures of any depth.

### 4. Linking & Many-to-Many Relationships
* The `Linking` context is the **only** context allowed to manage relationships between code files and documents.
* One code file MAY link to multiple documents. One document MAY link to multiple code files. There are NO artificial limits on link cardinality.
* Links have a **type**: `DIRECT` (user-created) or `INHERITED` (auto-created during document split migration). The UI must visually distinguish these types.
* When a parent document is deleted after being linked to child documents, the **Saga** in `src/application/sagas/document-split.saga.ts` MUST automatically migrate all code file links from the parent to ALL children. This is non-negotiable. Users must NEVER manually re-link files after a split.

### 5. Tracking & Granular Commits
* The `Tracking` context is the **only** context allowed to calculate content hashes, detect diffs, and manage commit state.
* Commits are **granular and per-document**. There is NO global "commit all" button. Approving a commit for Document A ONLY updates the stored hashes for files linked to Document A and ONLY clears warnings for Document A.
* Other documents with pending changes MUST remain in their warning state until individually reviewed and committed.
* Hash algorithm: **SHA-256** of normalized file content. Metadata (timestamps, permissions) must NOT affect the hash.
* The system must detect line-level changes (added, removed, modified lines) and surface this information in the review UI.

### 6. Notification & Review Queue
* The `Notification` context is the **only** context allowed to issue warnings and manage the review queue.
* **NEVER** use modal popups, toast notifications, or browser alerts for warnings. All warnings MUST be displayed in the dedicated `ReviewQueuePage` (a full-page view, not a popup).
* Warnings have a **type**: `OUTDATED` (linked code changed), `ORPHAN` (document has no links), `UNLINKED` (code file has no links).
* Warnings MUST be cleared automatically when their root cause is resolved (e.g., a commit is approved, a link is created, an orphaned document is deleted).

### 7. Orphaned Documents
* The system MUST detect documents that exist in the docs folder but have ZERO links to code files.
* Orphaned documents MUST be displayed in a dedicated section of the UI with a distinct visual warning badge.
* Users MUST be able to delete orphaned documents directly from the application. This deletion MUST remove both the physical file AND its metadata record in `.doclink`.
* Before deletion, the user MUST be presented with the document's content (or a summary) to confirm it is truly obsolete.

### 8. Sub-folder Scoping (Workspace Isolation)
* A user MAY initialize a workspace at any sub-folder depth within a project.
* When scoped to a sub-folder, the application MUST be strictly isolated. It MUST NOT access, scan, or display files outside the scoped folder.
* The `.doclink` folder is created at the **root of the scoped folder**, not the project root.
* Navigation between multiple scoped workspaces is handled by the `Project` context. Switching workspaces MUST stop the current file watcher, clear in-memory caches, and start a new watcher for the new scope.

---

## VII. The 12 Commandments of CodeNexus

1. Thou shalt not put Node.js `fs` calls in the Renderer process. All file operations go through IPC.
2. Thou shalt not put React UI logic in Domain or Application layers.
3. Thou shalt not bypass the EventBus to call another Bounded Context directly.
4. Thou shalt not create bloated "God Classes"; split them using the File-Isolation Mandate.
5. Thou shalt use Value Objects for all primitives (paths, IDs, hashes) — never raw strings in domain logic.
6. Thou shalt use Commands for writes and Queries for reads (CQRS within each context).
7. Thou shalt emit Domain Events for all state changes that might affect other contexts.
8. Thou shalt use the Repository pattern for all persistence; Domain layers never touch JSON files directly.
9. Thou shalt never store file contents in `.doclink`; only metadata, paths, and hashes.
10. Thou shalt never use absolute paths in `.doclink`; only relative paths from workspace root.
11. Thou shalt enforce granular per-document commits; global commits are forbidden.
12. Thou shalt never show warnings as popups; use the dedicated ReviewQueuePage only.
13. Thou shalt respect the Onion Architecture dependency rule: Domain -> Application -> Infrastructure -> Presentation. Dependencies point inward only.
14. Thou shalt test Domain logic with 95%+ coverage; this is your business logic and must never break.
15. Thou shalt normalize line endings to LF before hashing to prevent cross-OS hash mismatches.

---

## VIII. Technology Stack Constraints

The following technologies are MANDATORY and NON-NEGOTIABLE:

* **Electron:** Main process (Node.js) for file system access and watching. Renderer process (Chromium) for UI. Context isolation MUST be enabled (`contextIsolation: true`).
* **React 19:** Functional components with Hooks. Concurrent features for large lists. React.lazy() + Suspense for code splitting.
* **TypeScript 5.9:** Strict mode enabled. No `any` types in Domain or Application layers. Explicit return types on all public methods.
* **Bootstrap 5.3.8:** Loaded locally from `public/bootstrap/`. Custom SCSS overrides in `src/presentation/styles/custom-bootstrap.scss`. No CDN usage.
* **FontAwesome 7 Pro:** Loaded locally from `public/fontawesome/`. No CDN usage.
* **Chokidar:** File watching library. Used ONLY in the Main process.
* **Zustand (or lightweight alternative):** State management in React. One store per Bounded Context. No global monolithic store.
* **JSON Files:** Persistence layer. No SQLite, no LevelDB, no external databases. Human-readable, Git-friendly, lightweight.

---

## IX. The Immutable Checklist

Before every commit, every developer must verify:

- [ ] No `fs` or `path` imports in any file under `src/domains/` or `src/presentation/`.
- [ ] No React imports in any file under `src/domains/` or `src/application/`.
- [ ] No cross-context imports (e.g., `LinkingContext` importing `FileSystemContext` classes directly). EventBus only.
- [ ] All new files are under 200 lines. If a file exceeds 200 lines, it must be split.
- [ ] All paths in `.doclink` JSON files are relative and use forward slashes.
- [ ] `.doclink` folder size is under 50KB for test projects.
- [ ] Domain Events are emitted for all cross-context state changes.
- [ ] Unit tests exist for all new Domain logic.
- [ ] No modal popups or toast notifications for warnings. ReviewQueuePage only.
- [ ] Granular commit logic is preserved; no global commit functionality was added.

---

## X. Testing Standards & Conventions

All CodeNexus tests must follow strict co‑location and structural rules to keep the test suite navigable, maintainable, and aligned with the Onion Architecture.

### 1. Co‑located Tests (Jest `__tests__` Convention)
* Tests live in **`__tests__` folders** that **mirror the source tree** exactly. This is known as the **colocated tests** pattern.
* Example mapping:

```
src/domains/project/application/handlers/initialize-workspace.handler.ts
src/domains/project/__tests__/application/handlers/initialize-workspace.handler.test.ts
```

* **NEVER** place tests in a separate top‑level `tests/` directory. Tests must always sit adjacent to the code they verify.

### 2. File Naming
* Test files use the suffix **`.test.ts`** (or `.test.tsx` for React components).
* The file name must match the source file exactly (e.g., `workspace.ts` → `workspace.test.ts`).
* This makes it trivial to locate the corresponding tests for any source file.

### 3. Mirror the Layer Structure
* The `__tests__` hierarchy must replicate the full DDD layer structure:
  * `src/domains/project/__tests__/domain/entities/`
  * `src/domains/project/__tests__/application/handlers/`
  * `src/domains/project/__tests__/infrastructure/repository/`
* Presentation‑layer tests follow the same rule:
  * `src/presentation/hooks/__tests__/useWorkspace.test.ts`
  * `src/presentation/pages/__tests__/WelcomePage.test.tsx` (when created)

### 4. Test Isolation & Purity
* **Domain tests MUST be pure unit tests.** They test entities, value objects, and domain events without any mocks, filesystem, or network calls.
* **Application handler tests** may mock repository interfaces; never import concrete infrastructure classes directly in tests (use the same interface abstractions).
* **Infrastructure tests** (repositories, adapters) may mock the `fs` module or use real JSON files in a temporary directory, but must never depend on the real `.doclink` of a workspace.
* **Presentation tests** test hooks and components in isolation. Mock `window.electronAPI` for IPC calls. Use React Testing Library’s `renderHook` / `render` with appropriate `act()` wrappers.

### 5. Coverage Mandate
* **Domain logic coverage must remain ≥ 95%** at all times (Commandment 14). This includes entities, value objects, domain events, and domain services.
* Application handlers and infrastructure repositories must have ≥ 80% coverage.
* Presentation hooks and stores should have ≥ 80% coverage.
* Run `npx jest --coverage` regularly; failing coverage targets is a build‑stopper in CI.

### 6. Build Exclusions
* The root `tsconfig.json` and `tsconfig.electron.json` already exclude `**/__tests__/**` from production builds. Never remove that exclusion.
* Jest configuration (in `package.json` or `jest.config.ts`) must point to `src` as the root and use `testMatch: ["**/__tests__/**/*.test.ts"]`.

### 7. Mocking Rules
* Use `jest.mock` only for external dependencies (Node.js modules, Electron IPC, `fs`).
* Never mock domain entities or value objects.
* When mocking `fs`, always use `jest.mock('fs', () => ({ promises: { ... } }))` to keep tests fast and deterministic.

### 8. State Cleanup
* If a test modifies global state (e.g., Zustand stores, EventBus), reset it in `beforeEach` using the store’s own `clear`/`reset` method or by manually setting initial state.
* After tests that set `window.electronAPI`, delete the property in `afterEach` to prevent leakage.

---

This testing convention ensures every line of production code has a predictable, easy‑to‑find test, and keeps the codebase ready for scaling and refactoring without regressions.

*This Constitution is immutable. It is the single source of truth for the CodeNexus project. Any deviation must be corrected immediately.*