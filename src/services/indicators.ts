import { Candle, TechnicalIndicators } from '../types';

/**
 * Calculates EMA series for a given period and array of values
 */
export function calculateEmaSeries(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  if (values.length < period) {
    // If not enough data, use simple running averages as bootstrap
    let sum = 0;
    return values.map((v, i) => {
      sum += v;
      return sum / (i + 1);
    });
  }

  const k = 2 / (period + 1);
  const ema: number[] = new Array(values.length);

  // Initial SMA for first 'period' values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
    ema[i] = sum / (i + 1);
  }
  ema[period - 1] = sum / period;

  // Compute EMA for the rest
  for (let i = period; i < values.length; i++) {
    ema[i] = values[i] * k + ema[i - 1] * (1 - k);
  }

  return ema;
}

/**
 * Computes all technical indicators required for PRISMA IA
 */
export function computeTechnicalIndicators(
  candles: Candle[],
  emaFastPeriod: number = 9,
  emaSlowPeriod: number = 21,
  channelLookback: number = 40,
  straightMaThresholdPercent: number = 15,
  straightMaCandlesCount: number = 5,
  isRelativePrice: boolean = true
): TechnicalIndicators | null {
  if (!candles || candles.length === 0) return null;

  const closes = candles.map((c) => c.close);
  const emaFastAll = calculateEmaSeries(closes, emaFastPeriod);
  const emaSlowAll = calculateEmaSeries(closes, emaSlowPeriod);

  const lastCandle = candles[candles.length - 1];
  const currentPrice = lastCandle.close;
  const currentEmaFast = emaFastAll[emaFastAll.length - 1] ?? currentPrice;
  const currentEmaSlow = emaSlowAll[emaSlowAll.length - 1] ?? currentPrice;

  // Lookback channel calculation (highest high and lowest low of last 40 candles)
  const channelCandles = candles.slice(-channelLookback);
  let highestHigh = -Infinity;
  let lowestLow = Infinity;

  channelCandles.forEach((c) => {
    if (c.high > highestHigh) highestHigh = c.high;
    if (c.low < lowestLow) lowestLow = c.low;
  });

  if (highestHigh === -Infinity) highestHigh = currentPrice * 1.002;
  if (lowestLow === Infinity) lowestLow = currentPrice * 0.998;

  const channelHigh = highestHigh;
  const channelLow = lowestLow;
  const channelMid = (channelHigh + channelLow) / 2;
  const channelHeight = Math.max(0.00001, channelHigh - channelLow);

  // Analyze MA Slope: "MÉDIAS RETAS" condition
  // Check deviation/change of both EMAs over straightMaCandlesCount (default 5 candles)
  const checkCount = Math.min(straightMaCandlesCount, emaFastAll.length, emaSlowAll.length);
  let maSlope: 'RETAS' | 'INCLINADA_ALTA' | 'INCLINADA_BAIXA' = 'RETAS';

  if (checkCount >= 3) {
    const fastStart = emaFastAll[emaFastAll.length - checkCount];
    const fastEnd = emaFastAll[emaFastAll.length - 1];
    const slowStart = emaSlowAll[emaSlowAll.length - checkCount];
    const slowEnd = emaSlowAll[emaSlowAll.length - 1];

    const fastDelta = fastEnd - fastStart;
    const slowDelta = slowEnd - slowStart;

    const threshold = (channelHeight * straightMaThresholdPercent) / 100;

    const fastIsFlat = Math.abs(fastDelta) <= threshold;
    const slowIsFlat = Math.abs(slowDelta) <= threshold;

    if (fastIsFlat && slowIsFlat) {
      maSlope = 'RETAS';
    } else if (fastDelta > 0 && slowDelta >= -threshold * 0.5) {
      maSlope = 'INCLINADA_ALTA';
    } else if (fastDelta < 0 && slowDelta <= threshold * 0.5) {
      maSlope = 'INCLINADA_BAIXA';
    } else {
      maSlope = 'RETAS';
    }
  }

  // Candle direction
  const candleDirection: 'ALTA' | 'BAIXA' | 'LATERAL' =
    lastCandle.close > lastCandle.open
      ? 'ALTA'
      : lastCandle.close < lastCandle.open
      ? 'BAIXA'
      : 'LATERAL';

  // Series mapping for overlay plotting
  const emaFastSeries = candles.map((c, i) => ({
    x: c.xCenter,
    y: c.yClose,
    price: emaFastAll[i] ?? c.close,
  }));

  const emaSlowSeries = candles.map((c, i) => ({
    x: c.xCenter,
    y: c.yClose,
    price: emaSlowAll[i] ?? c.close,
  }));

  return {
    currentPrice,
    isRelativePrice,
    emaFast: currentEmaFast,
    emaSlow: currentEmaSlow,
    distanceEmaFast: currentPrice - currentEmaFast,
    distanceEmaSlow: currentPrice - currentEmaSlow,
    channelHigh,
    channelLow,
    channelMid,
    maSlope,
    candleDirection,
    candlesCount: candles.length,
    emaFastSeries,
    emaSlowSeries,
  };
}
