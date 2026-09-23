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
  checkHumanErrorDescription,
  getBranchRoots,
  CHANGE_POINT_EXPLANATION,
  buildReverseLogicSentence
} from '../utils/whyWhyUtils';

function findNodeInRoots(roots: WhyNode[], id: string): WhyNode | null {
  for (const r of roots) {
    if (r.id === id) return r;
    if (r.children && r.children.length > 0) {
      const found = findNodeInRoots(r.children, id);
      if (found) return found;
    }
  }
  return null;
}
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
  Maximize2,
  Minimize2,
  Undo2,
  Redo2,
  Check,
  HelpCircle
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
  treeIndex: number;
  whyLabel: string;
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
  roots: WhyNode[],
  collapsedIds: Set<string>
): { nodes: LayoutNode[]; links: LayoutLink[]; bounds: { width: number; height: number } } {
  const nodes: LayoutNode[] = [];
  const links: LayoutLink[] = [];
  let leafCounter = 0;

  function traverse(node: WhyNode, depth: number, treeIndex: number, parentId?: string): { x: number; y: number } {
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
      const childPositions = visibleChildren.map(child => traverse(child, depth + 1, treeIndex, node.id));
      const firstChildY = childPositions[0].y;
      const lastChildY = childPositions[childPositions.length - 1].y;
      y = (firstChildY + lastChildY) / 2;
    }

    const whyLabel = `Why ${treeIndex}.${depth}`;

    const layoutNode: LayoutNode = {
      node,
      depth,
      treeIndex,
      whyLabel,
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

  roots.forEach((root, idx) => {
    if (idx > 0) {
      leafCounter += 0.25; // Clean separation between root trees
    }
    const treeIndex = idx + 1; // 1, 2, 3...
    traverse(root, 1, treeIndex);
  });

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

  const branchRoots = useMemo(() => {
    return getBranchRoots(activeBranch);
  }, [activeBranch]);

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
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  // Selected node state for visual focus and keyboard Delete
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Esc key listener to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // References
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);

  // Editing node text state (supports double click in view mode or focus edit)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Inline Guardrail errors per node
  const [nodeErrors, setNodeErrors] = useState<Record<string, string>>({});

  // 4M & Constant State Side Guide visibility
  const [show4MGuide, setShow4MGuide] = useState<boolean>(true);

  // Auto-draft Reverse Logic notification alert
  const [draftAlert, setDraftAlert] = useState<string | null>(null);

  // Undo / Redo History Stacks
  const [history, setHistory] = useState<WhyWhyAnalysis[]>([]);
  const [redoStack, setRedoStack] = useState<WhyWhyAnalysis[]>([]);

  // Push snapshot to history before mutating
  const pushHistorySnapshot = useCallback(() => {
    setHistory(prev => [...prev.slice(-25), JSON.parse(JSON.stringify(value))]);
    setRedoStack([]);
  }, [value]);

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (readOnly || history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(value))]);
    onChange(previous);
  }, [history, onChange, readOnly, value]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (readOnly || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(value))]);
    onChange(next);
  }, [onChange, readOnly, redoStack, value]);

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

  const countBranchTotalNodes = useCallback((branch?: WhyWhyBranch | null): number => {
    if (!branch) return 0;
    const roots = getBranchRoots(branch);
    return roots.reduce((acc, r) => acc + countNodes(r), 0);
  }, [countNodes]);

  // Compute Layout
  const layout = useMemo(() => {
    if (!activeBranch || branchRoots.length === 0) {
      return { nodes: [], links: [], bounds: { width: 880, height: 540 } };
    }
    return computeTidyTreeLayout(branchRoots, collapsedIds);
  }, [activeBranch, branchRoots, collapsedIds]);

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
      target.closest('input') ||
      target.closest('.canvas-node-card')
    ) {
      return;
    }
    setSelectedNodeId(null);
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
  const handleUpdateActiveBranch = useCallback((patch: Partial<WhyWhyBranch>, skipHistory: boolean = false) => {
    if (readOnly || !activeBranch) return;
    if (!skipHistory) {
      pushHistorySnapshot();
    }
    const updatedBranches = value.branches.map(b => 
      b.id === activeBranch.id ? { ...b, ...patch } : b
    );
    onChange({
      ...value,
      branches: updatedBranches,
      updatedAt: new Date().toISOString()
    });
  }, [activeBranch, onChange, pushHistorySnapshot, readOnly, value]);

  // Node Mutations across multiple roots
  const handleUpdateNodeDescription = (nodeId: string, description: string) => {
    if (readOnly || !activeBranch) return;
    const hasHumanError = checkHumanErrorDescription(description);
    const updatedRoots = branchRoots.map(r => {
      const raw = updateNodeInTree(r, nodeId, {
        description,
        humanErrorFlag: hasHumanError
      });
      return recomputeRootCauses(raw);
    });
    // Skip history snapshot on every keystroke
    handleUpdateActiveBranch({
      roots: updatedRoots,
      root: updatedRoots[0]
    }, true);
  };

  // Node Judgement update with guardrails (เหมือน indent, ไม่ลามลงลูก)
  const handleUpdateNodeJudgement = (nodeId: string, judgement: Judgement) => {
    if (readOnly || !activeBranch) return;

    if (judgement === 'NG') {
      const targetNode = findNodeInRoots(branchRoots, nodeId);

      // Guardrail 1: Block NG if changePointOk is false
      if (targetNode && targetNode.changePointOk === false) {
        setNodeErrors(prev => ({
          ...prev,
          [nodeId]: CHANGE_POINT_EXPLANATION.guardrailError
        }));
        return;
      }

      // Guardrail 2: Reverse logic check is mandatory before confirming NG
      if (!activeBranch.reverseLogicCheck || !activeBranch.reverseLogicCheck.trim()) {
        setNodeErrors(prev => ({
          ...prev,
          [nodeId]: 'กรอกการอ่านย้อนกลับ (Reverse Logic) ก่อนสรุป NG'
        }));
        return;
      }
    }

    // Clear error on this node if valid or setting PENDING/OK
    setNodeErrors(prev => {
      if (!prev[nodeId]) return prev;
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });

    const updatedRoots = branchRoots.map(r => {
      const raw = updateNodeInTree(r, nodeId, { judgement });
      return recomputeRootCauses(raw);
    });
    handleUpdateActiveBranch({
      roots: updatedRoots,
      root: updatedRoots[0]
    });
  };

  // Auto-draft Reverse Logic sentence ("เพราะ...จึง...") from Why nodes
  const handleAutoDraftReverseLogic = useCallback(() => {
    if (readOnly || !activeBranch) return;

    // Traces the primary root (activeBranch.root or branchRoots[0])
    const targetRoot = branchRoots[0] || activeBranch.root;
    const sentence = buildReverseLogicSentence(targetRoot);

    if (!sentence) {
      setDraftAlert('ใส่ข้อความในกล่อง Why อย่างน้อย 2 ชั้นก่อน');
      setTimeout(() => setDraftAlert(null), 3500);
      return;
    }

    if (activeBranch.reverseLogicCheck && activeBranch.reverseLogicCheck.trim()) {
      const ok = typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm('มีข้อความในช่อง Reverse Logic อยู่แล้ว ต้องการเขียนทับด้วยข้อความที่ช่วยร่างใหม่หรือไม่?')
        : true;
      if (!ok) return;
    }

    setDraftAlert(null);
    setNodeErrors(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(k => {
        if (next[k].includes('Reverse Logic') || next[k].includes('การอ่านย้อนกลับ')) {
          delete next[k];
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    handleUpdateActiveBranch({ reverseLogicCheck: sentence });
  }, [readOnly, activeBranch, branchRoots, handleUpdateActiveBranch]);

  // Toggle 4M Change Point on node
  const handleToggleChangePoint = (nodeId: string, currentVal: boolean = true) => {
    if (readOnly || !activeBranch) return;
    setNodeErrors(prev => {
      if (!prev[nodeId]) return prev;
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
    const updatedRoots = branchRoots.map(r => {
      const raw = updateNodeInTree(r, nodeId, { changePointOk: !currentVal });
      return recomputeRootCauses(raw);
    });
    handleUpdateActiveBranch({
      roots: updatedRoots,
      root: updatedRoots[0]
    });
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
    const updatedRoots = branchRoots.map(r => {
      const raw = addChildNode(r, parentId, newNode);
      return recomputeRootCauses(raw);
    });
    handleUpdateActiveBranch({
      roots: updatedRoots,
      root: updatedRoots[0]
    });
  };

  const handleAddSibling = (targetId: string) => {
    if (readOnly || !activeBranch) return;
    const newNode = createWhyNode();
    const updatedRoots = branchRoots.map(r => {
      const res = addSiblingNode(r, targetId, newNode);
      const base = res.added ? res.root : r;
      return recomputeRootCauses(base);
    });
    handleUpdateActiveBranch({
      roots: updatedRoots,
      root: updatedRoots[0]
    });
  };

  // Add another starting root cause Why 1 (Why พ่ออีก - จุดเริ่มของสาเหตุอื่น)
  const handleAddRoot = () => {
    if (readOnly || !activeBranch) return;
    const newRoot = createWhyNode('', true);
    const updatedRoots = [...branchRoots, newRoot];
    handleUpdateActiveBranch({
      roots: updatedRoots,
      root: updatedRoots[0]
    });
  };

  const handleDeleteNode = useCallback((targetId: string) => {
    if (readOnly || !activeBranch) return;
    const isRoot = branchRoots.some(r => r.id === targetId);
    if (isRoot) {
      if (branchRoots.length > 1) {
        // Delete this Why 1 root
        const updatedRoots = branchRoots.filter(r => r.id !== targetId);
        handleUpdateActiveBranch({
          roots: updatedRoots,
          root: updatedRoots[0]
        });
      } else {
        // Clear text and children of the only root
        const resetRoot: WhyNode = {
          ...branchRoots[0],
          description: '',
          children: [],
          isRootCause: false
        };
        handleUpdateActiveBranch({
          roots: [resetRoot],
          root: resetRoot
        });
      }
      return;
    }

    const updatedRoots = branchRoots.map(r => {
      const res = deleteNodeFromTree(r, targetId);
      return res.deleted ? recomputeRootCauses(res.root) : r;
    });
    handleUpdateActiveBranch({
      roots: updatedRoots,
      root: updatedRoots[0]
    });
  }, [readOnly, activeBranch, branchRoots, handleUpdateActiveBranch]);

  // Keyboard shortcut listener: Undo (Ctrl+Z / Cmd+Z), Redo (Ctrl+Y / Ctrl+Shift+Z), and Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z / Cmd+Z (Undo) and Ctrl+Y / Ctrl+Shift+Z (Redo)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const activeTag = document.activeElement?.tagName;
        // If actively typing inside input or textarea, let browser handle native text undo
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeTag = document.activeElement?.tagName;
        // Do not intercept if typing in text inputs
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
          return;
        }

        if (selectedNodeId && !readOnly && activeBranch) {
          e.preventDefault();
          handleDeleteNode(selectedNodeId);
          setSelectedNodeId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, readOnly, activeBranch, handleDeleteNode, handleUndo, handleRedo]);

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

  const handleDeleteBranch = (branchId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (readOnly) return;
    if (!value.branches || value.branches.length <= 1) {
      return;
    }
    const remaining = value.branches.filter(b => b.id !== branchId);
    if (activeBranchId === branchId && remaining.length > 0) {
      setActiveBranchId(remaining[0].id);
    }
    onChange({
      ...value,
      branches: remaining,
      updatedAt: new Date().toISOString()
    });
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
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col w-screen h-screen overflow-hidden'
          : 'flex flex-col bg-slate-50 dark:bg-slate-950 rounded-2xl border border-border dark:border-slate-800 overflow-hidden shadow-xs'
      }
    >
      {/* -------------------------------------------------------------------- */}
      {/* Top Header: Diagram Title Input & Clean Presentation Mode Toggle     */}
      {/* -------------------------------------------------------------------- */}
      <div className="p-3 sm:px-4 sm:py-3 bg-white dark:bg-slate-900 border-b border-border dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">
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
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 dark:focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition min-w-[150px]"
          />

          {/* Category Input */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              หมวด:
            </span>
            <input
              type="text"
              list="whywhy-categories"
              disabled={readOnly}
              value={value.category || ''}
              placeholder="ไม่ระบุหมวด"
              onChange={(e) => {
                onChange({
                  ...value,
                  category: e.target.value,
                  updatedAt: new Date().toISOString()
                });
              }}
              className="w-28 sm:w-36 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 dark:focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition"
            />
            <datalist id="whywhy-categories">
              <option value="ระบบไฟฟ้าและคอนโทรล" />
              <option value="ระบบเครื่องกลและส่งกำลัง" />
              <option value="ระบบนิวเมติกส์และไฮดรอลิกส์" />
              <option value="คุณภาพและของเสีย (Quality)" />
              <option value="การทำงาน/โอเปอเรเตอร์ (Human Error)" />
              <option value="ความปลอดภัย (Safety)" />
            </datalist>
          </div>

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
              const count = countBranchTotalNodes(b);

              return (
                <div
                  key={b.id}
                  onClick={() => setActiveBranchId(b.id)}
                  className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none ${
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
                  {!readOnly && (value.branches?.length || 0) > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteBranch(b.id, e)}
                      title={`ลบกิ่ง ${cfg?.label}`}
                      className="ml-0.5 p-0.5 rounded hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 text-slate-400 transition cursor-pointer"
                    >
                      <span className="text-[11px] leading-none block px-0.5 font-sans">✕</span>
                    </button>
                  )}
                </div>
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
          {/* Undo / Redo Controls */}
          {!readOnly && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700/60 p-0.5">
              <button
                type="button"
                disabled={history.length === 0}
                onClick={handleUndo}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                title="ย้อนกลับ (Ctrl+Z)"
              >
                <Undo2 size={14} />
              </button>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />
              <button
                type="button"
                disabled={redoStack.length === 0}
                onClick={handleRedo}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                title="ทำซ้ำ (Ctrl+Y หรือ Ctrl+Shift+Z)"
              >
                <Redo2 size={14} />
              </button>
            </div>
          )}

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

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs border ${
              isFullscreen
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
            }`}
            title={isFullscreen ? 'ย่อกลับขนาดเดิม (Esc)' : 'ขยายเต็มหน้าจอ'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span className="hidden sm:inline">{isFullscreen ? 'ย่อจอ' : 'เต็มจอ'}</span>
          </button>

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
        <div className="flex items-center gap-2 flex-wrap">
          <span>💡 <strong>คำแนะนำ:</strong> <strong>ดับเบิ้ลคลิก</strong>ที่การ์ดเพื่อแก้ไขงาน | คลิกที่ผลเพื่อเปลี่ยน <strong>"รอพิสูจน์"</strong> เป็น <strong>"OK (เป็นจริง)"</strong> หรือ <strong>"NG (ไม่จริง)"</strong> | กด <strong>Ctrl+Z</strong> เพื่อย้อนกลับ</span>
        </div>
        {!readOnly && canvasMode === 'edit' && (
          <button
            type="button"
            onClick={handleAddRoot}
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs shrink-0"
            title={`เพิ่มจุดเริ่มสาเหตุอื่น (Why ${branchRoots.length + 1}.1)`}
          >
            <Plus size={13} />
            <span>+ เพิ่ม Why {branchRoots.length + 1}.1</span>
          </button>
        )}
      </div>

      {/* Guardrail: Reverse Logic Check Input Bar for Active Branch */}
      {activeBranch && (
        <div className="px-4 py-2 bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-1 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 shrink-0">
              <span className="text-cyan-600 dark:text-cyan-400">🔄</span>
              <span>การอ่านย้อนกลับ (Reverse Logic Check):</span>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                disabled={readOnly}
                value={activeBranch.reverseLogicCheck || ''}
                onChange={(e) => {
                  const newVal = e.target.value;
                  if (newVal.trim()) {
                    setNodeErrors(prev => {
                      const next = { ...prev };
                      let changed = false;
                      Object.keys(next).forEach(k => {
                        if (next[k].includes('Reverse Logic') || next[k].includes('การอ่านย้อนกลับ')) {
                          delete next[k];
                          changed = true;
                        }
                      });
                      return changed ? next : prev;
                    });
                  }
                  handleUpdateActiveBranch({ reverseLogicCheck: newVal });
                }}
                placeholder="เช่น เพราะขันสลักเกลียวเพียงตัวเดียว → จึงทำให้ฝาครอบเปิดอ้า → จึงบังแสงเซ็นเซอร์ (จำเป็นต้องกรอกก่อนสรุป NG)"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-cyan-500 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none transition shadow-2xs"
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleAutoDraftReverseLogic}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer"
                  title="สร้างประโยค เพราะ...จึง... จากกล่อง Why ตามเส้นลูกศร"
                >
                  <Sparkles size={12} />
                  <span>✨ ช่วยร่าง</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400 pl-0 sm:pl-1">
            <span className="opacity-80">
              💡 ระบบจะร้อยกล่อง Why ตามลูกศรเป็นประโยค เพราะ...จึง... — ตรวจ/แก้ก่อนใช้
            </span>
            {draftAlert && (
              <span className="text-amber-600 dark:text-amber-400 font-bold animate-in fade-in duration-150">
                ⚠️ {draftAlert}
              </span>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Interactive Infinite Canvas Viewport                                 */}
      {/* -------------------------------------------------------------------- */}
      <div
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`relative w-full ${isFullscreen ? 'flex-1' : 'h-[620px]'} overflow-hidden select-none cursor-grab active:cursor-grabbing bg-slate-50 dark:bg-slate-950 ${
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
              <marker
                id="canvas-arrow-ng"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f43f5e" />
              </marker>
              <marker
                id="canvas-arrow-ok"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
              </marker>
            </defs>

            {layout.links.map(link => {
              const dx = Math.max((link.x2 - link.x1) * 0.5, 36);
              const pathD = `M ${link.x1} ${link.y1} C ${link.x1 + dx} ${link.y1}, ${link.x2 - dx} ${link.y2}, ${link.x2} ${link.y2}`;
              const targetNode = layout.nodes.find(n => n.node.id === link.toNodeId)?.node;
              const isNg = targetNode?.judgement === 'NG';
              const isOk = targetNode?.judgement === 'OK';
              const strokeColor = isNg ? '#f43f5e' : (isOk ? '#10b981' : '#0891b2');
              const markerId = isNg ? 'canvas-arrow-ng' : (isOk ? 'canvas-arrow-ok' : 'canvas-arrow');

              return (
                <path
                  key={`${link.fromNodeId}->${link.toNodeId}`}
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  markerEnd={`url(#${markerId})`}
                />
              );
            })}
          </svg>

          {/* LAYER 2: HTML Absolute Positioned Cards (In Front) */}
          <div className="absolute inset-0 pointer-events-none">
            {layout.nodes.map(item => {
              const { node, depth, whyLabel, x, y, width, height, isCollapsed, hasChildren } = item;
              const judgementInfo = JUDGEMENT_BADGES[node.judgement];
              const isRootNode = depth === 1;

              const isSelected = selectedNodeId === node.id;
              const isInlineEditing = editingNodeId === node.id || canvasMode === 'edit';

              return (
                <div
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!readOnly) {
                      setEditingNodeId(node.id);
                      setSelectedNodeId(node.id);
                    }
                  }}
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${width}px`,
                    minHeight: `${height}px`
                  }}
                  className={`canvas-node-card absolute pointer-events-auto rounded-xl flex flex-col justify-between transition-all duration-150 border cursor-pointer select-none ${
                    canvasMode === 'view' ? 'p-2' : 'p-2.5'
                  } ${
                    isSelected
                      ? (node.judgement === 'NG' ? 'ring-2 ring-rose-500 shadow-lg border-rose-500' : 'ring-2 ring-cyan-500 shadow-lg border-cyan-500')
                      : ''
                  } ${
                    node.isRootCause
                      ? 'bg-rose-50/95 dark:bg-rose-950/80 border-rose-500 dark:border-rose-600 ring-2 ring-rose-500/20 shadow-md'
                      : node.judgement === 'NG'
                        ? 'bg-rose-50/90 dark:bg-rose-950/60 border-rose-400 dark:border-rose-700/80 hover:border-rose-500 shadow-xs'
                        : node.judgement === 'OK'
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700/80 hover:border-emerald-500'
                          : 'bg-white/95 dark:bg-slate-900/95 border-slate-300 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-600'
                  }`}
                  title={readOnly ? undefined : "ดับเบิ้ลคลิก (Double-click) เพื่อแก้ไขข้อความ"}
                >
                  {/* Card Header: Level Indicator + Status Badge + Root Cause */}
                  <div className={`flex items-center justify-between gap-1 pb-1 ${
                    canvasMode === 'view' ? '' : 'border-b border-slate-200/80 dark:border-slate-800'
                  }`}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${
                        node.judgement === 'NG'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          : node.judgement === 'OK'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
                      }`}>
                        {whyLabel}
                      </span>

                      {/* Judgement Badge / Selector (Clickable to switch รอพิสูจน์, OK, NG) */}
                      {!readOnly ? (
                        <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={node.judgement}
                            onChange={(e) => {
                              handleUpdateNodeJudgement(node.id, e.target.value as Judgement);
                            }}
                            className={`appearance-none cursor-pointer pl-1.5 pr-4 py-0.5 rounded text-[10px] font-bold border ${judgementInfo.badgeStyle} focus:outline-none focus:ring-1 focus:ring-cyan-500`}
                            title="คลิกเพื่อเปลี่ยนผลการพิสูจน์ (รอพิสูจน์ / เป็นจริง (OK) / ไม่จริง (NG))"
                          >
                            <option value="PENDING">⏳ รอพิสูจน์</option>
                            <option value="OK">✓ เป็นจริง (OK)</option>
                            <option value="NG">✕ ไม่จริง (NG)</option>
                          </select>
                          <ChevronDown size={10} className="absolute right-1 pointer-events-none opacity-60" />
                        </div>
                      ) : (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${judgementInfo.badgeStyle}`}>
                          {judgementInfo.icon} {judgementInfo.label}
                        </span>
                      )}

                      {/* Root Cause Badge */}
                      {node.isRootCause && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white shadow-xs animate-in zoom-in-95 duration-150">
                          <Target size={11} /> Root Cause
                        </span>
                      )}

                      {/* 4M Constant State Warning in view mode */}
                      {node.changePointOk === false && canvasMode === 'view' && (
                        <span 
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                          title="สภาพคงที่ (มีทั้งก่อน/หลังเสีย) — เป็นรากเหง้าไม่ได้"
                        >
                          ⚠️ สภาพคงที่
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
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollapse(node.id);
                        }}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                        title={isCollapsed ? 'ขยายกิ่งลูก' : 'ยุบกิ่งลูก'}
                      >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </div>

                  {/* Guardrail Inline Error */}
                  {nodeErrors[node.id] && (
                    <div className="my-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 rounded px-2 py-1 flex items-start gap-1 animate-in fade-in duration-150 leading-tight">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5 text-rose-500" />
                      <span>{nodeErrors[node.id]}</span>
                    </div>
                  )}

                  {/* Card Description: Plain text in view mode, or editable textarea */}
                  {!isInlineEditing ? (
                    <div 
                      className="my-1 px-0.5 text-xs text-slate-800 dark:text-slate-100 leading-snug break-words select-text cursor-text"
                      title={readOnly ? undefined : "ดับเบิ้ลคลิกเพื่อแก้ไข"}
                    >
                      {node.description?.trim() ? (
                        node.description
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic font-normal">(ดับเบิ้ลคลิกเพื่อระบุข้อความ)</span>
                      )}
                    </div>
                  ) : (
                    <div className="my-1.5 select-text" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        autoFocus={editingNodeId === node.id}
                        rows={2}
                        disabled={readOnly}
                        value={node.description}
                        onChange={(e) => handleUpdateNodeDescription(node.id, e.target.value)}
                        onBlur={() => {
                          if (editingNodeId === node.id) {
                            setEditingNodeId(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditingNodeId(null);
                          }
                        }}
                        placeholder={`ทำไมในชั้น ${whyLabel}?`}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 dark:focus:border-cyan-500 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-100 resize-none focus:outline-none transition leading-tight"
                      />
                      {canvasMode === 'view' && editingNodeId === node.id && (
                        <div className="flex justify-end gap-1 mt-0.5">
                          <button
                            type="button"
                            onClick={() => setEditingNodeId(null)}
                            className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold bg-cyan-600 hover:bg-cyan-700 text-white rounded transition cursor-pointer"
                          >
                            <Check size={11} /> เสร็จสิ้น
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4M Change Point Toggle on Card (Edit mode - compact format) */}
                  {canvasMode === 'edit' && (
                    <div className="pt-1 pb-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleToggleChangePoint(node.id, node.changePointOk !== false)}
                        className={`w-full py-0.5 px-1.5 rounded text-[10px] font-bold border transition text-left cursor-pointer flex items-center justify-between gap-1 ${
                          node.changePointOk !== false
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                        }`}
                        title="คลิกสลับ: จุดเปลี่ยนแปลง 4M (วิเคราะห์เป็นรากเหง้าได้) vs สภาพคงที่ (เป็นรากไม่ได้)"
                      >
                        <span className="truncate">
                          {node.changePointOk !== false ? '✓ จุดเปลี่ยน 4M' : '⚠️ สภาพคงที่'}
                        </span>
                        <span className="text-[9px] opacity-75 shrink-0">
                          {node.changePointOk !== false ? 'รากเหง้าได้' : 'รากไม่ได้'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Card Actions Footer: Hidden in view mode per spec */}
                  {canvasMode === 'edit' && !readOnly && (
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1">
                        {/* Add Child (Creates arrow to child on right) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddChild(node.id);
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900 border border-cyan-300 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 rounded text-[10px] font-bold transition cursor-pointer"
                          title="เพิ่มลูกศรไปช่องลูกทางขวา (Child Why)"
                        >
                          <Plus size={11} />
                          <span>ลูกศร→ลูก</span>
                        </button>

                        {/* For Why 1 (Root): Do NOT show "ช่องขนาน" per user request! */}
                        {/* Instead, allow adding another root Why (Why 2.1, Why 3.1...) */}
                        {isRootNode ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddRoot();
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-bold transition cursor-pointer"
                            title={`เพิ่มจุดเริ่มสาเหตุใหม่ (Why ${branchRoots.length + 1}.1)`}
                          >
                            <Plus size={11} />
                            <span>Why {branchRoots.length + 1}.1</span>
                          </button>
                        ) : (
                          /* Add Parallel Sibling for non-root nodes (Fans down under same parent) */
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddSibling(node.id);
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold transition cursor-pointer"
                            title="เพิ่มช่องคู่ขนานใต้พ่อเดียวกัน (Sibling)"
                          >
                            <Plus size={11} />
                            <span>ช่องขนาน</span>
                          </button>
                        )}
                      </div>

                      {/* Delete Node Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNode(node.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition cursor-pointer"
                        title={
                          isRootNode
                            ? (branchRoots.length > 1 ? `ลบจุดเริ่มสาเหตุนี้ (${whyLabel})` : "ล้างข้อความและกิ่งลูก")
                            : `ลบ ${whyLabel} นี้และลูกทั้งหมด (หรือกด Delete บนแป้นพิมพ์)`
                        }
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Side Info Panel: 4M Change Point vs Constant State Guide (Wide side view) */}
        <aside
          aria-label="4M Change Point vs Constant State Guide"
          className="absolute top-4 right-4 z-20 pointer-events-auto max-w-[280px] sm:max-w-[320px] transition-all duration-200 select-text"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {show4MGuide ? (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-300 dark:border-slate-800 rounded-xl shadow-xl p-3 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                  <span className="text-cyan-600 dark:text-cyan-400">💡</span>
                  <span>คำอธิบาย 4M & สภาพคงที่</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShow4MGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="ย่อแถบคำอธิบาย"
                >
                  <Minimize2 size={13} />
                </button>
              </div>

              {/* 4M Change Point Box */}
              <div className="space-y-1 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/70 rounded-lg p-2.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">✓ จุดเปลี่ยน 4M</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200">
                    เป็นรากเหง้าได้
                  </span>
                </div>
                <p className="text-[11px] text-emerald-950 dark:text-emerald-200 leading-relaxed font-medium">
                  สิ่งที่เพิ่งเปลี่ยน (Man, Machine, Method, Material)
                </p>
                <div className="text-[10.5px] text-emerald-800 dark:text-emerald-300/90 pl-1.5 border-l-2 border-emerald-400 dark:border-emerald-600 leading-snug pt-0.5">
                  <span className="font-semibold">ตัวอย่าง:</span> ใบมีดสึกตามอายุ / วัตถุดิบแข็งขึ้น / เพิ่งปรับตั้งเครื่อง
                </div>
              </div>

              {/* Constant State Box */}
              <div className="space-y-1 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/70 rounded-lg p-2.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-amber-800 dark:text-amber-300">⚠️ สภาพคงที่</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                    ไม่ใช่รากเหง้า
                  </span>
                </div>
                <p className="text-[11px] text-amber-950 dark:text-amber-200 leading-relaxed font-medium">
                  มีอยู่ทั้งก่อน/หลังเสีย — ให้ถามต่อว่าอะไรเปลี่ยน
                </p>
                <div className="text-[10.5px] text-amber-800 dark:text-amber-300/90 pl-1.5 border-l-2 border-amber-400 dark:border-amber-600 leading-snug pt-0.5">
                  <span className="font-semibold">ตัวอย่าง:</span> ใบมีดเป็นสแตนเลส (เป็นมาตลอด เครื่องเคยเดินงานได้)
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShow4MGuide(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-300 dark:border-slate-700 hover:border-cyan-500 rounded-lg shadow-lg text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
              title="เปิดคำอธิบายจุดเปลี่ยน 4M & สภาพคงที่"
            >
              <HelpCircle size={13} className="text-cyan-600 dark:text-cyan-400" />
              <span>คำอธิบาย 4M & สภาพคงที่</span>
            </button>
          )}
        </aside>
      </div>
    </div>
  );
};
