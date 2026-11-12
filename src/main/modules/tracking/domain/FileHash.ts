import { createHash } from 'crypto';
import { TrackedFilePath } from './TrackedFilePath';

/** Ported from legacy `file-hash-id.ts`. */
export class FileHashId {
  constructor(public readonly value: string) {}
}

/** Ported from legacy `hash-value.ts`. Adds `fromContent` used by RecordHash. */
export class HashValue {
  constructor(public readonly value: string) {}

  equals(other: HashValue): boolean {
    return this.value === other.value;
  }

  static fromContent(content: string): HashValue {
    return new HashValue(createHash('sha256').update(content).digest('hex'));
  }
}

export class FileHash {
  private _hashValue: HashValue;

  constructor(
    public readonly id: FileHashId,
    public readonly filePath: TrackedFilePath,
    hashValue: HashValue,
    public isPending: boolean = false,
  ) {
    this._hashValue = hashValue;
  }

  get hashValue(): HashValue {
    return this._hashValue;
  }

  updateHash(newHash: HashValue): void {
    this._hashValue = newHash;
  }

  markPending(): void {
    this.isPending = true;
  }
}