import React from 'react';
import { Search, Bell, MapPin } from 'lucide-react';

export default function Header({ farms, selectedFarmId, onFarmSelect, locationName, lat, lon }) {
  return (
    <div className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 relative shadow-sm">
      {/* Left: Location Info */}
      <div>
        <div className="flex items-center gap-2 group">
          <select 
            className="text-xl font-bold text-gray-900 bg-transparent focus:outline-none cursor-pointer appearance-none group-hover:text-emerald-600 transition-colors"
            value={selectedFarmId || ""}
            onChange={(e) => onFarmSelect(parseInt(e.target.value))}
          >
            {farms?.map(farm => (
              <option key={farm.id} value={farm.id}>{farm.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 font-medium">
          <MapPin size={12} />
          {lat && lon ? `${lat}°N, ${lon}°W` : "--"}
        </div>
      </div>

      {/* Right: Search & Profile */}
      <div className="flex items-center gap-6">
        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search fields, metrics..." 
            className="pl-9 pr-4 py-2 w-64 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 border-l border-gray-200 pl-6 cursor-pointer">
          <div className="text-right">
            <div className="text-sm font-bold text-gray-900">Dr. E. Thorne</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Chief Agronomist</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold shadow-sm">
            ET
          </div>
        </div>
      </div>
    </div>
  );
}
