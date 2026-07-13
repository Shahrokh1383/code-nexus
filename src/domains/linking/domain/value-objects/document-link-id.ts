import { Identifier } from '../../../shared-kernel/types/identifier';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';

export class DocumentLinkId extends Identifier {
  static generate(): DocumentLinkId {
    return new DocumentLinkId(UuidGenerator.generate());
  }
}