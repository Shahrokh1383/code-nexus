import { ValueObject } from '../../../shared-kernel/types/value-object';
import { HashUtils } from '../../../shared-kernel/utils/hash-utils';

export class HashValue extends ValueObject {
  private readonly _value: string;

  constructor(value: string) {
    super();
    if (!/^[a-f0-9]{64}$/i.test(value)) {
      throw new Error('HashValue must be a valid 64-character SHA-256 hex string');
    }
    this._value = value.toLowerCase();
  }

  static fromContent(content: string): HashValue {
    const hash = HashUtils.sha256(content);
    return new HashValue(hash);
  }

  get value(): string {
    return this._value;
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof HashValue)) {
      return false;
    }
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}