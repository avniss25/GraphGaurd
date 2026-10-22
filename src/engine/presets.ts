import type { GraphModel, GraphVertex, GraphEdge } from '@/engine/algorithm';

export interface PresetGraph {
  id: string;
  name: string;
  description: string;
  graph: GraphModel;
  startVertex: string;
}

let vid = 0;
const V = (x: number, y: number, label: string): GraphVertex => ({ id: `v${++vid}`, x, y, label });
const E = (from: string, to: string): GraphEdge => ({ id: `e-${from}-${to}`, from, to });

function resetIds() {
  vid = 0;
}

export function getPresetGraphs(): PresetGraph[] {
  const presets: PresetGraph[] = [];

  resetIds();
  // 1. Simple chain (line) — middle is articulation point
  {
    const a = V(120, 220, 'A');
    const b = V(300, 220, 'B');
    const c = V(480, 220, 'C');
    const d = V(660, 220, 'D');
    presets.push({
      id: 'chain',
      name: 'Simple Chain',
      description: 'A line of 4 nodes — every interior node is a single point of failure.',
      graph: { vertices: [a, b, c, d], edges: [E(a.id, b.id), E(b.id, c.id), E(c.id, d.id)] },
      startVertex: a.id,
    });
  }

  resetIds();
  // 2. Cycle — no articulation points
  {
    const a = V(390, 100, 'A');
    const b = V(620, 240, 'B');
    const c = V(530, 470, 'C');
    const d = V(250, 470, 'D');
    const e = V(160, 240, 'E');
    presets.push({
      id: 'cycle',
      name: 'Cycle',
      description: 'A ring of 5 nodes — fully redundant, no single point of failure.',
      graph: {
        vertices: [a, b, c, d, e],
        edges: [E(a.id, b.id), E(b.id, c.id), E(c.id, d.id), E(d.id, e.id), E(e.id, a.id)],
      },
      startVertex: a.id,
    });
  }

  resetIds();
  // 3. Two cycles sharing a vertex (classic articulation point)
  {
    const shared = V(390, 260, 'S');
    const a = V(220, 150, 'A');
    const b = V(220, 370, 'B');
    const c = V(560, 150, 'C');
    const d = V(560, 370, 'D');
    presets.push({
      id: 'figure8',
      name: 'Figure-Eight',
      description: 'Two triangles sharing one node — the shared node is critical.',
      graph: {
        vertices: [shared, a, b, c, d],
        edges: [E(shared.id, a.id), E(shared.id, b.id), E(a.id, b.id), E(shared.id, c.id), E(shared.id, d.id), E(c.id, d.id)],
      },
      startVertex: shared.id,
    });
  }

  resetIds();
  // 4. Bridge graph (two biconnected components joined by a bridge)
  {
    const a = V(150, 200, 'A');
    const b = V(150, 360, 'B');
    const c = V(300, 280, 'C');
    const d = V(520, 280, 'D');
    const e = V(680, 200, 'E');
    const f = V(680, 360, 'F');
    presets.push({
      id: 'bridge',
      name: 'Bridge',
      description: 'Two triangles joined by a single bridge edge — both endpoints of the bridge are critical.',
      graph: {
        vertices: [a, b, c, d, e, f],
        edges: [E(a.id, b.id), E(b.id, c.id), E(a.id, c.id), E(c.id, d.id), E(d.id, e.id), E(d.id, f.id), E(e.id, f.id)],
      },
      startVertex: a.id,
    });
  }

  resetIds();
  // 5. Root case demo: root with 1 child vs 2 children
  {
    const root = V(390, 120, 'R');
    const a = V(220, 320, 'A');
    const b = V(560, 320, 'B');
    const c = V(220, 480, 'C');
    const d = V(560, 480, 'D');
    presets.push({
      id: 'root2',
      name: 'Root with 2 Children',
      description: 'The root has two independent DFS-tree children → it is an articulation point.',
      graph: {
        vertices: [root, a, b, c, d],
        edges: [E(root.id, a.id), E(root.id, b.id), E(a.id, c.id), E(b.id, d.id)],
      },
      startVertex: root.id,
    });
  }

  resetIds();
  // 6. Root with 1 child (not an articulation point)
  {
    const root = V(390, 120, 'R');
    const a = V(390, 300, 'A');
    const b = V(220, 460, 'B');
    const c = V(560, 460, 'C');
    presets.push({
      id: 'root1',
      name: 'Root with 1 Child',
      description: 'The root has only one DFS-tree child → it is NOT an articulation point.',
      graph: {
        vertices: [root, a, b, c],
        edges: [E(root.id, a.id), E(a.id, b.id), E(a.id, c.id), E(b.id, c.id)],
      },
      startVertex: root.id,
    });
  }

  return presets;
}

export function cloneGraph(g: GraphModel): GraphModel {
  const idMap: Record<string, string> = {};
  const vertices = g.vertices.map((v) => {
    const nv = { ...v, id: `v${++vid}` };
    idMap[v.id] = nv.id;
    return nv;
  });
  const edges = g.edges.map((e) => ({
    id: `e-${idMap[e.from]}-${idMap[e.to]}`,
    from: idMap[e.from],
    to: idMap[e.to],
  }));
  return { vertices, edges };
}

export function freshGraph(): GraphModel {
  return { vertices: [], edges: [] };
}
