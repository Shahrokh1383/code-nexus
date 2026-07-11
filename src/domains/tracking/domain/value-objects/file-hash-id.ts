import { Identifier } from '../../../shared-kernel/types/identifier';

export class FileHashId extends Identifier {
  constructor(value: string) {
    super(value);
  }
}