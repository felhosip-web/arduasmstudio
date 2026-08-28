import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  Download,
  Code2,
  Zap,
  Terminal,
  Clock,
  Sparkles,
  Layers,
  Search,
  X,
  WrapText,
  AlignLeft,
  ZoomIn,
  ZoomOut,
  Info,
  FileCode,
  Hash,
  FolderArchive,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { GeneratedCodeOutput } from '../utils/codeGenerator';
import { HighlightedCode, LanguageType } from '../utils/syntaxHighlighter';

interface CodeViewerProps {
  codeOutput: GeneratedCodeOutput;
  onOpenZipExport?: () => void;
  onOpenReverseEngine?: () => void;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  codeOutput,
  onOpenZipExport,
  onOpenReverseEngine,
}) => {
  const isEsp32 = codeOutput.targetMcu === 'esp32';
  const [activeTab, setActiveTab] = useState<'pureAsm' | 'arduinoC' | 'inlineAsmC' | 'freeRtosC'>('pureAsm');
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true);
  const [wrapLines, setWrapLines] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(12);
  const [showLegend, setShowLegend] = useState<boolean>(false);

  const getCurrentCode = (): string => {
    switch (activeTab) {
      case 'pureAsm':
        return codeOutput.pureAsm;
      case 'arduinoC':
        return codeOutput.arduinoC;
      case 'inlineAsmC':
        return codeOutput.inlineAsmC;
      case 'freeRtosC':
        return codeOutput.freeRtosC || codeOutput.arduinoC;
      default:
        return '';
    }
  };

  const getLanguageType = (): LanguageType => {
    switch (activeTab) {
      case 'pureAsm':
        return 'asm';
      case 'arduinoC':
      case 'freeRtosC':
        return 'c';
      case 'inlineAsmC':
        return 'inlineAsm';
    }
  };

  const getFilename = (): string => {
    if (isEsp32) {
      switch (activeTab) {
        case 'pureAsm':
          return 'app_main.S';
        case 'arduinoC':
          return 'esp32_sketch.ino';
        case 'inlineAsmC':
          return 'esp32_inline_xtensa.ino';
        case 'freeRtosC':
          return 'esp32_freertos_dualcore.ino';
      }
    }
    switch (activeTab) {
      case 'pureAsm':
        return 'sketch.S';
      case 'arduinoC':
        return 'sketch_arduino.ino';
      case 'inlineAsmC':
        return 'sketch_inline_asm.ino';
      default:
        return 'sketch.ino';
    }
  };

  const currentCode = getCurrentCode();
  const lineCount = useMemo(() => currentCode.split('\n').length, [currentCode]);
  const byteSize = useMemo(() => new Blob([currentCode]).size, [currentCode]);

  // Match counter for search
  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    try {
      const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      const matches = currentCode.match(regex);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }, [currentCode, searchQuery]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // fallback
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([currentCode], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = getFilename();
    document.body.appendChild(element);
    element.click();
    element.remove();
  };

  return (
    <div
      id="code-viewer"
      className="flex flex-col bg-[#0F1115] border-t border-[#2A2D35] h-full overflow-hidden"
    >
      {/* Code Header & Tab Bar */}
      <div className="bg-[#161920] px-3 py-2 border-b border-[#2A2D35] flex flex-wrap items-center justify-between gap-2.5">
        {/* Code Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0F1115] rounded-xs border border-[#2A2D35] shadow-[2px_2px_0px_#000]">
          <button
            id="tab-code-asm"
            onClick={() => setActiveTab('pureAsm')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'pureAsm'
                ? isEsp32 ? 'bg-[#38bdf8] text-black shadow-[1px_1px_0px_#000]' : 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
                : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isEsp32 ? 'Xtensa Assembly (.S)' : 'AVR Assembly (.S)'}</span>
          </button>

          <button
            id="tab-code-c"
            onClick={() => setActiveTab('arduinoC')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'arduinoC'
                ? isEsp32 ? 'bg-[#38bdf8] text-black shadow-[1px_1px_0px_#000]' : 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
                : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{isEsp32 ? 'ESP32 C++ / ESP-IDF' : 'Arduino C / C++ (.ino)'}</span>
          </button>

          <button
            id="tab-code-inline"
            onClick={() => setActiveTab('inlineAsmC')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'inlineAsmC'
                ? isEsp32 ? 'bg-[#38bdf8] text-black shadow-[1px_1px_0px_#000]' : 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
                : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{isEsp32 ? 'Inline Xtensa ASM' : 'C + Inline ASM (.ino)'}</span>
          </button>

          {isEsp32 && (
            <button
              id="tab-code-freertos"
              onClick={() => setActiveTab('freeRtosC')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'freeRtosC'
                  ? 'bg-[#38bdf8] text-black shadow-[1px_1px_0px_#000]'
                  : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>FreeRTOS Dual-Core</span>
            </button>
          )}
        </div>

        {/* Viewer Tools & Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Search Toggle */}
          {showSearch ? (
            <div className="flex items-center gap-1.5 bg-[#0F1115] border border-[#2A2D35] px-2 py-1 rounded-xs text-xs">
              <Search className="w-3.5 h-3.5 text-[#8A8D98]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Keresés a kódban..."
                className="bg-transparent text-xs text-[#E0E0E6] placeholder-[#8A8D98] focus:outline-none w-36 font-mono"
                autoFocus
              />
              {searchQuery && (
                <span className="text-[10px] text-amber-400 font-mono font-bold">
                  {matchCount} találat
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSearch(false);
                }}
                className="text-[#8A8D98] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-1.5 bg-[#1A1D24] hover:bg-[#252A35] text-[#8A8D98] hover:text-[#E0E0E6] border border-[#2A2D35] rounded-xs shadow-[1px_1px_0px_#000] transition-colors"
              title="Keresés a forráskódban"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Line Numbers Toggle */}
          <button
            onClick={() => setShowLineNumbers((prev) => !prev)}
            className={`p-1.5 rounded-xs border text-xs font-mono transition-colors shadow-[1px_1px_0px_#000] ${
              showLineNumbers
                ? 'bg-[#252A35] text-[#4ade80] border-[#4ade80]/40'
                : 'bg-[#1A1D24] text-[#8A8D98] border-[#2A2D35] hover:text-[#E0E0E6]'
            }`}
            title="Sorszámok megjelenítése / elrejtése"
          >
            <Hash className="w-3.5 h-3.5" />
          </button>

          {/* Word Wrap Toggle */}
          <button
            onClick={() => setWrapLines((prev) => !prev)}
            className={`p-1.5 rounded-xs border text-xs font-mono transition-colors shadow-[1px_1px_0px_#000] ${
              wrapLines
                ? 'bg-[#252A35] text-[#4ade80] border-[#4ade80]/40'
                : 'bg-[#1A1D24] text-[#8A8D98] border-[#2A2D35] hover:text-[#E0E0E6]'
            }`}
            title={wrapLines ? 'Sortörés bekapcsolva' : 'Sortörés kikapcsolva'}
          >
            {wrapLines ? <WrapText className="w-3.5 h-3.5" /> : <AlignLeft className="w-3.5 h-3.5" />}
          </button>

          {/* Font Size Adjusters */}
          <div className="flex items-center bg-[#1A1D24] border border-[#2A2D35] rounded-xs shadow-[1px_1px_0px_#000]">
            <button
              onClick={() => setFontSize((f) => Math.max(10, f - 1))}
              className="p-1.5 text-[#8A8D98] hover:text-[#E0E0E6] transition-colors"
              title="Betűméret csökkentése"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1 text-[#8A8D98] select-none">
              {fontSize}px
            </span>
            <button
              onClick={() => setFontSize((f) => Math.min(18, f + 1))}
              className="p-1.5 text-[#8A8D98] hover:text-[#E0E0E6] transition-colors"
              title="Betűméret növelése"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Syntax Legend Toggle */}
          <button
            onClick={() => setShowLegend((prev) => !prev)}
            className={`p-1.5 rounded-xs border text-xs font-mono transition-colors shadow-[1px_1px_0px_#000] ${
              showLegend
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#1A1D24] text-[#8A8D98] border-[#2A2D35] hover:text-[#E0E0E6]'
            }`}
            title="Szintaxis Színmagyarázat (Legend)"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-[#2A2D35] mx-1" />

          {/* Reverse Parser & ZIP Export Buttons */}
          {onOpenReverseEngine && (
            <button
              id="btn-codeviewer-reverse-engine"
              onClick={onOpenReverseEngine}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold uppercase bg-[#1A1D24] hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-xs shadow-[2px_2px_0px_#000] transition-colors"
              title="Assembly kód visszafejtése blokkokká & Intel HEX Disassembler"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Visszafejtés</span>
            </button>
          )}

          {onOpenZipExport && (
            <button
              id="btn-codeviewer-zip-export"
              onClick={onOpenZipExport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold uppercase bg-[#1A1D24] hover:bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/40 rounded-xs shadow-[2px_2px_0px_#000] transition-colors"
              title="PlatformIO & Arduino IDE komplett ZIP letöltése"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Projekt ZIP</span>
            </button>
          )}

          {/* Copy Button */}
          <button
            id="btn-copy-code"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase bg-[#1A1D24] hover:border-[#4ade80] text-[#E0E0E6] border border-[#3A3F4B] rounded-xs shadow-[2px_2px_0px_#000] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                <span className="text-[#4ade80]">Másolva!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Másolás</span>
              </>
            )}
          </button>

          {/* Download Button */}
          <button
            id="btn-download-code"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase bg-[#4ade80] hover:bg-[#3ec973] text-black rounded-xs shadow-[2px_2px_0px_#000] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Letöltés</span>
          </button>
        </div>
      </div>

      {/* Syntax Color Legend Popover */}
      {showLegend && (
        <div className="bg-[#12141A] border-b border-amber-500/30 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono animate-fadeIn">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[#8A8D98] uppercase font-bold text-[10px]">Színkulcs:</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" />
              <span className="text-[#38BDF8] font-bold">AVR Utasítások (ldi, out, rjmp)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" />
              <span className="text-[#FBBF24]">Regiszterek & Portok (r16, PORTB, DDRD)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FB7185]" />
              <span className="text-[#FB7185]">Direktívák (#include, .global, .text)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#A78BFA]" />
              <span className="text-[#A78BFA]">C Kulcsszavak & Típusok (volatile, uint8_t)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80]" />
              <span className="text-[#4ADE80]">Függvények (setup, pinMode, _BV)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FB923C]" />
              <span className="text-[#FB923C]">Számértékek (0x20, 0b001, 16000000UL)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7E8694]" />
              <span className="text-[#7E8694] italic">Megjegyzések (; // /*)</span>
            </span>
          </div>
          <button
            onClick={() => setShowLegend(false)}
            className="text-[#8A8D98] hover:text-white text-xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Code Metrics Highlight Ribbon */}
      <div className="bg-[#161920] px-4 py-1.5 border-b border-[#2A2D35] flex flex-wrap items-center justify-between gap-2 text-xs text-[#8A8D98]">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>CIKLUSSZÁM:</span>
            <strong className="text-amber-300 font-bold">
              {codeOutput.stats.loopCycles} ÓRACIKLUS
            </strong>
          </span>

          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>FŐCIKLUS IDEJE:</span>
            <strong className="text-[#4ade80] font-bold">
              {codeOutput.stats.loopTimeFormatted}
            </strong>
          </span>

          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <Layers className="w-3.5 h-3.5 text-orange-400" />
            <span>FREKVENCIA:</span>
            <strong className="text-orange-300 font-bold">
              {codeOutput.stats.loopFrequencyFormatted}
            </strong>
          </span>

          <span className="flex items-center gap-1 font-mono text-[11px] text-[#8A8D98]">
            <FileCode className="w-3.5 h-3.5 text-sky-400" />
            <span>{lineCount} sor ({byteSize} B)</span>
          </span>
        </div>

        <div className="text-[10px] font-mono text-[#8A8D98] bg-[#0F1115] px-2.5 py-0.5 rounded-xs border border-[#2A2D35] shadow-[1px_1px_0px_#000]">
          <span className="text-[#4ade80] font-bold">AVR OPTIMALIZÁCIÓ:</span> ~25x gyorsabb mint a standard <code className="text-orange-300">digitalWrite()</code>
        </div>
      </div>

      {/* Code Text Area with Syntax Highlighting */}
      <div className="flex-1 overflow-auto p-3 bg-[#0B0D11] custom-scrollbar">
        <HighlightedCode
          code={currentCode}
          language={getLanguageType()}
          showLineNumbers={showLineNumbers}
          searchQuery={searchQuery}
          fontSize={fontSize}
          wrapLines={wrapLines}
        />
      </div>
    </div>
  );
};

