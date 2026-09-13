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
 * Layout (0-based columns, A=0 ... AH=33):
 * - Row 0: Title merge (0,0)–(1,33) = "ใบรายงาน Preventive Maintenance (PM)"
 * - Row 3: "ชื่อเครื่องจักร : "+machine.name merge (0)–(8); "รหัสเครื่องจักร: "+machine.id merge (9)–(27); "วันที่ทำPM......." merge (28)–(33)
 * - Header h=4, height 3: ลำดับ(0) | หัวข้อ PM(1–7) | วิธีการ(8–10) | มาตรฐาน(11–18) | ความถี่(19) | ผลการPM(20–23) | รายละเอียดสิ่งที่ผิดปกติ(24–31) | หมายเหตุ(32–33)
 * - Header sub-row h+1 (Row 5) height 2: ปกติ merge(20–21), ไม่ปกติ merge(22–23)
 * - Data starts at h+3 (Row 7): 1 step = 1 row
 */
export function exportPMForm(machine: Machine, plan: PMPlan): void {
  const TOTAL_COLS = 34;
  const rows: any[][] = [];

  // Row 0: Title
  const row0 = new Array(TOTAL_COLS).fill('');
  row0[0] = 'ใบรายงาน Preventive Maintenance (PM)';
  rows.push(row0);

  // Row 1: (Merged with row 0)
  rows.push(new Array(TOTAL_COLS).fill(''));

  // Row 2: Blank spacer row
  rows.push(new Array(TOTAL_COLS).fill(''));

  // Row 3: Machine Info
  const row3 = new Array(TOTAL_COLS).fill('');
  row3[0] = `ชื่อเครื่องจักร : ${machine.name || ''}`;
  row3[9] = `รหัสเครื่องจักร: ${machine.id || ''}`;
  row3[28] = 'วันที่ทำPM.......';
  rows.push(row3);

  // Header h=4 (Row 4)
  const row4 = new Array(TOTAL_COLS).fill('');
  row4[0] = 'ลำดับ';
  row4[1] = 'หัวข้อ PM';
  row4[8] = 'วิธีการ';
  row4[11] = 'มาตรฐาน';
  row4[19] = 'ความถี่';
  row4[20] = 'ผลการ PM';
  row4[24] = 'รายละเอียดสิ่งที่ผิดปกติ';
  row4[32] = 'หมายเหตุ';
  rows.push(row4);

  // Header Sub-row h+1 (Row 5)
  const row5 = new Array(TOTAL_COLS).fill('');
  row5[20] = 'ปกติ';
  row5[22] = 'ไม่ปกติ';
  rows.push(row5);

  // Row 6 (Merged with Header rows 4 & 5)
  rows.push(new Array(TOTAL_COLS).fill(''));

  // Header and layout merges
  const merges: XLSX.Range[] = [
    // แถว 0: Title merge (0,0)–(1,33)
    { s: { r: 0, c: 0 }, e: { r: 1, c: 33 } },

    // แถว 3:
    // "ชื่อเครื่องจักร : "+machine.name merge (0)–(8)
    { s: { r: 3, c: 0 }, e: { r: 3, c: 8 } },
    // "รหัสเครื่องจักร: "+machine.id merge (9)–(27)
    { s: { r: 3, c: 9 }, e: { r: 3, c: 27 } },
    // "วันที่ทำPM......." merge (28)–(33)
    { s: { r: 3, c: 28 }, e: { r: 3, c: 33 } },

    // Header h=4, สูง 3 แถว (r: 4 to 6):
    // ลำดับ(0)
    { s: { r: 4, c: 0 }, e: { r: 6, c: 0 } },
    // หัวข้อ PM(1–7)
    { s: { r: 4, c: 1 }, e: { r: 6, c: 7 } },
    // วิธีการ(8–10)
    { s: { r: 4, c: 8 }, e: { r: 6, c: 10 } },
    // มาตรฐาน(11–18)
    { s: { r: 4, c: 11 }, e: { r: 6, c: 18 } },
    // ความถี่(19)
    { s: { r: 4, c: 19 }, e: { r: 6, c: 19 } },
    // ผลการ PM Title(20–23)
    { s: { r: 4, c: 20 }, e: { r: 4, c: 23 } },
    // Header ย่อย แถว h+1 (Row 5) สูง 2: ปกติ merge(20–21), ไม่ปกติ merge(22–23)
    { s: { r: 5, c: 20 }, e: { r: 6, c: 21 } },
    { s: { r: 5, c: 22 }, e: { r: 6, c: 23 } },
    // รายละเอียดสิ่งที่ผิดปกติ(24–31)
    { s: { r: 4, c: 24 }, e: { r: 6, c: 31 } },
    // หมายเหตุ(32–33)
    { s: { r: 4, c: 32 }, e: { r: 6, c: 33 } }
  ];

  // Data starts at row h+3 = 7
  const steps = plan.steps || [];
  const totalRowsCount = Math.max(steps.length, 6); // At least 6 rows so form has standard size
  for (let idx = 0; idx < totalRowsCount; idx++) {
    const r = 7 + idx;
    const step = steps[idx];
    const dataRow = new Array(TOTAL_COLS).fill('');

    if (step) {
      dataRow[0] = step.itemNo !== undefined && step.itemNo !== null ? step.itemNo : (idx + 1);
      dataRow[1] = step.title || '';
      dataRow[8] = step.method || '';
      dataRow[11] = step.standard || '';
      dataRow[19] = step.frequency || '';

      // ผลการ PM: result==='ปกติ' → เซลล์คอลัมน์ 20 = '✓'; result==='ไม่ปกติ' → คอลัมน์ 22 = '✓'; 'ยังไม่ตรวจ' → เว้นทั้งคู่
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

  // 1. Style Title (Rows 0-1)
  for (let r = 0; r <= 1; r++) {
    for (let c = 0; c < TOTAL_COLS; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = {
        font: { bold: true, sz: 14, color: { rgb: '0F172A' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: 'F1F5F9' } },
        border: thinBorder
      };
    }
  }

  // 2. Style Machine Info (Row 3)
  for (let c = 0; c < TOTAL_COLS; c++) {
    const ref = XLSX.utils.encode_cell({ r: 3, c });
    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
    ws[ref].s = {
      font: { bold: true, sz: 10.5, color: { rgb: '1E293B' } },
      alignment: { vertical: 'center', horizontal: c >= 28 ? 'center' : 'left' },
      fill: { fgColor: { rgb: 'F8FAFC' } },
      border: thinBorder
    };
  }

  // 3. Style Table Headers (Rows 4, 5, 6)
  for (let r = 4; r <= 6; r++) {
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

  // 4. Style Data Rows (Rows 7 onwards)
  const lastDataRow = 7 + totalRowsCount - 1;
  for (let r = 7; r <= lastDataRow; r++) {
    const isEven = (r - 7) % 2 === 1;
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

  // Row heights
  const rowHeights: { hpt: number }[] = [
    { hpt: 24 }, // Row 0
    { hpt: 24 }, // Row 1
    { hpt: 8 },  // Row 2 spacer
    { hpt: 26 }, // Row 3 machine info
    { hpt: 22 }, // Row 4 header
    { hpt: 20 }, // Row 5 sub-header
    { hpt: 20 }, // Row 6 header bottom
  ];
  for (let r = 7; r <= lastDataRow; r++) {
    rowHeights.push({ hpt: 28 }); // 28pt for comfortable multiline data readability
  }
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

        // แถว 3: "ชื่อเครื่องจักร : "+machine.name merge (0)–(8); "รหัสเครื่องจักร: "+machine.id merge (9)–(27)
        const row3 = rows[3] || [];
        const rawName = String(row3[0] ?? '');
        const rawCode = String(row3[9] ?? '');

        const machineName = rawName.replace(/^ชื่อเครื่องจักร\s*:\s*/i, '').trim();
        const machineCode = rawCode.replace(/^รหัสเครื่องจักร\s*:\s*/i, '').trim();

        // Data starts at row h+3 = 7
        const steps: PMStep[] = [];
        for (let r = 7; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          // ถ้าคอลัมน์ 11 (มาตรฐาน) ว่าง = ข้าม
          const standard = String(row[11] ?? '').trim();
          if (!standard) {
            continue;
          }

          const col20 = String(row[20] ?? '').trim();
          const col22 = String(row[22] ?? '').trim();

          const isNormalChecked = col20 === '✓' || col20 === '✔' || col20.toLowerCase() === 'v' || col20 === '/' || col20.toLowerCase() === 'x' || col20 === '1';
          const isAbnormalChecked = col22 === '✓' || col22 === '✔' || col22.toLowerCase() === 'v' || col22 === '/' || col22.toLowerCase() === 'x' || col22 === '1';

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
