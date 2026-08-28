/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Fixed Application Footer Component
 * Displays real-time main cycle (loop) execution timing on the left and semantic version on the right.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Cpu, Activity, Zap, Sparkles } from 'lucide-react';
import { ProgramBlock, VariableDefinition, McuTarget, MCU_TARGETS } from '../types';
import { getVersionInfo, subscribeToVersionUpdates, VersionInfo } from '../utils/versionManager';
import { profileProgramTiming, CpuFrequencyMhz } from '../utils/timingProfiler';

interface FooterProps {
  blocks: ProgramBlock[];
  variables?: VariableDefinition[];
  targetMcu?: McuTarget;
  onOpenTimingProfiler?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  blocks,
  variables = [],
  targetMcu = 'avr',
  onOpenTimingProfiler,
}) => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo>(() => getVersionInfo());
  const isEsp32 = targetMcu === 'esp32';
  const mcuInfo = MCU_TARGETS[targetMcu];

  useEffect(() => {
    return subscribeToVersionUpdates((newInfo) => {
      setVersionInfo(newInfo);
    });
  }, []);

  // Compute the total execution time of the main cycle (loop scope)
  const loopTimingData = useMemo(() => {
    const loopBlocks = blocks.filter((b) => b.enabled !== false && b.scope === 'loop');
    if (loopBlocks.length === 0) {
      return {
        hasProgram: false,
        timeFormatted: '---',
        cyclesFormatted: '---',
        frequencyFormatted: '---',
        cycles: 0,
        blockCount: 0,
      };
    }

    const freq: CpuFrequencyMhz = isEsp32 ? 240 : 16;
    const voltage = isEsp32 ? 3.3 : 5.0;
    const report = profileProgramTiming(blocks, freq, voltage, variables);
    return {
      hasProgram: report.loopTiming.blockCount > 0,
      timeFormatted: report.loopTiming.totalTimeFormatted,
      cyclesFormatted: `${report.loopTiming.totalCycles.toLocaleString('hu-HU')} ciklus`,
      frequencyFormatted: report.loopFrequencyFormatted,
      cycles: report.loopTiming.totalCycles,
      blockCount: report.loopTiming.blockCount,
      blockingDelayPercentage: report.blockingDelayPercentage,
    };
  }, [blocks, variables, isEsp32]);

  return (
    <footer
      id="app-fixed-footer"
      className="h-8 bg-[#0B0D11] border-t border-[#2A2D35] px-3 flex items-center justify-between z-30 shrink-0 select-none text-xs text-[#8A8D98]"
    >
      {/* Left side: Main cycle (loop) execution time / --- line */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          onClick={onOpenTimingProfiler}
          className={`flex items-center gap-2 py-0.5 px-2 rounded-xs border transition-colors cursor-pointer ${
            loopTimingData.hasProgram
              ? isEsp32
                ? 'bg-[#0f172a] border-sky-900/60 hover:border-sky-400/60 text-white'
                : 'bg-[#14181F] border-[#2A3444] hover:border-[#4ade80]/60 text-white'
              : 'bg-[#101217] border-[#20232B] hover:border-[#3A3F4B] text-[#8A8D98]'
          }`}
          title={
            loopTimingData.hasProgram
              ? `Főciklus (loop) összesített futásideje ${mcuInfo.clockMhz} MHz órajelen (${isEsp32 ? 'ESP32 Xtensa Dual-Core' : 'ATmega328P'}). Kattints a profilozóhoz!`
              : 'Nincs aktív blokk a főciklusban (loop). Adjon hozzá blokkokat a futásidő számításához.'
          }
        >
          <Clock
            className={`w-3.5 h-3.5 shrink-0 ${
              loopTimingData.hasProgram ? (isEsp32 ? 'text-sky-400' : 'text-[#4ade80]') : 'text-[#606470]'
            }`}
          />

          <span className="text-[11px] font-semibold text-[#8A8D98] whitespace-nowrap">
            Főciklus futásidő:
          </span>

          {loopTimingData.hasProgram ? (
            <div className="flex items-center gap-1.5">
              <span
                id="footer-main-cycle-time"
                className={`font-mono font-bold text-xs tracking-tight ${
                  isEsp32 ? 'text-sky-400' : 'text-[#4ade80]'
                }`}
              >
                {loopTimingData.timeFormatted}
              </span>
              <span className="hidden sm:inline font-mono text-[10px] text-[#A0A4B0] bg-[#1A1E26] px-1.5 py-0.2 rounded-xs border border-[#2D333F]">
                {loopTimingData.cyclesFormatted}
              </span>
              {loopTimingData.frequencyFormatted && (
                <span className="hidden md:inline font-mono text-[10px] text-sky-300 bg-sky-950/60 px-1.5 py-0.2 rounded-xs border border-sky-500/30">
                  {loopTimingData.frequencyFormatted}
                </span>
              )}
            </div>
          ) : (
            <span
              id="footer-main-cycle-time-empty"
              className="font-mono font-bold text-[#555866] text-xs tracking-widest"
            >
              ---
            </span>
          )}
        </div>

        {/* Small subtle indicator on target MCU */}
        <div className="hidden lg:flex items-center gap-1 text-[10px] font-mono text-[#6A6E7C] pl-2 border-l border-[#1F222B]">
          <Activity
            className={`w-3 h-3 ${isEsp32 ? 'text-sky-400' : 'text-[#4ade80]/60'}`}
          />
          <span className={isEsp32 ? 'text-sky-300' : ''}>
            {isEsp32 ? 'ESP32 @ 240 MHz (Xtensa Dual-Core)' : 'ATmega328P @ 16 MHz'}
          </span>
        </div>
      </div>

      {/* Right side: Current semantic version tag */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          id="footer-version-tag"
          className="flex items-center gap-1.5 bg-[#14181F] px-2 py-0.5 rounded-xs border border-[#2A2D35] text-[#C5C8D4] font-mono text-[11px] hover:border-[#3A3F4B] transition-colors"
          title={`ArduASM & ESP32 Studio: ${versionInfo.semver} (Build #${versionInfo.buildNumber}) | ${versionInfo.engine}`}
        >
          <Cpu className="w-3 h-3 text-sky-400" />
          <span className="font-semibold text-white">{versionInfo.displayTag}</span>
        </div>
      </div>
    </footer>
  );
};
