export type PlatformType = 'POCKET_OPTION' | 'QUOTEX' | 'GENERICA';

export type SignalDirection = 'COMPRA' | 'VENDA';

export type SignalLogicType = 'L1' | 'L2' | 'L3' | 'L1+L2' | 'L1+L3' | 'L2+L3' | 'L1+L2+L3';

export type SignalOutcome = 'WIN' | 'LOSS' | 'PENDING' | 'CANCELLED';

export interface Candle {
  index: number;
  open: number;
  high: number;
  low: number;
  close: number;
  color: 'GREEN' | 'RED' | 'DOJI';
  // Screen coordinates inside ROI
  xStart: number;
  xEnd: number;
  xCenter: number;
  yOpen: number;
  yClose: number;
  yHigh: number;
  yLow: number;
  timestamp: number;
  isClosed: boolean;
}

export interface SignalRecord {
  id: string;
  timestamp: number;
  timeBrasilia: string;
  asset: string;
  direction: SignalDirection;
  logic: SignalLogicType;
  logicTitle: string;
  price: number;
  isRelativePrice: boolean;
  candleTimestamp: number;
  entryCandlePrice?: number;
  closeCandlePrice?: number;
  status: 'ANALYZING' | 'SIGNAL_GENERATED' | 'ACTIVE_TRADE' | 'CLOSED';
  outcome: SignalOutcome;
  expirySeconds: number;
  timeframe: string;
}

export interface GeminiVisionResult {
  asset: string;
  currentPrice: number;
  highPrice: number;
  lowPrice: number;
  trend: 'ALTA' | 'BAIXA' | 'LATERAL';
  signalConfirmation: 'COMPRA' | 'VENDA' | 'NEUTRO';
  confidence: number;
  analysisSummary: string;
  lastUpdated: number;
}

export interface TechnicalIndicators {
  currentPrice: number;
  isRelativePrice: boolean;
  emaFast: number; // 9
  emaSlow: number; // 21
  distanceEmaFast: number;
  distanceEmaSlow: number;
  channelHigh: number;
  channelLow: number;
  channelMid: number;
  maSlope: 'RETAS' | 'INCLINADA_ALTA' | 'INCLINADA_BAIXA';
  candleDirection: 'ALTA' | 'BAIXA' | 'LATERAL';
  candlesCount: number;
  emaFastSeries: { x: number; y: number; price: number }[];
  emaSlowSeries: { x: number; y: number; price: number }[];
  geminiData?: GeminiVisionResult | null;
}

export interface ROI {
  x: number; // percentage or px
  y: number;
  width: number;
  height: number;
  isCustom: boolean;
}

export interface ColorPreset {
  faixaMatizAlta: string;
  faixaMatizBaixa: string;
  hexAproximadoAlta: string;
  hexAproximadoBaixa: string;
  tolerance: number;
}

export interface PrismaConfig {
  platform: PlatformType;
  asset: string;
  tfMs: number; // 60000 = 1m
  utcOffsetHours: number; // -3
  emaFastPeriod: number; // 9
  emaSlowPeriod: number; // 21
  channelLookback: number; // 40
  totalLookback: number; // 120
  straightMaThresholdPercent: number; // 15%
  straightMaCandlesCount: number; // 5
  colorTolerance: number; // 30
  corAltaHex: string;
  corBaixaHex: string;
  signalDelayMs: number; // 1500
  retryDelayMs: number; // 3000
  soundEnabled: boolean;
  ocrEnabled: boolean;
  autoWinLossCheck: boolean;
  priorityLogic: 'L3' | 'L2' | 'L1';
  geminiAutoScan: boolean;
  // Manual scale
  manualScaleEnabled: boolean;
  manualTopPrice: number;
  manualBottomPrice: number;
}

export interface CalibrationStats {
  greenPixelsFound: number;
  redPixelsFound: number;
  detectedGreenHex: string;
  detectedRedHex: string;
  contrastRatio: number;
  noiseRejected: number;
}
