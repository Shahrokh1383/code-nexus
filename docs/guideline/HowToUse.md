# How To Use CodeNexus

This document outlines the standard operating procedure for integrating CodeNexus into your development workflow. Following these steps in order will ensure a stable, traceable relationship between your codebase and your documentation.

## 1. Initializing the Workspace

Upon launching the application, the first requirement is to define the scope of your project. Select the root folder of your codebase to initialize the workspace. This action sets the boundary for the application's file system watcher and establishes the context for all subsequent operations.

## 2. Configuring Exclusions (Ignore Rules)

Before establishing a baseline, it is critical to filter out noise. Not all files in a project require documentation (e.g., compiled assets, dependency directories, generated minified files).

Navigate to the **Ignore** section and add the specific file or folder names that you wish to exclude from all tracking mechanisms.

Exclusions take effect immediately and automatically. The moment an entry is added, CodeNexus removes the matching paths from its tracking state on its own — no manual **Rescan** is required. The application dynamically reorganizes everything affected by the new rule and refreshes the project tree, which always renders correctly according to the current ignore configuration. Ignored files and folders simply disappear from the tree and from tracking, with no further action needed from you.

## 3. Defining the Documentation Directory

With the workspace initialized, you must point the application to your documentation folder using the **Doc** button.

This selection is fully flexible. If you pick the wrong folder, you can correct it at any time: click **Doc** again and select the proper directory. CodeNexus immediately detects the new documentation path and adopts it cleanly, without any problems or additional configuration.

CodeNexus does not rely on fragile absolute paths or static folder names. If you subsequently rename this folder, move it to a different depth within the project tree, or relocate it entirely, the application will retain its tracking state and automatically relocate the reference.

After selection, navigate to the **Docs** page. Here, the application categorizes your documentation into two distinct states:
*   **Orphaned Documentation:** Documents that currently exist in the folder but have zero code files linked to them. These require immediate review to determine if they are obsolete or simply unlinked.
*   **Linked Documentation:** Active documents displaying the exact count of code file connections they currently hold.

## 4. Establishing Relationships (The Link Module)

This is the core mechanism of CodeNexus. Navigate to the **Link** page to map your codebase to your documentation.

**Executing a Link:**
Using the sidebar—relying primarily on the search functionality for efficiency—select your target document. From this interface, you can perform two types of mappings:
*   **Code-to-Doc:** Link one or multiple source code files to the selected document.
*   **Doc-to-Doc:** Link the selected document to other documents to establish a structural hierarchy.

**Understanding the Interface:**
*   **The Linked Files Tab:** Displays a complete list of every code file linked to the selected document, each shown with its exact path. There is no graph visualization; relationships are presented as a clear, directly inspectable list.
*   **The Hierarchy Tab:** Displays a strict tree structure of your document-to-document relationships, defining clear parent and child boundaries.

**Handling Structural Changes (Inheritance):**
If a parent document is deleted, CodeNexus does not orphan the associated code files. Instead, it automatically migrates all code links from the deleted parent directly to its child documents. Following this automatic inheritance, you can enter the child documents and manually prune any specific code links that are no longer relevant to that specific sub-document.

## 5. Tracking, Reviewing, and Committing

Once your links are established, the passive phase of the workflow ends and the automated phase begins. You do not need to trigger scans manually. The CodeNexus daemon monitors your file system continuously in the background.

**Offline and Startup Reconciliation:**
Tracking is no longer limited to the time the application is running. CodeNexus fully supports offline change tracking: if you modify your codebase while the application is closed, nothing is lost. On the next launch, the application automatically reconciles the current state of the workspace against its stored baselines and surfaces every change that accumulated while it was off, flagging the affected documents exactly as if the changes had been observed live.

Navigate to the **Tracking** page to manage the lifecycle of your documentation updates:

*   **Alert Surface:** The moment a tracked code file is modified, added, or deleted, the Tracking UI will immediately flag every single document linked to that file as requiring an update.
*   **Pending Review:** Click on a flagged document and navigate to the **Pending** section. Here, you are presented with a precise diff: exactly which code files changed, and the specific lines that were altered.
*   **The Update Cycle:** Open your actual documentation files externally or within your editor and update them to reflect the code changes.
*   **Granular Commit:** Once the documentation is updated, return to CodeNexus and execute a **Commit** for that specific document. This action records the new baseline *only* for the code files linked to that document, and removes the alert *only* for that document. Other documents affected by the same code change will remain flagged until they are individually reviewed and committed.

By adhering to this cycle, you guarantee that the documentation folder is never out of sync with the underlying codebase. The background tracking engine handles observation while the app is running, and startup reconciliation catches up on everything that happened while it was closed; you handle the verification.