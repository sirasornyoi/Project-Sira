import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Machine, PMPlan } from '../types';
import { 
  Plus, Search, ChevronDown, ChevronUp, FileSpreadsheet, Settings, 
  Trash2, Edit3, AlertTriangle, Layers, ListFilter, Eye, CheckCircle2,
  FolderOpen, Folder
} from 'lucide-react';

interface MachineGroup {
  name: string;
  machines: Machine[];
  lineGroups: string[];
  totalPmPlans: number;
  totalMonthlyBd: number;
  breakdownCount: number;
}

export const MachinePage: React.FC = () => {
  const { machines, setMachines, pmPlans, repairs } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMachineId, setExpandedMachineId] = useState<string | null>(null);
  
  // View mode: 'grouped' (machines with same name grouped together) or 'flat'
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  // State for which machine name groups are expanded
  const [expandedGroupNames, setExpandedGroupNames] = useState<Set<string>>(new Set());
  
  // Modal states for adding a machine
  const [showAddModal, setShowAddModal] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newLineGroup, setNewLineGroup] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal states for editing a machine
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [editName, setEditName] = useState('');
  const [editLineGroup, setEditLineGroup] = useState('');
  const [editStatus, setEditStatus] = useState<'ปกติ' | 'เสีย/ซ่อม'>('ปกติ');
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // Confirmation state for deleting a machine
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Get active breakdown status based on the latest repairs
  const currentMonth = "2026-06"; // Current local time is June 2026

  const getMachineStats = (mId: string) => {
    // Breakdown count of current month
    const monthlyBdCount = repairs.filter(r => r.machineId === mId && r.date.startsWith(currentMonth)).length;
    
    // PM Plans linked to this machine
    const matchedPmPlans = pmPlans.filter(p => p.machineId === mId);
    
    const machineRecord = machines.find(m => m.id === mId);
    const isRepairing = repairs.some(r => r.machineId === mId && (!r.repairDoneTime || r.repairDoneTime === ''));
    const status = isRepairing ? 'เสีย/ซ่อม' : (machineRecord?.status || 'ปกติ');

    return {
      pmCount: matchedPmPlans.length,
      monthlyBdCount,
      status,
      linkedPlans: matchedPmPlans
    };
  };

  const filteredMachines = machines.filter(m => 
    m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.lineGroup.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group machines with identical names together
  const machineGroups: MachineGroup[] = useMemo(() => {
    const map = new Map<string, Machine[]>();
    for (const m of filteredMachines) {
      const key = m.name.trim().toUpperCase();
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(m);
    }

    const groups: MachineGroup[] = [];
    map.forEach((machs, name) => {
      // Sort machines by ID naturally
      machs.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
      
      let totalPmPlans = 0;
      let totalMonthlyBd = 0;
      let breakdownCount = 0;
      const lines = new Set<string>();

      for (const m of machs) {
        if (m.lineGroup) lines.add(m.lineGroup);
        const st = getMachineStats(m.id);
        totalPmPlans += st.pmCount;
        totalMonthlyBd += st.monthlyBdCount;
        if (st.status === 'เสีย/ซ่อม') {
          breakdownCount++;
        }
      }

      groups.push({
        name,
        machines: machs,
        lineGroups: Array.from(lines),
        totalPmPlans,
        totalMonthlyBd,
        breakdownCount,
      });
    });

    // Sort groups alphabetically by name
    groups.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return groups;
  }, [filteredMachines, pmPlans, repairs, currentMonth]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroupNames(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const expandAllGroups = () => {
    setExpandedGroupNames(new Set(machineGroups.map(g => g.name)));
  };

  const collapseAllGroups = () => {
    setExpandedGroupNames(new Set());
  };

  const isGroupExpanded = (groupName: string) => {
    if (searchTerm.trim() !== '') return true; // Auto-expand when searching
    return expandedGroupNames.has(groupName);
  };

  const handleAddMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newName) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    const trimmedId = newId.trim().toUpperCase();
    if (machines.some(m => m.id === trimmedId)) {
      setErrorMsg('รหัสเครื่องจักรนี้มีอยู่แล้วในระบบ');
      return;
    }

    const newMachine: Machine = {
      id: trimmedId,
      name: newName.trim().toUpperCase(),
      lineGroup: newLineGroup.trim() || 'ทั่วไป',
      status: 'ปกติ'
    };

    setMachines(prev => [newMachine, ...prev]);
    setShowAddModal(false);
    
    // Automatically expand the group for the newly added machine so user sees it immediately
    setExpandedGroupNames(prev => new Set(prev).add(newMachine.name));

    // Reset Form
    setNewId('');
    setNewName('');
    setNewLineGroup('');
    setErrorMsg('');
  };

  const handleEditClick = (m: Machine) => {
    setEditingMachine(m);
    setEditName(m.name);
    setEditLineGroup(m.lineGroup);
    setEditStatus(m.status || 'ปกติ');
    setEditErrorMsg('');
    setShowEditModal(true);
  };

  const handleEditMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMachine) return;
    if (!editName) {
      setEditErrorMsg('กรุณากรอกชื่อเครื่องจักร');
      return;
    }

    setMachines(prev => prev.map(m => {
      if (m.id === editingMachine.id) {
        return {
          ...m,
          name: editName.trim().toUpperCase(),
          lineGroup: editLineGroup.trim() || 'ทั่วไป',
          status: editStatus
        };
      }
      return m;
    }));

    setShowEditModal(false);
    setEditingMachine(null);
  };

  const handleDeleteClick = (m: Machine) => {
    setMachineToDelete(m);
    setShowDeleteConfirm(true);
  };

  const executeDeleteMachine = () => {
    if (!machineToDelete) return;
    setMachines(prev => prev.filter(m => m.id !== machineToDelete.id));
    setShowDeleteConfirm(false);
    setMachineToDelete(null);
  };

  const toggleExpandRow = (mId: string) => {
    setExpandedMachineId(expandedMachineId === mId ? null : mId);
  };

  // Helper to render machine deep detail (PM plans & MTTR stats)
  const renderMachineDetails = (m: Machine, stats: ReturnType<typeof getMachineStats>, unitLabel?: string) => {
    return (
      <div className="border-l-4 border-cyan-500 bg-slate-900/90 p-4 sm:p-5 space-y-4 rounded-r-xl">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
          <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-2">
            <Settings size={14} />
            รายละเอียด {unitLabel ? `${unitLabel}: ` : ''}{m.id} - {m.name} ({m.lineGroup})
          </h4>
          <span className="text-[11px] text-slate-400">
            สถานะ: {stats.status === 'ปกติ' ? 'ปกติ / Normal' : 'เสีย-ซ่อม / Breakdown'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PM list */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-cyan-400"></span>
              รายการแผน PM ประจำเครื่อง
            </h4>
            {stats.linkedPlans.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                ยังไม่มีการระบุแผนบำรุงรักษาเชิงป้องกัน (PM) สำหรับเครื่องไฟฟ้านี้
              </p>
            ) : (
              <div className="grid gap-2">
                {stats.linkedPlans.map(plan => (
                  <div 
                    key={plan.id}
                    className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-xs text-slate-200 font-medium">{plan.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-medium px-2 py-0.5 rounded">
                          {plan.frequency}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {plan.steps.length} ขั้นตอน
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">เวลามาตรฐาน TTM</p>
                      <p className="text-sm font-mono font-bold text-cyan-400">{plan.ttm} นาที</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historical repair overview */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-rose-500"></span>
              ประวัติการซ่อมบำรุง (ยอดสะสมล่าสุด)
            </h4>
            <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 grid grid-cols-2 gap-4">
              <div className="text-center p-2 bg-slate-900/60 rounded">
                <p className="text-[10px] text-slate-400 uppercase">ยอดซ่อมสะสมทั้งหมด</p>
                <p className="text-lg font-mono font-extrabold text-rose-400 mt-1">
                  {repairs.filter(r => r.machineId === m.id).length} ครั้ง
                </p>
              </div>

              <div className="text-center p-2 bg-slate-900/60 rounded">
                <p className="text-[10px] text-slate-400 uppercase">เวลารอซ่อมเฉลี่ย MTTR</p>
                <p className="text-lg font-mono font-extrabold text-amber-400 mt-1">
                  {(() => {
                    const machReps = repairs.filter(r => r.machineId === m.id);
                    if (machReps.length === 0) return "-";
                    const total = machReps.reduce((sum, r) => sum + r.duration, 0);
                    return `${(total / machReps.length).toFixed(1)} นาที`;
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" id="mach-page-root">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cyan-400 tracking-tight flex items-center gap-2">
            🏭 ข้อมูลทะเบียนเครื่องจักร
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            เครื่องจักรชื่อเดียวกันจัดกลุ่มรวมกัน คลิกเพื่อคลี่ดูแยกตามลำดับเครื่องที่ 1, 2, 3...
          </p>
        </div>
        <button
          id="btn-add-machine"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-900 font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md focus:ring-2 focus:ring-cyan-400 focus:outline-none text-sm cursor-pointer"
        >
          <Plus size={18} />
          เพิ่มเครื่องจักรใหม่
        </button>
      </div>

      {/* Filter and search block */}
      <div className="bg-slate-800 border border-slate-700/80 rounded-xl p-4 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            id="machine-search-input"
            type="text"
            placeholder="ค้นหาด้วย รหัส ID หรือ ชื่อเครื่องจักร..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-200 placeholder-slate-500 font-sans focus:outline-none focus:border-cyan-500 text-sm"
          />
        </div>

        {/* View mode & expand controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700 rounded-lg p-1 text-xs">
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                viewMode === 'grouped'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={14} />
              <span>จัดกลุ่มตามชื่อ ({machineGroups.length} กลุ่ม)</span>
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                viewMode === 'flat'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListFilter size={14} />
              <span>แสดงเรียงทุกเครื่อง ({filteredMachines.length})</span>
            </button>
          </div>

          {/* Expand/Collapse All buttons (shown in grouped mode) */}
          {viewMode === 'grouped' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={expandAllGroups}
                className="text-xs bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
                title="ขยายทุกกลุ่มเครื่องจักร"
              >
                <ChevronDown size={13} />
                <span>ขยายทั้งหมด</span>
              </button>
              <button
                onClick={collapseAllGroups}
                className="text-xs bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
                title="ยุบทุกกลุ่มเครื่องจักร"
              >
                <ChevronUp size={13} />
                <span>ยุบทั้งหมด</span>
              </button>
            </div>
          )}

          <div className="text-xs text-slate-400 font-mono flex items-center pl-2">
            เครื่องจักรทั้งหมด: <span className="text-cyan-400 font-bold ml-1 text-sm">{filteredMachines.length}</span> / {machines.length} เครื่อง
          </div>
        </div>
      </div>

      {/* Machine list table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="machine-data-table">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-300 text-xs tracking-wider uppercase">
                <th className="py-4 px-4 w-14 text-center font-medium">ลำดับ</th>
                <th className="py-4 px-4 font-medium">ชื่อเครื่องจักร</th>
                <th className="py-4 px-4 font-mono font-medium">รหัสเครื่องจักร (ID)</th>
                <th className="py-4 px-4 font-medium">ไลน์ / กลุ่มการผลิต</th>
                <th className="py-4 px-4 text-center font-medium">แผน PM</th>
                <th className="py-4 px-4 text-center font-medium">BD เดือนนี้</th>
                <th className="py-4 px-4 text-center font-medium">สถานะ</th>
                <th className="py-4 px-4 text-center w-40">
                  {viewMode === 'grouped' ? 'คลิกดูแยกเครื่อง' : 'การจัดการ'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 bg-slate-900/20">
                    <p className="text-base font-medium">ไม่พบข้อมูลเครื่องจักร</p>
                    <p className="text-xs mt-1 text-slate-400">ลองค้นด้วยรหัสอื่นหรือกดเพิ่มเครื่องจักรใหม่ด้านบน</p>
                  </td>
                </tr>
              ) : viewMode === 'grouped' ? (
                /* -------------------------------------------------------------
                   GROUPED VIEW: Machines with same name grouped together
                   ------------------------------------------------------------- */
                machineGroups.map((group, gIndex) => {
                  const isExpanded = isGroupExpanded(group.name);
                  const isSingle = group.machines.length === 1;

                  return (
                    <React.Fragment key={group.name}>
                      {/* Group Header Row */}
                      <tr 
                        id={`group-row-${group.name}`}
                        onClick={() => toggleGroup(group.name)}
                        className={`hover:bg-slate-700/40 transition-colors cursor-pointer select-none ${
                          isExpanded ? 'bg-slate-700/30 border-l-4 border-cyan-400' : ''
                        }`}
                        title="คลิกเพื่อคลี่ดูแยกตามเครื่องที่ 1, 2, 3..."
                      >
                        <td className="py-4 px-4 text-center text-slate-400 text-xs font-mono">
                          {gIndex + 1}
                        </td>
                        
                        {/* Machine Name & Unit Count Badge */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-100 text-sm tracking-wide">
                              {group.name}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                              group.machines.length > 1
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                : 'bg-slate-700/60 text-slate-300 border-slate-600'
                            }`}>
                              {group.machines.length} เครื่อง (เครื่องที่ 1 - {group.machines.length})
                            </span>
                          </div>
                        </td>

                        {/* Machine IDs in this group */}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1 items-center">
                            {group.machines.map((m, mIdx) => (
                              <span 
                                key={m.id}
                                className="font-mono text-xs px-2 py-0.5 bg-slate-900/90 border border-slate-700 text-cyan-400 font-semibold rounded"
                                title={`เครื่องที่ ${mIdx + 1}: ${m.id}`}
                              >
                                #{mIdx + 1}: {m.id}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Line groups */}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {group.lineGroups.map(line => (
                              <span 
                                key={line}
                                className="bg-slate-900/70 text-slate-300 text-[11px] px-2.5 py-1 rounded-full border border-slate-700"
                              >
                                {line}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Total PM Plans */}
                        <td className="py-4 px-4 text-center font-bold text-cyan-300 font-mono text-sm">
                          {group.totalPmPlans} งาน
                        </td>

                        {/* Total Monthly BD */}
                        <td className="py-4 px-4 text-center font-mono font-bold">
                          {group.totalMonthlyBd > 0 ? (
                            <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              {group.totalMonthlyBd} ครั้ง
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* Status Summary */}
                        <td className="py-4 px-4 text-center">
                          {group.breakdownCount === 0 ? (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              ปกติทุกเครื่อง ({group.machines.length}/{group.machines.length})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs px-2.5 py-1 rounded-full font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                              เสีย/ซ่อม ({group.breakdownCount}/{group.machines.length} เครื่อง)
                            </span>
                          )}
                        </td>

                        {/* Expand Button */}
                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            id={`btn-expand-group-${group.name.replace(/\s+/g, '-')}`}
                            onClick={() => toggleGroup(group.name)}
                            className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                              isExpanded
                                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm'
                                : 'bg-slate-900 hover:bg-slate-700 text-cyan-300 border-slate-700 hover:border-cyan-500/40'
                            }`}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            <span>{isExpanded ? 'ยุบรายการ' : `ดูแยกเครื่อง (${group.machines.length})`}</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Section showing each individual machine unit */}
                      {isExpanded && (
                        <tr className="bg-slate-900/60">
                          <td colSpan={8} className="p-0">
                            <div className="border-l-4 border-cyan-500 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900/70 p-4 sm:p-5 space-y-4">
                              {/* Sub-header */}
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 bg-cyan-500/15 rounded text-cyan-400">
                                    <Layers size={16} />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-200">
                                      เครื่องจักรประเภท: <span className="text-cyan-400 font-extrabold">{group.name}</span>
                                    </h4>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      แยกแสดงรายการแต่ละเครื่องอย่างชัดเจน (ทั้งหมด {group.machines.length} เครื่อง ตั้งแต่เครื่องที่ 1 ถึงเครื่องที่ {group.machines.length})
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800">
                                  {group.machines.length} เครื่องในกลุ่มนี้
                                </span>
                              </div>

                              {/* Individual machines sub-table */}
                              <div className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-950/80 shadow-inner">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                                      <th className="py-3 px-4 w-28 text-center">ลำดับเครื่อง</th>
                                      <th className="py-3 px-4 w-32 font-mono font-medium">รหัสเครื่อง (ID)</th>
                                      <th className="py-3 px-4 font-medium">ชื่อเต็มและลำดับ</th>
                                      <th className="py-3 px-4 font-medium">ไลน์ / กลุ่ม</th>
                                      <th className="py-3 px-4 text-center font-medium">แผน PM</th>
                                      <th className="py-3 px-4 text-center font-medium">BD เดือนนี้</th>
                                      <th className="py-3 px-4 text-center font-medium">สถานะ</th>
                                      <th className="py-3 px-4 text-center w-36">การจัดการ</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/80">
                                    {group.machines.map((m, mIndex) => {
                                      const stats = getMachineStats(m.id);
                                      const isDetailExpanded = expandedMachineId === m.id;
                                      const unitNumber = mIndex + 1;

                                      return (
                                        <React.Fragment key={m.id}>
                                          <tr 
                                            id={`unit-row-${m.id}`}
                                            className={`hover:bg-slate-800/40 transition-colors ${
                                              isDetailExpanded ? 'bg-slate-800/50' : ''
                                            }`}
                                          >
                                            {/* Machine Unit Number Badge */}
                                            <td className="py-3 px-4 text-center">
                                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                                เครื่องที่ {unitNumber}
                                              </span>
                                            </td>

                                            {/* ID */}
                                            <td className="py-3 px-4 font-mono font-bold text-cyan-400 text-sm">
                                              {m.id}
                                            </td>

                                            {/* Name with Unit number */}
                                            <td className="py-3 px-4 font-medium text-slate-200">
                                              {m.name} <span className="text-cyan-400 font-semibold">(เครื่องที่ {unitNumber})</span>
                                            </td>

                                            {/* Line */}
                                            <td className="py-3 px-4">
                                              <span className="bg-slate-900 text-slate-300 text-[11px] px-2.5 py-1 rounded-full border border-slate-800">
                                                {m.lineGroup}
                                              </span>
                                            </td>

                                            {/* PM Count */}
                                            <td className="py-3 px-4 text-center font-bold text-cyan-300 font-mono">
                                              {stats.pmCount} งาน
                                            </td>

                                            {/* BD Count */}
                                            <td className="py-3 px-4 text-center font-mono font-bold">
                                              {stats.monthlyBdCount > 0 ? (
                                                <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                                  {stats.monthlyBdCount} ครั้ง
                                                </span>
                                              ) : (
                                                <span className="text-slate-400">0</span>
                                              )}
                                            </td>

                                            {/* Status */}
                                            <td className="py-3 px-4 text-center">
                                              {stats.status === 'ปกติ' ? (
                                                <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-medium">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                  ปกติ / Normal
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs px-2 py-0.5 rounded-full font-medium">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                                                  เสีย-ซ่อม / Breakdown
                                                </span>
                                              )}
                                            </td>

                                            {/* Action Buttons for this specific machine unit */}
                                            <td className="py-3 px-4 text-center">
                                              <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                  id={`btn-edit-${m.id}`}
                                                  onClick={() => handleEditClick(m)}
                                                  className="bg-slate-900 hover:bg-slate-800 p-1.5 rounded-lg border border-slate-700/80 text-slate-300 hover:text-amber-400 hover:border-amber-500/40 transition cursor-pointer"
                                                  title={`แก้ไขข้อมูลเครื่องที่ ${unitNumber} (${m.id})`}
                                                >
                                                  <Edit3 size={14} className="text-amber-400" />
                                                </button>
                                                <button
                                                  id={`btn-delete-${m.id}`}
                                                  onClick={() => handleDeleteClick(m)}
                                                  className="bg-slate-900 hover:bg-slate-800 p-1.5 rounded-lg border border-slate-700/80 text-slate-300 hover:text-rose-450 hover:border-rose-500/40 transition cursor-pointer"
                                                  title={`ลบเครื่องที่ ${unitNumber} (${m.id})`}
                                                >
                                                  <Trash2 size={14} className="text-rose-400" />
                                                </button>
                                                <button
                                                  id={`btn-expand-${m.id}`}
                                                  onClick={() => toggleExpandRow(m.id)}
                                                  className={`px-2 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1 text-[11px] font-medium ${
                                                    isDetailExpanded
                                                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-cyan-400'
                                                  }`}
                                                  title={`ดูรายละเอียดแผน PM และสถิติของเครื่องที่ ${unitNumber}`}
                                                >
                                                  {isDetailExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                  <span>{isDetailExpanded ? 'ปิด' : 'แผน PM'}</span>
                                                </button>
                                              </div>
                                            </td>
                                          </tr>

                                          {/* Deep Detail Section (PM plans & MTTR) for this exact machine */}
                                          {isDetailExpanded && (
                                            <tr className="bg-slate-900/90">
                                              <td colSpan={8} className="p-3">
                                                {renderMachineDetails(m, stats, `เครื่องที่ ${unitNumber}`)}
                                              </td>
                                            </tr>
                                          )}
                                        </React.Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                /* -------------------------------------------------------------
                   FLAT VIEW: Flat list showing all individual machines
                   ------------------------------------------------------------- */
                filteredMachines.map((m, index) => {
                  const stats = getMachineStats(m.id);
                  const isExpanded = expandedMachineId === m.id;

                  return (
                    <React.Fragment key={m.id}>
                      <tr 
                        id={`row-${m.id}`}
                        className={`hover:bg-slate-700/30 transition-colors ${isExpanded ? 'bg-slate-700/20' : ''}`}
                      >
                        <td className="py-4 px-4 text-center text-slate-400 text-xs font-mono">
                          {index + 1}
                        </td>
                        <td className="py-4 px-4 font-medium text-slate-200">
                          {m.name}
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-cyan-400 text-sm">
                          {m.id}
                        </td>
                        <td className="py-4 px-4">
                          <span className="bg-slate-900/60 text-slate-300 text-[11px] px-2.5 py-1 rounded-full border border-slate-700">
                            {m.lineGroup}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-cyan-300 font-mono">
                          {stats.pmCount} งาน
                        </td>
                        <td className="py-4 px-4 text-center font-mono font-bold">
                          {stats.monthlyBdCount > 0 ? (
                            <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              {stats.monthlyBdCount} ครั้ง
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {stats.status === 'ปกติ' ? (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              ปกติ / Normal
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs px-2.5 py-1 rounded-full font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                              เสีย-ซ่อม / Breakdown
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`btn-edit-${m.id}`}
                              onClick={() => handleEditClick(m)}
                              className="bg-slate-900 hover:bg-slate-950 p-1.5 rounded-lg border border-slate-700/60 text-slate-300 hover:text-amber-400 hover:border-amber-500/40 transition cursor-pointer"
                              title="แก้ไขทะเบียนเครื่องจักร"
                            >
                              <Edit3 size={14} className="text-amber-400" />
                            </button>
                            <button
                              id={`btn-delete-${m.id}`}
                              onClick={() => handleDeleteClick(m)}
                              className="bg-slate-900 hover:bg-slate-950 p-1.5 rounded-lg border border-slate-700/60 text-slate-300 hover:text-rose-450 hover:border-rose-500/40 transition cursor-pointer"
                              title="ลบทะเบียนเครื่องจักร"
                            >
                              <Trash2 size={14} className="text-rose-400" />
                            </button>
                            <button
                              id={`btn-expand-${m.id}`}
                              onClick={() => toggleExpandRow(m.id)}
                              className="bg-slate-900 hover:bg-slate-950 p-1.5 rounded-lg border border-slate-700/60 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition cursor-pointer"
                              title="ดูรายละเอียดเชิงลึก"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Section */}
                      {isExpanded && (
                        <tr className="bg-slate-900/40">
                          <td colSpan={8} className="p-3">
                            {renderMachineDetails(m, stats)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Machine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" id="machine-add-modal-overlay">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-155" id="machine-add-modal">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/80 p-5 flex justify-between items-center">
              <h3 className="text-base font-semibold text-cyan-400 flex items-center gap-2">
                ➕ เพิ่มข้อมูลทะเบียนเครื่องจักรใหม่
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xl font-medium focus:outline-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleAddMachine} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-lg flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">รหัสเครื่องจักร (Machine ID)*</label>
                <input
                  id="modal-machine-id"
                  type="text"
                  required
                  placeholder="ตัวอย่างเช่น RIM01, FFS04, BCF07"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 uppercase placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">ชื่อเครื่องจักร (Machine Name)*</label>
                <input
                  id="modal-machine-name"
                  type="text"
                  required
                  placeholder="ตัวอย่างเช่น RICE MIXER, BANDING, INK JET"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 uppercase placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">ไลน์ผลิต / กลุ่มการจัดหมวดหมู่</label>
                <input
                  id="modal-machine-line"
                  type="text"
                  placeholder="ตัวอย่างเช่น LINE A, PACKING, ROBOT, UTILITY"
                  value={newLineGroup}
                  onChange={(e) => setNewLineGroup(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-700/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs tracking-wide px-4 py-2.5 rounded-lg transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  id="modal-btn-save-machine"
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide px-5 py-2.5 rounded-lg transition cursor-pointer"
                >
                  บันทึกทะเบียน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Machine Modal */}
      {showEditModal && editingMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" id="machine-edit-modal-overlay">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-155" id="machine-edit-modal">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/80 p-5 flex justify-between items-center">
              <h3 className="text-base font-semibold text-amber-400 flex items-center gap-2">
                ✏️ แก้ไขข้อมูลทะเบียนเครื่องจักร
              </h3>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMachine(null);
                }}
                className="text-slate-400 hover:text-slate-200 text-xl font-medium focus:outline-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleEditMachine} className="p-6 space-y-4">
              {editErrorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-lg flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  {editErrorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">รหัสเครื่องจักร (Machine ID)</label>
                <div className="bg-slate-900 border border-slate-700/50 rounded-lg px-3.5 py-2 font-mono text-sm text-slate-400 select-none">
                  {editingMachine.id}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  * ไม่สามารถแก้ไขรหัส ID ที่ใช้เชื่อมโยงกับแผนงานและสถิติอื่นๆ ได้
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">ชื่อเครื่องจักร (Machine Name)*</label>
                <input
                  id="modal-edit-machine-name"
                  type="text"
                  required
                  placeholder="ตัวอย่างเช่น RICE MIXER, BANDING, INK JET"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 uppercase placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">ไลน์ผลิต / กลุ่มการจัดหมวดหมู่</label>
                <input
                  id="modal-edit-machine-line"
                  type="text"
                  placeholder="ตัวอย่างเช่น LINE A, PACKING, ROBOT, UTILITY"
                  value={editLineGroup}
                  onChange={(e) => setEditLineGroup(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">สถานะของเครื่องจักร</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'ปกติ' | 'เสีย/ซ่อม')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="ปกติ">ปกติ (Normal)</option>
                  <option value="เสีย/ซ่อม">เสีย / ซ่อม (Breakdown)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-700/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMachine(null);
                  }}
                  className="border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs tracking-wide px-4 py-2.5 rounded-lg transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  id="modal-btn-update-machine"
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wide px-5 py-2.5 rounded-lg transition cursor-pointer"
                >
                  อัปเดตข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && machineToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" id="machine-delete-modal-overlay">
          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-155 text-xs text-slate-200" id="machine-delete-modal">
            <div className="bg-slate-900 border-b border-slate-700/80 p-5 flex items-center gap-2.5">
              <AlertTriangle className="text-rose-450 shrink-0" size={20} />
              <h3 className="text-sm font-bold text-slate-100">
                ยืนยันการลบข้อมูลเครื่องจักรอย่างถาวร?
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-slate-300 font-sans leading-relaxed text-[13px]">
                คุณแน่ใจหรือไม่ว่าต้องการลบเครื่องจักร <span className="text-rose-400 font-mono font-bold">{machineToDelete.id}</span> ({machineToDelete.name}) ออกจากระบบทะเบียน?
              </p>

              <div className="bg-[#10080a] border border-rose-500/15 p-4.5 rounded-xl space-y-2">
                <span className="text-[10px] text-rose-400 font-black tracking-wider uppercase block">⚠️ คำเตือนผลกระทบ:</span>
                <p className="text-slate-400 text-[11px] leading-relaxed font-sans">
                  การลบทะเบียนนี้จะลบสัญลักษณ์ไอคอนและข้อมูลเครื่องพิกัดนี้ออก โดยเครื่องจักรดังกล่าวมีแผนบำรุงรักษา PM พ่วงอยู่จำนวน <b className="text-white font-mono">{pmPlans.filter(p => p.machineId === machineToDelete.id).length} แผนงาน</b>
                </p>
              </div>
              
              <div className="pt-4 border-t border-slate-700/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setMachineToDelete(null);
                  }}
                  className="border border-slate-700 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  id="modal-btn-delete-machine-confirm"
                  onClick={executeDeleteMachine}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-2 rounded-lg transition cursor-pointer"
                >
                  ยืนยันลบข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

