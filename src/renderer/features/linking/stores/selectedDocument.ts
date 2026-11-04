import { useSyncExternalStore } from 'react';

let selectedDocId: string | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function setSelectedDocId(id: string | null): void {
  if (selectedDocId === id) return;
  selectedDocId = id;
  emit();
}

export function useSelectedDocId(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => selectedDocId,
    () => selectedDocId
  );
}