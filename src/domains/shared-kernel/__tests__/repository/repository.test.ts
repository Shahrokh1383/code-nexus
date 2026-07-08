import { IRepository } from '../../repository/repository.interface';
import { Identifier } from '../../types/identifier';

interface TestEntity {
  id: Identifier;
  name: string;
}

class MockRepository implements IRepository<TestEntity> {
  private _store = new Map<string, TestEntity>();

  async findById(id: Identifier): Promise<TestEntity | null> {
    return this._store.get(id.value) ?? null;
  }

  async save(entity: TestEntity): Promise<void> {
    this._store.set(entity.id.value, entity);
  }

  async delete(id: Identifier): Promise<void> {
    this._store.delete(id.value);
  }

  async exists(id: Identifier): Promise<boolean> {
    return this._store.has(id.value);
  }
}

describe('IRepository', () => {
  it('should save and find an entity', async () => {
    const repo = new MockRepository();
    const entity = { id: new Identifier('1'), name: 'Test' };
    await repo.save(entity);
    const found = await repo.findById(new Identifier('1'));
    expect(found).toEqual(entity);
  });

  it('should return null for missing entity', async () => {
    const repo = new MockRepository();
    const found = await repo.findById(new Identifier('999'));
    expect(found).toBeNull();
  });

  it('should delete an entity', async () => {
    const repo = new MockRepository();
    const entity = { id: new Identifier('2'), name: 'ToDelete' };
    await repo.save(entity);
    await repo.delete(new Identifier('2'));
    const exists = await repo.exists(new Identifier('2'));
    expect(exists).toBe(false);
  });

  it('should check existence', async () => {
    const repo = new MockRepository();
    const entity = { id: new Identifier('3'), name: 'Exists' };
    await repo.save(entity);
    expect(await repo.exists(new Identifier('3'))).toBe(true);
    expect(await repo.exists(new Identifier('4'))).toBe(false);
  });
});