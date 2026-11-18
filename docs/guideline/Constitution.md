# Architecture Constitution — CodeNexus
**Executable Single Source of Truth (SSOT)**

> This document is the only authoritative architecture source for CodeNexus.  
> Any conflicting code is incorrect and must be refactored.

## Philosophy

> Pragmatic Modular Monolith + Lightweight DDD for Electron Desktop Applications.  
> Pure TypeScript Domain Entities. Business logic lives in Main Process Services.  
> Frontend (Renderer): Pages orchestrate, Hooks own logic, Components present.  
> Backend (Main): IPC Handlers route, Services execute, Infrastructure performs OS/FS I/O.

**Open-World Principle:** This system scales to **thousands of Bounded Contexts**.  
Current modules are only initial modules. Every AI/developer must assume an **infinite module space** and create new contexts whenever a new business capability emerges.

---

## 1. Bounded Contexts & Infinite Scalability

- Every new feature belongs to exactly one module.
- If it does not semantically fit into an existing module with **100% alignment**, create a new Bounded Context.
- Never force a capability into an existing module just to avoid a new folder.
- Main Process modules never import another module's internal Services, Infrastructure, or Entities.
- Cross-module communication is allowed only through the two legal channels defined in **Section 2**.
- **Aggregator contexts** are lightweight modules for UI pages needing data from multiple modules. They contain no core business logic.

---

## 2. Core Architecture Model

### Main Process Flow

```text
IPC Handler
  -> ServiceContainer
  -> Domain Service
  -> Infrastructure Adapter
  -> OS / FileSystem / Config
```

### Renderer Flow

```text
Page
  -> Hook
  -> Feature IPC Client
  -> window.api.invoke
  -> preload bridge
  -> Main IPC Handler
```

### Cross-Module Communication

| Type | Allowed Method |
|---|---|
| Synchronous read | Resolve public Service Contract from `ServiceContainer` |
| Async side-effect | Emit Domain Event via shared EventBus |
| Renderer realtime | Receive event through IPC only |

Forbidden:

- Importing another module's internal service, entity, adapter, or infrastructure.
- Importing `src/main/` from Renderer.
- Creating direct cross-module concrete dependencies.

---

## 3. Hard Constraints

- Electron security is immutable: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Renderer must never access Node.js APIs.
- Renderer must never import from `src/main/`.
- Bootstrap / React-Bootstrap and standard CSS only.
- Tailwind CSS is strictly banned.
- No SQL databases.
- No God Files.
- No unnecessary abstractions.
- No Hexagonal over-engineering.
- Prefer files under 180–200 LOC.
- New domain capability means new module.

---

## 4. Main Process Structure

```text
src/
├── shared/
│   ├── ipc/
│   │   ├── {context}.ts
│   │   ├── system.ts
│   │   ├── channels.ts
│   │   └── envelope.ts
│   └── types/
│
└── main/
    ├── bootstrap/
    │   ├── app.ts
    │   ├── preload.ts
    │   └── window-manager.ts
    ├── config/
    │   └── modules.ts
    ├── kernel/
    │   ├── service-container.ts
    │   ├── module-provider.ts
    │   └── module-manager.ts
    ├── shared/
    │   ├── entities/
    │   ├── value-objects/
    │   ├── errors/
    │   ├── event-bus/
    │   ├── logger/
    │   └── ipc/
    │       ├── handler.ts
    │       └── error-formatter.ts
    └── modules/
        └── {context}/
```

### Shared Kernel Rules

Shared Kernel may contain:

- truly shared entities/value objects,
- EventBus,
- logger,
- base errors,
- shared utilities,
- generic IPC handler/error formatter.

Promotion rule:

> Add something to Shared Kernel only if at least three modules need it and it does not belong to a single domain.

---

## 5. ServiceContainer

`ServiceContainer` is a thin generic dependency container.

Exact contract:

