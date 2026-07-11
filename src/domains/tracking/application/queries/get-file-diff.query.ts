import { IQuery } from '../../../shared-kernel/application/query.interface';

export class GetFileDiffQuery implements IQuery {
  constructor(public readonly filePath: string) {}
}