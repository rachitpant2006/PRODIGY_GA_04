import React, { useState } from 'react';
import { DATASETS, PRESET_PAIRS, createSvgDataUrl } from '../data/presets';
import { DatasetDomain } from '../types';
import { Images, ArrowRight, Wand2, CheckCircle2, Sparkles } from 'lucide-react';

interface DatasetGalleryViewProps {
  onSelectDatasetAndPreset?: (domain: DatasetDomain, presetId: string) => void;
}

export const DatasetGalleryView: React.FC<DatasetGalleryViewProps> = ({ onSelectDatasetAndPreset }) => {
  const [sliderPositions, setSliderPositions] = useState<Record<string, number>>({
    'facade-paris': 50,
    'shoes-sneaker': 50,
    'handbag-tote': 50,
    'maps-city': 50,
    'night-skyline': 50,
  });

  const handleSliderChange = (id: string, val: number) => {
    setSliderPositions((prev) => ({ ...prev, [id]: val }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Pix2Pix Benchmarks
          </span>
          <h2 className="text-xl font-bold text-white">Classic Paired Image-to-Image Datasets</h2>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Explore the official benchmark datasets from the landmark paper "Image-to-Image Translation with Conditional Adversarial Networks" (Isola, Zhu, Zhou, Efros).
        </p>
      </div>

      {/* Dataset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PRESET_PAIRS.map((pair) => {
          const datasetInfo = DATASETS.find((d) => d.id === pair.domain);
          const sliderPos = sliderPositions[pair.id] ?? 50;
          const srcUrl = createSvgDataUrl(pair.sourceSvg);
          const targetUrl = createSvgDataUrl(pair.targetSvg);

          return (
            <div
              key={pair.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {datasetInfo?.badge || pair.domain}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">256x256 Paired</span>
                </div>
                <h3 className="text-base font-bold text-white">{pair.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{pair.description}</p>
              </div>

              {/* Interactive Draggable Split Canvas Preview */}
              <div className="relative aspect-square w-full bg-slate-950 border-y border-slate-800 select-none overflow-hidden">
                {/* Condition (Left) */}
                <div className="absolute inset-0">
                  <img
                    src={srcUrl}
                    alt="Condition x"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-2 left-2 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-900/90 text-slate-300 border border-slate-700">
                    Input x
                  </span>
                </div>

                {/* Ground Truth / Target (Right) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
                >
                  <img
                    src={targetUrl}
                    alt="Ground Truth y"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-2 right-2 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-indigo-900/90 text-indigo-200 border border-indigo-700">
                    Target y
                  </span>
                </div>

                {/* Divider bar */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl pointer-events-none"
                  style={{ left: `${sliderPos}%` }}
                />
              </div>

              {/* Slider Controller & Load Button */}
              <div className="p-4 space-y-3 bg-slate-950/60">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[10px] text-slate-400 font-mono">Compare:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPos}
                    onChange={(e) => handleSliderChange(pair.id, parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {onSelectDatasetAndPreset && (
                  <button
                    onClick={() => onSelectDatasetAndPreset(pair.domain, pair.id)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition border border-slate-700 hover:border-indigo-500 shadow-sm"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Open in Translation Studio</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
