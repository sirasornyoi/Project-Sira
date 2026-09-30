import React, { useState, useMemo } from 'react';
import { PMPlan, Machine, PMScheduleItem, PMStep } from '../types';
import { useApp } from '../context/AppContext';
import { exportPMReportToExcel } from '../utils/pmExcelUtils';
import { 
  X, Download, Calendar, User, Clock, CheckCircle2, 
  AlertTriangle, Wrench, ShieldCheck, History, 
  ChevronRight, Filter, FileText, Check, AlertCircle
} from 'lucide-react';

interface PMRoundHistoryModalProps {
  plan: PMPlan;
  machine?: Machine;
  onClose: () => void;
}

function formatThaiMonthYear(dateStr?: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length < 2) return dateStr;
  const year = parseInt(parts[0], 10) + 543;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  return `${thaiMonths[monthIdx] || parts[1]} ${year}`;
}

export const PMRoundHistoryModal: React.FC<PMRoundHistoryModalProps> = ({
  plan,
  machine,
  onClose
}) => {
  const { schedules, repairs, technicians } = useApp();

  // All completed PM jobs with checklistResult for this plan, newest first
  const roundJobs = useMemo(() => {
    return (schedules.filter(
      s => s.type === 'PM' && s.pmPlanId === plan.id && s.status === 'เสร็จสิ้น' && s.checklistResult
    ) as PMScheduleItem[]).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [schedules, plan.id]);

  // Filters
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterTech, setFilterTech] = useState<string>('all');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const availableYears = useMemo(() => {
    const yrs = new Set<string>();
    roundJobs.forEach(j => {
      if (j.date) yrs.add(j.date.slice(0, 4));
    });
    return Array.from(yrs).sort().reverse();
  }, [roundJobs]);

  const filteredJobs = useMemo(() => {
    return roundJobs.filter(j => {
      if (filterYear !== 'all' && j.date && !j.date.startsWith(filterYear)) return false;
      if (filterTech !== 'all') {
        const techs = (j.technicians && j.technicians.length > 0 ? j.technicians : [j.technician]).filter(Boolean);
        if (!techs.includes(filterTech)) return false;
      }
      return true;
    });
  }, [roundJobs, filterYear, filterTech]);

  // Selected job for sheet view (defaults to first filtered job)
  const activeJob = useMemo(() => {
    if (selectedJobId) {
      const found = filteredJobs.find(j => j.id === selectedJobId);
      if (found) return found;
    }
    return filteredJobs[0] || null;
  }, [selectedJobId, filteredJobs]);

  // Find previous round job relative to activeJob in roundJobs
  const prevJob = useMemo(() => {
    if (!activeJob) return undefined;
    const currentIndex = roundJobs.findIndex(j => j.id === activeJob.id);
    if (currentIndex >= 0 && currentIndex + 1 < roundJobs.length) {
      return roundJobs[currentIndex + 1];
    }
    return undefined;
  }, [activeJob, roundJobs]);

  // Export current active job
  const handleExportActiveJob = () => {
    if (!activeJob || !activeJob.checklistResult) return;
    const techList = (activeJob.technicians && activeJob.technicians.length > 0 
      ? activeJob.technicians 
      : [activeJob.technician]).filter(Boolean);
    const techNames = techList.join(', ');

    exportPMReportToExcel(
      {
        ...plan,
        title: activeJob.checklistResult.planTitle || plan.title,
        steps: activeJob.checklistResult.steps || [],
        inspectorTech: techNames
      },
      machine,
      activeJob.date
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
              <History size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-300 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300">
                  {machine?.id || plan.machineId}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  {machine?.name}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded font-bold bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300">
                  รอบ {plan.frequency}
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                ประวัติการบันทึก PM ย้อนหลัง: {plan.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeJob && (
              <button
                type="button"
                onClick={handleExportActiveJob}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 border border-cyan-300 text-cyan-800 dark:bg-cyan-500/15 dark:border-cyan-500/30 dark:text-cyan-300 dark:hover:bg-cyan-500/25 rounded-xl text-xs font-bold transition cursor-pointer"
                title="ส่งออกใบ PM รอบที่เลือกเป็นไฟล์ Excel"
              >
                <Download size={13} />
                <span className="hidden sm:inline">ส่งออกรอบนี้ (Excel)</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="px-4 py-2.5 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <Filter size={12} /> ตัวกรอง:
            </span>

            {/* Filter Year */}
            <div className="flex items-center gap-1">
              <span className="text-slate-600 dark:text-slate-400 text-[11px]">ปี:</span>
              <select
                value={filterYear}
                onChange={(e) => {
                  setFilterYear(e.target.value);
                  setSelectedJobId(null);
                }}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">ทุกปี ({availableYears.length})</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>ปี {parseInt(yr, 10) + 543} ({yr})</option>
                ))}
              </select>
            </div>

            {/* Filter Technician */}
            <div className="flex items-center gap-1">
              <span className="text-slate-600 dark:text-slate-400 text-[11px]">ช่าง:</span>
              <select
                value={filterTech}
                onChange={(e) => {
                  setFilterTech(e.target.value);
                  setSelectedJobId(null);
                }}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">ช่างทุกคน</option>
                {technicians.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            พบบันทึกทั้งหมด {filteredJobs.length} รอบ
          </div>
        </div>

        {/* Content Body: Split Left (Round List) and Right (Sheet Details) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          
          {/* LEFT: Round List */}
          <div className="lg:col-span-4 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-3 space-y-2 bg-slate-50/50 dark:bg-slate-900/40">
            {filteredJobs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs flex flex-col items-center justify-center h-48">
                <History size={32} className="text-slate-400 dark:text-slate-600 mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">ยังไม่มีประวัติการบันทึก PM</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  เมื่อติ๊กผลเช็คลิสต์และกด "บันทึกผล PM" รายการจะปรากฏที่นี่
                </p>
              </div>
            ) : (
              filteredJobs.map((job) => {
                const isSelected = activeJob?.id === job.id;
                const techList = (job.technicians && job.technicians.length > 0 
                  ? job.technicians 
                  : [job.technician]).filter(Boolean);
                const techNames = techList.length > 0 ? techList.join(', ') : 'ไม่ระบุช่าง';

                const steps = job.checklistResult?.steps || [];
                const normalCount = steps.filter(s => s.result === 'ปกติ').length;
                const abnormalCount = steps.filter(s => s.result === 'ไม่ปกติ').length;
                const fixNowCount = steps.filter(s => s.actionTaken === 'แก้ไข/เปลี่ยนทันที').length;
                const repairCount = steps.filter(s => s.actionTaken === 'แจ้งซ่อม/ติดตาม').length;

                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                        <Calendar size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        {formatThaiMonthYear(job.date)}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {job.date}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 truncate">
                      <User size={12} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <span className="font-medium truncate">ผู้ทำการ PM: {techNames}</span>
                    </div>

                    {/* Summary badge row */}
                    <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-1.5 flex-wrap text-[10.5px]">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-medium">
                        ปกติ {normalCount}
                      </span>
                      {abnormalCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium">
                          ไม่ปกติ {abnormalCount}
                        </span>
                      )}
                      {fixNowCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-medium">
                          แก้ไขทันที {fixNowCount}
                        </span>
                      )}
                      {repairCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-medium">
                          แจ้งซ่อม {repairCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT: Selected Round Sheet (แบบเดียวกับใบกระดาษ) */}
          <div className="lg:col-span-8 overflow-y-auto p-4 space-y-4 bg-white dark:bg-slate-900">
            {!activeJob ? (
              <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center h-full">
                <FileText size={36} className="text-slate-400 mb-2" />
                <p>เลือกรายการรอบ PM ทางซ้ายเพื่อดูรายละเอียดใบตรวจ</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Sheet Title Banner */}
                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {activeJob.checklistResult?.planTitle || plan.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300">
                        รอบเดือน {formatThaiMonthYear(activeJob.date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      <span>วันที่ทำ PM: <b className="text-slate-700 dark:text-slate-200">{activeJob.date}</b></span>
                      {activeJob.checklistResult?.recordedAt && (
                        <span>บันทึกเมื่อ: <span className="font-mono">{activeJob.checklistResult.recordedAt}</span></span>
                      )}
                      {prevJob && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                          (เทียบกับรอบก่อนหน้า: {prevJob.date})
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportActiveJob}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent rounded-lg text-xs font-bold shadow-xs transition cursor-pointer shrink-0"
                  >
                    <Download size={13} />
                    <span>Export Excel</span>
                  </button>
                </div>

                {/* Steps Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold">
                        <th className="py-2 px-2.5 text-center w-10">ลำดับ</th>
                        <th className="py-2 px-2.5 min-w-[150px]">หัวข้อ PM</th>
                        <th className="py-2 px-2 min-w-[90px]">วิธีการ</th>
                        <th className="py-2 px-2.5 min-w-[130px]">มาตรฐาน</th>
                        {prevJob && (
                          <th className="py-2 px-2 text-center min-w-[95px] bg-slate-200/60 dark:bg-slate-900 border-l border-r border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                            ครั้งก่อน ({prevJob.date?.slice(5) || 'ก่อน'})
                          </th>
                        )}
                        <th className="py-2 px-2 text-center min-w-[80px]">ผลการ PM</th>
                        <th className="py-2 px-2.5 min-w-[100px]">ค่าที่วัดได้</th>
                        <th className="py-2 px-2.5 min-w-[180px]">รายละเอียดผิดปกติ / การดำเนินการ</th>
                        <th className="py-2 px-2.5 min-w-[100px]">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {(activeJob.checklistResult?.steps || []).map((step, idx) => {
                        const isNormal = step.result === 'ปกติ';
                        const isAbnormal = step.result === 'ไม่ปกติ';

                        // Match step in previous round job
                        const prevSteps = prevJob?.checklistResult?.steps || [];
                        const prevStep = (() => {
                          if (step.id) {
                            const byId = prevSteps.find(ps => Boolean(ps.id && ps.id === step.id));
                            if (byId) return byId;
                          }
                          const byThree = prevSteps.find(ps => ps.itemNo === step.itemNo && ps.title === step.title && ps.standard === step.standard);
                          if (byThree) return byThree;
                          if (prevSteps[idx] && prevSteps[idx].title === step.title) {
                            return prevSteps[idx];
                          }
                          return undefined;
                        })();

                        // Highlight if changed from previous round
                        const isChanged = Boolean(
                          prevStep && (
                            prevStep.result !== step.result || 
                            (prevStep.measuredValue || '') !== (step.measuredValue || '') ||
                            (prevStep.actionTaken || '') !== (step.actionTaken || '')
                          )
                        );

                        // Linked repair details
                        const linkedRepair = step.linkedRepairId 
                          ? repairs.find(r => r.id === step.linkedRepairId)
                          : undefined;

                        return (
                          <tr 
                            key={step.id || idx}
                            className={`transition-colors ${
                              isChanged ? 'bg-amber-500/10 dark:bg-amber-500/10' :
                              isAbnormal ? 'bg-rose-50/50 dark:bg-rose-950/20' :
                              'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            {/* 1. Item No */}
                            <td className="py-2 px-2.5 text-center font-mono text-slate-500 font-bold">
                              {step.itemNo !== undefined ? step.itemNo : (idx + 1)}
                            </td>

                            {/* 2. Title */}
                            <td className="py-2 px-2.5 font-medium">
                              <div>{step.title}</div>
                              {step.stdTime && (
                                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">
                                  ⏱ {step.stdTime} นาที
                                </span>
                              )}
                            </td>

                            {/* 3. Method */}
                            <td className="py-2 px-2 text-slate-600 dark:text-slate-400 text-[11px]">
                              {step.method || 'ดูด้วยสายตา'}
                            </td>

                            {/* 4. Standard */}
                            <td className="py-2 px-2.5 text-slate-600 dark:text-slate-300 text-[11px]">
                              {step.standard || '-'}
                            </td>

                            {/* 5. ครั้งก่อน (จาก prevJob) */}
                            {prevJob && (
                              <td className="py-2 px-2 text-center bg-slate-100/50 dark:bg-slate-950/40 border-l border-r border-slate-200 dark:border-slate-800 text-[11px]">
                                {prevStep ? (
                                  <div>
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      prevStep.result === 'ปกติ' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                      prevStep.result === 'ไม่ปกติ' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                                      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                      {prevStep.result || '-'}
                                    </span>
                                    {prevStep.measuredValue && (
                                      <div className="font-mono text-[10px] text-cyan-600 dark:text-cyan-400 mt-0.5">
                                        {prevStep.measuredValue}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            )}

                            {/* 6. ผลรอบนี้ */}
                            <td className="py-2 px-2 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-bold ${
                                isNormal ? 'bg-emerald-600 text-white' :
                                isAbnormal ? 'bg-rose-600 text-white' :
                                'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}>
                                {step.result || 'ยังไม่ตรวจ'}
                              </span>
                            </td>

                            {/* 7. ค่าที่วัดได้ */}
                            <td className="py-2 px-2.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                              {step.measuredValue ? (
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 font-bold">
                                  {step.measuredValue}
                                </span>
                              ) : '-'}
                            </td>

                            {/* 8. รายละเอียดผิดปกติ / การดำเนินการ */}
                            <td className="py-2 px-2.5 text-[11px] space-y-1">
                              {step.abnormalDetail && (
                                <div className="text-rose-600 dark:text-rose-400 font-medium">
                                  {step.abnormalDetail}
                                </div>
                              )}
                              {step.actionTaken && (
                                <div className="text-slate-700 dark:text-slate-300">
                                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                                    [{step.actionTaken}]
                                  </span>
                                  {step.actionDetail && ` ${step.actionDetail}`}
                                </div>
                              )}
                              {step.linkedRepairId && (
                                <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                  {linkedRepair ? (
                                    <span>🔗 ใบซ่อม: {linkedRepair.date} · {linkedRepair.symptoms?.slice(0, 35)}</span>
                                  ) : (
                                    <span>🔗 ไม่พบใบซ่อม (ID: {step.linkedRepairId})</span>
                                  )}
                                </div>
                              )}
                              {!step.abnormalDetail && !step.actionTaken && !step.linkedRepairId && (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            {/* 9. หมายเหตุ */}
                            <td className="py-2 px-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                              {step.remark || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Signatures of the round */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <ShieldCheck size={12} className="text-cyan-600 dark:text-cyan-400" />
                    ผู้ทำการ PM และผู้ตรวจรับรอง:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-500 block text-[10px]">ผู้ทำการ PM:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">
                        {(activeJob.technicians && activeJob.technicians.length > 0 
                          ? activeJob.technicians 
                          : [activeJob.technician]).filter(Boolean).join(', ') || 'ไม่ระบุ'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">ผู้รับทราบ (ฝ่ายผลิต):</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {plan.acknowledgingDept || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">ผู้ตรวจสอบ (หัวหน้า):</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {plan.supervisorName || '-'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
