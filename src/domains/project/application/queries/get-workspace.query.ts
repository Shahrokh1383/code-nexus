import { IQuery } from '../../../shared-kernel/application/query.interface';

export class GetWorkspaceQuery implements IQuery {
  constructor(public readonly workspaceId: string) {}
}