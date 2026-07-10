import { IQuery } from '../../../shared-kernel/application/query.interface';

export class GetAllDocumentsQuery implements IQuery {
  constructor(public readonly workspaceId: string) {}
}