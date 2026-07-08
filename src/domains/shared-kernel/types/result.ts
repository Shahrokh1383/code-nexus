export class Result<T, E = string> {
  private readonly _isSuccess: boolean;
  private readonly _value: T | undefined;
  private readonly _error: E | undefined;

  private constructor(isSuccess: boolean, value?: T, error?: E) {
    this._isSuccess = isSuccess;
    this._value = value;
    this._error = error;
  }

  static ok<T, E = string>(value: T): Result<T, E> {
    return new Result<T, E>(true, value);
  }

  static fail<T, E = string>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  get isSuccess(): boolean {
    return this._isSuccess;
  }

  get isFailure(): boolean {
    return !this._isSuccess;
  }

  getValue(): T | undefined {
    return this._value;
  }

  getError(): E | undefined {
    return this._error;
  }

  fold<R>(onSuccess: (value: T) => R, onFailure: (error: E) => R): R {
    return this._isSuccess
      ? onSuccess(this._value as T)
      : onFailure(this._error as E);
  }
}