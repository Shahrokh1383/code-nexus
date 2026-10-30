import { SYSTEM_CHANNELS } from '@shared/ipc/system';
import { invokeIpc } from './ipc';

export async function openDirectoryPicker(): Promise<string | null> {
  const selected = await invokeIpc<string[]>(SYSTEM_CHANNELS.OPEN_FOLDER);
  return selected.length > 0 ? selected[0] : null;
}