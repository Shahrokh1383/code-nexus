import { createHash } from 'crypto';

export class HashUtils {
  static sha256(content: string): string {
    const normalized = content.replace(/\r\n/g, '\n');
    return createHash('sha256').update(normalized, 'utf-8').digest('hex');
  }
}