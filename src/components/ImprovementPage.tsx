import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ImprovementProject, ImprovementWorkLog } from '../types';
import { compressImageFile } from '../utils/imageUtils';
import { 
  Plus, Calendar, PlusCircle, Wrench, Clock, CheckSquare, 
  Trash2, ImageIcon, TrendingUp, HelpCircle, FilePlus, Users
} from 'lucide-react';

export const ImprovementPage: React.FC = () => {
  const { improvements, setImprovements, machines, technicians } = useApp();

  // Selected Project for detail modal
  const [selectedProject, setSelectedProject] = useState<ImprovementProject | null>(null);

  // Custom confirmation overlays for delete actions
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [workLogToDelete, setWorkLogToDelete] = useState<string | null>(null);

  // Modal visibilities
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Project Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newMachine, setNewMachine] = useState('');
  const [newStartDate, setNewStartDate] = useState('2026-06-10');
  const [newPlannedEndDate, setNewPlannedEndDate] = useState('2026-06-25');
  const [newTechnician, setNewTechnician] = useState(technicians[0] || 'ช่าง 1');
  const [newCoTechnicians, setNewCoTechnicians] = useState<string[]>([]);
  const [newPhotoBefore, setNewPhotoBefore] = useState('');

  // Work Log add form states (inside detail modal)
  const [logDate, setLogDate] = useState('2026-06-10');
  const [logHours, setLogHours] = useState<number>(2);
  const [logNote, setLogNote] = useState('');

  // Confirmation Modal state for Kaizen photo deletion
  const [photoToDelete, setPhotoToDelete] = useState<{
    type: 'before' | 'after';
    projId: string;
    projTitle: string;
  } | null>(null);

  // Image upload base64 helpers
  const handlePhotoBeforeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressImageFile(file);
        setNewPhotoBefore(base64);
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }
  };

  const handlePhotoBeforeDetailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedProject) {
      try {
        const base64 = await compressImageFile(file);
        setImprovements(prev => prev.map(p => {
          if (p.id === selectedProject.id) {
            return { ...p, photoBefore: base64 };
          }
          return p;
        }));
        setSelectedProject(prev => prev ? { ...prev, photoBefore: base64 } : null);
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }
    e.target.value = '';
  };

  const handlePhotoAfterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedProject) {
      try {
        const base64 = await compressImageFile(file);
        setImprovements(prev => prev.map(p => {
          if (p.id === selectedProject.id) {
            return { ...p, photoAfter: base64 };
          }
          return p;
        }));
        setSelectedProject(prev => prev ? { ...prev, photoAfter: base64 } : null);
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }
    e.target.value = '';
  };

  const handleRemovePhotoBeforeDetail = () => {
    if (!selectedProject) return;
    setPhotoToDelete({
      type: 'before',
      projId: selectedProject.id,
      projTitle: selectedProject.title
    });
  };

  const handleRemovePhotoAfterDetail = () => {
    if (!selectedProject) return;
    setPhotoToDelete({
      type: 'after',
      projId: selectedProject.id,
      projTitle: selectedProject.title
    });
  };

  const confirmDeletePhotoAction = () => {
    if (!photoToDelete) return;
    const { projId, type } = photoToDelete;
    setImprovements(prev => prev.map(p => {
      if (p.id === projId) {
        const updated = { ...p };
        if (type === 'before') {
          updated.photoBefore = undefined;
        } else {
          updated.photoAfter = undefined;
        }
        return updated;
      }
      return p;
    }));
    if (selectedProject && selectedProject.id === projId) {
      setSelectedProject(prev => {
        if (!prev) return null;
        const updated = { ...prev };
        if (type === 'before') {
          updated.photoBefore = undefined;
        } else {
          updated.photoAfter = undefined;
        }
        return updated;
      });
    }
    setPhotoToDelete(null);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert("กรุณากรอกชื่อโครงการปรับปรุง");
      return;
    }

    const newProj: ImprovementProject = {
      id: `imp-${Date.now()}`,
      type: 'Improvement',
      title: newTitle.trim(),
      description: newDescription.trim(),
      machineId: newMachine || undefined,
      startDate: newStartDate,
      plannedEndDate: newPlannedEndDate,
      workLogs: [],
      status: 'วางแผน',
      technician: newTechnician,
      technicians: newCoTechnicians,
      photoBefore: newPhotoBefore || undefined
    };

    setImprovements(prev => [...prev, newProj]);
    setShowCreateModal(false);

    // Reset fields
    setNewTitle('');
    setNewDescription('');
    setNewMachine('');
    setNewCoTechnicians([]);
    setNewPhotoBefore('');
  };

  const handleDeleteProject = (projId: string) => {
    setProjectToDelete(projId);
  };

  const confirmDeleteProjectAction = () => {
    if (!projectToDelete) return;
    setImprovements(prev => prev.filter(p => p.id !== projectToDelete));
    setSelectedProject(null);
    setProjectToDelete(null);
  };

  const handleAddWorkLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    if (logHours <= 0) {
      alert("กรุณากรอกชั่วโมงทำงานสะสมที่มากกว่าศูนย์");
      return;
    }

    const newLogItem: ImprovementWorkLog = {
      id: `wl-${Date.now()}`,
      date: logDate,
      hours: logHours,
      note: logNote.trim() || 'บันทึกการขับเคลื่อน Kaizen หน้างาน'
    };

    setImprovements(prev => prev.map(p => {
      if (p.id === selectedProject.id) {
        return { ...p, workLogs: [...p.workLogs, newLogItem] };
      }
      return p;
    }));
    setSelectedProject(prev => prev ? { ...prev, workLogs: [...prev.workLogs, newLogItem] } : null);

    setLogNote('');
  };

  const handleDeleteWorkLog = (logId: string) => {
    setWorkLogToDelete(logId);
  };

  const confirmDeleteWorkLogAction = () => {
    if (!workLogToDelete || !selectedProject) return;
    setImprovements(prev => prev.map(p => {
      if (p.id === selectedProject.id) {
        return { ...p, workLogs: p.workLogs.filter(w => w.id !== workLogToDelete) };
      }
      return p;
    }));
    setSelectedProject(prev => prev ? { ...prev, workLogs: prev.workLogs.filter(w => w.id !== workLogToDelete) } : null);
    setWorkLogToDelete(null);
  };

  const handleStatusChange = (status: 'วางแผน' | 'กำลังดำเนินการ' | 'เสร็จแล้ว') => {
    if (!selectedProject) return;
    setImprovements(prev => prev.map(p => {
      if (p.id === selectedProject.id) {
        return { ...p, status };
      }
      return p;
    }));
    setSelectedProject(prev => prev ? { ...prev, status } : null);
  };

  // Helper inside layout loop: group projects by status
  const getProjsByStatus = (status: 'วางแผน' | 'กำลังดำเนินการ' | 'เสร็จแล้ว') => {
    return improvements.filter(p => p.status === status);
  };

  // Card Progress% calculator
  const calculateProgress = (proj: ImprovementProject): number => {
    if (proj.status === 'เสร็จแล้ว') return 100;
    if (proj.status === 'วางแผน') return 0;
    
    // In progress: standard ratio based on accumulated hours vs plan
    // Let's assume a plan target of 20 hours for progress representation
    const totalHrs = proj.workLogs.reduce((sum, log) => sum + log.hours, 0);
    return Math.min(95, Math.max(10, Math.round((totalHrs / 16) * 100)));
  };

  return (
    <div className="space-y-6" id="improvement-page-root">
      
      {/* Upper description / action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cyan-400 tracking-tight flex items-center gap-2">
            🔨 โครงการปรับปรุงและพัฒนากระบวนการ (Kaizen / Improvement Tracker)
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            ขับเคลื่อนการปรับปรุงโรงงานอย่างเป็นระบบ บันทึกก่อนทำหลังทำ ตรวจเช็คเวลาทำงานและดึงเข้าปฏิทินงานเชิงรุก
          </p>
        </div>
        <button
          id="btn-create-improvement"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-900 font-bold px-4 py-2.5 rounded-lg transition-all shadow-md focus:outline-none text-xs"
        >
          <Plus size={18} />
          สร้างโครงการปรับปรุงใหม่
        </button>
      </div>

      {/* KANBAN BOARD WRAPPER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="kaizen-kanban-board">
        
        {/* Column 1: วางแผน (Planned) */}
        <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4 px-1 shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              วางแผนปรับปรุง (Planned)
            </span>
            <span className="bg-slate-800 text-slate-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
              {getProjsByStatus('วางแผน').length} โครงการ
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {getProjsByStatus('วางแผน').length === 0 ? (
              <div className="text-[11px] text-slate-650 italic text-center py-12">
                ไม่มีโครงการรอการอนุมัติ / แพลน
              </div>
            ) : (
              getProjsByStatus('วางแผน').map(proj => (
                <div 
                  key={proj.id}
                  id={`kaizen-card-${proj.id}`}
                  onClick={() => setSelectedProject(proj)}
                  className="bg-slate-800 border border-slate-700/80 hover:border-slate-500 rounded-xl p-4 space-y-3 cursor-pointer shadow hover:shadow-cyan-500/5 transition-all group"
                >
                  <div className="space-y-1">
                    <span className="bg-slate-900 text-[10px] text-slate-400 px-2 py-0.5 rounded border border-slate-750 font-mono">
                      {proj.machineId || 'ทั่วไป'}
                    </span>
                    <h4 className="text-xs font-bold text-slate-205 mt-1 font-sans leading-tight group-hover:text-cyan-400">
                      {proj.title}
                    </h4>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-450 border-t border-slate-700/50 pt-2 shrink-0">
                    <span className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-350 font-medium">
                      🙋‍♂️ {proj.technician}
                      {proj.technicians && proj.technicians.length > 0 && (
                        <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[8.5px] px-1 py-0.2 rounded ml-1 font-bold">
                          +{proj.technicians.length}
                        </span>
                      )}
                    </span>
                    <span className="font-mono">{proj.plannedEndDate}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: กำลังดำเนินการ (In Progress) */}
        <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4 px-1 shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              กำลังดำเนินการ (In Progress)
            </span>
            <span className="bg-slate-800 text-amber-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
              {getProjsByStatus('กำลังดำเนินการ').length} โครงการ
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {getProjsByStatus('กำลังดำเนินการ').length === 0 ? (
              <div className="text-[11px] text-slate-650 italic text-center py-12">
                ไม่มีโครงการอยู่ระหว่างพัฒนา
              </div>
            ) : (
              getProjsByStatus('กำลังดำเนินการ').map(proj => {
                const progress = calculateProgress(proj);
                const hrs = proj.workLogs.reduce((sum, log) => sum + log.hours, 0);

                return (
                  <div 
                    key={proj.id}
                    id={`kaizen-card-${proj.id}`}
                    onClick={() => setSelectedProject(proj)}
                    className="bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-xl p-4 space-y-3 cursor-pointer shadow-md transition-all group"
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="bg-slate-900 text-[10px] text-slate-400 px-2 py-0.5 rounded border border-slate-750 font-mono">
                          {proj.machineId || 'ทั่วไป'}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">{hrs} ชม.สะสม</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-205 mt-1 font-sans leading-tight group-hover:text-cyan-400">
                        {proj.title}
                      </h4>
                    </div>

                    {/* Progress slider layout */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[9px] text-slate-400">
                        <span>ความคืบหน้า</span>
                        <span className="font-mono font-bold text-cyan-400">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-400 to-cyan-400 h-full" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-450 border-t border-slate-700/50 pt-2 shrink-0">
                      <span className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-350 font-medium">
                        🙋‍♂️ {proj.technician}
                        {proj.technicians && proj.technicians.length > 0 && (
                          <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[8.5px] px-1 py-0.2 rounded ml-1 font-bold">
                            +{proj.technicians.length}
                          </span>
                        )}
                      </span>
                      <span className="font-mono">คาดเสร็จ: {proj.plannedEndDate}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: เสร็จแล้ว (Completed) */}
        <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4 px-1 shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              ดำเนินการเสร็จแล้ว (Completed)
            </span>
            <span className="bg-slate-800 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
              {getProjsByStatus('เสร็จแล้ว').length} โครงการ
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {getProjsByStatus('เสร็จแล้ว').length === 0 ? (
              <div className="text-[11px] text-slate-650 italic text-center py-12">
                ไม่มีโครงการสำเร็จเสร็จสมบูรณ์
              </div>
            ) : (
              getProjsByStatus('เสร็จแล้ว').map(proj => {
                const hrs = proj.workLogs.reduce((sum, log) => sum + log.hours, 0);
                return (
                  <div 
                    key={proj.id}
                    id={`kaizen-card-${proj.id}`}
                    onClick={() => setSelectedProject(proj)}
                    className="bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-4 space-y-3 cursor-pointer shadow-md transition-all group opacity-85 hover:opacity-100"
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded font-mono">
                          สำเร็จสุทธิ
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">{hrs} ชม.</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-350 line-through mt-1 font-sans leading-tight">
                        {proj.title}
                      </h4>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-450 border-t border-slate-700/50 pt-2 shrink-0">
                      <span className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-350 font-medium">
                        🙋‍♂️ {proj.technician}
                        {proj.technicians && proj.technicians.length > 0 && (
                          <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[8.5px] px-1 py-0.2 rounded ml-1 font-bold">
                            +{proj.technicians.length}
                          </span>
                        )}
                      </span>
                      <span className="text-emerald-400 font-bold">✓ เสร็จสิ้น</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* NEW PROJECT CREATION FORM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div id="kaizen-create-modal" className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-155">
            
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/80 p-5 shrink-0 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-1.5">
                <FilePlus size={16} />
                สร้างและจัดวางโครงการปรับปรุง Kaizen
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-205 text-xl font-medium focus:outline-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">ชื่อโครงการปรับปรุง (Kaizen Title)*</label>
                <input
                  id="frm-imp-title"
                  type="text"
                  required
                  placeholder="ตัวอย่างเช่น ติดตั้งแถบแม่เหล็กกรองเศษตะปูสลักแกน"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">รายละเอียดโครงการเเละเป้าหมาย</label>
                <textarea
                  id="frm-imp-description"
                  rows={2}
                  placeholder="เขียนอธิบายภาพและรายละเอียดควันหลงที่ต้องการปรับแต่ง..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              {/* Row: machine select, assigned technician */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300">เครื่องจักรจักรสัมพันธ์ (ถ้ามี)</label>
                  <select
                    id="frm-imp-machine"
                    value={newMachine}
                    onChange={(e) => setNewMachine(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                  >
                    <option value="">-- เครื่องทั่วไป --</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>{m.id} : {m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300">ช่างเทคนิคที่รับผิดชอบหลัก*</label>
                  <select
                    id="frm-imp-tech"
                    required
                    value={newTechnician}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewTechnician(val);
                      setNewCoTechnicians(prev => prev.filter(t => t !== val));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                  >
                    {technicians.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-selection co-technicians */}
              <div className="space-y-1.5 bg-slate-900/40 p-3 rounded-xl border border-slate-750">
                <label className="text-[11px] font-semibold text-slate-300 flex justify-between items-center">
                  <span>ช่างผู้ร่วมพัฒนา/รับผิดชอบร่วมทีมเพิ่มเติม (เลือกได้หลายคน)</span>
                  <span className="text-[9px] text-[#38bdf8] font-mono font-bold">
                    {newCoTechnicians.length} คนเพิ่มรวมทีม
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 max-h-[110px] overflow-y-auto pr-1">
                  {technicians.map(tech => {
                    const isMain = tech === newTechnician;
                    const isSelected = newCoTechnicians.includes(tech);
                    
                    if (isMain) return null;
                    
                    return (
                      <label 
                        key={tech} 
                        className={`p-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer text-[10.5px] select-none transition ${
                          isSelected 
                            ? 'bg-slate-800 border-cyan-500/50 text-slate-100' 
                            : 'bg-slate-900/80 border-slate-750 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setNewCoTechnicians(prev => prev.filter(t => t !== tech));
                            } else {
                              setNewCoTechnicians(prev => [...prev, tech]);
                            }
                          }}
                          className="rounded text-cyan-500 border-slate-705 focus:ring-0 w-3 h-3 cursor-pointer"
                        />
                        <span className="truncate">{tech}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Dates row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300">วันที่เริ่มต้นโครงการ*</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-center"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300">วันที่คาดหมายว่าจะสําเร็จ*</label>
                  <input
                    id="frm-imp-planned-end"
                    type="date"
                    required
                    value={newPlannedEndDate}
                    onChange={(e) => setNewPlannedEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-center"
                  />
                </div>
              </div>

              {/* Photos uploader Before */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">แนบรูปภาพฝั่ง ก่อนทำความสะอาด/ก่อนซ่อมแซม (Before Photo)</label>
                <div className="border border-dashed border-slate-700 hover:border-cyan-500/50 p-3.5 rounded-xl text-center cursor-pointer bg-slate-900/15 relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoBeforeUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {newPhotoBefore ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <img src={newPhotoBefore} className="w-16 h-16 object-cover rounded border" alt="preview before" referrerPolicy="no-referrer" />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-cyan-400 font-mono">รูปภาพสำเร็จเรียบร้อย</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewPhotoBefore('');
                          }}
                          className="text-[10px] text-rose-400 hover:text-rose-300 underline font-bold"
                        >
                          ลบรูปออก
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400">
                      <ImageIcon size={18} className="mx-auto text-slate-500 mb-1" />
                      <p className="text-[10px]">คลิกเพื่อเพิ่มไฟล์รูปภาพเชิงวิเคราะห์สถานะก่อนปรับแต่ง</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2.5 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  id="frm-btn-save-imp"
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-md"
                >
                  ขึ้นทะเบียนระบบโครงการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECT DETAILS & ACTION & WORKLOG MANAGER MODAL */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div id="kaizen-detail-modal" className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-155">
            
            {/* Header project info */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/80 p-5 shrink-0 flex justify-between items-start">
              <div>
                <p className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono px-2 py-0.5 rounded inline-block">
                  {selectedProject.machineId || 'ทั่วไป'}
                </p>
                <h3 className="text-sm font-bold text-slate-200 mt-1 font-sans leading-tight">
                  {selectedProject.title}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedProject(null)}
                className="text-slate-400 hover:text-slate-205 text-xl font-medium focus:outline-none"
              >
                &times;
              </button>
            </div>

            {/* Scrollable Project view */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              
              {/* Top metadata grid info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                <div>
                  <p className="text-[10px] text-slate-400">สถานะโครงการ</p>
                  <select
                    value={selectedProject.status}
                    onChange={(e) => handleStatusChange(e.target.value as any)}
                    className="mt-1 bg-slate-900 border border-slate-700 text-[11px] text-cyan-400 font-bold rounded px-2.2 py-1 focus:outline-none"
                  >
                    <option value="วางแผน">วางแผน</option>
                    <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                    <option value="เสร็จแล้ว">เสร็จแล้ว</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-sans">ผู้นำโครงการ (หลัก)*</p>
                  <select
                    value={selectedProject.technician}
                    onChange={(e) => {
                      const newTech = e.target.value;
                      setImprovements(prev => prev.map(p => {
                        if (p.id === selectedProject.id) {
                          const updatedCos = (p.technicians || []).filter(t => t !== newTech);
                          const updated = { ...p, technician: newTech, technicians: updatedCos };
                          setSelectedProject(updated);
                          return updated;
                        }
                        return p;
                      }));
                    }}
                    className="mt-1 bg-slate-900 border border-slate-700 text-[10.5px] text-slate-200 font-semibold rounded px-1.5 py-1 focus:outline-none w-full"
                  >
                    {technicians.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">วันที่เริ่ม - คาดเสร็จ</p>
                  <p className="text-[11px] font-mono font-bold text-slate-300 mt-1.5">{selectedProject.startDate} ~ {selectedProject.plannedEndDate}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">ชั่วโมงสะสมทั้งหมด</p>
                  <p className="text-xs font-sans font-extrabold text-cyan-400 mt-1.5 flex items-center gap-1">
                    <Clock size={12} className="text-slate-400" />
                    {selectedProject.workLogs.reduce((sum, l) => sum + l.hours, 0)} ชั่วโมง
                  </p>
                </div>
              </div>

              {/* Description box */}
              {selectedProject.description && (
                <div className="space-y-1.5 bg-slate-905 p-3 rounded-lg border border-slate-700/40">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">คำจำกัดความและขอบเขตโครงการ:</p>
                  <p className="text-slate-300 leading-relaxed font-sans">{selectedProject.description}</p>
                </div>
              )}

              {/* Responsible Technicians (Co-technicians) editor */}
              <div className="bg-slate-900/45 p-4 rounded-xl border border-slate-700/60 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={12} className="text-[#38bdf8]" />
                    ช่างเทคนิคร่วมรับผิดชอบโครงการ (ทีมงานเพิ่มเติม)
                  </span>
                  <span className="text-[9px] bg-cyan-500/10 text-[#38bdf8] border border-cyan-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                    {((selectedProject.technicians || []).length + 1)} คนร่วมรับผิดชอบ
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-1">
                  {technicians.map(tech => {
                    const isMain = tech === selectedProject.technician;
                    const isCo = (selectedProject.technicians || []).includes(tech);
                    
                    if (isMain) {
                      return (
                        <div key={tech} className="bg-cyan-500/10 border border-cyan-500/20 p-2 rounded-lg flex items-center gap-2 select-none" title="ผู้รับผิดชอบหลัก">
                          <input type="checkbox" checked={true} disabled className="rounded text-cyan-500 border-slate-700 focus:ring-0 w-3.5 h-3.5 cursor-not-allowed" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-cyan-400 truncate">{tech}</p>
                            <p className="text-[7.5px] text-slate-450 font-bold block uppercase tracking-wider leading-none mt-0.5">🌟 หัวหน้าทีม</p>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <label 
                        key={tech} 
                        className={`p-2 rounded-lg border transition-all flex items-center gap-2 cursor-pointer select-none ${
                          isCo 
                            ? 'bg-slate-850 border-cyan-500/40 text-slate-100' 
                            : 'bg-slate-900 border-slate-750 hover:border-slate-700 text-slate-450'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={isCo}
                          onChange={() => {
                            const currentCos = selectedProject.technicians || [];
                            const updatedCos = currentCos.includes(tech)
                              ? currentCos.filter(t => t !== tech)
                              : [...currentCos, tech];
                            
                            setImprovements(prev => prev.map(p => {
                              if (p.id === selectedProject.id) {
                                const updated = { ...p, technicians: updatedCos };
                                setSelectedProject(updated);
                                return updated;
                              }
                              return p;
                            }));
                          }}
                          className="rounded text-cyan-500 border-slate-700 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-[10.5px] font-medium truncate">{tech}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Photos Comparison: Before & After */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visual before */}
                <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-700/65">
                  <div className="text-[10px] font-bold text-slate-400 uppercase flex justify-between items-center">
                    <span>📸 รูปภาพสถานะก่อนทำ (BEFORE):</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoBeforeDetailUpload}
                        id="before-photo-uploader"
                        className="hidden"
                      />
                      <label 
                        htmlFor="before-photo-uploader"
                        className="text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-slate-950 px-2 py-0.5 rounded cursor-pointer transition"
                      >
                        {selectedProject.photoBefore ? 'เปลี่ยนรูป' : 'อัปเดตรูป'}
                      </label>
                      {selectedProject.photoBefore && (
                        <button
                          type="button"
                          onClick={handleRemovePhotoBeforeDetail}
                          className="text-[9px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-fg px-2 py-0.5 rounded transition"
                          title="ลบรูปภาพก่อนปรับปรุงออก"
                        >
                          ลบรูป
                        </button>
                      )}
                    </div>
                  </div>
                  {selectedProject.photoBefore ? (
                    <div className="relative group">
                      <img 
                        src={selectedProject.photoBefore} 
                        alt="Condition Before" 
                        className="w-full h-40 object-cover rounded-lg border border-slate-700 mt-1 group-hover:opacity-90 transition" 
                        referrerPolicy="no-referrer"
                      />
                      <label 
                        htmlFor="before-photo-uploader"
                        className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-amber-300 font-bold text-xs rounded-lg cursor-pointer"
                      >
                        📷 คลิกเพื่อเปลี่ยนรูปภาพ
                      </label>
                      <button
                        type="button"
                        onClick={handleRemovePhotoBeforeDetail}
                        className="absolute top-2 right-2 p-1 bg-rose-600/90 hover:bg-rose-500 text-fg rounded-lg opacity-85 hover:opacity-100 transition shadow z-10"
                        title="ลบรูปภาพนี้ออก"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-950/40 h-40 rounded-lg flex flex-col items-center justify-center text-slate-500 gap-2">
                      <p className="text-[11px] italic">ยังไม่มีการอัปโหลดหลักฐานก่อนทำ</p>
                      <label 
                        htmlFor="before-photo-uploader"
                        className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-slate-950 px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1.5"
                      >
                        📷 อัปโหลดรูปภาพก่อนทำ (BEFORE)
                      </label>
                    </div>
                  )}
                </div>

                {/* Visual After */}
                <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-700/65">
                  <div className="text-[10px] font-bold text-slate-400 uppercase flex justify-between items-center">
                    <span>🎬 รูปภาพสถานะสำเร็จ (AFTER):</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoAfterUpload}
                        id="after-photo-uploader"
                        className="hidden"
                      />
                      <label 
                        htmlFor="after-photo-uploader"
                        className="text-[9px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 px-2 py-0.5 rounded cursor-pointer transition"
                      >
                        {selectedProject.photoAfter ? 'เปลี่ยนรูป' : 'อัปเดตรูป'}
                      </label>
                      {selectedProject.photoAfter && (
                        <button
                          type="button"
                          onClick={handleRemovePhotoAfterDetail}
                          className="text-[9px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-fg px-2 py-0.5 rounded transition"
                          title="ลบรูปภาพหลังปรับปรุงออก"
                        >
                          ลบรูป
                        </button>
                      )}
                    </div>
                  </div>
                  {selectedProject.photoAfter ? (
                    <div className="relative group">
                      <img 
                        src={selectedProject.photoAfter} 
                        alt="Condition After" 
                        className="w-full h-40 object-cover rounded-lg border border-slate-700 mt-1 group-hover:opacity-90 transition" 
                        referrerPolicy="no-referrer"
                      />
                      <label 
                        htmlFor="after-photo-uploader"
                        className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-cyan-300 font-bold text-xs rounded-lg cursor-pointer"
                      >
                        📷 คลิกเพื่อเปลี่ยนรูปภาพ
                      </label>
                      <button
                        type="button"
                        onClick={handleRemovePhotoAfterDetail}
                        className="absolute top-2 right-2 p-1 bg-rose-600/90 hover:bg-rose-500 text-fg rounded-lg opacity-85 hover:opacity-100 transition shadow z-10"
                        title="ลบรูปภาพนี้ออก"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-950/40 h-40 rounded-lg flex flex-col items-center justify-center text-slate-500 gap-2">
                      <p className="text-[11px] italic">ยังไม่มีการอัปโหลดภาพหลังการพัฒนาสำเร็จ</p>
                      <label 
                        htmlFor="after-photo-uploader"
                        className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500 hover:text-slate-950 px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1.5"
                      >
                        📷 อัปโหลดรูปภาพหลังทำ (AFTER)
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* WORKLOGS MANAGER TABLE & CREATOR */}
              <div className="space-y-3.5 border-t border-slate-700/60 pt-5">
                <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1 text-cyan-400">
                  <TrendingUp size={14} />
                  บันทึกประวัติความคืบหน้า (Work Logs สะสมเวลา)
                </h4>

                {/* Inline adder log form */}
                <form onSubmit={handleAddWorkLog} className="bg-slate-900 p-3 rounded-xl border border-slate-700/70 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-1 md:col-span-3 space-y-1">
                    <span className="text-[10px] text-slate-400">วันที่ทำงานจริง*</span>
                    <input
                      type="date"
                      required
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-205 font-mono text-center focus:outline-none"
                    />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2 space-y-1">
                    <span className="text-[10px] text-slate-400">เวลาซ่อม (ชม.)*</span>
                    <input
                      type="number"
                      required
                      min={1}
                      max={24}
                      value={logHours}
                      onChange={(e) => setLogHours(Math.max(1, Number(e.target.value) || 0))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-205 text-center font-mono focus:outline-none"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-5 space-y-1">
                    <span className="text-[10px] text-slate-400">หมายเหตุความคืบหน้าหน้างาน*</span>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ขัดลวด เจียรขอบโครงเหล็กฐาน"
                      value={logNote}
                      onChange={(e) => setLogNote(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-slate-250 focus:outline-none"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <button
                      id="btn-add-worklog-row"
                      type="submit"
                      className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3 py-1 rounded transition text-center"
                    >
                      เพิ่มชั่วโมง
                    </button>
                  </div>
                </form>

                {/* List of sub-worklogs */}
                <div className="border border-slate-700/60 rounded-xl overflow-hidden bg-slate-950/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 uppercase text-[10px] font-bold">
                        <th className="py-2.5 px-4 w-28">วันที่ปฏิบัติ</th>
                        <th className="py-2.5 px-3 text-center w-24">เวลา (ชั่วโมง)</th>
                        <th className="py-2.5 px-4">ความคืบหน้าระบุรายละเอียด</th>
                        <th className="py-2.5 px-3 text-center w-16">ลบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40 text-slate-300">
                      {selectedProject.workLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-550 italic">
                            ยังไม่มีการบันทึกชั่วโมงย่อยในวันนี้ (ความคืบหน้าปฏิทินจึงยังไม่ขึ้นไฟเตือน)
                          </td>
                        </tr>
                      ) : (
                        selectedProject.workLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-900/30">
                            <td className="py-2.5 px-4 font-mono text-slate-400">{log.date}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-cyan-400">{log.hours} ชม.</td>
                            <td className="py-2.5 px-4 font-sans italic">{log.note}</td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleDeleteWorkLog(log.id)}
                                className="text-slate-500 hover:text-rose-400 transition"
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>

            {/* Modal Controls footer */}
            <div className="bg-slate-900 border-t border-slate-750 p-5 shrink-0 flex justify-between items-center">
              <button
                id="btn-delete-improvement-project"
                onClick={() => handleDeleteProject(selectedProject.id)}
                className="flex items-center gap-1.5 text-rose-450 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-transparent hover:border-rose-500/20 transition-all font-semibold"
              >
                <Trash2 size={13} />
                ลบโครงการนี้ออก
              </button>
              
              <button
                onClick={() => setSelectedProject(null)}
                className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-350 px-4 py-2 rounded-lg font-medium transition"
              >
                ปิดหน้าต่างวิเคราะห์
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL FOR DELETE KAIZEN PROJECT */}
      {projectToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div id="kaizen-project-delete-modal" className="bg-slate-900 border border-slate-750 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-450">
                <Trash2 size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-100">
                ยืนยันการลบโครงการ Kaizen?
              </h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                คุณยืนยันที่จะลบโครงการปรับปรุง Kaizen นี้ออกอย่างถาวรใช่หรือไม่? ประวัติบันทึกชั่วโมงทั้งหมดจะสูญหายและไม่สามารถกู้คืนได้
              </p>
            </div>
            <div className="flex gap-3 justify-end text-xs font-bold font-sans">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="w-1/2 bg-slate-805 border border-slate-700 hover:bg-slate-750 text-slate-300 py-2.5 rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteProjectAction}
                className="w-1/2 bg-rose-600 hover:bg-rose-500 text-fg py-2.5 rounded-xl transition shadow-lg shadow-rose-600/10 cursor-pointer"
              >
                ลบโครงการถาวร
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL FOR DELETE WORK LOG */}
      {workLogToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div id="kaizen-log-delete-modal" className="bg-slate-900 border border-slate-750 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-450">
                <Clock size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-100">
                ยืนยันการลบบันทึกชั่วโมงย่อย?
              </h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                คุณต้องการลบบันทึกความคืบหน้ารายการนี้ใช่หรือไม่? ชั่วโมงสะสมของโครงการจะลดลงตามจริง
              </p>
            </div>
            <div className="flex gap-3 justify-end text-xs font-bold font-sans">
              <button
                type="button"
                onClick={() => setWorkLogToDelete(null)}
                className="w-1/2 bg-slate-805 border border-slate-700 hover:bg-slate-750 text-slate-350 py-2.5 rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteWorkLogAction}
                className="w-1/2 bg-rose-600 hover:bg-rose-500 text-fg py-2.5 rounded-xl transition cursor-pointer"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL FOR DELETE KAIZEN PHOTO */}
      {photoToDelete && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-100"
          onClick={() => setPhotoToDelete(null)}
        >
          <div 
            id="kaizen-photo-delete-modal" 
            className="bg-slate-900 border border-slate-750 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-450 border border-rose-500/30">
                <Trash2 size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-100">
                ยืนยันการลบรูปภาพ Kaizen?
              </h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                คุณต้องการลบรูปภาพ <span className="text-amber-400 font-bold">{photoToDelete.type === 'before' ? 'ก่อนปรับปรุง (Before)' : 'หลังปรับปรุง (After)'}</span> ของโครงการ "{photoToDelete.projTitle}" ใช่หรือไม่?
              </p>
            </div>
            <div className="flex gap-3 justify-end text-xs font-bold font-sans">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="w-1/2 bg-slate-805 border border-slate-700 hover:bg-slate-750 text-slate-350 py-2.5 rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeletePhotoAction}
                className="w-1/2 bg-rose-600 hover:bg-rose-500 text-fg py-2.5 rounded-xl transition shadow-lg shadow-rose-600/20 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>ยืนยันลบรูป</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
