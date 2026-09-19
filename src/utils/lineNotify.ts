import { RepairLog, PMScheduleItem, OperationScheduleItem, SetupLog, Machine, PMPlan } from '../types';

/**
 * Send a notification to LINE via our server-side proxy
 */
export async function sendLineNotification(message: string, token?: string, to?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const activeToken = token || getSavedToken();
    const activeTarget = to || getSavedTargetId();
    const isEnabled = isNotificationEnabled();

    // If explicit token isn't provided, and notifications aren't enabled or token is missing, skip silently
    if (!token && (!isEnabled || !activeToken)) {
      return { success: false, message: "ระบบแจ้งเตือน LINE ไม่ได้เปิดใช้งานหรือไม่มี Token ในระบบ" };
    }

    const response = await fetch("/api/line-notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ message, token: activeToken, to: activeTarget }),
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true };
      } else {
        return { success: false, message: data.message || "เกิดข้อผิดพลาดในการส่งข้อความแจ้งเตือน" };
      }
    } else {
      return { success: false, message: `Server error (${response.status})` };
    }
  } catch (error) {
    console.error("Error sending LINE notification:", error);
    return { success: false, message: (error as Error).message };
  }
}

// Local helper to read from localSettings if stored in localStorage
function getSavedToken(): string {
  try {
    const stored = localStorage.getItem('maint_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.lineNotifyToken || "";
    }
  } catch (e) {
    console.error(e);
  }
  return "";
}

function getSavedTargetId(): string {
  try {
    const stored = localStorage.getItem('maint_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.lineTargetId || "";
    }
  } catch (e) {
    console.error(e);
  }
  return "";
}

function isNotificationEnabled(): boolean {
  try {
    const stored = localStorage.getItem('maint_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return !!parsed.lineNotifyEnabled;
    }
  } catch (e) {
    console.error(e);
  }
  return false;
}

/**
 * Format and send a Repair Opened notification
 */
export async function notifyRepairOpened(repair: RepairLog, machineName: string) {
  const techs = repair.technicians && repair.technicians.length > 0 
    ? repair.technicians.join(', ') 
    : repair.technician;
    
  const message = `
⚠️ [แจ้งเหตุเครื่องจักรเสีย - EMERGENCY]
🛠️ สถานะ: กำลังซ่อม (Repairing)
🔴 เครื่องจักร: ${repair.machineId} (${machineName})
🔴 อาการเสีย: ${repair.symptoms}
👤 ช่างรับงาน: ${techs}
📅 วันที่แจ้ง: ${repair.date}
⏰ เวลาเสียจริง: ${repair.breakdownTime.split('T')[1] || repair.breakdownTime}
  `.trim();

  return sendLineNotification(message);
}

/**
 * Format and send a Repair Closed notification
 */
export async function notifyRepairClosed(repair: RepairLog, machineName: string, stdMttr?: number) {
  const techs = repair.technicians && repair.technicians.length > 0 
    ? repair.technicians.join(', ') 
    : repair.technician;

  const mttrText = stdMttr 
    ? `${repair.duration} นาที (Std.MTTR: ${stdMttr} นาที)` 
    : `${repair.duration} นาที`;

  const performanceEmoji = stdMttr && repair.duration > stdMttr * 1.2 ? "⚠️ ช้ากว่าเกณฑ์" : "✅ ตามเกณฑ์";

  const message = `
✅ [ปิดใบงานซ่อมบำรุงสำเร็จ]
🟢 เครื่องจักร: ${repair.machineId} (${machineName})
🟢 อาการเสีย: ${repair.symptoms}
🟢 มาตรการแก้ไข: ${repair.correctiveAction}
👤 ช่างผู้ปิดงาน: ${techs}
⏱️ เวลาที่ใช้ (MTTR): ${mttrText} ${performanceEmoji}
📅 วันที่ปิดงาน: ${repair.date}
  `.trim();

  return sendLineNotification(message);
}

/**
 * Format and send a PM Dispatched notification
 */
export async function notifyPMDispatched(pm: PMScheduleItem, machineName: string, planTitle: string) {
  const techs = pm.technicians && pm.technicians.length > 0 
    ? pm.technicians.join(', ') 
    : pm.technician;

  const message = `
📅 [ใบสั่งการบำรุงรักษาเชิงป้องกัน (PM)]
📋 แผนงาน: ${planTitle}
⚙️ เครื่องจักร: ${pm.machineId} (${machineName})
👤 ช่างที่รับมอบหมาย: ${techs}
⏱️ เกณฑ์เวลามาตรฐาน: ${pm.duration} นาที
📅 วันที่เริ่มดำเนินการ: ${pm.date}
🎯 สถานะ: ${pm.status}
  `.trim();

  return sendLineNotification(message);
}

/**
 * Format and send a Setup Log notification
 */
export async function notifySetupLogged(setup: SetupLog, machineName: string) {
  const techs = setup.technicians && setup.technicians.length > 0 
    ? setup.technicians.join(', ') 
    : 'ช่างบำรุงรักษา';

  const stepsSummary = setup.steps
    .map(s => `- ${s.stepName}: ${s.duration} นาที (${s.completed ? 'เสร็จ' : 'ไม่เสร็จ'})`)
    .join('\n');

  const message = `
⚙️ [บันทึกประวัติการตั้งเครื่อง (Setup Log)]
🔘 เครื่องจักร: ${setup.machineId} (${machineName})
🔘 ประเภทงาน: ${setup.type}
⏱️ เวลารวมทั้งหมด: ${setup.totalDuration} นาที
👤 รายชื่อทีมช่าง: ${techs}
📊 สรุปแต่ละขั้นตอน:
${stepsSummary}
  `.trim();

  return sendLineNotification(message);
}

/**
 * Build Morning PM Summary Message (returns null if empty list)
 */
export function buildMorningSummaryMessage(pmItemsToday: PMScheduleItem[], machines: Machine[]): string | null {
  if (!pmItemsToday || pmItemsToday.length === 0) return null;
  const machineMap = new Map(machines.map(m => [m.id, m.name]));
  const lines = pmItemsToday.map((pm, idx) => {
    const mName = machineMap.get(pm.machineId) || pm.machineId;
    const techs = pm.technicians && pm.technicians.length > 0 ? pm.technicians.join(', ') : (pm.technician || 'ยังไม่ระบุช่าง');
    return `${idx + 1}. [${pm.machineId}] ${mName} - ${pm.title || 'บำรุงรักษา PM'}\n   👤 ช่าง: ${techs} | ⏱️ ${pm.duration} นาที | 🎯 สถานะ: ${pm.status}`;
  }).join('\n');

  const dateStr = pmItemsToday[0]?.date || new Date().toISOString().split('T')[0];
  return `
🌅 [สรุปแผนงาน PM ประจำวัน - ${dateStr}]
📋 รวมทั้งหมด: ${pmItemsToday.length} รายการ
--------------------------------
${lines}
--------------------------------
💪 ขอให้ทุกคนทำงานด้วยความปลอดภัยและราบรื่นครับ!
  `.trim();
}

/**
 * Send Morning PM Summary via LINE
 */
export async function sendMorningSummary(
  pmItemsToday: PMScheduleItem[], 
  machines: Machine[], 
  token?: string, 
  to?: string
): Promise<{ success: boolean; message?: string }> {
  const message = buildMorningSummaryMessage(pmItemsToday, machines);
  if (!message) {
    return { success: false, message: "ไม่มีงาน PM ที่ต้องปฏิบัติการในวันนี้" };
  }
  return sendLineNotification(message, token, to);
}

