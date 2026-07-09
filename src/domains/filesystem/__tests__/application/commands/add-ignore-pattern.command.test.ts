import { AddIgnorePatternCommand } from '../../../../application/commands/add-ignore-pattern.command';

describe('AddIgnorePatternCommand', () => {
  it('should hold workspaceId and pattern', () => {
    const command = new AddIgnorePatternCommand('workspace-123', '*.log');
    expect(command.workspaceId).toBe('workspace-123');
    expect(command.pattern).toBe('*.log');
  });
});