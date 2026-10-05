'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ScoreData, AdminCommand, BrandingConfig, DEFAULT_BRANDING } from '@/types/cricket';
import { ScoreboardHeader } from '@/components/ScoreboardHeader';
import { BatsmenPanel } from '@/components/BatsmenPanel';
import { BowlerPanel } from '@/components/BowlerPanel';
import { PartnershipPanel } from '@/components/PartnershipPanel';
import { ChasePanel } from '@/components/ChasePanel';
import { RecentBalls } from '@/components/RecentBalls';
import { StatsFooter } from '@/components/StatsFooter';
import { SplitAdPanel } from '@/components/SplitAdPanel';
import { MusicBar } from '@/components/MusicBar';
import { ConnectionModal } from '@/components/ConnectionModal';
import { ResultBanner } from '@/components/ResultBanner';
import { RealCricketScorecard } from '@/components/RealCricketScorecard';

const DEFAULT_SCORE: ScoreData = {
  match: {
    team1: 'Tech Titans',
    team2: 'Sales Strikers',
    status: 'IN_PROGRESS',
    isCompleted: false,
    result: null,
  },
  currentInnings: {
    battingTeam: 'Tech Titans',
    score: 87,
    wickets: 3,
    overs: '12.4',
    runRate: 6.87,
    extras: 6,
    lastWicket: 'K. Perera 28 (19)',
    requiredRuns: 45,
    requiredOvers: 7.2,
    requiredRunRate: 6.14,
    batsmen: [
      {
        name: 'D. Mendis',
        runs: 38,
        balls: 24,
        fours: 4,
        sixes: 2,
        strikeRate: 158.3,
        onStrike: true,
      },
      {
        name: 'S. Fernando',
        runs: 15,
        balls: 12,
        fours: 1,
        sixes: 0,
        strikeRate: 125.0,
        onStrike: false,
      },
    ],
    currentBowler: {
      name: 'C. Asalanka',
      overs: '2.4',
      runs: 18,
      wickets: 1,
      economy: 6.75,
    },
    partnership: {
      runs: 28,
      balls: 19,
    },
    recentBalls: [
      {
        overNumber: 11,
        balls: [
          { label: '1' },
          { label: '4' },
          { label: '0' },
          { label: '1' },
          { label: 'W' },
          { label: '0' },
        ],
      },
      {
        overNumber: 12,
        balls: [
          { label: '6' },
          { label: '1' },
          { label: '2' },
          { label: '0', isNew: true },
        ],
      },
    ],
  },
};

