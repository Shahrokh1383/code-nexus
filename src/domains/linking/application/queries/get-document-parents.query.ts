import { IQuery } from '../../../shared-kernel/application/query.interface';

export class GetDocumentParentsQuery implements IQuery {
  constructor(public readonly childDocumentId: string) {}
}