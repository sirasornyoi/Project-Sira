import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Machine } from '../types';
import { 
  FileSpreadsheet, Upload, Download, AlertTriangle, CheckCircle2, 
  X, Info, ArrowRight, RefreshCw, Layers
} from 'lucide-react';

interface MachineImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingMachines: Machine[];
  onImportSuccess: (machines: Machine[], mode: 'append' | 'replace') => void;
  onDownloadTemplate: () => void;
}

export const MachineImportModal: React.FC<MachineImportModalProps> = ({
  isOpen,
  onClose,
  existingMachines,
  onImportSuccess,
  onDownloadTemplate
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedMachines, setParsedMachines] = useState<Machine[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Helper to parse Excel dates (whether serial number or string)
  const parseExcelDate = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'number') {
      try {
        // Excel serial date to JS Date
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch {
        return String(val);
      }
    }
    const str = String(val).trim();
    // Handle standard YYYY-MM-DD or DD/MM/YYYY
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        // Assume DD/MM/YYYY or MM/DD/YYYY
        if (parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }
    return str;
  };

  const processFile = async (uploadedFile: File) => {
    setErrorMsg('');
    setIsProcessing(true);
    setFile(uploadedFile);

    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('ไม่พบแผ่นงาน (Worksheet) ในไฟล์ Excel ที่อัปโหลด');
      }

      const worksheet = workbook.Sheets[firstSheetName];
      // Convert sheet to array of arrays (AOA)
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!rawRows || rawRows.length < 2) {
        throw new Error('ไฟล์ไม่มีข้อมูล หรือมีเพียงแถวหัวข้อตาราง (Header) เท่านั้น');
      }

      // Detect header indices
      const headerRow = (rawRows[0] || []).map((c: any) => String(c || '').trim());
      
      let idIdx = -1;
      let nameIdx = -1;
      let modelIdx = -1;
      let powerIdx = -1;
      let dateIdx = -1;
      let vendorIdx = -1;
      let zoneIdx = -1;
      let roomIdx = -1;
      let snIdx = -1;
      let notesIdx = -1;

      // Scan headers to locate columns by name
      headerRow.forEach((colName, idx) => {
        const lower = colName.toLowerCase();
        if (idIdx === -1 && (lower.includes('รหัส') || lower.includes('id') || lower.includes('code'))) {
          idIdx = idx;
        } else if (nameIdx === -1 && (lower.includes('รายชื่อเครื่องจักร') || lower.includes('ชื่อเครื่องจักร') || (lower.includes('ชื่อ') && !lower.includes('ผู้ขาย')) || lower.includes('name'))) {
          nameIdx = idx;
        } else if (modelIdx === -1 && (lower.includes('model') || lower.includes('รุ่น'))) {
          modelIdx = idx;
        } else if (powerIdx === -1 && (lower.includes('แรงดัน') || lower.includes('กำลังไฟ') || lower.includes('power') || lower.includes('volt') || lower.includes('ไฟฟ้า'))) {
          powerIdx = idx;
        } else if (dateIdx === -1 && (lower.includes('วันที่ติดตั้ง') || lower.includes('ติดตั้ง') || lower.includes('date'))) {
          dateIdx = idx;
        } else if (vendorIdx === -1 && (lower.includes('บริษัทผู้ขาย') || lower.includes('ผู้ขาย') || lower.includes('vendor') || lower.includes('supplier'))) {
          vendorIdx = idx;
        } else if (lower.includes('ห้อง') || lower.includes('room')) {
          roomIdx = idx;
        } else if (lower.includes('โซน') || lower.includes('zone') || lower.includes('โรงงาน') || lower.includes('factory')) {
          zoneIdx = idx;
        } else if (colName.includes('ตำแหน่งที่ติดตั้ง') || lower.includes('ตำแหน่ง') || lower.includes('location')) {
          // If first occurrence of "ตำแหน่งที่ติดตั้ง", treat as Zone
          if (zoneIdx === -1) {
            zoneIdx = idx;
          } else if (roomIdx === -1) {
            // Second occurrence of "ตำแหน่งที่ติดตั้ง", treat as Room
            roomIdx = idx;
          }
        } else if (snIdx === -1 && (lower.includes('serial') || lower.includes('s/n') || lower.includes('หมายเลขเครื่อง'))) {
          snIdx = idx;
        } else if (notesIdx === -1 && (lower.includes('หมายเหตุ') || lower.includes('note') || lower.includes('remark'))) {
          notesIdx = idx;
        }
      });

      // Strict positional fallback matching user's requested specification:
      // A(0)=ลำดับ, B(1)=รหัสอุปกรณ์, C(2)=รายชื่อเครื่องจักร, D(3)=Model(รุ่น), E(4)=แรงดัน/กำลังไฟ,
      // F(5)=วันที่ติดตั้ง, G(6)=บริษัทผู้ขาย, H(7)=ตำแหน่งที่ติดตั้ง (โซน), I(8)=ตำแหน่งที่ติดตั้ง (ห้อง),
      // J(9)=Serial Number, K(10)=หมายเหตุ
      if (idIdx === -1 && headerRow.length > 1) idIdx = 1;
      if (nameIdx === -1 && headerRow.length > 2) nameIdx = 2;
      if (modelIdx === -1 && headerRow.length > 3) modelIdx = 3;
      if (powerIdx === -1 && headerRow.length > 4) powerIdx = 4;
      if (dateIdx === -1 && headerRow.length > 5) dateIdx = 5;
      if (vendorIdx === -1 && headerRow.length > 6) vendorIdx = 6;
      if (zoneIdx === -1 && headerRow.length > 7) zoneIdx = 7;
      if (roomIdx === -1 && headerRow.length > 8) roomIdx = 8;
      if (snIdx === -1 && headerRow.length > 9) snIdx = 9;
      if (notesIdx === -1 && headerRow.length > 10) notesIdx = 10;

      const parsed: Machine[] = [];
      const seenIds = new Set<string>();

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        const rawId = idIdx !== -1 && row[idIdx] !== undefined ? String(row[idIdx]).trim() : '';
        const rawName = nameIdx !== -1 && row[nameIdx] !== undefined ? String(row[nameIdx]).trim() : '';

        // Skip completely empty lines
        if (!rawId && !rawName) continue;

        const id = (rawId || `M-${String(i).padStart(3, '0')}`).toUpperCase();
        const name = (rawName || id).toUpperCase();

        if (seenIds.has(id)) {
          // If duplicate ID in the same Excel, append index to keep unique
          continue;
        }
        seenIds.add(id);

        const model = modelIdx !== -1 && row[modelIdx] !== undefined ? String(row[modelIdx]).trim() : '';
        const powerVoltage = powerIdx !== -1 && row[powerIdx] !== undefined ? String(row[powerIdx]).trim() : '';
        const installDate = dateIdx !== -1 && row[dateIdx] !== undefined ? parseExcelDate(row[dateIdx]) : '';
        const vendor = vendorIdx !== -1 && row[vendorIdx] !== undefined ? String(row[vendorIdx]).trim() : '';
        const rawLocationZone = zoneIdx !== -1 && row[zoneIdx] !== undefined ? String(row[zoneIdx]).trim() : '';
        const locationZone = rawLocationZone.replace(/^โรงงาน\s*\d*\s*>\s*/i, '').trim();
        const locationRoom = roomIdx !== -1 && row[roomIdx] !== undefined ? String(row[roomIdx]).trim() : '';
        const serialNumber = snIdx !== -1 && row[snIdx] !== undefined ? String(row[snIdx]).trim() : '';
        const notes = notesIdx !== -1 && row[notesIdx] !== undefined ? String(row[notesIdx]).trim() : '';

        // Derive lineGroup from locationZone if possible
        let lineGroup = 'ทั่วไป';
        if (locationZone) {
          if (locationZone.includes('>')) {
            const parts = locationZone.split('>').map(p => p.trim());
            lineGroup = parts[parts.length - 1] || parts[0];
          } else {
            lineGroup = locationZone;
          }
        }

        // Check if machine exists already to inherit status
        const existing = existingMachines.find(m => m.id === id);

        parsed.push({
          id,
          name,
          lineGroup: existing?.lineGroup || lineGroup,
          status: existing?.status || 'ปกติ',
          model: model || undefined,
          powerVoltage: powerVoltage || undefined,
          installDate: installDate || undefined,
          vendor: vendor || undefined,
          locationZone: locationZone || undefined,
          locationRoom: locationRoom || undefined,
          serialNumber: serialNumber || undefined,
          notes: notes || undefined
        });
      }

      if (parsed.length === 0) {
        throw new Error('ไม่พบแถวข้อมูลเครื่องจักรที่ถูกต้องในไฟล์ กรุณาตรวจสอบรูปแบบคอลัมน์');
      }

      setParsedMachines(parsed);
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์ Excel');
      setParsedMachines([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleConfirmImport = () => {
    if (parsedMachines.length === 0) return;
    onImportSuccess(parsedMachines, importMode);
    onClose();
  };

  // Calculate statistics for preview
  const newCount = parsedMachines.filter(p => !existingMachines.some(e => e.id === p.id)).length;
  const updateCount = parsedMachines.length - newCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto" id="machine-import-modal-overlay">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto" id="machine-import-modal">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-800 to-slate-900 border-b border-slate-700/80 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                นำเข้าข้อมูลทะเบียนเครื่องจักรจาก Excel
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                รองรับไฟล์ .xlsx, .xls, .csv พร้อมจัดเรียงข้อมูลตาม <span className="text-cyan-400 font-semibold">โซน และ ห้อง</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xl font-medium p-1 rounded-lg hover:bg-slate-700/50 cursor-pointer transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Format Specification Banner */}
          <div className="bg-slate-900/80 border border-cyan-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-xs">
                <Info size={15} />
                <span>มาตรฐานรูปแบบคอลัมน์ Excel (คอลัมน์ A ถึง K)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                A: ลำดับ | B: รหัสอุปกรณ์ | C: รายชื่อเครื่องจักร | D: Model(รุ่น) | E: แรงดัน/กำลังไฟ | F: วันที่ติดตั้ง | G: บริษัทผู้ขาย | H: โซน | I: ตำแหน่งที่ติดตั้ง (ห้อง) | J: Serial Number | K: หมายเหตุ
              </p>
            </div>
            <button
              id="btn-download-sample-template"
              type="button"
              onClick={onDownloadTemplate}
              className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-cyan-400 text-cyan-300 px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition shadow-sm"
            >
              <Download size={14} />
              <span>ดาวน์โหลดเทมเพลตตัวอย่าง</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging 
                ? 'border-cyan-400 bg-cyan-500/10' 
                : file 
                  ? 'border-emerald-500/50 bg-emerald-500/5' 
                  : 'border-slate-700 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-900/80'
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileChange} 
              className="hidden" 
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className={`p-3 rounded-full ${file ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                {file ? <CheckCircle2 size={24} /> : <Upload size={24} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {file ? file.name : 'ลากไฟล์ Excel มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {file ? `ขนาดไฟล์ ${(file.size / 1024).toFixed(1)} KB` : 'รองรับไฟล์นามสกุล .xlsx, .xls, .csv'}
                </p>
              </div>
            </div>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-xl flex items-center gap-2.5">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview Section if data is parsed */}
          {parsedMachines.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    ตัวอย่างข้อมูลที่ตรวจพบ ({parsedMachines.length} รายการ)
                  </h4>
                  <span className="text-[11px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded font-mono">
                    เพิ่มใหม่: {newCount}
                  </span>
                  {updateCount > 0 && (
                    <span className="text-[11px] bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded font-mono">
                      อัปเดตเดิม: {updateCount}
                    </span>
                  )}
                </div>

                {/* Import Mode Selector */}
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input 
                      type="radio" 
                      name="import-mode" 
                      value="append" 
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="accent-cyan-500" 
                    />
                    <span>อัปเดตและเพิ่มต่อท้าย (แนะนำ)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input 
                      type="radio" 
                      name="import-mode" 
                      value="replace" 
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-rose-500" 
                    />
                    <span className="text-rose-400">แทนที่ทั้งหมด</span>
                  </label>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-900/90 max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-800 text-slate-300 border-b border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">#</th>
                      <th className="py-2.5 px-3 font-mono">รหัส (ID)</th>
                      <th className="py-2.5 px-3">รายชื่อเครื่องจักร</th>
                      <th className="py-2.5 px-3">Model</th>
                      <th className="py-2.5 px-3">กำลังไฟ</th>
                      <th className="py-2.5 px-3">โซน</th>
                      <th className="py-2.5 px-3">ห้อง</th>
                      <th className="py-2.5 px-3 font-mono">Serial No.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {parsedMachines.map((m, idx) => {
                      const isExisting = existingMachines.some(e => e.id === m.id);

                      return (
                        <tr key={`${m.id}-${idx}`} className="hover:bg-slate-800/40">
                          <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-cyan-400">
                            {m.id}
                            {isExisting && (
                              <span className="ml-1 text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded">
                                เดิม
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-200">{m.name}</td>
                          <td className="py-2 px-3 text-slate-400">{m.model || '-'}</td>
                          <td className="py-2 px-3 text-amber-400 font-mono text-[11px]">{m.powerVoltage || '-'}</td>
                          <td className="py-2 px-3 text-slate-300">{m.locationZone || m.lineGroup || '-'}</td>
                          <td className="py-2 px-3 text-cyan-300 font-medium">{m.locationRoom || '-'}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{m.serialNumber || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-900/90 border-t border-slate-700/80 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            {parsedMachines.length > 0 ? (
              <span>พร้อมนำเข้าข้อมูลเครื่องจักร <strong className="text-cyan-400">{parsedMachines.length}</strong> เครื่อง</span>
            ) : (
              <span>กรุณาเลือกไฟล์ Excel เพื่อดำเนินการต่อ</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              id="btn-confirm-import-excel"
              type="button"
              disabled={parsedMachines.length === 0 || isProcessing}
              onClick={handleConfirmImport}
              className={`flex items-center gap-2 font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-md cursor-pointer ${
                parsedMachines.length > 0 && !isProcessing
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 size={16} />
              <span>ยืนยันนำเข้าข้อมูล ({parsedMachines.length} เครื่อง)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
