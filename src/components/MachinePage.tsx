import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Machine, PMPlan } from '../types';
import { 
  Plus, Search, ChevronDown, ChevronUp, FileSpreadsheet, Settings, 
  Trash2, Edit3, AlertTriangle 
} from 'lucide-react';

export const MachinePage: React.FC = () => {
  const { machines, setMachines, pmPlans, repairs } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMachineId, setExpandedMachineId] = useState<string | null>(null);
  
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
  
  // Get active breakdown status based on the latest repairs. Let's say if there is a repair without repairDoneTime or if it is currently marked as "เสีย/ซ่อม"
  // Let's also count breakdowns in the current month (June 2026)
  const currentMonth = "2026-06"; // Current local time is June 2026

  const getMachineStats = (mId: string) => {
    // Breakdown count of current month
    const monthlyBdCount = repairs.filter(r => r.machineId === mId && r.date.startsWith(currentMonth)).length;
    
    // PM Plans linked to this machine
    const matchedPmPlans = pmPlans.filter(p => p.machineId === mId);
    
    // Determine active status: if any repair log on the modern day doesn't have an ended time or is just marked down.
    // Let's assume machine status is 'ปกติ' unless there's an ongoing breakdown or specifically set.
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

  return (
    <div className="space-y-6" id="mach-page-root">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cyan-400 tracking-tight flex items-center gap-2">
            🏭 ข้อมูลทะเบียนเครื่องจักร
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            ลงทะเบียนเครื่องจักร ประเมินความถี่ และตรวจสอบแผนบำรุงรักษาประจำเครื่อง
          </p>
        </div>
        <button
          id="btn-add-machine"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-900 font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md focus:ring-2 focus:ring-cyan-400 focus:outline-none text-sm"
        >
          <Plus size={18} />
          เพิ่มเครื่องจักรใหม่
        </button>
      </div>

      {/* Filter and search block */}
      <div className="bg-slate-800 border border-slate-700/80 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-96">
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
        <div className="text-xs text-slate-400 font-mono self-stretch justify-center md:self-auto flex items-center md:ml-auto">
          จำนวนทั่งหมด: <span className="text-cyan-400 font-bold ml-1 text-sm">{filteredMachines.length}</span> / {machines.length} เครื่อง
        </div>
      </div>

      {/* Machine list table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="machine-data-table">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-300 text-xs tracking-wider uppercase">
                <th className="py-4 px-5 w-16 text-center font-medium">ลำดับ</th>
                <th className="py-4 px-4 w-32 font-mono font-medium">รหัสเครื่องจักร (ID)</th>
                <th className="py-4 px-4 font-medium">ชื่อเครื่องจักร</th>
                <th className="py-4 px-4 font-medium">ไลน์ / กลุ่มการผลิต</th>
                <th className="py-4 px-4 text-center font-medium">แผน PM (งาน)</th>
                <th className="py-4 px-4 text-center font-medium">BD เดือนนี้ (ครั้ง)</th>
                <th className="py-4 px-4 text-center font-medium">สถานะ</th>
                <th className="py-4 px-4 text-center w-36">การจัดการ</th>
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
              ) : (
                filteredMachines.map((m, index) => {
                  const stats = getMachineStats(m.id);
                  const isExpanded = expandedMachineId === m.id;

                  return (
                    <React.Fragment key={m.id}>
                      <tr 
                        id={`row-${m.id}`}
                        className={`hover:bg-slate-700/30 transition-colors ${isExpanded ? 'bg-slate-700/20' : ''}`}
                      >
                        <td className="py-4 px-5 text-center text-slate-400 text-xs font-mono">
                          {index + 1}
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-cyan-400 text-sm">
                          {m.id}
                        </td>
                        <td className="py-4 px-4 font-medium text-slate-200">
                          {m.name}
                        </td>
                        <td className="py-4 px-4">
                          <span className="bg-slate-900/60 text-slate-300 text-[11px] px-2.5 py-1 rounded-full border border-slate-700">
                            {m.lineGroup}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-cyan-300 font-mono">
                          {stats.pmCount}
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
                              正常 / ปกติ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs px-2.5 py-1 rounded-full font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                              故障 / เสีย-ซ่อม
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 justify-items-center">
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

                      {/* Expanded Section showing PM and breakdown reports */}
                      {isExpanded && (
                        <tr className="bg-slate-900/40">
                          <td colSpan={8} className="p-0">
                            <div className="border-l-4 border-cyan-500 bg-slate-900/60 p-5 space-y-4">
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
                  className="border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs tracking-wide px-4 py-2.5 rounded-lg transition"
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
                  <option value="ปกติ">ปกติ (正常)</option>
                  <option value="เสีย/ซ่อม">เสีย / ซ่อม (故障)</option>
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
                  className="border border-slate-700 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  id="modal-btn-delete-machine-confirm"
                  onClick={executeDeleteMachine}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-2 rounded-lg transition"
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
