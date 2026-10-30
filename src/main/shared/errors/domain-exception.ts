/**
 * Base domain error carried through the IPC error formatter
 * `code` is machine-readable, `message` user-displayable, `details` optional context.
 */
export class DomainException extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'DomainException';
    this.code = code;
    this.details = details;
  }
}