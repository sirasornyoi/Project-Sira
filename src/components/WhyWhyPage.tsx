import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { RepairLog, Machine, WhyWhyAnalysis } from '../types';
import { WhyWhyTreeEditor } from './WhyWhyTreeEditor';
import { 
  migrateLegacyWhyToTree, 
  extractLegacyWhys, 
  createDefaultWhyWhyAnalysis,
  getWhyWhyAnalysisStats 
} from '../utils/whyWhyUtils';
import { 
  GitFork, 
  Plus, 
  Search, 
  Layers, 
  Calendar, 
  User, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  Filter, 
  ExternalLink,
  Wrench,
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface WhyWhyPageProps {
  repairs?: RepairLog[];
  setRepairs?: React.Dispatch<React.SetStateAction<RepairLog[]>>;
  machines?: Machine[];
  technicians?: string[];
  initialSelectedRepairId?: string | null;
  onClearInitialSelectedRepairId?: () => void;
  onNavigateToRepair?: (repairId: string) => void;
}

export const WhyWhyPage: React.FC<WhyWhyPageProps> = ({
  repairs: propRepairs,
  setRepairs: propSetRepairs,
  machines: propMachines,
  technicians: propTechnicians,
  initialSelectedRepairId,
  onClearInitialSelectedRepairId,
  onNavigateToRepair
}) => {
  const app = useApp();
  const repairs = propRepairs || app.repairs;
  const setRepairs = propSetRepairs || app.setRepairs;
  const machines = propMachines || app.machines;
  const technicians = propTechnicians || app.technicians;

  // Selected repair for full-screen Why-Why editor
  const [activeRepairId, setActiveRepairId] = useState<string | null>(initialSelectedRepairId || null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [machineFilter, setMachineFilter] = useState('');
  const [occurrenceFilter, setOccurrenceFilter] = useState<'all' | 'first' | 'recurrence'>('all');
  const [hasRootCauseFilter, setHasRootCauseFilter] = useState<'all' | 'has_root' | 'pending'>('all');

  // Modal for creating analysis by pairing an unanalyzed breakdown case
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSearchTerm, setCreateSearchTerm] = useState('');
  const [createMachineFilter, setCreateMachineFilter] = useState('');

  // Sync when initialSelectedRepairId changes from parent
  useEffect(() => {
    if (initialSelectedRepairId) {
      setActiveRepairId(initialSelectedRepairId);
    }
  }, [initialSelectedRepairId]);

  // Helper map of machines for quick lookup
  const machineMap = useMemo(() => {
    const map = new Map<string, Machine>();
    machines.forEach(m => map.set(m.id, m));
    return map;
  }, [machines]);

  // List of all items with an existing or migrated Why-Why
  const analyzedItems = useMemo(() => {
    return repairs
      .map(r => {
        const hasDirectWhyWhy = Boolean(r.whyWhy);
        const hasLegacyWhys = Boolean(r.why1 || r.why2 || r.why3 || r.why4 || r.why5);
        
        if (!hasDirectWhyWhy && !hasLegacyWhys) {
          return null; // Not analyzed yet
        }

        const analysis: WhyWhyAnalysis = r.whyWhy || migrateLegacyWhyToTree(r);
        const stats = getWhyWhyAnalysisStats(analysis);
        const machine = machineMap.get(r.machineId);

        return {
          repair: r,
          analysis,
          stats,
          machine,
          isMigrated: !hasDirectWhyWhy && hasLegacyWhys
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [repairs, machineMap]);

  // Breakdown repairs that do NOT have a Why-Why analysis yet
  const unanalyzedRepairs = useMemo(() => {
    return repairs.filter(r => !r.whyWhy && !r.why1 && !r.why2 && !r.why3 && !r.why4 && !r.why5);
  }, [repairs]);

  // Filtered list of analyzed items
  const filteredAnalyzedItems = useMemo(() => {
    return analyzedItems.filter(item => {
      // Machine filter
      if (machineFilter && item.repair.machineId !== machineFilter) {
        return false;
      }

      // Occurrence type filter
      if (occurrenceFilter !== 'all') {
        const occ = item.analysis.occurrenceType || 'first';
        if (occ !== occurrenceFilter) return false;
      }

      // Root cause filter
      if (hasRootCauseFilter === 'has_root' && item.stats.rootCauseCount === 0) {
        return false;
      }
      if (hasRootCauseFilter === 'pending' && item.stats.rootCauseCount > 0) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mName = item.machine?.name?.toLowerCase() || '';
        const mCode = item.repair.machineId.toLowerCase();
        const symptoms = (item.repair.symptoms || '').toLowerCase();
        const phenomenon = (item.analysis.phenomenon || '').toLowerCase();
        const tech = (item.repair.technician || '').toLowerCase();
        const rootText = item.stats.rootCauses.join(' ').toLowerCase();

        const matched = 
          mName.includes(q) || 
          mCode.includes(q) || 
          symptoms.includes(q) || 
          phenomenon.includes(q) || 
          tech.includes(q) ||
          rootText.includes(q);

        if (!matched) return false;
      }

      return true;
    });
  }, [analyzedItems, machineFilter, occurrenceFilter, hasRootCauseFilter, searchTerm]);

  // Filtered list of unanalyzed repairs for Create Modal
  const filteredUnanalyzedRepairs = useMemo(() => {
    return unanalyzedRepairs.filter(r => {
      if (createMachineFilter && r.machineId !== createMachineFilter) return false;
      if (createSearchTerm.trim()) {
        const q = createSearchTerm.toLowerCase();
        const m = machineMap.get(r.machineId);
        const mName = m?.name?.toLowerCase() || '';
        const symptoms = (r.symptoms || '').toLowerCase();
        const tech = (r.technician || '').toLowerCase();
        return mName.includes(q) || r.machineId.toLowerCase().includes(q) || symptoms.includes(q) || tech.includes(q);
      }
      return true;
    });
  }, [unanalyzedRepairs, createMachineFilter, createSearchTerm, machineMap]);

  // Save handler: writes back to repair.whyWhy and syncs why1..why5
  const handleSaveAnalysis = (updatedAnalysis: WhyWhyAnalysis, targetRepairId: string) => {
    const targetRepair = repairs.find(r => r.id === targetRepairId);
    if (!targetRepair) return;

    const legacyWhys = extractLegacyWhys(updatedAnalysis);
    const analysisToSave: WhyWhyAnalysis = {
      ...updatedAnalysis,
      repairId: targetRepair.id,
      machineId: targetRepair.machineId,
      updatedAt: new Date().toISOString()
    };

    setRepairs(prev => prev.map(r => {
      if (r.id === targetRepairId) {
        return {
          ...r,
          whyWhy: analysisToSave,
          why1: legacyWhys.why1 || r.why1 || '',
          why2: legacyWhys.why2 || r.why2 || '',
          why3: legacyWhys.why3 || r.why3 || '',
          why4: legacyWhys.why4 || r.why4 || '',
          why5: legacyWhys.why5 || r.why5 || ''
        };
      }
      return r;
    }));
  };

  // Create new analysis paired with a selected repair case
  const handleCreateAnalysisForRepair = (repair: RepairLog) => {
    const initial = createDefaultWhyWhyAnalysis(
      repair.symptoms,
      repair.technician || technicians[0] || 'ช่างซ่อมบำรุง',
      []
    );
    initial.repairId = repair.id;
    initial.machineId = repair.machineId;
    initial.occurrenceType = 'first';

    handleSaveAnalysis(initial, repair.id);
    setShowCreateModal(false);
    setActiveRepairId(repair.id);
  };

  // Close full-page editor
  const handleBackToList = () => {
    setActiveRepairId(null);
    if (onClearInitialSelectedRepairId) {
      onClearInitialSelectedRepairId();
    }
  };

  // Active target repair and analysis for full-page editor
  const activeRepair = useMemo(() => {
    if (!activeRepairId) return null;
    return repairs.find(r => r.id === activeRepairId) || null;
  }, [repairs, activeRepairId]);

  const activeAnalysis = useMemo(() => {
    if (!activeRepair) return null;
    if (activeRepair.whyWhy) return activeRepair.whyWhy;
    return migrateLegacyWhyToTree(activeRepair);
  }, [activeRepair]);

  /* -------------------------------------------------------------------------- */
  /* VIEW 1: FULL-PAGE WHY-WHY TREE EDITOR                                      */
  /* -------------------------------------------------------------------------- */
  if (activeRepair && activeAnalysis) {
    const machine = machineMap.get(activeRepair.machineId);

    return (
      <div className="flex flex-col h-full bg-bg text-fg overflow-y-auto p-4 sm:p-6 space-y-4 font-sans">
        {/* Top Navigation Bar */}
        <div className="bg-card dark:bg-slate-900 border border-border dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToList}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>กลับหน้ารายการผัง</span>
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                  {activeRepair.machineId}
                </span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {machine?.name || 'เครื่องจักร'}
                </h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  activeRepair.status === 'ปิดงาน'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                }`}>
                  {activeRepair.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                เคสแจ้งซ่อม: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeRepair.symptoms}</span> ({activeRepair.date})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigateToRepair && (
              <button
                type="button"
                onClick={() => onNavigateToRepair(activeRepair.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <Wrench size={13} className="text-rose-500" />
                <span>เปิดใบแจ้งซ่อม</span>
              </button>
            )}
          </div>
        </div>

        {/* Full Tree Editor */}
        <div className="bg-card dark:bg-slate-900/90 border border-border dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
          <WhyWhyTreeEditor
            value={activeAnalysis}
            onChange={(updated) => handleSaveAnalysis(updated, activeRepair.id)}
            machineId={activeRepair.machineId}
            repairs={repairs}
            currentRepairId={activeRepair.id}
            symptoms={activeRepair.symptoms}
            readOnly={false}
          />
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* VIEW 2: WHY-WHY DIAGRAMS DASHBOARD & CARDS LIST                            */
  /* -------------------------------------------------------------------------- */
  const totalAnalyzed = analyzedItems.length;
  const rootCausesIdentified = analyzedItems.filter(item => item.stats.rootCauseCount > 0).length;
  const recurrenceCount = analyzedItems.filter(item => item.analysis.occurrenceType === 'recurrence').length;

  return (
    <div className="flex flex-col h-full bg-bg text-fg overflow-y-auto p-4 sm:p-6 space-y-5 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-xl shadow-md">
              <GitFork size={20} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                ศูนย์ผังวิเคราะห์สาเหตุรากเหง้า (Why-Why Analysis)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                วิเคราะห์เจาะลึก 3 มิติ (Occurrence • Detection • Recurrence) เชื่อมโยงกับประวัติเคส Breakdown
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <Plus size={15} />
            <span>สร้างผังวิเคราะห์ใหม่</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card dark:bg-slate-900 border border-border dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Layers size={13} className="text-cyan-600 dark:text-cyan-400" />
            <span>ผังวิเคราะห์ทั้งหมด</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {totalAnalyzed} <span className="text-xs font-normal text-slate-400">ผัง</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            จากทั้งหมด {repairs.length} เคสแจ้งซ่อม
          </div>
        </div>

        <div className="bg-card dark:bg-slate-900 border border-border dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Target size={13} />
            <span>พบสาเหตุรากเหง้าแล้ว</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {rootCausesIdentified} <span className="text-xs font-normal text-slate-400">ผัง</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            กำหนดมาตรการแก้ไขสมบูรณ์
          </div>
        </div>

        <div className="bg-card dark:bg-slate-900 border border-border dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertTriangle size={13} />
            <span>เคสเกิดซ้ำ (Recurrence)</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {recurrenceCount} <span className="text-xs font-normal text-slate-400">เคส</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            ต้องเฝ้าระวังแกนการเกิดซ้ำ
          </div>
        </div>

        <div className="bg-card dark:bg-slate-900 border border-border dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <HelpCircle size={13} />
            <span>เคสที่ยังไม่มีผัง</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {unanalyzedRepairs.length} <span className="text-xs font-normal text-slate-400">เคส</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
            {unanalyzedRepairs.length > 0 && (
              <button 
                type="button" 
                onClick={() => setShowCreateModal(true)}
                className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline"
              >
                กดสร้างเลย →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-card dark:bg-slate-900 border border-border dark:border-slate-800 p-3.5 rounded-xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อเครื่อง, อาการเสีย, ปรากฏการณ์, สาเหตุรากเหง้า, ช่าง..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Machine Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">ทุกเครื่องจักร ({machines.length})</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>
                  {m.id} - {m.name}
                </option>
              ))}
            </select>

            {/* Occurrence Filter */}
            <select
              value={occurrenceFilter}
              onChange={(e) => setOccurrenceFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">มิติ: ทั้งหมด</option>
              <option value="first">เกิดครั้งแรก</option>
              <option value="recurrence">⚠️ เกิดซ้ำ (Recurrence)</option>
            </select>

            {/* Root Cause Filter */}
            <select
              value={hasRootCauseFilter}
              onChange={(e) => setHasRootCauseFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">สถานะรากเหง้า: ทั้งหมด</option>
              <option value="has_root">✓ พบรากเหง้าแล้ว</option>
              <option value="pending">⏳ ยังไม่ระบุรากเหง้า</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredAnalyzedItems.length === 0 ? (
        <div className="bg-card dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <GitFork size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
              ไม่พบผังวิเคราะห์ Why-Why ตามเงื่อนไขที่ค้นหา
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              คุณสามารถสร้างผังใหม่โดยเลือกเคสแจ้งซ่อมที่เกิดขึ้น หรือปรับตัวกรองค้นหาใหม่
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>สร้างผังวิเคราะห์จากเคสแจ้งซ่อม</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnalyzedItems.map(({ repair, analysis, stats, machine, isMigrated }) => {
            const hasRoot = stats.rootCauseCount > 0;
            const isRecurrence = analysis.occurrenceType === 'recurrence';

            return (
              <div
                key={repair.id}
                onClick={() => setActiveRepairId(repair.id)}
                className="group bg-card dark:bg-slate-900 border border-border dark:border-slate-800 hover:border-cyan-500/70 dark:hover:border-cyan-500 rounded-2xl p-4 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden"
              >
                {/* Top Row: Machine & Date */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                        {repair.machineId}
                      </span>
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[150px]">
                        {machine?.name || 'เครื่องจักร'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isRecurrence ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          ⚠️ เกิดซ้ำ
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          เกิดครั้งแรก
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Phenomenon / Symptoms */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">
                      {analysis.phenomenon || repair.symptoms}
                    </h3>
                    {analysis.phenomenon && analysis.phenomenon !== repair.symptoms && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        อาการเดิม: {repair.symptoms}
                      </p>
                    )}
                  </div>

                  {/* Root Cause or Pending Banner */}
                  {hasRoot ? (
                    <div className="p-2 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                        <Target size={12} />
                        <span>สาเหตุรากเหง้า (Root Cause):</span>
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2 font-medium pl-3.5">
                        {stats.rootCauses[0]}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <HelpCircle size={13} className="text-amber-500" />
                      <span>ยังไม่ได้ระบุสาเหตุรากเหง้า (รอพิสูจน์)</span>
                    </div>
                  )}
                </div>

                {/* Bottom Footer: Stats Badges & Date */}
                <div className="pt-2 border-t border-border dark:border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">
                      ลึก {stats.maxDepth} ชั้น
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">
                      {analysis.branches?.length || 1} กิ่ง
                    </span>
                    {stats.ngCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 font-mono text-[10px] font-bold">
                        NG {stats.ngCount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <Calendar size={11} />
                    <span>{repair.date}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Analysis by picking a breakdown repair */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="bg-card dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <GitFork size={18} className="text-cyan-600 dark:text-cyan-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  เลือกเคสแจ้งซ่อม (Breakdown) เพื่อสร้างผังวิเคราะห์ Why-Why
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              กรุณาเลือกเคสแจ้งซ่อมที่ต้องการวิเคราะห์ ระบบจะดึงอาการเสีย (Symptoms) และเครื่องจักรมาเป็นจุดตั้งต้นของผังวิเคราะห์โดยอัตโนมัติ:
            </p>

            {/* Modal Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาอาการเสีย, ช่าง, เครื่องจักร..."
                  value={createSearchTerm}
                  onChange={(e) => setCreateSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={createMachineFilter}
                onChange={(e) => setCreateMachineFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="">ทุกเครื่องจักร</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>{m.id} - {m.name}</option>
                ))}
              </select>
            </div>

            {/* List of unanalyzed cases */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[240px]">
              {filteredUnanalyzedRepairs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs">
                  {unanalyzedRepairs.length === 0
                    ? 'เคสแจ้งซ่อมทั้งหมดได้รับการวิเคราะห์ Why-Why เรียบร้อยแล้ว!'
                    : 'ไม่พบเคสที่ตรงกับคำค้นหา'}
                </div>
              ) : (
                filteredUnanalyzedRepairs.map((r) => {
                  const m = machineMap.get(r.machineId);
                  return (
                    <div
                      key={r.id}
                      onClick={() => handleCreateAnalysisForRepair(r)}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500 bg-white hover:bg-cyan-50/50 dark:bg-slate-950 dark:hover:bg-slate-850 text-left transition cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {r.machineId}
                          </span>
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {m?.name || 'เครื่องจักร'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ({r.date})
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
                          {r.symptoms}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                          <span>ช่าง: {r.technician}</span>
                          <span>•</span>
                          <span>เวลาซ่อม: {r.duration} นาที</span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span className="px-3 py-1.5 rounded-lg bg-cyan-600 group-hover:bg-cyan-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-1">
                          <Plus size={13} />
                          <span>เลือกสร้างผัง</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
