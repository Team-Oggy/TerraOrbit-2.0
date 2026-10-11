import React from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import TimelineWidget from './TimelineWidget';

// Fix for default Leaflet marker icons in React
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapArea({ lat, lon, timelineEvents }) {
  const position = [lat || 38.542, lon || -121.748];
  
  // Approximate polygon for the field based on coordinates
  const polygon = [
    [position[0] + 0.002, position[1] - 0.003],
    [position[0] + 0.002, position[1] + 0.003],
    [position[0] - 0.002, position[1] + 0.003],
    [position[0] - 0.002, position[1] - 0.003],
  ];

  return (
    <div className="flex-1 relative bg-gray-100">
      {/* Top Overlay Buttons */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[400] flex gap-2 bg-white/90 backdrop-blur rounded-full p-1 shadow-sm border border-gray-200">
        <button className="px-4 py-1.5 text-sm font-bold text-gray-700 bg-white rounded-full shadow-sm">NDVI Index</button>
        <button className="px-4 py-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 rounded-full transition-colors">Soil VWC</button>
        <button className="px-4 py-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 rounded-full transition-colors">True Color</button>
        <button className="px-4 py-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 rounded-full transition-colors">Thermal IR</button>
      </div>

      {/* Map */}
      <MapContainer 
        center={position} 
        zoom={15} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        {/* Satellite Base Layer (Esri World Imagery) */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <Polygon 
          positions={polygon} 
          pathOptions={{ color: '#10B981', weight: 2, dashArray: '5, 5', fillOpacity: 0.1 }} 
        />
        <Marker position={position}>
          <Popup>North Ridge Orchard • Field 4B</Popup>
        </Marker>
      </MapContainer>

      {/* Timeline Widget Overlay */}
      <div className="z-[400] absolute bottom-0 w-full flex justify-center pointer-events-none">
          <div className="pointer-events-auto">
             <TimelineWidget events={timelineEvents} />
          </div>
      </div>
    </div>
  );
}
