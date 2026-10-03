import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SparePart } from '../types';
import { 
  Package, Search, AlertTriangle, Plus, Edit2, Trash2, 
  RefreshCw, CheckCircle, Settings, HelpCircle, ArrowUpDown, Filter, 
  MapPin, Tag, CircleDollarSign, Compass, Info, FileText, ChevronRight,
  FileSpreadsheet, Download, Upload, AlertCircle, RefreshCw as LoopIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getTodayDateString } from '../utils/pmAlerts';
import { SparePartImportModal } from './SparePartImportModal';

export const InventoryPage: React.FC = () => {
  const { spareParts, setSpareParts, machines, recordStockChange } = useApp();

  // Selection state for spare parts (bulk operations)
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);

  // Beautiful Custom Non-Blocking Alert/Confirm State Dialog
  const [customDialog, setCustomDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'danger' | 'info';
    showCancel: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    showCancel: false
  });

  const showCustomAlert = (title: string, message: string, type: 'success' | 'warning' | 'danger' | 'info' = 'info') => {
    setCustomDialog({
      isOpen: true,
      title,
      message,
      type,
      showCancel: false
    });
  };

  const showCustomConfirm = (title: string, message: string, onConfirm: () => void, type: 'success' | 'warning' | 'danger' | 'info' = 'danger') => {
    setCustomDialog({
      isOpen: true,
      title,
      message,
      type,
      showCancel: true,
      onConfirm: () => {
        onConfirm();
        setCustomDialog(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        setCustomDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedMachine, setSelectedMachine] = useState('ALL');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'quantity' | 'pricePerUnit'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);

  // Form Fields State
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('ระบบเครื่องกล');
  const [formMachineIds, setFormMachineIds] = useState<string[]>([]);
  const [formQuantity, setFormQuantity] = useState(0);
  const [formMinRequired, setFormMinRequired] = useState(2);
  const [formUnit, setFormUnit] = useState('ชิ้น');
  const [formLocation, setFormLocation] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formSpecs, setFormSpecs] = useState('');

  // Excel Import State
  const [showImportModal, setShowImportModal] = useState(false);

  // Quick Adjustment State
  const [adjustmentQty, setAdjustmentQty] = useState(1);
  const [adjustmentType, setAdjustmentType] = useState<'IN' | 'OUT'>('IN');
  const [adjustmentNote, setAdjustmentNote] = useState('');

  // Dropdown Categories
  const categories = [
    'อุปกรณ์ไฟฟ้าและทำความร้อน',
    'วัสดุสิ้นเปลือง',
    'ระบบส่งกำลัง',
    'นิวเมติกส์',
    'ระบบเครื่องกล',
    'เซนเซอร์/เซฟตี้'
  ];

  // Handle Sort Change
  const triggerSort = (field: 'id' | 'name' | 'quantity' | 'pricePerUnit') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // KPI Calculations
  const totalSKUs = spareParts.length;
  const lowStockParts = spareParts.filter(p => p.quantity <= p.minRequired);
  const outOfStockParts = spareParts.filter(p => p.quantity === 0);
  const totalInventoryValue = spareParts.reduce((sum, p) => sum + (p.quantity * p.pricePerUnit), 0);

  // Filter & Sort Spare Parts list
  const filteredParts = spareParts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          part.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (part.specifications && part.specifications.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'ALL' || part.category === selectedCategory;
    
    const matchesMachine = selectedMachine === 'ALL' || part.machineIds.includes(selectedMachine);
    
    const matchesLowStock = !filterLowStock || part.quantity <= part.minRequired;

    return matchesSearch && matchesCategory && matchesMachine && matchesLowStock;
  }).sort((a, b) => {
    let checkA: any = a[sortBy];
    let checkB: any = b[sortBy];

    if (typeof checkA === 'string') {
      checkA = checkA.toLowerCase();
      checkB = checkB.toLowerCase();
    }

    if (checkA < checkB) return sortOrder === 'asc' ? -1 : 1;
    if (checkA > checkB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Reset Add Form
  const openNewPartModal = () => {
    // Auto-generate ID index
    const nextNum = spareParts.length > 0 
      ? Math.max(...spareParts.map(p => {
          const num = parseInt(p.id.replace('SP-', ''));
          return isNaN(num) ? 0 : num;
        })) + 1 
      : 1;
    
    setFormId(`SP-${String(nextNum).padStart(2, '0')}`);
    setFormName('');
    setFormCategory('ระบบเครื่องกล');
    setFormMachineIds([]);
    setFormQuantity(5);
    setFormMinRequired(2);
    setFormUnit('ชิ้น');
    setFormLocation('ตู้ A ชั้น 1');
    setFormPrice(250);
    setFormSpecs('');
    setShowAddModal(true);
  };

  // Handle Add Part submit
  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formId.trim() || !formName.trim()) return;

    if (spareParts.some(p => p.id === formId)) {
      showCustomAlert('รหัสซ้ำ', 'มีรหัสอะไหล่นี้อยู่ในระบบคลังแล้ว กรุณาตรวจสอบรหัส SKU ใหม่', 'warning');
      return;
    }

    const newPart: SparePart = {
      id: formId.trim().toUpperCase(),
      name: formName.trim(),
      category: formCategory,
      machineIds: formMachineIds,
      quantity: formQuantity,
      minRequired: formMinRequired,
      unit: formUnit,
      location: formLocation.trim() || 'ตู้แยกด่วน',
      pricePerUnit: formPrice,
      lastRestockedDate: getTodayDateString(),
      specifications: formSpecs.trim()
    };

    setSpareParts([newPart, ...spareParts]);
    setShowAddModal(false);
  };

  // Open Edit Modal
  const openEditPartModal = (part: SparePart) => {
    setSelectedPart(part);
    setFormId(part.id);
    setFormName(part.name);
    setFormCategory(part.category);
    setFormMachineIds(part.machineIds);
    setFormQuantity(part.quantity);
    setFormMinRequired(part.minRequired);
    setFormUnit(part.unit);
    setFormLocation(part.location);
    setFormPrice(part.pricePerUnit);
    setFormSpecs(part.specifications || '');
    setShowEditModal(true);
  };

  // Handle Edit Part submit
  const handleEditPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) return;

    const updatedParts = spareParts.map(p => {
      if (p.id === selectedPart.id) {
        return {
          ...p,
          name: formName.trim(),
          category: formCategory,
          machineIds: formMachineIds,
          quantity: formQuantity,
          minRequired: formMinRequired,
          unit: formUnit,
          location: formLocation.trim(),
          pricePerUnit: formPrice,
          specifications: formSpecs.trim()
        };
      }
      return p;
    });

    setSpareParts(updatedParts);
    setShowEditModal(false);
    setSelectedPart(null);
  };

  // Open Stock Quick Adjustment Modal
  const openStockModal = (part: SparePart) => {
    setSelectedPart(part);
    setAdjustmentQty(1);
    setAdjustmentType('IN');
    setAdjustmentNote('');
    setShowStockModal(true);
  };

  // Handle Stock Quick Adjustment submit
  const handleStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) return;

    const factor = adjustmentType === 'IN' ? 1 : -1;
    const change = adjustmentQty * factor;

    recordStockChange(selectedPart.id, change, {
      type: adjustmentType === 'IN' ? 'IN' : 'OUT',
      source: 'Inventory',
      note: adjustmentNote.trim() || undefined
    });

    setShowStockModal(false);
    setSelectedPart(null);
  };

  // Handle Delete Part
  const handleDeletePart = (id: string, name: string) => {
    showCustomConfirm(
      'ยืนยันลบอะไหล่',
      `คุณพิมพ์ต้องการที่จะลบอะไหล่ "${id}: ${name}" ออกจากระบบคลังอย่างถาวรใช่หรือไม่?\nการกระทำนี้จะลบรายการแบบถาวรและไม่สามารถกู้คืนได้`,
      () => {
        setSpareParts(prev => prev.filter(p => p.id !== id));
        setSelectedPartIds(prev => prev.filter(pId => pId !== id));
        showCustomAlert('ลบเครื่องมือสำเร็จ', `ดำเนินการลบชิ้นชิ้นส่วนอะไหล่รหัส ${id} ออกจากระบบคลังสำเร็จ`, 'success');
      },
      'danger'
    );
  };

  // Handle Bulk Delete Spare Parts
  const handleBulkDelete = () => {
    if (selectedPartIds.length === 0) return;
    showCustomConfirm(
      '⚠️ ยืนยันลบอะไหล่แบบกลุ่ม',
      `คำเตือนระบบคลัง: คุณยินยอมที่จะดำเนินการลบอะไหล่ที่เลือกสะสมทั้งหมดจำนวน ${selectedPartIds.length} รายการออกอย่างถาวรใช่ไหม?\nการกระทำนี้จะทำให้ข้อมูลหายไปและไม่สามารถกู้คืนได้!`,
      () => {
        setSpareParts(prev => prev.filter(p => !selectedPartIds.includes(p.id)));
        setSelectedPartIds([]);
        showCustomAlert('ลบแบบกลุ่มสำเร็จ', `♻️ ดำเนินการลบรายการอะไหล่ที่เลือกสะสมเสร็จสมบูรณ์เรียบร้อย!`, 'success');
      },
      'danger'
    );
  };

  // Helper toggle for machine check list in forms
  const toggleFormMachine = (machineId: string) => {
    if (formMachineIds.includes(machineId)) {
      setFormMachineIds(formMachineIds.filter(id => id !== machineId));
    } else {
      setFormMachineIds([...formMachineIds, machineId]);
    }
  };

  return (
    <div className="space-y-6" id="inventory-page-root">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 rounded-md font-bold text-[10px] uppercase tracking-widest block w-fit">
            Inventory & Spare Parts
          </span>
          <h2 className="text-xl font-black text-fg mt-1.5 flex items-center gap-2">
            ⚙️ ระบบบริหารคลังอะไหล่สำรอง (Inventory Manager)
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            ควบคุมจำนวนอะไหล่หลักขั้นต่ำ ติดตามพิกัดติดตั้ง การเบิกจ่ายจ่ายซ่อม และระบบตรวจเตือนเมื่อชิ้นส่วนสำคัญใกล้หมดคลัง
          </p>
        </div>

        {/* Action Button cluster */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Excel Import button trigger */}
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md select-none cursor-pointer transition active:scale-95"
          >
            <FileSpreadsheet size={15} className="text-emerald-400" />
            <span>📥 นำเข้าจากไฟล์ Excel / CSV</span>
          </button>

          {/* Trigger insert Modal Button */}
          <button
            onClick={openNewPartModal}
            className="px-4.5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg select-none cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>ลงทะเบียนอะไหล่เข้าระบบ</span>
          </button>
        </div>
      </div>

      {/* INVENTORY STATS BENTO TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="inventory-stats-row">
        
        {/* KPI Tile 1: Total SKUs */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl relative overflow-hidden group hover:border-slate-705 transition">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">จำนวนรายการอะไหล่คลัง</span>
              <span className="text-3xl font-mono font-black text-cyan-400 mt-1 block">{totalSKUs} <b className="text-sm font-normal text-slate-400">รายการ</b></span>
            </div>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Package size={18} />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-sans">
            ครอบคลุมอะไหล่เครื่องกล ไฟฟ้า สายพาน ลวดซีล และนิวเมติกส์
          </p>
        </div>

        {/* KPI Tile 2: Out of Stock Warnings */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl relative overflow-hidden group hover:border-slate-705 transition">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">อะไหล่หมดคลัง (Out of Stock)</span>
              <span className={`text-3xl font-mono font-black mt-1 block ${outOfStockParts.length > 0 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                {outOfStockParts.length} <b className="text-sm font-normal text-slate-400">รายการ</b>
              </span>
            </div>
            <div className={`p-2 rounded-lg ${outOfStockParts.length > 0 ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-sans">
            {outOfStockParts.length > 0 
              ? `วิกฤต! อะไหล่ขาดเป็นศูนย์ มีผลกระทบร้ายแรงหากเครื่องเสียหาย` 
              : `คลังทำงานได้ปกติ ไม่มีรายการสินค้าหมดสะสม`}
          </p>
        </div>

        {/* KPI Tile 3: Low Stock Warnings */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl relative overflow-hidden group hover:border-slate-705 transition">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">ใกล้หมดคลัง (Low Stock Alert)</span>
              <span className={`text-3xl font-mono font-black mt-1 block ${lowStockParts.length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {lowStockParts.length} <b className="text-sm font-normal text-slate-400">รายการ</b>
              </span>
            </div>
            <div className={`p-2 rounded-lg ${lowStockParts.length > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-sans">
            {lowStockParts.length > 0
              ? `ระดับสต็อกต่ำกว่าค่าต่ำสุดควรเร่งสั่งซื้อเพื่อความราบรื่น`
              : `ระดับชิ้นส่วนอะไหล่อยู่ในเกณฑ์ปลอดภัยในสัปดาห์นี้`}
          </p>
        </div>

        {/* KPI Tile 4: Inventory Total Value */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl relative overflow-hidden group hover:border-slate-705 transition">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">มูลค่าคงเหลือคลังโดยประมาณ</span>
              <span className="text-3xl font-mono font-black text-emerald-400 mt-1 block">
                {totalInventoryValue.toLocaleString()} <b className="text-sm font-normal text-slate-400">บาท</b>
              </span>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <CircleDollarSign size={18} />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-sans">
            ประเมินมูลค่าต้นทุนอะไหล่หมุนเวียนคงคลัง ณ เวลาปัจจุบัน
          </p>
        </div>

      </div>

      {/* ADVANCED FILTER BAR */}
      <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl space-y-4" id="inventory-filter-bar">
        
        <div className="flex flex-col md:flex-row gap-3">
          {/* Text Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={17} />
            <input
              type="text"
              placeholder="ค้นหาตามรหัส SKU, ชื่ออะไหล่, สเปค หรือฟิล์ม..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 pl-10 pr-4 py-2 rounded-lg text-xs focus:outline-none focus:border-cyan-500 transition font-sans"
            />
          </div>

          {/* Filter Option by Category */}
          <div className="relative shrink-0 md:w-56">
            <Filter className="absolute left-3 top-2.5 text-slate-500" size={15} />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 pl-9 pr-4 py-2 rounded-lg focus:outline-none hover:border-slate-700 transition cursor-pointer appearance-none font-sans"
            >
              <option value="ALL">📦 ทุกหมวดหมู่ (All Categories)</option>
              {categories.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Filter Option by Machine Dependency */}
          <div className="relative shrink-0 md:w-56">
            <Compass className="absolute left-3 top-2.5 text-slate-500" size={15} />
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 pl-9 pr-4 py-2 rounded-lg focus:outline-none hover:border-slate-700 transition cursor-pointer appearance-none font-sans"
            >
              <option value="ALL">🏭 ทุกเครื่องจักร (All Machines)</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>{m.id} - {m.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Low Stock Filter Switch and Clear Status Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-800/60 pt-3 gap-3.5">
          <div className="flex items-center gap-6">
            {/* Low-Stock Toggle Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterLowStock}
                onChange={(e) => setFilterLowStock(e.target.checked)}
                className="w-4 h-4 rounded border-slate-850 text-cyan-500 focus:ring-cyan-500/20 bg-slate-950"
              />
              <span className="text-xs text-slate-350 font-sans flex items-center gap-1.5 font-bold">
                <AlertTriangle size={14} className="text-amber-500 animate-pulse" />
                กรองเฉพาะอะไหล่ที่สต็อกวิกฤต/ใกล้หมด ({lowStockParts.length})
              </span>
            </label>
          </div>

          {/* Quick Clear Button */}
          {(searchQuery || selectedCategory !== 'ALL' || selectedMachine !== 'ALL' || filterLowStock) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setSelectedMachine('ALL');
                setFilterLowStock(false);
              }}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-[10px] uppercase font-bold transition font-mono self-start sm:self-center"
            >
              🧹 ล้างการค้นหาทั้งหมด (Clear Filters)
            </button>
          )}
        </div>

      </div>

      {/* CORE SPARE PARTS INVENTORY TABLE */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl" id="inventory-table-container">
        
        {/* Table Top Counter */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/30 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400 font-sans">
              แสดงอะไหล่ <b className="text-cyan-400 font-mono">{filteredParts.length}</b> จากทั้งหมด <b className="text-slate-200 font-mono">{spareParts.length}</b> รายการ
            </span>

            {selectedPartIds.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-850">
                <span className="text-[10.5px] text-amber-400 font-sans font-bold">
                  เลือกไว้ <b className="font-mono text-fg text-xs">{selectedPartIds.length}</b> รายการ
                </span>
                <span className="text-slate-600">|</span>
                <button
                  onClick={() => setSelectedPartIds([])}
                  className="text-slate-400 hover:text-fg text-[10px] uppercase font-bold cursor-pointer transition select-none"
                >
                  ล้างที่เลือก (Deselect)
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="ml-1 px-2.5 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-fg border border-red-500/20 rounded-md font-bold text-[10px] flex items-center gap-1 transition cursor-pointer select-none"
                  title="ลบอะไหล่ทั้งหมดที่เลือกชั่วคราว"
                >
                  <Trash2 size={11} />
                  <span>ลบแบบกลุ่ม ({selectedPartIds.length})</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400 self-end sm:self-auto">
            <span>จัดเรียงตาม:</span>
            <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-cyan-400 uppercase font-mono font-bold font-sans">
              {sortBy === 'id' ? 'SKU' : sortBy === 'name' ? 'ชื่ออะไหล่' : sortBy === 'quantity' ? 'จำนวนคงคลัง' : 'ราคา'} ({sortOrder})
            </span>
          </div>
        </div>

        {/* View Layout Grid/Table */}
        <div className="overflow-x-auto">
          {filteredParts.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-950/60 border border-slate-850 flex items-center justify-center mx-auto text-slate-600">
                <Package size={28} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">ไม่พบข้อมูลชิ้นส่วนตรงตามตัวกรอง</p>
                <p className="text-xs text-slate-500 mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองหมวดหมู่ของคุณใน แถบตัวกรอง ดำเนินการใหม่อีกครั้ง</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[900px]" id="inventory-data-table">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0e1726]">
                  {/* Bulk Select Checkbox Head */}
                  <th className="p-3.5 text-center w-12 select-none">
                    <input 
                      type="checkbox"
                      checked={filteredParts.length > 0 && filteredParts.every(p => selectedPartIds.includes(p.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newSelected = [...selectedPartIds];
                          filteredParts.forEach(p => {
                            if (!newSelected.includes(p.id)) {
                              newSelected.push(p.id);
                            }
                          });
                          setSelectedPartIds(newSelected);
                        } else {
                          const filteredIds = filteredParts.map(p => p.id);
                          setSelectedPartIds(selectedPartIds.filter(id => !filteredIds.includes(id)));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-800 text-cyan-500 bg-slate-950 focus:ring-0 cursor-pointer"
                      title="เลือกทั้งหมดหน้านี้"
                    />
                  </th>
                  <th 
                    onClick={() => triggerSort('id')}
                    className="p-3.5 text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px] cursor-pointer hover:text-fg hover:bg-slate-800 select-none w-28"
                  >
                    SKU Code <ArrowUpDown size={11} className="inline ml-1" />
                  </th>
                  <th 
                    onClick={() => triggerSort('name')}
                    className="p-3.5 text-slate-400 font-bold uppercase tracking-wider font-sans text-[10px] cursor-pointer hover:text-fg hover:bg-slate-800 select-none"
                  >
                    ชื่ออะไหล่ / สเปค <ArrowUpDown size={11} className="inline ml-1" />
                  </th>
                  <th className="p-3.5 text-slate-400 font-bold uppercase tracking-wider font-sans text-[10px] w-48">
                    หมวดหมู่ (Category)
                  </th>
                  <th className="p-3.5 text-slate-400 font-bold uppercase tracking-wider font-sans text-[10px] w-48">
                    เครื่องที่ใช้ (Machines Dependency)
                  </th>
                  <th 
                    onClick={() => triggerSort('quantity')}
                    className="p-3.5 text-slate-400 font-bold uppercase tracking-wider font-sans text-[10px] cursor-pointer hover:text-fg hover:bg-slate-800 select-none text-center w-36"
                  >
                    จำนวนคงเหลือ <ArrowUpDown size={11} className="inline-block ml-1" />
                  </th>
                  <th className="p-3.5 text-slate-400 font-bold uppercase tracking-wider font-sans text-[10px] w-32">
                    พิกัดจัดเก็บ
                  </th>
                  <th 
                    onClick={() => triggerSort('pricePerUnit')}
                    className="p-3.5 text-slate-400 font-bold uppercase tracking-wider font-sans text-[10px] cursor-pointer hover:text-fg hover:bg-slate-800 select-none text-right w-32"
                  >
                    ราคาต่อหน่วย <ArrowUpDown size={11} className="inline-block ml-1" />
                  </th>
                  <th className="p-3.5 text-slate-400 font-bold uppercase tracking-wider font-sans text-[10px] text-center w-36">
                    การจัดการงานคลัง
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredParts.map((item) => {
                  const isLow = item.quantity <= item.minRequired;
                  const isZero = item.quantity === 0;

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-800/40 transition duration-150 ${isZero ? 'bg-red-950/5' : isLow ? 'bg-amber-950/3' : ''} ${selectedPartIds.includes(item.id) ? 'bg-cyan-950/20' : ''}`}
                    >
                      {/* Row Checkbox select */}
                      <td className="p-3.5 text-center select-none">
                        <input 
                          type="checkbox"
                          checked={selectedPartIds.includes(item.id)}
                          onChange={() => {
                            if (selectedPartIds.includes(item.id)) {
                              setSelectedPartIds(selectedPartIds.filter(id => id !== item.id));
                            } else {
                              setSelectedPartIds([...selectedPartIds, item.id]);
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-800 text-cyan-500 bg-slate-950 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* SKU */}
                      <td className="p-3.5 font-mono text-cyan-400 font-bold">
                        {item.id}
                      </td>

                      {/* Name / Spec */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <p className="font-semibold text-fg leading-normal">{item.name}</p>
                          {item.specifications && (
                            <p className="text-[10px] text-slate-400 italic max-w-sm cut-text leading-relaxed font-sans" title={item.specifications}>
                              ⚙️ Spec: {item.specifications}
                            </p>
                          )}
                          {item.lastRestockedDate && (
                            <p className="text-[8.5px] text-slate-500">
                              เติมเข้าคลังล่าสุด: {item.lastRestockedDate}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5 text-slate-300 font-sans">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 text-[9.5px] text-slate-300">
                          {item.category}
                        </span>
                      </td>

                      {/* Machines Dependents */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {item.machineIds.length === 0 ? (
                            <span className="text-[9.5px] text-slate-500 italic">ทุกเครื่องใช้ได้/อเนกประสงค์</span>
                          ) : (
                            item.machineIds.map((mId) => (
                              <span 
                                key={mId} 
                                className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/15 rounded text-[8.5px] font-mono leading-none"
                              >
                                {mId}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Quantity Stock Count */}
                      <td className="p-3.5">
                        <div className="flex flex-col items-center justify-center space-y-1.5 text-center">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-mono font-black ${
                              isZero ? 'text-red-500' : isLow ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {item.quantity}
                            </span>
                            <span className="text-[10px] text-slate-400">{item.unit}</span>
                          </div>

                          {/* Low alerts indicator badge */}
                          {isZero ? (
                            <span className="px-1.5 py-0.5 bg-red-500/15 text-red-500 border border-red-500/20 text-[8.5px] font-black uppercase rounded leading-none font-sans animate-pulse">
                              🛑 สต็อกหมด
                            </span>
                          ) : isLow ? (
                            <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-500 border border-amber-500/20 text-[8.5px] font-black uppercase rounded leading-none font-sans">
                              ⚠️ ต่ำกว่าเกณฑ์ ({item.minRequired})
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 text-[8px] font-bold uppercase rounded leading-none font-sans">
                              ปกติ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Location shelf */}
                      <td className="p-3.5 text-slate-300 font-sans font-medium">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono">
                          <MapPin size={11} className="text-slate-500 shrink-0" />
                          {item.location}
                        </span>
                      </td>

                      {/* Price Per Unit */}
                      <td className="p-3.5 text-right font-mono text-slate-200">
                        {item.pricePerUnit > 0 ? (
                          <>
                            <span className="font-bold">{item.pricePerUnit.toLocaleString()}</span>
                            <span className="text-[9px] text-slate-500 ml-1">฿</span>
                          </>
                        ) : (
                          <span className="text-slate-500 font-sans italic">ไม่มีราคา</span>
                        )}
                      </td>

                      {/* Trigger operations */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          
                          {/* Stock Quick Adjustment */}
                          <button
                            onClick={() => openStockModal(item)}
                            className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-350 hover:text-fg px-2 py-1 rounded transition text-[10px] flex items-center gap-1 font-sans cursor-pointer select-none"
                            title="ปรับยอดเบิกจ่าย หรือ ตรวจนับสต็อกล่าสุ"
                          >
                            <RefreshCw size={11} />
                            <span>เบิก/รับ</span>
                          </button>

                          {/* Edit info Form */}
                          <button
                            onClick={() => openEditPartModal(item)}
                            className="p-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-cyan-400 rounded text-slate-400 transition cursor-pointer select-none"
                            title="แก้ไขข้อมูลอะไหล่"
                          >
                            <Edit2 size={11} />
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={() => handleDeletePart(item.id, item.name)}
                            className="p-1.5 bg-slate-950 border border-slate-850 hover:border-red-950 hover:text-red-500 rounded text-slate-500 transition cursor-pointer select-none"
                            title="ลบข้อมูลชิ้นส่วนนี้"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* QUICK INVENTORY USAGE ADVICE GUIDE */}
      <div className="bg-slate-950/40 rounded-xl p-4.5 border border-slate-800 flex flex-col md:flex-row items-start md:items-center gap-4 text-xs">
        <Info size={18} className="text-cyan-400 shrink-0 mt-0.5 md:mt-0" />
        <p className="text-slate-450 leading-relaxed font-sans">
          💡 <b>คำแนะนำปฏิบัติการณ์:</b> เมื่อช่างทำการเบิกใช้ชิ้นส่วนอะไหล่ไปปฏิบัติงาน เช่น ซ่อมหยุดด่วน (Wrench) หรือ ซ่อมเชิงป้องกัน (PM) หรือ Kaizen พนักงานช่างควรทำมาอัปเดตยอดคงเหลือในหน้านี้ทันทีโดยกดปุ่ม <b>"เบิก/รับ"</b> เพื่อรักษาวินัยคลังและไม่ให้เครื่องจักรต้องรออะไหล่สะดุดสายพานผลิตในอนาคต
        </p>
      </div>

      {/* ========================================================================= */}
      {/* ========================== MODAL: REGISTER NEW SPARE PART ========================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="inventory-add-modal-overlay">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden" id="inventory-add-modal">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-fg uppercase tracking-wider flex items-center gap-1.5">
                <Package size={16} className="text-cyan-400" />
                ลงทะเบียนอุปกรณ์อะไหล่ใหม่เข้าระบบคลัง
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-200 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleAddPart} className="p-5 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                {/* ID/SKU */}
                <div>
                  <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">รหัสอะไหล่ (SKU Code) *</label>
                  <input
                    type="text"
                    required
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-fg font-mono rounded focus:border-cyan-500 focus:outline-none"
                    placeholder="เช่น SP-09"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">หมวดหมู่อะไหล่</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-slate-300 rounded focus:border-cyan-500 focus:outline-none cursor-pointer"
                  >
                    {categories.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Part Name */}
              <div>
                <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">ชื่อชิ้นส่วนอะไหล่สำรอง (Spare Part Name) *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-2 text-fg rounded focus:border-cyan-500 focus:outline-none"
                  placeholder="เช่น มอเตอร์ไฟฟ้าดีซี 24V หรือ เทอร์โมคัปเปิลชนิด K"
                />
              </div>

              {/* Dynamic machine checkboxes dependency */}
              <div>
                <label className="block text-slate-420 font-bold mb-1.5 uppercase text-[10px]">เครื่องจักรที่เกี่ยวข้องใช้งานร่วมกัน (Machines)</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 border border-slate-800 max-h-[105px] overflow-y-auto rounded scrollbar-thin">
                  {machines.map((m) => {
                    const isChecked = formMachineIds.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-1.5 cursor-pointer text-slate-350 select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleFormMachine(m.id)}
                          className="w-3.5 h-3.5 rounded border-slate-800 text-cyan-500 bg-slate-950"
                        />
                        <span className="font-mono text-[10.5px] truncate">{m.id}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[9.5px] text-slate-500 mt-1">
                  * หากเว้นว่างไว้ทั้งหมด หมายถึง อะไหล่ใช้ร่วมกันอเนกประสงค์ (General Facility Parts)
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Quantity */}
                <div>
                  <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">จำนวนสต็อกแรกเข้า</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-fg font-mono rounded focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Min Stock Required Warnings */}
                <div>
                  <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">จุดต่ำแจ้งเตือน (Min Alert)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formMinRequired}
                    onChange={(e) => setFormMinRequired(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-fg font-mono rounded focus:border-cyan-500 focus:outline-none font-sans"
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">หน่วยนับ</label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-fg rounded focus:border-cyan-500 focus:outline-none"
                    placeholder="เช่น ชิ้น, ตัว, ม้วน"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Location Shelf */}
                <div>
                  <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">ตู้เก็บ/ตำแหน่งจัดเก็บ</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-fg rounded focus:border-cyan-500 focus:outline-none"
                    placeholder="เช่น ตู้ A ชั้น 3, บอร์ดเครื่องพ่น"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">ราคาต่อหน่วย (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-fg font-mono rounded focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Specifications / Notes */}
              <div>
                <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">รายละเอียดทางเทคนิค / สเปคสกัด</label>
                <textarea
                  value={formSpecs}
                  onChange={(e) => setFormSpecs(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-2 text-fg rounded focus:border-cyan-500 focus:outline-none font-sans h-16 resize-none"
                  placeholder="เช่น มอเตอร์ยี่ห้อ Omron ใช้งาน 1/2HP หรือ ลวดซีลแว็กซ์ชนิดร่องแบน ทนแรงดึง..."
                />
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-lg cursor-pointer select-none transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-accent font-black rounded-lg cursor-pointer select-none transition flex items-center gap-1.5"
                >
                  <CheckCircle size={14} strokeWidth={2.5} />
                  <span>ยืนยันบันทึกเข้าระบบ</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================== MODAL: EDIT SPARE PART ========================== */}
      {showEditModal && selectedPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="inventory-edit-modal-overlay">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden" id="inventory-edit-modal">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-fg uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                <Edit2 size={15} className="text-cyan-400" />
                แก้ไขข้อมูลอะไหล่ระบบ SKU: {selectedPart.id}
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-500 hover:text-slate-200 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleEditPart} className="p-5 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                {/* SKU (Disabled read only in Edit) */}
                <div>
                  <label className="block text-slate-450 mb-1 uppercase text-[9.5px]">รหัสอะไหล่ (SKU Code)</label>
                  <input
                    type="text"
                    disabled
                    value={formId}
                    className="w-full bg-slate-950/60 border border-slate-850 p-2 text-slate-400 font-mono rounded cursor-not-allowed"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">หมวดหมู่อะไหล่</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-slate-300 rounded focus:border-cyan-500 focus:outline-none cursor-pointer"
                  >
                    {categories.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Part Name */}
              <div>
                <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">ชื่อชิ้นส่วนอะไหล่ *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-2 text-fg rounded focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Dynamic machine checkboxes dependency */}
              <div>
                <label className="block text-slate-420 font-bold mb-1.5 uppercase text-[10px]">เครื่องจักรที่เกี่ยวข้องใช้งานร่วมกัน (Machines)</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 border border-slate-800 max-h-[105px] overflow-y-auto rounded scrollbar-thin">
                  {machines.map((m) => {
                    const isChecked = formMachineIds.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-1.5 cursor-pointer text-slate-350 select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleFormMachine(m.id)}
                          className="w-3.5 h-3.5 rounded border-slate-800 text-cyan-500 bg-slate-950"
                        />
                        <span className="font-mono text-[10.5px] truncate">{m.id}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Quantity */}
                <div>
                  <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">จำนวนสต็อกคงเหลือ</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-fg font-mono rounded focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Min Stock Required Warnings */}
                <div>
                  <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">จุดต่ำแจ้งเตือน (Min Required)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formMinRequired}
                    onChange={(e) => setFormMinRequired(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-fg font-mono rounded focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">หน่วยนับ</label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-fg rounded focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Location Shelf */}
                <div>
                  <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">ตู้วาง/ตำแหน่งจัดเก็บ</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-fg rounded focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">ราคาต่อหน่วย (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-fg font-mono rounded focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Specifications / Notes */}
              <div>
                <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">รายละเอียดทางเทคนิค / สเปค/ ประวัติอัปเดต</label>
                <textarea
                  value={formSpecs}
                  onChange={(e) => setFormSpecs(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-2 text-fg rounded focus:border-cyan-500 focus:outline-none font-sans h-20"
                  placeholder="สเปค อะไหล่ หรือ บันทึก ประวัติคลัง..."
                />
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-lg cursor-pointer select-none transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-accent font-black rounded-lg cursor-pointer select-none transition flex items-center gap-1.5"
                >
                  <CheckCircle size={14} strokeWidth={2.5} />
                  <span>บันทึกการเปลี่ยนแปลง</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ======================= MODAL: QUICK STOCK ADJ (IN / OUT) ======================= */}
      {showStockModal && selectedPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="inventory-stock-modal-overlay">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" id="inventory-stock-modal">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-black text-fg uppercase tracking-wider flex items-center gap-1.5">
                <RefreshCw size={14} className="text-cyan-400 rotate-180" />
                เบิกหรือรับชิ้นส่วนอะไหล่ (Quick Stock Adjust)
              </h3>
              <button 
                onClick={() => setShowStockModal(false)}
                className="text-slate-500 hover:text-slate-200 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleStockAdjustment} className="p-5 space-y-4 text-xs">
              
              <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-lg text-xs">
                <p className="text-slate-500 font-mono font-bold text-[9px]">ชิ้นส่วนเป้าหมาย</p>
                <p className="text-cyan-400 font-mono font-black text-[12px] mt-0.5">{selectedPart.id}</p>
                <p className="text-slate-100 font-bold font-sans mt-1 leading-normal">{selectedPart.name}</p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800/80 text-[10px]">
                  <span className="text-slate-400">สต็อกคงเหลือปัจจุบัน:</span>
                  <span className="font-mono font-bold text-fg text-xs">{selectedPart.quantity} {selectedPart.unit}</span>
                </div>
              </div>

              {/* Adjustment Mode selector */}
              <div>
                <label className="block text-slate-420 font-bold mb-1.5 uppercase text-[10px]">ปฏิบัติการคลัง</label>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('IN')}
                    className={`py-2 border rounded-lg font-black tracking-wider transition ${
                      adjustmentType === 'IN' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-slate-950 text-slate-450 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    📥 รับเข้าคลัง (Restock In)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('OUT')}
                    className={`py-2 border rounded-lg font-black tracking-wider transition ${
                      adjustmentType === 'OUT' 
                        ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                        : 'bg-slate-950 text-slate-450 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    📤 จ่ายเบิกซ่อม (Use Out)
                  </button>
                </div>
              </div>

              {/* Adjust Quantity spinner */}
              <div>
                <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">จำนวนชิ้นส่วน (Adjustment Qty)</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentQty(Math.max(1, adjustmentQty - 1))}
                    className="w-10 h-10 bg-slate-950 hover:bg-slate-850 text-fg font-black rounded-lg border border-slate-800 text-lg transition select-none cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustmentQty}
                    onChange={(e) => setAdjustmentQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 bg-slate-950 border border-slate-800 p-2.5 text-center text-fg font-mono font-black rounded-lg focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustmentQty(adjustmentQty + 1)}
                    className="w-10 h-10 bg-slate-950 hover:bg-slate-850 text-fg font-black rounded-lg border border-slate-800 text-lg transition select-none cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Adjustment Notes */}
              <div>
                <label className="block text-slate-420 font-bold mb-1 uppercase text-[10px]">บันทึกบันทึกช่วยจำ (เช่น เบิกหน้าเครื่องไหน / รหัสผู้เบิก)</label>
                <input
                  type="text"
                  required
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-2 text-fg rounded focus:border-cyan-500 focus:outline-none font-sans"
                  placeholder="เช่น ซ่อม VAC01 กะบ่าย, รับสต็อกเติมของใหม่"
                />
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-805 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-lg cursor-pointer select-none transition"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  className={`px-4.5 py-2 font-black rounded-lg cursor-pointer select-none transition flex items-center gap-1.5 ${
                    adjustmentType === 'IN' 
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' 
                      : 'bg-red-500 hover:bg-red-400 text-fg'
                  }`}
                >
                  <CheckCircle size={14} strokeWidth={2.5} />
                  <span>บันทึกสต็อก {adjustmentType === 'IN' ? 'รับเข้า' : 'เบิกออก'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================== MODAL: EXCEL IMPORT MANAGER ========================== */}
      <SparePartImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />

      {/* ========================================================================= */}
      {/* ==================== CUSTOM MODAL: ALERT & CONFIRMATON ==================== */}
      {customDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in" id="custom-alert-confirm-overlay">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden scale-95 md:scale-100 transition-all">
            {/* Header depending on type */}
            <div className={`p-4 border-b border-slate-800/80 flex items-center gap-2.5 ${
              customDialog.type === 'danger' ? 'bg-red-500/10 text-red-400 border-b border-red-500/20' :
              customDialog.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border-b border-amber-500/20' :
              customDialog.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20' :
              'bg-blue-500/10 text-blue-400 border-b border-blue-500/20'
            }`}>
              {customDialog.type === 'danger' && <AlertCircle size={18} className="shrink-0" />}
              {customDialog.type === 'warning' && <AlertTriangle size={17} className="shrink-0" />}
              {customDialog.type === 'success' && <CheckCircle size={18} className="shrink-0" />}
              {customDialog.type === 'info' && <Info size={18} className="shrink-0" />}
              
              <h3 className="text-xs font-black uppercase tracking-wider text-fg">
                {customDialog.title}
              </h3>
            </div>

            {/* Message Body */}
            <div className="p-5">
              <p className="text-slate-300 text-xs font-sans leading-relaxed whitespace-pre-wrap">
                {customDialog.message}
              </p>
            </div>

            {/* Actions button footer */}
            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex justify-end items-center gap-2 text-xs">
              {customDialog.showCancel && (
                <button
                  type="button"
                  onClick={customDialog.onCancel}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-lg cursor-pointer transition select-none"
                >
                  ยกเลิก
                </button>
              )}
              
              <button
                type="button"
                id="custom-confirm-accept-btn"
                onClick={() => {
                  if (customDialog.onConfirm) {
                    customDialog.onConfirm();
                  } else {
                    setCustomDialog(prev => ({ ...prev, isOpen: false }));
                  }
                }}
                className={`px-5 py-2 font-black rounded-lg transition text-slate-950 cursor-pointer shadow-lg select-none ${
                  customDialog.type === 'danger' ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500' :
                  customDialog.type === 'warning' ? 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500' :
                  customDialog.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500' :
                  'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500'
                }`}
              >
                {customDialog.showCancel ? 'ยืนยันดำเนินการ' : 'ตกลง'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
