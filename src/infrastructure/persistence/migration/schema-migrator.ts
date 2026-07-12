export class SchemaMigrator {
  private readonly migrations = new Map<
    string,
    (data: Record<string, unknown>) => Record<string, unknown>
  >();

  constructor(private readonly currentVersion: string) {}

  register(
    fromVersion: string,
    migration: (data: Record<string, unknown>) => Record<string, unknown>
  ): void {
    this.migrations.set(fromVersion, migration);
  }

  migrate(data: Record<string, unknown>): Record<string, unknown> {
    // Support both 'version' and 'schemaVersion' fields used across JSON schemas
    const versionKey = 'version' in data ? 'version' : 'schemaVersion';
    const version = (data[versionKey] as string) || '0.0';

    if (version === this.currentVersion) {
      return data;
    }

    const migration = this.migrations.get(version);
    if (!migration) {
      if (version === '0.0') {
        data[versionKey] = this.currentVersion;
        return data;
      }
      throw new Error(
        `No migration found from schema version ${version} to ${this.currentVersion}`
      );
    }

    const migrated = migration(data);
    migrated[versionKey] = this.currentVersion;
    return migrated;
  }
}