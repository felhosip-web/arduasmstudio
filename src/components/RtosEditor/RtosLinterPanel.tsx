/**
 * (c) 2026 AI Studio - Dedicated FreeRTOS Concurrency Linter & Auto-Fix Panel
 * Analyzes real-time architectures for race conditions, deadlocks, starvation,
 * and provides instant 1-click automatic intervention (Auto-Fix).
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Sparkles,
  Flame,
  RotateCcw,
} from 'lucide-react';
import { RtosLintReport } from '../../utils/rtosLinter';
import { RtosLinterIssue } from '../../types';

interface RtosLinterPanelProps {
  lintReport: RtosLintReport;
  onApplyAutoFix: (autoFix: RtosLinterIssue['autoFix']) => void;
  onApplyAllAutoFixes: () => void;
  onHighlightNodes: (nodeIds: string[]) => void;
  lastFixMessage?: string | null;
}

export const RtosLinterPanel: React.FC<RtosLinterPanelProps> = ({
  lintReport,
  onApplyAutoFix,
  onApplyAllAutoFixes,
  onHighlightNodes,
  lastFixMessage,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { issues, criticalCount, warningCount, infoCount, healthScore } = lintReport;

  const hasIssues = issues.length > 0;
  const autoFixableCount = issues.filter((i) => i.autoFixAvailable && i.autoFix).length;

  return (
    <div className="bg-[#12141A] border-t border-[#2A2D35] flex flex-col select-none transition-all duration-200">
      {/* Panel Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3 py-2 bg-[#0F1115] hover:bg-[#161920] border-b border-[#2A2D35] flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {criticalCount > 0 ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
            ) : warningCount > 0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              FreeRTOS Architektúra Linter & Beavatkozó Motor
            </span>
          </div>

          {/* Health Score Pill */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#161920] border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono">Egészség:</span>
            <span
              className={`text-xs font-mono font-bold ${
                healthScore >= 90
                  ? 'text-emerald-400'
                  : healthScore >= 60
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {healthScore}%
            </span>
          </div>

          {/* Issue Counters */}
          <div className="flex items-center gap-1 text-[10px] font-mono">
            {criticalCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60 font-bold">
                {criticalCount} Kritikus
              </span>
            )}
            {warningCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-bold">
                {warningCount} Figyelmeztetés
              </span>
            )}
            {infoCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-bold">
                {infoCount} Info
              </span>
            )}
            {!hasIssues && (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Nincs észlelt párhuzamossági hiba!
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {autoFixableCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onApplyAllAutoFixes();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-black font-bold font-mono text-[10px] uppercase tracking-wider shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Összes Beavatkozás ({autoFixableCount})</span>
            </button>
          )}

          <button
            type="button"
            className="p-1 text-slate-400 hover:text-white"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Issues Body */}
      {isExpanded && (
        <div className="max-h-48 overflow-y-auto p-2.5 space-y-2">
          {/* Last Fix Success Toast */}
          {lastFixMessage && (
            <div className="p-2 rounded bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{lastFixMessage}</span>
            </div>
          )}

          {/* List of Detected Issues */}
          {issues.map((issue) => (
            <div
              key={issue.id}
              onClick={() => onHighlightNodes(issue.affectedNodeIds)}
              className={`p-2.5 rounded border transition-all cursor-pointer ${
                issue.severity === 'critical'
                  ? 'bg-rose-950/30 border-rose-500/40 hover:border-rose-400'
                  : issue.severity === 'warning'
                  ? 'bg-amber-950/30 border-amber-500/40 hover:border-amber-400'
                  : 'bg-blue-950/30 border-blue-500/40 hover:border-blue-400'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                        issue.severity === 'critical'
                          ? 'bg-rose-900 text-rose-200 border-rose-700'
                          : issue.severity === 'warning'
                          ? 'bg-amber-900 text-amber-200 border-amber-700'
                          : 'bg-blue-900 text-blue-200 border-blue-700'
                      }`}
                    >
                      {issue.severity === 'critical' ? 'Kritikus' : issue.severity === 'warning' ? 'Figyelmeztetés' : 'Info'}
                    </span>
                    <span className="text-xs font-bold text-slate-100">{issue.title}</span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{issue.message}</p>
                </div>

                {/* 1-Click Auto-Fix Button (Beavatkozás) */}
                {issue.autoFixAvailable && issue.autoFix && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApplyAutoFix(issue.autoFix);
                    }}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-[11px] shadow-[2px_2px_0px_#000] transition-transform active:translate-y-0.5 cursor-pointer"
                    title={issue.autoFix.description}
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>{issue.autoFix.label}</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {!hasIssues && (
            <div className="text-center py-4 text-slate-400 text-xs font-mono">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-1.5" />
              <p className="font-bold text-slate-200">Az architektúra teljesen stabil és hibamentes!</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Nincsenek észlelt adatversenyek, holtpontok (deadlock) vagy taszk kiéheztetési problémák.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