```ts
export type ServiceToken<T> = symbol;

export interface ServiceContainer {
  bind<T>(token: ServiceToken<T>, factory: (c: ServiceContainer) => T): void;
  resolve<T>(token: ServiceToken<T>): T;
}
```

Rules:

- All services are **singletons by default**.
- The container caches the first resolved instance and returns it on subsequent resolves.
- Factories are synchronous.
- `ServiceContainer` contains no module-specific imports.
- It never becomes a God File.

Forbidden:

- manually instantiating services in `app.ts`
- manually instantiating services in IPC handlers
- editing container internals for each new module
- storing module knowledge inside kernel files

---

## 6. ModuleProvider

Every module has exactly one provider implementing:

```ts
export interface ModuleProvider {
  register(c: ServiceContainer): void;
  boot(c: ServiceContainer): void | Promise<void>;
}
```

Responsibilities:

- register services in `ServiceContainer`
- register IPC handlers
- subscribe to external domain events
- start module lifecycle services if needed

---

## 7. Module Skeleton

```text
src/main/modules/{context}/
├── {Context}Provider.ts
├── domain/
│   ├── entities/
│   ├── value-objects/
│   └── events/
├── services/
│   ├── {Context}Service.ts
│   └── contracts/
│       └── {Context}ServiceContract.ts
├── infrastructure/
├── ipc/
│   ├── {Context}Ipc.ts
│   ├── schemas.ts
│   └── index.ts
└── index.ts
```

### Service Contract

Every module must export a public service contract if any other module needs synchronous access.

```ts
export const ExampleServiceToken: ServiceToken<ExampleServiceContract> =
  Symbol('ExampleService');

export interface ExampleServiceContract {
  execute(input: ExampleInput): Promise<ExampleResponse>;
}
```

---

## 8. Module Registry

`src/main/config/modules.ts` is the only module registry file.

```ts
export const enabledModuleProviders: ModuleProvider[] = [];
```

Adding a new module must require only:

1. adding its provider to this array
2. creating the module skeleton
3. adding shared IPC contract + channel to aggregator
4. adding Renderer feature/page/route

---

## 9. IPC Contracts

### Shared Contract

Location:

```text
src/shared/ipc/{context}.ts
```

Contains:

- channel name constants
- pure TypeScript input/output DTO types

Must be free of:

- Zod
- imports from `main/`
- imports from Node.js
- runtime logic

### Channel Aggregator

`src/shared/ipc/channels.ts` aggregates all channel constants from every shared IPC contract.

Preload and Renderer use this aggregator for whitelisting and typing.

---

## 10. IPC Validation (Zod)

Zod schemas live only in Main process:

```text
src/main/modules/{context}/ipc/schemas.ts
```

They must be typed as `z.ZodType<SharedType>` to prevent drift.

This compiles only if schema matches the shared type exactly.

---

## 11. IPC Handlers

IPC handlers are thin controllers.

Allowed:

1. validate payload with Zod
2. resolve service from container
3. call one service method
4. return result or throw domain error

Forbidden:

- business logic
- direct `fs`
- direct OS calls
- direct `new Service()`
- catching and hiding domain exceptions

### Common Handler Utility

`createIpcHandler` accepts channel, schema, and execute function. It validates input, resolves service from container, and returns `IpcResponse<TOutput>`.

`serviceContainer` is the singleton instance created in bootstrap and passed implicitly to all module providers. Do not import `serviceContainer` directly from kernel into module code.

---

## 12. IPC Response Envelope & Error Formatter

All IPC responses use the same envelope.

```ts
export type IpcResponse<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        details?: unknown;
      };
    };
```

Main-side `formatIpcError` handles `DomainException`, `ZodError`, and unknown errors.

Renderer hooks must check `res.ok` before reading data.

---

## 13. Preload Security

Preload exposes only whitelisted IPC channels using `ALL_IPC_CHANNELS`.

Forbidden:

- exposing generic arbitrary `ipcRenderer.invoke` without whitelist
- exposing Node.js APIs
- exposing Electron internals
- allowing Renderer direct access to Main modules

