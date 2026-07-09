import { DomainException } from '../../../shared-kernel/exceptions/domain-exception';

export class FileSize {
  private readonly _bytes: number;

  constructor(bytes: number) {
    if (!Number.isFinite(bytes) || bytes < 0) {
      throw new DomainException('FILE_SIZE_NEGATIVE', 'File size must be a non-negative finite number');
    }

    if (!Number.isInteger(bytes)) {
      throw new DomainException('FILE_SIZE_NOT_INTEGER', 'File size must be an integer');
    }

    this._bytes = bytes;
  }

  get bytes(): number {
    return this._bytes;
  }

  equals(other: FileSize): boolean {
    return this._bytes === other._bytes;
  }
}