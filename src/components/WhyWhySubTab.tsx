import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { RepairLog, Machine, WhyWhyAnalysis } from '../types';
import { WhyWhyTreeEditor } from './WhyWhyTreeEditor';
import { 
  migrateLegacyWhyToTree, 
  extractLegacyWhys, 
  createDefaultWhyWhyAnalysis,
  getWhyWhyAnalysisStats,
  recomputeRootCauses
} from '../utils/whyWhyUtils';
import { 
  GitFork, 
  Plus, 
  Search, 
  Calendar, 
  Target, 
  ArrowLeft, 
  Filter, 
  Wrench,
  HelpCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface WhyWhySubTabProps {
  repairs?: RepairLog[];
  setRepairs?: React.Dispatch<React.SetStateAction<RepairLog[]>>;
  machines?: Machine[];
  technicians?: string[];
  focusedRepairId?: string | null;
  onClearFocusedRepairId?: () => void;
  onNavigateToBdCase: (repair: RepairLog) => void;
}

export const WhyWhySubTab: React.FC<WhyWhySubTabProps> = ({
  repairs: propRepairs,
  setRepairs: propSetRepairs,
  machines: propMachines,
  technicians: propTechnicians,
  focusedRepairId,
  onClearFocusedRepairId,
  onNavigateToBdCase
}) => {
  const app = useApp();
  const repairs = propRepairs || app.repairs;
  const setRepairs = propSetRepairs || app.setRepairs;
  const machines = propMachines || app.machines;
  const technicians = propTechnicians || app.technicians;

  // Selected repair for full-screen Why-Why editor
  const [activeRepairId, setActiveRepairId] = useState<string | null>(focusedRepairId || null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [machineFilter, setMachineFilter] = useState('');
  const [occurrenceFilter, setOccurrenceFilter] = useState<'all' | 'first' | 'recurrence'>('all');
  const [hasRootCauseFilter, setHasRootCauseFilter] = useState<'all' | 'has_root' | 'pending'>('all');

  // Modal for creating analysis by pairing an unanalyzed breakdown case
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSearchTerm, setCreateSearchTerm] = useState('');
  const [createMachineFilter, setCreateMachineFilter] = useState('');

  // Sync when focusedRepairId changes from parent
  useEffect(() => {
    if (focusedRepairId) {
      setActiveRepairId(focusedRepairId);
    } else if (focusedRepairId === null) {
      setActiveRepairId(null);
    }
  }, [focusedRepairId]);

  // Machine lookup map
  const machineMap = useMemo(() => {
    const map = new Map<string, Machine>();
    machines.forEach(m => map.set(m.id, m));
    return map;
  }, [machines]);

  // List of all repairs with their Why-Why analysis (either existing or migrated from legacy why1..why5)
  const analyzedItems = useMemo(() => {
    return repairs
      .map(repair => {
        const hasDirectWhyWhy = Boolean(repair.whyWhy && repair.whyWhy.branches && repair.whyWhy.branches.length > 0);
        const hasLegacyWhys = Boolean(
          repair.why1 || repair.why2 || repair.why3 || repair.why4 || repair.why5
        );

        if (!hasDirectWhyWhy && !hasLegacyWhys) {
          return null;
        }

        const analysis: WhyWhyAnalysis = hasDirectWhyWhy && repair.whyWhy
          ? {
              ...repair.whyWhy,
              repairId: repair.id,
              machineId: repair.machineId
            }
          : migrateLegacyWhyToTree(repair);

        const stats = getWhyWhyAnalysisStats(analysis);
        const machine = machineMap.get(repair.machineId);

        return {
          repair,
          analysis,
          stats,
          machine,
          isMigrated: !hasDirectWhyWhy && hasLegacyWhys
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [repairs, machineMap]);

  // Breakdown repairs that do NOT have a custom tree yet
  const unanalyzedRepairs = useMemo(() => {
    return repairs.filter(r => !r.whyWhy || !r.whyWhy.branches || r.whyWhy.branches.length === 0);
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

    const branchesWithRecomputedRoots = updatedAnalysis.branches?.map(b => ({
      ...b,
      root: recomputeRootCauses(b.root)
    })) || [];

    const preparedAnalysis: WhyWhyAnalysis = {
      ...updatedAnalysis,
      branches: branchesWithRecomputedRoots,
      repairId: targetRepair.id,
      machineId: targetRepair.machineId,
      updatedAt: new Date().toISOString()
    };

    const legacyWhys = extractLegacyWhys(preparedAnalysis);

    setRepairs(prev => prev.map(r => {
      if (r.id === targetRepairId) {
        return {
          ...r,
          whyWhy: preparedAnalysis,
          why1: legacyWhys.why1,
          why2: legacyWhys.why2,
          why3: legacyWhys.why3,
          why4: legacyWhys.why4,
          why5: legacyWhys.why5
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
    if (onClearFocusedRepairId) {
      onClearFocusedRepairId();
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
  /* VIEW 1: FULL WHY-WHY TREE EDITOR                                           */
  /* -------------------------------------------------------------------------- */
  if (activeRepair && activeAnalysis) {
    const machine = machineMap.get(activeRepair.machineId);

    return (
      <div className="flex flex-col h-full bg-bg text-fg space-y-4 font-sans animate-in fade-in duration-150">
        {/* Top Navigation Bar */}
        <div className="bg-white dark:bg-slate-900 border border-border dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
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
                เคสแจ้งซ่อม (BD): <span className="font-semibold text-slate-700 dark:text-slate-300">{activeRepair.symptoms}</span> ({activeRepair.date})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateToBdCase(activeRepair)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
              title="เปิดดูรายละเอียดเคสนี้ในแท็บแจ้งซ่อม/ประวัติ (BD)"
            >
              <Wrench size={13} className="text-cyan-600 dark:text-cyan-400" />
              <span>ไปที่เคส BD นี้</span>
            </button>
          </div>
        </div>

        {/* Full Tree Editor */}
        <div className="bg-white dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs">
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
    <div className="space-y-6 font-sans" id="why-why-subtab-root">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <GitFork className="text-cyan-500" size={24} />
            <span>ผังวิเคราะห์สาเหตุรากเหง้า (Why-Why Analysis)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            วิเคราะห์สาเหตุเชิงลึกแบบต้นไม้แตกกิ่งไม่จำกัดชั้น จับคู่สองทางกับเคสแจ้งซ่อม (Breakdown)
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateSearchTerm('');
            setCreateMachineFilter('');
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-sm hover:shadow-md transition cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>สร้าง/จับคู่ Why-Why</span>
        </button>
      </div>

      {/* KPI Overview Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-border dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>ผังทั้งหมด</span>
            <GitFork size={14} className="text-cyan-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {totalAnalyzed}
          </div>
          <span className="text-[10px] text-slate-400">จากเคสที่บันทึกข้อมูล</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-border dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>พบรากเหง้าแล้ว</span>
            <Target size={14} className="text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {rootCausesIdentified}
          </div>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
            {totalAnalyzed > 0 ? `${Math.round((rootCausesIdentified / totalAnalyzed) * 100)}% สรุปผลแล้ว` : '0%'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-border dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>เคสเกิดซ้ำ</span>
            <Sparkles size={14} className="text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {recurrenceCount}
          </div>
          <span className="text-[10px] text-rose-500/80">
            {recurrenceCount > 0 ? 'จำเป็นต้องซัก 3 มิติ' : 'ไม่มีเคสเกิดซ้ำ'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-border dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>รอสร้างผัง</span>
            <HelpCircle size={14} className="text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {unanalyzedRepairs.length}
          </div>
          <span className="text-[10px] text-amber-600/80">เคส BD ยังไม่มีผังต้นไม้</span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-900 border border-border dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาผัง, อาการ, เครื่อง, สาเหตุ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-fg dark:text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Machine Filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400 shrink-0" />
            <select
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-fg dark:text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="">เครื่องจักรทั้งหมด ({machines.length})</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>
                  {m.id} - {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Occurrence Type Filter */}
          <select
            value={occurrenceFilter}
            onChange={(e) => setOccurrenceFilter(e.target.value as any)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-fg dark:text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">มิติการเกิด: ทั้งหมด</option>
            <option value="first">เกิดครั้งแรก (First Occurrence)</option>
            <option value="recurrence">เกิดซ้ำ (Recurrence - 3 มิติ)</option>
          </select>

          {/* Root Cause Filter */}
          <select
            value={hasRootCauseFilter}
            onChange={(e) => setHasRootCauseFilter(e.target.value as any)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-fg dark:text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">สถานะรากเหง้า: ทั้งหมด</option>
            <option value="has_root">✓ ระบุสาเหตุรากเหง้าแล้ว</option>
            <option value="pending">รอพิสูจน์ (ยังไม่พบ)</option>
          </select>
        </div>
      </div>

      {/* Grid of Why-Why Cards */}
      {filteredAnalyzedItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <GitFork size={36} className="mx-auto text-slate-300 dark:text-slate-700" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            ไม่พบผังวิเคราะห์ตามเงื่อนไขที่เลือก
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            ท่านสามารถสร้างผังวิเคราะห์ใหม่โดยการจับคู่กับเคสแจ้งซ่อม (Breakdown) ที่ยังไม่มีผัง
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Plus size={14} />
            <span>สร้าง/จับคู่ Why-Why</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnalyzedItems.map(item => {
            const { repair, analysis, stats, machine } = item;
            const isRecurrence = analysis.occurrenceType === 'recurrence';
            const hasRoot = stats.rootCauseCount > 0;

            return (
              <div
                key={repair.id}
                className="group bg-white dark:bg-slate-900 border border-border dark:border-slate-800 hover:border-cyan-500/70 dark:hover:border-cyan-500 rounded-2xl p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3 relative overflow-hidden"
              >
                {/* Top Row: Machine & Occurrence Type */}
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

                  {/* Paired BD Case Info Reference */}
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 text-[10.5px] space-y-1 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Wrench size={11} className="text-cyan-600 dark:text-cyan-400" />
                        <span>อ้างอิงเคส BD:</span>
                      </span>
                      <span className="font-mono text-[10px]">{repair.date}</span>
                    </div>
                    <p className="truncate text-slate-600 dark:text-slate-400 italic">
                      "{repair.symptoms}"
                    </p>
                  </div>
                </div>

                {/* Bottom Footer: Stats Badges, Date, and Actions */}
                <div className="space-y-2 pt-2 border-t border-border dark:border-slate-800/80">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
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

                  {/* Two-way action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onNavigateToBdCase(repair)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                      title="สลับไปที่แท็บแจ้งซ่อม/ประวัติ (BD) เพื่อดูหรือแก้ไขเคสนี้"
                    >
                      <Wrench size={12} className="text-cyan-600 dark:text-cyan-400" />
                      <span>ไปที่เคส BD</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveRepairId(repair.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                      title="เปิดผัง Why-Why เต็มหน้าเพื่อดูหรือแก้ไข"
                    >
                      <GitFork size={12} />
                      <span>ดู/แก้ Why-Why</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Analysis by picking an unanalyzed breakdown repair */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <GitFork size={18} className="text-cyan-600 dark:text-cyan-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  เลือกเคสแจ้งซ่อม (BD) เพื่อสร้าง/จับคู่ผัง Why-Why
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
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-fg dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={createMachineFilter}
                onChange={(e) => setCreateMachineFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-fg dark:text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="">เครื่องจักรทั้งหมด</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.id} - {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* List of unanalyzed cases */}
            <div className="flex-1 overflow-y-auto divide-y divide-border border border-border rounded-xl max-h-[50vh]">
              {filteredUnanalyzedRepairs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  {unanalyzedRepairs.length === 0
                    ? 'เคสแจ้งซ่อมทั้งหมดได้รับการสร้างผัง Why-Why เรียบร้อยแล้ว'
                    : 'ไม่พบคะแนนแจ้งซ่อมที่ตรงกับตัวกรองค้นหา'}
                </div>
              ) : (
                filteredUnanalyzedRepairs.map(repair => {
                  const m = machineMap.get(repair.machineId);

                  return (
                    <div
                      key={repair.id}
                      onClick={() => handleCreateAnalysisForRepair(repair)}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {repair.machineId}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {m?.name || 'เครื่องจักร'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({repair.date})
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          อาการ: {repair.symptoms}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>ช่าง: {repair.technician}</span>
                          <span>•</span>
                          <span>MTTR: {repair.duration} นาที</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateAnalysisForRepair(repair);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 group-hover:bg-cyan-500 text-white font-bold text-xs transition cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <span>สร้างผัง</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
