/**
 * (c) 2026 AI Studio - FreeRTOS C++ Code Viewer Modal
 */

import React, { useState } from 'react';
import { X, Copy, Check, Download, Code2, Sparkles, Cpu } from 'lucide-react';

interface RtosCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
}

export const RtosCodeModal: React.FC<RtosCodeModalProps> = ({ isOpen, onClose, code }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `esp32_freertos_app_${Date.now()}.ino`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <div className="bg-[#12141A] border-2 border-cyan-500/60 rounded-xs w-full max-w-4xl max-h-[85vh] flex flex-col shadow-[8px_8px_0px_#000] overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-[#2A2D35] bg-[#0F1115] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-cyan-950/80 border border-cyan-800">
              <Code2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
                Generált ESP32 FreeRTOS C++ Forráskód
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Xtensa LX6 Kétmagos SMP • FreeRTOS 10.4.3 • Arduino IDE / ESP-IDF kompatibilis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#161920] hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs font-bold transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Másolva!' : 'Másolás'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold transition-all shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Letöltés (.ino)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Code Body */}
        <div className="flex-1 overflow-auto p-4 bg-[#0A0C10] font-mono text-xs text-slate-300 leading-relaxed select-text">
          <pre className="overflow-x-auto whitespace-pre">
            <code>{code}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-[#2A2D35] bg-[#0F1115] flex items-center justify-between text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Közvetlenül feltölthető ESP32 DevKit V1 modulra.</span>
          </div>
          <span>Sorok száma: {code.split('\n').length}</span>
        </div>
      </div>
    </div>
  );
};
