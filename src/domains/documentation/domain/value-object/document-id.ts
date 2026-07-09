import { Identifier } from '@/domains/shared-kernel/types/identifier';
import { UuidGenerator } from '@/domains/shared-kernel/utils/uuid-generator';

export class DocumentId extends Identifier {
  static generate(): DocumentId {
    return new DocumentId(UuidGenerator.generate());
  }
}