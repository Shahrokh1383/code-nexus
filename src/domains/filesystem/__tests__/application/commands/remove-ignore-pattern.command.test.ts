import { RemoveIgnorePatternCommand } from '../../../../application/commands/remove-ignore-pattern.command';

describe('RemoveIgnorePatternCommand', () => {
  it('should hold workspaceId and pattern', () => {
    const command = new RemoveIgnorePatternCommand('workspace-123', '*.log');
    expect(command.workspaceId).toBe('workspace-123');
    expect(command.pattern).toBe('*.log');
  });
});