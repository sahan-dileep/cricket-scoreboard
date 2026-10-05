'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MediaItem,
  AdminActionType,
  ScoreData,
  TeamData,
  BrandingConfig,
  DEFAULT_BRANDING,
  PlayerRole,
  PLAYER_ROLES,
} from '@/types/cricket';

export type AdminTab = 'live' | 'media' | 'music' | 'teams' | 'branding';

interface TabDefinition {
  id: AdminTab;
  label: string;
  icon: string;
  description: string;
}

const TABS: TabDefinition[] = [
  { id: 'live', label: 'Live Preview & Status', icon: '🎮', description: 'Monitor connection, live score, and audit logs' },
  { id: 'media', label: 'Media & Ads', icon: '🎬', description: 'Upload and broadcast video & image advertisements' },
  { id: 'music', label: 'Music & Audio', icon: '🎺', description: 'Trigger Papare brass band tracks and looping audio' },
  { id: 'teams', label: 'Teams & Rosters', icon: '👥', description: 'Manage tournament teams and sync with Android Scorer' },
  { id: 'branding', label: 'Branding & Visuals', icon: '🎨', description: 'Configure sponsor logos, crests, roles, and photos' },
];

export default function AdminPage() {
  // Active Tab State (defaults to 'live', supports URL hash restoration)
  const [activeTab, setActiveTab] = useState<AdminTab>('live');

  // Network & Scorer IP Connection State
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
      ],
    },
    {
      id: 2,
      name: 'Sales Strikers',
      players: [
        'P. Nissanka', 'K. Mendis', 'S. Samarawickrama', 'C. Silva', 'A. Mathews',
        'D. de Silva', 'K. Rajitha', 'M. Pathirana', 'P. Jayawickrama', 'N. Pradeep', 'B. Fernando'
      ],
    },
  ]);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);
  const [editingTeam, setEditingTeam] = useState<TeamData | null>(null);
  const [teamFormName, setTeamFormName] = useState<string>('');
  const [teamFormPlayers, setTeamFormPlayers] = useState<string>('');
  const [teamToDelete, setTeamToDelete] = useState<TeamData | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  // Branding & Visual Assets State
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [selectedPlayerTeam, setSelectedPlayerTeam] = useState<string>('');
  const brandingJsonRef = useRef<HTMLInputElement | null>(null);

  // Media Libraries
  const [videoAds, setVideoAds] = useState<MediaItem[]>([]);
  const [imageAds, setImageAds] = useState<MediaItem[]>([]);
  const [musicFiles, setMusicFiles] = useState<MediaItem[]>([]);

  // Drag and drop visual highlight state
  const [dragOverTypes, setDragOverTypes] = useState<Record<string, boolean>>({});

  // Media Playback Settings & Status
  const [imageDuration, setImageDuration] = useState<number>(30);
  const [loopMusic, setLoopMusic] = useState<boolean>(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [activeMediaName, setActiveMediaName] = useState<string | null>(null);

  // Event & Command Audit Trail Logs
  const [logs, setLogs] = useState<{ id: string; time: string; msg: string; type: 'info' | 'success' | 'error' | 'cmd' }[]>([]);

  const autoStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'cmd' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ id: Math.random().toString(), time, msg, type }, ...prev.slice(0, 49)]);
  };

  const handleTabChange = (tabId: AdminTab) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tabId}`);
    }
  };

  const fetchTeams = async (ipToUse?: string) => {
    const ip = ipToUse || androidIp;
    if (!ip) {
      const cached = localStorage.getItem('cricket_teams_cache');
      if (cached) {
        try {
          setTeams(JSON.parse(cached));
        } catch {}
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
        try {
          setTeams(JSON.parse(cached));
        } catch {}
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

  // Restore state from LocalStorage on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      // Check URL hash for initial tab
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.replace('#', '') as AdminTab;
        if (['live', 'media', 'music', 'teams', 'branding'].includes(hash)) {
          setActiveTab(hash);
        }
      }

      const savedIp = localStorage.getItem('cricket_android_ip');
      if (savedIp) {
        setAndroidIp(savedIp);
        setIpInput(savedIp);
        fetchTeams(savedIp);
      } else {
        const cached = localStorage.getItem('cricket_teams_cache');
        if (cached) {
          try {
            setTeams(JSON.parse(cached));
          } catch {}
        }
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

      addLog('Admin console initialized. 5 functional tabs ready.', 'info');
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

  // Live Score Polling Loop
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

  // Native drag-and-drop container event handlers
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

  // --- Branding & Visual Assets Helpers ---
  const updateAndSaveBranding = (newBranding: BrandingConfig) => {
    setBranding(newBranding);
    try {
      localStorage.setItem('cricket_branding_config', JSON.stringify(newBranding));
      window.dispatchEvent(new Event('storage'));
      addLog('Tournament branding updated successfully', 'success');
    } catch (err) {
      console.error('Failed to save branding config:', err);
      addLog('Failed to save branding (image file might be too large for storage)', 'error');
    }
  };

  const processImageFile = (
    file: File,
    maxWidth: number,
    maxHeight: number,
    onSuccess: (dataUrl: string) => void
  ) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) onSuccess(e.target.result as string);
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/webp', 0.88);
          onSuccess(compressed);
        } else {
          onSuccess(e.target?.result as string);
        }
      };
      img.onerror = () => {
        onSuccess(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCompanyLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file, 600, 600, (dataUrl) => {
      updateAndSaveBranding({ ...branding, companyLogo: dataUrl });
      addLog(`Updated Company Logo (${file.name})`, 'success');
    });
    e.target.value = '';
  };

  const resetCompanyLogo = () => {
    updateAndSaveBranding({ ...branding, companyLogo: DEFAULT_BRANDING.companyLogo });
    addLog('Reset Company Logo to default', 'info');
  };

  const handleMatchLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file, 600, 600, (dataUrl) => {
      updateAndSaveBranding({ ...branding, tournamentLogo: dataUrl });
      addLog(`Updated Tournament / Match Logo (${file.name})`, 'success');
    });
    e.target.value = '';
  };

  const resetMatchLogo = () => {
    updateAndSaveBranding({ ...branding, tournamentLogo: DEFAULT_BRANDING.tournamentLogo });
    addLog('Reset Tournament Logo to default', 'info');
  };

  const handleTeamLogoUpload = (teamName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file, 400, 400, (dataUrl) => {
      const updatedLogos = { ...branding.teamLogos, [teamName]: dataUrl };
      updateAndSaveBranding({ ...branding, teamLogos: updatedLogos });
      addLog(`Updated logo for team "${teamName}"`, 'success');
    });
    e.target.value = '';
  };

  const resetTeamLogo = (teamName: string) => {
    const updatedLogos = { ...branding.teamLogos };
    delete updatedLogos[teamName];
    updateAndSaveBranding({ ...branding, teamLogos: updatedLogos });
    addLog(`Reset logo for team "${teamName}" to default`, 'info');
  };

  const handlePlayerPhotoUpload = (playerName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file, 300, 300, (dataUrl) => {
      const updatedPhotos = { ...branding.playerPhotos, [playerName]: dataUrl };
      updateAndSaveBranding({ ...branding, playerPhotos: updatedPhotos });
      addLog(`Uploaded photo for player "${playerName}"`, 'success');
    });
    e.target.value = '';
  };

  const resetPlayerPhoto = (playerName: string) => {
    const updatedPhotos = { ...branding.playerPhotos };
    delete updatedPhotos[playerName];
    updateAndSaveBranding({ ...branding, playerPhotos: updatedPhotos });
    addLog(`Removed custom photo for player "${playerName}"`, 'info');
  };

  const resetAllBranding = () => {
    if (window.confirm('Are you sure you want to reset all branding, logos, and player photos to default?')) {
      updateAndSaveBranding(DEFAULT_BRANDING);
      addLog('All branding assets reset to default', 'info');
    }
  };

  const exportBrandingJson = () => {
    try {
      const blob = new Blob([JSON.stringify(branding, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cricket_tournament_branding_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addLog('Exported tournament branding to JSON file', 'success');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog(`Failed to export branding: ${errMsg}`, 'error');
    }
  };

  const importBrandingJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed: Partial<BrandingConfig> = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          const merged: BrandingConfig = {
            companyName: parsed.companyName || DEFAULT_BRANDING.companyName,
            companyLogo: parsed.companyLogo || DEFAULT_BRANDING.companyLogo,
            tournamentName: parsed.tournamentName || DEFAULT_BRANDING.tournamentName,
            tournamentLogo: parsed.tournamentLogo || DEFAULT_BRANDING.tournamentLogo,
            teamLogos: parsed.teamLogos || {},
            playerPhotos: parsed.playerPhotos || {},
            playerRoles: parsed.playerRoles || {},
          };
          updateAndSaveBranding(merged);
          addLog(`Imported branding configuration from "${file.name}"`, 'success');
        } else {
          throw new Error('Invalid branding file format');
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        addLog(`Failed to import branding: ${errMsg}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSetPlayerRole = (playerName: string, role: PlayerRole) => {
    const updatedRoles = {
      ...(branding.playerRoles || {}),
      [playerName]: role,
    };
    updateAndSaveBranding({
      ...branding,
      playerRoles: updatedRoles,
    });
    addLog(`Assigned ${PLAYER_ROLES[role].icon} ${PLAYER_ROLES[role].label} to ${playerName}`, 'info');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans pb-32">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-800 gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-3xl">🎛️</span>
            <h1 className="text-2xl font-black uppercase tracking-wider text-amber-400">
              Scoreboard Admin Console
            </h1>
            {activeMediaName && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5 animate-pulse">
                <span>🎬</span>
                <span>Playing: {activeMediaName}</span>
              </span>
            )}
            {isMusicPlaying && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 animate-pulse">
                <span>🎺</span>
                <span>Papare Active</span>
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Trigger ads, play papare brass band music, configure teams, rosters, and branding for the live TV scoreboard
          </p>
        </div>

        <Link
          href="/"
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition-colors flex items-center gap-2 text-sm shadow-md cursor-pointer"
        >
          📺 Open TV Scoreboard
        </Link>
      </div>

      {/* Modern 5-Tab Navigation Bar with High-Contrast Active Pills & Dynamic Status Badges */}
      <nav
        aria-label="Admin Navigation Tabs"
        className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md mb-6"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/25 border border-amber-300 ring-2 ring-amber-400/30 scale-[1.02]'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>

              {/* Dynamic Badges per Tab */}
              {tab.id === 'live' && (
                <span className="flex items-center gap-1.5 ml-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      connStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-extrabold ${
                      isActive ? 'text-slate-950' : connStatus === 'connected' ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {connStatus === 'connected' ? 'LIVE' : 'OFFLINE'}
                  </span>
                </span>
              )}

              {tab.id === 'media' && (
                activeMediaName ? (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border animate-pulse ${
                      isActive
                        ? 'bg-slate-950 text-amber-300 border-slate-950'
                        : 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                    }`}
                  >
                    ACTIVE
                  </span>
                ) : (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {videoAds.length + imageAds.length}
                  </span>
                )
              )}

              {tab.id === 'music' && (
                isMusicPlaying ? (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border animate-pulse ${
                      isActive
                        ? 'bg-purple-950 text-purple-200 border-purple-800'
                        : 'bg-purple-600 text-white border-purple-400'
                    }`}
                  >
                    ON
                  </span>
                ) : (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {musicFiles.length}
                  </span>
                )
              )}

              {tab.id === 'teams' && (
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {teams.length}
                </span>
              )}

              {tab.id === 'branding' && (
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {Object.keys(branding.teamLogos).length} Crests
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ========================================================================= */}
      {/* TAB 1: 🎮 LIVE PREVIEW & STATUS                                           */}
      {/* ========================================================================= */}
      <div
        className={activeTab === 'live' ? 'block space-y-6' : 'hidden'}
        role="tabpanel"
        id="panel-live"
        aria-labelledby="tab-live"
      >
        {/* Scorer IP Connection Manager */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-3 mb-4">
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <span>📡</span> Scorer IP Connection &amp; Gateway
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Connect to the Android Scorer app running the local HTTP server on port 8080
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <span
                className={`w-3 h-3 rounded-full ${
                  connStatus === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : connStatus === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {connStatus === 'connected'
                  ? `Connected (Live: ${androidIp})`
                  : connStatus === 'connecting'
                  ? 'Connecting...'
                  : 'Disconnected'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveIp} className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-bold text-slate-400 whitespace-nowrap">
              Android Device IP:
            </label>
            <input
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="e.g. 192.168.1.45"
              className="flex-1 min-w-[200px] max-w-sm px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors shadow-md shadow-amber-400/20 cursor-pointer"
            >
              Connect to Scorer
            </button>
            {androidIp && (
              <span className="text-xs text-slate-400 font-mono">
                Active target: <strong className="text-slate-200">http://{androidIp}:8080</strong>
              </span>
            )}
          </form>
        </div>

        {/* Live Game Mini Score Preview */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <h2 className="text-base font-black uppercase tracking-wider text-amber-400">
                Live Game Score Preview
              </h2>
            </div>
            <span className="text-xs text-slate-400">Auto-polls every 3s</span>
          </div>

          {previewScore ? (
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Live Match
                  </span>
                  <div className="text-base font-black text-slate-100">
                    {previewScore.match.team1} vs {previewScore.match.team2}
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  Current Batting Team:{' '}
                  <strong className="text-amber-400">
                    {previewScore.currentInnings?.battingTeam || 'Unknown'}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-6 self-stretch md:self-auto justify-around bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="text-center">
                  <span className="text-[11px] text-slate-400 block font-semibold uppercase">
                    Score / Wkts
                  </span>
                  <span className="text-2xl font-black text-amber-400">
                    {previewScore.currentInnings?.score ?? 0}/{previewScore.currentInnings?.wickets ?? 0}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div className="text-center">
                  <span className="text-[11px] text-slate-400 block font-semibold uppercase">Overs</span>
                  <span className="text-xl font-bold text-slate-200">
                    {previewScore.currentInnings?.overs ?? '0.0'}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div className="text-center">
                  <span className="text-[11px] text-slate-400 block font-semibold uppercase">Run Rate</span>
                  <span className="text-xl font-bold text-sky-400">
                    {previewScore.currentInnings?.runRate?.toFixed(2) ?? '—'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm bg-slate-800/30 rounded-xl border border-dashed border-slate-800">
              <span className="text-2xl block mb-2">📡</span>
              Waiting for live match data from Scorer. Ensure Android Scorer IP is connected above.
            </div>
          )}
        </div>

        {/* Event & Command Audit Trail Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">📋</span>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Event &amp; Command Audit Trail
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {logs.length} logged
              </span>
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-[11px] text-slate-500 hover:text-slate-300 uppercase font-bold transition-colors cursor-pointer"
            >
              Clear Log
            </button>
          </div>

          <div className="h-56 overflow-y-auto flex flex-col gap-1 font-mono text-xs pr-2">
            {logs.length === 0 ? (
              <div className="text-slate-600 text-xs italic py-4 text-center">
                Audit trail is clear. Actions will be logged here in real time.
              </div>
            ) : (
              logs.map((log) => (
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
                  <span className="text-slate-600 font-medium whitespace-nowrap">[{log.time}]</span>
                  <span>{log.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 2: 🎬 MEDIA & ADS                                                     */}
      {/* ========================================================================= */}
      <div
        className={activeTab === 'media' ? 'block space-y-6' : 'hidden'}
        role="tabpanel"
        id="panel-media"
        aria-labelledby="tab-media"
      >
        {/* Active Ad Status Banner */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎬</span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Broadcast Commercial Status
              </div>
              <div className="text-sm font-black text-slate-200">
                {activeMediaName ? (
                  <span className="text-amber-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    Now Broadcasting: {activeMediaName}
                  </span>
                ) : (
                  <span className="text-slate-500">Standby (No active advertisement playing)</span>
                )}
              </div>
            </div>
          </div>

          {activeMediaName && (
            <button
              onClick={stopAd}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-rose-600/30 cursor-pointer"
            >
              ⏹ Stop Active Ad Now
            </button>
          )}
        </div>

        {/* Video Ads and Image Ads Managers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Video Ads Manager */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <h2 className="text-base font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <span>🎬</span> Video Ads
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                  {videoAds.length} ready
                </span>
              </div>

              {/* Drag-and-drop Video Upload Zone */}
              <label
                onDragOver={(e) => handleDragOver(e, 'video')}
                onDragLeave={(e) => handleDragLeave(e, 'video')}
                onDrop={(e) => handleDrop(e, 'video')}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition-all mb-4 block ${
                  dragOverTypes['video']
                    ? 'border-amber-400 bg-amber-400/10 scale-[1.02]'
                    : 'border-slate-700 hover:border-amber-400 bg-slate-800/20'
                }`}
              >
                <span className="text-3xl">{dragOverTypes['video'] ? '📥' : '📹'}</span>
                <span className="text-xs font-semibold text-slate-300">
                  {dragOverTypes['video']
                    ? 'Drop video ad files here'
                    : 'Drag & drop or click to upload video ads (.mp4, .webm)'}
                </span>
                <span className="text-[11px] text-slate-500">
                  Stored in memory — broadcasted directly via Split-Screen Ad Panel
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

              {/* Video Playlist */}
              {videoAds.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                  {videoAds.map((v, idx) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate max-w-[200px]">
                        <span className="text-slate-500 font-mono text-[10px]">#{idx + 1}</span>
                        <span className="truncate text-slate-200 font-medium" title={v.name}>
                          {v.name}
                        </span>
                      </div>
                      <button
                        onClick={() => playVideoAd(v)}
                        className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors cursor-pointer flex items-center gap-1 shadow"
                      >
                        <span>▶</span> Play
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs italic">
                  No video ads uploaded yet. Drag &amp; drop files above to populate playlist.
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

          {/* Image Ads Manager */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <h2 className="text-base font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <span>🖼️</span> Image Ads
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                  {imageAds.length} ready
                </span>
              </div>

              {/* Drag-and-drop Image Upload Zone */}
              <label
                onDragOver={(e) => handleDragOver(e, 'image')}
                onDragLeave={(e) => handleDragLeave(e, 'image')}
                onDrop={(e) => handleDrop(e, 'image')}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition-all mb-4 block ${
                  dragOverTypes['image']
                    ? 'border-amber-400 bg-amber-400/10 scale-[1.02]'
                    : 'border-slate-700 hover:border-amber-400 bg-slate-800/20'
                }`}
              >
                <span className="text-3xl">{dragOverTypes['image'] ? '📥' : '📸'}</span>
                <span className="text-xs font-semibold text-slate-300">
                  {dragOverTypes['image']
                    ? 'Drop image ad files here'
                    : 'Drag & drop or click to upload image ads (.jpg, .png, .webp)'}
                </span>
                <span className="text-[11px] text-slate-500">
                  Auto-stopped after configured countdown seconds
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

              {/* Image Playlist */}
              {imageAds.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                  {imageAds.map((img, idx) => (
                    <div
                      key={img.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate max-w-[200px]">
                        <span className="text-slate-500 font-mono text-[10px]">#{idx + 1}</span>
                        <div className="w-7 h-7 rounded bg-slate-900 overflow-hidden flex-shrink-0 border border-slate-700">
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="truncate text-slate-200 font-medium" title={img.name}>
                          {img.name}
                        </span>
                      </div>
                      <button
                        onClick={() => playImageAd(img)}
                        className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors cursor-pointer flex items-center gap-1 shadow"
                      >
                        <span>▶</span> Play
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs italic">
                  No image ads uploaded yet. Drag &amp; drop files above to populate playlist.
                </div>
              )}
            </div>

            {/* Auto-Stop Duration Configuration Bar */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={imageDuration}
                  onChange={(e) => setImageDuration(Math.max(0, Number(e.target.value) || 0))}
                  className="w-16 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-center text-xs font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                  Secs Auto-Stop
                </span>
              </div>

              <button
                onClick={stopAd}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                ⏹ Stop
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 3: 🎺 MUSIC & AUDIO                                                   */}
      {/* ========================================================================= */}
      <div
        className={activeTab === 'music' ? 'block space-y-6' : 'hidden'}
        role="tabpanel"
        id="panel-music"
        aria-labelledby="tab-music"
      >
        {/* Active Papare Music Status Banner */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎺</span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Papare Brass Band Audio Status
              </div>
              <div className="text-sm font-black text-slate-200">
                {isMusicPlaying ? (
                  <span className="text-purple-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                    Papare Music is ACTIVELY PLAYING &amp; LOOPING on TV Scoreboard!
                  </span>
                ) : (
                  <span className="text-slate-500">Standby (No music currently playing)</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                sendCommand('PLAY_MUSIC', {
                  src: musicFiles[0]?.url || '/assets/music/papare_sample.mp3',
                  loop: loopMusic,
                })
              }
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-purple-600/30 cursor-pointer flex items-center gap-1.5"
            >
              <span>🎺</span> Quick Papare Blast
            </button>
            <button
              onClick={stopMusic}
              disabled={!isMusicPlaying}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border cursor-pointer ${
                isMusicPlaying
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-600/30'
                  : 'bg-slate-800/60 text-slate-500 border-slate-700/50 cursor-not-allowed'
              }`}
            >
              🔇 Stop Music
            </button>
          </div>
        </div>

        {/* Papare Music Soundboard & Upload Zone */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-3 mb-4">
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
                <span>🎺</span> Papare Music Soundboard
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload custom Papare brass band tracks, trigger loops, and control audio on the TV scoreboard
              </p>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700">
                <input
                  type="checkbox"
                  checked={loopMusic}
                  onChange={(e) => setLoopMusic(e.target.checked)}
                  className="rounded accent-purple-500 cursor-pointer"
                />
                Loop music continuously until stopped
              </label>
            </div>
          </div>

          {/* Drag & Drop Audio Upload Zone */}
          <label
            onDragOver={(e) => handleDragOver(e, 'music')}
            onDragLeave={(e) => handleDragLeave(e, 'music')}
            onDrop={(e) => handleDrop(e, 'music')}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition-all mb-4 block ${
              dragOverTypes['music']
                ? 'border-purple-400 bg-purple-500/10 scale-[1.02]'
                : 'border-purple-800/60 hover:border-purple-400 bg-purple-950/20'
            }`}
          >
            <span className="text-3xl">{dragOverTypes['music'] ? '📥' : '🎵'}</span>
            <span className="text-xs font-semibold text-slate-300">
              {dragOverTypes['music']
                ? 'Drop Papare tracks here'
                : 'Drag & drop or click to upload Papare tracks (.mp3, .wav)'}
            </span>
            <span className="text-[11px] text-slate-400">
              Audio plays on TV Scoreboard and triggers animated equalizer waveform
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

          {/* Built-in Sample Fallback Trigger */}
          <div className="mb-4 p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎶</span>
              <div>
                <div className="text-xs font-bold text-purple-200">Built-in Stadium Papare Track</div>
                <div className="text-[11px] text-purple-300/70 font-mono">/assets/music/papare_sample.mp3</div>
              </div>
            </div>
            <button
              onClick={() =>
                sendCommand('PLAY_MUSIC', {
                  src: '/assets/music/papare_sample.mp3',
                  loop: loopMusic,
                })
              }
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow"
            >
              <span>▶</span> Play Sample
            </button>
          </div>

          {/* Uploaded Playlist */}
          {musicFiles.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Custom Uploaded Tracks ({musicFiles.length})
              </h3>
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {musicFiles.map((m, idx) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-purple-950/40 border border-purple-800/40 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[260px]">
                      <span className="text-purple-400 font-mono text-[10px]">#{idx + 1}</span>
                      <span className="truncate text-purple-200 font-medium" title={m.name}>
                        {m.name}
                      </span>
                    </div>
                    <button
                      onClick={() => playMusic(m)}
                      className="px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors cursor-pointer flex items-center gap-1 shadow"
                    >
                      <span>▶</span> Play
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 4: 👥 TEAMS & ROSTERS                                                 */}
      {/* ========================================================================= */}
      <div
        className={activeTab === 'teams' ? 'block space-y-6' : 'hidden'}
        role="tabpanel"
        id="panel-teams"
        aria-labelledby="tab-teams"
      >
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          {/* Teams Toolbar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-800 gap-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider text-amber-400">
                  Tournament Teams &amp; Rosters
                </h2>
                <p className="text-xs text-slate-400">
                  Configure teams and player lists prior to the tournament — synced directly with the Android Scorer (port 8080)
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
                <span className={loadingTeams ? 'animate-spin' : ''}>🔄</span>{' '}
                {loadingTeams ? 'Syncing...' : 'Sync Scorer'}
              </button>

              <button
                onClick={exportTeamsJson}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors border border-slate-700 cursor-pointer"
                title="Export all rosters to JSON"
              >
                📥 Export JSON
              </button>

              <label
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors border border-slate-700 cursor-pointer"
                title="Import rosters from JSON"
              >
                📤 Import JSON
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

          {/* Participating Teams Grid */}
          {teams.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              No teams configured yet. Click &quot;+ Add New Team&quot; to get started!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team, idx) => {
                const teamCrest =
                  branding.teamLogos[team.name] ||
                  (idx % 2 === 0
                    ? '/assets/branding/tech-titans-logo.svg'
                    : '/assets/branding/sales-strikers-logo.svg');

                return (
                  <div
                    key={team.id || idx}
                    className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 flex flex-col justify-between shadow-md hover:border-slate-600 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-700/50 mb-2">
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-6 h-6 rounded bg-slate-900 overflow-hidden flex-shrink-0 border border-slate-700 p-0.5">
                            <img src={teamCrest} alt={team.name} className="w-full h-full object-contain" />
                          </div>
                          <span className="font-bold text-base text-amber-400 truncate">
                            {team.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                          {team.players?.length || 0} Players
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {team.players && team.players.length > 0 ? (
                          team.players.map((pName, pIdx) => {
                            const roleKey = branding.playerRoles?.[pName];
                            const roleInfo = roleKey ? PLAYER_ROLES[roleKey] : null;
                            return (
                              <span
                                key={pIdx}
                                className="px-2 py-0.5 rounded bg-slate-700/60 text-slate-200 text-[11px] inline-flex items-center gap-1"
                                title={roleInfo ? `${pName} (${roleInfo.label})` : pName}
                              >
                                {roleInfo && <span className="text-[10px]">{roleInfo.icon}</span>}
                                <span>{pName}</span>
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-slate-500 italic">No players listed</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-slate-700/50">
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 5: 🎨 BRANDING & VISUALS                                              */}
      {/* ========================================================================= */}
      <div
        className={activeTab === 'branding' ? 'block space-y-6' : 'hidden'}
        role="tabpanel"
        id="panel-branding"
        aria-labelledby="tab-branding"
      >
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          {/* Branding Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🎨</span>
                <h2 className="text-lg font-black uppercase tracking-wider text-amber-400">
                  Tournament Branding &amp; Visual Assets
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Customize Company Logo, Tournament Emblem, Team Crests, and Player Photos for TV Scoreboard
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={exportBrandingJson}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors border border-slate-700 cursor-pointer"
                title="Download branding backup as JSON"
              >
                📥 Export Branding
              </button>

              <label
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors border border-slate-700 cursor-pointer"
                title="Restore branding from JSON"
              >
                📤 Import Branding
                <input
                  ref={brandingJsonRef}
                  type="file"
                  accept="application/json"
                  onChange={importBrandingJson}
                  className="hidden"
                />
              </label>

              <button
                onClick={resetAllBranding}
                className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-semibold transition-colors cursor-pointer"
                title="Reset all branding to default graphics"
              >
                🔄 Reset All
              </button>
            </div>
          </div>

          {/* 1. Company & Tournament Logos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* Company Identity */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/50 mb-3">
                  <span className="font-bold text-sm text-slate-200">🏢 Company Branding</span>
                  <span className="text-[11px] text-slate-400">Displayed in Scoreboard Header</span>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center p-1 overflow-hidden shadow-inner flex-shrink-0">
                    <img
                      src={branding.companyLogo || DEFAULT_BRANDING.companyLogo}
                      alt="Company Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 font-semibold block mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={branding.companyName}
                      onChange={(e) =>
                        updateAndSaveBranding({ ...branding, companyName: e.target.value })
                      }
                      placeholder="e.g. Acme Corporation"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                <label className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow">
                  📁 Upload Company Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCompanyLogoUpload}
                    className="hidden"
                  />
                </label>
                {branding.companyLogo !== DEFAULT_BRANDING.companyLogo && (
                  <button
                    onClick={resetCompanyLogo}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Tournament Identity */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/50 mb-3">
                  <span className="font-bold text-sm text-slate-200">🏆 Match / Tournament Identity</span>
                  <span className="text-[11px] text-slate-400">Displayed in Center Header</span>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center p-1 overflow-hidden shadow-inner flex-shrink-0">
                    <img
                      src={branding.tournamentLogo || DEFAULT_BRANDING.tournamentLogo}
                      alt="Tournament Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 font-semibold block mb-1">
                      Tournament / Match Name
                    </label>
                    <input
                      type="text"
                      value={branding.tournamentName}
                      onChange={(e) =>
                        updateAndSaveBranding({ ...branding, tournamentName: e.target.value })
                      }
                      placeholder="e.g. Annual Champions Trophy 2026"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                <label className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors shadow">
                  📁 Upload Match Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMatchLogoUpload}
                    className="hidden"
                  />
                </label>
                {branding.tournamentLogo !== DEFAULT_BRANDING.tournamentLogo && (
                  <button
                    onClick={resetMatchLogo}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. Team Logos / Crests */}
          <div className="mb-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-4">
              <span className="font-bold text-sm text-slate-200">🛡️ Team Logos &amp; Crests</span>
              <span className="text-xs text-slate-400">Custom crests for each participating team</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {teams.map((t, idx) => {
                const currentTeamLogo =
                  branding.teamLogos[t.name] ||
                  DEFAULT_BRANDING.teamLogos[t.name] ||
                  (idx % 2 === 0
                    ? '/assets/branding/tech-titans-logo.svg'
                    : '/assets/branding/sales-strikers-logo.svg');

                const isCustom = Boolean(branding.teamLogos[t.name]);

                return (
                  <div
                    key={t.id || idx}
                    className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center p-1 overflow-hidden shadow flex-shrink-0">
                        <img
                          src={currentTeamLogo}
                          alt={t.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-xs text-slate-100 truncate">{t.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {isCustom ? 'Custom crest' : 'Default crest'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <label
                        className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                        title="Upload team crest"
                      >
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleTeamLogoUpload(t.name, e)}
                          className="hidden"
                        />
                      </label>
                      {isCustom && (
                        <button
                          onClick={() => resetTeamLogo(t.name)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
                          title="Reset to default"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Player Roles & Photos */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800 mb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-200">👤 Player Roles &amp; Photos</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
                    Select Role with Icons: 🏏 🎳 ⚡ 🧤
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assign player roles (Batting, Baller, All Rounder, Wicket Keeper) using icons, and upload player photos
                </p>
              </div>

              {/* Team Picker dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Select Team:</span>
                <select
                  value={selectedPlayerTeam || (teams[0]?.name ?? '')}
                  onChange={(e) => setSelectedPlayerTeam(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {teams.map((t, idx) => (
                    <option key={t.id || idx} value={t.name}>
                      {t.name} ({t.players?.length || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Player Grid for Selected Team */}
            {(() => {
              const currentTeamName = selectedPlayerTeam || teams[0]?.name;
              const currentTeamObj = teams.find((t) => t.name === currentTeamName) || teams[0];
              const playersList = currentTeamObj?.players || [];

              if (playersList.length === 0) {
                return (
                  <div className="text-center py-6 text-slate-500 text-xs italic">
                    No players in this team yet. Add players under the Teams section.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {playersList.map((playerName, pIdx) => {
                    const photoSrc =
                      branding.playerPhotos[playerName] ||
                      '/assets/branding/player-avatar-default.svg';
                    const hasCustom = Boolean(branding.playerPhotos[playerName]);
                    const currentRole = branding.playerRoles?.[playerName];
                    const currentRoleInfo = currentRole ? PLAYER_ROLES[currentRole] : null;

                    return (
                      <div
                        key={pIdx}
                        className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/70 flex flex-col justify-between gap-3 shadow-md hover:border-slate-600 transition-colors"
                      >
                        {/* Top: Avatar, Name & Current Role Badge */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 overflow-hidden shadow flex-shrink-0">
                            <img
                              src={photoSrc}
                              alt={playerName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="truncate flex-1">
                            <div className="font-bold text-sm text-slate-100 truncate">{playerName}</div>
                            <div className="mt-1">
                              {currentRoleInfo ? (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 shadow-sm ${currentRoleInfo.badgeClass}`}
                                >
                                  <span>{currentRoleInfo.icon}</span>
                                  <span>{currentRoleInfo.label}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">No role selected</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Middle: Icon Selector for Roles */}
                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                            <span>Select Role:</span>
                            <span className="text-[9px] text-slate-500">Click icon to set</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {(['batting', 'baller', 'all_rounder', 'wicket_keeper'] as PlayerRole[]).map(
                              (role) => {
                                const rInfo = PLAYER_ROLES[role];
                                const isSelected = currentRole === role;
                                return (
                                  <button
                                    key={role}
                                    type="button"
                                    onClick={() => handleSetPlayerRole(playerName, role)}
                                    className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all cursor-pointer ${
                                      isSelected
                                        ? `${rInfo.badgeClass} ring-2 ring-amber-400 font-bold shadow-md scale-105`
                                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                                    }`}
                                    title={`Select ${rInfo.label}`}
                                  >
                                    <span className="text-lg leading-tight">{rInfo.icon}</span>
                                    <span className="text-[9px] uppercase tracking-tighter truncate w-full text-center mt-0.5 font-semibold">
                                      {rInfo.shortLabel}
                                    </span>
                                  </button>
                                );
                              }
                            )}
                          </div>
                        </div>

                        {/* Bottom: Photo Upload & Remove */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700/50">
                          <span className="text-[10px] text-slate-400">
                            {hasCustom ? 'Photo uploaded' : 'Default photo'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <label
                              className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                              title={`Upload photo for ${playerName}`}
                            >
                              Photo
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handlePlayerPhotoUpload(playerName, e)}
                                className="hidden"
                              />
                            </label>
                            {hasCustom && (
                              <button
                                onClick={() => resetPlayerPhoto(playerName)}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
                                title="Remove custom photo"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DOCKED STICKY BOTTOM QUICK BROADCAST ACTIONS BAR                           */}
      {/* Permanently visible across ALL 5 tabs                                     */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/80 shadow-2xl px-4 md:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Title + Status Pills */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-base animate-pulse">⚡</span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                Quick Broadcast Actions
              </span>
            </div>

            {isMusicPlaying && (
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                <span>🎺</span>
                <span>Papare Active</span>
              </span>
            )}

            {activeMediaName && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5">
                <span>🎬</span>
                <span className="truncate max-w-[120px]">{activeMediaName}</span>
              </span>
            )}
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() =>
                sendCommand('PLAY_MUSIC', {
                  src: musicFiles[0]?.url || '/assets/music/papare_sample.mp3',
                  loop: loopMusic,
                })
              }
              className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                isMusicPlaying
                  ? 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-purple-600/40 animate-pulse'
                  : 'bg-purple-600/90 hover:bg-purple-500 text-white shadow-purple-600/20'
              }`}
            >
              <span>🎺</span>
              <span>Quick Papare</span>
            </button>

            <button
              onClick={stopMusic}
              disabled={!isMusicPlaying}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border flex items-center gap-1.5 cursor-pointer ${
                isMusicPlaying
                  ? 'bg-rose-950/70 hover:bg-rose-900 text-rose-300 border-rose-800'
                  : 'bg-slate-800/60 text-slate-500 border-slate-700/50 cursor-not-allowed'
              }`}
            >
              <span>🔇</span>
              <span>Stop Music</span>
            </button>

            <button
              onClick={stopAd}
              disabled={!activeMediaName}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border flex items-center gap-1.5 cursor-pointer ${
                activeMediaName
                  ? 'bg-amber-950/70 hover:bg-amber-900 text-amber-300 border-amber-800'
                  : 'bg-slate-800/60 text-slate-500 border-slate-700/50 cursor-not-allowed'
              }`}
            >
              <span>⏹</span>
              <span>Hide Ad</span>
            </button>

            <button
              onClick={() => sendCommand('CLEAR_RESULT')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700 cursor-pointer flex items-center gap-1.5"
            >
              <span>✕</span>
              <span>Clear Result</span>
            </button>

            <Link
              href="/"
              className="px-3.5 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ml-1"
            >
              <span>📺</span>
              <span className="hidden md:inline">TV Screen</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS (Hoisted at root level for flawless cross-tab operation)           */}
      {/* ========================================================================= */}

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
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
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
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-amber-400/20 cursor-pointer"
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
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTeam(teamToDelete)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
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
