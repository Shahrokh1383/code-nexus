import { Identifier } from '@/domains/shared-kernel/types/identifier';
import { UuidGenerator } from '@/domains/shared-kernel/utils/uuid-generator';

export class DocFolderId extends Identifier {
  static generate(): DocFolderId {
    return new DocFolderId(UuidGenerator.generate());
  }
}