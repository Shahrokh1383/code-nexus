import { JSX, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { CodeToDocLinkDto } from '../../../domains/linking/application/dto/link.dto';

interface GraphNode {
  id: string;
  label: string;
  type: 'doc' | 'code';
  linkId?: string;
  documentId?: string;
}

interface InteractiveGraphProps {
  centerDocumentId: string;
  centerDocumentTitle: string;
  codeLinks: CodeToDocLinkDto[];
  onRemoveLink: (linkId: string, documentId: string) => void;
}

interface Position { x: number; y: number; }

function forceLayout(nodes: GraphNode[], width: number, height: number): Map<string, Position> {
  const positions = new Map<string, Position>();
  const cx = width / 2;
  const cy = height / 2;
  nodes.forEach((node, i) => {
    if (node.type === 'doc') {
      positions.set(node.id, { x: cx, y: cy });
    } else {
      const angle = (i / Math.max(nodes.length - 1, 1)) * 2 * Math.PI;
      const r = 150 + Math.random() * 50;
      positions.set(node.id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
  });
  const center = positions.get(nodes[0]?.id);
  if (!center) return positions;
  for (let iter = 0; iter < 50; iter++) {
    nodes.forEach(node => {
      if (node.type === 'doc') return;
      const pos = positions.get(node.id);
      if (!pos) return;
      const dx = center.x - pos.x;
      const dy = center.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const force = (dist - 180) * 0.05;
      pos.x += (dx / dist) * force;
      pos.y += (dy / dist) * force;
    });
  }
  return positions;
}

export function InteractiveGraph({
  centerDocumentId,
  centerDocumentTitle,
  codeLinks,
  onRemoveLink,
}: InteractiveGraphProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  const width = viewBox.width;
  const height = viewBox.height;

  const nodes: GraphNode[] = useMemo(() => {
    const doc: GraphNode = { id: centerDocumentId, label: centerDocumentTitle, type: 'doc' };
    const code = codeLinks.map(l => ({
      id: l.codeFileId,
      label: l.codeFileName || l.codeFileId,
      type: 'code' as const,
      linkId: l.id,
      documentId: l.documentId,
    }));
    return [doc, ...code];
  }, [centerDocumentId, centerDocumentTitle, codeLinks]);

  const positions = useMemo(() => forceLayout(nodes, width, height), [nodes, width, height]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.min(Math.max(prev * (e.deltaY > 0 ? 0.9 : 1.1), 0.2), 5));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { setIsPanning(true); setLastMouse({ x: e.clientX, y: e.clientY }); }
  }, []);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset(prev => ({ x: prev.x + e.clientX - lastMouse.x, y: prev.y + e.clientY - lastMouse.y }));
    setLastMouse({ x: e.clientX, y: e.clientY });
  }, [isPanning, lastMouse]);
  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onResize = () => {
      const rect = container.getBoundingClientRect();
      setViewBox({ x: 0, y: 0, width: rect.width || 800, height: rect.height || 600 });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div
      ref={containerRef}
      className="graph-container"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="graph-zoom-controls">
        <button className="graph-zoom-btn" onClick={() => setZoom(z => Math.min(z * 1.2, 5))} title="Zoom in">
          <i className="fa-solid fa-plus" />
        </button>
        <button className="graph-zoom-btn" onClick={() => setZoom(z => Math.max(z * 0.8, 0.2))} title="Zoom out">
          <i className="fa-solid fa-minus" />
        </button>
        <button className="graph-zoom-btn" onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }} title="Reset">
          <i className="fa-solid fa-arrow-rotate-right" />
        </button>
      </div>

      <svg width="100%" height="100%" viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`} style={{ cursor: isPanning ? 'grabbing' : 'grab' }}>
        <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
          {nodes.filter(n => n.type === 'code').map(node => {
            const dp = positions.get(centerDocumentId);
            const cp = positions.get(node.id);
            if (!dp || !cp) return null;
            return <line key={`e-${node.id}`} x1={dp.x} y1={dp.y} x2={cp.x} y2={cp.y} stroke="var(--cn-primary)" strokeWidth="2" strokeOpacity="0.6" />;
          })}
          {nodes.map(node => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const isDoc = node.type === 'doc';
            const r = isDoc ? 40 : 25;
            return (
              <g key={node.id} transform={`translate(${pos.x},${pos.y})`} className="graph-node">
                <circle r={r} fill={isDoc ? 'var(--cn-bg-elevated)' : 'var(--cn-bg-secondary)'} stroke={isDoc ? 'var(--cn-secondary)' : 'var(--cn-primary)'} strokeWidth="3" />
                <text textAnchor="middle" dy="0.3em" fill="var(--cn-text-primary)" fontSize="var(--cn-font-size-xs)" fontWeight="var(--cn-font-weight-medium)">
                  {node.label.length > 12 ? node.label.substring(0,12)+'…' : node.label}
                </text>
                {node.type === 'code' && node.linkId && (
                  <g transform={`translate(${r-4},${-r+4})`} onClick={e => { e.stopPropagation(); node.linkId && node.documentId && onRemoveLink(node.linkId, node.documentId); }} style={{ cursor: 'pointer' }}>
                    <circle r="8" fill="var(--cn-error)" stroke="white" strokeWidth="1" />
                    <text textAnchor="middle" dy="0.3em" fill="white" fontSize="10" fontWeight="bold">✕</text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}