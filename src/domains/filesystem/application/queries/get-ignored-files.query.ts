import { IQuery } from '../../../shared-kernel/application/query.interface';

export class GetIgnoredFilesQuery implements IQuery {
  constructor(public readonly workspaceId: string) {}
}