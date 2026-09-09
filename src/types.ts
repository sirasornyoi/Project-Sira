export interface Machine {
  id: string; // ID e.g. "RIM01"
  name: string; // Name e.g. "RICE MIXER"
  lineGroup: string; // Line/Group, e.g. "LINE A"
  status?: 'ปกติ' | 'เสีย/ซ่อม'; // Status
}

export type PMFrequency = 'รายวัน' | 'รายสัปดาห์' | 'รายเดือน' | 'รายปี';

export interface PMStep {
  title: string;
  stdTime: number; // in minutes
}

export interface PMPlan {
  id: string;
  machineId: string;
  title: string;
  frequency: PMFrequency;
  steps: PMStep[];
  spareParts?: string;
  ttm: number; // in minutes (sum of stdTime of all steps)
}

export interface PMRescheduleHistoryItem {
  id: string;
  fromDate: string; // วันที่เดิมก่อนเลื่อน
  toDate: string; // วันที่ใหม่ที่เลื่อนไป
  reason: string; // สาเหตุการเลื่อนแผน
  rescheduledAt: string; // วันเวลาที่ทำรายการเลื่อน
  byTech?: string; // ผู้บันทึกการเลื่อนแผน
  notes?: string; // หมายเหตุเพิ่มเติม
}

export interface PMScheduleItem {
  id: string;
  type: 'PM';
  technician: string;
  technicians?: string[]; // ช่างที่ปฏิบัติงานร่วมกัน
  date: string; // YYYY-MM-DD
  machineId: string;
  pmPlanId: string;
  status: 'รอดำเนินการ' | 'กำลังทำ' | 'เสร็จสิ้น';
  duration: number; // TTM in minutes
  actualDuration?: number; // actual time spent on PM tasks in minutes
  overtimeReason?: string; // สาเหตุที่ใช้เวลาเกินเกณฑ์มาตรฐาน (Overtime / Delay Reason)
  usedParts?: { partId: string; quantity: number; pricePerUnit: number; totalCost: number }[];
  otherCost?: number;
  rescheduledFromDate?: string; // วันที่ตามแผนเดิมก่อนเลื่อน
  rescheduledReason?: string; // เหตุผลในการเลื่อนแผน (เช่น เครื่องติดไลน์ผลิตเร่งด่วน, รออะไหล่)
  rescheduledCount?: number; // จำนวนครั้งที่มีการเลื่อนแผน
  rescheduleHistory?: PMRescheduleHistoryItem[]; // ประวัติการเลื่อนแผนแต่ละครั้ง
}

export interface OperationScheduleItem {
  id: string;
  type: 'Operation';
  technician: string;
  technicians?: string[]; // ช่างที่ปฏิบัติงานร่วมกัน
  date: string; // YYYY-MM-DD
  line: string; // production line name
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isWeeklyRecurring: boolean;
  recurringDays: number[]; // 0 for Sun, 1 for Mon, etc.
  duration: number; // in minutes (end - start)
}

export interface RepairLog {
  id: string;
  type: 'Repair';
  technician: string;
  technicians?: string[]; // ช่างที่ทำงานร่วมกันหลายคน
  date: string; // YYYY-MM-DD (date of breakdown)
  machineId: string;
  breakdownTime: string; // YYYY-MM-DDTHH:MM
  repairDoneTime: string; // YYYY-MM-DDTHH:MM
  symptoms: string; // อาการเสีย
  why1: string;
  why2: string;
  why3: string;
  why4: string;
  why5: string;
  correctiveAction: string; // มาตรการแก้ไข
  photo?: string; // base64
  duration: number; // MTTR in minutes (repairDoneTime - breakdownTime)
  status?: 'กำลังซ่อม' | 'ปิดงาน'; // สถานะใบงานซ่อม
  usedParts?: { partId: string; quantity: number; pricePerUnit: number; totalCost: number }[];
  otherCost?: number;
  excelFile?: { name: string; content: string }; // ไฟล์ Excel แนบประกอบใบซ่อม (Base64)
}

export interface ImprovementWorkLog {
  id: string;
  date: string; // YYYY-MM-DD
  hours: number;
  note: string;
}

export interface ImprovementProject {
  id: string;
  type: 'Improvement';
  title: string; // ชื่อโครงการ
  description: string; // รายละเอียด
  machineId?: string; // เครื่องจักรที่เกี่ยวข้อง (optional)
  startDate: string; // วันที่เริ่ม YYYY-MM-DD
  plannedEndDate: string; // วันที่คาดเสร็จ YYYY-MM-DD
  workLogs: ImprovementWorkLog[];
  status: 'วางแผน' | 'กำลังดำเนินการ' | 'เสร็จแล้ว';
  technician: string; // Main assigned technician
  technicians?: string[]; // ช่างที่ทำงานในโครงการร่วมกัน
  photoBefore?: string; // base64
  photoAfter?: string; // base64
}

