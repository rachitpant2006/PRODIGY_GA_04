/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar, TabType } from './components/Navbar';
import { StudioView } from './components/StudioView';
import { ArchitectureView } from './components/ArchitectureView';
import { TrainingSimulator } from './components/TrainingSimulator';
import { DatasetGalleryView } from './components/DatasetGalleryView';
import { CodeExportView } from './components/CodeExportView';
import { DatasetDomain } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('studio');

  const handleSelectFromGallery = (domain: DatasetDomain, presetId: string) => {
    setActiveTab('studio');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main View Area */}
      <main className="flex-1 pb-12">
        {activeTab === 'studio' && <StudioView />}
        {activeTab === 'architecture' && <ArchitectureView />}
        {activeTab === 'training' && <TrainingSimulator />}
        {activeTab === 'gallery' && (
          <DatasetGalleryView onSelectDatasetAndPreset={handleSelectFromGallery} />
        )}
        {activeTab === 'code' && <CodeExportView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Task-04: Image-to-Image Translation with Conditional Adversarial Networks (Pix2Pix)
          </p>
          <div className="flex items-center gap-4 font-mono text-[11px] text-slate-400">
            <span>Generator: U-Net 256</span>
            <span>•</span>
            <span>Discriminator: 70x70 PatchGAN</span>
            <span>•</span>
            <span>Loss: L_cGAN + 100·L1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
