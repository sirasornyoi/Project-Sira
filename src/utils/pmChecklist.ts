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
      actionDetail: ''
    }))
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
