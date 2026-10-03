import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SparePart } from '../types';
import { 
  FileSpreadsheet, Upload, Download, CheckCircle, 
  FileText, Sparkles, X, AlertCircle, AlertTriangle, Package
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getTodayDateString } from '../utils/pmAlerts';

interface SparePartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SparePartImportModal: React.FC<SparePartImportModalProps> = ({
  isOpen,
  onClose
}) => {
  const { spareParts, setSpareParts } = useApp();

  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({
    id: '',
    name: '',
    category: '',
    quantity: '',
    minRequired: '',
    unit: '',
    location: '',
    pricePerUnit: '',
    specifications: '',
    machineIds: ''
  });
  const [importMode, setImportMode] = useState<'OVERWRITE_DUPLICATES' | 'SKIP_DUPLICATES' | 'REPLACE_ALL'>('OVERWRITE_DUPLICATES');
  const [fileName, setFileName] = useState('');
  const [importPreview, setImportPreview] = useState<SparePart[]>([]);

  // Alert & Confirmation Dialog
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'danger' | 'info';
    showCancel: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    showCancel: false
  });

  const showAlert = (title: string, message: string, type: 'success' | 'warning' | 'danger' | 'info' = 'info') => {
    setDialog({
      isOpen: true,
      title,
      message,
      type,
      showCancel: false
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialog({
      isOpen: true,
      title,
      message,
      type: 'danger',
      showCancel: true,
      onConfirm: () => {
        onConfirm();
        setDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Auto-mapping effect
  useEffect(() => {
    if (excelData.length === 0) {
      setImportPreview([]);
      return;
    }

    const previewItems: SparePart[] = excelData.map((row, index) => {
      const getVal = (field: string) => {
        const mappedCol = columnMap[field];
        return mappedCol ? row[mappedCol] : undefined;
      };

      let idStr = String(getVal('id') || '').trim();
      if (!idStr) {
        idStr = `SP-IMP-${index + 1}`;
      }

      const nameStr = String(getVal('name') || '').trim() || `อะไหล่นำเข้าแถวที่ ${index + 2}`;
      const catStr = String(getVal('category') || 'ระบบเครื่องกล').trim();
      const qtyNum = parseInt(getVal('quantity')) || 0;
      const minNum = parseInt(getVal('minRequired')) || 1;
      const uStr = String(getVal('unit') || 'ชิ้น').trim();
      const locStr = String(getVal('location') || 'ตู้คลังสำรอง').trim();
      const prcNum = parseFloat(getVal('pricePerUnit')) || 0;
      const specsStr = String(getVal('specifications') || '').trim();
      
      const mFieldVal = getVal('machineIds');
      let mIdsArray: string[] = [];
      if (mFieldVal) {
        mIdsArray = String(mFieldVal)
          .split(/[,;\s\n]+/)
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }

      return {
        id: idStr.toUpperCase(),
        name: nameStr,
        category: catStr,
        machineIds: mIdsArray,
        quantity: qtyNum,
        minRequired: minNum,
        unit: uStr,
        location: locStr,
        pricePerUnit: prcNum,
        lastRestockedDate: getTodayDateString(),
        specifications: specsStr
      };
    });

    setImportPreview(previewItems);
  }, [excelData, columnMap]);

  // Excel Upload Handler
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length === 0) {
          showAlert('ไม่พบข้อมูล', 'ไม่พบข้อมูลแถวใดๆ ในไฟล์ Excel ที่คุณเลือกอัปโหลด', 'warning');
          return;
        }

        const headers = (data[0] as any[]).map(h => String(h || '').trim());
        setExcelHeaders(headers);

        const map: Record<string, string> = {
          id: '',
          name: '',
          category: '',
          quantity: '',
          minRequired: '',
          unit: '',
          location: '',
          pricePerUnit: '',
          specifications: '',
          machineIds: ''
        };

        headers.forEach((h: string) => {
          const hLower = h.toLowerCase().trim();
          
          if (hLower.includes('price') || hLower.includes('ราคา') || hLower.includes('ต้นทุน') || hLower.includes('บาท') || hLower.includes('฿')) {
            map.pricePerUnit = h;
          }
          else if (hLower.includes('sku') || hLower.includes('code') || hLower.includes('รหัส') || hLower.includes('idอะไหล่')) {
            map.id = h;
          }
          else if ((hLower.includes('qty') || hLower.includes('quantity') || hLower.includes('จำนวน') || hLower.includes('คงเหลือ') || hLower.includes('สต็อก') || hLower.includes('สตอก')) && !hLower.includes('ราคา') && !hLower.includes('บาท') && !hLower.includes('ต้นทุน')) {
            map.quantity = h;
          }
          else if (hLower.includes('min') || hLower.includes('ขั้นต่ำ') || hLower.includes('แจ้งเตือน') || hLower.includes('เตือน')) {
            map.minRequired = h;
          }
          else if (hLower.includes('unit') || hLower.includes('หน่วย')) {
            map.unit = h;
          }
          else if (hLower.includes('category') || hLower.includes('หมวด')) {
            map.category = h;
          }
          else if (hLower.includes('location') || hLower.includes('ตำแหน่ง') || hLower.includes('ตู้') || hLower.includes('ชั้น') || hLower.includes('เก็บ')) {
            map.location = h;
          }
          else if (hLower.includes('spec') || hLower.includes('สเปค') || hLower.includes('รายละเอียด') || hLower.includes('เทคนิค') || hLower.includes('หมายเหตุ')) {
            map.specifications = h;
          }
          else if (hLower.includes('machine') || hLower.includes('เครื่อง') || hLower.includes('จักร')) {
            map.machineIds = h;
          }
          else if (hLower.includes('name') || hLower.includes('ชื่อ') || hLower.includes('รายการ') || hLower.includes('อะไหล่')) {
            if (!map.name) map.name = h;
          }
        });

        setColumnMap(map);

        const rows = data.slice(1) as any[][];
        const parsedRows = rows.map(r => {
          const obj: any = {};
          headers.forEach((h, idx) => {
            obj[h] = r[idx];
          });
          return obj;
        }).filter(itemObj => {
          return Object.values(itemObj).some(val => val !== undefined && val !== null && val !== '');
        });

        setExcelData(parsedRows);
      } catch (err) {
        console.error(err);
        showAlert('ข้อผิดพลาดการโหลดไฟล์', 'เกิดข้อผิดพลาดในการโหลดไฟล์ กรุณาตรวจสอบให้แน่ใจว่าเป็นไฟล์นามสกุล XLS, XLSX หรือ CSV แล้วลองอัปโหลดอีกครั้ง', 'danger');
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        "รหัสอะไหล่ (SKU)": "SP-09",
        "ชื่ออะไหล่": "เทอร์โมคัปเปิลชนิด K (Thermocouple Type K 1m)",
        "หมวดหมู่": "อุปกรณ์ไฟฟ้าและทำความร้อน",
        "จำนวนคงเหลือ": 8,
        "จุดต่ำสุดที่ต้องแจ้งเตือน": 4,
        "หน่วยนับ": "ชิ้น",
        "ตำแหน่งจัดเก็บ": "ตู้ A ชั้น 3",
        "ราคาต่อหน่วย": 420,
        "ข้อมูลทางเทคนิค": "ทนทาน อุณหภูมิสูงสุด 350C สายไฟถักโลหะ",
        "เครื่องจักรที่ใช้ (คั่นด้วยจุลภาค)": "VAC01, FFS01"
      },
      {
        "รหัสอะไหล่ (SKU)": "SP-10",
        "ชื่ออะไหล่": "โซ่ขับเฟืองเบอร์ 40 (Roller Chain #40)",
        "หมวดหมู่": "ระบบส่งกำลัง",
        "จำนวนคงเหลือ": 2,
        "จุดต่ำสุดที่ต้องแจ้งเตือน": 2,
        "หน่วยนับ": "ม้วน",
        "ตำแหน่งจัดเก็บ": "ตู้ D ชั้น 3",
        "ราคาต่อหน่วย": 950,
        "ข้อมูลทางเทคนิค": "ความยาว 10 ฟุต บรรจุกล่องสแตนเลสกันสนิม",
        "เครื่องจักรที่ใช้ (คั่นด้วยจุลภาค)": "RIM01, BAN01"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "spare_parts");
    XLSX.writeFile(wb, "maint_spare_parts_template.xlsx");
  };

  const confirmImport = () => {
    if (importPreview.length === 0) {
      showAlert('ไม่มีข้อมูลนำเข้า', 'ไม่มีข้อมูลอะไหล่ที่พร้อมนำเข้า โปรดตรวจสอบการแมปคอลัมน์', 'warning');
      return;
    }

    const executeImport = () => {
      let mergedList = [...spareParts];
      let addedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      if (importMode === 'REPLACE_ALL') {
        mergedList = importPreview;
        addedCount = importPreview.length;
      } else if (importMode === 'SKIP_DUPLICATES') {
        // เพิ่มเฉพาะตัวไม่ซ้ำ (ข้ามตัวที่ซ้ำ)
        importPreview.forEach(newItem => {
          const exists = mergedList.some(existing => existing.id.toUpperCase() === newItem.id.toUpperCase());
          if (exists) {
            skippedCount++;
          } else {
            mergedList.push(newItem);
            addedCount++;
          }
        });
      } else {
        // OVERWRITE_DUPLICATES: เอาตัวซ้ำทับ (อัปเดตเดิม + เพิ่มตัวใหม่)
        importPreview.forEach(newItem => {
          const existingIdx = mergedList.findIndex(existing => existing.id.toUpperCase() === newItem.id.toUpperCase());
          if (existingIdx >= 0) {
            mergedList[existingIdx] = {
              ...mergedList[existingIdx],
              name: newItem.name || mergedList[existingIdx].name,
              category: newItem.category || mergedList[existingIdx].category,
              quantity: newItem.quantity,
              minRequired: newItem.minRequired ?? mergedList[existingIdx].minRequired,
              unit: newItem.unit || mergedList[existingIdx].unit,
              location: newItem.location || mergedList[existingIdx].location,
              pricePerUnit: newItem.pricePerUnit || mergedList[existingIdx].pricePerUnit,
              specifications: newItem.specifications 
                ? `${mergedList[existingIdx].specifications || ''}\n[อัปเดตจากไฟล์: ${newItem.specifications}]`.trim()
                : mergedList[existingIdx].specifications,
              machineIds: newItem.machineIds.length > 0 ? newItem.machineIds : mergedList[existingIdx].machineIds,
              lastRestockedDate: getTodayDateString()
            };
            updatedCount++;
          } else {
            mergedList.push(newItem);
            addedCount++;
          }
        });
      }

      setSpareParts(mergedList);

      let successDetail = '';
      if (importMode === 'REPLACE_ALL') {
        successDetail = `แทนที่คลังอะไหล่ทั้งหมดด้วยข้อมูลใหม่ ${importPreview.length} รายการเรียบร้อยแล้ว`;
      } else if (importMode === 'SKIP_DUPLICATES') {
        successDetail = `เพิ่มอะไหล่ใหม่สำเร็จ ${addedCount} รายการ (ข้ามรายการที่รหัสซ้ำ ${skippedCount} รายการ)`;
      } else {
        successDetail = `อัปเดตเขียนทับรายการเดิม ${updatedCount} รายการ และเพิ่มรายการใหม่ ${addedCount} รายการ สำเร็จ`;
      }

      showAlert('นำเข้าข้อมูลสำเร็จ', successDetail, 'success');
      handleClose();
    };

    if (importMode === 'REPLACE_ALL') {
      showConfirm(
        'ยืนยันแทนที่ทั้งหมด (Replace All)',
        `คุณตกลงที่จะใช้โหมด "แทนที่ทั้งหมด" หรือไม่? การทำเช่นนี้จะลบรายการอะไหล่เดิม ${spareParts.length} รายการออกทั้งหมด และแทนที่ด้วยข้อมูลจาก Excel ใหม่ ${importPreview.length} รายการโดยถาวร!`,
        executeImport
      );
    } else {
      executeImport();
    }
  };

  const handleClose = () => {
    setExcelData([]);
    setExcelHeaders([]);
    setFileName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="modal-import-spareparts-excel">
        <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
          
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                <Package size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm text-fg flex items-center gap-2">
                  นำเข้ารายการอะไหล่สำรอง (Spare Parts Inventory)
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    รายการอะไหล่
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  นำเข้ารายการอะไหล่และยอดสต็อกคลังสำรอง (แยกส่วนจากรอบเปลี่ยนอะไหล่ Time-Break ไม่เกี่ยวข้องกัน)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-fg hover:bg-slate-800 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
            
            {/* Step 1: Download Template */}
            <div className="bg-slate-950/70 p-3.5 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-200 block text-xs">ยังไม่มีไฟล์รูปแบบคลังอะไหล่สำรอง?</span>
                <span className="text-slate-400 text-[11px]">ดาวน์โหลดเทมเพลตมาตรฐาน Excel ที่มีหัวตารางครบถ้วน</span>
              </div>
              <button
                type="button"
                onClick={downloadTemplate}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 text-xs transition cursor-pointer"
              >
                <Download size={14} />
                <span>ดาวน์โหลดเทมเพลต</span>
              </button>
            </div>

            {/* Step 2: Upload Area */}
            <div className="space-y-2">
              <span className="text-slate-200 font-bold text-xs uppercase flex items-center gap-1.5">
                <Upload size={14} className="text-cyan-400" />
                ขั้นตอนที่ 1: เลือกไฟล์ Excel หรือ CSV ของรายการอะไหล่
              </span>
              <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-6 text-center cursor-pointer transition bg-slate-950/40 relative">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                  <FileSpreadsheet size={32} className="text-emerald-400 mb-1" />
                  <span className="font-bold text-slate-200 text-xs">
                    {fileName ? fileName : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางตรงนี้'}
                  </span>
                  <span className="text-slate-500 text-[10.5px]">รองรับไฟล์นามสกุล .xlsx, .xls, .csv</span>
                </div>
              </div>
            </div>

            {/* Mapping Section if file loaded */}
            {excelData.length > 0 && (
              <div className="space-y-3 bg-slate-950/60 p-4 border border-slate-800 rounded-xl">
                <span className="text-slate-200 font-bold text-xs uppercase flex items-center gap-1.5">
                  <Sparkles size={14} className="text-cyan-400" />
                  ขั้นตอนที่ 2: จับคู่หัวตาราง (ระบบตรวจจับให้อัตโนมัติ สามารถแก้ไขได้)
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">รหัสอะไหล่ (SKU / Code) *</label>
                    <select
                      value={columnMap.id}
                      onChange={(e) => setColumnMap({...columnMap, id: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 p-2 text-slate-300 rounded text-xs"
                    >
                      <option value="">-- ไม่ระบุ (ระบบจะสร้างอัตโนมัติ) --</option>
                      {excelHeaders.map((h, i) => (
                        <option key={i} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">ชื่ออะไหล่ (Name) *</label>
                    <select
                      value={columnMap.name}
                      onChange={(e) => setColumnMap({...columnMap, name: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 p-2 text-slate-300 rounded text-xs"
                    >
                      <option value="">-- ไม่ระบุ --</option>
                      {excelHeaders.map((h, i) => (
                        <option key={i} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">หมวดหมู่ (Category)</label>
                    <select
                      value={columnMap.category}
                      onChange={(e) => setColumnMap({...columnMap, category: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 p-2 text-slate-300 rounded text-xs"
                    >
                      <option value="">-- ระบบเครื่องกล (ค่าเริ่มต้น) --</option>
                      {excelHeaders.map((h, i) => (
                        <option key={i} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">จำนวนสต็อกคงเหลือ (Quantity)</label>
                    <select
                      value={columnMap.quantity}
                      onChange={(e) => setColumnMap({...columnMap, quantity: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 p-2 text-slate-300 rounded text-xs"
                    >
                      <option value="">-- ค่าเริ่มต้น: 0 --</option>
                      {excelHeaders.map((h, i) => (
                        <option key={i} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">จุดต่ำสุดเตือน (Min Required)</label>
                    <select
                      value={columnMap.minRequired}
                      onChange={(e) => setColumnMap({...columnMap, minRequired: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 p-2 text-slate-300 rounded text-xs"
                    >
                      <option value="">-- ค่าเริ่มต้น: 1 --</option>
                      {excelHeaders.map((h, i) => (
                        <option key={i} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">หน่วยนับ (Unit)</label>
                    <select
                      value={columnMap.unit}
                      onChange={(e) => setColumnMap({...columnMap, unit: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 p-2 text-slate-300 rounded text-xs"
                    >
                      <option value="">-- ชิ้น (ค่าเริ่มต้น) --</option>
                      {excelHeaders.map((h, i) => (
                        <option key={i} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">ตำแหน่งเก็บ (Location)</label>
                    <select
                      value={columnMap.location}
                      onChange={(e) => setColumnMap({...columnMap, location: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 p-2 text-slate-300 rounded text-xs"
                    >
                      <option value="">-- ตู้คลังสำรอง (ค่าเริ่มต้น) --</option>
                      {excelHeaders.map((h, i) => (
                        <option key={i} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">ราคาต่อหน่วย (Price)</label>
                    <select
                      value={columnMap.pricePerUnit}
                      onChange={(e) => setColumnMap({...columnMap, pricePerUnit: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 p-2 text-slate-300 rounded text-xs"
                    >
                      <option value="">-- ค่าเริ่มต้น: 0 --</option>
                      {excelHeaders.map((h, i) => (
                        <option key={i} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">เครื่องจักรที่ใช้ (Machines)</label>
                    <select
                      value={columnMap.machineIds}
                      onChange={(e) => setColumnMap({...columnMap, machineIds: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 p-2 text-slate-300 rounded text-xs"
                    >
                      <option value="">-- อะไหล่ใช้ทั่วไป --</option>
                      {excelHeaders.map((h, i) => (
                        <option key={i} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Preview list & selection config */}
            {excelData.length > 0 && importPreview.length > 0 && (() => {
              const duplicateCount = importPreview.filter(p => spareParts.some(sp => sp.id.toUpperCase() === p.id.toUpperCase())).length;
              const newCount = importPreview.length - duplicateCount;

              return (
                <div className="space-y-4">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between border-b border-slate-800 pb-3 gap-3">
                    <div>
                      <span className="text-slate-200 font-bold text-xs uppercase flex items-center gap-1.5">
                        <FileText size={14} className="text-amber-500" />
                        ขั้นตอนที่ 3: ตรวจดูตัวอย่างคลังที่จะนำเข้า (Preview - 5 รายการแรก)
                      </span>
                      <div className="text-slate-400 text-[10.5px] mt-1 flex items-center gap-2 flex-wrap">
                        <span>ตรวจพบข้อมูล <b className="text-white font-mono">{importPreview.length}</b> รายการ</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-emerald-400 font-medium">รายการใหม่ {newCount} รายการ</span>
                        {duplicateCount > 0 && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-amber-400 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              รหัสซ้ำกับในระบบ {duplicateCount} รายการ
                            </span>
                          </>
                        )}
                        <span className="text-slate-600">•</span>
                        <span>มูลค่ารวม <b className="text-emerald-400 font-mono">{(importPreview.reduce((s, p) => s + (p.quantity * p.pricePerUnit), 0)).toLocaleString()} บาท</b></span>
                      </div>
                    </div>

                    {/* Choice of integration type */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 shrink-0 select-none">
                      <span className="text-slate-400 font-bold text-[10px] uppercase shrink-0">หากพบรหัสซ้ำ:</span>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'OVERWRITE_DUPLICATES'}
                            onChange={() => setImportMode('OVERWRITE_DUPLICATES')}
                            className="text-cyan-500 focus:ring-0 bg-slate-950 cursor-pointer"
                          />
                          <span className="text-slate-200 text-[11px] font-medium">เอาตัวซ้ำทับ (อัปเดตเดิม)</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'SKIP_DUPLICATES'}
                            onChange={() => setImportMode('SKIP_DUPLICATES')}
                            className="text-emerald-500 focus:ring-0 bg-slate-950 cursor-pointer"
                          />
                          <span className="text-emerald-400 text-[11px] font-medium">เพิ่มเฉพาะตัวไม่ซ้ำ (ข้ามตัวซ้ำ)</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'REPLACE_ALL'}
                            onChange={() => setImportMode('REPLACE_ALL')}
                            className="text-red-500 focus:ring-0 bg-slate-950 cursor-pointer"
                          />
                          <span className="text-red-400 text-[11px] font-medium">แทนที่ทั้งหมด</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Tiny Table Preview */}
                  <div className="bg-slate-950/60 rounded-xl overflow-hidden border border-slate-850">
                    <table className="w-full text-left text-[11px] font-sans">
                      <thead>
                        <tr className="bg-[#0e1726] border-b border-slate-800 text-slate-400 text-[9.5px]">
                          <th className="p-2 text-cyan-400 font-mono w-44">SKU / Code</th>
                          <th className="p-2 w-56">ชื่ออะไหล่ที่จะแสดง</th>
                          <th className="p-2 w-40">หมวดหมู่</th>
                          <th className="p-2 text-center w-28">สต็อกคงคลัง</th>
                          <th className="p-2 w-32">จัดเก็บ</th>
                          <th className="p-2 text-right">ราคาต่อหน่วย</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {importPreview.slice(0, 5).map((p, idx) => {
                          const isDuplicate = spareParts.some(sp => sp.id.toUpperCase() === p.id.toUpperCase());
                          return (
                            <tr key={idx} className="hover:bg-slate-900/40 text-slate-300">
                              <td className="p-2 text-cyan-400 font-mono font-bold">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{p.id}</span>
                                  {isDuplicate ? (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-sans font-semibold border ${
                                      importMode === 'SKIP_DUPLICATES'
                                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                        : importMode === 'OVERWRITE_DUPLICATES'
                                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                    }`}>
                                      {importMode === 'SKIP_DUPLICATES' ? 'ซ้ำ (จะข้าม)' : importMode === 'OVERWRITE_DUPLICATES' ? 'ซ้ำ (จะเขียนทับ)' : 'ซ้ำ (แทนที่)'}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-sans font-semibold">
                                      ใหม่
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2">
                                <div>
                                  <p className="font-semibold text-fg truncate max-w-xs">{p.name}</p>
                                  {p.specifications && <p className="text-[10px] text-slate-500 truncate max-w-xs">{p.specifications}</p>}
                                </div>
                              </td>
                              <td className="p-2 text-slate-400 text-[10px]">{p.category}</td>
                              <td className="p-2 text-center font-mono">
                                <span className="text-slate-200 font-bold">{p.quantity}</span> {p.unit}
                                <span className="text-[9.5px] text-slate-500 block">แจ้งเตือน &lt;= {p.minRequired}</span>
                              </td>
                              <td className="p-2 text-slate-400 font-mono text-[10px]">{p.location}</td>
                              <td className="p-2 text-right font-mono text-emerald-400">{p.pricePerUnit.toLocaleString()} ฿</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {importPreview.length > 5 && (
                    <p className="text-[10px] text-slate-500 italic text-right font-sans">
                      ...และมีอีก {importPreview.length - 5} รายการด้านล่างที่ระบบพร้อมจะดำเนินการประมวลผล
                    </p>
                  )}
                </div>
              );
            })()}

          </div>

          {/* Footer Buttons */}
          <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400 font-sans">
              {importPreview.length > 0 ? (
                <>พร้อมนำเข้าแถวข้อมูลคลังทั้งสิ้น <b className="text-[#38bdf8] font-mono">{importPreview.length}</b> แถว</>
              ) : (
                <>โปรดเลือกไฟล์ Excel ของรายการอะไหล่ก่อนดำเนินขั้นตอนถัดไป</>
              )}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-lg cursor-pointer transition select-none"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={importPreview.length === 0}
                onClick={confirmImport}
                className={`px-4.5 py-2 font-black rounded-lg transition flex items-center gap-1.5 select-none ${
                  importPreview.length > 0 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 cursor-pointer shadow-lg'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850'
                }`}
              >
                <CheckCircle size={14} strokeWidth={2.5} />
                <span>
                  {importMode === 'SKIP_DUPLICATES' 
                    ? 'ยืนยันนำเข้า: เพิ่มเฉพาะตัวไม่ซ้ำ' 
                    : importMode === 'OVERWRITE_DUPLICATES'
                      ? `ยืนยันนำเข้า: เอาตัวซ้ำทับ (${importPreview.length} รายการ)`
                      : `ยืนยันนำเข้า: แทนที่ทั้งหมด (${importPreview.length} รายการ)`}
                </span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Confirmation & Alert Modal */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className={`p-4 border-b border-slate-800/80 flex items-center gap-2.5 ${
              dialog.type === 'danger' ? 'bg-red-500/10 text-red-400 border-b border-red-500/20' :
              dialog.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border-b border-amber-500/20' :
              dialog.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20' :
              'bg-blue-500/10 text-blue-400 border-b border-blue-500/20'
            }`}>
              {dialog.type === 'danger' ? <AlertCircle size={18} className="shrink-0" /> : <AlertTriangle size={18} className="shrink-0" />}
              <h4 className="font-black text-xs uppercase tracking-wider">{dialog.title}</h4>
            </div>
            <div className="p-4 text-xs text-slate-300 font-sans leading-relaxed">
              {dialog.message}
            </div>
            <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex justify-end gap-2 text-xs">
              {dialog.showCancel && (
                <button
                  type="button"
                  onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-750 hover:bg-slate-800 text-slate-400 font-bold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (dialog.onConfirm) {
                    dialog.onConfirm();
                  } else {
                    setDialog(prev => ({ ...prev, isOpen: false }));
                  }
                }}
                className={`px-4 py-1.5 rounded-lg font-black text-xs transition cursor-pointer ${
                  dialog.type === 'danger' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                }`}
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
