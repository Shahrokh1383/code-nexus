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
    const version = (data.schemaVersion as string) || '0.0';

    if (version === this.currentVersion) {
      return data;
    }

    const migration = this.migrations.get(version);
    if (!migration) {
      throw new Error(
        `No migration found from schema version ${version} to ${this.currentVersion}`
      );
    }

    const migrated = migration(data);
    migrated.schemaVersion = this.currentVersion;
    return migrated;
  }
}