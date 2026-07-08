import { SchemaMigrator } from '../../migration/schema-migrator';

describe('SchemaMigrator', () => {
  it('should return data unchanged when version matches', () => {
    const migrator = new SchemaMigrator('1.0');
    const data = { schemaVersion: '1.0', key: 'value' };

    const result = migrator.migrate(data);

    expect(result).toEqual(data);
  });

  it('should throw when no migration exists for version', () => {
    const migrator = new SchemaMigrator('1.0');
    const data = { schemaVersion: '0.5', key: 'value' };

    expect(() => migrator.migrate(data)).toThrow('No migration found from schema version 0.5 to 1.0');
  });

  it('should apply registered migration', () => {
    const migrator = new SchemaMigrator('1.0');
    migrator.register('0.9', (data) => ({
      ...data,
      newField: 'migrated',
    }));

    const data = { schemaVersion: '0.9', key: 'value' };
    const result = migrator.migrate(data);

    expect(result.schemaVersion).toBe('1.0');
    expect(result.newField).toBe('migrated');
  });

  it('should treat missing version as 0.0', () => {
    const migrator = new SchemaMigrator('1.0');
    const data = { key: 'value' };

    expect(() => migrator.migrate(data)).toThrow('No migration found from schema version 0.0 to 1.0');
  });
});