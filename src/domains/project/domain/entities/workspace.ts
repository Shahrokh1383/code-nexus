import { WorkspaceId } from '../value-objects/workspace-id';
import { WorkspacePath } from '../value-objects/workspace-path';
import { MetadataFolderName } from '../value-objects/metadata-folder-name';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { Maybe } from '../../../shared-kernel/types/maybe';

export class Workspace {
  constructor(
    private readonly _id: WorkspaceId,
    private readonly _rootPath: WorkspacePath,
    private readonly _metadataFolderPath: MetadataFolderName,
    private readonly _createdAt: DateTime,
    private _lastScanAt: Maybe<DateTime>
  ) {}

  get id(): WorkspaceId {
    return this._id;
  }

  get rootPath(): WorkspacePath {
    return this._rootPath;
  }

  get metadataFolderPath(): MetadataFolderName {
    return this._metadataFolderPath;
  }

  get createdAt(): DateTime {
    return this._createdAt;
  }

  get lastScanAt(): Maybe<DateTime> {
    return this._lastScanAt;
  }

  updateLastScanAt(date: DateTime): void {
    this._lastScanAt = Maybe.some(date);
  }
}