---

## 14. EventBus

### Event Contracts

`src/main/shared/event-bus/event-contracts.ts` defines `DomainEventMap` with event names and payloads.

### EventBus API

```ts
export interface EventBus {
  emit<K extends DomainEventName>(name: K, payload: DomainEventPayload<K>): void;
  on<K extends DomainEventName>(name: K, listener: (payload: DomainEventPayload<K>) => void | Promise<void>): () => void;
}
```

Rules:

- Services emit events.
- Modules subscribe only inside their provider `boot()` method.
- Renderer receives realtime updates only through IPC.
- Events must not create direct module imports.

---

## 15. Logging

Shared structured logger with `debug`, `info`, `warn`, `error`, and `child(context)` methods.

Rules:

- JSON structured logs.
- Log context names.
- IPC entry/exit logging with redacted sensitive data.
- Fatal logging on bootstrap failure.
- Logs written to OS-specific app logs directory.
- `console.log` is forbidden.
- Logging secrets is forbidden.
- Log level configurable through Settings module.

---

## 16. Settings Module

Settings is a normal module, not a global utility.

Storage location:

- macOS: `~/Library/Application Support/code-nexus/config.json`
- Windows: `%APPDATA%/code-nexus/config.json`
- Linux: `~/.config/code-nexus/config.json`

Default config includes `windowBounds`, `logLevel`, `theme`, and application settings.

Rules:

- Only Settings module writes config files.
- All writes are atomic (write temp file, then rename).
- Other modules read settings via `SettingsServiceContract`.
- Settings changes are broadcast via EventBus for Main.
- Renderer receives settings changes via IPC.

---

## 17. Persistence Rules

No SQL databases.

Persistence is allowed only through:

- workspace-local `.doclink` JSON files
- file system documents inside the scoped workspace
- OS-specific app data locations

All persistence must go through infrastructure adapters.

Rules:

- `.doclink` stores only metadata.
- `.doclink` paths must be relative to workspace root.
- `.doclink` paths must use forward slashes.
- `.doclink` must never store file contents.
- All JSON writes must be atomic.

Forbidden:

- direct `fs` usage inside services
- direct `path` manipulation inside UI
- direct OS APIs inside domain logic

---

## 18. Renderer Structure

```text
renderer/
├── App.tsx
├── main.tsx
├── pages/
├── features/
│   └── {domain}/
│       ├── api/
│       │   └── {domain}Ipc.ts
│       ├── hooks/
│       ├── components/
│       ├── stores/
│       ├── types/
│       └── index.ts
└── shared/
    ├── components/
    ├── hooks/
    ├── lib/
    ├── stores/
    └── styles/
```

### Frontend Layer Rules

| Layer | Responsibility | Forbidden |
|---|---|---|
| `pages/` | compose hooks and components | IPC calls, business logic |
| `features/*/hooks` | data fetching, mutations, realtime, state orchestration | returning JSX |
| `features/*/components` | pure presentation | IPC calls, data hooks, business decisions |
| `features/*/stores` | feature UI state | direct IPC calls |
| `shared/` | generic UI utilities | importing features |

### Data Fetching Rules

- Use React Query for IPC/server state.
- Use Zustand only for UI state.
- Store actions call feature API wrappers, never raw IPC.
- Hooks return standard state: `{ data, isLoading, isError, error }`

### Query Key Factories

Each feature exports a key factory for React Query cache management.

### Cross-Feature Imports

Features may import only from another feature's public barrel.

---

## 19. Styling Rules

Mandatory:

- Bootstrap
- React-Bootstrap
- standard CSS

Strictly forbidden:

- Tailwind CSS

If component CSS exceeds ~200 lines, split it into a CSS folder with an aggregator.

---

## 20. Domain Error Handling

Main Process:

- Services throw module-specific `DomainException`.
- IPC handlers do not catch domain exceptions.
- Global error formatter converts exceptions into `IpcFailure`.

