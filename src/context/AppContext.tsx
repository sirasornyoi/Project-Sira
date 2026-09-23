import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  Machine, PMPlan, PMScheduleItem, OperationScheduleItem, 
  RepairLog, ImprovementProject, SystemSettings, ScheduleItem, Employee,
  TechnicianLeave, SparePart, TimeBreakPartItem, ZoneStructure,
  WhyWhyAnalysis
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
  const currentStateRef = useRef({
    machines, technicians, employees, pmPlans, pmMachineIds, schedules,
    repairs, improvements, leaves, spareParts, timeBreakParts, settings, zones, whyWhyDrafts
  });

  // Always keep currentStateRef up-to-date with the latest state values
  useEffect(() => {
    currentStateRef.current = {
      machines, technicians, employees, pmPlans, pmMachineIds, schedules,
      repairs, improvements, leaves, spareParts, timeBreakParts, settings, zones, whyWhyDrafts
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
            setMachines(deduplicateById(enriched));
            setTechnicians(Array.from(new Set(serverData.technicians || PRELOADED_TECHNICIANS)));
            setEmployees(deduplicateById(serverData.employees || []));
            setPmPlans(deduplicateById(serverData.pmPlans || PRELOADED_PM_PLANS));
            if (serverData.pmMachineIds && Array.isArray(serverData.pmMachineIds)) {
              setPmMachineIds(serverData.pmMachineIds);
            } else {
              const stored = localStorage.getItem('maint_pm_machine_ids');
              if (stored) {
                try {
                  const parsed = JSON.parse(stored);
                  if (Array.isArray(parsed)) setPmMachineIds(parsed);
                  else setPmMachineIds(enriched.map(m => m.id));
                } catch {
                  setPmMachineIds(enriched.map(m => m.id));
                }
              } else {
                setPmMachineIds(enriched.map(m => m.id));
              }
            }
            setSchedules(deduplicateById(serverData.schedules || PRELOADED_SCHEDULES));
            setRepairs(deduplicateById(serverData.repairs || PRELOADED_REPAIRS));
            setImprovements(deduplicateById(serverData.improvements || PRELOADED_IMPROVEMENTS));
            setSpareParts(deduplicateById(serverData.spareParts || PRELOADED_SPARE_PARTS));
            setLeaves(deduplicateById(serverData.leaves || []));
            setTimeBreakParts(deduplicateById(serverData.timeBreakParts || PRELOADED_TIME_BREAK_PARTS));
            if (serverData.zones && Array.isArray(serverData.zones)) {
              setZones(mergeZonesWithMachines(serverData.zones, enriched));
            } else {
              setZones(extractDefaultZones(enriched));
            }
            if (serverData.whyWhyDrafts && Array.isArray(serverData.whyWhyDrafts)) {
              setWhyWhyDrafts(deduplicateById(serverData.whyWhyDrafts));
            }
            if (serverData.settings) {
              setSettings(serverData.settings);
            }
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
        const storedZones = localStorage.getItem('maint_zones');

        let currentLoadedMachines: Machine[] = PRELOADED_MACHINES;

        if (storedMachines) {
          const parsed = JSON.parse(storedMachines);
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
          setMachines(currentLoadedMachines);
        } else setMachines(PRELOADED_MACHINES);

        if (storedTechs) setTechnicians(JSON.parse(storedTechs));
        else setTechnicians(PRELOADED_TECHNICIANS);

        if (storedEmployees) setEmployees(JSON.parse(storedEmployees));
        else {
          const defaultEmployees = PRELOADED_TECHNICIANS.map((tech, idx) => ({
            id: `ENG-${String(idx + 1).padStart(3, '0')}`,
            name: tech,
            position: 'ช่างบำรุงรักษา',
            password: '1234'
          }));
          setEmployees(defaultEmployees);
        }

        if (storedPlans) setPmPlans(deduplicateById(JSON.parse(storedPlans)));
        else setPmPlans(PRELOADED_PM_PLANS);

        if (storedPmMachines) {
          try {
            const parsed = JSON.parse(storedPmMachines);
            if (Array.isArray(parsed)) setPmMachineIds(parsed);
            else setPmMachineIds(currentLoadedMachines.map(m => m.id));
          } catch {
            setPmMachineIds(currentLoadedMachines.map(m => m.id));
          }
        } else {
          setPmMachineIds(currentLoadedMachines.map(m => m.id));
        }

        if (storedSchedules) setSchedules(deduplicateById(JSON.parse(storedSchedules)));
        else setSchedules(PRELOADED_SCHEDULES);

        if (storedRepairs) setRepairs(deduplicateById(JSON.parse(storedRepairs)));
        else setRepairs(PRELOADED_REPAIRS);

        if (storedImprovements) setImprovements(deduplicateById(JSON.parse(storedImprovements)));
        else setImprovements(PRELOADED_IMPROVEMENTS);

        if (storedSpareParts) setSpareParts(deduplicateById(JSON.parse(storedSpareParts)));
        else setSpareParts(PRELOADED_SPARE_PARTS);

        if (storedTimeBreakParts) setTimeBreakParts(deduplicateById(JSON.parse(storedTimeBreakParts)));
        else setTimeBreakParts(PRELOADED_TIME_BREAK_PARTS);

        if (storedLeaves) setLeaves(deduplicateById(JSON.parse(storedLeaves)));
        else {
          const preloadingLeaves = [
            { id: 'lv-001', technician: 'ช่าง 1', date: '2026-06-08', type: 'ลากิจ' as const, note: 'ติดต่อราชการครอบครัว' },
            { id: 'lv-002', technician: 'ช่าง 2', date: '2026-06-11', type: 'ลาป่วย' as const, note: 'ปวดศีรษะ เป็นไข้หวัด' },
            { id: 'lv-003', technician: 'ช่าง 3', date: '2026-06-12', type: 'ลาพักร้อน' as const, note: 'พักผ่อนประจำปีต่างจังหวัด (ภูเก็ต)' },
            { id: 'lv-004', technician: 'ช่าง 4', date: '2026-06-14', type: 'วันหยุดประจำสัปดาห์' as const, note: 'สลับวันหยุดประจำโรงงาน' },
          ];
          setLeaves(preloadingLeaves);
        }

        if (storedSettings) setSettings(JSON.parse(storedSettings));

        const storedDrafts = localStorage.getItem('tpm_whyWhyDrafts');
        if (storedDrafts) {
          try {
            const parsedDrafts = JSON.parse(storedDrafts);
            if (Array.isArray(parsedDrafts)) setWhyWhyDrafts(parsedDrafts);
          } catch {}
        }

        if (storedZones) {
          try {
            const parsedZones = JSON.parse(storedZones);
            setZones(Array.isArray(parsedZones) ? parsedZones : extractDefaultZones(currentLoadedMachines));
          } catch {
            setZones(extractDefaultZones(currentLoadedMachines));
          }
        } else {
          setZones(extractDefaultZones(currentLoadedMachines));
        }

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

    // Save to localStorage as backup safely
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
      localStorage.setItem('maint_settings', JSON.stringify(settings));
      localStorage.setItem('maint_zones', JSON.stringify(zones));
      localStorage.setItem('maint_pm_machine_ids', JSON.stringify(pmMachineIds));
      localStorage.setItem('tpm_whyWhyDrafts', JSON.stringify(whyWhyDrafts));
    } catch (e) {
      console.warn("LocalStorage quota warning:", e);
    }

    const dataToSave = {
      machines: deduplicateById(machines),
      technicians: Array.from(new Set(technicians)),
      employees: deduplicateById(employees),
      pmPlans: deduplicateById(pmPlans),
      pmMachineIds: Array.from(new Set(pmMachineIds)),
      schedules: deduplicateById(schedules),
      repairs: deduplicateById(repairs),
      improvements: deduplicateById(improvements),
      leaves: deduplicateById(leaves),
      spareParts: deduplicateById(spareParts),
      timeBreakParts: deduplicateById(timeBreakParts),
      settings,
      zones,
      whyWhyDrafts: deduplicateById(whyWhyDrafts)
    };

    const saveToServer = async () => {
      try {
        lastLocalSaveTimeRef.current = Date.now();
        await fetch("/api/db", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(dataToSave)
        });
      } catch (error) {
        console.warn("Notice: Sync with server paused (server unreachable):", error);
      }
    };

    const timerId = setTimeout(saveToServer, 500);
    return () => clearTimeout(timerId);
  }, [
    machines, technicians, employees, pmPlans, pmMachineIds, schedules,
    repairs, improvements, leaves, spareParts, timeBreakParts, settings, zones, whyWhyDrafts, isLoaded
  ]);

  // Polling for updates from other LAN clients
  useEffect(() => {
    if (!isLoaded) return;

    let isPolling = false;

    const intervalId = setInterval(async () => {
      if (isPolling) return;

      // Skip polling if a local save was performed in the last 4 seconds to avoid race conditions
      if (Date.now() - lastLocalSaveTimeRef.current < 4000) {
        return;
      }

      isPolling = true;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch("/api/db", {
          headers: {
            "Accept": "application/json"
          },
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));

        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
          const serverData = await response.json();
          if (serverData && serverData.machines) {
            const checkAndSet = (localVal: any, serverVal: any, setter: any) => {
              if (serverVal !== undefined && JSON.stringify(localVal) !== JSON.stringify(serverVal)) {
                setter(serverVal);
              }
            };

            const curr = currentStateRef.current;
            checkAndSet(curr.machines, serverData.machines, setMachines);
            checkAndSet(curr.technicians, serverData.technicians, setTechnicians);
            checkAndSet(curr.employees, serverData.employees, setEmployees);
            checkAndSet(curr.pmPlans, serverData.pmPlans, setPmPlans);
            if (serverData.pmMachineIds && Array.isArray(serverData.pmMachineIds)) {
              checkAndSet(curr.pmMachineIds, serverData.pmMachineIds, setPmMachineIds);
            }
            checkAndSet(curr.schedules, serverData.schedules, setSchedules);
            checkAndSet(curr.repairs, serverData.repairs, setRepairs);
            checkAndSet(curr.improvements, serverData.improvements, setImprovements);
            checkAndSet(curr.leaves, serverData.leaves, setLeaves);
            checkAndSet(curr.spareParts, serverData.spareParts, setSpareParts);
            checkAndSet(curr.timeBreakParts, serverData.timeBreakParts, setTimeBreakParts);
            checkAndSet(curr.settings, serverData.settings, setSettings);
            if (serverData.zones) {
              checkAndSet(curr.zones, serverData.zones, setZones);
            }
            if (serverData.whyWhyDrafts) {
              checkAndSet(curr.whyWhyDrafts, serverData.whyWhyDrafts, setWhyWhyDrafts);
            }
          }
        }
      } catch (err) {
        // Polling is a background task; log as notice rather than unhandled fatal error
        console.warn("LAN Polling sync notice:", (err as Error)?.message || err);
      } finally {
        isPolling = false;
      }
    }, 4000); // poll every 4 seconds

    return () => clearInterval(intervalId);
  }, [isLoaded]);

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
