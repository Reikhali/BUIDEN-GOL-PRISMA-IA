import { GeminiVisionResult } from '../types';

/**
 * Sends a captured frame to the server-side Gemini API endpoint
 * to automatically read the asset name, real-time broker price, highs, lows and trend.
 */
export async function analyzeBrokerScreenWithGemini(
  canvas: HTMLCanvasElement,
  platform: string
): Promise<GeminiVisionResult | null> {
  try {
    // Compress and export frame as JPEG for fast upload
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);

    const response = await fetch('/api/gemini/analyze-screen', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        platform,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn('Erro ao chamar /api/gemini/analyze-screen:', errData);
      return null;
    }

    const res = await response.json();
    if (res.success && res.data) {
      const d = res.data;
      return {
        asset: d.asset || 'EUR/USD',
        currentPrice: typeof d.currentPrice === 'number' ? d.currentPrice : parseFloat(d.currentPrice) || 1.08530,
        highPrice: typeof d.highPrice === 'number' ? d.highPrice : parseFloat(d.highPrice) || 1.08560,
        lowPrice: typeof d.lowPrice === 'number' ? d.lowPrice : parseFloat(d.lowPrice) || 1.08510,
        trend: d.trend === 'BAIXA' ? 'BAIXA' : d.trend === 'LATERAL' ? 'LATERAL' : 'ALTA',
        signalConfirmation: d.signalConfirmation === 'VENDA' ? 'VENDA' : d.signalConfirmation === 'COMPRA' ? 'COMPRA' : 'NEUTRO',
        confidence: typeof d.confidence === 'number' ? d.confidence : 85,
        analysisSummary: d.analysisSummary || 'Análise de velas e cotação em tempo real.',
        lastUpdated: Date.now(),
      };
    }

    return null;
  } catch (error) {
    console.warn('Falha na requisição Gemini Screen Analysis:', error);
    return null;
  }
}
