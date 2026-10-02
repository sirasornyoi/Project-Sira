import { PMPlan, PMStep, PMScheduleItem } from '../types';
import { getNowLocalDateTimeString } from './pmAlerts';

/**
 * Checks if a PM plan's checklist has any recorded progress.
 * Returns true if any step has done === true or result is not 'ยังไม่ตรวจ'.
 */
export function planHasProgress(plan?: PMPlan | null): boolean {
  if (!plan || !plan.steps || plan.steps.length === 0) return false;
  return plan.steps.some(step => step.done === true || (step.result && step.result !== 'ยังไม่ตรวจ'));
}

/**
 * Creates an immutable snapshot of a PM plan's checklist results.
 */
export function snapshotChecklist(plan: PMPlan): {
  planTitle: string;
  steps: PMStep[];
  recordedAt: string;
} {
  return {
    planTitle: plan.title,
    steps: (plan.steps || []).map(step => ({ ...step })),
    recordedAt: getNowLocalDateTimeString()
  };
}

/**
 * Resets a plan's checklist fields for a fresh PM round.
 * Sets every step to done: false, result: 'ยังไม่ตรวจ', abnormalDetail: '', actionTaken: undefined, actionDetail: ''.
 * Keeps title, method, standard, frequency, stdTime, remark (and other metadata) unchanged.
 */
export function resetPlanChecklist(plan: PMPlan): PMPlan {
  return {
    ...plan,
    steps: (plan.steps || []).map(step => ({
      ...step,
      done: false,
      result: 'ยังไม่ตรวจ',
      abnormalDetail: '',
      actionTaken: undefined,
      actionDetail: '',
      measuredValue: '',
      linkedRepairId: undefined
    }))
  };
}

/**
 * Returns the latest (max) date string among completed PM schedule items for a plan,
 * or '' if none.
 */
export function latestCompletedDate(planId: string, schedules: any[]): string {
  if (!planId || !Array.isArray(schedules)) return '';
  let maxDate = '';
  for (const s of schedules) {
    if (s && s.type === 'PM' && s.pmPlanId === planId && s.status === 'เสร็จสิ้น' && s.date) {
      if (!maxDate || s.date > maxDate) {
        maxDate = s.date;
      }
    }
  }
  return maxDate;
}

export interface RecordPmRoundParams {
  plan: PMPlan;
  date: string;
  technicians: string[];
  schedules: any[];
  overwrite?: boolean;
  actualDuration?: number;
}

export interface RecordPmRoundResult {
  error?: string;
  conflict?: PMScheduleItem;
  schedules?: any[];
  plan?: PMPlan;
  job?: PMScheduleItem;
}

/**
 * Records a monthly PM round for a plan.
 * Pure function returning updated schedules and reset plan, or conflict/error.
 */
