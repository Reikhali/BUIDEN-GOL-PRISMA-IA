import React from 'react';
import { PrismaConfig, PlatformType } from '../types';
import { X, Sliders, Volume2, VolumeX, CheckCircle, RotateCcw, Shield, Layers, Eye } from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: PrismaConfig;
  onUpdateConfig: (newConfig: Partial<PrismaConfig>) => void;
  onResetDefaults: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onResetDefaults,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div className="w-full max-w-md bg-[#0B0714] border-l border-[#A855F7]/30 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#A855F7]/25 flex items-center justify-between bg-[#05030A]">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#C084FC]" />
            <h2 className="font-space font-bold text-base uppercase tracking-wider text-white">
              CONFIGURAÇÕES DO ROBÔ
            </h2>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-[#0B0714] hover:bg-[#8B5CF6]/20 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs font-space">
          {/* Section: Plataforma e Timeframe */}
          <div className="bg-[#05030A] border border-[#A855F7]/20 rounded-xl p-3.5 flex flex-col gap-3">
            <span className="text-[11px] font-bold uppercase text-[#C084FC] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> PLATAFORMA & TEMPO GRÁFICO
            </span>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-[11px]">Plataforma Alvo:</label>
              <select
                value={config.platform}
                onChange={(e) => onUpdateConfig({ platform: e.target.value as PlatformType })}
                className="bg-[#0B0714] border border-[#A855F7]/30 rounded-lg p-2 text-white font-mono"
              >
                <option value="POCKET_OPTION">Pocket Option</option>
                <option value="QUOTEX">Quotex</option>
                <option value="GENERICA">Genérica / Outra Corretora</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-[11px]">Timeframe das Velas:</label>
              <select
                value={config.tfMs}
                onChange={(e) => onUpdateConfig({ tfMs: Number(e.target.value) })}
                className="bg-[#0B0714] border border-[#A855F7]/30 rounded-lg p-2 text-white font-mono"
              >
                <option value={5000}>5 Segundos (5s)</option>
                <option value={10000}>10 Segundos (10s)</option>
                <option value={15000}>15 Segundos (15s)</option>
                <option value={30000}>30 Segundos (30s)</option>
                <option value={60000}>1 Minuto (1m) — PADRÃO RECOMENDADO</option>
                <option value={120000}>2 Minutos (2m)</option>
                <option value={180000}>3 Minutos (3m)</option>
                <option value={300000}>5 Minutos (5m)</option>
                <option value={900000}>15 Minutos (15m)</option>
              </select>
            </div>
          </div>

          {/* Section: Indicadores & Médias */}
          <div className="bg-[#05030A] border border-[#A855F7]/20 rounded-xl p-3.5 flex flex-col gap-3">
            <span className="text-[11px] font-bold uppercase text-[#C084FC] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> INDICADORES TÉCNICOS
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 text-[11px]">EMA Rápida (Período):</label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={config.emaFastPeriod}
                  onChange={(e) => onUpdateConfig({ emaFastPeriod: Number(e.target.value) })}
                  className="bg-[#0B0714] border border-sky-500/40 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 text-[11px]">EMA Lenta (Período):</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={config.emaSlowPeriod}
                  onChange={(e) => onUpdateConfig({ emaSlowPeriod: Number(e.target.value) })}
                  className="bg-[#0B0714] border border-rose-500/40 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 text-[11px]">Canal Lookback (Velas):</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={config.channelLookback}
                  onChange={(e) => onUpdateConfig({ channelLookback: Number(e.target.value) })}
                  className="bg-[#0B0714] border border-[#FFE600]/40 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 text-[11px]">Histórico Total (Velas):</label>
                <input
                  type="number"
                  min="40"
                  max="200"
                  value={config.totalLookback}
                  onChange={(e) => onUpdateConfig({ totalLookback: Number(e.target.value) })}
                  className="bg-[#0B0714] border border-[#A855F7]/30 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>

            {/* Straight MA threshold */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Limiar Médias Retas (% da altura do canal):</span>
                <span className="font-mono text-white font-bold">{config.straightMaThresholdPercent}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                step="1"
                value={config.straightMaThresholdPercent}
                onChange={(e) => onUpdateConfig({ straightMaThresholdPercent: Number(e.target.value) })}
                className="accent-[#8B5CF6]"
              />
            </div>
          </div>

          {/* Section: Prioridade de Sinais */}
          <div className="bg-[#05030A] border border-[#A855F7]/20 rounded-xl p-3.5 flex flex-col gap-3">
            <span className="text-[11px] font-bold uppercase text-[#C084FC] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> REGRAS DE SINAL & PRIORIDADE
            </span>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-[11px]">Prioridade em caso de conflito:</label>
              <select
                value={config.priorityLogic}
                onChange={(e) => onUpdateConfig({ priorityLogic: e.target.value as 'L3' | 'L2' | 'L1' })}
                className="bg-[#0B0714] border border-[#A855F7]/30 rounded-lg p-2 text-white font-mono"
              >
                <option value="L3">L3 (Posição + Impulso) &gt; L2 &gt; L1</option>
                <option value="L2">L2 (Médias Retas) &gt; L3 &gt; L1</option>
                <option value="L1">L1 (Cruzamento Médias) &gt; L2 &gt; L3</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300 text-[11px]">Verificação Automática WIN / LOSS:</span>
              <input
                type="checkbox"
                checked={config.autoWinLossCheck}
                onChange={(e) => onUpdateConfig({ autoWinLossCheck: e.target.checked })}
                className="w-4 h-4 accent-[#8B5CF6] rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-[11px]">Efeitos Sonoros & Beep de Sinal:</span>
              <button
                onClick={() => onUpdateConfig({ soundEnabled: !config.soundEnabled })}
                className={`p-1.5 rounded-lg border flex items-center gap-1 text-[11px] ${
                  config.soundEnabled
                    ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                    : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}
              >
                {config.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{config.soundEnabled ? 'ATIVO' : 'MUTADO'}</span>
              </button>
            </div>
          </div>

          {/* Section: Calibração Manual de Escala de Preço */}
          <div className="bg-[#05030A] border border-[#A855F7]/20 rounded-xl p-3.5 flex flex-col gap-3">
            <span className="text-[11px] font-bold uppercase text-[#C084FC] flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> ESCALA DE PREÇO (PIXEL → PREÇO REAL)
            </span>
            <p className="text-[10px] text-slate-400">
              Insira o preço do topo e do fundo da área selecionada para calibrar a escala real de 1º grau:
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 text-[10px]">Preço do Topo da Área:</label>
                <input
                  type="number"
                  step="0.00001"
                  value={config.manualTopPrice}
                  onChange={(e) => onUpdateConfig({ manualTopPrice: Number(e.target.value) })}
                  className="bg-[#0B0714] border border-[#A855F7]/30 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 text-[10px]">Preço da Base da Área:</label>
                <input
                  type="number"
                  step="0.00001"
                  value={config.manualBottomPrice}
                  onChange={(e) => onUpdateConfig({ manualBottomPrice: Number(e.target.value) })}
                  className="bg-[#0B0714] border border-[#A855F7]/30 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300 text-[11px]">Habilitar Escala Real Manual:</span>
              <input
                type="checkbox"
                checked={config.manualScaleEnabled}
                onChange={(e) => onUpdateConfig({ manualScaleEnabled: e.target.checked })}
                className="w-4 h-4 accent-[#8B5CF6] rounded"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#A855F7]/25 bg-[#05030A] flex items-center justify-between">
          <button
            onClick={() => {
              playClickSound();
              onResetDefaults();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrões</span>
          </button>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white font-semibold text-xs shadow-md glow-purple"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Salvar e Fechar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
