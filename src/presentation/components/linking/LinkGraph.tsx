import { JSX, useMemo } from 'react';
import { CodeToDocLinkDto } from '../../../domains/linking/application/dto/link.dto';
import { DocumentDto } from '../../../domains/documentation/application/dto/document.dto';

interface LinkGraphProps {
  centerDocument: DocumentDto | null;
  codeLinks: CodeToDocLinkDto[];
}

export function LinkGraph({ centerDocument, codeLinks }: LinkGraphProps): JSX.Element {
  const width = 800;
  const height = 600;
  const centerX = width / 2;
  const centerY = height / 2;

  const nodes = useMemo(() => {
    if (!centerDocument) return [];
    
    const codeNodes = codeLinks.map((link, i) => {
      const angle = (i / Math.max(codeLinks.length, 1)) * 2 * Math.PI;
      return {
        id: link.codeFileId,
        x: centerX + 200 * Math.cos(angle),
        y: centerY + 200 * Math.sin(angle),
        type: 'code',
        label: link.codeFileId.split('/').pop() || 'File'
      };
    });

    return [{ id: centerDocument.id, x: centerX, y: centerY, type: 'doc', label: centerDocument.title }, ...codeNodes];
  }, [centerDocument, codeLinks]);

  if (!centerDocument) {
    return (
      <div className="graph-container d-flex align-items-center justify-content-center flex-column text-secondary">
        <i className="fa-solid fa-project-diagram fa-3x mb-3 text-disabled"></i>
        <p>Select a document to visualize its knowledge graph</p>
      </div>
    );
  }

  return (
    <div className="graph-container">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Edges */}
        {nodes.filter(n => n.type === 'code').map(node => (
          <line 
            key={`edge-${node.id}`} 
            x1={centerX} y1={centerY} x2={node.x} y2={node.y} 
            stroke="var(--cn-primary)" strokeWidth="2" strokeOpacity="0.6" 
          />
        ))}

        {/* Nodes */}
        {nodes.map(node => (
          <g key={node.id} className="graph-node" transform={`translate(${node.x}, ${node.y})`}>
            <circle 
              r={node.type === 'doc' ? 40 : 25} 
              fill={node.type === 'doc' ? 'var(--cn-bg-elevated)' : 'var(--cn-bg-secondary)'}
              stroke={node.type === 'doc' ? 'var(--cn-secondary)' : 'var(--cn-primary)'}
              strokeWidth="3"
            />
            <text 
              textAnchor="middle" 
              dy="5" 
              fill="var(--cn-text-primary)" 
              fontSize="var(--cn-font-size-xs)"
              fontWeight="var(--cn-font-weight-medium)"
            >
              {node.label.length > 12 ? node.label.substring(0, 12) + '...' : node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}