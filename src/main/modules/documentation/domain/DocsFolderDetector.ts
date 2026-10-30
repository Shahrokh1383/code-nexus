import type { EventBus } from '../../../shared/event-bus/event-bus';
import { DomainException } from '../../../shared/errors/domain-exception';
import { PathUtils } from '../../../shared/utils/path-utils';
import { DocFolder } from './DocFolder';
import { DocFolderSignature, type FileNode } from './DocFolderSignature';

export interface CandidateFolder {
  path: string;
  files: FileNode[];
}

const RELOCATION_SIMILARITY_THRESHOLD = 0.7;

const FOLDER_NAME_SCORES: Record<string, number> = {
  docs: 40,
  doc: 40,
  documentation: 35,
  documents: 30,
  guides: 25,
  guide: 20,
  wiki: 20,
  manual: 15,
  help: 15,
  reference: 10,
};

const DOC_FILE_PATTERN = /\.(md|txt|rst|adoc|mdx)$/i;

/**
 * Pure folder-detection domain service. Scoring, similarity matching and the
 * relocation threshold are ported verbatim from the legacy detector. ID
 * generation is injected so the domain stays free of Node APIs.
 */
export class DocsFolderDetector {
  constructor(
    private readonly events: EventBus,
    private readonly generateId: () => string
  ) {}

  detect(candidates: CandidateFolder[], existingDocFolder?: DocFolder): DocFolder {
    if (candidates.length === 0) {
      throw new DomainException('NO_CANDIDATE_FOLDERS', 'No candidate folders found');
    }

    const scored = candidates.map((candidate) => ({
      candidate,
      score: this.scoreCandidate(candidate),
      signature: DocFolderSignature.calculateFrom(candidate.files),
    }));

    scored.sort((a, b) => b.score - a.score);
    const bestMatch = scored[0];

    if (existingDocFolder) {
      const existingPath = existingDocFolder.path.toLowerCase();
      const existingStillExists = candidates.some(
        (c) => PathUtils.normalize(c.path).toLowerCase() === existingPath
      );

      if (!existingStillExists) {
        const existingSignature = existingDocFolder.signature;
        const similarities = scored.map((s) => ({
          ...s,
          similarity: s.signature.similarity(existingSignature),
        }));

        similarities.sort((a, b) => b.similarity - a.similarity);
        const bestSimilarity = similarities[0];

        if (bestSimilarity && bestSimilarity.similarity >= RELOCATION_SIMILARITY_THRESHOLD) {
          const relocatedFolder = new DocFolder(
            existingDocFolder.id,
            bestSimilarity.candidate.path,
            bestSimilarity.signature,
            bestSimilarity.candidate.files.filter((f) => !f.isDirectory).length
          );

          // Emission point preserved from legacy: fired when the relocation
          // is detected, before the caller persists anything.
          this.events.emit('DocsFolderRelocated', {
            oldPath: existingDocFolder.path,
            newPath: relocatedFolder.path,
            signature: {
              fileCount: relocatedFolder.signature.fileCount,
              topLevelFileNames: relocatedFolder.signature.topLevelFileNames,
              directoryDepth: relocatedFolder.signature.directoryDepth,
            },
          });

          return relocatedFolder;
        }
      }
    }

    return new DocFolder(
      this.generateId(),
      bestMatch.candidate.path,
      bestMatch.signature,
      bestMatch.candidate.files.filter((f) => !f.isDirectory).length
    );
  }

  private scoreCandidate(candidate: CandidateFolder): number {
    const normalizedPath = PathUtils.normalize(candidate.path);
    const segments = normalizedPath.split('/').filter((s) => s.length > 0);
    const folderName = segments[segments.length - 1]?.toLowerCase() || '';
    const depth = segments.length;

    let score = 0;

    if (FOLDER_NAME_SCORES[folderName] !== undefined) {
      score += FOLDER_NAME_SCORES[folderName];
    } else if (folderName.includes('doc')) {
      score += 10;
    }

    const totalFiles = candidate.files.length;
    if (totalFiles > 0) {
      const docFiles = candidate.files.filter(
        (f) => !f.isDirectory && DOC_FILE_PATTERN.test(f.name)
      ).length;
      score += (docFiles / totalFiles) * 40;
    }

    if (depth === 1) {
      score += 20;
    } else if (depth === 2) {
      score += 15;
    } else if (depth === 3) {
      score += 10;
    } else {
      score += 5;
    }

    return score;
  }
}