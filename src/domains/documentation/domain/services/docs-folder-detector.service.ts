import { EventBus } from '../../../shared-kernel/events/event-bus';
import { Result } from '../../../shared-kernel/types/result';
import { PathUtils } from '../../../shared-kernel/utils/path-utils';
import { DocFolder } from '../entities/doc-folder';
import { DocFolderId } from '../value-objects/doc-folder-id';
import { DocFolderSignature, FileNode } from '../value-objects/doc-folder-signature';
import { DocsFolderRelocatedEvent } from '../events/docs-folder-relocated';

export interface CandidateFolder {
  path: string;
  files: FileNode[];
}

export class DocsFolderDetectorService {
  constructor(private readonly _eventBus: EventBus) {}

  detect(
    candidates: CandidateFolder[],
    existingDocFolder?: DocFolder
  ): Result<DocFolder, string> {
    if (candidates.length === 0) {
      return Result.fail('No candidate folders found');
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

        if (bestSimilarity && bestSimilarity.similarity >= 0.7) {
          const relocatedFolder = new DocFolder(
            existingDocFolder.id,
            bestSimilarity.candidate.path,
            bestSimilarity.signature,
            bestSimilarity.candidate.files.filter((f) => !f.isDirectory).length
          );

          this._eventBus.emit(
            new DocsFolderRelocatedEvent(
              existingDocFolder.path,
              relocatedFolder.path,
              relocatedFolder.signature
            )
          );

          return Result.ok(relocatedFolder);
        }
      }
    }

    const newFolder = new DocFolder(
      DocFolderId.generate(),
      bestMatch.candidate.path,
      bestMatch.signature,
      bestMatch.candidate.files.filter((f) => !f.isDirectory).length
    );

    return Result.ok(newFolder);
  }

  private scoreCandidate(candidate: CandidateFolder): number {
    const normalizedPath = PathUtils.normalize(candidate.path);
    const segments = normalizedPath.split('/').filter((s) => s.length > 0);
    const folderName = segments[segments.length - 1]?.toLowerCase() || '';
    const depth = segments.length;

    let score = 0;

    const nameScores: Record<string, number> = {
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

    if (nameScores[folderName] !== undefined) {
      score += nameScores[folderName];
    } else if (folderName.includes('doc')) {
      score += 10;
    }

    const totalFiles = candidate.files.length;
    if (totalFiles > 0) {
      const docFiles = candidate.files.filter(
        (f) => !f.isDirectory && /\.(md|txt|rst|adoc|mdx)$/i.test(f.name)
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