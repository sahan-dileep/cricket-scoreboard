'use strict';
import React from 'react';
import { OverBalls } from '@/types/cricket';

interface Props {
  recentBalls?: OverBalls[];
}

export const RecentBalls: React.FC<Props> = ({ recentBalls = [] }) => {
  const getBallBadgeClass = (label: string): string => {
    switch (label) {
      case 'W':
        return 'bg-rose-600 text-white shadow-rose-900/50 shadow-md';
      case '4':
        return 'bg-emerald-600 text-white shadow-emerald-900/50 shadow-md';
      case '6':
        return 'bg-orange-500 text-white shadow-orange-900/50 shadow-md';
      case '0':
      case '.':
        return 'bg-slate-700 text-slate-300';
      case 'WD':
      case 'NB':
        return 'bg-purple-600 text-white text-xs font-bold shadow-purple-900/50 shadow-md';
      case '1':
      case '2':
      case '3':
        return 'bg-blue-600 text-white shadow-blue-900/50 shadow-md';
      default:
        return 'bg-slate-700 text-slate-200';
    }
  };

  return (
    <div className="bg-slate-900/85 border border-slate-700/80 rounded-2xl px-6 py-4 shadow-xl flex items-center gap-6 overflow-x-auto">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
        Recent Overs
      </div>

      <div className="flex items-center gap-3">
        {recentBalls.length === 0 ? (
          <span className="text-slate-500 text-sm italic">Waiting for first ball...</span>
        ) : (
          recentBalls.map((over, overIdx) => (
            <React.Fragment key={over.overNumber || overIdx}>
              {overIdx > 0 && <div className="w-0.5 h-8 bg-slate-700 rounded-full mx-1" />}
              <div className="flex items-center gap-2">
                {over.balls.map((ball, bIdx) => (
                  <div
                    key={bIdx}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-transform ${getBallBadgeClass(
                      ball.label
                    )} ${ball.isNew ? 'scale-115 ring-2 ring-amber-400' : ''}`}
                  >
                    {ball.label}
                  </div>
                ))}
              </div>
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
};
