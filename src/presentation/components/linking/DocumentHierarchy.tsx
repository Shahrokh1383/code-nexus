import { JSX, useState } from 'react';
import { DocumentDto } from '../../../domains/documentation/application/dto/document.dto';
import { DocumentLinkDto } from '../../../domains/linking/application/dto/document-link.dto';

interface DocumentHierarchyProps {
  documents: DocumentDto[];
  documentLinks: DocumentLinkDto[];
}

export function DocumentHierarchy({ documents, documentLinks }: DocumentHierarchyProps): JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const getChildren = (parentId: string) => 
    documentLinks.filter(l => l.parentDocumentId === parentId).map(l => documents.find(d => d.id === l.childDocumentId)).filter(Boolean) as DocumentDto[];

  const roots = documents.filter(d => !documentLinks.some(l => l.childDocumentId === d.id));

  const renderNode = (doc: DocumentDto, depth: number) => {
    const children = getChildren(doc.id);
    const isExpanded = expanded.has(doc.id);
    const hasChildren = children.length > 0;

    return (
      <li key={doc.id} className="hierarchy-node">
        <div className="hierarchy-item" onClick={() => hasChildren && toggleExpand(doc.id)} style={{ paddingLeft: `${depth * 20}px` }}>
          {hasChildren && (
            <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} text-secondary`} style={{ width: '12px' }}></i>
          )}
          {!hasChildren && <span style={{ width: '12px' }}></span>}
          <i className="fa-solid fa-file-lines text-primary me-2"></i>
          <span>{doc.title}</span>
        </div>
        {hasChildren && isExpanded && (
          <ul className="hierarchy-children hierarchy-tree">
            {children.map(child => renderNode(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <ul className="hierarchy-tree">
      {roots.map(root => renderNode(root, 0))}
      {roots.length === 0 && <p className="text-secondary p-4 text-center">No document hierarchies found.</p>}
    </ul>
  );
}