import { RepairLog, Machine, PlannedProductionTime } from '../types';

export interface MachineKpiResult {
  machineId: string;
  plannedHours: number | null;
  bdHours: number;
  failures: number;
  percentBd: number | null;
  mttr: number | null; // hours
  mtbf: number | null; // hours
  availability: number | null; // %
}

export interface MultiMachineKpiSummary {
  totalMachines: number;
  coveredMachines: number;
  coverageRatio: number; // 0..1
  totalFailures: number;
  totalBdHours: number;
  overallMttr: number | null; // hours

  // Metrics for covered machines with planned production time
  totalPlannedHours: number | null;
  coveredBdHours: number | null;
  coveredFailures: number | null;
  overallPercentBd: number | null;
  overallMtbf: number | null; // hours
  overallAvailability: number | null; // %
}

export const round2 = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const round1 = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 10) / 10;
};

/**
 * Filter repairs for completed items in a specific month YYYY-MM
 */
export function getCompletedMonthRepairs(repairs: RepairLog[], month: string): RepairLog[] {
  return repairs.filter(r => 
    r.status !== 'กำลังซ่อม' && 
    Boolean(r.date) && 
    r.date.startsWith(month)
  );
}

/**
 * Calculate KPI for a single machine in a given month
 */
export function calculateMachineKpi(
  machineId: string,
  month: string,
  repairs: RepairLog[],
  plannedHours: number | null | undefined
): MachineKpiResult {
  const completedRepairs = repairs.filter(r => 
    r.machineId === machineId && 
    r.status !== 'กำลังซ่อม' && 
    Boolean(r.date) && 
    r.date.startsWith(month)
  );

  const failures = completedRepairs.length;
  const bdMins = completedRepairs.reduce((sum, r) => sum + (r.duration || 0), 0);
  const bdHours = round2(bdMins / 60);

  const validPlanned = (plannedHours !== null && plannedHours !== undefined && plannedHours > 0)
    ? plannedHours
    : null;

  let percentBd: number | null = null;
  let mttr: number | null = null;
  let mtbf: number | null = null;
  let availability: number | null = null;

  // MTTR calculation: BD / Failures
  if (failures > 0) {
    mttr = round2((bdMins / 60) / failures);
  } else {
    mttr = null;
  }

  // Planned-dependent calculations
  if (validPlanned !== null) {
    const rawBdHours = bdMins / 60;
    percentBd = round2((rawBdHours / validPlanned) * 100);

    if (failures === 0) {
      mtbf = null;
      availability = 100.0;
    } else {
      const rawMtbf = (validPlanned - rawBdHours) / failures;
      const rawMttr = rawBdHours / failures;
      mtbf = round1(rawMtbf);
      if (rawMtbf + rawMttr > 0) {
        availability = round1((rawMtbf / (rawMtbf + rawMttr)) * 100);
      } else {
        availability = 0.0;
      }
    }
  } else {
    percentBd = null;
    mtbf = null;
    availability = null;
  }

  return {
    machineId,
    plannedHours: validPlanned,
    bdHours,
    failures,
    percentBd,
    mttr,
    mtbf,
    availability
  };
}

/**
 * Calculate Multi-Machine KPI Summary across a list of machines
 */
export function calculateMultiMachineKpi(
  machines: Machine[],
  month: string,
  repairs: RepairLog[],
  plannedTimes: PlannedProductionTime[]
): MultiMachineKpiSummary {
  const totalMachines = machines.length;
  const machineIdsInScope = new Set(machines.map(m => m.id));

  // Map of planned production times for this month
  const plannedMap = new Map<string, number>();
  plannedTimes
    .filter(pt => pt.month === month && machineIdsInScope.has(pt.machineId))
    .forEach(pt => {
      if (pt.plannedHours > 0) {
        plannedMap.set(pt.machineId, pt.plannedHours);
      }
    });

  // Completed repairs for month in scope
  const monthRepairs = repairs.filter(r => 
    r.status !== 'กำลังซ่อม' && 
    Boolean(r.date) && 
    r.date.startsWith(month) &&
    machineIdsInScope.has(r.machineId)
  );

  const totalFailures = monthRepairs.length;
  const totalBdMins = monthRepairs.reduce((sum, r) => sum + (r.duration || 0), 0);
  const totalBdHours = round2(totalBdMins / 60);
  const overallMttr = totalFailures > 0 ? round2((totalBdMins / 60) / totalFailures) : null;

  // Covered machines (planned hours > 0)
  const coveredMachines = machines.filter(m => plannedMap.has(m.id));
  const coveredCount = coveredMachines.length;
  const coverageRatio = totalMachines > 0 ? coveredCount / totalMachines : 0;

  if (coveredCount === 0) {
    return {
      totalMachines,
      coveredMachines: 0,
      coverageRatio: 0,
      totalFailures,
      totalBdHours,
      overallMttr,
      totalPlannedHours: null,
      coveredBdHours: null,
      coveredFailures: null,
      overallPercentBd: null,
      overallMtbf: null,
      overallAvailability: null
    };
  }

  const totalPlannedHours = round2(
    coveredMachines.reduce((sum, m) => sum + (plannedMap.get(m.id) || 0), 0)
  );

  const coveredMachineIds = new Set(coveredMachines.map(m => m.id));
  const coveredRepairs = monthRepairs.filter(r => coveredMachineIds.has(r.machineId));
  const coveredFailures = coveredRepairs.length;
  const coveredBdMins = coveredRepairs.reduce((sum, r) => sum + (r.duration || 0), 0);
  const coveredBdHours = round2(coveredBdMins / 60);

  const overallPercentBd = totalPlannedHours > 0 
    ? round2(((coveredBdMins / 60) / totalPlannedHours) * 100)
    : null;

  let overallMtbf: number | null = null;
  let overallAvailability: number | null = null;

  if (coveredFailures === 0) {
    overallMtbf = null;
    overallAvailability = 100.0;
  } else {
    const rawBdHours = coveredBdMins / 60;
    const rawMtbf = (totalPlannedHours - rawBdHours) / coveredFailures;
    const rawMttr = rawBdHours / coveredFailures;
    overallMtbf = round1(rawMtbf);
    if (rawMtbf + rawMttr > 0) {
      overallAvailability = round1((rawMtbf / (rawMtbf + rawMttr)) * 100);
    } else {
      overallAvailability = 0.0;
    }
  }

  return {
    totalMachines,
    coveredMachines: coveredCount,
    coverageRatio,
    totalFailures,
    totalBdHours,
    overallMttr,
    totalPlannedHours,
    coveredBdHours,
    coveredFailures,
    overallPercentBd,
    overallMtbf,
    overallAvailability
  };
}
