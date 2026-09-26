import React from 'react';
import { PlatformType } from '../types';
import { Settings, Eye, AlertCircle, Clock, Hourglass } from 'lucide-react';
import { formatCountdown } from '../utils/time';

interface HeaderProps {
  platform: PlatformType;
  onPlatformChange: (p: PlatformType) => void;
  isCapturing: boolean;
  brasiliaTime: string;
  candleTimeRemaining: number;
  timeframeLabel: string;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  platform,
  onPlatformChange,
  isCapturing,
  brasiliaTime,
  candleTimeRemaining,
  timeframeLabel,
  onOpenSettings,
}) => {
  const isUrgent = candleTimeRemaining <= 10;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0B0714]/90 backdrop-blur-md border-b border-[#A855F7]/25 z-40 px-4 flex items-center justify-between shadow-lg">
      {/* Left: Brand Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#A855F7]/10 border border-[#8B5CF6]/50 shadow-[0_0_16px_rgba(139,92,246,0.35)]">
          {/* Custom geometric neon prism logo SVG */}
          <svg className="w-6 h-6 text-[#C084FC]" viewBox="0 0 24 24" fill="none">
            <polygon
              points="12,2 22,19 2,19"
              stroke="#A855F7"
              strokeWidth="1.8"
              fill="rgba(139, 92, 246, 0.25)"
            />
            <line x1="12" y1="2" x2="12" y2="19" stroke="#C084FC" strokeWidth="1.2" strokeDasharray="2 2" />
            <polygon
              points="12,6 18,17 6,17"
              stroke="#E9D5FF"
              strokeWidth="1"
              fill="rgba(192, 132, 252, 0.3)"
            />
            <circle cx="12" cy="12" r="2" fill="#FFE600" className="animate-pulse" />
          </svg>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-space font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-[#C084FC] to-[#8B5CF6] text-lg uppercase">
              PRISMA IA
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#8B5CF6]/20 text-[#C084FC] border border-[#8B5CF6]/40 uppercase tracking-widest">
              ROBÔ 2026
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block tracking-tight">
            Análise de Candles Pocket Option & Quotex
          </span>
        </div>
      </div>

      {/* Middle: Controls & Badges */}
      <div className="hidden md:flex items-center gap-4">
        {/* Platform Selector */}
        <div className="flex items-center gap-2 bg-[#05030A] border border-[#A855F7]/30 rounded-xl px-2.5 py-1.5 shadow-inner">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Plataforma:
          </span>
          <select
            value={platform}
            onChange={(e) => onPlatformChange(e.target.value as PlatformType)}
            className="bg-transparent text-xs font-semibold text-[#C084FC] focus:outline-none cursor-pointer"
          >
            <option value="POCKET_OPTION" className="bg-[#0B0714] text-white">
              POCKET OPTION
            </option>
            <option value="QUOTEX" className="bg-[#0B0714] text-white">
              QUOTEX
            </option>
            <option value="GENERICA" className="bg-[#0B0714] text-white">
              GENÉRICA / OUTRA
            </option>
          </select>
        </div>

        {/* Capture Status */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
            isCapturing
              ? 'bg-[#8B5CF6]/15 border-[#8B5CF6]/50 text-[#C084FC] shadow-[0_0_12px_rgba(139,92,246,0.3)]'
              : 'bg-slate-900/60 border-slate-700/60 text-slate-400'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isCapturing ? 'bg-[#8B5CF6] animate-pulse shadow-[0_0_8px_#8B5CF6]' : 'bg-slate-500'
            }`}
          />
          <span className="tracking-wider uppercase font-semibold text-[11px]">
            {isCapturing ? '🟣 LENDO TELA' : '⚪ PARADO'}
          </span>
        </div>
      </div>

      {/* Right: Brasília Live Clock & Candle Countdown */}
      <div className="flex items-center gap-3">
        {/* Time Remaining in Current Candle */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
            isUrgent
              ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse'
              : 'bg-[#05030A] border-[#A855F7]/30 text-slate-200'
          }`}
          title="Tempo restante até o fechamento da vela atual"
        >
          <Hourglass className="w-3.5 h-3.5 text-[#C084FC]" />
          <div className="flex flex-col text-right">
            <span className="text-[9px] uppercase tracking-wider text-slate-400">
              Vela {timeframeLabel}
            </span>
            <span className="text-xs font-mono font-bold">
              {formatCountdown(candleTimeRemaining)}
            </span>
          </div>
        </div>

        {/* Brasília Clock */}
        <div className="hidden sm:flex items-center gap-2 bg-[#05030A] border border-[#A855F7]/30 px-3 py-1.5 rounded-xl text-slate-200">
          <Clock className="w-3.5 h-3.5 text-[#C084FC]" />
          <div className="flex flex-col text-right">
            <span className="text-[9px] uppercase tracking-wider text-slate-400">
              Brasília (UTC-3)
            </span>
            <span className="text-xs font-mono font-bold text-white tracking-widest">
              {brasiliaTime}
            </span>
          </div>
        </div>

        {/* Settings Drawer Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-[#05030A] hover:bg-[#8B5CF6]/20 border border-[#A855F7]/30 hover:border-[#8B5CF6]/60 text-slate-300 hover:text-white transition-all shadow-sm"
          title="Configurações e Parâmetros"
        >
          <Settings className="w-5 h-5 text-[#C084FC]" />
        </button>
      </div>
    </header>
  );
};
