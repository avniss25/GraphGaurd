import { useEffect, useRef, useState, useCallback } from 'react';
import type { GraphModel, GraphVertex, GraphEdge } from '@/engine/algorithm';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Maximize2 } from 'lucide-react';

export type InteractionMode = 'view' | 'add-vertex' | 'connect' | 'delete';

export interface CanvasProps {
  graph: GraphModel;
  onChange?: (g: GraphModel) => void;
  interaction?: InteractionMode;
  // visualization overlays
  highlightVertex?: string | null;
  articulationPoints?: string[];
  treeEdges?: string[];
  backEdges?: string[];
  visitedVertices?: string[];
  currentEdge?: { from: string; to: string } | null;
  edgeStack?: { edgeId: string; from: string; to: string }[];
  components?: { id: string; vertices: string[]; color: string }[];
  // node icons (real-world mode)
  nodeIcon?: (vertexId: string) => LucideIcon | null;
  // block-cut tree mode
  blockCutMode?: boolean;
  blockCutNodes?: { id: string; kind: 'block' | 'cut'; vertices?: string[]; vertex?: string }[];
  blockCutLinks?: { from: string; to: string }[];
  // disable editing
  readOnly?: boolean;
  showLabels?: boolean;
  showFitButton?: boolean;
}

const NODE_RADIUS = 26;
// Padding around the bounding box so labels and shadows never touch the edge.
const VIEW_PADDING = NODE_RADIUS + 40;

// Distinct colors for biconnected components
const COMPONENT_COLORS = ['#1C7293', '#3FA7B8', '#6B5B95', '#88B04B', '#FF6B35', '#D65076', '#45B8AC', '#E0A458'];

interface ViewBox { x: number; y: number; w: number; h: number; }

