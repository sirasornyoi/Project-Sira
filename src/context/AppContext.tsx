import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { 
  Machine, PMPlan, PMScheduleItem, OperationScheduleItem, 
  RepairLog, ImprovementProject, SystemSettings, ScheduleItem, Employee,
  TechnicianLeave, SparePart, TimeBreakPartItem, ZoneStructure,
  WhyWhyAnalysis, PlannedProductionTime
} from '../types';
import { 
  PRELOADED_MACHINES, PRELOADED_TECHNICIANS, PRELOADED_PM_PLANS, 
  PRELOADED_REPAIRS, PRELOADED_IMPROVEMENTS, PRELOADED_SCHEDULES,
  PRELOADED_SPARE_PARTS, PRELOADED_TIME_BREAK_PARTS
} from '../data/preloaded';
import { sendMorningSummary } from '../utils/lineNotify';
import { getTodayDateString } from '../utils/pmAlerts';

interface AppContextType {
  machines: Machine[];
  setMachines: React.Dispatch<React.SetStateAction<Machine[]>>;
  technicians: string[];
  setTechnicians: React.Dispatch<React.SetStateAction<string[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  pmPlans: PMPlan[];
  setPmPlans: React.Dispatch<React.SetStateAction<PMPlan[]>>;
  pmMachineIds: string[];
  setPmMachineIds: React.Dispatch<React.SetStateAction<string[]>>;
  schedules: ScheduleItem[];
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
  repairs: RepairLog[];
  setRepairs: React.Dispatch<React.SetStateAction<RepairLog[]>>;
  improvements: ImprovementProject[];
  setImprovements: React.Dispatch<React.SetStateAction<ImprovementProject[]>>;
  leaves: TechnicianLeave[];
  setLeaves: React.Dispatch<React.SetStateAction<TechnicianLeave[]>>;
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  spareParts: SparePart[];
  setSpareParts: React.Dispatch<React.SetStateAction<SparePart[]>>;
  timeBreakParts: TimeBreakPartItem[];
  setTimeBreakParts: React.Dispatch<React.SetStateAction<TimeBreakPartItem[]>>;
  plannedProductionTimes: PlannedProductionTime[];
  setPlannedProductionTimes: React.Dispatch<React.SetStateAction<PlannedProductionTime[]>>;
  zones: ZoneStructure[];
  setZones: React.Dispatch<React.SetStateAction<ZoneStructure[]>>;
  whyWhyDrafts: WhyWhyAnalysis[];
  setWhyWhyDrafts: React.Dispatch<React.SetStateAction<WhyWhyAnalysis[]>>;
  isLoaded: boolean;
  addZone: (zoneName: string) => boolean;
  addRoomToZone: (zoneName: string, roomName: string) => boolean;
  removeZone: (zoneName: string) => void;
  removeRoomFromZone: (zoneName: string, roomName: string) => void;
  renameZone: (oldName: string, newName: string) => void;
  renameRoom: (zoneName: string, oldRoom: string, newRoom: string) => void;
  resetToDefaults: () => void;
  exportData: () => string;
  importData: (jsonStr: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const deduplicateById = <T extends { id?: string | number }>(items: T[]): T[] => {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items.filter(item => {
    if (!item || item.id === undefined || item.id === null) return true;
    const key = String(item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const extractDefaultZones = (machinesList: Machine[]): ZoneStructure[] => {
  const zoneMap = new Map<string, Set<string>>();
  machinesList.forEach(m => {
    const z = (m.locationZone || m.lineGroup || '').trim();
    if (!z) return;
    if (!zoneMap.has(z)) {
      zoneMap.set(z, new Set<string>());
    }
    const r = (m.locationRoom || '').trim();
    if (r) {
      zoneMap.get(z)!.add(r);
    }
  });

  return Array.from(zoneMap.entries())
    .map(([name, roomsSet]) => ({
      id: name,
      name,
      rooms: Array.from(roomsSet).sort((a, b) => a.localeCompare(b, 'th'))
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'th'));
};

export const mergeZonesWithMachines = (baseZones: ZoneStructure[], machinesList: Machine[]): ZoneStructure[] => {
  const zoneMap = new Map<string, ZoneStructure>();
  
  // 1. Existing base zones
  (baseZones || []).forEach(z => {
    if (!z || !z.name) return;
    zoneMap.set(z.name.toLowerCase().trim(), {
      id: z.id || z.name,
      name: z.name.trim(),
      rooms: Array.isArray(z.rooms) ? [...z.rooms] : [],
      description: z.description
    });
  });

  // 2. Add any zones and rooms from machines
  machinesList.forEach(m => {
    const zName = (m.locationZone || '').trim();
    if (!zName) return;
    const key = zName.toLowerCase();
    if (!zoneMap.has(key)) {
      zoneMap.set(key, {
        id: zName,
        name: zName,
        rooms: []
      });
    }
    const rName = (m.locationRoom || '').trim();
    if (rName) {
      const z = zoneMap.get(key)!;
      if (!z.rooms.some(r => r.toLowerCase().trim() === rName.toLowerCase())) {
        z.rooms.push(rName);
        z.rooms.sort((a, b) => a.localeCompare(b, 'th'));
      }
    }
  });

  return Array.from(zoneMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));
};

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed !== undefined && parsed !== null ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pmPlans, setPmPlans] = useState<PMPlan[]>([]);
  const [pmMachineIds, setPmMachineIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('maint_pm_machine_ids');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
      const storedMachines = localStorage.getItem('maint_machines');
      if (storedMachines) {
        const parsed = JSON.parse(storedMachines);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.map((m: any) => m.id);
      }
    } catch {
      // ignore
    }
    return PRELOADED_MACHINES.map(m => m.id);
  });
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [repairs, setRepairs] = useState<RepairLog[]>([]);
  const [improvements, setImprovements] = useState<ImprovementProject[]>([]);
  const [leaves, setLeaves] = useState<TechnicianLeave[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [timeBreakParts, setTimeBreakParts] = useState<TimeBreakPartItem[]>([]);
  const [plannedProductionTimes, setPlannedProductionTimes] = useState<PlannedProductionTime[]>([]);
  const [zones, setZones] = useState<ZoneStructure[]>([]);
  const [whyWhyDrafts, setWhyWhyDrafts] = useState<WhyWhyAnalysis[]>(() => {
    try {
      const stored = localStorage.getItem('tpm_whyWhyDrafts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  
  const [settings, setSettings] = useState<SystemSettings>({
    workingHoursPerDay: 8, // 8 hours * 60 = 480 mins
    lineNotifyEnabled: false,
    lineNotifyToken: '',
    lineTargetId: '',
    lineAutoEvents: {
      breakdown: true,
      morningSummary: true,
      repairClosed: false,
    },
    stdMttr: {
      "RIM": 60,
      "TOC": 45,
      "VAC": 90,
      "FFS": 60,
      "ATS": 60,
      "MTD": 30,
      "XRA": 45,
      "RFD": 45,
      "BAN": 45,
      "BCF": 120,
      "CDU": 120,
      "TLP": 30,
      "INK": 30,
      "STK": 45,
      "OFR": 90,
      "RJT": 30,
      "PAC": 60,
    }
  });

  const lastLocalSaveTimeRef = useRef<number>(0);
  const currentRevRef = useRef<number>(0);
  const inFlightSaveRef = useRef<boolean>(false);
  const rejectedOversizedRef = useRef<Set<string>>(new Set());

  const lastSyncedSnapshotRef = useRef<{
    machines: Machine[];
    technicians: string[];
    employees: Employee[];
    pmPlans: PMPlan[];
    pmMachineIds: string[];
    schedules: ScheduleItem[];
    repairs: RepairLog[];
    improvements: ImprovementProject[];
    leaves: TechnicianLeave[];
    spareParts: SparePart[];
    timeBreakParts: TimeBreakPartItem[];
    plannedProductionTimes: PlannedProductionTime[];
    settings: SystemSettings;
    zones: ZoneStructure[];
    whyWhyDrafts: WhyWhyAnalysis[];
  } | null>(null);

  const ARRAY_ENTITY_KEYS = [
    'machines',
    'employees',
    'pmPlans',
    'schedules',
    'repairs',
    'improvements',
    'leaves',
    'spareParts',
    'timeBreakParts',
    'plannedProductionTimes',
    'whyWhyDrafts'
  ] as const;

  const META_KEYS = [
    'technicians',
    'pmMachineIds',
    'zones',
    'settings'
  ] as const;

  const hasPendingChanges = (curr: any, snapshot: any): boolean => {
    if (!snapshot) return false;
    for (const key of ARRAY_ENTITY_KEYS) {
      const currList: any[] = curr[key] || [];
      const snapList: any[] = snapshot[key] || [];
      const snapMap = new Map<string, any>(snapList.map((item: any) => [String(item.id), item]));
      const currMap = new Map<string, any>(currList.map((item: any) => [String(item.id), item]));

      for (const item of currList) {
        const id = String(item.id);
        const snapItem = snapMap.get(id);
        if (!snapItem || JSON.stringify(item) !== JSON.stringify(snapItem)) {
          const itemKey = `${key}:${item.id}:${JSON.stringify(item).length}`;
          if (!rejectedOversizedRef.current.has(itemKey)) {
            return true;
          }
        }
      }
      for (const snapItem of snapList) {
        const id = String(snapItem.id);
        if (!currMap.has(id)) {
          return true;
        }
      }
    }
    for (const key of META_KEYS) {
      if (JSON.stringify(curr[key]) !== JSON.stringify(snapshot[key])) {
        return true;
      }
    }
    return false;
  };

  const currentStateRef = useRef({
    machines, technicians, employees, pmPlans, pmMachineIds, schedules,
    repairs, improvements, leaves, spareParts, timeBreakParts, plannedProductionTimes, settings, zones, whyWhyDrafts
  });

  // Always keep currentStateRef up-to-date with the latest state values
  useEffect(() => {
    currentStateRef.current = {
      machines, technicians, employees, pmPlans, pmMachineIds, schedules,
      repairs, improvements, leaves, spareParts, timeBreakParts, plannedProductionTimes, settings, zones, whyWhyDrafts
    };
  });

  // Load from Server or fall back to LocalStorage/preloads
  useEffect(() => {
    const initDb = async () => {
      try {
        const response = await fetch("/api/db", {
          headers: {
            "Accept": "application/json"
          }
        });
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
          const serverData = await response.json();
          if (serverData && serverData.machines) {
            // Server has data! Load it, enriching with defaults if missing
            const cleanZone = (z?: string) => z ? z.replace(/^โรงงาน\s*\d*\s*>\s*/i, '').trim() : z;
            const enriched = serverData.machines.map((m: Machine) => {
              const pre = PRELOADED_MACHINES.find(p => p.id === m.id);
              if (!pre) return { ...m, locationZone: cleanZone(m.locationZone) };
              return {
                ...m,
                model: m.model || pre.model,
                powerVoltage: m.powerVoltage || pre.powerVoltage,
                installDate: m.installDate || pre.installDate,
                vendor: m.vendor || pre.vendor,
                locationZone: cleanZone(m.locationZone || pre.locationZone),
                locationRoom: m.locationRoom || pre.locationRoom,
                serialNumber: m.serialNumber || pre.serialNumber,
                notes: m.notes || pre.notes
              };
            });
            const dedupMachines = deduplicateById(enriched);
            setMachines(dedupMachines);
            const activeTechs = Array.from(new Set(serverData.technicians || PRELOADED_TECHNICIANS)) as string[];
            setTechnicians(activeTechs);
            const dedupEmployees = deduplicateById(serverData.employees || []);
            setEmployees(dedupEmployees);
            const dedupPlans = deduplicateById(serverData.pmPlans || PRELOADED_PM_PLANS);
            setPmPlans(dedupPlans);

            let currentPmMachines: string[] = [];
            if (serverData.pmMachineIds && Array.isArray(serverData.pmMachineIds)) {
              currentPmMachines = serverData.pmMachineIds;
              setPmMachineIds(currentPmMachines);
            } else {
              const stored = localStorage.getItem('maint_pm_machine_ids');
              if (stored) {
                try {
                  const parsed = JSON.parse(stored);
                  if (Array.isArray(parsed)) currentPmMachines = parsed;
                  else currentPmMachines = enriched.map(m => m.id);
                } catch {
                  currentPmMachines = enriched.map(m => m.id);
                }
              } else {
                currentPmMachines = enriched.map(m => m.id);
              }
              setPmMachineIds(currentPmMachines);
            }

            const dedupSchedules = deduplicateById(serverData.schedules || PRELOADED_SCHEDULES);
            setSchedules(dedupSchedules);
            const dedupRepairs = deduplicateById(serverData.repairs || PRELOADED_REPAIRS);
            setRepairs(dedupRepairs);
            const dedupImprovements = deduplicateById(serverData.improvements || PRELOADED_IMPROVEMENTS);
            setImprovements(dedupImprovements);
            const dedupSpareParts = deduplicateById(serverData.spareParts || PRELOADED_SPARE_PARTS);
            setSpareParts(dedupSpareParts);
            const dedupLeaves = deduplicateById(serverData.leaves || []);
            setLeaves(dedupLeaves);
            const dedupTimeBreak = deduplicateById(serverData.timeBreakParts || PRELOADED_TIME_BREAK_PARTS);
            setTimeBreakParts(dedupTimeBreak);
            const dedupProdTimes = deduplicateById(serverData.plannedProductionTimes || []);
            setPlannedProductionTimes(dedupProdTimes);

            let resolvedZones: ZoneStructure[] = [];
            if (serverData.zones && Array.isArray(serverData.zones)) {
              resolvedZones = mergeZonesWithMachines(serverData.zones, enriched);
            } else {
              resolvedZones = extractDefaultZones(enriched);
            }
            setZones(resolvedZones);

            const dedupWhyWhy = deduplicateById(serverData.whyWhyDrafts || []);
            if (serverData.whyWhyDrafts && Array.isArray(serverData.whyWhyDrafts)) {
              setWhyWhyDrafts(dedupWhyWhy);
            }

            const resolvedSettings = serverData.settings || settings;
            if (serverData.settings) {
              setSettings(resolvedSettings);
            }

            // Snapshot initialization for server data
            currentRevRef.current = typeof serverData.revision === 'number' ? serverData.revision : 1;
            lastSyncedSnapshotRef.current = {
              machines: dedupMachines,
              technicians: activeTechs,
              employees: dedupEmployees,
              pmPlans: dedupPlans,
              pmMachineIds: currentPmMachines,
              schedules: dedupSchedules,
              repairs: dedupRepairs,
              improvements: dedupImprovements,
              leaves: dedupLeaves,
              spareParts: dedupSpareParts,
              timeBreakParts: dedupTimeBreak,
              plannedProductionTimes: dedupProdTimes,
              settings: resolvedSettings,
              zones: resolvedZones,
              whyWhyDrafts: dedupWhyWhy
            };

            setIsLoaded(true);
            return;
          }
        }
      } catch (err) {
        console.warn("Notice: Server database unavailable during initialization, using local cache / defaults:", err);
      }

      // Fallback: load from LocalStorage or preloads
      try {
        const storedMachines = localStorage.getItem('maint_machines');
        const storedTechs = localStorage.getItem('maint_technicians');
        const storedPlans = localStorage.getItem('maint_pm_plans');
        const storedPmMachines = localStorage.getItem('maint_pm_machine_ids');
        const storedSchedules = localStorage.getItem('maint_schedule');
        const storedRepairs = localStorage.getItem('maint_repairs');
        const storedImprovements = localStorage.getItem('maint_improvements');
        const storedSettings = localStorage.getItem('maint_settings');
        const storedEmployees = localStorage.getItem('maint_employees');
        const storedSpareParts = localStorage.getItem('maint_spare_parts');
        const storedLeaves = localStorage.getItem('maint_leaves');
        const storedTimeBreakParts = localStorage.getItem('maint_time_break_parts');
        const storedPlannedProdTimes = localStorage.getItem('maint_planned_production_times');
        const storedZones = localStorage.getItem('maint_zones');

        let currentLoadedMachines: Machine[] = PRELOADED_MACHINES;

        if (storedMachines) {
          try {
            const parsed = JSON.parse(storedMachines);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const cleanZone = (z?: string) => z ? z.replace(/^โรงงาน\s*\d*\s*>\s*/i, '').trim() : z;
              currentLoadedMachines = parsed.map((m: Machine) => {
                const pre = PRELOADED_MACHINES.find(p => p.id === m.id);
                if (!pre) return { ...m, locationZone: cleanZone(m.locationZone) };
                return {
                  ...m,
                  model: m.model || pre.model,
                  powerVoltage: m.powerVoltage || pre.powerVoltage,
                  installDate: m.installDate || pre.installDate,
                  vendor: m.vendor || pre.vendor,
                  locationZone: cleanZone(m.locationZone || pre.locationZone),
                  locationRoom: m.locationRoom || pre.locationRoom,
                  serialNumber: m.serialNumber || pre.serialNumber,
                  notes: m.notes || pre.notes
                };
              });
            }
          } catch {
            currentLoadedMachines = PRELOADED_MACHINES;
          }
        }
        setMachines(currentLoadedMachines);

        setTechnicians(safeJsonParse(storedTechs, PRELOADED_TECHNICIANS));

        const defaultEmployees = PRELOADED_TECHNICIANS.map((tech, idx) => ({
          id: `ENG-${String(idx + 1).padStart(3, '0')}`,
          name: tech,
          position: 'ช่างบำรุงรักษา',
          password: '1234'
        }));
        setEmployees(safeJsonParse(storedEmployees, defaultEmployees));

        setPmPlans(deduplicateById(safeJsonParse(storedPlans, PRELOADED_PM_PLANS)));

        let finalPmMachines: string[] = [];
        if (storedPmMachines) {
          try {
            const parsed = JSON.parse(storedPmMachines);
            if (Array.isArray(parsed)) finalPmMachines = parsed;
            else finalPmMachines = currentLoadedMachines.map(m => m.id);
          } catch {
            finalPmMachines = currentLoadedMachines.map(m => m.id);
          }
        } else {
          finalPmMachines = currentLoadedMachines.map(m => m.id);
        }
        setPmMachineIds(finalPmMachines);

        const finalSchedules = deduplicateById(safeJsonParse(storedSchedules, PRELOADED_SCHEDULES));
        setSchedules(finalSchedules);
        const finalRepairs = deduplicateById(safeJsonParse(storedRepairs, PRELOADED_REPAIRS));
        setRepairs(finalRepairs);
        const finalImprovements = deduplicateById(safeJsonParse(storedImprovements, PRELOADED_IMPROVEMENTS));
        setImprovements(finalImprovements);
        const finalSpareParts = deduplicateById(safeJsonParse(storedSpareParts, PRELOADED_SPARE_PARTS));
        setSpareParts(finalSpareParts);
        const finalTimeBreak = deduplicateById(safeJsonParse(storedTimeBreakParts, PRELOADED_TIME_BREAK_PARTS));
        setTimeBreakParts(finalTimeBreak);
        const finalProdTimes = deduplicateById(safeJsonParse(storedPlannedProdTimes, []));
        setPlannedProductionTimes(finalProdTimes);

        const preloadingLeaves = [
          { id: 'lv-001', technician: 'ช่าง 1', date: '2026-06-08', type: 'ลากิจ' as const, note: 'ติดต่อราชการครอบครัว' },
          { id: 'lv-002', technician: 'ช่าง 2', date: '2026-06-11', type: 'ลาป่วย' as const, note: 'ปวดศีรษะ เป็นไข้หวัด' },
          { id: 'lv-003', technician: 'ช่าง 3', date: '2026-06-12', type: 'ลาพักร้อน' as const, note: 'พักผ่อนประจำปีต่างจังหวัด (ภูเก็ต)' },
          { id: 'lv-004', technician: 'ช่าง 4', date: '2026-06-14', type: 'วันหยุดประจำสัปดาห์' as const, note: 'สลับวันหยุดประจำโรงงาน' },
        ];
        const finalLeaves = deduplicateById(safeJsonParse(storedLeaves, preloadingLeaves));
        setLeaves(finalLeaves);

        let finalSettings = settings;
        if (storedSettings) {
          try {
            finalSettings = JSON.parse(storedSettings);
            setSettings(finalSettings);
          } catch {}
        }

        let finalDrafts: WhyWhyAnalysis[] = [];
        const storedDrafts = localStorage.getItem('tpm_whyWhyDrafts');
        if (storedDrafts) {
          try {
            const parsedDrafts = JSON.parse(storedDrafts);
            if (Array.isArray(parsedDrafts)) {
              finalDrafts = parsedDrafts;
              setWhyWhyDrafts(finalDrafts);
            }
          } catch {}
        }

        let finalZones: ZoneStructure[] = [];
        if (storedZones) {
          try {
            const parsedZones = JSON.parse(storedZones);
            finalZones = Array.isArray(parsedZones) ? parsedZones : extractDefaultZones(currentLoadedMachines);
          } catch {
            finalZones = extractDefaultZones(currentLoadedMachines);
          }
        } else {
          finalZones = extractDefaultZones(currentLoadedMachines);
        }
        setZones(finalZones);

        currentRevRef.current = 0;
        lastSyncedSnapshotRef.current = {
          machines: currentLoadedMachines,
          technicians: safeJsonParse(storedTechs, PRELOADED_TECHNICIANS),
          employees: defaultEmployees,
          pmPlans: deduplicateById(safeJsonParse(storedPlans, PRELOADED_PM_PLANS)),
          pmMachineIds: finalPmMachines,
          schedules: finalSchedules,
          repairs: finalRepairs,
          improvements: finalImprovements,
          leaves: finalLeaves,
          spareParts: finalSpareParts,
          timeBreakParts: finalTimeBreak,
          plannedProductionTimes: finalProdTimes,
          settings: finalSettings,
          zones: finalZones,
          whyWhyDrafts: finalDrafts
        };

        setIsLoaded(true);
      } catch (e) {
        console.error("Error reading localStorage values. Resetting to defaults.", e);
        setIsLoaded(true);
      }
    };

    initDb();
  }, []);

  // Morning PM Summary auto-push via LINE Messaging API
  useEffect(() => {
    if (!isLoaded) return;

    const checkAndSendMorningSummary = async () => {
      try {
        const isEnabled = !!settings.lineNotifyEnabled;
        const autoMorning = settings.lineAutoEvents?.morningSummary !== false; // default true
        if (!isEnabled || !autoMorning) return;

        const today = getTodayDateString();
        if (settings.lastMorningSummaryDate === today) return;

        // Double check localStorage in case state was initialized before update
        try {
          const stored = localStorage.getItem('maint_settings');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.lastMorningSummaryDate === today) return;
          }
        } catch {}

        // Filter PM schedules for today that are not completed
        const todayPMs = schedules.filter(
          s => s.type === 'PM' && s.date === today && s.status !== 'เสร็จสิ้น'
        ) as PMScheduleItem[];

        if (todayPMs.length === 0) return;

        const res = await sendMorningSummary(
          todayPMs,
          machines,
          settings.lineNotifyToken,
          settings.lineTargetId
        );

        if (res && res.success) {
          setSettings(prev => ({
            ...prev,
            lastMorningSummaryDate: today
          }));
        }
      } catch (err) {
        console.warn("Silent morning summary LINE push error:", err);
      }
    };

    checkAndSendMorningSummary();
  }, [isLoaded]);

  // Save changes to LocalStorage and Server only AFTER initial load is done
  useEffect(() => {
    if (!isLoaded) return;

    lastLocalSaveTimeRef.current = Date.now();

    // Save to localStorage as offline backup safely
    try {
      localStorage.setItem('maint_machines', JSON.stringify(machines));
      localStorage.setItem('maint_technicians', JSON.stringify(technicians));
      localStorage.setItem('maint_employees', JSON.stringify(employees));
      localStorage.setItem('maint_pm_plans', JSON.stringify(pmPlans));
      localStorage.setItem('maint_schedule', JSON.stringify(schedules));
      localStorage.setItem('maint_repairs', JSON.stringify(repairs));
      localStorage.setItem('maint_improvements', JSON.stringify(improvements));
      localStorage.setItem('maint_leaves', JSON.stringify(leaves));
      localStorage.setItem('maint_spare_parts', JSON.stringify(spareParts));
      localStorage.setItem('maint_time_break_parts', JSON.stringify(timeBreakParts));
      localStorage.setItem('maint_planned_production_times', JSON.stringify(plannedProductionTimes));
      localStorage.setItem('maint_settings', JSON.stringify(settings));
      localStorage.setItem('maint_zones', JSON.stringify(zones));
      localStorage.setItem('maint_pm_machine_ids', JSON.stringify(pmMachineIds));
      localStorage.setItem('tpm_whyWhyDrafts', JSON.stringify(whyWhyDrafts));
    } catch (e) {
      console.warn("LocalStorage quota warning:", e);
    }
  }, [
    machines, technicians, employees, pmPlans, pmMachineIds, schedules,
    repairs, improvements, leaves, spareParts, timeBreakParts, plannedProductionTimes, settings, zones, whyWhyDrafts, isLoaded
  ]);

  const saveToServer = useCallback(async () => {
    if (inFlightSaveRef.current) return;
    const curr = currentStateRef.current;
    const snapshot = lastSyncedSnapshotRef.current;
    if (!snapshot) return;

    const changes: Record<string, { upsert: any[]; delete: string[] }> = {};
    let hasChanges = false;

    for (const key of ARRAY_ENTITY_KEYS) {
      const currList: any[] = curr[key] || [];
      const snapList: any[] = snapshot[key] || [];

      const snapMap = new Map<string, any>(snapList.map((item: any) => [String(item.id), item]));
      const currMap = new Map<string, any>(currList.map((item: any) => [String(item.id), item]));

      const upsert: any[] = [];
      const toDelete: string[] = [];

      for (const item of currList) {
        const id = String(item.id);
        const snapItem = snapMap.get(id);
        if (!snapItem || JSON.stringify(item) !== JSON.stringify(snapItem)) {
          const itemKey = `${key}:${item.id}:${JSON.stringify(item).length}`;
          if (!rejectedOversizedRef.current.has(itemKey)) {
            upsert.push(item);
          }
        }
      }

      for (const snapItem of snapList) {
        const id = String(snapItem.id);
        if (!currMap.has(id)) {
          toDelete.push(id);
        }
      }

      if (upsert.length > 0 || toDelete.length > 0) {
        changes[key] = { upsert, delete: toDelete };
        hasChanges = true;
      }
    }

    const metaChanges: Record<string, any> = {};
    let hasMetaChanges = false;

    for (const key of META_KEYS) {
      const currVal = curr[key];
      const snapVal = snapshot[key];
      if (JSON.stringify(currVal) !== JSON.stringify(snapVal)) {
        metaChanges[key] = currVal;
        hasMetaChanges = true;
      }
    }

    if (!hasChanges && !hasMetaChanges) {
      // Diff is empty, skip POST!
      return;
    }

    inFlightSaveRef.current = true;
    try {
      lastLocalSaveTimeRef.current = Date.now();
      const payload: any = { changes };
      if (hasMetaChanges) {
        payload.meta = metaChanges;
      }

      const response = await fetch("/api/db/changes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const resData = await response.json();
        const rejectedList: Array<{ collection: string; id: string; reason: string }> = resData.rejected || [];

        let hasNewOversized = false;
        for (const r of rejectedList) {
          const rec = (curr[r.collection as typeof ARRAY_ENTITY_KEYS[number]] as any[])?.find((item: any) => String(item.id) === String(r.id));
          const hash = rec ? JSON.stringify(rec).length : 0;
          const key = `${r.collection}:${r.id}:${hash}`;
          if (!rejectedOversizedRef.current.has(key)) {
            rejectedOversizedRef.current.add(key);
            hasNewOversized = true;
          }
        }
        if (hasNewOversized) {
          alert("บันทึกไม่สำเร็จ: ข้อมูลรายการนี้ใหญ่เกินไป (รูป/ไฟล์แนบ) กรุณาลดขนาดไฟล์");
        }

        const rejectedIdSet = new Set(rejectedList.map(r => `${r.collection}:${r.id}`));

        // Update snapshot with saved data
        if (lastSyncedSnapshotRef.current) {
          for (const key of ARRAY_ENTITY_KEYS) {
            const change = changes[key];
            if (change) {
              const successfulUpserts = change.upsert.filter(u => !rejectedIdSet.has(`${key}:${u.id}`));
              const deletedIds = new Set(change.delete);

              let updatedSnapList = (lastSyncedSnapshotRef.current[key] || []).filter(
                (item: any) => !deletedIds.has(String(item.id)) && !successfulUpserts.some(u => String(u.id) === String(item.id))
              );
              updatedSnapList = updatedSnapList.concat(successfulUpserts);
              lastSyncedSnapshotRef.current[key] = updatedSnapList;
            }
          }

          for (const key of META_KEYS) {
            if (metaChanges[key] !== undefined) {
              (lastSyncedSnapshotRef.current as any)[key] = JSON.parse(JSON.stringify(metaChanges[key]));
            }
          }
        }

        if (typeof resData.revision === "number") {
          currentRevRef.current = resData.revision;
        }
      } else {
        console.warn("Notice: POST /api/db/changes failed with status", response.status);
      }
    } catch (error) {
      console.warn("Notice: Sync with server paused (server unreachable):", error);
    } finally {
      inFlightSaveRef.current = false;
    }
  }, []);

  // Save changes to Server only AFTER initial load is done (debounced)
  useEffect(() => {
    if (!isLoaded) return;

    const timerId = setTimeout(() => {
      saveToServer();
    }, 500);

    return () => clearTimeout(timerId);
  }, [
    machines, technicians, employees, pmPlans, pmMachineIds, schedules,
    repairs, improvements, leaves, spareParts, timeBreakParts, plannedProductionTimes, settings, zones, whyWhyDrafts, isLoaded, saveToServer
  ]);

  // Polling for updates from other clients
  useEffect(() => {
    if (!isLoaded) return;

    let isPolling = false;

    const intervalId = setInterval(async () => {
      if (isPolling) return;
      isPolling = true;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const rev = currentRevRef.current;
        const response = await fetch(`/api/db?rev=${rev}`, {
          headers: {
            "Accept": "application/json"
          },
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));

        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
          const serverData = await response.json();

          // If server reports unchanged, skip updating local data from server
          if (!serverData.unchanged && serverData.machines) {
            const curr = currentStateRef.current;
            const snapshot = lastSyncedSnapshotRef.current;

            if (typeof serverData.revision === 'number') {
              currentRevRef.current = serverData.revision;
            }

            const arraySetters: Record<typeof ARRAY_ENTITY_KEYS[number], (val: any) => void> = {
              machines: setMachines,
              employees: setEmployees,
              pmPlans: setPmPlans,
              schedules: setSchedules,
              repairs: setRepairs,
              improvements: setImprovements,
              leaves: setLeaves,
              spareParts: setSpareParts,
              timeBreakParts: setTimeBreakParts,
              plannedProductionTimes: setPlannedProductionTimes,
              whyWhyDrafts: setWhyWhyDrafts,
            };

            for (const key of ARRAY_ENTITY_KEYS) {
              const serverList: any[] = serverData[key] || [];
              const currList: any[] = curr[key] || [];
              const snapList: any[] = snapshot ? ((snapshot as any)[key] || []) : [];

              const snapMap = new Map<string, any>(snapList.map((item: any) => [String(item.id), item]));
              const currMap = new Map<string, any>(currList.map((item: any) => [String(item.id), item]));

              // Compute pending local changes (diff of curr vs snap)
              const pendingUpserts = new Map<string, any>();
              for (const item of currList) {
                const id = String(item.id);
                const snapItem = snapMap.get(id);
                if (!snapItem || JSON.stringify(item) !== JSON.stringify(snapItem)) {
                  pendingUpserts.set(id, item);
                }
              }

              const pendingDeletes = new Set<string>();
              for (const snapItem of snapList) {
                const id = String(snapItem.id);
                if (!currMap.has(id)) {
                  pendingDeletes.add(id);
                }
              }

              // Apply server data minus pending deletes, plus pending upserts
              let merged = serverList.filter((item: any) => !pendingDeletes.has(String(item.id)));
              const mergedMap = new Map<string, any>(merged.map((item: any) => [String(item.id), item]));
              for (const [id, item] of pendingUpserts) {
                mergedMap.set(id, item);
              }
              const nextStateList = Array.from(mergedMap.values());

              if (lastSyncedSnapshotRef.current) {
                (lastSyncedSnapshotRef.current as any)[key] = [...serverList];
              }

              if (JSON.stringify(currList) !== JSON.stringify(nextStateList)) {
                arraySetters[key](nextStateList);
              }
            }

            const metaSetters: Record<typeof META_KEYS[number], (val: any) => void> = {
              technicians: setTechnicians,
              pmMachineIds: setPmMachineIds,
              zones: setZones,
              settings: setSettings,
            };

            for (const key of META_KEYS) {
              if (serverData[key] !== undefined) {
                const currVal = curr[key];
                const snapVal = snapshot ? (snapshot as any)[key] : undefined;

                const hasPendingEdit = snapshot && JSON.stringify(currVal) !== JSON.stringify(snapVal);

                if (lastSyncedSnapshotRef.current) {
                  (lastSyncedSnapshotRef.current as any)[key] = JSON.parse(JSON.stringify(serverData[key]));
                }

                if (!hasPendingEdit) {
                  if (JSON.stringify(currVal) !== JSON.stringify(serverData[key])) {
                    metaSetters[key](serverData[key]);
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("LAN Polling sync notice:", (err as Error)?.message || err);
      } finally {
        isPolling = false;
        // At the end of every polling tick (including 'unchanged' responses), if no save is in flight and diff is not empty, retry saveToServer
        if (!inFlightSaveRef.current && hasPendingChanges(currentStateRef.current, lastSyncedSnapshotRef.current)) {
          saveToServer();
        }
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [isLoaded, saveToServer]);

  const addZone = (zoneName: string): boolean => {
    const trimmed = zoneName.trim();
    if (!trimmed) return false;
    let added = false;
    setZones(prev => {
      if (prev.some(z => z.name.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      added = true;
      return [...prev, { id: trimmed, name: trimmed, rooms: [] }].sort((a, b) => a.name.localeCompare(b.name, 'th'));
    });
    return added;
  };

  const addRoomToZone = (zoneName: string, roomName: string): boolean => {
    const trimmedZ = zoneName.trim();
    const trimmedR = roomName.trim();
    if (!trimmedZ || !trimmedR) return false;
    let added = false;
    setZones(prev => {
      const existing = prev.find(z => z.name.toLowerCase() === trimmedZ.toLowerCase());
      if (existing) {
        if (existing.rooms.some(r => r.toLowerCase() === trimmedR.toLowerCase())) {
          return prev;
        }
        added = true;
        return prev.map(z => {
          if (z.name.toLowerCase() === trimmedZ.toLowerCase()) {
            return {
              ...z,
              rooms: [...z.rooms, trimmedR].sort((a, b) => a.localeCompare(b, 'th'))
            };
          }
          return z;
        });
      } else {
        added = true;
        return [...prev, { id: trimmedZ, name: trimmedZ, rooms: [trimmedR] }].sort((a, b) => a.name.localeCompare(b.name, 'th'));
      }
    });
    return added;
  };

  const removeZone = (zoneName: string) => {
    const trimmed = zoneName.trim().toLowerCase();
    setZones(prev => prev.filter(z => z.name.trim().toLowerCase() !== trimmed));
    // Clear zone and room from any machines that had this zone assigned
    setMachines(prev => prev.map(m => {
      const mZone = (m.locationZone || '').trim().toLowerCase();
      if (mZone === trimmed) {
        return {
          ...m,
          locationZone: undefined,
          locationRoom: undefined
        };
      }
      return m;
    }));
  };

  const removeRoomFromZone = (zoneName: string, roomName: string) => {
    const trimmedZ = zoneName.trim().toLowerCase();
    const trimmedR = roomName.trim().toLowerCase();
    setZones(prev => prev.map(z => {
      if (z.name.trim().toLowerCase() === trimmedZ) {
        return {
          ...z,
          rooms: z.rooms.filter(r => r.trim().toLowerCase() !== trimmedR)
        };
      }
      return z;
    }));
    // Clear room from any machines in this zone that had this room assigned
    setMachines(prev => prev.map(m => {
      const mZone = (m.locationZone || '').trim().toLowerCase();
      const mRoom = (m.locationRoom || '').trim().toLowerCase();
      if (mZone === trimmedZ && mRoom === trimmedR) {
        return {
          ...m,
          locationRoom: undefined
        };
      }
      return m;
    }));
  };

  const renameZone = (oldName: string, newName: string) => {
    const trimmedNew = newName.trim();
    const trimmedOld = oldName.trim();
    if (!trimmedNew || trimmedOld.toLowerCase() === trimmedNew.toLowerCase()) return;
    setZones(prev => prev.map(z => {
      if (z.name.trim().toLowerCase() === trimmedOld.toLowerCase()) {
        return { ...z, name: trimmedNew, id: trimmedNew };
      }
      return z;
    }));
    // Update machines in that zone
    setMachines(prev => prev.map(m => {
      if ((m.locationZone || '').trim().toLowerCase() === trimmedOld.toLowerCase()) {
        return { ...m, locationZone: trimmedNew };
      }
      return m;
    }));
  };

  const renameRoom = (zoneName: string, oldRoom: string, newRoom: string) => {
    const trimmedZ = zoneName.trim().toLowerCase();
    const trimmedOld = oldRoom.trim().toLowerCase();
    const trimmedNew = newRoom.trim();
    if (!trimmedNew || trimmedOld === trimmedNew.toLowerCase()) return;
    setZones(prev => prev.map(z => {
      if (z.name.trim().toLowerCase() === trimmedZ) {
        return {
          ...z,
          rooms: z.rooms.map(r => r.trim().toLowerCase() === trimmedOld ? trimmedNew : r)
        };
      }
      return z;
    }));
    // Update machines in that zone & room
    setMachines(prev => prev.map(m => {
      const mZone = (m.locationZone || m.lineGroup || '').trim().toLowerCase();
      if (mZone === trimmedZ && (m.locationRoom || '').trim().toLowerCase() === trimmedOld) {
        return { ...m, locationRoom: trimmedNew };
      }
      return m;
    }));
  };

  const resetToDefaults = () => {
    setMachines(PRELOADED_MACHINES);
    setTechnicians(PRELOADED_TECHNICIANS);
    const defaultEmployees = PRELOADED_TECHNICIANS.map((tech, idx) => ({
      id: `ENG-${String(idx + 1).padStart(3, '0')}`,
      name: tech,
      position: 'ช่างบำรุงรักษา',
      password: '1234'
    }));
    setEmployees(defaultEmployees);
    setPmPlans(PRELOADED_PM_PLANS);
    setSchedules(PRELOADED_SCHEDULES);
    setRepairs(PRELOADED_REPAIRS);
    setImprovements(PRELOADED_IMPROVEMENTS);
    setTimeBreakParts(PRELOADED_TIME_BREAK_PARTS);
    const defZones = extractDefaultZones(PRELOADED_MACHINES);
    setZones(defZones);
    const preloadingLeaves = [
      { id: 'lv-001', technician: 'ช่าง 1', date: '2026-06-08', type: 'ลากิจ' as const, note: 'ติดต่อราชการครอบครัว' },
      { id: 'lv-002', technician: 'ช่าง 2', date: '2026-06-11', type: 'ลาป่วย' as const, note: 'ปวดศีรษะ เป็นไข้หวัด' },
      { id: 'lv-003', technician: 'ช่าง 3', date: '2026-06-12', type: 'ลาพักร้อน' as const, note: 'พักผ่อนประจำปีต่างจังหวัด (ภูเก็ต)' },
      { id: 'lv-004', technician: 'ช่าง 4', date: '2026-06-14', type: 'วันหยุดประจำสัปดาห์' as const, note: 'สลับวันหยุดประจำโรงงาน' },
    ];
    setLeaves(preloadingLeaves);
    setSettings({
      workingHoursPerDay: 8,
      lineNotifyEnabled: false,
      lineNotifyToken: '',
      lineTargetId: '',
      lineAutoEvents: {
        breakdown: true,
        morningSummary: true,
        repairClosed: false,
      },
      stdMttr: {
        "RIM": 60,
        "TOC": 45,
        "VAC": 90,
        "FFS": 60,
        "ATS": 60,
        "MTD": 30,
        "XRA": 45,
        "RFD": 45,
        "BAN": 45,
        "BCF": 120,
        "CDU": 120,
        "TLP": 30,
        "INK": 30,
        "STK": 45,
        "OFR": 90,
        "RJT": 30,
        "PAC": 60,
      }
    });

    localStorage.setItem('maint_machines', JSON.stringify(PRELOADED_MACHINES));
    localStorage.setItem('maint_technicians', JSON.stringify(PRELOADED_TECHNICIANS));
    localStorage.setItem('maint_employees', JSON.stringify(defaultEmployees));
    localStorage.setItem('maint_pm_plans', JSON.stringify(PRELOADED_PM_PLANS));
    localStorage.setItem('maint_schedule', JSON.stringify(PRELOADED_SCHEDULES));
    localStorage.setItem('maint_repairs', JSON.stringify(PRELOADED_REPAIRS));
    localStorage.setItem('maint_improvements', JSON.stringify(PRELOADED_IMPROVEMENTS));
    localStorage.setItem('maint_leaves', JSON.stringify(preloadingLeaves));
    setSpareParts(PRELOADED_SPARE_PARTS);
    localStorage.setItem('maint_spare_parts', JSON.stringify(PRELOADED_SPARE_PARTS));
    localStorage.setItem('maint_time_break_parts', JSON.stringify(PRELOADED_TIME_BREAK_PARTS));
    setPlannedProductionTimes([]);
    localStorage.removeItem('maint_planned_production_times');
    localStorage.setItem('maint_zones', JSON.stringify(defZones));
    setWhyWhyDrafts([]);
    localStorage.removeItem('tpm_whyWhyDrafts');
    localStorage.removeItem('maint_pm_machine_ids');
    setPmMachineIds(PRELOADED_MACHINES.map(m => m.id));
    localStorage.removeItem('maint_settings');
  };

  const exportData = () => {
    const dataObj = {
      machines,
      technicians,
      employees,
      pmPlans,
      pmMachineIds,
      schedules,
      repairs,
      improvements,
      leaves,
      spareParts,
      timeBreakParts,
      plannedProductionTimes,
      settings,
      zones,
      whyWhyDrafts
    };
    return JSON.stringify(dataObj, null, 2);
  };

  const importData = (jsonStr: string) => {
    try {
      const dataObj = JSON.parse(jsonStr);
      if (dataObj.machines) setMachines(dataObj.machines);
      if (dataObj.technicians) setTechnicians(dataObj.technicians);
      if (dataObj.employees) setEmployees(dataObj.employees);
      if (dataObj.pmPlans) setPmPlans(dataObj.pmPlans);
      if (dataObj.pmMachineIds && Array.isArray(dataObj.pmMachineIds)) setPmMachineIds(dataObj.pmMachineIds);
      if (dataObj.schedules) setSchedules(dataObj.schedules);
      if (dataObj.repairs) setRepairs(dataObj.repairs);
      if (dataObj.improvements) setImprovements(dataObj.improvements);
      if (dataObj.leaves) setLeaves(dataObj.leaves);
      if (dataObj.spareParts) setSpareParts(dataObj.spareParts);
      if (dataObj.timeBreakParts) setTimeBreakParts(dataObj.timeBreakParts);
      if (dataObj.plannedProductionTimes && Array.isArray(dataObj.plannedProductionTimes)) {
        setPlannedProductionTimes(dataObj.plannedProductionTimes);
      }
      if (dataObj.settings) setSettings(dataObj.settings);
      if (dataObj.zones) setZones(dataObj.zones);
      if (dataObj.whyWhyDrafts && Array.isArray(dataObj.whyWhyDrafts)) setWhyWhyDrafts(dataObj.whyWhyDrafts);
      
      return true;
    } catch (e) {
      console.error("Invalid database JSON import.", e);
      return false;
    }
  };

  return (
    <AppContext.Provider value={{
      machines, setMachines,
      technicians, setTechnicians,
      employees, setEmployees,
      pmPlans, setPmPlans,
      pmMachineIds, setPmMachineIds,
      schedules, setSchedules,
      repairs, setRepairs,
      improvements, setImprovements,
      leaves, setLeaves,
      settings, setSettings,
      spareParts, setSpareParts,
      timeBreakParts, setTimeBreakParts,
      plannedProductionTimes, setPlannedProductionTimes,
      zones, setZones,
      whyWhyDrafts, setWhyWhyDrafts,
      isLoaded,
      addZone, addRoomToZone,
      removeZone, removeRoomFromZone,
      renameZone, renameRoom,
      resetToDefaults,
      exportData,
      importData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
