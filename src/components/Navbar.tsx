import React from 'react';
import { Sparkles, Layers, Activity, Code2, Images, Wand2 } from 'lucide-react';

export type TabType = 'studio' | 'architecture' | 'training' | 'gallery' | 'code';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'studio' as TabType, label: 'Translation Studio', icon: Wand2, badge: 'Interactive' },
    { id: 'architecture' as TabType, label: 'U-Net & PatchGAN', icon: Layers, badge: 'cGAN' },
    { id: 'training' as TabType, label: 'Training Dynamics', icon: Activity, badge: 'Min-Max' },
    { id: 'gallery' as TabType, label: 'Benchmark Datasets', icon: Images },
    { id: 'code' as TabType, label: 'PyTorch Model Code', icon: Code2, badge: 'Python' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Task info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Task-04
                </span>
                <h1 className="text-base font-bold text-slate-100">
                  Pix2Pix <span className="text-indigo-400 font-normal">cGAN Studio</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Image-to-Image Translation with Conditional Adversarial Networks
              </p>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="hidden md:inline">{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono hidden lg:inline ${
                        isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
