const API_BASE = import.meta.env.VITE_API_URL ?? 'https://steganaliz-api.onrender.com';

async function apiFetch(path: string, options: RequestInit = {}, token: string) {
  const res  = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

export interface CNNPrediction {
  score: number;
  label: 'CLEAN' | 'SUSPICIOUS' | 'STEGO';
  confidence: number;
  modelStatus: { trainedSamples: number; loaded: boolean };
}

export interface CNNModelStatus {
  loaded: boolean;
  trainedSamples: number;
  layerCount: number;
  paramCount: number;
}

export interface CNNTrainResult {
  message: string;
  samplesUsed: number;
  finalLoss: number;
  finalAccuracy: number;
  modelStatus: CNNModelStatus;
}

export const cnnApi = {
  getStatus: (token: string): Promise<CNNModelStatus> =>
    apiFetch('/api/cnn/status', {}, token),

  predict: (token: string, imageB64: string): Promise<CNNPrediction> =>
    apiFetch('/api/cnn/predict', {
      method: 'POST',
      body: JSON.stringify({ imageB64 }),
    }, token),

  autoTrain: (
    token: string,
    cleanImageB64: string,
    variants = 4,
    epochs = 2
  ): Promise<CNNTrainResult> =>
    apiFetch('/api/cnn/train/auto', {
      method: 'POST',
      body: JSON.stringify({ cleanImageB64, variants, epochs }),
    }, token),
};