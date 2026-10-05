'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Bowler, PlayerRole, PLAYER_ROLES } from '@/types/cricket';

export interface BowlerSpotlightOverlayProps {
  bowler: Bowler;
  teamName?: string;
  teamLogo?: string;
  playerPhoto?: string;
  playerRole?: PlayerRole;
  durationSeconds?: number;
  onDismiss: () => void;
}

export function BowlerSpotlightOverlay({
  bowler,
  teamName,
  teamLogo,
  playerPhoto,
  playerRole = 'baller',
  durationSeconds = 10,
  onDismiss,
}: BowlerSpotlightOverlayProps) {
  const [timeLeft, setTimeLeft] = useState<number>(durationSeconds);

  // Countdown timer
  useEffect(() => {
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
  }, [durationSeconds, onDismiss]);

  const defaultPhoto = playerPhoto || '/assets/branding/player-avatar-default.svg';
  const roleInfo = PLAYER_ROLES[playerRole] || PLAYER_ROLES.baller;

  // Economy calculation helper
  const calculateEconomy = (): string => {
    if (bowler.economy !== undefined && bowler.economy !== null && bowler.economy !== '') {
      return typeof bowler.economy === 'number'
        ? bowler.economy.toFixed(2)
        : String(bowler.economy);
    }
    const oversVal =
      typeof bowler.overs === 'number'
        ? bowler.overs
        : parseFloat(String(bowler.overs));
    if (oversVal && oversVal > 0) {
      return (bowler.runs / oversVal).toFixed(2);
    }
    return '0.00';
  };

  const economy = calculateEconomy();

  const metrics = [
    { label: 'OVERS', value: bowler.overs, color: 'text-white' },
    { label: 'MAIDENS', value: bowler.maidens ?? 0, color: 'text-white' },
    { label: 'RUNS', value: bowler.runs, color: 'text-[#d4fc04]' },
    { label: 'WICKETS', value: bowler.wickets, color: 'text-rose-400' },
    { label: 'ECONOMY', value: economy, color: 'text-[#38bdf8]' },
  ];

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / durationSeconds) * 100));

  return (
    <div
      role="dialog"
      aria-label="Bowler Spotlight Overlay"
      className="absolute inset-0 z-50 flex flex-col justify-between bg-[#020e13]/95 backdrop-blur-md p-4 sm:p-6 md:p-8 text-slate-100 select-none animate-fadeIn overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 60% 30%, rgba(9, 57, 69, 0.8) 0%, rgba(2, 14, 19, 0.98) 75%)',
      }}
    >
      {/* LED Matrix subtle mesh overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)',
          backgroundSize: '4px 4px',
        }}
      />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between pb-3 sm:pb-4 border-b-2 border-[#09414f]">
        <div className="flex items-center gap-3">
          <span className="text-2xl sm:text-3xl">🎳</span>
          <div>
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#d4fc04] drop-shadow-[0_0_8px_rgba(212,252,4,0.4)]">
              STADIUM BROADCAST • BOWLER SPOTLIGHT
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-['Barlow_Condensed',sans-serif] font-black uppercase text-white tracking-wide leading-tight">
              CURRENT BOWLING FIGURES
            </h2>
          </div>
        </div>

        {/* Countdown badge & Manual Dismiss Button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#032026] border border-[#0e4856] text-xs font-mono text-[#d4fc04]">
            <span className="w-2 h-2 rounded-full bg-[#d4fc04] animate-ping" />
            <span>DISMISSING IN {timeLeft}S</span>
          </div>

          <button
            onClick={onDismiss}
            aria-label="Dismiss Overlay"
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#092e38] hover:bg-[#0f4352] text-slate-200 hover:text-white border border-[#165a6b] font-['Barlow_Condensed',sans-serif] font-bold text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-lg active:scale-95"
          >
            <span>✕</span>
            <span>Dismiss</span>
            <span className="text-slate-400 font-mono text-[10px] hidden md:inline">[Esc]</span>
          </button>
        </div>
      </div>

      {/* Main Spotlight Section */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center my-4 sm:my-6 gap-6 sm:gap-10">
        
        {/* Left Card: Bowler Profile & Avatar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 bg-[#031d25] border-2 border-[#165a6b] rounded-2xl p-4 sm:p-6 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
          {/* Avatar with Glow & Team Crest Overlay */}
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-2xl bg-[#021319] border-2 border-[#d4fc04] p-2 shadow-[0_0_30px_rgba(212,252,4,0.3)] shrink-0 flex items-center justify-center">
            <Image
              src={defaultPhoto}
              alt={bowler.name}
              width={180}
              height={180}
              unoptimized
              className="w-full h-full object-contain rounded-xl"
            />
            {teamLogo && (
              <div className="absolute -bottom-2 -right-2 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#031c24] border border-[#165a6b] p-1 shadow-lg">
                <Image
                  src={teamLogo}
                  alt={teamName || 'Team'}
                  width={40}
                  height={40}
                  unoptimized
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>

          {/* Bowler Identity */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2.5 py-0.5 rounded-md font-['Barlow_Condensed',sans-serif] font-black text-xs uppercase tracking-wider border ${roleInfo.badgeClass}`}
              >
                {roleInfo.icon} {roleInfo.label}
              </span>
              {teamName && (
                <span className="text-xs uppercase font-bold text-slate-400">
                  • {teamName}
                </span>
              )}
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-['Barlow_Condensed',sans-serif] font-black uppercase tracking-tight text-[#d4fc04] drop-shadow-[0_2px_15px_rgba(212,252,4,0.4)] leading-none">
              {bowler.name}
            </h1>

            <p className="mt-2 text-xs sm:text-sm font-mono text-slate-300 uppercase tracking-widest">
              ACTIVE STADIUM BOWLER
            </p>
          </div>
        </div>

        {/* Right: 5 LED Metric Cards */}
        <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3.5">
          {metrics.map((m, idx) => (
            <div
              key={idx}
              className={`p-3 sm:p-4 rounded-xl bg-[#031c24] border-2 border-[#0e4856] shadow-lg flex flex-col items-center justify-center text-center ${
                idx === 4 ? 'col-span-2 sm:col-span-1' : ''
              }`}
            >
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#d4fc04] mb-1">
                {m.label}
              </span>
              <span
                className={`text-4xl sm:text-5xl md:text-6xl font-['Barlow_Condensed',sans-serif] font-black tracking-tight leading-none tabular-nums ${m.color}`}
              >
                {m.value}
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* Bottom Progress Bar & Footer */}
      <div className="relative z-10 w-full pt-3 border-t-2 border-[#09414f] flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#d4fc04]" />
            STADIUM LED OVERLAY ACTIVE • REAL-TIME BOWLER FIGURES
          </span>
          <span>AUTORETURN IN {timeLeft}S • PRESS [ESC] TO DISMISS</span>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full h-2 rounded-full bg-[#032026] overflow-hidden border border-[#0d4654]">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-[#d4fc04] transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(212,252,4,0.8)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default BowlerSpotlightOverlay;
