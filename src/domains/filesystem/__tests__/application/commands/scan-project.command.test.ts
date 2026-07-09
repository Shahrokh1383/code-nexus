import { ScanProjectCommand } from '../../../../application/commands/scan-project.command';

describe('ScanProjectCommand', () => {
  it('should hold workspaceId', () => {
    const command = new ScanProjectCommand('workspace-123');
    expect(command.workspaceId).toBe('workspace-123');
  });
});