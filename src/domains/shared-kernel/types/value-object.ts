/**
 * Base class for all Value Objects in the CodeNexus domain.
 * Value Objects are immutable, equality-based, and have no identity.
 */
export abstract class ValueObject {
  /**
   * Compares two value objects for equality based on their properties.
   */
  abstract equals(other: ValueObject): boolean;

  /**
   * Returns a string representation of the value object.
   */
  abstract toString(): string;
}