export type ScheduleItem = PMScheduleItem | OperationScheduleItem;

export interface SystemSettings {
  workingHoursPerDay: number; // working hours per day, defaults to 8 (480 mins)
  stdMttr: Record<string, number>; // machine ID prefix or type -> standard MTTR (mins)
  lineNotifyEnabled?: boolean;
  lineNotifyToken?: string;
}

export interface SetupStepLog {
  stepName: 'ตั้งเครื่อง' | 'ร้อยฟิล์ม' | 'ตั้งฟิล์ม' | 'ต่อฟิล์ม' | 'ตั้งเครื่องพิมพ์วันที่' | string;
  duration: number; // in minutes
  completed: boolean;
}

export interface SetupLog {
  id: string;
  machineId: string;
  date: string; // YYYY-MM-DD
  type: 'Setupก่อนผลิต' | 'ปรับเครื่องระหว่างวัน';
  technicians: string[]; // รายชื่อช่างที่ปฏิบัติงาน
  steps: SetupStepLog[];
  totalDuration: number; // sum of step durations
  note?: string;
  deviationReason?: string; // สาเหตุ/เหตุผลความเบี่ยงเบนจากเกณฑ์เวลามาตรฐาน
}

export interface Employee {
  id: string; // รหัสพนักงาน (เช่น ENG-001)
  name: string; // ชื่อ-นามสกุล
  position: string; // ตำแหน่งงาน
  password?: string; // รหัสผ่านเริ่มต้น คือ 1234
}

export type LeaveType = 'ลากิจ' | 'ลาป่วย' | 'ลาพักร้อน' | 'วันหยุดประจำสัปดาห์' | 'ลาอื่น ๆ';

export interface TechnicianLeave {
  id: string;
  technician: string; // ชื่อช่าง
  date: string; // YYYY-MM-DD
  type: LeaveType;
  note?: string; // หมายเหตุเพิ่มเติม
}

export interface SparePart {
  id: string; // รหัสอะไหล่ (SKU), เช่น SP-01
  name: string; // ชื่ออะไหล่
  category: string; // หมวดหมู่ (ระบบเครื่องกล, นิวเมติกส์, ระบบส่งกำลัง, อุปกรณ์ไฟฟ้า, ฯลฯ)
  machineIds: string[]; // เครื่องจักรที่เกี่ยวข้อง (เช่น ["RIM01", "VAC01"])
  quantity: number; // จำนวนคงเหลือในคลัง
  minRequired: number; // จำนวนขั้นต่ำที่ต้องการ (หากน้อยกว่าหรือเท่ากับจะแจ้งเตือนสต็อกใกล้หมด)
  unit: string; // หน่วยนับ (เช่น ชิ้น, ตลับ, ตัว, ม้วน)
  location: string; // สถานที่จัดเก็บ/ตำแหน่งชั้นวาง (เช่น ตู้ A ชั้น 2)
  pricePerUnit: number; // ราคารวมต่อหน่วย (เช่น 450)
  lastRestockedDate?: string; // วันที่อัปเดตสต็อกล่าสุด (YYYY-MM-DD)
  specifications?: string; // ข้อมูลทางเทคนิค/รายละเอียดเพิ่มเติม
}

export type CD5Category = 
  | 'เขียนแบบสั่งทำเอง (Custom Fabrication)'
  | 'ยืดอายุการใช้งาน (Lifetime Extension)'
  | 'เทียบเคียงแบรนด์ทางเลือก (Equivalent Brand)'
  | 'ซ่อมฟื้นฟูสภาพ (Reconditioning)'
  | 'ลดต้นทุนงาน PM/ซ่อม (PM/Repair Cost Down)';

export type CD5Status = 'กำลังทดสอบ' | 'อนุมัติใช้งานจริง' | 'ประเมินผล';

