import { DomainException } from '../../../shared-kernel/exceptions/domain-exception';

export class FileHash {
  private readonly _value: string;

  constructor(value: string) {
    if (!value || value.length !== 64) {
      throw new DomainException('FILE_HASH_INVALID_LENGTH', 'File hash must be a 64-character hex string');
    }

    if (!/^[a-f0-9]{64}$/i.test(value)) {
      throw new DomainException('FILE_HASH_INVALID_FORMAT', 'File hash must contain only hex characters');
    }

    this._value = value.toLowerCase();
  }

  get value(): string {
    return this._value;
  }

  equals(other: FileHash): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}