import React, { useState } from 'react';
import { Layers, Zap, Eye, CheckCircle2, ArrowRight, GitFork, ShieldCheck, HelpCircle } from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'unet' | 'patchgan' | 'losses'>('unet');
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null);
  const [highlightSkip, setHighlightSkip] = useState<number | null>(null);

  const unetEncoderLayers = [
    { id: 1, name: 'e1: C64', res: '128x128', channels: 64, kernel: '4x4, s=2', act: 'LeakyReLU(0.2)', norm: 'None' },
    { id: 2, name: 'e2: C128', res: '64x64', channels: 128, kernel: '4x4, s=2', act: 'LeakyReLU(0.2)', norm: 'BatchNorm' },
    { id: 3, name: 'e3: C256', res: '32x32', channels: 256, kernel: '4x4, s=2', act: 'LeakyReLU(0.2)', norm: 'BatchNorm' },
    { id: 4, name: 'e4: C512', res: '16x16', channels: 512, kernel: '4x4, s=2', act: 'LeakyReLU(0.2)', norm: 'BatchNorm' },
    { id: 5, name: 'e5: C512', res: '8x8', channels: 512, kernel: '4x4, s=2', act: 'LeakyReLU(0.2)', norm: 'BatchNorm' },
    { id: 6, name: 'e6: C512', res: '4x4', channels: 512, kernel: '4x4, s=2', act: 'LeakyReLU(0.2)', norm: 'BatchNorm' },
    { id: 7, name: 'e7: C512', res: '2x2', channels: 512, kernel: '4x4, s=2', act: 'LeakyReLU(0.2)', norm: 'BatchNorm' },
    { id: 8, name: 'e8: C512 (Bottleneck)', res: '1x1', channels: 512, kernel: '4x4, s=2', act: 'ReLU', norm: 'None' },
  ];

  const unetDecoderLayers = [
    { id: 8, name: 'd1: CD512', res: '2x2', channels: 1024, kernel: '4x4, s=2', act: 'ReLU + Dropout(0.5)', norm: 'BatchNorm', skipFrom: 7 },
    { id: 7, name: 'd2: CD512', res: '4x4', channels: 1024, kernel: '4x4, s=2', act: 'ReLU + Dropout(0.5)', norm: 'BatchNorm', skipFrom: 6 },
    { id: 6, name: 'd3: CD512', res: '8x8', channels: 1024, kernel: '4x4, s=2', act: 'ReLU + Dropout(0.5)', norm: 'BatchNorm', skipFrom: 5 },
    { id: 5, name: 'd4: C512', res: '16x16', channels: 1024, kernel: '4x4, s=2', act: 'ReLU', norm: 'BatchNorm', skipFrom: 4 },
    { id: 4, name: 'd5: C256', res: '32x32', channels: 512, kernel: '4x4, s=2', act: 'ReLU', norm: 'BatchNorm', skipFrom: 3 },
    { id: 3, name: 'd6: C128', res: '64x64', channels: 256, kernel: '4x4, s=2', act: 'ReLU', norm: 'BatchNorm', skipFrom: 2 },
    { id: 2, name: 'd7: C64', res: '128x128', channels: 128, kernel: '4x4, s=2', act: 'ReLU', norm: 'BatchNorm', skipFrom: 1 },
    { id: 1, name: 'd8: Output Tanh', res: '256x256', channels: 3, kernel: '4x4, s=2', act: 'Tanh', norm: 'None' },
  ];

  const patchGanLayers = [
    { layer: 'Input Pair [x, y]', dim: '256x256x6', rf: '1x1', desc: 'Concatenates condition image x and target y (or G(x)) along channel dimension.' },
    { layer: 'Conv 1 (C64)', dim: '128x128x64', rf: '4x4', desc: 'Kernel 4x4, Stride 2, LeakyReLU(0.2). No normalization on first layer.' },
    { layer: 'Conv 2 (C128)', dim: '64x64x128', rf: '10x10', desc: 'Kernel 4x4, Stride 2, BatchNorm + LeakyReLU(0.2).' },
    { layer: 'Conv 3 (C256)', dim: '32x32x256', rf: '22x22', desc: 'Kernel 4x4, Stride 2, BatchNorm + LeakyReLU(0.2).' },
    { layer: 'Conv 4 (C512)', dim: '31x31x512', rf: '46x46', desc: 'Kernel 4x4, Stride 1, BatchNorm + LeakyReLU(0.2).' },
    { layer: 'Conv 5 (1-channel)', dim: '30x30x1', rf: '70x70', desc: 'Final 1-channel convolution. Each output element evaluates a 70x70 image patch.' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Core cGAN Architecture
              </span>
              <h2 className="text-xl font-bold text-white">U-Net Generator & PatchGAN Discriminator</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Interactive deep-dive into the architectural mechanics of Pix2Pix (Isola et al., 2017)
            </p>
          </div>

          {/* Sub-nav Tabs */}
          <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              id="tab-arch-unet"
              onClick={() => setActiveTab('unet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'unet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              U-Net 256 Generator
            </button>
            <button
              id="tab-arch-patchgan"
              onClick={() => setActiveTab('patchgan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'patchgan' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              70x70 PatchGAN
            </button>
            <button
              id="tab-arch-losses"
              onClick={() => setActiveTab('losses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'losses' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Loss Formulation (L1 + cGAN)
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: U-Net Generator with Interactive Skip Connections */}
      {activeTab === 'unet' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <GitFork className="w-5 h-5 text-indigo-400" />
                  <span>U-Net 256 Architecture with Skip Connections</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hover or click any layer or skip line to trace how spatial features bypass the 1x1 bottleneck
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-indigo-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Encoder (Downsample)
                </span>
                <span className="flex items-center gap-1.5 text-purple-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Decoder (Upsample)
                </span>
                <span className="flex items-center gap-1.5 text-pink-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500" /> Skip Channel Concat
                </span>
              </div>
            </div>

            {/* U-Net Visual Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
              {/* Encoder Side (Left) */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-2">
                  <span>Encoder Layers (Convolution 4x4, Stride 2)</span>
                </div>
                {unetEncoderLayers.map((layer) => {
                  const isHighlighted = highlightSkip === layer.id;
                  return (
                    <div
                      key={layer.id}
                      onMouseEnter={() => setHighlightSkip(layer.id)}
                      onMouseLeave={() => setHighlightSkip(null)}
                      className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                        isHighlighted
                          ? 'bg-indigo-950/80 border-indigo-400 shadow-lg shadow-indigo-500/20'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono">{layer.name}</span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-800">
                          {layer.res}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] text-slate-400 font-mono">
                        <div>Channels: <span className="text-slate-200">{layer.channels}</span></div>
                        <div>Kernel: <span className="text-slate-200">{layer.kernel}</span></div>
                        <div>Act: <span className="text-indigo-300">{layer.act}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Decoder Side (Right) */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 mb-2">
                  <span>Decoder Layers (Transposed Conv 4x4, Stride 2)</span>
                </div>
                {unetDecoderLayers.map((layer) => {
                  const isHighlighted = highlightSkip === layer.skipFrom || highlightSkip === layer.id;
                  return (
                    <div
                      key={layer.name}
                      onMouseEnter={() => setHighlightSkip(layer.skipFrom || layer.id)}
                      onMouseLeave={() => setHighlightSkip(null)}
                      className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                        isHighlighted
                          ? 'bg-purple-950/80 border-purple-400 shadow-lg shadow-purple-500/20'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono">{layer.name}</span>
                        <div className="flex items-center gap-1.5">
                          {layer.skipFrom && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                              Concat e{layer.skipFrom}
                            </span>
                          )}
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-purple-300 border border-slate-800">
                            {layer.res}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] text-slate-400 font-mono">
                        <div>Channels: <span className="text-slate-200">{layer.channels}</span></div>
                        <div>Kernel: <span className="text-slate-200">{layer.kernel}</span></div>
                        <div>Act: <span className="text-purple-300">{layer.act}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanatory Callout: Why Skip Connections Matter */}
            <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-indigo-400" />
                <span>The Core Innovation: Why U-Net over Standard Encoder-Decoder?</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                In image-to-image translation, the input and output share a lot of low-level geometric structure (e.g. edge locations, window coordinates). A standard autoencoder compresses all information through a 1x1 bottleneck, which destroys high-frequency details and leads to blurry results.
                U-Net adds <strong>skip connections</strong> between layer <span className="font-mono text-pink-400">i</span> and layer <span className="font-mono text-pink-400">n - i</span>, directly shuttling fine geometric edges around the bottleneck while allowing the deeper layers to learn high-level semantic styling.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 70x70 PatchGAN Discriminator */}
      {activeTab === 'patchgan' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>70x70 PatchGAN Discriminator Architecture</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                PatchGAN restricts attention to local 70x70 image patches to penalize high-frequency artifacts while reducing parameter count and training time.
              </p>
            </div>

            {/* PatchGAN Layer Breakdown */}
            <div className="space-y-3">
              {patchGanLayers.map((layer, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono">{layer.layer}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{layer.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    <span className="text-[10px] px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      Dim: {layer.dim}
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      Receptive Field: {layer.rf}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Receptive Field Math Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400">1x1 PixelGAN</span>
                <p className="text-xs font-semibold text-slate-200">Pointwise Color Classifier</p>
                <p className="text-[11px] text-slate-400">
                  Evaluates each pixel individually. Good for color distribution but blind to spatial geometry.
                </p>
              </div>

              <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-1">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">70x70 PatchGAN (Optimal)</span>
                <p className="text-xs font-semibold text-emerald-200">Local Texture & Structure</p>
                <p className="text-[11px] text-emerald-300/80">
                  Penalizes structure at local patch scale. Runs convolutionally across image and averages responses.
                </p>
              </div>

              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400">286x286 ImageGAN</span>
                <p className="text-xs font-semibold text-slate-200">Full Image Discriminator</p>
                <p className="text-[11px] text-slate-400">
                  Global classifier. Prone to overfitting, slower training, and does not improve quality over 70x70.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Loss Formulations */}
      {activeTab === 'losses' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>Pix2Pix Objective Function Mathematical Formulation</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Combining Conditional Adversarial Loss with L1 Reconstruction Loss ensures both crisp high-frequency textures and geometric correctness.
              </p>
            </div>

            {/* Formula Cards */}
            <div className="space-y-4">
              {/* Conditional GAN Loss */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-pink-400 font-mono">1. Conditional Adversarial Loss (cGAN)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 font-mono">Forces Realism</span>
                </div>
                <div className="p-3 bg-slate-900/90 rounded-lg text-center font-mono text-xs sm:text-sm text-pink-200 overflow-x-auto">
                  L_cGAN(G, D) = E_{'{x, y}'} [log D(x, y)] + E_{'{x, z}'} [log(1 - D(x, G(x, z)))]
                </div>
                <p className="text-[11px] text-slate-400">
                  The conditional discriminator D attempts to distinguish between real pairs (x, y) and synthesized pairs (x, G(x)), while G tries to fool D into scoring G(x) as real.
                </p>
              </div>

              {/* L1 Reconstruction Loss */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400 font-mono">2. L1 Reconstruction Loss</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">Forces Low-Frequency Alignment</span>
                </div>
                <div className="p-3 bg-slate-900/90 rounded-lg text-center font-mono text-xs sm:text-sm text-purple-200 overflow-x-auto">
                  L_L1(G) = E_{'{x, y, z}'} [ ||y - G(x, z)||_1 ]
                </div>
                <p className="text-[11px] text-slate-400">
                  Penalizes pixel-wise Manhattan distance between ground truth y and generated G(x). L1 loss is chosen over L2 because L1 promotes sharper edges and less blurring than L2 Euclidean distance.
                </p>
              </div>

              {/* Full Objective */}
              <div className="p-4 bg-indigo-950/40 rounded-xl border border-indigo-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 font-mono">3. Complete Pix2Pix Min-Max Objective</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-mono">Full Game</span>
                </div>
                <div className="p-3 bg-slate-900/90 rounded-lg text-center font-mono text-sm sm:text-base text-indigo-200 font-bold overflow-x-auto">
                  G* = arg min_G max_D L_cGAN(G, D) + λ L_L1(G)
                </div>
                <p className="text-[11px] text-slate-300">
                  Where <span className="font-mono text-amber-300">λ = 100</span> by default. The discriminator's job is unchanged, but the generator is tasked not only to fool the discriminator but also to remain close to the ground truth output in an L1 sense.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
