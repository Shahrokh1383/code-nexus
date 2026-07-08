export class MetadataFolderName {
  private static readonly FOLDER_NAME = '.doclink';
  private readonly _value: string;

  constructor() {
    this._value = MetadataFolderName.FOLDER_NAME;
  }

  get value(): string {
    return this._value;
  }

  equals(other: MetadataFolderName): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}