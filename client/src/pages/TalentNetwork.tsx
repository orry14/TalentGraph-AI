import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { GlassCard } from '../components/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network, AlertTriangle, Search, GitBranch, ChevronRight,
  Database, RefreshCw, Filter, X, Activity, Users, Briefcase, ZapOff
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  label: string;
  type: 'employee' | 'skill' | 'project' | 'department';
  group: string;
  size?: number;
  color?: string;
  data?: Record<string, any>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  weight?: number;
}

interface SpofResult {
  skill: string;
  expertCount: number;
  experts: string[];
  dependentProjects: string[];
  dependencyCount: number;
  riskLevel: 'Critical' | 'High' | 'Medium';
}

// ── Canvas Force Graph ─────────────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  employee: '#3b82f6',
  skill: '#10b981',
  project: '#f59e0b',
  department: '#8b5cf6',
};

const EDGE_COLORS: Record<string, string> = {
  HAS_SKILL: '#10b981',
  WORKED_ON: '#f59e0b',
  REPORTS_TO: '#6366f1',
  DEPENDS_ON: '#ef4444',
  BELONGS_TO: '#8b5cf6',
  default: '#475569',
};

function ForceGraph({ nodes, edges, onNodeClick }: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: (node: GraphNode) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const dragRef = useRef<{ node: GraphNode | null; offsetX: number; offsetY: number }>({ node: null, offsetX: 0, offsetY: 0 });
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const panRef = useRef<{ active: boolean; lastX: number; lastY: number }>({ active: false, lastX: 0, lastY: 0 });

  // Initialize node positions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;

    const initialized = new Map<string, GraphNode>();
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      const r = Math.min(W, H) * 0.35;
      initialized.set(n.id, {
        ...n,
        x: W / 2 + r * Math.cos(angle) + (Math.random() - 0.5) * 80,
        y: H / 2 + r * Math.sin(angle) + (Math.random() - 0.5) * 80,
        vx: 0, vy: 0
      });
    });
    nodesRef.current = [...initialized.values()];
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Force simulation + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const simulate = () => {
      const ns = nodesRef.current;
      const es = edgesRef.current;
      const W = canvas.width;
      const H = canvas.height;

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = (ns[i].x! - ns[j].x!) || 0.01;
          const dy = (ns[i].y! - ns[j].y!) || 0.01;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const repulse = 2400 / (dist * dist);
          ns[i].vx! += (dx / dist) * repulse * 0.05;
          ns[i].vy! += (dy / dist) * repulse * 0.05;
          ns[j].vx! -= (dx / dist) * repulse * 0.05;
          ns[j].vy! -= (dy / dist) * repulse * 0.05;
        }
      }

      // Attraction along edges
      const nodeMap = new Map(ns.map(n => [n.id, n]));
      es.forEach(e => {
        const src = nodeMap.get(e.source);
        const tgt = nodeMap.get(e.target);
        if (!src || !tgt) return;
        const dx = (tgt.x! - src.x!);
        const dy = (tgt.y! - src.y!);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const idealLen = 120;
        const force = (dist - idealLen) * 0.04;
        src.vx! += (dx / dist) * force;
        src.vy! += (dy / dist) * force;
        tgt.vx! -= (dx / dist) * force;
        tgt.vy! -= (dy / dist) * force;
      });

      // Center gravity
      ns.forEach(n => {
        n.vx! += ((W / 2 - n.x!) * 0.002);
        n.vy! += ((H / 2 - n.y!) * 0.002);
        // Damping
        n.vx! *= 0.85;
        n.vy! *= 0.85;
        n.x! += n.vx!;
        n.y! += n.vy!;
      });
    };

    const draw = () => {
      const ns = nodesRef.current;
      const es = edgesRef.current;
      const t = transformRef.current;
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      // Draw edges
      const nodeMap = new Map(ns.map(n => [n.id, n]));
      es.forEach(e => {
        const src = nodeMap.get(e.source);
        const tgt = nodeMap.get(e.target);
        if (!src || !tgt) return;
        ctx.beginPath();
        ctx.moveTo(src.x!, src.y!);
        ctx.lineTo(tgt.x!, tgt.y!);
        ctx.strokeStyle = EDGE_COLORS[e.label] || EDGE_COLORS.default;
        ctx.lineWidth = Math.max(0.5, (e.weight || 1) * 0.3);
        ctx.globalAlpha = 0.35;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // Draw nodes
      ns.forEach(n => {
        const r = n.size || 6;
        ctx.beginPath();
        ctx.arc(n.x!, n.y!, r, 0, Math.PI * 2);
        ctx.fillStyle = n.color || NODE_COLORS[n.type] || '#64748b';
        ctx.shadowColor = n.color || NODE_COLORS[n.type] || '#64748b';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        if (r > 4) {
          ctx.fillStyle = '#e2e8f0';
          ctx.font = `${Math.max(8, Math.min(11, r * 1.1))}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label, n.x!, n.y! + r + 12);
        }
      });

      ctx.restore();
      simulate();
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes.length, edges.length]);

  // Mouse events for drag + pan + click
  const getNodeAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const t = transformRef.current;
    const mx = (clientX - rect.left - t.x) / t.scale;
    const my = (clientY - rect.top - t.y) / t.scale;
    return nodesRef.current.find(n => {
      const dx = n.x! - mx;
      const dy = n.y! - my;
      return Math.sqrt(dx * dx + dy * dy) <= (n.size || 6) + 3;
    }) || null;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const node = getNodeAt(e.clientX, e.clientY);
    if (node) {
      dragRef.current = { node, offsetX: e.clientX - node.x!, offsetY: e.clientY - node.y! };
    } else {
      panRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (dragRef.current.node) {
      const t = transformRef.current;
      dragRef.current.node.x = (e.clientX - dragRef.current.offsetX);
      dragRef.current.node.y = (e.clientY - dragRef.current.offsetY);
      dragRef.current.node.vx = 0;
      dragRef.current.node.vy = 0;
    } else if (panRef.current.active) {
      transformRef.current.x += e.clientX - panRef.current.lastX;
      transformRef.current.y += e.clientY - panRef.current.lastY;
      panRef.current.lastX = e.clientX;
      panRef.current.lastY = e.clientY;
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (dragRef.current.node) {
      const movedDist = Math.hypot(e.movementX, e.movementY);
      if (movedDist < 3) onNodeClick(dragRef.current.node);
    }
    dragRef.current = { node: null, offsetX: 0, offsetY: 0 };
    panRef.current.active = false;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    transformRef.current.scale = Math.max(0.3, Math.min(3, transformRef.current.scale * factor));
  };

  return (
    <canvas
      ref={canvasRef}
      width={1200}
      height={700}
      className="w-full h-full cursor-grab active:cursor-grabbing rounded-2xl"
      style={{ background: 'transparent' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
    />
  );
}

// ── Main TalentNetwork Page ────────────────────────────────────────────────────

export const TalentNetwork: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'network' | 'spof' | 'path'>('network');
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[]; isLive: boolean } | null>(null);
  const [spofData, setSpofData] = useState<{ spofs: SpofResult[]; isLive: boolean } | null>(null);
  const [pathResult, setPathResult] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [deptFilter, setDeptFilter] = useState('');
  const [minProf, setMinProf] = useState(1);
  const [skillSearch, setSkillSearch] = useState('');
  const [spofThreshold, setSpofThreshold] = useState(4);
  const [pathSkill, setPathSkill] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  // Fetch graph data
  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTalentNetworkGraph({
        department: deptFilter || undefined,
        minProficiency: minProf
      });
      setGraphData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [deptFilter, minProf]);

  // Fetch SPOF data
  const fetchSPOFs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getGraphSPOFs(spofThreshold);
      setSpofData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [spofThreshold]);

  const fetchPath = async () => {
    if (!pathSkill.trim()) return;
    setLoading(true);
    try {
      const data = await api.getPathToCoverage(pathSkill.trim());
      setPathResult(data.paths);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'network') fetchGraph();
    else if (activeTab === 'spof') fetchSPOFs();
  }, [activeTab, fetchGraph, fetchSPOFs]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.triggerGraphSync();
      setSyncMsg(res.message);
      setTimeout(() => setSyncMsg(''), 4000);
      if (activeTab === 'network') fetchGraph();
    } catch {
      setSyncMsg('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const riskColor: Record<string, string> = {
    Critical: 'text-red-400 bg-red-500/10 border-red-500/30',
    High: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    Medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  };

  // Legend data
  const legendItems = [
    { color: '#3b82f6', label: 'Employee' },
    { color: '#10b981', label: 'Skill' },
    { color: '#f59e0b', label: 'Project' },
    { color: '#8b5cf6', label: 'Department' },
  ];

  const edgeLegend = [
    { color: '#10b981', label: 'HAS_SKILL' },
    { color: '#f59e0b', label: 'WORKED_ON' },
    { color: '#6366f1', label: 'REPORTS_TO' },
    { color: '#ef4444', label: 'DEPENDS_ON' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-outfit font-extrabold text-2xl text-white flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
              <Network className="w-6 h-6 text-indigo-400" />
            </div>
            Workforce Knowledge Graph
          </h2>
          <p className="text-slate-400 text-sm mt-1 ml-14">
            Neo4j-powered talent intelligence — skill clusters, SPOFs, and upskill paths
          </p>
        </div>
        <div className="flex items-center gap-3">
          {syncMsg && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              {syncMsg}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync Graph
          </button>
        </div>
      </div>

      {/* Tab Pills */}
      <div className="flex items-center gap-2 p-1 bg-slate-900/50 border border-slate-800 rounded-2xl w-fit">
        {[
          { id: 'network', label: 'Talent Network', icon: Network },
          { id: 'spof', label: 'SPOF Detection', icon: AlertTriangle },
          { id: 'path', label: 'Path to Coverage', icon: GitBranch },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Talent Network ──────────────────────────────────────────── */}
        {activeTab === 'network' && (
          <motion.div key="network" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Filters */}
            <GlassCard className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                <Filter className="w-3.5 h-3.5" /> Filters
              </div>
              <input
                type="text"
                placeholder="Filter by department..."
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchGraph()}
                className="bg-slate-950/80 border border-slate-800 rounded-lg text-xs py-1.5 px-3 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 w-44"
              />
              <div className="flex items-center gap-2 text-xs text-slate-400">
                Min Proficiency:
                <select
                  value={minProf}
                  onChange={e => setMinProf(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg text-xs py-1.5 px-2 text-slate-200"
                >
                  {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <button onClick={fetchGraph} className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold hover:bg-indigo-600/30 transition-all">
                Apply
              </button>
              <div className="ml-auto flex items-center gap-1.5">
                {legendItems.map(l => (
                  <span key={l.label} className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
                <span className="mx-1 text-slate-700">|</span>
                {edgeLegend.map(l => (
                  <span key={l.label} className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span className="w-3 h-0.5 inline-block" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Canvas */}
              <GlassCard className="lg:col-span-3 relative" style={{ minHeight: '520px' }}>
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  </div>
                ) : graphData ? (
                  <>
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${graphData.isLive ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-amber-400 bg-amber-500/10 border-amber-500/30'}`}>
                        {graphData.isLive ? '● Neo4j Live' : '◌ In-Memory'}
                      </span>
                      <span className="text-[9px] text-slate-500">{graphData.nodes.length} nodes · {graphData.edges.length} edges</span>
                    </div>
                    <ForceGraph
                      nodes={graphData.nodes}
                      edges={graphData.edges}
                      onNodeClick={setSelectedNode}
                    />
                    <p className="absolute bottom-3 left-3 text-[10px] text-slate-600">Drag nodes · Scroll to zoom · Click for details</p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-80 text-slate-500">
                    <ZapOff className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm">No graph data loaded</p>
                  </div>
                )}
              </GlassCard>

              {/* Node detail panel */}
              <div className="space-y-4">
                <GlassCard>
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Selected Node</h5>
                  {selectedNode ? (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: selectedNode.color || NODE_COLORS[selectedNode.type] }} />
                        <span className="text-sm font-bold text-slate-200">{selectedNode.label}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Type</span>
                          <span className="text-slate-300 capitalize font-bold">{selectedNode.type}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Group</span>
                          <span className="text-slate-300">{selectedNode.group}</span>
                        </div>
                        {selectedNode.data && Object.entries(selectedNode.data).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-xs">
                            <span className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="text-slate-300 font-medium">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setSelectedNode(null)} className="mt-3 text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                        <X className="w-3 h-3" /> Clear
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">Click any node to inspect it</p>
                  )}
                </GlassCard>

                <GlassCard>
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Graph Stats</h5>
                  {graphData && (
                    <div className="space-y-2.5">
                      {[
                        { icon: Users, label: 'Employees', count: graphData.nodes.filter(n => n.type === 'employee').length, color: 'text-blue-400' },
                        { icon: Activity, label: 'Skills', count: graphData.nodes.filter(n => n.type === 'skill').length, color: 'text-emerald-400' },
                        { icon: Briefcase, label: 'Projects', count: graphData.nodes.filter(n => n.type === 'project').length, color: 'text-amber-400' },
                        { icon: Database, label: 'Departments', count: graphData.nodes.filter(n => n.type === 'department').length, color: 'text-violet-400' },
                      ].map(({ icon: Icon, label, count, color }) => (
                        <div key={label} className="flex items-center justify-between text-xs">
                          <span className={`flex items-center gap-1.5 ${color}`}><Icon className="w-3 h-3" />{label}</span>
                          <span className="font-bold text-slate-200">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── SPOF Detection ──────────────────────────────────────────── */}
        {activeTab === 'spof' && (
          <motion.div key="spof" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <GlassCard className="flex items-center gap-4">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs text-slate-400 flex-1">
                Skills where only 1–2 employees have proficiency ≥ threshold, ranked by active project dependencies.
                {spofData?.isLive ? <span className="text-emerald-400 font-bold ml-2">● Powered by Neo4j Cypher</span> : <span className="text-amber-400 font-bold ml-2">◌ In-Memory Fallback</span>}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                Proficiency ≥
                <select
                  value={spofThreshold}
                  onChange={e => setSpofThreshold(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg text-xs py-1.5 px-2 text-slate-200"
                >
                  {[3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <button onClick={fetchSPOFs} className="px-3 py-1.5 bg-amber-600/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold hover:bg-amber-600/30 transition-all">
                  Analyze
                </button>
              </div>
            </GlassCard>

            {loading ? (
              <GlassCard className="h-64 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              </GlassCard>
            ) : spofData && spofData.spofs.length > 0 ? (
              <GlassCard className="overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Skill</th>
                      <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Risk</th>
                      <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Experts</th>
                      <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Dependent Projects</th>
                      <th className="text-center py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Dep. Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {spofData.spofs.map((spof, i) => (
                      <tr key={i} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-200">{spof.skill}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskColor[spof.riskLevel]}`}>
                            {spof.riskLevel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{(spof.experts || []).join(', ') || '—'}</td>
                        <td className="py-3 px-4 text-slate-400">{(spof.dependentProjects || []).join(', ') || 'None'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-black text-lg ${spof.dependencyCount >= 2 ? 'text-red-400' : 'text-amber-400'}`}>
                            {spof.dependencyCount}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassCard>
            ) : (
              <GlassCard className="h-48 flex flex-col items-center justify-center text-slate-500 gap-3">
                <AlertTriangle className="w-8 h-8 opacity-40" />
                <p className="text-sm">No SPOFs detected at this proficiency threshold. 🎉</p>
              </GlassCard>
            )}
          </motion.div>
        )}

        {/* ── Path to Coverage ──────────────────────────────────────────── */}
        {activeTab === 'path' && (
          <motion.div key="path" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <GlassCard className="flex items-center gap-4">
              <GitBranch className="w-4 h-4 text-indigo-400 shrink-0" />
              <p className="text-xs text-slate-400 flex-1">
                Enter a skill gap — find the shortest internal path (via shared projects or managers) to the best candidate for upskilling.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2" />
                  <input
                    type="text"
                    placeholder="e.g. Kubernetes"
                    value={pathSkill}
                    onChange={e => setPathSkill(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchPath()}
                    className="bg-slate-950/80 border border-slate-800 rounded-lg text-xs py-1.5 pl-8 pr-3 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 w-40"
                  />
                </div>
                <button
                  onClick={fetchPath}
                  disabled={loading || !pathSkill.trim()}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 transition-all disabled:opacity-50"
                >
                  {loading ? '...' : 'Find Path'}
                </button>
              </div>
            </GlassCard>

            {pathResult && (
              <div className="space-y-4">
                {pathResult.length === 0 ? (
                  <GlassCard className="h-40 flex items-center justify-center text-slate-500 text-sm">
                    No internal path found. External hire recommended.
                  </GlassCard>
                ) : pathResult.map((path, i) => (
                  <GlassCard key={i} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Path {i + 1}</h4>
                      {path.candidate && (
                        <span className="text-xs text-emerald-400 font-bold">→ {path.candidate.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(path.steps || []).map((step: any, si: number) => (
                        <React.Fragment key={si}>
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                            step.type === 'employee' ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' :
                            step.type === 'skill' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                            'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          }`}>
                            <span className="text-[9px] uppercase opacity-60">{step.type}</span>
                            <span>{step.name}</span>
                          </div>
                          {si < path.steps.length - 1 && (
                            <div className="flex flex-col items-center">
                              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                              <span className="text-[8px] text-slate-600 -mt-0.5">{path.steps[si + 1]?.relationship}</span>
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 italic border-t border-slate-800 pt-2">{path.explanation}</p>
                  </GlassCard>
                ))}
              </div>
            )}

            {!pathResult && (
              <GlassCard className="h-48 flex flex-col items-center justify-center text-slate-600 gap-2">
                <GitBranch className="w-10 h-10 opacity-30" />
                <p className="text-sm">Enter a skill name above to find upskill paths</p>
              </GlassCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
