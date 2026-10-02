'use client';

import React from 'react';

export interface ResultBannerProps {
  result:
    | {
        title: string;
        detail?: string;
      }
    | string
    | null
    | undefined;
  isCompleted?: boolean;
  onDismiss?: () => void;
}

export const ResultBanner: React.FC<ResultBannerProps> = ({
  result,
  isCompleted = true,
  onDismiss,
}) => {
  if (!isCompleted || !result) return null;

  const title =
    typeof result === 'object' && result !== null
      ? result.title
      : typeof result === 'string'
      ? result
      : '';

  const detail =
    typeof result === 'object' && result !== null && result.detail
      ? result.detail
      : '';

  if (!title) return null;

  return (
    <div
      data-testid="result-banner"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300"
    >
      <div className="relative max-w-2xl w-full bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/40 border-2 border-amber-400/90 rounded-3xl p-8 md:p-10 shadow-2xl shadow-amber-500/30 text-center animate-in zoom-in-95 duration-300">
        {/* Glow backdrop behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 rounded-3xl blur-xl -z-10" />

        {/* Dismiss Button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss result banner"
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        )}

        {/* Celebration Badges */}
        <div className="flex items-center justify-center gap-3 mb-4 select-none">
          <span className="text-4xl animate-bounce">🎉</span>
          <span className="text-5xl drop-shadow-md">🏆</span>
          <span className="text-4xl animate-bounce">🎊</span>
        </div>

        <div className="inline-block px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-black uppercase tracking-widest mb-3">
          Match Completed · Final Result
        </div>

        <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 uppercase tracking-wide drop-shadow-lg mb-3">
          {title}
        </h2>

        {detail && (
          <p className="text-base md:text-lg text-slate-300 font-semibold max-w-lg mx-auto">
            {detail}
          </p>
        )}

        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-center gap-4">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-amber-500/25 cursor-pointer"
            >
              Dismiss Banner
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
