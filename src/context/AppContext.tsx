import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Machine, PMPlan, PMScheduleItem, OperationScheduleItem, 
  RepairLog, ImprovementProject, SystemSettings, ScheduleItem, SetupLog, Employee,
  TechnicianLeave, SparePart, CD5Project, TimeBreakPartItem, ZoneStructure
} from '../types';
import { 
  PRELOADED_MACHINES, PRELOADED_TECHNICIANS, PRELOADED_PM_PLANS, 
  PRELOADED_REPAIRS, PRELOADED_IMPROVEMENTS, PRELOADED_SCHEDULES, PRELOADED_SETUPS,
  PRELOADED_SPARE_PARTS, PRELOADED_CD5_PROJECTS, PRELOADED_TIME_BREAK_PARTS
} from '../data/preloaded';
import { sendMorningSummary } from '../utils/lineNotify';

interface AppContextType {
  machines: Machine[];
  setMachines: React.Dispatch<React.SetStateAction<Machine[]>>;
  technicians: string[];
  setTechnicians: React.Dispatch<React.SetStateAction<string[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  pmPlans: PMPlan[];
  setPmPlans: React.Dispatch<React.SetStateAction<PMPlan[]>>;
  schedules: ScheduleItem[];
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
  repairs: RepairLog[];
  setRepairs: React.Dispatch<React.SetStateAction<RepairLog[]>>;
  improvements: ImprovementProject[];
  setImprovements: React.Dispatch<React.SetStateAction<ImprovementProject[]>>;
  setupLogs: SetupLog[];
  setSetupLogs: React.Dispatch<React.SetStateAction<SetupLog[]>>;
  leaves: TechnicianLeave[];
  setLeaves: React.Dispatch<React.SetStateAction<TechnicianLeave[]>>;
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  spareParts: SparePart[];
  setSpareParts: React.Dispatch<React.SetStateAction<SparePart[]>>;
  cd5Projects: CD5Project[];
  setCd5Projects: React.Dispatch<React.SetStateAction<CD5Project[]>>;
  timeBreakParts: TimeBreakPartItem[];
  setTimeBreakParts: React.Dispatch<React.SetStateAction<TimeBreakPartItem[]>>;
  zones: ZoneStructure[];
  setZones: React.Dispatch<React.SetStateAction<ZoneStructure[]>>;
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
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [repairs, setRepairs] = useState<RepairLog[]>([]);
  const [improvements, setImprovements] = useState<ImprovementProject[]>([]);
  const [setupLogs, setSetupLogs] = useState<SetupLog[]>([]);
  const [leaves, setLeaves] = useState<TechnicianLeave[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [cd5Projects, setCd5Projects] = useState<CD5Project[]>([]);
  const [timeBreakParts, setTimeBreakParts] = useState<TimeBreakPartItem[]>([]);
  const [zones, setZones] = useState<ZoneStructure[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  
  const [settings, setSettings] = useState<SystemSettings>({
    workingHoursPerDay: 8, // 8 hours * 60 = 480 mins
    lineNotifyEnabled: false,
    lineNotifyToken: '',
    lineAutoEvents: {
      breakdown: true,
      morningSummary: true,
      repairClosed: false,
      pmDispatched: false,
      setupLogged: false,
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

  // Load from Server or fall back to LocalStorage/preloads
  useEffect(() => {
    const initDb = async () => {
      try {
        const response = await fetch("/api/db");
        if (response.ok) {
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
            setSchedules(deduplicateById(serverData.schedules || PRELOADED_SCHEDULES));
            setRepairs(deduplicateById(serverData.repairs || PRELOADED_REPAIRS));
            setImprovements(deduplicateById(serverData.improvements || PRELOADED_IMPROVEMENTS));
            setSetupLogs(deduplicateById(serverData.setupLogs || PRELOADED_SETUPS));
            setSpareParts(deduplicateById(serverData.spareParts || PRELOADED_SPARE_PARTS));
            setLeaves(deduplicateById(serverData.leaves || []));
            setCd5Projects(deduplicateById(serverData.cd5Projects || PRELOADED_CD5_PROJECTS));
            setTimeBreakParts(deduplicateById(serverData.timeBreakParts || PRELOADED_TIME_BREAK_PARTS));
            if (serverData.zones && Array.isArray(serverData.zones)) {
              setZones(mergeZonesWithMachines(serverData.zones, enriched));
            } else {
              setZones(extractDefaultZones(enriched));
            }
            if (serverData.settings) {
              setSettings(serverData.settings);
            }
            setIsLoaded(true);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load database from server, falling back to localStorage", err);
      }

      // Fallback: load from LocalStorage or preloads
      try {
        const storedMachines = localStorage.getItem('maint_machines');
        const storedTechs = localStorage.getItem('maint_technicians');
        const storedPlans = localStorage.getItem('maint_pm_plans');
        const storedSchedules = localStorage.getItem('maint_schedule');
        const storedRepairs = localStorage.getItem('maint_repairs');
        const storedImprovements = localStorage.getItem('maint_improvements');
        const storedSetups = localStorage.getItem('maint_setup_logs');
        const storedSettings = localStorage.getItem('maint_settings');
        const storedEmployees = localStorage.getItem('maint_employees');
        const storedSpareParts = localStorage.getItem('maint_spare_parts');
        const storedLeaves = localStorage.getItem('maint_leaves');
        const storedCd5 = localStorage.getItem('maint_cd5_projects');
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

        if (storedSchedules) setSchedules(deduplicateById(JSON.parse(storedSchedules)));
        else setSchedules(PRELOADED_SCHEDULES);

        if (storedRepairs) setRepairs(deduplicateById(JSON.parse(storedRepairs)));
        else setRepairs(PRELOADED_REPAIRS);

        if (storedImprovements) setImprovements(deduplicateById(JSON.parse(storedImprovements)));
        else setImprovements(PRELOADED_IMPROVEMENTS);

        if (storedSetups) setSetupLogs(deduplicateById(JSON.parse(storedSetups)));
        else setSetupLogs(PRELOADED_SETUPS);

        if (storedSpareParts) setSpareParts(deduplicateById(JSON.parse(storedSpareParts)));
        else setSpareParts(PRELOADED_SPARE_PARTS);

        if (storedCd5) setCd5Projects(deduplicateById(JSON.parse(storedCd5)));
        else setCd5Projects(PRELOADED_CD5_PROJECTS);

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

        const today = new Date().toISOString().split('T')[0];
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
      localStorage.setItem('maint_setup_logs', JSON.stringify(setupLogs));
      localStorage.setItem('maint_leaves', JSON.stringify(leaves));
      localStorage.setItem('maint_spare_parts', JSON.stringify(spareParts));
      localStorage.setItem('maint_cd5_projects', JSON.stringify(cd5Projects));
      localStorage.setItem('maint_time_break_parts', JSON.stringify(timeBreakParts));
      localStorage.setItem('maint_settings', JSON.stringify(settings));
      localStorage.setItem('maint_zones', JSON.stringify(zones));
    } catch (e) {
      console.warn("LocalStorage quota warning:", e);
    }

    const dataToSave = {
      machines: deduplicateById(machines),
      technicians: Array.from(new Set(technicians)),
      employees: deduplicateById(employees),
      pmPlans: deduplicateById(pmPlans),
      schedules: deduplicateById(schedules),
      repairs: deduplicateById(repairs),
      improvements: deduplicateById(improvements),
      setupLogs: deduplicateById(setupLogs),
      leaves: deduplicateById(leaves),
      spareParts: deduplicateById(spareParts),
      cd5Projects: deduplicateById(cd5Projects),
      timeBreakParts: deduplicateById(timeBreakParts),
      settings,
      zones
    };

    const saveToServer = async () => {
      try {
        await fetch("/api/db", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(dataToSave)
        });
      } catch (error) {
        console.error("Error syncing with LAN server:", error);
      }
    };

    const timerId = setTimeout(saveToServer, 500);
    return () => clearTimeout(timerId);
  }, [
    machines, technicians, employees, pmPlans, schedules,
    repairs, improvements, setupLogs, leaves, spareParts, cd5Projects, timeBreakParts, settings, zones, isLoaded
  ]);

  // Polling for updates from other LAN clients
  useEffect(() => {
    if (!isLoaded) return;

    let isPolling = false;

    const intervalId = setInterval(async () => {
      if (isPolling) return;
      isPolling = true;

      try {
        const response = await fetch("/api/db");
        if (response.ok) {
          const serverData = await response.json();
          if (serverData && serverData.machines) {
            const checkAndSet = (localVal: any, serverVal: any, setter: any) => {
              if (JSON.stringify(localVal) !== JSON.stringify(serverVal)) {
                setter(serverVal);
              }
            };

            checkAndSet(machines, serverData.machines, setMachines);
            checkAndSet(technicians, serverData.technicians, setTechnicians);
            checkAndSet(employees, serverData.employees, setEmployees);
            checkAndSet(pmPlans, serverData.pmPlans, setPmPlans);
            checkAndSet(schedules, serverData.schedules, setSchedules);
            checkAndSet(repairs, serverData.repairs, setRepairs);
            checkAndSet(improvements, serverData.improvements, setImprovements);
            checkAndSet(setupLogs, serverData.setupLogs, setSetupLogs);
            checkAndSet(leaves, serverData.leaves, setLeaves);
            checkAndSet(spareParts, serverData.spareParts, setSpareParts);
            checkAndSet(cd5Projects, serverData.cd5Projects, setCd5Projects);
            checkAndSet(timeBreakParts, serverData.timeBreakParts, setTimeBreakParts);
            checkAndSet(settings, serverData.settings, setSettings);
            if (serverData.zones) {
              checkAndSet(zones, serverData.zones, setZones);
            }
          }
        }
      } catch (err) {
        console.error("LAN Polling sync error:", err);
      } finally {
        isPolling = false;
      }
    }, 4000); // poll every 4 seconds

    return () => clearInterval(intervalId);
  }, [
    isLoaded,
    machines, technicians, employees, pmPlans, schedules,
    repairs, improvements, setupLogs, leaves, spareParts, cd5Projects, timeBreakParts, settings, zones
  ]);

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
    setSetupLogs(PRELOADED_SETUPS);
    setCd5Projects(PRELOADED_CD5_PROJECTS);
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
    localStorage.setItem('maint_setup_logs', JSON.stringify(PRELOADED_SETUPS));
    localStorage.setItem('maint_leaves', JSON.stringify(preloadingLeaves));
    setSpareParts(PRELOADED_SPARE_PARTS);
    localStorage.setItem('maint_spare_parts', JSON.stringify(PRELOADED_SPARE_PARTS));
    localStorage.setItem('maint_cd5_projects', JSON.stringify(PRELOADED_CD5_PROJECTS));
    localStorage.setItem('maint_time_break_parts', JSON.stringify(PRELOADED_TIME_BREAK_PARTS));
    localStorage.setItem('maint_zones', JSON.stringify(defZones));
    localStorage.removeItem('maint_settings');
  };

  const exportData = () => {
    const dataObj = {
      machines,
      technicians,
      employees,
      pmPlans,
      schedules,
      repairs,
      improvements,
      setupLogs,
      leaves,
      spareParts,
      cd5Projects,
      timeBreakParts,
      settings,
      zones
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
      if (dataObj.schedules) setSchedules(dataObj.schedules);
      if (dataObj.repairs) setRepairs(dataObj.repairs);
      if (dataObj.improvements) setImprovements(dataObj.improvements);
      if (dataObj.setupLogs) setSetupLogs(dataObj.setupLogs);
      if (dataObj.leaves) setLeaves(dataObj.leaves);
      if (dataObj.spareParts) setSpareParts(dataObj.spareParts);
      if (dataObj.cd5Projects) setCd5Projects(dataObj.cd5Projects);
      if (dataObj.timeBreakParts) setTimeBreakParts(dataObj.timeBreakParts);
      if (dataObj.settings) setSettings(dataObj.settings);
      if (dataObj.zones) setZones(dataObj.zones);
      
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
      schedules, setSchedules,
      repairs, setRepairs,
      improvements, setImprovements,
      setupLogs, setSetupLogs,
      leaves, setLeaves,
      settings, setSettings,
      spareParts, setSpareParts,
      cd5Projects, setCd5Projects,
      timeBreakParts, setTimeBreakParts,
      zones, setZones,
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
