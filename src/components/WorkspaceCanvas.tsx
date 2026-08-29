import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Clock,
  Code2,
  Cpu,
  Layers,
  Settings,
  HelpCircle,
  Plus,
  Play,
  RotateCcw,
  Zap,
  AlertTriangle,
  AlertCircle,
  Wrench,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
  Sliders,
  Activity,
  Tv,
  Eye,
  EyeOff,
  Tag,
} from 'lucide-react';
import {
  ProgramBlock,
  BlockScope,
  ArduinoPin,
  RenderEngineConfig,
  RenderEngineTelemetry,
  VariableDefinition,
  McuTarget,
  MCU_TARGETS,
} from '../types';
import { BLOCK_DEFINITIONS } from '../data/blockDefinitions';
import { ARDUINO_PINS_ORDER, PIN_MAPPINGS, CYCLE_NS } from '../utils/hardwareMap';
import { ESP32_PINS_ORDER, ESP32_PIN_MAPPINGS, ESP32_CYCLE_NS, Esp32PinName } from '../utils/esp32HardwareMap';
import { validateBlockProgram, BlockValidationIssue } from '../utils/blockValidator';
import { ValidationBanner } from './ValidationBanner';
import { getCanvasBackgroundStyle, telemetryEngine, saveRenderEngineConfig } from '../utils/renderEngine';
import { CodeAssistantPanel, VariableQuickPicker } from './CodeAssistantPanel';
import { BlockDeleteModal } from './BlockDeleteModal';

interface WorkspaceCanvasProps {
  blocks: ProgramBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<ProgramBlock[]>>;
  activeScope: BlockScope;
  setActiveScope: (scope: BlockScope) => void;
  activeExecutingBlockId?: string;
  onAddBlock: (blockType: string, scope: BlockScope) => void;
  renderConfig?: RenderEngineConfig;
  setRenderConfig?: React.Dispatch<React.SetStateAction<RenderEngineConfig>>;
  onOpenRenderEngine?: () => void;
  variables?: VariableDefinition[];
  setVariables?: React.Dispatch<React.SetStateAction<VariableDefinition[]>>;
  lastAddedBlockId?: string | null;
  onOpenVariableEditor?: () => void;
  selectedBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
  isAvrDocsOpen?: boolean;
  onToggleAvrDocs?: () => void;
  targetMcu?: McuTarget;
  onSelectTargetMcu?: (target: McuTarget) => void;
}

