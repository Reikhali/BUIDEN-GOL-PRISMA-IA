import React from 'react';
import { SignalRecord } from '../types';
import { Sparkles, CheckCircle2, AlertTriangle, Radio } from 'lucide-react';
import { formatCountdown } from '../utils/time';

interface BotPrismaCardProps {
  activeSignal: SignalRecord | null;
  isAnalyzing: boolean;
  candleTimeRemaining: number;
  errorMessage?: string;
}

export const LiveAnalysisPanel: React.FC<BotPrismaCardProps> = ({
  activeSignal,
  isAnalyzing,
  candleTimeRemaining,
  errorMessage,
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Bot PRISMA Status Card - Continuous Loop */}
      <div className="glass-card p-4 flex flex-col gap-2.5 relative border-[#8B5CF6]/40 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#A855F7]/20 pb-2">
          <span className="flex items-center gap-1.5 font-space font-bold text-xs uppercase tracking-wider text-[#C084FC]">
            <Sparkles className="w-4 h-4 text-[#FFE600] animate-spin" />
            BOT PRISMA IA
          </span>
          <span className="text-[11px] font-mono text-amber-300 font-bold bg-[#05030A] px-2 py-0.5 rounded border border-[#A855F7]/30">
            ⏳ {formatCountdown(candleTimeRemaining)}
          </span>
        </div>

        {/* State details */}
        {activeSignal && activeSignal.status !== 'CLOSED' ? (
          <div
            className={`rounded-xl p-3 flex flex-col gap-2 border transition-all ${
              activeSignal.direction === 'COMPRA'
                ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_20px_rgba(34,197,94,0.25)]'
                : 'bg-rose-950/40 border-rose-500/60 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> SINAL GERADO ✅
              </span>
              <span className="text-[11px] font-mono font-bold bg-[#FFE600] text-black px-2 py-0.5 rounded shadow-sm">
                {activeSignal.logic}
              </span>
            </div>

            <div className="flex items-center justify-between my-0.5">
              <span
                className={`text-lg font-space font-black uppercase tracking-wider ${
                  activeSignal.direction === 'COMPRA' ? 'text-[#22C55E]' : 'text-[#EF4444]'
                }`}
              >
                {activeSignal.direction === 'COMPRA' ? '🟢 COMPRA (CALL)' : '🔴 VENDA (PUT)'}
              </span>
              <span className="font-mono text-xs text-white font-bold">
                {activeSignal.price.toFixed(5)}
              </span>
            </div>

            <div className="text-[11px] text-slate-200 border-t border-white/10 pt-1.5 flex items-center justify-between font-mono">
              <span className="text-slate-400">Ativo detectado:</span>
              <span className="text-[#FFE600] font-bold">{activeSignal.asset}</span>
            </div>
          </div>
        ) : (
          <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs font-space font-bold text-[#E9D5FF]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C084FC] animate-ping" />
              ANALISANDO VELA ATUAL EM TEMPO REAL…
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Monitorando rompimento de máxima/mínima, médias e ação de preço da corretora.
            </p>
            <div className="flex items-center justify-between text-[11px] font-mono text-purple-200 mt-1 pt-1 border-t border-purple-500/20">
              <span className="text-slate-400">Fechamento da vela em:</span>
              <span className="font-bold text-amber-300">{candleTimeRemaining}s</span>
            </div>
          </div>
        )}
      </div>

      {/* Error / Warning Notice if less than 10 candles found */}
      {errorMessage && (
        <div className="bg-rose-950/70 border border-rose-500/50 rounded-xl p-3 flex items-start gap-2 text-rose-200 text-xs shadow-lg animate-pulse">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="leading-snug">{errorMessage}</div>
        </div>
      )}
    </div>
  );
};
