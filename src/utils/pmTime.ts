/**
 * Central helpers for PM planned and actual durations.
 * Ensures consistent calculations, prevents division by zero,
 * and handles unstated durations (duration = 0 / null).
 */

export interface PMTimeSource {
  duration?: number;
  actualDuration?: number;
  status?: string;
}

export interface PMVarianceResult {
  diffMins: number;
  diffPct: number;
}

/**
 * Returns planned minutes if > 0, otherwise null (meaning not specified).
 */
export function getPlannedMinutes(job?: { duration?: number } | null): number | null {
  if (!job || typeof job.duration !== 'number' || job.duration <= 0) {
    return null;
  }
  return job.duration;
}

/**
 * Returns actual minutes if task is completed and actualDuration > 0, otherwise null.
 */
export function getActualMinutes(job?: { status?: string; actualDuration?: number } | null): number | null {
  if (!job) return null;
  if (job.status === 'เสร็จสิ้น' && (job.actualDuration ?? 0) > 0) {
    return job.actualDuration!;
  }
  return null;
}

/**
 * Calculates variance between actual and planned minutes.
 * Returns null if either planned or actual is null, or if planned <= 0.
 * diffMins = actual - planned
 * diffPct = Math.round((diffMins / planned) * 100)
 */
export function getPmVariance(job?: PMTimeSource | null): PMVarianceResult | null {
  const planned = getPlannedMinutes(job);
  const actual = getActualMinutes(job);

  if (planned === null || actual === null || planned <= 0) {
    return null;
  }

  const diffMins = actual - planned;
  const diffPct = Math.round((diffMins / planned) * 100);

  return { diffMins, diffPct };
}

/**
 * Formats PM minutes for display.
 * Returns "{v} นาที" when v is a positive number, or "ไม่ได้ระบุ" when null/0/undefined.
 */
export function formatPmMinutes(v: number | null | undefined): string {
  if (v !== null && v !== undefined && v > 0) {
    return `${v} นาที`;
  }
  return 'ไม่ได้ระบุ';
}
