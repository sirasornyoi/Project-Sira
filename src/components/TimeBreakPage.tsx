import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { TimeBreakPartItem, TimeBreakHistoryRecord, Machine } from '../types';
import { 
  Clock, Plus, Search, Filter, AlertTriangle, CheckCircle, 
  Calendar, Wrench, RefreshCw, ChevronRight, ChevronDown, ChevronUp, Layers, Tag, 
  ArrowRight, ShieldAlert, Edit2, Trash2, CheckCircle2, 
  X, History, Cpu, FileSpreadsheet, Sparkles, ClipboardCheck,
  FolderOpen, Folder, Copy, Check, Boxes, Download, Upload, FileUp, FileCheck
} from 'lucide-react';
import { PMHistoryPage } from './PMHistoryPage';

export const TimeBreakPage: React.FC = () => {
  const { machines, spareParts, timeBreakParts, setTimeBreakParts, technicians } = useApp();

  // Active view tab: Time-Break vs PM History
  const [activeTab, setActiveTab] = useState<'timebreak' | 'pmhistory'>('timebreak');

  // Month filter for current month table
  const currentYearMonth = '2026-09';
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'duemonth' | 'normal'>('all');

  // Grouping mode: 'grouped' (machines with same name combined) vs 'flat' (all individual rows)
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  // Expanded machine name groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Modal states
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [editingPart, setEditingPart] = useState<TimeBreakPartItem | null>(null);
  const [replacingPart, setReplacingPart] = useState<TimeBreakPartItem | null>(null);
  const [copyFeedbackMsg, setCopyFeedbackMsg] = useState<string | null>(null);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Excel Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importParsedParts, setImportParsedParts] = useState<TimeBreakPartItem[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importError, setImportError] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');

  // Replacement modal form fields
  const [replacementDate, setReplacementDate] = useState('2026-09-09');
  const [replacementTech, setReplacementTech] = useState(technicians[0] || 'ช่าง 1');
  const [replacementNote, setReplacementNote] = useState('');

  // Add/Edit Part Form state
  const [formMachineId, setFormMachineId] = useState(machines[0]?.id || 'RIM01');
  const [formPartName, setFormPartName] = useState('');
  const [formPartCode, setFormPartCode] = useState('');
  const [formComponentLocation, setFormComponentLocation] = useState('');
  const [formStartDate, setFormStartDate] = useState('2026-09-01');
  const [formIntervalValue, setFormIntervalValue] = useState<number>(1);
  const [formIntervalUnit, setFormIntervalUnit] = useState<'วัน' | 'เดือน' | 'ปี' | 'สัปดาห์' | 'รอบ'>('เดือน');
  const [formCost, setFormCost] = useState<number>(0);
  const [formAssignedTech, setFormAssignedTech] = useState(technicians[0] || 'ช่าง 1');
  const [formNotes, setFormNotes] = useState('');
  const [formApplyToAllInGroup, setFormApplyToAllInGroup] = useState<boolean>(false);
  const [partToDelete, setPartToDelete] = useState<string | null>(null);
  const [partToCopy, setPartToCopy] = useState<{ part: TimeBreakPartItem; siblings: Machine[] } | null>(null);

  // Calculate next due date helper
  const calculateDueDate = (start: string, val: number, unit: string): string => {
    if (!start) return '';
    const d = new Date(start);
    if (isNaN(d.getTime())) return start;
    const count = Number(val) || 1;

    if (unit === 'วัน') {
      d.setDate(d.getDate() + count);
    } else if (unit === 'สัปดาห์') {
      d.setDate(d.getDate() + count * 7);
    } else if (unit === 'เดือน') {
      d.setMonth(d.getMonth() + count);
    } else if (unit === 'ปี') {
      d.setFullYear(d.getFullYear() + count);
    } else {
      // 'รอบ' (approx 30 days)
      d.setDate(d.getDate() + count * 30);
    }

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Helper to determine part status
  const getPartStatus = (nextDueDate: string): { status: 'overdue' | 'dueThisMonth' | 'normal'; label: string; color: string; badgeBg: string } => {
    const today = '2026-09-09';
    if (!nextDueDate) return { status: 'normal', label: 'ปกติ', color: 'text-slate-400', badgeBg: 'bg-slate-800 text-slate-300' };

    if (nextDueDate <= today) {
      return { 
        status: 'overdue', 
        label: 'ครบเวลาเปลี่ยนแล้ว / เกินกำหนด', 
        color: 'text-red-400', 
        badgeBg: 'bg-red-500/20 text-red-300 border border-red-500/40' 
      };
    }

    const dueYearMonth = nextDueDate.slice(0, 7);
    if (dueYearMonth === selectedMonth) {
      return { 
        status: 'dueThisMonth', 
        label: 'ครบกำหนดในเดือนนี้', 
        color: 'text-amber-400', 
        badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
      };
    }

    return { 
      status: 'normal', 
      label: 'ยังไม่ถึงกำหนด', 
      color: 'text-emerald-400', 
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
    };
  };

  // Format Thai Date
  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const day = parseInt(parts[2], 10);
    const month = months[parseInt(parts[1], 10) - 1];
    const year = parseInt(parts[0], 10) + 543;
    return `${day} ${month} ${year}`;
  };

  // Get lines list
  const availableLines = useMemo(() => {
    const set = new Set<string>();
    machines.forEach(m => {
      if (m.lineGroup) set.add(m.lineGroup);
    });
    return Array.from(set);
  }, [machines]);

  // Group and summarize machines for the current month table
  const machineSummaries = useMemo(() => {
    return machines.map(machine => {
      const parts = timeBreakParts.filter(p => p.machineId === machine.id);
      
      // Check parts due in current selected month or overdue
      const overdueParts = parts.filter(p => p.nextDueDate <= '2026-09-09');
      const dueThisMonthParts = parts.filter(p => {
        const ym = p.nextDueDate.slice(0, 7);
        return ym === selectedMonth && p.nextDueDate > '2026-09-09';
      });
      const normalParts = parts.filter(p => {
        const ym = p.nextDueDate.slice(0, 7);
        return ym > selectedMonth;
      });

      // Find nearest next due date
      const sortedDates = [...parts].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
      const nearestDueDate = sortedDates[0]?.nextDueDate || '';

      // Determine machine overall status
      let machineStatus: 'due' | 'duemonth' | 'normal' | 'noparts' = 'normal';
      if (parts.length === 0) {
        machineStatus = 'noparts';
      } else if (overdueParts.length > 0) {
        machineStatus = 'due';
      } else if (dueThisMonthParts.length > 0) {
        machineStatus = 'duemonth';
      }

      return {
        machine,
        parts,
        overdueCount: overdueParts.length,
        dueThisMonthCount: dueThisMonthParts.length,
        normalCount: normalParts.length,
        nearestDueDate,
        machineStatus
      };
    });
  }, [machines, timeBreakParts, selectedMonth]);

  // Filtered machines based on search, line, status, and parts presence
  const filteredMachines = useMemo(() => {
    return machineSummaries.filter(item => {
      // If searching, check id, name, line, or part names
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchM = item.machine.id.toLowerCase().includes(q) || item.machine.name.toLowerCase().includes(q);
        const matchPart = item.parts.some(p => 
          p.partName.toLowerCase().includes(q) || 
          p.componentLocation.toLowerCase().includes(q) || 
          (p.partCode && p.partCode.toLowerCase().includes(q))
        );
        if (!matchM && !matchPart) return false;
      }

      if (selectedLine !== 'all' && item.machine.lineGroup !== selectedLine) {
        return false;
      }

      if (statusFilter === 'due') {
        return item.overdueCount > 0;
      }
      if (statusFilter === 'duemonth') {
        return item.dueThisMonthCount > 0;
      }
      if (statusFilter === 'normal') {
        return item.machineStatus === 'normal' && item.parts.length > 0;
      }

      return true;
    });
  }, [machineSummaries, searchQuery, selectedLine, statusFilter]);

  // Group machines with duplicate / same name together
  const groupedMachines = useMemo(() => {
    const map = new Map<string, typeof filteredMachines>();
    filteredMachines.forEach(item => {
      const groupName = item.machine.name.trim();
      if (!map.has(groupName)) {
        map.set(groupName, []);
      }
      map.get(groupName)!.push(item);
    });

    const groups: {
      groupName: string;
      items: typeof filteredMachines;
      totalMachines: number;
      totalParts: number;
      overdueCount: number;
      dueThisMonthCount: number;
      normalCount: number;
      nearestDueDate: string;
      lineGroups: string[];
      hasMultiple: boolean;
      groupStatus: 'due' | 'duemonth' | 'normal' | 'noparts';
    }[] = [];

    map.forEach((items, groupName) => {
      let totalParts = 0;
      let overdueCount = 0;
      let dueThisMonthCount = 0;
      let normalCount = 0;
      const lines = new Set<string>();
      const dueDates: string[] = [];

      items.forEach(it => {
        totalParts += it.parts.length;
        overdueCount += it.overdueCount;
        dueThisMonthCount += it.dueThisMonthCount;
        normalCount += it.normalCount;
        if (it.machine.lineGroup) lines.add(it.machine.lineGroup);
        if (it.nearestDueDate) dueDates.push(it.nearestDueDate);
      });

      dueDates.sort();
      const nearestDueDate = dueDates[0] || '';

      let groupStatus: 'due' | 'duemonth' | 'normal' | 'noparts' = 'normal';
      if (totalParts === 0) {
        groupStatus = 'noparts';
      } else if (overdueCount > 0) {
        groupStatus = 'due';
      } else if (dueThisMonthCount > 0) {
        groupStatus = 'duemonth';
      }

      groups.push({
        groupName,
        items,
        totalMachines: items.length,
        totalParts,
        overdueCount,
        dueThisMonthCount,
        normalCount,
        nearestDueDate,
        lineGroups: Array.from(lines),
        hasMultiple: items.length > 1,
        groupStatus
      });
    });

    return groups;
  }, [filteredMachines]);

  // Toggle expand/collapse for a specific machine name group
  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const all = new Set(groupedMachines.map(g => g.groupName));
    setExpandedGroups(all);
  };

  const handleCollapseAll = () => {
    setExpandedGroups(new Set());
  };

  // Find all sibling machines that have the exact same name as the active machine
  const activeMachineSiblings = useMemo(() => {
    if (!selectedMachineId) return [];
    const activeM = machines.find(m => m.id === selectedMachineId);
    if (!activeM) return [];
    return machines.filter(m => m.name.trim().toLowerCase() === activeM.name.trim().toLowerCase());
  }, [machines, selectedMachineId]);

  // Copy part to all other machines in the same name group
  const handleCopyPartToSiblings = (part: TimeBreakPartItem) => {
    const currentM = machines.find(m => m.id === part.machineId);
    if (!currentM) return;

    const siblings = machines.filter(
      m => m.name.trim().toLowerCase() === currentM.name.trim().toLowerCase() && m.id !== currentM.id
    );

    if (siblings.length === 0) {
      alert('ไม่มีเครื่องอื่นที่มีชื่อเดียวกันในระบบ');
      return;
    }

    setPartToCopy({ part, siblings });
  };

  const confirmCopyPartToSiblings = () => {
    if (!partToCopy) return;
    const { part, siblings } = partToCopy;

    const newPartsToAdd: TimeBreakPartItem[] = [];
    siblings.forEach(sm => {
      const alreadyExists = timeBreakParts.some(
        p => p.machineId === sm.id && p.partName === part.partName && p.componentLocation === part.componentLocation
      );
      if (!alreadyExists) {
        newPartsToAdd.push({
          id: `tb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${sm.id}`,
          machineId: sm.id,
          partName: part.partName,
          partCode: part.partCode,
          componentLocation: part.componentLocation,
          startDate: part.startDate,
          intervalValue: part.intervalValue,
          intervalUnit: part.intervalUnit,
          cycleCount: 0,
          nextDueDate: part.nextDueDate,
          costPerUnit: part.costPerUnit,
          assignedTechnician: part.assignedTechnician,
          notes: part.notes,
          history: []
        });
      }
    });

    if (newPartsToAdd.length > 0) {
      setTimeBreakParts(prev => [...newPartsToAdd, ...prev]);
      setCopyFeedbackMsg(`คัดลอกอะไหล่ไปยัง ${newPartsToAdd.length} เครื่องที่มีชื่อเดียวกันเรียบร้อยแล้ว`);
      setTimeout(() => setCopyFeedbackMsg(null), 3500);
    } else {
      alert('เครื่องในกลุ่มทั้งหมดมีอะไหล่นี้อยู่แล้ว');
    }
    setPartToCopy(null);
  };

  // Global KPIs for the month
  const monthKpis = useMemo(() => {
    let totalMachinesWithParts = 0;
    let totalParts = timeBreakParts.length;
    let overduePartsCount = 0;
    let dueThisMonthPartsCount = 0;
    let totalCompletedCycles = 0;

    machineSummaries.forEach(m => {
      if (m.parts.length > 0) totalMachinesWithParts++;
      overduePartsCount += m.overdueCount;
      dueThisMonthPartsCount += m.dueThisMonthCount;
      m.parts.forEach(p => {
        totalCompletedCycles += p.cycleCount || 0;
      });
    });

    return {
      totalMachinesWithParts,
      totalParts,
      overduePartsCount,
      dueThisMonthPartsCount,
      totalCompletedCycles
    };
  }, [machineSummaries, timeBreakParts]);

  // Open add part modal
  const handleOpenAddPart = (targetMachineId?: string) => {
    setEditingPart(null);
    setFormMachineId(targetMachineId || selectedMachineId || machines[0]?.id || 'RIM01');
    setFormPartName('');
    setFormPartCode('');
    setFormComponentLocation('');
    setFormStartDate('2026-09-01');
    setFormIntervalValue(1);
    setFormIntervalUnit('เดือน');
    setFormCost(0);
    setFormAssignedTech(technicians[0] || 'ช่าง 1');
    setFormNotes('');
    setFormApplyToAllInGroup(false);
    setShowAddPartModal(true);
  };

  // Open edit part modal
  const handleOpenEditPart = (part: TimeBreakPartItem) => {
    setEditingPart(part);
    setFormMachineId(part.machineId);
    setFormPartName(part.partName);
    setFormPartCode(part.partCode || '');
    setFormComponentLocation(part.componentLocation);
    setFormStartDate(part.startDate);
    setFormIntervalValue(part.intervalValue);
    setFormIntervalUnit(part.intervalUnit);
    setFormCost(part.costPerUnit || 0);
    setFormAssignedTech(part.assignedTechnician || technicians[0] || 'ช่าง 1');
    setFormNotes(part.notes || '');
    setFormApplyToAllInGroup(false);
    setShowAddPartModal(true);
  };

  // Save Add/Edit Part
  const handleSavePart = () => {
    if (!formPartName.trim()) {
      alert('กรุณากรอกหรือเลือกชื่ออะไหล่');
      return;
    }
    if (!formComponentLocation.trim()) {
      alert('กรุณาระบุส่วนไหนของเครื่องที่ต้องเปลี่ยน');
      return;
    }
    if (!formStartDate) {
      alert('กรุณาระบุวันเริ่มเปลี่ยน');
      return;
    }
    if (!formIntervalValue || formIntervalValue <= 0) {
      alert('กรุณาระบุจำนวนรอบการเปลี่ยน (ครั้ง/เวลา) ให้ถูกต้อง');
      return;
    }

    const calculatedNextDue = calculateDueDate(formStartDate, formIntervalValue, formIntervalUnit);

    if (editingPart) {
      // Update existing part
      setTimeBreakParts(prev => prev.map(item => {
        if (item.id === editingPart.id) {
          return {
            ...item,
            machineId: formMachineId,
            partName: formPartName.trim(),
            partCode: formPartCode.trim() || undefined,
            componentLocation: formComponentLocation.trim(),
            startDate: formStartDate,
            intervalValue: Number(formIntervalValue),
            intervalUnit: formIntervalUnit,
            nextDueDate: calculatedNextDue,
            costPerUnit: formCost > 0 ? formCost : undefined,
            assignedTechnician: formAssignedTech,
            notes: formNotes.trim() || undefined
          };
        }
        return item;
      }));
    } else {
      // Create new part
      const basePart: TimeBreakPartItem = {
        id: `tb-${Date.now()}`,
        machineId: formMachineId,
        partName: formPartName.trim(),
        partCode: formPartCode.trim() || undefined,
        componentLocation: formComponentLocation.trim(),
        startDate: formStartDate,
        intervalValue: Number(formIntervalValue),
        intervalUnit: formIntervalUnit,
        cycleCount: 0,
        nextDueDate: calculatedNextDue,
        costPerUnit: formCost > 0 ? formCost : undefined,
        assignedTechnician: formAssignedTech,
        notes: formNotes.trim() || undefined,
        history: []
      };

      const partsToInsert: TimeBreakPartItem[] = [basePart];

      // If user checked apply to all machines with same name in group
      if (formApplyToAllInGroup) {
        const targetM = machines.find(m => m.id === formMachineId);
        if (targetM) {
          const siblings = machines.filter(
            m => m.name.trim().toLowerCase() === targetM.name.trim().toLowerCase() && m.id !== formMachineId
          );
          siblings.forEach(sm => {
            partsToInsert.push({
              ...basePart,
              id: `tb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${sm.id}`,
              machineId: sm.id,
              history: []
            });
          });
        }
      }

      setTimeBreakParts(prev => [...partsToInsert, ...prev]);
    }

    setShowAddPartModal(false);
    setEditingPart(null);
  };

  // Delete part
  const handleDeletePart = (partId: string) => {
    setPartToDelete(partId);
  };

  const confirmDeletePart = () => {
    if (!partToDelete) return;
    setTimeBreakParts(prev => prev.filter(p => p.id !== partToDelete));
    setPartToDelete(null);
  };

  // Open replacement modal
  const handleOpenReplaceModal = (part: TimeBreakPartItem) => {
    setReplacingPart(part);
    setReplacementDate('2026-09-09');
    setReplacementTech(part.assignedTechnician || technicians[0] || 'ช่าง 1');
    setReplacementNote('');
  };

  // Save completed replacement
  const handleConfirmReplacement = () => {
    if (!replacingPart) return;

    const nextCycleNumber = (replacingPart.cycleCount || 0) + 1;
    const nextDue = calculateDueDate(replacementDate, replacingPart.intervalValue, replacingPart.intervalUnit);

    const historyRecord: TimeBreakHistoryRecord = {
      id: `h-${Date.now()}`,
      replacedDate: replacementDate,
      cycleNumber: nextCycleNumber,
      technician: replacementTech,
      note: replacementNote.trim() || `เปลี่ยนตามรอบที่ ${nextCycleNumber} สำเร็จ`
    };

    setTimeBreakParts(prev => prev.map(p => {
      if (p.id === replacingPart.id) {
        return {
          ...p,
          startDate: replacementDate,
          lastReplacedDate: replacementDate,
          cycleCount: nextCycleNumber,
          nextDueDate: nextDue,
          history: [historyRecord, ...(p.history || [])]
        };
      }
      return p;
    }));

    setReplacingPart(null);
  };

  // Safe Date string parser from Excel
  const parseAnyDateToIso = (val: any): string => {
    if (!val) return '2026-09-01';
    if (val instanceof Date) {
      if (!isNaN(val.getTime())) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
    if (typeof val === 'number') {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) return str.replace(/\//g, '-');
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const parts = str.split('/');
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return '2026-09-01';
  };

  // Export Time-Break data to Excel (.xlsx)
  const handleExportExcel = (targetMachineId?: string) => {
    try {
      const partsToExport = targetMachineId 
        ? timeBreakParts.filter(p => p.machineId === targetMachineId)
        : timeBreakParts;

      if (partsToExport.length === 0) {
        alert('ไม่พบข้อมูลอะไหล่ Time-Break สำหรับส่งออก');
        return;
      }

      // 1. Detailed parts sheet
      const partsData = partsToExport.map((p, idx) => {
        const m = machines.find(item => item.id === p.machineId);
        const status = getPartStatus(p.nextDueDate);
        return {
          'ลำดับ': idx + 1,
          'รหัสเครื่องจักร': p.machineId,
          'ชื่อเครื่องจักร': m?.name || p.machineId,
          'ไลน์ผลิต': m?.lineGroup || '-',
          'ชื่ออะไหล่ Time-Break': p.partName,
          'รหัสอะไหล่': p.partCode || '-',
          'ส่วนที่ต้องเปลี่ยน': p.componentLocation,
          'วันเริ่มรอบล่าสุด': p.startDate,
          'รอบความถี่': p.intervalValue,
          'หน่วยความถี่': p.intervalUnit,
          'วันครบเวลาเปลี่ยน': p.nextDueDate,
          'จำนวนรอบที่เปลี่ยนแล้ว': p.cycleCount || 0,
          'วันที่เปลี่ยนล่าสุด': p.lastReplacedDate || '-',
          'ช่างผู้รับผิดชอบ': p.assignedTechnician || '-',
          'ราคาต่อหน่วย (บาท)': p.costPerUnit || 0,
          'สถานะปัจจุบัน': status.label,
          'หมายเหตุ': p.notes || '-'
        };
      });

      // 2. Machine summary sheet
      const summariesToExport = targetMachineId
        ? machineSummaries.filter(ms => ms.machine.id === targetMachineId)
        : machineSummaries;

      const summaryData = summariesToExport.map((ms, idx) => ({
        'ลำดับ': idx + 1,
        'รหัสเครื่อง': ms.machine.id,
        'ชื่อเครื่องจักร': ms.machine.name,
        'ไลน์ผลิต': ms.machine.lineGroup || '-',
        'จำนวนอะไหล่ Time-Break ทั้งหมด': ms.parts.length,
        'รายการเกินกำหนด (ชิ้น)': ms.overdueCount,
        'รายการครบกำหนดในเดือนนี้ (ชิ้น)': ms.dueThisMonthCount,
        'รายการปกติ (ชิ้น)': ms.normalCount,
        'วันครบกำหนดที่ใกล้ที่สุด': ms.nearestDueDate || '-',
        'สถานะภาพรวม': ms.machineStatus === 'due' ? 'ครบเวลาเปลี่ยน' : ms.machineStatus === 'duemonth' ? 'ครบในเดือนนี้' : ms.machineStatus === 'normal' ? 'ปกติ' : 'ยังไม่มีอะไหล่'
      }));

      // 3. Replacement history sheet
      const historyData: any[] = [];
      partsToExport.forEach(p => {
        const m = machines.find(item => item.id === p.machineId);
        if (p.history && p.history.length > 0) {
          p.history.forEach(h => {
            historyData.push({
              'รหัสเครื่อง': p.machineId,
              'ชื่อเครื่องจักร': m?.name || p.machineId,
              'ชื่ออะไหล่': p.partName,
              'ส่วนที่เปลี่ยน': p.componentLocation,
              'รอบที่': h.cycleNumber,
              'วันที่เปลี่ยนจริง': h.replacedDate,
              'ช่างผู้เปลี่ยน': h.technician,
              'บันทึกรายละเอียด': h.note || '-'
            });
          });
        }
      });

      const wb = XLSX.utils.book_new();

      const wsParts = XLSX.utils.json_to_sheet(partsData);
      wsParts['!cols'] = [
        { wch: 8 }, { wch: 16 }, { wch: 25 }, { wch: 15 },
        { wch: 30 }, { wch: 16 }, { wch: 24 }, { wch: 16 },
        { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 },
        { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 24 }, { wch: 28 }
      ];
      XLSX.utils.book_append_sheet(wb, wsParts, "TimeBreak_Parts");

      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary['!cols'] = [
        { wch: 8 }, { wch: 14 }, { wch: 25 }, { wch: 14 },
        { wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 16 },
        { wch: 20 }, { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Machine_Summary");

      if (historyData.length > 0) {
        const wsHistory = XLSX.utils.json_to_sheet(historyData);
        wsHistory['!cols'] = [
          { wch: 14 }, { wch: 25 }, { wch: 28 }, { wch: 22 },
          { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 35 }
        ];
        XLSX.utils.book_append_sheet(wb, wsHistory, "Change_History");
      }

      const filePrefix = targetMachineId ? `TimeBreak_${targetMachineId}` : `TimeBreak_Parts_Plan_${selectedMonth}`;
      const fileName = `${filePrefix}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setExportSuccessMsg(`ส่งออกไฟล์ "${fileName}" สำเร็จ (${partsToExport.length} รายการอะไหล่)`);
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการส่งออก Excel: ${err.message || err}`);
    }
  };

  // Download Sample Template (.xlsx)
  const handleDownloadTemplate = () => {
    const headers = [
      'รหัสเครื่องจักร*',
      'ชื่ออะไหล่*',
      'ส่วนที่ต้องเปลี่ยน*',
      'รหัสอะไหล่',
      'วันเริ่มรอบล่าสุด (YYYY-MM-DD)*',
      'ความถี่รอบ (ตัวเลข)*',
      'หน่วยความถี่ (วัน/สัปดาห์/เดือน/ปี/รอบ)*',
      'วันครบเวลาเปลี่ยน (YYYY-MM-DD)',
      'จำนวนรอบที่ผ่านมา (ครั้ง)',
      'ช่างผู้รับผิดชอบ',
      'ราคาต่อหน่วย (บาท)',
      'หมายเหตุ'
    ];

    const sampleRows = [
      [
        'RIM01',
        'สายพานไทม์มิ่ง HTD 8M-1200',
        'ชุดขับแกนกวนผสมหลัก',
        'BLT-8M-1200',
        '2026-06-01',
        3,
        'เดือน',
        '2026-09-01',
        2,
        'ช่าง 1',
        1200,
        'ตรวจเช็คความตึงและรอยแตก'
      ],
      [
        'RIM02',
        'ตลับลูกปืนเม็ดกลม 6205-2RS',
        'เพลาขับมอเตอร์ผสม',
        'BRG-6205-2RS',
        '2026-03-15',
        6,
        'เดือน',
        '2026-09-15',
        1,
        'ช่าง 2',
        450,
        'ใช้น้ำมันจาระบีเกรด Food grade'
      ],
      [
        'VAC01',
        'ซีลยางขอบฝา Chamber ยางซิลิโคน',
        'ขอบฝาปิดแท่นสุญญากาศ',
        'SEAL-SIL-5M',
        '2026-08-10',
        1,
        'เดือน',
        '2026-09-10',
        4,
        'ช่าง 3',
        850,
        'ป้องกันอากาศรั่วตอนดูดสุญญากาศ'
      ],
      [
        'FFS01',
        'ใบมีดตัดซองฟิล์มสแตนเลส (Heated Blade)',
        'ชุดฮีตเตอร์ตัดท้ายซอง',
        'BLD-FFS-300',
        '2026-07-01',
        2,
        'เดือน',
        '2026-09-01',
        3,
        'ช่าง 1',
        2500,
        'ลับคมและตั้งระยะชิดก่อนเปลี่ยน'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
      { wch: 18 }, { wch: 30 }, { wch: 25 }, { wch: 16 },
      { wch: 24 }, { wch: 16 }, { wch: 20 }, { wch: 22 },
      { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 28 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TimeBreak_Template");
    XLSX.writeFile(wb, "TimeBreak_Parts_Import_Template.xlsx");
  };

  // Handle uploaded Excel file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!data || data.length < 2) {
          setImportError('ไม่พบข้อมูลแถวในไฟล์ หรือไฟล์มีเฉพาะหัวตาราง');
          return;
        }

        const headers = (data[0] as any[]).map(h => String(h || '').trim());
        const colMap = {
          machineId: -1,
          partName: -1,
          componentLocation: -1,
          partCode: -1,
          startDate: -1,
          intervalValue: -1,
          intervalUnit: -1,
          nextDueDate: -1,
          cycleCount: -1,
          assignedTechnician: -1,
          costPerUnit: -1,
          notes: -1
        };

        headers.forEach((h, idx) => {
          const hl = h.toLowerCase();
          if (hl.includes('รหัสเครื่อง') || hl.includes('machine id') || hl.includes('machineid') || hl.includes('รหัสเครื่องจักร') || hl.includes('เครื่อง')) {
            if (colMap.machineId === -1) colMap.machineId = idx;
          } else if (hl.includes('ชื่ออะไหล่') || hl.includes('part name') || hl.includes('partname') || hl.includes('รายการอะไหล่') || hl.includes('อะไหล่')) {
            if (colMap.partName === -1) colMap.partName = idx;
          } else if (hl.includes('ส่วนที่') || hl.includes('ตำแหน่ง') || hl.includes('component') || hl.includes('location')) {
            if (colMap.componentLocation === -1) colMap.componentLocation = idx;
          } else if (hl.includes('รหัสอะไหล่') || hl.includes('part code') || hl.includes('partcode') || hl.includes('spare code')) {
            if (colMap.partCode === -1) colMap.partCode = idx;
          } else if (hl.includes('วันเริ่ม') || hl.includes('start date') || hl.includes('startdate')) {
            if (colMap.startDate === -1) colMap.startDate = idx;
          } else if (hl.includes('ความถี่') || hl.includes('interval') || hl.includes('รอบความถี่') || hl.includes('ระยะรอบ')) {
            if (colMap.intervalValue === -1) colMap.intervalValue = idx;
          } else if (hl.includes('หน่วย') || hl.includes('unit')) {
            if (colMap.intervalUnit === -1) colMap.intervalUnit = idx;
          } else if (hl.includes('วันครบ') || hl.includes('due date') || hl.includes('duedate') || hl.includes('กำหนดเปลี่ยน')) {
            if (colMap.nextDueDate === -1) colMap.nextDueDate = idx;
          } else if (hl.includes('รอบที่ผ่านมา') || hl.includes('cycle') || hl.includes('จำนวนรอบ')) {
            if (colMap.cycleCount === -1) colMap.cycleCount = idx;
          } else if (hl.includes('ช่าง') || hl.includes('technician') || hl.includes('tech')) {
            if (colMap.assignedTechnician === -1) colMap.assignedTechnician = idx;
          } else if (hl.includes('ราคา') || hl.includes('cost') || hl.includes('price')) {
            if (colMap.costPerUnit === -1) colMap.costPerUnit = idx;
          } else if (hl.includes('หมายเหตุ') || hl.includes('note') || hl.includes('remark')) {
            if (colMap.notes === -1) colMap.notes = idx;
          }
        });

        if (colMap.machineId === -1 && headers.length > 0) colMap.machineId = 0;
        if (colMap.partName === -1 && headers.length > 1) colMap.partName = 1;
        if (colMap.componentLocation === -1 && headers.length > 2) colMap.componentLocation = 2;

        const parsed: TimeBreakPartItem[] = [];
        const rows = data.slice(1);

        rows.forEach((row, rIdx) => {
          if (!row || row.length === 0) return;
          const mId = String(row[colMap.machineId] || '').trim();
          const pName = String(row[colMap.partName] || '').trim();
          if (!mId && !pName) return;

          const compLoc = colMap.componentLocation >= 0 ? String(row[colMap.componentLocation] || '').trim() : 'ทั่วไป';
          const pCode = colMap.partCode >= 0 ? String(row[colMap.partCode] || '').trim() : '';

          const startDt = colMap.startDate >= 0 ? parseAnyDateToIso(row[colMap.startDate]) : '2026-09-01';
          const intVal = colMap.intervalValue >= 0 ? Number(row[colMap.intervalValue]) || 1 : 1;
          const intUnitRaw = colMap.intervalUnit >= 0 ? String(row[colMap.intervalUnit] || '').trim() : 'เดือน';
          let intUnit: 'วัน' | 'เดือน' | 'ปี' | 'สัปดาห์' | 'รอบ' = 'เดือน';
          if (intUnitRaw.includes('วัน') || intUnitRaw.toLowerCase().includes('day')) intUnit = 'วัน';
          else if (intUnitRaw.includes('สัปดาห์') || intUnitRaw.toLowerCase().includes('week')) intUnit = 'สัปดาห์';
          else if (intUnitRaw.includes('ปี') || intUnitRaw.toLowerCase().includes('year')) intUnit = 'ปี';
          else if (intUnitRaw.includes('รอบ') || intUnitRaw.toLowerCase().includes('cycle') || intUnitRaw.toLowerCase().includes('round')) intUnit = 'รอบ';
          else intUnit = 'เดือน';

          let nextDue = colMap.nextDueDate >= 0 ? parseAnyDateToIso(row[colMap.nextDueDate]) : '';
          if (!nextDue || nextDue === '2026-09-01') {
            nextDue = calculateDueDate(startDt, intVal, intUnit);
          }

          const cycles = colMap.cycleCount >= 0 ? Number(row[colMap.cycleCount]) || 0 : 0;
          const tech = colMap.assignedTechnician >= 0 ? String(row[colMap.assignedTechnician] || '').trim() : (technicians[0] || 'ช่าง 1');
          const cost = colMap.costPerUnit >= 0 ? Number(row[colMap.costPerUnit]) || 0 : 0;
          const notes = colMap.notes >= 0 ? String(row[colMap.notes] || '').trim() : '';

          parsed.push({
            id: `tb-${Date.now()}-${rIdx}-${Math.random().toString(36).substring(2, 6)}`,
            machineId: mId || 'RIM01',
            partName: pName || 'อะไหล่ Time-Break',
            partCode: pCode || undefined,
            componentLocation: compLoc || 'ทั่วไป',
            startDate: startDt,
            intervalValue: intVal,
            intervalUnit: intUnit,
            cycleCount: cycles,
            nextDueDate: nextDue,
            assignedTechnician: tech || undefined,
            costPerUnit: cost,
            notes: notes || undefined,
            history: []
          });
        });

        if (parsed.length === 0) {
          setImportError('ไม่พบข้อมูลรายการอะไหล่ในไฟล์ กรุณาตรวจสอบข้อมูล');
          return;
        }

        setImportParsedParts(parsed);
      } catch (err: any) {
        setImportError(`เกิดข้อผิดพลาดในการประมวลผลไฟล์: ${err.message || err}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (importParsedParts.length === 0) return;

    if (importMode === 'append') {
      setTimeBreakParts(prev => [...importParsedParts, ...prev]);
      setCopyFeedbackMsg(`นำเข้าข้อมูลอะไหล่ Time-Break สำเร็จ ${importParsedParts.length} รายการ (เพิ่มต่อท้ายเดิม)`);
    } else {
      setTimeBreakParts(importParsedParts);
      setCopyFeedbackMsg(`นำเข้าข้อมูลอะไหล่ Time-Break สำเร็จ ${importParsedParts.length} รายการ (แทนที่ข้อมูลเดิมทั้งหมด)`);
    }

    setTimeout(() => setCopyFeedbackMsg(null), 4000);
    setShowImportModal(false);
    setImportParsedParts([]);
    setImportFileName('');
  };

  // Selected Machine details
  const activeMachine = useMemo(() => {
    return machines.find(m => m.id === selectedMachineId);
  }, [machines, selectedMachineId]);

  const activeMachineParts = useMemo(() => {
    if (!selectedMachineId) return [];
    return timeBreakParts.filter(p => p.machineId === selectedMachineId);
  }, [timeBreakParts, selectedMachineId]);

  return (
    <div className="flex-1 flex flex-col h-full bg-bg text-fg overflow-y-auto" id="time-break-main-view">
      
      {/* 1. TOP HEADER & NAVIGATION */}
      <div id="time-break-banner" className="p-4 sm:p-6 bg-surface/95 dark:bg-[#0f172a]/95 border-b border-border dark:border-slate-800/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-500 dark:text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-fg tracking-tight flex items-center gap-2.5">
                  เปลี่ยนอะไหล่ Time-Break
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-sky-100 dark:bg-cyan-500/20 text-sky-900 dark:text-cyan-200 border border-sky-300 dark:border-cyan-500/40">
                    Time-Based Replacement
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-fg-muted mt-0.5 font-medium">
                  ตารางระบุเครื่องในเดือนปัจจุบัน ครบเวลาเปลี่ยนอะไหล่ และจำนวนรอบการเปลี่ยน (ครั้ง/เวลา)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Tab switch between Time-Break and old PM History */}
            <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center">
              <button
                id="btn-tab-time-break"
                onClick={() => setActiveTab('timebreak')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === 'timebreak' 
                    ? 'bg-cyan-600 text-white shadow-md' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-fg'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                ตาราง Time-Break
              </button>
              <button
                id="btn-tab-pm-history"
                onClick={() => setActiveTab('pmhistory')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === 'pmhistory' 
                    ? 'bg-cyan-600 text-white shadow-md' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-fg'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                งานบันทึกประวัติ PM (เดิม)
              </button>
            </div>

            {activeTab === 'timebreak' && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  id="btn-export-timebreak-excel"
                  onClick={() => handleExportExcel()}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-fg border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  title="ส่งออกข้อมูลอะไหล่ Time-Break ทั้งหมดเป็นไฟล์ Excel (.xlsx)"
                >
                  <Download className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Export Excel</span>
                </button>

                <button
                  id="btn-import-timebreak-excel"
                  onClick={() => {
                    setImportParsedParts([]);
                    setImportError(null);
                    setImportFileName('');
                    setShowImportModal(true);
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-fg border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  title="นำเข้าข้อมูลอะไหล่ Time-Break จากไฟล์ Excel (.xlsx, .xls, .csv)"
                >
                  <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Import Excel</span>
                </button>

                <button
                  id="btn-add-timebreak-part"
                  onClick={() => handleOpenAddPart()}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มอะไหล่ Time-Break
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* If PM History tab is selected, render the complete PMHistoryPage component */}
      {activeTab === 'pmhistory' ? (
        <div className="flex-1">
          <PMHistoryPage />
        </div>
      ) : (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
          
          {/* Notification banner for Export / Import / Copy operations */}
          {(exportSuccessMsg || copyFeedbackMsg) && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-medium">{exportSuccessMsg || copyFeedbackMsg}</span>
              </div>
              <button 
                onClick={() => { setExportSuccessMsg(null); setCopyFeedbackMsg(null); }}
                className="text-emerald-600 dark:text-emerald-400 hover:text-fg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* 2. STATS & MONTH SUMMARY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl bg-surface dark:bg-slate-900/90 border border-border dark:border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-800 dark:text-slate-200 block mb-1 font-bold">เครื่องที่มีระบบ Time-Break</span>
                <div className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                  {monthKpis.totalMachinesWithParts} <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">เครื่อง</span>
                </div>
                <span className="text-[11px] text-cyan-800 dark:text-cyan-300 font-bold">จากทั้งหมด {machines.length} เครื่อง</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-700 dark:text-cyan-400">
                <Cpu className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface dark:bg-slate-900/90 border border-red-200 dark:border-red-900/40 flex items-center justify-between">
              <div>
                <span className="text-xs text-red-800 dark:text-red-300 block mb-1 font-bold">ครบเวลาเปลี่ยน / เกินกำหนด</span>
                <div className="text-2xl font-black text-red-700 dark:text-red-400 tracking-tight">
                  {monthKpis.overduePartsCount} <span className="text-xs text-red-800/90 dark:text-red-300/80 font-medium">รายการ</span>
                </div>
                <span className="text-[11px] text-red-800 dark:text-red-300/90 font-bold">ต้องรีบเปลี่ยนด่วน</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface dark:bg-slate-900/90 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-900 dark:text-amber-300 block mb-1 font-bold">ครบกำหนดในเดือนนี้ ({selectedMonth})</span>
                <div className="text-2xl font-black text-amber-800 dark:text-amber-400 tracking-tight">
                  {monthKpis.dueThisMonthPartsCount} <span className="text-xs text-amber-900/90 dark:text-amber-300/80 font-medium">รายการ</span>
                </div>
                <span className="text-[11px] text-amber-900 dark:text-amber-300/90 font-bold">เตรียมอะไหล่และช่าง</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface dark:bg-slate-900/90 border border-border dark:border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-800 dark:text-slate-200 block mb-1 font-bold">จำนวนรอบที่เปลี่ยนแล้วสะสม</span>
                <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                  {monthKpis.totalCompletedCycles} <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">รอบ</span>
                </div>
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">จาก {monthKpis.totalParts} อะไหล่ที่ควบคุม</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <RefreshCw className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* 3. FILTER BAR & VIEW MODE CONTROLS */}
          <div className="bg-surface dark:bg-slate-900/90 border border-border dark:border-slate-800/90 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Month selector */}
                <div className="flex items-center gap-1.5 bg-bg dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-border dark:border-slate-800">
                  <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span className="text-xs text-fg-muted dark:text-slate-400 font-medium">เดือน:</span>
                  <input 
                    id="filter-month-input"
                    type="month" 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-fg text-xs font-semibold outline-none cursor-pointer"
                  />
                  {selectedMonth !== currentYearMonth && (
                    <button 
                      onClick={() => setSelectedMonth(currentYearMonth)}
                      className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline ml-1"
                    >
                      กลับเดือนนี้
                    </button>
                  )}
                </div>

                {/* Line group filter */}
                <div className="flex items-center gap-1.5 bg-bg dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-border dark:border-slate-800">
                  <Filter className="w-3.5 h-3.5 text-fg-muted dark:text-slate-400 shrink-0" />
                  <select 
                    id="filter-line-select"
                    value={selectedLine} 
                    onChange={(e) => setSelectedLine(e.target.value)}
                    className="bg-transparent text-fg text-xs outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-surface dark:bg-slate-900 text-fg">ทุกลำดับไลน์การผลิต</option>
                    {availableLines.map(line => (
                      <option key={line} value={line} className="bg-surface dark:bg-slate-900 text-fg">{line}</option>
                    ))}
                  </select>
                </div>

                {/* Status filter */}
                <div className="flex items-center gap-1.5 bg-bg dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-border dark:border-slate-800">
                  <select 
                    id="filter-status-select"
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-transparent text-fg text-xs outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-surface dark:bg-slate-900 text-fg">สถานะทั้งหมด</option>
                    <option value="due" className="bg-surface dark:bg-slate-900 text-red-600 dark:text-red-300 font-medium">🔴 ครบเวลาเปลี่ยน / เกินกำหนด</option>
                    <option value="duemonth" className="bg-surface dark:bg-slate-900 text-amber-600 dark:text-amber-300 font-medium">🟡 ครบกำหนดในเดือนนี้</option>
                    <option value="normal" className="bg-surface dark:bg-slate-900 text-emerald-600 dark:text-emerald-300 font-medium">🟢 ปกติ ยังไม่ถึงรอบ</option>
                  </select>
                </div>
              </div>

              {/* Search Input */}
              <div className="relative w-full lg:w-64">
                <Search className="w-4 h-4 text-fg-muted dark:text-slate-500 absolute left-3 top-2.5" />
                <input 
                  id="search-machine-part-input"
                  type="text" 
                  placeholder="ค้นหาเครื่องจักร, ชื่ออะไหล่..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-bg dark:bg-slate-950 border border-border dark:border-slate-800 rounded-lg text-xs text-fg placeholder:text-fg-muted/60 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* View Mode: Grouped duplicate names vs Flat List */}
            <div className="pt-2.5 border-t border-border dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold">รูปแบบแสดงตาราง:</span>
                <div className="flex items-center bg-white dark:bg-slate-950 p-0.5 rounded-lg border border-slate-300 dark:border-slate-800 shadow-xs">
                  <button
                    id="btn-view-mode-grouped"
                    onClick={() => setViewMode('grouped')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                      viewMode === 'grouped'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-fg'
                    }`}
                    title="รวมเครื่องชื่อซ้ำไว้ที่เดียวกัน และกดแยกดูได้"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>รวมเครื่องชื่อซ้ำ ({groupedMachines.length} กลุ่ม)</span>
                  </button>
                  <button
                    id="btn-view-mode-flat"
                    onClick={() => setViewMode('flat')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                      viewMode === 'flat'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-fg'
                    }`}
                    title="แสดงแยกเรียงทีละเครื่องจักรทุกเครื่อง"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>แสดงแยกทุกเครื่อง ({filteredMachines.length} เครื่อง)</span>
                  </button>
                </div>
              </div>

              {viewMode === 'grouped' && (
                <div className="flex items-center gap-2">
                  <button
                    id="btn-expand-all-groups"
                    onClick={handleExpandAll}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-800 dark:text-cyan-300 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                    title="กดแยกดูทุกกลุ่มเครื่องจักร"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>ขยายแยกทั้งหมด</span>
                  </button>
                  <button
                    id="btn-collapse-all-groups"
                    onClick={handleCollapseAll}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                    title="ยุบรวมทุกกลุ่มเครื่องจักร"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>ยุบรวมทั้งหมด</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 4. MAIN TABLE: ระบุเครื่องในเดือนปัจจุบัน & ครบเวลาเปลี่ยนอะไหล่ & รอบการเปลี่ยน */}
          <div className="bg-surface dark:bg-slate-900/90 border border-border dark:border-slate-800/90 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-fg flex items-center gap-2">
                  <span>ตารางระบุเครื่องจักรในเดือนปัจจุบัน ({selectedMonth})</span>
                  <span className="text-xs font-normal text-fg-muted dark:text-slate-400">
                    {viewMode === 'grouped' ? (
                      <>({groupedMachines.length} กลุ่มชื่อเครื่อง / {filteredMachines.length} เครื่อง)</>
                    ) : (
                      <>({filteredMachines.length} เครื่องจักร)</>
                    )}
                  </span>
                </h2>
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> ครบเวลาเปลี่ยน</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> ถึงรอบในเดือนนี้</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> ปกติ</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-border dark:border-slate-800 text-slate-800 dark:text-slate-200">
                    <th className="py-3 px-4 font-bold w-24">รหัสเครื่อง</th>
                    <th className="py-3 px-4 font-bold min-w-[200px]">ชื่อเครื่องจักร / ไลน์ผลิต</th>
                    <th className="py-3 px-4 font-bold min-w-[280px]">อะไหล่ Time-Break & ส่วนที่ต้องเปลี่ยน</th>
                    <th className="py-3 px-4 font-bold min-w-[140px]">วันครบเวลาเปลี่ยน</th>
                    <th className="py-3 px-4 font-bold min-w-[150px]">จำนวนรอบการเปลี่ยน (ครั้ง/เวลา)</th>
                    <th className="py-3 px-4 font-bold min-w-[120px]">สถานะ</th>
                    <th className="py-3 px-4 font-bold text-right min-w-[160px]">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-slate-800/70">
                  {filteredMachines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-fg-muted dark:text-slate-400">
                        <Clock className="w-10 h-10 mx-auto text-fg-muted/60 dark:text-cyan-400/80 mb-2 opacity-80" />
                        <p className="text-sm">ไม่พบรายการเครื่องจักรหรืออะไหล่ที่ตรงกับเงื่อนไขการค้นหา</p>
                      </td>
                    </tr>
                  ) : viewMode === 'grouped' ? (
                    /* GROUPED VIEW: เครื่องชื่อซ้ำ รวมที่เดียวแล้วกดแยกได้ */
                    groupedMachines.map((group) => {
                      const isExpanded = expandedGroups.has(group.groupName);
                      return (
                        <React.Fragment key={`group-block-${group.groupName}`}>
                          {/* Group Parent Row */}
                          <tr 
                            id={`row-group-${group.groupName.replace(/[^a-zA-Z0-9]/g, '-')}`}
                            className={`transition-colors border-b border-border dark:border-slate-800 cursor-pointer ${
                              isExpanded 
                                ? 'bg-cyan-50/80 dark:bg-slate-800/80 hover:bg-cyan-100/80 dark:hover:bg-slate-800 text-fg dark:text-slate-100' 
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-surface dark:bg-slate-900/40'
                            }`}
                            onClick={() => toggleGroup(group.groupName)}
                          >
                            {/* Group Machine IDs or expand indicator */}
                            <td className="py-3.5 px-4 font-mono">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGroup(group.groupName);
                                  }}
                                  className={`p-1 rounded transition-colors ${
                                    isExpanded 
                                      ? 'bg-cyan-600 text-white font-bold' 
                                      : 'bg-white dark:bg-slate-800 text-cyan-800 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 shadow-xs'
                                  }`}
                                  title={isExpanded ? 'ยุบรวม' : 'กดแยกดูรายเครื่อง'}
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                                {group.hasMultiple ? (
                                  <span className="font-bold text-cyan-700 dark:text-cyan-400 text-[11px]">
                                    {group.totalMachines} เครื่อง
                                  </span>
                                ) : (
                                  <span className="font-bold text-cyan-700 dark:text-cyan-400 text-xs">
                                    {group.items[0]?.machine.id}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Group Name & Badges */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-fg text-sm">
                                  {group.groupName}
                                </span>
                                {group.hasMultiple ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 flex items-center gap-1">
                                    <Boxes className="w-3 h-3" />
                                    <span>ชื่อซ้ำ {group.totalMachines} เครื่อง</span>
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400">
                                    1 เครื่อง
                                  </span>
                                )}
                              </div>

                              {/* Machine IDs tag list & lines */}
                              <div className="text-[11px] text-fg-muted dark:text-slate-400 flex items-center gap-1.5 mt-1 flex-wrap">
                                {group.hasMultiple && (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="text-[10px] text-fg-muted/70 dark:text-slate-500">รหัส:</span>
                                    {group.items.map(it => (
                                      <span key={it.machine.id} className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-cyan-800 dark:text-cyan-300">
                                        {it.machine.id}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
                                  {group.lineGroups.join(', ') || 'ทั่วไป'}
                                </span>
                                <span>• รวม {group.totalParts} อะไหล่</span>
                              </div>
                            </td>

                            {/* Group Parts summary */}
                            <td className="py-3.5 px-4">
                              {group.totalParts === 0 ? (
                                <span className="text-fg-muted/60 dark:text-slate-400 italic">ยังไม่มีการกำหนดอะไหล่ในกลุ่มนี้</span>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-semibold text-fg dark:text-slate-200">
                                      ติดตั้งทั้งหมด {group.totalParts} รายการ
                                    </span>
                                    {group.hasMultiple && (
                                      <span className="text-[10px] text-fg-muted dark:text-slate-400">
                                        ({isExpanded ? 'แสดงรายเครื่องแล้ว' : 'คลิกแถวเพื่อดูรายเครื่อง'})
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {Array.from(new Set(group.items.flatMap(it => it.parts.map(p => p.partName)))).slice(0, 3).map((pName, idx) => (
                                      <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-[10px] text-slate-700 dark:text-slate-300">
                                        {pName}
                                      </span>
                                    ))}
                                    {Array.from(new Set(group.items.flatMap(it => it.parts.map(p => p.partName)))).length > 3 && (
                                      <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-medium">
                                        +{Array.from(new Set(group.items.flatMap(it => it.parts.map(p => p.partName)))).length - 3} รายการ
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Nearest Due Date in Group */}
                            <td className="py-3.5 px-4">
                              {group.nearestDueDate ? (
                                <div>
                                  <div className="font-semibold text-fg">
                                    {formatThaiDate(group.nearestDueDate)}
                                  </div>
                                  <span className="text-[10px] text-fg-muted dark:text-slate-400">
                                    กำหนดใกล้สุดในกลุ่ม
                                  </span>
                                </div>
                              ) : (
                                <span className="text-fg-muted/60 dark:text-slate-500">-</span>
                              )}
                            </td>

                            {/* Interval & Cycles overview */}
                            <td className="py-3.5 px-4">
                              {group.totalParts > 0 ? (
                                <div className="space-y-0.5">
                                  <div className="text-xs text-fg-muted dark:text-slate-300">
                                    {group.items.length} เครื่องจักร
                                  </div>
                                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                                    รอบสะสม {group.items.reduce((sum, it) => sum + it.parts.reduce((s, p) => s + (p.cycleCount || 0), 0), 0)} รอบ
                                  </div>
                                </div>
                              ) : (
                                <span className="text-fg-muted/60 dark:text-slate-500">-</span>
                              )}
                            </td>

                            {/* Group Status */}
                            <td className="py-3.5 px-4">
                              {group.totalParts === 0 ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400">
                                  ไม่มีรายการ
                                </span>
                              ) : group.overdueCount > 0 ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-500/40 inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  ครบเวลา {group.overdueCount} รายการ
                                </span>
                              ) : group.dueThisMonthCount > 0 ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  ครบเดือนนี้ {group.dueThisMonthCount} รายการ
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 inline-flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  ปกติทั้งหมด
                                </span>
                              )}
                            </td>

                            {/* Group Action Buttons */}
                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {group.hasMultiple ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddPart(group.items[0]?.machine.id)}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-fg rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border border-slate-200 dark:border-transparent"
                                    title="เพิ่มอะไหล่ใหม่ให้กับเครื่องในกลุ่มนี้"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>เพิ่ม Part</span>
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      id={`btn-open-machine-${group.items[0]?.machine.id}`}
                                      onClick={() => setSelectedMachineId(group.items[0]?.machine.id)}
                                      className="px-2.5 py-1.5 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-600/20 dark:hover:bg-cyan-600/40 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                                      title="กดเพื่อระบุและดู Part ของเครื่องนี้"
                                    >
                                      <span>ระบุ Part</span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      id={`btn-add-part-machine-${group.items[0]?.machine.id}`}
                                      onClick={() => handleOpenAddPart(group.items[0]?.machine.id)}
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-fg rounded-lg transition-colors border border-slate-200 dark:border-transparent"
                                      title="เพิ่มอะไหล่ใหม่ให้เครื่องนี้"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Sub-rows for each machine when expanded (กดแยก) */}
                          {isExpanded && group.items.map(({ machine, parts, overdueCount, dueThisMonthCount, nearestDueDate, machineStatus }) => (
                            <tr
                              key={`sub-${machine.id}`}
                              id={`row-machine-${machine.id}`}
                              className="bg-slate-50/80 dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-900/90 transition-colors border-b border-border dark:border-slate-800/50 cursor-pointer"
                              onClick={() => setSelectedMachineId(machine.id)}
                            >
                              {/* Submachine ID with branch marker */}
                              <td className="py-3 px-4 pl-7 font-mono">
                                <div className="flex items-center gap-2">
                                  <span className="text-fg-muted dark:text-slate-600 font-mono text-xs">↳</span>
                                  <span className="font-bold text-cyan-800 dark:text-cyan-300 bg-surface dark:bg-slate-900 px-2 py-0.5 rounded border border-border dark:border-slate-800 text-xs">
                                    {machine.id}
                                  </span>
                                </div>
                              </td>

                              {/* Machine line and details */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-fg dark:text-slate-200">{machine.name}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-400">
                                    {machine.lineGroup || 'ทั่วไป'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-fg-muted dark:text-slate-400 mt-0.5">
                                  ติดตั้ง {parts.length} อะไหล่ในเครื่องนี้
                                </div>
                              </td>

                              {/* Machine specific parts */}
                              <td className="py-3 px-4">
                                {parts.length === 0 ? (
                                  <span className="text-fg-muted/60 dark:text-slate-400 italic text-[11px]">ยังไม่มีอะไหล่ Time-Break</span>
                                ) : (
                                  <div className="space-y-1.5">
                                    {parts.map((p) => {
                                      const statusInfo = getPartStatus(p.nextDueDate);
                                      return (
                                        <div 
                                          key={p.id} 
                                          className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-surface dark:bg-slate-900 border border-border dark:border-slate-800"
                                        >
                                          <div className="truncate flex-1">
                                            <span className="font-medium text-fg dark:text-slate-200 block truncate">{p.partName}</span>
                                            <span className="text-[10px] text-cyan-700 dark:text-cyan-400/90 block truncate">
                                              ส่วนที่เปลี่ยน: {p.componentLocation}
                                            </span>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusInfo.badgeBg}`}>
                                              {formatThaiDate(p.nextDueDate)}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>

                              {/* Next Due Date for this machine */}
                              <td className="py-3 px-4">
                                {nearestDueDate ? (
                                  <div>
                                    <div className="font-semibold text-fg">
                                      {formatThaiDate(nearestDueDate)}
                                    </div>
                                    <span className="text-[10px] text-fg-muted dark:text-slate-400">
                                      กำหนดใกล้สุด
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-fg-muted/60 dark:text-slate-500">-</span>
                                )}
                              </td>

                              {/* Interval and cycles for this machine */}
                              <td className="py-3 px-4">
                                {parts.length > 0 ? (
                                  <div className="space-y-1">
                                    {parts.slice(0, 2).map(p => (
                                      <div key={p.id} className="text-[11px] text-fg-muted dark:text-slate-300 flex items-center justify-between">
                                        <span>ทุก {p.intervalValue} {p.intervalUnit}</span>
                                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">รอบที่ {p.cycleCount || 0}</span>
                                      </div>
                                    ))}
                                    {parts.length > 2 && (
                                      <span className="text-[10px] text-fg-muted dark:text-slate-400">และรอบอื่นๆ...</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-fg-muted/60 dark:text-slate-500">-</span>
                                )}
                              </td>

                              {/* Status Badge */}
                              <td className="py-3 px-4">
                                {parts.length === 0 ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400">
                                    ไม่มีรายการ
                                  </span>
                                ) : overdueCount > 0 ? (
                                  <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-500/40 inline-flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    ครบเวลา {overdueCount}
                                  </span>
                                ) : dueThisMonthCount > 0 ? (
                                  <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    ครบเดือนนี้ {dueThisMonthCount}
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 inline-flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    ปกติ
                                  </span>
                                )}
                              </td>

                              {/* Actions for this individual machine */}
                              <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    id={`btn-open-machine-${machine.id}`}
                                    onClick={() => setSelectedMachineId(machine.id)}
                                    className="px-2.5 py-1.5 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-600/20 dark:hover:bg-cyan-600/40 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                                    title="กดเพื่อระบุและดู Part ของเครื่องนี้"
                                  >
                                    <span>ระบุ Part</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    id={`btn-add-part-machine-${machine.id}`}
                                    onClick={() => handleOpenAddPart(machine.id)}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-fg rounded-lg transition-colors border border-slate-200 dark:border-transparent"
                                    title="เพิ่มอะไหล่ใหม่ให้เครื่องนี้"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    /* FLAT VIEW: แสดงแยกทุกเครื่อง */
                    filteredMachines.map(({ machine, parts, overdueCount, dueThisMonthCount, nearestDueDate, machineStatus }) => {
                      return (
                        <tr 
                          key={machine.id} 
                          id={`row-machine-${machine.id}`}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer border-b border-border dark:border-slate-800/70"
                          onClick={() => setSelectedMachineId(machine.id)}
                        >
                          {/* Machine ID */}
                          <td className="py-3.5 px-4 font-mono font-bold text-cyan-700 dark:text-cyan-400">
                            {machine.id}
                          </td>

                          {/* Machine Name & Line */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-fg group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">
                              {machine.name}
                            </div>
                            <div className="text-[11px] text-fg-muted dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
                                {machine.lineGroup || 'ทั่วไป'}
                              </span>
                              <span>• ติดตั้ง {parts.length} อะไหล่</span>
                            </div>
                          </td>

                          {/* Parts installed & component location */}
                          <td className="py-3.5 px-4">
                            {parts.length === 0 ? (
                              <span className="text-fg-muted/60 dark:text-slate-400 italic">ยังไม่มีการกำหนดอะไหล่ Time-Break</span>
                            ) : (
                              <div className="space-y-1.5">
                                {parts.slice(0, 3).map((p) => {
                                  const statusInfo = getPartStatus(p.nextDueDate);
                                  return (
                                    <div 
                                      key={p.id} 
                                      className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-surface dark:bg-slate-950/60 border border-border dark:border-slate-800/80"
                                    >
                                      <div className="truncate flex-1">
                                        <span className="font-medium text-fg dark:text-slate-200 block truncate">{p.partName}</span>
                                        <span className="text-[10px] text-cyan-700 dark:text-cyan-400/90 block truncate">
                                          ส่วนที่เปลี่ยน: {p.componentLocation}
                                        </span>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusInfo.badgeBg}`}>
                                          {formatThaiDate(p.nextDueDate)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                                {parts.length > 3 && (
                                  <div className="text-[10px] text-cyan-700 dark:text-cyan-400 font-medium pt-0.5">
                                    + อีก {parts.length - 3} รายการ (คลิกเพื่อดูทั้งหมด)
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Next Due Date */}
                          <td className="py-3.5 px-4">
                            {nearestDueDate ? (
                              <div>
                                <div className="font-semibold text-fg">
                                  {formatThaiDate(nearestDueDate)}
                                </div>
                                <span className="text-[10px] text-fg-muted dark:text-slate-400">
                                  กำหนดใกล้สุด
                                </span>
                              </div>
                            ) : (
                              <span className="text-fg-muted/60 dark:text-slate-500">-</span>
                            )}
                          </td>

                          {/* Interval and Cycle Count */}
                          <td className="py-3.5 px-4">
                            {parts.length > 0 ? (
                              <div className="space-y-1">
                                {parts.slice(0, 2).map(p => (
                                  <div key={p.id} className="text-[11px] text-fg-muted dark:text-slate-300 flex items-center justify-between">
                                    <span>ทุก {p.intervalValue} {p.intervalUnit}</span>
                                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">รอบที่ {p.cycleCount || 0}</span>
                                  </div>
                                ))}
                                {parts.length > 2 && (
                                  <span className="text-[10px] text-fg-muted dark:text-slate-400">และรอบอื่นๆ...</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-fg-muted/60 dark:text-slate-500">-</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {parts.length === 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400">
                                ไม่มีรายการ
                              </span>
                            ) : overdueCount > 0 ? (
                              <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-500/40 inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                ครบเวลา {overdueCount} รายการ
                              </span>
                            ) : dueThisMonthCount > 0 ? (
                              <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                ครบเดือนนี้ {dueThisMonthCount} รายการ
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 inline-flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                ปกติ
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                id={`btn-open-machine-${machine.id}`}
                                onClick={() => setSelectedMachineId(machine.id)}
                                className="px-2.5 py-1.5 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-600/20 dark:hover:bg-cyan-600/40 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                                title="กดเพื่อระบุและดู Part ของเครื่องนี้"
                              >
                                <span>ระบุ Part</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`btn-add-part-machine-${machine.id}`}
                                onClick={() => handleOpenAddPart(machine.id)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-fg rounded-lg transition-colors border border-slate-200 dark:border-transparent"
                                title="เพิ่มอะไหล่ใหม่ให้เครื่องนี้"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: รายละเอียดและระบุ PART ของตัวเครื่อง (เมื่อกดไปที่ตัวเครื่อง) */}
      {selectedMachineId && activeMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-bg/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface dark:bg-[#0f172a] border border-border dark:border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-600 dark:text-cyan-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-fg flex items-center gap-2">
                    <span>{activeMachine.id}</span>
                    <span className="text-fg-muted dark:text-slate-400 font-normal">| {activeMachine.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                      {activeMachine.lineGroup || 'ทั่วไป'}
                    </span>
                  </h3>
                  <p className="text-xs text-fg-muted dark:text-slate-400">
                    รายการอะไหล่ Time-Break ที่ต้องเปลี่ยน, ส่วนประกอบของเครื่อง, และประวัติรอบการเปลี่ยน
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-modal-export-machine-excel"
                  onClick={() => handleExportExcel(activeMachine.id)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-fg rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-300 dark:border-slate-700 cursor-pointer shadow-sm"
                  title={`ส่งออกรายการอะไหล่เฉพาะเครื่อง ${activeMachine.name} (${activeMachine.id}) เป็น Excel`}
                >
                  <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Excel เครื่องนี้</span>
                </button>
                <button
                  id="btn-modal-add-part"
                  onClick={() => handleOpenAddPart(activeMachine.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่ม Part เครื่องนี้
                </button>
                <button
                  id="btn-modal-close"
                  onClick={() => setSelectedMachineId(null)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-fg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sibling Machines Switcher: สลับดูเครื่องอื่นที่ชื่อเดียวกันในกลุ่ม */}
            {activeMachineSiblings.length > 1 && (
              <div className="px-4 sm:px-6 py-2.5 bg-slate-100/90 dark:bg-slate-950/90 border-b border-border dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    สลับดูเครื่องชื่อเดียวกัน ({activeMachine.name} - รวม {activeMachineSiblings.length} เครื่อง):
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeMachineSiblings.map(sm => {
                    const isCurrent = sm.id === activeMachine.id;
                    const smPartsCount = timeBreakParts.filter(p => p.machineId === sm.id).length;
                    return (
                      <button
                        key={sm.id}
                        type="button"
                        onClick={() => setSelectedMachineId(sm.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                          isCurrent
                            ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-500'
                            : 'bg-surface dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-fg hover:bg-slate-100 dark:hover:bg-slate-800 border border-border dark:border-slate-800'
                        }`}
                      >
                        <span>{sm.id}</span>
                        <span className="text-[10px] opacity-80">({smPartsCount} Part)</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Copy Feedback notification */}
            {copyFeedbackMsg && (
              <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{copyFeedbackMsg}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {activeMachineParts.length === 0 ? (
                <div className="py-12 text-center text-fg-muted dark:text-slate-300 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-border dark:border-slate-800">
                  <Clock className="w-12 h-12 mx-auto text-fg-muted/60 dark:text-cyan-400/80 mb-3 opacity-80" />
                  <h4 className="text-sm font-semibold text-fg dark:text-slate-200">ยังไม่มีการระบุ Part อะไหล่ Time-Break สำหรับเครื่องนี้</h4>
                  <p className="text-xs text-fg-muted dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                    กดปุ่มด้านล่างเพื่อเพิ่มอะไหล่ที่ต้องเปลี่ยน ระบุส่วนที่ติดตั้ง วันที่เริ่ม และรอบความถี่
                  </p>
                  <button
                    onClick={() => handleOpenAddPart(activeMachine.id)}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 shadow"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่ม Part แรกสำหรับเครื่องนี้
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeMachineParts.map((part) => {
                    const statusInfo = getPartStatus(part.nextDueDate);
                    return (
                      <div 
                        key={part.id} 
                        className="bg-surface dark:bg-slate-950/80 border border-border dark:border-slate-800 rounded-xl p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          
                          {/* Part Name & Component details */}
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-bold text-fg tracking-tight">
                                {part.partName}
                              </span>
                              {part.partCode && (
                                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-cyan-800 dark:text-cyan-400 font-mono border border-slate-200 dark:border-transparent">
                                  {part.partCode}
                                </span>
                              )}
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusInfo.badgeBg}`}>
                                {statusInfo.label}
                              </span>
                            </div>

                            {/* ส่วนไหนที่ต้องเปลี่ยน */}
                            <div className="flex items-center gap-1.5 text-xs text-cyan-800 dark:text-cyan-300">
                              <span className="text-fg-muted dark:text-slate-400">ส่วนที่ต้องเปลี่ยนในเครื่อง:</span>
                              <span className="font-semibold bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800/40">
                                🔧 {part.componentLocation}
                              </span>
                            </div>

                            {part.notes && (
                              <p className="text-xs text-fg-muted dark:text-slate-400 italic">
                                หมายเหตุ: {part.notes}
                              </p>
                            )}
                          </div>

                          {/* Quick Metrics: Start, Interval, Next Due */}
                          <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-slate-900/90 p-2.5 rounded-lg border border-border dark:border-slate-800 shrink-0">
                            <div>
                              <span className="text-[10px] text-fg-muted dark:text-slate-400 block">วันเริ่มเปลี่ยน</span>
                              <span className="text-xs font-semibold text-fg dark:text-slate-200">
                                {formatThaiDate(part.startDate)}
                              </span>
                            </div>
                            <div className="border-x border-border dark:border-slate-800 px-2">
                              <span className="text-[10px] text-fg-muted dark:text-slate-400 block">รอบการเปลี่ยน</span>
                              <span className="text-xs font-semibold text-amber-600 dark:text-amber-300">
                                ทุก {part.intervalValue} {part.intervalUnit}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-fg-muted dark:text-slate-400 block">วันครบกำหนดถัดไป</span>
                              <span className={`text-xs font-bold ${statusInfo.color}`}>
                                {formatThaiDate(part.nextDueDate)}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 justify-end shrink-0 flex-wrap">
                            {activeMachineSiblings.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleCopyPartToSiblings(part)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-800 dark:text-cyan-300 hover:text-cyan-900 dark:hover:text-cyan-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                                title={`คัดลอกรายการนี้ไปยังเครื่องชื่อ "${activeMachine.name}" อีก ${activeMachineSiblings.length - 1} เครื่อง`}
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>คัดลอกไปเครื่องชื่อซ้ำ</span>
                              </button>
                            )}
                            <button
                              id={`btn-replace-part-${part.id}`}
                              onClick={() => handleOpenReplaceModal(part)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow flex items-center gap-1.5"
                              title="บันทึกว่าเปลี่ยนอะไหล่รอบนี้แล้ว"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              บันทึกเปลี่ยนอะไหล่
                            </button>
                            <button
                              id={`btn-edit-part-${part.id}`}
                              onClick={() => handleOpenEditPart(part)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-fg rounded-lg transition-colors border border-slate-200 dark:border-transparent"
                              title="แก้ไขข้อมูลอะไหล่"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`btn-delete-part-${part.id}`}
                              onClick={() => handleDeletePart(part.id)}
                              className="p-1.5 bg-slate-100 hover:bg-red-100 dark:bg-slate-800 dark:hover:bg-red-900/60 text-slate-700 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-300 rounded-lg transition-colors border border-slate-200 dark:border-transparent"
                              title="ลบอะไหล่นี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* History row if cycles exists */}
                        <div className="mt-3 pt-2.5 border-t border-border dark:border-slate-800/80 flex items-center justify-between text-xs text-fg-muted dark:text-slate-400 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">รอบที่เปลี่ยนไปแล้ว: {part.cycleCount || 0} รอบ</span>
                            {part.lastReplacedDate && (
                              <span>(เปลี่ยนล่าสุด: {formatThaiDate(part.lastReplacedDate)})</span>
                            )}
                          </div>
                          {part.history && part.history.length > 0 && (
                            <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">
                              มีบันทึกประวัติการเปลี่ยน {part.history.length} ครั้ง
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <span className="text-xs text-fg-muted dark:text-slate-400">
                รวม {activeMachineParts.length} อะไหล่ในเครื่อง {activeMachine.id}
              </span>
              <button
                onClick={() => setSelectedMachineId(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-fg rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: เพิ่ม/แก้ไข อะไหล่ Time-Break (แค่วันเริ่มเปลี่ยน กับ จำนวนครั้ง/เวลา) */}
      {showAddPartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-bg/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface dark:bg-[#0f172a] border border-border dark:border-slate-700 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
            
            <div className="p-4 sm:p-5 border-b border-border dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-fg">
                    {editingPart ? 'แก้ไขอะไหล่ Time-Break' : 'เพิ่มอะไหล่ที่ต้องเปลี่ยน (Time-Break)'}
                  </h3>
                  <p className="text-xs text-fg-muted dark:text-slate-400">
                    ระบุเครื่องจักร, ส่วนที่เปลี่ยน, วันเริ่มเปลี่ยน และจำนวนรอบการเปลี่ยน (ครั้ง/เวลา)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddPartModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-fg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              
              {/* 1. เครื่องจักร */}
              <div>
                <label className="block text-xs font-semibold text-fg dark:text-slate-300 mb-1.5">
                  เครื่องจักรที่ติดตั้ง <span className="text-red-500">*</span>
                </label>
                <select
                  id="form-select-machine"
                  value={formMachineId}
                  onChange={(e) => setFormMachineId(e.target.value)}
                  className="w-full bg-surface dark:bg-slate-950 border border-border dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {machines.map(m => (
                    <option key={m.id} value={m.id} className="bg-surface dark:bg-slate-900 text-fg">
                      {m.id} - {m.name} ({m.lineGroup || 'ทั่วไป'})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. ชื่ออะไหล่ */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-fg dark:text-slate-300">
                    ชื่ออะไหล่ / รหัสอะไหล่ <span className="text-red-500">*</span>
                  </label>
                  {spareParts.length > 0 && (
                    <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">
                      หรือเลือกจากคลังอะไหล่ ({spareParts.length} รายการ)
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    id="form-part-name-input"
                    type="text"
                    placeholder="เช่น สายพานไทม์มิ่ง HTD-8M, ตลับลูกปืน 6205, ซีลลูกสูบ"
                    value={formPartName}
                    onChange={(e) => setFormPartName(e.target.value)}
                    className="w-full bg-surface dark:bg-slate-950 border border-border dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-fg placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  />

                  {/* Preset quick selection from spare parts inventory */}
                  {spareParts.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-fg-muted dark:text-slate-400">
                      <span className="shrink-0 text-slate-500">เลือกด่วน:</span>
                      {spareParts.slice(0, 4).map(sp => (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => {
                            setFormPartName(sp.name);
                            setFormPartCode(sp.id);
                            if (sp.pricePerUnit) setFormCost(sp.pricePerUnit);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-fg shrink-0 border border-slate-200 dark:border-slate-700/60 transition-colors"
                        >
                          {sp.id}: {sp.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. ส่วนไหนที่ต้องเปลี่ยน (Component Location) */}
              <div>
                <label className="block text-xs font-semibold text-fg dark:text-slate-300 mb-1.5">
                  ส่วนไหนของเครื่องที่ต้องเปลี่ยน (ตำแหน่ง / Component) <span className="text-red-500">*</span>
                </label>
                <input
                  id="form-component-location-input"
                  type="text"
                  placeholder="เช่น ชุดเพลาขับมอเตอร์หลัก, โซ่ลำเลียงท้ายไลน์, กระบอกลมตัดฟิล์ม, ซีลฝาถัง"
                  value={formComponentLocation}
                  onChange={(e) => setFormComponentLocation(e.target.value)}
                  className="w-full bg-surface dark:bg-slate-950 border border-border dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-fg placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />

                {/* Location suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5 text-[10px]">
                  <span className="text-slate-500">ตัวอย่าง:</span>
                  {[
                    'ชุดเพลาขับมอเตอร์หลัก', 
                    'แกนเพลาใบกวนผสมข้าว', 
                    'กระบอกสูบตัดท้ายไลน์', 
                    'หัวกดซีลความร้อน', 
                    'ไส้กรองสุญญากาศ', 
                    'ยางขอบประตูตู้'
                  ].map(loc => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setFormComponentLocation(loc)}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300 border border-slate-200 dark:border-slate-800 transition-colors"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. วันเริ่มเปลี่ยน & จำนวนครั้ง/เวลา (Highlight requirement) */}
              <div className="p-3.5 bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-500/30 rounded-xl space-y-3">
                <div className="text-xs font-bold text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>กำหนดวันเริ่มเปลี่ยน และ จำนวนรอบการเปลี่ยน (ครั้ง/เวลา)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* วันเริ่มเปลี่ยน */}
                  <div>
                    <label className="block text-xs font-semibold text-fg dark:text-slate-300 mb-1">
                      วันเริ่มเปลี่ยน / เริ่มนับรอบ <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="form-start-date-input"
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full bg-surface dark:bg-slate-950 border border-border dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* จำนวนครั้ง / เวลา */}
                  <div>
                    <label className="block text-xs font-semibold text-fg dark:text-slate-300 mb-1">
                      จำนวนรอบการเปลี่ยน (ครั้ง/เวลา) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        id="form-interval-val-input"
                        type="number"
                        min="1"
                        value={formIntervalValue}
                        onChange={(e) => setFormIntervalValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-24 bg-surface dark:bg-slate-950 border border-border dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-fg text-center font-bold focus:outline-none focus:border-cyan-500"
                      />
                      <select
                        id="form-interval-unit-select"
                        value={formIntervalUnit}
                        onChange={(e) => setFormIntervalUnit(e.target.value as any)}
                        className="flex-1 bg-surface dark:bg-slate-950 border border-border dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value="วัน">วัน</option>
                        <option value="สัปดาห์">สัปดาห์</option>
                        <option value="เดือน">เดือน</option>
                        <option value="ปี">ปี</option>
                        <option value="รอบ">รอบ</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Quick frequency presets */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="text-fg-muted dark:text-slate-400">ความถี่มาตรฐาน:</span>
                  {[
                    { label: 'ทุก 15 วัน', val: 15, unit: 'วัน' as const },
                    { label: 'ทุก 1 เดือน', val: 1, unit: 'เดือน' as const },
                    { label: 'ทุก 2 เดือน', val: 2, unit: 'เดือน' as const },
                    { label: 'ทุก 3 เดือน (ไตรมาส)', val: 3, unit: 'เดือน' as const },
                    { label: 'ทุก 6 เดือน', val: 6, unit: 'เดือน' as const },
                    { label: 'ทุก 1 ปี', val: 1, unit: 'ปี' as const },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setFormIntervalValue(preset.val);
                        setFormIntervalUnit(preset.unit);
                      }}
                      className={`px-2 py-0.5 rounded border transition-colors ${
                        formIntervalValue === preset.val && formIntervalUnit === preset.unit
                          ? 'bg-cyan-600 text-white border-cyan-600'
                          : 'bg-surface dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-border dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Next due calculation preview */}
                <div className="p-2 bg-surface dark:bg-slate-900/90 rounded-lg border border-border dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-fg-muted dark:text-slate-400">วันครบเวลาเปลี่ยนอะไหล่รอบถัดไป:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {formatThaiDate(calculateDueDate(formStartDate, formIntervalValue, formIntervalUnit))}
                  </span>
                </div>
              </div>

              {/* Optional details: Notes, Tech */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fg dark:text-slate-300 mb-1">
                    ช่างผู้รับผิดชอบ
                  </label>
                  <select
                    value={formAssignedTech}
                    onChange={(e) => setFormAssignedTech(e.target.value)}
                    className="w-full bg-surface dark:bg-slate-950 border border-border dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {technicians.map(t => (
                      <option key={t} value={t} className="bg-surface dark:bg-slate-900 text-fg">{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fg dark:text-slate-300 mb-1">
                    หมายเหตุ / วิธีการตรวจสอบ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ตรวจเช็คความตึง, ตลับลูกปืนทนความร้อน"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-surface dark:bg-slate-950 border border-border dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-fg placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Apply to all machines in same name group checkbox */}
              {!editingPart && (() => {
                const selectedM = machines.find(m => m.id === formMachineId);
                const siblingCount = selectedM
                  ? machines.filter(m => m.name.trim().toLowerCase() === selectedM.name.trim().toLowerCase()).length
                  : 0;

                if (siblingCount <= 1) return null;

                return (
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/50 rounded-xl">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formApplyToAllInGroup}
                        onChange={(e) => setFormApplyToAllInGroup(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-surface dark:bg-slate-900 border-border dark:border-slate-700 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300 block flex items-center gap-1.5">
                          <Boxes className="w-3.5 h-3.5" />
                          <span>คัดลอกเพิ่ม Part นี้ให้กับเครื่องชื่อ "{selectedM?.name}" ทั้งหมด ({siblingCount} เครื่อง)</span>
                        </span>
                        <span className="text-[11px] text-fg-muted dark:text-slate-400 block mt-0.5">
                          เมื่อบันทึก ระบบจะสร้างรายการอะไหล่นี้ให้กับเครื่องทุกเครื่องที่มีชื่อเดียวกันนี้พร้อมกันทันที ไม่ต้องเพิ่มทีละเครื่อง
                        </span>
                      </div>
                    </label>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t border-border dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddPartModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-fg rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                id="btn-save-timebreak-part"
                type="button"
                onClick={handleSavePart}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{editingPart ? 'บันทึกการแก้ไข' : 'บันทึกเพิ่มอะไหล่'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: บันทึกการเปลี่ยนอะไหล่รอบนี้ (Record Replacement) */}
      {replacingPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-bg/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface dark:bg-[#0f172a] border border-border dark:border-slate-700 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden">
            
            <div className="p-4 sm:p-5 border-b border-border dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-fg">
                    บันทึกการเปลี่ยนอะไหล่ (รอบที่ {(replacingPart.cycleCount || 0) + 1})
                  </h3>
                  <p className="text-xs text-fg-muted dark:text-slate-400">
                    อัปเดตรอบการเปลี่ยน และคำนวณวันครบกำหนดรอบถัดไปอัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReplacingPart(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-fg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-border dark:border-slate-800 space-y-1">
                <div className="text-xs text-fg-muted dark:text-slate-400">เครื่องจักร: <span className="font-bold text-fg">{replacingPart.machineId}</span></div>
                <div className="text-sm font-bold text-fg">{replacingPart.partName}</div>
                <div className="text-xs text-cyan-700 dark:text-cyan-400 font-medium">ส่วนที่เปลี่ยน: {replacingPart.componentLocation}</div>
                <div className="text-xs text-fg-muted dark:text-slate-400">รอบความถี่: ทุก {replacingPart.intervalValue} {replacingPart.intervalUnit}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg dark:text-slate-300 mb-1.5">
                  วันที่เปลี่ยนอะไหล่จริง <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={replacementDate}
                  onChange={(e) => setReplacementDate(e.target.value)}
                  className="w-full bg-surface dark:bg-slate-950 border border-border dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg dark:text-slate-300 mb-1.5">
                  ช่างผู้ดำเนินการเปลี่ยน
                </label>
                <select
                  value={replacementTech}
                  onChange={(e) => setReplacementTech(e.target.value)}
                  className="w-full bg-surface dark:bg-slate-950 border border-border dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {technicians.map(t => (
                    <option key={t} value={t} className="bg-surface dark:bg-slate-900 text-fg">{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg dark:text-slate-300 mb-1.5">
                  สภาพอะไหล่เดิม / บันทึกผลการเปลี่ยน
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น สภาพฟันสายพานสึกหรอปกติ, เปลี่ยนตลับลูกปืนชุดใหม่เรียบร้อย, ทดสอบเดินเครื่องปกติ"
                  value={replacementNote}
                  onChange={(e) => setReplacementNote(e.target.value)}
                  className="w-full bg-surface dark:bg-slate-950 border border-border dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-fg placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs space-y-1">
                <div className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ผลลัพธ์หลังบันทึก:</span>
                </div>
                <div className="text-slate-700 dark:text-slate-300">
                  • จำนวนรอบสะสมจะปรับเป็น: <span className="font-bold text-fg">รอบที่ {(replacingPart.cycleCount || 0) + 1}</span>
                </div>
                <div className="text-slate-700 dark:text-slate-300">
                  • วันครบกำหนดครั้งถัดไปจะคำนวณเป็น: <span className="font-bold text-amber-700 dark:text-amber-300">{formatThaiDate(calculateDueDate(replacementDate, replacingPart.intervalValue, replacingPart.intervalUnit))}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReplacingPart(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-fg rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                id="btn-confirm-replace-part"
                type="button"
                onClick={handleConfirmReplacement}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>ยืนยันเปลี่ยนอะไหล่รอบนี้</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. EXCEL IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/75 p-4 backdrop-blur-sm" id="modal-import-timebreak-excel">
          <div className="bg-surface dark:bg-slate-900 border border-border dark:border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-border dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-fg flex items-center gap-2">
                    นำเข้าข้อมูลอะไหล่ Time-Break จาก Excel
                  </h3>
                  <p className="text-xs text-fg-muted dark:text-slate-400">
                    รองรับไฟล์นามสกุล .xlsx, .xls, .csv พร้อมระบบจับคู่คอลัมน์อัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportParsedParts([]);
                  setImportError(null);
                  setImportFileName('');
                }}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-fg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              
              {/* Step 1: Download Template */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-border dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-fg dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>ยังไม่มีไฟล์ตามรูปแบบใช่ไหม?</span>
                  </div>
                  <p className="text-fg-muted dark:text-slate-400 text-[11px] mt-0.5">
                    ดาวน์โหลดเทมเพลต Excel ตัวอย่างที่มีหัวตารางและตัวอย่างข้อมูลพร้อมใช้
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-download-import-template"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-fg border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>ดาวน์โหลดไฟล์ตัวอย่าง (.xlsx)</span>
                </button>
              </div>

              {/* Step 2: File Upload Box */}
              <div>
                <label className="block text-xs font-semibold text-fg dark:text-slate-300 mb-2">
                  เลือกหรือลากวางไฟล์ Excel ที่นี่:
                </label>
                <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl p-6 text-center transition-all bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100/50 dark:hover:bg-slate-950/70">
                  <input
                    type="file"
                    id="input-file-excel-timebreak"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <FileUp className="w-6 h-6" />
                    </div>
                    {importFileName ? (
                      <div>
                        <p className="font-bold text-fg text-sm">{importFileName}</p>
                        <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-0.5 font-medium">
                          ✓ อ่านข้อมูลเรียบร้อย พบ {importParsedParts.length} รายการ
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
                        </p>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          รองรับ .xlsx, .xls, .csv
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {importError && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Step 3: Preview Data & Import Mode */}
              {importParsedParts.length > 0 && (
                <div className="space-y-4">
                  {/* Mode Selector */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl space-y-2">
                    <span className="font-semibold text-fg dark:text-slate-200 block">รูปแบบการนำเข้า:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                        importMode === 'append'
                          ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-500/50 text-fg'
                          : 'bg-surface dark:bg-slate-900 border-border dark:border-slate-800 text-fg-muted dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="mt-0.5 text-cyan-600"
                        />
                        <div>
                          <span className="font-bold text-cyan-800 dark:text-cyan-300 block">เพิ่มต่อท้าย (Append)</span>
                          <span className="text-[11px] text-fg-muted dark:text-slate-400">เก็บรายการอะไหล่เดิมไว้ทั้งหมด และเพิ่มรายการใหม่จากไฟล์นี้เข้าไป</span>
                        </div>
                      </label>

                      <label className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                        importMode === 'replace'
                          ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-500/50 text-fg'
                          : 'bg-surface dark:bg-slate-900 border-border dark:border-slate-800 text-fg-muted dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="mt-0.5 text-red-600"
                        />
                        <div>
                          <span className="font-bold text-red-700 dark:text-red-300 block">แทนที่ทั้งหมด (Replace All)</span>
                          <span className="text-[11px] text-fg-muted dark:text-slate-400">ล้างรายการ Time-Break เดิมและใช้รายการใหม่จากไฟล์นี้ทั้งหมด</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-border dark:border-slate-800 rounded-xl overflow-hidden bg-surface dark:bg-slate-950/60">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-border dark:border-slate-800 flex items-center justify-between">
                      <span className="font-semibold text-fg dark:text-slate-300">
                        ตัวอย่างข้อมูลที่จะนำเข้า (แสดง {Math.min(5, importParsedParts.length)} จาก {importParsedParts.length} รายการ):
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                        พร้อมนำเข้า {importParsedParts.length} รายการ
                      </span>
                    </div>
                    <div className="overflow-x-auto max-h-48">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-900/80 text-fg-muted dark:text-slate-400 border-b border-border dark:border-slate-800">
                            <th className="py-2 px-3">เครื่อง</th>
                            <th className="py-2 px-3">ชื่ออะไหล่</th>
                            <th className="py-2 px-3">ส่วนที่เปลี่ยน</th>
                            <th className="py-2 px-3">ความถี่</th>
                            <th className="py-2 px-3">วันครบกำหนด</th>
                            <th className="py-2 px-3">ช่าง</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-slate-800/60 text-fg dark:text-slate-300">
                          {importParsedParts.slice(0, 5).map((p, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                              <td className="py-2 px-3 font-mono text-cyan-700 dark:text-cyan-300 font-bold">{p.machineId}</td>
                              <td className="py-2 px-3 font-medium text-fg">{p.partName}</td>
                              <td className="py-2 px-3 text-fg-muted dark:text-slate-400">{p.componentLocation}</td>
                              <td className="py-2 px-3">ทุก {p.intervalValue} {p.intervalUnit}</td>
                              <td className="py-2 px-3 font-mono text-amber-700 dark:text-amber-300 font-semibold">{p.nextDueDate}</td>
                              <td className="py-2 px-3 text-fg-muted dark:text-slate-400">{p.assignedTechnician || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportParsedParts([]);
                  setImportError(null);
                  setImportFileName('');
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-fg rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                id="btn-confirm-import-excel"
                disabled={importParsedParts.length === 0}
                onClick={handleConfirmImport}
                className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow ${
                  importParsedParts.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันนำเข้า ({importParsedParts.length} รายการ)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR DELETING TIME BREAK PART */}
      {partToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div id="modal-delete-tb-part-confirm" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-500">
                <Trash2 size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                ลบรายการอะไหล่ Time-Break?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                คุณต้องการลบรายการอะไหล่ Time-Break นี้ออกจากระบบใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
              </p>
            </div>
            <div className="flex gap-3 justify-end text-xs font-bold">
              <button
                type="button"
                id="btn-cancel-delete-tb-part"
                onClick={() => setPartToDelete(null)}
                className="w-1/2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl cursor-pointer transition font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="btn-confirm-delete-tb-part"
                onClick={confirmDeletePart}
                className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl cursor-pointer transition shadow-lg shadow-rose-600/20"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR COPYING PART TO SIBLINGS */}
      {partToCopy && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div id="modal-copy-tb-part-confirm" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-cyan-500/15 flex items-center justify-center text-cyan-500">
                <Copy size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                คัดลอกอะไหล่ไปยังเครื่องจักรกลุ่มเดียวกัน?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ต้องการคัดลอกอะไหล่ <span className="font-bold text-slate-900 dark:text-slate-100">"{partToCopy.part.partName}"</span> ไปยังเครื่องอีก <span className="font-bold text-cyan-600 dark:text-cyan-400">{partToCopy.siblings.length} เครื่อง</span> ({partToCopy.siblings.map(m => m.id).join(', ')}) ใช่หรือไม่?
              </p>
            </div>
            <div className="flex gap-3 justify-end text-xs font-bold">
              <button
                type="button"
                id="btn-cancel-copy-tb-part"
                onClick={() => setPartToCopy(null)}
                className="w-1/2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl cursor-pointer transition font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="btn-confirm-copy-tb-part"
                onClick={confirmCopyPartToSiblings}
                className="w-1/2 bg-cyan-600 hover:bg-cyan-500 text-white py-2.5 rounded-xl cursor-pointer transition shadow-lg shadow-cyan-600/20"
              >
                ยืนยันคัดลอก
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
