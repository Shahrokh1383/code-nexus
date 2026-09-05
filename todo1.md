
### Phase 3: Persistence Layer Diet (`.doclink` Optimization)
**Goal:** Shrink `tracking-index.json` to pure metadata.

1. **Update `HashEntrySchema`:**
   * **Modify:** `src/domains/tracking/infrastructure/repository/tracking-json.repository.ts`
   * **New Schema:**
     ```typescript
     interface HashEntrySchema {
       id: string;
       filePath: string;
       currentHash: string;
       committedHash: string | null;
       isPending: boolean;
     }
     ```
2. **Refactor `IHashRepository` Interface:**
   * **Modify:** `src/domains/tracking/domain/repository/hash-repository.interface.ts`
   * **Action:** Remove `findDiffByPath`. Remove `diff` parameter from `saveHash`. Add `updatePendingStatus(filePath: string, isPending: boolean, committedHash?: string)`.
3. **Bump Schema Version:**
   * **Modify:** `tracking-json.repository.ts` -> Change `SCHEMA_VERSION` to `'2.0'`.
   * **Action:** Add migration logic in `schema-migrator.ts` to convert old `hashValue` to `currentHash` and drop the `diff` field from existing JSON files.

### Phase 4: Application Layer Refactoring (Core Logic)
**Goal:** Implement Link-Only tracking and correct Diff caching flow.

1. **Modify `DetectChangesHandler`:**
   * **Modify:** `src/domains/tracking/application/handlers/detect-changes.handler.ts`
   * **Action:** Inject `ILinkedDocumentQueryPort`. At the start of `execute`, check if the file is linked. If not, return `Result.ok(undefined)` immediately to save CPU/RAM.
2. **Rewrite `RecordHashHandler`:**
   * **Modify:** `src/domains/tracking/application/handlers/record-hash.handler.ts`
   * **Flow:**
     1. Read current content via `IFileContentReader`.
     2. Load baseline via `IBaselineDiffCacheRepository`.
     3. Calculate Diff using `DiffCalculatorService`.
     4. **Save Diff** to `IBaselineDiffCacheRepository` (NOT to HashRepo).
     5. **Save Metadata** (`currentHash`, `isPending: true`) to `IHashRepository`.
     6. Emit `ChangesDetectedEvent`.
3. **Rewrite `ApproveCommitHandler`:**
   * **Modify:** `src/domains/tracking/application/handlers/approve-commit.handler.ts`
   * **Action:** **Delete** `CommitMatcherService` injection.
   * **Flow:** For each linked file, call `hashRepo.updatePendingStatus(filePath, false, currentHash)`. Then call `cacheRepo.clearCacheForFile(filePath)` to wipe the Diff and Baseline from AppData. Emit `CommitApprovedEvent`.
4. **Rewrite `GetFileDiffHandler`:**
   * **Modify:** `src/domains/tracking/application/handlers/get-file-diff.handler.ts`
   * **Action:** Inject `IBaselineDiffCacheRepository` and `IHashRepository`.
   * **Flow:** Check if file `isPending` in HashRepo. If yes, fetch Diff from CacheRepo. If CacheRepo returns `null` (cache missing), return a specific Result/DTO indicating `CacheMissing` so the UI can show a warning instead of crashing.

### Phase 5: IPC & UI Contract Updates
**Goal:** Ensure Renderer receives the correct state.

1. **Update `file-diff.ipc.ts`:**
   * **Modify:** `electron/ipc/handlers/tracking/file-diff.ipc.ts`
   * **Action:** Pass the new dependencies (`cacheRepo`, `hashRepo`) to `GetFileDiffHandler`. Handle the `CacheMissing` state and return it as a structured IPC response.
2. **Update UI Hooks (Renderer):**
   * **Modify:** `src/presentation/hooks/useFileDiff.ts` (or equivalent).
   * **Action:** If IPC returns `CacheMissing`, display a full-page inline warning in the Tracking page: *"Baseline cache is missing for this file. Please review and re-commit to establish a new baseline."* (Strictly obeying Rule VI.6: No toasts/modals).

---
