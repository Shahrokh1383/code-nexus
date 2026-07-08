export class DomainException extends Error {
  readonly code: string;
  readonly context: Record<string, unknown>;

  constructor(code: string, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'DomainException';
    this.code = code;
    this.context = context;
  }
}