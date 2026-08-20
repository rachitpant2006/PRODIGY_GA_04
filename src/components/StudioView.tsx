import React, { useState, useRef, useEffect } from 'react';
import {
  Wand2,
  Paintbrush,
  Eraser,
  RotateCcw,
  Upload,
  Layers,
  Sliders,
  Eye,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Square,
  Sparkles,
  Download,
} from 'lucide-react';
import { DatasetDomain, PatchEvaluation, TranslationResult } from '../types';
import { DATASETS, PRESET_PAIRS, createSvgDataUrl } from '../data/presets';
import {
  runClientPix2PixInference,
  extractEdgesFromImage,
  loadImage,
} from '../utils/imageSynthesis';

export const StudioView: React.FC = () => {
  const [selectedDomain, setSelectedDomain] = useState<DatasetDomain>('facades');
  const [selectedColor, setSelectedColor] = useState<string>('#0000FF'); // Default facade wall
  const [brushSize, setBrushSize] = useState<number>(8);
  const [tool, setTool] = useState<'brush' | 'rect' | 'eraser'>('brush');
  const [useSkipConnections, setUseSkipConnections] = useState<boolean>(true);
  const [l1Weight, setL1Weight] = useState<number>(100);
  const [receptiveField, setReceptiveField] = useState<number>(70);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [showPatchHeatmap, setShowPatchHeatmap] = useState<boolean>(false);
  const [hoveredPatch, setHoveredPatch] = useState<PatchEvaluation | null>(null);
  const [curtainPosition, setCurtainPosition] = useState<number>(50); // percentage
  const [viewMode, setViewMode] = useState<'split' | 'curtain' | 'triplet'>('split');
  const [groundTruthUrl, setGroundTruthUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const canvasHistoryRef = useRef<ImageData[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentDataset = DATASETS.find((d) => d.id === selectedDomain) || DATASETS[0];
  const domainPresets = PRESET_PAIRS.filter((p) => p.domain === selectedDomain);

  // Initialize canvas with first preset or blank on domain change
  useEffect(() => {
    const defaultColor = currentDataset.semanticClasses?.[0]?.hex || '#000000';
    setSelectedColor(defaultColor);

    if (domainPresets.length > 0) {
      loadPreset(domainPresets[0]);
    } else {
      clearCanvas();
    }
  }, [selectedDomain]);

  // Load a preset pair
  const loadPreset = async (preset: typeof PRESET_PAIRS[0]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    try {
      const srcUrl = createSvgDataUrl(preset.sourceSvg);
      const targetUrl = createSvgDataUrl(preset.targetSvg);
      const img = await loadImage(srcUrl);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      saveState();

      setGroundTruthUrl(targetUrl);
      // Automatically run translation on preset load
      handleTranslate(srcUrl);
    } catch (e) {
      console.error('Error loading preset:', e);
    }
  };

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvasHistoryRef.current.push(data);
    if (canvasHistoryRef.current.length > 20) {
      canvasHistoryRef.current.shift();
    }
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas || canvasHistoryRef.current.length <= 1) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvasHistoryRef.current.pop(); // remove current
    const prev = canvasHistoryRef.current[canvasHistoryRef.current.length - 1];
    if (prev) {
      ctx.putImageData(prev, 0, 0);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill background depending on domain
    if (selectedDomain === 'facades') {
      ctx.fillStyle = '#000000'; // Black sky
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (selectedDomain === 'maps2aerial') {
      ctx.fillStyle = '#DCDCDC'; // Urban block grey
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#FFFFFF'; // White for sketches
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setGroundTruthUrl(null);
    saveState();
  };

  // Drawing Handlers
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    startPosRef.current = coords;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'brush' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = tool === 'eraser' ? (selectedDomain === 'facades' ? '#000000' : '#FFFFFF') : selectedColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const coords = getCanvasCoords(e);

    if (tool === 'brush' || tool === 'eraser') {
      ctx.strokeStyle = tool === 'eraser' ? (selectedDomain === 'facades' ? '#000000' : '#FFFFFF') : selectedColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'rect' && startPosRef.current) {
      const coords = getCanvasCoords(e);
      const width = coords.x - startPosRef.current.x;
      const height = coords.y - startPosRef.current.y;
      ctx.fillStyle = selectedColor;
      ctx.fillRect(startPosRef.current.x, startPosRef.current.y, width, height);
    }
    saveState();
  };

  // Perform Pix2Pix Generator Inference
  const handleTranslate = async (sourceDataUrlOverride?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsTranslating(true);
    try {
      const inputUrl = sourceDataUrlOverride || canvas.toDataURL('image/png');
      const result = await runClientPix2PixInference(inputUrl, selectedDomain, {
        useSkipConnections,
        l1Weight,
        receptiveField,
      });
      setTranslationResult(result);
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle Custom Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      try {
        let finalUrl = dataUrl;
        // If sketch domain, automatically extract edges
        if (currentDataset.canvasType === 'sketch') {
          finalUrl = await extractEdgesFromImage(dataUrl);
        }
        const img = await loadImage(finalUrl);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        saveState();
        setGroundTruthUrl(null);
        handleTranslate(finalUrl);
      } catch (err) {
        console.error('Failed to load uploaded file:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  // Download translated result
  const handleDownload = () => {
    if (!translationResult?.generatedDataUrl) return;
    const link = document.createElement('a');
    link.download = `pix2pix_${selectedDomain}_translation.png`;
    link.href = translationResult.generatedDataUrl;
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Dataset Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {currentDataset.badge}
              </span>
              <h2 className="text-xl font-bold text-white">{currentDataset.name}</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              {currentDataset.description}
            </p>
          </div>

          {/* Dataset Selector Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            {DATASETS.map((d) => (
              <button
                key={d.id}
                id={`btn-select-domain-${d.id}`}
                onClick={() => setSelectedDomain(d.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedDomain === d.id
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {d.name.split(' (')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Dataset Presets Bar */}
        {domainPresets.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center gap-3 overflow-x-auto pb-1">
            <span className="text-xs font-medium text-slate-400 whitespace-nowrap flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Dataset Presets:
            </span>
            {domainPresets.map((pair) => (
              <button
                key={pair.id}
                id={`preset-${pair.id}`}
                onClick={() => loadPreset(pair)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 hover:text-white transition"
              >
                <span>{pair.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Studio Grid: Left Canvas & Controls | Right Generator Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Interactive Drawing Pad & Tools (5 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Paintbrush className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Input Condition x (Canvas)</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-undo-canvas"
                  onClick={undo}
                  title="Undo last stroke"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Undo</span>
                </button>
                <button
                  id="btn-clear-canvas"
                  onClick={clearCanvas}
                  title="Clear canvas"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800/50 transition text-xs"
                >
                  Clear
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  id="btn-upload-image"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload sketch or photo"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition text-xs flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Upload</span>
                </button>
              </div>
            </div>

            {/* Drawing Canvas Container */}
            <div className="relative aspect-square w-full max-w-[380px] mx-auto bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-800 shadow-inner flex items-center justify-center">
              <canvas
                id="pix2pix-input-canvas"
                ref={canvasRef}
                width={256}
                height={256}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-full h-full cursor-crosshair touch-none"
              />

              {/* Hovered Patch Receptive Field Indicator */}
              {hoveredPatch && (
                <div
                  className="absolute border-2 border-amber-400 bg-amber-400/20 pointer-events-none transition-all duration-75"
                  style={{
                    left: `${(hoveredPatch.patchX / 256) * 100}%`,
                    top: `${(hoveredPatch.patchY / 256) * 100}%`,
                    width: `${(hoveredPatch.size / 256) * 100}%`,
                    height: `${(hoveredPatch.size / 256) * 100}%`,
                  }}
                >
                  <span className="absolute -top-4 left-0 text-[9px] font-mono font-bold bg-amber-400 text-slate-950 px-1 rounded-t">
                    70x70 Field
                  </span>
                </div>
              )}
            </div>

            {/* Tool Bar & Semantic Palette */}
            <div className="mt-4 space-y-3">
              {/* Tool Selection */}
              <div className="flex items-center justify-between gap-2 p-2 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1">
                  <button
                    id="tool-brush"
                    onClick={() => setTool('brush')}
                    className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                      tool === 'brush' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Paintbrush className="w-3.5 h-3.5" />
                    <span>Brush</span>
                  </button>
                  <button
                    id="tool-rect"
                    onClick={() => setTool('rect')}
                    className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                      tool === 'rect' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Rect</span>
                  </button>
                  <button
                    id="tool-eraser"
                    onClick={() => setTool('eraser')}
                    className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                      tool === 'eraser' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Eraser</span>
                  </button>
                </div>

                {/* Brush Size Slider */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Size: {brushSize}px</span>
                  <input
                    type="range"
                    min="2"
                    max="32"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-20 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Semantic Palette (if segmentation dataset) */}
              {currentDataset.semanticClasses && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Semantic Labels Palette:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {currentDataset.semanticClasses.map((item) => (
                      <button
                        key={item.hex}
                        id={`palette-${item.name.replace(/\s+/g, '-').toLowerCase()}`}
                        onClick={() => setSelectedColor(item.hex)}
                        className={`flex items-center gap-2 p-1.5 rounded-lg text-left border transition-all ${
                          selectedColor.toLowerCase() === item.hex.toLowerCase()
                            ? 'bg-slate-800 border-indigo-500 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 text-slate-300'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded border border-white/20 shrink-0"
                          style={{ backgroundColor: item.hex }}
                        />
                        <span className="text-[11px] font-medium truncate">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* cGAN Model Hyperparameters & Architecture Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">cGAN Architecture Controls</h3>
            </div>

            {/* Skip Connections (U-Net vs Autoencoder) */}
            <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-200">U-Net Skip Connections</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                    {useSkipConnections ? 'U-Net 256' : 'Encoder-Decoder'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {useSkipConnections
                    ? 'Transfers high-frequency spatial details directly across layers.'
                    : 'Information bottleneck: forces image through latent bottleneck (produces blur).'}
                </p>
              </div>
              <button
                id="toggle-skip-connections"
                onClick={() => setUseSkipConnections(!useSkipConnections)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  useSkipConnections ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    useSkipConnections ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* L1 Loss Weight Lambda */}
            <div className="space-y-1.5 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-200">L1 Regularizer Weight (λ)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                    λ = {l1Weight}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Paper default: 100</span>
              </div>
              <input
                id="slider-l1-weight"
                type="range"
                min="0"
                max="200"
                step="10"
                value={l1Weight}
                onChange={(e) => setL1Weight(parseInt(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0 (Pure Adversarial Hallucination)</span>
                <span>100 (Optimal)</span>
                <span>200 (Overly Smooth)</span>
              </div>
            </div>

            {/* PatchGAN Receptive Field Selector */}
            <div className="space-y-1.5 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Discriminator Architecture</span>
                <span className="text-[10px] text-indigo-400 font-mono">
                  {receptiveField === 70 ? '70x70 PatchGAN (Standard)' : `${receptiveField}x${receptiveField}`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[
                  { rf: 1, label: '1x1 (PixelGAN)' },
                  { rf: 16, label: '16x16' },
                  { rf: 70, label: '70x70 (PatchGAN)' },
                  { rf: 286, label: '286x286 (Full)' },
                ].map((item) => (
                  <button
                    key={item.rf}
                    id={`rf-btn-${item.rf}`}
                    onClick={() => setReceptiveField(item.rf)}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-mono transition border ${
                      receptiveField === item.rf
                        ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Action Button: Run Pix2Pix */}
            <button
              id="btn-run-pix2pix"
              onClick={() => handleTranslate()}
              disabled={isTranslating}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:via-purple-700 hover:to-pink-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isTranslating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Synthesizing Generator Output G(x)...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Translate Image with Pix2Pix G(x)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Output G(x), Comparison & PatchGAN Inspector (7 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            {/* Header / View Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-pink-400" />
                <h3 className="text-sm font-semibold text-white">Generator Output G(x)</h3>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                  <button
                    id="viewmode-split"
                    onClick={() => setViewMode('split')}
                    className={`px-2.5 py-1 rounded font-medium transition ${
                      viewMode === 'split' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Side-by-Side
                  </button>
                  <button
                    id="viewmode-curtain"
                    onClick={() => setViewMode('curtain')}
                    className={`px-2.5 py-1 rounded font-medium transition ${
                      viewMode === 'curtain' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Curtain Slider
                  </button>
                </div>

                {/* Heatmap Toggle */}
                <button
                  id="toggle-patch-heatmap"
                  onClick={() => setShowPatchHeatmap(!showPatchHeatmap)}
                  className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition ${
                    showPatchHeatmap
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title="Toggle 70x70 PatchGAN Discriminator Heatmap"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Patch Heatmap</span>
                </button>
              </div>
            </div>

            {/* Translation Output Display */}
            {translationResult ? (
              <div className="space-y-4">
                {viewMode === 'split' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Generated Output G(x) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-slate-200">G(x) Generated Photo</span>
                        <span className="text-[10px] font-mono text-indigo-400">{translationResult.latencyMs}ms</span>
                      </div>
                      <div className="relative aspect-square w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                        <img
                          src={translationResult.generatedDataUrl}
                          alt="Pix2Pix Generated Output"
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />

                        {/* PatchGAN Heatmap Overlay Grid */}
                        {showPatchHeatmap && translationResult.patchMatrix && (
                          <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 p-1 gap-1 pointer-events-auto">
                            {translationResult.patchMatrix.flat().map((patch, idx) => {
                              const isReal = patch.realScore >= 0.75;
                              const isFake = patch.realScore < 0.45;
                              const bgColor = isReal
                                ? 'bg-emerald-500/35 border-emerald-400/80 hover:bg-emerald-500/60'
                                : isFake
                                ? 'bg-rose-500/35 border-rose-400/80 hover:bg-rose-500/60'
                                : 'bg-amber-500/35 border-amber-400/80 hover:bg-amber-500/60';

                              return (
                                <div
                                  key={idx}
                                  onMouseEnter={() => setHoveredPatch(patch)}
                                  onMouseLeave={() => setHoveredPatch(null)}
                                  className={`border rounded flex flex-col items-center justify-center cursor-pointer transition-all duration-150 ${bgColor}`}
                                >
                                  <span className="text-[10px] font-mono font-bold text-white drop-shadow">
                                    {(patch.realScore * 100).toFixed(0)}%
                                  </span>
                                  <span className="text-[8px] font-mono text-slate-200">
                                    L1:{patch.l1Loss.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ground Truth or Condition Reference */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-slate-200">
                          {groundTruthUrl ? 'y Ground Truth Reference' : 'Input Condition x'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">256x256</span>
                      </div>
                      <div className="relative aspect-square w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                        {groundTruthUrl ? (
                          <img
                            src={groundTruthUrl}
                            alt="Ground Truth"
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-center p-4 text-slate-500 text-xs">
                            <Info className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                            Load a preset to compare against paired Ground Truth y
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Curtain Comparison Slider Mode */
                  <div className="space-y-2">
                    <div className="relative aspect-square w-full max-w-[420px] mx-auto bg-slate-950 rounded-xl overflow-hidden border border-slate-800 select-none shadow-2xl">
                      {/* Left: Input Canvas / Condition */}
                      <div className="absolute inset-0">
                        <canvas
                          width={256}
                          height={256}
                          ref={(el) => {
                            if (el && canvasRef.current) {
                              const ctx = el.getContext('2d');
                              ctx?.drawImage(canvasRef.current, 0, 0);
                            }
                          }}
                          className="w-full h-full object-contain"
                        />
                        <span className="absolute bottom-2 left-2 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-900/90 text-slate-200 border border-slate-700">
                          Condition x
                        </span>
                      </div>

                      {/* Right: Generated Output G(x) clipped by curtain */}
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ clipPath: `inset(0 0 0 ${curtainPosition}%)` }}
                      >
                        <img
                          src={translationResult.generatedDataUrl}
                          alt="Generated"
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-2 right-2 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-900/90 text-indigo-200 border border-indigo-700">
                          G(x) Generated
                        </span>
                      </div>

                      {/* Curtain Divider Line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-2xl cursor-ew-resize flex items-center justify-center"
                        style={{ left: `${curtainPosition}%` }}
                      >
                        <div className="w-6 h-6 rounded-full bg-white shadow-lg flex items-center justify-center text-slate-900 text-[10px] font-bold">
                          ↔
                        </div>
                      </div>
                    </div>

                    {/* Curtain Position Range Slider */}
                    <div className="flex items-center gap-3 max-w-[420px] mx-auto">
                      <span className="text-[11px] text-slate-400">Condition x</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={curtainPosition}
                        onChange={(e) => setCurtainPosition(parseInt(e.target.value))}
                        className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                      <span className="text-[11px] text-slate-400">G(x)</span>
                    </div>
                  </div>
                )}

                {/* Quantitative Loss Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">D(x, G(x)) Real%</span>
                    <p className="text-base font-bold text-emerald-400 font-mono">
                      {(translationResult.avgRealScore * 100).toFixed(1)}%
                    </p>
                    <span className="text-[9px] text-slate-500">PatchGAN confidence</span>
                  </div>

                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">L1 Pixel Loss</span>
                    <p className="text-base font-bold text-purple-400 font-mono">
                      {translationResult.avgL1Loss.toFixed(3)}
                    </p>
                    <span className="text-[9px] text-slate-500">||y - G(x)||_1</span>
                  </div>

                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Adversarial Loss</span>
                    <p className="text-base font-bold text-pink-400 font-mono">
                      {translationResult.adversarialLoss.toFixed(2)}
                    </p>
                    <span className="text-[9px] text-slate-500">log(1 - D(x, G(x)))</span>
                  </div>

                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Combined Loss</span>
                    <p className="text-base font-bold text-amber-400 font-mono">
                      {translationResult.totalLoss.toFixed(2)}
                    </p>
                    <span className="text-[9px] text-slate-500">L_cGAN + λ·L1</span>
                  </div>
                </div>

                {/* Patch Inspector Hover Details */}
                {hoveredPatch && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-amber-300">
                        Patch Inspector (x:{hoveredPatch.patchX}, y:{hoveredPatch.patchY})
                      </span>
                      <p className="text-[11px] text-amber-200/80">
                        Local Receptive Field: 70x70 pixels. Status: {hoveredPatch.status.toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-amber-300">
                        Real Score: {(hoveredPatch.realScore * 100).toFixed(1)}%
                      </span>
                      <p className="text-[10px] text-amber-200/70">L1 Diff: {hoveredPatch.l1Loss.toFixed(4)}</p>
                    </div>
                  </div>
                )}

                {/* Architectural Insights Box */}
                {translationResult.details && (
                  <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{translationResult.details.skipConnectionsImpact}</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      {translationResult.details.patchGanObservation}
                    </p>
                  </div>
                )}

                {/* Download Button */}
                <button
                  id="btn-download-result"
                  onClick={handleDownload}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Translated Image (PNG)</span>
                </button>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500 space-y-3">
                <Wand2 className="w-10 h-10 mx-auto text-slate-600 animate-pulse" />
                <div>
                  <p className="text-sm font-medium text-slate-400">No translation generated yet</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Draw on the canvas or pick a preset, then click "Translate Image with Pix2Pix G(x)"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
