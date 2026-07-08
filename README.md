# CodeNexus

A desktop application for linking documentation to code files, built with strict Domain-Driven Design and Onion Architecture principles.

## Technology Stack

- **Electron** (Main + Renderer processes)
- **React 19** (Functional components + Hooks)
- **TypeScript 5.7+** (Strict mode)
- **Vite** (Primary build tool)
- **Bootstrap 5.3.8** (Local assets)
- **FontAwesome 7 Pro** (Local assets)
- **Zustand** (Per-context state management)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run dist
```

## Architecture

The codebase follows the **CodeNexus Immutable Constitution**:
- Onion Architecture with Domain-Driven Design
- Six Bounded Contexts: Project, FileSystem, Documentation, Linking, Tracking, Notification
- Strict File-Isolation Mandate (no bloated files)
- IPC-only communication between Main and Renderer
- JSON persistence in `.doclink/` (portable, Git-friendly)

## Asset Placement

Place the following assets into `public/assets/` before running:
- `public/assets/bootstrap-pack/css/bootstrap.min.css`
- `public/assets/bootstrap-pack/js/bootstrap.min.js`
- `public/assets/FontAwesome/css/all.css`
- `public/assets/FontAwesome/webfonts/` (all font files)
- `public/assets/logo.png` (application logo)
