// Core graph algorithm engine: Articulation Points & Biconnected Components
// DFS-based, computing disc[]/low[] with a discrete step-by-step animation timeline.

export type EdgeKind = 'tree' | 'back';

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
}

export interface GraphVertex {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface GraphModel {
  vertices: GraphVertex[];
  edges: GraphEdge[];
}

export interface EdgeStackItem {
  edgeId: string;
  from: string;
  to: string;
}

export interface BiconnectedComponent {
  id: string;
  edges: EdgeStackItem[];
  vertices: string[];
}

export interface BlockCutNode {
  id: string;
  kind: 'block' | 'cut';
  vertices?: string[]; // for block nodes
  vertex?: string; // for cut nodes
  component?: BiconnectedComponent; // for block nodes
}

export interface BlockCutLink {
  from: string;
  to: string;
}

export interface BlockCutTree {
  nodes: BlockCutNode[];
  links: BlockCutLink[];
}

export type StepKind =
  | 'start'
  | 'visit'
  | 'explore-edge'
  | 'tree-edge'
  | 'back-edge'
  | 'low-update'
  | 'child-return'
  | 'articulation'
  | 'root-articulation'
  | 'close-component'
  | 'finish';

export interface AlgorithmStep {
  index: number;
  kind: StepKind;
  description: string;
  currentVertex: string | null;
  currentEdge?: { from: string; to: string } | null;
  // Snapshot of state at this step
  disc: Record<string, number>;
  low: Record<string, number>;
  parent: Record<string, string | null>;
  visited: string[];
  treeEdges: string[];
  backEdges: string[];
  edgeStack: EdgeStackItem[];
  articulationPoints: string[];
  components: BiconnectedComponent[];
  rootChildrenCount: number;
}

export interface AlgorithmResult {
  steps: AlgorithmStep[];
  articulationPoints: string[];
  components: BiconnectedComponent[];
  blockCutTree: BlockCutTree;
  disc: Record<string, number>;
  low: Record<string, number>;
}

export interface RunOptions {
  buggyMode?: BuggyMode;
}

export type BuggyMode = 'none' | 'skip-parent-check' | 'strict-greater';

// Build adjacency list from graph model.
export function buildAdjacencyList(graph: GraphModel): Record<string, string[]> {
  const adj: Record<string, string[]> = {};
  for (const v of graph.vertices) adj[v.id] = [];
  for (const e of graph.edges) {
    if (adj[e.from]) adj[e.from].push(e.to);
    if (adj[e.to]) adj[e.to].push(e.from);
  }
  return adj;
}

const cloneStack = (s: EdgeStackItem[]): EdgeStackItem[] => s.map((e) => ({ ...e }));

function snapshot(
  index: number,
  kind: StepKind,
  description: string,
  state: {
    currentVertex: string | null;
    currentEdge?: { from: string; to: string } | null;
    disc: Record<string, number>;
    low: Record<string, number>;
    parent: Record<string, string | null>;
    visited: string[];
    treeEdges: string[];
    backEdges: string[];
    edgeStack: EdgeStackItem[];
    articulationPoints: string[];
    components: BiconnectedComponent[];
    rootChildrenCount: number;
  }
): AlgorithmStep {
  return {
    index,
    kind,
    description,
    currentVertex: state.currentVertex,
    currentEdge: state.currentEdge ?? null,
    disc: { ...state.disc },
    low: { ...state.low },
    parent: { ...state.parent },
    visited: [...state.visited],
    treeEdges: [...state.treeEdges],
    backEdges: [...state.backEdges],
    edgeStack: cloneStack(state.edgeStack),
    articulationPoints: [...state.articulationPoints],
    components: state.components.map((c) => ({ ...c, edges: c.edges.map((e) => ({ ...e })), vertices: [...c.vertices] })),
    rootChildrenCount: state.rootChildrenCount,
  };
}

// Run the algorithm and produce a step-by-step timeline.
export function runAlgorithm(graph: GraphModel, startVertex: string, options: RunOptions = {}): AlgorithmResult {
  const adj = buildAdjacencyList(graph);
  const vertexIds = graph.vertices.map((v) => v.id);
  const buggy = options.buggyMode ?? 'none';

  const disc: Record<string, number> = {};
  const low: Record<string, number> = {};
  const parent: Record<string, string | null> = {};
  const visited: string[] = [];
  const treeEdges: string[] = [];
  const backEdges: string[] = [];
  const edgeStack: EdgeStackItem[] = [];
  const articulationPoints: string[] = [];
  const components: BiconnectedComponent[] = [];

  let timer = 0;
  let rootChildren = 0;
  const steps: AlgorithmStep[] = [];

  // edge id lookup
  const edgeById: Record<string, GraphEdge> = {};
  for (const e of graph.edges) edgeById[e.id] = e;

  const state = () => ({
    currentVertex: null as string | null,
    currentEdge: null as { from: string; to: string } | null,
    disc,
    low,
    parent,
    visited,
    treeEdges,
    backEdges,
    edgeStack,
    articulationPoints,
    components,
    rootChildrenCount: rootChildren,
  });

  let stepIndex = 0;
  const push = (kind: StepKind, description: string, cur: string | null, edge: { from: string; to: string } | null = null) => {
    state().currentVertex = cur;
    state().currentEdge = edge;
    steps.push(snapshot(stepIndex++, kind, description, state()));
  };

  push('start', `Starting depth-first search from vertex "${labelOf(graph, startVertex)}".`, startVertex);

  function labelOf(g: GraphModel, id: string) {
    return g.vertices.find((v) => v.id === id)?.label ?? id;
  }

  function dfs(u: string) {
    disc[u] = low[u] = timer++;
    visited.push(u);
    push('visit', `Visiting "${labelOf(graph, u)}". Set disc = ${disc[u]}, low = ${low[u]}.`, u);

    for (const v of adj[u] ?? []) {
      const edgeId = findEdgeId(graph, u, v);
      push('explore-edge', `Exploring edge "${labelOf(graph, u)} — ${labelOf(graph, v)}".`, u, { from: u, to: v });

      if (v === parent[u]) {
        // skip the edge back to parent (unless buggy skip-parent-check)
        if (buggy !== 'skip-parent-check') {
          push('explore-edge', `Skipping the edge back to parent "${labelOf(graph, v)}".`, u, { from: u, to: v });
          continue;
        }
      }

      if (!visited.includes(v)) {
        // tree edge
        parent[v] = u;
        treeEdges.push(edgeId);
        edgeStack.push({ edgeId, from: u, to: v });
        if (parent[u] === null && u === startVertex) {
          // count root children
        }
        push('tree-edge', `Tree edge "${labelOf(graph, u)} → ${labelOf(graph, v)}". Pushing edge onto the stack.`, u, { from: u, to: v });

        if (u === startVertex) {
          rootChildren++;
        }

        dfs(v);

        // after returning
        push('child-return', `Returned from "${labelOf(graph, v)}" to "${labelOf(graph, u)}". Updating low values.`, u, { from: u, to: v });

        const prevLow = low[u];
        low[u] = Math.min(low[u], low[v]);
        push('low-update', `low["${labelOf(graph, u)}"] = min(${prevLow}, low["${labelOf(graph, v)}"]=${low[v]}) = ${low[u]}.`, u, { from: u, to: v });

        // articulation check
        const isRoot = u === startVertex;
        if (isRoot) {
          if (rootChildren >= 2) {
            if (!articulationPoints.includes(u)) articulationPoints.push(u);
            push('root-articulation', `Root "${labelOf(graph, u)}" has ${rootChildren} DFS-tree children → it is an articulation point.`, u);
          }
        } else {
          const condition = buggy === 'strict-greater' ? low[v] > disc[u] : low[v] >= disc[u];
          if (condition) {
            if (!articulationPoints.includes(u)) articulationPoints.push(u);
            push('articulation', `low["${labelOf(graph, v)}"] (${low[v]}) ${buggy === 'strict-greater' ? '>' : '>='} disc["${labelOf(graph, u)}"] (${disc[u]}) → "${labelOf(graph, u)}" is an articulation point. Closing a component.`, u, { from: u, to: v });
            closeComponent(u, v);
          }
        }
      } else if (disc[v] < disc[u]) {
        // back edge (only count when going to an already-discovered, earlier vertex)
        backEdges.push(edgeId);
        edgeStack.push({ edgeId, from: u, to: v });
        push('back-edge', `Back edge "${labelOf(graph, u)} — ${labelOf(graph, v)}" found. low["${labelOf(graph, u)}"] may drop.`, u, { from: u, to: v });
        low[u] = Math.min(low[u], disc[v]);
        push('low-update', `low["${labelOf(graph, u)}"] = min(low["${labelOf(graph, u)}"], disc["${labelOf(graph, v)}"]=${disc[v]}) = ${low[u]}.`, u, { from: u, to: v });
      }
    }
  }

  function closeComponent(u: string, v: string) {
    const compEdges: EdgeStackItem[] = [];
    while (edgeStack.length > 0) {
      const top = edgeStack[edgeStack.length - 1];
      compEdges.push(edgeStack.pop()!);
      if ((top.from === u && top.to === v) || (top.from === v && top.to === u)) break;
    }
    const verts = new Set<string>();
    for (const e of compEdges) {
      verts.add(e.from);
      verts.add(e.to);
    }
    const comp: BiconnectedComponent = {
      id: `bc-${components.length + 1}`,
      edges: compEdges.reverse(),
      vertices: [...verts],
    };
    components.push(comp);
    push('close-component', `Closed biconnected component {${[...verts].map((x) => labelOf(graph, x)).join(', ')}}.`, u);
  }

  dfs(startVertex);

  // After DFS, pop remaining edges into a final component
  if (edgeStack.length > 0) {
    const compEdges = [...edgeStack];
    edgeStack.length = 0;
    const verts = new Set<string>();
    for (const e of compEdges) {
      verts.add(e.from);
      verts.add(e.to);
    }
    const comp: BiconnectedComponent = {
      id: `bc-${components.length + 1}`,
      edges: compEdges,
      vertices: [...verts],
    };
    components.push(comp);
    push('close-component', `Closed final biconnected component {${[...verts].map((x) => labelOf(graph, x)).join(', ')}}.`, null);
  }

  push('finish', `Search complete. Found ${articulationPoints.length} articulation point(s) and ${components.length} biconnected component(s).`, null);

  const blockCutTree = buildBlockCutTree(graph, components, articulationPoints);

  return {
    steps,
    articulationPoints,
    components,
    blockCutTree,
    disc,
    low,
  };
}

function findEdgeId(graph: GraphModel, a: string, b: string): string {
  for (const e of graph.edges) {
    if ((e.from === a && e.to === b) || (e.from === b && e.to === a)) return e.id;
  }
  return `${a}-${b}`;
}

export function buildBlockCutTree(
  graph: GraphModel,
  components: BiconnectedComponent[],
  articulationPoints: string[]
): BlockCutTree {
  const nodes: BlockCutNode[] = [];
  const links: BlockCutLink[] = [];

  for (const comp of components) {
    nodes.push({
      id: comp.id,
      kind: 'block',
      vertices: comp.vertices,
      component: comp,
    });
  }
  for (const ap of articulationPoints) {
    nodes.push({ id: `cut-${ap}`, kind: 'cut', vertex: ap });
  }

  for (const comp of components) {
    for (const v of comp.vertices) {
      if (articulationPoints.includes(v)) {
        links.push({ from: comp.id, to: `cut-${v}` });
      }
    }
  }

  return { nodes, links };
}

// Compute resilience: % of vertex pairs that remain connected after removing the worst single node.
export function computeResilience(graph: GraphModel, articulationPoints: string[]): number {
  const n = graph.vertices.length;
  if (n <= 1) return 100;

  let worstDisconnected = 0;
  for (const ap of articulationPoints) {
    const remaining = graph.vertices.filter((v) => v.id !== ap).map((v) => v.id);
    const groups = countConnectedGroups(graph, ap);
    // pairs disconnected = pairs across different groups
    let disconnected = 0;
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        disconnected += groups[i] * groups[j];
      }
    }
    worstDisconnected = Math.max(worstDisconnected, disconnected);
  }

  const totalPairs = (n * (n - 1)) / 2;
  if (totalPairs === 0) return 100;
  const connectedPairs = totalPairs - worstDisconnected;
  return Math.round((connectedPairs / totalPairs) * 100);
}

