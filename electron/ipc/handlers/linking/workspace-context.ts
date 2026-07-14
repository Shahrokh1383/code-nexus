let currentWorkspaceRoot: string | null = null;

export function setCurrentWorkspaceRoot(rootPath: string | null): void {
  currentWorkspaceRoot = rootPath;
}

export function getCurrentWorkspaceRoot(): string | null {
  return currentWorkspaceRoot;
}