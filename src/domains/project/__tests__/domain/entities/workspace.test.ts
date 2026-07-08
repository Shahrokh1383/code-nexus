import { Workspace } from '../../../domain/entities/workspace';
import { WorkspaceId } from '../../../domain/value-objects/workspace-id';
import { WorkspacePath } from '../../../domain/value-objects/workspace-path';
import { MetadataFolderName } from '../../../domain/value-objects/metadata-folder-name';
import { DateTime } from '../../../../shared-kernel/types/date-time';
import { Maybe } from '../../../../shared-kernel/types/maybe';

describe('Workspace', () => {
  const createWorkspace = (lastScan?: DateTime): Workspace => {
    return new Workspace(
      new WorkspaceId('ws-1'),
      new WorkspacePath('/home/user/project'),
      new MetadataFolderName(),
      DateTime.fromISO('2026-01-01T00:00:00.000Z'),
      lastScan ? Maybe.some(lastScan) : Maybe.none<DateTime>()
    );
  };

  it('should expose all properties', () => {
    const ws = createWorkspace();
    expect(ws.id.value).toBe('ws-1');
    expect(ws.rootPath.value).toBe('/home/user/project');
    expect(ws.metadataFolderPath.value).toBe('.doclink');
    expect(ws.createdAt.toISO()).toBe('2026-01-01T00:00:00.000Z');
    expect(ws.lastScanAt.isNone).toBe(true);
  });

  it('should update lastScanAt', () => {
    const ws = createWorkspace();
    const newScan = DateTime.fromISO('2026-01-15T00:00:00.000Z');
    ws.updateLastScanAt(newScan);
    expect(ws.lastScanAt.isSome).toBe(true);
    expect(ws.lastScanAt.getOrNull()?.toISO()).toBe('2026-01-15T00:00:00.000Z');
  });

  it('should have immutable id', () => {
    const ws = createWorkspace();
    expect(() => {
      (ws as unknown as Record<string, string>).id = 'new-id';
    }).toThrow();
  });
});