import * as XLSX from 'xlsx-js-style';
import { Machine, PMPlan, PMStep } from '../types';

/**
 * Column width mapping based on specification:
 * A=9, B=3.7, H=16, I=5, K=9.9, L=3.7, S=23, T=10.9, U=1.6, V=4, W=1.6, X=4.4
 * (0-indexed: A=0, B=1, H=7, I=8, K=10, L=11, S=18, T=19, U=20, V=21, W=22, X=23)
 */
const getColumnWidths = (): { wch: number }[] => {
  const specificWidths: { [col: number]: number } = {
    0: 9,      // A
    1: 3.7,    // B
    7: 16,     // H
    8: 5,      // I
    10: 9.9,   // K
    11: 3.7,   // L
    18: 23,    // S
    19: 10.9,  // T
    20: 1.6,   // U
    21: 4,     // V
    22: 1.6,   // W
    23: 4.4    // X
  };

  const cols: { wch: number }[] = [];
  for (let c = 0; c < 34; c++) {
    if (specificWidths[c] !== undefined) {
      cols.push({ wch: specificWidths[c] });
    } else if (c >= 2 && c <= 6) {
      cols.push({ wch: 3.7 }); // C..G
    } else if (c === 9) {
      cols.push({ wch: 5 });   // J
    } else if (c >= 12 && c <= 17) {
      cols.push({ wch: 3.7 }); // M..R
    } else if (c >= 24 && c <= 31) {
      cols.push({ wch: 4.0 }); // Y..AF
    } else {
      cols.push({ wch: 6.0 }); // AG..AH
    }
  }
  return cols;
};

/**
 * Export PM Form to Excel (.xlsx) using SheetJS (XLSX.utils.aoa_to_sheet)
 * Standard 34-column layout (0-based columns, A=0 ... AH=33):
 * - Row 0: Title merge (0..33) = "ใบรายงาน Preventive Maintenance (PM)"
 * - Row 1: "ชื่อเครื่องจักร : "+machine.name merge (0)–(8); "รหัสเครื่องจักร: "+machine.id merge (9)–(23); "วันที่ทำ PM: ......" merge (24)–(33)
 * - Header Row 2: ลำดับ(0) | หัวข้อ PM(1–7) | วิธีการ(8–10) | มาตรฐาน(11–18) | ความถี่(19) | ผลการ PM(20–23) เป็นหัวรวมคร่อม | รายละเอียด(24–31) | หมายเหตุ(32–33)
 * - Header sub-row (Row 3): ปกติ merge(20–21), ไม่ปกติ merge(22–23)
 * - Data starts at Row 4: 1 step = 1 row (✓ in col 20 for normal, col 22 for abnormal)
 * - Footer: Spare parts table & signatures merged to 34 columns
 */
