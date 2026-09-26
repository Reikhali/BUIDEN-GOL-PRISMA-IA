import React, { useEffect, useRef } from 'react';
import { Candle, TechnicalIndicators, SignalRecord, ROI } from '../types';

interface OverlayCanvasProps {
  candles: Candle[];
  indicators: TechnicalIndicators | null;
  activeSignal: SignalRecord | null;
  roi: ROI;
  visible: boolean;
}

export const OverlayCanvas: React.FC<OverlayCanvasProps> = ({
  candles,
  indicators,
  activeSignal,
  roi,
  visible,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Early return if not enough candles to draw indicators
    if (!indicators || candles.length < 5) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Adjust HiDPI
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Compute Y mapping inside ROI
    const rx = roi.x * width;
    const ry = roi.y * height;
    const rw = roi.width * width;
    const rh = roi.height * height;

    const channelHigh = indicators.channelHigh;
    const channelLow = indicators.channelLow;
    const channelRange = Math.max(0.00001, channelHigh - channelLow);

    const priceToY = (price: number): number => {
      const normalized = (channelHigh - price) / channelRange;
      return ry + Math.max(0.05 * rh, Math.min(0.95 * rh, normalized * rh));
    };

    // 1. Draw Channel Boundary Lines (Yellow Neon #FFE600)
    const yTop = priceToY(channelHigh);
    const yBottom = priceToY(channelLow);
    const yMid = priceToY(indicators.channelMid);

    // Top Channel
    ctx.strokeStyle = 'rgba(255, 230, 0, 0.65)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(rx, yTop);
    ctx.lineTo(rx + rw, yTop);
    ctx.stroke();

    // Top Channel Label
    ctx.fillStyle = '#FFE600';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.fillText(`CANAL TOPO: ${channelHigh.toFixed(5)}`, rx + 10, yTop - 4);

    // Bottom Channel
    ctx.strokeStyle = 'rgba(255, 230, 0, 0.65)';
    ctx.beginPath();
    ctx.moveTo(rx, yBottom);
    ctx.lineTo(rx + rw, yBottom);
    ctx.stroke();

    // Bottom Channel Label
    ctx.fillText(`CANAL FUNDO: ${channelLow.toFixed(5)}`, rx + 10, yBottom + 12);

    // Mid Channel (Dashed)
    ctx.strokeStyle = 'rgba(255, 230, 0, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(rx, yMid);
    ctx.lineTo(rx + rw, yMid);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Draw Current Price Line (Dashed cyan)
    const yCurrent = priceToY(indicators.currentPrice);
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(rx, yCurrent);
    ctx.lineTo(rx + rw, yCurrent);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price tag on right edge
    ctx.fillStyle = '#8B5CF6';
    ctx.beginPath();
    ctx.roundRect(rx + rw - 70, yCurrent - 10, 68, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.fillText(indicators.currentPrice.toFixed(5), rx + rw - 65, yCurrent + 4);

    // 3. Draw EMA 9 Series (Blue Neon #38BDF8)
    const emaFastSeries = indicators.emaFastSeries;
    if (emaFastSeries && emaFastSeries.length > 2) {
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 6;
      ctx.beginPath();

      emaFastSeries.forEach((pt, i) => {
        const x = pt.x || (rx + (i / emaFastSeries.length) * rw);
        const y = priceToY(pt.price);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 4. Draw EMA 21 Series (Red Neon #F43F5E)
    const emaSlowSeries = indicators.emaSlowSeries;
    if (emaSlowSeries && emaSlowSeries.length > 2) {
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#F43F5E';
      ctx.shadowBlur = 6;
      ctx.beginPath();

      emaSlowSeries.forEach((pt, i) => {
        const x = pt.x || (rx + (i / emaSlowSeries.length) * rw);
        const y = priceToY(pt.price);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 5. Draw Active Signal Indicator directly on the last candle if available
    if (activeSignal && candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      const targetX = lastCandle.xCenter || (rx + rw - 35);
      const isBuy = activeSignal.direction === 'COMPRA';
      const targetY = isBuy ? lastCandle.yHigh - 45 : lastCandle.yLow + 45;

      // Glow circle
      ctx.fillStyle = isBuy ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      ctx.arc(targetX, targetY, 26, 0, Math.PI * 2);
      ctx.fill();

      // Signal border
      ctx.strokeStyle = isBuy ? '#22C55E' : '#EF4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 24, 0, Math.PI * 2);
      ctx.stroke();

      // Icon badge
      ctx.fillStyle = '#FFE600';
      ctx.font = 'bold 12px Space Grotesk, sans-serif';
      const iconSymbol = activeSignal.logic.includes('L3')
        ? '⚡'
        : activeSignal.logic.includes('L2')
        ? '▲'
        : '●';
      ctx.fillText(iconSymbol, targetX - 5, targetY - 4);

      // Text label
      ctx.fillStyle = isBuy ? '#22C55E' : '#EF4444';
      ctx.font = 'extrabold 10px Space Grotesk, sans-serif';
      const textLabel = isBuy ? 'CALL ↑' : 'PUT ↓';
      ctx.fillText(textLabel, targetX - 16, targetY + 12);
    }
  }, [candles, indicators, activeSignal, roi, visible]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-30"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};
