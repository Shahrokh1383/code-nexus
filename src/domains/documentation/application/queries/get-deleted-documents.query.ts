import { IQuery } from '../../../shared-kernel/application/query.interface';

export class GetDeletedDocumentsQuery implements IQuery {
  constructor(public readonly workspaceId: string) {}
}