Renderer:

- Hooks expose error state.
- Pages/components render skeletons or error UI.
- Error boundaries log through IPC.

Bootstrap registers a system handler that logs errors via `system:report-error` channel.

Forbidden:

- silent failures
- unstructured `console.log`
- showing raw stack traces to users

---

## 21. Window Management

Default is a single main window.

Rules:

- Only `WindowManager` creates BrowserWindow instances.
- Window bounds persist through Settings module.
- All windows load the same React app.
- Deep links are handled at startup and while app is running.
- Cross-window communication goes through Main Process.

---

## 22. File Size and Complexity Rules

Preferred maximum file size: 180–200 lines.

When a file grows:

- Service grows -> extract Action
- Component grows -> split component
- Page grows -> move logic to hook
- IPC handler grows -> extract schema/handler helper
- Provider grows -> split module capability or extract submodule

No God Files.

Especially forbidden:

- giant `app.ts`
- giant `service-container.ts`
- giant central IPC registration file
- giant shared type file mixing all modules

---

## 23. Naming Conventions

| Element | Convention |
|---|---|
| Main module folder | `modules/{context}` |
| Module provider | `{Context}Provider` |
| Service | `{Context}Service` |
| Service contract | `{Context}ServiceContract` |
| Service token | `{Context}ServiceToken` |
| IPC registration | `register{Context}Ipc` |
| Shared IPC contract | `shared/ipc/{context}.ts` |
| Zod schema file | `ipc/schemas.ts` |
| Renderer feature | `features/{domain}` |
| IPC client file | `{domain}Ipc.ts` |
| Hook | `use{Something}` |
| Page | `{Context}Page` |
| Domain event | past tense, e.g. `ScanCompleted` |

---

## 24. New Module Checklist

1. Create Main module folder: `src/main/modules/{context}/`
2. Create module skeleton.
3. Create `{Context}Provider.ts`.
4. Define service contracts if other modules need synchronous access.
5. Create shared IPC contract: `src/shared/ipc/{context}.ts`
6. Add channel constants to `src/shared/ipc/channels.ts`.
7. Create Zod schemas inside module: `src/main/modules/{context}/ipc/schemas.ts`
8. Register IPC handlers in provider `boot()`.
9. Add provider to `src/main/config/modules.ts`.
10. Create Renderer feature: `src/renderer/features/{domain}/`
11. Create feature API client.
12. Create hooks.
13. Create presentational components.
14. Add page and route.
15. Add domain events to `event-contracts.ts` if needed.

---

## 25. Debugging Protocol

Trace top-down. Do not guess.

```text
UI Event
  -> Hook
  -> Feature IPC Client
  -> preload bridge
  -> Main IPC Handler
  -> ServiceContainer
  -> Domain Service
  -> Infrastructure Adapter
  -> Logger output
```

Check in this order:

1. Did the UI trigger the correct hook action?
2. Did the feature API send the correct IPC channel and payload?
3. Did preload allow the channel?
4. Did Zod reject or strip the payload?
5. Did the container resolve the correct service?
6. Did the service fail with a domain rule?
7. Did infrastructure fail with OS/file errors?
8. What does the structured log say?

---

## 26. Golden Rules

1. Boundaries are sacred.
2. New domain capability means new module.
3. IPC handlers stay thin.
4. Services own business logic.
5. Infrastructure owns OS/FS access.
6. Renderer never touches Main code.
7. Shared IPC files stay pure.
8. Module providers register module behavior.
9. `modules.ts` is the simple module registry.
10. No God Files.
11. No Tailwind.
12. No SQL.
13. No direct `fs` in services.
14. No direct IPC in components or pages.
15. Events decouple modules.
16. Contracts protect boundaries.
17. Logs are the primary debugging source.
18. Security rules are immutable.
19. Zod schemas must be typed against shared IPC types.
20. All IPC responses use the standard envelope.

---

This document is the complete executable SSOT. Any deviation is technical debt and must be corrected.