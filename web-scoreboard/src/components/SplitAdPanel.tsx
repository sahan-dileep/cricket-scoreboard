'use client';

import React from 'react';

interface Props {
  isActive: boolean;
  type: 'video' | 'image' | null;
  src: string | null;
  onClose: () => void;
}

export const SplitAdPanel: React.FC<Props> = ({ isActive, type, src, onClose }) => {
  if (!isActive || !src) return null;

  return (
    <aside className="w-full lg:w-96 flex flex-col bg-slate-950/95 border-2 border-amber-500/60 rounded-3xl p-4 shadow-2xl animate-in slide-in-from-right duration-300 relative overflow-hidden backdrop-blur-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs font-black tracking-widest uppercase text-amber-400">
            Tournament Partner
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
        >
          ✕ Close
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center py-4 overflow-hidden rounded-2xl bg-black/60 my-2">
        {type === 'video' ? (
          <video
            src={src}
            autoPlay
            playsInline
            controls
            onEnded={onClose}
            className="max-h-full max-w-full rounded-xl object-contain shadow-lg"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt="Tournament Advertisement"
            className="max-h-full max-w-full rounded-xl object-contain shadow-lg"
          />
        )}
      </div>

      <div className="text-[10px] text-center text-slate-500 font-semibold tracking-wider uppercase">
        Live Broadcast Sponsored Segment
      </div>
    </aside>
  );
};
