import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { IDocumentLinkRepository } from '../repository/document-link-repository.interface';
import { InvalidStateException } from '../../../shared-kernel/exceptions/invalid-state-exception';

export class DocumentLinkValidatorService {
  constructor(private readonly docLinkRepo: IDocumentLinkRepository) {}

  async validateNoCycles(parentId: DocumentId, childId: DocumentId): Promise<void> {
    if (parentId.equals(childId)) {
      throw new InvalidStateException('Cannot link a document to itself', { parentId: parentId.value });
    }
    
    const visited = new Set<string>();
    const hasCycle = await this.hasCycle(childId, parentId, visited);
    
    if (hasCycle) {
      throw new InvalidStateException('Circular document link detected', { 
        parentId: parentId.value, 
        childId: childId.value 
      });
    }
  }

  private async hasCycle(currentId: DocumentId, targetId: DocumentId, visited: Set<string>): Promise<boolean> {
    if (currentId.equals(targetId)) return true;
    if (visited.has(currentId.value)) return false;
    
    visited.add(currentId.value);
    const childLinks = await this.docLinkRepo.findByParentDocument(currentId);
    
    for (const link of childLinks) {
      if (await this.hasCycle(link.childDocumentId, targetId, visited)) {
        return true;
      }
    }
    
    return false;
  }
}