export interface CD5UsageHistoryItem {
  id: string; // e.g. "HIST-01"
  cycleNumber: number; // รอบที่ 1, 2, ...
  partType: 'NEW_CUSTOM' | 'ORIGINAL_OEM'; // ชนิดอะไหล่ (สั่งทำ CD5 vs เดิม OEM)
  installedDate: string; // วันที่เริ่มติดตั้ง/เริ่มใช้งาน (YYYY-MM-DD)
  replacedDate?: string; // วันที่ถอดเปลี่ยน/สิ้นสุดรอบ (YYYY-MM-DD)
  status: 'ACTIVE_RUNNING' | 'COMPLETED_REPLACED'; // กำลังเดินเครื่องใช้งานอยู่ หรือ ถอดเปลี่ยนแล้ว
  actualRunningDays: number; // จำนวนวันใช้งานจริง (คำนวณอัตโนมัติ)
  targetLifespanDays: number; // อายุเป้าหมายของอะไหล่ใหม่ (วัน)
  originalOemDays: number; // อายุเดิมของอะไหล่ OEM (วัน)
  lifespanExtensionPercent: number; // % ยืดอายุเมื่อเทียบกับ OEM
  wearCondition: string; // สภาพการสึกหรอ / ผลการตรวจเช็ค (เช่น "สมบูรณ์ดี 95% ไร้สนิม", "สึกหรอตามเกณฑ์")
  technician: string; // ช่างผู้ติดตั้ง/ตรวจสอบ
  notes?: string; // หมายเหตุเพิ่มเติม
  photoAfterUse?: string; // ภาพถ่ายสภาพอะไหล่จริง
}

export interface CD5Project {
  id: string; // e.g. "CD5-2026-001"
  title: string; // ชื่อโครงการ เช่น "เขียนแบบสั่งทำใบมีดตัดซีลถุงข้าว SUS440C แทนสั่ง OEM"
  category: CD5Category;
  machineId?: string; // รหัสเครื่องจักร เช่น "VAC01"
  partName: string; // ชื่ออะไหล่ เช่น "ใบมีดซีลสุญญากาศ (Sealing Cutter Blade)"
  partCode?: string; // รหัสอะไหล่เดิม/ใหม่ เช่น "BLD-VAC-04"
  proposerTechnician: string; // ช่างผู้เสนอ/รับผิดชอบหลัก
  coTechnicians?: string[]; // ช่างร่วม
  startDate: string; // วันที่เริ่มทดสอบ/โครงการ (YYYY-MM-DD)
  approvedDate?: string; // วันที่อนุมัติใช้งานจริง (YYYY-MM-DD)
  installedDate?: string; // วันที่เริ่มติดตั้ง/เริ่มใช้งานอะไหล่จริงล่าสุด (YYYY-MM-DD)
  status: CD5Status;

  // Comparison: Original OEM
  originalSupplier: string; // เช่น "ผู้ผลิตเครื่องจักรจากญี่ปุ่น (OEM Japan)"
  originalPrice: number; // ราคาเดิมต่อชิ้น (บาท) เช่น 12500
  originalLifespanDays: number; // อายุการใช้งานเดิม (วัน) เช่น 60
  originalLifespanUnit?: string; // เช่น "วัน", "เดือน", "รอบการผลิต"
  originalQualityNotes: string; // คุณภาพเดิม เช่น "นำเข้าจากต่างประเทศ รอของนาน 45 วัน คมแต่สึกหรอเร็วเมื่อเจอความชื้น"
  photoOriginal?: string; // Base64 or Image URL

  // Comparison: New Custom / Cost Down Part
  newSupplierOrFabricator: string; // เช่น "โรงกลึง CNC ในประเทศ (Local Precision Tooling)"
  newPrice: number; // ราคาใหม่ต่อชิ้น (บาท) เช่น 3200
  newLifespanDays: number; // อายุการใช้งานใหม่ (วัน) เช่น 120
  newLifespanUnit?: string; // เช่น "วัน", "เดือน", "รอบการผลิต"
  newQualityNotes: string; // คุณภาพใหม่ เช่น "เปลี่ยนเกรดเป็น SUS440C ชุบแข็ง HRC 58-60 ทนการสึกหรอและไม่เป็นสนิมตามมาตรฐาน GMP"
  photoNew?: string; // Base64 or Image URL
  drawingPhoto?: string; // Base64 or Image URL สำหรับแบบ Drawing / Sketch

  // Financial & Usage Metrics
  annualUsageQty: number; // ปริมาณที่ใช้ต่อปี (ชิ้น) เช่น 24
  annualOriginalCost: number; // ต้นทุนเดิมต่อปี (บาท)
  annualNewCost: number; // ต้นทุนใหม่ต่อปี (บาท)
  annualSavings: number; // ยอดเงินประหยัดรวมต่อปี (บาท)
  savingsPercent: number; // เปอร์เซ็นต์การลดต้นทุน (%)
  lifespanExtensionPercent: number; // เปอร์เซ็นต์การยืดอายุการใช้งาน (%)
  
  // Implementation & Engineering Notes
  engineeringDetails: string; // รายละเอียดการปรับปรุง/เขียนแบบ/สเปก
  foodGradeCompliance: boolean; // มาตรฐานความปลอดภัย Food Grade (GMP/HACCP)
  safetyNotes?: string; // ความปลอดภัยและการตรวจเช็ค
  createdAt: string;

  // Usage & Lifespan Tracking History
  usageHistory?: CD5UsageHistoryItem[];
}



