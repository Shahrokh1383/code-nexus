import { Identifier } from '../../../shared-kernel/types/identifier';

export class CommitId extends Identifier {
  constructor(value: string) {
    super(value);
  }
}