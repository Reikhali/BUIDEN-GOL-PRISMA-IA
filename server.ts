import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable JSON parser with large limit for image frames (base64)
app.use(express.json({ limit: '20mb' }));

// Initialize GoogleGenAI SDK on server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API Route: Real-Time Screen Vision Analysis with Gemini
app.post('/api/gemini/analyze-screen', async (req, res) => {
  try {
    const { imageBase64, platform } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada para análise.' });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const promptText = `
Você é o motor de inteligência artificial e visão computacional do robô PRISMA IA especializado nas corretoras Pocket Option e Quotex.
Analise a captura de tela do gráfico da corretora e identifique com precisão:

1. asset: O par de moedas ou ativo exato sendo operado no gráfico (ex: "EUR/USD", "EUR/USD (OTC)", "USD/BRL (OTC)", "GBP/USD", "USD/JPY", "BTC/USDT", etc.). Procure no canto superior esquerdo do gráfico, nas abas de ativos ou no seletor de pares.
2. currentPrice: O preço da cotação atual em tempo real mostrado na etiqueta de preço da linha horizontal pontilhada ou no eixo vertical direito (ex: 1.08532). Retorne como número flutuante.
3. highPrice: O preço de máxima da vela atual ou topo imediato (ex: 1.08560).
4. lowPrice: O preço de mínima da vela atual ou fundo imediato (ex: 1.08510).
5. trend: "ALTA", "BAIXA" ou "LATERAL".
6. signalConfirmation: A recomendação de probabilidade baseada na estrutura do candle atual e tendências: "COMPRA", "VENDA" ou "NEUTRO".
7. confidence: Um número inteiro entre 60 e 98 representando o nível de certeza da leitura visual.
8. analysisSummary: Uma explicação técnica curta e profissional em português para o trader (máximo 15 palavras).
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        systemInstruction:
          'Você é o analista sênior do robô PRISMA IA. Seja extremamente preciso ao ler o nome do ativo e os números de cotação na tela da corretora.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            asset: {
              type: Type.STRING,
              description: 'Nome exato do ativo detectado na tela (ex: EUR/USD OTC)',
            },
            currentPrice: {
              type: Type.NUMBER,
              description: 'Preço da cotação atual em tempo real',
            },
            highPrice: {
              type: Type.NUMBER,
              description: 'Preço da máxima',
            },
            lowPrice: {
              type: Type.NUMBER,
              description: 'Preço da mínima',
            },
            trend: {
              type: Type.STRING,
              description: 'ALTA, BAIXA ou LATERAL',
            },
            signalConfirmation: {
              type: Type.STRING,
              description: 'COMPRA, VENDA ou NEUTRO',
            },
            confidence: {
              type: Type.INTEGER,
              description: 'Nível de confiança de 0 a 100',
            },
            analysisSummary: {
              type: Type.STRING,
              description: 'Resumo em português',
            },
          },
          required: [
            'asset',
            'currentPrice',
            'highPrice',
            'lowPrice',
            'trend',
            'signalConfirmation',
            'confidence',
            'analysisSummary',
          ],
        },
      },
    });

    const outputText = response.text?.trim() || '{}';
    const parsedData = JSON.parse(outputText);

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Erro na análise Gemini:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erro ao processar imagem com Gemini IA',
    });
  }
});

// Vite Middleware for Full-stack Dev and SPA static serving in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PRISMA IA] Servidor full-stack rodando na porta ${PORT}`);
  });
}

startServer();
