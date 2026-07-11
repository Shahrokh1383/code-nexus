import { IQuery } from '../../../shared-kernel/application/query.interface';

export class GetCommitHistoryQuery implements IQuery {
  constructor(public readonly documentId: string) {}
}