import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, Activity, CheckCircle2, TrendingDown, ArrowRight, Zap } from 'lucide-react';
import { TrainingEpochData } from '../types';

export const TrainingSimulator: React.FC = () => {
  const [currentEpoch, setCurrentEpoch] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1); // 1x, 2x, 4x
  const [activeStep, setActiveStep] = useState<'D_step' | 'G_step' | 'idle'>('idle');
  const [history, setHistory] = useState<TrainingEpochData[]>([]);

  const maxEpochs = 200;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate initial simulated training history
  useEffect(() => {
    resetTraining();
  }, []);

  const calculateEpochData = (ep: number): TrainingEpochData => {
    // Realistic GAN loss curve progression
    const progress = ep / maxEpochs;
    const decay = Math.exp(-progress * 3.5);
    const noise = (Math.sin(ep * 0.4) * 0.05) + ((Math.random() - 0.5) * 0.03);

    const dLoss = Math.max(0.15, 0.69 + decay * 0.4 + noise);
    const gGanLoss = Math.max(0.7, 1.8 - decay * 0.8 + noise * 1.5);
    const gL1Loss = Math.max(0.04, 0.45 * Math.exp(-progress * 2.8) + Math.abs(noise) * 0.2);
    const gTotalLoss = gGanLoss + 100 * gL1Loss;
    const dRealAccuracy = Math.min(99, Math.round(55 + progress * 35 + noise * 20));
    const dFakeAccuracy = Math.min(99, Math.round(52 + progress * 38 + noise * 15));

    return {
      epoch: ep,
      dLoss: parseFloat(dLoss.toFixed(3)),
      gGanLoss: parseFloat(gGanLoss.toFixed(3)),
      gL1Loss: parseFloat(gL1Loss.toFixed(4)),
      gTotalLoss: parseFloat(gTotalLoss.toFixed(2)),
      dRealAccuracy,
      dFakeAccuracy,
    };
  };

  const resetTraining = () => {
    setIsPlaying(false);
    setCurrentEpoch(1);
    const initial: TrainingEpochData[] = [];
    for (let i = 1; i <= 10; i++) {
      initial.push(calculateEpochData(i));
    }
    setHistory(initial);
    setCurrentEpoch(10);
  };

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      const interval = 1000 / (speed * 4);
      timerRef.current = setInterval(() => {
        setCurrentEpoch((prev) => {
          if (prev >= maxEpochs) {
            setIsPlaying(false);
            return maxEpochs;
          }
          const next = prev + 1;
          const nextData = calculateEpochData(next);
          setHistory((h) => [...h, nextData]);
          // Toggle active step
          setActiveStep(next % 2 === 0 ? 'D_step' : 'G_step');
          return next;
        });
      }, interval);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed]);

  const currentData = history[history.length - 1] || calculateEpochData(currentEpoch);

  // SVG Loss Chart Points
  const chartWidth = 500;
  const chartHeight = 160;
  const maxLoss = 15;

  const dLossPoints = history.map((d, i) => {
    const x = (i / Math.max(1, history.length - 1)) * chartWidth;
    const y = chartHeight - (Math.min(maxLoss, d.dLoss * 4) / maxLoss) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const gGanLossPoints = history.map((d, i) => {
    const x = (i / Math.max(1, history.length - 1)) * chartWidth;
    const y = chartHeight - (Math.min(maxLoss, d.gGanLoss * 4) / maxLoss) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const gL1LossPoints = history.map((d, i) => {
    const x = (i / Math.max(1, history.length - 1)) * chartWidth;
    const y = chartHeight - (Math.min(maxLoss, d.gL1Loss * 25) / maxLoss) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  // Get visual sample for current epoch progress
  const getCheckpointVisual = () => {
    if (currentEpoch < 20) {
      return {
        stage: 'Epoch 1 - 20 (Early Initialization)',
        desc: 'Random Gaussian noise, discriminator easily overpowers generator, high L1 error.',
        bgColor: '#1E1B4B',
        blur: 'blur-md',
        opacity: 'opacity-40',
      };
    } else if (currentEpoch < 80) {
      return {
        stage: 'Epoch 20 - 80 (Geometric Layout Learning)',
        desc: 'U-Net skip connections establish spatial alignment; window frames & wall positions form.',
        bgColor: '#312E81',
        blur: 'blur-sm',
        opacity: 'opacity-70',
      };
    } else if (currentEpoch < 150) {
      return {
        stage: 'Epoch 80 - 150 (Texture Refinement)',
        desc: 'PatchGAN discriminates fine local patches, forcing sharp mortar lines and glass sheen.',
        bgColor: '#4338CA',
        blur: 'blur-none',
        opacity: 'opacity-90',
      };
    } else {
      return {
        stage: 'Epoch 150 - 200 (Converged Min-Max Equilibrium)',
        desc: 'Balanced Nash equilibrium: Generator produces crisp photorealistic architectural facades.',
        bgColor: '#4F46E5',
        blur: 'blur-none',
        opacity: 'opacity-100',
      };
    }
  };

  const checkpoint = getCheckpointVisual();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                Min-Max GAN Optimization
              </span>
              <h2 className="text-xl font-bold text-white">Pix2Pix Training Dynamics Simulator</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Simulate the 2-step alternating backpropagation loop between Generator G and PatchGAN Discriminator D
            </p>
          </div>

          {/* Player Controls */}
          <div className="flex items-center gap-2">
            <button
              id="btn-play-pause-training"
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause Training' : 'Run Training'}</span>
            </button>

            <button
              id="btn-reset-training"
              onClick={resetTraining}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Reset training simulation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Speed Selector */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              {[1, 2, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 rounded font-mono font-semibold transition ${
                    speed === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Epoch Progress Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>Epoch: <strong className="text-white">{currentEpoch}</strong> / {maxEpochs}</span>
            <span>Progress: {((currentEpoch / maxEpochs) * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-150"
              style={{ width: `${(currentEpoch / maxEpochs) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: 2-Step Backprop Flow & Live Loss Curves */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: 2-Step Training Loop Flow Diagram (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>Alternating Min-Max Optimization Loop</span>
            </h3>

            {/* Step 1: Discriminator D Update */}
            <div
              className={`p-4 rounded-xl border transition-all duration-200 ${
                activeStep === 'D_step'
                  ? 'bg-emerald-950/50 border-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Step 1: Train Discriminator D
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  D_loss: {currentData.dLoss}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-2">
                1. Feed Real Pair <span className="font-mono text-emerald-300">[x, y]</span> → Train D to output 1.0.
                <br />
                2. Feed Fake Pair <span className="font-mono text-pink-300">[x, G(x)]</span> → Train D to output 0.0.
                <br />
                3. Backpropagate gradients & update D weights with Adam (lr=0.0002).
              </p>
            </div>

            {/* Step 2: Generator G Update */}
            <div
              className={`p-4 rounded-xl border transition-all duration-200 ${
                activeStep === 'G_step'
                  ? 'bg-purple-950/50 border-purple-400 shadow-lg shadow-purple-500/20'
                  : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  Step 2: Train Generator G
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                  G_loss: {currentData.gTotalLoss}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-2">
                1. Pass condition x through U-Net → synthesize <span className="font-mono text-pink-300">G(x)</span>.
                <br />
                2. Evaluate PatchGAN score <span className="font-mono text-emerald-300">D(x, G(x))</span> (Adversarial Loss).
                <br />
                3. Compute pixel discrepancy <span className="font-mono text-purple-300">λ · ||y - G(x)||_1</span>.
                <br />
                4. Backpropagate total loss to update U-Net generator weights.
              </p>
            </div>

            {/* Checkpoint Preview Box */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Generator Synthesis Evolution</span>
                <span className="text-[10px] text-indigo-400 font-mono">Epoch {currentEpoch}</span>
              </div>
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-800">
                <div className={`w-full h-full p-3 flex flex-col justify-center items-center text-center transition-all duration-300 ${checkpoint.blur}`}>
                  <div className="w-24 h-24 rounded bg-gradient-to-br from-indigo-500 via-amber-600 to-cyan-500 flex items-center justify-center text-white font-mono text-xs font-bold shadow-inner">
                    Facade G(x)
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                <strong className="text-slate-200">{checkpoint.stage}:</strong> {checkpoint.desc}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Live Real-Time Loss Curves (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-purple-400" />
                  <span>Real-Time Loss Convergence Curves</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualizing Discriminator Loss, Adversarial Loss, and L1 Pixel Error across epochs
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-0.5 bg-emerald-400" /> D_loss
                </span>
                <span className="flex items-center gap-1 text-pink-400">
                  <span className="w-2 h-0.5 bg-pink-400" /> G_GAN
                </span>
                <span className="flex items-center gap-1 text-purple-400">
                  <span className="w-2 h-0.5 bg-purple-400" /> G_L1
                </span>
              </div>
            </div>

            {/* SVG Loss Curve Canvas */}
            <div className="relative aspect-[16/8] w-full bg-slate-950 rounded-xl p-3 border border-slate-800 shadow-inner">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                {/* Horizontal Grid lines */}
                <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="0" y1="40" x2={chartWidth} y2="40" stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="0" y1="80" x2={chartWidth} y2="80" stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="0" y1="120" x2={chartWidth} y2="120" stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#475569" strokeWidth="1" />

                {/* Polyline Curves */}
                {history.length > 1 && (
                  <>
                    {/* D_loss (Emerald) */}
                    <polyline fill="none" stroke="#10B981" strokeWidth="2" points={dLossPoints} />
                    {/* G_GAN (Pink) */}
                    <polyline fill="none" stroke="#F43F5E" strokeWidth="2" points={gGanLossPoints} />
                    {/* G_L1 (Purple) */}
                    <polyline fill="none" stroke="#A855F7" strokeWidth="2" points={gL1LossPoints} />
                  </>
                )}
              </svg>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold">Discriminator Loss</span>
                <p className="text-lg font-bold text-white font-mono mt-0.5">{currentData.dLoss}</p>
                <span className="text-[10px] text-slate-500">Real Acc: {currentData.dRealAccuracy}%</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-pink-400 font-bold">G Adversarial Loss</span>
                <p className="text-lg font-bold text-white font-mono mt-0.5">{currentData.gGanLoss}</p>
                <span className="text-[10px] text-slate-500">log(1 - D(x, G(x)))</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-purple-400 font-bold">L1 Pixel Distance</span>
                <p className="text-lg font-bold text-white font-mono mt-0.5">{currentData.gL1Loss}</p>
                <span className="text-[10px] text-slate-500">Mean L1 norm</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-indigo-400 font-bold">Total Generator Loss</span>
                <p className="text-lg font-bold text-white font-mono mt-0.5">{currentData.gTotalLoss}</p>
                <span className="text-[10px] text-slate-500">L_GAN + 100·L_L1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
