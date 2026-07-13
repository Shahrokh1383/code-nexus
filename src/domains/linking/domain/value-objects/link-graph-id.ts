import { Identifier } from '../../../shared-kernel/types/identifier';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';

export class LinkGraphId extends Identifier {
  static generate(): LinkGraphId {
    return new LinkGraphId(UuidGenerator.generate());
  }
}