export function exportPMForm(machine: Machine, plan: PMPlan): void {
  const TOTAL_COLS = 34;
  const rows: any[][] = [];

  // Row 0: Title
  const row0 = new Array(TOTAL_COLS).fill('');
  row0[0] = 'ใบรายงาน Preventive Maintenance (PM)';
  rows.push(row0);

  // Row 1: Machine Info
  const row1 = new Array(TOTAL_COLS).fill('');
  row1[0] = `ชื่อเครื่องจักร : ${machine.name || ''}`;
  row1[9] = `รหัสเครื่องจักร: ${machine.id || ''}`;
  row1[24] = 'วันที่ทำ PM: .......................................';
  rows.push(row1);

  // Row 2: Header Top
  const row2 = new Array(TOTAL_COLS).fill('');
  row2[0] = 'ลำดับ';
  row2[1] = 'หัวข้อ PM';
  row2[8] = 'วิธีการ';
  row2[11] = 'มาตรฐาน';
  row2[19] = 'ความถี่';
  row2[20] = 'ผลการ PM';
  row2[24] = 'รายละเอียดสิ่งที่ผิดปกติ / ค่าที่วัดได้';
  row2[32] = 'หมายเหตุ';
  rows.push(row2);

  // Row 3: Header Sub-row
  const row3 = new Array(TOTAL_COLS).fill('');
  row3[20] = 'ปกติ';
  row3[22] = 'ไม่ปกติ';
  rows.push(row3);

  // Header and layout merges
  const merges: XLSX.Range[] = [
    // แถว 0: Title merge (0,0)–(0,33)
    { s: { r: 0, c: 0 }, e: { r: 0, c: 33 } },

    // แถว 1: Machine info
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    { s: { r: 1, c: 9 }, e: { r: 1, c: 23 } },
    { s: { r: 1, c: 24 }, e: { r: 1, c: 33 } },

    // Header merges (rows 2-3):
    // ลำดับ(0)
    { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
    // หัวข้อ PM(1–7)
    { s: { r: 2, c: 1 }, e: { r: 3, c: 7 } },
    // วิธีการ(8–10)
    { s: { r: 2, c: 8 }, e: { r: 3, c: 10 } },
    // มาตรฐาน(11–18)
    { s: { r: 2, c: 11 }, e: { r: 3, c: 18 } },
    // ความถี่(19)
    { s: { r: 2, c: 19 }, e: { r: 3, c: 19 } },
    // ผลการ PM Title(20–23) เป็นหัวรวมคร่อม
    { s: { r: 2, c: 20 }, e: { r: 2, c: 23 } },
    // ปกติ merge(20–21), ไม่ปกติ merge(22–23)
    { s: { r: 3, c: 20 }, e: { r: 3, c: 21 } },
    { s: { r: 3, c: 22 }, e: { r: 3, c: 23 } },
    // รายละเอียดสิ่งที่ผิดปกติ(24–31)
    { s: { r: 2, c: 24 }, e: { r: 3, c: 31 } },
    // หมายเหตุ(32–33)
    { s: { r: 2, c: 32 }, e: { r: 3, c: 33 } }
  ];

  // Data starts at Row 4
  const steps = plan.steps || [];
  const totalRowsCount = Math.max(steps.length, 6);
  for (let idx = 0; idx < totalRowsCount; idx++) {
    const r = 4 + idx;
    const step = steps[idx];
    const dataRow = new Array(TOTAL_COLS).fill('');

    if (step) {
      dataRow[0] = step.itemNo !== undefined && step.itemNo !== null ? step.itemNo : (idx + 1);
      dataRow[1] = step.title || '';
      dataRow[8] = step.method || '';
      dataRow[11] = step.standard || '';
      dataRow[19] = step.frequency || '';

      // ผลการ PM: ✓ ลงคอลัมน์ 20 (ปกติ) หรือ 22 (ไม่ปกติ)
      if (step.result === 'ปกติ') {
        dataRow[20] = '✓';
      } else if (step.result === 'ไม่ปกติ') {
        dataRow[22] = '✓';
      }

      dataRow[24] = step.abnormalDetail || '';
      dataRow[32] = step.remark || '';
    } else {
      dataRow[0] = idx + 1;
    }
    rows.push(dataRow);

    // Merges for this step row
    merges.push(
      // หัวข้อ(1–7)
      { s: { r, c: 1 }, e: { r, c: 7 } },
      // วิธีการ(8–10)
      { s: { r, c: 8 }, e: { r, c: 10 } },
      // มาตรฐาน(11–18)
      { s: { r, c: 11 }, e: { r, c: 18 } },
      // ปกติ(20–21)
      { s: { r, c: 20 }, e: { r, c: 21 } },
      // ไม่ปกติ(22–23)
      { s: { r, c: 22 }, e: { r, c: 23 } },
      // รายละเอียด(24–31)
      { s: { r, c: 24 }, e: { r, c: 31 } },
      // หมายเหตุ(32–33)
      { s: { r, c: 32 }, e: { r, c: 33 } }
    );
  }

  const dataEndRow = 3 + totalRowsCount;

  // Empty separator
  rows.push(new Array(TOTAL_COLS).fill(''));

  // Spare parts header row
  const spareHeader = new Array(TOTAL_COLS).fill('');
  spareHeader[0] = 'ลำดับ';
  spareHeader[1] = 'รายการอะไหล่ที่เตรียมแก้ไข';
  spareHeader[24] = 'จำนวน';
  rows.push(spareHeader);

  // Spare parts data row
  const spareData = new Array(TOTAL_COLS).fill('');
  spareData[0] = '1';
  spareData[1] = plan.spareParts || '-';
  spareData[24] = plan.sparePartsQty || '-';
  rows.push(spareData);

  // Empty separator
  rows.push(new Array(TOTAL_COLS).fill(''));

  // Signatures / Approvals
  const sig1 = new Array(TOTAL_COLS).fill('');
  sig1[0] = `ผู้ทำการ PM: ${plan.inspectorTech || '...................................................'} ทีมช่าง`;
  rows.push(sig1);

  const sig2 = new Array(TOTAL_COLS).fill('');
  sig2[0] = `ผู้รับทราบทำการ PM: ${plan.acknowledgingDept || '...................................................'} ฝ่ายผลิต`;
  rows.push(sig2);

  const sig3 = new Array(TOTAL_COLS).fill('');
  sig3[0] = `ผู้ตรวจสอบทำการ PM: ${plan.supervisorName || '...................................................'} หัวหน้าหน่วย PM`;
  rows.push(sig3);

  // Footer merges
  const spareHeaderRow = dataEndRow + 2;
  const spareDataRow = dataEndRow + 3;
  const sig1Row = dataEndRow + 5;
  const sig2Row = dataEndRow + 6;
  const sig3Row = dataEndRow + 7;

  merges.push(
    { s: { r: spareHeaderRow, c: 1 }, e: { r: spareHeaderRow, c: 23 } },
    { s: { r: spareHeaderRow, c: 24 }, e: { r: spareHeaderRow, c: 33 } },
    { s: { r: spareDataRow, c: 1 }, e: { r: spareDataRow, c: 23 } },
    { s: { r: spareDataRow, c: 24 }, e: { r: spareDataRow, c: 33 } },
    { s: { r: sig1Row, c: 0 }, e: { r: sig1Row, c: 33 } },
    { s: { r: sig2Row, c: 0 }, e: { r: sig2Row, c: 33 } },
    { s: { r: sig3Row, c: 0 }, e: { r: sig3Row, c: 33 } }
  );

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = merges;
  ws['!cols'] = getColumnWidths();

  // Border style definitions
  const thinBorder = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } }
  };

  // 1. Style Title (Row 0)
  for (let c = 0; c < TOTAL_COLS; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
    ws[ref].s = {
      font: { bold: true, sz: 14, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { fgColor: { rgb: 'F1F5F9' } },
      border: thinBorder
    };
  }

  // 2. Style Machine Info (Row 1)
  for (let c = 0; c < TOTAL_COLS; c++) {
    const ref = XLSX.utils.encode_cell({ r: 1, c });
    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
    ws[ref].s = {
      font: { bold: true, sz: 10.5, color: { rgb: '1E293B' } },
      alignment: { vertical: 'center', horizontal: c >= 24 ? 'center' : 'left' },
      fill: { fgColor: { rgb: 'F8FAFC' } },
      border: thinBorder
    };
  }

  // 3. Style Table Headers (Rows 2, 3)
  for (let r = 2; r <= 3; r++) {
    for (let c = 0; c < TOTAL_COLS; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = {
        font: { bold: true, sz: 10, color: { rgb: '0F172A' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: 'E2E8F0' } },
        border: thinBorder
      };
    }
  }

  // 4. Style Data Rows (Rows 4 to dataEndRow)
  for (let r = 4; r <= dataEndRow; r++) {
    const isEven = (r - 4) % 2 === 1;
    const rowBg = isEven ? 'F8FAFC' : 'FFFFFF';

    for (let c = 0; c < TOTAL_COLS; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };

      const isCheckCol = (c >= 20 && c <= 23);
      const isCenterCol = (c === 0 || c === 19 || isCheckCol);
      const isNormalCol = (c === 20 || c === 21);
      const isAbnormalCol = (c === 22 || c === 23);

      let valColor = '1E293B';
      let isBold = false;
      const cellVal = String(ws[ref].v || '');
      if (cellVal === '✓' || cellVal === '✔') {
        isBold = true;
        valColor = isNormalCol ? '059669' : (isAbnormalCol ? 'DC2626' : '1E293B');
      }

      ws[ref].s = {
        font: {
          sz: isCheckCol ? 12 : 10,
          bold: isBold,
          color: { rgb: valColor }
        },
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

  // 5. Spare parts rows
  for (let c = 0; c < TOTAL_COLS; c++) {
    const headerRef = XLSX.utils.encode_cell({ r: spareHeaderRow, c });
    if (!ws[headerRef]) ws[headerRef] = { t: 's', v: '' };
    ws[headerRef].s = {
      font: { bold: true, sz: 10, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { fgColor: { rgb: 'E2E8F0' } },
      border: thinBorder
    };

    const dataRef = XLSX.utils.encode_cell({ r: spareDataRow, c });
    if (!ws[dataRef]) ws[dataRef] = { t: 's', v: '' };
    ws[dataRef].s = {
      font: { sz: 10, color: { rgb: '1E293B' } },
      alignment: { horizontal: (c === 0 || c >= 24) ? 'center' : 'left', vertical: 'center' },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      border: thinBorder
    };
  }

  // 6. Signatures (sig1Row to sig3Row)
  for (let r = sig1Row; r <= sig3Row; r++) {
    for (let c = 0; c < TOTAL_COLS; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = {
        font: { sz: 10, color: { rgb: '334155' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      };
    }
  }

  // Row heights
  const rowHeights: { hpt: number }[] = [
    { hpt: 26 }, // Row 0
    { hpt: 24 }, // Row 1
    { hpt: 22 }, // Row 2 Header Top
    { hpt: 20 }, // Row 3 Header Sub
  ];
  for (let r = 4; r <= dataEndRow; r++) {
    rowHeights.push({ hpt: 28 });
  }
  rowHeights.push({ hpt: 12 }); // Empty separator
  rowHeights.push({ hpt: 22 }); // Spare header
  rowHeights.push({ hpt: 24 }); // Spare data
  rowHeights.push({ hpt: 12 }); // Empty separator
  rowHeights.push({ hpt: 24 }); // Sig 1
  rowHeights.push({ hpt: 24 }); // Sig 2
  rowHeights.push({ hpt: 24 }); // Sig 3

  ws['!rows'] = rowHeights;
  ws['!views'] = [{ showGridLines: true }];

  // Create workbook and write file
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PM_Form');

  const fileName = `ใบรายงาน_PM_${machine.id || 'Machine'}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Import PM Form from Excel (.xlsx)
 * - Reads SheetJS sheet_to_json(ws, { header: 1 })
 * - Extracts machineName from row 3, col 0 (stripping "ชื่อเครื่องจักร : ")
 * - Extracts machineCode from row 3, col 9 (stripping "รหัสเครื่องจักร: ")
 * - Loops rows starting from row h+3 (row 7):
 *   If col 11 (มาตรฐาน) is empty -> skip
 *   Creates PMStep with result:
 *   col 20 === '✓' ? 'ปกติ' : col 22 === '✓' ? 'ไม่ปกติ' : 'ยังไม่ตรวจ'
 *   stdTime set to 0 if not present in file
 */
export function importPMForm(file: File): Promise<{ machineName: string; machineCode: string; steps: PMStep[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('ไม่พบแผ่นงาน (Sheet) ในไฟล์ Excel นี้');
        }

        const firstSheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[firstSheetName];
        if (!ws) {
          throw new Error('ไม่สามารถอ่านข้อมูลแผ่นงานในไฟล์ Excel ได้');
        }

        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Find machine name and code from top rows
        let machineName = '';
        let machineCode = '';
        for (let r = 0; r < Math.min(rows.length, 6); r++) {
          const row = rows[r] || [];
          const rowStr = row.map(c => String(c ?? '')).join(' ');
          const nameM = rowStr.match(/ชื่อเครื่องจักร\s*[:：]?\s*([^รหัส|วันที่|\n]+)/i);
          if (nameM && nameM[1] && !machineName) machineName = nameM[1].trim();
          const idM = rowStr.match(/รหัสเครื่องจักร\s*[:：]?\s*([A-Za-z0-9_-]+)/i);
          if (idM && idM[1] && !machineCode) machineCode = idM[1].trim();
        }

        // Detect header row index
        let headerRow = -1;
        for (let r = 0; r < Math.min(rows.length, 8); r++) {
          const rowStr = (rows[r] || []).map(c => String(c ?? '')).join(' ');
          if (rowStr.includes('หัวข้อ') || rowStr.includes('มาตรฐาน')) {
            headerRow = r;
            break;
          }
        }
        
        let startRow = 4;
        if (headerRow !== -1) {
          const nextRowStr = (rows[headerRow + 1] || []).map(c => String(c ?? '')).join(' ');
          startRow = (nextRowStr.includes('ปกติ') || nextRowStr.includes('ไม่ปกติ')) ? headerRow + 2 : headerRow + 1;
        }

        // Data loop starting from detected startRow
        const steps: PMStep[] = [];
        for (let r = startRow; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          const rowStr = row.map(c => String(c ?? '')).join(' ');
          // Stop when reaching footer
          if (rowStr.includes('รายการอะไหล่') || rowStr.includes('ผู้ทำการ PM') || rowStr.includes('ผู้รับทราบ') || rowStr.includes('ผู้ตรวจสอบ')) {
            break;
          }

          // ถ้าคอลัมน์ 11 (มาตรฐาน) ว่าง = ข้าม
          const standard = String(row[11] ?? '').trim();
          if (!standard) {
            continue;
          }

          const col20 = String(row[20] ?? '').trim();
          const col21 = String(row[21] ?? '').trim();
          const col22 = String(row[22] ?? '').trim();
          const col23 = String(row[23] ?? '').trim();

          const isNormalChecked = col20 === '✓' || col20 === '✔' || col20.toLowerCase() === 'v' || col20 === '/' || col20.toLowerCase() === 'x' || col20 === '1' ||
                                  col21 === '✓' || col21 === '✔';
          const isAbnormalChecked = col22 === '✓' || col22 === '✔' || col22.toLowerCase() === 'v' || col22 === '/' || col22.toLowerCase() === 'x' || col22 === '1' ||
                                    col23 === '✓' || col23 === '✔';

          let result: 'ปกติ' | 'ไม่ปกติ' | 'ยังไม่ตรวจ' = 'ยังไม่ตรวจ';
          if (isNormalChecked) {
            result = 'ปกติ';
          } else if (isAbnormalChecked) {
            result = 'ไม่ปกติ';
          }

          const itemNoRaw = row[0];
          const itemNo = itemNoRaw !== undefined && itemNoRaw !== '' 
            ? (typeof itemNoRaw === 'number' ? itemNoRaw : String(itemNoRaw).trim()) 
            : (steps.length + 1);

          const title = String(row[1] ?? '').trim();
          const method = String(row[8] ?? '').trim();
          const frequency = String(row[19] ?? '').trim();
          const abnormalDetail = String(row[24] ?? '').trim();
          const remark = String(row[32] ?? '').trim();

          const step: PMStep = {
            id: `step-${Date.now()}-${steps.length}-${Math.random().toString(36).substring(2, 5)}`,
            itemNo,
            title: title || `ข้อตรวจที่ ${steps.length + 1}`,
            method: method || 'ดูด้วยสายตา',
            standard,
            frequency: frequency || '1 เดือน/ครั้ง',
            stdTime: 0, // stdTime ตั้ง 0 ถ้าไม่มีในไฟล์
            result,
            abnormalDetail: abnormalDetail || undefined,
            remark: remark || undefined,
            done: result !== 'ยังไม่ตรวจ'
          };

          steps.push(step);
        }

        resolve({
          machineName,
          machineCode,
          steps
        });
      } catch (err: any) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    reader.onerror = () => {
      reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์'));
    };

    reader.readAsArrayBuffer(file);
  });
}
