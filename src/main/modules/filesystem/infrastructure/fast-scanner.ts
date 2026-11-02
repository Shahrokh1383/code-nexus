import { promises as fs, type Dirent } from 'fs';
import { PathUtils } from '../../../shared/utils/path-utils';
import type { Logger } from '../../../shared/logger/logger';
import type { IgnorePattern } from '../domain/ignore-pattern';
import { DEFAULT_IGNORED_SEGMENTS } from './chokidar-watcher';

export interface ScanResult {
  files: Map<string, boolean>;
  durationMs: number;
  dirsVisited: number;
}

/**
 * Concurrency budget. Dropped to 4 to match Node's default libuv threadpool.
 * Using 32 saturated the CPU and starved Electron's main process, causing the
 * renderer to freeze for 10+ seconds during the initial scan of a large codebase.
 */
const CONCURRENCY = 4;
const YIELD_INTERVAL_MS = 16;

export async function fastScanWorkspace(
  rootPath: string,
  patterns: readonly IgnorePattern[],
  logger: Logger
): Promise<ScanResult> {
  const startTime = Date.now();
  const result = new Map<string, boolean>();
  const queue: string[] = ['.'];
  const inFlight = new Set<Promise<void>>();
  let dirsVisited = 0;
  let lastYield = Date.now();

  const isIgnored = (relPath: string): boolean => {
    for (const seg of relPath.split('/')) {
      if (DEFAULT_IGNORED_SEGMENTS.has(seg)) return true;
    }
    for (const p of patterns) {
      try {
        if (p.matches(relPath)) return true;
      } catch {
        // Per-pattern failure skipped, matching legacy.
      }
    }
    return false;
  };

  while (queue.length > 0 || inFlight.size > 0) {
    while (queue.length > 0 && inFlight.size < CONCURRENCY) {
      const dir = queue.shift()!;
      const absDir = dir === '.' ? rootPath : PathUtils.join(rootPath, dir);
      dirsVisited += 1;

      const task: Promise<void> = fs
        .readdir(absDir, { withFileTypes: true })
        .then((entries: Dirent[]) => {
          for (const entry of entries) {
            const rel = dir === '.' ? entry.name : `${dir}/${entry.name}`;
            if (isIgnored(rel)) continue;
            if (entry.isDirectory()) {
              result.set(rel, true);
              queue.push(rel);
            } else if (entry.isFile()) {
              result.set(rel, false);
            }
          }
        })
        .catch((err: unknown) => {
          logger.debug('scan dir failed', {
            dir,
            message: err instanceof Error ? err.message : String(err),
          });
        })
        .finally(() => {
          inFlight.delete(task);
        });

      inFlight.add(task);
    }

    if (inFlight.size > 0) {
      await Promise.race(inFlight);
    }

    if (Date.now() - lastYield >= YIELD_INTERVAL_MS) {
      lastYield = Date.now();
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  }

  const durationMs = Date.now() - startTime;
  logger.info('fast scan complete', {
    entries: result.size,
    dirsVisited,
    durationMs,
  });

  return { files: result, durationMs, dirsVisited };
}