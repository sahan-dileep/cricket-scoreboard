'use strict';
import React from 'react';
import { Partnership } from '@/types/cricket';

interface Props {
  partnership?: Partnership;
}

export const PartnershipPanel: React.FC<Props> = ({ partnership }) => {
  return (
    <div className="bg-slate-900/85 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2 mb-3">
        🤝 Current Partnership
      </div>

      <div className="flex justify-around items-center">
        <div className="text-center">
          <div className="text-3xl font-black text-emerald-400 tabular-nums">
            {partnership?.runs ?? 0}
          </div>
          <div className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider">
            Runs
          </div>
        </div>

        <div className="text-xl font-bold text-slate-600">·</div>

        <div className="text-center">
          <div className="text-2xl font-bold text-slate-300 tabular-nums">
            {partnership?.balls ?? 0}
          </div>
          <div className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider">
            Balls
          </div>
        </div>
      </div>
    </div>
  );
};
