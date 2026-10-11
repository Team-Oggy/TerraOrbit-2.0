import React from 'react';
import { Droplet, Play } from 'lucide-react';

export default function RightPanel({ soilMetrics }) {
  const vwc = soilMetrics?.moisture ? (soilMetrics.moisture * 100).toFixed(1) : "19.4";
  const surfacePct = soilMetrics?.surface_moisture_pct || 12;
  const rootPct = soilMetrics?.root_moisture_pct || 19;

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full overflow-y-auto">
      {/* Title & Tabs */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">North Ridge • Field 4B</h3>
          <button className="text-gray-400 hover:text-gray-600">•••</button>
        </div>
        
        <div className="flex gap-6 border-b border-gray-200 text-sm font-medium">
          <button className="pb-3 text-gray-500 hover:text-gray-800">Overview</button>
          <button className="pb-3 text-emerald-600 border-b-2 border-emerald-500">Moisture</button>
          <button className="pb-3 text-gray-500 hover:text-gray-800">Vigor (NDVI)</button>
          <button className="pb-3 text-gray-500 hover:text-gray-800">Irrigation</button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Root-Zone Moisture Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-bold tracking-wider uppercase">
              <Droplet size={14} /> Root-Zone Moisture
            </div>
            <button className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
              <Play size={12} fill="currentColor" /> Quick 4h Drip
            </button>
          </div>
          
          <div className="flex items-baseline gap-1 mb-8">
            <span className="text-4xl font-extrabold text-gray-900">{vwc}%</span>
            <span className="text-sm font-bold text-gray-400">VWC</span>
          </div>

          {/* Progress Bar Area */}
          <div className="relative mt-8 mb-4">
            {/* Markers */}
            <div className="absolute -top-6 left-0 text-[10px] font-bold text-red-500">Wilting Point</div>
            <div className="absolute -top-6 right-4 text-[10px] font-bold text-emerald-500">Field Capacity</div>
            
            {/* The Bar */}
            <div className="h-2.5 w-full bg-gradient-to-r from-red-400 via-emerald-300 to-blue-300 rounded-full relative">
              {/* Current Value Marker */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-gray-900 rounded-full shadow"
                style={{ left: `${vwc}%` }}
              >
                <div className="absolute -top-7 -translate-x-1/2 left-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">
                  {vwc}%
                </div>
              </div>
              {/* Target Marker */}
              <div className="absolute top-1/2 -translate-y-1/2 w-px h-5 bg-emerald-600" style={{ left: '35%' }}>
                <div className="absolute -top-5 -translate-x-1/2 left-1/2 text-emerald-600 text-[10px] font-bold">35%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Soil Horizon Profile */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-bold tracking-wider uppercase mb-6">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M12 2v20"/><path d="m4 16 8-8 8 8"/></svg>
            Soil Horizon Profile
          </div>

          <div className="space-y-5">
            {/* 0-10 cm */}
            <div>
              <div className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
                <span>0 - 10 cm (Surface)</span>
                <span className="text-red-500">{surfacePct}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-400 rounded-full" style={{ width: `${surfacePct}%` }}></div>
              </div>
            </div>

            {/* 10-30 cm */}
            <div>
              <div className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
                <span>10 - 30 cm (Root Zone)</span>
                <span className="text-orange-500">{rootPct}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${rootPct}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
