import { IQuery } from './query.interface';
import { Result } from '../types/result';

export interface IQueryHandler<TQuery extends IQuery, TResult> {
  execute(query: TQuery): Promise<Result<TResult, string>>;
}