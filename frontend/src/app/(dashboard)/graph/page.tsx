'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { tracingAPI, analyticsAPI } from '@/lib/api';
import { truncateAddress, truncateHash, formatCurrency, cn } from '@/lib/utils';
import type { TraceDetail, TraceHop, GraphData, GraphNode, GraphEdge, AIAssessment } from '@/types';
import {
  Network, ZoomIn, ZoomOut, Maximize, Download, RotateCcw,
  ArrowRight, Shield, Globe, AlertTriangle, Wallet, ExternalLink,
  Copy, Check, Layers, GitBranch, ArrowDownRight, Search, Activity, Sparkles, User, Users,
  BrainCircuit, AlertOctagon, Scale, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, FileText, Info
} from 'lucide-react';

// Dynamic import for Cytoscape (not SSR compatible)
let cytoscape: any;

function GraphContent() {
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const [traces, setTraces] = useState<TraceDetail[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState('');
  const [traceDetail, setTraceDetail] = useState<TraceDetail | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAssessment | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showAiBanner, setShowAiBanner] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'graph'>('tree');
  const [layout, setLayout] = useState('breadthfirst');
  const [loading, setLoading] = useState(true);
  const [copiedText, setCopiedText] = useState('');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const getExplorerUrl = (id: string, type: 'address' | 'tx', chain: string = 'ethereum') => {
    if (chain.toLowerCase() === 'sepolia') {
      return type === 'tx' ? `https://sepolia.etherscan.io/tx/${id}` : `https://sepolia.etherscan.io/address/${id}`;
    }
    if (chain.toLowerCase() === 'bitcoin') {
      return type === 'tx' ? `https://mempool.space/tx/${id}` : `https://mempool.space/address/${id}`;
    }
    return type === 'tx' ? `https://etherscan.io/tx/${id}` : `https://etherscan.io/address/${id}`;
  };

  const loadTrace = useCallback(async (traceId: string) => {
    setSelectedTraceId(traceId);
    setSelectedNode(null);
    setSelectedEdge(null);
    try {
      const traceRes = await tracingAPI.get(traceId);
      setTraceDetail(traceRes.data);
      setGraphData(traceRes.data.graph_data);
      
      if (traceRes.data.graph_data?.ai_analysis) {
        setAiAnalysis(traceRes.data.graph_data.ai_analysis);
      } else {
        try {
          const aiRes = await analyticsAPI.getTraceAIInvestigation(traceId);
          setAiAnalysis(aiRes.data);
        } catch (e) {
          console.error('AI analysis error:', e);
        }
      }
    } catch (err) {
      console.error('Load trace error:', err);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await tracingAPI.list();
        const completed = res.data.filter((t: TraceDetail) => t.status === 'completed' && t.graph_data?.nodes?.length > 0);
        setTraces(completed);

        const traceIdParam = searchParams.get('trace_id');
        if (traceIdParam) {
          loadTrace(traceIdParam);
        } else if (completed.length > 0) {
          loadTrace(completed[0].id);
        }
      } catch (err) {
        console.error('Load graph list error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [searchParams, loadTrace]);

  // Handle ESC key to dismiss AI Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAiModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize Cytoscape with rich rectangular card nodes and hierarchical tree layout
  useEffect(() => {
    if (viewMode !== 'graph' || !graphData || !containerRef.current) return;

    import('cytoscape').then((mod) => {
      cytoscape = mod.default;
      if (cyRef.current) {
        cyRef.current.destroy();
      }

      const nodeBgMap: Record<string, string> = {
        vasp: '#581c87',
        victim: '#1e3a8a',
        suspect: '#7f1d1d',
        contract: '#78350f',
        consolidation: '#0e7490',
        mule: '#78350f',
        address: '#064e3b',
      };

      const nodeBorderMap: Record<string, string> = {
        vasp: '#c084fc',
        victim: '#60a5fa',
        suspect: '#f87171',
        contract: '#fbbf24',
        consolidation: '#22d3ee',
        mule: '#fbbf24',
        address: '#00ff66',
      };

      const cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...graphData.nodes.map((n, idx) => {
            const isStart = n.id.toLowerCase() === traceDetail?.start_address?.toLowerCase() || idx === 0 || n.type === 'victim';
            const idLower = n.id.toLowerCase();
            let roleCategory = n.type || 'address';
            let roleTitle = n.entity || 'ADDRESS';

            if (isStart || idLower.includes('victim') || idLower.includes('v1ct1m')) {
              roleCategory = 'victim';
              roleTitle = 'VICTIM (HOP 0)';
            } else if (idLower.includes('suspect') || idLower.includes('5u5pect')) {
              roleCategory = 'suspect';
              roleTitle = 'SUSPECT (A)';
            } else if (idLower.includes('branch2') || idLower.includes('mule_c')) {
              roleCategory = 'mule';
              roleTitle = 'MULE (C)';
            } else if (idLower.includes('branch1') || idLower.includes('mule_b')) {
              roleCategory = 'mule';
              roleTitle = 'MULE (B)';
            } else if (idLower.includes('consolidation') || idLower.includes('0xconsol')) {
              roleCategory = 'consolidation';
              roleTitle = 'CONSOLIDATOR (D)';
            } else if (n.type === 'vasp' || n.entity || idLower.includes('binance') || idLower.includes('28c6c0')) {
              roleCategory = 'vasp';
              roleTitle = n.entity ? `${n.entity.toUpperCase()} (VASP)` : 'VASP CASHOUT';
            }

            const shortAddr = truncateAddress(n.id, 5);

            return {
              data: {
                id: n.id,
                label: `${roleTitle}\n${shortAddr}`,
                type: roleCategory,
                rawType: n.type,
                hop: n.hop ?? idx,
                entity: n.entity || '',
                entity_type: n.entity_type || '',
                confidence: n.confidence,
                bgColor: nodeBgMap[roleCategory] || '#064e3b',
                borderColor: nodeBorderMap[roleCategory] || '#00ff66',
              },
            };
          }),
          ...graphData.edges.map((e, i) => ({
            data: {
              id: `edge-${i}`,
              source: e.source,
              target: e.target,
              tx_hash: e.tx_hash,
              amount: e.amount,
              asset: e.asset,
              label: `${e.amount ? e.amount.toFixed(4) : '?'} ${e.asset || 'ETH'}`,
            },
          })),
        ],
        style: [
          {
            selector: 'node',
            style: {
              'shape': 'round-rectangle',
              'width': 150,
              'height': 50,
              'background-color': 'data(bgColor)',
              'background-opacity': 0.85,
              'border-width': 2,
              'border-color': 'data(borderColor)',
              'border-opacity': 0.9,
              'label': 'data(label)',
              'color': '#ffffff',
              'font-size': '11px',
              'font-family': 'JetBrains Mono, monospace',
              'font-weight': 'bold',
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'wrap',
              'text-max-width': '140px',
              'line-height': 1.3,
              'text-outline-color': '#020b06',
              'text-outline-width': 2,
              'shadow-blur': 12,
              'shadow-color': 'data(borderColor)',
              'shadow-opacity': 0.35,
            } as cytoscape.Css.Node,
          },
          {
            selector: 'node:selected',
            style: {
              'border-color': '#00ff66',
              'border-width': 4,
              'shadow-blur': 25,
              'shadow-color': '#00ff66',
              'shadow-opacity': 0.8,
            } as cytoscape.Css.Node,
          },
          {
            selector: 'edge',
            style: {
              'width': 3,
              'line-color': '#10b981',
              'line-opacity': 0.7,
              'target-arrow-color': '#00ff66',
              'target-arrow-shape': 'triangle',
              'arrow-scale': 1.3,
              'curve-style': 'bezier',
              'label': 'data(label)',
              'font-size': '10px',
              'font-family': 'JetBrains Mono, monospace',
              'font-weight': 'bold',
              'color': '#a7f3d0',
              'text-rotation': 'autorotate',
              'text-background-color': '#020b06',
              'text-background-opacity': 0.9,
              'text-background-padding': '3px',
              'text-background-shape': 'roundrectangle',
              'text-border-color': '#0d331d',
              'text-border-width': 1,
              'text-border-opacity': 0.8,
            } as cytoscape.Css.Edge,
          },
          {
            selector: 'edge:selected',
            style: {
              'line-color': '#00ff66',
              'width': 4,
              'line-opacity': 1,
            } as cytoscape.Css.Edge,
          },
        ],
        layout: {
          name: layout,
          directed: true,
          padding: 40,
          spacingFactor: 1.4,
          animate: true,
          animationDuration: 600,
        } as cytoscape.LayoutOptions,
        minZoom: 0.2,
        maxZoom: 3,
      });

      cy.on('tap', 'node', (e: any) => {
        const data = e.target.data();
        const found = graphData.nodes.find((n) => n.id === data.id);
        setSelectedNode(found || {
          id: data.id,
          type: data.rawType || data.type,
          chain: traceDetail?.chain || 'ethereum',
          label: data.label,
          entity: data.entity,
          entity_type: data.entity_type,
          hop: data.hop,
        });
        setSelectedEdge(null);
      });

      cy.on('tap', 'edge', (e: any) => {
        const data = e.target.data();
        setSelectedEdge({
          source: data.source,
          target: data.target,
          tx_hash: data.tx_hash,
          amount: data.amount,
          asset: data.asset,
          timestamp: '',
        });
        setSelectedNode(null);
      });

      cy.on('tap', (e: any) => {
        if (e.target === cy) {
          setSelectedNode(null);
          setSelectedEdge(null);
        }
      });

      cyRef.current = cy;
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [graphData, layout, viewMode, traceDetail]);

  const zoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.3);
  const zoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() / 1.3);
  const fit = () => cyRef.current?.fit(undefined, 40);
  const resetLayout = () => {
    if (!cyRef.current) return;
    cyRef.current.layout({
      name: layout,
      directed: true,
      padding: 40,
      spacingFactor: 1.4,
      animate: true,
      animationDuration: 600,
    } as cytoscape.LayoutOptions).run();
  };

  const exportPng = () => {
    if (!cyRef.current) return;
    const png64 = cyRef.current.png({ full: true, quality: 1, bg: '#020b06' });
    const link = document.createElement('a');
    link.download = `CryptoTrace-Graph-${selectedTraceId.substring(0, 8)}.png`;
    link.href = png64;
    link.click();
  };

  // Build Hierarchical DAG Layers (Victim -> A -> [B, C] -> D -> VASP)
  const getDagLayers = () => {
    if (!graphData || !graphData.nodes.length) return [];

    const nodes = graphData.nodes || [];
    const edges = graphData.edges || [];

    // Map in-degrees and adjacency
    const inDegree: Record<string, number> = {};
    const outEdgesMap: Record<string, GraphEdge[]> = {};
    const inEdgesMap: Record<string, GraphEdge[]> = {};

    nodes.forEach((n) => {
      inDegree[n.id.toLowerCase()] = 0;
      outEdgesMap[n.id.toLowerCase()] = [];
      inEdgesMap[n.id.toLowerCase()] = [];
    });

    edges.forEach((e) => {
      const src = e.source.toLowerCase();
      const tgt = e.target.toLowerCase();
      if (inDegree[tgt] !== undefined) {
        inDegree[tgt] = (inDegree[tgt] || 0) + 1;
      }
      if (outEdgesMap[src]) outEdgesMap[src].push(e);
      if (inEdgesMap[tgt]) inEdgesMap[tgt].push(e);
    });

    // Find root nodes (Victim / start_address / inDegree === 0)
    const roots: string[] = [];
    if (traceDetail?.start_address) {
      const match = nodes.find((n) => n.id.toLowerCase() === traceDetail.start_address.toLowerCase());
      if (match) roots.push(match.id.toLowerCase());
    }

    nodes.forEach((n) => {
      const id = n.id.toLowerCase();
      if (!roots.includes(id) && (inDegree[id] === 0 || n.type === 'victim')) {
        roots.push(id);
      }
    });

    if (roots.length === 0 && nodes.length > 0) {
      roots.push(nodes[0].id.toLowerCase());
    }

    // Assign topological depth level via BFS / longest path
    const nodeLevel: Record<string, number> = {};
    roots.forEach((r) => { nodeLevel[r] = 0; });

    const queue = [...roots];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const currLvl = nodeLevel[curr] ?? 0;
      const outs = outEdgesMap[curr] || [];
      for (const edge of outs) {
        const tgt = edge.target.toLowerCase();
        const nextLvl = currLvl + 1;
        if (nodeLevel[tgt] === undefined || nodeLevel[tgt] < nextLvl) {
          nodeLevel[tgt] = nextLvl;
          queue.push(tgt);
        }
      }
    }

    // Fallback for unvisited nodes based on node.hop
    nodes.forEach((n) => {
      const id = n.id.toLowerCase();
      if (nodeLevel[id] === undefined) {
        nodeLevel[id] = n.hop !== undefined ? n.hop : 1;
      }
    });

    // Group nodes by level
    const maxLevel = Math.max(0, ...Object.values(nodeLevel));
    const layers: Array<{
      level: number;
      label: string;
      nodes: GraphNode[];
      edgesToNext: GraphEdge[];
    }> = [];

    for (let l = 0; l <= maxLevel; l++) {
      const layerNodes = nodes.filter((n) => (nodeLevel[n.id.toLowerCase()] ?? 0) === l);
      if (layerNodes.length > 0) {
        // Collect edges going from this layer to next layer(s)
        const layerNodeIds = new Set(layerNodes.map((n) => n.id.toLowerCase()));
        const layerOutEdges = edges.filter((e) => layerNodeIds.has(e.source.toLowerCase()));

        let layerLabel = `HOP ${l}`;
        if (l === 0) layerLabel = 'VICTIM SOURCE';
        else if (l === maxLevel && layerNodes.some((n) => n.type === 'vasp' || n.entity)) layerLabel = 'VASP CASHOUT ENDPOINT';
        else if (layerNodes.length > 1) layerLabel = 'LAYERING & MONEY MULES';
        else if (l === 1) layerLabel = 'PRIMARY SUSPECT (A)';
        else if (l === maxLevel - 1 && maxLevel >= 3) layerLabel = 'CONSOLIDATION (D)';

        layers.push({
          level: l,
          label: layerLabel,
          nodes: layerNodes,
          edgesToNext: layerOutEdges,
        });
      }
    }

    return layers;
  };

  const getNodeRoleInfo = (node: GraphNode, levelIdx: number, totalLevels: number, isFirst: boolean, isLast: boolean) => {
    const idLower = node.id.toLowerCase();
    const typeLower = (node.type || '').toLowerCase();

    if (typeLower === 'victim' || isFirst || idLower.includes('victim') || idLower.includes('v1ct1m')) {
      return {
        tag: 'VICTIM WALLET',
        subtag: 'Source of Defrauded Funds',
        style: 'border-blue-500/60 bg-blue-950/40 text-blue-300',
        badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        icon: User,
        alias: 'Victim (Start)',
      };
    }
    if (typeLower === 'vasp' || node.entity || isLast || idLower.includes('binance') || idLower.includes('28c6c0')) {
      return {
        tag: node.entity ? `${node.entity.toUpperCase()} (VASP)` : 'VASP / EXCHANGE CASHOUT',
        subtag: 'Centralized Custodial Off-Ramp',
        style: 'border-purple-500/60 bg-purple-950/40 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.2)]',
        badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        icon: Globe,
        alias: 'VASP Endpoint',
      };
    }
    if (idLower.includes('suspect') || idLower.includes('5u5pect') || (levelIdx === 1 && totalLevels > 2)) {
      return {
        tag: 'PRIMARY SUSPECT (A)',
        subtag: 'First Scammer Deposit Nexus',
        style: 'border-red-500/60 bg-red-950/40 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.2)]',
        badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
        icon: AlertOctagon,
        alias: 'Suspect Nexus A',
      };
    }
    if (idLower.includes('consolidation') || idLower.includes('0xconsol') || (levelIdx === totalLevels - 2 && totalLevels >= 4)) {
      return {
        tag: 'CONSOLIDATION HUB (D)',
        subtag: 'Fund Merging & Aggregation',
        style: 'border-cyan-500/60 bg-cyan-950/40 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)]',
        badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        icon: Layers,
        alias: 'Consolidator D',
      };
    }
    if (idLower.includes('branch2') || idLower.includes('mule_c')) {
      return {
        tag: 'MONEY MULE (C)',
        subtag: 'Branch 2 Split Wallet',
        style: 'border-amber-500/60 bg-amber-950/40 text-amber-300',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: GitBranch,
        alias: 'Mule Branch C',
      };
    }
    if (idLower.includes('branch1') || idLower.includes('mule_b')) {
      return {
        tag: 'MONEY MULE (B)',
        subtag: 'Branch 1 Split Wallet',
        style: 'border-amber-500/60 bg-amber-950/40 text-amber-300',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: GitBranch,
        alias: 'Mule Branch B',
      };
    }

    return {
      tag: `HOP ${levelIdx} INTERMEDIARY`,
      subtag: 'Layering Wallet',
      style: 'border-emerald-500/40 bg-[#041d0e]/80 text-emerald-200',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: Network,
      alias: `Node ${node.id.substring(0, 6)}`,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-[#00ff66] rounded-full animate-spin shadow-[0_0_20px_rgba(0,255,102,0.3)]" />
      </div>
    );
  }

  const dagLayers = getDagLayers();

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 glass-card p-3 sm:p-4 border border-[#0d331d]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#00ff66]/10 border border-[#00ff66]/30 text-[#00ff66] shrink-0">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white flex flex-wrap items-center gap-2">
                <span>Fund Flow & Transaction Graph</span>
                <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded bg-[#00ff66]/15 text-[#00ff66] border border-[#00ff66]/30">
                  DAG TREE HIERARCHY
                </span>
              </h1>
              <p className="text-xs text-emerald-400/80 font-mono mt-0.5">
                Visual step-by-step blockchain fund tracking & VASP attribution
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher & Trace Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex bg-[#020f07] p-1 rounded-xl border border-[#0d331d] w-full sm:w-auto">
            <button
              onClick={() => setViewMode('tree')}
              className={cn(
                'flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all font-mono',
                viewMode === 'tree'
                  ? 'bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40 shadow-[0_0_12px_rgba(0,255,102,0.2)]'
                  : 'text-emerald-400/70 hover:text-white'
              )}
            >
              <GitBranch className="w-3.5 h-3.5 shrink-0" />
              <span>DAG Flow Tree</span>
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={cn(
                'flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all font-mono',
                viewMode === 'graph'
                  ? 'bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40 shadow-[0_0_12px_rgba(0,255,102,0.2)]'
                  : 'text-emerald-400/70 hover:text-white'
              )}
            >
              <Network className="w-3.5 h-3.5 shrink-0" />
              <span>2D Network Map</span>
            </button>
          </div>

          {/* Trace Selector Dropdown */}
          <select
            value={selectedTraceId}
            onChange={(e) => loadTrace(e.target.value)}
            className="input-field w-full sm:w-auto text-xs font-mono py-1.5 bg-[#03180c] border-[#0d331d]"
          >
            <option value="">Select an active trace...</option>
            {traces.map((t) => (
              <option key={t.id} value={t.id}>
                {t.chain.toUpperCase()} | {truncateAddress(t.start_tx_hash || t.start_address, 8)} ({t.hops_completed || t.graph_data?.nodes?.length || 0} nodes)
              </option>
            ))}
          </select>

          {/* AI Forensic Report Button */}
          <button
            onClick={() => setShowAiModal(true)}
            className="btn-primary text-xs py-1.5 px-3 flex items-center justify-center gap-1.5 font-mono shadow-[0_0_15px_rgba(0,255,102,0.3)] w-full sm:w-auto"
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>AI Forensic Report</span>
          </button>
        </div>
      </div>

      {/* Sepolia Testnet vs Mainnet Advisory Banner */}
      {traceDetail && (
        <div className={cn(
          "p-3 sm:p-4 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono text-xs shadow-lg",
          traceDetail.chain.toLowerCase() === 'sepolia' || aiAnalysis?.is_sepolia
            ? "bg-amber-950/40 border-amber-500/50 text-amber-200"
            : "bg-[#042412]/80 border-[#00ff66]/40 text-emerald-200"
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg shrink-0 mt-0.5",
              traceDetail.chain.toLowerCase() === 'sepolia' || aiAnalysis?.is_sepolia
                ? "bg-amber-500/20 text-amber-400"
                : "bg-[#00ff66]/20 text-[#00ff66]"
            )}>
              {traceDetail.chain.toLowerCase() === 'sepolia' || aiAnalysis?.is_sepolia ? (
                <AlertOctagon className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-white">
                  {traceDetail.chain.toLowerCase() === 'sepolia' || aiAnalysis?.is_sepolia
                    ? "PROTOTYPE DEMONSTRATION MODE (Sepolia Testnet)"
                    : "LIVE BLOCKCHAIN ASSET FORENSICS (Mainnet Flow)"}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                  traceDetail.chain.toLowerCase() === 'sepolia' || aiAnalysis?.is_sepolia
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40"
                )}>
                  {traceDetail.chain.toLowerCase() === 'sepolia' || aiAnalysis?.is_sepolia ? "Safe Academic Simulation" : "Actual Loss / Evidence"}
                </span>
              </div>
              <p className="text-[11px] mt-1 text-slate-300 leading-relaxed">
                {traceDetail.chain.toLowerCase() === 'sepolia' || aiAnalysis?.is_sepolia
                  ? "Testnet coins carry zero real monetary loss ('Not a real issue / prototype only'). AI behavioral heuristics accurately model real-world syndicate scam & money mule mechanics to train police officers and demonstrate fraud detection."
                  : "Trace captures real cryptocurrency assets. Modus operandi indicators, cross-victim links, and VASP endpoints are prepared for legal notice submission (Section 91 CrPC / Subpoena)."}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAiModal(true)}
            className="self-end md:self-auto py-1.5 px-3 rounded-lg bg-black/40 hover:bg-black/60 border border-current/40 text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-[#00ff66]" />
            <span>Inspect AI Findings</span>
          </button>
        </div>
      )}

      {/* Quick Metrics Strip */}
      {traceDetail && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-2.5">
          <div className="p-3 rounded-xl bg-[#041d0e]/70 border border-[#0d331d] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00ff66]/10 text-[#00ff66] shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] text-emerald-400/80 font-mono uppercase">Total Traced</p>
              <p className="text-xs sm:text-sm font-bold text-white font-mono truncate">
                {traceDetail.total_value ? `${traceDetail.total_value.toFixed(4)} ${traceDetail.chain === 'bitcoin' ? 'BTC' : 'ETH'}` : '0.0000 ETH'}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#041d0e]/70 border border-[#0d331d] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
              <GitBranch className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] text-emerald-400/80 font-mono uppercase">Nodes & Hops</p>
              <p className="text-xs sm:text-sm font-bold text-white font-mono truncate">
                {graphData?.nodes?.length || 0} Wallets / {graphData?.edges?.length || 0} Hops
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#041d0e]/70 border border-[#0d331d] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] text-emerald-400/80 font-mono uppercase">VASP Exchange</p>
              <p className="text-xs sm:text-sm font-bold text-purple-300 font-mono truncate">
                {traceDetail.vasp_detected ? traceDetail.vasp_name : 'Direct Wallets'}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#041d0e]/70 border border-[#0d331d] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] text-emerald-400/80 font-mono uppercase">Fraud Verdict</p>
              <p className={cn(
                'text-xs sm:text-sm font-bold font-mono truncate',
                (aiAnalysis?.verdict?.confidence_score || traceDetail.risk_score) >= 70 ? 'text-red-400' : (aiAnalysis?.verdict?.confidence_score || traceDetail.risk_score) >= 40 ? 'text-amber-400' : 'text-[#00ff66]'
              )}>
                {aiAnalysis?.verdict?.is_scam ? `Scam Likely (${aiAnalysis.verdict.confidence_score}%)` : `Risk: ${traceDetail.risk_score}/100`}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#041d0e]/70 border border-[#0d331d] flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] text-emerald-400/80 font-mono uppercase">Blockchain</p>
              <p className="text-xs sm:text-sm font-bold text-white uppercase font-mono truncate">
                {traceDetail.chain} {traceDetail.chain.toLowerCase() === 'sepolia' ? 'Testnet' : 'Mainnet'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Behavioral Overview Ribbon */}
      {aiAnalysis && (
        <div className="glass-card p-3 sm:p-4 border border-[#0d331d] bg-[#021309]/90 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#0d331d] pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00ff66] shrink-0" />
              <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                AI Forensic Assessment: {aiAnalysis.verdict.fraud_type}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
              <span className="text-slate-400">Confidence: <span className="text-[#00ff66] font-bold">{aiAnalysis.verdict.confidence_percentage}</span></span>
              {aiAnalysis.victim_correlations?.total_matches > 0 && (
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] sm:text-[11px] font-bold">
                  {aiAnalysis.victim_correlations.total_matches} Victim Complaints Matched
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-300 font-mono leading-relaxed">
            {aiAnalysis.executive_summary}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
            {aiAnalysis.modus_operandi?.intents?.slice(0, 3).map((intent, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-[#041d0e]/70 border border-[#0d331d] font-mono text-xs">
                <p className="font-bold text-[#00ff66] text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-[#00ff66] shrink-0" />
                  <span>{intent.category}</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{intent.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area: Tree View OR 2D Network Graph */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-[500px] lg:h-[calc(100vh-270px)]">
        {/* Left Primary Display — CRT Terminal Frame */}
        <div className="flex-1 crt-terminal p-0 overflow-hidden relative border border-[#00ff66]/35 flex flex-col shadow-[0_0_40px_rgba(0,255,102,0.12)] rounded-2xl min-h-[480px]">
          {/* CRT Monitor Top Status Strip */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#011208]/95 border-b border-[#00ff66]/25 font-mono text-[10px] text-emerald-400 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse shrink-0" />
              <span className="text-[#00ff66] font-bold crt-phosphor-text">[CRT FORENSIC TERMINAL]</span>
              <span className="text-emerald-700 hidden sm:inline">|</span>
              <span className="hidden sm:inline">PROTOCOL: DAG_MONEY_MULE_TRACER</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-slate-400">
              <span className="hidden md:inline">SCAN FREQ: 60Hz</span>
              <span className="text-emerald-700 hidden md:inline">|</span>
              <span className="text-[#00ff66] font-bold">CRT HUD: ACTIVE</span>
            </div>
          </div>

          {graphData && graphData.nodes.length > 0 ? (
            <>
              {/* VIEW 1: USER-FRIENDLY BRANCHING DAG FLOW TREE */}
              {viewMode === 'tree' ? (
                <div className="p-3 sm:p-5 md:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4 sm:space-y-6 scrollbar-thin touch-pan-y">
                  {/* Visual Topology Header Guide */}
                  <div className="p-3 sm:p-4 rounded-xl bg-[#021309] border border-[#00ff66]/30 crt-hud-box flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 crt-phosphor-text">
                        <GitBranch className="w-4 h-4 text-[#00ff66] shrink-0" />
                        <span>Hierarchical Fund Flow Pipeline (DAG Topology)</span>
                      </h2>
                      <p className="text-[11px] sm:text-xs text-emerald-400/70 font-mono mt-0.5">
                        Structured Branching Model: Victim &rarr; Suspect (A) &rarr; Mules (B, C Split) &rarr; Consolidator (D Merge) &rarr; VASP
                      </p>
                    </div>

                    {/* Mini Flow Breadcrumbs */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">Victim</span>
                      <span className="text-emerald-500">&rarr;</span>
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">Suspect A</span>
                      <span className="text-emerald-500">&rarr;</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">Mules (B & C)</span>
                      <span className="text-emerald-500">&rarr;</span>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">Consolidator D</span>
                      <span className="text-emerald-500">&rarr;</span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">VASP</span>
                    </div>
                  </div>

                  {/* Layer-by-Layer Branching DAG Renderer */}
                  <div className="space-y-5 sm:space-y-6 max-w-4xl mx-auto py-1 sm:py-2">
                    {dagLayers.map((layer, lIdx) => {
                      const isFirstLayer = lIdx === 0;
                      const isLastLayer = lIdx === dagLayers.length - 1;
                      const nextLayer = dagLayers[lIdx + 1];

                      // Edges connecting this layer to next layer
                      const edgesToNext = layer.edgesToNext || [];
                      const isBranchingSplit = layer.nodes.length === 1 && nextLayer?.nodes.length > 1;
                      const isBranchingMerge = layer.nodes.length > 1 && nextLayer?.nodes.length === 1;

                      return (
                        <div key={layer.level} className="space-y-3 sm:space-y-4">
                          {/* Layer Label Tag */}
                          <div className="flex items-center justify-center gap-3">
                            <div className="h-px bg-[#0d331d] flex-1" />
                            <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-[#021309] border border-[#0d331d] text-emerald-400">
                              {layer.label}
                            </span>
                            <div className="h-px bg-[#0d331d] flex-1" />
                          </div>

                          {/* Nodes in this layer (Single Centered OR Multi-column Grid) */}
                          <div className={cn(
                            layer.nodes.length > 1
                              ? 'grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4'
                              : 'flex justify-center'
                          )}>
                            {layer.nodes.map((node) => {
                              const isSelected = selectedNode?.id === node.id;
                              const role = getNodeRoleInfo(node, lIdx, dagLayers.length, isFirstLayer, isLastLayer);
                              const IconComponent = role.icon;

                              return (
                                <div
                                  key={node.id}
                                  onClick={() => { setSelectedNode(node); setSelectedEdge(null); }}
                                  className={cn(
                                    'p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-lg hover:shadow-[0_0_25px_rgba(0,255,102,0.2)] relative',
                                    role.style,
                                    isSelected ? 'ring-2 ring-[#00ff66] shadow-[0_0_30px_rgba(0,255,102,0.4)] scale-[1.01]' : '',
                                    layer.nodes.length === 1 ? 'w-full max-w-2xl' : 'w-full'
                                  )}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
                                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#020b06] border border-current flex items-center justify-center font-bold text-xs font-mono shrink-0 mt-0.5 sm:mt-0">
                                        <IconComponent className="w-4 h-4" />
                                      </div>
                                      <div className="space-y-1 min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                          <span className={cn(
                                            'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded font-mono',
                                            role.badgeBg
                                          )}>
                                            {role.tag}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            {role.subtag}
                                          </span>
                                          {node.entity && (
                                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono flex items-center gap-1">
                                              <Globe className="w-3 h-3" />
                                              {node.entity}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs sm:text-sm font-bold text-white font-mono break-all flex items-center gap-2">
                                          <span>{node.id}</span>
                                        </p>
                                      </div>
                                    </div>

                                    {/* Quick Action Buttons */}
                                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto pt-1 sm:pt-0">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(node.id); }}
                                        className="p-1.5 rounded-lg bg-[#020b06]/80 hover:bg-[#072d16] border border-[#0d331d] text-emerald-300 transition-colors flex items-center gap-1 text-xs font-mono"
                                        title="Copy Address"
                                      >
                                        {copiedText === node.id ? <Check className="w-3.5 h-3.5 text-[#00ff66]" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span className="hidden sm:inline">Copy</span>
                                      </button>
                                      <a
                                        href={getExplorerUrl(node.id, 'address', traceDetail?.chain)}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 rounded-lg bg-[#020b06]/80 hover:bg-[#072d16] border border-[#0d331d] text-emerald-300 hover:text-[#00ff66] transition-colors flex items-center gap-1 text-xs font-mono"
                                        title="Open on Explorer"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Explorer</span>
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Connector to Next Layer (Linear, Branching Split ↙ ↘, or Converging Merge ↘ ↙) */}
                          {!isLastLayer && nextLayer && edgesToNext.length > 0 && (
                            <div className="py-1 sm:py-2">
                              {isBranchingSplit ? (
                                /* CASE 1: BRANCHING SPLIT (A ➔ B and A ➔ C) */
                                <div className="space-y-2">
                                  <div className="flex flex-col items-center">
                                    <div className="w-0.5 h-4 bg-gradient-to-b from-[#00ff66] to-[#059669]" />
                                    <div className="px-3 py-1 rounded-full bg-[#02140a] border border-[#00ff66]/40 text-[10px] font-mono font-bold text-[#00ff66] flex items-center gap-1 shadow-[0_0_15px_rgba(0,255,102,0.2)]">
                                      <GitBranch className="w-3 h-3" />
                                      <span>&swarr; &searr; FUND SPLITTING / FAN-OUT ({edgesToNext.length} Branches)</span>
                                    </div>
                                  </div>

                                  {/* Branching connecting pills */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                    {edgesToNext.map((edge, eIdx) => {
                                      const isLeft = eIdx === 0;
                                      const isEdgeSelected = selectedEdge?.tx_hash === edge.tx_hash;
                                      const targetNode = nextLayer.nodes.find((n) => n.id.toLowerCase() === edge.target.toLowerCase());
                                      const targetRole = targetNode ? getNodeRoleInfo(targetNode, lIdx + 1, dagLayers.length, false, false) : null;

                                      return (
                                        <div
                                          key={edge.tx_hash || eIdx}
                                          onClick={() => { setSelectedEdge(edge); setSelectedNode(null); }}
                                          className={cn(
                                            'p-2.5 rounded-xl bg-[#02140a] border transition-all cursor-pointer font-mono text-xs flex flex-col items-center justify-center gap-1 text-center',
                                            isEdgeSelected ? 'border-[#00ff66] shadow-[0_0_20px_rgba(0,255,102,0.3)] bg-[#042412]' : 'border-[#0d331d] hover:border-[#00ff66]/60'
                                          )}
                                        >
                                          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[#00ff66] font-bold">
                                            <span>{isLeft ? '↙' : '↘'}</span>
                                            <span>{edge.amount ? `${edge.amount.toFixed(4)} ${edge.asset || 'ETH'}` : 'Transfer'}</span>
                                            <span className="text-[10px] text-slate-400">➔ {targetRole?.tag || `Branch ${eIdx + 1}`}</span>
                                          </div>
                                          {edge.tx_hash && (
                                            <div className="flex items-center gap-1 text-[10px] text-emerald-400/70 hover:text-white">
                                              <span>Tx: {truncateHash(edge.tx_hash, 6)}</span>
                                              <a
                                                href={getExplorerUrl(edge.tx_hash, 'tx', traceDetail?.chain)}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="underline flex items-center gap-0.5"
                                              >
                                                <ExternalLink className="w-2.5 h-2.5" />
                                              </a>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : isBranchingMerge ? (
                                /* CASE 2: CONVERGING MERGE (B ➔ D and C ➔ D) */
                                <div className="space-y-2">
                                  {/* Converging connecting pills */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                    {edgesToNext.map((edge, eIdx) => {
                                      const isLeft = eIdx === 0;
                                      const isEdgeSelected = selectedEdge?.tx_hash === edge.tx_hash;
                                      const sourceNode = layer.nodes.find((n) => n.id.toLowerCase() === edge.source.toLowerCase());
                                      const sourceRole = sourceNode ? getNodeRoleInfo(sourceNode, lIdx, dagLayers.length, false, false) : null;

                                      return (
                                        <div
                                          key={edge.tx_hash || eIdx}
                                          onClick={() => { setSelectedEdge(edge); setSelectedNode(null); }}
                                          className={cn(
                                            'p-2.5 rounded-xl bg-[#02140a] border transition-all cursor-pointer font-mono text-xs flex flex-col items-center justify-center gap-1 text-center',
                                            isEdgeSelected ? 'border-[#00ff66] shadow-[0_0_20px_rgba(0,255,102,0.3)] bg-[#042412]' : 'border-[#0d331d] hover:border-[#00ff66]/60'
                                          )}
                                        >
                                          <div className="flex flex-wrap items-center justify-center gap-1.5 text-cyan-400 font-bold">
                                            <span>{isLeft ? '↘' : '↙'}</span>
                                            <span>{edge.amount ? `${edge.amount.toFixed(4)} ${edge.asset || 'ETH'}` : 'Transfer'}</span>
                                            <span className="text-[10px] text-slate-400">from {sourceRole?.tag || `Mule ${eIdx + 1}`}</span>
                                          </div>
                                          {edge.tx_hash && (
                                            <div className="flex items-center gap-1 text-[10px] text-emerald-400/70 hover:text-white">
                                              <span>Tx: {truncateHash(edge.tx_hash, 6)}</span>
                                              <a
                                                href={getExplorerUrl(edge.tx_hash, 'tx', traceDetail?.chain)}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="underline flex items-center gap-0.5"
                                              >
                                                <ExternalLink className="w-2.5 h-2.5" />
                                              </a>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className="flex flex-col items-center">
                                    <div className="px-3 py-1 rounded-full bg-[#02140a] border border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-1 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                                      <Layers className="w-3 h-3" />
                                      <span>&searr; &darr; &swarr; FUND CONSOLIDATION & AGGREGATION</span>
                                    </div>
                                    <div className="w-0.5 h-4 bg-gradient-to-b from-cyan-500 to-[#059669]" />
                                  </div>
                                </div>
                              ) : (
                                /* CASE 3: LINEAR DOWNWARD FLOW (Victim ➔ A or D ➔ VASP) */
                                <div className="flex flex-col items-center my-2 relative">
                                  <div className="w-0.5 h-5 bg-gradient-to-b from-[#00ff66] to-[#059669] animate-pulse" />
                                  {edgesToNext.map((edge, eIdx) => {
                                    const isEdgeSelected = selectedEdge?.tx_hash === edge.tx_hash;
                                    const isVaspExit = nextLayer?.nodes.some((n) => n.type === 'vasp' || n.entity);

                                    return (
                                      <div
                                        key={edge.tx_hash || eIdx}
                                        onClick={() => { setSelectedEdge(edge); setSelectedNode(null); }}
                                        className={cn(
                                          'my-1 px-3.5 py-1.5 rounded-xl bg-[#02140a] border transition-all cursor-pointer flex flex-wrap items-center justify-center gap-2 text-xs font-mono shadow-md text-center',
                                          isEdgeSelected
                                            ? 'border-[#00ff66] shadow-[0_0_20px_rgba(0,255,102,0.3)] bg-[#042412]'
                                            : isVaspExit
                                              ? 'border-purple-500/40 hover:border-purple-400 text-purple-300'
                                              : 'border-[#00ff66]/40 hover:border-[#00ff66] text-[#00ff66]'
                                        )}
                                      >
                                        <span className="font-bold">
                                          &darr; {edge.amount ? `${edge.amount.toFixed(4)} ${edge.asset || 'ETH'}` : 'Transfer'}
                                        </span>
                                        {isVaspExit && (
                                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                            VASP Cashout
                                          </span>
                                        )}
                                        {edge.tx_hash && (
                                          <a
                                            href={getExplorerUrl(edge.tx_hash, 'tx', traceDetail?.chain)}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-emerald-400/80 hover:text-white flex items-center gap-1 underline underline-offset-2 ml-1"
                                            title="View on Blockchain Explorer"
                                          >
                                            <span>Tx: {truncateHash(edge.tx_hash, 6)}</span>
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                        )}
                                      </div>
                                    );
                                  })}
                                  <div className="w-0.5 h-5 bg-gradient-to-b from-[#059669] to-[#00ff66] animate-pulse" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* VIEW 2: 2D INTERACTIVE CYTOSCAPE CANVAS */
                <>
                  <div ref={containerRef} className="w-full h-full min-h-[500px]" style={{ background: '#020b06' }} />

                  {/* Canvas Controls Overlay */}
                  <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-10">
                    <button onClick={zoomIn} title="Zoom In" className="p-2 rounded-lg bg-[#041d0e]/90 border border-[#0d331d] text-emerald-300 hover:text-[#00ff66] shadow-lg transition-colors">
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button onClick={zoomOut} title="Zoom Out" className="p-2 rounded-lg bg-[#041d0e]/90 border border-[#0d331d] text-emerald-300 hover:text-[#00ff66] shadow-lg transition-colors">
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button onClick={fit} title="Fit to Screen" className="p-2 rounded-lg bg-[#041d0e]/90 border border-[#0d331d] text-emerald-300 hover:text-[#00ff66] shadow-lg transition-colors">
                      <Maximize className="w-4 h-4" />
                    </button>
                    <button onClick={resetLayout} title="Rearrange Layout" className="p-2 rounded-lg bg-[#041d0e]/90 border border-[#0d331d] text-emerald-300 hover:text-[#00ff66] shadow-lg transition-colors">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Legend Overlay */}
                  <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 sm:gap-3 px-3 py-2 rounded-xl bg-[#041d0e]/90 border border-[#0d331d] backdrop-blur-xl z-10">
                    {[
                      { color: '#3b82f6', label: 'Victim Wallet (Start)' },
                      { color: '#ef4444', label: 'Primary Suspect (A)' },
                      { color: '#f59e0b', label: 'Money Mule Splits (B, C)' },
                      { color: '#06b6d4', label: 'Consolidation Hub (D)' },
                      { color: '#8b5cf6', label: 'VASP / Exchange Endpoint' },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-1.5 text-[11px] sm:text-xs text-emerald-200/80 font-mono">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-md shadow-[0_0_6px_currentColor] shrink-0" style={{ background: color }} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full p-8 sm:p-12 text-center text-emerald-600/70">
              <div>
                <Network className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 text-emerald-700/60" />
                <h3 className="text-base font-bold text-white font-mono">No Active Trace Selected</h3>
                <p className="text-xs text-emerald-400/80 font-mono mt-1 max-w-sm mx-auto">
                  Run a live trace from the TXID Tracer page or select a completed trace from the dropdown menu above.
                </p>
                <Link href="/tracer" className="btn-primary mt-4 text-xs inline-flex items-center gap-2">
                  <span>Go to TXID Tracer</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Inspector Panel */}
        {selectedNode ? (
          <div className="w-full lg:w-80 glass-card p-4 sm:p-5 space-y-4 max-h-[480px] lg:max-h-none overflow-y-auto overscroll-contain border border-[#0d331d] shadow-xl shrink-0 scrollbar-thin touch-pan-y">
            <div className="flex items-center justify-between border-b border-[#0d331d] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00ff66]" />
                <span>Wallet Node Inspector</span>
              </h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-xs text-emerald-500 hover:text-white font-mono p-1"
              >
                Close &times;
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* Address with Copy */}
              <div className="p-3 rounded-xl bg-[#021309] border border-[#0d331d] space-y-1.5">
                <p className="text-[10px] uppercase text-emerald-400/70 font-bold">Address ID</p>
                <p className="text-white font-bold break-all">{selectedNode.id}</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => copyToClipboard(selectedNode.id)}
                    className="flex-1 py-1 px-2 rounded-md bg-[#041d0e] hover:bg-[#072d16] border border-[#0d331d] text-emerald-300 flex items-center justify-center gap-1 text-[11px]"
                  >
                    {copiedText === selectedNode.id ? <Check className="w-3 h-3 text-[#00ff66]" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                  <a
                    href={getExplorerUrl(selectedNode.id, 'address', traceDetail?.chain)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1 px-2 rounded-md bg-[#041d0e] hover:bg-[#072d16] border border-[#0d331d] text-emerald-300 hover:text-white flex items-center justify-center gap-1 text-[11px]"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Explorer</span>
                  </a>
                </div>
              </div>

              {/* Entity Attribution */}
              {selectedNode.entity ? (
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-1">
                  <p className="text-[10px] uppercase text-purple-300 font-bold flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    <span>Identified Entity</span>
                  </p>
                  <p className="text-sm font-bold text-white">{selectedNode.entity}</p>
                  <p className="text-[10px] text-purple-300/80 capitalize">Type: {selectedNode.entity_type || 'Exchange / Service'}</p>
                  {selectedNode.confidence && (
                    <p className="text-[10px] text-purple-400">Confidence: {(Number(selectedNode.confidence) * 100).toFixed(0)}%</p>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#021309] border border-[#0d331d]">
                  <p className="text-[10px] uppercase text-emerald-400/70 font-bold">Entity Status</p>
                  <p className="text-emerald-200">Unlabeled / Private Wallet</p>
                </div>
              )}

              {/* Hop Information */}
              <div className="p-3 rounded-xl bg-[#021309] border border-[#0d331d] space-y-1">
                <p className="text-[10px] uppercase text-emerald-400/70 font-bold">Hop Position</p>
                <p className="text-white font-bold">
                  {selectedNode.hop !== undefined ? `Hop Level ${selectedNode.hop}` : 'Source Point'}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="pt-2">
                <Link
                  href={`/tracer?trace_id=${selectedTraceId}`}
                  className="btn-secondary w-full justify-center text-xs py-2 flex items-center gap-2"
                >
                  <Activity className="w-3.5 h-3.5 text-[#00ff66]" />
                  <span>View Hop Forensics</span>
                </Link>
              </div>
            </div>
          </div>
        ) : selectedEdge ? (
          <div className="w-full lg:w-80 glass-card p-4 sm:p-5 space-y-4 max-h-[480px] lg:max-h-none overflow-y-auto overscroll-contain border border-[#0d331d] shadow-xl shrink-0 scrollbar-thin touch-pan-y">
            <div className="flex items-center justify-between border-b border-[#0d331d] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-[#00ff66]" />
                <span>Transaction Hop Details</span>
              </h3>
              <button onClick={() => setSelectedEdge(null)} className="text-xs text-emerald-500 hover:text-white font-mono p-1">
                Close &times;
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#021309] border border-[#0d331d] space-y-1">
                <p className="text-[10px] uppercase text-emerald-400/70 font-bold">Transfer Amount</p>
                <p className="text-base font-bold text-[#00ff66]">
                  {selectedEdge.amount ? `${selectedEdge.amount.toFixed(4)} ${selectedEdge.asset || 'ETH'}` : 'N/A'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#021309] border border-[#0d331d] space-y-1">
                <p className="text-[10px] uppercase text-emerald-400/70 font-bold">Transaction Hash (TXID)</p>
                <p className="text-white font-bold break-all">{selectedEdge.tx_hash || 'Internal Flow'}</p>
                {selectedEdge.tx_hash && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => copyToClipboard(selectedEdge.tx_hash)}
                      className="flex-1 py-1 px-2 rounded-md bg-[#041d0e] hover:bg-[#072d16] border border-[#0d331d] text-emerald-300 flex items-center justify-center gap-1 text-[11px]"
                    >
                      {copiedText === selectedEdge.tx_hash ? <Check className="w-3 h-3 text-[#00ff66]" /> : <Copy className="w-3 h-3" />}
                      <span>Copy TXID</span>
                    </button>
                    <a
                      href={getExplorerUrl(selectedEdge.tx_hash, 'tx', traceDetail?.chain)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-1 px-2 rounded-md bg-[#041d0e] hover:bg-[#072d16] border border-[#0d331d] text-emerald-300 hover:text-white flex items-center justify-center gap-1 text-[11px]"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Explorer</span>
                    </a>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[#021309] border border-[#0d331d] space-y-2">
                <div>
                  <p className="text-[10px] uppercase text-emerald-400/70 font-bold">From</p>
                  <p className="text-slate-300 break-all">{selectedEdge.source}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-emerald-400/70 font-bold">To</p>
                  <p className="text-slate-300 break-all">{selectedEdge.target}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex w-80 glass-card p-5 flex-col items-center justify-center text-center text-emerald-600/70 border border-[#0d331d] shrink-0">
            <Search className="w-8 h-8 text-emerald-700/60 mb-2" />
            <p className="text-xs font-bold text-emerald-400 font-mono">Select Any Node or Arrow</p>
            <p className="text-[11px] text-emerald-600 font-mono mt-1">
              Click on any wallet card, node, or transaction arrow to inspect its full on-chain details and exchange attribution.
            </p>
          </div>
        )}
      </div>

      {/* AI Forensic Intelligence Modal — CRT CYBER TERMINAL */}
      {showAiModal && aiAnalysis && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] overflow-y-auto overscroll-contain p-2 sm:p-4 md:p-6 lg:p-8 flex justify-center items-start animate-fade-in touch-pan-y"
          onClick={() => setShowAiModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="crt-terminal max-w-4xl w-full my-auto sm:my-6 max-h-[85vh] sm:max-h-[88vh] overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 border border-[#00ff66]/50 shadow-[0_0_60px_rgba(0,255,102,0.25)] rounded-2xl relative scrollbar-thin touch-pan-y"
          >
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#00ff66]/30 pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 sm:p-3 rounded-xl bg-[#00ff66]/10 border border-[#00ff66]/40 text-[#00ff66] shadow-[0_0_15px_rgba(0,255,102,0.3)] shrink-0 mt-0.5">
                  <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white font-mono crt-phosphor-text">
                      AI Forensic Behavioral Assessment
                    </h2>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider",
                      aiAnalysis.is_sepolia
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40 shadow-[0_0_10px_rgba(0,255,102,0.3)]"
                    )}>
                      {aiAnalysis.environment_badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-400 font-mono mt-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span>CRT Terminal Active</span>
                    <span className="text-[#00ff66]">•</span>
                    <span>Law enforcement intelligence & scammer behavioral classification</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="self-end sm:self-auto text-slate-400 hover:text-white hover:border-[#00ff66] px-3 py-1.5 rounded-lg bg-[#041d0e] border border-[#0d331d] font-mono text-xs sm:text-sm transition-all"
              >
                &times; Close [ESC]
              </button>
            </div>

            {/* Testnet vs Mainnet Disclaimer Banner */}
            <div className={cn(
              "p-3 sm:p-3.5 rounded-xl border text-xs font-mono flex items-start gap-2.5 crt-hud-box",
              aiAnalysis.is_sepolia
                ? "bg-amber-950/40 border-amber-500/50 text-amber-200"
                : "bg-[#042412]/90 border-[#00ff66]/50 text-emerald-200 shadow-[0_0_15px_rgba(0,255,102,0.15)]"
            )}>
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#00ff66]" />
              <p className="leading-relaxed">{aiAnalysis.environment_badge.disclaimer}</p>
            </div>

            {/* Verdict Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-4 rounded-xl bg-[#041d0e]/90 border border-[#00ff66]/30 space-y-1 md:col-span-2 crt-hud-box">
                <p className="text-[10px] uppercase font-bold text-emerald-400 font-mono">Detected Typology</p>
                <p className="text-sm sm:text-base font-bold text-white font-mono flex items-center gap-2 crt-phosphor-text">
                  <AlertOctagon className="w-5 h-5 text-red-400 shrink-0" />
                  <span>{aiAnalysis.verdict.fraud_type}</span>
                </p>
                <p className="text-xs text-slate-300 font-mono mt-1 leading-relaxed">
                  {aiAnalysis.modus_operandi.summary}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#041d0e] border border-[#0d331d] space-y-1 flex flex-col justify-center text-center">
                <p className="text-[10px] uppercase font-bold text-emerald-400 font-mono">Confidence Gauge</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#00ff66] font-mono">
                  {aiAnalysis.verdict.confidence_percentage}
                </p>
                <p className="text-[10px] text-slate-400 font-mono uppercase">
                  Risk Level: <span className="text-red-400 font-bold">{aiAnalysis.verdict.risk_level.toUpperCase()}</span>
                </p>
              </div>
            </div>

            {/* Cross-Victim Complaint Database Matches */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#0d331d] pb-2">
                <h3 className="text-xs sm:text-sm font-bold text-white font-mono flex flex-wrap items-center gap-2">
                  <Users className="w-4 h-4 text-[#00ff66]" />
                  <span>Cross-Victim Complaint Correlations</span>
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                    {aiAnalysis.victim_correlations.total_matches} MATCHES
                  </span>
                </h3>
              </div>

              {aiAnalysis.victim_correlations.matched_victims.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto overscroll-contain scrollbar-thin">
                  {aiAnalysis.victim_correlations.matched_victims.map((vic, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#02140a] border border-red-500/30 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-bold text-white">Victim {vic.victim_id}</span>
                          <span className="text-[10px] text-slate-400">({vic.case_number}: {vic.case_title})</span>
                        </div>
                        <p className="text-[11px] text-red-300 mt-0.5">
                          Reported Loss: <span className="font-bold">₹{vic.amount_lost.toLocaleString()} ({vic.cryptocurrency})</span> — {vic.complaint_description}
                        </p>
                      </div>
                      <div className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {truncateAddress(vic.matched_address, 8)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-mono p-3 rounded-xl bg-[#02140a] border border-[#0d331d]">
                  No prior victim complaints on file for these specific addresses in the local case database.
                </p>
              )}
            </div>

            {/* Scammer Behavioral Modus Operandi & Intent */}
            <div className="space-y-3">
              <h3 className="text-xs sm:text-sm font-bold text-white font-mono flex items-center gap-2 border-b border-[#0d331d] pb-2">
                <ShieldAlert className="w-4 h-4 text-[#00ff66]" />
                <span>Criminal Modus Operandi & Behavioral Intent</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiAnalysis.modus_operandi.intents.map((intent, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#041d0e] border border-[#0d331d] font-mono text-xs space-y-1.5">
                    <p className="font-bold text-[#00ff66] text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff66] shrink-0" />
                      <span>{intent.category}</span>
                    </p>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{intent.description}</p>
                    <p className="text-[10px] text-emerald-400/80 pt-1 border-t border-[#0d331d]">
                      Evidence: {intent.evidence}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Amount & Volume Forensics */}
            <div className="p-4 rounded-xl bg-[#041d0e] border border-[#0d331d] font-mono text-xs space-y-2">
              <p className="font-bold text-xs uppercase text-emerald-400">Fund Flow & Structuring Analysis</p>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                <div>
                  <p className="text-[10px] text-slate-400">Total Volume</p>
                  <p className="font-bold text-white">{aiAnalysis.amount_analysis.total_value} {aiAnalysis.amount_analysis.asset}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Volume Classification</p>
                  <p className="font-bold text-cyan-400">{aiAnalysis.amount_analysis.tier}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Structuring / Smurfing</p>
                  <p className={cn("font-bold", aiAnalysis.amount_analysis.structuring_detected ? "text-amber-400" : "text-emerald-400")}>
                    {aiAnalysis.amount_analysis.structuring_detected ? "Detected (Uniform Splits)" : "Normal Distribution"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Whale Movement</p>
                  <p className="font-bold text-white">{aiAnalysis.amount_analysis.is_whale_movement ? "Yes (>10 ETH)" : "Retail Tier"}</p>
                </div>
              </div>
            </div>

            {/* Police / Law Enforcement Action Plan */}
            <div className="space-y-3">
              <h3 className="text-xs sm:text-sm font-bold text-white font-mono flex items-center gap-2 border-b border-[#0d331d] pb-2">
                <Scale className="w-4 h-4 text-[#00ff66]" />
                <span>Police / Law Enforcement Action Plan (Recommended Next Steps)</span>
              </h3>

              <div className="space-y-3">
                {aiAnalysis.police_action_plan.map((act, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#02140a] border border-[#0d331d] font-mono text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="font-bold text-[#00ff66] text-xs">#{idx + 1} {act.title}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                        {act.priority}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{act.purpose}</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] pl-1">
                      {act.details.map((d, dIdx) => (
                        <li key={dIdx}>{d}</li>
                      ))}
                    </ul>
                    <p className="text-[10px] text-emerald-500/80 pt-1 border-t border-[#0d331d]/60">
                      Legal Authority: {act.legal_basis}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Legal Advisory Disclaimer */}
            <p className="text-[10px] text-slate-500 font-mono pt-2 border-t border-[#0d331d] leading-relaxed">
              {aiAnalysis.advisory_disclaimer}
            </p>

            <div className="flex justify-end pt-2 pb-1">
              <button
                onClick={() => setShowAiModal(false)}
                className="btn-primary text-xs px-6 py-2.5 font-mono w-full sm:w-auto justify-center"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-[#00ff66] rounded-full animate-spin shadow-[0_0_20px_rgba(0,255,102,0.3)]" />
      </div>
    }>
      <GraphContent />
    </Suspense>
  );
}
