import type { GraphModel } from '@/engine/algorithm';
import {
  Activity,
  Database,
  HardDrive,
  HeartPulse,
  Hospital,
  Network,
  Package,
  Pill,
  Radio,
  Server,
  ShieldAlert,
  Stethoscope,
  Truck,
  UserCog,
  Users,
  Zap,
  Building2,
  Cpu,
  Wifi,
  Boxes,
  type LucideIcon,
} from 'lucide-react';

export interface DomainTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  nodeTypes: NodeType[];
}

export interface NodeType {
  label: string;
  icon: LucideIcon;
}

export const domainTemplates: DomainTemplate[] = [
  {
    id: 'hospital',
    name: 'Hospital',
    description: 'Model a hospital network of departments, servers, and records.',
    icon: Hospital,
    nodeTypes: [
      { label: 'Emergency Room', icon: HeartPulse },
      { label: 'ICU', icon: Activity },
      { label: 'Pharmacy', icon: Pill },
      { label: 'Radiology / Imaging', icon: Cpu },
      { label: 'HR Department', icon: Users },
      { label: 'Main Server', icon: Server },
      { label: 'Records Database', icon: Database },
      { label: 'Admin Office', icon: UserCog },
      { label: 'Outpatient Clinic', icon: Stethoscope },
    ],
  },
  {
    id: 'power',
    name: 'Power Grid',
    description: 'Model a regional power grid with substations and generation plants.',
    icon: Zap,
    nodeTypes: [
      { label: 'Power Plant', icon: Zap },
      { label: 'Substation', icon: Boxes },
      { label: 'Distribution Hub', icon: Network },
      { label: 'Control Center', icon: ShieldAlert },
      { label: 'Transformer', icon: Cpu },
      { label: 'Solar Farm', icon: Activity },
      { label: 'Wind Farm', icon: Radio },
      { label: 'Battery Storage', icon: HardDrive },
    ],
  },
  {
    id: 'telecom',
    name: 'Telecom Network',
    description: 'Model a telecom backbone with towers, switches, and data centers.',
    icon: Radio,
    nodeTypes: [
      { label: 'Cell Tower', icon: Radio },
      { label: 'Core Switch', icon: Network },
      { label: 'Data Center', icon: Server },
      { label: 'Edge Router', icon: Wifi },
      { label: 'Fiber Hub', icon: Boxes },
      { label: 'Backup Site', icon: ShieldAlert },
      { label: 'Customer POP', icon: Building2 },
    ],
  },
  {
    id: 'corporate',
    name: 'Corporate IT',
    description: 'Model an office IT network with servers, VPNs, and departments.',
    icon: Building2,
    nodeTypes: [
      { label: 'Main Server', icon: Server },
      { label: 'Domain Controller', icon: ShieldAlert },
      { label: 'File Storage', icon: HardDrive },
      { label: 'Database', icon: Database },
      { label: 'VPN Gateway', icon: Wifi },
      { label: 'HR Department', icon: Users },
      { label: 'Finance Dept', icon: UserCog },
      { label: 'Wi-Fi AP', icon: Radio },
    ],
  },
  {
    id: 'logistics',
    name: 'Logistics / Supply Chain',
    description: 'Model a supply chain of warehouses, hubs, and distribution centers.',
    icon: Truck,
    nodeTypes: [
      { label: 'Distribution Hub', icon: Boxes },
      { label: 'Warehouse', icon: HardDrive },
      { label: 'Port', icon: Network },
      { label: 'Fleet Depot', icon: Truck },
      { label: 'Supplier', icon: Package },
      { label: 'Retail Outlet', icon: Building2 },
      { label: 'Control Center', icon: ShieldAlert },
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Build any network from scratch with generic node types.',
    icon: Network,
    nodeTypes: [
      { label: 'Server', icon: Server },
      { label: 'Database', icon: Database },
      { label: 'Router', icon: Network },
      { label: 'Workstation', icon: Cpu },
      { label: 'Storage', icon: HardDrive },
      { label: 'Department', icon: Users },
      { label: 'Gateway', icon: Wifi },
      { label: 'Control Node', icon: ShieldAlert },
    ],
  },
];

export function getDomain(id: string): DomainTemplate {
  return domainTemplates.find((d) => d.id === id) ?? domainTemplates[domainTemplates.length - 1];
}

export function iconForNode(domainId: string, typeLabel: string): LucideIcon {
  const domain = getDomain(domainId);
  const found = domain.nodeTypes.find((n) => n.label === typeLabel);
  return found?.icon ?? Server;
}

// Default starter graphs for each domain
export function defaultDomainGraph(domainId: string): GraphModel {
  const D = getDomain(domainId);
  let vid = 0;
  const V = (x: number, y: number, label: string) => ({ id: `v${++vid}`, x, y, label });
  const E = (a: string, b: string) => ({ id: `e-${a}-${b}`, from: a, to: b });

  if (domainId === 'hospital') {
    const er = V(180, 160, 'Emergency Room');
    const icu = V(180, 340, 'ICU');
    const server = V(420, 240, 'Main Server');
    const records = V(640, 160, 'Records DB');
    const pharm = V(640, 340, 'Pharmacy');
    return {
      vertices: [er, icu, server, records, pharm],
      edges: [E(er.id, server.id), E(icu.id, server.id), E(server.id, records.id), E(server.id, pharm.id)],
    };
  }
  if (domainId === 'power') {
    const plant = V(180, 240, 'Power Plant');
    const sub1 = V(420, 140, 'Substation A');
    const sub2 = V(420, 340, 'Substation B');
    const hub = V(640, 240, 'Distribution Hub');
    return {
      vertices: [plant, sub1, sub2, hub],
      edges: [E(plant.id, sub1.id), E(plant.id, sub2.id), E(sub1.id, hub.id), E(sub2.id, hub.id)],
    };
  }
  if (domainId === 'telecom') {
    const tower1 = V(180, 160, 'Tower 1');
    const tower2 = V(180, 340, 'Tower 2');
    const core = V(420, 240, 'Core Switch');
    const dc = V(640, 240, 'Data Center');
    return {
      vertices: [tower1, tower2, core, dc],
      edges: [E(tower1.id, core.id), E(tower2.id, core.id), E(core.id, dc.id)],
    };
  }
  if (domainId === 'corporate') {
    const server = V(180, 240, 'Main Server');
    const dc = V(420, 140, 'Domain Controller');
    const files = V(420, 340, 'File Storage');
    const vpn = V(640, 240, 'VPN Gateway');
    return {
      vertices: [server, dc, files, vpn],
      edges: [E(server.id, dc.id), E(server.id, files.id), E(dc.id, vpn.id), E(files.id, vpn.id)],
    };
  }
  if (domainId === 'logistics') {
    const port = V(180, 240, 'Port');
    const hub = V(420, 240, 'Distribution Hub');
    const wh1 = V(640, 140, 'Warehouse A');
    const wh2 = V(640, 340, 'Warehouse B');
    return {
      vertices: [port, hub, wh1, wh2],
      edges: [E(port.id, hub.id), E(hub.id, wh1.id), E(hub.id, wh2.id)],
    };
  }
  // custom — empty
  return { vertices: [], edges: [] };
}
