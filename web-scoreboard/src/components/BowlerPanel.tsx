'use strict';
import React from 'react';
import { Bowler } from '@/types/cricket';

interface Props {
  bowler?: Bowler;
  playerPhotos?: Record<string, string>;
}

export const BowlerPanel: React.FC<Props> = ({ bowler, playerPhotos = {} }) => {
  const econ = bowler?.economy
    ? typeof bowler.economy === 'number'
      ? bowler.economy.toFixed(2)
      : bowler.economy
    : '—';

  const photoSrc =
    (bowler?.name && playerPhotos[bowler.name]) ||
    '/assets/branding/player-avatar-default.svg';

  return (
    <div className="bg-slate-900/85 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2 mb-3">
        🎳 Current Bowler
      </div>

      <div className="grid grid-cols-[auto_1fr_repeat(4,auto)] items-center gap-3">
        {/* Bowler Avatar */}
        <div className="w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex-shrink-0 shadow-md">
          <img
            src={photoSrc}
            alt={bowler?.name || 'Bowler'}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="font-bold text-lg text-sky-400 truncate">
          {bowler?.name || 'Bowler'}
        </div>

        <div className="text-right px-2">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">O</div>
          <div className="text-base font-semibold text-slate-200 tabular-nums">
            {bowler?.overs ?? '0.0'}
          </div>
        </div>

        <div className="text-right px-2">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">R</div>
          <div className="text-base font-semibold text-slate-200 tabular-nums">
            {bowler?.runs ?? 0}
          </div>
        </div>

        <div className="text-right px-2">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">W</div>
          <div className="text-2xl font-black text-rose-500 tabular-nums">
            {bowler?.wickets ?? 0}
          </div>
        </div>

        <div className="text-right pl-2">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Econ</div>
          <div className="text-base font-semibold text-slate-300 tabular-nums">
            {econ}
          </div>
        </div>
      </div>
    </div>
  );
};
