import { JSX, useRef, useState, useEffect, useMemo } from 'react';
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

function forceLayout(nodes: GraphNode[], w: number, h: number): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const cx = w / 2, cy = h / 2;
  nodes.forEach((n, i) => {
    if (n.type === 'doc') pos.set(n.id, { x: cx, y: cy });
    else {
      const angle = (i / Math.max(nodes.length - 1, 1)) * 2 * Math.PI;
      const r = 150 + Math.random() * 50;
      pos.set(n.id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
  });
  const center = pos.get(nodes[0]?.id);
  if (!center) return pos;
  for (let i = 0; i < 50; i++) {
    nodes.forEach(n => {
      if (n.type === 'doc') return;
      const p = pos.get(n.id);
      if (!p) return;
      const dx = center.x - p.x, dy = center.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
      p.x += (dx / dist) * (dist - 180) * 0.05;
      p.y += (dy / dist) * (dist - 180) * 0.05;
    });
  }
  return pos;
}

export function InteractiveGraph({ centerDocumentId, centerDocumentTitle, codeLinks, onRemoveLink }: InteractiveGraphProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  const nodes = useMemo(() => [
    { id: centerDocumentId, label: centerDocumentTitle, type: 'doc' as const },
    ...codeLinks.map(l => ({ id: l.codeFileId, label: l.codeFileName || l.codeFileId, type: 'code' as const, linkId: l.id, documentId: l.documentId }))
  ], [centerDocumentId, centerDocumentTitle, codeLinks]);

  const positions = useMemo(() => forceLayout(nodes, viewBox.w, viewBox.h), [nodes, viewBox.w, viewBox.h]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resize = () => { const r = el.getBoundingClientRect(); setViewBox({ x: 0, y: 0, w: r.width || 800, h: r.height || 600 }); };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div ref={containerRef} className="graph-container" onWheel={e => { e.preventDefault(); setZoom(z => Math.min(Math.max(z * (e.deltaY > 0 ? 0.9 : 1.1), 0.2), 5)); }} onMouseDown={e => { if (e.button === 0) { setIsPanning(true); setLastMouse({ x: e.clientX, y: e.clientY }); } }} onMouseMove={e => { if (!isPanning) return; setPan(p => ({ x: p.x + e.clientX - lastMouse.x, y: p.y + e.clientY - lastMouse.y })); setLastMouse({ x: e.clientX, y: e.clientY }); }} onMouseUp={() => setIsPanning(false)} onMouseLeave={() => setIsPanning(false)}>
      <div className="graph-zoom-controls">
        <button className="graph-zoom-btn" onClick={() => setZoom(z => Math.min(z * 1.2, 5))} title="Zoom in"><i className="fa-solid fa-plus" /></button>
        <button className="graph-zoom-btn" onClick={() => setZoom(z => Math.max(z * 0.8, 0.2))} title="Zoom out"><i className="fa-solid fa-minus" /></button>
        <button className="graph-zoom-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset"><i className="fa-solid fa-arrow-rotate-right" /></button>
      </div>
      <svg width="100%" height="100%" viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} style={{ cursor: isPanning ? 'grabbing' : 'grab' }}>
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {nodes.filter(n => n.type === 'code').map(n => { const dp = positions.get(centerDocumentId), cp = positions.get(n.id); return (dp && cp) ? <line key={`e-${n.id}`} x1={dp.x} y1={dp.y} x2={cp.x} y2={cp.y} stroke="var(--cn-primary)" strokeWidth="2" strokeOpacity="0.6" /> : null; })}
          {nodes.map(n => { const p = positions.get(n.id); if (!p) return null; const isDoc = n.type === 'doc', r = isDoc ? 40 : 25; return (
            <g key={n.id} transform={`translate(${p.x},${p.y})`} className="graph-node">
              <circle r={r} fill={isDoc ? 'var(--cn-bg-elevated)' : 'var(--cn-bg-secondary)'} stroke={isDoc ? 'var(--cn-secondary)' : 'var(--cn-primary)'} strokeWidth="3" />
              <text textAnchor="middle" dy="0.3em" fill="var(--cn-text-primary)" fontSize="var(--cn-font-size-xs)" fontWeight="var(--cn-font-weight-medium)">{n.label.length > 12 ? `${n.label.substring(0, 12)}…` : n.label}</text>
              {n.type === 'code' && n.linkId && <g transform={`translate(${r - 4},${-r + 4})`} onClick={e => { e.stopPropagation(); if (n.linkId && n.documentId) onRemoveLink(n.linkId, n.documentId); }} style={{ cursor: 'pointer' }}><circle r="8" fill="var(--cn-error)" stroke="white" strokeWidth="1" /><text textAnchor="middle" dy="0.3em" fill="white" fontSize="10" fontWeight="bold">✕</text></g>}
            </g>
          ); })}
        </g>
      </svg>
    </div>
  );
}