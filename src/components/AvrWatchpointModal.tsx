/**
 * (c) 2026 AI Studio AVR Visual Studio
 * AVR Memory & Register Watchpoint (Data Breakpoint) Inspector Modal
 * Break execution on SRAM[0x0100] == 0xFF, PORTB write, register conditions, etc.
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Database,
  Sliders,
  History,
  Info,
  X,
  Target,
  Sparkles,
  Search,
} from 'lucide-react';
import {
  AvrWatchpoint,
  AvrWatchpointCondition,
  AvrWatchpointTargetType,
  WatchpointHitEvent,
  AvrWatchpointState,
  ArduinoPin,
} from '../types';
import { ATMEGA328P_IO_REGISTERS, DEFAULT_WATCHPOINTS } from '../utils/watchpointEngine';

interface AvrWatchpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchpointState: AvrWatchpointState;
  onUpdateWatchpoints: (watchpoints: AvrWatchpoint[]) => void;
  onClearHitHistory: () => void;
  onResumeExecution?: () => void;
  currentCycle?: number;
  currentPc?: number;
}

export const AvrWatchpointModal: React.FC<AvrWatchpointModalProps> = ({
  isOpen,
  onClose,
  watchpointState,
  onUpdateWatchpoints,
  onClearHitHistory,
  onResumeExecution,
  currentCycle = 0,
  currentPc = 0,
}) => {
  const [selectedTargetType, setSelectedTargetType] = useState<AvrWatchpointTargetType>('sram');
  const [targetAddressHex, setTargetAddressHex] = useState('0x0100');
  const [selectedRegister, setSelectedRegister] = useState('PORTB');
  const [selectedPin, setSelectedPin] = useState<ArduinoPin>('13');
  const [condition, setCondition] = useState<AvrWatchpointCondition>('EQUALS');
  const [expectedValHex, setExpectedValHex] = useState('0xFF');
  const [nameInput, setNameInput] = useState('');
  const [bitIndex, setBitIndex] = useState(0);

  if (!isOpen) return null;

  const handleAddWatchpoint = () => {
    let targetAddress: number | undefined;
    if (selectedTargetType === 'sram') {
      targetAddress = parseInt(targetAddressHex.trim(), 16);
      if (isNaN(targetAddress)) targetAddress = 0x0100;
    } else if (selectedTargetType === 'io_register') {
      const ioReg = ATMEGA328P_IO_REGISTERS.find((r) => r.name === selectedRegister);
      targetAddress = ioReg ? ioReg.address : 0x25;
    }

    let expectedVal: number | undefined;
    if (expectedValHex.trim().startsWith('0x') || expectedValHex.trim().startsWith('0X')) {
      expectedVal = parseInt(expectedValHex.trim(), 16);
    } else {
      expectedVal = parseInt(expectedValHex.trim(), 10);
    }
    if (isNaN(expectedVal)) expectedVal = 0xff;

    const defaultTitle =
      selectedTargetType === 'sram'
        ? `SRAM[0x${targetAddress?.toString(16).toUpperCase().padStart(4, '0')}] ${condition} 0x${expectedVal.toString(16).toUpperCase()}`
        : selectedTargetType === 'io_register'
        ? `${selectedRegister} (${condition})`
        : `Pin D${selectedPin} (${condition})`;

    const newWp: AvrWatchpoint = {
      id: `wp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: nameInput.trim() || defaultTitle,
      enabled: true,
      targetType: selectedTargetType,
      targetAddress,
      targetRegister: selectedTargetType === 'io_register' ? selectedRegister : undefined,
      targetPin: selectedTargetType === 'pin' ? selectedPin : undefined,
      bitIndex: condition === 'BIT_SET' || condition === 'BIT_CLEARED' ? bitIndex : undefined,
      condition,
      expectedValue: condition !== 'ON_WRITE' && condition !== 'ON_READ' && condition !== 'ON_CHANGE' ? expectedVal : undefined,
      hitCount: 0,
      description: `Figyeli a(z) ${selectedTargetType} műveleteket`,
    };

    onUpdateWatchpoints([...watchpointState.watchpoints, newWp]);
    setNameInput('');
  };

  const handleToggle = (id: string) => {
    const updated = watchpointState.watchpoints.map((wp) =>
      wp.id === id ? { ...wp, enabled: !wp.enabled } : wp
    );
    onUpdateWatchpoints(updated);
  };

  const handleDelete = (id: string) => {
    const updated = watchpointState.watchpoints.filter((wp) => wp.id !== id);
    onUpdateWatchpoints(updated);
  };

  const handleLoadDefaults = () => {
    onUpdateWatchpoints([...DEFAULT_WATCHPOINTS]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        id="avr-watchpoint-modal"
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">AVR Watchpoint (Adat Breakpoint) Rendszer</h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                  Valós Idős Hardver Figyelő
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Állítsd meg az AVR szimulációt tetszőleges SRAM memóriacím, I/O regiszter vagy Pin adatváltozásakor.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Watchpoint Hit Alert Banner (if currently paused on watchpoint) */}
        {watchpointState.lastHitEvent && (
          <div className="px-6 py-3.5 bg-red-950/80 border-b border-red-500/40 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-red-200 flex items-center gap-2">
                  <span>WATCHPOINT TALÁLAT! Szimuláció megállítva.</span>
                  <span className="text-xs bg-red-900/80 text-red-300 px-2 py-0.5 rounded font-mono">
                    {watchpointState.lastHitEvent.targetDescription}
                  </span>
                </div>
                <div className="text-xs text-red-300/80 mt-0.5 font-mono">
                  PC: 0x{watchpointState.lastHitEvent.pc.toString(16).toUpperCase()} | Utasítás: {watchpointState.lastHitEvent.disassembled || 'Ismeretlen'} | Régi érték: 0x{watchpointState.lastHitEvent.oldValue.toString(16).toUpperCase()} → Új érték: 0x{watchpointState.lastHitEvent.newValue.toString(16).toUpperCase()}
                </div>
              </div>
            </div>
            {onResumeExecution && (
              <button
                onClick={onResumeExecution}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Folytatás
              </button>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Quick Preset Cards */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Gyors Watchpoint Minták
              </span>
              <button
                onClick={handleLoadDefaults}
                className="text-xs text-slate-400 hover:text-amber-400 transition flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Alapértelmezettek betöltése
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setSelectedTargetType('sram');
                  setTargetAddressHex('0x0100');
                  setCondition('EQUALS');
                  setExpectedValHex('0xFF');
                  setNameInput('SRAM[0x0100] == 0xFF');
                }}
                className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 rounded-xl text-left transition group"
              >
                <div className="text-xs font-bold text-amber-400 group-hover:text-amber-300 font-mono">
                  SRAM[0x0100] == 0xFF
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Megáll ha 255 (0xFF) kerül a 0x0100 SRAM rekeszbe.</div>
              </button>

              <button
                onClick={() => {
                  setSelectedTargetType('io_register');
                  setSelectedRegister('PORTB');
                  setCondition('ON_WRITE');
                  setNameInput('PORTB írás figyelő (D8-D13)');
                }}
                className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 rounded-xl text-left transition group"
              >
                <div className="text-xs font-bold text-blue-400 group-hover:text-blue-300 font-mono">
                  PORTB Írás Figyelés
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Megáll minden alkalommal mikor a PORTB (LED/kimenetek) íródik.</div>
              </button>

              <button
                onClick={() => {
                  setSelectedTargetType('io_register');
                  setSelectedRegister('SP');
                  setCondition('LESS_EQUAL');
                  setExpectedValHex('0x0700');
                  setNameInput('Stack Pointer SP <= 0x0700');
                }}
                className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-500/50 rounded-xl text-left transition group"
              >
                <div className="text-xs font-bold text-rose-400 group-hover:text-rose-300 font-mono">
                  SP Mély Stack Riasztás
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Megáll ha a Stack túlzottan mélyre nő (lehetséges ütközés).</div>
              </button>
            </div>
          </div>

          {/* Add New Watchpoint Builder Form */}
          <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4 space-y-3.5">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-400" /> Új Watchpoint Létrehozása
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Target Type */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Célpont Típusa</label>
                <select
                  value={selectedTargetType}
                  onChange={(e) => setSelectedTargetType(e.target.value as AvrWatchpointTargetType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="sram">SRAM Memóriarekesz</option>
                  <option value="io_register">I/O Regiszter (PORT, DDR, stb.)</option>
                  <option value="pin">Arduino Digitális Pin</option>
                </select>
              </div>

              {/* Target Selector */}
              {selectedTargetType === 'sram' ? (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">SRAM Cím (Hex)</label>
                  <input
                    type="text"
                    value={targetAddressHex}
                    onChange={(e) => setTargetAddressHex(e.target.value)}
                    placeholder="0x0100 - 0x08FF"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              ) : selectedTargetType === 'io_register' ? (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">I/O Regiszter</label>
                  <select
                    value={selectedRegister}
                    onChange={(e) => setSelectedRegister(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  >
                    {ATMEGA328P_IO_REGISTERS.map((reg) => (
                      <option key={reg.name} value={reg.name}>
                        {reg.name} (0x{reg.address.toString(16).toUpperCase()}) - {reg.description}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Arduino Pin</label>
                  <select
                    value={selectedPin}
                    onChange={(e) => setSelectedPin(e.target.value as ArduinoPin)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  >
                    {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'].map((p) => (
                      <option key={p} value={p}>
                        Pin D{p}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Condition */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Feltétel</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as AvrWatchpointCondition)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="EQUALS">Egyenlő (== Érték)</option>
                  <option value="ON_WRITE">Bármilyen Íráskor (Write)</option>
                  <option value="ON_CHANGE">Értékváltozáskor (Change)</option>
                  <option value="NOT_EQUALS">Nem Egyenlő (!= Érték)</option>
                  <option value="GREATER">Nagyobb mint (&gt;)</option>
                  <option value="LESS">Kisebb mint (&lt;)</option>
                  <option value="GREATER_EQUAL">Nagyobb-egyenlő (&gt;=)</option>
                  <option value="LESS_EQUAL">Kisebb-egyenlő (&lt;=)</option>
                  <option value="BIT_SET">Adott Bit 1-re Vált</option>
                  <option value="BIT_CLEARED">Adott Bit 0-ra Vált</option>
                </select>
              </div>

              {/* Expected Value or Bit */}
              <div>
                {condition === 'BIT_SET' || condition === 'BIT_CLEARED' ? (
                  <>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Bit Index (0-7)</label>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      value={bitIndex}
                      onChange={(e) => setBitIndex(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </>
                ) : condition !== 'ON_WRITE' && condition !== 'ON_READ' && condition !== 'ON_CHANGE' ? (
                  <>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Elvárt Érték (Hex/Dec)</label>
                    <input
                      type="text"
                      value={expectedValHex}
                      onChange={(e) => setExpectedValHex(e.target.value)}
                      placeholder="pl. 0xFF vagy 255"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Egyéni Elnevezés</label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Opcionális címke..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleAddWatchpoint}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow transition"
              >
                <Plus className="w-4 h-4" /> Watchpoint Hozzáadása
              </button>
            </div>
          </div>

          {/* Active Watchpoints List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Aktív Watchpointok ({watchpointState.watchpoints.length})
              </span>
            </div>

            {watchpointState.watchpoints.length === 0 ? (
              <div className="p-8 text-center bg-slate-800/30 border border-slate-800 rounded-xl text-slate-500 text-xs">
                Nincsenek aktív watchpointok beállítva. Adj hozzá egyet a fenti panelen vagy válassz a gyors mintákból!
              </div>
            ) : (
              <div className="space-y-2">
                {watchpointState.watchpoints.map((wp) => (
                  <div
                    key={wp.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition ${
                      wp.enabled
                        ? 'bg-slate-800/90 border-slate-700 hover:border-slate-600'
                        : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={wp.enabled}
                        onChange={() => handleToggle(wp.id)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700 cursor-pointer"
                      />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{wp.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                            {wp.condition} {wp.expectedValue !== undefined ? `0x${wp.expectedValue.toString(16).toUpperCase()}` : ''}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {wp.targetType === 'sram' && `SRAM Cím: 0x${wp.targetAddress?.toString(16).toUpperCase().padStart(4, '0')}`}
                          {wp.targetType === 'io_register' && `I/O Regiszter: ${wp.targetRegister}`}
                          {wp.targetType === 'pin' && `Pin: D${wp.targetPin}`}
                          {wp.hitCount > 0 && (
                            <span className="ml-2 text-amber-400 font-semibold">
                              • Találatok: {wp.hitCount}x
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(wp.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition"
                      title="Törlés"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hit History Log */}
          {watchpointState.hitHistory.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" /> Találati Napló (Watchpoint Hit Log)
                </span>
                <button
                  onClick={onClearHitHistory}
                  className="text-xs text-slate-500 hover:text-slate-300 transition"
                >
                  Napló Törlése
                </button>
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 max-h-40 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                {watchpointState.hitHistory.map((hit, idx) => (
                  <div key={idx} className="flex items-center justify-between text-slate-300 hover:bg-slate-900 p-1 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold">{hit.targetDescription}</span>
                      <span className="text-slate-500">@ PC: 0x{hit.pc.toString(16).toUpperCase()}</span>
                      <span className="text-emerald-400">[{hit.disassembled || 'ASM'}]</span>
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      0x{hit.oldValue.toString(16).toUpperCase()} → 0x{hit.newValue.toString(16).toUpperCase()} | Ciklus: #{hit.cycle}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-900/90">
          <div className="text-xs text-slate-400">
            Jelenlegi PC: <span className="font-mono text-amber-300">0x{currentPc.toString(16).toUpperCase()}</span> | Szimulált Ciklusok: <span className="font-mono text-white">{currentCycle.toLocaleString()}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
