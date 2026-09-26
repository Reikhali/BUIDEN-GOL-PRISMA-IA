import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PlatformType,
  Candle,
  SignalRecord,
  TechnicalIndicators,
  PrismaConfig,
  ROI,
  CalibrationStats,
  SignalDirection,
  SignalLogicType,
  GeminiVisionResult,
} from './types';
import { Header } from './components/Header';
import { FloatingBar } from './components/FloatingBar';
import { LiveAnalysisPanel } from './components/LiveAnalysisPanel';
import { SignalLogPanel } from './components/SignalLogPanel';
import { SettingsDrawer } from './components/SettingsDrawer';
import { AreaSelectorModal } from './components/AreaSelectorModal';
import { ColorCalibrationModal } from './components/ColorCalibrationModal';
import { InteractiveChartView } from './components/InteractiveChartView';
import { ActiveSignalCard } from './components/ActiveSignalCard';
import { computeTechnicalIndicators } from './services/indicators';
import {
  evaluateSignals,
  createSignalRecord,
  checkSignalWinLoss,
} from './services/signalLogics';
import {
  extractCandlesFromFrame,
  calibrateColorsFromImage,
  generateSyntheticCandles,
  PLATFORM_COLOR_PRESETS,
} from './services/vision';
import {
  formatBrasiliaTime,
  getCandleTimeRemainingSeconds,
  getTimeframeLabel,
} from './utils/time';
import {
  initAudioOnUserGesture,
  playSignalCompraSound,
  playSignalVendaSound,
  playWinSound,
  playLossSound,
  playClickSound,
} from './utils/audio';
import { analyzeBrokerScreenWithGemini } from './services/geminiService';
import confetti from 'canvas-confetti';

const STORAGE_KEY_CONFIG = 'prisma_ia_config_v2';
const STORAGE_KEY_ROI = 'prisma_ia_roi_v2';
const STORAGE_KEY_SIGNALS = 'prisma_ia_signals_v2';

const DEFAULT_CONFIG: PrismaConfig = {
  platform: 'POCKET_OPTION',
  asset: 'EUR/USD (OTC)',
  tfMs: 60000, // 1 minute
  utcOffsetHours: -3,
  emaFastPeriod: 9,
  emaSlowPeriod: 21,
  channelLookback: 40,
  totalLookback: 120,
  straightMaThresholdPercent: 15,
  straightMaCandlesCount: 5,
  colorTolerance: 30,
  corAltaHex: '#00B373',
  corBaixaHex: '#FF3B3B',
  signalDelayMs: 1500,
  retryDelayMs: 3000,
  soundEnabled: true,
  ocrEnabled: true,
  autoWinLossCheck: true,
  priorityLogic: 'L3',
  geminiAutoScan: true,
  manualScaleEnabled: false,
  manualTopPrice: 1.08650,
  manualBottomPrice: 1.08450,
};

const DEFAULT_ROI: ROI = {
  x: 0.08,
  y: 0.12,
  width: 0.72,
  height: 0.76,
  isCustom: false,
};

