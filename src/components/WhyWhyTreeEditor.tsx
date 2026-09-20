import React, { useState, useEffect } from 'react';
import { 
  WhyWhyAnalysis, 
  WhyWhyBranch, 
  WhyNode, 
  BranchAxis, 
  Judgement, 
  RepairLog 
} from '../types';
import { 
  createWhyNode, 
  createWhyWhyBranch, 
  addChildNode, 
  addSiblingNode, 
  updateNodeInTree, 
  deleteNodeFromTree,
  countBranchNodes,
  getMaxDepth 
} from '../utils/whyWhyUtils';
import { 
  GitFork, 
  CornerDownRight, 
  Plus, 
  Trash2, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Layers, 
  ChevronDown, 
  ChevronRight,
  Target,
  RefreshCw
} from 'lucide-react';

interface WhyWhyTreeEditorProps {
  value: WhyWhyAnalysis;
  onChange?: (updated: WhyWhyAnalysis) => void;
  machineId: string;
  repairs: RepairLog[];
  currentRepairId?: string;
  symptoms: string;
  readOnly?: boolean;
}

const AXIS_CONFIG: Record<BranchAxis, { label: string; badge: string; icon: string; desc: string; color: string }> = {
  occurrence: {
    label: 'ด้านการเกิด (Occurrence)',
    badge: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
    icon: '🔴',
    desc: 'ทำไมปัญหาจึงเกิดขึ้นทางกายภาพหรือกระบวนการ?',
    color: 'rose'
  },
  detection: {
    label: 'ด้านการตรวจจับ (Detection)',
    badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    icon: '🟡',
    desc: 'ทำไมระบบตรวจจับหรือการตรวจสอบประจำวันจึงไม่พบ?',
    color: 'amber'
  },
  recurrence: {
    label: 'ด้านการเกิดซ้ำ (Recurrence)',
    badge: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
    icon: '🟣',
    desc: 'ทำไมระบบบริหารจัดการหรือมาตรฐานจึงปล่อยให้เกิดซ้ำ?',
    color: 'purple'
  }
};

