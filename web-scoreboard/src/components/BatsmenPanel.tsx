'use strict';
import React from 'react';
import { Batsman } from '@/types/cricket';

interface Props {
  batsmen?: Batsman[];
}

export const BatsmenPanel: React.FC<Props> = ({ batsmen = [] }) => {
  return (
    <div className="bg-slate-900/85 border border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2 mb-3 flex items-center justify-between">
        <span>🏏 At the Crease</span>
        <span className="text-[10px] text-slate-500">★ on strike</span>
      </div>

      <div className="flex flex-col divide-y divide-slate-800/80">
        {batsmen.length === 0 ? (
          <div className="text-slate-500 italic py-4 text-center">No batsmen information</div>
        ) : (
          batsmen.slice(0, 2).map((bat, idx) => {
            const sr =
              bat.balls > 0
                ? ((bat.runs / bat.balls) * 100).toFixed(1)
                : bat.strikeRate?.toFixed(1) ?? '—';

            return (
              <div
                key={idx}
                className="grid grid-cols-[auto_1fr_repeat(5,auto)] items-center gap-3 py-3"
              >
                {/* On-strike Indicator */}
                <span
                  className={`text-lg font-bold min-w-[20px] transition-opacity ${
                    bat.onStrike ? 'text-amber-400 opacity-100' : 'opacity-0'
                  }`}
                >
                  ★
                </span>

                {/* Name */}
                <div className="font-bold text-lg text-slate-100 truncate pr-2">
                  {bat.name || `Batsman ${idx + 1}`}
                </div>

                {/* Runs */}
                <div className="text-right px-2">
                  <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                    R
                  </div>
                  <div className="text-2xl font-black text-amber-400 tabular-nums">
                    {bat.runs}
                  </div>
                </div>

                {/* Balls */}
                <div className="text-right px-2">
                  <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                    B
                  </div>
                  <div className="text-base font-semibold text-slate-300 tabular-nums">
                    {bat.balls}
                  </div>
                </div>

                {/* 4s */}
                <div className="text-right px-2">
                  <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                    4s
                  </div>
                  <div className="text-sm font-semibold text-emerald-400 tabular-nums">
                    {bat.fours}
                  </div>
                </div>

                {/* 6s */}
                <div className="text-right px-2">
                  <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                    6s
                  </div>
                  <div className="text-sm font-semibold text-orange-400 tabular-nums">
                    {bat.sixes}
                  </div>
                </div>

                {/* Strike Rate */}
                <div className="text-right pl-2">
                  <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                    SR
                  </div>
                  <div className="text-sm font-semibold text-slate-300 tabular-nums">
                    {sr}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
