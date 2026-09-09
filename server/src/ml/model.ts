import * as tf from '@tensorflow/tfjs-node';
import path from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';  // all static

const MODEL_DIR = path.join(process.cwd(), 'ml_models', 'steg_cnn');
const MODEL_URL = `file://${MODEL_DIR}/model.json`;
const META_PATH = path.join(MODEL_DIR, 'meta.json');

function buildSRMKernels(): tf.Tensor4D {
  const filters = [
    [[-1,  2, -1], [-1,  2, -1], [-1,  2, -1]],
    [[-1, -1, -1], [ 2,  2,  2], [-1, -1, -1]],
    [[ 2, -1, -1], [-1,  2, -1], [-1, -1,  2]],
    [[-1, -1,  2], [-1,  2, -1], [ 2, -1, -1]],
    [[-1, -1, -1], [-1,  8, -1], [-1, -1, -1]],
    [[ 0, -1,  0], [ 0,  2,  0], [ 0, -1,  0]],
    [[ 0,  0,  0], [-1,  2, -1], [ 0,  0,  0]],
    [[ 1,  1,  1], [ 1, -8,  1], [ 1,  1,  1]],
  ];
  const kernelData: number[] = [];
  for (let fy = 0; fy < 3; fy++) {
    for (let fx = 0; fx < 3; fx++) {
      for (let ic = 0; ic < 1; ic++) {
        for (let f = 0; f < filters.length; f++) {
          kernelData.push(filters[f][fy][fx] / 8);
        }
      }
    }
  }
  return tf.tensor4d(kernelData, [3, 3, 1, 8]);
}

export function buildModel(): tf.LayersModel {
  const input = tf.input({ shape: [128, 128, 1] });

  const residual = tf.layers.conv2d({
    filters: 8, kernelSize: 3, padding: 'same',
    useBias: false, activation: 'tanh',
    trainable: false, name: 'srm_fixed',
  }).apply(input) as tf.SymbolicTensor;

  let x: tf.SymbolicTensor = residual;

  x = tf.layers.conv2d({ filters: 32, kernelSize: 3, padding: 'same', activation: 'relu', name: 'conv1' }).apply(x) as tf.SymbolicTensor;
  x = tf.layers.batchNormalization({ name: 'bn1' }).apply(x) as tf.SymbolicTensor;
  x = tf.layers.maxPooling2d({ poolSize: 2, name: 'pool1' }).apply(x) as tf.SymbolicTensor;

  x = tf.layers.conv2d({ filters: 64, kernelSize: 3, padding: 'same', activation: 'relu', name: 'conv2' }).apply(x) as tf.SymbolicTensor;
  x = tf.layers.batchNormalization({ name: 'bn2' }).apply(x) as tf.SymbolicTensor;
  x = tf.layers.maxPooling2d({ poolSize: 2, name: 'pool2' }).apply(x) as tf.SymbolicTensor;

  x = tf.layers.conv2d({ filters: 128, kernelSize: 3, padding: 'same', activation: 'relu', name: 'conv3' }).apply(x) as tf.SymbolicTensor;
  x = tf.layers.batchNormalization({ name: 'bn3' }).apply(x) as tf.SymbolicTensor;
  x = tf.layers.globalAveragePooling2d({ name: 'gap' }).apply(x) as tf.SymbolicTensor;

  x = tf.layers.dense({ units: 128, activation: 'relu', name: 'fc1' }).apply(x) as tf.SymbolicTensor;
  x = tf.layers.dropout({ rate: 0.5, name: 'dropout' }).apply(x) as tf.SymbolicTensor;
  const output = tf.layers.dense({ units: 1, activation: 'sigmoid', name: 'output' }).apply(x) as tf.SymbolicTensor;

  const model = tf.model({ inputs: input, outputs: output, name: 'steg_cnn' });
  model.compile({
    optimizer: tf.train.adam(0.0001),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy'],
  });
  return model;
}

export function setSRMWeights(model: tf.LayersModel): void {
  model.getLayer('srm_fixed').setWeights([buildSRMKernels()]);
}

// ── Metrics helper — handles both 'acc' and 'accuracy' key names ──────────────
// TF.js Node <4.x uses 'acc'; >=4.x uses 'accuracy'. Support both.
export function getMetric(
  history: tf.History,
  key: 'loss' | 'accuracy'
): number | undefined {
  const h = history.history as Record<string, number[]>;
  if (key === 'accuracy') {
    const values = h['accuracy'] ?? h['acc'];
    return values?.at(-1);
  }
  return h['loss']?.at(-1);
}

// ── Singleton model state ─────────────────────────────────────────────────────

let _model: tf.LayersModel | null = null;
let _trainedSamples = 0;

export interface ModelStatus {
  loaded:         boolean;
  trainedSamples: number;
  layerCount:     number;
  paramCount:     number;
}

export async function getModel(): Promise<tf.LayersModel> {
  if (_model) return _model;

  if (existsSync(path.join(MODEL_DIR, 'model.json'))) {
    console.log('Loading saved CNN model…');
    _model = await tf.loadLayersModel(MODEL_URL);
    _model.compile({
      optimizer: tf.train.adam(0.0001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });
    if (existsSync(META_PATH)) {
      const meta = JSON.parse(readFileSync(META_PATH, 'utf-8')) as { trainedSamples?: number };
      _trainedSamples = meta.trainedSamples ?? 0;
    }
  } else {
    console.log('Building fresh CNN model…');
    mkdirSync(MODEL_DIR, { recursive: true });
    _model = buildModel();
    setSRMWeights(_model);
    await saveModel();
  }
  return _model;
}

export async function saveModel(): Promise<void> {
  if (!_model) return;
  mkdirSync(MODEL_DIR, { recursive: true });
  await _model.save(MODEL_URL);
  writeFileSync(META_PATH, JSON.stringify({
    trainedSamples: _trainedSamples,
    savedAt: new Date().toISOString(),
  }));
}

export function incrementTrainedSamples(n: number): void { _trainedSamples += n; }

export function getModelStatus(): ModelStatus {
  if (!_model) return { loaded: false, trainedSamples: 0, layerCount: 0, paramCount: 0 };
  return {
    loaded:         true,
    trainedSamples: _trainedSamples,
    layerCount:     _model.layers.length,
    paramCount:     _model.countParams(),
  };
}