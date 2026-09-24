import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { PMPlan, PMFrequency, PMStep, Machine } from '../types';
import { 
  Search, Plus, Trash2, Edit3, CheckCircle, PackageOpen, 
  Clock, ClipboardList, Copy, Upload, Download, Check, AlertTriangle, 
  Sparkles, FileSpreadsheet, ArrowLeftRight, CheckSquare, Square, 
  Calendar, User, Wrench, ShieldCheck, RefreshCw, FileText, ChevronDown, ChevronUp,
  Maximize2, Minimize2
} from 'lucide-react';
import { 
  exportPMReportToExcel, 
  exportPMTemplateExcel, 
  parsePMReportExcel, 
  ParsedPMReportResult 
} from '../utils/pmExcelUtils';
import { PMKpiPanel } from './PMKpiPanel';
import { PMHistoryPage } from './PMHistoryPage';

export interface PMPlanPageProps {
  initialSubTab?: 'plan' | 'kpi';
  navToken?: number;
}

export const PMPlanPage: React.FC<PMPlanPageProps> = ({ initialSubTab = 'plan', navToken = 0 }) => {
  const { machines, pmPlans, setPmPlans, pmMachineIds, setPmMachineIds } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'plan' | 'kpi'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab, navToken]);
  
  // Selected machine filter
  const [selectedMachineId, setSelectedMachineId] = useState<string>(() => {
    if (pmMachineIds && pmMachineIds.length > 0) return pmMachineIds[0];
    return machines[0]?.id || '';
  });
  const [machineSearch, setMachineSearch] = useState('');

  // PM Machine List management states
  const [showMachinePickerModal, setShowMachinePickerModal] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [machineToRemoveFromPM, setMachineToRemoveFromPM] = useState<Machine | null>(null);

  // Widen detail panel toggle state
  const [isWide, setIsWide] = useState(false);

  // Copy plans from another machine states
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceMachineId, setCopySourceMachineId] = useState('');
  const [selectedPlansToCopy, setSelectedPlansToCopy] = useState<string[]>([]);

  // Excel Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedDataPreview, setImportedDataPreview] = useState<ParsedPMReportResult | null>(null);
  const [importSelectedMachineOnly, setImportSelectedMachineOnly] = useState(true);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');
  const [rawPastedText, setRawPastedText] = useState('');

  // Add/Edit Plan Form States
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetChecklistPlanId, setResetChecklistPlanId] = useState<string | null>(null);
  
  // Quick Add/Edit Single Step modal
  const [stepModalPlanId, setStepModalPlanId] = useState<string | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [stepForm, setStepForm] = useState<Partial<PMStep>>({
    itemNo: 1,
    title: '',
    method: 'ดูด้วยสายตา',
    standard: '',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 10,
    result: 'ยังไม่ตรวจ',
    abnormalDetail: '',
    remark: '',
    done: false
  });

  // Main Form fields
  const [planTitle, setPlanTitle] = useState('');
  const [planFrequency, setPlanFrequency] = useState<PMFrequency>('รายเดือน');
  const [planSpareParts, setPlanSpareParts] = useState('');
  const [planSparePartsQty, setPlanSparePartsQty] = useState('');
  const [planInspectorTech, setPlanInspectorTech] = useState('');
  const [planAcknowledgingDept, setPlanAcknowledgingDept] = useState('');
  const [planSupervisorName, setPlanSupervisorName] = useState('');
  const [planLastCheckedDate, setPlanLastCheckedDate] = useState('');
  const [planSteps, setPlanSteps] = useState<PMStep[]>([
    { itemNo: 1, title: 'ตรวจเช็คสภาพทั่วไปทั้งภายในและภายนอกเครื่อง', method: 'ดูด้วยสายตา', standard: 'โครงสร้างสมบูรณ์ ไม่มีส่วนชำรุด', frequency: '1 เดือน/ครั้ง', stdTime: 10, result: 'ยังไม่ตรวจ', done: false }
  ]);
  const [formError, setFormError] = useState('');

  // Expanded plan cards for checklist view
  const [expandedPlanIds, setExpandedPlanIds] = useState<Record<string, boolean>>({});

  // Machines enrolled in PM list (preserves order in pmMachineIds)
  const pmMachines = useMemo(() => {
    return pmMachineIds
      .map(id => machines.find(m => m.id === id))
      .filter((m): m is Machine => Boolean(m));
  }, [pmMachineIds, machines]);

  // Searchable machine selection in PM left column
  const filteredPmMachines = useMemo(() => {
    const term = machineSearch.trim().toLowerCase();
    if (!term) return pmMachines;
    return pmMachines.filter(m => 
      m.id.toLowerCase().includes(term) ||
      m.name.toLowerCase().includes(term) ||
      (m.lineGroup && m.lineGroup.toLowerCase().includes(term)) ||
      (m.locationZone && m.locationZone.toLowerCase().includes(term)) ||
      (m.locationRoom && m.locationRoom.toLowerCase().includes(term))
    );
  }, [pmMachines, machineSearch]);

  // Registry machines NOT yet enrolled in PM list (for the picker modal)
  const availableRegistryMachines = useMemo(() => {
    return machines.filter(m => !pmMachineIds.includes(m.id));
  }, [machines, pmMachineIds]);

  // Searchable registry machines inside the picker modal
  const filteredAvailableMachines = useMemo(() => {
    const term = pickerSearch.trim().toLowerCase();
    if (!term) return availableRegistryMachines;
    return availableRegistryMachines.filter(m =>
      m.id.toLowerCase().includes(term) ||
      m.name.toLowerCase().includes(term) ||
      (m.lineGroup && m.lineGroup.toLowerCase().includes(term)) ||
      (m.locationZone && m.locationZone.toLowerCase().includes(term)) ||
      (m.locationRoom && m.locationRoom.toLowerCase().includes(term))
    );
  }, [availableRegistryMachines, pickerSearch]);

  // Synchronize selectedMachineId if currently selected machine is removed or on list change
  useEffect(() => {
    if (pmMachines.length > 0) {
      if (!selectedMachineId || !pmMachineIds.includes(selectedMachineId)) {
        setSelectedMachineId(pmMachines[0].id);
      }
    } else if (selectedMachineId) {
      setSelectedMachineId('');
    }
  }, [pmMachineIds, pmMachines, selectedMachineId]);

  // Add machine to PM list (from machine registry)
  const handleAddMachineToPM = (machineId: string) => {
    if (pmMachineIds.includes(machineId)) return; // Prevent duplicate
    setPmMachineIds(prev => [...prev, machineId]);
    setSelectedMachineId(machineId);
    setShowMachinePickerModal(false);
    setPickerSearch('');
  };

  // Remove machine from PM list ONLY (registry record untouched)
  const handleConfirmRemoveMachineFromPM = (machineId: string) => {
    setPmMachineIds(prev => prev.filter(id => id !== machineId));
    if (selectedMachineId === machineId) {
      const remaining = pmMachines.filter(m => m.id !== machineId);
      setSelectedMachineId(remaining[0]?.id || '');
    }
    setMachineToRemoveFromPM(null);
  };

  const selectedMachine = machines.find(m => m.id === selectedMachineId);

  // Plans of the selected machine
  const activeMachinePlans = pmPlans.filter(p => p.machineId === selectedMachineId);

  // Auto-expand plans
  const isPlanExpanded = (planId: string) => {
    return expandedPlanIds[planId] !== false; // Default true (expanded)
  };

  const togglePlanExpanded = (planId: string) => {
    setExpandedPlanIds(prev => ({
      ...prev,
      [planId]: !isPlanExpanded(planId)
    }));
  };

  // ----------------------------------------------------
  // Interactive Checklist Action Handlers
  // ----------------------------------------------------
  
  // Toggle individual checklist item (ติ๊กสิ่งที่ทำแล้ว)
  const handleToggleStepDone = (planId: string, stepIndex: number) => {
    setPmPlans(prev => prev.map(plan => {
      if (plan.id !== planId) return plan;
      const updatedSteps = [...(plan.steps || [])];
      const targetStep = updatedSteps[stepIndex];
      if (!targetStep) return plan;

      const newDone = !targetStep.done;
      // If marked done and no result was set, default result to 'ปกติ'
      const newResult = newDone && (!targetStep.result || targetStep.result === 'ยังไม่ตรวจ')
        ? 'ปกติ'
        : (newDone ? targetStep.result : targetStep.result);

      updatedSteps[stepIndex] = {
        ...targetStep,
        done: newDone,
        result: newResult
      };

      return {
        ...plan,
        steps: updatedSteps,
        lastCheckedDate: plan.lastCheckedDate || new Date().toISOString().split('T')[0]
      };
    }));
  };

  // Set step result (ปกติ / ไม่ปกติ / ยังไม่ตรวจ)
  const handleSetStepResult = (planId: string, stepIndex: number, result: 'ปกติ' | 'ไม่ปกติ' | 'ยังไม่ตรวจ') => {
    setPmPlans(prev => prev.map(plan => {
      if (plan.id !== planId) return plan;
      const updatedSteps = [...(plan.steps || [])];
      const targetStep = updatedSteps[stepIndex];
      if (!targetStep) return plan;

      const isDone = result !== 'ยังไม่ตรวจ';

      updatedSteps[stepIndex] = {
        ...targetStep,
        result,
        done: isDone
      };

      return {
        ...plan,
        steps: updatedSteps,
        lastCheckedDate: plan.lastCheckedDate || new Date().toISOString().split('T')[0]
      };
    }));
  };

  // Update step abnormal detail or remark inline
  const handleUpdateStepField = (planId: string, stepIndex: number, field: 'abnormalDetail' | 'remark', val: string) => {
    setPmPlans(prev => prev.map(plan => {
      if (plan.id !== planId) return plan;
      const updatedSteps = [...(plan.steps || [])];
      if (!updatedSteps[stepIndex]) return plan;

      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        [field]: val
      };

      return { ...plan, steps: updatedSteps };
    }));
  };

  // Mark all checklist steps as done
  const handleMarkAllDone = (planId: string) => {
    setPmPlans(prev => prev.map(plan => {
      if (plan.id !== planId) return plan;
      return {
        ...plan,
        lastCheckedDate: new Date().toISOString().split('T')[0],
        steps: (plan.steps || []).map(s => ({
          ...s,
          done: true,
          result: s.result && s.result !== 'ยังไม่ตรวจ' ? s.result : 'ปกติ'
        }))
      };
    }));
  };

  // Reset checklist steps for a plan
  const handleResetChecklist = (planId: string) => {
    setResetChecklistPlanId(planId);
  };

  const confirmResetChecklist = () => {
    if (!resetChecklistPlanId) return;
    setPmPlans(prev => prev.map(plan => {
      if (plan.id !== resetChecklistPlanId) return plan;
      return {
        ...plan,
        steps: (plan.steps || []).map(s => ({
          ...s,
          done: false,
          result: 'ยังไม่ตรวจ'
        }))
      };
    }));
    setResetChecklistPlanId(null);
  };

  // Delete a step from a plan (ลดการทำ PM)
  const handleDeleteStepFromPlan = (planId: string, stepIndex: number) => {
    setPmPlans(prev => prev.map(plan => {
      if (plan.id !== planId) return plan;
      const updatedSteps = (plan.steps || []).filter((_, idx) => idx !== stepIndex);
      const newTtm = updatedSteps.reduce((sum, s) => sum + (s.stdTime || 0), 0);
      return {
        ...plan,
        steps: updatedSteps,
        ttm: newTtm
      };
    }));
  };

  // Open modal to add a new step directly into an existing plan (เพิ่มการทำ PM)
  const handleOpenAddStepModal = (planId: string) => {
    const targetPlan = pmPlans.find(p => p.id === planId);
    const nextItemNo = ((targetPlan?.steps || []).length) + 1;
    setStepModalPlanId(planId);
    setEditingStepIndex(null);
    setStepForm({
      itemNo: nextItemNo,
      title: '',
      method: 'ดูด้วยสายตา',
      standard: '',
      frequency: targetPlan?.frequency || '1 เดือน/ครั้ง',
      stdTime: 10,
      result: 'ยังไม่ตรวจ',
      abnormalDetail: '',
      remark: '',
      done: false
    });
  };

  // Open modal to edit an existing step in a plan
  const handleOpenEditStepModal = (planId: string, stepIndex: number) => {
    const targetPlan = pmPlans.find(p => p.id === planId);
    const step = targetPlan?.steps?.[stepIndex];
    if (!step) return;

    setStepModalPlanId(planId);
    setEditingStepIndex(stepIndex);
    setStepForm({ ...step });
  };

  // Save single step addition/edit
  const handleSaveStepModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepModalPlanId || !stepForm.title?.trim()) {
      alert('กรุณาระบุหัวข้อ PM หรือสิ่งที่ต้องตรวจ');
      return;
    }

    setPmPlans(prev => prev.map(plan => {
      if (plan.id !== stepModalPlanId) return plan;
      const updatedSteps = [...(plan.steps || [])];

      const stepPayload: PMStep = {
        id: stepForm.id || `step-${Date.now()}`,
        itemNo: stepForm.itemNo !== undefined ? stepForm.itemNo : (updatedSteps.length + 1),
        title: (stepForm.title || '').trim(),
        method: (stepForm.method || 'ดูด้วยสายตา').trim(),
        standard: (stepForm.standard || '').trim(),
        frequency: stepForm.frequency || plan.frequency || '1 เดือน/ครั้ง',
        stdTime: Math.max(1, Number(stepForm.stdTime) || 10),
        result: stepForm.result || 'ยังไม่ตรวจ',
        abnormalDetail: (stepForm.abnormalDetail || '').trim(),
        remark: (stepForm.remark || '').trim(),
        done: !!stepForm.done
      };

      if (editingStepIndex !== null && editingStepIndex >= 0) {
        updatedSteps[editingStepIndex] = stepPayload;
      } else {
        updatedSteps.push(stepPayload);
      }

      const calculatedTtm = updatedSteps.reduce((sum, s) => sum + (s.stdTime || 0), 0);

      return {
        ...plan,
        steps: updatedSteps,
        ttm: calculatedTtm
      };
    }));

    setStepModalPlanId(null);
    setEditingStepIndex(null);
  };

  // ----------------------------------------------------
  // Excel File Upload & Import Logic
  // ----------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const parsed = parsePMReportExcel(buffer);
        if (!parsed || parsed.steps.length === 0) {
          setImportError('ไม่พบขั้นตอนการทำ PM ในไฟล์ที่ระบุ กรุณาตรวจสอบโครงสร้างตาราง');
          setImportedDataPreview(null);
          return;
        }
        setImportedDataPreview(parsed);
      } catch (err: any) {
        setImportError(`ไม่สามารถอ่านไฟล์ Excel: ${err?.message || err}`);
        setImportedDataPreview(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = () => {
    if (!importedDataPreview) return;

    const targetMachId = importSelectedMachineOnly ? selectedMachineId : (importedDataPreview.machineId || selectedMachineId);
    const calculatedTtm = importedDataPreview.steps.reduce((sum, s) => sum + (s.stdTime || 10), 0);

    const newPlan: PMPlan = {
      id: `plan-pm-${Date.now()}`,
      machineId: targetMachId,
      title: importedDataPreview.title || `ใบรายงาน PM - ${targetMachId}`,
      frequency: importedDataPreview.frequency || 'รายเดือน',
      steps: importedDataPreview.steps,
      spareParts: importedDataPreview.spareParts,
      sparePartsQty: importedDataPreview.sparePartsQty,
      ttm: calculatedTtm,
      inspectorTech: importedDataPreview.inspectorTech,
      acknowledgingDept: importedDataPreview.acknowledgingDept,
      supervisorName: importedDataPreview.supervisorName,
      lastCheckedDate: importedDataPreview.reportDate || new Date().toISOString().split('T')[0]
    };

    setPmPlans(prev => [...prev, newPlan]);
    setShowImportModal(false);
    setImportedDataPreview(null);
    setImportFileName('');
    alert(`นำเข้าสำเร็จ! บันทึกใบรายงานและแผน PM (${newPlan.steps.length} ขั้นตอน) เข้าสู่เครื่อง ${targetMachId} เรียบร้อยแล้ว`);
  };

  // ----------------------------------------------------
  // Full Form Add/Edit Plan Logic
  // ----------------------------------------------------
  const handleOpenNewForm = () => {
    if (!selectedMachineId) {
      alert("กรุณาเลือกเครื่องจักรทางหน้าต่างด้านซ้ายก่อน");
      return;
    }
    setEditingPlanId(null);
    setPlanTitle(`ใบรายงาน Preventive Maintenance (PM) - ${selectedMachine?.name || selectedMachineId}`);
    setPlanFrequency('รายเดือน');
    setPlanSpareParts('');
    setPlanSparePartsQty('');
    setPlanInspectorTech('ทีมช่างบำรุงรักษา');
    setPlanAcknowledgingDept('ฝ่ายผลิต');
    setPlanSupervisorName('หัวหน้าหน่วย PM');
    setPlanLastCheckedDate(new Date().toISOString().split('T')[0]);
    setPlanSteps([
      { itemNo: 1, title: 'ตรวจเช็คสภาพทั่วไปทั้งภายในและภายนอกเครื่อง', method: 'ดูด้วยสายตา', standard: 'โครงสร้างสมบูรณ์ ไม่มีส่วนชำรุด', frequency: '1 เดือน/ครั้ง', stdTime: 10, result: 'ยังไม่ตรวจ', done: false },
      { itemNo: 2, title: 'ตรวจวัดค่าแรงดัน', method: 'เครื่องมือวัด', standard: 'แรงดันไฟฟ้า 3 เฟส 200-240 V.', frequency: '1 เดือน/ครั้ง', stdTime: 10, result: 'ยังไม่ตรวจ', done: false },
      { itemNo: 3, title: 'ทำความสะอาดทั่วไปโดยรอบเครื่องจักร', method: 'มือ สายตา', standard: 'ภายนอกและภายในสะอาด ไม่มีความชื้น', frequency: '1 เดือน/ครั้ง', stdTime: 10, result: 'ยังไม่ตรวจ', done: false }
    ]);
    setFormError('');
    setShowFormModal(true);
  };

  const handleOpenEditForm = (plan: PMPlan) => {
    setEditingPlanId(plan.id);
    setPlanTitle(plan.title);
    setPlanFrequency(plan.frequency);
    setPlanSpareParts(plan.spareParts || '');
    setPlanSparePartsQty(plan.sparePartsQty || '');
    setPlanInspectorTech(plan.inspectorTech || '');
    setPlanAcknowledgingDept(plan.acknowledgingDept || '');
    setPlanSupervisorName(plan.supervisorName || '');
    setPlanLastCheckedDate(plan.lastCheckedDate || '');
    setPlanSteps([...(plan.steps || [])]);
    setFormError('');
    setShowFormModal(true);
  };

  const handleSavePlanForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitle.trim()) {
      setFormError('กรุณากรอกชื่อแผน PM หรือชื่อใบรายงาน');
      return;
    }

    const invalidSteps = planSteps.some(step => !step.title.trim());
    if (invalidSteps) {
      setFormError('กรุณากรอกรายละเอียดหัวข้อขั้นตอนในทุกแถว');
      return;
    }

    const calculatedTtm = planSteps.reduce((sum, step) => sum + (step.stdTime || 0), 0);

    if (editingPlanId) {
      setPmPlans(prev => prev.map(p => {
        if (p.id === editingPlanId) {
          return {
            ...p,
            title: planTitle.trim(),
            frequency: planFrequency,
            spareParts: planSpareParts.trim(),
            sparePartsQty: planSparePartsQty.trim(),
            inspectorTech: planInspectorTech.trim(),
            acknowledgingDept: planAcknowledgingDept.trim(),
            supervisorName: planSupervisorName.trim(),
            lastCheckedDate: planLastCheckedDate.trim(),
            steps: planSteps.map((s, idx) => ({ 
              ...s, 
              itemNo: s.itemNo !== undefined ? s.itemNo : (idx + 1),
              title: s.title.trim() 
            })),
            ttm: calculatedTtm
          };
        }
        return p;
      }));
    } else {
      const newPlan: PMPlan = {
        id: `plan-pm-${Date.now()}`,
        machineId: selectedMachineId,
        title: planTitle.trim(),
        frequency: planFrequency,
        spareParts: planSpareParts.trim(),
        sparePartsQty: planSparePartsQty.trim(),
        inspectorTech: planInspectorTech.trim(),
        acknowledgingDept: planAcknowledgingDept.trim(),
        supervisorName: planSupervisorName.trim(),
        lastCheckedDate: planLastCheckedDate.trim() || new Date().toISOString().split('T')[0],
        steps: planSteps.map((s, idx) => ({ 
          ...s, 
          itemNo: s.itemNo !== undefined ? s.itemNo : (idx + 1),
          title: s.title.trim() 
        })),
        ttm: calculatedTtm
      };
      setPmPlans(prev => [...prev, newPlan]);
    }

    setShowFormModal(false);
  };

  // Cross-machine clone logic
  const sourceMachinePlans = pmPlans.filter(p => p.machineId === copySourceMachineId);

  const handleToggleSelectPlanToCopy = (planId: string) => {
    setSelectedPlansToCopy(prev => 
      prev.includes(planId) ? prev.filter(id => id !== planId) : [...prev, planId]
    );
  };

  const handleExecuteCopy = () => {
    if (!selectedMachineId || !copySourceMachineId || selectedPlansToCopy.length === 0) return;
    const plansToClone = pmPlans.filter(p => selectedPlansToCopy.includes(p.id));
    const newlyCloned: PMPlan[] = plansToClone.map(p => ({
      ...p,
      id: `plan-pm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      machineId: selectedMachineId,
      steps: (p.steps || []).map(s => ({ ...s }))
    }));

    setPmPlans(prev => [...prev, ...newlyCloned]);
    setShowCopyModal(false);
    setSelectedPlansToCopy([]);
    setCopySourceMachineId('');
    alert(`คัดลอกสำเร็จ! สั่งคัดลอกแผนงาน PM จำนวน ${newlyCloned.length} รายการ จากเครื่อง ${copySourceMachineId} เข้าสู่เครื่อง ${selectedMachineId} เรียบร้อยแล้ว`);
  };

  return (
    <div className="space-y-4" id="pm-plan-page-hub">
      {/* Sub-tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface border border-border dark:border-slate-800 p-2.5 px-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            {activeSubTab === 'plan' ? <ClipboardList size={18} /> : <ShieldCheck size={18} />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-fg flex items-center gap-2">
              ระบบแผนงานและการบำรุงรักษาเชิงป้องกัน (PM Maintenance System)
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {activeSubTab === 'plan'
                ? 'จัดการรายการเครื่องจักร รายการตรวจสอบ และแผนการบำรุงรักษาเชิงป้องกันตามรอบเวลา'
                : 'ดัชนีชี้วัดประสิทธิภาพ PM Pillar (KPIs) และบันทึกประวัติการตรวจเช็ค PM ย้อนหลัง'}
            </p>
          </div>
        </div>

        {/* Sub-Tab Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-xl gap-1 shrink-0">
          <button
            id="tab-btn-pm-plan"
            type="button"
            onClick={() => setActiveSubTab('plan')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'plan'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-900'
            }`}
          >
            <ClipboardList size={14} />
            <span>📋 แผน PM</span>
          </button>
          
          <button
            id="tab-btn-pm-kpi"
            type="button"
            onClick={() => setActiveSubTab('kpi')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'kpi'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-900'
            }`}
          >
            <ShieldCheck size={14} />
            <span>🎯 ข้อมูล PM (KPI)</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeSubTab === 'kpi' ? (
        <div className="space-y-6" id="pm-kpi-subtab-container">
          <PMKpiPanel />
          <div className="pt-2">
            <PMHistoryPage />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="pmplan-page-root">
      
      {/* LEFT COLUMN: Searchable machine select */}
      <div 
        id="pm-left-machine-selector" 
        className={`${isWide ? 'hidden' : 'col-span-1 lg:col-span-4'} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col h-[750px] shadow-sm transition-all duration-200`}
      >
        <div className="flex justify-between items-center mb-3 gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2 truncate">
              🏭 รายการเครื่องจักร ({pmMachines.length})
            </h3>
            <span className="text-[11px] text-cyan-700 dark:text-cyan-400 font-mono block truncate">
              {pmPlans.filter(p => pmMachineIds.includes(p.machineId)).length} แผน PM ทั้งหมด
            </span>
          </div>
          <button
            id="btn-add-pm-machine"
            type="button"
            onClick={() => {
              setShowMachinePickerModal(true);
              setPickerSearch('');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-fg text-xs font-bold rounded-xl shadow-md shadow-cyan-600/20 transition shrink-0 cursor-pointer"
            title="+ เพิ่มเครื่องจักร"
          >
            <Plus size={14} />
            <span>+ เพิ่มเครื่องจักร</span>
          </button>
        </div>
        
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
          <input
            id="pm-machine-search"
            type="text"
            placeholder="ค้นหารหัส, ชื่อเครื่อง, หรือหน้าที่..."
            value={machineSearch}
            onChange={(e) => setMachineSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1" id="pm-machine-list">
          {filteredPmMachines.length === 0 ? (
            <div className="p-6 text-center text-slate-500 dark:text-slate-300 text-xs flex flex-col items-center justify-center h-48 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
              <PackageOpen size={32} className="text-slate-400 dark:text-slate-400 mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                {pmMachines.length === 0 ? 'ยังไม่มีเครื่องจักรในรายการ PM' : 'ไม่พบเครื่องจักรที่ตรงกับคำค้นหา'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {pmMachines.length === 0 ? 'กดปุ่ม "+ เพิ่มเครื่องจักร" ด้านบนเพื่อเลือกเครื่องจากทะเบียน' : 'ลองค้นหาด้วยรหัสหรือชื่ออื่น'}
              </p>
            </div>
          ) : (
            filteredPmMachines.map(m => {
              const planCount = pmPlans.filter(p => p.machineId === m.id).length;
              const isSelected = selectedMachineId === m.id;

              return (
                <div
                  key={m.id}
                  id={`pm-mach-btn-${m.id}`}
                  onClick={() => setSelectedMachineId(m.id)}
                  className={`group relative w-full text-left p-3 rounded-xl border transition flex justify-between items-center cursor-pointer ${
                    isSelected 
                      ? 'bg-white border-2 border-cyan-600 text-slate-900 shadow-sm dark:bg-slate-900/90 dark:border-cyan-500 dark:text-cyan-400 dark:shadow-cyan-500/10 dark:hover:bg-slate-900' 
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300 dark:bg-slate-900/30 dark:border-slate-700/60 dark:hover:bg-slate-800/80 dark:hover:border-slate-500 dark:text-slate-300'
                  }`}
                >
                  <div className="min-w-0 pr-2 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-mono font-bold tracking-wider ${
                        isSelected 
                          ? 'text-cyan-700 dark:text-cyan-400' 
                          : 'text-slate-900 dark:text-slate-200'
                      }`}>
                        {m.id}
                      </span>
                      {m.lineGroup && (
                        <span className="text-[10px] bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold">
                          {m.lineGroup}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs font-semibold mt-1 truncate max-w-[160px] ${
                      isSelected 
                        ? 'text-slate-950 dark:text-slate-100' 
                        : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {m.name}
                    </p>
                    {(m.locationZone || m.locationRoom) && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {[m.locationZone, m.locationRoom].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      planCount > 0 
                        ? 'bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30' 
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {planCount} แผน
                    </span>
                    <button
                      id={`btn-remove-pm-mach-${m.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMachineToRemoveFromPM(m);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 cursor-pointer opacity-80 md:opacity-0 md:group-hover:opacity-100 transition"
                      title={`นำเครื่อง ${m.id} ออกจากรายการ PM (ไม่ลบข้อมูลในทะเบียนเครื่องจักร)`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: PM plans, interactive checklist, and actions */}
      <div className={`col-span-1 ${isWide ? 'lg:col-span-12' : 'lg:col-span-8'} flex flex-col space-y-4 h-[750px] transition-all duration-200`}>
        {/* Machine header display and top action buttons */}
        <div id="pm-right-machine-header" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 shrink-0 shadow-sm">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-300 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-400 text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg">
                {selectedMachine?.id || selectedMachineId}
              </span>
              {selectedMachine?.lineGroup && (
                <span className="bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold px-2 py-0.5 rounded-lg">
                  หน้าที่: {selectedMachine.lineGroup}
                </span>
              )}
              {selectedMachine?.locationZone && (
                <span className="text-slate-600 dark:text-slate-400 text-xs">
                  📍 {selectedMachine.locationZone} {selectedMachine.locationRoom ? `/ ${selectedMachine.locationRoom}` : ''}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              {selectedMachine?.name || 'กรุณาเลือกเครื่องจักร'}
            </h2>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            {/* Widen / Expand Toggle */}
            <button
              id="btn-toggle-pm-widen"
              onClick={() => setIsWide(!isWide)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition cursor-pointer ${
                isWide
                  ? 'bg-cyan-100 border-cyan-500 text-cyan-800 hover:bg-cyan-200 dark:bg-cyan-500/20 dark:border-cyan-500 dark:text-cyan-300 dark:hover:bg-cyan-500/30'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
              title={isWide ? 'ย่อกลับเป็น 2 คอลัมน์ (แสดงรายการเครื่องจักร)' : 'ขยายเต็มความกว้าง (ซ่อนรายการเครื่องจักร)'}
            >
              {isWide ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span>{isWide ? 'ย่อมุมมอง' : 'ขยายตาราง'}</span>
            </button>

            {/* 1. Import Excel */}
            <button
              id="btn-import-pm-excel"
              onClick={() => {
                setImportedDataPreview(null);
                setImportFileName('');
                setImportError('');
                setShowImportModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 dark:text-emerald-300 dark:border-emerald-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
              title="นำเข้าไฟล์ Excel ใบรายงาน PM ตามโครงสร้างตารางมาตรฐาน"
            >
              <Upload size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>นำเข้า Excel (ใบรายงาน PM)</span>
            </button>

            {/* 2. Download Blank Template */}
            <button
              id="btn-download-pm-template"
              onClick={() => exportPMTemplateExcel(selectedMachine)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-700/50 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
              title="ดาวน์โหลดไฟล์แม่แบบ Excel สำหรับนำไปกรอกหรือแก้ไขแล้วนำเข้ากลับมา"
            >
              <FileSpreadsheet size={14} className="text-amber-500 dark:text-amber-400" />
              <span>ดาวน์โหลดแม่แบบ Excel</span>
            </button>

            {/* 3. Export Excel for current active plan or all */}
            <button
              id="btn-export-pm-excel"
              onClick={() => {
                if (activeMachinePlans.length === 0) {
                  alert('ไม่พบแผนงาน PM สำหรับเครื่องจักรนี้');
                  return;
                }
                // Export first or primary plan
                exportPMReportToExcel(activeMachinePlans[0], selectedMachine);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-cyan-800 hover:bg-slate-50 hover:border-cyan-400 dark:bg-slate-900 dark:border-slate-700 dark:text-cyan-300 dark:hover:bg-slate-800 dark:hover:border-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
              title="ส่งออกใบรายงาน PM เป็นไฟล์ Excel (.xlsx) ตามแบบฟอร์ม"
            >
              <Download size={14} className="text-cyan-600 dark:text-cyan-400" />
              <span>ส่งออกใบรายงาน (Excel)</span>
            </button>

            {/* 4. Copy from another machine */}
            <button
              id="btn-copy-pm-plans"
              onClick={() => {
                setCopySourceMachineId('');
                setSelectedPlansToCopy([]);
                setShowCopyModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              title="คัดลอกแผน PM จากเครื่องจักรอื่นมาที่เครื่องนี้"
            >
              <Copy size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>คัดลอกแผน</span>
            </button>

            {/* 5. Add New PM Plan */}
            <button
              id="btn-add-pm-plan"
              onClick={handleOpenNewForm}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl text-xs transition cursor-pointer shadow-md shadow-cyan-500/10"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>+ เพิ่มงานแผน PM ใหม่</span>
            </button>
          </div>
        </div>

        {/* List of plans with Interactive Checklist */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1" id="pm-plan-container">
          {activeMachinePlans.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-300 h-full flex flex-col justify-center items-center shadow-sm">
              <PackageOpen size={48} className="text-slate-400 dark:text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">ยังไม่มีแผนบำรุงรักษาเชิงป้องกัน (PM) สำหรับเครื่องนี้</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md">
                คุณสามารถกด <b>"+ เพิ่มงานแผน PM ใหม่"</b> หรือกด <b>"นำเข้า Excel"</b> เพื่อนำเข้าใบรายงาน PM ที่มีเช็คลิสต์และเกณฑ์มาตรฐานได้ทันที
              </p>
            </div>
          ) : (
            activeMachinePlans.map(plan => {
              const expanded = isPlanExpanded(plan.id);
              const totalSteps = plan.steps?.length || 0;
              const completedSteps = (plan.steps || []).filter(s => s.done).length;
              const abnormalSteps = (plan.steps || []).filter(s => s.result === 'ไม่ปกติ').length;
              const percentDone = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

              return (
                <div 
                  key={plan.id} 
                  id={`pm-plan-card-${plan.id}`}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-lg transition-all"
                >
                  {/* Card Header */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button 
                        onClick={() => togglePlanExpanded(plan.id)}
                        className="mt-1 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-fg transition"
                        title={expanded ? 'ยุบมุมมอง' : 'ขยายเช็คลิสต์'}
                      >
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            plan.frequency === 'รายวัน' ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400' :
                            plan.frequency === 'รายสัปดาห์' ? 'bg-teal-500/15 border-teal-500/30 text-teal-400' :
                            plan.frequency === 'รายเดือน' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' :
                            'bg-rose-500/15 border-rose-500/30 text-rose-400'
                          }`}>
                            รอบ: {plan.frequency}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                            <Clock size={12} className="text-cyan-600 dark:text-cyan-400" /> รวม {plan.ttm || 0} นาที
                          </span>
                          {plan.lastCheckedDate && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                              <Calendar size={12} className="text-emerald-600 dark:text-emerald-400" /> ตรวจล่าสุด: {plan.lastCheckedDate}
                            </span>
                          )}
                          {plan.inspectorTech && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <User size={12} className="text-cyan-600 dark:text-cyan-400" /> ช่าง: {plan.inspectorTech}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={plan.title}>
                          {plan.title}
                        </h3>
                      </div>
                    </div>

                    {/* Checklist Progress & Header Actions */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0">
                      {/* Progress bar */}
                      <div className="flex flex-col items-end min-w-[130px]">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">เช็คลิสต์:</span>
                          <span className={`font-mono font-bold ${percentDone === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-700 dark:text-cyan-400'}`}>
                            {completedSteps}/{totalSteps} ({percentDone}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-900 h-2 rounded-full overflow-hidden mt-1 border border-slate-300 dark:border-slate-700/60">
                          <div 
                            className={`h-full transition-all duration-300 ${percentDone === 100 ? 'bg-emerald-500' : 'bg-cyan-500'}`}
                            style={{ width: `${percentDone}%` }}
                          />
                        </div>
                      </div>

                      {/* Header quick buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`btn-widen-plan-${plan.id}`}
                          onClick={() => setIsWide(!isWide)}
                          className={`p-1.5 border rounded-lg text-xs transition cursor-pointer ${
                            isWide
                              ? 'bg-cyan-100 border-cyan-500 text-cyan-800 hover:bg-cyan-200 dark:bg-cyan-500/20 dark:border-cyan-500 dark:text-cyan-300 dark:hover:bg-cyan-500/30'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                          title={isWide ? 'ย่อกลับเป็น 2 คอลัมน์ (แสดงรายการเครื่องจักร)' : 'ขยายเต็มความกว้าง (ซ่อนรายการเครื่องจักร)'}
                        >
                          {isWide ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                        <button
                          onClick={() => exportPMReportToExcel(plan, selectedMachine)}
                          className="p-1.5 bg-white border border-slate-300 hover:border-cyan-500 text-cyan-700 dark:bg-slate-900 dark:border-slate-700 dark:text-cyan-300 rounded-lg text-xs transition cursor-pointer"
                          title="ส่งออกใบร่างนี้เป็น Excel"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenEditForm(plan)}
                          className="p-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 rounded-lg text-xs transition cursor-pointer"
                          title="แก้ไขรายละเอียดแผน"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(plan.id)}
                          className="p-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/30 dark:hover:bg-rose-500 dark:text-rose-400 dark:hover:text-fg rounded-lg text-xs transition cursor-pointer"
                          title="ลบแผนงาน PM นี้"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Checklist Table Body (Expanded) */}
                  {expanded && (
                    <div className="p-4 space-y-4">
                      
                      {/* Top Checklist Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">การจัดการเช็คลิสต์:</span>
                          <button
                            onClick={() => handleMarkAllDone(plan.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-300 dark:border-emerald-500/30 rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            <Check size={12} />
                            <span>ติ๊กทำแล้วทั้งหมด</span>
                          </button>
                          <button
                            onClick={() => handleResetChecklist(plan.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-700 rounded-lg text-[11px] transition cursor-pointer"
                          >
                            <RefreshCw size={11} />
                            <span>รีเซ็ตติ๊ก</span>
                          </button>
                        </div>

                        {/* Add Step Button (+ เพิ่มการทำ PM) */}
                        <div className="flex items-center gap-2">
                          {abnormalSteps > 0 && (
                            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/15 border border-rose-300 dark:border-rose-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <AlertTriangle size={12} /> พบผิดปกติ {abnormalSteps} รายการ
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenAddStepModal(plan.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-500/20 dark:hover:bg-cyan-500/30 dark:text-cyan-300 dark:border-cyan-500/30 rounded-lg text-[11px] font-bold transition cursor-pointer"
                            title="เพิ่มหัวข้อ/ขั้นตอนการบำรุงรักษาในแผนนี้"
                          >
                            <Plus size={12} strokeWidth={2.5} />
                            <span>+ เพิ่มข้อตรวจ PM ในแผนนี้</span>
                          </button>
                        </div>
                      </div>

                      {/* Checklist Table */}
                      <div className="overflow-x-auto rounded-xl border border-border dark:border-slate-700/80 bg-surface dark:bg-slate-900/50">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-900 text-fg-muted dark:text-slate-400 border-b border-border dark:border-slate-700/80 text-[11px] uppercase tracking-wider font-semibold">
                              <th className="py-2.5 px-3 text-center w-12">ลำดับ</th>
                              <th className="py-2.5 px-3 text-center w-24">ติ๊กทำแล้ว</th>
                              <th className="py-2.5 px-3 min-w-[180px]">หัวข้อ PM</th>
                              <th className="py-2.5 px-3 min-w-[110px]">วิธีการ</th>
                              <th className="py-2.5 px-3 min-w-[200px]">มาตรฐาน</th>
                              <th className="py-2.5 px-3 text-center min-w-[140px]">ผลการ PM</th>
                              <th className="py-2.5 px-3 min-w-[180px]">ค่าที่วัดได้ / สิ่งที่ผิดปกติ</th>
                              <th className="py-2.5 px-3 min-w-[130px]">หมายเหตุ</th>
                              <th className="py-2.5 px-2 text-center w-16">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border dark:divide-slate-800 text-fg dark:text-slate-300">
                            {(plan.steps || []).length === 0 ? (
                              <tr>
                                <td colSpan={9} className="py-8 text-center text-slate-500 dark:text-slate-300">
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <PackageOpen size={28} className="text-slate-400 dark:text-slate-400" />
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">ยังไม่มีข้อตรวจในแผนนี้ (สามารถกดเพิ่มข้อตรวจใหม่ได้ตลอดเวลา)</p>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAddStepModal(plan.id)}
                                      className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                                    >
                                      <Plus size={13} strokeWidth={2.5} />
                                      <span>+ เพิ่มข้อตรวจ PM ในแผนนี้</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              (plan.steps || []).map((step, idx) => {
                              const isDone = !!step.done;
                              const isNormal = step.result === 'ปกติ';
                              const isAbnormal = step.result === 'ไม่ปกติ';

                              return (
                                <tr 
                                  key={step.id || idx}
                                  className={`transition-colors ${
                                    isAbnormal ? 'bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/30' :
                                    isDone ? 'bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900/60' :
                                    'hover:bg-slate-100 dark:hover:bg-slate-800/40'
                                  }`}
                                >
                                  {/* 1. Item No */}
                                  <td className="py-2.5 px-3 text-center font-mono text-fg-muted dark:text-slate-400 font-bold">
                                    {step.itemNo !== undefined ? step.itemNo : (idx + 1)}
                                  </td>

                                  {/* 2. Checkbox: ติ๊กสิ่งที่ทำแล้ว */}
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStepDone(plan.id, idx)}
                                      className={`inline-flex items-center justify-center p-1 rounded-lg transition ${
                                        isDone 
                                          ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm' 
                                          : 'border border-border dark:border-slate-600 hover:border-cyan-500 text-fg-muted dark:text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400'
                                      }`}
                                      title={isDone ? 'ทำแล้ว (คลิกเพื่อยกเลิก)' : 'คลิกเพื่อติ๊กว่าทำแล้ว'}
                                    >
                                      {isDone ? <CheckSquare size={16} strokeWidth={2.5} /> : <Square size={16} />}
                                    </button>
                                  </td>

                                  {/* 3. Title */}
                                  <td className="py-2.5 px-3">
                                    <span className={`font-medium ${isDone && !isAbnormal ? 'text-fg-muted dark:text-slate-200' : 'text-fg dark:text-slate-100'}`}>
                                      {step.title}
                                    </span>
                                    {step.stdTime && (
                                      <span className="block text-[10px] text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">
                                        ⏱ {step.stdTime} นาที
                                      </span>
                                    )}
                                  </td>

                                   {/* 4. Method */}
                                  <td className="py-2.5 px-3 text-fg dark:text-slate-300">
                                    <span className="text-[11px] bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700/60 px-2 py-0.5 rounded text-slate-900 dark:text-slate-100 font-semibold">
                                      {step.method || 'ดูด้วยสายตา'}
                                    </span>
                                  </td>

                                  {/* 5. Standard */}
                                  <td className="py-2.5 px-3 text-fg dark:text-slate-200 text-xs">
                                    {step.standard || '-'}
                                  </td>

                                  {/* 6. PM Result Toggles */}
                                  <td className="py-2.5 px-3 text-center">
                                    <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-border dark:border-slate-800">
                                      <button
                                        type="button"
                                        onClick={() => handleSetStepResult(plan.id, idx, 'ปกติ')}
                                        className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition ${
                                          isNormal 
                                            ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm' 
                                            : 'text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-300'
                                        }`}
                                      >
                                        ปกติ
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSetStepResult(plan.id, idx, 'ไม่ปกติ')}
                                        className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition ${
                                          isAbnormal 
                                            ? 'bg-rose-600 dark:bg-rose-500 text-white shadow-sm' 
                                            : 'text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-300'
                                        }`}
                                      >
                                        ไม่ปกติ
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSetStepResult(plan.id, idx, 'ยังไม่ตรวจ')}
                                        className={`px-1.5 py-0.5 rounded text-[10px] transition ${
                                          step.result === 'ยังไม่ตรวจ' 
                                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold' 
                                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                        title="ยังไม่ตรวจ"
                                      >
                                        -
                                      </button>
                                    </div>
                                  </td>

                                  {/* 7. Abnormal detail / measurements */}
                                  <td className="py-2.5 px-3">
                                    <input
                                      type="text"
                                      placeholder="บันทึกค่าที่วัดได้ หรือสิ่งผิดปกติ..."
                                      value={step.abnormalDetail || ''}
                                      onChange={(e) => handleUpdateStepField(plan.id, idx, 'abnormalDetail', e.target.value)}
                                      className={`w-full bg-surface dark:bg-slate-950/80 border rounded-lg px-2.5 py-1 text-xs text-fg placeholder:text-fg-muted/60 focus:outline-none focus:border-cyan-500 ${
                                        isAbnormal ? 'border-rose-300 text-rose-700 dark:border-rose-500/50 dark:text-rose-200' : 'border-border dark:border-slate-700/80'
                                      }`}
                                    />
                                  </td>

                                  {/* 8. Remark */}
                                  <td className="py-2.5 px-3">
                                    <input
                                      type="text"
                                      placeholder="หมายเหตุ (เช่น เบอร์อะไหล่)..."
                                      value={step.remark || ''}
                                      onChange={(e) => handleUpdateStepField(plan.id, idx, 'remark', e.target.value)}
                                      className="w-full bg-surface dark:bg-slate-950/80 border border-border dark:border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-fg placeholder:text-fg-muted/60 focus:outline-none focus:border-cyan-500"
                                    />
                                  </td>

                                  {/* 9. Manage: Edit / Delete step (ลดการทำ PM ข้อนี้) */}
                                  <td className="py-2.5 px-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditStepModal(plan.id, idx)}
                                        className="p-1 text-fg-muted hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                                        title="แก้ไขข้อความข้อนี้"
                                      >
                                        <Edit3 size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteStepFromPlan(plan.id, idx)}
                                        className="p-1 rounded text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer transition"
                                        title="ลดการทำ PM (ลบข้อนี้ออกจากแผน)"
                                      >
                                        <Trash2 size={12} />
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

                      {/* Footer Info of the Plan (Spare parts, Signatures) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                        {/* Spare parts */}
                        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <Wrench size={12} className="text-amber-500 dark:text-amber-400" />
                              รายการอะไหล่ที่เตรียมแก้ไข:
                            </span>
                            {plan.sparePartsQty && (
                              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono font-bold">
                                จำนวน: {plan.sparePartsQty}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-800 dark:text-slate-200">
                            {plan.spareParts || <span className="text-slate-500 dark:text-slate-400 italic">ไม่มีระบุอะไหล่ล่วงหน้า</span>}
                          </p>
                        </div>

                        {/* Signatures */}
                        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <ShieldCheck size={12} className="text-cyan-600 dark:text-cyan-400" />
                            ผู้ตรวจรับรองการทำ PM:
                          </span>
                          <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                            <div>
                              <span className="text-slate-500 block text-[9.5px]">ผู้ทำการ PM:</span>
                              <span className="text-slate-800 dark:text-slate-200 font-medium">{plan.inspectorTech || '-'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9.5px]">ผู้รับทราบ (ฝ่ายผลิต):</span>
                              <span className="text-slate-800 dark:text-slate-200 font-medium">{plan.acknowledgingDept || '-'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9.5px]">ผู้ตรวจสอบ (หัวหน้า):</span>
                              <span className="text-slate-800 dark:text-slate-200 font-medium">{plan.supervisorName || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: EXCEL IMPORT MODAL                          */}
      {/* ---------------------------------------------------- */}
      {showImportModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div id="pm-excel-import-modal" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-xs text-slate-900 dark:text-slate-200">
            
            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600 dark:text-emerald-400" size={18} />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  📥 นำเข้าใบรายงาน PM จากไฟล์ Excel (.xlsx / .xls)
                </h3>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="px-2.5 py-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-fg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg font-bold transition"
              >
                &times; ปิด
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* Instructions banner */}
              <div className="bg-emerald-50/50 dark:bg-[#050a14] border border-emerald-200 dark:border-slate-700 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 text-xs">
                    <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
                    รองรับโครงสร้างตารางตามแบบฟอร์ม "ใบรายงาน Preventive Maintenance (PM)"
                  </h4>
                  <button
                    type="button"
                    onClick={() => exportPMTemplateExcel(selectedMachine)}
                    className="text-[11px] text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300 underline flex items-center gap-1 font-semibold"
                  >
                    <Download size={11} /> ดาวน์โหลดแม่แบบตัวอย่าง (.xlsx)
                  </button>
                </div>
                <p className="text-slate-700 dark:text-slate-400 text-[11.5px] leading-relaxed">
                  ระบบสามารถอ่านหัวข้อ, วิธีการ, เกณฑ์มาตรฐาน, ความถี่, ผลการตรวจ (ปกติ/ไม่ปกติ), รายละเอียดสิ่งที่ผิดปกติ/ค่าที่วัดได้, หมายเหตุ, รายการอะไหล่ และผู้ทำการ PM ได้โดยอัตโนมัติ
                </p>
              </div>

              {/* Upload Input */}
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 dark:border-slate-700 dark:hover:border-emerald-500/60 rounded-xl p-6 text-center bg-slate-50/80 dark:bg-slate-900/40 transition">
                <input
                  type="file"
                  id="excel-file-upload-input"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label 
                  htmlFor="excel-file-upload-input" 
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <Upload size={32} className="text-emerald-600 dark:text-emerald-400 animate-bounce" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    คลิกเพื่อเลือกไฟล์ Excel หรือลากไฟล์มาวางที่นี่
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    รองรับไฟล์ .xlsx, .xls, .csv (เช่น ใบรายงาน PM เครื่องหั่นผัก, มอเตอร์ ฯลฯ)
                  </span>
                </label>

                {importFileName && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 rounded-lg text-xs font-mono font-bold">
                    <FileText size={13} /> {importFileName}
                  </div>
                )}
              </div>

              {importError && (
                <div className="bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle size={15} /> {importError}
                </div>
              )}

              {/* Machine Assignment Options */}
              <div 
                id="pm-import-machine-assignment-box" 
                className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="opt-import-curr-machine"
                    checked={importSelectedMachineOnly}
                    onChange={(e) => setImportSelectedMachineOnly(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500/20"
                  />
                  <label htmlFor="opt-import-curr-machine" className="font-bold text-slate-900 dark:text-slate-100 text-xs cursor-pointer">
                    นำเข้าลงในเครื่องจักรที่เลือกปัจจุบัน: <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">{selectedMachine?.id}</span> <span className="text-slate-700 dark:text-slate-300">({selectedMachine?.name})</span>
                  </label>
                </div>
                <p className="text-[11.5px] text-slate-700 dark:text-slate-300 pl-5 font-medium leading-normal">
                  หากติ๊กถูก ระบบจะนำเข้าแผนนี้ลงเครื่องจักรที่กำลังเลือกอยู่ แม้ในไฟล์จะระบุรหัสเครื่องจักรอื่นไว้ก็ตาม
                </p>
              </div>

              {/* Preview Table of Parsed Excel Data */}
              {importedDataPreview && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-200">
                      พรีวิวข้อมูลที่จะนำเข้า: <span className="text-cyan-700 dark:text-cyan-400 font-mono font-bold">{importedDataPreview.steps.length} ขั้นตอน</span>
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                      เครื่องจักรในไฟล์: {importedDataPreview.machineId} ({importedDataPreview.machineName})
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#050a14]">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                          <th className="py-2 px-2.5 text-center w-10">ลำดับ</th>
                          <th className="py-2 px-3">หัวข้อ PM</th>
                          <th className="py-2 px-2.5">วิธีการ</th>
                          <th className="py-2 px-3">มาตรฐาน</th>
                          <th className="py-2 px-2.5 text-center">ผลการ PM</th>
                          <th className="py-2 px-3">ค่าที่วัดได้/สิ่งที่ผิดปกติ</th>
                          <th className="py-2 px-2.5">หมายเหตุ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-300">
                        {importedDataPreview.steps.map((step, sIdx) => (
                          <tr key={sIdx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                            <td className="py-1.5 px-2.5 text-center font-mono text-slate-600 dark:text-slate-400">
                              {step.itemNo !== undefined && step.itemNo !== '' ? step.itemNo : ''}
                            </td>
                            <td className="py-1.5 px-3 font-medium text-slate-900 dark:text-slate-200">{step.title}</td>
                            <td className="py-1.5 px-2.5 text-slate-700 dark:text-slate-400">{step.method}</td>
                            <td className="py-1.5 px-3 text-slate-700 dark:text-slate-300">{step.standard}</td>
                            <td className="py-1.5 px-2.5 text-center">
                              {step.result === 'ปกติ' ? (
                                <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-transparent rounded text-[10px] font-bold">ปกติ</span>
                              ) : step.result === 'ไม่ปกติ' ? (
                                <span className="px-1.5 py-0.2 bg-rose-50 dark:bg-rose-500/20 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-transparent rounded text-[10px] font-bold">ไม่ปกติ</span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">-</span>
                              )}
                            </td>
                            <td className="py-1.5 px-3 text-slate-700 dark:text-slate-400">{step.abnormalDetail || '-'}</td>
                            <td className="py-1.5 px-2.5 text-slate-700 dark:text-slate-400">{step.remark || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {importedDataPreview.spareParts && (
                    <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-2.5 rounded-lg">
                      <b>รายการอะไหล่:</b> {importedDataPreview.spareParts} {importedDataPreview.sparePartsQty ? `(${importedDataPreview.sparePartsQty})` : ''}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700/80 p-4 flex justify-between items-center">
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                {importedDataPreview ? `พร้อมนำเข้า ${importedDataPreview.steps.length} รายการ` : 'กรุณาอัปโหลดไฟล์ Excel'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={!importedDataPreview}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 disabled:from-slate-200 disabled:to-slate-200 dark:disabled:from-slate-700 dark:disabled:to-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 text-slate-950 font-black rounded-lg transition shadow-lg shadow-emerald-500/10 text-xs cursor-pointer"
                >
                  📥 บันทึกนำเข้าสู่ระบบ
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: ADD / EDIT SINGLE STEP MODAL (เพิ่ม/ลด PM)   */}
      {/* ---------------------------------------------------- */}
      {stepModalPlanId && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl text-xs text-slate-900 dark:text-slate-200">
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center">
              <h3 className="font-bold text-cyan-800 dark:text-cyan-400 text-sm">
                {editingStepIndex !== null ? '✏️ แก้ไขข้อตรวจวัด PM' : '➕ เพิ่มข้อตรวจวัด PM (เพิ่มการทำ PM)'}
              </h3>
              <button 
                onClick={() => setStepModalPlanId(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-fg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveStepModal} className="p-5 space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1">
                  <label className="text-slate-700 dark:text-slate-400 text-[11px] font-bold">ลำดับที่</label>
                  <input
                    type="number"
                    value={stepForm.itemNo || ''}
                    onChange={(e) => setStepForm(prev => ({ ...prev, itemNo: Number(e.target.value) || 1 }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-fg font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-slate-700 dark:text-slate-400 text-[11px] font-bold">วิธีการตรวจ</label>
                  <input
                    type="text"
                    placeholder="เช่น ดูด้วยสายตา, เครื่องมือวัด, มือ สายตา"
                    value={stepForm.method || ''}
                    onChange={(e) => setStepForm(prev => ({ ...prev, method: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-fg focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-400 text-[11px] font-bold">หัวข้อ PM / สิ่งที่ต้องตรวจ*</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ตรวจเช็คสภาพใบมีด, ตรวจวัดค่าแรงดัน"
                  value={stepForm.title || ''}
                  onChange={(e) => setStepForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-fg focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-400 text-[11px] font-bold">มาตรฐาน (เกณฑ์ที่ยอมรับได้)</label>
                <textarea
                  rows={2}
                  placeholder="เช่น โครงสร้างสมบูรณ์ ไม่ชำรุด, แรงดัน 200-240V 3 เฟส สมดุล"
                  value={stepForm.standard || ''}
                  onChange={(e) => setStepForm(prev => ({ ...prev, standard: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-fg focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-400 text-[11px] font-bold">เวลามาตรฐาน (นาที)</label>
                  <input
                    type="number"
                    min={1}
                    value={stepForm.stdTime || 10}
                    onChange={(e) => setStepForm(prev => ({ ...prev, stdTime: Number(e.target.value) || 10 }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-fg font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-400 text-[11px] font-bold">ความถี่</label>
                  <input
                    type="text"
                    placeholder="เช่น 1 เดือน/ครั้ง, 1 สัปดาห์/ครั้ง"
                    value={stepForm.frequency || '1 เดือน/ครั้ง'}
                    onChange={(e) => setStepForm(prev => ({ ...prev, frequency: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-fg focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-400 text-[11px] font-bold">หมายเหตุ (เช่น เบอร์ลูกปืน, ข้อควรระวัง)</label>
                <input
                  type="text"
                  placeholder="เช่น ลูกปืนมีด 6006 2 ตลับ"
                  value={stepForm.remark || ''}
                  onChange={(e) => setStepForm(prev => ({ ...prev, remark: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-fg focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStepModalPlanId(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition"
                >
                  บันทึกข้อตรวจ PM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: FULL ADD / EDIT PM PLAN MODAL               */}
      {/* ---------------------------------------------------- */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-sm p-4">
          <div id="pm-form-modal" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-xs text-slate-900 dark:text-slate-200">
            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4.5 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold text-cyan-800 dark:text-cyan-400">
                {editingPlanId ? '📝 แก้ไขข้อมูลแผน PM' : '➕ เพิ่มแผนและใบรายงาน PM ใหม่'}
              </h3>
              <button 
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl font-medium focus:outline-none"
              >
                &times;
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePlanForm} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {formError && (
                <div className="bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 p-2.5 rounded-lg flex items-center gap-2">
                  <AlertTriangle size={14} /> {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="col-span-1 md:col-span-8 space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">ชื่อหัวข้องาน / ชื่อใบรายงาน PM*</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ใบรายงาน Preventive Maintenance (PM) - เครื่องหั่นผัก"
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-fg focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="col-span-1 md:col-span-4 space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">ความถี่ (Frequency)*</label>
                  <select
                    value={planFrequency}
                    onChange={(e) => setPlanFrequency(e.target.value as PMFrequency)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-fg focus:outline-none focus:border-cyan-500"
                  >
                    <option value="รายวัน">รายวัน (Daily)</option>
                    <option value="รายสัปดาห์">รายสัปดาห์ (Weekly)</option>
                    <option value="รายเดือน">รายเดือน (Monthly)</option>
                    <option value="รายปี">รายปี (Yearly)</option>
                  </select>
                </div>
              </div>

              {/* Steps dynamic list */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-700 dark:text-slate-300">ขั้นตอนการบำรุงรักษา ({planSteps.length} ขั้นตอน)*</label>
                  <button
                    type="button"
                    onClick={() => {
                      setPlanSteps(prev => [
                        ...prev, 
                        { itemNo: prev.length + 1, title: '', method: 'ดูด้วยสายตา', standard: '', frequency: '1 เดือน/ครั้ง', stdTime: 10, result: 'ยังไม่ตรวจ', done: false }
                      ]);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold bg-cyan-50 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 hover:bg-cyan-600 hover:text-white dark:hover:bg-cyan-500 dark:hover:text-slate-950 px-2.5 py-1 rounded-lg transition"
                  >
                    <Plus size={12} /> เพิ่มขั้นตอน
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {planSteps.map((st, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-700 dark:text-cyan-400 font-bold px-1.5">{idx + 1}</span>
                        <input
                          type="text"
                          required
                          placeholder="หัวข้อ PM / รายละเอียดการตรวจ..."
                          value={st.title}
                          onChange={(e) => {
                            const updated = [...planSteps];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setPlanSteps(updated);
                          }}
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-fg focus:outline-none focus:border-cyan-500"
                        />
                        <div className="flex items-center gap-1 shrink-0 w-24">
                          <input
                            type="number"
                            min={1}
                            value={st.stdTime || 10}
                            onChange={(e) => {
                              const updated = [...planSteps];
                              updated[idx] = { ...updated[idx], stdTime: Number(e.target.value) || 10 };
                              setPlanSteps(updated);
                            }}
                            className="w-14 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-1.5 py-1 text-slate-900 dark:text-fg text-center font-mono"
                          />
                          <span className="text-[10px] text-slate-500">นาที</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPlanSteps(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition"
                          title="ลบขั้นตอนนี้"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pl-7">
                        <input
                          type="text"
                          placeholder="วิธีการ (เช่น ดูด้วยสายตา, เครื่องมือวัด)"
                          value={st.method || ''}
                          onChange={(e) => {
                            const updated = [...planSteps];
                            updated[idx] = { ...updated[idx], method: e.target.value };
                            setPlanSteps(updated);
                          }}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-800 dark:text-slate-300"
                        />
                        <input
                          type="text"
                          placeholder="มาตรฐาน (เช่น โครงสร้างสมบูรณ์, 200-240V)"
                          value={st.standard || ''}
                          onChange={(e) => {
                            const updated = [...planSteps];
                            updated[idx] = { ...updated[idx], standard: e.target.value };
                            setPlanSteps(updated);
                          }}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-800 dark:text-slate-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spare parts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">รายการอะไหล่ที่เตรียมแก้ไข</label>
                  <input
                    type="text"
                    placeholder="เช่น ลูกปืนมีด 6006, ลูกปืนเฟือง 6003"
                    value={planSpareParts}
                    onChange={(e) => setPlanSpareParts(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-fg"
                  />
                </div>
                <div className="col-span-1 space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">จำนวนอะไหล่</label>
                  <input
                    type="text"
                    placeholder="เช่น 2 ตลับ, 4 ชิ้น"
                    value={planSparePartsQty}
                    onChange={(e) => setPlanSparePartsQty(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-fg"
                  />
                </div>
              </div>

              {/* Signatures & Technicians */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">ผู้ทำการ PM (ทีมช่าง)</label>
                  <input
                    type="text"
                    placeholder="เช่น สมศักดิ์ ช่างเครื่อง"
                    value={planInspectorTech}
                    onChange={(e) => setPlanInspectorTech(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-fg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">ผู้รับทราบ (ฝ่ายผลิต)</label>
                  <input
                    type="text"
                    placeholder="เช่น วิชัย หัวหน้ากะผลิต"
                    value={planAcknowledgingDept}
                    onChange={(e) => setPlanAcknowledgingDept(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-fg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">ผู้ตรวจสอบ (หัวหน้า PM)</label>
                  <input
                    type="text"
                    placeholder="เช่น ธีระพงษ์ วิศวกร PM"
                    value={planSupervisorName}
                    onChange={(e) => setPlanSupervisorName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-fg"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700/80 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition"
                >
                  บันทึกแผน PM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: DELETE PLAN CONFIRMATION (ลดการทำ PM)       */}
      {/* ---------------------------------------------------- */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl text-xs text-slate-900 dark:text-slate-200">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-500 border-b border-slate-200 dark:border-slate-800 pb-3">
              <AlertTriangle size={22} />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">ยืนยันการลบแผน PM (ลดการทำ PM)</h3>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
              คุณแน่ใจว่าต้องการลบแผนงานและใบรายงาน PM นี้ใช่หรือไม่? ขั้นตอนและรายการตรวจทั้งหมดจะถูกนำออกอย่างสมบูรณ์
            </p>
            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg transition font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setPmPlans(prev => prev.filter(p => p.id !== deleteConfirmId));
                  setDeleteConfirmId(null);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-4.5 py-2 rounded-lg transition"
              >
                ยืนยันลบแผน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 5: COPY PM PLANS FROM ANOTHER MACHINE          */}
      {/* ---------------------------------------------------- */}
      {showCopyModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-sm p-4">
          <div id="pm-copy-modal" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl text-xs text-slate-900 dark:text-slate-200">
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="text-cyan-700 dark:text-cyan-400" size={16} />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">คัดลอกแผน PM ข้ามจากเครื่องจักรอื่น</h3>
              </div>
              <button 
                onClick={() => setShowCopyModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-fg text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300 p-3 rounded-xl">
                เป้าหมายการคัดลอก: <span className="font-mono font-bold text-slate-900 dark:text-fg">{selectedMachine?.id}</span> ({selectedMachine?.name})
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-600 dark:text-slate-400 font-bold uppercase">เลือกเครื่องจักรต้นทาง</label>
                <select
                  value={copySourceMachineId}
                  onChange={(e) => {
                    setCopySourceMachineId(e.target.value);
                    setSelectedPlansToCopy([]);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-fg focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- เลือกเครื่องจักรต้นทาง --</option>
                  {machines
                    .filter(m => m.id !== selectedMachineId)
                    .map(m => {
                      const plansOfThis = pmPlans.filter(p => p.machineId === m.id);
                      return (
                        <option key={m.id} value={m.id} disabled={plansOfThis.length === 0}>
                          {m.id} - {m.name} ({plansOfThis.length} แผน)
                        </option>
                      );
                    })}
                </select>
              </div>

              {copySourceMachineId && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                    <span>เลือกแผนที่จะคัดลอก ({sourceMachinePlans.length} แผน):</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPlansToCopy.length === sourceMachinePlans.length) {
                          setSelectedPlansToCopy([]);
                        } else {
                          setSelectedPlansToCopy(sourceMachinePlans.map(p => p.id));
                        }
                      }}
                      className="text-cyan-700 dark:text-cyan-400 hover:underline font-semibold"
                    >
                      {selectedPlansToCopy.length === sourceMachinePlans.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                    </button>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 max-h-48 overflow-y-auto">
                    {sourceMachinePlans.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => handleToggleSelectPlanToCopy(p.id)}
                        className="p-3 flex items-start gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition select-none"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlansToCopy.includes(p.id)}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500/20"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 dark:text-slate-200 truncate">{p.title}</p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-500 mt-0.5">
                            ความถี่: {p.frequency} • {p.steps?.length || 0} ขั้นตอน • {p.ttm} นาที
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700/80 p-4 flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                เลือกแล้ว {selectedPlansToCopy.length} รายการ
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCopyModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleExecuteCopy}
                  disabled={selectedPlansToCopy.length === 0}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white font-bold rounded-lg transition"
                >
                  คัดลอกและบันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 6: REMOVE MACHINE FROM PM CONFIRMATION         */}
      {/* ---------------------------------------------------- */}
      {machineToRemoveFromPM && (
        <div 
          id="modal-remove-pm-machine-confirm"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-sm p-4"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-xs text-slate-900 dark:text-slate-200">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-500 border-b border-slate-200 dark:border-slate-800 pb-3">
              <AlertTriangle size={22} className="shrink-0" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">นำเครื่องจักรออกจากรายการ PM</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">นำออกจากรายการ PM เท่านั้น (ทะเบียนเครื่องจักรไม่ได้รับผลกระทบ)</p>
              </div>
            </div>
            
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p className="leading-relaxed">
                คุณแน่ใจหรือไม่ว่าต้องการนำเครื่องจักร <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">{machineToRemoveFromPM.id}</span> ({machineToRemoveFromPM.name}) ออกจากรายการ PM หน้านี้?
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                  <Check size={14} className="shrink-0" />
                  <span>ข้อมูลในทะเบียนเครื่องจักรจะยังคงอยู่สมบูรณ์ ไม่มีการลบ</span>
                </div>
                <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 font-medium">
                  <Check size={14} className="shrink-0" />
                  <span>สามารถกด "+ เพิ่มเครื่องจักร" เพื่อนำกลับเข้ามาในรายการ PM ได้ตลอดเวลา</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                id="btn-cancel-remove-pm-machine"
                onClick={() => setMachineToRemoveFromPM(null)}
                className="border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl transition cursor-pointer font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="btn-confirm-remove-pm-machine"
                onClick={() => handleConfirmRemoveMachineFromPM(machineToRemoveFromPM.id)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-4.5 py-2 rounded-xl transition shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                ยืนยันนำออก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION FOR RESETTING PM CHECKLIST */}
      {resetChecklistPlanId && (
        <div 
          id="modal-reset-pm-checklist-confirm"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-100"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-xs text-slate-900 dark:text-slate-200">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500 border-b border-slate-200 dark:border-slate-800 pb-3">
              <RefreshCw size={22} className="shrink-0" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">รีเซ็ตผลการตรวจเช็คลิสต์</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">ล้างเครื่องหมายติ๊กทำแล้วและผลตรวจทั้งหมดในแผนนี้</p>
              </div>
            </div>
            
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p className="leading-relaxed">
                คุณต้องการรีเซ็ตผลการตรวจและเครื่องหมายเช็คลิสต์ทั้งหมดในแผนนี้ใช่หรือไม่?
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                (ทุกหัวข้อย่อยจะถูกเปลี่ยนสถานะกลับเป็น "ยังไม่ตรวจ")
              </p>
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                id="btn-cancel-reset-checklist"
                onClick={() => setResetChecklistPlanId(null)}
                className="border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl transition cursor-pointer font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="btn-confirm-reset-checklist"
                onClick={confirmResetChecklist}
                className="bg-amber-600 hover:bg-amber-500 text-white font-extrabold px-4.5 py-2 rounded-xl transition shadow-lg shadow-amber-600/20 cursor-pointer"
              >
                ยืนยันรีเซ็ต
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 7: ADD MACHINE TO PM PICKER (FROM REGISTRY)    */}
      {/* ---------------------------------------------------- */}
      {showMachinePickerModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-sm p-4">
          <div id="modal-pm-machine-picker" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl text-xs text-slate-900 dark:text-slate-200">
            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 rounded-xl border border-cyan-200 dark:border-cyan-500/20">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                    เลือกเครื่องจักรเข้าสู่รายการ PM
                    <span className="text-[10px] bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300 px-2 py-0.5 rounded-full font-medium">
                      เหลือให้เลือก {availableRegistryMachines.length} เครื่อง
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    เลือกจากทะเบียนเครื่องจักรในระบบ (แสดงเฉพาะเครื่องที่ยังไม่ได้อยู่ในรายการ PM)
                  </p>
                </div>
              </div>
              <button 
                type="button"
                id="btn-close-pm-machine-picker"
                onClick={() => {
                  setShowMachinePickerModal(false);
                  setPickerSearch('');
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-fg text-xl font-bold p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Search filter */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/50 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 text-slate-400" size={15} />
                <input
                  id="pm-picker-search"
                  type="text"
                  placeholder="ค้นหารหัสเครื่องจักร, ชื่อเครื่อง, ไลน์ผลิต, โซนที่ตั้ง..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 max-h-[50vh]">
              {filteredAvailableMachines.length === 0 ? (
                <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
                  <PackageOpen size={36} className="text-slate-400 dark:text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    {availableRegistryMachines.length === 0 
                      ? 'เครื่องจักรทั้งหมดในระบบทะเบียนถูกเพิ่มลงในรายการ PM ครบแล้ว' 
                      : 'ไม่พบเครื่องจักรที่ตรงกับคำค้นหา'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {availableRegistryMachines.length === 0 
                      ? `มีเครื่องจักรในระบบทะเบียนทั้งหมด ${machines.length} เครื่อง และทั้งหมดอยู่ในรายการ PM แล้ว` 
                      : 'ลองค้นหาด้วยรหัสเครื่อง หรือคำอื่น'}
                  </p>
                </div>
              ) : (
                filteredAvailableMachines.map(m => {
                  const existingPlanCount = pmPlans.filter(p => p.machineId === m.id).length;
                  return (
                    <div
                      key={m.id}
                      id={`picker-mach-item-${m.id}`}
                      onClick={() => handleAddMachineToPM(m.id)}
                      className="p-3 bg-slate-50/80 hover:bg-cyan-50/60 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 hover:border-cyan-400 dark:hover:border-cyan-500/60 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400 text-xs tracking-wider">{m.id}</span>
                          {m.lineGroup && (
                            <span className="text-[10px] bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold">
                              {m.lineGroup}
                            </span>
                          )}
                          {m.status && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400 px-1.5 py-0.2 rounded font-medium">
                              {m.status}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 mt-1 truncate">{m.name}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                          {(m.locationZone || m.locationRoom) && (
                            <span>{[m.locationZone, m.locationRoom].filter(Boolean).join(' • ')}</span>
                          )}
                          {m.model && <span>รุ่น: {m.model}</span>}
                          {m.vendor && <span>ผู้ผลิต: {m.vendor}</span>}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {existingPlanCount > 0 && (
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded font-medium">
                            มี {existingPlanCount} แผน
                          </span>
                        )}
                        <button
                          type="button"
                          id={`btn-select-mach-${m.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddMachineToPM(m.id);
                          }}
                          className="px-3 py-1.5 bg-cyan-600 group-hover:bg-cyan-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>เลือกเครื่องนี้</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700/80 p-4 flex justify-between items-center shrink-0">
              <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                แสดง {filteredAvailableMachines.length} จาก {availableRegistryMachines.length} เครื่องที่สามารถเพิ่มได้
              </span>
              <button
                type="button"
                id="btn-close-picker-footer"
                onClick={() => {
                  setShowMachinePickerModal(false);
                  setPickerSearch('');
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-fg hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer font-medium"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

        </div>
      )}
    </div>
  );
};
