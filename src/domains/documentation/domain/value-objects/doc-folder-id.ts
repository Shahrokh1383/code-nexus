import { Identifier } from '../../../shared-kernel/types/identifier';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';

export class DocFolderId extends Identifier {
  static generate(): DocFolderId {
    return new DocFolderId(UuidGenerator.generate());
  }
}