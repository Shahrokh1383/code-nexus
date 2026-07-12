## Phase 6: Linking Context (Many-to-Many Code↔Doc & Doc↔Doc Links, Auto Migration)

**Objective:** Create and manage code‑to‑document **and** document‑to‑document links, handle document splits, and auto‑migrate code links via Saga when a parent document is deleted.

**Dependencies:** Phase 4 (Documentation), Phase 5 (Tracking)

**Constitution References:** Section VI.4 (Linking & Many-to-Many), Section VI.5 (Document Split), Section VII (Commandment 4)

---

### Domain Layer

#### Code‑to‑Document Links

- `src/domains/linking/domain/entities/code-to-doc-link.ts`  
  `CodeToDocLink` aggregate root.  
  Properties: `id` (LinkId), `codeFileId` (FileNodeId), `documentId` (DocumentId), `type` (LinkType), `createdAt` (DateTime), `migratedAt` (Maybe<DateTime>).  
  Methods: `markAsInherited()`, `break()`.

- `src/domains/linking/domain/value-objects/link-id.ts` – Extends Identifier.
- `src/domains/linking/domain/value-objects/link-type.ts` – Enum‑like value object. `DIRECT` or `INHERITED`. Immutable.

#### Document‑to‑Document Links

- `src/domains/linking/domain/entities/document-to-document-link.ts`  
  `DocumentToDocumentLink` aggregate root.  
  Properties: `id` (DocumentLinkId), `parentDocumentId` (DocumentId), `childDocumentId` (DocumentId), `type` (LinkType), `createdAt` (DateTime).  
  Methods: `markAsInherited()`, `break()`.  

  **Why this entity?** It represents a hierarchical relationship between documents. When a parent is split, we create links from parent to children. Later, if the parent is deleted, the `DocumentSplitSaga` queries these links to find all children and migrates code‑to‑document links accordingly.

- `src/domains/linking/domain/value-objects/document-link-id.ts` – Extends Identifier.

#### Shared Entities

- `src/domains/linking/domain/entities/link-graph.ts`  
  `LinkGraph` entity (manages both link types).  
  Properties: `id` (LinkGraphId), `codeLinks` (CodeToDocLink[]), `documentLinks` (DocumentToDocumentLink[]).  
  Methods:  
  - `addCodeLink(link)` / `addDocumentLink(link)`  
  - `removeCodeLink(id)` / `removeDocumentLink(id)`  
  - `findByDocument(docId): { codeLinks, childDocumentLinks, parentDocumentLinks }`  
  - `findByCodeFile(fileId)`  
  - `migrateCodeLinksFromParent(parentDocId, childDocIds): CodeToDocLink[]` – moves/duplicates code links from parent to children.

- `src/domains/linking/domain/value-objects/link-graph-id.ts` – Extends Identifier.

#### Domain Events

- `src/domains/linking/domain/events/link-created.ts` – `LinkCreatedEvent` (can be for code or doc link, distinguished by payload: `linkId`, `type` (code or doc), `sourceId`, `targetId`).  
- `src/domains/linking/domain/events/link-broken.ts` – `LinkBrokenEvent`.  
- `src/domains/linking/domain/events/links-migrated.ts` – `LinksMigratedEvent` (for code links migrated).  
- `src/domains/linking/domain/events/document-link-created.ts` – `DocumentLinkCreatedEvent` (optional, but keeps granularity).  
- `src/domains/linking/domain/events/document-link-broken.ts` – `DocumentLinkBrokenEvent`.

#### Repository Interfaces

- `src/domains/linking/domain/repository/link-repository.interface.ts`  
  `ILinkRepository` – for code‑to‑document links.  
  Methods: `findById`, `findByDocument`, `findByCodeFile`, `findByCodeFileAndDocument`, `save`, `delete`, `findAll`.

- `src/domains/linking/domain/repository/document-link-repository.interface.ts`  
  `IDocumentLinkRepository` – for document‑to‑document links.  
  Methods: `findById`, `findByParentDocument`, `findByChildDocument`, `findByParentAndChild`, `save`, `delete`, `findChildrenOf(parentDocId): DocumentId[]`.
