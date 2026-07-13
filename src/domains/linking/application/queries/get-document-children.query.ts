import { IQuery } from '../../../shared-kernel/application/query.interface';

export class GetDocumentChildrenQuery implements IQuery {
  constructor(public readonly parentDocumentId: string) {}
}