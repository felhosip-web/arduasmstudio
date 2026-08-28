import React, { useState } from 'react';
import {
  X,
  Code2,
  Cpu,
  Download,
  Upload,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  FolderArchive,
  RefreshCw,
  Zap,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import { ProgramBlock, BlockScope } from '../types';
import { GeneratedCodeOutput } from '../utils/codeGenerator';
import { generateProjectZip, triggerFileDownload } from '../utils/projectZipExporter';
import { reverseParseAsmToBlocks, disassembleAvrBytes, DisassemblyResult } from '../utils/reverseDisassembler';
import { parseIntelHex } from '../utils/avr8jsEngine';

interface ReverseEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: ProgramBlock[];
  onImportBlocks: (newBlocks: ProgramBlock[], scopeMode: 'replace' | 'append') => void;
  codeOutput: GeneratedCodeOutput;
}

export const ReverseEngineModal: React.FC<ReverseEngineModalProps> = ({
  isOpen,
  onClose,
  blocks,
  onImportBlocks,
  codeOutput,
}) => {
  const [activeTab, setActiveTab] = useState<'disassembler' | 'exportZip' | 'hexDecompile'>('disassembler');

  // Reverse ASM State
  const [inputAsm, setInputAsm] = useState<string>(
    `; Minta AVR Assembly kód beillesztése ide
setup:
  sbi 0x04, 5      ; DDRB.5 = OUTPUT (D13 LED)
  ldi r16, 0xFF    ; r16 = 255
  sei              ; Globális megszakítások engedélyezése

loop:
  sbi 0x05, 5      ; D13 HIGH
  rcall delay_ms   ; Késleltetés
  cbi 0x05, 5      ; D13 LOW
  rcall delay_ms
  rjmp loop
`
  );
  const [disasmResult, setDisasmResult] = useState<DisassemblyResult | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  // ZIP Export Options
  const [projectName, setProjectName] = useState<string>('avr_studio_project');
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [fCpu, setFCpu] = useState<number>(16000000);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // HEX Decompile State
  const [hexInput, setHexInput] = useState<string>(
    `:100000000C9434000C9441000C9441000C944100C8
:100010000C9441000C9441000C9441000C944100B8
:100020000C9441000C9441000C9441000C944100A8
:00000001FF`
  );
  const [disassembledLines, setDisassembledLines] = useState<string[]>([]);
  const [hexByteCount, setHexByteCount] = useState<number>(0);

  if (!isOpen) return null;

  // Handle Reverse Parsing
  const handleParseAsm = () => {
    const result = reverseParseAsmToBlocks(inputAsm);
    setDisasmResult(result);
  };

  // Apply parsed blocks to canvas
  const handleApplyBlocks = () => {
    if (!disasmResult || disasmResult.blocks.length === 0) return;
    onImportBlocks(disasmResult.blocks, importMode);
    onClose();
  };

  // Handle ZIP Packaging & Download
  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const blob = await generateProjectZip(blocks, codeOutput, {
        projectName,
        baudRate,
        fCpu,
      });
      triggerFileDownload(blob, `${projectName}.zip`);
    } catch (err: any) {
      console.error('ZIP Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle HEX Decompilation
  const handleDecompileHex = () => {
    try {
      const { data, byteCount } = parseIntelHex(hexInput);
      setHexByteCount(byteCount);
      const lines = disassembleAvrBytes(data, 0, 150);
      setDisassembledLines(lines);
    } catch (err: any) {
      alert(`HEX Parse hiba: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-[#161920] border-2 border-[#4ade80] rounded-xs shadow-[8px_8px_0px_#000] flex flex-col max-h-[90vh] overflow-hidden text-[#E0E0E6]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0F1115] border-b border-[#2A2D35]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xs bg-[#4ade80]/15 border border-[#4ade80]/40 text-[#4ade80] shadow-[2px_2px_0px_#000]">
              <RefreshCw className="w-5 h-5 text-[#4ade80]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Kétirányú Fejlesztő & Projekt Csomagoló
                <span className="text-[10px] font-mono font-bold bg-[#4ade80]/20 text-[#4ade80] px-1.5 py-0.5 rounded-xs border border-[#4ade80]/40 uppercase">
                  Reverse Engine & Zip Export
                </span>
              </h2>
              <p className="text-xs text-[#8A8D98]">
                Assembly visszafejtés vizuális blokkokká, Intel HEX gépi kód disassembler és 1-kattintásos PlatformIO/Arduino ZIP export
              </p>
            </div>
          </div>

          <button
            id="btn-close-reverse-modal"
            onClick={onClose}
            className="p-1 text-[#8A8D98] hover:text-white hover:bg-[#2A2D35] rounded-xs transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2A2D35] bg-[#12141A] px-4 pt-2 gap-2 text-xs font-bold">
          <button
            id="tab-reverse-asm"
            onClick={() => setActiveTab('disassembler')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xs border-t border-x transition-all cursor-pointer ${
              activeTab === 'disassembler'
                ? 'bg-[#161920] border-[#4ade80] text-[#4ade80] border-b-transparent'
                : 'border-transparent text-[#8A8D98] hover:text-white'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Assembly ➔ Vizuális Blokkok Visszafejtése</span>
          </button>

          <button
            id="tab-export-zip"
            onClick={() => setActiveTab('exportZip')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xs border-t border-x transition-all cursor-pointer ${
              activeTab === 'exportZip'
                ? 'bg-[#161920] border-[#4ade80] text-[#4ade80] border-b-transparent'
                : 'border-transparent text-[#8A8D98] hover:text-white'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>PlatformIO & Arduino IDE ZIP Export</span>
          </button>

          <button
            id="tab-hex-decompile"
            onClick={() => setActiveTab('hexDecompile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xs border-t border-x transition-all cursor-pointer ${
              activeTab === 'hexDecompile'
                ? 'bg-[#161920] border-[#4ade80] text-[#4ade80] border-b-transparent'
                : 'border-transparent text-[#8A8D98] hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Intel HEX Gépi Kód Disassembler</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#161920]">
          {/* TAB 1: REVERSE PARSE ASSEMBLY TO BLOCKS */}
          {activeTab === 'disassembler' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0F1115] border border-[#2A2D35] rounded-xs text-xs space-y-1">
                <div className="font-bold text-[#4ade80] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Hogyan működik a Visszafejtő (Reverse Parser)?
                </div>
                <p className="text-[#A0A5B5] leading-relaxed">
                  Illeszd be az AVR assembly kódot az alábbi szövegmezőbe! A parser felismeri a címkéket (<code>setup:</code>, <code>loop:</code>, <code>isr:</code>), az I/O bitmanipulációkat (<code>sbi</code>, <code>cbi</code>, <code>in</code>, <code>out</code>), a regiszter műveleteket (<code>ldi</code>, <code>mov</code>, <code>add</code>, <code>inc</code>), és automatikusan kompatibilis vizuális blokkokká konvertálja őket a munkaterületre.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Input Textarea */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#8A8D98]">
                    <span>AVR Assembly Forráskód (.S):</span>
                    <button
                      onClick={() =>
                        setInputAsm(
                          `; Futófény D8-D11 lábakon\nsetup:\n  sbi 0x04, 0 ; D8 OUT\n  sbi 0x04, 1 ; D9 OUT\n  sbi 0x04, 2 ; D10 OUT\n  sbi 0x04, 3 ; D11 OUT\n\nloop:\n  sbi 0x05, 0 ; D8 ON\n  rcall delay_ms\n  cbi 0x05, 0 ; D8 OFF\n  sbi 0x05, 1 ; D9 ON\n  rcall delay_ms\n  cbi 0x05, 1 ; D9 OFF\n  rjmp loop\n`
                        )
                      }
                      className="text-[#4ade80] hover:underline cursor-pointer"
                    >
                      Példa betöltése
                    </button>
                  </div>
                  <textarea
                    id="input-reverse-asm"
                    value={inputAsm}
                    onChange={(e) => setInputAsm(e.target.value)}
                    rows={12}
                    className="w-full bg-[#0F1115] border border-[#2A2D35] focus:border-[#4ade80] rounded-xs p-3 font-mono text-xs text-[#4ade80] focus:outline-hidden resize-none"
                    placeholder="Illeszd be a .S assembly kódot ide..."
                  />

                  <button
                    id="btn-run-reverse-parser"
                    onClick={handleParseAsm}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#4ade80] hover:bg-[#3ec470] text-black font-bold text-xs rounded-xs shadow-[3px_3px_0px_#000] cursor-pointer transition-all active:translate-y-0.5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Assembly Elemzése & Visszafejtése Blokkokká</span>
                  </button>
                </div>

                {/* Right: Parsed Preview & Results */}
                <div className="space-y-3 bg-[#0F1115] border border-[#2A2D35] p-3.5 rounded-xs flex flex-col">
                  <div className="text-xs font-bold text-white flex items-center justify-between border-b border-[#2A2D35] pb-2">
                    <span>Visszafejtett Blokkok Előnézete</span>
                    {disasmResult && (
                      <span className="text-[#4ade80] font-mono">
                        {disasmResult.blocks.length} blokk azonosítva
                      </span>
                    )}
                  </div>

                  {disasmResult ? (
                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px] custom-scrollbar pr-1">
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                        <div className="p-1.5 bg-[#161920] border border-[#2A2D35] rounded-xs">
                          Setup: <b className="text-[#4ade80]">{disasmResult.scopesDetected.setupCount}</b>
                        </div>
                        <div className="p-1.5 bg-[#161920] border border-[#2A2D35] rounded-xs">
                          Loop: <b className="text-cyan-400">{disasmResult.scopesDetected.loopCount}</b>
                        </div>
                        <div className="p-1.5 bg-[#161920] border border-[#2A2D35] rounded-xs">
                          ISR: <b className="text-amber-400">{disasmResult.scopesDetected.isrCount}</b>
                        </div>
                      </div>

                      {disasmResult.warnings.length > 0 && (
                        <div className="p-2 bg-amber-950/40 border border-amber-500/40 rounded-xs text-[11px] text-amber-300 space-y-1">
                          <div className="font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Figyelmeztetések ({disasmResult.warnings.length}):
                          </div>
                          {disasmResult.warnings.map((w, idx) => (
                            <div key={idx}>• {w}</div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1">
                        {disasmResult.blocks.map((b, idx) => (
                          <div
                            key={b.id || idx}
                            className="p-1.5 bg-[#161920] border border-[#2A2D35] rounded-xs text-[11px] font-mono flex items-center justify-between"
                          >
                            <span className="text-[#8A8D98]">#{idx + 1} [{b.scope.toUpperCase()}]</span>
                            <span className="text-[#4ade80] font-bold">{b.type}</span>
                            <span className="text-xs text-[#A0A5B5] truncate max-w-[120px]">
                              {JSON.stringify(b.params)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#8A8D98] text-xs">
                      <Code2 className="w-8 h-8 mb-2 opacity-30 text-[#4ade80]" />
                      <span>Kattints az <b>"Assembly Elemzése"</b> gombra a blokkok előállításához!</span>
                    </div>
                  )}

                  {/* Apply Actions */}
                  {disasmResult && disasmResult.blocks.length > 0 && (
                    <div className="pt-2 border-t border-[#2A2D35] space-y-2">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-[#8A8D98]">Beszúrási Mód:</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'replace'}
                            onChange={() => setImportMode('replace')}
                          />
                          <span>Vászon felülírása</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'append'}
                            onChange={() => setImportMode('append')}
                          />
                          <span>Hozzáfűzés a meglévőkhöz</span>
                        </label>
                      </div>

                      <button
                        id="btn-apply-parsed-blocks"
                        onClick={handleApplyBlocks}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-[#4ade80] hover:bg-[#3ec470] text-black font-bold text-xs rounded-xs shadow-[2px_2px_0px_#000] cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Blokkok Áttöltése a Vizuális Munkaterületre</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLATFORMIO & ARDUINO IDE ZIP EXPORT */}
          {activeTab === 'exportZip' && (
            <div className="space-y-5">
              <div className="p-3.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs text-xs space-y-2">
                <div className="font-bold text-[#4ade80] flex items-center gap-1.5">
                  <FolderArchive className="w-4 h-4" />
                  1-Kattintásos Teljes Projekt Letöltés (ZIP)
                </div>
                <p className="text-[#A0A5B5] leading-relaxed">
                  A csomagoló generál egy komplett, azonnal fordítható és feltölthető forrásfát. Tartalmazza a <b>PlatformIO (platformio.ini)</b> beállításokat VS Code-hoz, az <b>Arduino IDE (.ino)</b> vázlatot, a <b>GNU AVR-GCC Makefile</b>-t és a visszatölthető <b>JSON projektmodellt</b>.
                </p>
              </div>

              {/* Package Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#8A8D98]">Projekt / Mappa Neve:</label>
                  <input
                    id="input-zip-project-name"
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full bg-[#0F1115] border border-[#2A2D35] focus:border-[#4ade80] rounded-xs px-3 py-1.5 text-xs text-white focus:outline-hidden font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#8A8D98]">Órajel Frekvencia (F_CPU):</label>
                  <select
                    id="select-zip-fcpu"
                    value={fCpu}
                    onChange={(e) => setFCpu(Number(e.target.value))}
                    className="w-full bg-[#0F1115] border border-[#2A2D35] focus:border-[#4ade80] rounded-xs px-3 py-1.5 text-xs text-white focus:outline-hidden font-mono"
                  >
                    <option value={16000000}>16.0 MHz (Standard Arduino Uno)</option>
                    <option value={8000000}>8.0 MHz (Belső RC / 3.3V Pro Mini)</option>
                    <option value={20000000}>20.0 MHz (Overclocked ATmega328P)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#8A8D98]">Soros Baud Ráta:</label>
                  <select
                    id="select-zip-baud"
                    value={baudRate}
                    onChange={(e) => setBaudRate(Number(e.target.value))}
                    className="w-full bg-[#0F1115] border border-[#2A2D35] focus:border-[#4ade80] rounded-xs px-3 py-1.5 text-xs text-white focus:outline-hidden font-mono"
                  >
                    <option value={115200}>115200 Baud (PlatformIO / Uno)</option>
                    <option value={9600}>9600 Baud (Alapértelmezett)</option>
                    <option value={57600}>57600 Baud (Arduino Nano)</option>
                  </select>
                </div>
              </div>

              {/* ZIP File Structure Preview */}
              <div className="p-3 bg-[#0F1115] border border-[#2A2D35] rounded-xs space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-[#4ade80]" />
                  A generált ZIP archívum tartalma:
                </span>
                <div className="font-mono text-xs text-[#A0A5B5] space-y-1 pl-2 border-l-2 border-[#4ade80]">
                  <div>📦 {projectName}.zip</div>
                  <div className="pl-4">├── 📄 README.md (Dokumentáció & parancsok)</div>
                  <div className="pl-4">├── ⚙️ Makefile (Natív avr-gcc és avrdude automatizálás)</div>
                  <div className="pl-4">├── ⚙️ platformio.ini (VS Code PlatformIO konfiguráció)</div>
                  <div className="pl-4">├── 💾 project_blocks.json (Visszatölthető vizuális diagram)</div>
                  <div className="pl-4">├── 📁 src/</div>
                  <div className="pl-8">├── 📄 main.S (Tiszta GNU AVR Assembly)</div>
                  <div className="pl-8">└── 📄 main.cpp (Közvetlen regiszter C++ / Inline Asm)</div>
                  <div className="pl-4">└── 📁 arduino/</div>
                  <div className="pl-8">└── 📁 {projectName}/</div>
                  <div className="pl-12">└── 📄 {projectName}.ino (Arduino IDE vázlat)</div>
                </div>
              </div>

              {/* Download Button */}
              <button
                id="btn-download-project-zip"
                onClick={handleExportZip}
                disabled={isExporting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#4ade80] hover:bg-[#3ec470] text-black font-bold text-sm rounded-xs shadow-[4px_4px_0px_#000] cursor-pointer transition-all active:translate-y-0.5 disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                <span>{isExporting ? 'Csomagolás folyamatban...' : `Projekt Letöltése (.ZIP) — ${projectName}.zip`}</span>
              </button>
            </div>
          )}

          {/* TAB 3: INTEL HEX DISASSEMBLER */}
          {activeTab === 'hexDecompile' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0F1115] border border-[#2A2D35] rounded-xs text-xs space-y-1">
                <div className="font-bold text-[#4ade80] flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" />
                  Intel HEX Gépi Kód Visszafejtő (Disassembler)
                </div>
                <p className="text-[#A0A5B5] leading-relaxed">
                  Illessz be tetszőleges lefordított Intel HEX állományt! A beépített disassembler motor lefejti a 16-bites AVR utasításkódokat mnemonikokká (<code>sbi</code>, <code>rjmp</code>, <code>ldi</code>, <code>out</code>, stb.) memóriacímmel és gépi bájtokkal együtt.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Input HEX */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#8A8D98]">
                    <span>Intel HEX Bemenet:</span>
                    <button
                      onClick={() =>
                        setHexInput(
                          `:10000000209A08E00094209808E00094FACF000063\n:00000001FF`
                        )
                      }
                      className="text-[#4ade80] hover:underline cursor-pointer"
                    >
                      Villogó LED HEX betöltése
                    </button>
                  </div>
                  <textarea
                    id="input-decompile-hex"
                    value={hexInput}
                    onChange={(e) => setHexInput(e.target.value)}
                    rows={12}
                    className="w-full bg-[#0F1115] border border-[#2A2D35] focus:border-[#4ade80] rounded-xs p-3 font-mono text-xs text-amber-300 focus:outline-hidden resize-none"
                    placeholder=":10000000..."
                  />

                  <button
                    id="btn-run-hex-disassembler"
                    onClick={handleDecompileHex}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-xs shadow-[3px_3px_0px_#000] cursor-pointer transition-all active:translate-y-0.5"
                  >
                    <Cpu className="w-4 h-4" />
                    <span>Intel HEX Gépi Kód Disassembly Futtatása</span>
                  </button>
                </div>

                {/* Right: Disassembly Output */}
                <div className="space-y-2 bg-[#0F1115] border border-[#2A2D35] p-3.5 rounded-xs flex flex-col">
                  <div className="text-xs font-bold text-white flex items-center justify-between border-b border-[#2A2D35] pb-2">
                    <span>Visszafejtett Assembly Utasításlista</span>
                    {hexByteCount > 0 && (
                      <span className="text-amber-400 font-mono">{hexByteCount} bájt elemezve</span>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[290px] custom-scrollbar bg-[#050608] p-2.5 rounded-xs border border-[#1F232B] font-mono text-[11px] text-[#4ade80] space-y-0.5">
                    {disassembledLines.length > 0 ? (
                      disassembledLines.map((line, idx) => (
                        <div key={idx} className="hover:bg-white/5 px-1 rounded-xs">
                          {line}
                        </div>
                      ))
                    ) : (
                      <div className="text-[#8A8D98] text-center py-10">
                        Nincs futtatva disassembly. Kattints a sárga gombra a bal oldalon!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#0F1115] border-t border-[#2A2D35] flex items-center justify-between text-xs text-[#8A8D98]">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#4ade80]" />
            AVR8js & GNU Assembly Kompatibilis
          </span>
          <button
            id="btn-reverse-modal-close-bottom"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1F232B] hover:bg-[#2A2D35] text-white font-bold rounded-xs border border-[#3A3F4B] transition-colors cursor-pointer"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
