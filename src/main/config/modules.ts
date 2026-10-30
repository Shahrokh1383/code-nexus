import type { ModuleProvider } from '../kernel/module-provider';
import { WorkspaceProvider } from '../modules/workspace';
import { FilesystemProvider } from '../modules/filesystem';
import { SystemProvider } from '../modules/system';

/**
 * The only module registry (Constitution §8). Adding a module means adding
 * its provider here — nothing else in the kernel changes.
 */
export const enabledModuleProviders: ModuleProvider[] = [
  new WorkspaceProvider(),
  new FilesystemProvider(),
  new SystemProvider(),
];