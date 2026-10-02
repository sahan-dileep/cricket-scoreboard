'use strict';
import React from 'react';

interface Props {
  requiredRuns?: number | null;
  requiredOvers?: number | null;
  requiredRunRate?: number | null;
}

export const ChasePanel: React.FC<Props> = ({
  requiredRuns,
  requiredOvers,
  requiredRunRate,
}) => {
  if (requiredRuns === undefined || requiredRuns === null) return null;

  return (
    <div className="bg-slate-900/85 border border-rose-500/40 rounded-2xl p-5 shadow-xl">
      <div className="text-xs font-bold uppercase tracking-widest text-rose-400 border-b border-rose-900/50 pb-2 mb-3 flex items-center justify-between">
        <span>🎯 Target Chase</span>
        <span className="text-[10px] text-rose-300/80 bg-rose-500/20 px-2 py-0.5 rounded-full">
          2nd Innings
        </span>
      </div>

      <div className="flex justify-around items-center">
        <div className="text-center">
          <div className="text-3xl font-black text-rose-400 tabular-nums">
            {requiredRuns}
          </div>
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            Runs Needed
          </div>
        </div>

        <div className="text-xl font-bold text-slate-600">·</div>

        <div className="text-center">
          <div className="text-2xl font-bold text-slate-200 tabular-nums">
            {requiredOvers ?? '—'}
          </div>
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            Overs Left
          </div>
        </div>

        <div className="text-xl font-bold text-slate-600">·</div>

        <div className="text-center">
          <div className="text-2xl font-bold text-amber-400 tabular-nums">
            {requiredRunRate ? requiredRunRate.toFixed(2) : '—'}
          </div>
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            Req. RR
          </div>
        </div>
      </div>
    </div>
  );
};
