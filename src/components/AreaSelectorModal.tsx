import React, { useState, useRef, useEffect } from 'react';
import { ROI, PlatformType } from '../types';
import { Crop, Check, RotateCcw, X, Info } from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface AreaSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  roi: ROI;
  onSaveROI: (roi: ROI) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  platform: PlatformType;
}

export const AreaSelectorModal: React.FC<AreaSelectorModalProps> = ({
  isOpen,
  onClose,
  roi,
  onSaveROI,
  videoRef,
  platform,
}) => {
  if (!isOpen) return null;

  const [currentRoi, setCurrentRoi] = useState<ROI>(roi);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Default presets based on broker layout
  const applyPreset = (type: 'POCKET_OPTION' | 'QUOTEX' | 'FULL') => {
    playClickSound();
    if (type === 'POCKET_OPTION') {
      // Pocket Option: left menu ~60px, right order block ~240px, top bar ~60px, bottom bar ~40px
      setCurrentRoi({
        x: 0.08,
        y: 0.12,
        width: 0.72,
        height: 0.76,
        isCustom: true,
      });
    } else if (type === 'QUOTEX') {
      // Quotex: left menu ~60px, right panel ~260px, top ~50px
      setCurrentRoi({
        x: 0.06,
        y: 0.10,
        width: 0.74,
        height: 0.78,
        isCustom: true,
      });
    } else {
      setCurrentRoi({
        x: 0.05,
        y: 0.05,
        width: 0.9,
        height: 0.9,
        isCustom: true,
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setIsDragging(true);
    setDragStart({ x, y });
    setCurrentRoi({
      x,
      y,
      width: 0.05,
      height: 0.05,
      isCustom: true,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const currentY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const x = Math.min(dragStart.x, currentX);
    const y = Math.min(dragStart.y, currentY);
    const width = Math.max(0.05, Math.abs(currentX - dragStart.x));
    const height = Math.max(0.05, Math.abs(currentY - dragStart.y));

    setCurrentRoi({
      x,
      y,
      width,
      height,
      isCustom: true,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleSave = () => {
    playClickSound();
    onSaveROI(currentRoi);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-4xl bg-[#0B0714] border border-[#A855F7]/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#A855F7]/25 flex items-center justify-between bg-[#05030A]">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-[#C084FC]" />
            <div>
              <h2 className="font-space font-bold text-sm uppercase tracking-wider text-white">
                SELEÇÃO DA ÁREA DO GRÁFICO (ROI)
              </h2>
              <p className="text-[11px] text-slate-400">
                Arraste o mouse sobre o vídeo para definir a área de leitura das velas.
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

        {/* Video Canvas Container */}
        <div className="p-4 flex flex-col items-center justify-center bg-[#05030A]">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="relative w-full aspect-video max-h-[55vh] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden cursor-crosshair select-none shadow-inner"
          >
            {/* Live Video Preview if stream available */}
            {videoRef.current && videoRef.current.srcObject ? (
              <video
                ref={(el) => {
                  if (el && videoRef.current && videoRef.current.srcObject) {
                    el.srcObject = videoRef.current.srcObject;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain pointer-events-none"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <span>Nenhum stream de vídeo ativo no momento.</span>
                <span className="text-[10px] text-slate-600 mt-1">
                  Você pode pré-ajustar a área do gráfico abaixo ou usar um preset.
                </span>
              </div>
            )}

            {/* Dark overlay with clear cutout for ROI */}
            <div
              className="absolute border-2 border-[#8B5CF6] bg-[#8B5CF6]/15 shadow-[0_0_24px_rgba(139,92,246,0.6)] flex items-start justify-start p-2 pointer-events-none"
              style={{
                left: `${currentRoi.x * 100}%`,
                top: `${currentRoi.y * 100}%`,
                width: `${currentRoi.width * 100}%`,
                height: `${currentRoi.height * 100}%`,
              }}
            >
              <div className="bg-[#0B0714]/90 px-2 py-0.5 rounded text-[10px] font-mono text-[#C084FC] border border-[#8B5CF6]/50">
                Área de Análise das Velas ({Math.round(currentRoi.width * 100)}% x {Math.round(currentRoi.height * 100)}%)
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2 mt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-space text-[11px] uppercase">Presets Rápidos:</span>
              <button
                onClick={() => applyPreset('POCKET_OPTION')}
                className="px-2.5 py-1 rounded-lg bg-[#0B0714] border border-[#A855F7]/30 hover:border-[#8B5CF6] text-slate-200 text-xs"
              >
                Pocket Option
              </button>
              <button
                onClick={() => applyPreset('QUOTEX')}
                className="px-2.5 py-1 rounded-lg bg-[#0B0714] border border-[#A855F7]/30 hover:border-[#8B5CF6] text-slate-200 text-xs"
              >
                Quotex
              </button>
              <button
                onClick={() => applyPreset('FULL')}
                className="px-2.5 py-1 rounded-lg bg-[#0B0714] border border-slate-700 hover:border-slate-500 text-slate-300 text-xs"
              >
                Quase Tela Toda
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Info className="w-3.5 h-3.5 text-[#C084FC]" />
              <span>A área exclui automaticamente o painel lateral de compra e a faixa do eixo Y.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#A855F7]/25 bg-[#05030A] flex items-center justify-between">
          <button
            onClick={() => {
              playClickSound();
              applyPreset(platform === 'QUOTEX' ? 'QUOTEX' : 'POCKET_OPTION');
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
              <span>Confirmar e Salvar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
