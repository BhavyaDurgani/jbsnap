'use client';
import { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import { useParams } from 'next/navigation';
import {
  ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState,
  addEdge, Panel, MarkerType, Connection, Edge, Node, BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { io, Socket } from 'socket.io-client';
import { api, BASE_URL_DIRECT } from '../../../../services/api';
import { nodeTypes, NODE_PALETTE, getNodeIcon } from '../../../../components/customNodes';
import CustomSelect from '../../../../components/CustomSelect';
import { Play, Pause, Settings, Zap, Trash2, Monitor, Save, Rocket, Loader2, Cpu, Terminal, X, AlertCircle, Check, Layers, Lock } from 'lucide-react';

const METHOD_COLORS: Record<string, string> = { GET: '#10b981', POST: '#6366f1', PUT: '#f59e0b', DELETE: '#ef4444', PATCH: '#38bdf8' };

const WORKFLOW_TEMPLATES = [
  {
    id: 'rest-crud',
    title: 'REST API CRUD Endpoint',
    category: 'Basic',
    isPro: false,
    desc: 'Receives HTTP GET/POST and queries PostgreSQL for resources.',
    nodes: [
      { id: 'node_trigger', type: 'triggerNode', position: { x: 100, y: 150 }, data: { method: 'GET', path: '/api/items' } },
      { id: 'node_db', type: 'databaseNode', position: { x: 380, y: 150 }, data: { query: 'SELECT * FROM items ORDER BY id DESC LIMIT 20;' } },
      { id: 'node_res', type: 'responseNode', position: { x: 660, y: 150 }, data: { statusCode: 200, body: '$steps.node_db' } },
    ],
    edges: [
      { id: 'e1', source: 'node_trigger', target: 'node_db' },
      { id: 'e2', source: 'node_db', target: 'node_res' },
    ],
  },
  {
    id: 'webhook-ingest',
    title: 'Webhook Event Ingest',
    category: 'Basic',
    isPro: false,
    desc: 'Ingests external JSON webhooks, transforms payload, and responds 200 OK.',
    nodes: [
      { id: 'node_wh', type: 'webhookNode', position: { x: 100, y: 150 }, data: { path: '/webhook/event', secret: 'whsec_secret' } },
      { id: 'node_tf', type: 'transformNode', position: { x: 380, y: 150 }, data: { mapping: '{ received: true, event: steps.prev.body }' } },
      { id: 'node_res', type: 'responseNode', position: { x: 660, y: 150 }, data: { statusCode: 200, body: '$steps.node_tf' } },
    ],
    edges: [
      { id: 'e1', source: 'node_wh', target: 'node_tf' },
      { id: 'e2', source: 'node_tf', target: 'node_res' },
    ],
  },
  {
    id: 'cron-monitor',
    title: 'Scheduled Health Monitor',
    category: 'Basic',
    isPro: false,
    desc: 'Pings external service on cron schedule and records availability.',
    nodes: [
      { id: 'node_cron', type: 'scheduledNode', position: { x: 100, y: 150 }, data: { cron: '*/15 * * * *', timezone: 'UTC' } },
      { id: 'node_http', type: 'httpClientNode', position: { x: 380, y: 150 }, data: { method: 'GET', url: 'https://api.github.com/status' } },
      { id: 'node_res', type: 'responseNode', position: { x: 660, y: 150 }, data: { statusCode: 200, body: '$steps.node_http' } },
    ],
    edges: [
      { id: 'e1', source: 'node_cron', target: 'node_http' },
      { id: 'e2', source: 'node_http', target: 'node_res' },
    ],
  },
  {
    id: 'ai-classifier',
    title: 'AI Sentiment & NLP Classifier',
    category: 'Advanced',
    isPro: true,
    desc: 'Authenticates via JWT, feeds text to AI model, and returns structured analysis.',
    nodes: [
      { id: 'node_trigger', type: 'triggerNode', position: { x: 80, y: 150 }, data: { method: 'POST', path: '/api/analyze' } },
      { id: 'node_jwt', type: 'jwtValidateNode', position: { x: 320, y: 150 }, data: { secret: 'secret_key' } },
      { id: 'node_ai', type: 'aiNode', position: { x: 560, y: 150 }, data: { provider: 'bharatcode', model: 'qwen-3.8-27b', prompt: '$request.body.text' } },
      { id: 'node_res', type: 'responseNode', position: { x: 800, y: 150 }, data: { statusCode: 200, body: '$steps.node_ai' } },
    ],
    edges: [
      { id: 'e1', source: 'node_trigger', target: 'node_jwt' },
      { id: 'e2', source: 'node_jwt', target: 'node_ai' },
      { id: 'e3', source: 'node_ai', target: 'node_res' },
    ],
  },
  {
    id: 'payment-webhook',
    title: 'Payment Webhook Dispatcher',
    category: 'Advanced',
    isPro: true,
    desc: 'Validates API key, branches based on payment status, and saves to database.',
    nodes: [
      { id: 'node_wh', type: 'webhookNode', position: { x: 80, y: 150 }, data: { path: '/webhook/stripe' } },
      { id: 'node_key', type: 'apiKeyNode', position: { x: 320, y: 150 }, data: { headerName: 'x-api-key' } },
      { id: 'node_sw', type: 'switchCaseNode', position: { x: 560, y: 150 }, data: { expression: 'context.request.body.status', cases: ['succeeded', 'failed', 'refunded'] } },
      { id: 'node_db', type: 'databaseNode', position: { x: 800, y: 150 }, data: { query: 'INSERT INTO payments VALUES ($request.body.id);' } },
    ],
    edges: [
      { id: 'e1', source: 'node_wh', target: 'node_key' },
      { id: 'e2', source: 'node_key', target: 'node_sw' },
      { id: 'e3', source: 'node_sw', target: 'node_db' },
    ],
  },
  {
    id: 'sheets-crm-sync',
    title: 'Google Sheets & CRM Exporter',
    category: 'Advanced',
    isPro: true,
    desc: 'Transforms incoming leads and directly writes records to Google Sheets in real-time.',
    nodes: [
      { id: 'node_trigger', type: 'triggerNode', position: { x: 80, y: 150 }, data: { method: 'POST', path: '/api/leads' } },
      { id: 'node_tf', type: 'transformNode', position: { x: 320, y: 150 }, data: { mapping: '{ leadId: steps.prev.id }' } },
      { id: 'node_sheets', type: 'googleSheetsNode', position: { x: 560, y: 150 }, data: { action: 'APPEND_ROW', range: 'Leads!A1' } },
      { id: 'node_res', type: 'responseNode', position: { x: 800, y: 150 }, data: { statusCode: 201, body: '$steps.node_sheets' } },
    ],
    edges: [
      { id: 'e1', source: 'node_trigger', target: 'node_tf' },
      { id: 'e2', source: 'node_tf', target: 'node_sheets' },
      { id: 'e3', source: 'node_sheets', target: 'node_res' },
    ],
  },
];

export default function BuilderPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const isPro = user?.plan === 'PRO_MONTHLY' || user?.plan === 'PRO_YEARLY';

  // Workflows
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWf, setSelectedWf] = useState<any>(null);
  const [wfLoading, setWfLoading] = useState(false);
  const [showCreateWf, setShowCreateWf] = useState(false);
  const [newWf, setNewWf] = useState({ name: '', path: '/', method: 'GET' });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [creating, setCreating] = useState(false);

  // Templates
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Canvas
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isMinimapVisible, setIsMinimapVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastZoomRef = useRef<number | null>(null);

  const onMove = useCallback((_event: any, viewport: any) => {
    const currentZoom = viewport.zoom;
    if (lastZoomRef.current !== null && lastZoomRef.current !== currentZoom) {
      setIsMinimapVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsMinimapVisible(false);
      }, 1500);
    }
    lastZoomRef.current = currentZoom;
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // AI
  const [showAi, setShowAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // API Sandbox Testing States
  const [showTestModal, setShowTestModal] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testHeaders, setTestHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [testBody, setTestBody] = useState('{\n  \n}');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Metrics
  const [logs, setLogs] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.auth.me();
        if (res?.user) {
          setUser(res.user);
          localStorage.setItem('ff_user', JSON.stringify(res.user));
        }
      } catch (_) {
        const stored = localStorage.getItem('ff_user');
        if (stored) {
          try { setUser(JSON.parse(stored)); } catch (_) {}
        }
      }
    };
    fetchUser();
  }, []);

  const handleApplyTemplate = async (template: typeof WORKFLOW_TEMPLATES[0]) => {
    /*
    if (template.isPro && !isPro) {
      setShowUpgradeModal(true);
      return;
    }
    */
    setCreating(true);
    try {
      const created = await api.workflows.create(projectId, {
        name: template.title,
        path: `/api/${template.id}`,
        method: (template.nodes.find(n => n.type === 'triggerNode')?.data as any)?.method || 'POST',
        nodes: template.nodes,
        edges: template.edges,
      });
      setNodes(template.nodes as Node[]);
      setEdges(template.edges as Edge[]);
      setSelectedWf(created);
      setWorkflows(p => [created, ...p]);
      setShowTemplatesModal(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    loadWorkflows();
    const socket = io(BASE_URL_DIRECT);
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-project', projectId));
    socket.on('metrics', (m: any) => setLogs(p => [m, ...p].slice(0, 50)));
    return () => { socket.disconnect(); };
  }, [projectId]);

  const loadWorkflows = async () => {
    setWfLoading(true);
    try {
      const list = await api.workflows.list(projectId);
      setWorkflows(list);
      if (list.length > 0) loadWorkflowDetail(list[0]);
    } finally { setWfLoading(false); }
  };

  const loadWorkflowDetail = async (wf: any) => {
    setSelectedWf(wf);
    const full = await api.workflows.get(wf.id);
    setNodes((full.nodes as Node[]) || []);
    setEdges((full.edges as Edge[]) || []);
    setSelectedNodeId(null);
  };

  const handleCreateWf = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await api.workflows.create(projectId, newWf);
      setWorkflows(p => [created, ...p]);
      await loadWorkflowDetail(created);
      setShowCreateWf(false);
      setNewWf({ name: '', path: '/', method: 'GET' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedWf) return;
    setSaving(true);
    try {
      const triggerNode = nodes.find(n => n.type === 'triggerNode');
      await api.workflows.update(selectedWf.id, {
        nodes, edges,
        method: triggerNode?.data?.method || selectedWf.method,
        path: triggerNode?.data?.path || selectedWf.path,
      });
      const list = await api.workflows.list(projectId);
      setWorkflows(list);
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handlePublish = async () => {
    if (!selectedWf) return;
    setPublishing(true);
    try {
      const next = !selectedWf.isPublished;
      await api.workflows.publish(selectedWf.id, next);
      setSelectedWf((p: any) => ({ ...p, isPublished: next }));
      setWorkflows(wfs => wfs.map(w => w.id === selectedWf.id ? { ...w, isPublished: next } : w));
    } catch (err: any) { alert(err.message); }
    finally { setPublishing(false); }
  };

  const handleDeleteWfById = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.workflows.delete(id);
      const list = await api.workflows.list(projectId);
      setWorkflows(list);
      if (selectedWf?.id === id) {
        if (list.length > 0) loadWorkflowDetail(list[0]);
        else { setSelectedWf(null); setNodes([]); setEdges([]); }
      }
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteWf = async () => {
    if (!selectedWf) return;
    await handleDeleteWfById(selectedWf.id, selectedWf.name);
  };

  const onConnect = useCallback((params: Connection) =>
    setEdges(eds => addEdge({
      ...params,
      animated: true,
      style: { stroke: '#00f2fe', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#00f2fe' }
    }, eds)), []);

  const addNode = (type: string, defaultData: any) => {
    if (!selectedWf) { alert('Select or create a workflow first'); return; }
    if (type === 'triggerNode' && nodes.some(n => n.type === 'triggerNode')) {
      alert('Only one trigger node per workflow'); return;
    }
    const id = `node_${Date.now()}`;
    const newNode: Node = { id, type, position: { x: 120 + nodes.length * 60, y: 180 + (nodes.length % 3) * 80 }, data: { ...defaultData } };
    setNodes(ns => [...ns, newNode]);
    setSelectedNodeId(id);
  };

  const deleteNode = () => {
    if (!selectedNodeId) return;
    setNodes(ns => ns.filter(n => n.id !== selectedNodeId));
    setEdges(es => es.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const handleNodeDataChange = (key: string, value: any) => {
    if (!selectedNodeId) return;
    setNodes(ns => ns.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, [key]: value } } : n));
  };

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  // AI Generator
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await api.ai.generateWorkflow(aiPrompt);
      const { workflow } = res;
      const created = await api.workflows.create(projectId, {
        name: workflow.name,
        path: workflow.path,
        method: workflow.method,
        nodes: workflow.nodes,
        edges: workflow.edges
      });
      setNodes((workflow.nodes as Node[]) || []);
      setEdges((workflow.edges as Edge[]) || []);
      setSelectedWf(created);
      setWorkflows(p => [created, ...p]);
      setUser((prev: any) => {
        const nextUsed = res?.quota?.used !== undefined ? res.quota.used : ((prev?.aiGenerationsCount || 0) + 1);
        const updated = prev ? { ...prev, aiGenerationsCount: nextUsed } : prev;
        if (updated) {
          localStorage.setItem('ff_user', JSON.stringify(updated));
        }
        return updated;
      });
      setShowAi(false);
      setAiPrompt('');
    } catch (err: any) { setAiError(err.message); }
    finally { setAiLoading(false); }
  };

  const handleTestExecute = async () => {
    if (!selectedWf) return;
    setTestLoading(true);
    setTestResult(null);

    const startTime = Date.now();
    const cleanPath = selectedWf.path.startsWith('/') ? selectedWf.path : `/${selectedWf.path}`;
    const queryStr = testQuery.trim() ? (testQuery.startsWith('?') ? testQuery : `?${testQuery}`) : '';
    const gatewayUrl = `${BASE_URL_DIRECT}/api/${projectId}${cleanPath}${queryStr}`;

    try {
      let headersObj = {};
      try {
        if (testHeaders.trim()) {
          headersObj = JSON.parse(testHeaders);
        }
      } catch (err) {
        throw new Error('Invalid JSON format in Request Headers');
      }

      let bodyData: any = undefined;
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(selectedWf.method)) {
        try {
          if (testBody.trim()) {
            bodyData = JSON.parse(testBody);
          }
        } catch (err) {
          throw new Error('Invalid JSON format in Request Body');
        }
      }

      const response = await fetch(gatewayUrl, {
        method: selectedWf.method,
        headers: {
          ...headersObj,
        },
        body: bodyData ? JSON.stringify(bodyData) : undefined,
      });

      const latency = Date.now() - startTime;
      let responseBodyText = '';
      let isJson = false;
      const contentType = response.headers.get('content-type') || '';
      
      try {
        if (contentType.includes('application/json')) {
          const json = await response.json();
          responseBodyText = JSON.stringify(json, null, 2);
          isJson = true;
        } else {
          responseBodyText = await response.text();
        }
      } catch (err) {
        responseBodyText = `Failed to parse response content: ${(err as Error).message}`;
      }

      const resHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        resHeaders[key] = value;
      });

      setTestResult({
        status: response.status,
        statusText: response.statusText,
        latency,
        headers: resHeaders,
        body: responseBodyText,
        isJson,
        success: response.ok
      });
    } catch (err: any) {
      setTestResult({
        error: true,
        message: err.message || 'Network execution failed.'
      });
    } finally {
      setTestLoading(false);
    }
  };

  const renderConsole = () => {
    if (!testResult) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: '8px', padding: 24, gap: 12 }}>
          <Terminal size={24} style={{ color: 'var(--text-faint)' }} />
          <div style={{ fontSize: 10.5, color: 'var(--text-faint)', fontFamily: "'JetBrains Mono', monospace", textAlign: 'center' }}>
            READY FOR EXECUTION.<br/>CONFIGURE PARAMETERS AND CLICK TEST BELOW.
          </div>
        </div>
      );
    }

    if (testResult.error) {
      return (
        <div style={{ flex: 1, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)', padding: '16px', borderRadius: '8px', color: '#fca5a5', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, whiteSpace: 'pre-wrap', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#ef4444' }}><AlertCircle size={14} /> Execution Error</div>
          {testResult.message}
        </div>
      );
    }

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
        {/* Telemetry metadata tags */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            background: testResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1.5px solid ${testResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: testResult.success ? '#10b981' : '#ef4444',
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '4px',
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            STATUS: {testResult.status} {testResult.statusText}
          </span>
          
          <span style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1.5px solid rgba(245,158,11,0.3)',
            color: '#f59e0b',
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '4px',
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            LATENCY: {testResult.latency} ms
          </span>
        </div>

        {/* Response Body Text */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', border: '1px solid var(--neu-border)', borderRadius: '10px', background: 'var(--neu-sunken)', boxShadow: 'var(--neu-pressed-sm)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--neu-border)', background: 'rgba(255,255,255,0.02)', fontSize: 9.5, fontWeight: 700, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>
            RESPONSE BODY ({testResult.isJson ? 'JSON' : 'PLAINTEXT'})
          </div>
          <pre style={{
            margin: 0,
            padding: '14px',
            overflowY: 'auto',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            lineHeight: 1.5,
            color: testResult.success ? '#a7f3d0' : '#fbcfe8',
            flex: 1,
            whiteSpace: 'pre-wrap'
          }}>{testResult.body || 'No payload returned.'}</pre>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)', background: 'var(--neu-base)', fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: 'hidden' }}>

      {/* ── LEFT SIDEBAR ─────────────────────────────── */}
      <div style={{ width: 268, background: 'var(--neu-surface)', borderRight: '1px solid var(--neu-border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden', boxShadow: 'var(--neu-flat-xs)', zIndex: 12 }}>
        {/* Workflows panel */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--neu-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#ffffff', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 5 }}><Monitor size={11} /> ACTIVE ROUTES</span>
            <button onClick={() => setShowCreateWf(true)}
              style={{
                width: 24,
                height: 24,
                border: '1px solid var(--neu-border)',
                background: 'var(--neu-surface)',
                boxShadow: 'var(--neu-flat-xs)',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--neu-border)'; e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)'; }}
            >+</button>
          </div>
          <div className="scroll-area" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            {wfLoading ? <div style={{ height: 32, borderRadius: 8 }} className="skeleton" /> :
              workflows.map(wf => {
                const isSelected = selectedWf?.id === wf.id;
                return (
                  <div key={wf.id}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      background: isSelected ? 'var(--neu-sunken)' : 'transparent',
                      border: `1px solid ${isSelected ? 'var(--neu-border)' : 'transparent'}`,
                      boxShadow: isSelected ? 'var(--neu-pressed-sm)' : 'none',
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <button onClick={() => loadWorkflowDetail(wf)}
                      style={{
                        flex: 1,
                        textAlign: 'left',
                        padding: '8px 10px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        overflow: 'hidden',
                        color: 'inherit',
                      }}>
                      <span style={{ fontSize: 8, fontWeight: 900, color: METHOD_COLORS[wf.method] || '#6366f1', background: `${METHOD_COLORS[wf.method]}18`, border: `1px solid ${METHOD_COLORS[wf.method]}30`, borderRadius: 4, padding: '1px 5px', fontFamily: "'JetBrains Mono', monospace" }}>{wf.method}</span>
                      <span style={{ fontSize: 11, color: isSelected ? '#ffffff' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace", fontWeight: isSelected ? 700 : 400 }}>{wf.name}</span>
                      {wf.isPublished && (
                        <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', flexShrink: 0 }} />
                      )}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWfById(wf.id, wf.name);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.25)',
                        cursor: 'pointer',
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s',
                        height: '100%',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; e.currentTarget.style.background = 'transparent'; }}
                      title="Delete Workflow"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Node Palette */}
        <div className="scroll-area" style={{ flex: 1, padding: '12px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={11} style={{ color: '#94a3b8' }} /> NODE TELEMETRY
          </div>
          {NODE_PALETTE.map(cat => (
            <div key={cat.category} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: cat.color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', marginBottom: 6 }}>{cat.category.toUpperCase()}</div>
              {cat.nodes.map(n => (
                <button key={n.type} onClick={() => addNode(n.type, n.defaultData)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    background: 'var(--neu-surface)',
                    border: `1px solid var(--neu-border)`,
                    boxShadow: 'var(--neu-flat-xs)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 8,
                    transition: 'all 0.2s ease',
                    color: '#cbd5e1',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = cat.color + '55';
                    e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--neu-border)';
                    e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)';
                    e.currentTarget.style.color = '#cbd5e1';
                  }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', color: cat.color }}>
                    {getNodeIcon(n.icon, 14)}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 11, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#e2e8f0' }}>{n.label}</div>
                    <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 2, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{n.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── CANVAS ───────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Toolbar */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--neu-surface)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--neu-border-bevel)',
          boxShadow: 'var(--neu-flat)',
          borderRadius: '12px',
          padding: '8px 16px'
        }}>
          {selectedWf ? (
            <>
              <span style={{ fontSize: 11, color: '#ffffff', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedWf.name.toUpperCase()}</span>
              <div style={{ width: 1, height: 16, background: 'var(--neu-border)' }} />
              
              {/* Save Button */}
              <button onClick={handleSave} disabled={saving}
                style={{
                  padding: '6px 14px',
                  background: 'var(--neu-surface)',
                  border: '1px solid var(--neu-border)',
                  boxShadow: 'var(--neu-flat-xs)',
                  color: saving ? 'var(--text-faint)' : '#ffffff',
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: '8px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { if(!saving) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)'; } }}
                onMouseLeave={e => { if(!saving) { e.currentTarget.style.borderColor = 'var(--neu-border)'; e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)'; } }}
              >
                {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />} {saving ? 'SAVING...' : 'SAVE'}
              </button>

              <button onClick={handlePublish} disabled={publishing}
                style={{
                  padding: '6px 14px',
                  background: selectedWf?.isPublished ? 'rgba(239,68,68,0.12)' : 'var(--neu-grad-convex)',
                  border: selectedWf?.isPublished ? '1px solid rgba(239,68,68,0.35)' : '1px solid var(--neu-border)',
                  boxShadow: 'var(--neu-flat-xs)',
                  color: selectedWf?.isPublished ? '#ef4444' : '#ffffff',
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  cursor: publishing ? 'not-allowed' : 'pointer',
                  borderRadius: '8px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (!publishing) {
                    e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)';
                    if (selectedWf?.isPublished) {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.18)';
                      e.currentTarget.style.borderColor = '#ef4444';
                    }
                  }
                }}
                onMouseLeave={e => {
                  if (!publishing) {
                    e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)';
                    if (selectedWf?.isPublished) {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)';
                    }
                  }
                }}
              >
                {publishing ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : selectedWf?.isPublished ? <><Pause size={12} /> SUSPEND</> : <><Rocket size={12} /> INITIALIZE</>}
              </button>

              {selectedWf?.isPublished && (
                <div style={{
                  padding: '3px 8px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  boxShadow: 'var(--neu-pressed-sm)',
                  fontSize: 9,
                  color: '#10b981',
                  fontWeight: 700,
                  borderRadius: '6px',
                  fontFamily: "'JetBrains Mono', monospace",
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', display: 'inline-block' }} />
                  LIVE
                </div>
              )}
              
              <button
                onClick={handleDeleteWf}
                style={{
                  padding: '6px 12px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.06)',
                  boxShadow: 'var(--neu-flat-xs)',
                  color: '#ef4444',
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  borderRadius: '8px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.borderColor = '#ef4444';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)';
                }}
                title="Delete Workflow"
              >
                <Trash2 size={12} />
                DELETE
              </button>
            </>
          ) : (
            <span style={{ fontSize: 11, color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>← SELECT OR GENERATE WORKFLOW</span>
          )}
          <div style={{ width: 1, height: 16, background: 'var(--neu-border)' }} />
          
          {/* Templates Button */}
          <button onClick={() => setShowTemplatesModal(true)}
            style={{
              padding: '6px 12px',
              border: '1px solid var(--neu-border)',
              background: 'var(--neu-surface)',
              boxShadow: 'var(--neu-flat-xs)',
              color: '#ffffff',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              borderRadius: '8px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--neu-border)'; e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)'; }}
          >
            <Layers size={11} style={{ color: '#38bdf8' }} /> TEMPLATES
          </button>

          {/* AI Button */}
          <button onClick={async () => {
            setShowAi(true);
            try {
              const res = await api.auth.me();
              if (res?.user) {
                setUser(res.user);
                localStorage.setItem('ff_user', JSON.stringify(res.user));
              }
            } catch (_) {}
          }}
            style={{
              padding: '6px 12px',
              border: '1px solid var(--neu-border)',
              background: 'var(--neu-surface)',
              boxShadow: 'var(--neu-flat-xs)',
              color: '#ffffff',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              borderRadius: '8px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--neu-border)'; e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)'; }}
          >
            <Zap size={11} style={{ color: '#f59e0b' }} /> AI SYNTHESIZE
          </button>

          {selectedWf && (
            <button onClick={() => setShowTestModal(true)}
              style={{
                padding: '6px 12px',
                border: '1px solid rgba(0, 242, 254, 0.4)',
                background: 'var(--neu-surface)',
                boxShadow: 'var(--neu-flat-xs)',
                color: '#00f2fe',
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                borderRadius: '8px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.8)'; e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.4)'; e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)'; }}
            >
              <Play size={11} style={{ fill: 'rgba(0, 242, 254, 0.2)' }} /> TEST API
            </button>
          )}
        </div>

        <ReactFlow
          nodes={useMemo(() => {
            if (!Array.isArray(nodes)) return [];
            return nodes.map((n: any, idx: number) => {
              const posX = typeof n?.position?.x === 'number' && !isNaN(n.position.x) ? n.position.x : (100 + (idx % 3) * 220);
              const posY = typeof n?.position?.y === 'number' && !isNaN(n.position.y) ? n.position.y : (120 + Math.floor(idx / 3) * 140);
              return {
                ...n,
                id: String(n?.id || `node_${idx}_${Date.now()}`),
                type: n?.type || 'default',
                data: n?.data || {},
                position: { x: posX, y: posY },
              };
            });
          }, [nodes])}
          edges={useMemo(() => {
            if (!Array.isArray(edges)) return [];
            return edges.filter((e: any) => e && e.source && e.target);
          }, [edges])}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          onMove={onMove}
          fitView
          style={{ background: 'var(--bg-base)' }}
          defaultEdgeOptions={{ animated: true, style: { stroke: '#00f2fe', strokeWidth: 2 } }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255, 255, 255, 0.07)" />
          <Controls style={{ background: 'var(--neu-surface)', border: '1px solid var(--neu-border-bevel)', borderRadius: 10, boxShadow: 'var(--neu-flat-sm)' }} />
          <MiniMap style={{
            background: 'var(--neu-sunken)',
            border: '1px solid var(--neu-border)',
            borderRadius: 10,
            boxShadow: 'var(--neu-flat-sm)',
            opacity: isMinimapVisible ? 1 : 0,
            pointerEvents: isMinimapVisible ? 'all' : 'none',
            transition: 'opacity 0.3s ease-in-out',
          }} nodeColor={() => '#ffffff'} maskColor="rgba(5, 5, 6, 0.85)" />
          {nodes.length === 0 && (
            <Panel position="top-center">
              <div style={{ marginTop: 100, textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, animation: 'float 3s infinite' }}>
                  <Zap size={44} style={{ color: 'var(--neon-amber)', filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.4))' }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>DEPLOY NODES FROM PALETTE OR SYNTHESIZE VIA GEMINI AI</div>
              </div>
            </Panel>
          )}
        </ReactFlow>

        {/* Live metrics strip (HUD style bottom feed) */}
        {logs.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(8, 8, 8, 0.96)',
            borderTop: '1px solid var(--neu-border)',
            padding: '8px 16px',
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            fontSize: 9,
            color: '#94a3b8',
            fontFamily: "'JetBrains Mono', monospace",
            zIndex: 5
          }}>
            <div style={{ color: '#00f2fe', fontWeight: 900, borderRight: '1.5px solid rgba(0,242,254,0.3)', paddingRight: 10 }}>TELEMETRY STREAM:</div>
            {logs.slice(0, 5).map((l, i) => (
              <span key={i} style={{ flexShrink: 0, color: l.responseStatus >= 400 ? '#ef4444' : '#05ffc4' }}>
                [{l.method}] {l.path} → CODE {l.responseStatus} ({l.latencyMs}ms)
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── RIGHT CONFIG PANEL ────────────────────────── */}
      {selectedNode && (
        <div style={{ width: 310, background: 'var(--neu-surface)', borderLeft: '1px solid var(--neu-border)', overflowY: 'auto', flexShrink: 0, boxShadow: 'var(--neu-flat)', display: 'flex', flexDirection: 'column', zIndex: 12 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--neu-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: '#00f2fe', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Settings size={12} /> NODE CONFIG
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={deleteNode} style={{ padding: '5px 10px', border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.1)', boxShadow: 'var(--neu-flat-xs)', color: '#ef4444', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", borderRadius: '6px' }}>DELETE</button>
              <button onClick={() => setSelectedNodeId(null)} style={{ width: 24, height: 24, border: '1px solid var(--neu-border)', background: 'var(--neu-surface)', boxShadow: 'var(--neu-flat-xs)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
                <X size={12} />
              </button>
            </div>
          </div>
          <div className="scroll-area" style={{ padding: 20, flex: 1 }}>
            <NodeConfigPanel node={selectedNode} onChange={handleNodeDataChange} />
          </div>
        </div>
      )}

      {/* ── CREATE WORKFLOW MODAL ─────────────────────── */}
      {showCreateWf && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ background: 'var(--neu-surface)', border: '1px solid var(--neu-border-bevel)', borderRadius: '18px', padding: 30, width: '100%', maxWidth: 430, boxShadow: 'var(--neu-flat-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>CREATE WORKFLOW</h2>
              <button onClick={() => setShowCreateWf(false)} style={{ width: 26, height: 26, border: '1px solid var(--neu-border)', borderRadius: '8px', background: 'var(--neu-surface)', boxShadow: 'var(--neu-flat-xs)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={12} />
              </button>
            </div>
            <form onSubmit={handleCreateWf} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[{ k: 'name', label: 'Name Namespace Key', placeholder: 'Get Products', type: 'text' }, { k: 'path', label: 'Gateway Endpoint Path', placeholder: '/products', type: 'text' }].map(f => (
                <div key={f.k}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'JetBrains Mono', monospace" }}>{f.label}</label>
                  <input required type={f.type} value={(newWf as any)[f.k]} onChange={e => setNewWf(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.placeholder}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'var(--neu-sunken)',
                      border: '1px solid var(--neu-border)',
                      boxShadow: 'var(--neu-pressed-sm)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: 12.5,
                      fontFamily: "'JetBrains Mono', monospace",
                      padding: '10px 14px',
                      outline: 'none',
                    }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'JetBrains Mono', monospace" }}>REST Method</label>
                <CustomSelect
                  value={newWf.method}
                  onChange={(val) => setNewWf(p => ({ ...p, method: val }))}
                  options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE']}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowCreateWf(false)} disabled={creating} style={{ flex: 1, height: 42, borderRadius: '10px', border: '1px solid var(--neu-border)', background: 'var(--neu-surface)', boxShadow: 'var(--neu-flat-xs)', color: '#94a3b8', fontSize: 12.5, cursor: creating ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease' }}>Cancel</button>
                <button type="submit"
                  disabled={creating}
                  style={{
                    flex: 2,
                    height: 42,
                    background: creating ? 'var(--neu-surface)' : 'var(--neu-grad-convex)',
                    border: '1px solid var(--neu-border)',
                    boxShadow: creating ? 'none' : 'var(--neu-flat-sm)',
                    color: creating ? '#64748b' : '#ffffff',
                    borderRadius: '10px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontFamily: "'JetBrains Mono', monospace",
                    cursor: creating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                  onMouseEnter={e => { if (!creating) { e.currentTarget.style.boxShadow = 'var(--neu-flat)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; } }}
                  onMouseLeave={e => { if (!creating) { e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)'; e.currentTarget.style.borderColor = 'var(--neu-border)'; } }}
                >
                  {creating ? (
                    <>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      DEPLOYING...
                    </>
                  ) : (
                    'Deploy Workflow'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── AI GENERATE MODAL ─────────────────────────── */}
      {showAi && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ background: 'var(--neu-surface)', border: '1px solid var(--neu-border-bevel)', borderRadius: '20px', padding: 32, width: '100%', maxWidth: 540, boxShadow: 'var(--neu-flat-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{ width: 46, height: 46, border: '1px solid var(--neu-border)', borderRadius: '12px', background: 'var(--neu-surface)', boxShadow: 'var(--neu-flat-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Cpu size={22} style={{ color: '#f59e0b' }} />
              </div>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Workflow Synthesizer</h2>
                <p style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>POWERED BY BHARATCODE AI (QWEN 3.8 27B) · SPECIFY INSTRUCTIONS</p>
              </div>
              <button onClick={() => { setShowAi(false); setAiError(''); }} style={{ marginLeft: 'auto', width: 26, height: 26, border: '1px solid var(--neu-border)', borderRadius: '8px', background: 'var(--neu-surface)', boxShadow: 'var(--neu-flat-xs)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={12} />
              </button>
            </div>

            {/* AI Plan Quota info (Commented out)
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'var(--neu-sunken)',
              border: '1px solid var(--neu-border)',
              boxShadow: 'var(--neu-pressed-sm)',
              borderRadius: '10px',
              marginBottom: 16,
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                AI Generation Quota: <strong style={{ color: '#ffffff' }}>3/mo</strong>
                {/ * Plan Quota: <strong style={{ color: isPro ? '#00f2fe' : '#ffffff' }}>{isPro ? 'Pro (12/mo)' : 'Free (3/mo)'}</strong> * /}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  color: (user?.aiGenerationsCount || 0) >= 3 ? '#ef4444' : '#10b981',
                  fontWeight: 600,
                }}>
                  {user?.aiGenerationsCount || 0} / 3 used
                  {/ * {user?.aiGenerationsCount || 0} / {isPro ? 12 : 3} used * /}
                </span>
                {/ * {!isPro && (
                  <button
                    onClick={() => { setShowAi(false); setShowUpgradeModal(true); }}
                    style={{
                      background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                      border: 'none',
                      color: '#000',
                      padding: '3px 9px',
                      borderRadius: '6px',
                      fontSize: 10,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Upgrade for 12/mo
                  </button>
                )} * /}
              </div>
            </div>
            */}

            {aiError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 8, borderRadius: '8px' }}>
                <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} /> PIPELINE FAIL: {aiError}
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {['Create a Product CRUD API', 'Build a User Auth workflow with JWT', 'Make a webhook that validates and stores events'].map(ex => (
                  <button key={ex} onClick={() => setAiPrompt(ex)}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--neu-surface)',
                      border: '1px solid var(--neu-border)',
                      boxShadow: 'var(--neu-flat-xs)',
                      color: '#94a3b8',
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono', monospace",
                      cursor: 'pointer',
                      borderRadius: '8px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--neu-border)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)'; }}>
                    {ex}
                  </button>
                ))}
              </div>
              <textarea
                value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                placeholder="Describe what API you want to build... e.g. 'Create a REST API that validates a JWT token, queries a PostgreSQL users table, and returns the user profile'"
                rows={4}
                style={{
                  width: '100%',
                  background: 'var(--neu-sunken)',
                  border: '1px solid var(--neu-border)',
                  boxShadow: 'var(--neu-pressed-sm)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: 12.5,
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: '12px 14px',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                  lineHeight: 1.6
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowAi(false); setAiError(''); }} style={{ flex: 1, height: 42, borderRadius: '10px', border: '1px solid var(--neu-border)', background: 'var(--neu-surface)', boxShadow: 'var(--neu-flat-xs)', color: '#94a3b8', fontSize: 12.5, cursor: 'pointer', transition: 'all 0.15s ease' }}>Cancel</button>
              <button onClick={handleAiGenerate} disabled={aiLoading || !aiPrompt.trim()}
                style={{
                  flex: 3,
                  height: 42,
                  background: aiLoading ? 'var(--neu-surface)' : 'var(--neu-grad-convex)',
                  border: '1px solid var(--neu-border)',
                  boxShadow: aiLoading ? 'none' : 'var(--neu-flat-sm)',
                  color: aiLoading ? '#64748b' : '#ffffff',
                  borderRadius: '10px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: aiLoading || !aiPrompt.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { if(!aiLoading && aiPrompt.trim()) { e.currentTarget.style.boxShadow = 'var(--neu-flat)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; } }}
                onMouseLeave={e => { if(!aiLoading && aiPrompt.trim()) { e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)'; e.currentTarget.style.borderColor = 'var(--neu-border)'; } }}
              >
                {aiLoading ? (
                  <>Synthesizing...</>
                ) : (
                  <>
                    <Zap size={13} style={{ marginRight: 6, color: '#f59e0b' }} />
                    Synthesize Workflow
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── API TESTING SANDBOX MODAL ────────────────── */}
      {showTestModal && selectedWf && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ background: 'var(--neu-surface)', border: '1px solid var(--neu-border-bevel)', borderRadius: '20px', padding: 30, width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--neu-flat-lg)', display: 'flex', flexDirection: 'column' }} className="scroll-area">
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--neu-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--neu-surface)', border: '1px solid var(--neu-border)', boxShadow: 'var(--neu-flat-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Terminal size={18} style={{ color: '#00f2fe' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 13, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>API Sandbox Test Runner</h2>
                  <p style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>TEST LIVE INTERACTIVE GATEWAY ENDPOINTS IN REALTIME</p>
                </div>
              </div>
              <button onClick={() => { setShowTestModal(false); setTestResult(null); }} style={{ width: 26, height: 26, border: '1px solid var(--neu-border)', borderRadius: '8px', background: 'var(--neu-surface)', boxShadow: 'var(--neu-flat-xs)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={12} />
              </button>
            </div>

            {/* Warning banner if workflow is unpublished */}
            {!selectedWf.isPublished && (
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', padding: '10px 14px', borderRadius: '10px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#fcd34d', lineHeight: 1.4 }}>
                  <strong>Workflow is suspended/unpublished.</strong> Please click <strong>Initialize</strong> on the canvas toolbar to publish the route, otherwise the gateway will return a 404 error.
                </span>
              </div>
            )}

            {/* Split Panel Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, flex: 1, minHeight: 340 }}>
              
              {/* Left Column: Request configuration */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#00f2fe', fontFamily: "'JetBrains Mono', monospace", borderBottom: '1px solid var(--neu-border)', paddingBottom: 6 }}>REQUEST PARAMETERS</div>
                
                {/* Method & URL tag */}
                <div style={{ background: 'var(--neu-sunken)', border: '1px solid var(--neu-border)', boxShadow: 'var(--neu-pressed-sm)', padding: '10px 12px', borderRadius: '8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ background: METHOD_COLORS[selectedWf.method] || '#6366f1', color: '#000', fontSize: 9.5, fontWeight: 900, padding: '2px 6px', borderRadius: '4px' }}>
                    {selectedWf.method}
                  </span>
                  <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    /api/{projectId}{selectedWf.path}
                  </span>
                </div>

                {/* Query String Params */}
                <div>
                  <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>Query Params</label>
                  <input type="text" value={testQuery} onChange={e => setTestQuery(e.target.value)} placeholder="e.g. ?limit=10&page=1"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'var(--neu-sunken)',
                      border: '1px solid var(--neu-border)',
                      boxShadow: 'var(--neu-pressed-sm)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: 11.5,
                      fontFamily: "'JetBrains Mono', monospace",
                      padding: '10px 12px',
                      outline: 'none',
                    }} />
                </div>

                {/* Headers String */}
                <div>
                  <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>Headers (JSON)</label>
                  <textarea value={testHeaders} onChange={e => setTestHeaders(e.target.value)} placeholder='{"Authorization": "Bearer token"}' rows={3}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'var(--neu-sunken)',
                      border: '1px solid var(--neu-border)',
                      boxShadow: 'var(--neu-pressed-sm)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono', monospace",
                      padding: '10px 12px',
                      outline: 'none',
                      resize: 'vertical',
                    }} />
                </div>

                {/* JSON Body */}
                {['POST', 'PUT', 'PATCH', 'DELETE'].includes(selectedWf.method) && (
                  <div>
                    <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>JSON Body</label>
                    <textarea value={testBody} onChange={e => setTestBody(e.target.value)} placeholder='{"key": "value"}' rows={4}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        background: 'var(--neu-sunken)',
                        border: '1px solid var(--neu-border)',
                        boxShadow: 'var(--neu-pressed-sm)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: 11,
                        fontFamily: "'JetBrains Mono', monospace",
                        padding: '10px 12px',
                        outline: 'none',
                        resize: 'vertical',
                      }} />
                  </div>
                )}
              </div>

              {/* Right Column: Execution Response Telemetry Console */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#00f2fe', fontFamily: "'JetBrains Mono', monospace", borderBottom: '1px solid var(--neu-border)', paddingBottom: 6 }}>RESPONSE CONSOLE</div>
                {renderConsole()}
              </div>

            </div>

            {/* Bottom Row */}
            <div style={{ display: 'flex', gap: 10, marginTop: 24, borderTop: '1px solid var(--neu-border)', paddingTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowTestModal(false); setTestResult(null); }}
                style={{
                  height: 40,
                  padding: '0 20px',
                  borderRadius: '10px',
                  border: '1px solid var(--neu-border)',
                  background: 'var(--neu-surface)',
                  boxShadow: 'var(--neu-flat-xs)',
                  color: '#94a3b8',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--neu-border)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)'; }}
              >
                Close Sandbox
              </button>
              
              <button onClick={handleTestExecute} disabled={testLoading}
                style={{
                  height: 40,
                  padding: '0 24px',
                  borderRadius: '10px',
                  background: testLoading ? 'var(--neu-surface)' : 'var(--neu-grad-convex)',
                  border: '1px solid var(--neu-border)',
                  boxShadow: testLoading ? 'none' : 'var(--neu-flat-sm)',
                  color: testLoading ? '#64748b' : '#ffffff',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: testLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { if(!testLoading) { e.currentTarget.style.boxShadow = 'var(--neu-flat)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; } }}
                onMouseLeave={e => { if(!testLoading) { e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)'; e.currentTarget.style.borderColor = 'var(--neu-border)'; } }}
              >
                {testLoading ? (
                  <>
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Executing Request...</span>
                  </>
                ) : (
                  <>
                    <Terminal size={13} />
                    <span>Execute Gateway Request</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── WORKFLOW TEMPLATES LIBRARY MODAL ───────────── */}
      {showTemplatesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ background: 'var(--neu-surface)', border: '1px solid var(--neu-border-bevel)', borderRadius: '20px', padding: 30, width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--neu-flat-lg)', display: 'flex', flexDirection: 'column' }} className="scroll-area">
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--neu-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, border: '1px solid var(--neu-border)', borderRadius: '12px', background: 'var(--neu-surface)', boxShadow: 'var(--neu-flat-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={20} style={{ color: '#38bdf8' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workflow Templates</h2>
                  <p style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                    PRE-BUILT ARCHITECTURES{/* · FREE BASIC & PRO ADVANCED */}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowTemplatesModal(false)} style={{ width: 26, height: 26, border: '1px solid var(--neu-border)', borderRadius: '8px', background: 'var(--neu-surface)', boxShadow: 'var(--neu-flat-xs)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={12} />
              </button>
            </div>

            {/* Template Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {WORKFLOW_TEMPLATES.map(tpl => {
                // const isLocked = tpl.isPro && !isPro;
                const isLocked = false; // Everything is free now
                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleApplyTemplate(tpl)}
                    style={{
                      border: isLocked ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid var(--neu-border)',
                      borderRadius: '14px',
                      padding: 16,
                      background: isLocked ? 'var(--neu-sunken)' : 'var(--neu-surface)',
                      boxShadow: isLocked ? 'var(--neu-pressed-sm)' : 'var(--neu-flat-xs)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = isLocked ? 'rgba(0, 242, 254, 0.4)' : 'rgba(255, 255, 255, 0.25)';
                      if (!isLocked) e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = isLocked ? 'rgba(255, 255, 255, 0.04)' : 'var(--neu-border)';
                      if (!isLocked) e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 9,
                          fontFamily: "'JetBrains Mono', monospace",
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: tpl.isPro ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                          color: tpl.isPro ? '#00f2fe' : '#94a3b8',
                          border: tpl.isPro ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid var(--neu-border)',
                          fontWeight: 800,
                          textTransform: 'uppercase'
                        }}>
                          {tpl.category}
                        </span>
                        {/* {tpl.isPro && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: 9,
                            fontFamily: "'JetBrains Mono', monospace",
                            padding: '2px 7px',
                            borderRadius: '6px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            fontWeight: 800
                          }}>
                            <Lock size={9} /> PRO
                          </span>
                        )} */}
                      </div>
                      <span style={{ fontSize: 10, color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>
                        {tpl.nodes.length} Nodes
                      </span>
                    </div>

                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{tpl.title}</h4>
                      <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>{tpl.desc}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--neu-border)' }}>
                      <span style={{ fontSize: 10, color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>
                        {isLocked ? 'Requires Pro Plan' : 'Ready to Instantiate'}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: isLocked ? '#00f2fe' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        {isLocked ? 'Upgrade' : 'Use Template'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── PRO UPGRADE MODAL - Commented out as everything is free now ─────────────────────────── */}
      {/* showUpgradeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: 24 }}>
          <div style={{ background: 'var(--neu-surface)', border: '1px solid var(--neu-border-bevel)', borderRadius: '22px', padding: 34, width: '100%', maxWidth: 500, boxShadow: 'var(--neu-flat-lg)', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--neu-surface)', border: '1px solid var(--neu-border)', boxShadow: 'var(--neu-flat-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Zap size={26} style={{ color: '#00f2fe' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>Upgrade to Pro</h2>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: 24 }}>
              Unlock advanced workflow templates, 12 AI generations per month, unlimited projects, full execution history, and zero ads.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24, textAlign: 'left' }}>
              <div style={{ padding: 16, borderRadius: '12px', border: '1px solid var(--neu-border)', background: 'var(--neu-sunken)', boxShadow: 'var(--neu-pressed-sm)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Pro Monthly</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>₹499<span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>/mo</span></div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>Flexible monthly billing</div>
              </div>

              <div style={{ padding: 16, borderRadius: '12px', border: '1px solid rgba(0, 242, 254, 0.35)', background: 'var(--neu-sunken)', boxShadow: 'var(--neu-pressed-sm)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -8, right: 8, background: '#00f2fe', color: '#000', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>SAVE ₹989</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#00f2fe', textTransform: 'uppercase', marginBottom: 4 }}>Pro Yearly</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>₹4,999<span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>/yr</span></div>
                <div style={{ fontSize: 10, color: '#38bdf8', marginTop: 4 }}>₹417/month effective</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowUpgradeModal(false)}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: '10px',
                  border: '1px solid var(--neu-border)',
                  background: 'var(--neu-surface)',
                  boxShadow: 'var(--neu-flat-xs)',
                  color: '#94a3b8',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--neu-border)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.boxShadow = 'var(--neu-flat-xs)'; }}
              >
                Maybe Later
              </button>
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  window.location.href = '/settings?tab=plan';
                }}
                style={{
                  flex: 1.5,
                  height: 42,
                  borderRadius: '10px',
                  border: '1px solid var(--neu-border)',
                  background: 'var(--neu-grad-convex)',
                  boxShadow: 'var(--neu-flat-sm)',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--neu-flat)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--neu-flat-sm)'; e.currentTarget.style.borderColor = 'var(--neu-border)'; }}
              >
                Go to Plans
              </button>
            </div>
          </div>
        </div>
      ) */}
    </div>
  );
}

// ─── NODE CONFIG CONTEXT & COMPONENT ───────────────────────────────────────
const NodeConfigContext = createContext<{ data: any; onChange: (k: string, v: any) => void } | null>(null);

function Field({ label, fieldKey, type = 'text', placeholder = '' }: any) {
  const ctx = useContext(NodeConfigContext);
  if (!ctx) return null;
  const { data, onChange } = ctx;
  const value = data[fieldKey] || '';

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>{label}</label>
      {type === 'textarea' ? (
        <textarea value={value} onChange={e => onChange(fieldKey, e.target.value)} placeholder={placeholder} rows={5}
          style={{
            width: '100%',
            background: 'rgba(0,0,0,0.3)',
            border: '1.5px solid rgba(0, 242, 254, 0.25)',
            borderRadius: 0,
            padding: '8px 10px',
            color: '#fff',
            fontSize: 11,
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1.5
          }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(fieldKey, e.target.value)} placeholder={placeholder}
          style={{
            width: '100%',
            background: 'rgba(0,0,0,0.3)',
            border: '1.5px solid rgba(0, 242, 254, 0.25)',
            borderRadius: 0,
            padding: '8px 10px',
            color: '#fff',
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            outline: 'none',
            boxSizing: 'border-box'
          }} />
      )}
    </div>
  );
}

// ─── NODE CONFIG PANEL ─────────────────────────────────────────────────────
function NodeConfigPanel({ node, onChange }: { node: Node; onChange: (k: string, v: any) => void }) {
  const data = node.data as any;

  const nodeConfigs: Record<string, React.ReactNode> = {
    triggerNode: (
      <>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>Method</label>
          <CustomSelect
            value={data.method || 'GET'}
            onChange={(val) => onChange('method', val)}
            options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE']}
          />
        </div>
        <Field label="Path" fieldKey="path" placeholder="/api/resource" />
      </>
    ),

    webhookNode: <><Field label="Path" fieldKey="path" placeholder="/webhook/events" /><Field label="Secret" fieldKey="secret" type="password" placeholder="webhook secret" /></>,
    scheduledNode: <><Field label="Cron Expression" fieldKey="cron" placeholder="0 * * * *" /><Field label="Timezone" fieldKey="timezone" placeholder="UTC" /></>,
    databaseNode: <Field label="SQL Query" fieldKey="query" type="textarea" placeholder="SELECT * FROM users WHERE id = $request.params.id;" />,
    customCodeNode: <Field label="JavaScript Code" fieldKey="code" type="textarea" placeholder="const { body } = context.request;\nreturn { processed: true };" />,
    ifElseNode: <Field label="Condition (JS expression)" fieldKey="condition" placeholder="context.request.body.active === true" />,
    switchCaseNode: (
      <>
        <Field label="Expression (JS expression)" fieldKey="expression" placeholder="context.request.body.status" />
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
            Cases (comma-separated, include 'default')
          </label>
          <input
            type="text"
            value={(data.cases || []).join(', ')}
            onChange={e => {
              const val = e.target.value;
              const casesArr = val.split(',').map(s => s.trim()).filter(Boolean);
              onChange('cases', casesArr);
            }}
            placeholder="paid, pending, default"
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.3)',
              border: '1.5px solid rgba(0, 242, 254, 0.25)',
              borderRadius: 0,
              padding: '8px 10px',
              color: '#fff',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </>
    ),
    transformNode: <Field label="Mapping (JS object)" fieldKey="mapping" type="textarea" placeholder="{\n  id: steps.db.id,\n  name: steps.db.name\n}" />,
    httpClientNode: (
      <>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>Method</label>
          <CustomSelect
            value={data.method || 'GET'}
            onChange={(val) => onChange('method', val)}
            options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE']}
          />
        </div>
        <Field label="URL (use $request or $steps to interpolate)" fieldKey="url" placeholder="https://api.github.com/users/$request.body.username" />
        <Field label="Headers (JSON string)" fieldKey="headers" type="textarea" placeholder='{\n  "Content-Type": "application/json"\n}' />
        <Field label="Body (JSON / string / reference)" fieldKey="body" type="textarea" placeholder='{"text": "Hello $request.body.name"}' />
      </>
    ),
    jwtValidateNode: <Field label="JWT Secret (optional override)" fieldKey="secret" type="password" placeholder="uses env.JWT_SECRET if empty" />,
    apiKeyNode: <Field label="Header Name" fieldKey="headerName" placeholder="x-api-key" />,
    gmailNode: (
      <>
        <Field label="Recipient Email (To)" fieldKey="to" placeholder="$request.body.email or user@example.com" />
        <Field label="Email Subject" fieldKey="subject" placeholder="Workflow Notification" />
        <Field label="Email Body / HTML" fieldKey="body" type="textarea" placeholder="Hello $request.body.name,\nYour workflow executed successfully." />
        <Field label="OAuth Access Token / App Password" fieldKey="accessToken" type="password" placeholder="ya29.a0..." />
      </>
    ),
    googleSheetsNode: (
      <>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>Action</label>
          <CustomSelect
            value={data.action || 'APPEND_ROW'}
            onChange={(val) => onChange('action', val)}
            options={['APPEND_ROW', 'READ_ROWS']}
          />
        </div>
        <Field label="Spreadsheet ID" fieldKey="spreadsheetId" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" />
        <Field label="Range" fieldKey="range" placeholder="Sheet1!A1" />
        <Field label="Row Data (JSON Array or $request reference)" fieldKey="rowData" type="textarea" placeholder='["$request.body.name", "$request.body.email"]' />
        <Field label="API Key / Access Token" fieldKey="apiKey" type="password" placeholder="AIzaSy..." />
      </>
    ),
    txtFileNode: (
      <>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>Action</label>
          <CustomSelect
            value={data.action || 'WRITE_FILE'}
            onChange={(val) => onChange('action', val)}
            options={['READ_FILE', 'WRITE_FILE', 'APPEND_FILE']}
          />
        </div>
        <Field label="File Path" fieldKey="filePath" placeholder="./data/output.txt" />
        <Field label="Content (for Write/Append)" fieldKey="content" type="textarea" placeholder="$request.body.text or Static Log String" />
      </>
    ),
    aiNode: (
      <>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>AI Provider</label>
          <CustomSelect
            value={data.provider || 'bharatcode'}
            onChange={(val) => onChange('provider', val)}
            options={['bharatcode', /* 'groq', 'ollama', */ 'gemini', 'claude', 'openai']}
          />
        </div>
        <Field label="Model Name" fieldKey="model" placeholder={data.provider === 'bharatcode' ? 'qwen-3.8-27b' : data.provider === 'gemini' ? 'gemini-1.5-flash' : data.provider === 'claude' ? 'claude-3-5-sonnet' : data.provider === 'openai' ? 'gpt-4o-mini' : 'qwen-3.8-27b'} />
        <Field label="API Key (Leave blank to use server ENV)" fieldKey="apiKey" type="password" placeholder="bc_live_... / BharatCode API Key" />
        <Field label="System Prompt" fieldKey="systemPrompt" type="textarea" placeholder="You are a helpful assistant." />
        <Field label="User Prompt (use $request or $steps)" fieldKey="prompt" type="textarea" placeholder="Summarize this text: $request.body.content" />
      </>
    ),
    responseNode: (
      <>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>Status Code</label>
          <input type="number" value={data.statusCode || 200} onChange={e => onChange('statusCode', parseInt(e.target.value))}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.3)',
              border: '1.5px solid rgba(0, 242, 254, 0.25)',
              borderRadius: 0,
              padding: '8px 10px',
              color: '#fff',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              outline: 'none',
              boxSizing: 'border-box'
            }} />
        </div>
        <Field label="Body (use $steps.nodeId to reference)" fieldKey="body" type="textarea" placeholder="$steps.db_query" />
        <Field label="Custom Response Headers (JSON string)" fieldKey="headers" type="textarea" placeholder='{\n  "Content-Type": "text/html"\n}' />
        <Field label="Redirect URL (optional override)" fieldKey="redirectUrl" placeholder="https://example.com or $steps.codeNode.url" />
      </>
    ),
  };

  return (
    <NodeConfigContext.Provider value={{ data, onChange }}>
      <div>
        <div style={{ padding: '8px 12px', background: 'rgba(0, 242, 254, 0.05)', border: '1px solid rgba(0, 242, 254, 0.25)', marginBottom: 16 }}>
          <div style={{ fontSize: 9, color: '#00f2fe', fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}>NODE TELEMETRY KEY</div>
          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{node.id}</div>
        </div>
        {nodeConfigs[node.type as string] || <div style={{ color: '#475569', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>NO DIAGNOSTICS CONFIGURATION AVAILABLE.</div>}
      </div>
    </NodeConfigContext.Provider>
  );
}
