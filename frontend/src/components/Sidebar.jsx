import React from 'react';
import { Map as MapIcon, Activity, Droplet, Leaf, TrendingUp, FileText, Settings, Satellite } from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    { icon: MapIcon, label: 'Map & HUD', active: false },
    { icon: Activity, label: 'Telemetry & Soil', active: false },
    { icon: Droplet, label: 'Irrigation Automation', active: false },
    { icon: Leaf, label: 'Crop Health & NDVI', active: false },
    { icon: TrendingUp, label: 'Yield Forecast', active: true },
    { icon: FileText, label: 'Field Reports', active: false },
  ];

  return (
    <div className="w-64 h-screen bg-[#0F172A] text-gray-400 flex flex-col font-medium border-r border-gray-800">
      {/* Logo Area */}
      <div className="flex items-center gap-2.5 px-6 py-8">
        <img src="/terra-orbit-logo.png" alt="TerraOrbit Logo" className="w-10 h-10 rounded-full" />
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: '"Geist", sans-serif', fontWeight: 600 }}>
            <span className="text-white">Terra</span><span style={{ backgroundImage: 'linear-gradient(to right, #22C55E, #38BDF8)', WebkitBackgroundClip: 'text', color: 'transparent' }}>Orbit</span>
          </h1>
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Agrisat Workspace</p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                item.active 
                ? 'bg-gray-800/50 text-white border border-gray-700' 
                : 'hover:text-white hover:bg-gray-800/30 border border-transparent'
              }`}
            >
              <Icon size={18} className={item.active ? 'text-emerald-400' : ''} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom Settings & Status */}
      <div className="p-4 space-y-4 mb-4">
        <button className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:text-white transition-colors">
          <Settings size={18} />
          Settings
        </button>
        
        <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-white text-sm font-semibold">Constellation Sync</span>
          </div>
          <span className="text-[10px] text-gray-500 tracking-wider uppercase ml-4">ORBITX SYNC V4.2 CALIBRATED</span>
        </div>
      </div>
    </div>
  );
}
