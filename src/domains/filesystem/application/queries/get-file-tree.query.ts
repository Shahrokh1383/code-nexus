import { IQuery } from '../../../shared-kernel/application/query.interface';

export class GetFileTreeQuery implements IQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly parentPath?: string
  ) {}
}