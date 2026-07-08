import { ICommand } from './command.interface';
import { Result } from '../types/result';

export interface ICommandHandler<TCommand extends ICommand, TResult = void> {
  execute(command: TCommand): Promise<Result<TResult, string>>;
}