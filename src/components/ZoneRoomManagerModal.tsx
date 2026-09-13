import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Plus, Edit2, Trash2, Check, MapPin, 
  Layers, AlertCircle, Search, Cpu, AlertTriangle
} from 'lucide-react';

interface ZoneRoomManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectZoneRoom?: (zone: string, room: string) => void;
}

export const ZoneRoomManagerModal: React.FC<ZoneRoomManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectZoneRoom
}) => {
  const { 
    zones, 
    machines, 
    addZone, 
    addRoomToZone, 
    removeZone, 
    removeRoomFromZone, 
    renameZone, 
    renameRoom 
  } = useApp();

  const [selectedZoneName, setSelectedZoneName] = useState<string>(
    zones[0]?.name || ''
  );
  const [newZoneInput, setNewZoneInput] = useState('');
  const [isAddingZone, setIsAddingZone] = useState(false);
  
  const [newRoomInput, setNewRoomInput] = useState('');
  const [isAddingRoom, setIsAddingRoom] = useState(false);

  // Rename states
  const [editingZoneName, setEditingZoneName] = useState<string | null>(null);
  const [editZoneVal, setEditZoneVal] = useState('');

  const [editingRoomName, setEditingRoomName] = useState<string | null>(null);
  const [editRoomVal, setEditRoomVal] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // In-modal confirmation states (replaces window.confirm)
  const [zoneToDelete, setZoneToDelete] = useState<string | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<{ zoneName: string; roomName: string } | null>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  const activeZone = zones.find(
    z => z.name.toLowerCase().trim() === selectedZoneName.toLowerCase().trim()
  ) || zones[0];

  const filteredZones = zones.filter(z => 
    z.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    z.rooms.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Machine count helpers: match purely on locationZone and locationRoom
  const getMachinesInZone = (zoneName: string) => {
    const zLower = zoneName.trim().toLowerCase();
    return machines.filter(m => (m.locationZone || '').trim().toLowerCase() === zLower);
  };

  const getMachinesInRoom = (zoneName: string, roomName: string) => {
    const zLower = zoneName.trim().toLowerCase();
    const rLower = roomName.trim().toLowerCase();
    return machines.filter(m => 
      (m.locationZone || '').trim().toLowerCase() === zLower &&
      (m.locationRoom || '').trim().toLowerCase() === rLower
    );
  };

  const handleAddZone = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newZoneInput.trim();
    if (!trimmed) return;
    const added = addZone(trimmed);
    if (added) {
      setSelectedZoneName(trimmed);
      setNewZoneInput('');
      setIsAddingZone(false);
      showFeedback(`เพิ่มโซน "${trimmed}" สำเร็จ`);
    } else {
      showError(`มีโซน "${trimmed}" อยู่ในระบบแล้ว`);
    }
  };

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeZone) return;
    const trimmed = newRoomInput.trim();
    if (!trimmed) return;
    const added = addRoomToZone(activeZone.name, trimmed);
    if (added) {
      setNewRoomInput('');
      setIsAddingRoom(false);
      showFeedback(`เพิ่มห้อง "${trimmed}" ในโซน "${activeZone.name}" สำเร็จ`);
    } else {
      showError(`มีห้อง "${trimmed}" อยู่ในโซนนี้แล้ว`);
    }
  };

  const confirmDeleteZone = () => {
    if (!zoneToDelete) return;
    const targetName = zoneToDelete;
    removeZone(targetName);
    if (selectedZoneName.toLowerCase() === targetName.toLowerCase()) {
      const remaining = zones.filter(z => z.name.toLowerCase() !== targetName.toLowerCase());
      setSelectedZoneName(remaining[0]?.name || '');
    }
    setZoneToDelete(null);
    showFeedback(`ลบโซน "${targetName}" เรียบร้อยแล้ว`);
  };

  const confirmDeleteRoom = () => {
    if (!roomToDelete) return;
    const { zoneName, roomName } = roomToDelete;
    removeRoomFromZone(zoneName, roomName);
    setRoomToDelete(null);
    showFeedback(`ลบห้อง "${roomName}" เรียบร้อยแล้ว`);
  };

  const handleSaveRenameZone = (oldName: string) => {
    const trimmed = editZoneVal.trim();
    if (!trimmed || trimmed.toLowerCase() === oldName.toLowerCase()) {
      setEditingZoneName(null);
      return;
    }
    renameZone(oldName, trimmed);
    if (selectedZoneName.toLowerCase() === oldName.toLowerCase()) {
      setSelectedZoneName(trimmed);
    }
    setEditingZoneName(null);
    showFeedback(`เปลี่ยนชื่อโซนเป็น "${trimmed}" สำเร็จ`);
  };

  const handleSaveRenameRoom = (zoneName: string, oldRoom: string) => {
    const trimmed = editRoomVal.trim();
    if (!trimmed || trimmed.toLowerCase() === oldRoom.toLowerCase()) {
      setEditingRoomName(null);
      return;
    }
    renameRoom(zoneName, oldRoom, trimmed);
    setEditingRoomName(null);
    showFeedback(`เปลี่ยนชื่อห้องเป็น "${trimmed}" สำเร็จ`);
  };

  return (
    <div 
      id="zone-room-manager-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="zone-room-manager-container"
        className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-700/90 overflow-hidden flex flex-col max-h-[90vh] relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">จัดการโครงสร้างโซนและห้อง (Zone & Room)</h2>
              <p className="text-xs text-slate-400">
                เพิ่ม ลบ หรือแก้ไขชื่อโซนหลัก และห้องย่อยภายในโรงงาน
              </p>
            </div>
          </div>
          <button 
            id="close-zone-room-manager-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alert banner */}
        {actionFeedback && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-6 py-2.5 text-xs text-emerald-300 flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Error alert banner */}
        {errorMessage && (
          <div className="bg-rose-950/90 border-b border-rose-500/40 px-6 py-2.5 text-xs text-rose-300 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Content Layout: Two Columns */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
          {/* Left Column: Zones List (5 cols) */}
          <div className="md:col-span-5 border-r border-slate-800 flex flex-col bg-slate-900/90">
            {/* Search and Add Zone */}
            <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  รายชื่อโซน ({zones.length})
                </span>
                {!isAddingZone && (
                  <button
                    id="add-zone-open-btn"
                    onClick={() => {
                      setIsAddingZone(true);
                      setNewZoneInput('');
                    }}
                    className="text-xs font-semibold text-cyan-300 hover:text-cyan-100 hover:bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    เพิ่มโซน
                  </button>
                )}
              </div>

              {/* Add Zone Form */}
              {isAddingZone && (
                <form onSubmit={handleAddZone} className="p-3 bg-slate-950 border border-cyan-500/50 rounded-xl space-y-2.5 shadow-inner">
                  <label className="block text-xs font-semibold text-cyan-300">
                    ชื่อโซนใหม่:
                  </label>
                  <input
                    id="new-zone-input"
                    type="text"
                    value={newZoneInput}
                    onChange={e => setNewZoneInput(e.target.value)}
                    placeholder="เช่น โซนเตรียมข้าว, โซนบรรจุ..."
                    className="w-full text-sm px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-fg font-semibold placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingZone(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      id="save-new-zone-btn"
                      type="submit"
                      disabled={!newZoneInput.trim()}
                      className="px-3.5 py-1.5 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg font-bold disabled:opacity-50 transition cursor-pointer"
                    >
                      บันทึกโซน
                    </button>
                  </div>
                </form>
              )}

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาโซน หรือ ห้อง..."
                  className="w-full text-xs pl-8 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-fg placeholder:text-slate-400 font-medium focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Zones Scrollable List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 divide-y divide-slate-800/40">
              {filteredZones.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  ไม่พบโซนที่ตรงกับการค้นหา
                </div>
              ) : (
                filteredZones.map(zone => {
                  const isSelected = activeZone?.name === zone.name;
                  const zoneMachines = getMachinesInZone(zone.name);
                  const isRenaming = editingZoneName === zone.name;

                  return (
                    <div
                      key={zone.name}
                      id={`zone-item-${zone.name}`}
                      onClick={() => setSelectedZoneName(zone.name)}
                      className={`group p-3 rounded-xl cursor-pointer transition-all border ${
                        isSelected 
                          ? 'bg-cyan-950/40 border-cyan-500/50 shadow-sm' 
                          : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600 hover:bg-slate-800/70'
                      }`}
                    >
                      {isRenaming ? (
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editZoneVal}
                            onChange={e => setEditZoneVal(e.target.value)}
                            className="flex-1 text-sm px-2.5 py-1.5 bg-slate-950 border border-cyan-400 text-fg font-semibold rounded-lg focus:outline-none"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveRenameZone(zone.name);
                              if (e.key === 'Escape') setEditingZoneName(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRenameZone(zone.name)}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-950/50 rounded-md cursor-pointer"
                            title="บันทึก"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingZoneName(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-md cursor-pointer"
                            title="ยกเลิก"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isSelected ? 'bg-cyan-400 ring-2 ring-cyan-400/30' : 'bg-slate-600'
                            }`} />
                            <div className="min-w-0">
                              <span className={`text-sm font-semibold truncate block ${
                                isSelected ? 'text-cyan-300' : 'text-slate-200'
                              }`}>
                                {zone.name}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                <span>{zone.rooms.length} ห้อง</span>
                                <span>•</span>
                                <span>{zoneMachines.length} เครื่องจักร</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button
                              id={`rename-zone-btn-${zone.name}`}
                              type="button"
                              onClick={() => {
                                setEditingZoneName(zone.name);
                                setEditZoneVal(zone.name);
                              }}
                              className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              title="เปลี่ยนชื่อโซน"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`delete-zone-btn-${zone.name}`}
                              type="button"
                              onClick={() => setZoneToDelete(zone.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              title="ลบโซนนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Rooms inside Active Zone (7 cols) */}
          <div className="md:col-span-7 flex flex-col bg-slate-950/60">
            {activeZone ? (
              <>
                {/* Zone Details Header */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded-md">
                        โซนที่เลือก
                      </span>
                      <h3 className="text-base font-bold text-slate-100">
                        {activeZone.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      มีทั้งหมด {activeZone.rooms.length} ห้องย่อยในโซนนี้
                    </p>
                  </div>

                  {!isAddingRoom && (
                    <button
                      id="add-room-open-btn"
                      onClick={() => {
                        setIsAddingRoom(true);
                        setNewRoomInput('');
                      }}
                      className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่มห้องในโซนนี้
                    </button>
                  )}
                </div>

                {/* Add Room Form */}
                {isAddingRoom && (
                  <div className="p-4 bg-slate-900/90 border-b border-slate-800">
                    <form onSubmit={handleAddRoom} className="space-y-2.5">
                      <label className="block text-xs font-semibold text-cyan-300">
                        เพิ่มห้องใหม่ในโซน "{activeZone.name}":
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="new-room-input"
                          type="text"
                          value={newRoomInput}
                          onChange={e => setNewRoomInput(e.target.value)}
                          placeholder="เช่น ห้องล้างผัก, ห้องผสม, คลังสินค้า..."
                          className="flex-1 text-sm px-3 py-2 bg-slate-950 border border-cyan-400 rounded-lg text-fg font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-300"
                          autoFocus
                        />
                        <button
                          id="save-new-room-btn"
                          type="submit"
                          disabled={!newRoomInput.trim()}
                          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold whitespace-nowrap disabled:opacity-50 transition cursor-pointer"
                        >
                          บันทึกห้อง
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingRoom(false)}
                          className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Rooms List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {activeZone.rooms.length === 0 ? (
                    <div className="py-12 px-4 text-center border-2 border-dashed border-slate-800 rounded-xl">
                      <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-300">ยังไม่มีห้องย่อยในโซนนี้</p>
                      <p className="text-xs text-slate-500 mt-1">
                        คลิกปุ่ม "+ เพิ่มห้องในโซนนี้" ด้านบนเพื่อเริ่มกำหนดห้อง
                      </p>
                    </div>
                  ) : (
                    activeZone.rooms.map(roomName => {
                      const roomMachines = getMachinesInRoom(activeZone.name, roomName);
                      const isRenaming = editingRoomName === roomName;

                      return (
                        <div
                          key={roomName}
                          id={`room-item-${roomName}`}
                          className="p-3 border border-slate-800 hover:border-slate-700 rounded-xl bg-slate-900/60 hover:bg-slate-900 transition-all group"
                        >
                          {isRenaming ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editRoomVal}
                                onChange={e => setEditRoomVal(e.target.value)}
                                className="flex-1 text-sm px-3 py-1.5 bg-slate-950 border border-cyan-400 rounded-lg text-fg font-semibold focus:outline-none"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveRenameRoom(activeZone.name, roomName);
                                  if (e.key === 'Escape') setEditingRoomName(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRenameRoom(activeZone.name, roomName)}
                                className="p-1.5 text-emerald-400 hover:bg-emerald-950/50 rounded cursor-pointer"
                                title="บันทึก"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingRoomName(null)}
                                className="p-1.5 text-slate-400 hover:bg-slate-800 rounded cursor-pointer"
                                title="ยกเลิก"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-bold text-xs">
                                    {roomName.charAt(0)}
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-slate-200">
                                      {roomName}
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                      <span>เครื่องจักร: {roomMachines.length} เครื่อง</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {onSelectZoneRoom && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onSelectZoneRoom(activeZone.name, roomName);
                                        onClose();
                                      }}
                                      className="text-xs px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 font-medium rounded-md transition-colors cursor-pointer"
                                    >
                                      เลือกห้องนี้
                                    </button>
                                  )}
                                  <button
                                    id={`rename-room-btn-${roomName}`}
                                    type="button"
                                    onClick={() => {
                                      setEditingRoomName(roomName);
                                      setEditRoomVal(roomName);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition cursor-pointer"
                                    title="เปลี่ยนชื่อห้อง"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    id={`delete-room-btn-${roomName}`}
                                    type="button"
                                    onClick={() => setRoomToDelete({ zoneName: activeZone.name, roomName })}
                                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition cursor-pointer"
                                    title="ลบห้องนี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Machines in this room preview */}
                              {roomMachines.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5 items-center">
                                  <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
                                    <Cpu className="w-3 h-3 text-cyan-400" />
                                    เครื่องในห้องนี้:
                                  </span>
                                  {roomMachines.slice(0, 6).map(m => (
                                    <span
                                      key={m.id}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-950 border border-slate-700/80 text-cyan-300"
                                    >
                                      {m.name || m.id}
                                    </span>
                                  ))}
                                  {roomMachines.length > 6 && (
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      +{roomMachines.length - 6} เครื่อง
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500">
                กรุณาเลือกโซนทางด้านซ้าย หรือกด "+ เพิ่มโซน"
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">ทั้งหมด:</span>
            <span>{zones.length} โซน</span>
            <span>•</span>
            <span>
              {zones.reduce((acc, z) => acc + (z.rooms?.length || 0), 0)} ห้อง
            </span>
          </div>
          <button
            id="done-zone-room-manager-btn"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-fg rounded-lg font-medium transition-colors cursor-pointer"
          >
            เสร็จสิ้น
          </button>
        </div>

        {/* IN-MODAL CONFIRMATION: Delete Zone */}
        {zoneToDelete && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">ยืนยันการลบโซน</h3>
                  <p className="text-xs text-slate-400">โซน: <span className="text-fg font-bold">{zoneToDelete}</span></p>
                </div>
              </div>

              {(() => {
                const assigned = getMachinesInZone(zoneToDelete);
                return assigned.length > 0 ? (
                  <div className="bg-amber-950/50 border border-amber-500/40 rounded-lg p-3 text-xs text-amber-300 space-y-1">
                    <p className="font-semibold">⚠️ ตรวจพบเครื่องจักรผูกกับโซนนี้จำนวน {assigned.length} เครื่อง</p>
                    <p className="text-amber-400/80">ระบบจะปลดเครื่องจักรเหล่านี้ออกจากโซนโดยอัตโนมัติ (เครื่องจักรจะไม่ถูกลบ)</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300">
                    คุณแน่ใจหรือไม่ว่าต้องการลบโซน "{zoneToDelete}" และห้องย่อยทั้งหมดในโซนนี้?
                  </p>
                );
              })()}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setZoneToDelete(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  id="btn-confirm-delete-zone"
                  type="button"
                  onClick={confirmDeleteZone}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-fg text-xs font-bold rounded-lg transition cursor-pointer shadow-sm"
                >
                  ยืนยันลบโซน
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IN-MODAL CONFIRMATION: Delete Room */}
        {roomToDelete && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">ยืนยันการลบห้อง</h3>
                  <p className="text-xs text-slate-400">ห้อง: <span className="text-fg font-bold">{roomToDelete.roomName}</span> (ในโซน {roomToDelete.zoneName})</p>
                </div>
              </div>

              {(() => {
                const assigned = getMachinesInRoom(roomToDelete.zoneName, roomToDelete.roomName);
                return assigned.length > 0 ? (
                  <div className="bg-amber-950/50 border border-amber-500/40 rounded-lg p-3 text-xs text-amber-300 space-y-1">
                    <p className="font-semibold">⚠️ ตรวจพบเครื่องจักรผูกกับห้องนี้จำนวน {assigned.length} เครื่อง</p>
                    <p className="text-amber-400/80">ระบบจะปลดเครื่องจักรเหล่านี้ออกจากห้องนี้โดยอัตโนมัติ</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300">
                    คุณแน่ใจหรือไม่ว่าต้องการลบห้อง "{roomToDelete.roomName}" ออกจากโซน "{roomToDelete.zoneName}"?
                  </p>
                );
              })()}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRoomToDelete(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  id="btn-confirm-delete-room"
                  type="button"
                  onClick={confirmDeleteRoom}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-fg text-xs font-bold rounded-lg transition cursor-pointer shadow-sm"
                >
                  ยืนยันลบห้อง
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

