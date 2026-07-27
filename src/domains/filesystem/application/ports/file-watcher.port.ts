import { IgnorePattern } from '../../domain/value-objects/ignore-pattern';

export interface IFileWatcherPort {
  updateIgnorePatterns(patterns: IgnorePattern[]): Promise<void>;
}