export function GraphCanvas(props: CanvasProps) {
  const {
    graph,
    onChange,
    interaction = 'view',
    highlightVertex,
    articulationPoints = [],
    treeEdges = [],
    backEdges = [],
    visitedVertices = [],
    currentEdge,
    edgeStack = [],
    components = [],
    nodeIcon,
    blockCutMode = false,
    blockCutNodes = [],
    blockCutLinks = [],
    readOnly = false,
    showLabels = true,
    showFitButton = true,
  } = props;

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pendingConnect, setPendingConnect] = useState<string | null>(null);
  const [hoverVertex, setHoverVertex] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 520 });
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, w: 800, h: 520 });
  // fitToken bumps to force a refit (e.g. the "Fit to view" button)
  const [fitToken, setFitToken] = useState(0);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        setDimensions({ width: Math.max(w, 200), height: Math.max(h, 200) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute a viewBox that fits all vertices (with padding) and matches the
  // container's aspect ratio so nothing is clipped and space is used well.
  const computeFit = useCallback((): ViewBox => {
    const { width: cw, height: ch } = dimensions;
    if (graph.vertices.length === 0) {
      return { x: 0, y: 0, w: cw, h: ch };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const v of graph.vertices) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    let bw = (maxX - minX) + VIEW_PADDING * 2;
    let bh = (maxY - minY) + VIEW_PADDING * 2;
    // Match container aspect ratio so the SVG doesn't letterbox awkwardly.
    const aspect = cw / ch;
    if (bw / bh > aspect) {
      bh = bw / aspect;
    } else {
      bw = bh * aspect;
    }
    return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
  }, [dimensions, graph.vertices]);

  // Auto-fit when the vertex set changes, the container resizes, or a fit is requested.
  // We intentionally do NOT refit on every position update (e.g. dragging) so the
  // coordinate system stays stable while you move a node.
  const vertexSignature = graph.vertices.map((v) => v.id).join(',');
  useEffect(() => {
    setViewBox(computeFit());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertexSignature, dimensions.width, dimensions.height, fitToken]);

  const fitView = useCallback(() => setViewBox(computeFit()), [computeFit]);

  // Map a mouse event to the current viewBox coordinate space.
  const getSvgPoint = useCallback((e: React.MouseEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x;
    const y = ((e.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y;
    return { x, y };
  }, [viewBox]);

  const findVertexAt = useCallback((x: number, y: number): GraphVertex | null => {
    for (const v of graph.vertices) {
      const dx = v.x - x;
      const dy = v.y - y;
      if (dx * dx + dy * dy <= (NODE_RADIUS + 4) ** 2) return v;
    }
    return null;
  }, [graph.vertices]);

  const findEdgeAt = useCallback((x: number, y: number): GraphEdge | null => {
    for (const e of graph.edges) {
      const a = graph.vertices.find((v) => v.id === e.from);
      const b = graph.vertices.find((v) => v.id === e.to);
      if (!a || !b) continue;
      const dist = pointToSegmentDist(x, y, a.x, a.y, b.x, b.y);
      if (dist < 8) return e;
    }
    return null;
  }, [graph.edges, graph.vertices]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    const pt = getSvgPoint(e);
    if (!pt) return;
    const v = findVertexAt(pt.x, pt.y);

    if (e.button === 2) {
      // right click — delete
      e.preventDefault();
      if (v) deleteVertex(v.id);
      else {
        const ed = findEdgeAt(pt.x, pt.y);
        if (ed) deleteEdge(ed.id);
      }
      return;
    }

    if (interaction === 'add-vertex') {
      if (!v) addVertex(pt.x, pt.y);
      return;
    }
    if (interaction === 'connect') {
      if (v) {
        if (pendingConnect && pendingConnect !== v.id) {
          addEdge(pendingConnect, v.id);
          setPendingConnect(null);
        } else {
          setPendingConnect(v.id);
        }
      } else {
        setPendingConnect(null);
      }
      return;
    }
    if (interaction === 'delete') {
      if (v) deleteVertex(v.id);
      else {
        const ed = findEdgeAt(pt.x, pt.y);
        if (ed) deleteEdge(ed.id);
      }
      return;
    }
    // view mode — start drag
    if (v) {
      setDraggingId(v.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId) return;
    const pt = getSvgPoint(e);
    if (!pt) return;
    moveVertex(draggingId, pt.x, pt.y);
  };

  const handleMouseUp = () => setDraggingId(null);

  const addVertex = (x: number, y: number) => {
    const id = `v${Date.now()}`;
    const newVertex: GraphVertex = { id, x, y, label: String.fromCharCode(65 + (graph.vertices.length % 26)) };
    onChange?.({ vertices: [...graph.vertices, newVertex], edges: graph.edges });
  };

  const addEdge = (from: string, to: string) => {
    if (from === to) return;
    if (graph.edges.some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from))) return;
    const id = `e-${from}-${to}-${Date.now()}`;
    onChange?.({ vertices: graph.vertices, edges: [...graph.edges, { id, from, to }] });
  };

  const deleteVertex = (id: string) => {
    onChange?.({
      vertices: graph.vertices.filter((v) => v.id !== id),
      edges: graph.edges.filter((e) => e.from !== id && e.to !== id),
    });
  };

  const deleteEdge = (id: string) => {
    onChange?.({ vertices: graph.vertices, edges: graph.edges.filter((e) => e.id !== id) });
  };

  const moveVertex = (id: string, x: number, y: number) => {
    onChange?.({
      vertices: graph.vertices.map((v) => (v.id === id ? { ...v, x, y } : v)),
      edges: graph.edges,
    });
  };

  const isArticulation = (id: string) => articulationPoints.includes(id);
  const isVisited = (id: string) => visitedVertices.includes(id);
  const isHighlighted = (id: string) => highlightVertex === id;

  // edge color helpers
  const edgeColor = (e: GraphEdge): { stroke: string; dash: string; width: number } => {
    if (backEdges.includes(e.id)) return { stroke: '#FF6B35', dash: '6 4', width: 2.5 };
    if (treeEdges.length > 0 && treeEdges.includes(e.id)) return { stroke: '#F227F5', dash: 'none', width: 2.5 };
    if (edgeStack.length > 0 && edgeStack.some((s) => s.edgeId === e.id)) return { stroke: '#3FA7B8', dash: 'none', width: 2.5 };
    return { stroke: '#9FB3C8', dash: 'none', width: 2 };
  };

  const isCurrentEdge = (e: GraphEdge) =>
    currentEdge && ((currentEdge.from === e.from && currentEdge.to === e.to) || (currentEdge.from === e.to && currentEdge.to === e.from));

  // component color for a vertex
  const vertexComponentColor = (id: string): string | null => {
    for (const c of components) {
      if (c.vertices.includes(id)) return c.color;
    }
    return null;
  };

  if (blockCutMode) {
    return (
      <div ref={containerRef} className="relative w-full h-full overflow-hidden">
        <BlockCutCanvas nodes={blockCutNodes} links={blockCutLinks} width={dimensions.width} height={dimensions.height} vertexLabel={(id) => graph.vertices.find((v) => v.id === id)?.label ?? id} nodeIcon={nodeIcon} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{ background: '#F5F7F9', cursor: interaction === 'add-vertex' ? 'crosshair' : interaction === 'connect' ? 'pointer' : interaction === 'delete' ? 'not-allowed' : draggingId ? 'grabbing' : 'default' }}
      >
        <defs>
          <filter id="nodeShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0B1F3A" floodOpacity="0.25" />
          </filter>
          <filter id="nodeShadowActive" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#FF6B35" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Edges */}
        {graph.edges.map((e) => {
          const a = graph.vertices.find((v) => v.id === e.from);
          const b = graph.vertices.find((v) => v.id === e.to);
          if (!a || !b) return null;
          const col = edgeColor(e);
          const current = isCurrentEdge(e);
          return (
            <motion.line
              key={e.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={current ? '#FF6B35' : col.stroke}
              strokeWidth={current ? 4 : col.width}
              strokeDasharray={col.dash}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{ filter: current ? 'drop-shadow(0 0 4px #FF6B35)' : undefined }}
            />
          );
        })}

        {/* Pending connect line */}
        {pendingConnect && (() => {
          const a = graph.vertices.find((v) => v.id === pendingConnect);
          if (!a) return null;
          return <circle cx={a.x} cy={a.y} r={NODE_RADIUS + 6} fill="none" stroke="#3FA7B8" strokeWidth={2} strokeDasharray="4 3" />;
        })()}

        {/* Vertices */}
        {graph.vertices.map((v) => {
          const ap = isArticulation(v.id);
          const visited = isVisited(v.id);
          const hl = isHighlighted(v.id);
          const fill = ap ? '#FF6B35' : visited ? '#1C7293' : '#3FA7B8';
          const compColor = vertexComponentColor(v.id);
          const Icon = nodeIcon?.(v.id) ?? null;
          return (
            <motion.g
              key={v.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onMouseEnter={() => setHoverVertex(v.id)}
              onMouseLeave={() => setHoverVertex(null)}
            >
              {compColor && (
                <circle cx={v.x} cy={v.y} r={NODE_RADIUS + 6} fill="none" stroke={compColor} strokeWidth={3} opacity={0.5} />
              )}
              <motion.circle
                cx={v.x}
                cy={v.y}
                r={NODE_RADIUS}
                fill={fill}
                stroke="#FFFFFF"
                strokeWidth={3}
                filter={hl ? 'url(#nodeShadowActive)' : 'url(#nodeShadow)'}
                animate={hl ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={{ duration: 0.6, repeat: hl ? Infinity : 0 }}
                style={{ cursor: readOnly ? 'default' : 'grab' }}
              />
              {Icon ? (
                <g transform={`translate(${v.x - 12}, ${v.y - 12})`}>
                  <Icon size={24} color="#FFFFFF" strokeWidth={2.2} />
                </g>
              ) : (
                <text x={v.x} y={v.y} textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontSize={14} fontWeight={700} style={{ pointerEvents: 'none' }}>
                  {v.label}
                </text>
              )}
              {showLabels && Icon && (
                <text x={v.x} y={v.y + NODE_RADIUS + 14} textAnchor="middle" fill="#0B1F3A" fontSize={11} fontWeight={600} style={{ pointerEvents: 'none' }}>
                  {v.label}
                </text>
              )}
              {pendingConnect === v.id && (
                <circle cx={v.x} cy={v.y} r={NODE_RADIUS + 6} fill="none" stroke="#3FA7B8" strokeWidth={2} strokeDasharray="4 3" />
              )}
            </motion.g>
          );
        })}
      </svg>

      {/* Fit to view button */}
      {showFitButton && (
        <button
          onClick={fitView}
          title="Fit to view"
          className="absolute top-2 right-2 flex items-center gap-1.5 bg-white/90 hover:bg-white text-navy text-xs font-semibold rounded-lg px-2.5 py-1.5 shadow-card border border-slate-200 transition-colors"
        >
          <Maximize2 size={14} className="text-teal" />
          Fit
        </button>
      )}

      {/* Hover tooltip for articulation */}
      {hoverVertex && isArticulation(hoverVertex) && (
        <div className="absolute top-2 left-2 bg-orange text-white text-xs px-3 py-1.5 rounded-full shadow-card">
          Critical node (single point of failure)
        </div>
      )}
    </div>
  );
}

function BlockCutCanvas({
  nodes,
  links,
  width,
  height,
  vertexLabel,
  nodeIcon,
}: {
  nodes: { id: string; kind: 'block' | 'cut'; vertices?: string[]; vertex?: string }[];
  links: { from: string; to: string }[];
  width: number;
  height: number;
  vertexLabel: (id: string) => string;
  nodeIcon?: (vertexId: string) => LucideIcon | null;
}) {
  // Layout: cut nodes in a vertical center line, blocks around them
  const cx = width / 2;
  const cy = height / 2;
  const cutNodes = nodes.filter((n) => n.kind === 'cut');
  const blockNodes = nodes.filter((n) => n.kind === 'block');

  const positions: Record<string, { x: number; y: number }> = {};
  const radius = Math.min(width, height) * 0.32;

  cutNodes.forEach((n, i) => {
    const angle = cutNodes.length === 1 ? 0 : (i / cutNodes.length) * Math.PI * 2;
    positions[n.id] = { x: cx + Math.cos(angle) * radius * 0.4, y: cy + Math.sin(angle) * radius * 0.4 };
  });
  blockNodes.forEach((n, i) => {
    const angle = (i / Math.max(blockNodes.length, 1)) * Math.PI * 2;
    positions[n.id] = { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" style={{ background: '#F5F7F9' }}>
      <defs>
        <filter id="bcShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0B1F3A" floodOpacity="0.2" />
        </filter>
      </defs>
      {links.map((l, i) => {
        const a = positions[l.from];
        const b = positions[l.to];
        if (!a || !b) return null;
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#9FB3C8" strokeWidth={2} />;
      })}
      {nodes.map((n) => {
        const p = positions[n.id];
        if (!p) return null;
        if (n.kind === 'cut') {
          const Icon = nodeIcon?.(n.vertex!) ?? null;
          return (
            <motion.g key={n.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.4 }}>
              <circle cx={p.x} cy={p.y} r={24} fill="#FF6B35" stroke="#FFFFFF" strokeWidth={3} filter="url(#bcShadow)" />
              {Icon ? (
                <g transform={`translate(${p.x - 11}, ${p.y - 11})`}>
                  <Icon size={22} color="#FFFFFF" />
                </g>
              ) : (
                <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontSize={12} fontWeight={700}>
                  {vertexLabel(n.vertex!)}
                </text>
              )}
              <text x={p.x} y={p.y + 38} textAnchor="middle" fill="#FF6B35" fontSize={10} fontWeight={600}>
                Cut vertex
              </text>
            </motion.g>
          );
        }
        const verts = (n.vertices ?? []).map(vertexLabel).join(', ');
        return (
          <motion.g key={n.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <rect x={p.x - 50} y={p.y - 22} width={100} height={44} rx={10} fill="#1C7293" stroke="#FFFFFF" strokeWidth={2} filter="url(#bcShadow)" />
            <text x={p.x} y={p.y - 4} textAnchor="middle" fill="#FFFFFF" fontSize={11} fontWeight={700}>
              Block
            </text>
            <text x={p.x} y={p.y + 10} textAnchor="middle" fill="#D7E2EA" fontSize={9}>
              {verts.length > 22 ? verts.slice(0, 20) + '…' : verts}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}

function pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export { COMPONENT_COLORS };
