'use strict';
import React from 'react';
import { MatchInfo, CurrentInnings } from '@/types/cricket';

interface Props {
  match: MatchInfo;
  currentInnings: CurrentInnings;
  scoreFlash: boolean;
}

export const ScoreboardHeader: React.FC<Props> = ({ match, currentInnings, scoreFlash }) => {
  const isMatchCompleted = Boolean(match.isCompleted || match.status === 'COMPLETED');
  const isInnings1 = !isMatchCompleted && (match.status === 'INNINGS_1' || currentInnings.innings === 1 || match.currentInnings === 1);
  const isTeam1Batting = !isMatchCompleted && currentInnings.battingTeam === match.team1;
  const isTeam2Batting = !isMatchCompleted && (currentInnings.battingTeam === match.team2 || (!isTeam1Batting && !isInnings1));

  let team1Score = '—';
  let team1Overs = '';
  let team2Score = '—';
  let team2Overs = '';

  if (isInnings1) {
    // In Innings 1: ONLY the batting team has a score.
    // The bowling team has NOT batted yet and must show "—" (Yet to bat).
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
    // In Innings 2: The chasing team shows live score.
    // The team that batted in Innings 1 shows their completed 1st innings score.
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
    // Completed Match:
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

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center bg-slate-900/90 border border-slate-700/80 rounded-2xl px-8 py-5 shadow-2xl backdrop-blur-md gap-6">
      {/* Team 1 */}
      <div className="flex flex-col">
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
        <div
          className={`text-4xl md:text-6xl font-black tracking-tight transition-all duration-300 ${
            isTeam1Batting ? 'text-amber-400' : 'text-slate-200'
          } ${isTeam1Batting && scoreFlash ? 'scale-105 text-emerald-400' : ''}`}
        >
          {team1Score}
        </div>
        <span className="text-sm md:text-base text-slate-400 font-medium">{team1Overs}</span>
      </div>

      {/* Center VS & Status */}
      <div className="flex flex-col items-center justify-center text-center">
        <span className="text-lg font-black italic tracking-widest text-slate-500">VS</span>
        <span className="mt-1 text-xs md:text-sm font-bold tracking-wider px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 animate-pulse">
          {match.status === 'IN_PROGRESS' || match.status === 'INNINGS_1' || match.status === 'INNINGS_2'
            ? '● LIVE'
            : match.status}
        </span>
      </div>

      {/* Team 2 */}
      <div className="flex flex-col items-end text-right">
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
        <div
          className={`text-4xl md:text-6xl font-black tracking-tight transition-all duration-300 ${
            isTeam2Batting ? 'text-amber-400' : 'text-slate-200'
          } ${isTeam2Batting && scoreFlash ? 'scale-105 text-emerald-400' : ''}`}
        >
          {team2Score}
        </div>
        <span className="text-sm md:text-base text-slate-400 font-medium">{team2Overs}</span>
      </div>
    </header>
  );
};