export default function ScoreboardPage() {
  const [androidIp, setAndroidIp] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [connStatus, setConnStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [scoreData, setScoreData] = useState<ScoreData>(DEFAULT_SCORE);
  const [scoreFlash, setScoreFlash] = useState<boolean>(false);
  const [resultDismissed, setResultDismissed] = useState<boolean>(false);
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [viewMode, setViewMode] = useState<'crease' | 'broadcast_scorecard'>('crease');

  // Ad State (Split screen)
  const [adActive, setAdActive] = useState<boolean>(false);
  const [adType, setAdType] = useState<'video' | 'image' | null>(null);
  const [adSrc, setAdSrc] = useState<string | null>(null);

  // Papare Music State
  const [musicPlaying, setMusicPlaying] = useState<boolean>(false);
  const [musicSrc, setMusicSrc] = useState<string | null>(null);

  const prevScoreRef = useRef<number>(DEFAULT_SCORE.currentInnings.score);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
        setViewMode((prev) => (prev === 'crease' ? 'broadcast_scorecard' : 'crease'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const savedIp = localStorage.getItem('cricket_android_ip');
      if (savedIp) {
        setAndroidIp(savedIp);
      } else {
        setIsModalOpen(true);
      }

      // Load Branding Config
      try {
        const savedBranding = localStorage.getItem('cricket_branding_config');
        if (savedBranding) {
          setBranding(JSON.parse(savedBranding));
        }
      } catch (err) {
        console.error('Failed to parse branding config:', err);
      }
    }, 0);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cricket_branding_config' && e.newValue) {
        try {
          setBranding(JSON.parse(e.newValue));
        } catch (err) {
          console.error('Failed to parse updated branding config:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleConnect = (ip: string) => {
    setAndroidIp(ip);
    localStorage.setItem('cricket_android_ip', ip);
    setIsModalOpen(false);
  };

  const handleAdminCommand = useCallback((cmd: AdminCommand) => {
    switch (cmd.action) {
      case 'PLAY_VIDEO_AD':
        setAdType('video');
        setAdSrc(cmd.src || null);
        setAdActive(true);
        break;
      case 'PLAY_IMAGE_AD':
        setAdType('image');
        setAdSrc(cmd.src || null);
        setAdActive(true);
        break;
      case 'STOP_AD':
        setAdActive(false);
        setAdSrc(null);
        break;
      case 'PLAY_MUSIC':
        setMusicSrc(cmd.src || '/assets/music/papare_sample.mp3');
        setMusicPlaying(true);
        break;
      case 'STOP_MUSIC':
        setMusicPlaying(false);
        break;
      case 'CLEAR_RESULT':
        setResultDismissed(true);
        setScoreData((prev) => ({
          ...prev,
          match: { ...prev.match, result: null, isCompleted: false },
        }));
        break;
    }
  }, []);

  // 2s polling loop
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

          if (data.currentInnings?.score !== prevScoreRef.current) {
            setScoreFlash(true);
            setTimeout(() => setScoreFlash(false), 500);
            prevScoreRef.current = data.currentInnings?.score ?? 0;
          }

          // If result changed or was newly set, reset dismissed state
          if (
            data.match?.result &&
            JSON.stringify(data.match.result) !== JSON.stringify(scoreData.match?.result)
          ) {
            setResultDismissed(false);
          }

          setScoreData(data);

          if (data.adminCommand) {
            handleAdminCommand(data.adminCommand);
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
  }, [androidIp, handleAdminCommand, scoreData.match?.result]);

  const isMatchCompleted = Boolean(
    scoreData.match?.isCompleted || scoreData.match?.status === 'COMPLETED'
  );
  const hasResult = Boolean(scoreData.match?.result);

  if (viewMode === 'broadcast_scorecard') {
    return (
      <RealCricketScorecard
        scoreData={scoreData}
        branding={branding}
        onClose={() => setViewMode('crease')}
      />
    );
  }

  return (
    <main
      className="min-h-screen w-screen bg-cover bg-center text-slate-100 flex flex-col p-4 md:p-6 overflow-x-hidden font-sans select-none"
      style={{
        backgroundImage: "url('/assets/branding/stadium-night-backdrop.svg')",
        backgroundColor: '#040d1a',
      }}
    >
      {/* Top Bar with Connection and Navigation */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏏</span>
          <h1 className="text-xl font-black uppercase tracking-wider text-slate-200">
            Cricket Live TV Scoreboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode('broadcast_scorecard')}
            className="text-xs px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black tracking-wider uppercase border border-emerald-300 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 cursor-pointer hover:scale-105"
            title="Switch to Real Cricket Full Scorecard (Shortcut: S)"
          >
            <span>🎮</span>
            <span>RC20 Scorecard</span>
          </button>

          <Link
            href="/admin"
            className="text-xs px-3.5 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition-colors backdrop-blur-sm"
          >
            🎛️ Admin Panel
          </Link>

          <button
            onClick={() => setIsModalOpen(true)}
            className={`text-xs px-3.5 py-1.5 rounded-full font-bold border flex items-center gap-2 transition-all cursor-pointer backdrop-blur-sm ${
              connStatus === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            {connStatus === 'connected'
              ? `Connected (${androidIp})`
              : 'Disconnected (Click to set IP)'}
          </button>
        </div>
      </div>

      {/* Main Scoreboard Layout (Grid + Optional Split Ad Panel) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5">
        <div className="flex-1 flex flex-col justify-between gap-4">
          {/* Header Component */}
          <ScoreboardHeader
            match={scoreData.match}
            currentInnings={scoreData.currentInnings}
            scoreFlash={scoreFlash}
            branding={branding}
          />

          {/* Middle Row: Batsmen + Bowler/Partnership/Target */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 flex-1">
            <BatsmenPanel
              batsmen={scoreData.currentInnings?.batsmen}
              playerPhotos={branding.playerPhotos}
              playerRoles={branding.playerRoles}
            />

            <div className="flex flex-col gap-4">
              <BowlerPanel
                bowler={scoreData.currentInnings?.currentBowler}
                playerPhotos={branding.playerPhotos}
                playerRoles={branding.playerRoles}
              />
              <PartnershipPanel partnership={scoreData.currentInnings?.partnership} />
              <ChasePanel
                requiredRuns={scoreData.currentInnings?.requiredRuns}
                requiredOvers={scoreData.currentInnings?.requiredOvers}
                requiredRunRate={scoreData.currentInnings?.requiredRunRate}
              />
            </div>
          </div>

          {/* Ball by Ball Over History */}
          <RecentBalls recentBalls={scoreData.currentInnings?.recentBalls} />

          {/* Bottom Stats Footer */}
          <StatsFooter
            runRate={scoreData.currentInnings?.runRate}
            overs={scoreData.currentInnings?.overs}
            extras={scoreData.currentInnings?.extras}
            lastWicket={scoreData.currentInnings?.lastWicket}
            requiredRunRate={scoreData.currentInnings?.requiredRunRate}
          />
        </div>

        {/* Split-Screen Ad Panel (When ad is active) */}
        <SplitAdPanel
          isActive={adActive}
          type={adType}
          src={adSrc}
          onClose={() => setAdActive(false)}
        />
      </div>

      {/* Celebratory Result Banner when Match is Completed */}
      {!resultDismissed && isMatchCompleted && hasResult && (
        <ResultBanner
          result={scoreData.match.result}
          isCompleted={isMatchCompleted}
          onDismiss={() => setResultDismissed(true)}
        />
      )}

      {/* Bottom Papare Music Animated Waveform Bar */}
      <MusicBar isPlaying={musicPlaying} audioSrc={musicSrc} loop={true} />

      {/* Connection Setup Modal */}
      <ConnectionModal
        isOpen={isModalOpen}
        initialIp={androidIp}
        onConnect={handleConnect}
      />
    </main>
  );
}
