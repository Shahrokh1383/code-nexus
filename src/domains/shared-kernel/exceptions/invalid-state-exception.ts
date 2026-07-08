import { DomainException } from './domain-exception';

export class InvalidStateException extends DomainException {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super('INVALID_STATE', message, context);
    this.name = 'InvalidStateException';
  }
}