import { IQuery } from '../../../shared-kernel/application/query.interface';

export class GetLinksForDocumentQuery implements IQuery {
  constructor(public readonly documentId: string) {}
}