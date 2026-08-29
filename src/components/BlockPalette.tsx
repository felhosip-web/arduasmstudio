import React, { useState } from 'react';
import {
  Cpu,
  Clock,
  RefreshCw,
  Radio,
  Sparkles,
  Hash,
  Search,
  Plus,
  Zap,
  Info,
  ChevronRight,
  Sliders,
  Layers,
  Network,
  Boxes,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import { BLOCK_DEFINITIONS, CATEGORY_METADATA } from '../data/blockDefinitions';
import { BlockCategory, BlockDefinition, BlockScope, McuTarget, MCU_TARGETS } from '../types';
import { CYCLE_NS } from '../utils/hardwareMap';
import { ESP32_CYCLE_NS } from '../utils/esp32HardwareMap';

interface BlockPaletteProps {
  onAddBlock: (blockType: string, scope?: BlockScope) => void;
  activeScope: BlockScope;
  targetMcu?: McuTarget;
  onSelectTargetMcu?: (target: McuTarget) => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  esp32: Zap,
  io: Cpu,
  master_slave: Network,
  datastruct: Boxes,
  memory: HardDrive,
  modules: Layers,
  timing: Clock,
  analog: Sliders,
  protocol: Sparkles,
  flow: RefreshCw,
  interrupt: Radio,
  math: Hash,
};

export const BlockPalette: React.FC<BlockPaletteProps> = ({
  onAddBlock,
  activeScope,
  targetMcu = 'avr',
  onSelectTargetMcu,
}) => {
  const isEsp32 = targetMcu === 'esp32';
  const currentCycleNs = isEsp32 ? ESP32_CYCLE_NS : CYCLE_NS;
  const currentMcuInfo = MCU_TARGETS[targetMcu];

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const allDefinitions = Object.values(BLOCK_DEFINITIONS);

  const filteredDefinitions = allDefinitions.filter((def) => {
    const matchesCategory = selectedCategory === 'all' || def.category === selectedCategory;
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchesName = def.name.toLowerCase().includes(query);
    const matchesDesc = def.shortDesc.toLowerCase().includes(query);
    const matchesType = def.type.toLowerCase().includes(query);
    return matchesName || matchesDesc || matchesType;
  });

  return (
    <aside
      id="block-palette"
      className="w-full lg:w-80 xl:w-88 flex flex-col bg-[#161920] border-r border-[#2A2D35] h-full select-none"
    >
      {/* Header & MCU Selector */}
      <div className="p-4 border-b border-[#2A2D35] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isEsp32
                  ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]'
                  : 'bg-[#4ade80] shadow-[0_0_8px_#4ade80]'
              }`}
            />
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#E0E0E6]">
              Modul Könyvtár
            </h2>
          </div>
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-xs border shadow-[1px_1px_0px_#000] ${
              isEsp32
                ? 'text-sky-300 bg-sky-950/60 border-sky-500/40'
                : 'text-[#4ade80] bg-[#1A1D24] border-[#3A3F4B]'
            }`}
          >
            {allDefinitions.length} MODUL
          </span>
        </div>

        {/* MCU Target Quick Toggle */}
        {onSelectTargetMcu && (
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0F1115] rounded-xs border border-[#2A2D35]">
            <button
              id="palette-toggle-avr"
              onClick={() => onSelectTargetMcu('avr')}
              className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-xs text-[10px] font-mono font-bold uppercase transition-all ${
                !isEsp32
                  ? 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
                  : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
              }`}
            >
              <Cpu className="w-3 h-3" />
              <span>AVR 16MHz</span>
            </button>
            <button
              id="palette-toggle-esp32"
              onClick={() => onSelectTargetMcu('esp32')}
              className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-xs text-[10px] font-mono font-bold uppercase transition-all ${
                isEsp32
                  ? 'bg-sky-400 text-black shadow-[1px_1px_0px_#000]'
                  : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>ESP32 240MHz</span>
            </button>
          </div>
        )}

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#8A8D98] absolute left-2.5 top-2.5 pointer-events-none" />
          <input
            id="palette-search-input"
            type="text"
            placeholder={
              isEsp32
                ? 'Keresés (pl. W1TS, Touch, DAC, FreeRTOS, WiFi)...'
                : 'Keresés (pl. SBI, NOP, LED, delay)...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-8 pr-3 py-1.5 bg-[#1A1D24] border rounded-xs text-xs text-[#E0E0E6] placeholder-[#8A8D98] focus:outline-none transition-colors shadow-[2px_2px_0px_#000] ${
              isEsp32
                ? 'border-[#3A3F4B] hover:border-sky-400 focus:border-sky-400'
                : 'border-[#3A3F4B] hover:border-[#4ade80] focus:border-[#4ade80]'
            }`}
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1 pt-1 max-h-32 overflow-y-auto custom-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xs transition-all shadow-[1px_1px_0px_#000] ${
              selectedCategory === 'all'
                ? isEsp32 ? 'bg-sky-400 text-black' : 'bg-[#4ade80] text-black'
                : 'bg-[#1A1D24] text-[#8A8D98] hover:text-[#E0E0E6] border border-[#3A3F4B]'
            }`}
          >
            Mind ({allDefinitions.length})
          </button>
          {Object.entries(CATEGORY_METADATA).map(([catKey, meta]) => {
            const count = allDefinitions.filter((d) => d.category === catKey).length;
            const IconComp = CATEGORY_ICONS[catKey] || Cpu;
            const isCatSelected = selectedCategory === catKey;
            const isEspCat = catKey === 'esp32';

            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xs transition-all shadow-[1px_1px_0px_#000] ${
                  isCatSelected
                    ? isEspCat || isEsp32 ? 'bg-sky-400 text-black' : 'bg-[#4ade80] text-black'
                    : isEspCat
                    ? 'bg-sky-950/40 text-sky-300 border border-sky-500/40 hover:border-sky-400'
                    : 'bg-[#1A1D24] text-[#8A8D98] hover:text-[#E0E0E6] border border-[#3A3F4B]'
                }`}
                title={meta.description}
              >
                <IconComp className="w-3 h-3" />
                <span>{meta.label.split(' ')[1]}</span>
                <span className="text-[9px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Scope & Hardware Architecture indicator */}
      <div className="px-4 py-2 bg-[#0F1115] border-b border-[#2A2D35] flex items-center justify-between text-[10px] font-mono text-[#8A8D98]">
        <span className="flex items-center gap-1">
          <span>ARCHITEKTÚRA:</span>
          <strong className={isEsp32 ? 'text-sky-400' : 'text-[#4ade80]'}>
            {isEsp32 ? 'ESP32 (240MHz)' : 'AVR (16MHz)'}
          </strong>
        </span>
        <span className="font-bold uppercase flex items-center gap-1 text-white">
          <ChevronRight className="w-3 h-3 text-[#8A8D98]" />
          {activeScope === 'setup' ? 'Setup()' : activeScope === 'loop' ? 'Loop()' : 'ISR()'}
        </span>
      </div>

      {/* Blocks List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {filteredDefinitions.length === 0 ? (
          <div className="text-center py-8 text-[#8A8D98] text-xs font-mono">
            Nincs a keresésnek megfelelő modul.
          </div>
        ) : (
          filteredDefinitions.map((def) => {
            const sampleCycles = isEsp32 && def.category === 'esp32'
              ? def.calculateCycles(def.defaultParams)
              : isEsp32
              ? Math.max(1, Math.round(def.calculateCycles(def.defaultParams) * 0.8))
              : def.calculateCycles(def.defaultParams);

            const timeNs = sampleCycles * currentCycleNs;
            const timeFormatted =
              timeNs < 1000
                ? `${timeNs.toFixed(1)} ns`
                : `${(timeNs / 1000).toFixed(2)} µs`;

            const sampleC = def.generateC(def.defaultParams)[0] || '';
            const IconComp = CATEGORY_ICONS[def.category] || Cpu;
            const isEspBlock = def.category === 'esp32';

            return (
              <div
                key={def.type}
                id={`palette-block-${def.type}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    'text/plain',
                    JSON.stringify({ blockType: def.type, category: def.category })
                  );
                }}
                className={`group relative node-card rounded-xs p-3 transition-all cursor-grab active:cursor-grabbing shadow-[2px_2px_0px_#000] ${
                  isEspBlock
                    ? 'border-sky-500/40 hover:border-sky-400 bg-[#141923]'
                    : 'border-[#2A2D35] hover:border-[#4ade80] bg-[#161920]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-xs flex items-center justify-center shrink-0 mt-0.5 text-black font-bold shadow-[1px_1px_0px_#000] ${
                        isEspBlock ? 'bg-sky-400' : 'bg-[#4ade80]'
                      }`}
                    >
                      <IconComp className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <div
                        className={`text-[9px] font-bold uppercase tracking-wider font-mono ${
                          isEspBlock ? 'text-sky-400' : 'text-[#4ade80]'
                        }`}
                      >
                        {isEspBlock ? '⚡ ESP32 XTENSA' : `${def.category.toUpperCase()} MODUL`}
                      </div>
                      <h4 className="text-xs font-bold text-[#E0E0E6] group-hover:text-white transition-colors">
                        {def.name}
                      </h4>
                      <p className="text-[11px] text-[#8A8D98] leading-tight mt-0.5">
                        {def.shortDesc}
                      </p>
                    </div>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={() => onAddBlock(def.type, activeScope)}
                    className={`p-1 rounded-xs border transition-all shadow-[1px_1px_0px_#000] shrink-0 ${
                      isEspBlock
                        ? 'bg-[#1A1D24] hover:bg-sky-400 text-[#E0E0E6] hover:text-black border-[#3A3F4B] hover:border-sky-400'
                        : 'bg-[#161920] hover:bg-[#4ade80] text-[#E0E0E6] hover:text-black border-[#3A3F4B] hover:border-[#4ade80]'
                    }`}
                    title={`Hozzáadás a ${activeScope} szakaszhoz (Drag & Drop is támogatott)`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Metrics Badges: Cycles & Exact Nanosecond Timing & C-equivalent */}
                <div className="mt-2.5 pt-2 border-t border-[#2A2D35] flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono">
                  <span className="inline-flex items-center gap-1 font-bold text-amber-300 bg-[#0F1115] px-1.5 py-0.5 rounded-xs border border-[#3A3F4B]">
                    <Clock className="w-2.5 h-2.5 text-amber-400" />
                    {sampleCycles} ciklus ({timeFormatted})
                  </span>

                  <span
                    className="inline-flex items-center gap-1 text-orange-300 truncate max-w-[140px] bg-[#0F1115] px-1.5 py-0.5 rounded-xs border border-[#3A3F4B]"
                    title={sampleC}
                  >
                    <span className="text-[9px] text-[#8A8D98]">C:</span>
                    <span className="truncate">{sampleC.replace('// C kód:', '').replace('//', '').trim()}</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