function countConnectedGroups(graph: GraphModel, removed: string): number[] {
  const adj = buildAdjacencyList(graph);
  const visited = new Set<string>();
  const groups: number[] = [];
  for (const v of graph.vertices) {
    if (v.id === removed || visited.has(v.id)) continue;
    let count = 0;
    const queue = [v.id];
    visited.add(v.id);
    while (queue.length) {
      const cur = queue.shift()!;
      count++;
      for (const nb of adj[cur] ?? []) {
        if (nb !== removed && !visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    groups.push(count);
  }
  return groups;
}

// Plain-language impact description for a critical node.
export function describeImpact(graph: GraphModel, ap: string): string {
  const adj = buildAdjacencyList(graph);
  const label = (id: string) => graph.vertices.find((v) => v.id === id)?.label ?? id;

  // find disconnected groups when ap removed
  const groups = countConnectedGroups(graph, ap);
  if (groups.length <= 1) {
    return `If "${label(ap)}" fails, the rest of the network stays connected, but traffic through this node is interrupted.`;
  }

  // Identify which vertices are in the smallest disconnected group(s)
  const visited = new Set<string>([ap]);
  const groupVertices: string[][] = [];
  for (const v of graph.vertices) {
    if (visited.has(v.id)) continue;
    const grp: string[] = [];
    const queue = [v.id];
    visited.add(v.id);
    while (queue.length) {
      const cur = queue.shift()!;
      grp.push(cur);
      for (const nb of adj[cur] ?? []) {
        if (nb !== ap && !visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    groupVertices.push(grp);
  }

  // pick the two largest disconnected groups for the sentence
  groupVertices.sort((a, b) => b.length - a.length);
  const g1 = groupVertices[0] ?? [];
  const g2 = groupVertices.slice(1).flat();
  const g1Labels = g1.slice(0, 3).map(label).join(', ');
  const g2Labels = g2.slice(0, 3).map(label).join(', ');

  if (g2.length === 0) {
    return `If "${label(ap)}" fails, ${g1Labels || 'part of the network'} becomes isolated from the rest.`;
  }
  return `If "${label(ap)}" fails, ${g1Labels || 'one group'} and ${g2Labels || 'another group'} will be disconnected from each other.`;
}

export function suggestRemediation(graph: GraphModel, ap: string): string {
  const adj = buildAdjacencyList(graph);
  const label = (id: string) => graph.vertices.find((v) => v.id === id)?.label ?? id;

  const groups = countConnectedGroups(graph, ap);
  if (groups.length < 2) return `Review whether "${label(ap)}" truly needs to be a single point; consider duplicating its function.`;

  // find vertices in different groups (excluding ap) to suggest connecting
  const visited = new Set<string>([ap]);
  const groupVertices: string[][] = [];
  for (const v of graph.vertices) {
    if (visited.has(v.id)) continue;
    const grp: string[] = [];
    const queue = [v.id];
    visited.add(v.id);
    while (queue.length) {
      const cur = queue.shift()!;
      grp.push(cur);
      for (const nb of adj[cur] ?? []) {
        if (nb !== ap && !visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    groupVertices.push(grp);
  }

  if (groupVertices.length >= 2) {
    const a = groupVertices[0][0];
    const b = groupVertices[1][0];
    return `Consider adding a backup connection between "${label(a)}" and "${label(b)}" to remove this single point of failure.`;
  }
  return `Consider adding a redundant path around "${label(ap)}".`;
}
