'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MediaItem, AdminActionType, ScoreData, TeamData } from '@/types/cricket';

export default function AdminPage() {
  const [androidIp, setAndroidIp] = useState<string>('');
  const [ipInput, setIpInput] = useState<string>('');
  const [connStatus, setConnStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  // Mini Score Preview
  const [previewScore, setPreviewScore] = useState<ScoreData | null>(null);

  // Teams & Rosters State
  const [teams, setTeams] = useState<TeamData[]>([
    {
      id: 1,
      name: 'Tech Titans',
      players: [
        'D. Mendis', 'S. Fernando', 'K. Perera', 'C. Asalanka', 'B. Rajapaksa',
        'D. Shanaka', 'W. Hasaranga', 'C. Karunaratne', 'D. Chameera', 'M. Theekshana', 'L. Kumara'
      ]
    },
    {
      id: 2,
      name: 'Sales Strikers',
      players: [
        'P. Nissanka', 'K. Mendis', 'S. Samarawickrama', 'C. Silva', 'A. Mathews',
        'D. de Silva', 'K. Rajitha', 'M. Pathirana', 'P. Jayawickrama', 'N. Pradeep', 'B. Fernando'
      ]
    }
  ]);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);
  const [editingTeam, setEditingTeam] = useState<TeamData | null>(null);
  const [teamFormName, setTeamFormName] = useState<string>('');
  const [teamFormPlayers, setTeamFormPlayers] = useState<string>('');
  const [teamToDelete, setTeamToDelete] = useState<TeamData | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  // Media Libraries
  const [videoAds, setVideoAds] = useState<MediaItem[]>([]);
  const [imageAds, setImageAds] = useState<MediaItem[]>([]);
  const [musicFiles, setMusicFiles] = useState<MediaItem[]>([]);

  // Drag and drop state
  const [dragOverTypes, setDragOverTypes] = useState<Record<string, boolean>>({});

  // Settings
  const [imageDuration, setImageDuration] = useState<number>(30);
  const [loopMusic, setLoopMusic] = useState<boolean>(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [activeMediaName, setActiveMediaName] = useState<string | null>(null);

  // Event Logs
  const [logs, setLogs] = useState<{ id: string; time: string; msg: string; type: 'info' | 'success' | 'error' | 'cmd' }[]>([]);

  const autoStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'cmd' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ id: Math.random().toString(), time, msg, type }, ...prev.slice(0, 49)]);
  };

  const fetchTeams = async (ipToUse?: string) => {
    const ip = ipToUse || androidIp;
    if (!ip) {
      const cached = localStorage.getItem('cricket_teams_cache');
      if (cached) {
        try { setTeams(JSON.parse(cached)); } catch {}
      }
      return;
    }
    setLoadingTeams(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`http://${ip}:8080/api/teams`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data: TeamData[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTeams(data);
          localStorage.setItem('cricket_teams_cache', JSON.stringify(data));
          addLog(`Loaded ${data.length} team(s) from Scorer app`, 'success');
        }
      }
    } catch {
      const cached = localStorage.getItem('cricket_teams_cache');
      if (cached) {
        try { setTeams(JSON.parse(cached)); } catch {}
      }
    } finally {
      setLoadingTeams(false);
    }
  };

  const openAddTeamModal = () => {
    setEditingTeam(null);
    setTeamFormName('');
    setTeamFormPlayers('');
    setIsTeamModalOpen(true);
  };

  const openEditTeamModal = (team: TeamData) => {
    setEditingTeam(team);
    setTeamFormName(team.name);
    setTeamFormPlayers(team.players ? team.players.join('\n') : '');
    setIsTeamModalOpen(true);
  };

  const prefillSamplePlayers = () => {
    setTeamFormPlayers(
      'D. Mendis\nS. Fernando\nK. Perera\nC. Asalanka\nB. Rajapaksa\nD. Shanaka\nW. Hasaranga\nC. Karunaratne\nD. Chameera\nM. Theekshana\nL. Kumara'
    );
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamFormName.trim()) return;

    const playersList = teamFormPlayers
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const payload: TeamData = {
      id: editingTeam?.id,
      name: teamFormName.trim(),
      players: playersList,
    };

    if (androidIp) {
      try {
        const res = await fetch(`http://${androidIp}:8080/api/teams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          addLog(`Team "${payload.name}" saved to Android Scorer app`, 'success');
          await fetchTeams();
          setIsTeamModalOpen(false);
          return;
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        addLog(`Failed to save to Scorer: ${errMsg}`, 'error');
      }
    }

    // Save locally if offline
    let updated: TeamData[];
    if (editingTeam?.id) {
      updated = teams.map((t) => (t.id === editingTeam.id ? payload : t));
    } else {
      payload.id = Date.now();
      updated = [...teams, payload];
    }
    setTeams(updated);
    localStorage.setItem('cricket_teams_cache', JSON.stringify(updated));
    addLog(`Team "${payload.name}" saved locally (${playersList.length} players)`, 'info');
    setIsTeamModalOpen(false);
  };

  const handleDeleteTeam = async (team: TeamData) => {
    if (androidIp && team.id) {
      try {
        const res = await fetch(`http://${androidIp}:8080/api/teams?id=${team.id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          addLog(`Team "${team.name}" deleted from Android Scorer`, 'success');
          await fetchTeams();
          setTeamToDelete(null);
          return;
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        addLog(`Failed to delete on Scorer: ${errMsg}`, 'error');
      }
    }

    const updated = teams.filter((t) => t.id !== team.id && t.name !== team.name);
    setTeams(updated);
    localStorage.setItem('cricket_teams_cache', JSON.stringify(updated));
    addLog(`Team "${team.name}" deleted locally`, 'info');
    setTeamToDelete(null);
  };

  const exportTeamsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(teams, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'cricket_teams_rosters.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
    addLog('Exported teams & rosters JSON file', 'success');
  };

  const importTeamsJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed)) {
          setTeams(parsed);
          localStorage.setItem('cricket_teams_cache', JSON.stringify(parsed));
          addLog(`Imported ${parsed.length} team(s) from JSON file`, 'success');
          if (androidIp) {
            for (const t of parsed) {
              await fetch(`http://${androidIp}:8080/api/teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(t),
              });
            }
            await fetchTeams();
          }
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        addLog(`Invalid JSON file: ${errMsg}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem('cricket_android_ip');
      if (saved) {
        setAndroidIp(saved);
        setIpInput(saved);
        fetchTeams(saved);
      } else {
        const cached = localStorage.getItem('cricket_teams_cache');
        if (cached) {
          try { setTeams(JSON.parse(cached)); } catch {}
        }
      }
      addLog('Admin console initialized. Ready to connect.', 'info');
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSaveIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipInput.trim()) return;
    setAndroidIp(ipInput.trim());
    localStorage.setItem('cricket_android_ip', ipInput.trim());
    addLog(`Target Android IP set to: ${ipInput.trim()}`, 'success');
    fetchTeams(ipInput.trim());
  };

  // Preview polling loop
  useEffect(() => {
    if (!androidIp) return;

    let isMounted = true;

    const checkStatus = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`http://${androidIp}:8080/api/score`, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data: ScoreData = await res.json();
          if (isMounted) {
            setConnStatus('connected');
            setPreviewScore(data);
          }
        } else {
          if (isMounted) setConnStatus('disconnected');
        }
      } catch {
        if (isMounted) setConnStatus('disconnected');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [androidIp]);

  // Command dispatcher to Android HTTP server
  const sendCommand = async (action: AdminActionType, extra: Record<string, unknown> = {}) => {
    if (!androidIp) {
      addLog('Cannot send command: No Android IP set', 'error');
      return;
    }

    const payload = { action, ...extra };

    try {
      addLog(`Sending command: ${action}`, 'cmd');
      const res = await fetch(`http://${androidIp}:8080/api/admin/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        addLog(`Command [${action}] accepted by Android server`, 'success');
      } else {
        addLog(`Server responded with error: ${res.status}`, 'error');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog(`Command delivery failed: ${errMsg}`, 'error');
    }
  };

  // Process files from either file picker or native drag & drop
  const processFiles = (files: FileList | File[], type: 'video' | 'image' | 'music') => {
    if (!files || files.length === 0) return;

    const items: MediaItem[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      url: URL.createObjectURL(file),
      type,
    }));

    if (type === 'video') setVideoAds((prev) => [...prev, ...items]);
    if (type === 'image') setImageAds((prev) => [...prev, ...items]);
    if (type === 'music') setMusicFiles((prev) => [...prev, ...items]);

    addLog(`Uploaded ${items.length} ${type} file(s)`, 'success');
  };

  // Drag-and-drop container event handlers
  const handleDragOver = (e: React.DragEvent<HTMLElement>, type: 'video' | 'image' | 'music') => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTypes((prev) => ({ ...prev, [type]: true }));
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>, type: 'video' | 'image' | 'music') => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTypes((prev) => ({ ...prev, [type]: false }));
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>, type: 'video' | 'image' | 'music') => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTypes((prev) => ({ ...prev, [type]: false }));
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files, type);
    }
  };

  const playVideoAd = (item: MediaItem) => {
    setActiveMediaName(item.name);
    sendCommand('PLAY_VIDEO_AD', { src: item.url });
  };

  const playImageAd = (item: MediaItem) => {
    setActiveMediaName(item.name);
    sendCommand('PLAY_IMAGE_AD', { src: item.url });

    if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
    const duration = Number(imageDuration);
    if (duration <= 0) {
      // Guard zero-second or negative auto-stop duration: stop immediately so ad never hangs indefinitely
      sendCommand('STOP_AD');
      setActiveMediaName(null);
      addLog(`Image ad [${item.name}] auto-stopped immediately (duration was <= 0s)`, 'info');
    } else {
      autoStopTimeoutRef.current = setTimeout(() => {
        sendCommand('STOP_AD');
        setActiveMediaName(null);
        addLog(`Image ad [${item.name}] auto-stopped after ${duration}s`, 'info');
      }, duration * 1000);
    }
  };

  const playMusic = (item: MediaItem) => {
    setIsMusicPlaying(true);
    sendCommand('PLAY_MUSIC', { src: item.url, loop: loopMusic });
    addLog(`Papare music started: ${item.name}`, 'cmd');
  };

  const stopMusic = () => {
    setIsMusicPlaying(false);
    sendCommand('STOP_MUSIC');
    addLog('Papare music stopped', 'cmd');
  };

  const stopAd = () => {
    if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
    setActiveMediaName(null);
    sendCommand('STOP_AD');
    addLog('Active ad stopped', 'cmd');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">🎛️</span>
            <h1 className="text-2xl font-black uppercase tracking-wider text-amber-400">
              Scoreboard Admin Console
            </h1>
            {activeMediaName && (
              <span className="ml-2 text-xs font-semibold px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                Playing: {activeMediaName}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Trigger ads, play papare brass band music, and control the live TV scoreboard
          </p>
        </div>

        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition-colors flex items-center gap-2 text-sm shadow-md"
        >
          📺 Open TV Scoreboard
        </Link>
      </div>

      {/* Target IP Configuration Bar */}
      <div className="my-6 p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-4 shadow-xl">
        <form onSubmit={handleSaveIp} className="flex-1 flex items-center gap-3 min-w-[280px]">
          <label className="text-sm font-bold text-slate-400 whitespace-nowrap">
            📡 Scorer IP:
          </label>
          <input
            type="text"
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            placeholder="192.168.1.45"
            className="flex-1 max-w-xs px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
          >
            Connect
          </button>
        </form>

        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              connStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {connStatus === 'connected' ? 'Connected (Live)' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Live Mini Preview Banner */}
      {previewScore && (
        <div className="mb-6 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Live Game
            </span>
            <div className="text-sm font-bold text-slate-200">
              {previewScore.match.team1} vs {previewScore.match.team2}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <span className="text-xs text-slate-400 block font-semibold">
                {previewScore.currentInnings?.battingTeam ? `${previewScore.currentInnings.battingTeam} (Batting)` : 'Score'}
              </span>
              <span className="text-xl font-black text-amber-400">
                {previewScore.currentInnings?.score}/{previewScore.currentInnings?.wickets}
              </span>
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-400 block font-semibold">Overs</span>
              <span className="text-lg font-bold text-slate-200">
                {previewScore.currentInnings?.overs}
              </span>
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-400 block font-semibold">Run Rate</span>
              <span className="text-lg font-bold text-sky-400">
                {previewScore.currentInnings?.runRate?.toFixed(2) ?? '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Teams & Rosters Management Section */}
      <div className="mb-6 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-800 gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👥</span>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-amber-400">
                Tournament Teams &amp; Rosters
              </h2>
              <p className="text-xs text-slate-400">
                Configure teams and player lists prior to the tournament — synced directly with the Android Scorer
              </p>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
              {teams.length} Teams
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={openAddTeamModal}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-amber-400/20 cursor-pointer flex items-center gap-1.5"
            >
              <span>+</span> Add New Team
            </button>

            <button
              onClick={() => fetchTeams()}
              disabled={loadingTeams}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700 cursor-pointer flex items-center gap-1.5"
            >
              <span className={loadingTeams ? 'animate-spin' : ''}>🔄</span> {loadingTeams ? 'Syncing...' : 'Sync Scorer'}
            </button>

            <button
              onClick={exportTeamsJson}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors border border-slate-700 cursor-pointer"
              title="Export all rosters to JSON"
            >
              📥 Export
            </button>

            <label
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors border border-slate-700 cursor-pointer"
              title="Import rosters from JSON"
            >
              📤 Import
              <input
                ref={jsonInputRef}
                type="file"
                accept="application/json"
                onChange={importTeamsJson}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No teams configured yet. Click &quot;+ Add New Team&quot; to get started!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team, idx) => (
              <div
                key={team.id || idx}
                className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/50 mb-2">
                    <span className="font-bold text-base text-amber-400 truncate">
                      {team.name}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {team.players?.length || 0} Players
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {team.players && team.players.length > 0 ? (
                      team.players.map((pName, pIdx) => (
                        <span
                          key={pIdx}
                          className="px-2 py-0.5 rounded bg-slate-700/60 text-slate-200 text-[11px]"
                        >
                          {pName}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 italic">No players listed</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-700/50">
                  <button
                    onClick={() => openEditTeamModal(team)}
                    className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => setTeamToDelete(team)}
                    className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid of Control Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Video Ads */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-base font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                🎬 Video Ads
              </h2>
              <span className="text-xs text-slate-400">{videoAds.length} ready</span>
            </div>

            <label
              onDragOver={(e) => handleDragOver(e, 'video')}
              onDragLeave={(e) => handleDragLeave(e, 'video')}
              onDrop={(e) => handleDrop(e, 'video')}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition-all mb-4 block ${
                dragOverTypes['video']
                  ? 'border-amber-400 bg-amber-400/10 scale-[1.02]'
                  : 'border-slate-700 hover:border-amber-400 bg-slate-800/20'
              }`}
            >
              <span className="text-2xl">{dragOverTypes['video'] ? '📥' : '📹'}</span>
              <span className="text-xs font-semibold text-slate-300">
                {dragOverTypes['video']
                  ? 'Drop video ad files here'
                  : 'Drag & drop or click to upload video ads (.mp4, .webm)'}
              </span>
              <input
                type="file"
                accept="video/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) processFiles(e.target.files, 'video');
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>

            {videoAds.length > 0 && (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {videoAds.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs"
                  >
                    <span className="truncate max-w-[160px] text-slate-200 font-medium">
                      {v.name}
                    </span>
                    <button
                      onClick={() => playVideoAd(v)}
                      className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors cursor-pointer"
                    >
                      ▶ Play
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={stopAd}
            className="w-full mt-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            ⏹ Stop Video Ad
          </button>
        </div>

        {/* Card 2: Image Ads */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-base font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                🖼️ Image Ads
              </h2>
              <span className="text-xs text-slate-400">{imageAds.length} ready</span>
            </div>

            <label
              onDragOver={(e) => handleDragOver(e, 'image')}
              onDragLeave={(e) => handleDragLeave(e, 'image')}
              onDrop={(e) => handleDrop(e, 'image')}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition-all mb-4 block ${
                dragOverTypes['image']
                  ? 'border-amber-400 bg-amber-400/10 scale-[1.02]'
                  : 'border-slate-700 hover:border-amber-400 bg-slate-800/20'
              }`}
            >
              <span className="text-2xl">{dragOverTypes['image'] ? '📥' : '📸'}</span>
              <span className="text-xs font-semibold text-slate-300">
                {dragOverTypes['image']
                  ? 'Drop image ad files here'
                  : 'Drag & drop or click to upload image ads (.jpg, .png)'}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) processFiles(e.target.files, 'image');
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>

            {imageAds.length > 0 && (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {imageAds.map((img) => (
                  <div
                    key={img.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs"
                  >
                    <span className="truncate max-w-[160px] text-slate-200 font-medium">
                      {img.name}
                    </span>
                    <button
                      onClick={() => playImageAd(img)}
                      className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors cursor-pointer"
                    >
                      ▶ Play
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="300"
                value={imageDuration}
                onChange={(e) => setImageDuration(Math.max(0, Number(e.target.value) || 0))}
                className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-center text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400 font-semibold uppercase">
                Secs Auto-Stop
              </span>
            </div>

            <button
              onClick={stopAd}
              className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold uppercase transition-colors cursor-pointer"
            >
              ⏹ Stop
            </button>
          </div>
        </div>

        {/* Card 3: Papare Music */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-base font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
                🎺 Papare Music
              </h2>
              <span className="text-xs text-slate-400">{musicFiles.length} ready</span>
            </div>

            <label
              onDragOver={(e) => handleDragOver(e, 'music')}
              onDragLeave={(e) => handleDragLeave(e, 'music')}
              onDrop={(e) => handleDrop(e, 'music')}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition-all mb-4 block ${
                dragOverTypes['music']
                  ? 'border-purple-400 bg-purple-500/10 scale-[1.02]'
                  : 'border-purple-800/60 hover:border-purple-400 bg-purple-950/20'
              }`}
            >
              <span className="text-2xl">{dragOverTypes['music'] ? '📥' : '🎵'}</span>
              <span className="text-xs font-semibold text-slate-300">
                {dragOverTypes['music']
                  ? 'Drop Papare tracks here'
                  : 'Drag & drop or click to upload Papare tracks (.mp3, .wav)'}
              </span>
              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) processFiles(e.target.files, 'music');
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>

            {musicFiles.length > 0 && (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {musicFiles.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-purple-950/40 border border-purple-800/40 text-xs"
                  >
                    <span className="truncate max-w-[160px] text-purple-200 font-medium">
                      {m.name}
                    </span>
                    <button
                      onClick={() => playMusic(m)}
                      className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors cursor-pointer"
                    >
                      ▶ Play
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={loopMusic}
                onChange={(e) => setLoopMusic(e.target.checked)}
                className="rounded accent-purple-500 cursor-pointer"
              />
              Loop music continuously until stopped
            </label>

            <button
              onClick={stopMusic}
              className={`w-full py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                isMusicPlaying
                  ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                  : 'bg-rose-600/20 text-rose-300 border-rose-500/40'
              }`}
            >
              🔇 Stop Papare Music
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="my-6 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
          ⚡ Quick Broadcast Actions
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() =>
              sendCommand('PLAY_MUSIC', {
                src: musicFiles[0]?.url || '/assets/music/papare_sample.mp3',
                loop: loopMusic,
              })
            }
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-purple-600/20 cursor-pointer"
          >
            🎺 Quick Papare Loop
          </button>

          <button
            onClick={stopMusic}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700 cursor-pointer"
          >
            🔇 Mute Music
          </button>

          <button
            onClick={stopAd}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700 cursor-pointer"
          >
            ⏹ Hide Current Ad
          </button>

          <button
            onClick={() => sendCommand('CLEAR_RESULT')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700 cursor-pointer"
          >
            ✕ Clear Result Banner
          </button>
        </div>
      </div>

      {/* Event Audit Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            📋 Event &amp; Command Audit Trail
          </h2>
          <button
            onClick={() => setLogs([])}
            className="text-[10px] text-slate-500 hover:text-slate-300 uppercase font-bold cursor-pointer"
          >
            Clear Log
          </button>
        </div>

        <div className="h-44 overflow-y-auto flex flex-col gap-1 font-mono text-xs pr-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`py-1 flex items-start gap-2 ${
                log.type === 'success'
                  ? 'text-emerald-400'
                  : log.type === 'error'
                  ? 'text-rose-400'
                  : log.type === 'cmd'
                  ? 'text-sky-400'
                  : 'text-slate-400'
              }`}
            >
              <span className="text-slate-600 font-medium">[{log.time}]</span>
              <span>{log.msg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Team Create / Edit Modal */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-slate-100 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-black text-amber-400 uppercase tracking-wide flex items-center gap-2">
                <span>{editingTeam ? '✏️ Edit Team & Roster' : '➕ Create New Team'}</span>
              </h3>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamFormName}
                  onChange={(e) => setTeamFormName(e.target.value)}
                  placeholder="e.g. Finance Fighters"
                  required
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-semibold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase text-slate-300">
                    Players (one per line)
                  </label>
                  <button
                    type="button"
                    onClick={prefillSamplePlayers}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
                  >
                    Prefill Sample 11
                  </button>
                </div>
                <textarea
                  value={teamFormPlayers}
                  onChange={(e) => setTeamFormPlayers(e.target.value)}
                  rows={8}
                  placeholder={'Player 1\nPlayer 2\nPlayer 3...'}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-400 leading-relaxed"
                />
                <div className="flex items-center justify-between mt-1 text-xs text-slate-400">
                  <span>
                    Count: <strong className="text-amber-400">{teamFormPlayers.split('\n').filter((p) => p.trim()).length}</strong> players
                  </span>
                  <span className="text-[11px]">Recommended: 11 players</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-amber-400/20"
                >
                  Save Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {teamToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-slate-100 animate-in fade-in duration-200">
            <h3 className="text-base font-bold text-rose-400 mb-2">Delete Team?</h3>
            <p className="text-sm text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to delete <strong className="text-amber-400">&quot;{teamToDelete.name}&quot;</strong> and all of its players?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTeamToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTeam(teamToDelete)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
