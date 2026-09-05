import { IQuery } from '../../../shared-kernel/application/query.interface';

export class ReadFileContentQuery implements IQuery {
  constructor(public readonly filePath: string) {}
}