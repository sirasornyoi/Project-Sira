import * as XLSX from 'xlsx-js-style';
import * as XLSXRead from 'xlsx';
import { PMPlan, PMStep, PMFrequency, Machine } from '../types';

export interface ParsedPMReportResult {
  machineId: string;
  machineName: string;
  reportDate: string;
  title: string;
  frequency: PMFrequency;
  steps: PMStep[];
  spareParts: string;
  sparePartsQty: string;
  inspectorTech: string;
  acknowledgingDept: string;
  supervisorName: string;
}

/**
 * Column width mapping based on specification:
 * A=9, B=3.7, H=16, I=5, K=9.9, L=3.7, S=23, T=10.9, U=1.6, V=4, W=1.6, X=4.4
 * (0-indexed: A=0, B=1, H=7, I=8, K=10, L=11, S=18, T=19, U=20, V=21, W=22, X=23)
 */
const get34ColumnWidths = (): { wch: number }[] => {
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
 * Export PM Plan as Excel (.xlsx) mirroring the exact 34-column layout (A–AH) of:
 * "ใบรายงาน Preventive Maintenance (PM)"
 */
export const exportPMReportToExcel = (
  plan: PMPlan,
  machine?: Machine,
  reportDate?: string
) => {
  const wb = XLSX.utils.book_new();

  const machId = plan.machineId || machine?.id || 'SLI01';
  const machName = machine?.name || plan.machineId || 'เครื่องหั่นผัก (Food Slicer)';
  const dateStr = reportDate || plan.lastCheckedDate || new Date().toISOString().split('T')[0];

  const TOTAL_COLS = 34;
  const rows: any[][] = [];

  // Row 0: Title
  const row0 = new Array(TOTAL_COLS).fill('');
  row0[0] = 'ใบรายงาน Preventive Maintenance (PM)';
  rows.push(row0);

  // Row 1: Machine Header
  const row1 = new Array(TOTAL_COLS).fill('');
  row1[0] = `ชื่อเครื่องจักร: ${machName}`;
  row1[9] = `รหัสเครื่องจักร: ${machId}`;
  row1[24] = `วันที่ทำ PM: ${dateStr}`;
  rows.push(row1);

  // Row 2: Table Header Top
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

  // Row 3: Table Header Sub (under ผลการ PM: ปกติ merge 20-21, ไม่ปกติ merge 22-23)
  const row3 = new Array(TOTAL_COLS).fill('');
  row3[20] = 'ปกติ';
  row3[22] = 'ไม่ปกติ';
  rows.push(row3);

  // Header and title merges
  const merges: XLSX.Range[] = [
    // Title row 0 merge A1:AH1 (0..33)
    { s: { r: 0, c: 0 }, e: { r: 0, c: 33 } },
    // Header machine name merge (0..8)
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    // Machine ID merge (9..23)
    { s: { r: 1, c: 9 }, e: { r: 1, c: 23 } },
    // PM Date merge (24..33)
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
    // ผลการ PM(20–23) เป็นหัวรวมคร่อม
    { s: { r: 2, c: 20 }, e: { r: 2, c: 23 } },
    // ใต้ "ผลการ PM" แตกเป็น 2 ช่อง: ปกติ merge(20–21), ไม่ปกติ merge(22–23)
    { s: { r: 3, c: 20 }, e: { r: 3, c: 21 } },
    { s: { r: 3, c: 22 }, e: { r: 3, c: 23 } },
    // รายละเอียด(24–31)
    { s: { r: 2, c: 24 }, e: { r: 3, c: 31 } },
    // หมายเหตุ(32–33)
    { s: { r: 2, c: 32 }, e: { r: 3, c: 33 } }
  ];

  // Rows 4+: PM Steps
  const steps = plan.steps && plan.steps.length > 0 ? plan.steps : [
    { title: 'ตรวจเช็คสภาพทั่วไปทั้งภายในและภายนอกเครื่อง', method: 'ดูด้วยสายตา', standard: 'โครงสร้างสมบูรณ์ ไม่มีส่วนชำรุด', frequency: '1 เดือน/ครั้ง', stdTime: 15 }
  ];
  const totalStepsCount = Math.max(steps.length, 6);

  for (let idx = 0; idx < totalStepsCount; idx++) {
    const r = 4 + idx;
    const step = steps[idx];
    const dataRow = new Array(TOTAL_COLS).fill('');

    if (step) {
      const itemNo = step.itemNo !== undefined && step.itemNo !== '' ? step.itemNo : (idx + 1);
      const isNormal = step.result === 'ปกติ' || (step.done && step.result !== 'ไม่ปกติ');
      const isAbnormal = step.result === 'ไม่ปกติ';

      dataRow[0] = itemNo;
      dataRow[1] = step.title || '';
      dataRow[8] = step.method || 'ดูด้วยสายตา';
      dataRow[11] = step.standard || '-';
      dataRow[19] = step.frequency || plan.frequency || '1 เดือน/ครั้ง';
      // ✓ ลงคอลัมน์ 20 (ปกติ) หรือ 22 (ไม่ปกติ)
      if (isNormal) dataRow[20] = '✓';
      if (isAbnormal) dataRow[22] = '✓';
      dataRow[24] = step.abnormalDetail || '';
      dataRow[32] = step.remark || '';
    } else {
      dataRow[0] = idx + 1;
    }
    rows.push(dataRow);

    // Merges for step row r:
    merges.push(
      // หัวข้อ PM(1–7)
      { s: { r, c: 1 }, e: { r, c: 7 } },
      // วิธีการ(8–10)
      { s: { r, c: 8 }, e: { r, c: 10 } },
      // มาตรฐาน(11–18)
      { s: { r, c: 11 }, e: { r, c: 18 } },
      // ปกติ merge(20–21)
      { s: { r, c: 20 }, e: { r, c: 21 } },
      // ไม่ปกติ merge(22–23)
      { s: { r, c: 22 }, e: { r, c: 23 } },
      // รายละเอียด(24–31)
      { s: { r, c: 24 }, e: { r, c: 31 } },
      // หมายเหตุ(32–33)
      { s: { r, c: 32 }, e: { r, c: 33 } }
    );
  }

  const dataEndRow = 3 + totalStepsCount;

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

  // Footer merges (ขยาย merge ให้พอดี 34 คอลัมน์)
  const spareHeaderRow = dataEndRow + 2;
  const spareDataRow = dataEndRow + 3;
  const sig1Row = dataEndRow + 5;
  const sig2Row = dataEndRow + 6;
  const sig3Row = dataEndRow + 7;

  merges.push(
    // Spare parts header: ลำดับ(0), รายการอะไหล่(1-23), จำนวน(24-33)
    { s: { r: spareHeaderRow, c: 1 }, e: { r: spareHeaderRow, c: 23 } },
    { s: { r: spareHeaderRow, c: 24 }, e: { r: spareHeaderRow, c: 33 } },
    // Spare parts data
    { s: { r: spareDataRow, c: 1 }, e: { r: spareDataRow, c: 23 } },
    { s: { r: spareDataRow, c: 24 }, e: { r: spareDataRow, c: 33 } },
    // Signatures merges across all 34 cols
    { s: { r: sig1Row, c: 0 }, e: { r: sig1Row, c: 33 } },
    { s: { r: sig2Row, c: 0 }, e: { r: sig2Row, c: 33 } },
    { s: { r: sig3Row, c: 0 }, e: { r: sig3Row, c: 33 } }
  );

  // Create worksheet from rows
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = merges;
  ws['!cols'] = get34ColumnWidths();

  // Border style definitions
  const thinBorder = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } }
  };

  // 1. Title Row (Row 0)
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

  // 2. Machine Info Row (Row 1)
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

  // 3. Table Header Rows (Row 2 and Row 3)
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

  // 4. Data Rows (Rows 4 to dataEndRow)
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
    { hpt: 26 }, // Row 0 Title
    { hpt: 24 }, // Row 1 Machine Info
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

  XLSX.utils.book_append_sheet(wb, ws, 'ใบรายงาน_PM');

  const safeMachId = machId.replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `ใบรายงาน_PM_${safeMachId}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Parse Excel file (.xlsx / .xls / .csv) into structured PM Plan & Checklist items
 */
export const parsePMReportExcel = (data: ArrayBuffer): ParsedPMReportResult => {
  const wb = XLSXRead.read(data, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // Convert to 2D array of strings
  const rawRows: any[][] = XLSXRead.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let machineId = '';
  let machineName = '';
  let reportDate = '';
  let title = 'ใบรายงาน Preventive Maintenance (PM)';
  let frequency: PMFrequency = 'รายเดือน';
  let spareParts = '';
  let sparePartsQty = '';
  let inspectorTech = '';
  let acknowledgingDept = '';
  let supervisorName = '';

  let headerRowIndex = -1;
  let colIndex = {
    itemNo: 0,
    title: 1,
    method: 2,
    standard: 3,
    frequency: 4,
    normal: 5,
    abnormal: 6,
    abnormalDetail: 7,
    remark: 8
  };

  // 1. Scan the top 12 rows for metadata & header row
  for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
    const row = rawRows[r] || [];

    // Cell-by-cell metadata extraction
    row.forEach(cell => {
      const s = String(cell).trim();
      if (s.startsWith('ชื่อเครื่องจักร')) {
        const val = s.replace(/^ชื่อเครื่องจักร\s*[:：]?\s*/i, '').trim();
        if (val) machineName = val;
      }
      if (s.startsWith('รหัสเครื่องจักร')) {
        const val = s.replace(/^รหัสเครื่องจักร\s*[:：]?\s*/i, '').trim();
        if (val) machineId = val;
      }
      if (s.includes('วันที่')) {
        const m = s.match(/วันที่\s*(?:ทำ\s*PM)?\s*[:：]?\s*([0-9\/\-\.]+)/i);
        if (m && m[1] && !m[1].startsWith('..')) reportDate = m[1].trim();
      }
    });

    // Check if this row is the table header
    const hasHeaderKeywords = row.some(cell => {
      const s = String(cell).toLowerCase();
      return s.includes('หัวข้อ') || s.includes('มาตรฐาน') || s.includes('วิธีการ') || s.includes('ผลการ');
    });

    if (hasHeaderKeywords && headerRowIndex === -1) {
      headerRowIndex = r;

      // Detect column indices dynamically
      row.forEach((cell, c) => {
        const s = String(cell).toLowerCase().trim();
        if (s.includes('ลำดับ') || s.includes('no.') || s === 'no' || s === '#' || s.includes('item') || s.includes('ข้อที่') || s === 'ที่' || s.includes('รายการ')) {
          colIndex.itemNo = c;
        }
        else if (s.includes('หัวข้อ')) colIndex.title = c;
        else if (s.includes('วิธี')) colIndex.method = c;
        else if (s.includes('มาตรฐาน')) colIndex.standard = c;
        else if (s.includes('ความถี่')) colIndex.frequency = c;
        else if (s.includes('ผิดปกติ') || s.includes('รายละเอียด') || s.includes('ค่าที่วัด')) colIndex.abnormalDetail = c;
        else if (s.includes('หมายเหตุ')) colIndex.remark = c;
        else if (s.includes('ไม่ปกติ')) colIndex.abnormal = c;
        else if (s.includes('ปกติ') && !s.includes('ไม่') && !s.includes('ผิด')) colIndex.normal = c;
      });

      // Also inspect sub-header row (r + 1) for 'ปกติ' (col 20) and 'ไม่ปกติ' (col 22)
      const nextHeaderRow = rawRows[r + 1] || [];
      nextHeaderRow.forEach((cell, c) => {
        const s = String(cell).toLowerCase().trim();
        if (s.includes('ผิดปกติ') || s.includes('รายละเอียด')) colIndex.abnormalDetail = c;
        else if (s.includes('ไม่ปกติ')) colIndex.abnormal = c;
        else if (s.includes('ปกติ') && !s.includes('ไม่') && !s.includes('ผิด')) colIndex.normal = c;
      });

      // For 34-column layout, enforce canonical columns if row is wide
      if (row.length >= 30) {
        colIndex.itemNo = 0;
        colIndex.title = 1;
        colIndex.method = 8;
        colIndex.standard = 11;
        colIndex.frequency = 19;
        colIndex.normal = 20;
        colIndex.abnormal = 22;
        colIndex.abnormalDetail = 24;
        colIndex.remark = 32;
      }
    }
  }

  // If header not detected, fallback to row 2
  if (headerRowIndex === -1) {
    headerRowIndex = 2;
  }

  // 2. Parse data rows starting after headerRowIndex (skip sub-header if present)
  const steps: PMStep[] = [];
  let currentItemNo: number | string = '';
  let currentTitle = '';
  let currentMethod = '';

  const subHeaderRow = rawRows[headerRowIndex + 1] || [];
  const hasSubHeader = subHeaderRow.some(c => {
    const s = String(c).trim();
    return s.includes('ปกติ') || s.includes('ไม่ปกติ');
  });
  const dataStartRow = headerRowIndex + (hasSubHeader ? 2 : 1);

  for (let r = dataStartRow; r < rawRows.length; r++) {
    const row = rawRows[r] || [];
    const rowJoined = row.map(c => String(c).trim()).join(' ');

    // Check if we reached the footer (Spare parts or signatures)
    if (
      rowJoined.includes('รายการอะไหล่') ||
      rowJoined.includes('ผู้ทำการ PM') ||
      rowJoined.includes('ผู้รับทราบ') ||
      rowJoined.includes('ผู้ตรวจสอบ')
    ) {
      // Parse signatures / spare parts in footer
      for (let fr = r; fr < rawRows.length; fr++) {
        const fRow = rawRows[fr] || [];
        const fJoined = fRow.map(c => String(c).trim()).join(' ');

        if (fJoined.includes('ผู้ทำการ PM') || fJoined.includes('ทีมช่าง')) {
          const val = fJoined.replace(/^.*ผู้ทำการ\s*PM\s*[:：]?\s*/i, '').replace(/ทีมช่าง.*$/i, '').trim();
          if (val && !val.includes('...')) inspectorTech = val;
        }
        if (fJoined.includes('ผู้รับทราบ') || fJoined.includes('ฝ่ายผลิต')) {
          const val = fJoined.replace(/^.*ผู้รับทราบ\s*(?:ทำ\s*การ)?\s*PM\s*[:：]?\s*/i, '').replace(/ฝ่ายผลิต.*$/i, '').trim();
          if (val && !val.includes('...')) acknowledgingDept = val;
        }
        if (fJoined.includes('ผู้ตรวจสอบ') || fJoined.includes('หัวหน้า')) {
          const val = fJoined.replace(/^.*ผู้ตรวจสอบ\s*(?:ทำ\s*การ)?\s*PM\s*[:：]?\s*/i, '').replace(/หัวหน้า.*$/i, '').trim();
          if (val && !val.includes('...')) supervisorName = val;
        }
        if (fJoined.includes('รายการอะไหล่ที่เตรียมแก้ไข')) {
          // Look at next row for spare part value
          const nextRow = rawRows[fr + 1] || [];
          if (nextRow.length > 1) {
            const partCandidate = String(nextRow[1] || '').trim();
            if (partCandidate && partCandidate !== '-') {
              spareParts = partCandidate;
              const qtyCandidate = String(nextRow[24] || nextRow[nextRow.length - 3] || nextRow[colIndex.normal] || '').trim();
              if (qtyCandidate && qtyCandidate !== '-') {
                sparePartsQty = qtyCandidate;
              }
            }
          }
        }
      }
      break;
    }

    // Skip completely empty rows
    const isRowEmpty = row.every(c => !c || String(c).trim() === '');
    if (isRowEmpty) continue;

    let rawNo = row[colIndex.itemNo] !== undefined ? String(row[colIndex.itemNo]).trim() : '';
    // Fallback: If colIndex.itemNo !== 0, but cell 0 contains a pure number (1, 2, 3...), treat cell 0 as sequence candidate
    if (!rawNo && colIndex.itemNo !== 0 && row[0] !== undefined) {
      const cell0 = String(row[0]).trim();
      if (/^\d+(\.\d+)?$/.test(cell0)) {
        rawNo = cell0;
      }
    }

    const rawTitle = row[colIndex.title] !== undefined ? String(row[colIndex.title]).trim() : '';
    const rawMethod = row[colIndex.method] !== undefined ? String(row[colIndex.method]).trim() : '';
    const rawStandard = row[colIndex.standard] !== undefined ? String(row[colIndex.standard]).trim() : '';
    const rawFreq = row[colIndex.frequency] !== undefined ? String(row[colIndex.frequency]).trim() : '';
    
    // Support normal at colIndex.normal (or col 20/21) and abnormal at colIndex.abnormal (or col 22/23)
    let rawNormal = row[colIndex.normal] !== undefined ? String(row[colIndex.normal]).trim() : '';
    let rawAbnormal = row[colIndex.abnormal] !== undefined ? String(row[colIndex.abnormal]).trim() : '';
    if (colIndex.normal === 20 && !rawNormal && row[21] !== undefined) {
      rawNormal = String(row[21]).trim();
    }
    if (colIndex.abnormal === 22 && !rawAbnormal && row[23] !== undefined) {
      rawAbnormal = String(row[23]).trim();
    }
    const rawAbnormalDetail = row[colIndex.abnormalDetail] !== undefined ? String(row[colIndex.abnormalDetail]).trim() : '';
    const rawRemark = row[colIndex.remark] !== undefined ? String(row[colIndex.remark]).trim() : '';

    // Determine sequence number (itemNo)
    let stepItemNo: number | string = '';

    if (rawNo !== '') {
      // Clean prefixes like '#', 'ข้อ', and trailing dots (e.g. '1.', '#1', 'ข้อ 1')
      const cleanNo = rawNo.replace(/^#/, '').replace(/^ข้อ\s*/, '').replace(/\.$/, '').trim();
      const parsedNum = Number(cleanNo);
      if (!isNaN(parsedNum) && !cleanNo.includes(' ') && cleanNo !== '') {
        stepItemNo = parsedNum;
        currentItemNo = parsedNum;
      } else {
        stepItemNo = cleanNo;
        currentItemNo = cleanNo;
      }
    } else {
      // If rawNo is empty:
      // If this row has a new title, it's a new checklist topic
      if (rawTitle && rawTitle !== currentTitle) {
        if (typeof currentItemNo === 'number') {
          currentItemNo = currentItemNo + 1;
        } else {
          currentItemNo = steps.length + 1;
        }
        stepItemNo = currentItemNo;
      } else if (rawTitle && rawTitle === currentTitle) {
        // Sub-item or continuation row of the same title
        stepItemNo = currentItemNo !== '' ? currentItemNo : (steps.length + 1);
      } else if (!rawTitle && rawStandard) {
        // Continuation standard line for current item
        stepItemNo = currentItemNo !== '' ? currentItemNo : (steps.length + 1);
      } else {
        stepItemNo = steps.length + 1;
        currentItemNo = stepItemNo;
      }
    }

    if (stepItemNo === '' || stepItemNo === undefined) {
      stepItemNo = steps.length + 1;
    }

    if (rawTitle) {
      currentTitle = rawTitle;
    }
    if (rawMethod) {
      currentMethod = rawMethod;
    }

    // Determine result
    let result: 'ปกติ' | 'ไม่ปกติ' | 'ยังไม่ตรวจ' = 'ยังไม่ตรวจ';
    let done = false;

    const normalMarked = ['✓', 'v', 'x', '1', 'true', 'ok', 'ปกติ', '/'].includes(rawNormal.toLowerCase());
    const abnormalMarked = ['✓', 'v', 'x', '1', 'true', 'no', 'ไม่ปกติ', '/'].includes(rawAbnormal.toLowerCase());

    if (normalMarked) {
      result = 'ปกติ';
      done = true;
    } else if (abnormalMarked) {
      result = 'ไม่ปกติ';
      done = true;
    }

    // Check frequency
    if (rawFreq) {
      if (rawFreq.includes('วัน')) frequency = 'รายวัน';
      else if (rawFreq.includes('สัปดาห์')) frequency = 'รายสัปดาห์';
      else if (rawFreq.includes('ปี')) frequency = 'รายปี';
      else frequency = 'รายเดือน';
    }

    if (currentTitle || rawStandard) {
      steps.push({
        id: `step-${Date.now()}-${steps.length}`,
        itemNo: stepItemNo,
        title: currentTitle || rawStandard,
        method: currentMethod || 'ดูด้วยสายตา',
        standard: rawStandard || '-',
        frequency: rawFreq || '1 เดือน/ครั้ง',
        stdTime: 10,
        result,
        abnormalDetail: rawAbnormalDetail,
        remark: rawRemark,
        done
      });
    }
  }

  // If no machineId was found in headers, check steps or set empty
  if (!machineId) {
    machineId = 'SLI01';
  }

  return {
    machineId,
    machineName: machineName || (machineId === 'SLI01' ? 'เครื่องหั่นผัก (Food Slicer)' : machineId),
    reportDate: reportDate || new Date().toISOString().split('T')[0],
    title: machineName ? `ใบรายงาน PM - ${machineName}` : 'ใบรายงาน Preventive Maintenance (PM)',
    frequency,
    steps,
    spareParts,
    sparePartsQty,
    inspectorTech,
    acknowledgingDept,
    supervisorName
  };
};

/**
 * Export a blank/sample PM Report Template in Excel format
 */
export const exportPMTemplateExcel = (machine?: Machine) => {
  const samplePlan: PMPlan = {
    id: 'template',
    machineId: machine?.id || 'SLI01',
    title: 'ใบรายงาน Preventive Maintenance (PM)',
    frequency: 'รายเดือน',
    ttm: 60,
    spareParts: 'ลูกปืนมีด 6006, สายพานไทม์มิ่ง',
    sparePartsQty: '2 ชุด',
    inspectorTech: 'ทีมช่างบำรุงรักษา',
    acknowledgingDept: 'ฝ่ายผลิต',
    supervisorName: 'หัวหน้าหน่วย PM',
    lastCheckedDate: new Date().toISOString().split('T')[0],
    steps: [
      {
        itemNo: 1,
        title: 'ตรวจเช็คสภาพทั่วไปทั้งภายในและภายนอกเครื่อง',
        method: 'ดูด้วยสายตา',
        standard: 'โครงสร้างสมบูรณ์ ไม่มีส่วนชำรุด',
        frequency: '1 เดือน/ครั้ง',
        stdTime: 10,
        result: 'ปกติ',
        done: true,
        abnormalDetail: '',
        remark: ''
      },
      {
        itemNo: 2,
        title: 'ตรวจวัดค่าแรงดัน',
        method: 'เครื่องมือวัด',
        standard: 'แรงดันไฟฟ้า……3 เฟส 200-240 V. (บันทึกค่าที่วัดได้)',
        frequency: '1 เดือน/ครั้ง',
        stdTime: 10,
        result: 'ปกติ',
        done: true,
        abnormalDetail: '220V 3 เฟส สมดุล',
        remark: ''
      },
      {
        itemNo: 3,
        title: 'ตรวจวัดค่ากระแสไฟฟ้า มอเตอร์ขับสายพาน 0.2KW',
        method: 'เครื่องมือวัด',
        standard: 'กระแสไฟฟ้า ไม่เกิน 1.15 A.... (บันทึกค่าที่วัดได้)',
        frequency: '1 เดือน/ครั้ง',
        stdTime: 15,
        result: 'ยังไม่ตรวจ',
        done: false,
        abnormalDetail: '',
        remark: ''
      },
      {
        itemNo: 4,
        title: 'ตรวจเช็คสภาพใบมีด/ลับคม',
        method: 'มือ สายตา',
        standard: 'ใบมีดมีความคมและยึดแน่น ไม่มีส่วนใดชำรุด บิ่น',
        frequency: '1 เดือน/ครั้ง',
        stdTime: 15,
        result: 'ยังไม่ตรวจ',
        done: false,
        abnormalDetail: '',
        remark: 'ลูกปืนมีด 6006 2 ตลับ'
      },
      {
        itemNo: 5,
        title: 'ทำความสะอาดทั่วไปโดยรอบเครื่องจักร',
        method: 'มือ สายตา',
        standard: 'ภายในและภายนอกเครื่อง ตู้ควบคุม สะอาด ไม่มีความชื้น',
        frequency: '1 เดือน/ครั้ง',
        stdTime: 10,
        result: 'ยังไม่ตรวจ',
        done: false,
        abnormalDetail: '',
        remark: ''
      }
    ]
  };

  exportPMReportToExcel(samplePlan, machine);
};
