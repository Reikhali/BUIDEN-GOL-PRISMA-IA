import React, { useState } from 'react';
import { Target, Check, RotateCcw, X, Sparkles, Sliders } from 'lucide-react';
import { CalibrationStats } from '../types';
import { playClickSound } from '../utils/audio';

interface ColorCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  corAltaHex: string;
  corBaixaHex: string;
  tolerance: number;
  stats: CalibrationStats | null;
  onRunAutoCalibration: () => void;
  onSaveColors: (greenHex: string, redHex: string, tolerance: number) => void;
}

export const ColorCalibrationModal: React.FC<ColorCalibrationModalProps> = ({
  isOpen,
  onClose,
  corAltaHex,
  corBaixaHex,
  tolerance,
  stats,
  onRunAutoCalibration,
  onSaveColors,
}) => {
  if (!isOpen) return null;

  const [currentGreen, setCurrentGreen] = useState(corAltaHex);
  const [currentRed, setCurrentRed] = useState(corBaixaHex);
  const [currentTolerance, setCurrentTolerance] = useState(tolerance);

  const handleApplyAuto = () => {
    playClickSound();
    onRunAutoCalibration();
  };

  const handleSave = () => {
    playClickSound();
    onSaveColors(currentGreen, currentRed, currentTolerance);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-[#0B0714] border border-[#A855F7]/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#A855F7]/25 flex items-center justify-between bg-[#05030A]">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#C084FC]" />
            <div>
              <h2 className="font-space font-bold text-sm uppercase tracking-wider text-white">
                CALIBRAÇÃO DE CORES DAS VELAS
              </h2>
              <p className="text-[11px] text-slate-400">
                Ajuste as cores exatas das velas de Alta (Verde) e Baixa (Vermelha).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#0B0714] hover:bg-[#8B5CF6]/20 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 bg-[#05030A]">
          {/* Automatic Calibration Trigger Button */}
          <button
            onClick={handleApplyAuto}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6]/30 via-[#A855F7]/40 to-[#8B5CF6]/30 hover:from-[#8B5CF6]/50 hover:to-[#A855F7]/60 border border-[#C084FC]/40 text-white font-space font-bold text-xs uppercase tracking-wider shadow-md glow-purple transition-all"
          >
            <Sparkles className="w-4 h-4 text-[#FFE600] animate-spin" />
            <span>🎯 ESCANEAR E CALIBRAR CORES AUTOMATICAMENTE</span>
          </button>

          {/* Scan stats banner if available */}
          {stats && (
            <div className="bg-[#0B0714] border border-purple-500/30 rounded-xl p-3 text-[11px] font-mono text-slate-300 flex flex-col gap-1">
              <span className="text-[#C084FC] font-bold">Diagnóstico do Scanner:</span>
              <div className="flex justify-between">
                <span>Pixels Verdes Detectados:</span>
                <span className="text-emerald-400 font-bold">{stats.greenPixelsFound}</span>
              </div>
              <div className="flex justify-between">
                <span>Pixels Vermelhos Detectados:</span>
                <span className="text-rose-400 font-bold">{stats.redPixelsFound}</span>
              </div>
              <div className="flex justify-between">
                <span>Fundo/Ruído Rejeitado:</span>
                <span className="text-slate-400">{stats.noiseRejected} px</span>
              </div>
            </div>
          )}

          {/* Color pickers */}
          <div className="grid grid-cols-2 gap-3">
            {/* Vela de Alta (VERDE -> COMPRA) */}
            <div className="bg-[#0B0714] border border-emerald-500/40 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-space font-bold text-[#22C55E] uppercase">
                <span>VELA DE ALTA</span>
                <span className="text-[10px] font-mono text-slate-400">COMPRA</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentGreen}
                  onChange={(e) => setCurrentGreen(e.target.value.toUpperCase())}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={currentGreen}
                  onChange={(e) => setCurrentGreen(e.target.value.toUpperCase())}
                  className="w-full bg-[#05030A] border border-emerald-500/30 rounded-lg p-1.5 text-center font-mono font-bold text-xs text-white"
                />
              </div>

              {/* Swatch Sample */}
              <div
                className="h-4 rounded-md shadow-inner border border-white/20"
                style={{ backgroundColor: currentGreen }}
              />
            </div>

            {/* Vela de Baixa (VERMELHA -> VENDA) */}
            <div className="bg-[#0B0714] border border-rose-500/40 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-space font-bold text-[#EF4444] uppercase">
                <span>VELA DE BAIXA</span>
                <span className="text-[10px] font-mono text-slate-400">VENDA</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentRed}
                  onChange={(e) => setCurrentRed(e.target.value.toUpperCase())}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={currentRed}
                  onChange={(e) => setCurrentRed(e.target.value.toUpperCase())}
                  className="w-full bg-[#05030A] border border-rose-500/30 rounded-lg p-1.5 text-center font-mono font-bold text-xs text-white"
                />
              </div>

              {/* Swatch Sample */}
              <div
                className="h-4 rounded-md shadow-inner border border-white/20"
                style={{ backgroundColor: currentRed }}
              />
            </div>
          </div>

          {/* Tolerance Slider */}
          <div className="bg-[#0B0714] border border-[#A855F7]/30 rounded-xl p-3.5 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between font-space text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#C084FC]" />
                Tolerância de Cor (Padrão: 30):
              </span>
              <span className="font-mono font-bold text-white bg-[#05030A] px-2 py-0.5 rounded border border-[#A855F7]/30">
                {currentTolerance}
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="1"
              value={currentTolerance}
              onChange={(e) => setCurrentTolerance(Number(e.target.value))}
              className="accent-[#8B5CF6]"
            />
            <span className="text-[10px] text-slate-400">
              Tolerância alta demais (&gt; 45) pode capturar linhas de indicadores e botões de compra. Padrão 30 é o mais seguro.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#A855F7]/25 bg-[#05030A] flex items-center justify-between">
          <button
            onClick={() => {
              playClickSound();
              setCurrentGreen('#00B373');
              setCurrentRed('#FF3B3B');
              setCurrentTolerance(30);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Redefinir</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white text-xs font-bold shadow-md glow-purple"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Cores</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
