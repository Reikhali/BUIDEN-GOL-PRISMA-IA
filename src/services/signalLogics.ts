import { Candle, SignalRecord, TechnicalIndicators, SignalDirection, SignalLogicType, PrismaConfig } from '../types';
import { formatBrasiliaTime } from '../utils/time';

export interface EvaluatedSignal {
  direction: SignalDirection;
  logic: SignalLogicType;
  logicTitle: string;
  price: number;
  candleTimestamp: number;
  reason: string;
}

/**
 * Checks all 3 independent signal logics against the candlestick data and indicators
 */
export function evaluateSignals(
  candles: Candle[],
  indicators: TechnicalIndicators,
  config: PrismaConfig,
  lastProcessedTimestamp: number
): EvaluatedSignal | null {
  if (candles.length < 10) return null;

  const currentCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const candleBeforePrev = candles[candles.length - 3];

  if (!currentCandle || !prevCandle) return null;

  // Deduplication: prevent firing on already processed candle timestamp
  if (currentCandle.timestamp <= lastProcessedTimestamp) {
    return null;
  }

  const triggeredLogics: { logic: 'L1' | 'L2' | 'L3'; direction: SignalDirection; reason: string }[] = [];

  // ==========================================
  // LÓGICA 1: CRUZAMENTO DAS MÉDIAS (EMAs)
  // ==========================================
  // Compare EMA 9 and EMA 21 on closed candles
  const emaFastSeries = indicators.emaFastSeries;
  const emaSlowSeries = indicators.emaSlowSeries;

  if (emaFastSeries.length >= 3 && emaSlowSeries.length >= 3) {
    const prevFast = emaFastSeries[emaFastSeries.length - 2].price;
    const prevSlow = emaSlowSeries[emaSlowSeries.length - 2].price;
    const currFast = emaFastSeries[emaFastSeries.length - 1].price;
    const currSlow = emaSlowSeries[emaSlowSeries.length - 1].price;

    // Fast crosses above slow -> COMPRA
    if (prevFast <= prevSlow && currFast > currSlow) {
      triggeredLogics.push({
        logic: 'L1',
        direction: 'COMPRA',
        reason: 'Cruzamento de Médias: EMA 9 cruzou para CIMA da EMA 21',
      });
    }
    // Fast crosses below slow -> VENDA
    else if (prevFast >= prevSlow && currFast < currSlow) {
      triggeredLogics.push({
        logic: 'L1',
        direction: 'VENDA',
        reason: 'Cruzamento de Médias: EMA 9 cruzou para BAIXO da EMA 21',
      });
    }
  }

  // ==========================================
  // LÓGICA 2: MÉDIAS RETAS + PONTA INCLINADA
  // ==========================================
  // Condition: Médias retas (horizontal) and candle tip inclination
  if (indicators.maSlope === 'RETAS') {
    const emaSlow = indicators.emaSlow;
    const isBelowAverages = prevCandle.close < emaSlow && prevCandle.open < emaSlow;
    const isAboveAverages = prevCandle.close > emaSlow && prevCandle.open > emaSlow;

    // Cenário A: COMPRA (Abaixo das médias + ponta inclina para cima)
    const tipSlantedUp = currentCandle.close > currentCandle.open || currentCandle.high > prevCandle.high;
    const stillBelowEma = Math.max(currentCandle.open, currentCandle.close) <= emaSlow * 1.0008;

    if (isBelowAverages && tipSlantedUp && stillBelowEma) {
      triggeredLogics.push({
        logic: 'L2',
        direction: 'COMPRA',
        reason: 'Médias Retas + Ponta Inclinada ↑ (Repique de Fundo abaixo das EMAs)',
      });
    }

    // Cenário B: VENDA (Acima das médias + ponta inclina para baixo)
    const tipSlantedDown = currentCandle.close < currentCandle.open || currentCandle.low < prevCandle.low;
    const stillAboveEma = Math.min(currentCandle.open, currentCandle.close) >= emaSlow * 0.9992;

    if (isAboveAverages && tipSlantedDown && stillAboveEma) {
      triggeredLogics.push({
        logic: 'L2',
        direction: 'VENDA',
        reason: 'Médias Retas + Ponta Inclinada ↓ (Rejeição de Topo acima das EMAs)',
      });
    }
  }

  // ==========================================
  // LÓGICA 3: POSIÇÃO + IMPULSO
  // ==========================================
  const emaFast = indicators.emaFast;
  const emaSlow = indicators.emaSlow;
  const maxEma = Math.max(emaFast, emaSlow);
  const minEma = Math.min(emaFast, emaSlow);

  // Cenário COMPRA: Corpo inteiro da vela JÁ ACIMA das duas médias e impulso para cima
  const bodyEntirelyAbove = Math.min(currentCandle.open, currentCandle.close) > maxEma;
  const clicksUp = currentCandle.close > currentCandle.open && currentCandle.high > prevCandle.high;

  if (bodyEntirelyAbove && clicksUp) {
    triggeredLogics.push({
      logic: 'L3',
      direction: 'COMPRA',
      reason: 'Posição + Impulso ↑: Vela com corpo 100% acima das EMAs rompendo máxima anterior',
    });
  }

  // Cenário VENDA: Corpo inteiro da vela JÁ ABAIXO das duas médias e impulso para baixo
  const bodyEntirelyBelow = Math.max(currentCandle.open, currentCandle.close) < minEma;
  const clicksDown = currentCandle.close < currentCandle.open && currentCandle.low < prevCandle.low;

  if (bodyEntirelyBelow && clicksDown) {
    triggeredLogics.push({
      logic: 'L3',
      direction: 'VENDA',
      reason: 'Posição + Impulso ↓: Vela com corpo 100% abaixo das EMAs perdendo mínima anterior',
    });
  }

  if (triggeredLogics.length === 0) {
    return null;
  }

  // Check if multiple logics triggered
  const hasBuy = triggeredLogics.some((l) => l.direction === 'COMPRA');
  const hasSell = triggeredLogics.some((l) => l.direction === 'VENDA');

  // If conflicting signals on same candle, prioritize by config
  let finalDirection: SignalDirection = 'COMPRA';
  if (hasBuy && !hasSell) {
    finalDirection = 'COMPRA';
  } else if (!hasBuy && hasSell) {
    finalDirection = 'VENDA';
  } else {
    // Conflict resolution: pick priority
    const priority = config.priorityLogic; // 'L3' | 'L2' | 'L1'
    const topLogic = triggeredLogics.find((l) => l.logic === priority) || triggeredLogics[0];
    finalDirection = topLogic.direction;
  }

  // Filter triggered logics matching final direction
  const matchingLogics = triggeredLogics.filter((l) => l.direction === finalDirection);
  const logicKeys = matchingLogics.map((l) => l.logic);

  let combinedLogic: SignalLogicType = 'L1';
  if (logicKeys.includes('L1') && logicKeys.includes('L2') && logicKeys.includes('L3')) {
    combinedLogic = 'L1+L2+L3';
  } else if (logicKeys.includes('L1') && logicKeys.includes('L2')) {
    combinedLogic = 'L1+L2';
  } else if (logicKeys.includes('L1') && logicKeys.includes('L3')) {
    combinedLogic = 'L1+L3';
  } else if (logicKeys.includes('L2') && logicKeys.includes('L3')) {
    combinedLogic = 'L2+L3';
  } else if (logicKeys.includes('L3')) {
    combinedLogic = 'L3';
  } else if (logicKeys.includes('L2')) {
    combinedLogic = 'L2';
  } else {
    combinedLogic = 'L1';
  }

  const logicTitle = `${finalDirection} · ${combinedLogic}`;
  const reasons = matchingLogics.map((l) => l.reason).join(' | ');

  return {
    direction: finalDirection,
    logic: combinedLogic,
    logicTitle,
    price: currentCandle.close,
    candleTimestamp: currentCandle.timestamp,
    reason: reasons,
  };
}

