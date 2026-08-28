import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  Wrench,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Check,
} from 'lucide-react';
import { ValidationReport, BlockValidationIssue } from '../utils/blockValidator';
import { ProgramBlock } from '../types';

interface ValidationBannerProps {
  report: ValidationReport;
  blocks: ProgramBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<ProgramBlock[]>>;
  onFocusBlock?: (blockId: string) => void;
}

export const ValidationBanner: React.FC<ValidationBannerProps> = ({
  report,
  blocks,
  setBlocks,
  onFocusBlock,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [fixedIssueIds, setFixedIssueIds] = useState<Set<string>>(new Set());

  const { isValid, errorCount, warningCount, infoCount, issues } = report;

  const handleApplyFix = (issue: BlockValidationIssue) => {
    if (!issue.quickFix) return;
    const updated = issue.quickFix.apply(blocks);
    setBlocks(updated);
    setFixedIssueIds((prev) => new Set(prev).add(issue.id));
  };

  const handleApplyAllFixes = () => {
    let currentBlocks = [...blocks];
    issues.forEach((issue) => {
      if (issue.quickFix) {
        currentBlocks = issue.quickFix.apply(currentBlocks);
      }
    });
    setBlocks(currentBlocks);
    setFixedIssueIds(new Set(issues.map((i) => i.id)));
  };

  const fixableIssuesCount = issues.filter((i) => i.quickFix).length;

  if (isValid && issues.length === 0) {
    return (
      <div className="bg-[#121814] border-b border-emerald-500/20 px-4 py-2 flex items-center justify-between text-xs transition-all">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
          <span className="font-mono font-medium">
            Minden blokk érvényes, nincs hardveres vagy regiszter konfliktus.
          </span>
        </div>
        <span className="text-[10px] font-mono bg-[#16221A] text-emerald-300 px-2 py-0.5 rounded-xs border border-emerald-500/30">
          AVR-Ready
        </span>
      </div>
    );
  }

  return (
    <div
      className={`border-b transition-all ${
        errorCount > 0
          ? 'bg-[#1C1215] border-rose-500/30 text-rose-200'
          : warningCount > 0
          ? 'bg-[#1C1810] border-amber-500/30 text-amber-200'
          : 'bg-[#101722] border-sky-500/30 text-sky-200'
      }`}
    >
      {/* Summary Header Row */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          {errorCount > 0 ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
          ) : warningCount > 0 ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
          )}

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-bold tracking-wide">
              {errorCount > 0
                ? 'Hardver / Szintaktikai probléma észlelve'
                : 'Optimalizálási javaslatok elérhetők'}
              :
            </span>

            {errorCount > 0 && (
              <span className="bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-xs border border-rose-500/40">
                {errorCount} HIBA
              </span>
            )}
            {warningCount > 0 && (
              <span className="bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-xs border border-amber-500/40">
                {warningCount} FIGYELMEZTETÉS
              </span>
            )}
            {infoCount > 0 && (
              <span className="bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-xs border border-sky-500/40">
                {infoCount} JAVASLAT
              </span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {fixableIssuesCount > 1 && (
            <button
              onClick={handleApplyAllFixes}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#4ade80] hover:bg-[#22c55e] text-black text-xs font-bold font-mono transition-colors shadow-[1px_1px_0px_#000]"
              title="Minden automatikus javítási javaslat egyidejű végrehajtása"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Összes Javítása ({fixableIssuesCount})</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-1 px-2 py-1 rounded-xs bg-[#161920] hover:bg-[#222733] text-xs font-mono border border-[#3A3F4B] transition-colors"
          >
            <span>{isExpanded ? 'Részletek elrejtése' : 'Részletek megtekintése'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Issue List & Fixes */}
      {isExpanded && (
        <div className="px-4 pb-3 pt-1 space-y-2 border-t border-white/5 bg-black/20">
          {issues.map((issue) => {
            const isFixed = fixedIssueIds.has(issue.id);

            return (
              <div
                key={issue.id}
                className={`p-2.5 rounded-xs border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                  issue.severity === 'error'
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-100'
                    : issue.severity === 'warning'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-100'
                    : 'bg-sky-950/30 border-sky-500/40 text-sky-100'
                }`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-mono text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-xs border ${
                        issue.severity === 'error'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : issue.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      }`}
                    >
                      {issue.severity === 'error'
                        ? 'HIBA'
                        : issue.severity === 'warning'
                        ? 'FIGYELEM'
                        : 'JAVASLAT'}
                    </span>

                    {issue.scope && (
                      <span className="font-mono text-[9px] text-[#8A8D98] bg-[#0F1115] px-1.5 py-0.2 rounded-xs border border-[#2A2D35]">
                        Szakasz: {issue.scope}
                      </span>
                    )}

                    <strong className="font-semibold text-white">{issue.title}</strong>
                  </div>

                  <p className="text-[11px] opacity-90 leading-relaxed">{issue.message}</p>
                </div>

                {/* Quick Fix Button */}
                <div className="flex items-center gap-2 shrink-0">
                  {issue.blockId && onFocusBlock && (
                    <button
                      onClick={() => onFocusBlock(issue.blockId!)}
                      className="px-2 py-1 text-[10px] font-mono text-[#8A8D98] hover:text-white bg-[#1A1D24] hover:bg-[#252A35] rounded-xs border border-[#3A3F4B] transition-colors"
                      title="Ugrás a hibás blokkhoz a szerkesztőben"
                    >
                      Ugrás a blokkhoz
                    </button>
                  )}

                  {issue.quickFix && (
                    <button
                      onClick={() => handleApplyFix(issue)}
                      disabled={isFixed}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-bold font-mono transition-all shadow-[1px_1px_0px_#000] ${
                        isFixed
                          ? 'bg-emerald-700 text-white cursor-default'
                          : 'bg-amber-400 hover:bg-amber-300 text-black hover:scale-102 active:scale-98'
                      }`}
                    >
                      {isFixed ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Javítva</span>
                        </>
                      ) : (
                        <>
                          <Wrench className="w-3.5 h-3.5" />
                          <span>{issue.quickFix.label}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
