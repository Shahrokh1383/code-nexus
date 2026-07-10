import { Identifier } from '../../../shared-kernel/types/identifier';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';

export class DocumentId extends Identifier {
  static generate(): DocumentId {
    return new DocumentId(UuidGenerator.generate());
  }
}