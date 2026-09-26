import React, { useEffect, useRef } from 'react';
import { Candle, TechnicalIndicators, SignalRecord, ROI } from '../types';

interface ChartOverlayCanvasProps {
  candles: Candle[];
  indicators: TechnicalIndicators | null;
  activeSignal: SignalRecord | null;
  roi: ROI;
  containerRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isCapturing: boolean;
}

export const ChartOverlayCanvas: React.FC<ChartOverlayCanvasProps> = ({
  candles,
  indicators,
  activeSignal,
  roi,
  containerRef,
  videoRef,
  isCapturing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!indicators || candles.length < 5) return;

    // Calculate actual video render bounds inside object-contain container
    let renderX = 0;
    let renderY = 0;
    let renderW = rect.width;
    let renderH = rect.height;

    if (isCapturing && videoRef.current && videoRef.current.videoWidth > 0) {
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      const containerRatio = rect.width / rect.height;
      const videoRatio = vw / vh;

      if (videoRatio > containerRatio) {
        // Video is wider than container, black bars top/bottom
        renderW = rect.width;
        renderH = rect.width / videoRatio;
        renderX = 0;
        renderY = (rect.height - renderH) / 2;
      } else {
        // Video is taller than container, black bars left/right
        renderH = rect.height;
        renderW = rect.height * videoRatio;
        renderY = 0;
        renderX = (rect.width - renderW) / 2;
      }
    }

    // Coordinates of ROI mapped strictly INSIDE the rendered video area
    const rx = renderX + roi.x * renderW;
    const ry = renderY + roi.y * renderH;
    const rw = roi.width * renderW;
    const rh = roi.height * renderH;

    // Price scaling within the channel
    const channelHigh = indicators.channelHigh;
    const channelLow = indicators.channelLow;
    const channelRange = Math.max(0.00001, channelHigh - channelLow);

    const priceToY = (price: number): number => {
      const normalized = (channelHigh - price) / channelRange;
      return ry + Math.max(0.04 * rh, Math.min(0.96 * rh, normalized * rh));
    };

    // 1. Channel Lines (Yellow Neon #FFE600) - BOUND INSIDE ROI
    const yTop = priceToY(channelHigh);
    const yBottom = priceToY(channelLow);
    const yMid = priceToY(indicators.channelMid);

    // Top Channel
    ctx.strokeStyle = 'rgba(255, 230, 0, 0.75)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(rx, yTop);
    ctx.lineTo(rx + rw, yTop);
    ctx.stroke();

    ctx.fillStyle = '#FFE600';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.fillText(`TOPO: ${channelHigh.toFixed(5)}`, rx + 8, yTop - 4);

    // Bottom Channel
    ctx.strokeStyle = 'rgba(255, 230, 0, 0.75)';
    ctx.beginPath();
    ctx.moveTo(rx, yBottom);
    ctx.lineTo(rx + rw, yBottom);
    ctx.stroke();

    ctx.fillText(`FUNDO: ${channelLow.toFixed(5)}`, rx + 8, yBottom + 12);

    // Mid Channel (Dashed)
    ctx.strokeStyle = 'rgba(255, 230, 0, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(rx, yMid);
    ctx.lineTo(rx + rw, yMid);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Current Price Line (Dashed purple/magenta)
    const yCurrent = priceToY(indicators.currentPrice);
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(rx, yCurrent);
    ctx.lineTo(rx + rw, yCurrent);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price tag right at the edge of the reading area
    ctx.fillStyle = '#8B5CF6';
    ctx.beginPath();
    ctx.roundRect(rx + rw - 68, yCurrent - 10, 66, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.fillText(indicators.currentPrice.toFixed(5), rx + rw - 63, yCurrent + 4);

    // 3. EMA 9 (Blue Neon #38BDF8)
    const emaFastSeries = indicators.emaFastSeries;
    if (emaFastSeries && emaFastSeries.length > 2) {
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 6;
      ctx.beginPath();

      emaFastSeries.forEach((pt, i) => {
        const x = rx + (i / (emaFastSeries.length - 1)) * (rw - 40);
        const y = priceToY(pt.price);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 4. EMA 21 (Red Neon #F43F5E)
    const emaSlowSeries = indicators.emaSlowSeries;
    if (emaSlowSeries && emaSlowSeries.length > 2) {
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#F43F5E';
      ctx.shadowBlur = 6;
      ctx.beginPath();

      emaSlowSeries.forEach((pt, i) => {
        const x = rx + (i / (emaSlowSeries.length - 1)) * (rw - 40);
        const y = priceToY(pt.price);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 5. Active Signal Marker (Drawn directly on the last candle inside ROI)
    if (activeSignal) {
      const targetX = rx + rw - 35;
      const isBuy = activeSignal.direction === 'COMPRA';
      const targetY = isBuy ? ry + rh * 0.25 : ry + rh * 0.75;

      // Glow circle
      ctx.fillStyle = isBuy ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)';
      ctx.beginPath();
      ctx.arc(targetX, targetY, 24, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = isBuy ? '#22C55E' : '#EF4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 22, 0, Math.PI * 2);
      ctx.stroke();

      // Icon
      ctx.fillStyle = '#FFE600';
      ctx.font = 'bold 11px Space Grotesk, sans-serif';
      const iconSymbol = activeSignal.logic.includes('L3')
        ? '⚡'
        : activeSignal.logic.includes('L2')
        ? '▲'
        : '●';
      ctx.fillText(iconSymbol, targetX - 5, targetY - 3);

      // Label
      ctx.fillStyle = isBuy ? '#22C55E' : '#EF4444';
      ctx.font = 'extrabold 9px Space Grotesk, sans-serif';
      ctx.fillText(isBuy ? 'CALL ↑' : 'PUT ↓', targetX - 14, targetY + 11);
    }
  }, [candles, indicators, activeSignal, roi, containerRef, videoRef, isCapturing]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-20 w-full h-full"
    />
  );
};
