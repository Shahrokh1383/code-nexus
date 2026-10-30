import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import type { DoclinkFolder } from './doclink-folder';

export const CONFIG_SCHEMA_VERSION = '1.0';

interface DocFolderSignatureSchema {
  fileCount: number;
  topLevelFileNames: string[];
  directoryDepth: number;
}

interface DocFolderSchema {
  id: string;
  path: string;
  signature: DocFolderSignatureSchema;
  documentCount: number;
}

interface ProjectConfigSchema {
  workspaceId: string;
  docsFolderPath: string | null;
  ignorePatterns: string[];
  schemaVersion: string;
  docFolder?: DocFolderSchema | null;
}

export interface WorkspaceConfig {
  workspaceId: string;
  docsFolderPath: string | null;
  ignorePatterns: string[];
}

export const DEFAULT_IGNORE_PATTERNS: readonly string[] = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.doclink/**',
  '**/*.log',
];

/**
 * `.doclink/config.json` store. Owns the project config fields while
 * round-tripping the `docFolder` block owned by the (future) documentation
 * module untouched — read-modify-write
 * The schema-version guard ports the legacy SchemaMigrator's only live path.
 */
export class ConfigStore {
  private readonly filename = 'config.json';

  constructor(
    private readonly doclink: DoclinkFolder,
    private readonly file: AtomicJsonFile
  ) {}

  async load(rootPath: string): Promise<WorkspaceConfig | null> {
    try {
      const raw = await this.file.readJson<Record<string, unknown>>(
        this.doclink.doclinkFilePath(rootPath, this.filename)
      );
      const migrated = this.ensureSchemaVersion(raw, rootPath);
      return {
        workspaceId: migrated.workspaceId,
        docsFolderPath: migrated.docsFolderPath ?? null,
        ignorePatterns: Array.isArray(migrated.ignorePatterns) ? migrated.ignorePatterns
        : [...DEFAULT_IGNORE_PATTERNS]
      };
    } catch {
      return null;
    }
  }

  async save(rootPath: string, config: WorkspaceConfig): Promise<void> {
    let existingDocFolder: DocFolderSchema | null | undefined;
    try {
      const raw = await this.file.readJson<Record<string, unknown>>(
        this.doclink.doclinkFilePath(rootPath, this.filename)
      );
      existingDocFolder = this.ensureSchemaVersion(raw, rootPath).docFolder ?? null;
    } catch {
      // config.json does not exist yet — first-time initialization.
    }

    const schema: ProjectConfigSchema = {
      workspaceId: rootPath,
      docsFolderPath: config.docsFolderPath,
      ignorePatterns: config.ignorePatterns,
      schemaVersion: CONFIG_SCHEMA_VERSION,
      docFolder: existingDocFolder ?? null,
    };
    await this.file.writeJson(this.doclink.doclinkFilePath(rootPath, this.filename), schema);
  }

  private ensureSchemaVersion(raw: Record<string, unknown>, rootPath: string): ProjectConfigSchema {
    const version = typeof raw.schemaVersion === 'string' ? raw.schemaVersion : '0.0';
    if (version !== CONFIG_SCHEMA_VERSION) {
      if (version === '0.0') {
        raw.schemaVersion = CONFIG_SCHEMA_VERSION;
      } else {
        throw new Error(
          `No migration found from schema version ${version} to ${CONFIG_SCHEMA_VERSION} (workspace: ${rootPath})`
        );
      }
    }
    return raw as unknown as ProjectConfigSchema;
  }
}