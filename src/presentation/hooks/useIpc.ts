import { useMemo } from 'react';

export function useIpc() {
  return useMemo(() => window.electronAPI, []);
}