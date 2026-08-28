import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Monitor,
  Sliders,
  Activity,
  Tv,
  Zap,
  Layers,
  Sparkles,
  RotateCcw,
  Gauge,
  Check,
  Download,
  Flame,
  HardDrive,
  Copy,
  Info,
  Maximize2,
  Minimize2,
  RefreshCw,
  Terminal,
  Grid,
} from 'lucide-react';
import {
  RenderEngineConfig,
  RenderEngineTelemetry,
  RenderGridStyle,
  RenderPipelineMode,
  RenderThemeMode,
} from '../types';
import {
  ENGINE_PRESET_PROFILES,
  telemetryEngine,
  runRenderStressBenchmark,
  saveRenderEngineConfig,
  DEFAULT_RENDER_CONFIG,
} from '../utils/renderEngine';

interface RenderEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: RenderEngineConfig;
  setConfig: React.Dispatch<React.SetStateAction<RenderEngineConfig>>;
}

export const RenderEngineModal: React.FC<RenderEngineModalProps> = ({
  isOpen,
  onClose,
  config,
  setConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'scaling' | 'pipeline' | 'display_fx' | 'telemetry' | 'benchmark'>('scaling');
  const [telemetry, setTelemetry] = useState<RenderEngineTelemetry>(telemetryEngine.getSnapshot());
  const [benchmarkResult, setBenchmarkResult] = useState<{
    durationMs: number;
    opsPerSec: number;
    grade: string;
  } | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  // Subscribe to live telemetry ticks
  useEffect(() => {
    if (!isOpen) return;
    const unsub = telemetryEngine.subscribe((newTele) => {
      setTelemetry(newTele);
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const updateEngineConfig = (updater: (prev: RenderEngineConfig) => RenderEngineConfig) => {
    setConfig((prev) => {
      const next = updater(prev);
      saveRenderEngineConfig(next);
      return next;
    });
  };

  const applyPreset = (presetId: string) => {
    const found = ENGINE_PRESET_PROFILES.find((p) => p.id === presetId);
    if (!found) return;
    updateEngineConfig((prev) => ({
      ...prev,
      ...found.config,
    }));
  };

  const handleRunBenchmark = (nodeCount: number) => {
    setIsBenchmarking(true);
    setTimeout(() => {
      const res = runRenderStressBenchmark(nodeCount);
      setBenchmarkResult(res);
      setIsBenchmarking(false);
    }, 150);
  };

  const handleCopyDiagnostics = () => {
    const report = {
      system: 'ArduASM Render Engine & Mini-OS Kernel v2.4',
      timestamp: new Date().toISOString(),
      config,
      telemetry: telemetryEngine.getSnapshot(),
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  return (
    <div
      id="render-engine-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="render-engine-modal"
        className="w-full max-w-4xl bg-[#12141A] border-2 border-[#4ade80]/60 rounded-xs shadow-[0_0_30px_rgba(74,222,128,0.15)] flex flex-col max-h-[92vh] overflow-hidden text-[#E0E0E6]"
      >
        {/* Top OS Header Bar */}
        <div className="bg-[#161920] border-b border-[#2A2D35] px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#4ade80]/20 border border-[#4ade80] rounded-xs flex items-center justify-center shadow-[1px_1px_0px_#000]">
              <Cpu className="w-5 h-5 text-[#4ade80]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white tracking-tight uppercase flex items-center gap-1.5">
                  <span>Render Motor</span>
                  <span className="text-[#4ade80] font-mono">&</span>
                  <span className="text-[#8A8D98] font-mono text-xs">Mini-OS Rendszer</span>
                </h3>
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#1A1D24] text-[#4ade80] border border-[#4ade80]/40 rounded-xs">
                  v2.4 Active Kernel
                </span>
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-black/60 text-cyan-400 border border-cyan-500/30 rounded-xs flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
                  {telemetry.fps} FPS ({telemetry.frameTimeMs} ms)
                </span>
              </div>
              <p className="text-[11px] text-[#8A8D98]">
                Valós idejű skálázás, hardvergyorsítás, CRT shader meghajtók és kernel diagnosztika
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm('Visszaállítod a render motort az alapértelmezett beállításokra?')) {
                  updateEngineConfig(() => ({ ...DEFAULT_RENDER_CONFIG }));
                }
              }}
              className="p-1.5 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#8A8D98] hover:text-white border border-[#2A2D35] rounded-xs text-[10px] font-mono transition-colors"
              title="Alaphelyzetbe állítás"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-[#1A1D24] hover:bg-rose-500/20 text-[#8A8D98] hover:text-rose-400 border border-[#2A2D35] hover:border-rose-500/40 rounded-xs transition-colors"
              title="Bezárás"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="bg-[#0D0F14] border-b border-[#2A2D35] px-4 py-2 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8A8D98] shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#4ade80]" />
            Gyors Profilok:
          </span>
          {ENGINE_PRESET_PROFILES.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className="px-2.5 py-1 bg-[#161920] hover:bg-[#1f232c] border border-[#2A2D35] hover:border-[#4ade80] rounded-xs text-[10px] font-mono text-[#E0E0E6] flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.color }} />
              <span className="font-bold">{preset.name.split(' (')[0]}</span>
              <span className="text-[9px] text-[#8A8D98] bg-[#0E1015] px-1 rounded-xs">
                {preset.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Main Tab Navigation */}
        <div className="flex border-b border-[#2A2D35] bg-[#161920] px-3 gap-1 overflow-x-auto custom-scrollbar">
          {[
            { id: 'scaling', label: 'Skálázás & Rács', icon: Sliders },
            { id: 'pipeline', label: 'Pipeline & FPS', icon: Gauge },
            { id: 'display_fx', label: 'Kijelző & Shaders', icon: Tv },
            { id: 'telemetry', label: 'Kernel Telemetria', icon: Activity },
            { id: 'benchmark', label: 'Benchmark & Eszközök', icon: Flame },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold font-mono transition-all border-b-2 ${
                  isActive
                    ? 'border-[#4ade80] text-[#4ade80] bg-[#12141A]'
                    : 'border-transparent text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[60vh] space-y-5 custom-scrollbar bg-[#0E1015]">
          {/* TAB 1: SKÁLÁZÁS & VÁSZON RÁCS */}
          {activeTab === 'scaling' && (
            <div className="space-y-5">
              {/* Zoom Controls */}
              <div className="p-4 bg-[#141720] border border-[#2A2D35] rounded-xs space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-[#4ade80]" />
                    <span className="text-xs font-bold text-white uppercase font-mono">
                      Vizuális Nagyítás & Skálázási Arány (Zoom Level)
                    </span>
                  </div>
                  <span className="text-sm font-mono font-bold text-[#4ade80] bg-black/60 px-2 py-0.5 rounded-xs border border-[#4ade80]/30">
                    {Math.round(config.zoomLevel * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-[#8A8D98]">50%</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={config.zoomLevel}
                    onChange={(e) =>
                      updateEngineConfig((prev) => ({
                        ...prev,
                        zoomLevel: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full h-2 bg-[#1A1D24] rounded-lg appearance-none cursor-pointer accent-[#4ade80]"
                  />
                  <span className="text-[10px] font-mono text-[#8A8D98]">200%</span>
                </div>

                {/* Quick Zoom Multiplier Buttons */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1">
                  {[0.5, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5, 2.0].map((z) => (
                    <button
                      key={z}
                      onClick={() => updateEngineConfig((prev) => ({ ...prev, zoomLevel: z }))}
                      className={`px-2 py-1 rounded-xs text-[10px] font-mono font-bold transition-all border ${
                        Math.abs(config.zoomLevel - z) < 0.01
                          ? 'bg-[#4ade80] text-black border-[#4ade80]'
                          : 'bg-[#1A1D24] hover:bg-[#252A34] text-[#E0E0E6] border-[#2A2D35]'
                      }`}
                    >
                      {Math.round(z * 100)}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Style Selector */}
              <div className="p-4 bg-[#141720] border border-[#2A2D35] rounded-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Grid className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase font-mono">
                      Vászon Háttér & Rácsszerkezet (Grid Style)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#8A8D98]">
                    Rácsméret: {config.gridSize}px
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'dots', label: 'Pontmátrix (Dots)', desc: 'Finom pontrács, ideális általános kódoláshoz', color: '#4ade80' },
                    { id: 'blueprint', label: 'Mérnöki Blueprint', desc: 'Kék CAD milliméter-rács kapcsolási rajzokhoz', color: '#06b6d4' },
                    { id: 'pcb_dark', label: 'Sötét NYÁK / PCB', desc: 'Nyomtatott áramköri sötét rács háló', color: '#a855f7' },
                    { id: 'retro_terminal', label: 'Retro Borostyán', desc: 'Vintage katódsugárcsöves pontmátrix', color: '#f59e0b' },
                    { id: 'cyber_matrix', label: 'Cyber Matrix Zöld', desc: 'Nagy kontrasztú neon zöld mátrix háló', color: '#22c55e' },
                    { id: 'clean_minimal', label: 'Tiszta Sima Sötét', desc: 'Rács nélküli sötét felület a tiszta fókuszért', color: '#64748b' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() =>
                        updateEngineConfig((prev) => ({
                          ...prev,
                          gridStyle: style.id as RenderGridStyle,
                        }))
                      }
                      className={`p-3 rounded-xs border text-left transition-all cursor-pointer ${
                        config.gridStyle === style.id
                          ? 'bg-[#181D26] border-[#4ade80] shadow-[0_0_12px_rgba(74,222,128,0.15)]'
                          : 'bg-[#101217] border-[#2A2D35] hover:border-[#3E4350]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: style.color }} />
                          {style.label}
                        </span>
                        {config.gridStyle === style.id && (
                          <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                        )}
                      </div>
                      <p className="text-[10px] text-[#8A8D98] line-clamp-2">{style.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Grid Density & Snap */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#2A2D35]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#8A8D98]">Rács Lépésköz:</span>
                    {[8, 16, 24, 32].map((sz) => (
                      <button
                        key={sz}
                        onClick={() => updateEngineConfig((prev) => ({ ...prev, gridSize: sz }))}
                        className={`px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold border ${
                          config.gridSize === sz
                            ? 'bg-cyan-500 text-black border-cyan-500'
                            : 'bg-[#1A1D24] text-[#8A8D98] border-[#2A2D35]'
                        }`}
                      >
                        {sz}px
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-[10px] font-mono text-[#E0E0E6]">
                    <input
                      type="checkbox"
                      checked={config.snapToGrid}
                      onChange={(e) =>
                        updateEngineConfig((prev) => ({ ...prev, snapToGrid: e.target.checked }))
                      }
                      className="accent-[#4ade80]"
                    />
                    <span>Rácshoz Igazítás (Snap to Grid)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PIPELINE & TELJESÍTMÉNY */}
          {activeTab === 'pipeline' && (
            <div className="space-y-4">
              {/* Target FPS Selector */}
              <div className="p-4 bg-[#141720] border border-[#2A2D35] rounded-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase font-mono">
                      Cél Képkockasebesség (Target Frame Rate)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 font-bold">
                    {config.targetFps === 0 ? 'Kötetlen (Max)' : `${config.targetFps} FPS`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { fps: 30, label: '30 FPS (Eco)', desc: 'Akkumulátorkímélő laptop mód' },
                    { fps: 60, label: '60 FPS (Standard)', desc: 'Optimális simaság és válaszidő' },
                    { fps: 120, label: '120 FPS (High-Hz)', desc: 'Nagy képfrissítésű gamer monitorokhoz' },
                    { fps: 0, label: 'Kötetlen (V-Sync)', desc: 'Maximális elérhető hardver sebesség' },
                  ].map((item) => (
                    <button
                      key={item.fps}
                      onClick={() => updateEngineConfig((prev) => ({ ...prev, targetFps: item.fps }))}
                      className={`p-2.5 rounded-xs border text-left transition-all ${
                        config.targetFps === item.fps
                          ? 'bg-[#181D26] border-amber-400 text-white shadow-[0_0_10px_rgba(251,191,36,0.2)]'
                          : 'bg-[#101217] border-[#2A2D35] text-[#8A8D98] hover:border-[#3E4350]'
                      }`}
                    >
                      <div className="text-xs font-bold font-mono text-white mb-1">{item.label}</div>
                      <div className="text-[9px] text-[#8A8D98]">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rendering Pipeline Mode */}
              <div className="p-4 bg-[#141720] border border-[#2A2D35] rounded-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase font-mono">
                    Render Pipeline Mód & Gyorsítás
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'dom_accelerated',
                      title: 'DOM Hardvergyorsított',
                      desc: 'CSS Transform 3D & GPU kompozitálás a maximális élességért és akadálymentességért.',
                    },
                    {
                      id: 'canvas2d_hybrid',
                      title: 'Hibrid Canvas 2D',
                      desc: 'Hardveres 2D vászon a sűrű blokkhálózatok és részecske-effektek rendereléséhez.',
                    },
                    {
                      id: 'webgl_simulated',
                      title: 'Szimulált WebGL Shaders',
                      desc: 'Pixel-pontos shaderek, katódsugárcsöves és foszfor utófeldolgozás.',
                    },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() =>
                        updateEngineConfig((prev) => ({
                          ...prev,
                          pipelineMode: p.id as RenderPipelineMode,
                        }))
                      }
                      className={`p-3 rounded-xs border text-left transition-all ${
                        config.pipelineMode === p.id
                          ? 'bg-[#181D26] border-emerald-400 text-white'
                          : 'bg-[#101217] border-[#2A2D35] text-[#8A8D98] hover:border-[#3E4350]'
                      }`}
                    >
                      <div className="text-xs font-bold font-mono text-white mb-1">{p.title}</div>
                      <div className="text-[10px] text-[#8A8D98]">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Performance Toggles */}
              <div className="p-4 bg-[#141720] border border-[#2A2D35] rounded-xs space-y-2.5">
                <span className="text-[10px] font-mono text-[#8A8D98] uppercase tracking-wider block">
                  Optimalizációs Kapcsolók
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center justify-between p-2.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs cursor-pointer hover:border-[#4ade80]/40">
                    <div>
                      <div className="text-xs font-bold text-white">Viewport Culling</div>
                      <div className="text-[9px] text-[#8A8D98]">
                        Nem látható blokkok renderelésének kihagyása
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.viewportCulling}
                      onChange={(e) =>
                        updateEngineConfig((prev) => ({ ...prev, viewportCulling: e.target.checked }))
                      }
                      className="accent-[#4ade80] w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs cursor-pointer hover:border-[#4ade80]/40">
                    <div>
                      <div className="text-xs font-bold text-white">Képkocka Interpoláció</div>
                      <div className="text-[9px] text-[#8A8D98]">
                        Simított blokkmozgás és átmenetek
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.frameInterpolation}
                      onChange={(e) =>
                        updateEngineConfig((prev) => ({
                          ...prev,
                          frameInterpolation: e.target.checked,
                        }))
                      }
                      className="accent-[#4ade80] w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs cursor-pointer hover:border-[#4ade80]/40">
                    <div>
                      <div className="text-xs font-bold text-white">Csoportosított DOM Frissítés</div>
                      <div className="text-[9px] text-[#8A8D98]">
                        Layout thrashing elkerülése mikro-batchinggel
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.batchDomUpdates}
                      onChange={(e) =>
                        updateEngineConfig((prev) => ({
                          ...prev,
                          batchDomUpdates: e.target.checked,
                        }))
                      }
                      className="accent-[#4ade80] w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs cursor-pointer hover:border-[#4ade80]/40">
                    <div>
                      <div className="text-xs font-bold text-white">Alacsony Fogyasztás (Low Power)</div>
                      <div className="text-[9px] text-[#8A8D98]">
                        Energiatakarékos CPU/GPU üzemmód
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.lowPowerMode}
                      onChange={(e) =>
                        updateEngineConfig((prev) => ({ ...prev, lowPowerMode: e.target.checked }))
                      }
                      className="accent-[#4ade80] w-4 h-4"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KIJELZŐ MEGHAJTÓ & SHADERS */}
          {activeTab === 'display_fx' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#141720] border border-[#2A2D35] rounded-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-white uppercase font-mono">
                    Post-Processing & Retro Kijelző Meghajtók
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* CRT Shader */}
                  <label className="flex items-start justify-between p-3 bg-[#0F1115] border border-[#2A2D35] rounded-xs cursor-pointer hover:border-purple-400">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Retro CRT Pásztázó Vonalak (Scanlines)</span>
                        <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-400 text-[9px] rounded-xs">
                          Shader
                        </span>
                      </div>
                      <p className="text-[10px] text-[#8A8D98]">
                        Horizontális katódsugárcsöves rasztervonalak és enyhe domború képernyő effekt.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.crtShader}
                      onChange={(e) =>
                        updateEngineConfig((prev) => ({ ...prev, crtShader: e.target.checked }))
                      }
                      className="accent-purple-400 w-4 h-4 mt-1"
                    />
                  </label>

                  {/* Bloom Glow */}
                  <label className="flex items-start justify-between p-3 bg-[#0F1115] border border-[#2A2D35] rounded-xs cursor-pointer hover:border-emerald-400">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Foszfor Fényudvar (Neon Bloom Glow)</span>
                        <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[9px] rounded-xs">
                          FX
                        </span>
                      </div>
                      <p className="text-[10px] text-[#8A8D98]">
                        Lágy ragyogás a futó blokkok, aktív LED-ek és I/O adatvonalak körül.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.bloomGlow}
                      onChange={(e) =>
                        updateEngineConfig((prev) => ({ ...prev, bloomGlow: e.target.checked }))
                      }
                      className="accent-emerald-400 w-4 h-4 mt-1"
                    />
                  </label>

                  {/* Signal Flow Wires */}
                  <label className="flex items-start justify-between p-3 bg-[#0F1115] border border-[#2A2D35] rounded-xs cursor-pointer hover:border-cyan-400">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Animált Jelvezetékek (Signal Flow Wires)</span>
                        <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-400 text-[9px] rounded-xs">
                          Hardware Bus
                        </span>
                      </div>
                      <p className="text-[10px] text-[#8A8D98]">
                        Összekötő adatvonalak rajzolása a programblokkok és az Arduino lábak között.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.showSignalFlow}
                      onChange={(e) =>
                        updateEngineConfig((prev) => ({ ...prev, showSignalFlow: e.target.checked }))
                      }
                      className="accent-cyan-400 w-4 h-4 mt-1"
                    />
                  </label>

                  {/* Execution Heatmap */}
                  <label className="flex items-start justify-between p-3 bg-[#0F1115] border border-[#2A2D35] rounded-xs cursor-pointer hover:border-rose-400">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Végrehajtási Hőtérkép (Execution Heatmap)</span>
                        <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-400 text-[9px] rounded-xs">
                          Ciklus Profil
                        </span>
                      </div>
                      <p className="text-[10px] text-[#8A8D98]">
                        A leggyakrabban futott vagy leghosszabb késleltetésű blokkok színkódolása.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.executionHeatmap}
                      onChange={(e) =>
                        updateEngineConfig((prev) => ({
                          ...prev,
                          executionHeatmap: e.target.checked,
                        }))
                      }
                      className="accent-rose-400 w-4 h-4 mt-1"
                    />
                  </label>
                </div>
              </div>

              {/* Theme Selector */}
              <div className="p-4 bg-[#141720] border border-[#2A2D35] rounded-xs space-y-2.5">
                <span className="text-[10px] font-mono text-[#8A8D98] uppercase tracking-wider block">
                  Színvilág & Megjelenítési Témapaletta
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'studio_dark', name: 'Studio Dark Pro', badge: 'Standard' },
                    { id: 'matrix_terminal', name: 'Matrix Neon Zöld', badge: 'Cyberpunk' },
                    { id: 'amber_crt', name: 'Retro Borostyán CRT', badge: 'Vintage' },
                    { id: 'blueprint_cyan', name: 'CAD Blueprint Kék', badge: 'Mérnöki' },
                    { id: 'monochrome_schematic', name: 'Monokróm Labor', badge: 'High-Contrast' },
                    { id: 'cyberpunk_neon', name: 'Cyberpunk Magenta', badge: 'Vibrant' },
                  ].map((th) => (
                    <button
                      key={th.id}
                      onClick={() =>
                        updateEngineConfig((prev) => ({
                          ...prev,
                          themeMode: th.id as RenderThemeMode,
                        }))
                      }
                      className={`p-2.5 rounded-xs border text-left transition-all ${
                        config.themeMode === th.id
                          ? 'bg-[#181D26] border-[#4ade80] text-white font-bold'
                          : 'bg-[#101217] border-[#2A2D35] text-[#8A8D98] hover:border-[#3E4350]'
                      }`}
                    >
                      <div className="text-xs">{th.name}</div>
                      <div className="text-[9px] text-[#8A8D98]">{th.badge}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: KERNEL TELEMETRIA & DIAGNOSZTIKA */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4">
              {/* Telemetry Numbers Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-[#141720] border border-[#2A2D35] rounded-xs">
                  <div className="text-[9px] font-mono text-[#8A8D98]">AKTUÁLIS FPS</div>
                  <div className="text-2xl font-mono font-bold text-[#4ade80]">
                    {telemetry.fps} <span className="text-xs font-normal text-[#8A8D98]">FPS</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#8A8D98]">
                    Átlag: {telemetry.avgFps} FPS
                  </div>
                </div>

                <div className="p-3 bg-[#141720] border border-[#2A2D35] rounded-xs">
                  <div className="text-[9px] font-mono text-[#8A8D98]">KÉPKOCKA IDŐ</div>
                  <div className="text-2xl font-mono font-bold text-cyan-400">
                    {telemetry.frameTimeMs} <span className="text-xs font-normal text-[#8A8D98]">ms</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#8A8D98]">
                    Budget: 16.6 ms @ 60Hz
                  </div>
                </div>

                <div className="p-3 bg-[#141720] border border-[#2A2D35] rounded-xs">
                  <div className="text-[9px] font-mono text-[#8A8D98]">DOM CSOMÓPONTOK</div>
                  <div className="text-2xl font-mono font-bold text-purple-400">
                    {telemetry.domNodeCount}
                  </div>
                  <div className="text-[10px] font-mono text-[#8A8D98]">
                    Becsült Memória: ~{telemetry.memoryEstimateMb} MB
                  </div>
                </div>

                <div className="p-3 bg-[#141720] border border-[#2A2D35] rounded-xs">
                  <div className="text-[9px] font-mono text-[#8A8D98]">DROPPED FRAMES</div>
                  <div
                    className={`text-2xl font-mono font-bold ${
                      telemetry.droppedFrames === 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {telemetry.droppedFrames}
                  </div>
                  <div className="text-[10px] font-mono text-[#8A8D98]">
                    Uptime: {telemetry.uptimeSeconds}s
                  </div>
                </div>
              </div>

              {/* Render Passes Timing Breakdown */}
              <div className="p-4 bg-[#141720] border border-[#2A2D35] rounded-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#4ade80]" />
                    <span className="text-xs font-bold text-white uppercase font-mono">
                      Render Fázisok Időtartama (Render Pass Timing)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#4ade80]">
                    Összesen: {(telemetry.layoutDurationMs + telemetry.paintDurationMs).toFixed(1)} ms
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-[#8A8D98]">1. Blokk Elrendezés & Mátrix Kalkuláció</span>
                      <span className="text-cyan-400 font-bold">{telemetry.layoutDurationMs} ms</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0F1115] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 transition-all duration-300"
                        style={{
                          width: `${Math.min((telemetry.layoutDurationMs / 8) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-[#8A8D98]">2. GPU Festés & Shaders Kompozitálás</span>
                      <span className="text-purple-400 font-bold">{telemetry.paintDurationMs} ms</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0F1115] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-400 transition-all duration-300"
                        style={{
                          width: `${Math.min((telemetry.paintDurationMs / 8) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* On-Canvas Debug Overlay Toggle */}
              <div className="p-3 bg-[#141720] border border-[#2A2D35] rounded-xs flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Vászonra Vetített Debugger HUD</div>
                  <div className="text-[10px] text-[#8A8D98]">
                    Valós idejű FPS számláló és memóriastatisztika a kódoló felület sarkában
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.renderDebugOverlay}
                  onChange={(e) =>
                    updateEngineConfig((prev) => ({
                      ...prev,
                      renderDebugOverlay: e.target.checked,
                    }))
                  }
                  className="accent-[#4ade80] w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 5: BENCHMARK & SYSTEM TOOLS */}
          {activeTab === 'benchmark' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#141720] border border-[#2A2D35] rounded-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase font-mono">
                      Render Motor Stressz Teszt & Benchmark
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#8A8D98]">
                    Valós idejű csomópont-áteresztőképesség
                  </span>
                </div>

                <p className="text-[11px] text-[#8A8D98]">
                  Teszteli a böngésző és a render motor sebességét virtuális blokkok és mátrix-transzformációk futtatásával.
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={isBenchmarking}
                    onClick={() => handleRunBenchmark(50)}
                    className="px-3 py-1.5 bg-[#1A1D24] hover:bg-[#252A34] text-white border border-[#2A2D35] hover:border-amber-400 rounded-xs text-xs font-mono font-bold transition-all disabled:opacity-50"
                  >
                    ⚡ Teszt: 50 Blokk
                  </button>
                  <button
                    disabled={isBenchmarking}
                    onClick={() => handleRunBenchmark(100)}
                    className="px-3 py-1.5 bg-[#1A1D24] hover:bg-[#252A34] text-amber-300 border border-amber-500/40 hover:border-amber-400 rounded-xs text-xs font-mono font-bold transition-all disabled:opacity-50"
                  >
                    🔥 Teszt: 100 Blokk (Standard)
                  </button>
                  <button
                    disabled={isBenchmarking}
                    onClick={() => handleRunBenchmark(250)}
                    className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xs text-xs font-mono font-bold transition-all disabled:opacity-50"
                  >
                    🌋 Extrém: 250 Blokk
                  </button>
                </div>

                {benchmarkResult && (
                  <div className="p-3 bg-[#0F1115] border border-amber-500/40 rounded-xs grid grid-cols-3 gap-2 text-center font-mono">
                    <div>
                      <div className="text-[9px] text-[#8A8D98]">FUTÁSI IDŐ</div>
                      <div className="text-lg font-bold text-white">
                        {benchmarkResult.durationMs} ms
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#8A8D98]">MŰVELET / MP</div>
                      <div className="text-lg font-bold text-cyan-400">
                        {benchmarkResult.opsPerSec.toLocaleString()} ops/s
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#8A8D98]">MINŐSÍTÉS</div>
                      <div className="text-lg font-bold text-[#4ade80]">
                        {benchmarkResult.grade}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Memory & Cache Management */}
              <div className="p-4 bg-[#141720] border border-[#2A2D35] rounded-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase font-mono">
                      Memória & Render Gyorsítótár Kezelés
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      telemetryEngine.resetStats();
                      alert('Render statisztikák és gyorsítótár sikeresen ürítve!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1D24] hover:bg-[#252A34] text-[#E0E0E6] border border-[#2A2D35] rounded-xs text-xs font-mono transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#4ade80]" />
                    <span>Gyorsítótár Ürítése (Flush Cache)</span>
                  </button>

                  <button
                    onClick={handleCopyDiagnostics}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1D24] hover:bg-[#252A34] text-[#E0E0E6] border border-[#2A2D35] rounded-xs text-xs font-mono transition-colors"
                  >
                    {copiedReport ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                        <span className="text-[#4ade80]">Másolva vágólapra!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Rendszer Jelentés Másolása (JSON)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#161920] border-t border-[#2A2D35] px-4 py-2.5 flex items-center justify-between text-xs font-mono">
          <div className="text-[11px] text-[#8A8D98] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
            <span>Minden módosítás azonnal érvénybe lép a vásznon</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#4ade80] hover:bg-[#3ec973] text-black font-bold font-mono rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
          >
            BEZÁRÁS & ALKALMAZÁS
          </button>
        </div>
      </div>
    </div>
  );
};
