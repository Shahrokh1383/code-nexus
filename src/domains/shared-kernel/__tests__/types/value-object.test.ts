import { ValueObject } from '../../types/value-object';

class TestValueObject extends ValueObject {
  constructor(private readonly _value: string) {
    super();
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof TestValueObject)) return false;
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

describe('ValueObject', () => {
  it('should enforce equality based on properties', () => {
    const a = new TestValueObject('test');
    const b = new TestValueObject('test');
    const c = new TestValueObject('other');

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('should return string representation', () => {
    const vo = new TestValueObject('hello');
    expect(vo.toString()).toBe('hello');
  });
});