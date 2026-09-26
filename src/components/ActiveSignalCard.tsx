import React from 'react';
import { SignalRecord } from '../types';
import { TrendingUp, TrendingDown, Hourglass, CheckCircle2, XCircle, Zap, Sparkles } from 'lucide-react';
import { formatCountdown } from '../utils/time';

interface ActiveSignalCardProps {
  signal: SignalRecord;
  currentPrice: number;
  timeRemainingSeconds: number;
  onDismiss: () => void;
}

export const ActiveSignalCard: React.FC<ActiveSignalCardProps> = ({
  signal,
  currentPrice,
  timeRemainingSeconds,
  onDismiss,
}) => {
  const isBuy = signal.direction === 'COMPRA';
  const isWin = signal.outcome === 'WIN';
  const isLoss = signal.outcome === 'LOSS';
  const isClosed = signal.outcome === 'WIN' || signal.outcome === 'LOSS';

  // Difference in points between current price and entry price
  const entryPrice = signal.entryCandlePrice ?? signal.price;
  const currentDiff = isBuy ? currentPrice - entryPrice : entryPrice - currentPrice;
  const isCurrentlyInMoney = currentDiff > 0;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`glass-card p-4 shadow-2xl border-2 transition-all duration-300 ${
          isClosed
            ? isWin
              ? 'border-emerald-500/70 bg-[#0B0714]/95 shadow-[0_0_35px_rgba(34,197,94,0.45)]'
              : 'border-rose-500/70 bg-[#0B0714]/95 shadow-[0_0_35px_rgba(239,68,68,0.45)]'
            : isBuy
            ? 'border-emerald-500/60 bg-[#0B0714]/95 shadow-[0_0_30px_rgba(34,197,94,0.35)]'
            : 'border-rose-500/60 bg-[#0B0714]/95 shadow-[0_0_30px_rgba(239,68,68,0.35)]'
        }`}
      >
        {/* Header: Status and Logic */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
          <div className="flex items-center gap-2">
            {isClosed ? (
              isWin ? (
                <span className="flex items-center gap-1.5 text-xs font-space font-extrabold text-[#22C55E] uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                  OPERAÇÃO FINALIZADA — WIN! ✅
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-space font-extrabold text-[#EF4444] uppercase tracking-wider">
                  <XCircle className="w-4 h-4 text-[#EF4444]" />
                  OPERAÇÃO FINALIZADA — LOSS ❌
                </span>
              )
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-space font-bold text-[#FFE600] uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-[#FFE600] animate-spin" />
                SINAL DE ENTRADA ATIVO
              </span>
            )}
          </div>

          <span className="bg-[#FFE600] text-black font-mono font-extrabold text-xs px-2.5 py-0.5 rounded shadow">
            {signal.logic}
          </span>
        </div>

        {/* Direction & Asset */}
        <div className="flex items-center justify-between my-1">
          <div className="flex items-center gap-2">
            <span
              className={`p-2 rounded-xl text-white ${
                isBuy ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
              }`}
            >
              {isBuy ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
            </span>
            <div>
              <div
                className={`font-space font-black text-xl tracking-wider uppercase ${
                  isBuy ? 'text-[#22C55E]' : 'text-[#EF4444]'
                }`}
              >
                {isBuy ? 'COMPRA (CALL)' : 'VENDA (PUT)'}
              </div>
              <div className="text-xs font-mono font-bold text-slate-300">
                {signal.asset} • Timeframe {signal.timeframe}
              </div>
            </div>
          </div>

          {/* Countdown timer */}
          {!isClosed && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-space uppercase text-slate-400">Expiração</span>
              <span className="text-base font-mono font-bold text-amber-300 flex items-center gap-1">
                <Hourglass className="w-3.5 h-3.5" />
                {formatCountdown(timeRemainingSeconds)}
              </span>
            </div>
          )}
        </div>

        {/* Live Prices Tracker */}
        <div className="bg-[#05030A] border border-white/10 rounded-xl p-2.5 my-2 flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Preço de Entrada:</span>
            <span className="font-bold text-slate-200">
              {entryPrice.toFixed(5)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase">
              {isClosed ? 'Fechamento:' : 'Preço Atual:'}
            </span>
            <span
              className={`font-bold ${
                isClosed
                  ? isWin
                    ? 'text-[#22C55E]'
                    : 'text-[#EF4444]'
                  : isCurrentlyInMoney
                  ? 'text-[#22C55E]'
                  : 'text-[#EF4444]'
              }`}
            >
              {(isClosed && signal.closeCandlePrice !== undefined
                ? signal.closeCandlePrice
                : currentPrice
              ).toFixed(5)}
            </span>
          </div>
        </div>

        {/* Footer tip */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>
            {isClosed
              ? 'Resultado computado no fechamento da vela.'
              : 'Aguarde o fechamento da vela para conferir o resultado final.'}
          </span>
          <button
            onClick={onDismiss}
            className="text-[10px] uppercase font-bold text-purple-400 hover:text-purple-300 underline ml-2"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
