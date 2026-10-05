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
  autoDismiss?: boolean;
  onDismiss: () => void;
}

export function BowlerSpotlightOverlay({
  bowler,
  teamName,
  teamLogo,
  playerPhoto,
  playerRole = 'baller',
  durationSeconds = 10,
  autoDismiss = false, // Disabled by default so screen does not restart after 10s
  onDismiss,
}: BowlerSpotlightOverlayProps) {
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

  return (
    <div
      role="dialog"
      aria-label="Bowler Spotlight Overlay"
      className="absolute inset-0 z-50 flex flex-col justify-between bg-[#020b0d]/95 backdrop-blur-md p-4 sm:p-6 md:p-8 text-slate-100 select-none animate-fadeIn overflow-hidden font-['Barlow_Condensed',sans-serif]"
      style={{
        background:
          'radial-gradient(circle at 60% 30%, rgba(9, 57, 69, 0.85) 0%, rgba(2, 11, 13, 0.98) 80%)',
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
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="text-2xl sm:text-3xl">🎳</span>
          <div>
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#d4fc04]">
              STADIUM BROADCAST • BOWLER SPOTLIGHT
            </span>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-black uppercase text-white tracking-tight leading-none">
              CURRENT BOWLING FIGURES
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

      {/* Main Spotlight Section */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center my-4 sm:my-6 gap-6 sm:gap-10">
        
        {/* Left Card: Bowler Profile & Avatar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 bg-[#021820]/95 border-2 border-[#165a6b] rounded-2xl p-4 sm:p-6 shadow-2xl">
          {/* Avatar with Glow & Team Crest Overlay */}
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-2xl bg-white/10 border-2 border-white/20 p-2 shadow-xl shrink-0 flex items-center justify-center">
            <Image
              src={defaultPhoto}
              alt={bowler.name}
              width={180}
              height={180}
              unoptimized
              className="w-full h-full object-contain rounded-xl"
            />
            {teamLogo && (
              <div className="absolute -bottom-2 -right-2 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#021820] border-2 border-[#165a6b] p-1.5 shadow-xl">
                <Image
                  src={teamLogo}
                  alt={teamName || 'Team'}
                  width={48}
                  height={48}
                  unoptimized
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>

          {/* Bowler Identity */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-lg p-1 bg-[#021b22] border border-[#0e4857] inline-flex items-center justify-center">
                <img
                  src={roleInfo.rcIconUrl}
                  alt={roleInfo.label}
                  className="w-full h-full object-contain"
                />
              </span>
              <span className="px-2.5 py-0.5 rounded font-black text-xs sm:text-sm uppercase tracking-wider text-slate-200 bg-white/10 border border-white/20">
                {roleInfo.label}
              </span>
              {teamName && (
                <span className="text-xs sm:text-sm uppercase font-bold text-slate-400">
                  • {teamName}
                </span>
              )}
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-[#d4fc04] leading-none">
              {bowler.name}
            </h1>

            <p className="mt-2 text-xs sm:text-sm font-mono text-slate-300 uppercase tracking-widest font-bold">
              ACTIVE STADIUM BOWLER
            </p>
          </div>
        </div>

        {/* Right: 5 LED Metric Cards */}
        <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          {metrics.map((m, idx) => (
            <div
              key={idx}
              className={`p-3 sm:p-5 rounded-2xl bg-[#02141a] border-2 border-[#0d4654] shadow-xl flex flex-col items-center justify-center text-center ${
                idx === 4 ? 'col-span-2 sm:col-span-1' : ''
              }`}
            >
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#d4fc04] mb-1">
                {m.label}
              </span>
              <span
                className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none tabular-nums ${m.color}`}
              >
                {m.value}
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* Clean Bottom Footer Bar (No auto-timer) */}
      <div className="relative z-10 w-full pt-3 border-t-2 border-[#09414f] flex items-center justify-between text-xs sm:text-sm font-mono text-slate-400">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#d4fc04]" />
          <span className="font-bold text-slate-200">STADIUM LED OVERLAY</span> • REAL-TIME BOWLER FIGURES
        </span>
        <span className="font-bold text-[#d4fc04]">PRESS [ESC] OR [X] TO RETURN TO SCOREBOARD</span>
      </div>
    </div>
  );
}

export default BowlerSpotlightOverlay;
