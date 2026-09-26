import React, { useRef, useEffect } from 'react';
import { Candle, TechnicalIndicators, SignalRecord, ROI, PlatformType, GeminiVisionResult } from '../types';
import { Camera, RefreshCw, Eye, Sparkles, ShieldCheck } from 'lucide-react';
import { formatCountdown } from '../utils/time';
import { playClickSound } from '../utils/audio';
import { ChartOverlayCanvas } from './ChartOverlayCanvas';

interface InteractiveChartViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isCapturing: boolean;
  isSimulated: boolean;
  candles: Candle[];
  indicators: TechnicalIndicators | null;
  activeSignal: SignalRecord | null;
  roi: ROI;
  candleTimeRemaining: number;
  platform: PlatformType;
  asset: string;
  geminiData?: GeminiVisionResult | null;
  isGeminiLoading?: boolean;
  onStartCapture: () => void;
  onRefreshScan: () => void;
  onTriggerGeminiScan: () => void;
}

export const InteractiveChartView: React.FC<InteractiveChartViewProps> = ({
  videoRef,
  isCapturing,
  isSimulated,
  candles,
  indicators,
  activeSignal,
  roi,
  candleTimeRemaining,
  platform,
  asset,
  geminiData,
  isGeminiLoading,
  onStartCapture,
  onRefreshScan,
  onTriggerGeminiScan,
}) => {
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaContainerRef = useRef<HTMLDivElement | null>(null);

  // Render chart / simulation when in simulated mode
  useEffect(() => {
    if (!isSimulated || isCapturing) return;

    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background gradient for broker style
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#07050E');
    bgGradient.addColorStop(1, '#05030A');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 60; x < width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 40; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (!indicators || candles.length === 0) return;

    const channelHigh = indicators.channelHigh;
    const channelLow = indicators.channelLow;
    const range = Math.max(0.00001, channelHigh - channelLow);

    const priceToY = (price: number) => {
      const norm = (channelHigh - price) / range;
      return 50 + norm * (height - 110);
    };

    // Draw candlesticks
    const candleWidth = Math.max(4, Math.min(14, (width - 120) / candles.length - 4));

    candles.forEach((candle, i) => {
      const x = 50 + i * (candleWidth + 4);
      const isGreen = candle.color === 'GREEN';

      const yOpen = priceToY(candle.open);
      const yClose = priceToY(candle.close);
      const yHigh = priceToY(candle.high);
      const yLow = priceToY(candle.low);

      const top = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

      // Wick
      ctx.strokeStyle = isGreen ? '#00B373' : '#FF3B3B';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, yHigh);
      ctx.lineTo(x + candleWidth / 2, yLow);
      ctx.stroke();

      // Body
      ctx.fillStyle = isGreen ? '#00B373' : '#FF3B3B';
      ctx.fillRect(x, top, candleWidth, bodyHeight);
    });

    // Draw Right Price Scale Bar
    ctx.fillStyle = '#0B0714';
    ctx.fillRect(width - 70, 0, 70, height);
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
    ctx.strokeRect(width - 70, 0, 70, height);

    // Current price tag on Y axis
    const curY = priceToY(indicators.currentPrice);
    ctx.fillStyle = activeSignal ? (activeSignal.direction === 'COMPRA' ? '#22C55E' : '#EF4444') : '#8B5CF6';
    ctx.beginPath();
    ctx.roundRect(width - 66, curY - 11, 62, 22, 4);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillText(indicators.currentPrice.toFixed(5), width - 62, curY + 4);
  }, [isSimulated, isCapturing, candles, indicators, activeSignal]);

  const displayAsset = geminiData?.asset || asset;
  const realPrice = geminiData ? geminiData.currentPrice : indicators?.currentPrice;
  const highPrice = geminiData ? geminiData.highPrice : indicators?.channelHigh;
  const lowPrice = geminiData ? geminiData.lowPrice : indicators?.channelLow;

  return (
    <div className="relative flex-1 w-full min-h-[460px] lg:min-h-[590px] bg-[#07050E] border border-[#A855F7]/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between">
      {/* Top Chart Header Info */}
      <div className="p-3 bg-[#0B0714]/90 backdrop-blur-md border-b border-[#A855F7]/20 flex flex-wrap items-center justify-between gap-2 z-10">
        {/* Asset detection info */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-[#05030A] border border-[#8B5CF6]/40 px-2.5 py-1 rounded-xl shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-space font-extrabold text-sm text-white uppercase tracking-wider">
              {displayAsset}
            </span>
            {geminiData && (
              <span className="text-[10px] font-mono font-bold text-[#FFE600] flex items-center gap-0.5 ml-1 bg-[#FFE600]/15 px-1 rounded">
                <Sparkles className="w-3 h-3" /> IA
              </span>
            )}
          </div>

          <span className="text-xs font-mono px-2 py-1 rounded bg-[#05030A] border border-[#A855F7]/30 text-slate-300">
            {platform === 'POCKET_OPTION' ? 'Pocket Option' : platform === 'QUOTEX' ? 'Quotex' : 'Corretora'}
          </span>

          {geminiData && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
              <ShieldCheck className="w-3 h-3" /> {geminiData.confidence}% precisão
            </span>
          )}
        </div>

        {/* Real-time broker quote HUD */}
        <div className="flex items-center gap-3">
          {realPrice !== undefined && (
            <div className="flex items-center gap-3 bg-[#05030A] border border-[#A855F7]/30 px-3 py-1 rounded-xl text-xs font-mono">
              <div>
                <span className="text-[9px] text-slate-400 uppercase block">Cotação Real:</span>
                <span className="font-bold text-white tracking-wider text-sm">
                  {realPrice.toFixed(5)}
                </span>
              </div>
              {highPrice !== undefined && (
                <div className="hidden md:block border-l border-slate-800 pl-2">
                  <span className="text-[9px] text-slate-400 uppercase block">Máxima:</span>
                  <span className="font-semibold text-emerald-400">
                    {highPrice.toFixed(5)}
                  </span>
                </div>
              )}
              {lowPrice !== undefined && (
                <div className="hidden md:block border-l border-slate-800 pl-2">
                  <span className="text-[9px] text-slate-400 uppercase block">Mínima:</span>
                  <span className="font-semibold text-rose-400">
                    {lowPrice.toFixed(5)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Trigger Gemini Scan Button */}
          <button
            onClick={() => {
              playClickSound();
              onTriggerGeminiScan();
            }}
            disabled={isGeminiLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-space font-semibold transition-all ${
              isGeminiLoading
                ? 'bg-purple-900/40 border-purple-500 text-purple-300 animate-pulse'
                : 'bg-gradient-to-r from-[#8B5CF6]/20 to-[#A855F7]/30 hover:from-[#8B5CF6]/40 hover:to-[#A855F7]/50 border-[#C084FC]/40 text-[#E9D5FF] hover:text-white shadow-sm'
            }`}
            title="Lê o nome do ativo e preços exatos da tela da corretora com Gemini IA"
          >
            <Sparkles className={`w-3.5 h-3.5 text-[#FFE600] ${isGeminiLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isGeminiLoading ? 'LENDO TELA...' : 'LENDO C/ GEMINI'}
            </span>
          </button>

          {/* Quick Refresh Scan */}
          <button
            onClick={onRefreshScan}
            className="p-2 rounded-xl bg-[#05030A] hover:bg-[#8B5CF6]/20 border border-[#A855F7]/30 text-slate-300 hover:text-white transition-all shadow-sm"
            title="Atualizar Leitura de Velas"
          >
            <RefreshCw className="w-4 h-4 text-[#C084FC]" />
          </button>
        </div>
      </div>

      {/* Main Display Area: Real Broker Video Feed OR Interactive Simulated Chart */}
      <div
        ref={mediaContainerRef}
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-black"
      >
        {/* ChartOverlayCanvas strictly bounds all indicators (EMAs, horizontal lines, channel, signals) INSIDE this container */}
        <ChartOverlayCanvas
          candles={candles}
          indicators={indicators}
          activeSignal={activeSignal}
          roi={roi}
          containerRef={mediaContainerRef}
          videoRef={videoRef}
          isCapturing={isCapturing}
        />

        {isCapturing ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {/* Live Video Feed from getDisplayMedia */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />

            {/* Visual Computer Vision Bounding Box (ROI) */}
            <div
              className="absolute border-2 border-dashed border-[#8B5CF6] pointer-events-none transition-all duration-150"
              style={{
                left: `${roi.x * 100}%`,
                top: `${roi.y * 100}%`,
                width: `${roi.width * 100}%`,
                height: `${roi.height * 100}%`,
                boxShadow: '0 0 25px rgba(139, 92, 246, 0.5), inset 0 0 15px rgba(139, 92, 246, 0.25)',
              }}
            >
              <div className="bg-[#0B0714]/90 text-[10px] font-mono text-[#C084FC] px-2 py-0.5 rounded border border-[#8B5CF6]/50 inline-flex items-center gap-1.5 m-2 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFE600] animate-ping" />
                <span>ÁREA DE LEITURA (ROI) • {displayAsset}</span>
              </div>
            </div>

            {/* Gemini Live Insight Pill if detected */}
            {geminiData?.analysisSummary && (
              <div className="absolute top-4 left-4 z-20 bg-[#0B0714]/95 border border-[#8B5CF6]/50 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 max-w-md">
                <Sparkles className="w-3.5 h-3.5 text-[#FFE600] shrink-0" />
                <span className="text-[11px] font-space text-slate-200">
                  {geminiData.analysisSummary}
                </span>
              </div>
            )}
          </div>
        ) : isSimulated ? (
          <div className="relative w-full h-full flex items-center justify-center p-2">
            <canvas
              ref={chartCanvasRef}
              width={900}
              height={500}
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        ) : (
          /* Empty / Standby Screen */
          <div className="p-8 text-center flex flex-col items-center justify-center max-w-lg">
            <div className="w-16 h-16 rounded-2xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/40 flex items-center justify-center mb-4 shadow-[0_0_24px_rgba(139,92,246,0.35)]">
              <Camera className="w-8 h-8 text-[#C084FC]" />
            </div>

            <h3 className="font-space font-bold text-lg text-white uppercase tracking-wider mb-2">
              Pronto para Ler Gráfico da Corretora
            </h3>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              O robô lê a tela por visão computacional e <strong className="text-[#C084FC]">Gemini IA</strong>, desenhando as médias e linhas exatamente dentro da área capturada.
            </p>

            <button
              onClick={onStartCapture}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white font-space font-bold text-xs uppercase tracking-wider shadow-lg glow-purple hover:brightness-110 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>👁️ COMPARTILHAR ABA DO GRÁFICO</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Chart Footer Info */}
      <div className="p-2.5 bg-[#0B0714]/90 backdrop-blur-md border-t border-[#A855F7]/20 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 px-4 z-10">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" /> EMA 9: {indicators ? indicators.emaFast.toFixed(5) : '-'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" /> EMA 21: {indicators ? indicators.emaSlow.toFixed(5) : '-'}
          </span>
          <span className="hidden sm:inline text-slate-500">|</span>
          <span className="hidden sm:inline">Canal (40): {indicators ? indicators.channelMid.toFixed(5) : '-'}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400">Fechamento da Vela:</span>
          <span className="font-bold text-amber-300 text-xs">{formatCountdown(candleTimeRemaining)}</span>
        </div>
      </div>
    </div>
  );
};