export const WhyWhyTreeEditor: React.FC<WhyWhyTreeEditorProps> = ({
  value,
  onChange,
  machineId,
  repairs,
  currentRepairId,
  symptoms,
  readOnly = false
}) => {
  const [activeBranchId, setActiveBranchId] = useState<string>(
    value.branches?.[0]?.id || ''
  );
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [selectedAxisForNewBranch, setSelectedAxisForNewBranch] = useState<BranchAxis>('detection');
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Sync active branch if list changes
  useEffect(() => {
    if (value.branches && value.branches.length > 0) {
      if (!value.branches.some(b => b.id === activeBranchId)) {
        setActiveBranchId(value.branches[0].id);
      }
    }
  }, [value.branches, activeBranchId]);

  // Previous breakdown cases for this machine
  const pastMachineRepairs = repairs.filter(
    r => r.machineId === machineId && r.id !== currentRepairId
  );

  const handleUpdate = (patch: Partial<WhyWhyAnalysis>) => {
    if (readOnly || !onChange) return;
    onChange({
      ...value,
      ...patch,
      updatedAt: new Date().toISOString()
    });
  };

  const handleUpdateBranch = (branchId: string, patch: Partial<WhyWhyBranch>) => {
    if (readOnly || !onChange) return;
    const updatedBranches = value.branches.map(b => 
      b.id === branchId ? { ...b, ...patch } : b
    );
    handleUpdate({ branches: updatedBranches });
  };

  const handleCreateBranch = (axis: BranchAxis) => {
    if (readOnly || !onChange) return;
    const initialText = axis === 'occurrence' ? (value.phenomenon || symptoms) : '';
    const newBranch = createWhyWhyBranch(axis, initialText);
    const updatedBranches = [...(value.branches || []), newBranch];
    handleUpdate({ branches: updatedBranches });
    setActiveBranchId(newBranch.id);
    setShowAddBranchModal(false);
  };

  const handleDeleteBranch = (branchId: string) => {
    if (readOnly || !onChange) return;
    if (value.branches.length <= 1) {
      alert('จำเป็นต้องมีอย่างน้อย 1 กิ่งวิเคราะห์ (Branch)');
      return;
    }
    if (confirm('คุณต้องการลบกิ่งวิเคราะห์นี้ใช่หรือไม่?')) {
      const remaining = value.branches.filter(b => b.id !== branchId);
      handleUpdate({ branches: remaining });
      setActiveBranchId(remaining[0]?.id || '');
    }
  };

  const handleToggleRelatedRepair = (repairId: string) => {
    if (readOnly || !onChange) return;
    const currentRelated = value.relatedRepairIds || [];
    const isAlready = currentRelated.includes(repairId);
    let nextRelated: string[];
    if (isAlready) {
      nextRelated = currentRelated.filter(id => id !== repairId);
    } else {
      nextRelated = [...currentRelated, repairId];
    }
    
    // Selecting any related past case automatically indicates recurrence
    const nextOccurrenceType = nextRelated.length > 0 ? 'recurrence' : value.occurrenceType;
    handleUpdate({
      relatedRepairIds: nextRelated,
      occurrenceType: nextOccurrenceType
    });
  };

  const activeBranch = value.branches?.find(b => b.id === activeBranchId) || value.branches?.[0];

  return (
    <div className="space-y-4 text-xs font-sans">
      {/* 1. Phenomenon & Occurrence Header */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-border dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 rounded-lg">
              <Layers size={16} />
            </span>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                ผังวิเคราะห์ Why-Why แบบแตกกิ่งไม่จำกัดชั้น (Unlimited Branching Tree)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                วิเคราะห์เชิงลึกตามมิติ 3 แกน: การเกิด (Occurrence) • การตรวจจับ (Detection) • การเกิดซ้ำ (Recurrence)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Occurrence Type Selector */}
            <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-950">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => handleUpdate({ occurrenceType: 'first' })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                  value.occurrenceType === 'first'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                เกิดครั้งแรก
              </button>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => handleUpdate({ occurrenceType: 'recurrence' })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                  value.occurrenceType === 'recurrence'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                ⚠️ เกิดซ้ำ (Recurrence)
              </button>
            </div>

            {/* Toggle past breakdown cases */}
            <button
              type="button"
              onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                (value.relatedRepairIds?.length || 0) > 0
                  ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
              title="ดูเคสก่อนหน้าของเครื่องนี้เพื่อเชื่อมโยงการเกิดซ้ำ"
            >
              <History size={13} />
              <span>เคสก่อนหน้า ({pastMachineRepairs.length})</span>
              {(value.relatedRepairIds?.length || 0) > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold">
                  {value.relatedRepairIds.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Phenomenon Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <span>ปรากฏการณ์ / อาการเสียที่พบ (Phenomenon)*</span>
              <span className="text-[10px] text-slate-400 font-normal">(เริ่มต้นจุดตั้งต้นของ Why 1)</span>
            </label>
            {!readOnly && symptoms && symptoms !== value.phenomenon && (
              <button
                type="button"
                onClick={() => handleUpdate({ phenomenon: symptoms })}
                className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw size={10} /> ซิงค์จากอาการเสีย ({symptoms.slice(0, 20)}...)
              </button>
            )}
          </div>
          <input
            type="text"
            disabled={readOnly}
            value={value.phenomenon || ''}
            onChange={(e) => handleUpdate({ phenomenon: e.target.value })}
            placeholder="เช่น ฮีตเตอร์ไม่ทำความร้อน / ลมรั่วที่กระบอกสูบส่งผลให้ชิ้นงานค้าง"
            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Previous Cases Drawer / Strip */}
        {showHistoryDrawer && (
          <div className="pt-2 border-t border-border dark:border-slate-800 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                📋 ประวัติการแจ้งซ่อมย้อนหลังของเครื่อง {machineId || '-'}
              </span>
              <span className="text-[10px] text-slate-500">
                *คลิกเลือกเคสที่เกี่ยวข้องเพื่อผูกเป็นการเกิดซ้ำ (Recurrence Case)
              </span>
            </div>

            {pastMachineRepairs.length === 0 ? (
              <div className="p-3 text-center text-slate-400 italic bg-white dark:bg-slate-950 rounded-lg border border-dashed border-slate-300 dark:border-slate-800 text-[11px]">
                ไม่มีประวัติแจ้งซ่อมย้อนหลังของเครื่องจักรนี้
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {pastMachineRepairs.map((pr) => {
                  const isSelected = value.relatedRepairIds?.includes(pr.id);
                  return (
                    <div
                      key={pr.id}
                      onClick={() => !readOnly && handleToggleRelatedRepair(pr.id)}
                      className={`p-2 rounded-lg border text-left transition select-none flex items-start justify-between gap-2 ${
                        readOnly ? 'cursor-default' : 'cursor-pointer'
                      } ${
                        isSelected
                          ? 'bg-rose-50 border-rose-400 text-rose-900 dark:bg-rose-950/40 dark:border-rose-700 dark:text-rose-200'
                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 dark:bg-slate-950 dark:hover:bg-slate-850 dark:border-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                          <span>{pr.date}</span>
                          <span>•</span>
                          <span>{pr.duration} นาที</span>
                        </div>
                        <p className="font-semibold text-[11px] truncate mt-0.5">{pr.symptoms}</p>
                        {pr.correctiveAction && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            แก้: {pr.correctiveAction}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 pt-0.5">
                        {isSelected ? (
                          <CheckCircle2 size={16} className="text-rose-600 dark:text-rose-400" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 inline-block" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Branch Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border dark:border-slate-800 pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mr-1 flex items-center gap-1">
            <GitFork size={14} className="text-cyan-600 dark:text-cyan-400" /> กิ่งวิเคราะห์:
          </span>
          {value.branches?.map((branch, idx) => {
            const cfg = AXIS_CONFIG[branch.axis] || AXIS_CONFIG.occurrence;
            const isActive = branch.id === activeBranchId;
            const nodeCount = countBranchNodes(branch.root);
            const depth = getMaxDepth(branch.root);

            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => setActiveBranchId(branch.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  isActive
                    ? 'bg-cyan-50 border-cyan-500 text-cyan-900 dark:bg-cyan-950/50 dark:border-cyan-500 dark:text-cyan-300 shadow-xs'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.label.split(' ')[0]} {idx + 1}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-400">
                  {depth} ชั้น ({nodeCount})
                </span>
              </button>
            );
          })}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddBranchModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus size={14} />
              <span>แตกกิ่งวิเคราะห์ (Branch)</span>
            </button>

            {value.branches?.length > 1 && activeBranch && (
              <button
                type="button"
                onClick={() => handleDeleteBranch(activeBranch.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                title="ลบกิ่งวิเคราะห์นี้"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal: Select Axis before creating branch */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-border dark:border-slate-750 p-5 rounded-2xl max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b border-border dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <GitFork size={18} className="text-cyan-600 dark:text-cyan-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  เลือกมิติแกนวิเคราะห์ (Branch Axis)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBranchModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              กรุณาเลือกมิติมุมมองสำหรับกิ่งวิเคราะห์นี้ เพื่อให้ครอบคลุมตามมาตรฐานวิศวกรรมการบำรุงรักษา:
            </p>

            <div className="space-y-2">
              {(Object.keys(AXIS_CONFIG) as BranchAxis[]).map(axis => {
                const item = AXIS_CONFIG[axis];
                const isChosen = selectedAxisForNewBranch === axis;
                return (
                  <div
                    key={axis}
                    onClick={() => setSelectedAxisForNewBranch(axis)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      isChosen
                        ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/40 text-slate-900 dark:text-slate-100 ring-2 ring-cyan-500/20'
                        : 'border-slate-200 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </span>
                      {isChosen && <CheckCircle2 size={16} className="text-cyan-600 dark:text-cyan-400" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-6">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddBranchModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleCreateBranch(selectedAxisForNewBranch)}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-sm"
              >
                ยืนยันและสร้างกิ่งใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Active Branch Details & Tree */}
      {activeBranch ? (
        <div className="space-y-4">
          {/* Axis Banner & Reverse Logic Check */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${AXIS_CONFIG[activeBranch.axis]?.badge}`}>
                  {AXIS_CONFIG[activeBranch.axis]?.icon} {AXIS_CONFIG[activeBranch.axis]?.label}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                  {AXIS_CONFIG[activeBranch.axis]?.desc}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                ความลึก: <b className="text-cyan-600 dark:text-cyan-400">{getMaxDepth(activeBranch.root)}</b> ชั้น
              </div>
            </div>

            {/* Reverse Logic Check */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>🔄 การตรวจสอบเหตุผลย้อนกลับ (Reverse Logic Check: เพราะว่า... จึงส่งผลให้...)</span>
              </label>
              <input
                type="text"
                disabled={readOnly}
                value={activeBranch.reverseLogicCheck || ''}
                onChange={(e) => handleUpdateBranch(activeBranch.id, { reverseLogicCheck: e.target.value })}
                placeholder="เช่น เพราะขันสลักเกลียวเพียงตัวเดียว → จึงทำให้ฝาครอบเปิดอ้า → จึงมีคราบจาระบีเกาะหนา → จึงบังลำแสงเซ็นเซอร์"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Tree Nodes (Recursive) */}
          <div className="bg-white dark:bg-slate-900/80 p-3 sm:p-4 rounded-xl border border-border dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-2 border-b border-border dark:border-slate-800 flex items-center justify-between">
              <span>ลำดับการถามทำไมแตกกิ่ง (ไม่จำกัดชั้น)</span>
              <span className="text-[10px] text-slate-400 normal-case">
                💡 กด "ถามทำไม (ลึกลง)" เพื่อเจาะลึก หรือ "แตกกิ่งขนาน" เพื่อพิจารณาสาเหตุร่วม
              </span>
            </div>

            <div className="mt-3 space-y-2">
              <TreeNodeItem
                node={activeBranch.root}
                depth={1}
                branch={activeBranch}
                onUpdateNode={(nodeId, patch) => {
                  const updatedRoot = updateNodeInTree(activeBranch.root, nodeId, patch);
                  handleUpdateBranch(activeBranch.id, { root: updatedRoot });
                }}
                onAddChild={(parentId) => {
                  const updatedRoot = addChildNode(activeBranch.root, parentId, createWhyNode());
                  handleUpdateBranch(activeBranch.id, { root: updatedRoot });
                }}
                onAddSibling={(targetId) => {
                  const res = addSiblingNode(activeBranch.root, targetId, createWhyNode());
                  if (res.added) {
                    handleUpdateBranch(activeBranch.id, { root: res.root });
                  } else {
                    // If target was root, add another child to root or branch
                    const updatedRoot = addChildNode(activeBranch.root, targetId, createWhyNode());
                    handleUpdateBranch(activeBranch.id, { root: updatedRoot });
                  }
                }}
                onDeleteNode={(targetId) => {
                  const res = deleteNodeFromTree(activeBranch.root, targetId);
                  if (res.deleted) {
                    handleUpdateBranch(activeBranch.id, { root: res.root });
                  }
                }}
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 italic bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
          ไม่พบกิ่งวิเคราะห์ กรุณากดปุ่ม "แตกกิ่งวิเคราะห์ (Branch)" ด้านบนเพื่อเริ่มวิเคราะห์
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Recursive Tree Node Component                                              */
/* -------------------------------------------------------------------------- */

interface TreeNodeItemProps {
  node: WhyNode;
  depth: number;
  branch: WhyWhyBranch;
  onUpdateNode: (nodeId: string, patch: Partial<WhyNode>) => void;
  onAddChild: (parentId: string) => void;
  onAddSibling: (targetId: string) => void;
  onDeleteNode: (targetId: string) => void;
  readOnly?: boolean;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  depth,
  branch,
  onUpdateNode,
  onAddChild,
  onAddSibling,
  onDeleteNode,
  readOnly = false
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const isLeaf = !node.children || node.children.length === 0;

  const JUDGEMENT_BADGES: Record<Judgement, { label: string; activeStyle: string; icon: string }> = {
    PENDING: {
      label: 'รอพิสูจน์',
      activeStyle: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
      icon: '⏳'
    },
    OK: {
      label: 'ผ่าน (ไม่ใช่สาเหตุ)',
      activeStyle: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700',
      icon: '✓'
    },
    NG: {
      label: 'NG (พบปัญหา)',
      activeStyle: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700',
      icon: '✕'
    }
  };

  return (
    <div className="relative group">
      {/* Current Node Card */}
      <div 
        className={`p-3 rounded-xl border transition space-y-2.5 ${
          node.isRootCause 
            ? 'bg-rose-50/50 border-rose-400 dark:bg-rose-950/30 dark:border-rose-700 shadow-sm' 
            : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        {/* Node Top Row: Level Indicator + Judgement Selector + Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!isLeaf && (
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
                title={collapsed ? 'ขยายกิ่ง' : 'ย่อกิ่ง'}
              >
                {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
              </button>
            )}

            <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
              Why {depth}
            </span>

            {node.isRootCause && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white shadow-xs">
                <Target size={11} /> สาเหตุรากเหง้า (Root Cause)
              </span>
            )}
          </div>

          {/* Judgement Dropdown / Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400">การวินิจฉัย:</span>
            {(['PENDING', 'OK', 'NG'] as Judgement[]).map(j => {
              const info = JUDGEMENT_BADGES[j];
              const isSelected = node.judgement === j;
              return (
                <button
                  key={j}
                  type="button"
                  disabled={readOnly}
                  onClick={() => onUpdateNode(node.id, { judgement: j })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                    isSelected 
                      ? info.activeStyle 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
                  }`}
                >
                  <span>{info.icon} {info.label.split(' ')[0]}</span>
                </button>
              );
            })}

            {/* Delete button (only if not branch root) */}
            {!readOnly && node.id !== branch.root.id && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('คุณต้องการลบข้อวิเคราะห์นี้และกิ่งย่อยทั้งหมดใช่หรือไม่?')) {
                    onDeleteNode(node.id);
                  }
                }}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition ml-1"
                title="ลบ Why นี้"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Node Description Input */}
        <div className="space-y-1">
          <input
            type="text"
            disabled={readOnly}
            value={node.description}
            onChange={(e) => onUpdateNode(node.id, { description: e.target.value })}
            placeholder={`ทำไมในชั้นที่ ${depth}? (เช่น คราบจาระบีเกาะแห้งหนาจนบังลำแสง)`}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Leaf Node Specific: 4M Change Point & Root Cause Countermeasure */}
        {isLeaf && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* 4M Change Point Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  จุดเปลี่ยนแปลง 4M (Man/Machine/Method/Material):
                </span>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => onUpdateNode(node.id, { changePointOk: !node.changePointOk })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                    node.changePointOk
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                  }`}
                >
                  {node.changePointOk ? '✓ 4M ปกติ (OK)' : '⚠️ พบจุดเปลี่ยนแปลง 4M'}
                </button>
              </div>

              {/* Is Root Cause Toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-rose-700 dark:text-rose-400 select-none">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={node.isRootCause}
                  onChange={(e) => onUpdateNode(node.id, { isRootCause: e.target.checked })}
                  className="rounded text-rose-600 focus:ring-rose-500 dark:bg-slate-900 dark:border-slate-700"
                />
                <span>กำหนดเป็นสาเหตุรากเหง้า (Root Cause)</span>
              </label>
            </div>

            {/* Countermeasure for Root Cause or Leaf */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  มาตรการแก้ไข / ป้องกันถาวร (Countermeasure):
                </label>
                <input
                  type="text"
                  disabled={readOnly}
                  value={node.countermeasure || ''}
                  onChange={(e) => onUpdateNode(node.id, { countermeasure: e.target.value })}
                  placeholder="เช่น กำหนดรอบขันน็อตลงในใบเช็คชีท PM สากล"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  หลักฐานเชิงประจักษ์ (Evidence):
                </label>
                <input
                  type="text"
                  disabled={readOnly}
                  value={node.evidence || ''}
                  onChange={(e) => onUpdateNode(node.id, { evidence: e.target.value })}
                  placeholder="เช่น ภาพถ่ายรอยสั่นคลอน, ผลทดสอบมัลติมิเตอร์"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons: Ask Why Deeper (Children) + Branch Sibling (Parallel) */}
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onAddChild(node.id)}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/50 dark:hover:bg-cyan-900/60 border border-cyan-300 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
            >
              <CornerDownRight size={13} />
              <span>ถามทำไม (ลึกลงชั้นถัดไป)</span>
            </button>

            <button
              type="button"
              onClick={() => onAddSibling(node.id)}
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
              title="เพิ่มสาเหตุคู่ขนานในชั้นเดียวกัน"
            >
              <Plus size={13} />
              <span>แตกกิ่งขนาน (Parallel)</span>
            </button>
          </div>
        )}
      </div>

      {/* Children Indented Sub-Tree */}
      {!collapsed && node.children && node.children.length > 0 && (
        <div className="pl-3 sm:pl-6 border-l-2 border-cyan-500/40 dark:border-cyan-500/30 mt-2 space-y-2 relative">
          {node.children.map((childNode) => (
            <TreeNodeItem
              key={childNode.id}
              node={childNode}
              depth={depth + 1}
              branch={branch}
              onUpdateNode={onUpdateNode}
              onAddChild={onAddChild}
              onAddSibling={onAddSibling}
              onDeleteNode={onDeleteNode}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};
