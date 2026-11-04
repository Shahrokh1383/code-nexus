import { DomainException } from '../../../shared/errors/domain-exception';
import type { DocumentLinkJsonRepository } from '../infrastructure/DocumentLinkJsonRepository';

export class DocumentLinkValidator {
  constructor(private readonly repository: DocumentLinkJsonRepository) {}

  async validateNoCycles(
    rootPath: string,
    parentId: string,
    childId: string
  ): Promise<void> {
    if (parentId === childId) {
      throw new DomainException('INVALID_LINK', 'Cannot link a document to itself');
    }

    const visited = new Set<string>();
    const hasCycle = await this.hasCycle(rootPath, childId, parentId, visited);

    if (hasCycle) {
      throw new DomainException('CIRCULAR_LINK', 'Circular document link detected');
    }
  }

  private async hasCycle(
    rootPath: string,
    currentId: string,
    targetId: string,
    visited: Set<string>
  ): Promise<boolean> {
    if (currentId === targetId) return true;
    if (visited.has(currentId)) return false;

    visited.add(currentId);
    const childLinks = await this.repository.findByParentDocument(rootPath, currentId);

    for (const link of childLinks) {
      if (await this.hasCycle(rootPath, link.childDocumentId, targetId, visited)) {
        return true;
      }
    }

    return false;
  }
}