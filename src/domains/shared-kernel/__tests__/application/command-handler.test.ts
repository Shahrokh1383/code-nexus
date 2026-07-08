import { ICommand } from '../../application/command.interface';
import { ICommandHandler } from '../../application/command-handler.interface';
import { Result } from '../../types/result';

class TestCommand implements ICommand {
  constructor(readonly payload: string) {}
}

class TestCommandHandler implements ICommandHandler<TestCommand, string> {
  async execute(command: TestCommand): Promise<Result<string, string>> {
    return Result.ok(`handled: ${command.payload}`);
  }
}

describe('ICommandHandler', () => {
  it('should execute a command and return success', async () => {
    const handler = new TestCommandHandler();
    const result = await handler.execute(new TestCommand('test'));
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBe('handled: test');
  });
});