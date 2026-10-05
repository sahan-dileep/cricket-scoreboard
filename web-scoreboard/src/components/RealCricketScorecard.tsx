'use strict';
import React, { useState } from 'react';
import { ScoreData, BrandingConfig, PLAYER_ROLES, PlayerRole } from '@/types/cricket';

interface Props {
  scoreData: ScoreData;
  branding?: BrandingConfig;
  onClose?: () => void;
}

export const RealCricketScorecard: React.FC<Props> = ({
  scoreData,
  branding,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling'>('batting');
  const [selectedInnings, setSelectedInnings] = useState<1 | 2>(
    (scoreData.match?.currentInnings as 1 | 2) || 1
  );

  const match = scoreData.match;
  const currentInnings = scoreData.currentInnings;
  const playerRoles: Record<string, PlayerRole> = branding?.playerRoles || {};

  // Determine current team details
  const isMatchCompleted = Boolean(match.isCompleted || match.status === 'COMPLETED');
  const isTeam1Batting = currentInnings.battingTeam === match.team1;

  // Innings teams
  const innings1BattingTeam =
    match.status === 'INNINGS_1' || currentInnings.innings === 1
      ? currentInnings.battingTeam
      : currentInnings.battingTeam === match.team1
      ? match.team2
      : match.team1;

  const currentBattingTeam =
    selectedInnings === 1
      ? innings1BattingTeam || match.team1
      : innings1BattingTeam === match.team1
      ? match.team2
      : match.team1;

  const currentBowlingTeam =
    currentBattingTeam === match.team1 ? match.team2 : match.team1;

  // Active innings data
  const isSelectedCurrentInnings =
    (selectedInnings === 1 && (match.status === 'INNINGS_1' || currentInnings.innings === 1)) ||
    (selectedInnings === 2 && (match.status === 'INNINGS_2' || currentInnings.innings === 2));

  const totalRuns = isSelectedCurrentInnings
    ? currentInnings.score
    : selectedInnings === 1 && match.innings1
    ? match.innings1.score
    : 0;

  const totalWickets = isSelectedCurrentInnings
    ? currentInnings.wickets
    : selectedInnings === 1 && match.innings1
    ? match.innings1.wickets
    : 0;

  const totalOvers = isSelectedCurrentInnings
    ? currentInnings.overs
    : selectedInnings === 1 && match.innings1
    ? match.innings1.overs
    : '0.0';

  const extras = isSelectedCurrentInnings ? currentInnings.extras : 0;

  // Team logo
  const teamLogoSrc =
    branding?.teamLogos?.[currentBattingTeam] ||
    (currentBattingTeam === match.team1
      ? '/assets/branding/tech-titans-logo.svg'
      : '/assets/branding/sales-strikers-logo.svg');

  // Build full 11 player list for batting team
  const rawBatsmen = isSelectedCurrentInnings ? currentInnings.batsmen || [] : [];
  const currentBowler = isSelectedCurrentInnings ? currentInnings.currentBowler : undefined;

  // Fallback 11 player roster if not all batsmen have batted yet
  const defaultRoster =
    currentBattingTeam === match.team1
      ? [
          'D. Mendis',
          'S. Fernando',
          'K. Perera',
          'C. Asalanka',
          'B. Rajapaksa',
          'D. Shanaka',
          'W. Hasaranga',
          'C. Karunaratne',
          'D. Chameera',
          'M. Theekshana',
          'L. Kumara',
        ]
      : [
          'P. Nissanka',
          'K. Mendis',
          'S. Samarawickrama',
          'C. Silva',
          'A. Mathews',
          'D. de Silva',
          'K. Rajitha',
          'M. Pathirana',
          'P. Jayawickrama',
          'N. Pradeep',
          'B. Fernando',
        ];

  // Synthesize 11 batting rows
  const fullBattingList = defaultRoster.map((pName, idx) => {
    const existing = rawBatsmen.find((b) => b.name === pName);
    if (existing) {
      return {
        name: existing.name || pName,
        status: existing.isOut
          ? existing.dismissalInfo || 'OUT'
          : 'NOT OUT',
        runs: existing.runs,
        balls: existing.balls,
        fours: existing.fours,
        sixes: existing.sixes,
        strikeRate: existing.strikeRate,
        isBatted: true,
        onStrike: existing.onStrike,
      };
    }
    // If not in batsmen list, but 1st or 2nd player
    if (idx < rawBatsmen.length) {
      const b = rawBatsmen[idx];
      return {
        name: b.name || pName,
        status: b.isOut ? b.dismissalInfo || 'OUT' : 'NOT OUT',
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        strikeRate: b.strikeRate,
        isBatted: true,
        onStrike: b.onStrike,
      };
    }

    return {
      name: pName,
      status: '',
      runs: undefined,
      balls: undefined,
      fours: undefined,
      sixes: undefined,
      strikeRate: undefined,
      isBatted: false,
      onStrike: false,
    };
  });

  // Bowling list
  const bowlingRoster =
    currentBowlingTeam === match.team1
      ? ['D. Chameera', 'M. Theekshana', 'L. Kumara', 'W. Hasaranga', 'C. Asalanka']
      : ['K. Rajitha', 'M. Pathirana', 'P. Jayawickrama', 'A. Mathews', 'D. de Silva'];

  const bowlingList = bowlingRoster.map((bName) => {
    if (currentBowler && (currentBowler.name === bName || bName.includes(currentBowler.name))) {
      return {
        name: currentBowler.name,
        overs: currentBowler.overs,
        maidens: currentBowler.maidens ?? 0,
        runs: currentBowler.runs,
        wickets: currentBowler.wickets,
        economy:
          typeof currentBowler.economy === 'number'
            ? currentBowler.economy.toFixed(2)
            : currentBowler.economy || '—',
        isActive: true,
      };
    }
    return {
      name: bName,
      overs: '—',
      maidens: '—',
      runs: '—',
      wickets: '—',
      economy: '—',
      isActive: false,
    };
  });

  return (
    <div
      className="relative w-full h-full min-h-screen bg-cover bg-center text-slate-100 flex flex-col justify-between p-4 md:p-8 font-sans select-none overflow-hidden"
      style={{
        backgroundImage: "url('/assets/branding/stadium-night-backdrop.svg')",
        backgroundColor: '#040d1a',
      }}
    >
      {/* Background Soft Fog Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950/80 pointer-events-none" />

      {/* Top Header Row: Real Cricket Tabs + Game Emblem */}
      <div className="relative z-10 flex items-start justify-between gap-4 mb-2">
        {/* Left Tabs */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('batting')}
            className={`px-5 py-2 rounded-t-lg font-black text-xs md:text-sm tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'batting'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                : 'bg-slate-900/70 hover:bg-slate-800/80 text-slate-300 border-t border-x border-slate-700/60'
            }`}
          >
            Batting Scorecard
          </button>
          <button
            onClick={() => setActiveTab('bowling')}
            className={`px-5 py-2 rounded-t-lg font-black text-xs md:text-sm tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'bowling'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                : 'bg-slate-900/70 hover:bg-slate-800/80 text-slate-300 border-t border-x border-slate-700/60'
            }`}
          >
            Bowling Scorecard
          </button>
        </div>

        {/* Right Match Badge Emblem */}
        <div className="flex items-center gap-3">
          {branding?.tournamentLogo && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80 shadow-md">
              <img
                src={branding.tournamentLogo}
                alt="Match Logo"
                className="w-7 h-7 object-contain"
              />
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 hidden sm:inline">
                {branding.tournamentName || 'Tournament 2026'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Scorecard Glassmorphic Container */}
      <div className="relative z-10 flex-1 flex flex-col bg-slate-900/80 border border-slate-700/70 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden">
        {/* Team Header Ribbon */}
        <div className="grid grid-cols-[1fr_auto] items-center px-6 py-3.5 bg-gradient-to-r from-slate-800/90 via-sky-950/80 to-slate-800/90 border-b border-slate-700/80">
          {/* Team Crest & Name */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900/80 border border-slate-700 p-0.5 flex items-center justify-center overflow-hidden shadow">
              <img
                src={teamLogoSrc}
                alt={currentBattingTeam}
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-slate-100 drop-shadow-md">
              {currentBattingTeam}
            </h2>
          </div>

          {/* Stepper Navigation: < BATTING SCORECARD > */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedInnings(1)}
              className={`p-1.5 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer ${
                selectedInnings === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-700/50'
              }`}
              disabled={selectedInnings === 1}
              title="1st Innings"
            >
              ◀
            </button>
            <span className="text-xs md:text-sm font-black uppercase tracking-widest text-sky-400">
              {activeTab === 'batting' ? 'Batting Scorecard' : 'Bowling Scorecard'} (Inn {selectedInnings})
            </span>
            <button
              onClick={() => setSelectedInnings(2)}
              className={`p-1.5 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer ${
                selectedInnings === 2 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-700/50'
              }`}
              disabled={selectedInnings === 2}
              title="2nd Innings"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {activeTab === 'batting' ? (
            /* Batting Scorecard Table */
            fullBattingList.map((player, idx) => {
              const roleKey = playerRoles[player.name];
              const roleInfo = roleKey ? PLAYER_ROLES[roleKey] : PLAYER_ROLES.batting;

              return (
                <div
                  key={idx}
                  className={`grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-6 py-2.5 transition-colors ${
                    idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/30'
                  } ${player.onStrike ? 'border-l-4 border-l-amber-400 bg-amber-500/5' : ''}`}
                >
                  {/* Real Cricket Role SVG Icon */}
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0" title={roleInfo.label}>
                    <img
                      src={roleInfo.rcIconUrl}
                      alt={roleInfo.label}
                      className="w-4 h-4 object-contain brightness-200"
                    />
                  </div>

                  {/* Player Name */}
                  <div className="font-black text-sm md:text-base uppercase tracking-wider text-slate-200 truncate flex items-center gap-2">
                    <span>{player.name}</span>
                    {player.onStrike && (
                      <span className="text-amber-400 text-xs">★</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="text-right text-xs md:text-sm font-semibold uppercase tracking-wider min-w-[90px] pr-4">
                    {player.status ? (
                      <span
                        className={
                          player.status === 'NOT OUT'
                            ? 'text-slate-200 font-bold'
                            : 'text-rose-400'
                        }
                      >
                        {player.status}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </div>

                  {/* Runs */}
                  <div className="w-16 text-right font-black text-base md:text-lg text-slate-100 tabular-nums">
                    {player.runs !== undefined ? player.runs : ''}
                  </div>

                  {/* Balls */}
                  <div className="w-16 text-right font-semibold text-sm md:text-base text-slate-300 tabular-nums pr-2">
                    {player.balls !== undefined ? player.balls : ''}
                  </div>
                </div>
              );
            })
          ) : (
            /* Bowling Scorecard Table */
            <div className="flex flex-col">
              {/* Bowling Table Header */}
              <div className="grid grid-cols-[auto_1fr_repeat(5,80px)] items-center gap-3 px-6 py-2 bg-slate-800/70 border-b border-slate-700/60 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                <div className="w-5" />
                <div>Bowler</div>
                <div className="text-right">O</div>
                <div className="text-right">M</div>
                <div className="text-right">R</div>
                <div className="text-right">W</div>
                <div className="text-right pr-2">Econ</div>
              </div>

              {bowlingList.map((bowler, idx) => {
                const roleKey = playerRoles[bowler.name];
                const roleInfo = roleKey ? PLAYER_ROLES[roleKey] : PLAYER_ROLES.baller;

                return (
                  <div
                    key={idx}
                    className={`grid grid-cols-[auto_1fr_repeat(5,80px)] items-center gap-3 px-6 py-3 transition-colors ${
                      idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/30'
                    } ${bowler.isActive ? 'border-l-4 border-l-sky-400 bg-sky-500/5' : ''}`}
                  >
                    {/* Role Icon */}
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0" title={roleInfo.label}>
                      <img
                        src={roleInfo.rcIconUrl}
                        alt={roleInfo.label}
                        className="w-4 h-4 object-contain brightness-200"
                      />
                    </div>

                    {/* Name */}
                    <div className="font-black text-sm md:text-base uppercase tracking-wider text-slate-200 truncate flex items-center gap-2">
                      <span>{bowler.name}</span>
                      {bowler.isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40">
                          BOWLING
                        </span>
                      )}
                    </div>

                    {/* O, M, R, W, Econ */}
                    <div className="text-right font-semibold text-sm text-slate-200 tabular-nums">
                      {bowler.overs}
                    </div>
                    <div className="text-right font-semibold text-sm text-slate-400 tabular-nums">
                      {bowler.maidens}
                    </div>
                    <div className="text-right font-semibold text-sm text-slate-200 tabular-nums">
                      {bowler.runs}
                    </div>
                    <div className="text-right font-black text-lg text-rose-500 tabular-nums">
                      {bowler.wickets}
                    </div>
                    <div className="text-right font-semibold text-sm text-slate-300 tabular-nums pr-2">
                      {bowler.economy}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Real Cricket Stats Bar */}
        <div className="grid grid-cols-[1fr_1fr_1.2fr] items-center bg-slate-950/90 border-t border-slate-700/80 px-6 py-3.5">
          {/* Extras */}
          <div className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-400">
            Extras: <span className="text-slate-100">{extras}</span>
          </div>

          {/* Overs */}
          <div className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-400 text-center">
            Overs: <span className="text-slate-100">{totalOvers}</span>
          </div>

          {/* Total (Real Cricket style blue highlighted block) */}
          <div className="flex justify-end">
            <div className="px-6 py-2 rounded-xl bg-gradient-to-r from-sky-700 to-sky-600 text-white font-black text-sm md:text-base tracking-widest uppercase shadow-lg shadow-sky-600/30 flex items-center gap-2">
              <span>Total:</span>
              <span className="text-lg md:text-xl text-amber-300 tabular-nums">
                {totalRuns}-{totalWickets}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Bar: Back Button */}
      {onClose && (
        <div className="relative z-10 flex items-center justify-between pt-4">
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 flex items-center justify-center shadow-2xl transition-all hover:scale-105 cursor-pointer text-xl"
            title="Return to Live Scoreboard"
          >
            ⮌
          </button>
          <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
            Press &quot;S&quot; or click ⮌ to return to Crease Display
          </span>
        </div>
      )}
    </div>
  );
};
