import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculateMachineKpi, calculateMultiMachineKpi } from '../utils/pmKpi';
import { 
  Calendar, AlertTriangle, CheckCircle2, TrendingDown, 
  Activity, Clock, ShieldCheck, Gauge, Info, Search
} from 'lucide-react';

export const PMKpiPanel: React.FC = () => {
  const { machines, repairs, plannedProductionTimes, setPlannedProductionTimes } = useApp();

  // Selected month for KPI analysis (default to current active dataset month 2026-09)
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterLine, setFilterLine] = useState<string>('all');

  // Month list for selector (from past 12 months)
  const monthOptions = useMemo(() => {
    const months: string[] = [];
    const baseYear = 2026;
    for (let m = 12; m >= 1; m--) {
      months.push(`${baseYear}-${String(m).padStart(2, '0')}`);
    }
    return months;
  }, []);

  // Filtered machine list for table
  const lines = useMemo(() => {
    const set = new Set<string>();
    machines.forEach(m => {
      if (m.lineGroup) set.add(m.lineGroup);
    });
    return Array.from(set);
  }, [machines]);

  const displayedMachines = useMemo(() => {
    return machines.filter(m => {
      const matchSearch = searchQuery === '' || 
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchLine = filterLine === 'all' || m.lineGroup === filterLine;
      return matchSearch && matchLine;
    });
  }, [machines, searchQuery, filterLine]);

  // Overall Multi-Machine KPI summary for selected month
  const kpiSummary = useMemo(() => {
    return calculateMultiMachineKpi(machines, selectedMonth, repairs, plannedProductionTimes);
  }, [machines, selectedMonth, repairs, plannedProductionTimes]);

  // Planned hours lookup map for selected month
  const plannedMap = useMemo(() => {
    const map = new Map<string, number>();
    plannedProductionTimes
      .filter(pt => pt.month === selectedMonth)
      .forEach(pt => {
        if (pt.plannedHours > 0) {
          map.set(pt.machineId, pt.plannedHours);
        }
      });
    return map;
  }, [plannedProductionTimes, selectedMonth]);

  // Update or remove planned production time for a machine in selectedMonth
  const handlePlannedHoursChange = (machineId: string, valueStr: string) => {
    const trimmed = valueStr.trim();
    const val = parseFloat(trimmed);

    // Negative values are forbidden
    if (trimmed !== '' && !isNaN(val) && val < 0) {
      return;
    }

    setPlannedProductionTimes(prev => {
      const existsIndex = prev.findIndex(p => p.machineId === machineId && p.month === selectedMonth);

      // Empty or 0 or NaN means remove record
      if (trimmed === '' || isNaN(val) || val <= 0) {
        if (existsIndex >= 0) {
          const next = [...prev];
          next.splice(existsIndex, 1);
          return next;
        }
        return prev;
      }

      // Upsert
      if (existsIndex >= 0) {
        const next = [...prev];
        next[existsIndex] = {
          ...next[existsIndex],
          plannedHours: val
        };
        return next;
      } else {
        return [
          ...prev,
          {
            id: `ppt-${machineId}-${selectedMonth}-${Date.now()}`,
            machineId,
            month: selectedMonth,
            plannedHours: val
          }
        ];
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="bg-surface dark:bg-[#0f172a] border border-border dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-fg flex items-center gap-2">
              <Gauge className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span>ดัชนีชี้วัดประสิทธิภาพ PM Pillar (KPIs)</span>
            </h2>
            <p className="text-xs text-fg-muted dark:text-slate-400 mt-1">
              คำนวณตามมาตรฐานการบำรุงรักษาเชิงป้องกัน (TPM PM Pillar) จากข้อมูล Breakdown จริงและเวลาแผนการผลิต (Planned Production Time)
            </p>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-fg-muted dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>ประจำเดือน:</span>
            </span>
            <select
              id="kpi-month-selector"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-border dark:border-slate-700 text-fg text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {monthOptions.map(m => (
                <option key={m} value={m} className="bg-surface dark:bg-slate-900 text-fg">
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Coverage Banner */}
        <div className="mt-4 pt-4 border-t border-border dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-fg-muted dark:text-slate-400">สถานะการบันทึกเวลาแผนการผลิต:</span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold ${
              kpiSummary.coveredMachines === kpiSummary.totalMachines
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
            }`}>
              มี Planned {kpiSummary.coveredMachines} / ทั้งหมด {kpiSummary.totalMachines} เครื่อง ({Math.round(kpiSummary.coverageRatio * 100)}%)
            </span>
          </div>
          {kpiSummary.coveredMachines < kpiSummary.totalMachines && (
            <span className="text-amber-600 dark:text-amber-400 text-[11px] flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>กรอก Planned Hours ให้ครบทุกเครื่องเพื่อให้ค่า %BD, MTBF, Availability คิดครอบคลุมทั้งระบบ</span>
            </span>
          )}
        </div>
      </div>

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1: % Breakdown */}
        <div className="bg-surface dark:bg-[#0f172a] border border-border dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-500 mb-2">
            <span className="text-xs font-bold text-fg-muted dark:text-slate-400 uppercase tracking-wider">% Breakdown</span>
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-rose-500">
              {kpiSummary.overallPercentBd !== null ? `${kpiSummary.overallPercentBd.toFixed(2)}%` : '—'}
            </div>
            <p className="text-[11px] text-fg-muted dark:text-slate-400 mt-1">
              {kpiSummary.coveredMachines > 0 
                ? `คิดจาก ${kpiSummary.coveredMachines} เครื่องที่มี Planned` 
                : 'ยังไม่มี Planned'}
            </p>
          </div>
        </div>

        {/* KPI 2: MTTR */}
        <div className="bg-surface dark:bg-[#0f172a] border border-border dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-cyan-500 mb-2">
            <span className="text-xs font-bold text-fg-muted dark:text-slate-400 uppercase tracking-wider">MTTR (ซ่อมเฉลี่ย)</span>
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-cyan-500">
              {kpiSummary.overallMttr !== null ? `${kpiSummary.overallMttr.toFixed(2)}` : '—'}
              <span className="text-xs font-normal text-fg-muted dark:text-slate-400 ml-1">ชม.</span>
            </div>
            <p className="text-[11px] text-fg-muted dark:text-slate-400 mt-1">
              {kpiSummary.totalFailures > 0 
                ? `${kpiSummary.totalBdHours.toFixed(2)} ชม. / ${kpiSummary.totalFailures} ครั้ง` 
                : 'ไม่มี Breakdown'}
            </p>
          </div>
        </div>

        {/* KPI 3: MTBF */}
        <div className="bg-surface dark:bg-[#0f172a] border border-border dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <span className="text-xs font-bold text-fg-muted dark:text-slate-400 uppercase tracking-wider">MTBF (รอบห่างเสีย)</span>
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-amber-500">
              {kpiSummary.overallMtbf !== null ? `${kpiSummary.overallMtbf.toFixed(1)}` : '—'}
              <span className="text-xs font-normal text-fg-muted dark:text-slate-400 ml-1">ชม.</span>
            </div>
            <p className="text-[11px] text-fg-muted dark:text-slate-400 mt-1">
              {kpiSummary.coveredMachines > 0 
                ? `(Planned − BD) ÷ Failures` 
                : 'ยังไม่มี Planned'}
            </p>
          </div>
        </div>

        {/* KPI 4: Availability */}
        <div className="bg-surface dark:bg-[#0f172a] border border-border dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-500 mb-2">
            <span className="text-xs font-bold text-fg-muted dark:text-slate-400 uppercase tracking-wider">Availability</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-emerald-500">
              {kpiSummary.overallAvailability !== null ? `${kpiSummary.overallAvailability.toFixed(1)}%` : '—'}
            </div>
            <p className="text-[11px] text-fg-muted dark:text-slate-400 mt-1">
              {kpiSummary.coveredMachines > 0 
                ? `อัตราความพร้อมใช้งานเครื่องจักร` 
                : 'ยังไม่มี Planned'}
            </p>
          </div>
        </div>

        {/* KPI 5: Breakdown Frequency */}
        <div className="col-span-2 lg:col-span-1 bg-surface dark:bg-[#0f172a] border border-border dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-500 mb-2">
            <span className="text-xs font-bold text-fg-muted dark:text-slate-400 uppercase tracking-wider">Breakdown รวม</span>
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-purple-500">
              {kpiSummary.totalFailures}
              <span className="text-xs font-normal text-fg-muted dark:text-slate-400 ml-1">ครั้ง</span>
            </div>
            <p className="text-[11px] text-fg-muted dark:text-slate-400 mt-1">
              เวลาหยุดซ่อมรวม {kpiSummary.totalBdHours.toFixed(2)} ชม.
            </p>
          </div>
        </div>
      </div>

      {/* Machine Table Section */}
      <div className="bg-surface dark:bg-[#0f172a] border border-border dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-border dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted dark:text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหารหัสหรือชื่อเครื่องจักร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-surface dark:bg-slate-950 border border-border dark:border-slate-700 text-fg text-xs rounded-xl focus:outline-none focus:border-cyan-500"
              />
            </div>
            <select
              value={filterLine}
              onChange={(e) => setFilterLine(e.target.value)}
              className="bg-surface dark:bg-slate-950 border border-border dark:border-slate-700 text-fg text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">ทุกกลุ่มไลน์ ({machines.length})</option>
              {lines.map(line => (
                <option key={line} value={line}>{line}</option>
              ))}
            </select>
          </div>

          <span className="text-xs text-fg-muted dark:text-slate-400">
            แสดง {displayedMachines.length} จาก {machines.length} เครื่องจักร
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 dark:bg-slate-900/80 text-fg-muted dark:text-slate-400 uppercase text-[11px] font-bold border-b border-border dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">รหัส / ชื่อเครื่องจักร</th>
                <th className="py-3 px-3 text-center min-w-[130px]">
                  Planned Time (ชม.) <span className="text-cyan-500 text-[10px] lowercase block font-normal">(กรอกเอง)</span>
                </th>
                <th className="py-3 px-3 text-center">BD Time (ชม.)</th>
                <th className="py-3 px-3 text-center">Breakdown (ครั้ง)</th>
                <th className="py-3 px-3 text-center">% Breakdown</th>
                <th className="py-3 px-3 text-center">MTTR (ชม.)</th>
                <th className="py-3 px-3 text-center">MTBF (ชม.)</th>
                <th className="py-3 px-3 text-center">Availability (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-slate-800">
              {displayedMachines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-fg-muted dark:text-slate-400">
                    ไม่พบข้อมูลเครื่องจักรตามคำค้นหา
                  </td>
                </tr>
              ) : (
                displayedMachines.map(machine => {
                  const plannedVal = plannedMap.get(machine.id) ?? null;
                  const kpi = calculateMachineKpi(machine.id, selectedMonth, repairs, plannedVal);
                  const isWarning = kpi.plannedHours !== null && kpi.plannedHours < kpi.bdHours;

                  return (
                    <tr key={machine.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      {/* Machine ID / Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-fg flex items-center gap-1.5">
                          <span className="font-mono text-cyan-600 dark:text-cyan-400">{machine.id}</span>
                          <span className="text-fg-muted dark:text-slate-500">|</span>
                          <span className="truncate max-w-[180px]">{machine.name}</span>
                        </div>
                        <span className="text-[11px] text-fg-muted dark:text-slate-400">
                          {machine.lineGroup || 'ทั่วไป'}
                        </span>
                      </td>

                      {/* Planned Time Input */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="กรอก ชม."
                            value={plannedVal !== null ? plannedVal : ''}
                            onChange={(e) => handlePlannedHoursChange(machine.id, e.target.value)}
                            className={`w-24 text-center font-mono py-1 px-2 text-xs rounded-lg border bg-surface dark:bg-slate-950 text-fg focus:outline-none focus:ring-1 ${
                              isWarning 
                                ? 'border-amber-500 text-amber-600 focus:ring-amber-500' 
                                : 'border-border dark:border-slate-700 focus:border-cyan-500 focus:ring-cyan-500'
                            }`}
                          />
                          {isWarning && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-0.5" title="เวลาซ่อมจริงเกินเวลาแผนการผลิต">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Planned &lt; BD</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* BD Time */}
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {kpi.bdHours > 0 ? kpi.bdHours.toFixed(2) : '0.00'}
                      </td>

                      {/* Failures */}
                      <td className="py-3 px-3 text-center font-mono tabular-nums">
                        <span className={kpi.failures > 0 ? 'text-rose-500 font-bold' : 'text-slate-500'}>
                          {kpi.failures}
                        </span>
                      </td>

                      {/* % Breakdown */}
                      <td className="py-3 px-3 text-center font-mono tabular-nums font-semibold">
                        {kpi.percentBd !== null ? (
                          <span className={kpi.percentBd > 5 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}>
                            {kpi.percentBd.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* MTTR */}
                      <td className="py-3 px-3 text-center font-mono tabular-nums">
                        {kpi.mttr !== null ? (
                          <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                            {kpi.mttr.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* MTBF */}
                      <td className="py-3 px-3 text-center font-mono tabular-nums">
                        {kpi.mtbf !== null ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            {kpi.mtbf.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Availability */}
                      <td className="py-3 px-3 text-center font-mono tabular-nums font-bold">
                        {kpi.availability !== null ? (
                          <span className={kpi.availability >= 90 ? 'text-emerald-500' : 'text-amber-500'}>
                            {kpi.availability.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend / Formulas Standard Box */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-border dark:border-slate-800 rounded-2xl p-4 text-xs">
        <div className="flex items-center gap-2 font-bold text-fg mb-2.5">
          <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>สูตรมาตรฐาน PM Pillar (TPM Standard Calculations):</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-fg-muted dark:text-slate-400 font-mono text-[11px]">
          <div className="p-2 rounded-lg bg-surface dark:bg-slate-950 border border-border dark:border-slate-800/80">
            <span className="text-cyan-600 dark:text-cyan-400 font-bold font-sans">1. % Breakdown:</span>{' '}
            (BD Time ÷ Planned Production Time) × 100
          </div>
          <div className="p-2 rounded-lg bg-surface dark:bg-slate-950 border border-border dark:border-slate-800/80">
            <span className="text-cyan-600 dark:text-cyan-400 font-bold font-sans">2. MTTR:</span>{' '}
            BD Time ÷ จำนวนครั้ง Breakdown (ชม./ครั้ง)
          </div>
          <div className="p-2 rounded-lg bg-surface dark:bg-slate-950 border border-border dark:border-slate-800/80">
            <span className="text-cyan-600 dark:text-cyan-400 font-bold font-sans">3. MTBF:</span>{' '}
            (Planned Production Time − BD Time) ÷ จำนวนครั้ง Breakdown (ชม.)
          </div>
          <div className="p-2 rounded-lg bg-surface dark:bg-slate-950 border border-border dark:border-slate-800/80">
            <span className="text-cyan-600 dark:text-cyan-400 font-bold font-sans">4. Availability:</span>{' '}
            MTBF ÷ (MTBF + MTTR) × 100 หรือ (Operating Time ÷ Planned Time) × 100
          </div>
        </div>
      </div>
    </div>
  );
};
