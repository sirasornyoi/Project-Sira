import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ScheduleItem, PMScheduleItem, RepairLog, ContactOtherTask, PMPlan, Machine 
} from '../types';
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, MapPin, Users, User, 
  Wrench, ClipboardList, PhoneCall, Trash2, Edit3, CheckCircle2, 
  Clock, AlertTriangle, Filter, X, Check, Building2, Car, Compass,
  ArrowRight, Search, Sparkles
} from 'lucide-react';
import { formatPmMinutes, getPlannedMinutes } from '../utils/pmTime';

const TH_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const TH_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const DESTINATION_PRESETS = [
  "ไลน์ผลิต A (ชั้น 2)",
  "ไลน์ผลิต B (ชั้น 1)",
  "ไลน์บรรจุ PACKING",
  "ห้องเย็น VACUUM",
  "ห้องเครื่อง Utility / ปั๊มลม",
  "ร้านอะไหล่ภายนอก (พระราม 2)",
  "โรงกลึง CNC ภายนอก",
  "ห้องประชุมช่าง / อาคาร 1",
  "คลังอะไหล่สำรอง"
];

export interface SchedulePageProps {
  onOpenPMChecklist?: (machineId: string, pmPlanId: string) => void;
}

export const SchedulePage: React.FC<SchedulePageProps> = ({ onOpenPMChecklist }) => {
  const { 
    schedules, setSchedules, 
    technicians, pmPlans, machines, 
    repairs, setRepairs,
    settings,
    isLoaded
  } = useApp();

  const seededMonthsRef = useRef<Set<string>>(new Set());

  // Reference today date
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth() + 1;
  const todayDateStr = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Current selected month: YYYY-MM (defaults to current month)
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${todayYear}-${String(todayMonth).padStart(2, '0')}`
  );

  // Active filter for calendar
  const [taskTypeFilter, setTaskTypeFilter] = useState<'ALL' | 'PM' | 'REPAIR' | 'OTHER'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected date modal / details
  const [activeDateStr, setActiveDateStr] = useState<string | null>(null);
  const [selectedTaskKey, setSelectedTaskKey] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState<boolean>(false);

  // Task creation/editing form modal
  const [showTaskForm, setShowTaskForm] = useState<boolean>(false);
  const [taskFormStep, setTaskFormStep] = useState<'select-type' | 'form'>('select-type');
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formTaskType, setFormTaskType] = useState<'PM' | 'Repair' | 'Other'>('PM');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Delete Confirmation modal state
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; type: 'PM' | 'Repair' | 'Other' } | null>(null);

  // Common Form states
  const [formDate, setFormDate] = useState<string>(todayDateStr);
  const [formDestination, setFormDestination] = useState<string>('');
  const [formPeopleCount, setFormPeopleCount] = useState<number>(1);
  const [formSelectedTechs, setFormSelectedTechs] = useState<string[]>([]);
  const [formCustomNames, setFormCustomNames] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'รอดำเนินการ' | 'กำลังทำ' | 'เสร็จสิ้น'>('รอดำเนินการ');
  const [formNotes, setFormNotes] = useState<string>('');

  // Specific Form states: PM
  const [formMachineId, setFormMachineId] = useState<string>('');
  const [formPmPlanId, setFormPmPlanId] = useState<string>('');
  const [formDuration, setFormDuration] = useState<number>(60);

  // Specific Form states: Repair
  const [formSymptoms, setFormSymptoms] = useState<string>('');
  const [formBreakdownTime, setFormBreakdownTime] = useState<string>('09:00');
  const [formRepairDoneTime, setFormRepairDoneTime] = useState<string>('11:00');

  // Specific Form states: Contact / Other
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<'งานติดต่อ' | 'งานจัดซื้อ/ซัพพลายเออร์' | 'งานโรงกลึง/ภายนอก' | 'งานประชุม/อบรม' | 'งานสนับสนุน' | 'งานอื่นๆ'>('งานติดต่อ');
  const [formStartTime, setFormStartTime] = useState<string>('09:00');
  const [formEndTime, setFormEndTime] = useState<string>('12:00');

  // Toast message
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Seed sample initial tasks for current month if none exist yet
  useEffect(() => {
    if (!isLoaded || machines.length === 0) return;
    if (seededMonthsRef.current.has(selectedMonth)) return;

    const hasAnyCurrentMonthTasks = schedules.some(s => s.date.startsWith(selectedMonth)) || 
                                   repairs.some(r => r.date.startsWith(selectedMonth));
    
    if (!hasAnyCurrentMonthTasks) {
      seededMonthsRef.current.add(selectedMonth);
      const [y, m] = selectedMonth.split('-');
      const sample1Date = `${y}-${m}-09`;
      const sample2Date = `${y}-${m}-10`;
      const sample3Date = `${y}-${m}-15`;
      const sample4Date = `${y}-${m}-18`;

      const initialPMs: PMScheduleItem[] = [
        {
          id: `pm-seed-${selectedMonth}-01`,
          type: 'PM',
          technician: technicians[0] || 'ช่าง 1',
          technicians: [technicians[0] || 'ช่าง 1', technicians[1] || 'ช่าง 2'],
          date: sample1Date,
          machineId: machines[0]?.id || 'RIM01',
          pmPlanId: pmPlans[0]?.id || 'plan-pm-01',
          status: 'กำลังทำ',
          duration: 45,
          destination: 'ไลน์ผสมข้าว A (ชั้น 2)',
          peopleCount: 2
        },
        {
          id: `pm-seed-${selectedMonth}-02`,
          type: 'PM',
          technician: technicians[2] || 'ช่าง 3',
          technicians: [technicians[2] || 'ช่าง 3'],
          date: sample2Date,
          machineId: machines[3]?.id || 'TOC02',
          pmPlanId: pmPlans[1]?.id || 'plan-pm-02',
          status: 'รอดำเนินการ',
          duration: 60,
          destination: 'ไลน์ลำเลียง TOC หน้างาน',
          peopleCount: 1
        },
        {
          id: `pm-seed-${selectedMonth}-03`,
          type: 'PM',
          technician: technicians[4] || 'ช่าง 5',
          technicians: [technicians[4] || 'ช่าง 5', technicians[5] || 'ช่าง 6'],
          date: sample4Date,
          machineId: machines[8]?.id || 'VAC05',
          pmPlanId: pmPlans[2]?.id || 'plan-pm-03',
          status: 'รอดำเนินการ',
          duration: 90,
          destination: 'ห้องเย็น VACUUM อาคาร B',
          peopleCount: 2
        }
      ];

      const initialOtherTasks: ContactOtherTask[] = [
        {
          id: `other-seed-${selectedMonth}-01`,
          type: 'Other',
          title: 'ไปติดต่อร้านอะไหล่ด่วน รับสายพานไทม์มิ่งและลูกปืนสแตนเลส',
          category: 'งานติดต่อ',
          date: sample1Date,
          destination: 'ร้านเจริญอะไหล่ยนต์ (พระราม 2)',
          peopleCount: 2,
          technicians: [technicians[6] || 'ช่าง 7', technicians[7] || 'ช่าง 8'],
          technicianNamesText: 'ช่าง 7, ช่าง 8',
          startTime: '09:30',
          endTime: '12:30',
          duration: 180,
          status: 'รอดำเนินการ',
          notes: 'นำใบขอซื้อและตัวอย่างสายพานเดิมไปเทียบขนาดจริง'
        },
        {
          id: `other-seed-${selectedMonth}-02`,
          type: 'Other',
          title: 'นำแกนเพลาและลูกรีดไปส่งโรงกลึง CNC เพื่อกลึงพ่นพอก Hard Chrome',
          category: 'งานโรงกลึง/ภายนอก',
          date: sample2Date,
          destination: 'โรงกลึง CNC มีนบุรี',
          peopleCount: 2,
          technicians: [technicians[8] || 'ช่าง 9', technicians[9] || 'ช่าง 10'],
          technicianNamesText: 'ช่าง 9, ช่าง 10',
          startTime: '13:00',
          endTime: '16:30',
          duration: 210,
          status: 'รอดำเนินการ',
          notes: 'ตรวจรับใบส่งของและกำหนดวันส่งมอบกลับภายใน 3 วัน'
        },
        {
          id: `other-seed-${selectedMonth}-03`,
          type: 'Other',
          title: 'เข้าร่วมประชุมความปลอดภัยและซักซ้อมมาตรการ LOTO ร่วมกับฝ่ายผลิต',
          category: 'งานประชุม/อบรม',
          date: sample3Date,
          destination: 'ห้องประชุมช่าง / อาคาร 1',
          peopleCount: 4,
          technicians: [technicians[0] || 'ช่าง 1', technicians[1] || 'ช่าง 2', technicians[2] || 'ช่าง 3', technicians[3] || 'ช่าง 4'],
          technicianNamesText: 'ทีมช่าง กะเช้า 4 คน',
          startTime: '10:00',
          endTime: '11:30',
          duration: 90,
          status: 'รอดำเนินการ',
          notes: 'เตรียมเอกสารคู่มือความปลอดภัยก่อนเริ่มกะ'
        }
      ];

      const initialRepairs: RepairLog[] = [
        {
          id: `rep-seed-${selectedMonth}-01`,
          type: 'Repair',
          technician: technicians[3] || 'ช่าง 4',
          technicians: [technicians[3] || 'ช่าง 4', technicians[4] || 'ช่าง 5'],
          date: sample1Date,
          machineId: machines[4]?.id || 'VAC01',
          breakdownTime: `${sample1Date}T13:30`,
          repairDoneTime: `${sample1Date}T15:00`,
          symptoms: 'ปั๊มสุญญากาศทำแรงดันช้าผิดปกติ โซลินอยด์วาล์วไม่เปิด',
          why1: 'วาล์วลมค้าง',
          why2: 'มีคราบฝุ่นเกาะ',
          why3: 'ซีลยางเสื่อมสภาพ',
          why4: 'ใช้งานเกินอายุ',
          why5: 'ยังไม่ถึงรอบเปลี่ยนตามแผน',
          correctiveAction: 'ล้างทำความสะอาดโซลินอยด์วาล์วและเปลี่ยนซีลยางใหม่',
          destination: 'หน้างานห้องเย็น VACUUM อาคาร B',
          peopleCount: 2,
          duration: 90,
          status: 'กำลังซ่อม'
        }
      ];

      setSchedules(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const toAdd = [...initialPMs, ...initialOtherTasks].filter(t => !existingIds.has(t.id));
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
      });
      setRepairs(prev => {
        const existingIds = new Set(prev.map(r => r.id));
        const toAdd = initialRepairs.filter(r => !existingIds.has(r.id));
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
      });
    }
  }, [selectedMonth, machines, isLoaded, schedules, repairs]);

  // Calendar calculations
  const [currentYearStr, currentMonthStr] = selectedMonth.split('-');
  const calYear = parseInt(currentYearStr, 10);
  const calMonth = parseInt(currentMonthStr, 10);

  // Month days count and first day of week
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth - 1, 1).getDay(); // 0 = Sun, 1 = Mon ...

  // Month Navigation
  const goToPrevMonth = () => {
    let newYear = calYear;
    let newMonth = calMonth - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const goToNextMonth = () => {
    let newYear = calYear;
    let newMonth = calMonth + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(`${todayYear}-${String(todayMonth).padStart(2, '0')}`);
    setActiveDateStr(todayDateStr);
  };

  // Helper to extract tasks for a given date
  const getTasksForDate = (dateStr: string) => {
    // 1. PM Tasks
    const pmList = schedules.filter(s => s.type === 'PM' && s.date === dateStr) as PMScheduleItem[];

    // 2. Repair Tasks
    const repairList = repairs.filter(r => r.date === dateStr);

    // 3. Contact / Other Tasks
    const otherList = schedules.filter(s => (s.type === 'Other' || s.type === 'Contact' || s.type === 'Operation') && s.date === dateStr) as ContactOtherTask[];

    // Calculate total people involved
    let peopleSet = new Set<string>();
    let totalAssignedPeople = 0;

    pmList.forEach(pm => {
      const count = pm.peopleCount || (pm.technicians?.length || 1);
      totalAssignedPeople += count;
      if (pm.technicians) pm.technicians.forEach(t => peopleSet.add(t));
      else if (pm.technician) peopleSet.add(pm.technician);
    });

    repairList.forEach(rep => {
      const count = rep.peopleCount || (rep.technicians?.length || 1);
      totalAssignedPeople += count;
      if (rep.technicians) rep.technicians.forEach(t => peopleSet.add(t));
      else if (rep.technician) peopleSet.add(rep.technician);
    });

    otherList.forEach(oth => {
      const count = oth.peopleCount || (oth.technicians?.length || 1);
      totalAssignedPeople += count;
      if (oth.technicians) oth.technicians.forEach(t => peopleSet.add(t));
    });

    return {
      pmList,
      repairList,
      otherList,
      totalTasksCount: pmList.length + repairList.length + otherList.length,
      totalAssignedPeople,
      uniqueTechniciansCount: peopleSet.size
    };
  };

  // Helper to extract visible tasks for a given date based on taskTypeFilter
  const getVisibleTasksForDate = (dateStr: string) => {
    const raw = getTasksForDate(dateStr);
    const pmList = (taskTypeFilter === 'ALL' || taskTypeFilter === 'PM') ? raw.pmList : [];
    const repairList = (taskTypeFilter === 'ALL' || taskTypeFilter === 'REPAIR') ? raw.repairList : [];
    const otherList = (taskTypeFilter === 'ALL' || taskTypeFilter === 'OTHER') ? raw.otherList : [];

    let peopleSet = new Set<string>();
    let totalAssignedPeople = 0;

    pmList.forEach(pm => {
      const count = pm.peopleCount || (pm.technicians?.length || 1);
      totalAssignedPeople += count;
      if (pm.technicians) pm.technicians.forEach(t => peopleSet.add(t));
      else if (pm.technician) peopleSet.add(pm.technician);
    });

    repairList.forEach(rep => {
      const count = rep.peopleCount || (rep.technicians?.length || 1);
      totalAssignedPeople += count;
      if (rep.technicians) rep.technicians.forEach(t => peopleSet.add(t));
      else if (rep.technician) peopleSet.add(rep.technician);
    });

    otherList.forEach(oth => {
      const count = oth.peopleCount || (oth.technicians?.length || 1);
      totalAssignedPeople += count;
      if (oth.technicians) oth.technicians.forEach(t => peopleSet.add(t));
    });

    return {
      pmList,
      repairList,
      otherList,
      totalTasksCount: pmList.length + repairList.length + otherList.length,
      totalAssignedPeople,
      uniqueTechniciansCount: peopleSet.size
    };
  };

  // Monthly summary stats
  const monthlyStats = useMemo(() => {
    let totalPM = 0;
    let totalRepair = 0;
    let totalOther = 0;
    let totalPeopleDeployments = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${currentYearStr}-${currentMonthStr}-${String(d).padStart(2, '0')}`;
      const { pmList, repairList, otherList, totalAssignedPeople } = getTasksForDate(dStr);
      totalPM += pmList.length;
      totalRepair += repairList.length;
      totalOther += otherList.length;
      totalPeopleDeployments += totalAssignedPeople;
    }

    return { totalPM, totalRepair, totalOther, totalPeopleDeployments };
  }, [selectedMonth, schedules, repairs, daysInMonth]);

  // Open task creator modal for specific date
  const handleOpenCreateForm = (dateStr: string, defaultType: 'PM' | 'Repair' | 'Other' = 'PM') => {
    setFormMode('create');
    setTaskFormStep('select-type');
    setEditingTaskId(null);
    setFormDate(dateStr);
    setFormTaskType(defaultType);
    setFormDestination('');
    setFormPeopleCount(1);
    setFormSelectedTechs([technicians[0] || 'ช่าง 1']);
    setFormCustomNames('');
    setFormStatus('รอดำเนินการ');
    setFormNotes('');
    
    // Type specific resets
    setFormMachineId(machines[0]?.id || 'RIM01');
    setFormPmPlanId(pmPlans[0]?.id || '');
    setFormDuration(0);
    setFormSymptoms('');
    setFormBreakdownTime('09:00');
    setFormRepairDoneTime('11:00');
    setFormTitle('');
    setFormCategory('งานติดต่อ');
    setFormStartTime('09:00');
    setFormEndTime('12:00');

    setShowTaskForm(true);
  };

  // Open edit modal for existing task
  const handleOpenEditForm = (task: any, type: 'PM' | 'Repair' | 'Other') => {
    setFormMode('edit');
    setTaskFormStep('form');
    setEditingTaskId(task.id);
    setFormDate(task.date);
    setFormTaskType(type);
    setFormDestination(task.destination || '');
    setFormPeopleCount(task.peopleCount || task.technicians?.length || 1);
    setFormSelectedTechs(task.technicians || (task.technician ? [task.technician] : []));
    setFormCustomNames(task.technicianNamesText || '');
    setFormStatus(task.status || 'รอดำเนินการ');
    setFormNotes(task.notes || '');

    if (type === 'PM') {
      setFormMachineId(task.machineId || machines[0]?.id || 'RIM01');
      setFormPmPlanId(task.pmPlanId || '');
      setFormDuration(task.duration || 0);
    } else if (type === 'Repair') {
      setFormMachineId(task.machineId || machines[0]?.id || 'RIM01');
      setFormSymptoms(task.symptoms === 'ไม่ได้ระบุอาการเสีย' ? '' : (task.symptoms || ''));
      setFormBreakdownTime(task.breakdownTime ? task.breakdownTime.slice(11, 16) : '09:00');
      setFormRepairDoneTime(task.repairDoneTime ? task.repairDoneTime.slice(11, 16) : '11:00');
    } else {
      setFormTitle(task.title === task.category || task.title === 'งานติดต่อ / อื่นๆ' ? '' : (task.title || ''));
      setFormCategory(task.category || 'งานติดต่อ');
      setFormStartTime(task.startTime || '09:00');
      setFormEndTime(task.endTime || '12:00');
    }

    setShowTaskForm(true);
  };

  // Toggle technician in selection
  const handleToggleTech = (tech: string) => {
    setFormSelectedTechs(prev => {
      const exists = prev.includes(tech);
      const updated = exists ? prev.filter(t => t !== tech) : [...prev, tech];
      setFormPeopleCount(Math.max(1, updated.length));
      return updated;
    });
  };

  // Save task
  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();

    const allTechs = formSelectedTechs.length > 0 ? formSelectedTechs : [technicians[0] || 'ช่าง 1'];
    const primaryTech = allTechs[0];
    const techText = formCustomNames.trim() ? `${allTechs.join(', ')} (${formCustomNames.trim()})` : allTechs.join(', ');

    if (formTaskType === 'PM') {
      if (formMode === 'create') {
        const newPM: PMScheduleItem = {
          id: `pm-${Date.now()}`,
          type: 'PM',
          technician: primaryTech,
          technicians: allTechs,
          date: formDate,
          machineId: formMachineId,
          pmPlanId: formPmPlanId || pmPlans.find(p => p.machineId === formMachineId)?.id || 'plan-pm-01',
          status: formStatus,
          duration: Number(formDuration) || 0,
          destination: formDestination.trim(),
          peopleCount: Number(formPeopleCount) || allTechs.length
        };
        setSchedules(prev => [...prev, newPM]);
        setToast({ text: `เพิ่มงาน PM สำหรับ ${formMachineId} เรียบร้อยแล้ว`, type: 'success' });
      } else {
        setSchedules(prev => prev.map(s => {
          if (s.id === editingTaskId) {
            return {
              ...s,
              technician: primaryTech,
              technicians: allTechs,
              date: formDate,
              machineId: formMachineId,
              pmPlanId: formPmPlanId || (s as PMScheduleItem).pmPlanId,
              status: formStatus,
              duration: Number(formDuration) || 0,
              destination: formDestination.trim(),
              peopleCount: Number(formPeopleCount) || allTechs.length
            };
          }
          return s;
        }));
        setToast({ text: `อัปเดตข้อมูลงาน PM เรียบร้อยแล้ว`, type: 'success' });
      }
    } else if (formTaskType === 'Repair') {
      if (formMode === 'create') {
        const newRepair: RepairLog = {
          id: `rep-${Date.now()}`,
          type: 'Repair',
          technician: primaryTech,
          technicians: allTechs,
          date: formDate,
          machineId: formMachineId,
          breakdownTime: `${formDate}T${formBreakdownTime}`,
          repairDoneTime: `${formDate}T${formRepairDoneTime}`,
          symptoms: formSymptoms.trim() || 'ไม่ได้ระบุอาการเสีย',
          why1: 'อยู่ระหว่างตรวจสอบ',
          why2: '',
          why3: '',
          why4: '',
          why5: '',
          correctiveAction: 'กำลังดำเนินการตรวจสอบและซ่อมบำรุง',
          destination: formDestination.trim(),
          peopleCount: Number(formPeopleCount) || allTechs.length,
          duration: 60,
          status: (formStatus === 'เสร็จสิ้น' ? 'ปิดงาน' : 'กำลังซ่อม')
        };
        setRepairs(prev => [...prev, newRepair]);
        setToast({ text: `บันทึกงานซ่อมเครื่อง ${formMachineId} เรียบร้อยแล้ว`, type: 'success' });
      } else {
        setRepairs(prev => prev.map(r => {
          if (r.id === editingTaskId) {
            return {
              ...r,
              technician: primaryTech,
              technicians: allTechs,
              date: formDate,
              machineId: formMachineId,
              breakdownTime: `${formDate}T${formBreakdownTime}`,
              repairDoneTime: `${formDate}T${formRepairDoneTime}`,
              symptoms: formSymptoms.trim() || 'ไม่ได้ระบุอาการเสีย',
              destination: formDestination.trim(),
              peopleCount: Number(formPeopleCount) || allTechs.length,
              status: (formStatus === 'เสร็จสิ้น' ? 'ปิดงาน' : 'กำลังซ่อม')
            };
          }
          return r;
        }));
        setToast({ text: `อัปเดตงานซ่อมเรียบร้อยแล้ว`, type: 'success' });
      }
    } else {
      // Contact / Other
      const taskTitle = formTitle.trim() || formCategory || 'งานติดต่อ / อื่นๆ';

      if (formMode === 'create') {
        const newOther: ContactOtherTask = {
          id: `oth-${Date.now()}`,
          type: 'Other',
          title: taskTitle,
          category: formCategory,
          date: formDate,
          destination: formDestination.trim(),
          peopleCount: Number(formPeopleCount) || allTechs.length,
          technicians: allTechs,
          technicianNamesText: techText,
          startTime: formStartTime,
          endTime: formEndTime,
          duration: 120,
          status: formStatus,
          notes: formNotes.trim()
        };
        setSchedules(prev => [...prev, newOther]);
        setToast({ text: `บันทึกงาน "${taskTitle}" เรียบร้อยแล้ว`, type: 'success' });
      } else {
        setSchedules(prev => prev.map(s => {
          if (s.id === editingTaskId) {
            return {
              ...s,
              title: taskTitle,
              category: formCategory,
              date: formDate,
              destination: formDestination.trim(),
              peopleCount: Number(formPeopleCount) || allTechs.length,
              technicians: allTechs,
              technicianNamesText: techText,
              startTime: formStartTime,
              endTime: formEndTime,
              status: formStatus,
              notes: formNotes.trim()
            };
          }
          return s;
        }));
        setToast({ text: `อัปเดตงาน "${taskTitle}" เรียบร้อยแล้ว`, type: 'success' });
      }
    }

    setShowTaskForm(false);
  };

  // Delete task trigger (in-app modal confirmation)
  const handleDeleteTask = (taskId: string, type: 'PM' | 'Repair' | 'Other') => {
    setTaskToDelete({ id: taskId, type });
  };

  const confirmDeleteTask = () => {
    if (!taskToDelete) return;
    const { id: taskId, type } = taskToDelete;
    if (type === 'Repair') {
      setRepairs(prev => prev.filter(r => r.id !== taskId));
    } else {
      setSchedules(prev => prev.filter(s => s.id !== taskId));
    }
    setToast({ text: 'ลบรายการงานเรียบร้อยแล้ว', type: 'info' });
    setTaskToDelete(null);
  };

  // Quick toggle status for task
  const handleToggleTaskStatus = (taskId: string, type: 'PM' | 'Repair' | 'Other', currentStatus: string) => {
    let nextStatus: 'รอดำเนินการ' | 'กำลังทำ' | 'เสร็จสิ้น' = 'รอดำเนินการ';
    if (currentStatus === 'รอดำเนินการ') nextStatus = 'กำลังทำ';
    else if (currentStatus === 'กำลังทำ') nextStatus = 'เสร็จสิ้น';
    else nextStatus = 'รอดำเนินการ';

    if (type === 'Repair') {
      const repNext = nextStatus === 'เสร็จสิ้น' ? 'ปิดงาน' : 'กำลังซ่อม';
      setRepairs(prev => prev.map(r => r.id === taskId ? { ...r, status: repNext } : r));
    } else {
      setSchedules(prev => prev.map(s => s.id === taskId ? { ...s, status: nextStatus } : s));
    }
    setToast({ text: `ปรับสถานะเป็น "${nextStatus}" เรียบร้อยแล้ว`, type: 'info' });
  };

  // Active Date Details
  const rawDateTasks = activeDateStr ? getTasksForDate(activeDateStr) : null;
  const visibleDateTasks = activeDateStr ? getVisibleTasksForDate(activeDateStr) : null;

  const allVisibleTaskItems = useMemo(() => {
    if (!visibleDateTasks) return [];
    const items: Array<
      | { key: string; type: 'PM'; data: PMScheduleItem }
      | { key: string; type: 'Repair'; data: RepairLog }
      | { key: string; type: 'Other'; data: ContactOtherTask }
    > = [];
    visibleDateTasks.pmList.forEach(pm => items.push({ key: `PM:${pm.id}`, type: 'PM', data: pm }));
    visibleDateTasks.repairList.forEach(rep => items.push({ key: `Repair:${rep.id}`, type: 'Repair', data: rep }));
    visibleDateTasks.otherList.forEach(oth => items.push({ key: `Other:${oth.id}`, type: 'Other', data: oth }));
    return items;
  }, [visibleDateTasks]);

  useEffect(() => {
    if (!activeDateStr) {
      setSelectedTaskKey(null);
      setMobileShowDetail(false);
      return;
    }
    if (allVisibleTaskItems.length === 0) {
      setSelectedTaskKey(null);
      return;
    }
    const exists = allVisibleTaskItems.some(item => item.key === selectedTaskKey);
    if (!exists) {
      setSelectedTaskKey(allVisibleTaskItems[0].key);
    }
  }, [activeDateStr, taskTypeFilter, allVisibleTaskItems, selectedTaskKey]);

  // Helper to render detail field sections
  const renderDetailSection = (
    title: string,
    icon: React.ReactNode,
    fields: Array<{ label: string; value?: string | number | null }>
  ) => {
    const validFields = fields.filter(
      f => f.value !== undefined && f.value !== null && String(f.value).trim() !== '' && String(f.value).trim() !== '-'
    );
    if (validFields.length === 0) return null;

    return (
      <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800 space-y-2">
        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b border-slate-200/80 dark:border-slate-800/80 pb-1.5">
          {icon}
          <span>{title}</span>
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          {validFields.map((f, fIdx) => (
            <div key={fIdx} className="min-w-0">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{f.label}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 break-words">{f.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" id="schedule-page-root">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 bg-slate-800 border py-3 px-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom duration-200 ${
          toast.type === 'success' ? 'border-emerald-500/50 text-emerald-300' :
          toast.type === 'error' ? 'border-rose-500/50 text-rose-300' : 'border-cyan-500/50 text-cyan-300'
        }`}>
          <span className="text-base font-bold">
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <p className="text-xs font-semibold">{toast.text}</p>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-fg text-xs ml-2">✕</button>
        </div>
      )}

      {/* Top Header & Monthly Navigation Bar */}
      <div className="bg-slate-850/80 border border-slate-750/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          
          {/* Title & Description */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                <Calendar size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2" id="page-title-schedule">
                  ตารางงาน
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  ปฏิทินตารางงานประจำเดือน ครบทุกวันในเดือน แสดงงาน PM ช่างแต่ละคน งานซ่อม และงานติดต่อ/อื่นๆ พร้อมระบุพิกัดและจำนวนกำลังคน
                </p>
              </div>
            </div>
          </div>

          {/* Month Controller & Fast Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-1 shadow-inner">
              <button
                id="btn-prev-month"
                onClick={goToPrevMonth}
                className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="px-3 py-1 text-center min-w-[170px]">
                <p className="text-sm font-bold text-cyan-300 font-sans">
                  {TH_MONTHS[calMonth - 1]} {calYear + 543}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {currentYearStr}-{currentMonthStr} ({daysInMonth} วัน)
                </p>
              </div>

              <button
                id="btn-next-month"
                onClick={goToNextMonth}
                className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition"
                title="เดือนถัดไป"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <button
              id="btn-current-month"
              onClick={goToCurrentMonth}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-500/60 text-slate-200 hover:text-cyan-300 transition flex items-center gap-1.5 shadow"
              title="กระโดดกลับมาเดือนปัจจุบันและวันนี้"
            >
              <Sparkles size={14} className="text-amber-400" />
              เดือนปัจจุบัน
            </button>

            <button
              id="btn-add-today-task"
              onClick={() => handleOpenCreateForm(todayDateStr, 'PM')}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 transition flex items-center gap-1.5 shadow-lg shadow-blue-500/20 dark:shadow-cyan-500/20 cursor-pointer"
            >
              <Plus size={15} />
              + บันทึกงานใหม่
            </button>
          </div>
        </div>

        {/* Filters & Monthly Metric Chips */}
        <div className="mt-4 pt-4 border-t border-slate-750/70 flex flex-wrap justify-between items-center gap-3">
          
          {/* Quick Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-750 text-xs">
            <span className="text-[10px] font-semibold text-slate-400 px-2 flex items-center gap-1">
              <Filter size={12} /> มุมมอง:
            </span>
            <button
              onClick={() => setTaskTypeFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                taskTypeFilter === 'ALL' ? 'bg-blue-600 text-white dark:bg-cyan-500 dark:text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ทั้งหมด ({monthlyStats.totalPM + monthlyStats.totalRepair + monthlyStats.totalOther})
            </button>
            <button
              onClick={() => setTaskTypeFilter('PM')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                taskTypeFilter === 'PM' ? 'bg-blue-500 text-fg shadow' : 'text-slate-400 hover:text-blue-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              งาน PM ({monthlyStats.totalPM})
            </button>
            <button
              onClick={() => setTaskTypeFilter('REPAIR')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                taskTypeFilter === 'REPAIR' ? 'bg-rose-500 text-fg shadow' : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              งานซ่อม ({monthlyStats.totalRepair})
            </button>
            <button
              onClick={() => setTaskTypeFilter('OTHER')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                taskTypeFilter === 'OTHER' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              งานติดต่อ / อื่นๆ ({monthlyStats.totalOther})
            </button>
          </div>

          {/* Monthly Deployment Summary Badges */}
          <div className="flex items-center gap-2 text-xs">
            <div className="bg-slate-900 border border-slate-750 px-3 py-1 rounded-xl flex items-center gap-2 text-slate-300">
              <Users size={14} className="text-cyan-400" />
              <span>ออกปฏิบัติงานสะสม: <b className="text-fg font-mono">{monthlyStats.totalPeopleDeployments} คน-ครั้ง</b></span>
            </div>
            <div className="bg-slate-900 border border-slate-750 px-3 py-1 rounded-xl flex items-center gap-2 text-slate-300">
              <Clock size={14} className="text-amber-400" />
              <span>วันนี้: <b className="text-cyan-300 font-mono">{todayDateStr}</b></span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN MONTHLY CALENDAR GRID */}
      <div className="bg-slate-850/90 border border-slate-750 rounded-2xl p-4 shadow-xl" id="monthly-calendar-container">
        
        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {TH_DAYS.map((dayName, idx) => {
            const isWeekend = idx === 0 || idx === 6;
            return (
              <div 
                key={idx} 
                className={`py-2 text-center rounded-xl text-xs font-bold border border-slate-750/50 ${
                  isWeekend 
                    ? 'bg-slate-900/90 text-amber-300/90' 
                    : 'bg-slate-900/60 text-slate-300'
                }`}
              >
                <span>{dayName}</span>
              </div>
            );
          })}
        </div>

        {/* Monthly Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {(() => {
            const cells: React.ReactNode[] = [];

            // Preceding empty cells
            for (let i = 0; i < firstDayOfWeek; i++) {
              cells.push(
                <div 
                  key={`empty-${i}`} 
                  className="min-h-[130px] rounded-xl bg-slate-950/20 border border-slate-800/30 opacity-20 pointer-events-none"
                />
              );
            }

            // Days of the month
            for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
              const dayStr = `${currentYearStr}-${currentMonthStr}-${String(dayNum).padStart(2, '0')}`;
              const isToday = dayStr === todayDateStr;
              const isSelected = activeDateStr === dayStr;
              
              const { 
                pmList: visiblePM, 
                repairList: visibleRepair, 
                otherList: visibleOther, 
                totalTasksCount: visibleTotal, 
                totalAssignedPeople: visiblePeople 
              } = getVisibleTasksForDate(dayStr);

              cells.push(
                <div
                  key={`day-${dayNum}`}
                  id={`calendar-day-${dayStr}`}
                  onClick={() => setActiveDateStr(dayStr)}
                  className={`min-h-[140px] rounded-xl p-2.5 flex flex-col justify-between transition-all duration-150 cursor-pointer relative group border ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/10'
                      : isToday
                        ? 'bg-slate-900/95 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/30'
                        : 'bg-slate-900/70 border-slate-750/70 hover:border-slate-500 hover:bg-slate-900'
                  }`}
                >
                  {/* Day Header Bar */}
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-mono font-black px-1.5 py-0.5 rounded ${
                        isToday 
                          ? 'bg-cyan-500 text-slate-950 shadow font-bold' 
                          : isSelected
                            ? 'bg-cyan-400/20 text-cyan-300 font-bold'
                            : 'text-slate-300 group-hover:text-cyan-400'
                      }`}>
                        {dayNum}
                      </span>
                      {isToday && (
                        <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">
                          วันนี้
                        </span>
                      )}
                    </div>

                    {/* Summary Indicators */}
                    {visibleTotal > 0 && (
                      <div className="flex items-center gap-1">
                        <span 
                          className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-bold"
                          title={`มีทั้งหมด ${visibleTotal} งาน (กำลังคน ${visiblePeople} คน)`}
                        >
                          {visibleTotal} งาน
                        </span>
                        {visiblePeople > 0 && (
                          <span 
                            className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-0.5"
                            title={`กำลังคนที่ออกปฏิบัติงาน: ${visiblePeople} คน`}
                          >
                            <Users size={9} />
                            {visiblePeople}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Task Chips Container */}
                  <div className="flex-1 space-y-1 overflow-y-auto max-h-[85px] scrollbar-none py-0.5">
                    {visibleTotal === 0 ? (
                      <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-80 transition text-[10px] text-slate-500 dark:text-slate-400 italic">
                        + คลิกเพื่อจัดงาน
                      </div>
                    ) : (
                      <>
                        {/* PM Tasks */}
                        {visiblePM.slice(0, 2).map((pm, idx) => {
                          const plan = pmPlans.find(p => p.id === pm.pmPlanId);
                          const people = pm.peopleCount || pm.technicians?.length || 1;
                          const techName = pm.technicians?.length ? pm.technicians[0] : pm.technician;
                          return (
                            <div
                              key={`chip-pm-${pm.id}-${idx}`}
                              className={`px-1.5 py-1 rounded-md text-[9.5px] border leading-tight truncate transition ${
                                pm.status === 'เสร็จสิ้น'
                                  ? 'bg-emerald-100 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 line-through opacity-80'
                                  : pm.status === 'กำลังทำ'
                                    ? 'bg-blue-100 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/30 text-blue-900 dark:text-blue-300 font-medium'
                                    : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-500/20 text-blue-950 dark:text-blue-200'
                              }`}
                              title={`งาน PM: ${pm.machineId} • ${plan?.title || 'บำรุงรักษา'} (${people} คน) • ไป: ${pm.destination || 'หน้างาน'}`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span className="font-mono text-cyan-700 dark:text-cyan-300 font-bold">🔹 PM: {pm.machineId}</span>
                                <span className="text-[8px] bg-slate-200 dark:bg-bg/40 px-1 rounded text-slate-700 dark:text-slate-300 font-medium">{people} คน</span>
                              </div>
                              <p className="text-[8.5px] truncate text-slate-600 dark:text-slate-300">
                                {pm.destination ? `📍 ${pm.destination}` : techName}
                              </p>
                            </div>
                          );
                        })}

                        {/* Repair Tasks */}
                        {visibleRepair.slice(0, 2).map((rep, idx) => {
                          const people = rep.peopleCount || rep.technicians?.length || 1;
                          return (
                            <div
                              key={`chip-rep-${rep.id}-${idx}`}
                              className={`px-1.5 py-1 rounded-md text-[9.5px] border leading-tight truncate transition ${
                                rep.status === 'ปิดงาน'
                                  ? 'bg-emerald-100 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 line-through opacity-80'
                                  : 'bg-rose-100 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/30 text-rose-900 dark:text-rose-300 font-bold'
                              }`}
                              title={`งานซ่อม: ${rep.machineId} • ${rep.symptoms || 'ไม่ได้ระบุอาการเสีย'} (${people} คน) • ไป: ${rep.destination || 'หน้างาน'}`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span className="font-mono text-rose-700 dark:text-rose-300">🔴 ซ่อม: {rep.machineId}</span>
                                <span className="text-[8px] bg-slate-200 dark:bg-bg/40 px-1 rounded text-slate-700 dark:text-slate-300 font-medium">{people} คน</span>
                              </div>
                              <p className="text-[8.5px] truncate text-slate-600 dark:text-slate-300">
                                {rep.destination ? `📍 ${rep.destination}` : (rep.symptoms || 'ไม่ได้ระบุอาการเสีย')}
                              </p>
                            </div>
                          );
                        })}

                        {/* Contact / Other Tasks */}
                        {visibleOther.slice(0, 2).map((oth, idx) => {
                          const people = oth.peopleCount || oth.technicians?.length || 1;
                          return (
                            <div
                              key={`chip-oth-${oth.id}-${idx}`}
                              className={`px-1.5 py-1 rounded-md text-[9.5px] border leading-tight truncate transition ${
                                oth.status === 'เสร็จสิ้น'
                                  ? 'bg-emerald-100 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 line-through opacity-80'
                                  : 'bg-emerald-100 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-300 font-medium'
                              }`}
                              title={`งานติดต่อ/อื่นๆ: ${oth.title} (${people} คน) • ปลายทาง: ${oth.destination}`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span className="text-emerald-800 dark:text-emerald-300 truncate max-w-[80%] font-semibold">🟢 {oth.title}</span>
                                <span className="text-[8px] bg-slate-200 dark:bg-bg/40 px-1 rounded text-slate-700 dark:text-slate-300 font-medium">{people} คน</span>
                              </div>
                              <p className="text-[8.5px] truncate text-slate-600 dark:text-slate-300">
                                {oth.destination ? `📍 ${oth.destination}` : `${people} คน`}
                              </p>
                            </div>
                          );
                        })}

                        {/* More tag */}
                        {visibleTotal > 3 && (
                          <div className="text-[8.5px] text-center font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 py-0.5 rounded border border-cyan-200 dark:border-cyan-500/20">
                            +{visibleTotal - 3} งานเพิ่มเติม (คลิกดู)
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Bottom Hover Hint */}
                  <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[8px] text-slate-500 dark:text-slate-400">
                    <span className="opacity-0 group-hover:opacity-100 transition text-cyan-400 font-semibold">
                      คลิกดู / จัดงาน
                    </span>
                    <span className="text-[8px] opacity-40 group-hover:opacity-80">
                      +
                    </span>
                  </div>
                </div>
              );
            }

            return cells;
          })()}
        </div>
      </div>

      {/* 3. DATE DETAILS MODAL / DRAWER (เมื่อคลิกที่วันที่) */}
      {activeDateStr && rawDateTasks && visibleDateTasks && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 overflow-hidden animate-in fade-in duration-150"
          id="active-date-modal-overlay"
          onClick={() => setActiveDateStr(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl max-w-5xl w-full h-[90vh] max-h-[850px] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100"
            id="active-date-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-slate-50 dark:bg-gradient-to-r dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-750 p-4 sm:p-5 shrink-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  {(() => {
                    const [y, m, d] = activeDateStr.split('-');
                    const dObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                    const dayName = TH_DAYS[dObj.getDay()];
                    const monthName = TH_MONTHS[parseInt(m) - 1];
                    const yearTh = parseInt(y) + 543;
                    return (
                      <>
                        <div className="flex items-center gap-2">
                          <Calendar size={18} className="text-blue-600 dark:text-cyan-400" />
                          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                            ตารางงานประจำ{dayName}ที่ {parseInt(d)} {monthName} {yearTh}
                          </h2>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-mono">
                          {activeDateStr} • มีทั้งหมด <b className="text-blue-700 dark:text-cyan-400">{visibleDateTasks.totalTasksCount} งาน</b> (รวม <b className="text-slate-900 dark:text-fg">{visibleDateTasks.totalAssignedPeople} คน</b>)
                        </p>
                      </>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    id="btn-add-task-on-date"
                    type="button"
                    onClick={() => {
                      const defaultType: 'PM' | 'Repair' | 'Other' = 
                        taskTypeFilter === 'REPAIR' ? 'Repair' :
                        taskTypeFilter === 'OTHER' ? 'Other' : 'PM';
                      handleOpenCreateForm(activeDateStr, defaultType);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                    + เพิ่มงานในวันนี้
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDateStr(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                    title="ปิด (Close)"
                    aria-label="ปิด"
                  >
                    <X size={20} className="stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* View filter chips inside modal header (synced with taskTypeFilter) */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
                  <Filter size={11} /> มุมมอง:
                </span>
                <button
                  type="button"
                  onClick={() => setTaskTypeFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    taskTypeFilter === 'ALL'
                      ? 'bg-blue-600 dark:bg-cyan-500 text-white dark:text-slate-950 shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  ทั้งหมด ({rawDateTasks.totalTasksCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskTypeFilter('PM')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    taskTypeFilter === 'PM'
                      ? 'bg-blue-500 text-white shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  งาน PM ({rawDateTasks.pmList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskTypeFilter('REPAIR')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    taskTypeFilter === 'REPAIR'
                      ? 'bg-rose-500 text-white shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  งานซ่อม ({rawDateTasks.repairList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskTypeFilter('OTHER')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    taskTypeFilter === 'OTHER'
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  งานติดต่อ / อื่นๆ ({rawDateTasks.otherList.length})
                </button>
              </div>
            </div>

            {/* Modal Body: Split 2 panes (Left ~40%, Right ~60%) on md+, toggleable on mobile */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-slate-900">
              
              {/* LEFT PANE (~40%): Minimal task list */}
              <div 
                className={`${mobileShowDetail ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-5/12 lg:w-[380px] shrink-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 overflow-y-auto`}
                id="modal-tasks-left-pane"
              >
                {allVisibleTaskItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    ไม่มีรายการงานที่ตรงกับมุมมองในวันนี้
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                    
                    {/* Category: PM */}
                    {(taskTypeFilter === 'ALL' || taskTypeFilter === 'PM') && (
                      <div id="left-group-pm">
                        <div className="flex justify-between items-center px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              งาน PM ({visibleDateTasks.pmList.length})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenCreateForm(activeDateStr, 'PM')}
                            className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                          >
                            + เพิ่ม
                          </button>
                        </div>

                        {visibleDateTasks.pmList.length === 0 ? (
                          <div className="px-4 py-3 text-center text-[11px] text-slate-400 italic">
                            ไม่มีงาน PM ในวันนี้
                          </div>
                        ) : (
                          visibleDateTasks.pmList.map(pm => {
                            const mach = machines.find(m => m.id === pm.machineId);
                            const plan = pmPlans.find(p => p.id === pm.pmPlanId);
                            const isSelected = selectedTaskKey === `PM:${pm.id}`;
                            const loc = pm.destination || (pm.machineId ? `แท่นเครื่อง ${pm.machineId}` : 'ไม่ได้ระบุ');
                            const statusDot = pm.status === 'เสร็จสิ้น' ? 'bg-emerald-500' : pm.status === 'กำลังทำ' ? 'bg-amber-500' : 'bg-slate-400';

                            return (
                              <div
                                key={`row-pm-${pm.id}`}
                                onClick={() => {
                                  setSelectedTaskKey(`PM:${pm.id}`);
                                  setMobileShowDetail(true);
                                }}
                                className={`px-4 py-2.5 cursor-pointer border-b border-slate-100 dark:border-slate-800/60 transition-colors select-none ${
                                  isSelected
                                    ? 'border-l-4 border-l-blue-600 dark:border-l-cyan-500 bg-blue-100/70 dark:bg-cyan-950/40 text-slate-900 dark:text-slate-100'
                                    : 'border-l-4 border-l-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
                                  <span className="text-xs font-bold truncate">
                                    {pm.machineId} {mach?.name || 'เครื่องจักร'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate pl-4 mt-0.5">
                                  {plan?.title || 'แผน PM'} · 📍{loc}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Category: Repair */}
                    {(taskTypeFilter === 'ALL' || taskTypeFilter === 'REPAIR') && (
                      <div id="left-group-repair">
                        <div className="flex justify-between items-center px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              งานซ่อม ({visibleDateTasks.repairList.length})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenCreateForm(activeDateStr, 'Repair')}
                            className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
                          >
                            + เพิ่ม
                          </button>
                        </div>

                        {visibleDateTasks.repairList.length === 0 ? (
                          <div className="px-4 py-3 text-center text-[11px] text-slate-400 italic">
                            ไม่มีงานซ่อมในวันนี้
                          </div>
                        ) : (
                          visibleDateTasks.repairList.map(rep => {
                            const mach = machines.find(m => m.id === rep.machineId);
                            const isSelected = selectedTaskKey === `Repair:${rep.id}`;
                            const loc = rep.destination || (rep.machineId ? `แท่นเครื่อง ${rep.machineId}` : 'ไม่ได้ระบุ');
                            const statusDot = rep.status === 'ปิดงาน' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse';

                            return (
                              <div
                                key={`row-rep-${rep.id}`}
                                onClick={() => {
                                  setSelectedTaskKey(`Repair:${rep.id}`);
                                  setMobileShowDetail(true);
                                }}
                                className={`px-4 py-2.5 cursor-pointer border-b border-slate-100 dark:border-slate-800/60 transition-colors select-none ${
                                  isSelected
                                    ? 'border-l-4 border-l-rose-500 bg-rose-100/70 dark:bg-rose-950/40 text-slate-900 dark:text-slate-100'
                                    : 'border-l-4 border-l-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
                                  <span className="text-xs font-bold truncate">
                                    {rep.machineId} {mach?.name || 'เครื่องจักร'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate pl-4 mt-0.5">
                                  {rep.symptoms || 'ไม่ได้ระบุอาการเสีย'} · 📍{loc}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Category: Other */}
                    {(taskTypeFilter === 'ALL' || taskTypeFilter === 'OTHER') && (
                      <div id="left-group-other">
                        <div className="flex justify-between items-center px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              งานติดต่อ / อื่นๆ ({visibleDateTasks.otherList.length})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenCreateForm(activeDateStr, 'Other')}
                            className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                          >
                            + เพิ่ม
                          </button>
                        </div>

                        {visibleDateTasks.otherList.length === 0 ? (
                          <div className="px-4 py-3 text-center text-[11px] text-slate-400 italic">
                            ไม่มีงานติดต่อ / อื่นๆ ในวันนี้
                          </div>
                        ) : (
                          visibleDateTasks.otherList.map(oth => {
                            const isSelected = selectedTaskKey === `Other:${oth.id}`;
                            const loc = oth.destination || 'ไม่ได้ระบุ';
                            const statusDot = oth.status === 'เสร็จสิ้น' ? 'bg-emerald-500' : oth.status === 'กำลังทำ' ? 'bg-amber-500' : 'bg-slate-400';

                            return (
                              <div
                                key={`row-oth-${oth.id}`}
                                onClick={() => {
                                  setSelectedTaskKey(`Other:${oth.id}`);
                                  setMobileShowDetail(true);
                                }}
                                className={`px-4 py-2.5 cursor-pointer border-b border-slate-100 dark:border-slate-800/60 transition-colors select-none ${
                                  isSelected
                                    ? 'border-l-4 border-l-emerald-500 bg-emerald-100/70 dark:bg-emerald-950/40 text-slate-900 dark:text-slate-100'
                                    : 'border-l-4 border-l-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
                                  <span className="text-xs font-bold truncate">
                                    {oth.title}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate pl-4 mt-0.5">
                                  {oth.category || 'งานติดต่อ'} · 📍{loc}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* RIGHT PANE (~60%): Full task details */}
              <div 
                className={`${mobileShowDetail ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-w-0 bg-white dark:bg-slate-900 overflow-y-auto p-5 sm:p-6`}
                id="modal-tasks-right-pane"
              >
                {/* Mobile back button */}
                <div className="md:hidden pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setMobileShowDetail(false)}
                    className="flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    ← กลับรายการ
                  </button>
                </div>

                {(() => {
                  const selectedItem = allVisibleTaskItems.find(item => item.key === selectedTaskKey);
                  if (!selectedItem) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500">
                        <ClipboardList size={40} className="mb-2.5 opacity-30" />
                        <p className="text-xs">เลือกรหัสงานทางด้านซ้ายเพื่อดูรายละเอียด</p>
                      </div>
                    );
                  }

                  // Render detail according to item type
                  if (selectedItem.type === 'PM') {
                    const pm = selectedItem.data as PMScheduleItem;
                    const mach = machines.find(m => m.id === pm.machineId);
                    const plan = pmPlans.find(p => p.id === pm.pmPlanId);
                    const people = pm.peopleCount || (pm.technicians?.length || 1);
                    const allTechs = pm.technicians && pm.technicians.length > 0 ? pm.technicians : (pm.technician ? [pm.technician] : []);
                    const loc = pm.destination || (pm.machineId ? `แท่นเครื่อง ${pm.machineId}` : 'ไม่ได้ระบุ');

                    const taskInfoFields = [
                      { label: 'รหัสเครื่องจักร', value: pm.machineId ? `${pm.machineId}${mach?.name ? ` (${mach.name})` : ''}` : undefined },
                      { label: 'ชื่อแผน PM', value: plan?.title || pm.title },
                      { label: 'ความถี่', value: plan?.frequency },
                      { label: 'เวลามาตรฐาน (TTM)', value: plan?.ttm ? `${plan.ttm} นาที` : undefined },
                      { label: 'ระยะเวลาตามแผน', value: formatPmMinutes(getPlannedMinutes(pm)) },
                      { label: 'จำนวนขั้นตอนเช็คลิสต์', value: plan?.steps?.length ? `${plan.steps.length} ขั้นตอน` : undefined },
                      { label: 'สถานที่ / พิกัด', value: loc }
                    ];

                    const teamFields = [
                      { label: 'จำนวนคน', value: people ? `${people} คน` : undefined },
                      { label: 'รายชื่อช่างผู้รับผิดชอบ', value: allTechs.length > 0 ? allTechs.join(', ') : undefined }
                    ];

                    const timeFields = [
                      { label: 'วันที่กำหนดทำ', value: pm.date }
                    ];

                    const noteFields = [
                      { label: 'สาเหตุการเลื่อนแผน', value: pm.rescheduledReason },
                      { label: 'สาเหตุใช้เวลาเกินเกณฑ์', value: pm.overtimeReason },
                      { label: 'หมายเหตุ', value: (pm as Record<string, any>).notes }
                    ];

                    return (
                      <div className="space-y-5">
                        {/* Header bar */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30">
                                งาน PM
                              </span>
                              <span className="font-mono text-xs font-bold text-cyan-800 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-500/30 px-2 py-0.5 rounded">
                                {pm.machineId}
                              </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                              {mach?.name || 'เครื่องจักร'} — {plan?.title || 'แผน PM'}
                            </h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Main CTA: Go to PM Checklist */}
                            <button
                              type="button"
                              id="btn-goto-pm-checklist"
                              onClick={() => {
                                if (onOpenPMChecklist && pm.machineId) {
                                  setActiveDateStr(null);
                                  onOpenPMChecklist(pm.machineId, pm.pmPlanId || plan?.id || '');
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer"
                              title="เปิดหน้าเช็คลิสต์ตรวจ PM ของเครื่องและแผนนี้"
                            >
                              <span>▶ ไปทำ PM (เช็คลิสต์)</span>
                            </button>

                            {/* Status toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleTaskStatus(pm.id, 'PM', pm.status)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border cursor-pointer transition ${
                                pm.status === 'เสร็จสิ้น'
                                  ? 'bg-emerald-100 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                                  : pm.status === 'กำลังทำ'
                                    ? 'bg-amber-100 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300'
                                    : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300'
                              }`}
                              title="คลิกเพื่อเปลี่ยนสถานะงาน"
                            >
                              {pm.status === 'เสร็จสิ้น' ? '✓ เสร็จสิ้น' : pm.status === 'กำลังทำ' ? '⏳ กำลังทำ' : '• รอดำเนินการ'}
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditForm(pm, 'PM')}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              title="แก้ไขงาน"
                            >
                              <Edit3 size={15} />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(pm.id, 'PM')}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              title="ลบงาน"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Content sections */}
                        {renderDetailSection('ข้อมูลงาน PM', <ClipboardList size={14} className="text-cyan-600 dark:text-cyan-400" />, taskInfoFields)}
                        {renderDetailSection('ทีมและผู้ปฏิบัติงาน', <Users size={14} className="text-cyan-600 dark:text-cyan-400" />, teamFields)}
                        {renderDetailSection('เวลาและกำหนดการ', <Clock size={14} className="text-amber-500" />, timeFields)}
                        {renderDetailSection('หมายเหตุ', <Building2 size={14} className="text-slate-400" />, noteFields)}
                      </div>
                    );
                  }

                  if (selectedItem.type === 'Repair') {
                    const rep = selectedItem.data as RepairLog;
                    const mach = machines.find(m => m.id === rep.machineId);
                    const people = rep.peopleCount || (rep.technicians?.length || 1);
                    const allTechs = rep.technicians && rep.technicians.length > 0 ? rep.technicians : (rep.technician ? [rep.technician] : []);
                    const loc = rep.destination || (rep.machineId ? `แท่นเครื่อง ${rep.machineId}` : 'ไม่ได้ระบุ');
                    const bTime = rep.breakdownTime ? (rep.breakdownTime.includes('T') ? rep.breakdownTime.slice(11, 16) : rep.breakdownTime) : undefined;
                    const dTime = rep.repairDoneTime ? (rep.repairDoneTime.includes('T') ? rep.repairDoneTime.slice(11, 16) : rep.repairDoneTime) : undefined;

                    const taskInfoFields = [
                      { label: 'รหัสเครื่องจักร', value: rep.machineId ? `${rep.machineId}${mach?.name ? ` (${mach.name})` : ''}` : undefined },
                      { label: 'อาการขัดข้อง / ปัญหา', value: rep.symptoms || 'ไม่ได้ระบุ' },
                      { label: 'สถานที่ / พิกัดที่ไปซ่อม', value: loc }
                    ];

                    const teamFields = [
                      { label: 'จำนวนคน', value: people ? `${people} คน` : undefined },
                      { label: 'กลุ่มช่างที่ไปซ่อม', value: allTechs.length > 0 ? allTechs.join(', ') : undefined }
                    ];

                    const timeFields = [
                      { label: 'วันที่เกิดเหตุ', value: rep.date },
                      { label: 'เวลาแจ้งเสีย', value: bTime },
                      { label: 'เวลาซ่อมเสร็จ', value: dTime }
                    ];

                    const noteFields = [
                      { label: 'มาตรการแก้ไข', value: rep.correctiveAction !== 'กำลังดำเนินการตรวจสอบและซ่อมบำรุง' ? rep.correctiveAction : undefined },
                      { label: 'หมายเหตุ', value: (rep as Record<string, any>).notes }
                    ];

                    return (
                      <div className="space-y-5">
                        {/* Header bar */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30">
                                งานซ่อม (Repair)
                              </span>
                              <span className="font-mono text-xs font-bold text-rose-800 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/30 px-2 py-0.5 rounded">
                                {rep.machineId}
                              </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                              {mach?.name || 'เครื่องจักร'} — {rep.symptoms || 'ไม่ได้ระบุอาการเสีย'}
                            </h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Status toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleTaskStatus(rep.id, 'Repair', rep.status === 'ปิดงาน' ? 'เสร็จสิ้น' : 'กำลังทำ')}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border cursor-pointer transition ${
                                rep.status === 'ปิดงาน'
                                  ? 'bg-emerald-100 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-rose-100 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 animate-pulse'
                              }`}
                              title="คลิกเพื่อเปลี่ยนสถานะงานซ่อม"
                            >
                              {rep.status === 'ปิดงาน' ? '✓ ปิดงานซ่อมแล้ว' : '🚨 กำลังซ่อม'}
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditForm(rep, 'Repair')}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              title="แก้ไขงานซ่อม"
                            >
                              <Edit3 size={15} />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(rep.id, 'Repair')}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              title="ลบงานซ่อม"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Content sections */}
                        {renderDetailSection('ข้อมูลงานซ่อม', <Wrench size={14} className="text-rose-500" />, taskInfoFields)}
                        {renderDetailSection('ทีมและผู้ปฏิบัติงาน', <Users size={14} className="text-cyan-600 dark:text-cyan-400" />, teamFields)}
                        {renderDetailSection('เวลาและกำหนดการ', <Clock size={14} className="text-amber-500" />, timeFields)}
                        {renderDetailSection('หมายเหตุ', <Building2 size={14} className="text-slate-400" />, noteFields)}
                      </div>
                    );
                  }

                  // Other task
                  const oth = selectedItem.data as ContactOtherTask;
                  const people = oth.peopleCount || (oth.technicians?.length || 1);
                  const allTechs = oth.technicians && oth.technicians.length > 0 ? oth.technicians : [];

                  const taskInfoFields = [
                    { label: 'ชื่องาน / ภารกิจ', value: oth.title },
                    { label: 'หมวดหมู่งาน', value: oth.category },
                    { label: 'สถานที่ / ปลายทาง', value: oth.destination }
                  ];

                  const teamFields = [
                    { label: 'จำนวนคน', value: people ? `${people} คน` : undefined },
                    { label: 'รายชื่อผู้ปฏิบัติงาน', value: oth.technicianNamesText || (allTechs.length > 0 ? allTechs.join(', ') : undefined) }
                  ];

                  const timeFields = [
                    { label: 'วันที่', value: oth.date },
                    { label: 'เวลาเริ่ม', value: oth.startTime },
                    { label: 'เวลาสิ้นสุด', value: oth.endTime },
                    { label: 'ระยะเวลา', value: oth.duration ? `${oth.duration} นาที` : undefined }
                  ];

                  const noteFields = [
                    { label: 'หมายเหตุ', value: oth.notes }
                  ];

                  return (
                    <div className="space-y-5">
                      {/* Header bar */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                              {oth.category || 'งานติดต่อ / อื่นๆ'}
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                            {oth.title}
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Status toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleTaskStatus(oth.id, 'Other', oth.status)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border cursor-pointer transition ${
                              oth.status === 'เสร็จสิ้น'
                                ? 'bg-emerald-100 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                                : oth.status === 'กำลังทำ'
                                  ? 'bg-amber-100 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300'
                                  : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300'
                            }`}
                            title="คลิกเพื่อเปลี่ยนสถานะงาน"
                          >
                            {oth.status === 'เสร็จสิ้น' ? '✓ เสร็จสิ้น' : oth.status === 'กำลังทำ' ? '⏳ กำลังทำ' : '• รอดำเนินการ'}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(oth, 'Other')}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="แก้ไขงาน"
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(oth.id, 'Other')}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="ลบงาน"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Content sections */}
                      {renderDetailSection('ข้อมูลงานติดต่อ / อื่นๆ', <PhoneCall size={14} className="text-emerald-500" />, taskInfoFields)}
                      {renderDetailSection('ทีมและผู้ปฏิบัติงาน', <Users size={14} className="text-cyan-600 dark:text-cyan-400" />, teamFields)}
                      {renderDetailSection('เวลาและกำหนดการ', <Clock size={14} className="text-amber-500" />, timeFields)}
                      {renderDetailSection('หมายเหตุ', <Building2 size={14} className="text-slate-400" />, noteFields)}
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-750 px-4 py-3 flex justify-between items-center text-xs shrink-0">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] hidden sm:inline">
                เลือกงานด้านซ้ายเพื่อดูรายละเอียด คลิกปุ่มสถานะเพื่อเปลี่ยนสถานะงานแบบรวดเร็ว
              </span>
              <button
                type="button"
                onClick={() => setActiveDateStr(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-bold transition cursor-pointer ml-auto"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. TASK CREATOR & EDITOR MODAL (บันทึกงาน / แก้ไขงาน) */}
      {showTaskForm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5 overflow-hidden animate-in fade-in duration-150"
          id="task-form-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTaskForm(false);
          }}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl sm:max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100 my-auto"
            id="task-form-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Form Header */}
            <div className="shrink-0 bg-slate-50 dark:bg-gradient-to-r dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex justify-between items-center">
              <div>
                {formMode === 'create' && taskFormStep === 'form' && (
                  <button
                    type="button"
                    onClick={() => setTaskFormStep('select-type')}
                    className="text-xs text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-semibold mb-1 cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                    เปลี่ยนประเภทงาน
                  </button>
                )}
                <h3 className="text-base font-bold text-blue-700 dark:text-cyan-400 flex items-center gap-2">
                  {formMode === 'create' 
                    ? (taskFormStep === 'select-type' ? '➕ เพิ่มงานใหม่ในตารางงาน' : `➕ เพิ่มงาน: ${formTaskType === 'PM' ? 'งาน PM' : formTaskType === 'Repair' ? 'งานซ่อม' : 'งานติดต่อ / อื่นๆ'}`)
                    : '✏️ แก้ไขข้อมูลตารางงาน'
                  }
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  วันที่: <span className="text-slate-900 dark:text-fg font-mono font-semibold">{formDate}</span>
                </p>
              </div>

              {/* ปุ่มกากบาท ขวาบน */}
              <button 
                type="button"
                id="btn-close-task-modal"
                onClick={() => setShowTaskForm(false)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                title="ปิดหน้าต่าง (Close)"
                aria-label="ปิดหน้าต่าง"
              >
                <X size={20} className="stroke-[2.5]" />
              </button>
            </div>

            {formMode === 'create' && taskFormStep === 'select-type' ? (
              /* STEP 1: SELECT TASK TYPE FIRST */
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    เลือกประเภทงานที่ต้องการบันทึก
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    กรุณาเลือกประเภทงานเพื่อเข้าสู่แบบฟอร์มที่เหมาะสม
                  </p>
                </div>

                {/* Date Picker preview in Step 1 */}
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar size={13} className="text-blue-600 dark:text-cyan-400" />
                    วันที่ปฏิบัติงาน (Date)
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-cyan-500 font-mono"
                  />
                </div>

                {/* 3 Large Option Cards */}
                <div className="grid grid-cols-1 gap-3">
                  {/* 1. PM Card */}
                  <button
                    type="button"
                    id="btn-select-task-type-pm"
                    onClick={() => {
                      setFormTaskType('PM');
                      setTaskFormStep('form');
                    }}
                    className="group p-4 rounded-2xl border-2 text-left transition flex items-start gap-4 cursor-pointer bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-500/30 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <div className="p-3 rounded-xl bg-blue-500 text-white shrink-0 group-hover:scale-110 transition duration-200 shadow-md shadow-blue-500/20">
                      <ClipboardList size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-blue-900 dark:text-blue-300 group-hover:text-blue-600 dark:group-hover:text-blue-200 transition">
                          งาน PM (บำรุงรักษาเชิงป้องกัน)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40">
                          แผนงาน & เช็คลิสต์
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        งานตรวจเช็คสภาพเครื่องจักรตามรอบความถี่ บันทึกเวลา และขั้นตอนเช็คลิสต์มาตรฐาน
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-blue-400 self-center group-hover:translate-x-1 transition" />
                  </button>

                  {/* 2. Repair Card */}
                  <button
                    type="button"
                    id="btn-select-task-type-repair"
                    onClick={() => {
                      setFormTaskType('Repair');
                      setTaskFormStep('form');
                    }}
                    className="group p-4 rounded-2xl border-2 text-left transition flex items-start gap-4 cursor-pointer bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-500/10"
                  >
                    <div className="p-3 rounded-xl bg-rose-500 text-white shrink-0 group-hover:scale-110 transition duration-200 shadow-md shadow-rose-500/20">
                      <Wrench size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-rose-900 dark:text-rose-300 group-hover:text-rose-600 dark:group-hover:text-rose-200 transition">
                          งานซ่อม / ฉุกเฉิน (Breakdown)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40">
                          ซ่อมแซม & แก้ไข
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        แจ้งซ่อมเครื่องจักรขัดข้อง ซ่อมด่วนหน้างาน อาการเสีย และบันทึกเวลาหยุดเครื่อง/ซ่อมเสร็จ
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-rose-400 self-center group-hover:translate-x-1 transition" />
                  </button>

                  {/* 3. Other Card */}
                  <button
                    type="button"
                    id="btn-select-task-type-other"
                    onClick={() => {
                      setFormTaskType('Other');
                      setTaskFormStep('form');
                    }}
                    className="group p-4 rounded-2xl border-2 text-left transition flex items-start gap-4 cursor-pointer bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10"
                  >
                    <div className="p-3 rounded-xl bg-emerald-500 text-white shrink-0 group-hover:scale-110 transition duration-200 shadow-md shadow-emerald-500/20">
                      <PhoneCall size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-emerald-900 dark:text-emerald-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-200 transition">
                          งานติดต่อ / ภายนอก / อื่นๆ
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                          ภารกิจภายนอก
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        งานจัดซื้อ ซื้ออะไหล่ ส่งชิ้นส่วนโรงกลึง ประชุม อบรม หรือภารกิจสนับสนุนอื่นๆ
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-emerald-400 self-center group-hover:translate-x-1 transition" />
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowTaskForm(false)}
                    className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            ) : (
              /* STEP 2: FORM VIEW */
              <form onSubmit={handleSaveTask} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              
                {/* Task Type Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ประเภทงาน (Task Type)*</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormTaskType('PM')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      formTaskType === 'PM'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-750 hover:bg-slate-200 dark:hover:text-slate-200'
                    }`}
                  >
                    <ClipboardList size={14} />
                    งาน PM
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormTaskType('Repair')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      formTaskType === 'Repair'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-750 hover:bg-slate-200 dark:hover:text-slate-200'
                    }`}
                  >
                    <Wrench size={14} />
                    งานซ่อม
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormTaskType('Other')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      formTaskType === 'Other'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-750 hover:bg-slate-200 dark:hover:text-slate-200'
                    }`}
                  >
                    <PhoneCall size={14} />
                    ติดต่อ / อื่นๆ
                  </button>
                </div>
              </div>

              {/* DATE PICKER */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">วันที่ปฏิบัติงาน (Date)*</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-cyan-500 font-mono"
                />
              </div>

              {/* DYNAMIC FIELDS PER TYPE */}
              {formTaskType === 'PM' && (
                <div className="space-y-3 p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-blue-900 dark:text-blue-200">เครื่องจักรที่ทำ PM*</label>
                      <select
                        value={formMachineId}
                        onChange={(e) => setFormMachineId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500 dark:focus:border-cyan-500 font-mono"
                      >
                        {machines.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.id} - {m.name} ({m.lineGroup})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-blue-900 dark:text-blue-200">แผนงาน PM ที่เกี่ยวข้อง</label>
                      <select
                        value={formPmPlanId}
                        onChange={(e) => setFormPmPlanId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500 dark:focus:border-cyan-500"
                      >
                        <option value="">-- เลือกแผนบำรุงรักษา --</option>
                        {pmPlans.filter(p => !formMachineId || p.machineId === formMachineId).map(p => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({p.frequency} - {p.ttm} นาที)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-blue-900 dark:text-blue-200">ระยะเวลาตามแผน (นาที)</label>
                    {(() => {
                      const selectedPlan = pmPlans.find(p => p.id === formPmPlanId);
                      const durationHint = selectedPlan?.ttm ? ` — มาตรฐานแผน ${selectedPlan.ttm} นาที` : '';
                      return (
                        <input
                          type="number"
                          value={formDuration || ''}
                          onChange={(e) => setFormDuration(e.target.value === '' ? 0 : Number(e.target.value))}
                          placeholder={`ไม่ได้ระบุ (กรอกภายหลังได้)${durationHint}`}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500 dark:focus:border-cyan-500"
                        />
                      );
                    })()}
                  </div>
                </div>
              )}

              {formTaskType === 'Repair' && (
                <div className="space-y-3 p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-rose-900 dark:text-rose-200">เครื่องจักรที่เกิดเหตุ/ต้องซ่อม*</label>
                    <select
                      value={formMachineId}
                      onChange={(e) => setFormMachineId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500 dark:focus:border-cyan-500 font-mono"
                    >
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.id} - {m.name} ({m.lineGroup})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-rose-900 dark:text-rose-200">อาการเสีย / รายละเอียดงานซ่อม</label>
                    <input
                      type="text"
                      placeholder="ไม่ได้ระบุ (กรอกภายหลังได้ เช่น สายพานรูด, ปั๊มไม่สร้างแรงดัน)"
                      value={formSymptoms}
                      onChange={(e) => setFormSymptoms(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">เวลาเริ่มซ่อม</label>
                      <input
                        type="time"
                        value={formBreakdownTime}
                        onChange={(e) => setFormBreakdownTime(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">เวลาคาดเสร็จ</label>
                      <input
                        type="time"
                        value={formRepairDoneTime}
                        onChange={(e) => setFormRepairDoneTime(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formTaskType === 'Other' && (
                <div className="space-y-3 p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">ชื่องาน / ภารกิจ</label>
                    <input
                      type="text"
                      placeholder="ไม่ได้ระบุ (กรอกภายหลังได้ เช่น ไปติดต่อร้านอะไหล่, ส่งชิ้นส่วนโรงกลึง)"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">หมวดหมู่ภารกิจ</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="งานติดต่อ">งานติดต่อ</option>
                      <option value="งานจัดซื้อ/ซัพพลายเออร์">งานจัดซื้อ / ซัพพลายเออร์</option>
                      <option value="งานโรงกลึง/ภายนอก">งานโรงกลึง / ส่งซ่อมภายนอก</option>
                      <option value="งานประชุม/อบรม">งานประชุม / อบรม</option>
                      <option value="งานสนับสนุน">งานสนับสนุน</option>
                      <option value="งานอื่นๆ">งานอื่นๆ</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">เวลาเริ่มต้น</label>
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">เวลาสิ้นสุด</label>
                      <input
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 📍 สถานที่ / ปลายทางที่กลุ่มนี้ไป (กลุ่มนี้ไปไหนได้) */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-blue-700 dark:text-cyan-400 font-bold">
                    <Compass size={14} />
                    สถานที่ / ปลายทางที่กลุ่มนี้ไป (กลุ่มนี้ไปไหน)
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">ไม่ได้ระบุก็ได้ (กรอกภายหลังได้)</span>
                </label>
                <input
                  type="text"
                  placeholder="ไม่ได้ระบุ (กรอกภายหลังได้ เช่น ร้านเจริญอะไหล่ พระราม 2, โรงกลึง CNC)"
                  value={formDestination}
                  onChange={(e) => setFormDestination(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-cyan-500"
                />

                {/* Destination Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 self-center">คลิกเลือกด่วน:</span>
                  {DESTINATION_PRESETS.map((preset, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setFormDestination(preset)}
                      className="text-[9.5px] px-2 py-0.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 👥 จำนวนคน & ชื่อคน / รายชื่อช่างในกลุ่ม */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-750">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-700 dark:text-cyan-400 flex items-center gap-1.5">
                    <Users size={14} />
                    จำนวนคนและรายชื่อช่างในกลุ่ม*
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-600 dark:text-slate-400">จำนวนคน:</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={formPeopleCount}
                      onChange={(e) => setFormPeopleCount(Math.max(1, Number(e.target.value)))}
                      className="w-16 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-bold text-blue-700 dark:text-cyan-300 font-mono"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">คน</span>
                  </div>
                </div>

                {/* Quick Select Technician Chips */}
                <div className="space-y-1.5">
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">คลิกเลือกชื่อช่างในกลุ่ม (ช่างที่ปฏิบัติงาน):</p>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-750 scrollbar-none">
                    {technicians.map((tech) => {
                      const isSelected = formSelectedTechs.includes(tech);
                      return (
                        <button
                          type="button"
                          key={tech}
                          onClick={() => handleToggleTech(tech)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition flex items-center gap-1 ${
                            isSelected
                              ? 'bg-blue-600 dark:bg-cyan-500 text-white dark:text-slate-950 border-blue-600 dark:border-cyan-400 font-bold shadow'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {isSelected && <Check size={11} />}
                          {tech}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom / Additional Names */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600 dark:text-slate-400">ชื่อคนเพิ่มเติม หรือบุคคลภายนอก (ถ้ามี)</label>
                  <input
                    type="text"
                    placeholder="เช่น สมเกียรติ, พนักงานฝึกงาน, ช่างซัพพลายเออร์"
                    value={formCustomNames}
                    onChange={(e) => setFormCustomNames(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-750">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">สถานะงาน</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormStatus('รอดำเนินการ')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      formStatus === 'รอดำเนินการ'
                        ? 'bg-slate-200 text-slate-900 border-slate-400 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-500 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    • รอดำเนินการ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus('กำลังทำ')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      formStatus === 'กำลังทำ'
                        ? 'bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-400 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    ⏳ กำลังทำ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus('เสร็จสิ้น')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      formStatus === 'เสร็จสิ้น'
                        ? 'bg-emerald-100 text-emerald-950 border-emerald-400 dark:bg-emerald-500 dark:text-slate-950 dark:border-emerald-400 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    ✓ เสร็จสิ้น
                  </button>
                </div>
              </div>
                </div>

                {/* Form Buttons */}
                <div className="shrink-0 px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowTaskForm(false)}
                    className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    id="btn-submit-task-form"
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 transition shadow-lg shadow-blue-500/20 dark:shadow-cyan-500/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    {formMode === 'create' ? 'บันทึกงานลงตาราง' : 'อัปเดตข้อมูล'}
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR DELETING TASK FROM CALENDAR */}
      {taskToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div id="schedule-delete-task-modal" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-500">
                <Trash2 size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {taskToDelete.type === 'PM' ? 'ลบงาน PM จากตารางงาน?' : taskToDelete.type === 'Repair' ? 'ลบงานซ่อมจากตารางงาน?' : 'ลบงานติดต่อ/อื่นๆ?'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้ออกจากตารางงานประจำเดือน?
              </p>
            </div>
            <div className="flex gap-3 justify-end text-xs font-bold">
              <button
                type="button"
                id="btn-cancel-delete-schedule-task"
                onClick={() => setTaskToDelete(null)}
                className="w-1/2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl cursor-pointer transition font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="btn-confirm-delete-schedule-task"
                onClick={confirmDeleteTask}
                className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl cursor-pointer transition shadow-lg shadow-rose-600/20"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
