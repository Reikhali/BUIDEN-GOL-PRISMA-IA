import { Candle, PlatformType, ROI, ColorPreset, CalibrationStats } from '../types';

export const PLATFORM_COLOR_PRESETS: Record<PlatformType, ColorPreset> = {
  POCKET_OPTION: {
    faixaMatizAlta: '90°–170°',
    faixaMatizBaixa: '340°–360° e 0°–15°',
    hexAproximadoAlta: '#00B373',
    hexAproximadoBaixa: '#FF3B3B',
    tolerance: 30,
  },
  QUOTEX: {
    faixaMatizAlta: '90°–170°',
    faixaMatizBaixa: '340°–360° e 0°–15°',
    hexAproximadoAlta: '#0EBF6A',
    hexAproximadoBaixa: '#FF4D4D',
    tolerance: 30,
  },
  GENERICA: {
    faixaMatizAlta: '80°–175°',
    faixaMatizBaixa: '335°–360° e 0°–20°',
    hexAproximadoAlta: '#26A69A',
    hexAproximadoBaixa: '#EF5350',
    tolerance: 30,
  },
};

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  h: number; // 0 - 360
  s: number; // 0 - 100
  v: number; // 0 - 100
}

export function hexToRgb(hex: string): RGB {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  let h = 0;
  const s = max === 0 ? 0 : (diff / max) * 100;
  const v = max * 100;

  if (diff === 0) {
    h = 0;
  } else if (max === r) {
    h = ((g - b) / diff) % 6;
  } else if (max === g) {
    h = (b - r) / diff + 2;
  } else {
    h = (r - g) / diff + 4;
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  return { h, s, v };
}

/**
 * Checks if a pixel matches green or red candlestick color
 */
export function isPixelGreen(
  hsv: HSV,
  rgb: RGB,
  targetHex: string,
  tolerance: number = 30
): boolean {
  // Reject dark backgrounds, washed out whites/grays
  if (hsv.v < 20 || hsv.s < 25) return false;

  // Green Hue band: approx 85° to 175°
  if (hsv.h >= 85 && hsv.h <= 175) {
    return true;
  }

  // Fallback to RGB distance if target color provided
  const targetRgb = hexToRgb(targetHex);
  const dist = Math.sqrt(
    Math.pow(rgb.r - targetRgb.r, 2) +
    Math.pow(rgb.g - targetRgb.g, 2) +
    Math.pow(rgb.b - targetRgb.b, 2)
  );
  return dist <= tolerance * 2.5 && rgb.g > rgb.r + 15 && rgb.g > rgb.b;
}

export function isPixelRed(
  hsv: HSV,
  rgb: RGB,
  targetHex: string,
  tolerance: number = 30
): boolean {
  // Reject dark backgrounds, washed out whites/grays
  if (hsv.v < 20 || hsv.s < 25) return false;

  // Red Hue band: 335° to 360° OR 0° to 20°
  if (hsv.h >= 335 || hsv.h <= 20) {
    return true;
  }

  // Fallback to RGB distance
  const targetRgb = hexToRgb(targetHex);
  const dist = Math.sqrt(
    Math.pow(rgb.r - targetRgb.r, 2) +
    Math.pow(rgb.g - targetRgb.g, 2) +
    Math.pow(rgb.b - targetRgb.b, 2)
  );
  return dist <= tolerance * 2.5 && rgb.r > rgb.g + 15 && rgb.r > rgb.b;
}

/**
 * Calibrates the green and red candlestick colors by scanning the active chart area
 */
export function calibrateColorsFromImage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  roi: ROI
): { greenHex: string; redHex: string; stats: CalibrationStats } {
  const rx = Math.floor(roi.x * width);
  const ry = Math.floor(roi.y * height);
  const rw = Math.floor(roi.width * width);
  const rh = Math.floor(roi.height * height);

  // Exclude rightmost 70px (price scale axis)
  const effectiveWidth = Math.max(50, rw - 70);

  const imgData = ctx.getImageData(rx, ry, effectiveWidth, rh);
  const data = imgData.data;

  const greenClusters: { r: number; g: number; b: number; count: number }[] = [];
  const redClusters: { r: number; g: number; b: number; count: number }[] = [];

  let greenCount = 0;
  let redCount = 0;
  let noiseCount = 0;

  let sumGr = 0, sumGg = 0, sumGb = 0;
  let sumRr = 0, sumRg = 0, sumRb = 0;

  // Step 2-4 pixels for performance and anti-aliasing
  for (let y = 5; y < rh - 5; y += 2) {
    for (let x = 5; x < effectiveWidth - 5; x += 2) {
      const idx = (y * effectiveWidth + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const hsv = rgbToHsv(r, g, b);

      // Filter out background, axis lines, and dark grids
      if (hsv.v < 25 || hsv.s < 30) {
        noiseCount++;
        continue;
      }

      // Green candidate
      if (hsv.h >= 80 && hsv.h <= 175 && g > r && g > b) {
        sumGr += r;
        sumGg += g;
        sumGb += b;
        greenCount++;
      }
      // Red candidate
      else if ((hsv.h >= 335 || hsv.h <= 25) && r > g && r > b) {
        sumRr += r;
        sumRg += g;
        sumRb += b;
        redCount++;
      } else {
        noiseCount++;
      }
    }
  }

  const detectedGreenHex =
    greenCount > 30
      ? rgbToHex(Math.round(sumGr / greenCount), Math.round(sumGg / greenCount), Math.round(sumGb / greenCount))
      : '#00B373';

  const detectedRedHex =
    redCount > 30
      ? rgbToHex(Math.round(sumRr / redCount), Math.round(sumRg / redCount), Math.round(sumRb / redCount))
      : '#FF3B3B';

  const contrastRatio = greenCount > 0 && redCount > 0 ? (greenCount + redCount) / Math.max(1, noiseCount) : 1;

  return {
    greenHex: detectedGreenHex,
    redHex: detectedRedHex,
    stats: {
      greenPixelsFound: greenCount,
      redPixelsFound: redCount,
      detectedGreenHex,
      detectedRedHex,
      contrastRatio: parseFloat(contrastRatio.toFixed(2)),
      noiseRejected: noiseCount,
    },
  };
}

/**
 * Extracts candlesticks from the ROI area of the video frame
 */
export function extractCandlesFromFrame(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  roi: ROI,
  corAltaHex: string,
  corBaixaHex: string,
  tolerance: number = 30,
  scaleA: number = -0.001,
  scaleB: number = 1.0850,
  tfMs: number = 60000
): { candles: Candle[]; error?: string } {
  const rx = Math.floor(roi.x * canvasWidth);
  const ry = Math.floor(roi.y * canvasHeight);
  const rw = Math.floor(roi.width * canvasWidth);
  const rh = Math.floor(roi.height * canvasHeight);

  if (rw < 100 || rh < 80) {
    return {
      candles: [],
      error: 'Área selecionada muito pequena. Ajuste a área do gráfico.',
    };
  }

  // Exclude rightmost 70px to avoid reading the price axis labels
  const rightAxisMargin = Math.min(85, Math.floor(rw * 0.12));
  const effectiveWidth = Math.max(60, rw - rightAxisMargin);

  const imgData = ctx.getImageData(rx, ry, effectiveWidth, rh);
  const data = imgData.data;

  // Scan each vertical column across effective width
  interface ColumnScan {
    x: number;
    greenPixels: number[];
    redPixels: number[];
    dominantColor: 'GREEN' | 'RED' | 'EMPTY';
  }

  const columnScans: ColumnScan[] = [];

  for (let x = 0; x < effectiveWidth; x++) {
    const greenYs: number[] = [];
    const redYs: number[] = [];

    for (let y = 2; y < rh - 2; y++) {
      const idx = (y * effectiveWidth + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const hsv = rgbToHsv(r, g, b);

      if (isPixelGreen(hsv, { r, g, b }, corAltaHex, tolerance)) {
        greenYs.push(y);
      } else if (isPixelRed(hsv, { r, g, b }, corBaixaHex, tolerance)) {
        redYs.push(y);
      }
    }

    let dominantColor: 'GREEN' | 'RED' | 'EMPTY' = 'EMPTY';
    if (greenYs.length >= 4 && greenYs.length > redYs.length * 1.5) {
      dominantColor = 'GREEN';
    } else if (redYs.length >= 4 && redYs.length > greenYs.length * 1.5) {
      dominantColor = 'RED';
    }

    columnScans.push({
      x,
      greenPixels: greenYs,
      redPixels: redYs,
      dominantColor,
    });
  }

  // Group contiguous columns of the SAME color to form candles
  // Break group on color change OR empty separator columns
  interface CandleCluster {
    startX: number;
    endX: number;
    color: 'GREEN' | 'RED';
    allYs: number[];
    densestYs: number[];
  }

  const clusters: CandleCluster[] = [];
  let currentCluster: CandleCluster | null = null;
  let emptyCount = 0;

  for (let i = 0; i < columnScans.length; i++) {
    const col = columnScans[i];

    if (col.dominantColor === 'EMPTY') {
      emptyCount++;
      // A gap of 2 or more empty columns definitely ends the current candle
      if (emptyCount >= 2 && currentCluster) {
        if (currentCluster.endX - currentCluster.startX >= 2) {
          clusters.push(currentCluster);
        }
        currentCluster = null;
      }
    } else {
      emptyCount = 0;
      const colYs = col.dominantColor === 'GREEN' ? col.greenPixels : col.redPixels;

      if (!currentCluster) {
        currentCluster = {
          startX: col.x,
          endX: col.x,
          color: col.dominantColor,
          allYs: [...colYs],
          densestYs: [...colYs],
        };
      } else if (currentCluster.color === col.dominantColor) {
        currentCluster.endX = col.x;
        currentCluster.allYs.push(...colYs);
      } else {
        // Color changed! Finish current cluster and start new one
        if (currentCluster.endX - currentCluster.startX >= 2) {
          clusters.push(currentCluster);
        }
        currentCluster = {
          startX: col.x,
          endX: col.x,
          color: col.dominantColor,
          allYs: [...colYs],
          densestYs: [...colYs],
        };
      }
    }
  }

  if (currentCluster && currentCluster.endX - currentCluster.startX >= 2) {
    clusters.push(currentCluster);
  }

  // Reconstruct body, wicks, and open/close prices
  // Reject noise (too thin, or body < 3px)
  const validClusters = clusters.filter((c) => {
    const width = c.endX - c.startX + 1;
    const height = Math.max(...c.allYs) - Math.min(...c.allYs);
    return width >= 2 && height >= 4;
  });

  if (validClusters.length < 10) {
    return {
      candles: [],
      error: '❌ Não identifiquei as velas. Clique em CALIBRAR CORES, confira o tema do gráfico ou dê zoom no gráfico.',
    };
  }

  // Function to convert Y pixel coordinate to estimated price
  // Linear regression: price = a * y + b
  const pixelToPrice = (yRelative: number): number => {
    return scaleA * yRelative + scaleB;
  };

  const now = Date.now();
  const currentCandleOpenTime = Math.floor(now / tfMs) * tfMs;

  const candles: Candle[] = validClusters.map((cluster, idx) => {
    const xCenter = rx + (cluster.startX + cluster.endX) / 2;
    const sortedYs = [...cluster.allYs].sort((a, b) => a - b);

    const yMin = sortedYs[0]; // Highest point on chart (wick top)
    const yMax = sortedYs[sortedYs.length - 1]; // Lowest point on chart (wick bottom)

    // Calculate 20th and 80th percentiles for candle body (to handle wicks accurately)
    const p20Idx = Math.floor(sortedYs.length * 0.2);
    const p80Idx = Math.floor(sortedYs.length * 0.8);
    const yBodyTop = sortedYs[p20Idx];
    const yBodyBottom = sortedYs[p80Idx];

    // High & Low prices
    const high = pixelToPrice(yMin);
    const low = pixelToPrice(yMax);

    let open = 0;
    let close = 0;
    let yOpen = 0;
    let yClose = 0;

    if (cluster.color === 'GREEN') {
      // Green: Open at bottom of body, Close at top of body
      yOpen = yBodyBottom;
      yClose = yBodyTop;
      open = pixelToPrice(yBodyBottom);
      close = pixelToPrice(yBodyTop);
      // Ensure close > open for green
      if (close <= open) {
        close = open + Math.abs(high - low) * 0.4 + 0.0001;
      }
    } else {
      // Red: Open at top of body, Close at bottom of body
      yOpen = yBodyTop;
      yClose = yBodyBottom;
      open = pixelToPrice(yBodyTop);
      close = pixelToPrice(yBodyBottom);
      // Ensure close < open for red
      if (close >= open) {
        close = open - Math.abs(high - low) * 0.4 - 0.0001;
      }
    }

    const isLast = idx === validClusters.length - 1;
    const candleTimestamp = currentCandleOpenTime - (validClusters.length - 1 - idx) * tfMs;

    return {
      index: idx,
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(Math.max(high, open, close).toFixed(5)),
      low: parseFloat(Math.min(low, open, close).toFixed(5)),
      close: parseFloat(close.toFixed(5)),
      color: cluster.color,
      xStart: rx + cluster.startX,
      xEnd: rx + cluster.endX,
      xCenter,
      yOpen: ry + yOpen,
      yClose: ry + yClose,
      yHigh: ry + yMin,
      yLow: ry + yMax,
      timestamp: candleTimestamp,
      isClosed: !isLast,
    };
  });

  return { candles };
}

/**
 * Generates synthetic high-fidelity realistic candlestick history for simulation/preview testing
 */
export function generateSyntheticCandles(
  count: number = 45,
  basePrice: number = 1.08550,
  tfMs: number = 60000
): Candle[] {
  const candles: Candle[] = [];
  const now = Date.now();
  const currentCandleOpenTime = Math.floor(now / tfMs) * tfMs;

  let lastClose = basePrice;
  const startTimestamp = currentCandleOpenTime - (count - 1) * tfMs;

  for (let i = 0; i < count; i++) {
    const timestamp = startTimestamp + i * tfMs;
    const isUp = Math.random() > 0.48;
    const volatility = 0.00025 + Math.random() * 0.00045;

    const open = lastClose;
    let close = isUp ? open + volatility * (0.4 + Math.random() * 0.8) : open - volatility * (0.4 + Math.random() * 0.8);

    close = parseFloat(close.toFixed(5));
    const upperWick = Math.random() * volatility * 0.35;
    const lowerWick = Math.random() * volatility * 0.35;

    const high = parseFloat((Math.max(open, close) + upperWick).toFixed(5));
    const low = parseFloat((Math.min(open, close) - lowerWick).toFixed(5));

    lastClose = close;

    const xCenter = 120 + i * 22;

    candles.push({
      index: i,
      open,
      high,
      low,
      close,
      color: close >= open ? 'GREEN' : 'RED',
      xStart: xCenter - 6,
      xEnd: xCenter + 6,
      xCenter,
      yOpen: 300,
      yClose: close >= open ? 280 : 320,
      yHigh: 260,
      yLow: 340,
      timestamp,
      isClosed: i < count - 1,
    });
  }

  return candles;
}
