export type DatasetDomain =
  | 'facades'
  | 'edges2shoes'
  | 'edges2handbags'
  | 'maps2aerial'
  | 'night2day'
  | 'sketch2cat';

export interface DatasetInfo {
  id: DatasetDomain;
  name: string;
  category: string;
  description: string;
  sourceDesc: string;
  targetDesc: string;
  badge: string;
  canvasType: 'semantic' | 'sketch' | 'photo';
  semanticClasses?: { name: string; color: string; hex: string; desc: string }[];
}

export interface PresetSample {
  id: string;
  domain: DatasetDomain;
  title: string;
  inputDataUrl: string;
  groundTruthDataUrl: string;
  description: string;
  complexity: 'Low' | 'Medium' | 'High';
}

export interface PatchEvaluation {
  patchX: number;
  patchY: number;
  size: number;
  realScore: number; // 0.0 to 1.0 (PatchGAN output)
  l1Loss: number;
  status: 'real' | 'fake' | 'uncertain';
}

export interface TranslationResult {
  generatedDataUrl: string;
  patchMatrix: PatchEvaluation[][];
  avgRealScore: number;
  avgL1Loss: number;
  adversarialLoss: number;
  totalLoss: number;
  latencyMs: number;
  method: 'neural_pix2pix' | 'gemini_enhanced' | 'unet_simulation';
  details?: {
    skipConnectionsImpact: string;
    patchGanObservation: string;
    l1WeightUsed: number;
  };
}

export interface TrainingEpochData {
  epoch: number;
  dLoss: number;
  gGanLoss: number;
  gL1Loss: number;
  gTotalLoss: number;
  dRealAccuracy: number;
  dFakeAccuracy: number;
}

export interface LayerSpec {
  name: string;
  type: 'encoder' | 'bottleneck' | 'decoder' | 'skip';
  inChannels: number;
  outChannels: number;
  filterSize: string;
  resolution: string;
  activation: string;
  norm: string;
  connectedTo?: string;
}
