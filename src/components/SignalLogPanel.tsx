import React from 'react';
import { SignalRecord } from '../types';
import { Download, Trash2, Check, X, TrendingUp, TrendingDown, Clock, ShieldCheck, BarChart3, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playWinSound, playLossSound, playClickSound } from '../utils/audio';

interface SignalLogPanelProps {
  signals: SignalRecord[];
  onToggleOutcome: (id: string, outcome: 'WIN' | 'LOSS') => void;
  onClearLog: () => void;
}

export const SignalLogPanel: React.FC<SignalLogPanelProps> = ({
  signals,
  onToggleOutcome,
  onClearLog,
}) => {
  // Compute summary stats
  const total = signals.length;
  const wins = signals.filter((s) => s.outcome === 'WIN').length;
  const losses = signals.filter((s) => s.outcome === 'LOSS').length;
  const finished = wins + losses;
  const winrate = finished > 0 ? ((wins / finished) * 100).toFixed(1) : '0.0';

  // Stats by Logic
  const getLogicStats = (logicKey: string) => {
    const matching = signals.filter((s) => s.logic.includes(logicKey));
    const w = matching.filter((s) => s.outcome === 'WIN').length;
    const l = matching.filter((s) => s.outcome === 'LOSS').length;
    const f = w + l;
    const rate = f > 0 ? ((w / f) * 100).toFixed(0) : '-';
    return { count: matching.length, wins: w, losses: l, rate };
  };

  const l1Stats = getLogicStats('L1');
  const l2Stats = getLogicStats('L2');
  const l3Stats = getLogicStats('L3');

  // Export to CSV
  const handleExportCSV = () => {
    playClickSound();
    if (signals.length === 0) return;

    const headers = ['Hora_Brasilia', 'Ativo', 'Direcao', 'Logica', 'Preco_Sinal', 'Preco_Entrada', 'Preco_Fechamento', 'Resultado'];
    const rows = signals.map((s) => [
      s.timeBrasilia,
      s.asset,
      s.direction,
      s.logic,
      s.price.toFixed(5),
      s.entryCandlePrice !== undefined ? s.entryCandlePrice.toFixed(5) : '-',
      s.closeCandlePrice !== undefined ? s.closeCandlePrice.toFixed(5) : '-',
      s.outcome,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PRISMA_IA_Sinais_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMarkWin = (id: string) => {
    onToggleOutcome(id, 'WIN');
    playWinSound();
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#22C55E', '#10B981', '#8B5CF6'],
      });
    } catch {}
  };

  const handleMarkLoss = (id: string) => {
    onToggleOutcome(id, 'LOSS');
    playLossSound();
  };

  return (
    <aside className="w-full lg:w-80 xl:w-96 flex flex-col gap-3.5 z-30 select-none">
      {/* Summary Assertividade Card */}
      <div className="glass-card p-4 flex flex-col gap-3 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#A855F7]/20 pb-2.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#C084FC]" />
            <h2 className="font-space font-bold text-sm tracking-wider text-white uppercase">
              ASSERTIVIDADE & LOG
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {total} {total === 1 ? 'sinal' : 'sinais'}
          </span>
        </div>

        {/* Big Winrate Metric */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#05030A] border border-emerald-500/30 rounded-xl p-2">
            <div className="text-[10px] font-space text-slate-400 uppercase">WINs</div>
            <div className="text-xl font-mono font-bold text-[#22C55E]">{wins}</div>
          </div>
          <div className="bg-[#05030A] border border-rose-500/30 rounded-xl p-2">
            <div className="text-[10px] font-space text-slate-400 uppercase">LOSS</div>
            <div className="text-xl font-mono font-bold text-[#EF4444]">{losses}</div>
          </div>
          <div className="bg-[#05030A] border border-[#8B5CF6]/40 rounded-xl p-2">
            <div className="text-[10px] font-space text-slate-400 uppercase">Taxa Geral</div>
            <div className="text-xl font-mono font-bold text-[#C084FC]">{winrate}%</div>
          </div>
        </div>

        {/* Assertividade Por Lógica */}
        <div className="bg-[#05030A] border border-[#A855F7]/25 rounded-xl p-2.5 flex flex-col gap-1.5 text-[11px] font-mono">
          <div className="text-[10px] font-space text-slate-400 uppercase tracking-wider mb-0.5">
            Assertividade por Lógica:
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FFE600]" /> L1 (Cruzamento EMAs):
            </span>
            <span className="font-bold text-slate-100">{l1Stats.rate}% ({l1Stats.wins}W / {l1Stats.losses}L)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FFE600]" /> L2 (Médias Retas):
            </span>
            <span className="font-bold text-slate-100">{l2Stats.rate}% ({l2Stats.wins}W / {l2Stats.losses}L)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FFE600]" /> L3 (Posição + Impulso):
            </span>
            <span className="font-bold text-slate-100">{l3Stats.rate}% ({l3Stats.wins}W / {l3Stats.losses}L)</span>
          </div>
        </div>

        {/* Action Buttons: Export & Clear */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleExportCSV}
            disabled={signals.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#05030A] hover:bg-[#8B5CF6]/20 border border-[#A855F7]/30 text-xs font-space font-medium text-slate-200 hover:text-white transition-all disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-[#C084FC]" />
            <span>EXPORTAR CSV</span>
          </button>
          <button
            onClick={() => {
              playClickSound();
              onClearLog();
            }}
            disabled={signals.length === 0}
            className="p-1.5 rounded-xl bg-[#05030A] hover:bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:text-rose-200 transition-all disabled:opacity-40"
            title="Limpar Histórico de Sinais"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Signal History List */}
      <div className="glass-card p-3 flex flex-col gap-2 max-h-[calc(100vh-360px)] overflow-y-auto">
        <span className="text-[10px] font-space font-bold uppercase tracking-wider text-slate-400 px-1">
          Histórico de Sinais em Tempo Real
        </span>

        {signals.length === 0 ? (
          <div className="bg-[#05030A] border border-[#A855F7]/20 rounded-xl p-5 text-center text-xs text-slate-500 font-space">
            Nenhum sinal gerado ainda. O robô monitora a tela continuamente e registrará os alertas aqui.
          </div>
        ) : (
          signals.map((signal) => {
            const isBuy = signal.direction === 'COMPRA';
            const isPending = signal.outcome === 'PENDING';
            const isWin = signal.outcome === 'WIN';
            const isLoss = signal.outcome === 'LOSS';

            return (
              <div
                key={signal.id}
                className={`bg-[#05030A] border rounded-xl p-2.5 flex flex-col gap-1.5 transition-all ${
                  isWin
                    ? 'border-emerald-500/40 bg-emerald-950/20'
                    : isLoss
                    ? 'border-rose-500/40 bg-rose-950/20'
                    : isBuy
                    ? 'border-emerald-500/30'
                    : 'border-rose-500/30'
                }`}
              >
                {/* Row 1: Time, Direction, Logic */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono text-slate-400">
                      {signal.timeBrasilia}
                    </span>
                    <span className="text-[10px] font-space font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {signal.asset}
                    </span>
                  </div>

                  {/* Logic Badge (L1 / L2 / L3) */}
                  <span className="text-[10px] font-mono font-bold bg-[#FFE600] text-black px-1.5 py-0.5 rounded shadow-sm">
                    {signal.logic}
                  </span>
                </div>

                {/* Row 2: Direction, Price, Outcome */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs font-space font-bold uppercase flex items-center gap-1 ${
                        isBuy ? 'text-[#22C55E]' : 'text-[#EF4444]'
                      }`}
                    >
                      {isBuy ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {signal.direction}
                    </span>
                    <span className="text-[11px] font-mono text-slate-300">
                      {signal.isRelativePrice ? `≈${signal.price.toFixed(5)}` : signal.price.toFixed(5)}
                    </span>
                  </div>

                  {/* Outcome Tag or Manual Switch */}
                  <div className="flex items-center gap-1">
                    {isPending ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 animate-pulse">
                        EM ANDAMENTO
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded border ${
                          isWin
                            ? 'bg-emerald-500/20 text-[#22C55E] border-emerald-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                            : 'bg-rose-500/20 text-[#EF4444] border-rose-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                        }`}
                      >
                        {isWin ? 'WIN ✅' : 'LOSS ❌'}
                      </span>
                    )}

                    {/* Manual Win/Loss toggle buttons */}
                    <div className="flex items-center gap-0.5 ml-1">
                      <button
                        onClick={() => handleMarkWin(signal.id)}
                        className={`p-1 rounded hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-all ${
                          isWin ? 'text-emerald-400 bg-emerald-500/20' : ''
                        }`}
                        title="Marcar como WIN"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMarkLoss(signal.id)}
                        className={`p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all ${
                          isLoss ? 'text-rose-400 bg-rose-500/20' : ''
                        }`}
                        title="Marcar como LOSS"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 3: Entry price vs Close price comparison (if resolved) */}
                {signal.entryCandlePrice !== undefined && signal.closeCandlePrice !== undefined && (
                  <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-1">
                    <span>Entrada: {signal.entryCandlePrice.toFixed(5)}</span>
                    <span>Fechamento: {signal.closeCandlePrice.toFixed(5)}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
