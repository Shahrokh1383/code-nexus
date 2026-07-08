import { DomainException } from './domain-exception';

export class NotFoundException extends DomainException {
  constructor(entity: string, identifier: string) {
    super(
      'NOT_FOUND',
      `${entity} with identifier '${identifier}' was not found`,
      { entity, identifier }
    );
    this.name = 'NotFoundException';
  }
}