import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Send,
  Trash2,
  ArrowDownCircle,
  Radio,
  Clock,
  Sparkles,
  Binary,
  RotateCcw,
} from 'lucide-react';
import { SimulationState } from '../types';

interface SerialTerminalProps {
  simState: SimulationState;
  onSendSerialInput: (input: string) => void;
  onClearTerminal: () => void;
}

export const SerialTerminal: React.FC<SerialTerminalProps> = ({
  simState,
  onSendSerialInput,
  onClearTerminal,
}) => {
  const [inputText, setInputText] = useState('');
  const [lineEnding, setLineEnding] = useState<string>('\\r\\n');
  const [showHexMode, setShowHexMode] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const uart = simState.uartState;
  const isOnline = uart?.initialized || false;
  const baudRate = uart?.baudRate || 9600;
  const ubrrVal = Math.round(16000000 / (16 * baudRate)) - 1;

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [uart?.terminalText, uart?.log, autoScroll]);

  const handleSend = () => {
    if (!inputText.trim() && lineEnding === 'none') return;

    let payload = inputText;
    if (lineEnding === '\\n') payload += '\n';
    else if (lineEnding === '\\r') payload += '\r';
    else if (lineEnding === '\\r\\n') payload += '\r\n';

    onSendSerialInput(payload);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const quickSend = (text: string) => {
    let payload = text;
    if (lineEnding === '\\n') payload += '\n';
    else if (lineEnding === '\\r') payload += '\r';
    else if (lineEnding === '\\r\\n') payload += '\r\n';
    onSendSerialInput(payload);
  };

  return (
    <div
      id="serial-terminal-container"
      className="flex flex-col h-full bg-[#0F1115] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000] overflow-hidden select-none"
    >
      {/* Terminal Top Control Bar */}
      <div className="bg-[#161920] px-3 py-2 border-b border-[#2A2D35] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#4ade80]" />
          <span className="font-bold text-xs text-white uppercase tracking-wider font-mono">
            Soros Terminál Emulátor
          </span>
          <span
            className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-xs uppercase border ${
              isOnline
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {isOnline ? 'USART0 AKTÍV' : 'INAKTÍV (UART INIT SZÜKSÉGES)'}
          </span>
        </div>

        {/* Status Indicators: TX / RX LEDs & Baud Rate */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          {/* TX LED */}
          <div className="flex items-center gap-1 bg-[#1A1D24] px-2 py-0.5 rounded-xs border border-[#3A3F4B]">
            <span
              className={`w-2 h-2 rounded-full transition-all duration-150 ${
                uart?.txLed
                  ? 'bg-emerald-400 shadow-[0_0_8px_#4ade80]'
                  : 'bg-emerald-950 border border-emerald-800'
              }`}
            />
            <span className="text-[10px] text-[#8A8D98]">TX (D1)</span>
          </div>

          {/* RX LED */}
          <div className="flex items-center gap-1 bg-[#1A1D24] px-2 py-0.5 rounded-xs border border-[#3A3F4B]">
            <span
              className={`w-2 h-2 rounded-full transition-all duration-150 ${
                uart?.rxLed
                  ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                  : 'bg-amber-950 border border-amber-800'
              }`}
            />
            <span className="text-[10px] text-[#8A8D98]">RX (D0)</span>
          </div>

          <div className="bg-[#1A1D24] px-2 py-0.5 rounded-xs border border-[#3A3F4B] text-[10px] text-[#4ade80]">
            {baudRate} Baud (UBRR0={ubrrVal})
          </div>

          {/* Hex View Mode Toggle */}
          <button
            onClick={() => setShowHexMode(!showHexMode)}
            className={`px-2 py-0.5 rounded-xs text-[10px] border flex items-center gap-1 transition-colors ${
              showHexMode
                ? 'bg-purple-950/80 text-purple-300 border-purple-500'
                : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
            }`}
            title="HEX byte dump nézet váltása"
          >
            <Binary className="w-3 h-3" />
            <span>HEX</span>
          </button>

          {/* Clear Button */}
          <button
            onClick={onClearTerminal}
            className="p-1 rounded-xs bg-[#1A1D24] hover:bg-rose-950/50 text-[#8A8D98] hover:text-rose-400 border border-[#3A3F4B] hover:border-rose-500/40 transition-colors"
            title="Terminál tartalmának törlése"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Terminal Screen Output */}
      <div
        id="serial-terminal-screen"
        className="flex-1 p-3 overflow-y-auto font-mono text-xs bg-[#090A0D] text-[#4ade80] space-y-1 select-text scrollbar-thin scrollbar-thumb-[#2A2D35]"
      >
        {(!uart?.log || uart.log.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-[#5A5E6B] text-center p-6 space-y-2">
            <Radio className="w-8 h-8 opacity-30 text-[#4ade80]" />
            <p className="text-xs font-mono">
              A soros terminál készenlétben van.
            </p>
            <p className="text-[11px] text-[#4A4E5B] max-w-sm">
              Használj <code className="text-[#4ade80] bg-[#161920] px-1 py-0.5 rounded-xs">UART Init</code> és{' '}
              <code className="text-[#4ade80] bg-[#161920] px-1 py-0.5 rounded-xs">UART Szöveg Küldése</code> blokkot a blokkprogramodban, vagy küldj bemenetet az alábbi soron!
            </p>
          </div>
        )}

        {uart?.log &&
          [...uart.log].reverse().map((entry) => (
            <div
              key={entry.id}
              className={`flex items-start gap-2 text-[11px] py-0.5 leading-relaxed border-b border-[#1A1D24]/40 ${
                entry.direction === 'TX' ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {showTimestamps && (
                <span className="text-[#5A5E6B] text-[9px] min-w-[58px] select-none">
                  +{(entry.timestampNs / 1000000).toFixed(2)}ms
                </span>
              )}
              <span
                className={`text-[9px] px-1 py-0.2 rounded-xs font-bold select-none ${
                  entry.direction === 'TX'
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                    : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                }`}
              >
                {entry.direction === 'TX' ? 'TX → PC' : 'RX ← PC'}
              </span>

              {showHexMode ? (
                <div className="font-mono text-purple-300">
                  <span className="text-[#8A8D98] mr-2">HEX: [{entry.hex}]</span>
                  <span className="text-white opacity-80">ASCII: "{entry.text}"</span>
                </div>
              ) : (
                <div className="font-mono whitespace-pre-wrap break-all">
                  {entry.text}
                </div>
              )}
            </div>
          ))}

        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Bottom Input Bar */}
      <div className="bg-[#161920] p-2 border-t border-[#2A2D35] flex flex-col gap-2">
        {/* Quick Send Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono text-[#8A8D98]">
          <span className="text-[#5A5E6B] text-[9px] uppercase font-bold">Gyorsküldés:</span>
          {['PING', 'STATUS', '1', '0', 'AT', 'RESET'].map((chip) => (
            <button
              key={chip}
              onClick={() => quickSend(chip)}
              className="px-2 py-0.5 bg-[#1A1D24] hover:bg-[#2A2D35] hover:text-[#4ade80] border border-[#3A3F4B] rounded-xs transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Text Box + Controls */}
        <div className="flex items-center gap-1.5">
          <input
            id="serial-terminal-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Üzenet vagy parancs küldése az Arduino felé (RX D0)..."
            className="flex-1 bg-[#0F1115] border border-[#3A3F4B] focus:border-[#4ade80] text-xs text-[#E0E0E6] px-3 py-1.5 rounded-xs font-mono focus:outline-none transition-colors"
          />

          {/* Line Ending Selector */}
          <select
            value={lineEnding}
            onChange={(e) => setLineEnding(e.target.value)}
            className="bg-[#1A1D24] border border-[#3A3F4B] text-[10px] text-[#E0E0E6] px-2 py-1.5 rounded-xs focus:outline-none focus:border-[#4ade80] font-mono cursor-pointer"
            title="Soremelés formátum"
          >
            <option value="none">Nincs soremelés</option>
            <option value="\n">Új sor (\n)</option>
            <option value="\r">Kocsi-vissza (\r)</option>
            <option value="\r\n">Mindkettő (\r\n)</option>
          </select>

          {/* Send Button */}
          <button
            id="btn-send-serial-command"
            onClick={handleSend}
            className="flex items-center gap-1 bg-[#4ade80] hover:bg-[#3ec973] text-black font-bold px-3 py-1.5 rounded-xs text-xs shadow-[1px_1px_0px_#000] transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Küldés</span>
          </button>
        </div>
      </div>
    </div>
  );
};
