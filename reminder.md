### Application Orchestration (Cross-Domain)

- `src/application/sagas/document-split.saga.ts` – **DocumentSplitSaga**.  
  Listens to `DocumentDeletedEvent`.  
  1. Queries the document‑to‑document link repository to find all children of the deleted document (using `GetDocumentChildrenQuery`).  
  2. If children exist, calls `MigrateLinksCommand` with `oldDocumentId` = deleted doc, `newDocumentIds` = child IDs.  
  3. After migration, emits `LinksMigratedEvent`.  
  4. Checks each child for orphan status (maybe via `OrphanDetectedEvent`).  

  **Note:** This saga bridges Documentation, Linking, and Notification contexts.

---

### Electron IPC

- `electron/ipc/handlers/linking-handlers.ts` registers channels for:
  - `linking:createLink` (code link)
  - `linking:removeLink`
  - `linking:createDocumentLink`
  - `linking:removeDocumentLink`
  - `linking:migrateLinks`
  - `linking:getLinksForDocument`
  - `linking:getLinksForCodeFile`
  - `linking:getUnlinkedCodeFiles`
  - `linking:getDocumentChildren`
  - `linking:getDocumentParents`

---