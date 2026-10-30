import type { IpcChannel } from '@shared/ipc/channels';
import { invokeIpc } from './ipc';

/**
 * Native OS directory picker — the legacy DIALOG_OPEN_FOLDER contract:
 * returns the selected folder path, or null when the user cancels.
 *
 * ⚠ SINGLE PENDING LINE — see the REQUEST in the delivery message. Replace
 * the channel constant below with the real export from your system/dialog
 * shared contract, then delete this comment block. Everything else here is
 * final. The placeholder value fails loudly ("No handler registered")
 * rather than silently, so it cannot be missed.
 */
const OPEN_DIRECTORY_CHANNEL = 'PENDING:replace-with-real-channel' as unknown as IpcChannel;

export async function openDirectoryPicker(): Promise<string | null> {
  const selected = await invokeIpc<string[]>(OPEN_DIRECTORY_CHANNEL);
  return selected.length > 0 ? selected[0] : null;
}