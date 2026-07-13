import { IQuery } from '../../../shared-kernel/application/query.interface';

export class GetLinksForCodeFileQuery implements IQuery {
  constructor(public readonly codeFileId: string) {}
}