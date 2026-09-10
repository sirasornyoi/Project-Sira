import * as XLSX from 'xlsx';
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
 * Export PM Plan as Excel (.xlsx) mirroring the exact layout of:
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

  // Prepare 2D array of rows
  const rows: any[][] = [];

  // Row 0: Title
  rows.push(['ใบรายงาน Preventive Maintenance (PM)', '', '', '', '', '', '', '', '']);

  // Row 1: Machine Header
  rows.push([
    `ชื่อเครื่องจักร: ${machName}`, '', '', '',
    `รหัสเครื่องจักร: ${machId}`, '',
    `วันที่ทำ PM: ${dateStr}`, '', ''
  ]);

  // Row 2: Table Header
  rows.push([
    'ลำดับ',
    'หัวข้อ PM',
    'วิธีการ',
    'มาตรฐาน',
    'ความถี่',
    'ผลการ PM: ปกติ',
    'ผลการ PM: ไม่ปกติ',
    'รายละเอียดสิ่งที่ผิดปกติ / ค่าที่วัดได้',
    'หมายเหตุ'
  ]);

  // Rows 3+: PM Steps
  const steps = plan.steps && plan.steps.length > 0 ? plan.steps : [
    { title: 'ตรวจเช็คสภาพทั่วไปทั้งภายในและภายนอกเครื่อง', method: 'ดูด้วยสายตา', standard: 'โครงสร้างสมบูรณ์ ไม่มีส่วนชำรุด', frequency: '1 เดือน/ครั้ง', stdTime: 15 }
  ];

  steps.forEach((step, idx) => {
    const itemNo = step.itemNo !== undefined && step.itemNo !== '' ? step.itemNo : (idx + 1);
    const isNormal = step.result === 'ปกติ' || (step.done && step.result !== 'ไม่ปกติ');
    const isAbnormal = step.result === 'ไม่ปกติ';

    rows.push([
      itemNo,
      step.title || '',
      step.method || 'ดูด้วยสายตา',
      step.standard || '-',
      step.frequency || plan.frequency || '1 เดือน/ครั้ง',
      isNormal ? '✓' : '',
      isAbnormal ? '✓' : '',
      step.abnormalDetail || '',
      step.remark || ''
    ]);
  });

  // Empty separator
  rows.push(['', '', '', '', '', '', '', '', '']);

  // Spare parts row
  rows.push([
    'ลำดับ',
    'รายการอะไหล่ที่เตรียมแก้ไข',
    '',
    '',
    '',
    '',
    'จำนวน',
    '',
    ''
  ]);
  rows.push([
    '1',
    plan.spareParts || '-',
    '',
    '',
    '',
    '',
    plan.sparePartsQty || '-',
    '',
    ''
  ]);

  // Signatures / Approvals
  rows.push(['', '', '', '', '', '', '', '', '']);
  rows.push([
    `ผู้ทำการ PM: ${plan.inspectorTech || '...................................................'} ทีมช่าง`, '', '', '',
    '', '', '', '', ''
  ]);
  rows.push([
    `ผู้รับทราบทำการ PM: ${plan.acknowledgingDept || '...................................................'} ฝ่ายผลิต`, '', '', '',
    '', '', '', '', ''
  ]);
  rows.push([
    `ผู้ตรวจสอบทำการ PM: ${plan.supervisorName || '...................................................'} หัวหน้าหน่วย PM`, '', '', '',
    '', '', '', '', ''
  ]);

  // Create worksheet from rows
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Configure column widths
  ws['!cols'] = [
    { wch: 8 },  // ลำดับ
    { wch: 35 }, // หัวข้อ PM
    { wch: 18 }, // วิธีการ
    { wch: 45 }, // มาตรฐาน
    { wch: 14 }, // ความถี่
    { wch: 10 }, // ปกติ
    { wch: 10 }, // ไม่ปกติ
    { wch: 35 }, // รายละเอียดสิ่งที่ผิดปกติ
    { wch: 25 }  // หมายเหตุ
  ];

  // Merges
  ws['!merges'] = [
    // Title row merge A1:I1
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    // Header machine name merge A2:D2
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    // Machine ID merge E2:F2
    { s: { r: 1, c: 4 }, e: { r: 1, c: 5 } },
    // PM Date merge G2:I2
    { s: { r: 1, c: 6 }, e: { r: 1, c: 8 } },
    // Spare parts header merge B(row):F(row)
    { s: { r: rows.length - 5, c: 1 }, e: { r: rows.length - 5, c: 5 } },
    { s: { r: rows.length - 5, c: 6 }, e: { r: rows.length - 5, c: 8 } },
    // Spare parts data merge B(row):F(row)
    { s: { r: rows.length - 4, c: 1 }, e: { r: rows.length - 4, c: 5 } },
    { s: { r: rows.length - 4, c: 6 }, e: { r: rows.length - 4, c: 8 } },
    // Signatures merges
    { s: { r: rows.length - 3, c: 0 }, e: { r: rows.length - 3, c: 8 } },
    { s: { r: rows.length - 2, c: 0 }, e: { r: rows.length - 2, c: 8 } },
    { s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 8 } }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'ใบรายงาน_PM');

  const safeMachId = machId.replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `ใบรายงาน_PM_${safeMachId}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Parse Excel file (.xlsx / .xls / .csv) into structured PM Plan & Checklist items
 */
export const parsePMReportExcel = (data: ArrayBuffer): ParsedPMReportResult => {
  const wb = XLSX.read(data, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // Convert to 2D array of strings
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

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
    const rowJoined = row.map(c => String(c).trim()).join(' ');

    // Machine Name
    const nameMatch = rowJoined.match(/ชื่อเครื่องจักร\s*[:：]?\s*([^รหัส|วันที่|\n]+)/i);
    if (nameMatch && nameMatch[1]) {
      machineName = nameMatch[1].trim();
    }

    // Machine ID
    const idMatch = rowJoined.match(/รหัสเครื่องจักร\s*[:：]?\s*([A-Za-z0-9_-]+)/i);
    if (idMatch && idMatch[1]) {
      machineId = idMatch[1].trim();
    }

    // Date
    const dateMatch = rowJoined.match(/วันที่\s*(?:ทำ\s*PM)?\s*[:：]?\s*([0-9\/\-\.]+)/i);
    if (dateMatch && dateMatch[1] && !dateMatch[1].startsWith('..')) {
      reportDate = dateMatch[1].trim();
    }

    // Check if this row is the table header
    const hasHeaderKeywords = row.some(cell => {
      const s = String(cell).toLowerCase();
      return s.includes('หัวข้อ') || s.includes('มาตรฐาน') || s.includes('วิธีการ') || s.includes('ผลการ');
    });

    if (hasHeaderKeywords && headerRowIndex === -1) {
      headerRowIndex = r;

      // Detect column indices dynamically
      row.forEach((cell, c) => {
        const s = String(cell).toLowerCase();
        if (s.includes('ลำดับ')) colIndex.itemNo = c;
        else if (s.includes('หัวข้อ')) colIndex.title = c;
        else if (s.includes('วิธี')) colIndex.method = c;
        else if (s.includes('มาตรฐาน')) colIndex.standard = c;
        else if (s.includes('ความถี่')) colIndex.frequency = c;
        else if (s.includes('ปกติ') && !s.includes('ไม่')) colIndex.normal = c;
        else if (s.includes('ไม่ปกติ')) colIndex.abnormal = c;
        else if (s.includes('ผิดปกติ') || s.includes('รายละเอียด') || s.includes('ค่าที่วัด')) colIndex.abnormalDetail = c;
        else if (s.includes('หมายเหตุ')) colIndex.remark = c;
      });
    }
  }

  // If header not detected, fallback to row 2
  if (headerRowIndex === -1) {
    headerRowIndex = 2;
  }

  // 2. Parse data rows starting after headerRowIndex
  const steps: PMStep[] = [];
  let currentTitle = '';
  let currentMethod = '';

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
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
          const m = fJoined.match(/ผู้ทำการ\s*PM\s*[:：]?\s*([^ทีมช่าง\n\.]+)/i);
          if (m && m[1] && !m[1].includes('...')) inspectorTech = m[1].trim();
        }
        if (fJoined.includes('ผู้รับทราบ') || fJoined.includes('ฝ่ายผลิต')) {
          const m = fJoined.match(/ผู้รับทราบ\s*ทำ?การ\s*PM\s*[:：]?\s*([^ฝ่ายผลิต\n\.]+)/i);
          if (m && m[1] && !m[1].includes('...')) acknowledgingDept = m[1].trim();
        }
        if (fJoined.includes('ผู้ตรวจสอบ') || fJoined.includes('หัวหน้า')) {
          const m = fJoined.match(/ผู้ตรวจสอบ\s*ทำ?การ\s*PM\s*[:：]?\s*([^หัวหน้า\n\.]+)/i);
          if (m && m[1] && !m[1].includes('...')) supervisorName = m[1].trim();
        }
        if (fJoined.includes('รายการอะไหล่ที่เตรียมแก้ไข')) {
          // Look at next row for spare part value
          const nextRow = rawRows[fr + 1] || [];
          if (nextRow.length > 1) {
            const partCandidate = String(nextRow[1] || '').trim();
            if (partCandidate && partCandidate !== '-') {
              spareParts = partCandidate;
              sparePartsQty = String(nextRow[nextRow.length - 3] || nextRow[colIndex.normal] || '').trim();
            }
          }
        }
      }
      break;
    }

    // Skip completely empty rows
    const isRowEmpty = row.every(c => !c || String(c).trim() === '');
    if (isRowEmpty) continue;

    const rawNo = row[colIndex.itemNo] !== undefined ? String(row[colIndex.itemNo]).trim() : '';
    const rawTitle = row[colIndex.title] !== undefined ? String(row[colIndex.title]).trim() : '';
    const rawMethod = row[colIndex.method] !== undefined ? String(row[colIndex.method]).trim() : '';
    const rawStandard = row[colIndex.standard] !== undefined ? String(row[colIndex.standard]).trim() : '';
    const rawFreq = row[colIndex.frequency] !== undefined ? String(row[colIndex.frequency]).trim() : '';
    const rawNormal = row[colIndex.normal] !== undefined ? String(row[colIndex.normal]).trim() : '';
    const rawAbnormal = row[colIndex.abnormal] !== undefined ? String(row[colIndex.abnormal]).trim() : '';
    const rawAbnormalDetail = row[colIndex.abnormalDetail] !== undefined ? String(row[colIndex.abnormalDetail]).trim() : '';
    const rawRemark = row[colIndex.remark] !== undefined ? String(row[colIndex.remark]).trim() : '';

    // Handle merged cells in Excel where title or method might be on the first sub-row
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
        itemNo: rawNo || (steps.length + 1),
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
