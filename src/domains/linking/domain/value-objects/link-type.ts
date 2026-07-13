import { ValueObject } from '../../../shared-kernel/types/value-object';

export type LinkTypeValue = 'DIRECT' | 'INHERITED';

export class LinkType extends ValueObject {
  private constructor(public readonly value: LinkTypeValue) {
    super();
  }

  static direct(): LinkType {
    return new LinkType('DIRECT');
  }

  static inherited(): LinkType {
    return new LinkType('INHERITED');
  }

  isDirect(): boolean {
    return this.value === 'DIRECT';
  }

  isInherited(): boolean {
    return this.value === 'INHERITED';
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof LinkType)) return false;
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}