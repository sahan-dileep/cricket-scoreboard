'use client';

import React from 'react';
import { OverBalls, BallDisplay } from '@/types/cricket';

interface Props {
  recentBalls?: OverBalls[] | null;
}

export const RecentBalls: React.FC<Props> = ({ recentBalls = [] }) => {
  // Strictly clamp ball history to the last 3 overs
  const displayedOvers = (recentBalls || []).slice(-3);

  const getBallBadgeClass = (ball: BallDisplay): string => {
    const rawLabel = ball.label ?? ball.text ?? '';
    const label = String(rawLabel).trim();
    const upper = label.toUpperCase();

    // Wicket (W, WKT, OUT, or isWicket): red
    if (ball.isWicket || upper === 'W' || upper === 'WKT' || upper === 'OUT') {
      return 'bg-red-600 text-white shadow-red-900/50 shadow-md ring-1 ring-red-400/30';
    }

    // Wide / No-ball / Extras (WD, NB, WIDE, NOBALL, or isExtra): purple
    if (
      ball.isExtra ||
      upper === 'WD' ||
      upper === 'NB' ||
      upper === 'WIDE' ||
      upper === 'NOBALL' ||
      upper.startsWith('WD') ||
      upper.startsWith('NB')
    ) {
      return 'bg-purple-600 text-white text-xs font-bold shadow-purple-900/50 shadow-md ring-1 ring-purple-400/30';
    }

    // 6: orange
    if (upper === '6') {
      return 'bg-orange-500 text-white shadow-orange-900/50 shadow-md ring-1 ring-orange-400/30';
    }

    // 4: green
    if (upper === '4') {
      return 'bg-emerald-600 text-white shadow-emerald-900/50 shadow-md ring-1 ring-emerald-400/30';
    }

    // 1-3: blue
    if (upper === '1' || upper === '2' || upper === '3') {
      return 'bg-blue-600 text-white shadow-blue-900/50 shadow-md ring-1 ring-blue-400/30';
    }

    // Dot (0, ., •, DOT): grey
    if (upper === '0' || upper === '.' || upper === '•' || upper === 'DOT' || upper === '') {
      return 'bg-slate-700 text-slate-300';
    }

    // Other runs (e.g., 5 or 7): blue
    if (!isNaN(Number(upper)) && Number(upper) > 0) {
      return 'bg-blue-600 text-white shadow-blue-900/50 shadow-md';
    }

    // Default: grey
    return 'bg-slate-700 text-slate-200';
  };

  return (
    <div className="bg-slate-900/85 border border-slate-700/80 rounded-2xl px-6 py-4 shadow-xl flex items-center gap-6 overflow-x-auto">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap flex items-center gap-2">
        <span>Recent Overs</span>
        <span className="text-[10px] text-slate-500 font-medium lowercase">(last 3)</span>
      </div>

      <div className="flex items-center gap-3">
        {displayedOvers.length === 0 ? (
          <span className="text-slate-500 text-sm italic">Waiting for first ball...</span>
        ) : (
          displayedOvers.map((over, overIdx) => (
            <React.Fragment key={over.overNumber || overIdx}>
              {overIdx > 0 && <div className="w-0.5 h-8 bg-slate-700 rounded-full mx-1" />}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 mr-1 select-none">
                  Ov {over.overNumber}:
                </span>
                {(over.balls || []).map((ball, bIdx) => {
                  const displayLabel = ball.label ?? ball.text ?? '0';
                  return (
                    <div
                      key={bIdx}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-transform ${getBallBadgeClass(
                        ball
                      )} ${ball.isNew ? 'scale-110 ring-2 ring-amber-400' : ''}`}
                    >
                      {displayLabel}
                    </div>
                  );
                })}
              </div>
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
};
