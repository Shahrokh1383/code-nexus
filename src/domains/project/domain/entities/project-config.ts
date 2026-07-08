import { WorkspaceId } from '../value-objects/workspace-id';
import { Maybe } from '../../../shared-kernel/types/maybe';

export class ProjectConfig {
  constructor(
    private readonly _workspaceId: WorkspaceId,
    private _docsFolderPath: Maybe<string>,
    private _ignorePatterns: string[],
    private readonly _schemaVersion: string
  ) {}

  get workspaceId(): WorkspaceId {
    return this._workspaceId;
  }

  get docsFolderPath(): Maybe<string> {
    return this._docsFolderPath;
  }

  get ignorePatterns(): string[] {
    return [...this._ignorePatterns];
  }

  get schemaVersion(): string {
    return this._schemaVersion;
  }

  updateDocsFolderPath(path: string): void {
    this._docsFolderPath = Maybe.some(path);
  }

  addIgnorePattern(pattern: string): void {
    if (!this._ignorePatterns.includes(pattern)) {
      this._ignorePatterns = [...this._ignorePatterns, pattern];
    }
  }

  removeIgnorePattern(pattern: string): void {
    this._ignorePatterns = this._ignorePatterns.filter((p) => p !== pattern);
  }
}