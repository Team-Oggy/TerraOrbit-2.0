import React from 'react';
import { useFieldContext } from '../contexts/FieldContext';
import { useFields } from '../api/fields';

export default function FieldSwitcher({ user }) {
  const { selectedFieldId, setSelectedFieldId } = useFieldContext();
  const { data: farms, loading } = useFields(user);

  if (loading) {
    return <div className="flex gap-2 animate-pulse"><div className="w-24 h-10 bg-white/10 rounded-full"></div></div>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-white/10 pb-4">
      {/* For now, 'all' view isn't fully implemented per requirement, it says "All fields" view fits all 3 borders, but the dashboard data is per field. Let's just list the fields. */}
      {farms.map(f => (
        <button 
          key={f.id} 
          onClick={() => setSelectedFieldId(f.id)}
          className={`px-4 py-2 rounded-full font-mono text-xs transition-all ${selectedFieldId == f.id ? 'bg-[#22C55E] text-black font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >
          {f.name}
        </button>
      ))}
    </div>
  );
}