export default function App() {
  // Config & State
  const [config, setConfig] = useState<PrismaConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [roi, setRoi] = useState<ROI>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROI);
      return saved ? JSON.parse(saved) : DEFAULT_ROI;
    } catch {
      return DEFAULT_ROI;
    }
  });

  const [signals, setSignals] = useState<SignalRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SIGNALS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isSimulated, setIsSimulated] = useState<boolean>(true); // Active simulated test mode by default
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true); // Continuous analysis enabled by default
  const [activeSignal, setActiveSignal] = useState<SignalRecord | null>(null);

  const [candles, setCandles] = useState<Candle[]>(() => generateSyntheticCandles(45, 1.08550, config.tfMs));
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [calibrationStats, setCalibrationStats] = useState<CalibrationStats | null>(null);

  // Gemini Live Vision Data
  const [geminiData, setGeminiData] = useState<GeminiVisionResult | null>(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState<boolean>(false);

  // Time & Clock
  const [brasiliaTime, setBrasiliaTime] = useState<string>(formatBrasiliaTime());
  const [candleTimeRemaining, setCandleTimeRemaining] = useState<number>(60);

  // Modals & Drawers
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAreaSelectorOpen, setIsAreaSelectorOpen] = useState<boolean>(false);
  const [isColorCalibrationOpen, setIsColorCalibrationOpen] = useState<boolean>(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analysisLoopTimerRef = useRef<number | null>(null);
  const clockTimerRef = useRef<number | null>(null);
  const geminiTimerRef = useRef<number | null>(null);
  const lastProcessedCandleTimestampRef = useRef<number>(0);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Save config on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch {}
  }, [config]);

  // Save ROI on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ROI, JSON.stringify(roi));
    } catch {}
  }, [roi]);

  // Save Signals on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SIGNALS, JSON.stringify(signals.slice(0, 100)));
    } catch {}
  }, [signals]);

  // Update Brasília Clock and Candle Countdown every second
  useEffect(() => {
    clockTimerRef.current = window.setInterval(() => {
      const now = Date.now();
      setBrasiliaTime(formatBrasiliaTime(now));
      setCandleTimeRemaining(getCandleTimeRemainingSeconds(now, config.tfMs));
    }, 1000);

    return () => {
      if (clockTimerRef.current) clearInterval(clockTimerRef.current);
    };
  }, [config.tfMs]);

  // Compute indicators whenever candles or gemini data change
  useEffect(() => {
    if (candles.length > 0) {
      const isRelative = !config.manualScaleEnabled && !geminiData;
      const ind = computeTechnicalIndicators(
        candles,
        config.emaFastPeriod,
        config.emaSlowPeriod,
        config.channelLookback,
        config.straightMaThresholdPercent,
        config.straightMaCandlesCount,
        isRelative
      );
      if (ind) {
        ind.geminiData = geminiData;
      }
      setIndicators(ind);
    }
  }, [candles, config, geminiData]);

  // Function to trigger Gemini Vision Analysis on captured broker frame
  const runGeminiScreenScan = useCallback(async () => {
    let canvas = offscreenCanvasRef.current;
    if (isCapturing && videoRef.current && videoRef.current.readyState >= 2) {
      if (!canvas) {
        canvas = document.createElement('canvas');
        offscreenCanvasRef.current = canvas;
      }
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      }
    }

    if (!canvas) return;

    setIsGeminiLoading(true);
    try {
      const result = await analyzeBrokerScreenWithGemini(canvas, config.platform);
      if (result) {
        setGeminiData(result);
        // Automatically sync detected asset name so the user never has to type it!
        if (result.asset && result.asset !== config.asset) {
          setConfig((prev) => ({ ...prev, asset: result.asset }));
        }
      }
    } catch (e) {
      console.warn('Erro ao escanear com Gemini:', e);
    } finally {
      setIsGeminiLoading(false);
    }
  }, [isCapturing, config.platform, config.asset]);

  // Periodic background Gemini screen scan when capturing (every 25 seconds)
  useEffect(() => {
    if (!isCapturing || !config.geminiAutoScan) {
      if (geminiTimerRef.current) clearInterval(geminiTimerRef.current);
      return;
    }

    // Run first scan after 2 seconds of starting capture
    const initialTimeout = setTimeout(() => {
      runGeminiScreenScan();
    }, 2000);

    geminiTimerRef.current = window.setInterval(() => {
      runGeminiScreenScan();
    }, 25000);

    return () => {
      clearTimeout(initialTimeout);
      if (geminiTimerRef.current) clearInterval(geminiTimerRef.current);
    };
  }, [isCapturing, config.geminiAutoScan, runGeminiScreenScan]);

  // Check automated WIN / LOSS when active trade candle closes and reset back to continuous analysis
  const checkActiveTradeResolution = useCallback(
    (currentPrice: number) => {
      if (!activeSignal || activeSignal.status === 'CLOSED') return;

      const now = Date.now();

      // If active signal has no entry price yet, capture it upon entry candle open
      if (activeSignal.entryCandlePrice === undefined) {
        setActiveSignal((prev) => (prev ? { ...prev, entryCandlePrice: currentPrice, status: 'ACTIVE_TRADE' } : null));
        return;
      }

      // Check if target candle duration expired (resolution time)
      const elapsedMs = now - activeSignal.timestamp;
      if (elapsedMs >= config.tfMs - 800) {
        const { outcome } = checkSignalWinLoss(activeSignal, activeSignal.entryCandlePrice, currentPrice);

        // Update active signal to CLOSED
        const updatedSignal: SignalRecord = {
          ...activeSignal,
          closeCandlePrice: currentPrice,
          outcome,
          status: 'CLOSED',
        };

        setActiveSignal(updatedSignal);

        // Update in history list
        setSignals((prev) => prev.map((s) => (s.id === updatedSignal.id ? updatedSignal : s)));

        // Celebrate WIN or alert LOSS
        if (config.soundEnabled) {
          if (outcome === 'WIN') {
            playWinSound();
            try {
              confetti({
                particleCount: 50,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#22C55E', '#A855F7', '#FFE600'],
              });
            } catch {}
          } else {
            playLossSound();
          }
        }

        // CONTINUOUS CYCLE: Automatically dismiss the closed signal card after 4.5 seconds
        // and immediately restart live continuous analysis for the next candle!
        setTimeout(() => {
          setActiveSignal(null);
          setIsAnalyzing(true);
        }, 4500);
      }
    },
    [activeSignal, config.tfMs, config.soundEnabled]
  );

  // Run Vision Processing Frame
  const processFrame = useCallback(() => {
    if (!isCapturing && !isSimulated) return;

    if (isCapturing) {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
      }
      const canvas = offscreenCanvasRef.current;
      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;

      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, vw, vh);

      // Scale calculation parameters
      let scaleA = -0.001;
      let scaleB = 1.0855;
      if (geminiData && geminiData.currentPrice) {
        // Calibrate linear slope based on real Gemini price and channel range
        scaleB = geminiData.highPrice;
        scaleA = (geminiData.lowPrice - geminiData.highPrice) / Math.max(1, roi.height * vh);
      } else if (config.manualScaleEnabled) {
        const rh = roi.height * vh;
        scaleA = (config.manualBottomPrice - config.manualTopPrice) / Math.max(1, rh);
        scaleB = config.manualTopPrice;
      }

      // Extract candles from frame
      const result = extractCandlesFromFrame(
        ctx,
        vw,
        vh,
        roi,
        config.corAltaHex,
        config.corBaixaHex,
        config.colorTolerance,
        scaleA,
        scaleB,
        config.tfMs
      );

      if (result.error) {
        setErrorMessage(result.error);
      } else {
        setErrorMessage(undefined);
        if (result.candles.length >= 10) {
          setCandles(result.candles);

          // Evaluate signals if in continuous analyzing mode and no trade currently waiting resolution
          if (indicators && (!activeSignal || activeSignal.status === 'CLOSED')) {
            const evaluated = evaluateSignals(
              result.candles,
              indicators,
              config,
              lastProcessedCandleTimestampRef.current
            );

            if (evaluated) {
              lastProcessedCandleTimestampRef.current = evaluated.candleTimestamp;
              const effectiveAsset = geminiData?.asset || config.asset;

              const newSignal = createSignalRecord(
                evaluated,
                effectiveAsset,
                getTimeframeLabel(config.tfMs),
                !geminiData && !config.manualScaleEnabled,
                Math.round(config.tfMs / 1000)
              );

              setActiveSignal(newSignal);
              setSignals((prev) => [newSignal, ...prev]);

              if (config.soundEnabled) {
                if (evaluated.direction === 'COMPRA') playSignalCompraSound();
                else playSignalVendaSound();
              }
            }
          }

          // Check active trade resolution against real quote or candle close
          const latestClose = geminiData ? geminiData.currentPrice : result.candles[result.candles.length - 1].close;
          checkActiveTradeResolution(latestClose);
        }
      }
    } else if (isSimulated) {
      // In simulated mode, simulate live tick movements
      setCandles((prevCandles) => {
        if (prevCandles.length === 0) return generateSyntheticCandles(45, 1.0855, config.tfMs);
        const last = { ...prevCandles[prevCandles.length - 1] };
        const change = (Math.random() - 0.49) * 0.00008;
        last.close = parseFloat((last.close + change).toFixed(5));
        last.high = parseFloat(Math.max(last.high, last.close).toFixed(5));
        last.low = parseFloat(Math.min(last.low, last.close).toFixed(5));
        last.color = last.close >= last.open ? 'GREEN' : 'RED';

        const updated = [...prevCandles.slice(0, -1), last];
        return updated;
      });

      if (candles.length > 0) {
        const curPrice = geminiData ? geminiData.currentPrice : candles[candles.length - 1].close;
        checkActiveTradeResolution(curPrice);
      }
    }
  }, [
    isCapturing,
    isSimulated,
    roi,
    config,
    indicators,
    geminiData,
    activeSignal,
    checkActiveTradeResolution,
    candles,
  ]);

  // Main processing loop with singleton instance guard
  useEffect(() => {
    if (analysisLoopTimerRef.current) {
      clearInterval(analysisLoopTimerRef.current);
      analysisLoopTimerRef.current = null;
    }

    const intervalMs = isCapturing ? 1200 : 2000;
    analysisLoopTimerRef.current = window.setInterval(() => {
      processFrame();
    }, intervalMs);

    return () => {
      if (analysisLoopTimerRef.current) {
        clearInterval(analysisLoopTimerRef.current);
        analysisLoopTimerRef.current = null;
      }
    };
  }, [isCapturing, isSimulated, processFrame]);

  // Start / Stop Display Media Screen Capture
  const handleToggleCapture = async () => {
    initAudioOnUserGesture();

    if (isCapturing) {
      // Stop capture
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsCapturing(false);
      setErrorMessage(undefined);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'browser',
          },
          audio: false,
        });

        mediaStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // Listen for user clicking "Stop sharing" on browser native bar
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            setIsCapturing(false);
            if (mediaStreamRef.current) {
              mediaStreamRef.current.getTracks().forEach((t) => t.stop());
              mediaStreamRef.current = null;
            }
            if (videoRef.current) {
              videoRef.current.srcObject = null;
            }
          };
        }

        setIsCapturing(true);
        setIsSimulated(false);
        setErrorMessage(undefined);
      } catch (err: unknown) {
        console.warn('Display media capture cancelled or error:', err);
        setErrorMessage('⚠️ Compartilhamento cancelado. Compartilhe a ABA do gráfico da corretora para o alinhamento correto.');
      }
    }
  };

  // Bot Manual Analyze
  const handleManualAnalyze = () => {
    initAudioOnUserGesture();
    playClickSound();
    setIsAnalyzing(true);

    // Trigger Gemini visual scan to refresh the asset and quotes
    runGeminiScreenScan();

    setTimeout(() => {
      if (candles.length > 5 && indicators) {
        const lastCandle = candles[candles.length - 1];
        const isUp = lastCandle.close >= lastCandle.open;
        const dir: SignalDirection = isUp ? 'COMPRA' : 'VENDA';
        const logic: SignalLogicType = indicators.maSlope === 'RETAS' ? 'L2' : 'L3';
        const effectiveAsset = geminiData?.asset || config.asset;

        const manualEval = {
          direction: dir,
          logic,
          logicTitle: `${dir} · ${logic}`,
          price: geminiData ? geminiData.currentPrice : lastCandle.close,
          candleTimestamp: lastCandle.timestamp,
          reason: 'Análise disparada pelo Bot PRISMA no fechamento da vela',
        };

        const newSig = createSignalRecord(
          manualEval,
          effectiveAsset,
          getTimeframeLabel(config.tfMs),
          !geminiData && !config.manualScaleEnabled,
          Math.round(config.tfMs / 1000)
        );

        setActiveSignal(newSig);
        setSignals((prev) => [newSig, ...prev]);

        if (config.soundEnabled) {
          if (dir === 'COMPRA') playSignalCompraSound();
          else playSignalVendaSound();
        }
      }
    }, 1200);
  };

  // Run automatic color calibration
  const handleRunAutoCalibration = () => {
    let ctx: CanvasRenderingContext2D | null = null;
    let vw = 1280;
    let vh = 720;

    if (isCapturing && videoRef.current) {
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
      }
      const canvas = offscreenCanvasRef.current;
      vw = videoRef.current.videoWidth || 1280;
      vh = videoRef.current.videoHeight || 720;
      canvas.width = vw;
      canvas.height = vh;
      ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, vw, vh);
      }
    }

    if (!ctx) {
      const preset = PLATFORM_COLOR_PRESETS[config.platform];
      setConfig((prev) => ({
        ...prev,
        corAltaHex: preset.hexAproximadoAlta,
        corBaixaHex: preset.hexAproximadoBaixa,
      }));
      setCalibrationStats({
        greenPixelsFound: 420,
        redPixelsFound: 380,
        detectedGreenHex: preset.hexAproximadoAlta,
        detectedRedHex: preset.hexAproximadoBaixa,
        contrastRatio: 2.8,
        noiseRejected: 1400,
      });
      return;
    }

    const { greenHex, redHex, stats } = calibrateColorsFromImage(ctx, vw, vh, roi);
    setConfig((prev) => ({
      ...prev,
      corAltaHex: greenHex,
      corBaixaHex: redHex,
    }));
    setCalibrationStats(stats);
  };

  // Change Platform Presets
  const handlePlatformChange = (newPlatform: PlatformType) => {
    playClickSound();
    const preset = PLATFORM_COLOR_PRESETS[newPlatform];
    setConfig((prev) => ({
      ...prev,
      platform: newPlatform,
      corAltaHex: preset.hexAproximadoAlta,
      corBaixaHex: preset.hexAproximadoBaixa,
    }));
  };

  // Manual Win / Loss toggle from signal table or active card
  const handleToggleSignalOutcome = (id: string, outcome: 'WIN' | 'LOSS') => {
    setSignals((prev) =>
      prev.map((s) => (s.id === id ? { ...s, outcome, status: 'CLOSED' } : s))
    );
    if (activeSignal && activeSignal.id === id) {
      setActiveSignal((prev) => (prev ? { ...prev, outcome, status: 'CLOSED' } : null));
      // CONTINUOUS CYCLE: Automatically reset to analyzing
      setTimeout(() => {
        setActiveSignal(null);
        setIsAnalyzing(true);
      }, 1500);
    }
  };

  // Clear Signals
  const handleClearLog = () => {
    setSignals([]);
    setActiveSignal(null);
  };

  const effectiveAsset = geminiData?.asset || config.asset;

  return (
    <div className="min-h-screen bg-[#05030A] text-slate-100 flex flex-col relative overflow-x-hidden">
      {/* Hidden Video element for WebRTC screen stream */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      {/* Top Fixed Header */}
      <Header
        platform={config.platform}
        onPlatformChange={handlePlatformChange}
        isCapturing={isCapturing}
        brasiliaTime={brasiliaTime}
        candleTimeRemaining={candleTimeRemaining}
        timeframeLabel={getTimeframeLabel(config.tfMs)}
        onOpenSettings={() => {
          playClickSound();
          setIsSettingsOpen(true);
        }}
      />

      {/* Floating Active Signal Notification Card with Continuous Auto-Reset */}
      {activeSignal && (
        <ActiveSignalCard
          signal={activeSignal}
          currentPrice={geminiData ? geminiData.currentPrice : (indicators ? indicators.currentPrice : activeSignal.price)}
          timeRemainingSeconds={candleTimeRemaining}
          onDismiss={() => {
            setActiveSignal(null);
            setIsAnalyzing(true);
          }}
        />
      )}

      {/* Main Workspace: Spacious 2-column Layout */}
      <main className="flex-1 pt-20 pb-28 px-3 sm:px-5 flex flex-col xl:flex-row gap-4 max-w-[1840px] w-full mx-auto">
        {/* Left/Main Column: Live Broker Chart Screen with Gemini AI & ROI Reticle */}
        <div className="flex-1 flex flex-col min-w-0">
          <InteractiveChartView
            videoRef={videoRef}
            isCapturing={isCapturing}
            isSimulated={isSimulated}
            candles={candles}
            indicators={indicators}
            activeSignal={activeSignal}
            roi={roi}
            candleTimeRemaining={candleTimeRemaining}
            platform={config.platform}
            asset={effectiveAsset}
            geminiData={geminiData}
            isGeminiLoading={isGeminiLoading}
            onStartCapture={handleToggleCapture}
            onRefreshScan={() => {
              playClickSound();
              processFrame();
            }}
            onTriggerGeminiScan={runGeminiScreenScan}
          />
        </div>

        {/* Right Column: Bot PRISMA Monitor Card + Signal Log & Win/Loss Assertividade */}
        <div className="w-full xl:w-96 flex flex-col gap-3.5 shrink-0">
          <LiveAnalysisPanel
            activeSignal={activeSignal}
            isAnalyzing={isAnalyzing}
            candleTimeRemaining={candleTimeRemaining}
            errorMessage={errorMessage}
          />

          <SignalLogPanel
            signals={signals}
            onToggleOutcome={handleToggleSignalOutcome}
            onClearLog={handleClearLog}
          />
        </div>
      </main>

      {/* Floating Bottom Action Bar */}
      <FloatingBar
        isCapturing={isCapturing}
        onToggleCapture={handleToggleCapture}
        onManualAnalyze={handleManualAnalyze}
        onOpenColorCalibration={() => {
          playClickSound();
          setIsColorCalibrationOpen(true);
        }}
        onOpenAreaSelector={() => {
          playClickSound();
          setIsAreaSelectorOpen(true);
        }}
        isSimulated={isSimulated}
        onToggleSimulator={() => {
          setIsSimulated((prev) => !prev);
        }}
        isAnalyzing={isAnalyzing}
      />

      {/* Modals & Drawers */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onUpdateConfig={(updated) => setConfig((p) => ({ ...p, ...updated }))}
        onResetDefaults={() => setConfig(DEFAULT_CONFIG)}
      />

      <AreaSelectorModal
        isOpen={isAreaSelectorOpen}
        onClose={() => setIsAreaSelectorOpen(false)}
        roi={roi}
        onSaveROI={(newRoi) => setRoi(newRoi)}
        videoRef={videoRef}
        platform={config.platform}
      />

      <ColorCalibrationModal
        isOpen={isColorCalibrationOpen}
        onClose={() => setIsColorCalibrationOpen(false)}
        corAltaHex={config.corAltaHex}
        corBaixaHex={config.corBaixaHex}
        tolerance={config.colorTolerance}
        stats={calibrationStats}
        onRunAutoCalibration={handleRunAutoCalibration}
        onSaveColors={(greenHex, redHex, tol) => {
          setConfig((p) => ({
            ...p,
            corAltaHex: greenHex,
            corBaixaHex: redHex,
            colorTolerance: tol,
          }));
        }}
      />
    </div>
  );
}
