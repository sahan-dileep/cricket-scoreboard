'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ScoreData, Batsman, Bowler, BrandingConfig, DEFAULT_BRANDING, TeamData, PlayerRole, PLAYER_ROLES } from '@/types/cricket';
import { ConnectionModal } from '@/components/ConnectionModal';
import AnalogWatch from '@/components/AnalogWatch';
import TossOverlay from '@/components/TossOverlay';
import TeamsPresentationOverlay from '@/components/TeamsPresentationOverlay';
import BowlerSpotlightOverlay from '@/components/BowlerSpotlightOverlay';

// Authentic default data matching the Australian Stadium LED Scoreboard photo
const PHOTO_DEMO_SCORE: ScoreData = {
  match: {
    team1: 'AUSTRALIA',
    team2: 'SOUTH AFRICA',
    totalOvers: 50,
    status: 'INNINGS_1',
    isCompleted: false,
    result: null,
  },
  currentInnings: {
    battingTeam: 'AUSTRALIA',
    score: 431,
    wickets: 2,
    overs: '50.0',
    runRate: 8.62,
    extras: 21,
    requiredRuns: null,
    requiredOvers: null,
    requiredRunRate: null,
    currentBowler: {
      name: 'MULDER',
      overs: 7,
      runs: 93,
      wickets: 0,
      economy: 13.28,
    },
    batsmen: [
      {
        name: 'Head',
        runs: 142,
        balls: 103,
        fours: 16,
        sixes: 6,
        onStrike: false,
        isOut: true,
        dismissalInfo: 'c Brevis b Maharaj',
      },
      {
        name: 'Marsh',
        runs: 100,
        balls: 106,
        fours: 8,
        sixes: 4,
        onStrike: false,
        isOut: true,
        dismissalInfo: 'c Rickelton b Muthusamy',
      },
      {
        name: 'Green',
        runs: 118,
        balls: 55,
        fours: 10,
        sixes: 7,
        onStrike: true,
        isStriker: true,
        isOut: false,
        dismissalInfo: 'not out',
      },
      {
        name: 'Carey',
        runs: 50,
        balls: 37,
        fours: 5,
        sixes: 1,
        onStrike: false,
        isStriker: false,
        isOut: false,
        dismissalInfo: 'not out',
      },
    ],
  },
};

const DEFAULT_LINEUP_AUS = [
  'Head',
  'Marsh',
  'Green',
  'Carey',
  'Labuschagne',
  'Inglis',
  'Connolly',
  'Bartlett',
  'Abbott',
  'Ellis',
  'Zampa',
];

