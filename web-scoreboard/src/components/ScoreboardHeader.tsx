'use strict';
import React from 'react';
import { MatchInfo, CurrentInnings, BrandingConfig } from '@/types/cricket';

interface Props {
  match: MatchInfo;
  currentInnings: CurrentInnings;
  scoreFlash: boolean;
  branding?: BrandingConfig;
}

export const ScoreboardHeader: React.FC<Props> = ({ match, currentInnings, scoreFlash, branding }) => {
  const isMatchCompleted = Boolean(match.isCompleted || match.status === 'COMPLETED');
  const isInnings1 = !isMatchCompleted && (match.status === 'INNINGS_1' || currentInnings.innings === 1 || match.currentInnings === 1);
  const isTeam1Batting = !isMatchCompleted && currentInnings.battingTeam === match.team1;
  const isTeam2Batting = !isMatchCompleted && (currentInnings.battingTeam === match.team2 || (!isTeam1Batting && !isInnings1));

  let team1Score = '—';
  let team1Overs = '';
  let team2Score = '—';
  let team2Overs = '';

  if (isInnings1) {
    if (isTeam1Batting) {
      team1Score = `${currentInnings.score}/${currentInnings.wickets}`;
      team1Overs = `(${currentInnings.overs} ov)`;
      team2Score = '—';
      team2Overs = 'Yet to bat';
    } else {
      team2Score = `${currentInnings.score}/${currentInnings.wickets}`;
      team2Overs = `(${currentInnings.overs} ov)`;
      team1Score = '—';
      team1Overs = 'Yet to bat';
    }
  } else if (!isMatchCompleted) {
    if (isTeam1Batting) {
      team1Score = `${currentInnings.score}/${currentInnings.wickets}`;
      team1Overs = `(${currentInnings.overs} ov)`;
      team2Score = match.innings1 ? `${match.innings1.score}/${match.innings1.wickets}` : '—';
      team2Overs = match.innings1 ? `(${match.innings1.overs} ov)` : '';
    } else {
      team2Score = `${currentInnings.score}/${currentInnings.wickets}`;
      team2Overs = `(${currentInnings.overs} ov)`;
      team1Score = match.innings1 ? `${match.innings1.score}/${match.innings1.wickets}` : '—';
      team1Overs = match.innings1 ? `(${match.innings1.overs} ov)` : '';
    }
  } else {
    team1Score = match.innings1 ? `${match.innings1.score}/${match.innings1.wickets}` : '—';
    team1Overs = match.innings1 ? `(${match.innings1.overs} ov)` : '';
    team2Score = match.innings2
      ? `${match.innings2.score}/${match.innings2.wickets}`
      : currentInnings.battingTeam === match.team2
      ? `${currentInnings.score}/${currentInnings.wickets}`
      : '—';
    team2Overs = match.innings2
      ? `(${match.innings2.overs} ov)`
      : currentInnings.battingTeam === match.team2
      ? `(${currentInnings.overs} ov)`
      : '';
  }

  const team1LogoSrc =
    branding?.teamLogos?.[match.team1] || '/assets/branding/tech-titans-logo.svg';
  const team2LogoSrc =
    branding?.teamLogos?.[match.team2] || '/assets/branding/sales-strikers-logo.svg';

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center bg-slate-900/90 border border-slate-700/80 rounded-2xl px-6 py-4 shadow-2xl backdrop-blur-md gap-4">
      {/* Team 1 */}
      <div className="flex flex-col">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-800/80 border border-slate-700 overflow-hidden flex items-center justify-center shadow-lg flex-shrink-0 p-1">
            <img
              src={team1LogoSrc}
              alt={match.team1 || 'Team 1'}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl md:text-2xl font-black uppercase tracking-wider text-sky-400">
                {match.team1 || 'Team 1'}
              </span>
              {isTeam1Batting && (
                <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/40">
                  BATTING
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 font-medium">Team 1</span>
          </div>
        </div>
        <div
          className={`font-black tracking-tight mt-1 transition-all duration-300 ${
            isTeam1Batting ? 'text-5xl md:text-7xl lg:text-8xl text-amber-400' : 'text-3xl md:text-5xl text-slate-300'
          } ${isTeam1Batting && scoreFlash ? 'scale-105 text-emerald-400' : ''}`}
        >
          {team1Score}
        </div>
        {isTeam1Batting ? (
          <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 shadow-md">
            <span className="text-[11px] uppercase font-black text-amber-300/80 tracking-wider">OVERS:</span>
            <span className="text-base md:text-2xl font-black text-amber-300 tracking-wide">
              {currentInnings.overs} ov
            </span>
          </div>
        ) : (
          <span className="text-sm md:text-base text-slate-400 font-medium">{team1Overs}</span>
        )}
      </div>

      {/* Center VS & Branding */}
      <div className="flex flex-col items-center justify-center text-center px-2">
        <div className="flex items-center justify-center gap-3 mb-1">
          {branding?.companyLogo && (
            <img
              src={branding.companyLogo}
              alt="Company Logo"
              title={branding.companyName}
              className="h-8 md:h-9 w-auto max-w-[80px] object-contain rounded-md"
            />
          )}
          {branding?.tournamentLogo && (
            <img
              src={branding.tournamentLogo}
              alt="Tournament Logo"
              title={branding.tournamentName}
              className="h-9 w-9 md:h-10 md:w-10 object-contain rounded-full shadow-md"
            />
          )}
        </div>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[180px]">
          {branding?.tournamentName || 'Tournament'}
        </span>
        <span className="text-base font-black italic tracking-widest text-slate-500 my-0.5">VS</span>
        <span className="text-xs md:text-sm font-bold tracking-wider px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 animate-pulse">
          {match.status === 'IN_PROGRESS' || match.status === 'INNINGS_1' || match.status === 'INNINGS_2'
            ? '● LIVE'
            : match.status}
        </span>
      </div>

      {/* Team 2 */}
      <div className="flex flex-col items-end text-right">
        <div className="flex items-center gap-3 justify-end">
          <div>
            <div className="flex items-center gap-2 justify-end">
              {isTeam2Batting && (
                <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/40">
                  BATTING
                </span>
              )}
              <span className="text-xl md:text-2xl font-black uppercase tracking-wider text-sky-400">
                {match.team2 || 'Team 2'}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium">Team 2</span>
          </div>
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-800/80 border border-slate-700 overflow-hidden flex items-center justify-center shadow-lg flex-shrink-0 p-1">
            <img
              src={team2LogoSrc}
              alt={match.team2 || 'Team 2'}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        <div
          className={`font-black tracking-tight mt-1 transition-all duration-300 ${
            isTeam2Batting ? 'text-5xl md:text-7xl lg:text-8xl text-amber-400' : 'text-3xl md:text-5xl text-slate-300'
          } ${isTeam2Batting && scoreFlash ? 'scale-105 text-emerald-400' : ''}`}
        >
          {team2Score}
        </div>
        {isTeam2Batting ? (
          <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 shadow-md">
            <span className="text-[11px] uppercase font-black text-amber-300/80 tracking-wider">OVERS:</span>
            <span className="text-base md:text-2xl font-black text-amber-300 tracking-wide">
              {currentInnings.overs} ov
            </span>
          </div>
        ) : (
          <span className="text-sm md:text-base text-slate-400 font-medium">{team2Overs}</span>
        )}
      </div>
    </header>
  );
};