/**
 * Creates a formal SignalRecord ready for the signal log and live bot tracking
 */
export function createSignalRecord(
  evalSignal: EvaluatedSignal,
  asset: string,
  timeframe: string,
  isRelativePrice: boolean,
  expirySeconds: number
): SignalRecord {
  const now = Date.now();
  return {
    id: `signal-${now}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    timeBrasilia: formatBrasiliaTime(now),
    asset,
    direction: evalSignal.direction,
    logic: evalSignal.logic,
    logicTitle: evalSignal.logicTitle,
    price: evalSignal.price,
    isRelativePrice,
    candleTimestamp: evalSignal.candleTimestamp,
    status: 'SIGNAL_GENERATED',
    outcome: 'PENDING',
    expirySeconds,
    timeframe,
  };
}

/**
 * Automatically evaluates whether a signal resulted in WIN or LOSS based on entry vs close candle prices
 */
export function checkSignalWinLoss(
  signal: SignalRecord,
  entryPrice: number,
  closePrice: number
): { outcome: 'WIN' | 'LOSS'; diff: number } {
  const isBuy = signal.direction === 'COMPRA';
  const diff = closePrice - entryPrice;

  if (isBuy) {
    return {
      outcome: diff > 0 ? 'WIN' : 'LOSS',
      diff,
    };
  } else {
    return {
      outcome: diff < 0 ? 'WIN' : 'LOSS',
      diff: -diff,
    };
  }
}
