export class Maybe<T> {
  private readonly _value: T | undefined;
  private readonly _hasValue: boolean;

  private constructor(value?: T) {
    this._value = value;
    this._hasValue = value !== undefined && value !== null;
  }

  static some<T>(value: T): Maybe<T> {
    return new Maybe<T>(value);
  }

  static none<T>(): Maybe<T> {
    return new Maybe<T>();
  }

  get isSome(): boolean {
    return this._hasValue;
  }

  get isNone(): boolean {
    return !this._hasValue;
  }

  map<R>(fn: (value: T) => R): Maybe<R> {
    return this._hasValue ? Maybe.some(fn(this._value as T)) : Maybe.none<R>();
  }

  flatMap<R>(fn: (value: T) => Maybe<R>): Maybe<R> {
    return this._hasValue ? fn(this._value as T) : Maybe.none<R>();
  }

  getOrElse(defaultValue: T): T {
    return this._hasValue ? (this._value as T) : defaultValue;
  }

  getOrNull(): T | null {
    return this._hasValue ? (this._value as T) : null;
  }
}