import { useState, useEffect } from 'react';
import Dropzone from '../shared/Dropzone';
import Button from '../shared/Button';
import { cnnApi, type CNNPrediction, type CNNModelStatus } from '../../utils/cnnApi';
import { useAuthStore } from '../../store/useAuthStore';

type TrainingState = 'idle' | 'training' | 'done' | 'error';

const LABEL_STYLE = {
  CLEAN:      'border-stgSuccess bg-stgSuccess/10 text-stgSuccess',
  SUSPICIOUS: 'border-stgWarning bg-stgWarning/10 text-stgWarning',
  STEGO:      'border-stgDanger  bg-stgDanger/10  text-stgDanger',
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export default function CNNAnalysisPanel() {
  const { token } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [fileB64, setFileB64] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<CNNPrediction | null>(null);
  const [modelStatus, setModelStatus] = useState<CNNModelStatus | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [trainingState, setTrainingState] = useState<TrainingState>('idle');
  const [trainResult, setTrainResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    cnnApi.getStatus(token).then(setModelStatus).catch(() => {});
  }, [token]);

  const handleFile = async (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['png', 'jpg', 'jpeg', 'bmp'].includes(ext)) {
      setError('CNN analysis supports PNG, JPG, and BMP images only.');
      return;
    }
    setError(null);
    setPrediction(null);
    setFile(f);
    const b64 = await fileToBase64(f);
    setFileB64(b64);
  };

  const analyse = async () => {
    if (!fileB64 || !token) return;
    setIsAnalysing(true);
    setError(null);
    try {
      const result = await cnnApi.predict(token, fileB64);
      setPrediction(result);
      setModelStatus(result.modelStatus as CNNModelStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.');
    } finally {
      setIsAnalysing(false);
    }
  };

  const autoTrain = async () => {
    if (!fileB64 || !token) return;
    setTrainingState('training');
    setTrainResult(null);
    try {
      const result = await cnnApi.autoTrain(token, fileB64, 4, 2);
      setModelStatus(result.modelStatus);
      setTrainResult(
        `Training complete — ${result.samplesUsed} samples, ` +
        `loss: ${result.finalLoss?.toFixed(4)}, ` +
        `accuracy: ${((result.finalAccuracy ?? 0) * 100).toFixed(1)}%`
      );
      setTrainingState('done');
    } catch (e) {
      setTrainResult(e instanceof Error ? e.message : 'Training failed.');
      setTrainingState('error');
    }
  };

  return (
    <div className="space-y-5">

      {/* Model status card */}
      {modelStatus && (
        <div className="bg-white border border-stgBorder rounded px-4 py-3 flex flex-wrap gap-4 text-xs">
          <div>
            <p className="text-stgTextMuted">Model status</p>
            <p className="font-semibold text-black">{modelStatus.loaded ? 'Loaded' : 'Not loaded'}</p>
          </div>
          <div>
            <p className="text-stgTextMuted">Trained on</p>
            <p className="font-semibold text-black">{modelStatus.trainedSamples.toLocaleString()} samples</p>
          </div>
          <div>
            <p className="text-stgTextMuted">Parameters</p>
            <p className="mono font-semibold text-black">{modelStatus.paramCount?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-stgTextMuted">Architecture</p>
            <p className="font-semibold text-black">SRM + CNN ({modelStatus.layerCount} layers)</p>
          </div>
        </div>
      )}

      <div className="bg-stgOrangeSoft/40 border border-stgOrange/30 rounded px-4 py-3 text-xs text-stgTextSecondary leading-relaxed">
        <strong className="text-black">How this works:</strong> The server runs a Spatial Rich Model
        (SRM) preprocessing layer that extracts noise residuals, followed by a 3-block CNN classifier.
        The model starts with hand-designed SRM filter weights and improves with each training session.
        More training samples = higher accuracy on adaptive embedding techniques that fool classical detectors.
      </div>

      <Dropzone onFileSelected={handleFile} acceptedLabel="PNG, JPG, BMP" />

      {error && <p className="text-xs text-stgDanger">{error}</p>}

      {file && (
        <div className="flex flex-wrap gap-3">
          <Button onClick={analyse} disabled={isAnalysing || !fileB64}>
            {isAnalysing ? 'Running CNN…' : 'Run AI analysis'}
          </Button>
          <Button
            variant="secondary"
            onClick={autoTrain}
            disabled={trainingState === 'training' || !fileB64}
          >
            {trainingState === 'training' ? 'Training…' : 'Contribute to training'}
          </Button>
        </div>
      )}

      {/* Training feedback */}
      {trainResult && (
        <div className={`border rounded px-4 py-3 text-xs ${
          trainingState === 'done'
            ? 'border-stgSuccess bg-stgSuccess/10 text-stgSuccess'
            : 'border-stgDanger bg-stgDanger/10 text-stgDanger'
        }`}>
          {trainResult}
          {trainingState === 'done' && (
            <p className="mt-1 text-stgTextMuted">
              The model has been fine-tuned on synthetic stego variants of your image.
              Re-analyse the same file to see if the score changes.
            </p>
          )}
        </div>
      )}

      {/* Prediction result */}
      {prediction && (
        <div className="space-y-4">
          <div className={`border rounded px-4 py-4 ${LABEL_STYLE[prediction.label]}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg tracking-wide">{prediction.label}</span>
              <span className="mono text-2xl font-bold">{prediction.score}%</span>
            </div>

            {/* Confidence bar */}
            <div className="h-2 rounded-full bg-black/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${prediction.score}%`,
                  background: prediction.label === 'STEGO' ? '#c4544a' :
                              prediction.label === 'SUSPICIOUS' ? '#c9a15c' : '#4a7d5e',
                }}
              />
            </div>

            <div className="mt-3 text-xs opacity-80">
              <p>CNN confidence: {(prediction.confidence * 100).toFixed(2)}%</p>
              <p className="mt-0.5">
                {prediction.label === 'CLEAN'
                  ? 'The SRM residual patterns are consistent with natural, unmodified image content.'
                  : prediction.label === 'SUSPICIOUS'
                  ? 'Moderate residual anomalies detected. Consider running the classical detector suite for corroboration.'
                  : 'Strong residual anomalies detected across multiple SRM filter responses. High probability of embedded payload.'}
              </p>
            </div>
          </div>

          {/* Comparison with classical suite note */}
          <div className="bg-white border border-stgBorder rounded px-4 py-3 text-xs text-stgTextSecondary">
            <p className="font-medium text-black mb-1">Interpreting CNN results</p>
            <p className="leading-relaxed">
              The CNN detector is complementary to the classical 12-detector suite in the Detect tab —
              it is specifically better against <strong>adaptive embedding techniques</strong> (PVD, F5-style)
              that evade chi-square and RS analysis, but may have higher false-positive rates on heavily
              compressed or high-noise natural images until trained on more samples.
              Run both for the most reliable verdict.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}