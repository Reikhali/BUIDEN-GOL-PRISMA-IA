import React from 'react';
import { Eye, EyeOff, Search, Target, Crop, Sliders, PlayCircle } from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface FloatingBarProps {
  isCapturing: boolean;
  onToggleCapture: () => void;
  onManualAnalyze: () => void;
  onOpenColorCalibration: () => void;
  onOpenAreaSelector: () => void;
  isSimulated: boolean;
  onToggleSimulator: () => void;
  isAnalyzing: boolean;
}

export const FloatingBar: React.FC<FloatingBarProps> = ({
  isCapturing,
  onToggleCapture,
  onManualAnalyze,
  onOpenColorCalibration,
  onOpenAreaSelector,
  isSimulated,
  onToggleSimulator,
  isAnalyzing,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-4xl w-[94%] sm:w-auto">
      <div className="bg-[#0B0714]/90 backdrop-blur-xl border border-[#A855F7]/35 rounded-2xl p-2 sm:p-2.5 shadow-[0_8px_32px_rgba(5,3,10,0.85)] flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {/* Main Capture Button */}
        <button
          onClick={() => {
            playClickSound();
            onToggleCapture();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-space font-semibold text-xs uppercase tracking-wider transition-all duration-200 shadow-md ${
            isCapturing
              ? 'bg-gradient-to-r from-purple-700 to-[#8B5CF6] text-white hover:brightness-110 glow-purple border border-[#C084FC]/40'
              : 'bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white hover:brightness-110 shadow-[0_0_20px_rgba(139,92,246,0.4)] border border-[#C084FC]/50'
          }`}
        >
          {isCapturing ? (
            <>
              <Eye className="w-4 h-4 animate-pulse text-[#FFE600]" />
              <span className="hidden sm:inline">👁️ LENDO TELA — CLIQUE P/ PARAR</span>
              <span className="sm:hidden">👁️ LENDO TELA</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span>👁️ INICIAR LEITURA DA TELA</span>
            </>
          )}
        </button>

        {/* Secondary: Analisar Agora (Bot) */}
        <button
          onClick={() => {
            playClickSound();
            onManualAnalyze();
          }}
          disabled={isAnalyzing}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-space font-semibold text-xs uppercase tracking-wider transition-all duration-200 border ${
            isAnalyzing
              ? 'bg-purple-900/40 border-purple-500/50 text-purple-300 animate-pulse'
              : 'bg-[#05030A] hover:bg-[#8B5CF6]/20 border-[#A855F7]/35 text-slate-100 hover:text-white hover:border-[#8B5CF6]/70 shadow-sm'
          }`}
          title="Analisa a vela atual em formação até o seu fechamento e gera o sinal definitivo"
        >
          <Search className={`w-4 h-4 text-[#C084FC] ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'ANALISANDO...' : '🔎 ANALISAR AGORA (BOT)'}</span>
        </button>

        {/* Calibrate Colors */}
        <button
          onClick={() => {
            playClickSound();
            onOpenColorCalibration();
          }}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-space font-medium text-xs text-slate-200 hover:text-white bg-[#05030A] hover:bg-[#8B5CF6]/20 border border-[#A855F7]/30 hover:border-[#8B5CF6]/60 transition-all uppercase tracking-wider"
          title="Calibrar cores das velas (Verde de Alta / Vermelha de Baixa)"
        >
          <Target className="w-3.5 h-3.5 text-[#C084FC]" />
          <span className="hidden md:inline">🎯 CALIBRAR CORES</span>
          <span className="md:hidden">CORES</span>
        </button>

        {/* Select Area */}
        <button
          onClick={() => {
            playClickSound();
            onOpenAreaSelector();
          }}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-space font-medium text-xs text-slate-200 hover:text-white bg-[#05030A] hover:bg-[#8B5CF6]/20 border border-[#A855F7]/30 hover:border-[#8B5CF6]/60 transition-all uppercase tracking-wider"
          title="Selecionar área do gráfico na tela"
        >
          <Crop className="w-3.5 h-3.5 text-[#C084FC]" />
          <span className="hidden md:inline">⛶ ÁREA DO GRÁFICO</span>
          <span className="md:hidden">ÁREA</span>
        </button>

        {/* Simulator Toggle */}
        <button
          onClick={() => {
            playClickSound();
            onToggleSimulator();
          }}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-space font-medium text-xs transition-all uppercase tracking-wider border ${
            isSimulated
              ? 'bg-[#FFE600]/15 border-[#FFE600]/50 text-[#FFE600] shadow-[0_0_12px_rgba(255,230,0,0.3)]'
              : 'bg-[#05030A] border-[#A855F7]/25 text-slate-400 hover:text-slate-200'
          }`}
          title="Ativar/desativar modo simulador para testar o robô imediatamente no navegador"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">{isSimulated ? 'TESTE ATIVO' : 'MODO TESTE'}</span>
        </button>
      </div>
    </div>
  );
};
