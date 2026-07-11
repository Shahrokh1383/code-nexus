import { ValueObject } from '../../../shared-kernel/types/value-object';

export enum DiffLineType {
  ADDED = 'ADDED',
  REMOVED = 'REMOVED',
  MODIFIED = 'MODIFIED',
}

export class DiffLine extends ValueObject {
  private readonly _lineNumber: number;
  private readonly _content: string;
  private readonly _type: DiffLineType;

  constructor(lineNumber: number, content: string, type: DiffLineType) {
    super();
    if (lineNumber < 1) {
      throw new Error('Line number must be at least 1');
    }
    this._lineNumber = lineNumber;
    this._content = content;
    this._type = type;
  }

  get lineNumber(): number {
    return this._lineNumber;
  }

  get content(): string {
    return this._content;
  }

  get type(): DiffLineType {
    return this._type;
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof DiffLine)) {
      return false;
    }
    return (
      this._lineNumber === other._lineNumber &&
      this._content === other._content &&
      this._type === other._type
    );
  }

  toString(): string {
    return `${this._type}[${this._lineNumber}]: ${this._content}`;
  }
}