export default function StadiumLedScoreboard() {
  const [androidIp, setAndroidIp] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [connStatus, setConnStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [scoreData, setScoreData] = useState<ScoreData>(PHOTO_DEMO_SCORE);
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [scoreFormat, setScoreFormat] = useState<'W-R' | 'R-W'>('W-R'); // Default 'W-R' e.g. 2-431
  const [hasLiveConnection, setHasLiveConnection] = useState<boolean>(false);
  const [activeOverlay, setActiveOverlay] = useState<'toss' | 'teams' | 'bowler' | null>(null);
  const lastHandledCommandKey = useRef<string | null>(null);
  const scoreCardRef = useRef<HTMLDivElement>(null);
  const [scoreCardHeight, setScoreCardHeight] = useState<number | null>(null);

  // Sync clock card size to the exact rendered height of the score card
  useEffect(() => {
    if (!scoreCardRef.current) return;
    const updateHeight = () => {
      if (scoreCardRef.current) {
        setScoreCardHeight(scoreCardRef.current.offsetHeight);
      }
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(scoreCardRef.current);
    return () => ro.disconnect();
  }, []);

  const handleIncomingCommand = (action: string, cmdId?: string, timestamp?: number) => {
    const commandKey = `${cmdId || ''}_${action}_${timestamp || ''}`;
    if (commandKey && commandKey === lastHandledCommandKey.current) {
      return;
    }
    lastHandledCommandKey.current = commandKey;

    if (action === 'SHOW_TOSS') {
      setActiveOverlay('toss');
    } else if (action === 'SHOW_TEAMS') {
      setActiveOverlay('teams');
    } else if (action === 'SHOW_BOWLER') {
      setActiveOverlay('bowler');
    } else if (action === 'CLEAR_OVERLAY') {
      setActiveOverlay(null);
    }
  };

  const handleDismissOverlay = useCallback(() => {
    setActiveOverlay(null);
    try {
      const payload = { action: 'CLEAR_OVERLAY', timestamp: Date.now() };
      localStorage.setItem('cricket_admin_command', JSON.stringify(payload));
      window.dispatchEvent(new Event('storage'));
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('cricket_broadcast');
        bc.postMessage(payload);
        bc.close();
      }
    } catch {}
  }, []);

  // Keyboard navigation & hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (activeOverlay !== null && (e.key === 'Escape' || e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        e.stopPropagation();
        handleDismissOverlay();
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        setIsModalOpen(true);
      } else if (e.key === 't' || e.key === 'T') {
        setScoreFormat((prev) => (prev === 'W-R' ? 'R-W' : 'W-R'));
      } else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.key === 'a' || e.key === 'A') {
        window.location.href = '/admin';
      } else if (e.key === 'b' || e.key === 'B' || e.key === 'Escape') {
        window.location.href = '/';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeOverlay]);

  // Dual-channel sync: BroadcastChannel and window storage events
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('cricket_broadcast');
        bc.onmessage = (event) => {
          const data = event.data;
          if (data && (data.action || data.type)) {
            handleIncomingCommand(
              (data.action || data.type) as string,
              data.id,
              data.timestamp
            );
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'cricket_admin_command' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && (parsed.action || parsed.type)) {
            handleIncomingCommand(
              (parsed.action || parsed.type) as string,
              parsed.id,
              parsed.timestamp
            );
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Load IP and branding from localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      const savedIp = localStorage.getItem('cricket_android_ip');
      if (savedIp) {
        setAndroidIp(savedIp);
      }

      // Branding
      try {
        const savedBranding = localStorage.getItem('cricket_branding_config');
        if (savedBranding) {
          setBranding(JSON.parse(savedBranding));
        }
      } catch {}

      // Teams cache
      try {
        const cachedTeams = localStorage.getItem('cricket_teams_cache');
        if (cachedTeams) {
          setTeams(JSON.parse(cachedTeams));
        }
      } catch {}
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // 2s polling loop with Android Scorer
  useEffect(() => {
    if (!androidIp) return;
    let isSubscribed = true;

    const fetchScore = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);

        const res = await fetch(`http://${androidIp}:8080/api/score`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data: ScoreData = await res.json();

        if (isSubscribed) {
          setConnStatus('connected');
          setHasLiveConnection(true);
          setScoreData(data);
          if (data.adminCommand) {
            const cmd = data.adminCommand;
            const act = cmd.action || cmd.type;
            if (act) {
              handleIncomingCommand(act, cmd.id, cmd.timestamp);
            }
          }
        }
      } catch {
        if (isSubscribed) {
          setConnStatus('disconnected');
        }
      }
    };

    fetchScore();
    const interval = setInterval(fetchScore, 2000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [androidIp]);

  const handleConnect = (ip: string) => {
    setAndroidIp(ip);
    localStorage.setItem('cricket_android_ip', ip);
    setIsModalOpen(false);
  };

  const match = scoreData.match;
  const currentInnings = scoreData.currentInnings;

  // Player skill role lookup
  const getPlayerRole = (name: string): PlayerRole => {
    if (!name) return 'batting';
    const trimmed = name.trim();
    if (branding?.playerRoles && branding.playerRoles[trimmed]) {
      return branding.playerRoles[trimmed];
    }
    if (branding?.playerRoles) {
      const foundKey = Object.keys(branding.playerRoles).find(
        (k) => k.toLowerCase().trim() === trimmed.toLowerCase()
      );
      if (foundKey) return branding.playerRoles[foundKey];
    }
    const DEFAULT_ROLES_MAP: Record<string, PlayerRole> = {
      head: 'batting',
      marsh: 'all_rounder',
      green: 'all_rounder',
      carey: 'wicket_keeper',
      labuschagne: 'batting',
      inglis: 'wicket_keeper',
      connolly: 'all_rounder',
      bartlett: 'baller',
      abbott: 'baller',
      ellis: 'baller',
      zampa: 'baller',
      mulder: 'all_rounder',
    };
    return DEFAULT_ROLES_MAP[trimmed.toLowerCase()] || 'batting';
  };

  // Batting team name
  const battingTeamName = currentInnings?.battingTeam || match?.team1 || 'AUSTRALIA';
  const totalOvers = match?.totalOvers || 50;

  // Score display strings
  const scoreNum = currentInnings?.score ?? 0;
  const wicketsNum = currentInnings?.wickets ?? 0;
  const scoreFormatted =
    scoreFormat === 'W-R'
      ? `${wicketsNum}-${scoreNum}` // Photo style: 2-431
      : `${scoreNum}/${wicketsNum}`; // Traditional style: 431/2

  // Overs bowled parse
  const oversStr = currentInnings?.overs ? String(currentInnings.overs) : '0.0';
  const [overMajorStr, overBallsStr] = oversStr.split('.');
  const oversCompleted = parseInt(overMajorStr || '0', 10);
  const ballsInCurrentOver = parseInt(overBallsStr || '0', 10);
  const totalBallsBowled = oversCompleted * 6 + ballsInCurrentOver;
  const totalQuotaBalls = totalOvers * 6;
  const ballsRemaining = Math.max(0, totalQuotaBalls - totalBallsBowled);

  // Run Rate
  const runRateVal = currentInnings?.runRate
    ? Number(currentInnings.runRate).toFixed(2)
    : totalBallsBowled > 0
    ? ((scoreNum / totalBallsBowled) * 6).toFixed(2)
    : '0.00';

  // Projected Score or Target
  const isInnings2 = match?.status === 'INNINGS_2' || currentInnings?.innings === 2;
  const projectedScore = useMemo(() => {
    if (isInnings2) {
      return currentInnings?.requiredRuns != null
        ? String(currentInnings.requiredRuns)
        : currentInnings?.requiredRunRate != null
        ? currentInnings.requiredRunRate.toFixed(2)
        : '—';
    }
    const rr = parseFloat(runRateVal);
    if (!rr || rr <= 0) return scoreNum > 0 ? String(scoreNum) : '—';
    // If 50 overs already finished, project current score
    if (ballsRemaining === 0) return String(scoreNum);
    const proj = Math.round(scoreNum + (rr * ballsRemaining) / 6);
    return String(proj);
  }, [isInnings2, currentInnings, runRateVal, scoreNum, ballsRemaining]);

  // Build the 11-player batting card
  const fullBattingLineup = useMemo(() => {
    const recordedBatsmen = currentInnings?.batsmen || [];
    const recordedNames = new Set(recordedBatsmen.map((b) => b.name.toLowerCase().trim()));

    // Try to find full team roster from cached teams
    const currentTeam = teams.find(
      (t) => t.name.toLowerCase().trim() === battingTeamName.toLowerCase().trim()
    );

    let rosterPlayerNames: string[] = [];
    if (currentTeam?.players && currentTeam.players.length > 0) {
      rosterPlayerNames = currentTeam.players;
    } else if (!hasLiveConnection) {
      rosterPlayerNames = DEFAULT_LINEUP_AUS;
    } else {
      // Use recorded plus placeholders if under 11
      rosterPlayerNames = recordedBatsmen.map((b) => b.name);
    }

    // Build ordered list of 11 players
    const fullList: Array<{
      name: string;
      dismissal: string;
      runs: number | null;
      balls: number | null;
      isCurrentlyBatting: boolean;
      hasBatted: boolean;
    }> = [];

    // First add recorded batsmen in order
    recordedBatsmen.forEach((b) => {
      const isNotOut = !b.isOut;
      const isCurrentlyBatting = isNotOut;
      fullList.push({
        name: b.name,
        dismissal: isNotOut ? 'not out' : b.dismissalInfo || 'out',
        runs: b.runs,
        balls: b.balls,
        isCurrentlyBatting,
        hasBatted: true,
      });
    });

    // Then append players from roster who haven't batted yet
    rosterPlayerNames.forEach((name) => {
      if (!recordedNames.has(name.toLowerCase().trim()) && fullList.length < 11) {
        fullList.push({
          name,
          dismissal: '',
          runs: null,
          balls: null,
          isCurrentlyBatting: false,
          hasBatted: false,
        });
      }
    });

    // Fill up to 11 if still fewer
    while (fullList.length < 11) {
      fullList.push({
        name: `Player ${fullList.length + 1}`,
        dismissal: '',
        runs: null,
        balls: null,
        isCurrentlyBatting: false,
        hasBatted: false,
      });
    }

    return fullList.slice(0, 11);
  }, [currentInnings?.batsmen, teams, battingTeamName, hasLiveConnection]);

  // Active batsmen at crease
  const activeBatsmen = useMemo(() => {
    const batsmen = currentInnings?.batsmen || [];
    const notOut = batsmen.filter((b) => !b.isOut);
    if (notOut.length > 0) return notOut.slice(0, 2);
    return batsmen.slice(-2);
  }, [currentInnings?.batsmen]);

  const striker = activeBatsmen.find((b) => b.onStrike || b.isStriker) || activeBatsmen[0];
  const nonStriker = activeBatsmen.find((b) => b !== striker) || activeBatsmen[1];

  // Current Bowler
  const currentBowler = currentInnings?.currentBowler;

  // Team Data for overlays
  const team1Data = useMemo(() => {
    return teams.find(
      (t) => t.name.toLowerCase().trim() === match.team1.toLowerCase().trim()
    );
  }, [teams, match.team1]);

  const team2Data = useMemo(() => {
    return teams.find(
      (t) => t.name.toLowerCase().trim() === match.team2.toLowerCase().trim()
    );
  }, [teams, match.team2]);

  const bowlerTeamName = useMemo(() => {
    if (currentInnings?.bowlingTeam) return currentInnings.bowlingTeam;
    return currentInnings?.battingTeam?.toLowerCase() === match.team1.toLowerCase()
      ? match.team2
      : match.team1;
  }, [currentInnings?.bowlingTeam, currentInnings?.battingTeam, match.team1, match.team2]);

  const bowlerTeamLogo = useMemo(() => {
    if (!bowlerTeamName) return undefined;
    if (branding.teamLogos[bowlerTeamName]) return branding.teamLogos[bowlerTeamName];
    const matchKey = Object.keys(branding.teamLogos).find(
      (k) => k.toLowerCase().trim() === bowlerTeamName.toLowerCase().trim()
    );
    return matchKey ? branding.teamLogos[matchKey] : undefined;
  }, [branding.teamLogos, bowlerTeamName]);

  return (
    <div className="h-screen w-screen bg-[#020b0d] text-slate-100 flex items-center justify-center p-2 sm:p-4 overflow-hidden select-none font-sans">
      {/* Stadium Steel Outer Gantry / LED Bezel Frame */}
      <div className="relative w-full max-w-[1920px] aspect-[16/9] max-h-screen bg-[#03151a] border-[8px] sm:border-[12px] md:border-[16px] border-[#0a232b] rounded-md shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden">
        
        {/* Active Broadcast Overlays */}
        {activeOverlay === 'toss' && (
          <TossOverlay
            matchTitle={match.matchTitle}
            tournamentName={branding.tournamentName}
            team1Name={match.team1}
            team2Name={match.team2}
            team1Logo={branding.teamLogos[match.team1]}
            team2Logo={branding.teamLogos[match.team2]}
            tossWinner={match.toss?.winner || match.tossWinner || currentInnings?.battingTeam || match.team1}
            tossDecision={match.toss?.decision || match.tossDecision}
            tossChoice={match.toss?.choice || match.tossChoice}
            onDismiss={handleDismissOverlay}
          />
        )}

        {activeOverlay === 'teams' && (
          <TeamsPresentationOverlay
            matchTitle={match.matchTitle}
            tournamentName={branding.tournamentName}
            tournamentLogo={branding.tournamentLogo}
            team1Name={match.team1}
            team2Name={match.team2}
            team1Logo={branding.teamLogos[match.team1]}
            team2Logo={branding.teamLogos[match.team2]}
            team1Captain={team1Data?.captain}
            team2Captain={team2Data?.captain}
            team1Roster={team1Data?.players || (match.team1.toLowerCase() === 'australia' ? DEFAULT_LINEUP_AUS : [])}
            team2Roster={team2Data?.players || []}
            playerRoles={branding.playerRoles}
            onDismiss={handleDismissOverlay}
          />
        )}

        {activeOverlay === 'bowler' && (
          <BowlerSpotlightOverlay
            bowler={currentBowler || { name: 'BOWLER', overs: 0, maidens: 0, runs: 0, wickets: 0, economy: '0.00' }}
            teamName={bowlerTeamName}
            teamLogo={bowlerTeamLogo}
            playerPhoto={currentBowler ? branding.playerPhotos[currentBowler.name] : undefined}
            playerRole={currentBowler ? getPlayerRole(currentBowler.name) : 'baller'}
            onDismiss={handleDismissOverlay}
          />
        )}

        {/* LED Matrix Screen Surface with angled shard background */}
        <div
          className="relative flex-1 flex flex-col p-4 sm:p-6 md:p-8"
          style={{
            background:
              'linear-gradient(118deg, #093945 0%, #072a33 46%, #052128 46.5%, #03181e 100%)',
          }}
        >
          {/* Subtle LED Mesh Scanline Pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)',
              backgroundSize: '4px 4px',
            }}
          />

          {/* ════════════════ TOP HEADER BAR ════════════════ */}
          <div className="relative z-10 flex items-center justify-between pb-3 sm:pb-4 border-b-2 border-[#09414f]">
            {/* Team Name & Overs Badge */}
            <div className="flex items-center gap-3 sm:gap-6">
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-['Barlow_Condensed',sans-serif] font-black uppercase tracking-tight text-[#d4fc04] drop-shadow-[0_2px_10px_rgba(212,252,4,0.3)]">
                {battingTeamName}
              </h1>

              {/* Highlighted Overs Badge with large text size */}
              <div className="px-3 sm:px-5 py-1 sm:py-2 rounded-xl bg-[#d4fc04] text-[#032026] border-2 border-[#e6ff40] shadow-[0_0_25px_rgba(212,252,4,0.4)] flex items-baseline gap-2">
                <span className="text-xs sm:text-sm md:text-base font-black uppercase tracking-wider text-[#032026]/75">
                  OVERS
                </span>
                <span className="text-2xl sm:text-4xl md:text-5xl font-['Barlow_Condensed',sans-serif] font-black tracking-tight leading-none">
                  {oversStr}
                  <span className="text-base sm:text-2xl md:text-3xl font-bold opacity-75 ml-1">
                    /{totalOvers}
                  </span>
                </span>
              </div>
            </div>

            {/* Giant Top Score Figure Highlighted with large text size (No glow) */}
            <div className="flex items-center gap-4 sm:gap-8">
              <div
                ref={scoreCardRef}
                className="px-5 sm:px-8 py-1.5 sm:py-2 rounded-2xl bg-[#021820] border-2 border-[#165a6b] flex items-center"
              >
                <span className="text-6xl sm:text-8xl md:text-9xl lg:text-[10.5rem] xl:text-[11.5rem] font-['Barlow_Condensed',sans-serif] font-black tracking-tight text-white leading-none">
                  {scoreFormatted}
                </span>
              </div>

              {/* Analog Stadium Watch (Matches exact height of the score card) */}
              <div
                style={
                  scoreCardHeight
                    ? { height: `${scoreCardHeight}px`, width: `${scoreCardHeight}px` }
                    : undefined
                }
                className={`p-1.5 sm:p-2.5 rounded-2xl bg-[#021820] border-2 border-[#165a6b] shadow-xl flex items-center justify-center shrink-0 ${
                  !scoreCardHeight ? 'w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36' : ''
                }`}
              >
                <AnalogWatch className="w-full h-full" />
              </div>
            </div>
          </div>

          {/* ════════════════ MAIN BODY: 2 COLUMNS ════════════════ */}
          <div className="relative z-10 flex-1 grid grid-cols-12 gap-4 sm:gap-6 pt-3 sm:pt-4 min-h-0">
            
            {/* ── LEFT COLUMN: 11-MAN BATTING CARD & CREASE STRIP (9 cols) ── */}
            <div className="col-span-9 flex flex-col justify-between min-h-0">
              
              {/* Batting Card Roster (11 Rows) with Player Skill Icons */}
              <div className="flex flex-col gap-1 sm:gap-1.5 flex-1 justify-around min-h-0 pr-2">
                {fullBattingLineup.map((player, idx) => {
                  const isHighlighted = player.isCurrentlyBatting;
                  const roleKey = getPlayerRole(player.name);
                  const roleInfo = PLAYER_ROLES[roleKey];

                  return (
                    <div
                      key={idx}
                      className={`relative flex items-center justify-between px-3 sm:px-4 py-0.5 sm:py-1 rounded transition-all ${
                        isHighlighted
                          ? 'bg-[#d4fc04] text-[#032026] ring-1 ring-[#e6ff40]'
                          : 'text-white/90 hover:bg-white/5'
                      }`}
                    >
                      {/* Left: Player Skill SVG Icon & Name */}
                      <div className="flex items-center gap-2 sm:gap-2.5 w-48 sm:w-60 md:w-72 truncate">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg p-1 shrink-0 ${
                            isHighlighted
                              ? 'bg-[#032026] border border-[#093e4c]'
                              : 'bg-[#021b22] border border-[#0e4857]'
                          }`}
                          title={`Skill: ${roleInfo.label}`}
                        >
                          <img
                            src={roleInfo.rcIconUrl}
                            alt={roleInfo.label}
                            className="w-full h-full object-contain"
                          />
                        </span>
                        <span
                          className={`text-lg sm:text-2xl md:text-3xl font-['Barlow_Condensed',sans-serif] uppercase tracking-tight truncate ${
                            isHighlighted ? 'font-black text-[#032026]' : 'font-bold text-white'
                          }`}
                        >
                          {player.name}
                        </span>
                      </div>

                      {/* Center: Dismissal Description */}
                      <span
                        className={`flex-1 text-center text-sm sm:text-lg md:text-xl font-['Barlow_Condensed',sans-serif] tracking-wide truncate px-2 ${
                          isHighlighted
                            ? 'font-black text-[#032026]'
                            : 'font-semibold text-slate-300/80 italic'
                        }`}
                      >
                        {player.dismissal}
                      </span>

                      {/* Right: Score (Runs and Balls) */}
                      <span
                        className={`w-28 sm:w-36 text-right text-lg sm:text-2xl md:text-3xl font-['Barlow_Condensed',sans-serif] tabular-nums ${
                          isHighlighted ? 'font-black text-[#032026]' : 'font-black text-white'
                        }`}
                      >
                        {player.hasBatted && player.runs != null ? (
                          <>
                            <span>{player.runs}</span>
                            <span
                              className={`text-sm sm:text-lg md:text-xl ml-1.5 ${
                                isHighlighted ? 'text-[#032026]/80 font-bold' : 'text-slate-300 font-semibold'
                              }`}
                            >
                              ({player.balls ?? 0})
                            </span>
                          </>
                        ) : null}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Extras Pill (Bottom Right of batting list) */}
              <div className="flex justify-end pt-2">
                <div className="px-4 py-1 rounded bg-[#d4fc04] text-[#032026] font-['Barlow_Condensed',sans-serif] font-black uppercase text-base sm:text-xl md:text-2xl tracking-wider">
                  EXTRAS {currentInnings?.extras ?? 21}
                </div>
              </div>

              {/* ── BOTTOM STRIP: MATCH CREASE & BOWLER ── */}
              <div className="pt-2 sm:pt-3 border-t-2 border-[#09414f] grid grid-cols-12 gap-3 sm:gap-4 items-center">
                
                {/* Wickets & Overs Box (3 cols - No score glow, icon removed) */}
                <div className="col-span-3 flex flex-col justify-center bg-[#021820] p-2.5 sm:p-3.5 rounded-xl border-2 border-[#145d70]">
                  <div className="text-4xl sm:text-6xl md:text-7xl font-['Barlow_Condensed',sans-serif] font-black text-[#d4fc04] leading-none tracking-tight">
                    {scoreFormatted}
                  </div>
                  <div className="text-sm sm:text-lg md:text-xl font-['Barlow_Condensed',sans-serif] font-black uppercase tracking-wider text-white leading-tight mt-1 flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded bg-[#093c4a] border border-[#145c6e] text-white">
                      {oversStr} OVERS
                    </span>
                  </div>
                </div>

                {/* Active Batsmen Box (5 cols) with Skill SVG Icons */}
                <div className="col-span-5 bg-[#03181f]/80 p-2 sm:p-3 rounded-lg border border-[#0e4857] flex flex-col justify-center gap-1">
                  {/* Batsman 1 (Striker) */}
                  <div className="flex items-center justify-between text-base sm:text-xl md:text-2xl font-['Barlow_Condensed',sans-serif] font-black">
                    <span className="text-white flex items-center gap-2 truncate">
                      <span className="text-[#d4fc04] font-bold">/</span>
                      <span
                        className="w-5 h-5 sm:w-6 sm:h-6 p-0.5 rounded bg-[#021922] border border-[#0d4654] inline-flex items-center justify-center shrink-0"
                        title={PLAYER_ROLES[getPlayerRole(striker?.name || '')].label}
                      >
                        <img
                          src={PLAYER_ROLES[getPlayerRole(striker?.name || '')].rcIconUrl}
                          alt={PLAYER_ROLES[getPlayerRole(striker?.name || '')].label}
                          className="w-full h-full object-contain"
                        />
                      </span>
                      <span className="uppercase">{striker?.name || 'GREEN'}</span>
                    </span>
                    <span className="text-[#d4fc04] tabular-nums font-black ml-2">
                      {striker?.runs ?? 118}{' '}
                      <span className="text-slate-300 text-xs sm:text-base font-bold">
                        {striker?.balls ?? 55}
                      </span>
                    </span>
                  </div>

                  {/* Batsman 2 (Non-Striker) */}
                  <div className="flex items-center justify-between text-base sm:text-xl md:text-2xl font-['Barlow_Condensed',sans-serif] font-bold">
                    <span className="text-slate-300 flex items-center gap-2 truncate">
                      <span
                        className="w-5 h-5 sm:w-6 sm:h-6 p-0.5 rounded bg-[#021922] border border-[#0d4654] inline-flex items-center justify-center shrink-0"
                        title={PLAYER_ROLES[getPlayerRole(nonStriker?.name || '')].label}
                      >
                        <img
                          src={PLAYER_ROLES[getPlayerRole(nonStriker?.name || '')].rcIconUrl}
                          alt={PLAYER_ROLES[getPlayerRole(nonStriker?.name || '')].label}
                          className="w-full h-full object-contain"
                        />
                      </span>
                      <span className="uppercase">{nonStriker?.name || 'CAREY'}</span>
                    </span>
                    <span className="text-white tabular-nums font-black ml-2">
                      {nonStriker?.runs ?? 50}{' '}
                      <span className="text-slate-300 text-xs sm:text-base font-semibold">
                        {nonStriker?.balls ?? 37}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Current Bowler Box (4 cols) with Skill SVG Icon */}
                <div className="col-span-4 bg-[#03181f]/80 p-2 sm:p-3 rounded-lg border border-[#0e4857] flex flex-col justify-center">
                  <div className="text-xs sm:text-sm font-['Barlow_Condensed',sans-serif] font-bold uppercase tracking-wider text-slate-400">
                    BOWLER
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg sm:text-2xl md:text-3xl font-['Barlow_Condensed',sans-serif] font-black uppercase text-white truncate flex items-center gap-2">
                      <span
                        className="w-5 h-5 sm:w-6 sm:h-6 p-0.5 rounded bg-[#021922] border border-[#0d4654] inline-flex items-center justify-center shrink-0"
                        title={PLAYER_ROLES[getPlayerRole(currentBowler?.name || 'MULDER')].label}
                      >
                        <img
                          src={PLAYER_ROLES[getPlayerRole(currentBowler?.name || 'MULDER')].rcIconUrl}
                          alt={PLAYER_ROLES[getPlayerRole(currentBowler?.name || 'MULDER')].label}
                          className="w-full h-full object-contain"
                        />
                      </span>
                      <span>{currentBowler?.name || 'MULDER'}</span>
                    </span>
                    <span className="text-xl sm:text-3xl font-['Barlow_Condensed',sans-serif] font-black text-[#d4fc04] tabular-nums ml-2">
                      {currentBowler?.wickets ?? 0}-{currentBowler?.runs ?? 93}{' '}
                      <span className="text-slate-300 text-xs sm:text-lg font-bold">
                        {currentBowler?.overs ?? 7}
                      </span>
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* ── RIGHT COLUMN: MATCH RATES & METRICS (3 cols) ── */}
            <div className="col-span-3 bg-[#031920]/95 border-2 border-[#09414f] rounded-xl p-3 sm:p-5 flex flex-col justify-between shadow-2xl">
              
              {/* Metric 1: Run Rate (RR) */}
              <div className="flex-1 flex flex-col items-center justify-center py-2 sm:py-3 border-b-2 border-[#0d4654]">
                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[7.5rem] 2xl:text-[8.5rem] font-['Barlow_Condensed',sans-serif] font-black text-white tracking-tight leading-none tabular-nums">
                  {runRateVal}
                </span>
                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-['Barlow_Condensed',sans-serif] font-black uppercase tracking-wider text-white mt-1 sm:mt-2">
                  RR
                </span>
              </div>

              {/* Metric 2: Projected Score (Proj.) or Target */}
              <div className="flex-1 flex flex-col items-center justify-center py-2 sm:py-3 border-b-2 border-[#0d4654]">
                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[7.5rem] 2xl:text-[8.5rem] font-['Barlow_Condensed',sans-serif] font-black text-white tracking-tight leading-none tabular-nums">
                  {projectedScore}
                </span>
                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-['Barlow_Condensed',sans-serif] font-black tracking-wider text-white mt-1 sm:mt-2">
                  {isInnings2 ? 'TARGET' : 'Proj.'}
                </span>
              </div>

              {/* Metric 3: Balls Remaining */}
              <div className="flex-1 flex flex-col items-center justify-center py-2 sm:py-3">
                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[7.5rem] 2xl:text-[8.5rem] font-['Barlow_Condensed',sans-serif] font-black text-white tracking-tight leading-none tabular-nums">
                  {ballsRemaining}
                </span>
                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-['Barlow_Condensed',sans-serif] font-black tracking-wider text-white mt-1 sm:mt-2">
                  Balls Rem
                </span>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* Hidden Connection Modal (Triggerable via 'C' hotkey) */}
      <ConnectionModal
        isOpen={isModalOpen}
        initialIp={androidIp}
        onConnect={handleConnect}
      />
    </div>
  );
}
