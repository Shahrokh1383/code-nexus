import { HashUtils } from '../../../shared-kernel/utils/hash-utils';

/**
 * Infrastructure adapter that wraps HashUtils from shared-kernel.
 * Used by HashComparisonService (Domain) to generate SHA-256 hashes.
 */
export class HashGeneratorAdapter {
  generate(content: string): string {
    return HashUtils.sha256(content);
  }
}