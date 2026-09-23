import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  WhyWhyAnalysis, 
  WhyWhyBranch, 
  WhyNode, 
  BranchAxis, 
  Judgement 
} from '../types';
import { 
  createWhyNode, 
  createWhyWhyBranch, 
  addChildNode, 
  addSiblingNode, 
  updateNodeInTree, 
  deleteNodeFromTree, 
  recomputeRootCauses, 
  checkHumanErrorDescription 
} from '../utils/whyWhyUtils';
import { 
  Target, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  FileText, 
  Layers, 
  ArrowRight,
  Sparkles,
  GitFork,
  Maximize2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/* -------------------------------------------------------------------------- */
/* Constants & Layout Settings                                                */
/* -------------------------------------------------------------------------- */

const NODE_W = 240;
const NODE_H = 110;
const COL_W = 320;
const ROW_H = 135;
const PAD_X = 60;
const PAD_Y = 60;

const AXIS_CONFIG: Record<BranchAxis, { label: string; icon: string; badge: string }> = {
  occurrence: {
    label: 'การเกิดปัญหา (Occurrence)',
    icon: '🎯',
    badge: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
  },
  detection: {
    label: 'การตรวจจับ (Detection / Spill)',
    icon: '🔍',
    badge: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
  },
  recurrence: {
    label: 'การเกิดซ้ำ / การป้องกัน (Recurrence)',
    icon: '🔁',
    badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
  }
};

const JUDGEMENT_BADGES: Record<Judgement, { label: string; badgeStyle: string; icon: string }> = {
  PENDING: {
    label: 'รอพิสูจน์',
    badgeStyle: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700',
    icon: '⏳'
  },
  OK: {
    label: 'ผ่าน (OK)',
    badgeStyle: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700',
    icon: '✓'
  },
  NG: {
    label: 'NG',
    badgeStyle: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700',
    icon: '✕'
  }
};

/* -------------------------------------------------------------------------- */
/* Tidy-Tree Horizontal Layout Calculation                                    */
/* -------------------------------------------------------------------------- */

interface LayoutNode {
  node: WhyNode;
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId?: string;
  isCollapsed: boolean;
  hasChildren: boolean;
}

interface LayoutLink {
  fromNodeId: string;
  toNodeId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function computeTidyTreeLayout(
  root: WhyNode,
  collapsedIds: Set<string>
): { nodes: LayoutNode[]; links: LayoutLink[]; bounds: { width: number; height: number } } {
  const nodes: LayoutNode[] = [];
  const links: LayoutLink[] = [];
  let leafCounter = 0;

  function traverse(node: WhyNode, depth: number, parentId?: string): { x: number; y: number } {
    const isCollapsed = collapsedIds.has(node.id);
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const visibleChildren = (!isCollapsed && hasChildren) ? node.children : [];
    const x = (depth - 1) * COL_W + PAD_X;

    let y: number;

    if (visibleChildren.length === 0) {
      // Leaf node or collapsed parent
      y = leafCounter * ROW_H + PAD_Y;
      leafCounter++;
    } else {
      // Internal node: recursively layout children first
      const childPositions = visibleChildren.map(child => traverse(child, depth + 1, node.id));
      const firstChildY = childPositions[0].y;
      const lastChildY = childPositions[childPositions.length - 1].y;
      y = (firstChildY + lastChildY) / 2;
    }

    const layoutNode: LayoutNode = {
      node,
      depth,
      x,
      y,
      width: NODE_W,
      height: NODE_H,
      parentId,
      isCollapsed,
      hasChildren
    };
    nodes.push(layoutNode);

    return { x, y };
  }

  traverse(root, 1);

  // Build links between parent and visible child nodes
  const nodeMap = new Map<string, LayoutNode>();
  nodes.forEach(n => nodeMap.set(n.node.id, n));

  nodes.forEach(child => {
    if (child.parentId) {
      const parent = nodeMap.get(child.parentId);
      if (parent) {
        links.push({
          fromNodeId: parent.node.id,
          toNodeId: child.node.id,
          x1: parent.x + parent.width,
          y1: parent.y + parent.height / 2,
          x2: child.x,
          y2: child.y + child.height / 2
        });
      }
    }
  });

  // Calculate bounding box
  let maxX = 0;
  let maxY = 0;
  nodes.forEach(n => {
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y + n.height > maxY) maxY = n.y + n.height;
  });

  const width = Math.max(maxX + PAD_X * 2, 880);
  const height = Math.max(maxY + PAD_Y * 2, 540);

  return { nodes, links, bounds: { width, height } };
}

/* -------------------------------------------------------------------------- */
/* Component Props                                                            */
/* -------------------------------------------------------------------------- */

export interface WhyWhyCanvasBuilderProps {
  value: WhyWhyAnalysis;
  onChange: (updated: WhyWhyAnalysis) => void;
  machineName?: string;
  readOnly?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

export const WhyWhyCanvasBuilder: React.FC<WhyWhyCanvasBuilderProps> = ({
  value,
  onChange,
  machineName,
  readOnly = false
}) => {
  // Active branch selection
  const [activeBranchId, setActiveBranchId] = useState<string>(
    value.branches?.[0]?.id || ''
  );

  // Sync active branch if branch list changes
  useEffect(() => {
    if (value.branches && value.branches.length > 0) {
      if (!value.branches.some(b => b.id === activeBranchId)) {
        setActiveBranchId(value.branches[0].id);
      }
    }
  }, [value.branches, activeBranchId]);

  const activeBranch = useMemo(() => {
    return value.branches?.find(b => b.id === activeBranchId) || value.branches?.[0] || null;
  }, [value.branches, activeBranchId]);

  // Collapsed nodes state
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Pan and Zoom
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 30, y: 30 });
  const [zoom, setZoom] = useState<number>(1);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isExporting, setIsExporting] = useState(false);
  // Canvas mode: 'edit' or 'view' (clean presentation mode, default 'view')
  const [canvasMode, setCanvasMode] = useState<'view' | 'edit'>('view');

  // References
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);

  // Helper to count nodes
  const countNodes = useCallback((node: WhyNode): number => {
    let count = 1;
    if (node.children) {
      node.children.forEach(c => {
        count += countNodes(c);
      });
    }
    return count;
  }, []);

  // Compute Layout
  const layout = useMemo(() => {
    if (!activeBranch || !activeBranch.root) {
      return { nodes: [], links: [], bounds: { width: 880, height: 540 } };
    }
    return computeTidyTreeLayout(activeBranch.root, collapsedIds);
  }, [activeBranch, collapsedIds]);

  // Non-passive wheel handler for zoom
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom(prev => {
        const next = Math.min(Math.max(prev + zoomFactor, 0.4), 1.6);
        return Math.round(next * 100) / 100;
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Pan interactions
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on empty background
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.closest('input')
    ) {
      return;
    }
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Branch updates
  const handleUpdateActiveBranch = useCallback((patch: Partial<WhyWhyBranch>) => {
    if (readOnly || !activeBranch) return;
    const updatedBranches = value.branches.map(b => 
      b.id === activeBranch.id ? { ...b, ...patch } : b
    );
    onChange({
      ...value,
      branches: updatedBranches,
      updatedAt: new Date().toISOString()
    });
  }, [activeBranch, onChange, readOnly, value]);

  // Node Mutations (Funneled through whyWhyUtils)
  const handleUpdateNodeDescription = (nodeId: string, description: string) => {
    if (readOnly || !activeBranch) return;
    const hasHumanError = checkHumanErrorDescription(description);
    const rawRoot = updateNodeInTree(activeBranch.root, nodeId, {
      description,
      humanErrorFlag: hasHumanError
    });
    const updatedRoot = recomputeRootCauses(rawRoot);
    handleUpdateActiveBranch({ root: updatedRoot });
  };

  const handleAddChild = (parentId: string) => {
    if (readOnly || !activeBranch) return;
    // Auto expand if collapsed
    if (collapsedIds.has(parentId)) {
      setCollapsedIds(prev => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    }
    const newNode = createWhyNode();
    const rawRoot = addChildNode(activeBranch.root, parentId, newNode);
    const updatedRoot = recomputeRootCauses(rawRoot);
    handleUpdateActiveBranch({ root: updatedRoot });
  };

  const handleAddSibling = (targetId: string) => {
    if (readOnly || !activeBranch) return;
    const newNode = createWhyNode();
    const res = addSiblingNode(activeBranch.root, targetId, newNode);
    const baseRoot = res.added
      ? res.root
      : addChildNode(activeBranch.root, targetId, newNode);
    const updatedRoot = recomputeRootCauses(baseRoot);
    handleUpdateActiveBranch({ root: updatedRoot });
  };

  const handleDeleteNode = (targetId: string) => {
    if (readOnly || !activeBranch) return;
    if (targetId === activeBranch.root.id) return;
    const res = deleteNodeFromTree(activeBranch.root, targetId);
    if (res.deleted) {
      const updatedRoot = recomputeRootCauses(res.root);
      handleUpdateActiveBranch({ root: updatedRoot });
    }
  };

  const toggleCollapse = (nodeId: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleCreateBranch = (axis: BranchAxis) => {
    if (readOnly) return;
    const initialText = axis === 'occurrence' ? value.phenomenon : '';
    const newBranch = createWhyWhyBranch(axis, initialText);
    const updatedBranches = [...(value.branches || []), newBranch];
    onChange({
      ...value,
      branches: updatedBranches,
      updatedAt: new Date().toISOString()
    });
    setActiveBranchId(newBranch.id);
  };

  // Export File Names
  const generateExportBaseName = () => {
    const cleanMachine = (machineName || value.machineId || 'Machine')
      .replace(/[^a-zA-Z0-9ก-๙_-]/g, '_');
    const cleanPhenomenon = (value.phenomenon || 'WhyWhy')
      .slice(0, 24)
      .replace(/[^a-zA-Z0-9ก-๙_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    return `WhyWhy_${cleanMachine}_${cleanPhenomenon}_${dateStr}`;
  };

  // Export to PNG (temporarily capture in clean view mode)
  const handleExportPng = async () => {
    if (!contentWrapperRef.current) return;
    try {
      setIsExporting(true);
      const prevPan = { ...pan };
      const prevZoom = zoom;
      const prevMode = canvasMode;

      // Temporarily switch to clean view mode and normalize viewport
      setCanvasMode('view');
      setPan({ x: 30, y: 30 });
      setZoom(1);

      await new Promise(resolve => setTimeout(resolve, 150));

      const canvas = await html2canvas(contentWrapperRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${generateExportBaseName()}.png`;
      link.href = imgData;
      link.click();

      // Restore pan, zoom, and mode
      setPan(prevPan);
      setZoom(prevZoom);
      setCanvasMode(prevMode);
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF (temporarily capture in clean view mode)
  const handleExportPdf = async () => {
    if (!contentWrapperRef.current) return;
    try {
      setIsExporting(true);
      const prevPan = { ...pan };
      const prevZoom = zoom;
      const prevMode = canvasMode;

      // Temporarily switch to clean view mode and normalize viewport
      setCanvasMode('view');
      setPan({ x: 30, y: 30 });
      setZoom(1);

      await new Promise(resolve => setTimeout(resolve, 150));

      const canvas = await html2canvas(contentWrapperRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const isLandscape = canvas.width > canvas.height;
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pageWidth - margin * 2;
      const usableH = pageHeight - margin * 2;

      const imgRatio = canvas.width / canvas.height;
      let finalW = usableW;
      let finalH = finalW / imgRatio;

      if (finalH > usableH) {
        finalH = usableH;
        finalW = finalH * imgRatio;
      }

      const x = margin + (usableW - finalW) / 2;
      const y = margin + (usableH - finalH) / 2;

      pdf.addImage(imgData, 'JPEG', x, y, finalW, finalH);
      pdf.save(`${generateExportBaseName()}.pdf`);

      // Restore pan, zoom, and mode
      setPan(prevPan);
      setZoom(prevZoom);
      setCanvasMode(prevMode);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-950 rounded-2xl border border-border dark:border-slate-800 overflow-hidden shadow-xs">
      {/* -------------------------------------------------------------------- */}
      {/* Top Header: Diagram Title Input & Clean Presentation Mode Toggle     */}
      {/* -------------------------------------------------------------------- */}
      <div className="p-3 sm:px-4 sm:py-3 bg-white dark:bg-slate-900 border-b border-border dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
            ชื่อผัง:
          </span>
          <input
            type="text"
            disabled={readOnly}
            value={value.phenomenon || ''}
            placeholder="ผังร่างไม่มีชื่อ (ระบุชื่อผัง/อาการเสีย)"
            onChange={(e) => {
              const newTitle = e.target.value;
              onChange({
                ...value,
                phenomenon: newTitle,
                updatedAt: new Date().toISOString()
              });
            }}
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 dark:focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition min-w-[200px]"
          />
          {machineName ? (
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 shrink-0">
              {machineName}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
              ผังลอย (Draft)
            </span>
          )}
        </div>

        {/* View vs Edit Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 shrink-0">
          <button
            type="button"
            onClick={() => setCanvasMode('view')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              canvasMode === 'view'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="โหมดดู/นำเสนอ: แสดงผังคลีนแบบ Node-RED ซ่อนกล่องพิมพ์และปุ่มควบคุม"
          >
            <span>👁</span>
            <span>ดู</span>
          </button>
          <button
            type="button"
            onClick={() => setCanvasMode('edit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              canvasMode === 'edit'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="โหมดแก้ไข: แสดงกล่องพิมพ์และปุ่มเพิ่มลูกศร/ช่องขนาน"
          >
            <span>✏️</span>
            <span>แก้ไข</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Header Toolbar: Branches, Viewport Controls, Export Buttons          */}
      {/* -------------------------------------------------------------------- */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-b border-border dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Branch Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60">
            {value.branches?.map(b => {
              const cfg = AXIS_CONFIG[b.axis];
              const isActive = b.id === activeBranchId;
              const count = countNodes(b.root);

              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setActiveBranchId(b.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{cfg?.icon}</span>
                  <span className="hidden sm:inline">{cfg?.label.split(' ')[0]}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Add Branch Dropdown if missing axes */}
          {!readOnly && (value.branches?.length || 0) < 3 && (
            <div className="flex items-center gap-1">
              {(['detection', 'recurrence', 'occurrence'] as BranchAxis[])
                .filter(axis => !value.branches.some(b => b.axis === axis))
                .slice(0, 1)
                .map(missingAxis => (
                  <button
                    key={missingAxis}
                    type="button"
                    onClick={() => handleCreateBranch(missingAxis)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold border border-dashed border-cyan-400 text-cyan-700 dark:text-cyan-400 bg-cyan-50/60 dark:bg-cyan-950/30 hover:bg-cyan-100 rounded-lg transition cursor-pointer"
                    title={`เพิ่มกิ่ง ${AXIS_CONFIG[missingAxis]?.label}`}
                  >
                    <Plus size={13} />
                    <span>เพิ่มกิ่ง {AXIS_CONFIG[missingAxis]?.label.split(' ')[0]}</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Viewport & Export Action Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom & Pan Controls */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700/60 p-0.5">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(Math.round((z - 0.1) * 10) / 10, 0.4))}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded transition cursor-pointer"
              title="ซูมออก (-)"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 px-2 select-none min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(Math.round((z + 0.1) * 10) / 10, 1.6))}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded transition cursor-pointer"
              title="ซูมเข้า (+)"
            >
              <ZoomIn size={14} />
            </button>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />
            <button
              type="button"
              onClick={() => {
                setPan({ x: 30, y: 30 });
                setZoom(1);
              }}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded transition cursor-pointer"
              title="รีเซ็ตมุมมอง (100%)"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Export PNG */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportPng}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
            title="บันทึกรูปภาพผังแบบ PNG คมชัดสูง"
          >
            <Download size={13} className="text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">บันทึกรูป PNG</span>
            <span className="sm:hidden">PNG</span>
          </button>

          {/* Export PDF */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
            title="ส่งออกเอกสารผัง Why-Why เป็นไฟล์ PDF (A4)"
          >
            <FileText size={13} />
            <span className="hidden sm:inline">บันทึก PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      {/* Guide Banner */}
      <div className="px-4 py-2 bg-cyan-50/70 dark:bg-cyan-950/20 border-b border-cyan-100 dark:border-cyan-900/40 text-[11px] text-cyan-900 dark:text-cyan-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span>💡 <strong>ผังสร้างซ้าย→ขวา:</strong> กด <strong>"➕ ลูกศร→ลูก"</strong> เพื่อแตกสาเหตุลึกลงไปทางขวา หรือ <strong>"➕ ช่องขนาน"</strong> เพื่อเพิ่มสาเหตุร่วมไล่ลงล่าง</span>
        </div>
        <span className="text-slate-400 dark:text-slate-500 text-[10px]">
          (ลากพื้นหลังเพื่อเลื่อนดู / หมุนล้อเมาส์เพื่อซูม)
        </span>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Interactive Infinite Canvas Viewport                                 */}
      {/* -------------------------------------------------------------------- */}
      <div
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`relative w-full h-[620px] overflow-hidden select-none cursor-grab active:cursor-grabbing bg-slate-50 dark:bg-slate-950 ${
          isPanning ? 'cursor-grabbing' : ''
        }`}
      >
        {/* Background Engineering Grid */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, #0891b2 1px, transparent 1px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        />

        {/* Content Container (Transformed via Pan & Zoom) */}
        <div
          ref={contentWrapperRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: `${layout.bounds.width}px`,
            height: `${layout.bounds.height}px`
          }}
          className="absolute top-0 left-0 transition-transform duration-75 ease-out"
        >
          {/* LAYER 1: SVG Arrow Links (Behind) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ width: layout.bounds.width, height: layout.bounds.height }}
          >
            <defs>
              <marker
                id="canvas-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0891b2" />
              </marker>
            </defs>

            {layout.links.map(link => {
              const dx = Math.max((link.x2 - link.x1) * 0.5, 36);
              const pathD = `M ${link.x1} ${link.y1} C ${link.x1 + dx} ${link.y1}, ${link.x2 - dx} ${link.y2}, ${link.x2} ${link.y2}`;

              return (
                <path
                  key={`${link.fromNodeId}->${link.toNodeId}`}
                  d={pathD}
                  fill="none"
                  stroke="#0891b2"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  markerEnd="url(#canvas-arrow)"
                />
              );
            })}
          </svg>

          {/* LAYER 2: HTML Absolute Positioned Cards (In Front) */}
          <div className="absolute inset-0 pointer-events-none">
            {layout.nodes.map(item => {
              const { node, depth, x, y, width, height, isCollapsed, hasChildren } = item;
              const judgementInfo = JUDGEMENT_BADGES[node.judgement];
              const isRootNode = activeBranch && node.id === activeBranch.root.id;

              return (
                <div
                  key={node.id}
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${width}px`,
                    minHeight: `${height}px`
                  }}
                  className={`absolute pointer-events-auto rounded-xl flex flex-col justify-between transition-all duration-150 border shadow-xs ${
                    canvasMode === 'view' ? 'p-2' : 'p-2.5'
                  } ${
                    node.isRootCause
                      ? 'bg-rose-50/95 dark:bg-rose-950/80 border-rose-500 dark:border-rose-600 ring-2 ring-rose-500/20 shadow-md'
                      : 'bg-white/95 dark:bg-slate-900/95 border-slate-300 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-600'
                  }`}
                >
                  {/* Card Header: Level Indicator + Status Badge + Root Cause */}
                  <div className={`flex items-center justify-between gap-1 pb-1 ${
                    canvasMode === 'view' ? '' : 'border-b border-slate-200/80 dark:border-slate-800'
                  }`}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                        Why {depth}
                      </span>

                      {/* Judgement Badge (Read-only on canvas per standard) */}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${judgementInfo.badgeStyle}`}>
                        {judgementInfo.icon} {judgementInfo.label}
                      </span>

                      {/* Root Cause Badge */}
                      {node.isRootCause && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white shadow-xs animate-in zoom-in-95 duration-150">
                          <Target size={11} /> Root Cause
                        </span>
                      )}

                      {/* Human Error Flag */}
                      {node.humanErrorFlag && (
                        <span
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                          title="อย่าจบที่คน — ถามต่อว่าระบบ/มาตรฐานใดทำให้คนพลาดได้"
                        >
                          <AlertTriangle size={11} className="text-amber-600 dark:text-amber-400" />
                          <span>เตือนคน</span>
                        </span>
                      )}
                    </div>

                    {/* Collapse / Expand Toggle (Hidden in view mode per spec) */}
                    {canvasMode === 'edit' && hasChildren && (
                      <button
                        type="button"
                        onClick={() => toggleCollapse(node.id)}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                        title={isCollapsed ? 'ขยายกิ่งลูก' : 'ยุบกิ่งลูก'}
                      >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </div>

                  {/* Card Description: Plain text in view mode, textarea in edit mode */}
                  {canvasMode === 'view' ? (
                    <div className="my-1 px-0.5 text-xs text-slate-800 dark:text-slate-100 leading-snug break-words">
                      {node.description?.trim() ? (
                        node.description
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic font-normal">(ยังไม่ระบุ)</span>
                      )}
                    </div>
                  ) : (
                    <div className="my-1.5">
                      <textarea
                        rows={2}
                        disabled={readOnly}
                        value={node.description}
                        onChange={(e) => handleUpdateNodeDescription(node.id, e.target.value)}
                        placeholder={`ทำไมในชั้นที่ ${depth}?`}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 dark:focus:border-cyan-500 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-100 resize-none focus:outline-none transition leading-tight"
                      />
                    </div>
                  )}

                  {/* Card Actions Footer: Hidden in view mode per spec */}
                  {canvasMode === 'edit' && !readOnly && (
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1">
                        {/* Add Child (Creates arrow to child on right) */}
                        <button
                          type="button"
                          onClick={() => handleAddChild(node.id)}
                          className="flex items-center gap-1 px-2 py-0.5 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900 border border-cyan-300 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 rounded text-[10px] font-bold transition cursor-pointer"
                          title="เพิ่มลูกศรไปช่องลูกทางขวา (Child Why)"
                        >
                          <Plus size={11} />
                          <span>ลูกศร→ลูก</span>
                        </button>

                        {/* Add Parallel Sibling (Fans down) */}
                        <button
                          type="button"
                          onClick={() => handleAddSibling(node.id)}
                          className="flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold transition cursor-pointer"
                          title="เพิ่มช่องคู่ขนานใต้พ่อเดียวกัน (Sibling)"
                        >
                          <Plus size={11} />
                          <span>ช่องขนาน</span>
                        </button>
                      </div>

                      {/* Delete Node (Cannot delete root of branch) */}
                      {!isRootNode && (
                        <button
                          type="button"
                          onClick={() => handleDeleteNode(node.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition cursor-pointer"
                          title="ลบ Why นี้และลูกทั้งหมด"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
