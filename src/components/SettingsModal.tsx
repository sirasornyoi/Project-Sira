import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Users, Clock, AlertTriangle, FileJson, RefreshCw, X, Wrench, Upload, Bell } from 'lucide-react';
import { sendLineNotification } from '../utils/lineNotify';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { 
    technicians, setTechnicians, 
    setSchedules, setRepairs, setImprovements,
    settings, setSettings, 
    resetToDefaults, exportData, importData 
  } = useApp();

  // Active sub-tab inside settings
  const [subTab, setSubTab] = useState<'techs' | 'hours' | 'std-mttr' | 'export-import' | 'line-notify'>('techs');

  // LINE Notify state
  const [lineEnabled, setLineEnabled] = useState<boolean>(settings.lineNotifyEnabled || false);
  const [lineToken, setLineToken] = useState<string>(settings.lineNotifyToken || '');
  const [lineTargetId, setLineTargetId] = useState<string>(settings.lineTargetId || '');
  const [autoEvents, setAutoEvents] = useState({
    breakdown: settings.lineAutoEvents?.breakdown !== false,
    morningSummary: settings.lineAutoEvents?.morningSummary !== false,
    repairClosed: !!settings.lineAutoEvents?.repairClosed,
    pmDispatched: !!settings.lineAutoEvents?.pmDispatched,
    setupLogged: !!settings.lineAutoEvents?.setupLogged,
  });
  const [testMessage, setTestMessage] = useState<string>('🚨 ทดสอบระบบแจ้งเตือน LINE จากระบบ FoodFab Maintenance!');
  const [testStatus, setTestStatus] = useState<{ type: 'idle' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' });
  const [isTesting, setIsTesting] = useState<boolean>(false);

  // Technician input state with identity tracking ({ orig, name })
  const [tempTechs, setTempTechs] = useState<{ orig: string; name: string }[]>(() =>
    technicians.map(t => ({ orig: t, name: t }))
  );
  const [newTechName, setNewTechName] = useState('');

  // Shift working hours inputs
  const [workingHours, setWorkingHours] = useState<number>(settings.workingHoursPerDay);

  // Std.MTTR edit values
  const [tempStdMttr, setTempStdMttr] = useState<Record<string, number>>({ ...settings.stdMttr });

  // Import JSON textarea
  const [jsonImportStr, setJsonImportStr] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'idle' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' });
  const [showResetDbConfirm, setShowResetDbConfirm] = useState<boolean>(false);
  const modalFileRef = useRef<HTMLInputElement>(null);

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    fileReader.readAsText(files[0], "UTF-8");
    fileReader.onload = e => {
      try {
        const target = e.target;
        if (!target || !target.result) {
          setImportStatus({ type: 'error', msg: "ไม่พบข้อมูลในไฟล์ที่เลือก" });
          return;
        }
        
        const content = target.result as string;
        const success = importData(content);
        if (success) {
          setImportStatus({ type: 'success', msg: 'กู้คืนฐานข้อมูลจากไฟล์สำรองสำเร็จเสร็จสิ้น! ทุกเพจพร้อมโหลดใหม่' });
          setTimeout(() => {
            onClose();
            window.location.reload();
          }, 1000);
        } else {
          setImportStatus({ type: 'error', msg: 'รูปแบบข้อมูลไม่ถูกต้อง ไม่สามารถนำเข้าข้อมูลได้' });
        }
      } catch (err) {
        setImportStatus({ type: 'error', msg: 'เกิดข้อผิดพลาดในการอ่านไฟล์: ' + (err as Error).message });
      }
    };
  };

  // Add a technician name
  const handleAddTech = () => {
    const trimmed = newTechName.trim();
    if (!trimmed) return;
    if (tempTechs.some(t => t.name.trim() === trimmed)) {
      alert("มีชื่อช่างพนักงานนี้ในระบบแล้ว");
      return;
    }
    setTempTechs(prev => [...prev, { orig: '', name: trimmed }]);
    setNewTechName('');
  };

  // Remove technician
  const handleRemoveTech = (idx: number) => {
    setTempTechs(prev => prev.filter((_, i) => i !== idx));
  };

  // Save technician names changes
  const handleSaveTechs = () => {
    // Clean and validate rows: trim, ignore empty, and deduplicate
    const cleanedRows: { orig: string; name: string }[] = [];
    const seenNames = new Set<string>();

    for (const item of tempTechs) {
      const trimmed = item.name.trim();
      if (!trimmed) continue;
      if (seenNames.has(trimmed)) continue;
      seenNames.add(trimmed);
      cleanedRows.push({ orig: item.orig, name: trimmed });
    }

    const updatedTechs = cleanedRows.map(r => r.name);

    // Build renamedMap ONLY for rows where orig is not empty AND orig !== name.
    // Technicians that were deleted will NOT have a row with their orig pointing to a new name,
    // so their historical logs are kept intact under their original name and not reassigned.
    const renamedMap: Record<string, string> = {};
    for (const row of cleanedRows) {
      if (row.orig && row.orig !== row.name) {
        renamedMap[row.orig] = row.name;
      }
    }

    const hasRenames = Object.keys(renamedMap).length > 0;

    if (hasRenames) {
      // Propagate to schedules
      setSchedules(prev => prev.map(s => {
        let updated = s;
        if (renamedMap[s.technician]) {
          updated = { ...updated, technician: renamedMap[s.technician] };
        }
        if (updated.technicians && updated.technicians.some(t => renamedMap[t])) {
          updated = { ...updated, technicians: updated.technicians.map(t => renamedMap[t] || t) };
        }
        return updated;
      }));

      // Propagate to repairs
      setRepairs(prev => prev.map(r => {
        let updated = r;
        if (renamedMap[r.technician]) {
          updated = { ...updated, technician: renamedMap[r.technician] };
        }
        if (updated.technicians && updated.technicians.some(t => renamedMap[t])) {
          updated = { ...updated, technicians: updated.technicians.map(t => renamedMap[t] || t) };
        }
        return updated;
      }));

      // Propagate to improvements
      setImprovements(prev => prev.map(imp => {
        let updated = imp;
        if (renamedMap[imp.technician]) {
          updated = { ...updated, technician: renamedMap[imp.technician] };
        }
        if (updated.technicians && updated.technicians.some(t => renamedMap[t])) {
          updated = { ...updated, technicians: updated.technicians.map(t => renamedMap[t] || t) };
        }
        return updated;
      }));
    }

    setTechnicians(updatedTechs);
    setTempTechs(cleanedRows.map(r => ({ orig: r.name, name: r.name })));
    alert("บันทึกรายชื่อช่างหลักและแก้ไขเชื่อมโยงประวัติงานเรียบร้อยแล้ว");
  };

  // Save hours/shift changes
  const handleSaveHours = () => {
    if (workingHours <= 0 || workingHours > 24) {
      alert("กรุณากรอกเวลาทำงานที่สมเหตุสมผล (1 - 24 ชั่วโมงต่อของรอบปฏิบัติการ)");
      return;
    }
    setSettings(prev => ({
      ...prev,
      workingHoursPerDay: workingHours
    }));
    alert(`ปรับเปลี่ยนเวลากำลังทำงานมาตรฐานสำเร็จเป็น ${workingHours} ชั่วโมง (${workingHours * 60} นาที) ต่อวัน`);
  };

  // Edit custom Std.MTTR parameter value
  const handleStdMttrChange = (prefix: string, value: string) => {
    const mins = Math.max(0, Number(value) || 0);
    setTempStdMttr(prev => ({
      ...prev,
      [prefix]: mins
    }));
  };

  // Save Custom Std.MTTR changes
  const handleSaveStdMttr = () => {
    setSettings(prev => ({
      ...prev,
      stdMttr: tempStdMttr
    }));
    alert("บันทึกค่าเวลาซ่อมมาตรฐาน (Std.MTTR) เรียบร้อยแล้ว");
  };

  // JSON Database export download trigger
  const triggerDownloadJson = () => {
    const dataStr = exportData();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'food-maint-factory-backup.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // JSON Database import trigger
  const handleImportJson = () => {
    if (!jsonImportStr.trim()) {
      setImportStatus({ type: 'error', msg: 'กรุณาวางโค้ด JSON กู้คืนระบบที่เป็นโมเดลโครงสร้างก่อนทำการกู้คืน' });
      return;
    }

    const success = importData(jsonImportStr);
    if (success) {
      setImportStatus({ type: 'success', msg: 'กู้คืนฐานข้อมูลสำรองด่วนสากล สำเร็จเสร็จสิ้น! ทุกเพจพร้อมโหลดใหม่' });
      setTimeout(() => {
        onClose();
        window.location.reload(); // Hard reload to mount standard context accurately
      }, 1000);
    } else {
      setImportStatus({ type: 'error', msg: 'โครงสร้างไฟล์ล้มเหลว กรุณาตรวจสอบโค้ด JSON ปลายทางและลองอีกครั้ง' });
    }
  };

  // Reset database warning trigger (in-app confirmation)
  const triggerResetDatabase = () => {
    setShowResetDbConfirm(true);
  };

  const confirmResetDatabase = () => {
    resetToDefaults();
    alert("รีเซ็ตระบบเข้าตั้งต้นสำเร็จ!");
    setShowResetDbConfirm(false);
    onClose();
    window.location.reload();
  };

  // Save LINE configuration
  const handleSaveLineConfig = () => {
    setSettings(prev => ({
      ...prev,
      lineNotifyEnabled: lineEnabled,
      lineNotifyToken: lineToken,
      lineTargetId: lineTargetId,
      lineAutoEvents: autoEvents
    }));
    alert("บันทึกการตั้งค่าระบบแจ้งเตือน LINE เรียบร้อยแล้ว");
  };

  // Test LINE Notify call
  const handleTestLineNotify = async () => {
    if (!lineToken.trim()) {
      setTestStatus({ type: 'error', msg: 'กรุณาระบุ LINE Channel Access Token ก่อนทำการทดสอบ' });
      return;
    }
    setIsTesting(true);
    setTestStatus({ type: 'idle', msg: '' });
    
    try {
      const res = await sendLineNotification(testMessage, lineToken, lineTargetId);
      if (res.success) {
        setTestStatus({ type: 'success', msg: 'ส่งข้อความแจ้งเตือนทดสอบสำเร็จ! โปรดตรวจสอบใน LINE หรือกลุ่ม LINE ของคุณ' });
      } else {
        setTestStatus({ type: 'error', msg: res.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ' });
      }
    } catch (err) {
      setTestStatus({ type: 'error', msg: 'ข้อผิดพลาดเครือข่าย: ' + (err as Error).message });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4" id="settings-modal-overlay">
      <div className="bg-surface dark:bg-slate-800 border border-border dark:border-slate-700 rounded-3xl max-w-2xl w-full h-[600px] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-155" id="settings-modal">
        
        {/* Top Header */}
        <div className="bg-slate-50 dark:bg-slate-900 border-b border-border dark:border-slate-700/80 p-5 shrink-0 flex justify-between items-center">
          <h3 className="text-base font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-2 font-sans tracking-tight">
            <Settings className="animate-spin duration-9000" size={18} />
            จัดการระบบ และการกำหนดเกณฑ์ (System Settings Panel)
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-900 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Structure Splitter */}
        <div className="flex-1 flex min-h-0">
          
          {/* Modal Sidebar Tab Selection (Width 200px) */}
          <div className="w-48 bg-slate-50 dark:bg-slate-900/50 border-r border-border dark:border-slate-700/60 p-4 space-y-1.5 shrink-0 select-none">
            
            <button
              id="sub-tab-techs"
              onClick={() => setSubTab('techs')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                subTab === 'techs' ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <Users size={14} />
              จัดการรายชื่อช่าง
            </button>

            <button
              id="sub-tab-hours"
              onClick={() => setSubTab('hours')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                subTab === 'hours' ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <Clock size={14} />
              กะชั่วโมงการทำงาน
            </button>

            <button
              id="sub-tab-std-mttr"
              onClick={() => setSubTab('std-mttr')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                subTab === 'std-mttr' ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <Wrench size={14} />
              เวลาแก้ไขซ่อม Std.MTTR
            </button>

            <button
              id="sub-tab-export-import"
              onClick={() => setSubTab('export-import')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                subTab === 'export-import' ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <FileJson size={14} />
              สำรองกู้ข้อมูลสำรอง
            </button>

            <button
              id="sub-tab-line-notify"
              onClick={() => setSubTab('line-notify')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                subTab === 'line-notify' ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <Bell size={14} />
              ตั้งค่าแจ้งเตือน LINE
            </button>

            <div className="pt-4 border-t border-border dark:border-slate-800 mt-6 shrink-0">
              <button
                id="btn-settings-reset-all"
                onClick={triggerResetDatabase}
                className="w-full text-left text-[11px] font-sans font-bold text-rose-600 dark:text-rose-400 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-500 transition px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={12} className="animate-spin duration-900" />
                รีเซ็ตล้างระบบด่วน
              </button>
            </div>
          </div>

          {/* Active Modal Sub-Tab Content Workspace Panel (Flex-1) */}
          <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-slate-900/10 text-xs">
            
            {/* SUB-TAB 1: MANAGING TECHNICIANS LIST */}
            {subTab === 'techs' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-fg dark:text-slate-200 flex items-center gap-1.5">
                    <Users size={15} className="text-cyan-600 dark:text-cyan-400" />
                    บัญชีชื่อพนักงานช่างประจำโรงงาน
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">เปลี่ยนหรือตั้งชื่อจริง ลบ และเพิ่มจำนวนยอดช่างได้แบบทันตาเห็นในปฏิทินงาน</p>
                </div>

                {/* Adding form */}
                <div className="flex gap-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-border dark:border-slate-700/80">
                  <input
                    id="sett-new-tech-input"
                    type="text"
                    placeholder="ป้อนชื่อช่างใหม่..."
                    value={newTechName}
                    onChange={(e) => setNewTechName(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-800 border border-border dark:border-slate-700 rounded px-3 py-1.5 text-xs text-fg dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTech}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-1.5 rounded transition cursor-pointer"
                  >
                    + เพิ่มรายชื่อ
                  </button>
                </div>

                {/* Table of techs */}
                <div className="border border-border dark:border-slate-700/60 rounded-xl overflow-hidden max-h-[240px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900 border-b border-border dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="py-2 px-4 w-12 text-center">ลำดับ</th>
                        <th className="py-2 px-4">ชื่อเรียก / ประจำเครื่อง</th>
                        <th className="py-2 px-4 w-16 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
                      {tempTechs.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-slate-400 text-xs">
                            ยังไม่มีรายชื่อช่างในระบบ (สามารถพิมพ์ชื่อด้านบนเพื่อเพิ่มได้)
                          </td>
                        </tr>
                      ) : (
                        tempTechs.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <td className="py-2 px-4 text-center text-slate-400 font-mono">{i + 1}</td>
                            <td className="py-2 px-4 font-bold">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTempTechs(prev => {
                                    const cloned = [...prev];
                                    cloned[i] = { ...cloned[i], name: val };
                                    return cloned;
                                  });
                                }}
                                className="w-full bg-white dark:bg-slate-950/60 border border-border dark:border-slate-700/80 rounded px-2 py-1 text-xs text-fg dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-sans font-medium"
                              />
                            </td>
                            <td className="py-2 px-4 text-center">
                              <button
                                onClick={() => handleRemoveTech(i)}
                                className="text-slate-400 hover:text-rose-500 text-sm transition bg-slate-100 dark:bg-slate-950/20 hover:bg-slate-200 dark:hover:bg-slate-900 p-1 rounded cursor-pointer"
                                title="ลบรายชื่อช่างคนนี้"
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

                <div className="pt-3 border-t border-border dark:border-slate-850 flex items-center justify-end">
                  <button
                    onClick={handleSaveTechs}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2 rounded-xl transition shadow cursor-pointer"
                  >
                    บันทึกรายชื่อช่างหลัก
                  </button>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: CONFIGURATION OF CAPACITY HOURS / SHIFTS */}
            {subTab === 'hours' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-fg dark:text-slate-200 flex items-center gap-1.5">
                    <Clock size={15} className="text-cyan-600 dark:text-cyan-400" />
                    กำหนดระยะเวลาพิกัดการทำงานในรอบ 1 กะ
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">เปลี่ยนพิกัดชั่วโมงทํางานเฉลี่ยเพื่อพิจารณาความตึงเครียดโหลดในปฏิทินปฏิบัติงาน</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-border dark:border-slate-700/80 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                      <p className="text-xs font-bold text-fg dark:text-slate-205">เวลากำหนดทำงานปกติ (ชั่วโมง / วันต่อกะ)*</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">ดีฟอลต์สากลคือ 8 ชม. (480 นาที), สามารถตั้งเป็น 16 ชม. (960 นาที) สำหรับ 2 กะได้</p>
                    </div>

                    <div className="flex items-center gap-2 justify-end shrink-0">
                      <input
                        id="sett-working-hours"
                        type="number"
                        min={1}
                        max={24}
                        value={workingHours}
                        onChange={(e) => setWorkingHours(Math.max(1, Number(e.target.value) || 0))}
                        className="w-24 bg-white dark:bg-slate-800 border border-border dark:border-slate-700 rounded-lg px-3 py-2 text-center text-sm text-fg dark:text-slate-100 font-mono font-bold focus:outline-none"
                      />
                      <span className="text-slate-500 dark:text-slate-400 font-medium">ชั่วโมง/วัน</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-950/40 p-3.5 rounded-lg border border-border dark:border-slate-805 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                    <p className="text-slate-800 dark:text-slate-300 font-bold">สรุปศักยภาพเวลากำลังสูงสุด:</p>
                    <ul className="list-disc pl-4 space-y-1 mt-1 text-xs">
                      <li>เวลาความถนัดรวมเฉลี่ย: <strong>{workingHours * 60} นาทีต่อวัน</strong></li>
                      <li>สะสมพิจารณารายสัปดาห์: <strong>{workingHours * 7} ชั่วโมง / คน</strong></li>
                    </ul>
                  </div>
                </div>

                <div className="pt-2 border-t border-border dark:border-slate-850 flex items-center justify-end">
                  <button
                    onClick={handleSaveHours}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2 rounded-xl transition shadow cursor-pointer"
                  >
                    บันทึกพิกัดชั่วโมง
                  </button>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: SET STANDARD MTTR PER MACHINE TYPE */}
            {subTab === 'std-mttr' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-fg dark:text-slate-205 flex items-center gap-1.5">
                    <Wrench size={15} className="text-cyan-600 dark:text-cyan-400" />
                    กำหนดระบุเวลากู้หน้าซ่อมจริงแยกตามประเภทเครื่องประเภทจักร
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">ใช้ระบุค่าเกณฑ์ประเมิน Std.MTTR (นาที) หากเวลาซ่อมเกิน 120% ของเกณฑ์แถวในเพจ 4 จะขึ้นไฟแจ้งเตือนสีแดง</p>
                </div>

                <div className="border border-border dark:border-slate-700/60 rounded-xl overflow-hidden max-h-[280px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900 border-b border-border dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="py-2.5 px-4">กลุ่มจำพวกอักษรย่อ</th>
                        <th className="py-2.5 px-4">ชื่อประเภทเครื่องสากล</th>
                        <th className="py-2.5 px-4 text-center w-28">Std.MTTR (นาที)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-slate-700/40 text-slate-700 dark:text-slate-310">
                      {[
                        { prefix: "RIM", label: "MIXER VERTICAL / RICE MIXER" },
                        { prefix: "TOC", label: "RICE TAKE-OUT CONVEYOR / CONVEYOR" },
                        { prefix: "VAC", label: "VACUUM COOLER SYSTEMS" },
                        { prefix: "FFS", label: "HORIZONTAL FORM FILL SEAL (PACKING)" },
                        { prefix: "ATS", label: "AUTOMATIC TOP SEALERS" },
                        { prefix: "MTD", label: "METAL DETECTORS (QC)" },
                        { prefix: "XRA", label: "X-RAY INSPECTION DEVICES" },
                        { prefix: "BCF", label: "BLAST CHILLERS & FREEZERS" },
                        { prefix: "CDU", label: "UTILITIES / CONDENSING UNITS" },
                        { prefix: "TLP", label: "THERMAL LABEL PRINTERS" }
                      ].map(item => (
                        <tr key={item.prefix} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                          <td className="py-2 px-4 font-mono font-bold text-rose-600 dark:text-rose-400">{item.prefix}</td>
                          <td className="py-2 px-4 text-slate-700 dark:text-slate-300 font-sans">{item.label}</td>
                          <td className="py-2 px-4 text-center">
                            <input
                              type="number"
                              min={1}
                              value={tempStdMttr[item.prefix] || 60}
                              onChange={(e) => handleStdMttrChange(item.prefix, e.target.value)}
                              className="w-16 bg-white dark:bg-slate-950 border border-border dark:border-slate-700 rounded text-center text-xs text-fg dark:text-slate-100 font-mono p-1"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-t border-border dark:border-slate-850 flex items-center justify-end">
                  <button
                    onClick={handleSaveStdMttr}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2 rounded-xl transition shadow cursor-pointer"
                  >
                    บันทึกเกณฑ์ซ่อม Std.MTTR
                  </button>
                </div>
              </div>
            )}

            {/* SUB-TAB 4: DATA EXPORT AND IMPORT DATABASE */}
            {subTab === 'export-import' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-fg dark:text-slate-205 flex items-center gap-1.5">
                    <FileJson size={15} className="text-cyan-600 dark:text-cyan-400" />
                    ระบบสากลสำรองฐานข้อมูล & ดึงกู้ข้อมูล (Export/Import Local Database)
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5 font-sans">ส่งออกเพื่อกระจายงาน หรือวางโค้ดกู้ประวัติตะแกรงเวลาได้ทันทีโดยไม่ต้องเชื่อมต่อคลาวด์</p>
                </div>

                {/* Database Backup Trigger */}
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-border dark:border-slate-700/80 space-y-3">
                  <p className="text-xs font-bold text-fg dark:text-slate-200">1. ส่งออกสำรองฐานข้อมูลทั้งหมด (JSON Export)</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">บันทึกทั้งประวัติการแจ้งซ่อม, งาน PM ค้าง, ชาร์ตบอร์ดยอดสะสม, พิกัดช่าง ตระเตรียมเป็นไฟล์เซฟฟิสิกส์</p>
                  <button
                    type="button"
                    onClick={triggerDownloadJson}
                    className="flex items-center gap-1.5 bg-cyan-50 hover:bg-cyan-600 border border-cyan-300 dark:border-cyan-500/20 text-cyan-700 dark:text-cyan-400 hover:text-white font-bold px-4 py-2 rounded-lg transition cursor-pointer"
                  >
                    ดาวน์โหลดไฟล์แบ็คอัพ .json
                  </button>
                </div>

                {/* Data Restoration panel */}
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-border dark:border-slate-700/80 space-y-3">
                  <p className="text-xs font-bold text-fg dark:text-slate-200">2. นำเข้ากู้คืนระบบ (JSON Import / Restoration)</p>
                  
                  {importStatus.type !== 'idle' && (
                    <div className={`p-2.5 rounded border text-[10px] ${
                      importStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-400'
                    }`}>
                      {importStatus.msg}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 bg-white dark:bg-slate-950/40 p-3 rounded-lg border border-border dark:border-slate-800">
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 font-sans">
                      💡 <strong>วิธีที่ 1 (แนะนำ):</strong> เลือกไฟล์ .json สำรองโดยตรงจากคอมพิวเตอร์ของคุณ
                    </p>
                    <input
                      type="file"
                      ref={modalFileRef}
                      onChange={handleFileImport}
                      accept=".json"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => modalFileRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-border dark:border-slate-700 text-fg font-bold text-xs py-2 px-4 rounded-xl shadow transition cursor-pointer"
                    >
                      <Upload size={13} />
                      <span>เลือกไฟล์สำรองข้อมูล (.json) เพื่อกู้คืน</span>
                    </button>
                  </div>

                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 font-sans">
                      💡 <strong>วิธีที่ 2:</strong> วางเนื้อหาโค้ด JSON สำรองทั้งหมดในกล่องด้านล่างนี้
                    </p>
                    <textarea
                      rows={2}
                      placeholder="วางโค้ด JSON สำรองทั้งหมดที่นี่..."
                      value={jsonImportStr}
                      onChange={(e) => setJsonImportStr(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-border dark:border-slate-700 rounded-lg p-2.5 text-[10px] text-fg dark:text-slate-300 font-mono focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={handleImportJson}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg transition shadow cursor-pointer"
                    >
                      เริ่มกระบวนการกู้ประวัติระบบ (จากโค้ดที่วาง)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 5: LINE NOTIFICATION SETTINGS */}
            {subTab === 'line-notify' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-fg dark:text-slate-205 flex items-center gap-1.5 font-sans">
                    <Bell size={15} className="text-cyan-600 dark:text-cyan-400" />
                    ตั้งค่าการแจ้งเตือนผ่าน LINE Group (LINE Notify Integration)
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5 font-sans">
                    ส่งข้อความแจ้งเตือนเข้ากลุ่ม LINE อัตโนมัติเมื่อเกิดเหตุการณ์ในโรงงาน เช่น แจ้งซ่อมเครื่องจักร ทำใบงานซ่อมสำเร็จ หรือยืนยันการตั้งเครื่อง
                  </p>
                </div>

                {/* Status Toggle & Explanation */}
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-border dark:border-slate-700/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-fg dark:text-slate-200">เปิดใช้งานการแจ้งเตือน LINE</span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">ส่งแจ้งเตือนด่วนสากลเมื่อแจ้งซ่อม ปิดใบงาน หรือเริ่มบำรุงรักษา</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={lineEnabled} 
                        onChange={(e) => setLineEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                    </label>
                  </div>

                  {/* Token & Target ID inputs */}
                  {lineEnabled && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">LINE Channel Access Token</label>
                          <input
                            type="password"
                            placeholder="วาง Channel Access Token ของคุณ..."
                            value={lineToken}
                            onChange={(e) => setLineToken(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-border dark:border-slate-700 rounded-lg p-2.5 text-xs text-fg dark:text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">LINE Target ID (Group ID / User ID)</label>
                          <input
                            type="text"
                            placeholder="เช่น C12345... หรือ U12345..."
                            value={lineTargetId}
                            onChange={(e) => setLineTargetId(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-border dark:border-slate-700 rounded-lg p-2.5 text-xs text-fg dark:text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      {/* Auto-Push Events Selector */}
                      <div className="bg-white dark:bg-slate-950/40 p-3.5 rounded-lg border border-border dark:border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-border dark:border-slate-800 pb-1.5">
                          <span className="text-xs font-bold text-fg dark:text-slate-200">
                            ⚙️ เลือกเหตุการณ์ที่ต้องการให้ส่งแจ้งเตือนอัตโนมัติ (Auto-Push Events)
                          </span>
                          <span className="text-[10px] text-slate-500 font-sans">
                            *เหตุการณ์ที่ปิด Auto จะมีปุ่มให้กดส่งเองในแต่ละหน้า
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-900/60 cursor-pointer border border-transparent hover:border-slate-300 dark:hover:border-slate-800 transition">
                            <input
                              type="checkbox"
                              checked={autoEvents.breakdown}
                              onChange={(e) => setAutoEvents(prev => ({ ...prev, breakdown: e.target.checked }))}
                              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">🚨 แจ้งเครื่องจักรเสีย (Breakdown)</p>
                              <p className="text-[10px] text-slate-500">เปิดเคสฉุกเฉินสถานะกำลังซ่อม (ค่าเริ่มต้น: เปิด)</p>
                            </div>
                          </label>

                          <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-900/60 cursor-pointer border border-transparent hover:border-slate-300 dark:hover:border-slate-800 transition">
                            <input
                              type="checkbox"
                              checked={autoEvents.morningSummary}
                              onChange={(e) => setAutoEvents(prev => ({ ...prev, morningSummary: e.target.checked }))}
                              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">🌅 สรุปงาน PM เช้า (Morning Summary)</p>
                              <p className="text-[10px] text-slate-500">สรุปงาน PM ประจำวันอัตโนมัติ (ค่าเริ่มต้น: เปิด)</p>
                            </div>
                          </label>

                          <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-900/60 cursor-pointer border border-transparent hover:border-slate-300 dark:hover:border-slate-800 transition">
                            <input
                              type="checkbox"
                              checked={autoEvents.repairClosed}
                              onChange={(e) => setAutoEvents(prev => ({ ...prev, repairClosed: e.target.checked }))}
                              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">✅ ปิดใบงานซ่อม (Repair Closed)</p>
                              <p className="text-[10px] text-slate-500">สรุปมาตรการแก้ไขและ MTTR (ค่าเริ่มต้น: ปิด)</p>
                            </div>
                          </label>

                          <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-900/60 cursor-pointer border border-transparent hover:border-slate-300 dark:hover:border-slate-800 transition">
                            <input
                              type="checkbox"
                              checked={autoEvents.pmDispatched}
                              onChange={(e) => setAutoEvents(prev => ({ ...prev, pmDispatched: e.target.checked }))}
                              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">📋 สั่งการงาน PM (PM Dispatched)</p>
                              <p className="text-[10px] text-slate-500">ส่งใบงาน PM เมื่อจ่ายงานช่าง (ค่าเริ่มต้น: ปิด)</p>
                            </div>
                          </label>

                          <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-900/60 cursor-pointer border border-transparent hover:border-slate-300 dark:hover:border-slate-800 transition">
                            <input
                              type="checkbox"
                              checked={autoEvents.setupLogged}
                              onChange={(e) => setAutoEvents(prev => ({ ...prev, setupLogged: e.target.checked }))}
                              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">⚙️ บันทึกการตั้งเครื่อง (Setup Log)</p>
                              <p className="text-[10px] text-slate-500">สรุปเวลา Setup และขั้นตอน (ค่าเริ่มต้น: ปิด)</p>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-950/40 p-3 rounded-lg border border-border dark:border-slate-800 space-y-1 text-slate-600 dark:text-slate-400 font-sans text-[10px] leading-relaxed">
                        <p className="font-bold text-slate-800 dark:text-slate-300">💡 การเชื่อมต่อ LINE Messaging API:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          <li>ใช้ Channel Access Token จาก LINE Developers Console (Messaging API channel)</li>
                          <li>ระบุ LINE Target ID (ID กลุ่ม หรือ User ID) ที่ต้องการให้บอทส่งข้อความถึง</li>
                          <li>ระบบจะตรวจสอบโควตาข้อความฟรีก่อนส่งทุกครั้ง เพื่อป้องกันข้อความส่วนเกิน</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Test Notification Section */}
                {lineEnabled && (
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-border dark:border-slate-700/80 space-y-3">
                    <span className="text-xs font-bold text-fg dark:text-slate-200 block">ทดสอบส่งแจ้งเตือน (Test Connection)</span>
                    
                    {testStatus.type !== 'idle' && (
                      <div className={`p-2.5 rounded border text-[10px] ${
                        testStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-400'
                      }`}>
                        {testStatus.msg}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-950 border border-border dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-fg dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                        placeholder="ข้อความทดสอบ..."
                      />
                      <button
                        type="button"
                        onClick={handleTestLineNotify}
                        disabled={isTesting}
                        className="bg-cyan-50 hover:bg-cyan-600 border border-cyan-300 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400 hover:text-white font-bold px-4 rounded-lg transition disabled:opacity-50 text-xs shrink-0 cursor-pointer"
                      >
                        {isTesting ? 'กำลังส่ง...' : 'ทดสอบส่ง'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-border dark:border-slate-850 flex items-center justify-end">
                  <button
                    onClick={handleSaveLineConfig}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2 rounded-xl transition shadow cursor-pointer"
                  >
                    บันทึกการตั้งค่าระบบแจ้งเตือน
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* CONFIRMATION FOR DATABASE RESET */}
      {showResetDbConfirm && (
        <div 
          id="modal-reset-db-confirm"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-100"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-xs text-slate-900 dark:text-slate-200">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-500 border-b border-slate-200 dark:border-slate-800 pb-3">
              <AlertTriangle size={24} className="shrink-0" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">🚨 คำเตือนรุนแรงระดับความมั่นคง!</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">ล้างและตั้งค่าระบบใหม่ทั้งหมดเป็นค่าเริ่มต้น</p>
              </div>
            </div>
            
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p className="leading-relaxed font-semibold text-rose-600 dark:text-rose-400">
                คุณต้องการตั้งค่าระบบใหม่ทั้งหมดใช่หรือไม่?
              </p>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-1.5 text-[11px] text-rose-800 dark:text-rose-300">
                <p>ประวัติการแจ้งประเมินวิเคราะห์ชำรุด งาน PM โครงการ Kaizen ทั้งหมดจะถูกลบกลายเป็นดีฟอลต์พรีโหลด</p>
              </div>
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                id="btn-cancel-reset-db"
                onClick={() => setShowResetDbConfirm(false)}
                className="border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl transition cursor-pointer font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="btn-confirm-reset-db"
                onClick={confirmResetDatabase}
                className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-4.5 py-2 rounded-xl transition shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                ยืนยันรีเซ็ตระบบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
