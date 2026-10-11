import React from 'react';
import { Calendar, ArrowRight } from 'lucide-react';

export default function TimelineWidget({ events }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-4 w-[600px] border border-gray-100">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2 text-gray-900 font-bold">
          <Calendar size={18} />
          <span>Pass Sequence & Forecasting</span>
        </div>
        <button className="text-sm text-emerald-600 font-bold flex items-center gap-1 hover:text-emerald-700 transition-colors">
          View Full Schedule <ArrowRight size={14} />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-2">
        {events.map((evt, idx) => {
          const isAlert = evt.is_alert || evt.event_type === 'action_req';
          const isToday = evt.date.toUpperCase().includes('TODAY');
          
          return (
            <div 
              key={idx} 
              className={`flex-shrink-0 w-[110px] h-[120px] rounded-xl p-3 border relative transition-transform hover:-translate-y-1 ${
                isAlert 
                  ? 'border-red-400 bg-red-50/50' 
                  : (isToday ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 bg-white')
              }`}
            >
              {isAlert && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                  !
                </div>
              )}
              
              <div className={`text-[10px] font-bold mb-2 ${isAlert ? 'text-red-600' : 'text-gray-500'}`}>
                {evt.date}
              </div>
              <div className="text-sm font-bold text-gray-900 leading-snug">
                {evt.title}
              </div>
              {evt.event_type === 'action_req' && (
                <div className="mt-2 text-[10px] text-red-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                  Action Req: Irrig.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
