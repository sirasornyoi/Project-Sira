import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx-js-style';
import { useApp } from '../context/AppContext';
import { Machine, PMPlan, PMStep } from '../types';
import { exportPMForm, importPMForm } from '../utils/pmExcelForm';
import { 
  Plus, Search, ChevronDown, ChevronUp, FileSpreadsheet, Settings, 
  Trash2, Edit3, AlertTriangle, Layers, ListFilter, Eye, CheckCircle2,
  FolderOpen, Folder, Download, Upload, Info, Check, X, Building, 
  Zap, MapPin, Calendar, Hash, FileText, Briefcase, Activity
} from 'lucide-react';
import { MachineImportModal } from './MachineImportModal';
import { ZoneRoomManagerModal } from './ZoneRoomManagerModal';
import { ZoneRoomFieldGroup } from './ZoneRoomFieldGroup';
import { getTodayDateString } from '../utils/pmAlerts';

interface MachineGroup {
  name: string;
  machines: Machine[];
  lineGroups: string[];
  totalPmPlans: number;
  totalMonthlyBd: number;
  breakdownCount: number;
}

export const MachinePage: React.FC = () => {
  const { machines, setMachines, pmPlans, setPmPlans, repairs, zones, addZone, addRoomToZone } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMachineId, setExpandedMachineId] = useState<string | null>(null);
  const [showZoneManagerModal, setShowZoneManagerModal] = useState(false);
  
  // View mode: 'grouped' (machines with same name grouped together) or 'flat'
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  // State for which machine name groups are expanded
  const [expandedGroupNames, setExpandedGroupNames] = useState<Set<string>>(new Set());
  
  // Modal states for adding a machine
  const [showAddModal, setShowAddModal] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newLineGroup, setNewLineGroup] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newPowerVoltage, setNewPowerVoltage] = useState('');
  const [newInstallDate, setNewInstallDate] = useState('');
  const [newVendor, setNewVendor] = useState('');
  const [newLocationZone, setNewLocationZone] = useState('');
  const [newLocationRoom, setNewLocationRoom] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal states for editing a machine
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [editName, setEditName] = useState('');
  const [editLineGroup, setEditLineGroup] = useState('');
  const [editStatus, setEditStatus] = useState<'ปกติ' | 'เสีย/ซ่อม'>('ปกติ');
  const [editModel, setEditModel] = useState('');
  const [editPowerVoltage, setEditPowerVoltage] = useState('');
  const [editInstallDate, setEditInstallDate] = useState('');
  const [editVendor, setEditVendor] = useState('');
  const [editLocationZone, setEditLocationZone] = useState('');
  const [editLocationRoom, setEditLocationRoom] = useState('');
  const [editSerialNumber, setEditSerialNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // Excel Import / Export modal & feedback states
  const [showImportModal, setShowImportModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Confirmation state for deleting a machine
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Get active breakdown status based on the latest repairs
  const currentMonth = getTodayDateString().slice(0, 7);

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

  // Filter & Display states for Zone and Room
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [showZoneColumn, setShowZoneColumn] = useState<boolean>(true);
  const [showRoomColumn, setShowRoomColumn] = useState<boolean>(true);

  // Available unique zones with counts (including structured zones)
  const availableZones = useMemo(() => {
    const map = new Map<string, number>();
    // Pre-populate with defined zones
    zones.forEach(z => {
      if (z.name) map.set(z.name, 0);
    });
    // Add machine counts
    machines.forEach(m => {
      const z = (m.locationZone || '').trim();
      if (z) {
        map.set(z, (map.get(z) || 0) + 1);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'th'));
  }, [machines, zones]);

  // Available unique rooms with counts (filtered by selectedZone if chosen)
  const availableRooms = useMemo(() => {
    const map = new Map<string, number>();
    if (selectedZone) {
      const zObj = zones.find(
        z => z.name.toLowerCase().trim() === selectedZone.toLowerCase().trim()
      );
      (zObj?.rooms || []).forEach(r => {
        if (r) map.set(r, 0);
      });
    } else {
      zones.flatMap(z => z.rooms || []).forEach(r => {
        if (r) map.set(r, 0);
      });
    }

    machines.forEach(m => {
      const z = (m.locationZone || '').trim();
      if (selectedZone && z.toLowerCase() !== selectedZone.toLowerCase()) return;
      const r = (m.locationRoom || '').trim();
      if (r) {
        map.set(r, (map.get(r) || 0) + 1);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'th'));
  }, [machines, zones, selectedZone]);

  const filteredMachines = useMemo(() => {
    return machines.filter(m => {
      const zoneVal = (m.locationZone || '').trim();
      if (selectedZone && zoneVal !== selectedZone) {
        return false;
      }
      const roomVal = (m.locationRoom || '').trim();
      if (selectedRoom && roomVal !== selectedRoom) {
        return false;
      }
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        m.id.toLowerCase().includes(term) ||
        m.name.toLowerCase().includes(term) ||
        m.lineGroup.toLowerCase().includes(term) ||
        (m.model && m.model.toLowerCase().includes(term)) ||
        (m.vendor && m.vendor.toLowerCase().includes(term)) ||
        (m.locationZone && m.locationZone.toLowerCase().includes(term)) ||
        (m.locationRoom && m.locationRoom.toLowerCase().includes(term)) ||
        (m.serialNumber && m.serialNumber.toLowerCase().includes(term))
      );
    });
  }, [machines, selectedZone, selectedRoom, searchTerm]);

  // Export machines to Excel matching columns A-K
  const handleExportMachinesExcel = () => {
    try {
      const dataToExport = filteredMachines.length > 0 ? filteredMachines : machines;
      const rows = [
        [
          'ลำดับ',
          'รหัสอุปกรณ์',
          'รายชื่อเครื่องจักร',
          'Model(รุ่น)',
          'แรงดัน/กำลังไฟ',
          'วันที่ติดตั้ง',
          'บริษัทผู้ขาย',
          'โซน',
          'ตำแหน่งที่ติดตั้ง (ห้อง)',
          'Serial Number',
          'หมายเหตุ'
        ],
        ...dataToExport.map((m, idx) => [
          idx + 1,
          m.id,
          m.name,
          m.model || '-',
          m.powerVoltage || '-',
          m.installDate || '-',
          m.vendor || '-',
          m.locationZone || (m.lineGroup ? `โซน ${m.lineGroup}` : '-'),
          m.locationRoom || '-',
          m.serialNumber || '-',
          m.notes || '-'
        ])
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 8 },  // ลำดับ
        { wch: 16 }, // รหัสอุปกรณ์
        { wch: 28 }, // รายชื่อเครื่องจักร
        { wch: 18 }, // Model(รุ่น)
        { wch: 18 }, // แรงดัน/กำลังไฟ
        { wch: 15 }, // วันที่ติดตั้ง
        { wch: 26 }, // บริษัทผู้ขาย
        { wch: 32 }, //  โซน
        { wch: 32 }, // ตำแหน่งที่ติดตั้ง (ห้อง)
        { wch: 20 }, // Serial Number
        { wch: 32 }  // หมายเหตุ
      ];

      const thinBorder = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      };

      const COLS_COUNT = 11;
      // Header styling
      for (let c = 0; c < COLS_COUNT; c++) {
        const ref = XLSX.utils.encode_cell({ r: 0, c });
        if (!ws[ref]) ws[ref] = { t: 's', v: '' };
        ws[ref].s = {
          font: { bold: true, sz: 10.5, color: { rgb: '0F172A' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          fill: { fgColor: { rgb: 'E2E8F0' } },
          border: thinBorder
        };
      }

      // Data rows styling
      const rowHeights: { hpt: number }[] = [{ hpt: 26 }];
      for (let r = 1; r < rows.length; r++) {
        rowHeights.push({ hpt: 24 });
        const isEven = r % 2 === 0;
        const rowBg = isEven ? 'F8FAFC' : 'FFFFFF';

        for (let c = 0; c < COLS_COUNT; c++) {
          const ref = XLSX.utils.encode_cell({ r, c });
          if (!ws[ref]) ws[ref] = { t: 's', v: '' };

          const isCenterCol = (c === 0 || c === 1 || c === 5 || c === 9);
          ws[ref].s = {
            font: { sz: 10, color: { rgb: '1E293B' } },
            alignment: {
              horizontal: isCenterCol ? 'center' : 'left',
              vertical: 'center',
              wrapText: true
            },
            fill: { fgColor: { rgb: rowBg } },
            border: thinBorder
          };
        }
      }

      ws['!rows'] = rowHeights;
      ws['!views'] = [{ showGridLines: true }];

      XLSX.utils.book_append_sheet(wb, ws, 'ทะเบียนเครื่องจักร');

      const fileName = `ทะเบียนเครื่องจักร_Machines_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setFeedbackMessage({ 
        type: 'success', 
        text: `ส่งออกข้อมูลเครื่องจักร ${dataToExport.length} เครื่อง เป็นไฟล์ Excel เรียบร้อยแล้ว (${fileName})` 
      });
    } catch (err: any) {
      setFeedbackMessage({ 
        type: 'error', 
        text: `เกิดข้อผิดพลาดในการส่งออก Excel: ${err?.message || err}` 
      });
    }
  };

  // Download template with realistic examples matching columns A-K
  const handleDownloadTemplateExcel = () => {
    try {
      const sampleRows = [
        [
          'ลำดับ',
          'รหัสอุปกรณ์',
          'รายชื่อเครื่องจักร',
          'Model(รุ่น)',
          'แรงดัน/กำลังไฟ',
          'วันที่ติดตั้ง',
          'บริษัทผู้ขาย',
          'โซน',
          'ตำแหน่งที่ติดตั้ง (ห้อง)',
          'Serial Number',
          'หมายเหตุ'
        ],
        [
          1,
          'RIM01',
          'RICE MIXER',
          'RM-500X',
          '380V 3P 7.5kW',
          '2024-01-15',
          'Kanto Machinery Co., Ltd.',
          'โซนเตรียมข้าว',
          'ห้องผสมข้าว 1 (Rice Mixing 1)',
          'SN-RM-2024-001',
          'ตรวจเช็กระดับน้ำมันหล่อลื่นเกียร์และสายพาน'
        ],
        [
          2,
          'VAC01',
          'VACUUM COOLER',
          'VC-120-Pro',
          '380V 3P 15kW',
          '2023-11-20',
          'CoolTech System Co., Ltd.',
          'โซนทำให้เย็น',
          'ห้องสุญญากาศลดอุณหภูมิ A',
          'SN-VC-2023-098',
          'ล้างทำความสะอาดคอนเดนเซอร์ประจำสัปดาห์'
        ],
        [
          3,
          'FFS01',
          'HORIZONTAL FORM FILL SEAL',
          'HFFS-3000',
          '220V 1P 3.5kW',
          '2024-03-01',
          'PackMaster International',
          'โซนบรรจุภัณฑ์',
          'ห้องบรรจุปลอดเชื้อ (Clean Room)',
          'SN-FFS-883',
          'ใช้ฟิล์มเกรดฟู้ดบรรจุภัณฑ์'
        ]
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sampleRows);
      ws['!cols'] = [
        { wch: 8 },
        { wch: 16 },
        { wch: 28 },
        { wch: 18 },
        { wch: 18 },
        { wch: 15 },
        { wch: 26 },
        { wch: 32 },
        { wch: 32 },
        { wch: 20 },
        { wch: 35 }
      ];

      const thinBorder = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      };

      const COLS_COUNT = 11;
      // Header styling
      for (let c = 0; c < COLS_COUNT; c++) {
        const ref = XLSX.utils.encode_cell({ r: 0, c });
        if (!ws[ref]) ws[ref] = { t: 's', v: '' };
        ws[ref].s = {
          font: { bold: true, sz: 10.5, color: { rgb: '0F172A' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          fill: { fgColor: { rgb: 'E2E8F0' } },
          border: thinBorder
        };
      }

      // Sample rows styling
      const rowHeights: { hpt: number }[] = [{ hpt: 26 }];
      for (let r = 1; r < sampleRows.length; r++) {
        rowHeights.push({ hpt: 24 });
        const isEven = r % 2 === 0;
        const rowBg = isEven ? 'F8FAFC' : 'FFFFFF';

        for (let c = 0; c < COLS_COUNT; c++) {
          const ref = XLSX.utils.encode_cell({ r, c });
          if (!ws[ref]) ws[ref] = { t: 's', v: '' };

          const isCenterCol = (c === 0 || c === 1 || c === 5 || c === 9);
          ws[ref].s = {
            font: { sz: 10, color: { rgb: '1E293B' } },
            alignment: {
              horizontal: isCenterCol ? 'center' : 'left',
              vertical: 'center',
              wrapText: true
            },
            fill: { fgColor: { rgb: rowBg } },
            border: thinBorder
          };
        }
      }

      ws['!rows'] = rowHeights;
      ws['!views'] = [{ showGridLines: true }];

      XLSX.utils.book_append_sheet(wb, ws, 'Machine_Template');
      XLSX.writeFile(wb, 'เทมเพลตนำเข้าทะเบียนเครื่องจักร.xlsx');
    } catch (err: any) {
      setFeedbackMessage({ 
        type: 'error', 
        text: `เกิดข้อผิดพลาดในการดาวน์โหลดเทมเพลต: ${err?.message || err}` 
      });
    }
  };

  // Import success callback
  const handleImportSuccess = (imported: Machine[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      setMachines(imported);
      setFeedbackMessage({
        type: 'success',
        text: `นำเข้าข้อมูลและแทนที่ทะเบียนเครื่องจักรทั้งหมดแล้ว (${imported.length} เครื่อง)`
      });
    } else {
      setMachines(prev => {
        const map = new Map<string, Machine>();
        // Existing machines
        for (const m of prev) {
          map.set(m.id, m);
        }
        // Merge or append imported
        for (const imp of imported) {
          const existing = map.get(imp.id);
          if (existing) {
            map.set(imp.id, {
              ...existing,
              name: imp.name || existing.name,
              lineGroup: imp.lineGroup || existing.lineGroup,
              model: imp.model || existing.model,
              powerVoltage: imp.powerVoltage || existing.powerVoltage,
              installDate: imp.installDate || existing.installDate,
              vendor: imp.vendor || existing.vendor,
              locationZone: imp.locationZone || existing.locationZone,
              locationRoom: imp.locationRoom || existing.locationRoom,
              serialNumber: imp.serialNumber || existing.serialNumber,
              notes: imp.notes || existing.notes
            });
          } else {
            map.set(imp.id, imp);
          }
        }
        return Array.from(map.values());
      });

      setFeedbackMessage({
        type: 'success',
        text: `นำเข้าข้อมูลและผสานทะเบียนเครื่องจักรเรียบร้อยแล้ว (${imported.length} เครื่อง)`
      });
    }
  };

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
      setErrorMsg('กรุณากรอกข้อมูลให้ครบถ้วน (รหัสและชื่อเครื่องจักร)');
      return;
    }

    const trimmedId = newId.trim().toUpperCase();
    if (machines.some(m => m.id === trimmedId)) {
      setErrorMsg('รหัสเครื่องจักรนี้มีอยู่แล้วในระบบ');
      return;
    }

    // Default line group if not specified
    let lineGroup = newLineGroup.trim();
    if (!lineGroup && newLocationZone) {
      const parts = newLocationZone.split('>');
      lineGroup = parts[parts.length - 1].trim();
    }
    if (!lineGroup) lineGroup = 'ทั่วไป';

    const trimmedZone = newLocationZone.trim();
    const trimmedRoom = newLocationRoom.trim();

    // Ensure new zone/room are registered in system zones state
    if (trimmedZone) {
      addZone(trimmedZone);
      if (trimmedRoom) {
        addRoomToZone(trimmedZone, trimmedRoom);
      }
    }

    const newMachine: Machine = {
      id: trimmedId,
      name: newName.trim().toUpperCase(),
      lineGroup,
      status: 'ปกติ',
      model: newModel.trim() || undefined,
      powerVoltage: newPowerVoltage.trim() || undefined,
      installDate: newInstallDate.trim() || undefined,
      vendor: newVendor.trim() || undefined,
      locationZone: trimmedZone || undefined,
      locationRoom: trimmedRoom || undefined,
      serialNumber: newSerialNumber.trim() || undefined,
      notes: newNotes.trim() || undefined
    };

    setMachines(prev => [newMachine, ...prev]);
    setShowAddModal(false);
    
    // Automatically expand the group for the newly added machine so user sees it immediately
    setExpandedGroupNames(prev => new Set(prev).add(newMachine.name));

    // Reset Form
    setNewId('');
    setNewName('');
    setNewLineGroup('');
    setNewModel('');
    setNewPowerVoltage('');
    setNewInstallDate('');
    setNewVendor('');
    setNewLocationZone('');
    setNewLocationRoom('');
    setNewSerialNumber('');
    setNewNotes('');
    setErrorMsg('');
    setFeedbackMessage({
      type: 'success',
      text: `เพิ่มเครื่องจักร ${newMachine.id} (${newMachine.name}) เรียบร้อยแล้ว`
    });
  };

  const handleEditClick = (m: Machine) => {
    setEditingMachine(m);
    setEditName(m.name);
    setEditLineGroup(m.lineGroup);
    setEditStatus(m.status || 'ปกติ');
    setEditModel(m.model || '');
    setEditPowerVoltage(m.powerVoltage || '');
    setEditInstallDate(m.installDate || '');
    setEditVendor(m.vendor || '');
    setEditLocationZone(m.locationZone || '');
    setEditLocationRoom(m.locationRoom || '');
    setEditSerialNumber(m.serialNumber || '');
    setEditNotes(m.notes || '');
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

    let lineGroup = editLineGroup.trim();
    if (!lineGroup && editLocationZone) {
      const parts = editLocationZone.split('>');
      lineGroup = parts[parts.length - 1].trim();
    }
    if (!lineGroup) lineGroup = 'ทั่วไป';

    const trimmedZone = editLocationZone.trim();
    const trimmedRoom = editLocationRoom.trim();

    if (trimmedZone) {
      addZone(trimmedZone);
      if (trimmedRoom) {
        addRoomToZone(trimmedZone, trimmedRoom);
      }
    }

    setMachines(prev => prev.map(m => {
      if (m.id === editingMachine.id) {
        return {
          ...m,
          name: editName.trim().toUpperCase(),
          lineGroup,
          status: editStatus,
          model: editModel.trim() || undefined,
          powerVoltage: editPowerVoltage.trim() || undefined,
          installDate: editInstallDate.trim() || undefined,
          vendor: editVendor.trim() || undefined,
          locationZone: trimmedZone || undefined,
          locationRoom: trimmedRoom || undefined,
          serialNumber: editSerialNumber.trim() || undefined,
          notes: editNotes.trim() || undefined
        };
      }
      return m;
    }));

    setShowEditModal(false);
    setEditingMachine(null);
    setFeedbackMessage({
      type: 'success',
      text: `บันทึกการแก้ไขเครื่องจักร ${editingMachine.id} เรียบร้อยแล้ว`
    });
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

  // Export PM Form for a machine
  const handleExportPM = (machine: Machine, planParam?: PMPlan) => {
    try {
      const plan = planParam || pmPlans.find(p => p.machineId === machine.id);
      if (!plan) {
        // If no plan yet, generate a default PMPlan structure so the user can export the template
        const defaultPlan: PMPlan = {
          id: `pm-${machine.id}-${Date.now()}`,
          machineId: machine.id,
          title: `ใบรายงาน Preventive Maintenance (PM) - ${machine.name}`,
          frequency: 'รายเดือน',
          steps: [
            {
              id: `step-${Date.now()}-1`,
              itemNo: 1,
              title: 'ตรวจเช็คสภาพทั่วไปทั้งภายในและภายนอกเครื่อง',
              method: 'ดูด้วยสายตา',
              standard: 'โครงสร้างสมบูรณ์ ไม่มีส่วนชำรุดเสียหาย',
              frequency: '1 เดือน/ครั้ง',
              stdTime: 15,
              result: 'ยังไม่ตรวจ'
            }
          ],
          ttm: 15
        };
        exportPMForm(machine, defaultPlan);
      } else {
        exportPMForm(machine, plan);
      }

      setFeedbackMessage({
        type: 'success',
        text: `ส่งออกฟอร์ม PM เครื่อง ${machine.id} (${machine.name}) เป็นไฟล์ Excel เรียบร้อยแล้ว`
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `เกิดข้อผิดพลาดในการส่งออกฟอร์ม PM: ${err?.message || err}`
      });
    }
  };

  // Import PM Form from Excel file
  const handleImportPM = async (machine: Machine, file: File, specificPlanId?: string) => {
    try {
      const imported = await importPMForm(file);
      if (!imported.steps || imported.steps.length === 0) {
        setFeedbackMessage({
          type: 'error',
          text: 'ไม่พบรายการขั้นตอน PM ในไฟล์ Excel ที่นำเข้า (โปรดตรวจสอบว่าแถวข้อมูลมีข้อมูลในคอลัมน์มาตรฐาน)'
        });
        return;
      }

      setPmPlans(prev => {
        const existingIdx = prev.findIndex(p => specificPlanId ? p.id === specificPlanId : p.machineId === machine.id);
        if (existingIdx >= 0) {
          return prev.map((p, idx) => {
            if (idx === existingIdx) {
              return {
                ...p,
                steps: imported.steps,
                ttm: imported.steps.reduce((sum, s) => sum + (s.stdTime || 0), 0)
              };
            }
            return p;
          });
        } else {
          const newPlan: PMPlan = {
            id: `pm-${machine.id}-${Date.now()}`,
            machineId: machine.id,
            title: `ใบรายงาน Preventive Maintenance (PM) - ${imported.machineName || machine.name}`,
            frequency: 'รายเดือน',
            steps: imported.steps,
            ttm: imported.steps.reduce((sum, s) => sum + (s.stdTime || 0), 0)
          };
          return [...prev, newPlan];
        }
      });

      setFeedbackMessage({
        type: 'success',
        text: `นำเข้าฟอร์ม PM สำหรับเครื่อง ${machine.id} สำเร็จ (${imported.steps.length} ขั้นตอน, ผลการตรวจอัปเดตเรียบร้อย)`
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `นำเข้าฟอร์ม PM ล้มเหลว: ${err?.message || err}`
      });
    }
  };

  // Toggle step result: 'ปกติ' / 'ไม่ปกติ' / 'ยังไม่ตรวจ' (clicking same value toggles back to 'ยังไม่ตรวจ')
  const handleToggleStepResult = (planId: string, stepIndex: number, target: 'ปกติ' | 'ไม่ปกติ') => {
    setPmPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const nextSteps = [...p.steps];
      const current = nextSteps[stepIndex];
      if (!current) return p;

      const newResult: 'ปกติ' | 'ไม่ปกติ' | 'ยังไม่ตรวจ' =
        current.result === target ? 'ยังไม่ตรวจ' : target;

      nextSteps[stepIndex] = {
        ...current,
        result: newResult,
        done: newResult !== 'ยังไม่ตรวจ'
      };

      return {
        ...p,
        steps: nextSteps
      };
    }));
  };

  // Update abnormalDetail or remark for a PM step
  const handleUpdateStepNote = (planId: string, stepIndex: number, field: 'abnormalDetail' | 'remark', value: string) => {
    setPmPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const nextSteps = [...p.steps];
      if (!nextSteps[stepIndex]) return p;
      nextSteps[stepIndex] = {
        ...nextSteps[stepIndex],
        [field]: value
      };
      return { ...p, steps: nextSteps };
    }));
  };

  // Helper to render machine deep detail (PM plans & MTTR stats & Specifications)
  const renderMachineDetails = (m: Machine, stats: ReturnType<typeof getMachineStats>, unitLabel?: string) => {
    const fullLocation = [m.locationZone, m.locationRoom].filter(Boolean).join(' > ') || '-';

    return (
      <div className="border-l-4 border-cyan-500 bg-surface dark:bg-slate-900/90 p-4 sm:p-5 space-y-4 rounded-r-xl border-y border-r border-border dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-border dark:border-slate-700/60 pb-3 flex-wrap gap-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h4 className="text-sm font-bold text-fg dark:text-slate-100 flex items-center gap-2">
              <Settings size={16} className="text-cyan-600 dark:text-cyan-400" />
              <span>รายละเอียด {unitLabel ? `${unitLabel}: ` : ''}</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-mono">{m.id}</span>
              <span className="text-fg-muted dark:text-slate-200">- {m.name}</span>
            </h4>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              stats.status === 'ปกติ' 
                ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400' 
                : 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${stats.status === 'ปกติ' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`}></span>
              สถานะ: {stats.status === 'ปกติ' ? 'ปกติ / Normal' : 'เสีย-ซ่อม / Breakdown'}
            </span>
          </div>
        </div>

        {/* Primary Attribute Cards: Highlight Duty (หน้าที่), Zone (โซน), and Room (ห้อง) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. หน้าที่ (Duty / Line Group) - Very Prominent and Conspicuous */}
          <div 
            id={`detail-duty-card-${m.id}`}
            className="bg-amber-50 dark:bg-gradient-to-r dark:from-amber-950/60 dark:via-slate-900 dark:to-slate-900 border-2 border-amber-300 dark:border-amber-500/60 rounded-xl p-3 shadow-sm flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/25 border border-amber-300 dark:border-amber-500/50 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 shadow-inner">
              <Briefcase size={19} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 tracking-wider flex items-center gap-1.5">
                <span>หน้าที่ (Duty / Line Group)</span>
              </div>
              <div className="text-base font-extrabold text-amber-950 dark:text-amber-100 tracking-wide truncate mt-0.5" title={m.lineGroup}>
                {m.lineGroup || 'ทั่วไป'}
              </div>
            </div>
          </div>

          {/* 2. โซน (Location Zone) */}
          <div className="bg-sky-50 dark:bg-slate-950/70 border border-sky-200 dark:border-cyan-500/40 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-cyan-500/15 border border-sky-200 dark:border-cyan-500/30 flex items-center justify-center text-sky-700 dark:text-cyan-400 shrink-0">
              <MapPin size={19} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-sky-800 dark:text-cyan-400 tracking-wider">
                โซน (Zone)
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-cyan-100 truncate mt-0.5" title={m.locationZone}>
                {m.locationZone || '-'}
              </div>
            </div>
          </div>

          {/* 3. ห้องที่ติดตั้ง (Room) */}
          <div className="bg-emerald-50 dark:bg-slate-950/70 border border-emerald-200 dark:border-emerald-500/40 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
              <Layers size={19} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 tracking-wider">
                ห้องที่ติดตั้ง (Room)
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-emerald-100 truncate mt-0.5" title={m.locationRoom}>
                {m.locationRoom || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Technical Specs Details Card */}
        <div className="bg-slate-50 dark:bg-slate-950/70 border border-border dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">Model (รุ่น)</span>
              <span className="text-slate-900 dark:text-slate-200 font-medium">{m.model || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">แรงดัน/กำลังไฟ</span>
              <span className="text-amber-700 dark:text-amber-400 font-mono font-medium">{m.powerVoltage ? `⚡ ${m.powerVoltage}` : '-'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">Serial Number (S/N)</span>
              <span className="text-cyan-700 dark:text-cyan-300 font-mono text-[11px]">{m.serialNumber || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">วันที่ติดตั้ง / ผู้ขาย</span>
              <span className="text-slate-800 dark:text-slate-300">{m.installDate || '-'} {m.vendor ? `(${m.vendor})` : ''}</span>
            </div>
          </div>

          {m.notes && (
            <div className="pt-2 border-t border-border dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 bg-slate-100 dark:bg-slate-900/40 p-2 rounded-lg">
              <FileText size={14} className="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">หมายเหตุ: </span>
                <span className="text-slate-800 dark:text-slate-300 italic">{m.notes}</span>
              </div>
            </div>
          )}
        </div>

        {/* PM Form and Checklist Section */}
        <div className="space-y-4 pt-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 dark:bg-slate-950/80 border border-border dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                <FileSpreadsheet size={17} />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>ฟอร์ม Preventive Maintenance (PM)</span>
                  <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono bg-cyan-100 dark:bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-300 dark:border-cyan-500/20 lowercase">
                    {stats.linkedPlans.length} แผน
                  </span>
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  ระบบฟอร์มตรวจเช็ก PM แบบ 3 สถานะ (ปกติ / ไม่ปกติ / ยังไม่ตรวจ) พร้อม Export/Import Excel SheetJS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <button
                type="button"
                id={`btn-export-pm-form-${m.id}`}
                onClick={() => handleExportPM(m)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition border border-emerald-500/50 cursor-pointer shadow-sm"
                title={`Export ฟอร์ม PM เครื่อง ${m.id} เป็นไฟล์ Excel (.xlsx)`}
              >
                <Download size={13} />
                <span>Export ฟอร์ม PM (.xlsx)</span>
              </button>

              <label
                htmlFor={`input-import-pm-form-${m.id}`}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-700 hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200 transition border border-cyan-300 dark:border-cyan-500/40 cursor-pointer shadow-sm"
                title={`Import ฟอร์ม PM เครื่อง ${m.id} จากไฟล์ Excel (.xlsx)`}
              >
                <Upload size={13} />
                <span>Import ฟอร์ม PM</span>
                <input
                  id={`input-import-pm-form-${m.id}`}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImportPM(m, file);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {stats.linkedPlans.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-border dark:border-slate-800/90 rounded-xl p-5 text-center space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                ยังไม่มีการระบุแผนบำรุงรักษาเชิงป้องกัน (PM) สำหรับเครื่องจักร <span className="text-cyan-600 dark:text-cyan-300 font-bold">{m.id} ({m.name})</span>
              </p>
              <div className="flex items-center justify-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleExportPM(m)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-600/25 dark:hover:bg-emerald-600/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 transition cursor-pointer"
                >
                  <Download size={14} />
                  <span>สร้าง &amp; Export ฟอร์ม PM ตัวอย่าง</span>
                </button>
                <label
                  htmlFor={`input-import-pm-empty-${m.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-600/25 dark:hover:bg-cyan-600/40 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 transition cursor-pointer"
                >
                  <Upload size={14} />
                  <span>นำเข้าไฟล์ฟอร์ม PM (.xlsx)</span>
                  <input
                    id={`input-import-pm-empty-${m.id}`}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImportPM(m, file);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.linkedPlans.map((plan) => {
                const normalCount = plan.steps.filter(s => s.result === 'ปกติ').length;
                const abnormalCount = plan.steps.filter(s => s.result === 'ไม่ปกติ').length;
                const uncheckedCount = plan.steps.length - normalCount - abnormalCount;

                return (
                  <div key={plan.id} className="bg-surface dark:bg-slate-950/70 border border-border dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    {/* Plan Top Info Bar */}
                    <div className="bg-slate-100 dark:bg-slate-900/90 border-b border-border dark:border-slate-800 p-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">{plan.title}</h5>
                          <span className="text-[10px] bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-400 font-semibold px-2 py-0.5 rounded">
                            {plan.frequency}
                          </span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                            {plan.steps.length} ขั้นตอน (TTM: {plan.ttm} นาที)
                          </span>
                        </div>
                        {/* Result summary tags */}
                        <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                          <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded">
                            <Check size={11} /> ปกติ: {normalCount}
                          </span>
                          <span className="inline-flex items-center gap-1 text-rose-800 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/30 px-2 py-0.5 rounded">
                            <X size={11} /> ไม่ปกติ: {abnormalCount}
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-400 bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/60 px-2 py-0.5 rounded">
                            ยังไม่ตรวจ: {uncheckedCount}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <button
                          type="button"
                          onClick={() => handleExportPM(m, plan)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/35 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                          title="Export แผนนี้เป็น Excel"
                        >
                          <Download size={12} />
                          <span>Export Excel</span>
                        </button>
                        <label
                          htmlFor={`input-import-plan-${plan.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-600/20 dark:hover:bg-cyan-600/35 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                          title="Import ไฟล์ Excel อัปเดตแผนนี้"
                        >
                          <Upload size={12} />
                          <span>Import Excel</span>
                          <input
                            id={`input-import-plan-${plan.id}`}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImportPM(m, file, plan.id);
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* PM Steps Checklist Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-400 border-b border-border dark:border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                            <th className="py-2.5 px-3 w-14 text-center">ลำดับ</th>
                            <th className="py-2.5 px-3 min-w-[200px]">หัวข้อ PM &amp; เกณฑ์มาตรฐาน</th>
                            <th className="py-2.5 px-3 w-28">วิธีการ</th>
                            <th className="py-2.5 px-3 w-24 text-center">ความถี่</th>
                            <th className="py-2.5 px-3 w-48 text-center">ผลการ PM (ช่องติ๊ก 3 สถานะ)</th>
                            <th className="py-2.5 px-3 min-w-[180px]">รายละเอียดความผิดปกติ / หมายเหตุ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-slate-800/60">
                          {plan.steps.map((step, sIdx) => {
                            const isNormal = step.result === 'ปกติ';
                            const isAbnormal = step.result === 'ไม่ปกติ';
                            const isUnchecked = !step.result || step.result === 'ยังไม่ตรวจ';

                            return (
                              <tr 
                                key={step.id || `step-${sIdx}`}
                                className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 ${
                                  isAbnormal 
                                    ? 'bg-rose-50 dark:bg-rose-950/20' 
                                    : isNormal 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/10' 
                                    : ''
                                }`}
                              >
                                {/* ลำดับ (itemNo) */}
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-300">
                                  {step.itemNo !== undefined && step.itemNo !== null ? step.itemNo : (sIdx + 1)}
                                </td>

                                {/* หัวข้อ PM & มาตรฐาน */}
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-slate-900 dark:text-slate-100">{step.title}</div>
                                  {step.standard && (
                                    <div className="text-[11px] text-cyan-700 dark:text-cyan-300 mt-0.5 leading-relaxed">
                                      <span className="text-slate-700 dark:text-slate-300 font-semibold">มาตรฐาน: </span>
                                      {step.standard}
                                    </div>
                                  )}
                                </td>

                                {/* วิธีการ */}
                                <td className="py-2.5 px-3 text-[11px]">
                                  <span className="inline-block px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                                    {step.method || 'ดูด้วยสายตา'}
                                  </span>
                                </td>

                                {/* ความถี่ */}
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-block text-[10px] bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded font-mono">
                                    {step.frequency || plan.frequency}
                                  </span>
                                </td>

                                {/* ผลการ PM (ช่องติ๊ก toggle) */}
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {/* ปุ่ม ปกติ */}
                                    <button
                                      type="button"
                                      id={`btn-step-normal-${plan.id}-${sIdx}`}
                                      onClick={() => handleToggleStepResult(plan.id, sIdx, 'ปกติ')}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition border cursor-pointer ${
                                        isNormal
                                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm ring-1 ring-emerald-400/40'
                                          : 'bg-slate-100 dark:bg-slate-900 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-slate-800 dark:text-slate-100 hover:text-emerald-900 dark:hover:text-white border-slate-300 dark:border-slate-700 hover:border-emerald-400'
                                      }`}
                                      title={isNormal ? 'คลิกซ้ำเพื่อยกเลิก (เปลี่ยนกลับเป็นยังไม่ตรวจ)' : 'เลือกผลการตรวจ: ปกติ'}
                                    >
                                      <Check size={13} className={isNormal ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'} />
                                      <span>ปกติ</span>
                                    </button>

                                    {/* ปุ่ม ไม่ปกติ */}
                                    <button
                                      type="button"
                                      id={`btn-step-abnormal-${plan.id}-${sIdx}`}
                                      onClick={() => handleToggleStepResult(plan.id, sIdx, 'ไม่ปกติ')}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition border cursor-pointer ${
                                        isAbnormal
                                          ? 'bg-rose-600 text-white border-rose-400 shadow-sm ring-1 ring-rose-400/40'
                                          : 'bg-slate-100 dark:bg-slate-900 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-800 dark:text-slate-100 hover:text-rose-900 dark:hover:text-white border-slate-300 dark:border-slate-700 hover:border-rose-400'
                                      }`}
                                      title={isAbnormal ? 'คลิกซ้ำเพื่อยกเลิก (เปลี่ยนกลับเป็นยังไม่ตรวจ)' : 'เลือกผลการตรวจ: ไม่ปกติ'}
                                    >
                                      <X size={13} className={isAbnormal ? 'text-white' : 'text-rose-600 dark:text-rose-400'} />
                                      <span>ไม่ปกติ</span>
                                    </button>

                                    {/* แสดงสถานะ ยังไม่ตรวจ */}
                                    {isUnchecked && (
                                      <span className="text-[10px] text-slate-500 italic pl-1 hidden xl:inline">
                                        ยังไม่ตรวจ
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* รายละเอียดความผิดปกติ / หมายเหตุ */}
                                <td className="py-2.5 px-3">
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      placeholder={isAbnormal ? 'ระบุสิ่งผิดปกติ / ค่าที่วัดได้*' : 'รายละเอียด/ค่าที่วัดได้'}
                                      value={step.abnormalDetail || ''}
                                      onChange={(e) => handleUpdateStepNote(plan.id, sIdx, 'abnormalDetail', e.target.value)}
                                      className={`w-full bg-white dark:bg-slate-900/90 text-xs px-2.5 py-1 rounded border focus:outline-none transition ${
                                        isAbnormal 
                                          ? 'border-rose-400 dark:border-rose-500/60 text-rose-800 dark:text-rose-200 placeholder-rose-400 focus:border-rose-500' 
                                          : 'border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-cyan-500'
                                      }`}
                                    />
                                    {step.remark && (
                                      <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate" title={step.remark}>
                                        หมายเหตุ: {step.remark}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Historical repair overview */}
        <div className="space-y-2 pt-2 border-t border-border dark:border-slate-800/80">
          <h4 className="text-xs font-semibold uppercase text-slate-700 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-rose-500"></span>
            ประวัติการซ่อมบำรุง (ยอดสะสมล่าสุด)
          </h4>
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-border dark:border-slate-700 rounded-lg p-4 grid grid-cols-2 gap-4">
            <div className="text-center p-2 bg-white dark:bg-slate-900/60 rounded border border-border dark:border-transparent">
              <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase">ยอดซ่อมสะสมทั้งหมด</p>
              <p className="text-lg font-mono font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                {repairs.filter(r => r.machineId === m.id).length} ครั้ง
              </p>
            </div>

            <div className="text-center p-2 bg-white dark:bg-slate-900/60 rounded border border-border dark:border-transparent">
              <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase">เวลารอซ่อมเฉลี่ย MTTR</p>
              <p className="text-lg font-mono font-extrabold text-amber-700 dark:text-amber-400 mt-1">
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
    );
  };

  return (
    <div className="space-y-6" id="mach-page-root">
      {/* Top action row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cyan-400 tracking-tight flex items-center gap-2">
            🏭 ข้อมูลทะเบียนเครื่องจักร (Machine Registry)
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            ทะเบียนเครื่องจักรและพิกัดติดตั้ง <span className="text-cyan-300 font-medium">โซน &gt; ห้อง</span> รองรับการ Export/Import Excel (A-K)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export Excel button */}
          <button
            id="btn-export-machines-excel"
            onClick={handleExportMachinesExcel}
            className="flex items-center gap-2 bg-white dark:bg-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500 text-emerald-800 dark:text-fg font-semibold px-3.5 py-2 rounded-lg transition-all shadow-xs text-xs cursor-pointer border border-emerald-300 dark:border-emerald-500/40"
            title="ส่งออกข้อมูลเครื่องจักรเป็นไฟล์ Excel ตามมาตรฐานคอลัมน์ A-K"
          >
            <Download size={15} className="text-emerald-700 dark:text-fg" />
            <span>Export Excel</span>
          </button>

          {/* Import Excel button */}
          <button
            id="btn-import-machines-excel"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-slate-700 text-cyan-900 dark:text-cyan-300 font-semibold px-3.5 py-2 rounded-lg transition-all shadow-xs text-xs cursor-pointer border border-cyan-300 dark:border-cyan-500/40 hover:border-cyan-400"
            title="นำเข้าไฟล์ Excel เข้าสู่ทะเบียนเครื่องจักร"
          >
            <Upload size={15} className="text-cyan-700 dark:text-cyan-300" />
            <span>Import Excel</span>
          </button>

          {/* Manage Zones & Rooms button */}
          <button
            id="btn-manage-zones-rooms"
            onClick={() => setShowZoneManagerModal(true)}
            className="flex items-center gap-2 bg-white dark:bg-indigo-950/80 hover:bg-indigo-50 dark:hover:bg-indigo-900/80 text-indigo-900 dark:text-indigo-300 font-semibold px-3.5 py-2 rounded-lg transition-all shadow-xs text-xs cursor-pointer border border-indigo-300 dark:border-indigo-500/50 hover:border-indigo-400"
            title="จัดการโครงสร้างโซนและห้อง (เพิ่มโซน/ห้อง เปลี่ยนชื่อ หรือลบ)"
          >
            <Layers size={15} className="text-indigo-700 dark:text-indigo-400" />
            <span>จัดการโซน/ห้อง</span>
          </button>

          {/* Add machine button */}
          <button
            id="btn-add-machine"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-900 font-bold px-4 py-2 rounded-lg transition-all shadow-md focus:ring-2 focus:ring-cyan-400 focus:outline-none text-xs cursor-pointer"
          >
            <Plus size={16} />
            <span>เพิ่มเครื่องจักรใหม่</span>
          </button>
        </div>
      </div>

      {/* Dismissable Feedback Notification */}
      {feedbackMessage && (
        <div 
          className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : feedbackMessage.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-rose-400 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button 
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
            title="ปิดการแจ้งเตือน"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter and search block */}
      <div className="bg-slate-800 border border-slate-700/80 rounded-xl p-4 space-y-3.5 shadow-md">
        {/* Row 1: Search + Zone Filter + Room Filter + Clear Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              id="machine-search-input"
              type="text"
              placeholder="ค้นหาด้วย รหัส ID, ชื่อเครื่องจักร, Model, S/N..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg pl-10 pr-8 py-2 text-slate-200 placeholder-slate-500 font-sans focus:outline-none focus:border-cyan-500 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer"
                title="ล้างคำค้นหา"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Zone Filter Dropdown */}
          <div id="filter-zone-select-container" className="flex items-center gap-2 bg-surface dark:bg-slate-900/90 border border-border dark:border-slate-700 rounded-lg px-3 py-1.5 min-w-[190px]">
            <Building size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
            <div className="flex-1">
              <label htmlFor="filter-zone-select" className="block text-[10px] text-fg dark:text-slate-200 font-semibold leading-tight">
                กรองโซน (Zone):
              </label>
              <select
                id="filter-zone-select"
                value={selectedZone}
                onChange={(e) => {
                  setSelectedZone(e.target.value);
                  setSelectedRoom(''); // Reset room when zone changes
                }}
                className="w-full bg-transparent text-fg dark:text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-surface dark:bg-slate-900 text-fg dark:text-slate-300">
                  ทุกโซน ({machines.length} เครื่อง)
                </option>
                {availableZones.map(([zone, count]) => (
                  <option key={zone} value={zone} className="bg-surface dark:bg-slate-900 text-fg dark:text-slate-200">
                    {zone} ({count} เครื่อง)
                  </option>
                ))}
              </select>
            </div>
            {selectedZone && (
              <button
                onClick={() => {
                  setSelectedZone('');
                  setSelectedRoom('');
                }}
                className="text-slate-400 hover:text-rose-400 p-0.5 cursor-pointer"
                title="ล้างการเลือกโซน"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Room Filter Dropdown */}
          <div id="filter-room-select-container" className="flex items-center gap-2 bg-surface dark:bg-slate-900/90 border border-border dark:border-slate-700 rounded-lg px-3 py-1.5 min-w-[190px]">
            <MapPin size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
            <div className="flex-1">
              <label htmlFor="filter-room-select" className="block text-[10px] text-fg dark:text-slate-200 font-semibold leading-tight">
                กรองห้อง (Room):
              </label>
              <select
                id="filter-room-select"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full bg-transparent text-fg dark:text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-surface dark:bg-slate-900 text-fg dark:text-slate-300">
                  ทุกห้อง ({availableRooms.reduce((acc, [, c]) => acc + c, 0)} เครื่อง)
                </option>
                {availableRooms.map(([room, count]) => (
                  <option key={room} value={room} className="bg-surface dark:bg-slate-900 text-fg dark:text-slate-200">
                    {room} ({count} เครื่อง)
                  </option>
                ))}
              </select>
            </div>
            {selectedRoom && (
              <button
                onClick={() => setSelectedRoom('')}
                className="text-slate-400 hover:text-rose-400 p-0.5 cursor-pointer"
                title="ล้างการเลือกห้อง"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Manage zones shortcut button */}
          <button
            type="button"
            id="btn-filter-manage-zones"
            onClick={() => setShowZoneManagerModal(true)}
            className="text-xs text-indigo-900 dark:text-indigo-300 hover:text-indigo-950 dark:hover:text-indigo-200 bg-white dark:bg-indigo-950/60 hover:bg-indigo-50 dark:hover:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-700/50 px-3 py-2 rounded-lg transition shrink-0 flex items-center gap-1.5 cursor-pointer font-semibold shadow-xs"
            title="เปิดตัวจัดการโซน/ห้อง (เพิ่ม/ลบ/แก้ไข)"
          >
            <Settings size={13} className="text-indigo-700 dark:text-indigo-400" />
            <span>จัดการโครงสร้างโซน/ห้อง</span>
          </button>

          {/* Reset Filters button */}
          {(selectedZone || selectedRoom || searchTerm) && (
            <button
              id="btn-clear-all-filters"
              onClick={() => {
                setSelectedZone('');
                setSelectedRoom('');
                setSearchTerm('');
              }}
              className="text-xs text-rose-800 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-200 bg-white dark:bg-rose-500/15 hover:bg-rose-50 dark:hover:bg-rose-500/25 border border-rose-300 dark:border-rose-500/30 px-3 py-2 rounded-lg transition shrink-0 flex items-center gap-1.5 cursor-pointer font-semibold shadow-xs"
              title="ล้างตัวกรองและคำค้นหาทั้งหมด"
            >
              <X size={14} />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>

        {/* Row 2: Display Checkboxes (Show Zone, Show Room, or Both) + View Mode switcher */}
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between pt-2.5 border-t border-slate-200 dark:border-slate-700/60">
          {/* Checkboxes to toggle Zone / Room columns visibility */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5 mr-1">
              <Eye size={14} className="text-cyan-600 dark:text-cyan-400" />
              <span>แสดงคอลัมน์:</span>
            </span>

            {/* Checkbox: Zone */}
            <label 
              htmlFor="checkbox-show-zone"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition select-none ${
                showZoneColumn
                  ? 'bg-white dark:bg-cyan-950/60 border-cyan-500 dark:border-cyan-500/60 text-cyan-950 dark:text-cyan-300 font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:border-slate-400'
              }`}
            >
              <input
                id="checkbox-show-zone"
                type="checkbox"
                checked={showZoneColumn}
                onChange={(e) => setShowZoneColumn(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-cyan-600 dark:text-cyan-500 focus:ring-cyan-500 bg-white dark:bg-slate-800 cursor-pointer"
              />
              <span>โซน (Zone)</span>
            </label>

            {/* Checkbox: Room */}
            <label 
              htmlFor="checkbox-show-room"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition select-none ${
                showRoomColumn
                  ? 'bg-white dark:bg-cyan-950/60 border-cyan-500 dark:border-cyan-500/60 text-cyan-950 dark:text-cyan-300 font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:border-slate-400'
              }`}
            >
              <input
                id="checkbox-show-room"
                type="checkbox"
                checked={showRoomColumn}
                onChange={(e) => setShowRoomColumn(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-cyan-600 dark:text-cyan-500 focus:ring-cyan-500 bg-white dark:bg-slate-800 cursor-pointer"
              />
              <span>ห้อง (Room)</span>
            </label>

            {/* Quick Presets: Both, Zone only, Room only */}
            <div className="flex items-center gap-1 pl-1 sm:pl-2 sm:border-l sm:border-slate-200 dark:sm:border-slate-700">
              <span className="text-[11px] text-slate-500 mr-1 hidden sm:inline font-medium">เลือกด่วน:</span>
              <button
                type="button"
                id="btn-show-both-columns"
                onClick={() => {
                  setShowZoneColumn(true);
                  setShowRoomColumn(true);
                }}
                className={`text-[11px] px-2.5 py-1 rounded-md transition cursor-pointer font-semibold ${
                  showZoneColumn && showRoomColumn
                    ? 'bg-cyan-50 dark:bg-cyan-500/25 text-cyan-900 dark:text-cyan-300 font-bold border border-cyan-400 dark:border-cyan-500/50 shadow-xs'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800'
                }`}
                title="แสดงทั้งคอลัมน์โซนและห้อง"
              >
                ทั้งสอง
              </button>
              <button
                type="button"
                id="btn-show-zone-only"
                onClick={() => {
                  setShowZoneColumn(true);
                  setShowRoomColumn(false);
                }}
                className={`text-[11px] px-2.5 py-1 rounded-md transition cursor-pointer font-semibold ${
                  showZoneColumn && !showRoomColumn
                    ? 'bg-cyan-50 dark:bg-cyan-500/25 text-cyan-900 dark:text-cyan-300 font-bold border border-cyan-400 dark:border-cyan-500/50 shadow-xs'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800'
                }`}
                title="แสดงเฉพาะคอลัมน์โซน"
              >
                เฉพาะโซน
              </button>
              <button
                type="button"
                id="btn-show-room-only"
                onClick={() => {
                  setShowZoneColumn(false);
                  setShowRoomColumn(true);
                }}
                className={`text-[11px] px-2.5 py-1 rounded-md transition cursor-pointer font-semibold ${
                  !showZoneColumn && showRoomColumn
                    ? 'bg-cyan-50 dark:bg-cyan-500/25 text-cyan-900 dark:text-cyan-300 font-bold border border-cyan-400 dark:border-cyan-500/50 shadow-xs'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800'
                }`}
                title="แสดงเฉพาะคอลัมน์ห้อง"
              >
                เฉพาะห้อง
              </button>
            </div>
          </div>

          {/* View mode & expand controls */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            {/* Mode Switcher */}
            <div className="flex items-center bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 rounded-lg p-1 text-xs shadow-xs">
              <button
                onClick={() => setViewMode('grouped')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-accent shadow-xs'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200'
                }`}
              >
                <Layers size={14} />
                <span>จัดกลุ่มตามชื่อ ({machineGroups.length} กลุ่ม)</span>
              </button>
              <button
                onClick={() => setViewMode('flat')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                  viewMode === 'flat'
                    ? 'bg-accent shadow-xs'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200'
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
                  className="text-xs bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 font-semibold shadow-xs"
                  title="ขยายทุกกลุ่มเครื่องจักร"
                >
                  <ChevronDown size={13} />
                  <span>ขยายทั้งหมด</span>
                </button>
                <button
                  onClick={collapseAllGroups}
                  className="text-xs bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 font-semibold shadow-xs"
                  title="ยุบทุกกลุ่มเครื่องจักร"
                >
                  <ChevronUp size={13} />
                  <span>ยุบทั้งหมด</span>
                </button>
              </div>
            )}

            <div className="text-xs text-slate-400 font-mono flex items-center pl-2">
              เครื่องจักร: <span className="text-cyan-400 font-bold ml-1 text-sm">{filteredMachines.length}</span> / {machines.length} เครื่อง
            </div>
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
                {showZoneColumn && <th className="py-4 px-4 font-medium">โซน</th>}
                {showRoomColumn && <th className="py-4 px-4 font-medium">ห้อง</th>}
                <th className="py-4 px-4 text-center font-medium">แผน PM</th>
                <th className="py-4 px-4 text-center font-medium">BD เดือนนี้</th>
                <th className="py-4 px-4 text-center font-medium">สถานะ</th>
                {viewMode === 'flat' && (
                  <th className="py-4 px-4 text-center w-36 font-medium">การจัดการ</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredMachines.length === 0 ? (
                <tr>
                  <td 
                    colSpan={(viewMode === 'grouped' ? 6 : 7) + (showZoneColumn ? 1 : 0) + (showRoomColumn ? 1 : 0)} 
                    className="py-12 text-center text-slate-500 bg-slate-900/20"
                  >
                    <p className="text-base font-medium">ไม่พบข้อมูลเครื่องจักร</p>
                    <p className="text-xs mt-1 text-slate-400">ลองเปลี่ยนเงื่อนไขค้นหา หรือล้างตัวกรองโซน/ห้อง</p>
                  </td>
                </tr>
              ) : viewMode === 'grouped' ? (
                /* -------------------------------------------------------------
                   GROUPED VIEW: Machines with same name grouped together
                   ------------------------------------------------------------- */
                machineGroups.map((group, gIndex) => {
                  const isExpanded = isGroupExpanded(group.name);

                  return (
                    <React.Fragment key={group.name}>
                      {/* Group Header Row (Click to expand/collapse, no right column button needed) */}
                      <tr 
                        id={`group-row-${group.name}`}
                        onClick={() => toggleGroup(group.name)}
                        className={`hover:bg-slate-700/40 transition-colors cursor-pointer select-none ${
                          isExpanded ? 'bg-slate-700/30 border-l-4 border-cyan-400' : ''
                        }`}
                        title={isExpanded ? 'คลิกเพื่อย่อกลุ่มเครื่องจักร' : 'คลิกเพื่อคลี่ดูแยกตามลำดับเครื่องที่ 1, 2, 3...'}
                      >
                        <td className="py-4 px-4 text-center text-slate-400 text-xs font-mono">
                          {gIndex + 1}
                        </td>
                        
                        {/* Machine Name & Unit Count Badge with indicator chevron */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg border transition shrink-0 ${
                              isExpanded 
                                ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/40' 
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:text-cyan-700 dark:hover:text-cyan-300'
                            }`}>
                              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm tracking-wide">
                                  {group.name}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                                  group.machines.length > 1
                                    ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/40'
                                    : 'bg-white dark:bg-slate-700/60 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-600 shadow-xs'
                                }`}>
                                  {group.machines.length} เครื่อง
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {isExpanded ? 'คลิกเพื่อย่อรายการ' : 'คลิกเพื่อคลี่ดูเครื่องที่ 1, 2, 3...'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Machine IDs in this group */}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1 items-center">
                            {group.machines.map((m, mIdx) => (
                              <span 
                                key={m.id}
                                className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 text-cyan-900 dark:text-cyan-300 font-bold rounded"
                                title={`เครื่องที่ ${mIdx + 1}: ${m.id} | Model: ${m.model || '-'} | ห้อง: ${m.locationRoom || '-'}`}
                              >
                                #{mIdx + 1}: {m.id}
                              </span>
                            ))}
                          </div>
                        </td>
                      
                        {/* Zone */}
                        {showZoneColumn && (
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1">
                              {Array.from(new Set(group.machines.map(m => m.locationZone || m.lineGroup).filter(Boolean))).length > 0 ? (
                                Array.from(new Set(group.machines.map(m => m.locationZone || m.lineGroup).filter(Boolean))).map((zone, zIdx) => (
                                  <span 
                                    key={zIdx}
                                    className="pill-zone text-[11px] px-2.5 py-1 rounded-full border"
                                  >
                                    {zone}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500 text-xs">-</span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Room */}
                        {showRoomColumn && (
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1">
                              {Array.from(new Set(group.machines.map(m => m.locationRoom).filter(Boolean))).length > 0 ? (
                                Array.from(new Set(group.machines.map(m => m.locationRoom).filter(Boolean))).map((room, rIdx) => (
                                  <span 
                                    key={rIdx}
                                    className="pill-room text-[11px] px-2.5 py-1 rounded-md border"
                                  >
                                    {room}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500 text-xs">-</span>
                              )}
                            </div>
                          </td>
                        )}

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
                      </tr>

                      {/* Expanded Section showing each individual machine unit with specifications */}
                      {isExpanded && (
                        <tr className="bg-slate-100/70 dark:bg-slate-900/60" id={`expanded-group-row-${group.name}`}>
                          <td colSpan={6 + (showZoneColumn ? 1 : 0) + (showRoomColumn ? 1 : 0)} className="p-0">
                            <div className="border-l-4 border-cyan-500 bg-slate-100/90 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900/70 p-4 sm:p-5 space-y-4 border-y border-r border-slate-200 dark:border-slate-800">
                              {/* Sub-header */}
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-cyan-100 dark:bg-cyan-500/15 rounded-lg text-cyan-600 dark:text-cyan-400">
                                    <Layers size={16} />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                      เครื่องจักรประเภท: <span className="text-cyan-600 dark:text-cyan-400 font-extrabold">{group.name}</span>
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      แยกแสดงรายการแต่ละเครื่องอย่างชัดเจน (ทั้งหมด {group.machines.length} เครื่อง ตั้งแต่เครื่องที่ 1 ถึงเครื่องที่ {group.machines.length})
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono bg-white dark:bg-slate-950/80 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 shadow-xs">
                                  {group.machines.length} เครื่องในกลุ่มนี้
                                </span>
                              </div>

                              {/* Individual machines sub-table */}
                              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-950/80 shadow-xs">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider font-semibold">
                                      <th className="py-3 px-3 w-24 text-center">ลำดับเครื่อง</th>
                                      <th className="py-3 px-3 w-28 font-mono font-medium">รหัส (ID)</th>
                                      <th className="py-3 px-3 font-medium">Model </th>
                                      <th className="py-3 px-3 font-medium">กำลังไฟ </th>
                                      {showZoneColumn && <th className="py-3 px-3 font-medium"> โซน </th>}
                                      {showRoomColumn && <th className="py-3 px-3 font-medium"> ห้อง </th>}
                                      <th className="py-3 px-3 text-center font-medium">แผน PM</th>
                                      <th className="py-3 px-3 text-center font-medium">BD เดือนนี้</th>
                                      <th className="py-3 px-3 text-center font-medium">สถานะ</th>
                                      <th className="py-3 px-3 text-center w-36">การจัดการ</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                                    {group.machines.map((m, mIndex) => {
                                      const stats = getMachineStats(m.id);
                                      const isDetailExpanded = expandedMachineId === m.id;
                                      const unitNumber = mIndex + 1;
                                      const unitLocation = [m.locationZone, m.locationRoom].filter(Boolean).join(' > ') || m.lineGroup;

                                      return (
                                        <React.Fragment key={m.id}>
                                          <tr 
                                            id={`unit-row-${m.id}`}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                                              isDetailExpanded ? 'bg-cyan-50/40 dark:bg-slate-800/50' : 'bg-white dark:bg-transparent'
                                            }`}
                                          >
                                            {/* Machine Unit Number Badge */}
                                            <td className="py-3 px-3 text-center">
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/40">
                                                เครื่องที่ {unitNumber}
                                              </span>
                                            </td>

                                            {/* ID */}
                                            <td className="py-3 px-3 font-mono font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                                              {m.id}
                                            </td>

                                            {/* Model & Duty */}
                                            <td className="py-3 px-3">
                                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                                {m.model || '-'}
                                              </div>
                                            </td>  
                                             {/* Power */}
                                            <td className="py-3 px-3">
                                              {m.powerVoltage ? (
                                                <div className="text-[11px] text-amber-700 dark:text-amber-400 font-mono font-medium">
                                                  ⚡ {m.powerVoltage}
                                                </div>
                                              ) : (
                                                <span className="text-slate-400 dark:text-slate-500">-</span>
                                              )}
                                            </td>

                                            {/* Location: Zone */}
                                            {showZoneColumn && (
                                              <td className="py-3 px-3">
                                                <span className="pill-zone text-[11px] px-2 py-0.5 rounded-full border font-medium">
                                                  {m.locationZone || '-'}
                                                </span>
                                              </td>
                                            )}

                                            {/* Location: Room */}
                                            {showRoomColumn && (
                                              <td className="py-3 px-3">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="pill-room text-[11px] px-2 py-0.5 rounded-md border font-medium truncate max-w-xs">
                                                    {m.locationRoom || '-'}
                                                  </span>
                                                </div>
                                                {m.serialNumber && (
                                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                                    S/N: {m.serialNumber}
                                                  </div>
                                                )}
                                              </td>
                                            )}  
                                            
                                            {/* PM Count */}
                                            <td className="py-3 px-3 text-center font-bold text-cyan-600 dark:text-cyan-300 font-mono">
                                              {stats.pmCount} งาน
                                            </td>

                                            {/* BD Count */}
                                            <td className="py-3 px-3 text-center font-mono font-bold">
                                              {stats.monthlyBdCount > 0 ? (
                                                <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-500/20">
                                                  {stats.monthlyBdCount} ครั้ง
                                                </span>
                                              ) : (
                                                <span className="text-slate-500 dark:text-slate-400">0</span>
                                              )}
                                            </td>

                                            {/* Status */}
                                            <td className="py-3 px-3 text-center">
                                              {stats.status === 'ปกติ' ? (
                                                <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[11px] px-2 py-0.5 rounded-full font-medium">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                                                  ปกติ
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-[11px] px-2 py-0.5 rounded-full font-medium">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 animate-pulse"></span>
                                                  เสีย-ซ่อม
                                                </span>
                                              )}
                                            </td>

                                            {/* Action Buttons for this specific machine unit */}
                                            <td className="py-3 px-3 text-center">
                                              <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                  id={`btn-edit-${m.id}`}
                                                  onClick={() => handleEditClick(m)}
                                                  className="bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-400 dark:hover:border-amber-500/40 transition cursor-pointer shadow-xs"
                                                  title={`แก้ไขข้อมูลเครื่องที่ ${unitNumber} (${m.id})`}
                                                >
                                                  <Edit3 size={14} className="text-amber-600 dark:text-amber-400" />
                                                </button>
                                                <button
                                                  id={`btn-delete-${m.id}`}
                                                  onClick={() => handleDeleteClick(m)}
                                                  className="bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-400 dark:hover:border-rose-500/40 transition cursor-pointer shadow-xs"
                                                  title={`ลบเครื่องที่ ${unitNumber} (${m.id})`}
                                                >
                                                  <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
                                                </button>
                                                <button
                                                  id={`btn-expand-${m.id}`}
                                                  onClick={() => toggleExpandRow(m.id)}
                                                  className={`px-2 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1 text-[11px] font-medium shadow-xs ${
                                                    isDetailExpanded
                                                      ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/40'
                                                      : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-cyan-600 dark:hover:text-cyan-400'
                                                  }`}
                                                  title={`ดูรายละเอียดสเปก แผน PM และสถิติของเครื่องที่ ${unitNumber}`}
                                                >
                                                  {isDetailExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                  <span>{isDetailExpanded ? 'ปิด' : 'ข้อมูล'}</span>
                                                </button>
                                              </div>
                                            </td>
                                          </tr>

                                          {/* Deep Detail Section (Specs, PM plans & MTTR) for this exact machine */}
                                          {isDetailExpanded && (
                                            <tr className="bg-slate-50/90 dark:bg-slate-900/90">
                                              <td colSpan={8 + (showZoneColumn ? 1 : 0) + (showRoomColumn ? 1 : 0)} className="p-3">
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
                  const fullLocation = [m.locationZone, m.locationRoom].filter(Boolean).join(' > ') || m.lineGroup;

                  return (
                    <React.Fragment key={m.id}>
                      <tr 
                        id={`row-${m.id}`}
                        className={`hover:bg-slate-700/30 transition-colors ${isExpanded ? 'bg-slate-700/20' : ''}`}
                      >
                        <td className="py-4 px-4 text-center text-slate-400 text-xs font-mono">
                          {index + 1}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-slate-200">{m.name}</div>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            {m.model && (
                              <span className="text-xs text-slate-400">Model: {m.model}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-cyan-400 text-sm">
                          {m.id}
                        </td>
                        {/* Zone */}
                        {showZoneColumn && (
                          <td className="py-4 px-4">
                            <span className="pill-zone text-xs px-2.5 py-0.5 rounded-full border font-medium">
                              {m.locationZone || '-'}
                            </span>
                          </td>
                        )}

                        {/* Room */}
                        {showRoomColumn && (
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="pill-room text-xs px-2.5 py-0.5 rounded-md border font-medium">
                                {m.locationRoom || '-'}
                              </span>
                            </div>
                            {m.powerVoltage && (
                              <div className="text-[11px] text-amber-400 font-mono mt-0.5">
                                ⚡ {m.powerVoltage}
                              </div>
                            )}
                          </td>
                        )}
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
                              title="ดูรายละเอียดเชิงลึกและสเปก"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Section */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-slate-900/40">
                          <td colSpan={7 + (showZoneColumn ? 1 : 0) + (showRoomColumn ? 1 : 0)} className="p-3">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-sm p-4" id="machine-add-modal-overlay">
          <div className="bg-surface dark:bg-slate-800 border border-border dark:border-slate-700 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-155 max-h-[90vh] flex flex-col" id="machine-add-modal">
            <div className="bg-slate-50 dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-900 border-b border-border dark:border-slate-700/80 p-5 flex justify-between items-center shrink-0">
              <h3 className="text-base font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                ➕ เพิ่มข้อมูลทะเบียนเครื่องจักรใหม่
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xl font-medium focus:outline-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleAddMachine} className="p-6 space-y-4 overflow-y-auto flex-1">
              {errorMsg && (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs p-3 rounded-lg flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column B: รหัสอุปกรณ์ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">รหัสอุปกรณ์ (Machine ID)*</label>
                  <input
                    id="modal-machine-id"
                    type="text"
                    required
                    placeholder="ตัวอย่างเช่น RIM01, FFS04, BCF07"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-border dark:border-slate-700 rounded-lg px-3.5 py-2 text-fg dark:text-slate-200 uppercase placeholder-slate-400 dark:placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Column C: รายชื่อเครื่องจักร */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">รายชื่อเครื่องจักร (Machine Name)*</label>
                  <input
                    id="modal-machine-name"
                    type="text"
                    required
                    placeholder="ตัวอย่างเช่น RICE MIXER, BANDING, INK JET"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-border dark:border-slate-700 rounded-lg px-3.5 py-2 text-fg dark:text-slate-200 uppercase placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* หน้าที่ (Duty / Line Group) - Prominent and easy to find */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <Briefcase size={13} className="text-amber-600 dark:text-amber-400" />
                    <span>หน้าที่ (Duty / Line Group)*</span>
                  </label>
                  <input
                    id="modal-machine-line"
                    type="text"
                    placeholder="ตัวอย่างเช่น LINE A, PACKING, UTILITY, SEALER"
                    value={newLineGroup}
                    onChange={(e) => setNewLineGroup(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-500/50 rounded-lg px-3.5 py-2 text-amber-900 dark:text-amber-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Column D: Model (รุ่น) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Model (รุ่น)</label>
                  <input
                    id="modal-machine-model"
                    type="text"
                    placeholder="ตัวอย่างเช่น RM-500X, VC-120-Pro"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-border dark:border-slate-700 rounded-lg px-3.5 py-2 text-fg dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Column E: แรงดัน/กำลังไฟ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">แรงดัน / กำลังไฟ</label>
                  <input
                    id="modal-machine-voltage"
                    type="text"
                    placeholder="ตัวอย่างเช่น 380V 3P 7.5kW, 220V 1P 1.5kW"
                    value={newPowerVoltage}
                    onChange={(e) => setNewPowerVoltage(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-border dark:border-slate-700 rounded-lg px-3.5 py-2 text-fg dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Column F: วันที่ติดตั้ง */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">วันที่ติดตั้ง</label>
                  <input
                    id="modal-machine-install-date"
                    type="date"
                    value={newInstallDate}
                    onChange={(e) => setNewInstallDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-border dark:border-slate-700 rounded-lg px-3.5 py-2 text-fg dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Column G: บริษัทผู้ขาย */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">บริษัทผู้ขาย (Vendor)</label>
                  <input
                    id="modal-machine-vendor"
                    type="text"
                    placeholder="ตัวอย่างเช่น Kanto Machinery Co., Ltd."
                    value={newVendor}
                    onChange={(e) => setNewVendor(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-border dark:border-slate-700 rounded-lg px-3.5 py-2 text-fg dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Column H & I: โซน และ ห้อง (เลือกจากโครงสร้าง หรือเพิ่มโซน/ห้องใหม่ได้) */}
                <ZoneRoomFieldGroup
                  zone={newLocationZone}
                  room={newLocationRoom}
                  onZoneChange={(z) => {
                    setNewLocationZone(z);
                    if (!newLineGroup) setNewLineGroup(z);
                  }}
                  onRoomChange={setNewLocationRoom}
                  onOpenManager={() => setShowZoneManagerModal(true)}
                  idPrefix="modal-add"
                />

                {/* Column J: Serial Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Serial Number</label>
                  <input
                    id="modal-machine-serial"
                    type="text"
                    placeholder="ตัวอย่างเช่น SN-RM-2024-001"
                    value={newSerialNumber}
                    onChange={(e) => setNewSerialNumber(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-border dark:border-slate-700 rounded-lg px-3.5 py-2 text-fg dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Column K: หมายเหตุ */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">หมายเหตุ</label>
                <textarea
                  id="modal-machine-notes"
                  rows={2}
                  placeholder="หมายเหตุเพิ่มเติม ข้อควรระวัง หรือประวัติการซ่อมบำรุง"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-border dark:border-slate-700 rounded-lg px-3.5 py-2 text-fg dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-border dark:border-slate-700/60 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="border border-border dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs tracking-wide px-4 py-2.5 rounded-lg transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  id="modal-btn-save-machine"
                  type="submit"
                  className="bg-accent font-bold text-xs tracking-wide px-5 py-2.5 rounded-lg transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-sm p-4" id="machine-edit-modal-overlay">
          <div className="bg-surface dark:bg-slate-800 border border-border dark:border-slate-700 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-155 max-h-[90vh] flex flex-col" id="machine-edit-modal">
            <div className="bg-slate-50 dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-900 border-b border-border dark:border-slate-700/80 p-5 flex justify-between items-center shrink-0">
              <h3 className="text-base font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                ✏️ แก้ไขข้อมูลทะเบียนเครื่องจักร
              </h3>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMachine(null);
                }}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xl font-medium focus:outline-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleEditMachine} className="p-6 space-y-4 overflow-y-auto flex-1">
              {editErrorMsg && (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs p-3 rounded-lg flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  {editErrorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column B: Machine ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-400">รหัสอุปกรณ์ (Machine ID)</label>
                  <div className="bg-slate-100 dark:bg-slate-900 border border-border dark:border-slate-700/50 rounded-lg px-3.5 py-2 font-mono text-sm text-cyan-700 dark:text-cyan-400 font-bold select-none">
                    {editingMachine.id}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    * ไม่สามารถเปลี่ยนรหัสอ้างอิงที่เชื่อมกับแผนงาน PM และสถิติได้
                  </p>
                </div>

                {/* Column C: Machine Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">รายชื่อเครื่องจักร (Machine Name)*</label>
                  <input
                    id="modal-edit-machine-name"
                    type="text"
                    required
                    placeholder="ตัวอย่างเช่น RICE MIXER, BANDING, INK JET"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-border dark:border-slate-700 rounded-lg px-3.5 py-2 text-fg dark:text-slate-200 uppercase placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* หน้าที่ (Duty / Line Group) - Prominent and easy to find */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <Briefcase size={13} className="text-amber-600 dark:text-amber-400" />
                    <span>หน้าที่ (Duty / Line Group)*</span>
                  </label>
                  <input
                    id="modal-edit-machine-line"
                    type="text"
                    placeholder="ตัวอย่างเช่น LINE A, PACKING, ROBOT, UTILITY"
                    value={editLineGroup}
                    onChange={(e) => setEditLineGroup(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-500/50 rounded-lg px-3.5 py-2 text-amber-900 dark:text-amber-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Column D: Model */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Model (รุ่น)</label>
                  <input
                    id="modal-edit-machine-model"
                    type="text"
                    placeholder="ตัวอย่างเช่น RM-500X, VC-120-Pro"
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-border dark:border-slate-700 rounded-lg px-3.5 py-2 text-fg dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Column E: แรงดัน/กำลังไฟ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">แรงดัน / กำลังไฟ</label>
                  <input
                    id="modal-edit-machine-voltage"
                    type="text"
                    placeholder="ตัวอย่างเช่น 380V 3P 7.5kW"
                    value={editPowerVoltage}
                    onChange={(e) => setEditPowerVoltage(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-border dark:border-slate-700 rounded-lg px-3.5 py-2 text-fg dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Column F: วันที่ติดตั้ง */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">วันที่ติดตั้ง</label>
                  <input
                    id="modal-edit-machine-install-date"
                    type="date"
                    value={editInstallDate}
                    onChange={(e) => setEditInstallDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-border dark:border-slate-700 rounded-lg px-3.5 py-2 text-fg dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Column G: บริษัทผู้ขาย */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">บริษัทผู้ขาย (Vendor)</label>
                  <input
                    id="modal-edit-machine-vendor"
                    type="text"
                    placeholder="ตัวอย่างเช่น Kanto Machinery Co., Ltd."
                    value={editVendor}
                    onChange={(e) => setEditVendor(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-border dark:border-slate-700 rounded-lg px-3.5 py-2 text-fg dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Column H & I: โซน และ ห้อง (เลือกจากโครงสร้าง หรือเพิ่มโซน/ห้องใหม่ได้) */}
                <ZoneRoomFieldGroup
                  zone={editLocationZone}
                  room={editLocationRoom}
                  onZoneChange={setEditLocationZone}
                  onRoomChange={setEditLocationRoom}
                  onOpenManager={() => setShowZoneManagerModal(true)}
                  idPrefix="modal-edit"
                />

                {/* Column J: Serial Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Serial Number</label>
                  <input
                    id="modal-edit-machine-serial"
                    type="text"
                    placeholder="ตัวอย่างเช่น SN-RM-2024-001"
                    value={editSerialNumber}
                    onChange={(e) => setEditSerialNumber(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-border dark:border-slate-700 rounded-lg px-3.5 py-2 text-fg dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Line Group and Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">สถานะของเครื่องจักร</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'ปกติ' | 'เสีย/ซ่อม')}
                    className="w-full bg-white dark:bg-slate-900 border border-border dark:border-slate-700 rounded-lg px-3.5 py-2 text-fg dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ปกติ">ปกติ (Normal)</option>
                    <option value="เสีย/ซ่อม">เสีย / ซ่อม (Breakdown)</option>
                  </select>
                </div>
              </div>

              {/* Column K: หมายเหตุ */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">หมายเหตุ</label>
                <textarea
                  id="modal-edit-machine-notes"
                  rows={2}
                  placeholder="หมายเหตุเพิ่มเติม ข้อควรระวัง หรือประวัติการซ่อมบำรุง"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-border dark:border-slate-700 rounded-lg px-3.5 py-2 text-fg dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-border dark:border-slate-700/60 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMachine(null);
                  }}
                  className="border border-border dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs tracking-wide px-4 py-2.5 rounded-lg transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  id="modal-btn-update-machine"
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs tracking-wide px-5 py-2.5 rounded-lg transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-sm p-4" id="machine-delete-modal-overlay">
          <div className="bg-surface dark:bg-slate-800 border border-border dark:border-slate-700/80 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-155 text-xs text-fg dark:text-slate-200" id="machine-delete-modal">
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-border dark:border-slate-700/80 p-5 flex items-center gap-2.5">
              <AlertTriangle className="text-rose-600 dark:text-rose-450 shrink-0" size={20} />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                ยืนยันการลบข้อมูลเครื่องจักรอย่างถาวร?
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-slate-700 dark:text-slate-300 font-sans leading-relaxed text-[13px]">
                คุณแน่ใจหรือไม่ว่าต้องการลบเครื่องจักร <span className="text-rose-600 dark:text-rose-400 font-mono font-bold">{machineToDelete.id}</span> ({machineToDelete.name}) ออกจากระบบทะเบียน?
              </p>

              <div className="bg-rose-50 dark:bg-[#10080a] border border-rose-200 dark:border-rose-500/15 p-4.5 rounded-xl space-y-2">
                <span className="text-[10px] text-rose-700 dark:text-rose-400 font-black tracking-wider uppercase block">⚠️ คำเตือนผลกระทบ:</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed font-sans">
                  การลบทะเบียนนี้จะลบสัญลักษณ์ไอคอนและข้อมูลเครื่องพิกัดนี้ออก โดยเครื่องจักรดังกล่าวมีแผนบำรุงรักษา PM พ่วงอยู่จำนวน <b className="text-fg font-mono">{pmPlans.filter(p => p.machineId === machineToDelete.id).length} แผนงาน</b>
                </p>
              </div>
              
              <div className="pt-4 border-t border-border dark:border-slate-700/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setMachineToDelete(null);
                  }}
                  className="border border-border dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg transition font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  id="modal-btn-delete-machine-confirm"
                  onClick={executeDeleteMachine}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2 rounded-lg transition cursor-pointer"
                >
                  ยืนยันลบข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Machine Excel Import Modal */}
      <MachineImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
        existingMachines={machines}
        onDownloadTemplate={handleDownloadTemplateExcel}
      />

      {/* Zone & Room Hierarchy Structure Manager Modal */}
      <ZoneRoomManagerModal
        isOpen={showZoneManagerModal}
        onClose={() => setShowZoneManagerModal(false)}
        onSelectZoneRoom={(zone, room) => {
          setSelectedZone(zone);
          setSelectedRoom(room);
          setShowZoneManagerModal(false);
        }}
      />
    </div>
  );
};

