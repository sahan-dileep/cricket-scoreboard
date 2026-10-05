'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { PlayerRole, PLAYER_ROLES } from '@/types/cricket';

export interface TeamsPresentationOverlayProps {
  matchTitle?: string;
  tournamentName?: string;
  tournamentLogo?: string;
  team1Name: string;
  team2Name: string;
  team1Logo?: string;
  team2Logo?: string;
  team1Captain?: string;
  team2Captain?: string;
  team1Roster?: string[];
  team2Roster?: string[];
  playerRoles?: Record<string, PlayerRole>;
  durationSeconds?: number;
  onDismiss: () => void;
}

export function TeamsPresentationOverlay({
  matchTitle,
  tournamentName,
  tournamentLogo,
  team1Name,
  team2Name,
  team1Logo,
  team2Logo,
  team1Captain,
  team2Captain,
  team1Roster = [],
  team2Roster = [],
  playerRoles = {},
  durationSeconds = 10,
  onDismiss,
}: TeamsPresentationOverlayProps) {
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

  const resolvedTitle =
    matchTitle || tournamentName || `${team1Name} VS ${team2Name}`;

  const defaultLogo1 = team1Logo || '/assets/branding/tech-titans-logo.svg';
  const defaultLogo2 = team2Logo || '/assets/branding/sales-strikers-logo.svg';

  // Ensure 11 players per team
  const fillSquad = (roster: string[], defaultTeamName: string): string[] => {
    if (roster && roster.length >= 11) return roster.slice(0, 11);
    const fallbackMap: Record<string, string[]> = {
      'tech titans': [
        'D. Mendis', 'S. Fernando', 'K. Perera', 'C. Asalanka', 'B. Rajapaksa',
        'D. Shanaka', 'W. Hasaranga', 'C. Karunaratne', 'D. Chameera', 'M. Theekshana', 'L. Kumara'
      ],
      'sales strikers': [
        'P. Nissanka', 'K. Mendis', 'S. Samarawickrama', 'C. Silva', 'A. Mathews',
        'D. de Silva', 'K. Rajitha', 'M. Pathirana', 'P. Jayawickrama', 'N. Pradeep', 'B. Fernando'
      ],
      australia: [
        'Head', 'Marsh', 'Green', 'Carey', 'Labuschagne',
        'Inglis', 'Connolly', 'Bartlett', 'Abbott', 'Ellis', 'Zampa'
      ],
      'south africa': [
        'de Kock', 'Bavuma', 'Rickelton', 'Markram', 'Klaasen',
        'Miller', 'Mulder', 'Maharaj', 'Rabada', 'Nortje', 'Shamsi'
      ]
    };

    const teamKey = defaultTeamName.toLowerCase().trim();
    const defaults = fallbackMap[teamKey] || [
      'Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5',
      'Player 6', 'Player 7', 'Player 8', 'Player 9', 'Player 10', 'Player 11'
    ];

    const combined = [...roster];
    for (const p of defaults) {
      if (combined.length >= 11) break;
      if (!combined.includes(p)) combined.push(p);
    }
    while (combined.length < 11) {
      combined.push(`Player ${combined.length + 1}`);
    }
    return combined.slice(0, 11);
  };

  const squad1 = fillSquad(team1Roster, team1Name);
  const squad2 = fillSquad(team2Roster, team2Name);

  // Identify captains
  const resolvedCap1 =
    team1Captain ||
    squad1.find((p) => p.toLowerCase().includes('(c)')) ||
    squad1[0];

  const resolvedCap2 =
    team2Captain ||
    squad2.find((p) => p.toLowerCase().includes('(c)')) ||
    squad2[0];

  const cleanPlayerName = (name: string) =>
    name.replace(/\s*\([cCwWkK/]+\)\s*/g, '').trim();

  // Helper for role lookup
  const getRoleInfo = (playerName: string) => {
    const clean = cleanPlayerName(playerName);
    let roleKey: PlayerRole = 'batting';
    if (playerRoles[clean]) {
      roleKey = playerRoles[clean];
    } else {
      const match = Object.keys(playerRoles).find(
        (k) => k.toLowerCase().trim() === clean.toLowerCase().trim()
      );
      if (match) roleKey = playerRoles[match];
    }
    return PLAYER_ROLES[roleKey] || PLAYER_ROLES.batting;
  };

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / durationSeconds) * 100));

  return (
    <div
      role="dialog"
      aria-label="Teams Presentation Overlay"
      className="absolute inset-0 z-50 flex flex-col justify-between bg-[#020e13]/95 backdrop-blur-md p-3 sm:p-5 md:p-6 text-slate-100 select-none animate-fadeIn overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 50% 15%, rgba(7, 45, 54, 0.85) 0%, rgba(2, 14, 19, 0.98) 80%)',
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
      <div className="relative z-10 flex items-center justify-between pb-2 sm:pb-3 border-b-2 border-[#09414f]">
        <div className="flex items-center gap-3">
          {tournamentLogo ? (
            <Image
              src={tournamentLogo}
              alt="Tournament Emblem"
              width={36}
              height={36}
              unoptimized
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
            />
          ) : (
            <span className="text-2xl sm:text-3xl">👥</span>
          )}
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#d4fc04] drop-shadow-[0_0_8px_rgba(212,252,4,0.4)]">
              STADIUM BROADCAST • TEAM LINEUPS & PRESENTATION
            </span>
            <h2 className="text-lg sm:text-2xl md:text-3xl font-['Barlow_Condensed',sans-serif] font-black uppercase text-white tracking-wide leading-tight">
              {resolvedTitle}
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
            className="px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl bg-[#092e38] hover:bg-[#0f4352] text-slate-200 hover:text-white border border-[#165a6b] font-['Barlow_Condensed',sans-serif] font-bold text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-lg active:scale-95"
          >
            <span>✕</span>
            <span>Dismiss</span>
            <span className="text-slate-400 font-mono text-[10px] hidden md:inline">[Esc]</span>
          </button>
        </div>
      </div>

      {/* Main Side-by-Side Presentation Layout */}
      <div className="relative z-10 flex-1 grid grid-cols-2 gap-3 sm:gap-6 my-2 sm:my-3 min-h-0 overflow-hidden">
        
        {/* Left Column: Team 1 */}
        <div className="flex flex-col bg-[#031c24]/90 border-2 border-[#0e4856] rounded-2xl p-2.5 sm:p-4 shadow-2xl min-h-0">
          {/* Team 1 Header with Crest & Captain */}
          <div className="flex items-center gap-3 sm:gap-4 pb-2 border-b border-[#0d4654] mb-2">
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl p-1.5 bg-[#021319] border border-[#165a6b] flex items-center justify-center shrink-0">
              <Image
                src={defaultLogo1}
                alt={team1Name}
                width={80}
                height={80}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl sm:text-3xl md:text-4xl font-['Barlow_Condensed',sans-serif] font-black uppercase text-[#d4fc04] truncate tracking-tight">
                {team1Name}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs md:text-sm font-bold uppercase text-slate-300">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black">
                  (C)
                </span>
                <span className="truncate">CAPTAIN: {cleanPlayerName(resolvedCap1)}</span>
              </div>
            </div>
          </div>

          {/* Team 1 11-Player Roster */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-1.5 content-start">
            {squad1.map((player, idx) => {
              const role = getRoleInfo(player);
              const clean = cleanPlayerName(player);
              const isCaptain = clean.toLowerCase() === cleanPlayerName(resolvedCap1).toLowerCase();

              return (
                <div
                  key={`t1-${idx}`}
                  className="flex items-center justify-between px-2 py-0.5 sm:py-1 rounded bg-[#021217] border border-[#0a3540] text-xs sm:text-sm font-['Barlow_Condensed',sans-serif]"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-5 text-[10px] sm:text-xs font-mono text-slate-400 font-bold shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="text-sm shrink-0" title={role.label}>
                      {role.icon}
                    </span>
                    <span className={`font-bold uppercase truncate ${isCaptain ? 'text-[#d4fc04]' : 'text-slate-100'}`}>
                      {clean}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {isCaptain && (
                      <span className="text-[10px] font-black px-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        C
                      </span>
                    )}
                    <span
                      className={`text-[9px] sm:text-[10px] font-bold uppercase px-1 rounded ${role.badgeClass}`}
                    >
                      {role.shortLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Team 2 */}
        <div className="flex flex-col bg-[#031c24]/90 border-2 border-[#0e4856] rounded-2xl p-2.5 sm:p-4 shadow-2xl min-h-0">
          {/* Team 2 Header with Crest & Captain */}
          <div className="flex items-center gap-3 sm:gap-4 pb-2 border-b border-[#0d4654] mb-2">
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl p-1.5 bg-[#021319] border border-[#165a6b] flex items-center justify-center shrink-0">
              <Image
                src={defaultLogo2}
                alt={team2Name}
                width={80}
                height={80}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl sm:text-3xl md:text-4xl font-['Barlow_Condensed',sans-serif] font-black uppercase text-[#38bdf8] truncate tracking-tight">
                {team2Name}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs md:text-sm font-bold uppercase text-slate-300">
                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-black">
                  (C)
                </span>
                <span className="truncate">CAPTAIN: {cleanPlayerName(resolvedCap2)}</span>
              </div>
            </div>
          </div>

          {/* Team 2 11-Player Roster */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-1.5 content-start">
            {squad2.map((player, idx) => {
              const role = getRoleInfo(player);
              const clean = cleanPlayerName(player);
              const isCaptain = clean.toLowerCase() === cleanPlayerName(resolvedCap2).toLowerCase();

              return (
                <div
                  key={`t2-${idx}`}
                  className="flex items-center justify-between px-2 py-0.5 sm:py-1 rounded bg-[#021217] border border-[#0a3540] text-xs sm:text-sm font-['Barlow_Condensed',sans-serif]"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-5 text-[10px] sm:text-xs font-mono text-slate-400 font-bold shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="text-sm shrink-0" title={role.label}>
                      {role.icon}
                    </span>
                    <span className={`font-bold uppercase truncate ${isCaptain ? 'text-[#38bdf8]' : 'text-slate-100'}`}>
                      {clean}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {isCaptain && (
                      <span className="text-[10px] font-black px-1 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                        C
                      </span>
                    )}
                    <span
                      className={`text-[9px] sm:text-[10px] font-bold uppercase px-1 rounded ${role.badgeClass}`}
                    >
                      {role.shortLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Bottom Progress Bar & Footer */}
      <div className="relative z-10 w-full pt-2 border-t-2 border-[#09414f] flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            STADIUM LED OVERLAY ACTIVE • 11-PLAYER SQUADS
          </span>
          <span>AUTORETURN IN {timeLeft}S • PRESS [ESC] TO DISMISS</span>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full h-2 rounded-full bg-[#032026] overflow-hidden border border-[#0d4654]">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-[#d4fc04] transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(212,252,4,0.8)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default TeamsPresentationOverlay;
