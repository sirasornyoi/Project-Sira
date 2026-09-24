import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MapPin, Plus, Check, X, Settings2 } from 'lucide-react';

interface ZoneRoomFieldGroupProps {
  zone: string;
  room: string;
  onZoneChange: (zone: string) => void;
  onRoomChange: (room: string) => void;
  onOpenManager?: () => void;
  idPrefix?: string;
}

export const ZoneRoomFieldGroup: React.FC<ZoneRoomFieldGroupProps> = ({
  zone,
  room,
  onZoneChange,
  onRoomChange,
  onOpenManager,
  idPrefix = 'form'
}) => {
  const { zones, addZone, addRoomToZone } = useApp();

  // Inline custom zone addition
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [customZoneInput, setCustomZoneInput] = useState('');

  // Inline custom room addition
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [customRoomInput, setCustomRoomInput] = useState('');

  // All zone names available
  const allZoneNames = Array.from(
    new Set([
      ...zones.map(z => z.name),
      ...(zone ? [zone] : [])
    ])
  ).filter(Boolean).sort((a, b) => a.localeCompare(b, 'th'));

  // Selected zone object
  const activeZoneObj = zones.find(
    z => z.name.toLowerCase().trim() === (zone || '').toLowerCase().trim()
  );

  // Available rooms for this zone
  const availableRooms = Array.from(
    new Set([
      ...(activeZoneObj?.rooms || []),
      ...(zone ? [] : zones.flatMap(z => z.rooms)),
      ...(room ? [room] : [])
    ])
  ).filter(Boolean).sort((a, b) => a.localeCompare(b, 'th'));

  const handleSaveCustomZone = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customZoneInput.trim();
    if (!trimmed) {
      setIsAddingZone(false);
      return;
    }
    addZone(trimmed);
    onZoneChange(trimmed);
    setCustomZoneInput('');
    setIsAddingZone(false);
  };

  const handleSaveCustomRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customRoomInput.trim();
    if (!trimmed) {
      setIsAddingRoom(false);
      return;
    }
    if (zone) {
      addRoomToZone(zone, trimmed);
    }
    onRoomChange(trimmed);
    setCustomRoomInput('');
    setIsAddingRoom(false);
  };

  return (
    <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-slate-50 dark:bg-slate-900/80 border border-border dark:border-slate-700/80 rounded-xl">
      {/* Zone Field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label 
            htmlFor={`${idPrefix}-select-zone`}
            className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5"
          >
            <MapPin size={13} className="text-cyan-600 dark:text-cyan-400" />
            <span>โซน (Zone)*</span>
          </label>
          <div className="flex items-center gap-1">
            {!isAddingZone && (
              <button
                type="button"
                id={`${idPrefix}-btn-quick-add-zone`}
                onClick={() => {
                  setIsAddingZone(true);
                  setCustomZoneInput('');
                }}
                className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-950/50 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition cursor-pointer"
                title="พิมพ์เพิ่มโซนใหม่"
              >
                <Plus size={11} />
                <span>เพิ่มโซน</span>
              </button>
            )}
            {onOpenManager && (
              <button
                type="button"
                id={`${idPrefix}-btn-open-zone-manager`}
                onClick={onOpenManager}
                className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1 transition cursor-pointer"
                title="เปิดหน้าต่างจัดการโซนและห้อง"
              >
                <Settings2 size={11} />
                <span>จัดการ</span>
              </button>
            )}
          </div>
        </div>

        {isAddingZone ? (
          <div className="flex items-center gap-1.5">
            <input
              id={`${idPrefix}-input-custom-zone`}
              type="text"
              value={customZoneInput}
              onChange={e => {
                const val = e.target.value;
                setCustomZoneInput(val);
                onZoneChange(val);
              }}
              onBlur={() => {
                const trimmed = customZoneInput.trim();
                if (trimmed) {
                  addZone(trimmed);
                  onZoneChange(trimmed);
                }
              }}
              placeholder="พิมพ์ชื่อโซนใหม่..."
              className="flex-1 bg-white dark:bg-slate-950 border border-cyan-500 rounded-lg px-3 py-1.5 text-fg placeholder:text-slate-400 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-cyan-300 shadow-xs"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveCustomZone();
                if (e.key === 'Escape') setIsAddingZone(false);
              }}
            />
            <button
              type="button"
              id={`${idPrefix}-btn-confirm-custom-zone`}
              onClick={() => handleSaveCustomZone()}
              className="p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-md transition cursor-pointer shadow-sm"
              title="บันทึกโซน"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={() => setIsAddingZone(false)}
              className="p-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition cursor-pointer"
              title="ยกเลิก"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <select
            id={`${idPrefix}-select-zone`}
            value={zone}
            onChange={e => {
              const val = e.target.value;
              if (val === '__ADD_NEW__') {
                setIsAddingZone(true);
              } else {
                onZoneChange(val);
              }
            }}
            className="w-full bg-white dark:bg-slate-950 border border-border dark:border-slate-700 rounded-lg px-3 py-2 text-fg font-medium text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="" className="bg-white dark:bg-slate-900 text-slate-500">-- เลือกโซน --</option>
            {allZoneNames.map(zName => (
              <option key={zName} value={zName} className="bg-white dark:bg-slate-900 text-fg font-medium">
                {zName}
              </option>
            ))}
            <option value="__ADD_NEW__" className="text-cyan-600 dark:text-cyan-400 font-semibold bg-white dark:bg-slate-900">
              ➕ + เพิ่มโซนใหม่...
            </option>
          </select>
        )}
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          * เลือกโซนที่ต้องการ หรือคลิก "+ เพิ่มโซน" เพื่อสร้างใหม่
        </p>
      </div>

      {/* Room Field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label 
            htmlFor={`${idPrefix}-select-room`}
            className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5"
          >
            <span>ห้องที่ติดตั้ง (Room)*</span>
            {zone && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate max-w-[120px]">
                (ใน {zone})
              </span>
            )}
          </label>
          {!isAddingRoom && (
            <button
              type="button"
              id={`${idPrefix}-btn-quick-add-room`}
              onClick={() => {
                setIsAddingRoom(true);
                setCustomRoomInput('');
              }}
              className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-950/50 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition cursor-pointer"
              title="พิมพ์เพิ่มห้องใหม่ในโซนนี้"
            >
              <Plus size={11} />
              <span>เพิ่มห้อง</span>
            </button>
          )}
        </div>

        {isAddingRoom ? (
          <div className="flex items-center gap-1.5">
            <input
              id={`${idPrefix}-input-custom-room`}
              type="text"
              value={customRoomInput}
              onChange={e => {
                const val = e.target.value;
                setCustomRoomInput(val);
                onRoomChange(val);
              }}
              onBlur={() => {
                const trimmed = customRoomInput.trim();
                if (trimmed) {
                  if (zone) addRoomToZone(zone, trimmed);
                  onRoomChange(trimmed);
                }
              }}
              placeholder={zone ? `พิมพ์ห้องใหม่ใน ${zone}...` : 'พิมพ์ชื่อห้องใหม่...'}
              className="flex-1 bg-white dark:bg-slate-950 border border-cyan-500 rounded-lg px-3 py-1.5 text-fg placeholder:text-slate-400 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-cyan-300 shadow-xs"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveCustomRoom();
                if (e.key === 'Escape') setIsAddingRoom(false);
              }}
            />
            <button
              type="button"
              id={`${idPrefix}-btn-confirm-custom-room`}
              onClick={() => handleSaveCustomRoom()}
              className="p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-md transition cursor-pointer shadow-sm"
              title="บันทึกห้อง"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={() => setIsAddingRoom(false)}
              className="p-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition cursor-pointer"
              title="ยกเลิก"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <select
            id={`${idPrefix}-select-room`}
            value={room}
            onChange={e => {
              const val = e.target.value;
              if (val === '__ADD_NEW__') {
                setIsAddingRoom(true);
              } else {
                onRoomChange(val);
              }
            }}
            className="w-full bg-white dark:bg-slate-950 border border-border dark:border-slate-700 rounded-lg px-3 py-2 text-fg font-medium text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="" className="bg-white dark:bg-slate-900 text-slate-500">-- เลือกห้อง --</option>
            {availableRooms.map(rName => (
              <option key={rName} value={rName} className="bg-white dark:bg-slate-900 text-fg font-medium">
                {rName}
              </option>
            ))}
            <option value="__ADD_NEW__" className="text-cyan-600 dark:text-cyan-400 font-semibold bg-white dark:bg-slate-900">
              ➕ + เพิ่มห้องใหม่...
            </option>
          </select>
        )}
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          {zone ? `* ห้องภายในโซน "${zone}"` : '* แสดงห้องทั้งหมด หรือเลือกโซนก่อน'}
        </p>
      </div>
    </div>
  );
};
