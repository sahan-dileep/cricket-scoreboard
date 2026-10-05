'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export interface TossOverlayProps {
  matchTitle?: string;
  tournamentName?: string;
  team1Name: string;
  team2Name: string;
  team1Logo?: string;
  team2Logo?: string;
  tossWinner: string;
  tossDecision?: string; // e.g. 'ELECTED TO BAT' or 'ELECTED TO BOWL'
  tossChoice?: string; // 'BAT' or 'BOWL'
  durationSeconds?: number;
  autoDismiss?: boolean;
  onDismiss: () => void;
}

export function TossOverlay({
  matchTitle,
  tournamentName,
  team1Name,
  team2Name,
  team1Logo,
  team2Logo,
  tossWinner,
  tossDecision,
  tossChoice,
  durationSeconds = 10,
  autoDismiss = false, // Disabled by default so screen does not restart after 10s
  onDismiss,
}: TossOverlayProps) {
  const [timeLeft, setTimeLeft] = useState<number>(durationSeconds);
  const progressPercent = durationSeconds > 0 ? (timeLeft / durationSeconds) * 100 : 100;

  // Optional countdown timer (only runs if explicitly requested)
  useEffect(() => {
    if (!autoDismiss) return;
    setTimeLeft(durationSeconds);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoDismiss, durationSeconds, onDismiss]);

  // Normalize decision text
  const decisionText =
    tossDecision ||
    (tossChoice
      ? `ELECTED TO ${tossChoice.toUpperCase()}`
      : 'ELECTED TO BAT');

  const resolvedTitle =
    matchTitle || tournamentName || `${team1Name} VS ${team2Name}`;

  const defaultLogo1 = team1Logo || '/assets/branding/tech-titans-logo.svg';
  const defaultLogo2 = team2Logo || '/assets/branding/sales-strikers-logo.svg';

  return (
    <div
      role="dialog"
      aria-label="Toss Decision Overlay"
      className="absolute inset-0 z-50 flex flex-col justify-between bg-[#020b0d]/95 backdrop-blur-md p-4 sm:p-6 md:p-8 text-slate-100 select-none animate-fadeIn overflow-hidden font-['Barlow_Condensed',sans-serif]"
      style={{
        background:
          'radial-gradient(circle at 50% 20%, rgba(9, 57, 69, 0.85) 0%, rgba(2, 11, 13, 0.98) 80%)',
      }}
    >
      {/* LED Matrix subtle mesh overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)',
          backgroundSize: '4px 4px',
        }}
      />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between pb-3 sm:pb-4 border-b-2 border-[#09414f]">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="text-2xl sm:text-3xl">🪙</span>
          <div>
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#d4fc04]">
              STADIUM BROADCAST • OFFICIAL TOSS
            </span>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-black uppercase text-white tracking-tight leading-none">
              {resolvedTitle}
            </h2>
          </div>
        </div>

        {/* Manual Dismiss Button (No auto-timer) */}
        <div className="flex items-center gap-3">
          <button
            onClick={onDismiss}
            aria-label="Dismiss Overlay"
            className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-xl bg-[#092e38] hover:bg-[#0f4352] text-slate-200 hover:text-white border-2 border-[#165a6b] font-black text-sm sm:text-base uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-lg active:scale-95"
          >
            <span>✕</span>
            <span>Dismiss</span>
            <span className="text-[#d4fc04] font-mono text-xs hidden md:inline">[Esc]</span>
          </button>
        </div>
      </div>

      {/* Main Center Presentation */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-4 sm:my-6 gap-6 sm:gap-8">
        
        {/* Teams Matchup & Crests */}
        <div className="w-full max-w-4xl flex items-center justify-around px-4">
          {/* Team 1 */}
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-44 md:h-44 rounded-2xl p-3 sm:p-4 bg-white/10 border-2 border-white/20 shadow-2xl flex items-center justify-center relative">
              <Image
                src={defaultLogo1}
                alt={team1Name}
                width={140}
                height={140}
                unoptimized
                className="w-full h-full object-contain drop-shadow-md"
              />
              {tossWinner.toLowerCase() === team1Name.toLowerCase() && (
                <div className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-[#d4fc04] text-[#032026] flex items-center justify-center font-black text-xs sm:text-sm shadow-[0_0_15px_rgba(212,252,4,0.6)] animate-bounce">
                  🪙 TOSS WINNER
                </div>
              )}
            </div>
            <h3 className="mt-3 sm:mt-4 text-2xl sm:text-4xl md:text-5xl font-black uppercase text-white tracking-tight">
              {team1Name}
            </h3>
          </div>

          {/* VS Divider */}
          <div className="px-4 flex flex-col items-center">
            <span className="text-4xl sm:text-6xl md:text-7xl font-black text-[#d4fc04]">
              VS
            </span>
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-400">
              MATCHUP
            </span>
          </div>

          {/* Team 2 */}
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-44 md:h-44 rounded-2xl p-3 sm:p-4 bg-white/10 border-2 border-white/20 shadow-2xl flex items-center justify-center relative">
              <Image
                src={defaultLogo2}
                alt={team2Name}
                width={140}
                height={140}
                unoptimized
                className="w-full h-full object-contain drop-shadow-md"
              />
              {tossWinner.toLowerCase() === team2Name.toLowerCase() && (
                <div className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-[#d4fc04] text-[#032026] flex items-center justify-center font-black text-xs sm:text-sm shadow-[0_0_15px_rgba(212,252,4,0.6)] animate-bounce">
                  🪙 TOSS WINNER
                </div>
              )}
            </div>
            <h3 className="mt-3 sm:mt-4 text-2xl sm:text-4xl md:text-5xl font-black uppercase text-white tracking-tight">
              {team2Name}
            </h3>
          </div>
        </div>

        {/* Toss Winner Callout Card */}
        <div className="w-full max-w-2xl bg-[#021820]/95 border-2 border-[#165a6b] rounded-2xl p-5 sm:p-7 shadow-2xl flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl sm:text-2xl animate-spin" style={{ animationDuration: '3s' }}>
              🪙
            </span>
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#d4fc04]">
              OFFICIAL TOSS RESULT
            </span>
          </div>

          <div className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-white mb-4">
            <span className="text-[#d4fc04]">
              {tossWinner}
            </span>{' '}
            WON THE TOSS
          </div>

          <div className="px-8 sm:px-10 py-2.5 sm:py-3.5 rounded-2xl bg-[#d4fc04] text-[#02141a] font-black text-2xl sm:text-4xl md:text-5xl tracking-wide uppercase shadow-lg">
            {decisionText}
          </div>
        </div>

      </div>

      {/* Clean Bottom Footer Bar (No auto-timer) */}
      <div className="relative z-10 w-full pt-3 border-t-2 border-[#09414f] flex items-center justify-between text-xs sm:text-sm font-mono text-slate-400">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#d4fc04]" />
          <span className="font-bold text-slate-200">STADIUM LED OVERLAY</span> • OFFICIAL TOSS
        </span>
        <span className="font-bold text-[#d4fc04]">PRESS [ESC] OR [X] TO RETURN TO SCOREBOARD</span>
      </div>
    </div>
  );
}

export default TossOverlay;
