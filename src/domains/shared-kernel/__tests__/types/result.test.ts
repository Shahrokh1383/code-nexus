import { Result } from '../../types/result';

describe('Result', () => {
  it('should create a success result', () => {
    const result = Result.ok<number, string>(42);
    expect(result.isSuccess).toBe(true);
    expect(result.isFailure).toBe(false);
    expect(result.getValue()).toBe(42);
    expect(result.getError()).toBeUndefined();
  });

  it('should create a failure result', () => {
    const result = Result.fail<number, string>('error');
    expect(result.isSuccess).toBe(false);
    expect(result.isFailure).toBe(true);
    expect(result.getValue()).toBeUndefined();
    expect(result.getError()).toBe('error');
  });

  it('should fold on success', () => {
    const result = Result.ok<number, string>(10);
    const value = result.fold(
      (v) => v * 2,
      (e) => e.length
    );
    expect(value).toBe(20);
  });

  it('should fold on failure', () => {
    const result = Result.fail<number, string>('fail');
    const value = result.fold(
      (v) => v * 2,
      (e) => e.length
    );
    expect(value).toBe(4);
  });
});