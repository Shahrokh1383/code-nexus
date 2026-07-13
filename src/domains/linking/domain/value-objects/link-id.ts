import { Identifier } from '../../../shared-kernel/types/identifier';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';

export class LinkId extends Identifier {
  static generate(): LinkId {
    return new LinkId(UuidGenerator.generate());
  }
}