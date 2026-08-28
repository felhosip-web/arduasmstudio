/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Silicon Lock Bit Protection & Flash Memory Readout Simulator
 * Real-time hardware lock mode enforcement, masked memory dumps, and physical Chip Erase simulation.
 */

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Terminal,
  Cpu,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { AvrFuseState } from '../types';
import {
  getLockBitSecurityInfo,
  isFlashReadLocked,
  simulateFlashRead,
  formatHexByte,
  setBit,
} from '../utils/avrFuseCalculator';

interface LockBitSimulatorProps {
  fuseState: AvrFuseState;
  onUpdateFuseState: (updater: (prev: AvrFuseState) => AvrFuseState) => void;
  flashMemory?: Uint8Array;
}

export const LockBitSimulator: React.FC<LockBitSimulatorProps> = ({
  fuseState,
  onUpdateFuseState,
  flashMemory,
}) => {
  const [readoutAttemptResult, setReadoutAttemptResult] = useState<{
    attempted: boolean;
    success: boolean;
    message: string;
    bytes: Uint8Array | null;
    timestamp: number;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Security status analysis
  const securityInfo = useMemo(() => {
    return getLockBitSecurityInfo(fuseState.lock);
  }, [fuseState.lock]);

  const isLocked = isFlashReadLocked(fuseState.lock);

  // Mock standard Arduino blink / bootloader hex if none provided
  const sampleFlash = useMemo(() => {
    if (flashMemory && flashMemory.length > 0) return flashMemory;
    const buf = new Uint8Array(256);
    // Fill with typical AVR opcode pattern
    for (let i = 0; i < buf.length; i++) {
      buf[i] = (i * 37 + 0x0c) & 0xff;
    }
    buf[0] = 0x0c;
    buf[1] = 0x94;
    buf[2] = 0x34;
    buf[3] = 0x00; // jmp 0x0034 (reset vector)
    return buf;
  }, [flashMemory]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Perform Simulated ISP Readout Test
  const handleTestReadout = () => {
    const res = simulateFlashRead(sampleFlash, fuseState.lock);
    setReadoutAttemptResult({
      attempted: true,
      success: res.success,
      message: res.message,
      bytes: res.bytes.slice(0, 128),
      timestamp: Date.now(),
    });

    if (res.success) {
      showToast('✓ ISP Kiolvasás Sikeres: A Flash memória hozzáférhető.');
    } else {
      showToast('🔒 Kiolvasás Megtagadva: A hardveres Lock bitek blokkolják az olvasást!');
    }
  };

  // Quick Lock Mode Setter
  const handleSetLockMode = (mode: 1 | 2 | 3) => {
    onUpdateFuseState((prev) => {
      let lock = prev.lock;
      if (mode === 1) {
        // Mode 1: LB=11 (Nyitott)
        lock = (lock & ~0x03) | 0x03;
      } else if (mode === 2) {
        // Mode 2: LB=10 (Írásvédelem)
        lock = (lock & ~0x03) | 0x02;
      } else if (mode === 3) {
        // Mode 3: LB=00 (Teljes védelem, írás és olvasás tiltva)
        lock = lock & ~0x03;
      }
      return { ...prev, lock };
    });

    setReadoutAttemptResult(null);
    showToast(`Lock Bit Állapot beállítva: Mode ${mode}`);
  };

  // Simulate Physical Chip Erase command
  const handleSimulateChipErase = () => {
    onUpdateFuseState((prev) => ({
      ...prev,
      lock: 0xff, // Reset lock byte to 0xFF (Mode 1)
    }));

    setReadoutAttemptResult({
      attempted: true,
      success: true,
      message: '⚡ Chip Erase (Teljes Törlés) sikeres: A Flash törlődött (0xFF), a Lock bitek feloldódtak (0xFF / Mode 1).',
      bytes: new Uint8Array(128).fill(0xff),
      timestamp: Date.now(),
    });

    showToast('⚡ Teljes Chip Törlés (Chip Erase) végrehajtva! Lock bitek feloldva.');
  };

  return (
    <div className="space-y-4 font-mono text-xs text-[#E0E0E6]">
      {/* HEADER BANNER WITH REAL HARDWARE LOCK STATUS */}
      <div
        className={`p-4 rounded-xs border shadow-[4px_4px_0px_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isLocked
            ? 'bg-rose-950/70 border-rose-500/80 text-rose-200'
            : securityInfo.isWriteProtected
            ? 'bg-amber-950/70 border-amber-500/80 text-amber-200'
            : 'bg-emerald-950/70 border-emerald-500/80 text-emerald-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xs bg-black/50 border border-current shadow-inner">
            {isLocked ? (
              <Lock className="w-6 h-6 text-rose-400 animate-pulse" />
            ) : (
              <Unlock className="w-6 h-6 text-emerald-400" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                {securityInfo.name}
              </h3>
              <span className="px-2 py-0.5 rounded-xs bg-black/60 font-mono text-[10px] border border-current font-bold">
                Lock Byte: 0x{formatHexByte(fuseState.lock)}
              </span>
            </div>
            <p className="text-[11px] opacity-90 mt-0.5">{securityInfo.descriptionHu}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleSimulateChipErase}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xs border border-rose-300 shadow-[2px_2px_0px_#000] cursor-pointer flex items-center gap-1.5 transition-colors text-[11px]"
            title="AVR Chip Erase: Törli a teljes memóriát és feloldja a Lock biteket"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ Chip Erase (Lock Feloldás)</span>
          </button>
        </div>
      </div>

      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div className="p-2.5 bg-[#161920] border border-cyan-500/60 text-cyan-300 rounded-xs text-xs font-mono animate-in fade-in flex items-center gap-2 shadow-[2px_2px_0px_#000]">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3 SILICON LOCK MODES SELECTOR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* MODE 1 */}
        <div
          onClick={() => handleSetLockMode(1)}
          className={`p-3 rounded-xs border cursor-pointer transition-all ${
            securityInfo.mode === 1
              ? 'bg-[#161920] border-emerald-400 ring-2 ring-emerald-500/40 shadow-[4px_4px_0px_#000]'
              : 'bg-[#12141A] border-[#2A2D35] hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-[11px]">Mode 1: Nyitott</span>
            <span className="text-[10px] text-emerald-400 font-bold">LB = 11</span>
          </div>
          <p className="text-[10px] text-[#8A8D98] mt-1.5 leading-relaxed">
            Nincs korlátozás. A Flash és EEPROM szabadon írható és kiolvasható ISP programozóval. (Arduino gyári állapot).
          </p>
          <div className="mt-2 text-[9px] text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Fejlesztéshez & teszteléshez</span>
          </div>
        </div>

        {/* MODE 2 */}
        <div
          onClick={() => handleSetLockMode(2)}
          className={`p-3 rounded-xs border cursor-pointer transition-all ${
            securityInfo.mode === 2
              ? 'bg-[#161920] border-amber-400 ring-2 ring-amber-500/40 shadow-[4px_4px_0px_#000]'
              : 'bg-[#12141A] border-[#2A2D35] hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-[11px]">Mode 2: Írásvédett</span>
            <span className="text-[10px] text-amber-400 font-bold">LB = 10</span>
          </div>
          <p className="text-[10px] text-[#8A8D98] mt-1.5 leading-relaxed">
            Flash és EEPROM programozás letiltva. A memória továbbra is kiolvasható és ellenőrizhető.
          </p>
          <div className="mt-2 text-[9px] text-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Véletlen felülírás ellen</span>
          </div>
        </div>

        {/* MODE 3 */}
        <div
          onClick={() => handleSetLockMode(3)}
          className={`p-3 rounded-xs border cursor-pointer transition-all ${
            securityInfo.mode === 3
              ? 'bg-[#161920] border-rose-400 ring-2 ring-rose-500/40 shadow-[4px_4px_0px_#000]'
              : 'bg-[#12141A] border-[#2A2D35] hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-[11px]">Mode 3: Másolásvédett</span>
            <span className="text-[10px] text-rose-400 font-bold">LB = 00</span>
          </div>
          <p className="text-[10px] text-[#8A8D98] mt-1.5 leading-relaxed">
            Hardveres szilícium védelem! Az ISP kiolvasás és írás teljesen blokkolva. A programkód nem másolható le.
          </p>
          <div className="mt-2 text-[9px] text-rose-300 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            <span>Kereskedelmi termékvédelem</span>
          </div>
        </div>
      </div>

      {/* HARDWARE ISP READOUT SIMULATION BENCH */}
      <div className="bg-[#12141A] border border-[#2A2D35] rounded-xs p-4 space-y-3 shadow-[4px_4px_0px_#000]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              Hardveres Flash Kiolvasási Szimulátor (ISP Readout Test)
            </h4>
          </div>

          <button
            onClick={handleTestReadout}
            className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xs border border-cyan-300 shadow-[2px_2px_0px_#000] cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Kiolvasási Kísérlet Futtatása (avrdude -U flash:r)</span>
          </button>
        </div>

        {/* Readout Output Box */}
        {readoutAttemptResult ? (
          <div
            className={`p-3 rounded-xs border space-y-2 font-mono text-[11px] ${
              readoutAttemptResult.success
                ? 'bg-[#0A0C10] border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/60 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span>{readoutAttemptResult.message}</span>
              <span className="text-[10px] text-[#8A8D98]">
                {new Date(readoutAttemptResult.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Memory Hex Dump Preview */}
            {readoutAttemptResult.bytes && (
              <div className="p-2 bg-black/60 rounded-xs border border-slate-800 space-y-1 font-mono text-[10px] overflow-x-auto custom-scrollbar">
                <div className="text-[#8A8D98] pb-1 border-b border-slate-800 flex justify-between">
                  <span>Cím</span>
                  <span>00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F</span>
                  <span>ASCII</span>
                </div>
                {Array.from({ length: Math.ceil(readoutAttemptResult.bytes.length / 16) }).map((_, rowIdx) => {
                  const offset = rowIdx * 16;
                  const slice = readoutAttemptResult.bytes!.slice(offset, offset + 16);
                  const addrStr = '0x' + offset.toString(16).padStart(4, '0').toUpperCase();
                  const bytesArray: number[] = Array.from(slice);
                  const hexStr = bytesArray
                    .map((b: number) => formatHexByte(b))
                    .join(' ');
                  const asciiStr = bytesArray
                    .map((b: number) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
                    .join('');

                  return (
                    <div key={rowIdx} className="flex justify-between hover:bg-slate-900/50 px-1 py-0.5">
                      <span className="text-cyan-400 font-bold">{addrStr}</span>
                      <span className={readoutAttemptResult.success ? 'text-white' : 'text-rose-400 font-bold'}>
                        {readoutAttemptResult.success ? hexStr : '[ZÁROLVA] 00 00 00 00 00 00 00 00 ...'}
                      </span>
                      <span className="text-slate-500">{readoutAttemptResult.success ? asciiStr : '........'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-[#0A0C10] border border-[#2A2D35] rounded-xs text-[#8A8D98] text-center text-[11px]">
            Kattints a "Kiolvasási Kísérlet Futtatása" gombra a hardveres Lock bit másolásvédelem teszteléséhez!
          </div>
        )}
      </div>

      {/* BOOTLOADER / APPLICATION SECTION PROTECTION DETAILS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
        <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs space-y-1">
          <div className="font-bold text-white flex items-center justify-between">
            <span>Alkalmazás Szakasz (Application Section):</span>
            <span className="text-cyan-400 font-bold">BLB0</span>
          </div>
          <p className="text-[10px] text-[#8A8D98]">{securityInfo.bootAppProtection}</p>
        </div>

        <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs space-y-1">
          <div className="font-bold text-white flex items-center justify-between">
            <span>Bootloader Szakasz (Boot Section):</span>
            <span className="text-amber-400 font-bold">BLB1</span>
          </div>
          <p className="text-[10px] text-[#8A8D98]">{securityInfo.bootBootProtection}</p>
        </div>
      </div>
    </div>
  );
};
