import { IQuery } from '../../../shared-kernel/application/query.interface';

export class GetPendingChangesQuery implements IQuery {
  constructor(public readonly documentId?: string) {}
}