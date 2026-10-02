'use strict';
import React from 'react';

interface Props {
  runRate?: number | null;
  overs?: string | null;
  extras?: number | null;
  lastWicket?: string | null;
  requiredRunRate?: number | null;
}

export const StatsFooter: React.FC<Props> = ({
  runRate,
  overs,
  extras,
  lastWicket,
  requiredRunRate,
}) => {
  return (
    <footer className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 bg-slate-900/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl divide-x divide-slate-800">
      <div className="p-4 text-center">
        <div className="text-2xl font-black text-amber-400 tabular-nums">
          {runRate !== undefined && runRate !== null ? runRate.toFixed(2) : '—'}
        </div>
        <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mt-1">
          Current Run Rate
        </div>
      </div>

      {requiredRunRate !== undefined && requiredRunRate !== null && (
        <div className="p-4 text-center bg-rose-950/20">
          <div className="text-2xl font-black text-rose-400 tabular-nums">
            {requiredRunRate.toFixed(2)}
          </div>
          <div className="text-[10px] font-bold uppercase text-rose-300 tracking-wider mt-1">
            Req. Run Rate
          </div>
        </div>
      )}

      <div className="p-4 text-center">
        <div className="text-2xl font-black text-sky-400 tabular-nums">
          {overs || '0.0'}
        </div>
        <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mt-1">
          Overs Bowled
        </div>
      </div>

      <div className="p-4 text-center">
        <div className="text-2xl font-black text-emerald-400 tabular-nums">
          {extras ?? 0}
        </div>
        <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mt-1">
          Extras
        </div>
      </div>

      <div className="p-4 text-center col-span-2 md:col-span-1">
        <div className="text-lg font-bold text-slate-200 truncate">
          {lastWicket || 'None'}
        </div>
        <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mt-1">
          Fall of Wicket
        </div>
      </div>
    </footer>
  );
};
