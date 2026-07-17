# CodeNexus

The fundamental flaw in software development is not that we fail to write documentation, but that we fail to maintain it. In any non-trivial codebase, documentation drift is not a possibility; it is a mathematical certainty. As code evolves, the documentation gradually decays into a liability—a collection of statements that actively mislead developers rather than guide them.

Version control systems excel at tracking what changed in our code, but they are completely blind to the ripple effects those changes have on our documentation. The moment a developer modifies a function, deletes a file, or refactors an architecture, a contract is broken. Traditionally, enforcing that contract relies entirely on human discipline, which is inherently unreliable at scale.

CodeNexus was built to eliminate this reliance on human memory. It is a desktop application engineered to establish a rigid, traceable, and automated synchronization layer between your source code and your documentation.

## The Philosophy

CodeNexus does not attempt to auto-generate your documentation. Auto-generation produces noise, not clarity. Instead, CodeNexus operates on the principle of strict accountability. It answers a singular, critical question: *Given the changes I just made to my codebase, exactly which of my documents are now lying to me?*

To achieve this, the tool shifts the paradigm from passive file storage to active relationship mapping. It treats the link between a code file and a document as a first-class entity. 

When you establish this link, CodeNexus creates a cryptographic baseline of the code file's state. From that point forward, a background daemon monitors the file system. It does not wait for a manual scan or a scheduled cron job. The exact moment a line of code is added, modified, or deleted, CodeNexus identifies every single document connected to that file and flags it as outdated.

## Architectural Decisions

Building a tool that bridges two distinct domains requires aggressive simplification to prevent over-engineering. Several core decisions dictate how CodeNexus operates:

**Granular Accountability Over Global Checkpoints**
In standard version control, a commit is a global snapshot. CodeNexus rejects this for documentation updates. If a code file is linked to three separate documents, and you update document A, only document A's alert is cleared. Documents B and C remain flagged. This forces a strict, file-by-file review process, ensuring no architectural change slips through the cracks unreviewed.

**Structural Entropy Resilience**
Developers reorganize folders constantly. If a documentation folder is renamed, moved, or nested deeper, CodeNexus does not interpret this as a deletion. It maintains the integrity of the references based on immutable tracking mechanisms, not fragile string paths. 

**Intelligent Inheritance**
Documentation often starts as a monolith and is later split into smaller, focused files. CodeNexus allows for document-to-document linking. If a master document is deleted, its code file references are automatically distributed to its predefined sub-documents. The topological mapping is preserved without requiring manual, error-prone re-linking.

**Zero-Bloat Local Storage**
All metadata, baselines, and relationship mappings are stored in a hidden directory at the root of the project. This directory contains absolutely no file contents—only lightweight state data. This ensures that integrating CodeNexus into a repository adds negligible overhead to Git operations and does not bloat the repository size.

**Isolated Scoping**
Large monorepos often contain isolated modules with their own ecosystems. CodeNexus allows a user to initialize the tool within a specific sub-directory. In this mode, the application operates in a strict sandbox, completely unaware of and unaffected by the rest of the repository. A built-in navigation system allows seamless switching between these isolated workspaces.

**Orphan Management**
CodeNexus actively profiles the health of the project. It surfaces two specific states: code files that have been created but lack documentation, and documentation files that exist but have no code linked to them. Both represent a breakdown in the documentation contract and are presented to the developer for resolution.

---

## Local Development Setup

If you wish to contribute to the source code or run the application locally from the repository, ensure you have a modern Node.js environment configured. Clone the repository and install the dependencies:

```bash
git clone https://github.com/Shahrokh1383/code-nexus.git
cd code-nexus
npm install
```

To launch the application in a local development environment with hot-reloading capabilities, run:

```bash
npm run dev
```

To compile the application into a distributable desktop package, execute:

```bash
npm run package
```