import { Identifier } from '../types/identifier';

export interface IRepository<T> {
  findById(id: Identifier): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: Identifier): Promise<void>;
  exists(id: Identifier): Promise<boolean>;
}