export const WorkspaceCanvas: React.FC<WorkspaceCanvasProps> = ({
  blocks,
  setBlocks,
  activeScope,
  setActiveScope,
  activeExecutingBlockId,
  onAddBlock,
  renderConfig,
  setRenderConfig,
  onOpenRenderEngine,
  variables = [],
  setVariables,
  lastAddedBlockId,
  onOpenVariableEditor,
  selectedBlockId,
  onSelectBlock,
  isAvrDocsOpen,
  onToggleAvrDocs,
  targetMcu = 'avr',
  onSelectTargetMcu,
}) => {
  const isEsp32 = targetMcu === 'esp32';
  const currentCycleNs = isEsp32 ? ESP32_CYCLE_NS : CYCLE_NS;
  const currentMcuInfo = MCU_TARGETS[targetMcu];

  const currentScopeBlocks = blocks.filter((b) => b.scope === activeScope);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const [telemetry, setTelemetry] = useState<RenderEngineTelemetry>(telemetryEngine.getSnapshot());
  const [isAssistantEnabled, setIsAssistantEnabled] = useState<boolean>(true);
  const [blockToDelete, setBlockToDelete] = useState<ProgramBlock | null>(null);

  // Drag and drop reordering state
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below'>('below');

  useEffect(() => {
    if (!renderConfig?.renderDebugOverlay) return;
    const unsub = telemetryEngine.subscribe((tele) => {
      setTelemetry(tele);
    });
    return unsub;
  }, [renderConfig?.renderDebugOverlay]);

  // Run comprehensive program validation across all blocks & hardware bindings
  const validationReport = useMemo(() => validateBlockProgram(blocks), [blocks]);

  const handleZoomChange = (delta: number) => {
    if (!setRenderConfig) return;
    setRenderConfig((prev) => {
      const nextZoom = Math.min(Math.max(Math.round((prev.zoomLevel + delta) * 100) / 100, 0.5), 2.0);
      const next = { ...prev, zoomLevel: nextZoom };
      saveRenderEngineConfig(next);
      return next;
    });
  };

  const handleResetZoom = () => {
    if (!setRenderConfig) return;
    setRenderConfig((prev) => {
      const next = { ...prev, zoomLevel: 1.0 };
      saveRenderEngineConfig(next);
      return next;
    });
  };

  const handleFocusBlock = (blockId: string) => {
    const targetBlock = blocks.find((b) => b.id === blockId);
    if (targetBlock && targetBlock.scope !== activeScope) {
      setActiveScope(targetBlock.scope);
    }
    setTimeout(() => {
      const el = document.getElementById(`canvas-block-${blockId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-amber-400');
        setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 2000);
      }
    }, 100);
  };

  const handleDrop = (e: React.DragEvent, targetBlockId?: string, pos?: 'above' | 'below') => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverBlockId(null);

    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;

      const parsed = JSON.parse(rawData);

      // Scenario A: Canvas internal block reordering
      if (parsed.internalBlockId) {
        const sourceId = parsed.internalBlockId;
        if (targetBlockId && sourceId !== targetBlockId) {
          const sourceIdx = blocks.findIndex((b) => b.id === sourceId);
          const targetIdx = blocks.findIndex((b) => b.id === targetBlockId);
          if (sourceIdx !== -1 && targetIdx !== -1) {
            const nextBlocks = [...blocks];
            const [movedBlock] = nextBlocks.splice(sourceIdx, 1);
            // Re-find target index after removal
            const insertIdx = nextBlocks.findIndex((b) => b.id === targetBlockId);
            const finalPos = pos === 'above' ? insertIdx : insertIdx + 1;
            nextBlocks.splice(finalPos, 0, movedBlock);
            setBlocks(nextBlocks);
          }
        }
        setDraggedBlockId(null);
        return;
      }

      // Scenario B: Drop from Palette onto canvas or specific block position
      if (parsed.blockType) {
        if (targetBlockId) {
          const targetIdx = blocks.findIndex((b) => b.id === targetBlockId);
          const newBlock: ProgramBlock = {
            id: `b_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: parsed.blockType,
            scope: activeScope,
            params: { ...BLOCK_DEFINITIONS[parsed.blockType]?.defaultParams },
          };
          const nextBlocks = [...blocks];
          const insertIdx = pos === 'above' ? targetIdx : targetIdx + 1;
          nextBlocks.splice(insertIdx, 0, newBlock);
          setBlocks(nextBlocks);
        } else {
          onAddBlock(parsed.blockType, activeScope);
        }
      }
    } catch (err) {
      // ignore parse errors
    }
    setDraggedBlockId(null);
  };

  const updateParam = (blockId: string, paramKey: string, value: any) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, params: { ...b.params, [paramKey]: value } } : b))
    );
  };

  const toggleBlockEnabled = (blockId: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, enabled: b.enabled === false ? true : false } : b))
    );
  };

  const duplicateBlock = (block: ProgramBlock) => {
    const newBlock: ProgramBlock = {
      ...block,
      id: `b_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      params: { ...block.params },
    };
    const index = blocks.findIndex((b) => b.id === block.id);
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const scopeIndices = blocks
      .map((b, idx) => (b.scope === activeScope ? idx : -1))
      .filter((idx) => idx !== -1);

    const currentGlobalIdx = blocks.findIndex((b) => b.id === blockId);
    const currentScopePos = scopeIndices.indexOf(currentGlobalIdx);

    if (direction === 'up' && currentScopePos > 0) {
      const targetGlobalIdx = scopeIndices[currentScopePos - 1];
      const newBlocks = [...blocks];
      const temp = newBlocks[currentGlobalIdx];
      newBlocks[currentGlobalIdx] = newBlocks[targetGlobalIdx];
      newBlocks[targetGlobalIdx] = temp;
      setBlocks(newBlocks);
    } else if (direction === 'down' && currentScopePos < scopeIndices.length - 1) {
      const targetGlobalIdx = scopeIndices[currentScopePos + 1];
      const newBlocks = [...blocks];
      const temp = newBlocks[currentGlobalIdx];
      newBlocks[currentGlobalIdx] = newBlocks[targetGlobalIdx];
      newBlocks[targetGlobalIdx] = temp;
      setBlocks(newBlocks);
    }
  };

  const deleteBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const clearCurrentScope = () => {
    if (window.confirm(`Biztosan törölni szeretnéd a(z) '${activeScope}' szakasz összes modulját?`)) {
      setBlocks((prev) => prev.filter((b) => b.scope !== activeScope));
    }
  };

  // Scope summary calculations with active MCU architecture clock
  const totalScopeCycles = currentScopeBlocks.reduce((sum, b) => {
    if (b.enabled === false) return sum;
    const def = BLOCK_DEFINITIONS[b.type];
    if (!def) return sum;
    if (isEsp32 && def.category === 'esp32') {
      return sum + def.calculateCycles(b.params);
    }
    if (isEsp32) {
      return sum + Math.max(1, Math.round(def.calculateCycles(b.params) * 0.8));
    }
    return sum + def.calculateCycles(b.params);
  }, 0);

  const scopeTimeNs = totalScopeCycles * currentCycleNs;
  const formattedTime =
    scopeTimeNs < 1000
      ? `${scopeTimeNs.toFixed(1)} ns`
      : scopeTimeNs < 1000000
      ? `${(scopeTimeNs / 1000).toFixed(2)} µs`
      : `${(scopeTimeNs / 1000000).toFixed(2)} ms`;

  const loopFrequency =
    scopeTimeNs > 0
      ? scopeTimeNs < 1000
        ? `${(1000000000 / scopeTimeNs / 1000000).toFixed(2)} MHz`
        : scopeTimeNs < 1000000
        ? `${(1000000 / (scopeTimeNs / 1000) / 1000).toFixed(1)} kHz`
        : `${(1000 / (scopeTimeNs / 1000000)).toFixed(1)} Hz`
      : '0 Hz';

  // Background style based on render engine configuration
  const bgStyle = useMemo(() => {
    return renderConfig ? getCanvasBackgroundStyle(renderConfig) : {};
  }, [renderConfig?.gridStyle, renderConfig?.gridSize, renderConfig?.zoomLevel]);

  // Compute CSS classes for CRT Shader, Phosphor glow, and color themes
  const canvasFxClasses = useMemo(() => {
    const list: string[] = [];
    if (renderConfig?.crtShader) list.push('crt-scanlines');
    if (renderConfig?.amberPhosphor) list.push('crt-amber');
    if (renderConfig?.matrixGreenPhosphor) list.push('crt-matrix');
    if (renderConfig?.bloomGlow) list.push('bloom-glow');
    return list.join(' ');
  }, [
    renderConfig?.crtShader,
    renderConfig?.amberPhosphor,
    renderConfig?.matrixGreenPhosphor,
    renderConfig?.bloomGlow,
  ]);

  const zoomScale = renderConfig?.zoomLevel || 1.0;

  return (
    <div
      id="workspace-canvas"
      className={`flex-1 flex flex-col border-r border-[#2A2D35] h-full overflow-hidden relative ${canvasFxClasses}`}
      style={bgStyle}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* On-Canvas Telemetry HUD (Live Kernel Debugger) */}
      {renderConfig?.renderDebugOverlay && (
        <div
          id="canvas-debug-hud"
          className="absolute top-14 right-4 z-20 bg-black/85 border border-[#4ade80]/60 rounded-xs p-2 text-xs font-mono text-[#E0E0E6] shadow-[0_0_15px_rgba(74,222,128,0.25)] space-y-1 select-none pointer-events-none"
        >
          <div className="flex items-center justify-between gap-3 text-[10px] text-[#4ade80] border-b border-[#2A2D35] pb-1 font-bold">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#4ade80] animate-pulse" />
              RENDER TELEMETRIA
            </span>
            <span>v2.4 KERNEL</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
            <div>
              FPS: <b className="text-[#4ade80]">{telemetry.fps}</b>
            </div>
            <div>
              Idő: <b className="text-cyan-400">{telemetry.frameTimeMs} ms</b>
            </div>
            <div>
              Zoom: <b>{Math.round(zoomScale * 100)}%</b>
            </div>
            <div>
              Modulok: <b>{currentScopeBlocks.length}</b>
            </div>
            <div>
              DOM Csomópont: <b>{telemetry.domNodeCount}</b>
            </div>
            <div>
              Memória: <b>~{telemetry.memoryEstimateMb} MB</b>
            </div>
          </div>
        </div>
      )}

      {/* Scope Navigation Tabs */}
      <div className="bg-[#161920] border-b border-[#2A2D35] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-1.5 p-1 bg-[#0F1115] rounded-xs border border-[#2A2D35] shadow-[2px_2px_0px_#000]">
          <button
            id="tab-scope-loop"
            onClick={() => setActiveScope('loop')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xs text-xs font-bold uppercase tracking-wider transition-all ${
              activeScope === 'loop'
                ? 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
                : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Fő Program (loop)</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-xs bg-[#0F1115] text-[#4ade80] font-mono border border-[#3A3F4B]">
              {blocks.filter((b) => b.scope === 'loop').length}
            </span>
          </button>

          <button
            id="tab-scope-setup"
            onClick={() => setActiveScope('setup')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xs text-xs font-bold uppercase tracking-wider transition-all ${
              activeScope === 'setup'
                ? 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
                : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Kezdeti Beállítás (setup)</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-xs bg-[#0F1115] text-[#4ade80] font-mono border border-[#3A3F4B]">
              {blocks.filter((b) => b.scope === 'setup').length}
            </span>
          </button>

          <button
            id="tab-scope-isr"
            onClick={() => setActiveScope('isr')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xs text-xs font-bold uppercase tracking-wider transition-all ${
              activeScope === 'isr'
                ? 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
                : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Megszakítás (ISR)</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-xs bg-[#0F1115] text-[#4ade80] font-mono border border-[#3A3F4B]">
              {blocks.filter((b) => b.scope === 'isr').length}
            </span>
          </button>
        </div>

        {/* Clear Button, Assistant Toggle, AVR Doku & Fast Engine Info */}
        <div className="flex items-center gap-2 flex-wrap">
          {onToggleAvrDocs && (
            <button
              id="btn-toggle-avr-docs"
              onClick={onToggleAvrDocs}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold font-mono rounded-xs border shadow-[2px_2px_0px_#000] transition-all cursor-pointer ${
                isAvrDocsOpen
                  ? 'bg-sky-500/20 text-sky-400 border-sky-400'
                  : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white hover:border-sky-500/50'
              }`}
              title="Lebegő AVR Utasítás & Datasheet Doku Panel Megnyitása"
            >
              <Cpu className={`w-3.5 h-3.5 ${isAvrDocsOpen ? 'text-sky-400 animate-pulse' : 'text-[#8A8D98]'}`} />
              <span className="hidden sm:inline">AVR Doku</span>
              <span className={`text-[9px] px-1 py-0.2 rounded-xs border font-bold ${
                isAvrDocsOpen ? 'bg-sky-950 text-sky-300 border-sky-500/40' : 'bg-[#0F1115] text-[#8A8D98] border-[#3A3F4B]'
              }`}>
                {isAvrDocsOpen ? 'NYITVA' : '⚡ 8-bit'}
              </span>
            </button>
          )}

          <button
            id="btn-toggle-assistant"
            onClick={() => setIsAssistantEnabled(!isAssistantEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold font-mono rounded-xs border shadow-[2px_2px_0px_#000] transition-all cursor-pointer ${
              isAssistantEnabled
                ? 'bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]'
                : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
            }`}
            title="Kód Segítő & Intelligens Változó Ajánló Ki/Bekapcsolása"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAssistantEnabled ? 'text-[#4ade80] animate-pulse' : 'text-[#8A8D98]'}`} />
            <span className="hidden sm:inline">Kód Segítő</span>
            <span className="text-[9px] px-1 py-0.2 rounded-xs bg-[#0F1115] border border-[#3A3F4B] font-bold">
              {isAssistantEnabled ? 'BE' : 'KI'}
            </span>
          </button>

          {currentScopeBlocks.length > 0 && (
            <button
              id="btn-clear-scope"
              onClick={clearCurrentScope}
              className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2.5 py-1 rounded-xs border border-rose-500/30 bg-[#1A1D24] shadow-[2px_2px_0px_#000] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Szakasz ürítése</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Block Validation & Diagnostics Banner */}
      <ValidationBanner
        report={validationReport}
        blocks={blocks}
        setBlocks={setBlocks}
        onFocusBlock={handleFocusBlock}
      />

      {/* Visual Timing Chronogram Bar */}
      <div className="bg-[#12151B] border-b border-[#2A2D35] px-4 py-2 flex flex-wrap items-center justify-between gap-3 font-mono text-xs z-10">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Cpu className={`w-4 h-4 ${isEsp32 ? 'text-sky-400' : 'text-[#4ade80]'}`} />
            <span className="text-[#8A8D98] uppercase text-[10px] font-bold">Hardver:</span>
            <span
              className={`px-2 py-0.5 rounded-xs font-bold text-[11px] border ${
                isEsp32
                  ? 'bg-sky-950/70 text-sky-300 border-sky-500/50'
                  : 'bg-emerald-950/70 text-[#4ade80] border-emerald-500/50'
              }`}
            >
              {currentMcuInfo.name} ({currentMcuInfo.clockSpeedMhz} MHz)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[#8A8D98] uppercase text-[10px] font-bold">Iteráció Idő:</span>
            <span className="text-amber-300 font-bold bg-[#0F1115] px-2 py-0.5 rounded-xs border border-[#3A3F4B]">
              {formattedTime}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[#8A8D98] uppercase text-[10px] font-bold">Frekvencia:</span>
            <span className="text-cyan-300 font-bold bg-[#0F1115] px-2 py-0.5 rounded-xs border border-[#3A3F4B]">
              {loopFrequency}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#8A8D98]" />
            <span className="text-[#8A8D98] uppercase text-[10px] font-bold">Ciklusok:</span>
            <span className="text-[#E0E0E6] font-bold bg-[#0F1115] px-2 py-0.5 rounded-xs border border-[#3A3F4B]">
              {totalScopeCycles} ({currentCycleNs.toFixed(2)} ns/ciklus)
            </span>
          </div>
        </div>

        <div className="text-[10px] text-[#8A8D98] italic flex items-center gap-1">
          <span>Húzd a kártyákat a rendezéshez (Drag & Drop)</span>
        </div>
      </div>

      {/* Canvas Scroll Area with Zoom Transformation Wrapper */}
      <div
        ref={canvasScrollRef}
        className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar relative"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e)}
      >
        <div
          id="canvas-scaled-content"
          style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: 'top left',
            width: zoomScale !== 1 ? `${(100 / zoomScale).toFixed(1)}%` : '100%',
            transition: renderConfig?.frameInterpolation ? 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          }}
          className="space-y-4"
        >

        {currentScopeBlocks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-[#2A2D35] rounded-xs bg-[#161920]/80 text-[#8A8D98] shadow-[4px_4px_0px_#000]">
            <div className="w-12 h-12 rounded-xs bg-[#1A1D24] border border-[#3A3F4B] flex items-center justify-center text-[#4ade80] mb-3 shadow-[2px_2px_0px_#000]">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#E0E0E6]">
              A(z) '{activeScope}' szakasz jelenleg üres
            </h3>
            <p className="text-xs text-[#8A8D98] max-w-md mt-1 mb-5">
              Húzz át egy modult a bal oldali palettáról, vagy kattints a gyors hozzáadás gombokra.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => onAddBlock(isEsp32 ? 'esp32_gpio_w1ts' : 'io_pin_mode', activeScope)}
                className={`px-3 py-1.5 bg-[#1A1D24] text-[#E0E0E6] text-xs font-medium rounded-xs border border-[#3A3F4B] flex items-center gap-1.5 shadow-[2px_2px_0px_#000] transition-colors ${
                  isEsp32 ? 'hover:border-sky-400' : 'hover:border-[#4ade80]'
                }`}
              >
                <Plus className={`w-3.5 h-3.5 ${isEsp32 ? 'text-sky-400' : 'text-[#4ade80]'}`} />
                <span>+ {isEsp32 ? 'ESP32 Atomi GPIO' : 'Láb Beállítás (DDR)'}</span>
              </button>
              <button
                onClick={() => onAddBlock(isEsp32 ? 'esp32_ccount_delay' : 'io_pin_write', activeScope)}
                className={`px-3 py-1.5 bg-[#1A1D24] text-[#E0E0E6] text-xs font-medium rounded-xs border border-[#3A3F4B] flex items-center gap-1.5 shadow-[2px_2px_0px_#000] transition-colors ${
                  isEsp32 ? 'hover:border-sky-400' : 'hover:border-[#4ade80]'
                }`}
              >
                <Plus className={`w-3.5 h-3.5 ${isEsp32 ? 'text-sky-400' : 'text-[#4ade80]'}`} />
                <span>+ {isEsp32 ? 'CCOUNT Késleltetés' : 'Digitális Írás (PORT)'}</span>
              </button>
              <button
                onClick={() => onAddBlock('timing_milli_delay', activeScope)}
                className="px-3 py-1.5 bg-[#1A1D24] hover:border-[#4ade80] text-[#E0E0E6] text-xs font-medium rounded-xs border border-[#3A3F4B] flex items-center gap-1.5 shadow-[2px_2px_0px_#000] transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Késleltetés (ms)</span>
              </button>
            </div>
          </div>
        ) : (
          currentScopeBlocks.map((block, index) => {
            const def = BLOCK_DEFINITIONS[block.type];
            if (!def) return null;

            let cycles = def.calculateCycles(block.params);
            if (isEsp32 && def.category !== 'esp32') {
              cycles = Math.max(1, Math.round(cycles * 0.8));
            }
            const blockTimeNs = cycles * currentCycleNs;
            const cLines = def.generateC(block.params);
            const asmLines = def.generateAsm(block.params, `b_${index + 1}`);
            const isExecuting = activeExecutingBlockId === block.id;
            const isSelected = selectedBlockId === block.id;
            const isDragged = draggedBlockId === block.id;
            const isDropTarget = dragOverBlockId === block.id;

            // Check if this specific block has any validation issues
            const blockIssues = validationReport.issuesByBlockId[block.id] || [];
            const hasError = blockIssues.some((i) => i.severity === 'error');
            const hasWarning = blockIssues.some((i) => i.severity === 'warning');
            const hasInfo = blockIssues.some((i) => i.severity === 'info');

            let cardBorderClasses = 'border-[#3A3F4B] border-l-[#4ade80] hover:border-[#4ade80] shadow-[4px_4px_0px_#000]';
            if (isEsp32) {
              cardBorderClasses = 'border-[#3A3F4B] border-l-sky-400 hover:border-sky-400 shadow-[4px_4px_0px_#000]';
            }
            if (isExecuting) {
              cardBorderClasses = 'border-[#4ade80] border-l-[#4ade80] ring-2 ring-[#4ade80]/40 shadow-[4px_4px_0px_#000] bg-[#1F232B]';
            } else if (isSelected) {
              cardBorderClasses = 'border-sky-400 border-l-sky-400 ring-2 ring-sky-400/50 shadow-[4px_4px_0px_#000] bg-[#151d28]';
            } else if (hasError) {
              cardBorderClasses = 'border-rose-500/60 border-l-rose-500 shadow-[4px_4px_0px_#000] bg-[#171114]';
            } else if (hasWarning) {
              cardBorderClasses = 'border-amber-500/60 border-l-amber-400 shadow-[4px_4px_0px_#000] bg-[#171410]';
            } else if (block.enabled === false) {
              cardBorderClasses = 'opacity-50 border-[#2A2D35] border-l-[#3A3F4B] bg-[#14161C]';
            }

            return (
              <div
                key={block.id}
                id={`canvas-block-${block.id}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', JSON.stringify({ internalBlockId: block.id }));
                  setDraggedBlockId(block.id);
                }}
                onDragEnd={() => {
                  setDraggedBlockId(null);
                  setDragOverBlockId(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const isAbove = e.clientY < rect.top + rect.height / 2;
                  setDragOverBlockId(block.id);
                  setDropPosition(isAbove ? 'above' : 'below');
                }}
                onDragLeave={() => {
                  if (dragOverBlockId === block.id) setDragOverBlockId(null);
                }}
                onDrop={(e) => handleDrop(e, block.id, dropPosition)}
                onClick={() => onSelectBlock?.(block.id)}
                className={`relative node-card rounded-xs border-l-4 transition-all cursor-move ${cardBorderClasses} ${
                  isDragged ? 'opacity-40 scale-[0.99]' : ''
                } ${
                  isDropTarget && dropPosition === 'above'
                    ? 'border-t-4 border-t-sky-400 pt-1'
                    : isDropTarget && dropPosition === 'below'
                    ? 'border-b-4 border-b-sky-400 pb-1'
                    : ''
                }`}
              >
                {/* Block Header */}
                <div className="px-4 py-2.5 border-b border-[#2A2D35] flex items-center justify-between gap-2 bg-[#161920]">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Circuit Connector Dot */}
                    <div className="connector -ml-6" />

                    {/* Drag Handle Icon */}
                    <span className="text-[#8A8D98] hover:text-white cursor-grab active:cursor-grabbing p-0.5" title="Húzd a sorrend módosításához">
                      <Sliders className="w-3 h-3 rotate-90" />
                    </span>

                    {/* Index Badge */}
                    <span
                      className={`w-5 h-5 rounded-xs bg-[#0F1115] border flex items-center justify-center text-[10px] font-mono font-bold shadow-[1px_1px_0px_#000] ${
                        hasError
                          ? 'border-rose-500 text-rose-400'
                          : hasWarning
                          ? 'border-amber-500 text-amber-400'
                          : isSelected
                          ? 'border-sky-400 text-sky-300'
                          : isEsp32
                          ? 'border-sky-500 text-sky-400'
                          : 'border-[#3A3F4B] text-[#4ade80]'
                      }`}
                    >
                      #{index + 1}
                    </span>

                    <div>
                      <div className="text-[9px] font-mono font-bold text-[#8A8D98] uppercase tracking-wider">
                        {def.category.toUpperCase()} / {def.type.toUpperCase()}
                      </div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                        <span>{def.name}</span>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-sky-950 bg-sky-300 px-1.5 py-0.2 rounded-xs shadow-[1px_1px_0px_#000]">
                            ⚡ KIJELÖLVE
                          </span>
                        )}
                        {isExecuting && (
                          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-black bg-[#4ade80] px-1.5 py-0.2 rounded-xs shadow-[1px_1px_0px_#000] animate-pulse">
                            <Play className="w-2.5 h-2.5 fill-current" /> AKTÍV
                          </span>
                        )}
                        {hasError && (
                          <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-rose-200 bg-rose-500/20 px-1.5 py-0.2 rounded-xs border border-rose-500/40">
                            <AlertCircle className="w-2.5 h-2.5 text-rose-400" /> HIBA
                          </span>
                        )}
                        {!hasError && hasWarning && (
                          <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-amber-200 bg-amber-500/20 px-1.5 py-0.2 rounded-xs border border-amber-500/40">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-400" /> FIGYELEM
                          </span>
                        )}
                      </h4>
                    </div>
                  </div>

                  {/* Actions: AVR/ESP Doku, Enable/Disable, Reorder, Duplicate, Delete */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      id={`btn-avr-doku-${block.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBlock?.(block.id);
                        if (!isAvrDocsOpen && onToggleAvrDocs) {
                          onToggleAvrDocs();
                        }
                      }}
                      className={`flex items-center gap-1 px-1.5 py-1 text-[10px] font-mono font-bold border rounded-xs transition-colors ${
                        isEsp32
                          ? 'text-sky-300 bg-sky-950/60 hover:bg-sky-900/80 border-sky-500/40'
                          : 'text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-500/40'
                      }`}
                      title={isEsp32 ? 'ESP32 / Xtensa Doku megnyitása' : 'AVR Gépi Utasítás & Datasheet Doku megnyitása'}
                    >
                      <Cpu className="w-3 h-3 text-sky-400" />
                      <span className="hidden sm:inline">{isEsp32 ? 'Xtensa Doku' : 'AVR Doku'}</span>
                    </button>
                    <button
                      onClick={() => toggleBlockEnabled(block.id)}
                      className={`p-1 rounded-xs transition-colors border ${
                        block.enabled === false
                          ? 'text-amber-400 bg-amber-950/40 border-amber-500/40 hover:bg-amber-900/60'
                          : 'text-[#8A8D98] hover:text-[#4ade80] hover:bg-[#1A1D24] border-transparent hover:border-[#3A3F4B]'
                      }`}
                      title={block.enabled === false ? 'Modul visszakapcsolása (Aktiválás)' : 'Modul ideiglenes letiltása (Inaktiválás)'}
                    >
                      {block.enabled === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => moveBlock(block.id, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded-xs text-[#8A8D98] hover:text-white disabled:opacity-20 hover:bg-[#1A1D24] border border-transparent hover:border-[#3A3F4B] transition-colors"
                      title="Mozgatás fel"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveBlock(block.id, 'down')}
                      disabled={index === currentScopeBlocks.length - 1}
                      className="p-1 rounded-xs text-[#8A8D98] hover:text-white disabled:opacity-20 hover:bg-[#1A1D24] border border-transparent hover:border-[#3A3F4B] transition-colors"
                      title="Mozgatás le"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => duplicateBlock(block)}
                      className="p-1 rounded-xs text-[#8A8D98] hover:text-[#4ade80] hover:bg-[#1A1D24] border border-transparent hover:border-[#3A3F4B] transition-colors"
                      title="Modul duplikálása"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`btn-delete-block-${block.id}`}
                      onClick={() => setBlockToDelete(block)}
                      className="p-1 rounded-xs text-[#8A8D98] hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/40 transition-colors"
                      title="Modul törlése és függőség-ellenőrzés"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Block Content Body */}
                <div className="p-4 space-y-3">
                  {/* IN-BLOCK VALIDATION ISSUES & QUICK FIXES ALERT */}
                  {blockIssues.length > 0 && (
                    <div className="space-y-2">
                      {blockIssues.map((issue) => (
                        <div
                          key={issue.id}
                          className={`p-2.5 rounded-xs border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-[1px_1px_0px_#000] ${
                            issue.severity === 'error'
                              ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                              : issue.severity === 'warning'
                              ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                              : 'bg-sky-950/40 border-sky-500/50 text-sky-200'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {issue.severity === 'error' ? (
                              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            )}
                            <div className="space-y-0.5">
                              <div className="font-bold text-white text-[11px] font-mono">
                                {issue.title}
                              </div>
                              <div className="text-[11px] opacity-90">{issue.message}</div>
                            </div>
                          </div>

                          {issue.quickFix && (
                            <button
                              onClick={() => {
                                const updated = issue.quickFix!.apply(blocks);
                                setBlocks(updated);
                              }}
                              className="self-start sm:self-center shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-black rounded-xs text-xs font-bold font-mono shadow-[1px_1px_0px_#000] transition-colors"
                              title={issue.quickFix.description}
                            >
                              <Wrench className="w-3 h-3" />
                              <span>{issue.quickFix.label}</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* SMART CODE ASSISTANT & VARIABLE RECOMMENDATIONS */}
                  {isAssistantEnabled && (
                    <CodeAssistantPanel
                      block={block}
                      variables={variables}
                      isRecentlyAdded={lastAddedBlockId === block.id}
                      onUpdateParams={(blockId, newParams, comment) => {
                        setBlocks((prev) =>
                          prev.map((b) =>
                            b.id === blockId
                              ? { ...b, params: newParams, comment: comment || b.comment }
                              : b
                          )
                        );
                      }}
                      onCreateVariable={(newVar) => {
                        if (setVariables) {
                          setVariables((prev) => [...prev, newVar]);
                        }
                      }}
                    />
                  )}

                  {/* Parameter Inputs Row with Adaptive ESP32 / AVR Hardware Mapping */}
                  {def.params.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-[#0F1115] p-3 rounded-xs border border-[#2A2D35] shadow-[2px_2px_0px_#000]">
                      {def.params.map((param) => {
                        const val = block.params[param.key] ?? param.defaultValue;

                        if (param.type === 'pin') {
                          return (
                            <div key={param.key} className="space-y-1">
                              <div className="text-[10px] font-mono font-bold text-[#8A8D98] uppercase flex items-center justify-between gap-1">
                                <span>{param.label}</span>
                                <div className="flex items-center gap-1.5">
                                  <VariableQuickPicker
                                    variables={variables}
                                    filterType="pin"
                                    onSelect={(selectedVal) => updateParam(block.id, param.key, selectedVal)}
                                  />
                                  {isEsp32 ? (
                                    ESP32_PIN_MAPPINGS[val as Esp32PinName] && (
                                      <span className="text-[10px] text-sky-400 font-mono">
                                        GPIO{ESP32_PIN_MAPPINGS[val as Esp32PinName].gpio}
                                      </span>
                                    )
                                  ) : (
                                    PIN_MAPPINGS[val as ArduinoPin] && (
                                      <span className="text-[10px] text-[#4ade80] font-mono">
                                        {PIN_MAPPINGS[val as ArduinoPin].port}.{PIN_MAPPINGS[val as ArduinoPin].bit}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                              <select
                                value={val}
                                onChange={(e) => updateParam(block.id, param.key, e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-[#1A1D24] border border-[#3A3F4B] hover:border-[#4ade80] rounded-xs text-xs font-mono text-[#E0E0E6] focus:outline-none focus:border-[#4ade80]"
                              >
                                {isEsp32
                                  ? ESP32_PINS_ORDER.map((pin) => (
                                      <option key={pin} value={pin} className="bg-[#1A1D24] text-[#E0E0E6]">
                                        GPIO {pin} ({ESP32_PIN_MAPPINGS[pin]?.description})
                                      </option>
                                    ))
                                  : ARDUINO_PINS_ORDER.map((pin) => (
                                      <option key={pin} value={pin} className="bg-[#1A1D24] text-[#E0E0E6]">
                                        Pin {pin} ({PIN_MAPPINGS[pin]?.description})
                                      </option>
                                    ))}
                              </select>
                            </div>
                          );
                        }

                        if (param.type === 'select') {
                          return (
                            <div key={param.key} className="space-y-1">
                              <div className="text-[10px] font-mono font-bold text-[#8A8D98] uppercase flex items-center justify-between gap-1">
                                <span>{param.label}</span>
                                <VariableQuickPicker
                                  variables={variables}
                                  filterType={param.key === 'reg' ? 'register' : 'all'}
                                  onSelect={(selectedVal) => updateParam(block.id, param.key, selectedVal)}
                                />
                              </div>
                              <select
                                value={val}
                                onChange={(e) => updateParam(block.id, param.key, e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-[#1A1D24] border border-[#3A3F4B] hover:border-[#4ade80] rounded-xs text-xs font-mono text-[#E0E0E6] focus:outline-none focus:border-[#4ade80]"
                              >
                                {param.options?.map((opt) => (
                                  <option key={opt.value} value={opt.value} className="bg-[#1A1D24] text-[#E0E0E6]">
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }

                        if (param.type === 'number') {
                          return (
                            <div key={param.key} className="space-y-1">
                              <div className="text-[10px] font-mono font-bold text-[#8A8D98] uppercase flex items-center justify-between gap-1">
                                <span>{param.label}</span>
                                <div className="flex items-center gap-1.5">
                                  <VariableQuickPicker
                                    variables={variables}
                                    filterType={param.key === 'address' ? 'sram' : 'all'}
                                    onSelect={(selectedVal) => updateParam(block.id, param.key, Number(selectedVal) || selectedVal)}
                                  />
                                  {param.unit && <span className="text-[10px] text-[#8A8D98]">{param.unit}</span>}
                                </div>
                              </div>
                              <input
                                type="number"
                                value={val}
                                onChange={(e) => updateParam(block.id, param.key, Number(e.target.value))}
                                className="w-full px-2.5 py-1.5 bg-[#1A1D24] border border-[#3A3F4B] hover:border-[#4ade80] rounded-xs text-xs font-mono text-[#E0E0E6] focus:outline-none focus:border-[#4ade80]"
                              />
                            </div>
                          );
                        }

                        return (
                          <div key={param.key} className="space-y-1">
                            <div className="text-[10px] font-mono font-bold text-[#8A8D98] uppercase flex items-center justify-between gap-1">
                              <span>{param.label}</span>
                              <VariableQuickPicker
                                variables={variables}
                                filterType={param.key === 'address' ? 'sram' : param.key === 'reg' ? 'register' : 'all'}
                                onSelect={(selectedVal) => updateParam(block.id, param.key, selectedVal)}
                              />
                            </div>
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => updateParam(block.id, param.key, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[#1A1D24] border border-[#3A3F4B] hover:border-[#4ade80] rounded-xs text-xs font-mono text-[#E0E0E6] focus:outline-none focus:border-[#4ade80]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Dual Code & Timing Highlight Section with architecture-specific annotations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* C KÓD MEGFELELŐ */}
                    <div className="bg-[#0F1115] rounded-xs p-3 border border-[#3A3F4B] shadow-[2px_2px_0px_#000]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold tracking-widest text-[#8A8D98] uppercase flex items-center gap-1 font-mono">
                          <Code2 className="w-3 h-3 text-orange-400" />
                          C Kód Megfelelő
                        </span>
                        <span className="text-[9px] font-mono text-[#8A8D98] bg-[#161920] px-1.5 py-0.5 rounded-xs border border-[#2A2D35]">
                          {isEsp32 ? 'ESP32 / ESP-IDF C++' : 'Arduino C++'}
                        </span>
                      </div>
                      <pre className="code-font text-[11px] text-orange-300 bg-[#161920] p-2.5 rounded-xs border border-[#2A2D35] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {cLines.join('\n')}
                      </pre>
                    </div>

                    {/* ASSEMBLY KÓD */}
                    <div className="bg-[#0F1115] rounded-xs p-3 border border-[#3A3F4B] shadow-[2px_2px_0px_#000]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-bold tracking-widest uppercase flex items-center gap-1 font-mono ${
                          isEsp32 ? 'text-sky-400' : 'text-[#4ade80]'
                        }`}>
                          <Zap className={`w-3 h-3 ${isEsp32 ? 'text-sky-400' : 'text-[#4ade80]'}`} />
                          Generált Assembly
                        </span>
                        <span className={`text-[9px] font-mono bg-[#161920] px-1.5 py-0.5 rounded-xs border border-[#2A2D35] ${
                          isEsp32 ? 'text-sky-400' : 'text-[#4ade80]'
                        }`}>
                          {isEsp32 ? '240 MHz Xtensa LX6' : '16 MHz AVR ATmega328P'}
                        </span>
                      </div>
                      <pre className={`code-font text-[11px] bg-[#161920] p-2.5 rounded-xs border border-[#2A2D35] overflow-x-auto whitespace-pre-wrap leading-relaxed ${
                        isEsp32 ? 'text-sky-300' : 'text-[#4ade80]'
                      }`}>
                        {asmLines.join('\n')}
                      </pre>
                    </div>
                  </div>

                  {/* Timing & Explanation Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-[#0F1115] text-amber-300 font-mono text-[10px] border border-[#3A3F4B] font-bold shadow-[1px_1px_0px_#000]">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {cycles} ÓRACIKLUS ({blockTimeNs < 1000 ? `${blockTimeNs.toFixed(1)} ns` : blockTimeNs < 1000000 ? `${(blockTimeNs / 1000).toFixed(2)} µs` : `${(blockTimeNs / 1000000).toFixed(2)} ms`})
                      </span>
                    </div>

                    <p className="text-[11px] text-[#8A8D98] italic max-w-lg">
                      {def.explanationHu(block.params)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* Floating Canvas Quick View & Zoom Control Widget */}
      <div
        id="canvas-floating-controls"
        className="absolute bottom-12 right-4 z-20 flex items-center gap-1.5 p-1 bg-[#161920]/95 backdrop-blur-xs border border-[#3A3F4B] rounded-xs shadow-[3px_3px_0px_#000]"
      >
        <button
          id="btn-canvas-zoom-out"
          onClick={() => handleZoomChange(-0.1)}
          className="w-7 h-7 flex items-center justify-center bg-[#0F1115] hover:bg-[#1F232B] text-[#E0E0E6] hover:text-[#4ade80] border border-[#2A2D35] rounded-xs text-xs font-mono font-bold transition-all cursor-pointer"
          title="Kicsinyítés (-10%)"
        >
          -
        </button>

        <button
          id="btn-canvas-zoom-reset"
          onClick={handleResetZoom}
          className="px-2 h-7 flex items-center justify-center bg-[#0F1115] hover:bg-[#1F232B] text-[#4ade80] border border-[#2A2D35] rounded-xs text-[11px] font-mono font-bold transition-all cursor-pointer"
          title="Alapértelmezett méret (100%)"
        >
          {Math.round(zoomScale * 100)}%
        </button>

        <button
          id="btn-canvas-zoom-in"
          onClick={() => handleZoomChange(0.1)}
          className="w-7 h-7 flex items-center justify-center bg-[#0F1115] hover:bg-[#1F232B] text-[#E0E0E6] hover:text-[#4ade80] border border-[#2A2D35] rounded-xs text-xs font-mono font-bold transition-all cursor-pointer"
          title="Nagyítás (+10%)"
        >
          +
        </button>

        {onOpenRenderEngine && (
          <button
            id="btn-canvas-open-engine"
            onClick={onOpenRenderEngine}
            className="flex items-center gap-1 px-2 h-7 bg-[#4ade80]/15 hover:bg-[#4ade80]/25 text-[#4ade80] border border-[#4ade80]/40 rounded-xs text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[1px_1px_0px_#000]"
            title="Render Motor és Mini-OS Beállítások megnyitása"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Motor OS</span>
          </button>
        )}
      </div>

      {/* Scope Footer Status Bar */}
      <div className="bg-[#161920] border-t border-[#2A2D35] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#8A8D98] z-10">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <Layers className="w-3.5 h-3.5 text-[#8A8D98]" />
            <span>MODULOK:</span>
            <strong className="text-white font-bold">{currentScopeBlocks.length} DB</strong>
          </span>

          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>ÖSSZES ÓRACIKLUS:</span>
            <strong className="text-amber-300 font-bold">{totalScopeCycles.toLocaleString()}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <span>FUTÁSI IDŐ / ITERÁCIÓ:</span>
            <strong className="text-[#4ade80] font-bold">{formattedTime}</strong>
          </span>

          <span className="text-[10px] code-font text-[#8A8D98] opacity-60 hidden md:inline">
            SKÁLA: {Math.round(zoomScale * 100)}% | RÁCS: {renderConfig?.gridStyle || 'blueprint'}
          </span>
        </div>
      </div>

      {/* Dependency Warning & Delete Confirmation Modal */}
      <BlockDeleteModal
        isOpen={Boolean(blockToDelete)}
        onClose={() => setBlockToDelete(null)}
        targetBlock={blockToDelete}
        allBlocks={blocks}
        variables={variables}
        onConfirmDelete={(id) => deleteBlock(id)}
        onConfirmCascadeDelete={(ids) => {
          setBlocks((prev) => prev.filter((b) => !ids.includes(b.id)));
        }}
        onToggleDisable={(id) => toggleBlockEnabled(id)}
        onFocusBlock={handleFocusBlock}
      />
    </div>
  );
};