export function recordPmRound({
  plan,
  date,
  technicians,
  schedules,
  overwrite = false,
  actualDuration
}: RecordPmRoundParams): RecordPmRoundResult {
  if (!planHasProgress(plan)) {
    return { error: 'ยังไม่ได้ติ๊กรายการ' };
  }
  if (!technicians || technicians.length === 0) {
    return { error: 'เลือกผู้ทำการ PM' };
  }

  const month = date.slice(0, 7);

  // If monthly plan and that month already has a completed job with checklistResult
  if (plan.frequency === 'รายเดือน') {
    const existingDoneWithChecklist = schedules.find(
      s => s.type === 'PM' && s.pmPlanId === plan.id && s.date && s.date.slice(0, 7) === month && s.status === 'เสร็จสิ้น' && s.checklistResult
    ) as PMScheduleItem | undefined;

    if (existingDoneWithChecklist) {
      if (!overwrite) {
        return { conflict: existingDoneWithChecklist };
      }
      // Overwrite: replace snapshot, date, and technicians of that job
      const updatedJob: PMScheduleItem = {
        ...existingDoneWithChecklist,
        date,
        createdAt: existingDoneWithChecklist.createdAt || existingDoneWithChecklist.checklistResult?.recordedAt || getNowLocalDateTimeString(),
        technician: technicians[0],
        technicians,
        peopleCount: technicians.length,
        checklistResult: snapshotChecklist(plan),
        ...(actualDuration !== undefined && actualDuration > 0 ? { actualDuration } : {})
      };
      const newSchedules = schedules.map(s => s.id === existingDoneWithChecklist.id ? updatedJob : s);
      const updatedPlan: PMPlan = {
        ...resetPlanChecklist(plan),
        lastCheckedDate: latestCompletedDate(plan.id, newSchedules)
      };
      return {
        schedules: newSchedules,
        plan: updatedPlan,
        job: updatedJob
      };
    }
  }

  // Check for pending uncompleted PM job of this plan in that month (from schedule)
  const pendingJob = schedules.find(
    s => s.type === 'PM' && s.pmPlanId === plan.id && s.date && s.date.slice(0, 7) === month && s.status !== 'เสร็จสิ้น'
  ) as PMScheduleItem | undefined;

  if (pendingJob) {
    const jobToComplete: PMScheduleItem = {
      ...pendingJob,
      date,
      createdAt: pendingJob.createdAt || getNowLocalDateTimeString(),
      technician: technicians[0],
      technicians,
      peopleCount: technicians.length,
      ...(actualDuration !== undefined && actualDuration > 0 ? { actualDuration } : {})
    };
    const { job: completedJob, plan: resetPlan } = completePmJob(jobToComplete, plan);
    const newSchedules = schedules.map(s => s.id === pendingJob.id ? completedJob : s);
    const updatedPlan: PMPlan = {
      ...(resetPlan || resetPlanChecklist(plan)),
      lastCheckedDate: latestCompletedDate(plan.id, newSchedules)
    };
    return {
      schedules: newSchedules,
      plan: updatedPlan,
      job: completedJob
    };
  }

  // Otherwise, create a new completed PMScheduleItem
  const newJob: PMScheduleItem = {
    id: `pm-${Date.now()}`,
    type: 'PM',
    status: 'เสร็จสิ้น',
    date,
    createdAt: getNowLocalDateTimeString(),
    machineId: plan.machineId,
    pmPlanId: plan.id,
    technician: technicians[0],
    technicians,
    peopleCount: technicians.length,
    duration: plan.ttm || 0,
    actualDuration: actualDuration !== undefined && actualDuration > 0 ? actualDuration : undefined,
    destination: '',
    checklistResult: snapshotChecklist(plan)
  };

  const newSchedules = [...schedules, newJob];
  const updatedPlan: PMPlan = {
    ...resetPlanChecklist(plan),
    lastCheckedDate: latestCompletedDate(plan.id, newSchedules)
  };

  return {
    schedules: newSchedules,
    plan: updatedPlan,
    job: newJob
  };
}

/**
 * Completes a PM job and snapshots its checklist if in-progress.
 * Returns {
 *   job: { ...job, status: 'เสร็จสิ้น', checklistResult: job.checklistResult ?? (plan && planHasProgress(plan) ? snapshotChecklist(plan) : undefined) },
 *   plan: the plan reset only if a snapshot was taken now, otherwise unchanged
 * }
 */
export function completePmJob(
  job: PMScheduleItem,
  plan?: PMPlan
): { job: PMScheduleItem; plan: PMPlan | undefined } {
  let checklistResult = job.checklistResult;
  let updatedPlan = plan;

  if (!checklistResult && plan && planHasProgress(plan)) {
    checklistResult = snapshotChecklist(plan);
    updatedPlan = resetPlanChecklist(plan);
  }

  return {
    job: {
      ...job,
      status: 'เสร็จสิ้น',
      checklistResult
    },
    plan: updatedPlan
  };
}
