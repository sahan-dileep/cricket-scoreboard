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
  autoDismiss?: boolean;
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
  autoDismiss = false, // Disabled by default so screen does not restart after 10s
  onDismiss,
}: TeamsPresentationOverlayProps) {
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

  return (
    <div
      role="dialog"
      aria-label="Teams Presentation Overlay"
      className="absolute inset-0 z-50 flex flex-col justify-between bg-[#020b0d]/95 backdrop-blur-md p-3 sm:p-5 md:p-6 text-slate-100 select-none animate-fadeIn overflow-hidden font-['Barlow_Condensed',sans-serif]"
      style={{
        background:
          'radial-gradient(circle at 50% 15%, rgba(7, 45, 54, 0.9) 0%, rgba(2, 11, 13, 0.98) 85%)',
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
        <div className="flex items-center gap-3 sm:gap-4">
          {tournamentLogo ? (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 p-1.5 flex items-center justify-center border border-white/20 shadow-md">
              <Image
                src={tournamentLogo}
                alt="Tournament Emblem"
                width={48}
                height={48}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <span className="text-2xl sm:text-3xl">👥</span>
          )}
          <div>
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#d4fc04]">
              STADIUM BROADCAST • TEAM LINEUPS & PRESENTATION
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

      {/* Main Side-by-Side Presentation Layout */}
      <div className="relative z-10 flex-1 grid grid-cols-2 gap-4 sm:gap-6 md:gap-8 my-2 sm:my-3 min-h-0 overflow-hidden">
        
        {/* Left Column: Team 1 */}
        <div className="flex flex-col bg-[#021820]/95 border-2 border-[#165a6b] rounded-2xl p-3 sm:p-4 md:p-5 shadow-2xl min-h-0">
          {/* Team 1 Header with Crest & Captain */}
          <div className="flex items-center gap-3 sm:gap-4 pb-2.5 border-b-2 border-[#09414f] shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl p-2 bg-white/10 border-2 border-white/20 shadow-md flex items-center justify-center shrink-0">
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
              <h3 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase text-[#d4fc04] truncate tracking-tight leading-none">
                {team1Name}
              </h3>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black uppercase">
                  (C)
                </span>
                <span className="text-xs sm:text-sm md:text-base font-bold uppercase text-slate-300 tracking-wide truncate">
                  CAPTAIN: {cleanPlayerName(resolvedCap1)}
                </span>
              </div>
            </div>
          </div>

          {/* Team 1 11-Player Vertical Roster (Generously sized rows filling height) */}
          <div className="flex-1 flex flex-col justify-between min-h-0 gap-1 sm:gap-1.5 pt-2">
            {squad1.map((player, idx) => {
              const role = getRoleInfo(player);
              const clean = cleanPlayerName(player);
              const isCaptain = clean.toLowerCase() === cleanPlayerName(resolvedCap1).toLowerCase();

              return (
                <div
                  key={`t1-${idx}`}
                  className="flex items-center justify-between px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg bg-[#02141a] border border-[#0d4654] hover:bg-white/5 transition-colors"
                >
                  {/* Left: Number, Role SVG Icon & Large Player Name */}
                  <div className="flex items-center gap-2 sm:gap-3 truncate">
                    <span className="w-6 text-sm sm:text-base md:text-lg font-mono text-slate-400 font-bold shrink-0">
                      {idx + 1}.
                    </span>
                    <span
                      className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg p-1 bg-[#021b22] border border-[#0e4857] inline-flex items-center justify-center shrink-0"
                      title={`${role.icon} ${role.label}`}
                      data-icon={role.icon}
                    >
                      <img
                        src={role.rcIconUrl}
                        alt={role.label}
                        className="w-full h-full object-contain"
                      />
                    </span>
                    <span
                      className={`text-base sm:text-xl md:text-2xl lg:text-3xl font-black uppercase tracking-tight truncate ${
                        isCaptain ? 'text-[#d4fc04]' : 'text-white'
                      }`}
                    >
                      {clean}
                    </span>
                  </div>

                  {/* Right: Badges */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isCaptain && (
                      <span className="px-2 py-0.5 rounded bg-[#d4fc04] text-[#032026] font-black text-xs sm:text-sm tracking-wider shadow-sm">
                        CAPTAIN
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded font-bold text-xs sm:text-sm md:text-base uppercase tracking-wider ${role.badgeClass || 'bg-white/5 border border-white/10 text-slate-300'}`}>
                      {role.shortLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Team 2 */}
        <div className="flex flex-col bg-[#021820]/95 border-2 border-[#165a6b] rounded-2xl p-3 sm:p-4 md:p-5 shadow-2xl min-h-0">
          {/* Team 2 Header with Crest & Captain */}
          <div className="flex items-center gap-3 sm:gap-4 pb-2.5 border-b-2 border-[#09414f] shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl p-2 bg-white/10 border-2 border-white/20 shadow-md flex items-center justify-center shrink-0">
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
              <h3 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase text-[#38bdf8] truncate tracking-tight leading-none">
                {team2Name}
              </h3>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-black uppercase">
                  (C)
                </span>
                <span className="text-xs sm:text-sm md:text-base font-bold uppercase text-slate-300 tracking-wide truncate">
                  CAPTAIN: {cleanPlayerName(resolvedCap2)}
                </span>
              </div>
            </div>
          </div>

          {/* Team 2 11-Player Vertical Roster (Generously sized rows filling height) */}
          <div className="flex-1 flex flex-col justify-between min-h-0 gap-1 sm:gap-1.5 pt-2">
            {squad2.map((player, idx) => {
              const role = getRoleInfo(player);
              const clean = cleanPlayerName(player);
              const isCaptain = clean.toLowerCase() === cleanPlayerName(resolvedCap2).toLowerCase();

              return (
                <div
                  key={`t2-${idx}`}
                  className="flex items-center justify-between px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg bg-[#02141a] border border-[#0d4654] hover:bg-white/5 transition-colors"
                >
                  {/* Left: Number, Role SVG Icon & Large Player Name */}
                  <div className="flex items-center gap-2 sm:gap-3 truncate">
                    <span className="w-6 text-sm sm:text-base md:text-lg font-mono text-slate-400 font-bold shrink-0">
                      {idx + 1}.
                    </span>
                    <span
                      className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg p-1 bg-[#021b22] border border-[#0e4857] inline-flex items-center justify-center shrink-0"
                      title={`${role.icon} ${role.label}`}
                      data-icon={role.icon}
                    >
                      <img
                        src={role.rcIconUrl}
                        alt={role.label}
                        className="w-full h-full object-contain"
                      />
                    </span>
                    <span
                      className={`text-base sm:text-xl md:text-2xl lg:text-3xl font-black uppercase tracking-tight truncate ${
                        isCaptain ? 'text-[#38bdf8]' : 'text-white'
                      }`}
                    >
                      {clean}
                    </span>
                  </div>

                  {/* Right: Badges */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isCaptain && (
                      <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/40 font-black text-xs sm:text-sm tracking-wider shadow-sm">
                        CAPTAIN
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded font-bold text-xs sm:text-sm md:text-base uppercase tracking-wider ${role.badgeClass || 'bg-white/5 border border-white/10 text-slate-300'}`}>
                      {role.shortLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Clean Bottom Footer Bar (No auto-timer) */}
      <div className="relative z-10 w-full pt-2 border-t-2 border-[#09414f] flex items-center justify-between text-xs sm:text-sm font-mono text-slate-400">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#d4fc04]" />
          <span className="font-bold text-slate-200">STADIUM LED OVERLAY</span> • 11-PLAYER SQUADS
        </span>
        <span className="font-bold text-[#d4fc04]">PRESS [ESC] OR [X] TO RETURN TO SCOREBOARD</span>
      </div>
    </div>
  );
}

export default TeamsPresentationOverlay;
