'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MediaItem, AdminActionType, ScoreData } from '@/types/cricket';

export default function AdminPage() {
  const [androidIp, setAndroidIp] = useState<string>('');
  const [ipInput, setIpInput] = useState<string>('');
  const [connStatus, setConnStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  // Mini Score Preview
  const [previewScore, setPreviewScore] = useState<ScoreData | null>(null);

  // Media Libraries
  const [videoAds, setVideoAds] = useState<MediaItem[]>([]);
  const [imageAds, setImageAds] = useState<MediaItem[]>([]);
  const [musicFiles, setMusicFiles] = useState<MediaItem[]>([]);

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

  useEffect(() => {
    const saved = localStorage.getItem('cricket_android_ip');
    if (saved) {
      setAndroidIp(saved);
      setIpInput(saved);
    }
    addLog('Admin console initialized. Ready to connect.', 'info');
  }, []);

  const handleSaveIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipInput.trim()) return;
    setAndroidIp(ipInput.trim());
    localStorage.setItem('cricket_android_ip', ipInput.trim());
    addLog(`Target Android IP set to: ${ipInput.trim()}`, 'success');
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

  // File Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'image' | 'music') => {
    const files = e.target.files;
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
    e.target.value = '';
  };

  const playVideoAd = (item: MediaItem) => {
    setActiveMediaName(item.name);
    sendCommand('PLAY_VIDEO_AD', { src: item.url });
  };

  const playImageAd = (item: MediaItem) => {
    setActiveMediaName(item.name);
    sendCommand('PLAY_IMAGE_AD', { src: item.url });

    if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
    if (imageDuration > 0) {
      autoStopTimeoutRef.current = setTimeout(() => {
        sendCommand('STOP_AD');
        setActiveMediaName(null);
        addLog(`Image ad [${item.name}] auto-stopped after ${imageDuration}s`, 'info');
      }, imageDuration * 1000);
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
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors"
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
              <span className="text-xs text-slate-400 block font-semibold">Score</span>
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

            <label className="border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors mb-4 block">
              <span className="text-2xl">📹</span>
              <span className="text-xs font-semibold text-slate-300">
                Click to upload video ads (.mp4, .webm)
              </span>
              <input
                type="file"
                accept="video/*"
                multiple
                onChange={(e) => handleFileUpload(e, 'video')}
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
                      className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
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
            className="w-full mt-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold uppercase tracking-wider transition-colors"
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

            <label className="border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors mb-4 block">
              <span className="text-2xl">📸</span>
              <span className="text-xs font-semibold text-slate-300">
                Click to upload image ads (.jpg, .png)
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileUpload(e, 'image')}
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
                      className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
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
                min="5"
                max="300"
                value={imageDuration}
                onChange={(e) => setImageDuration(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-center text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400 font-semibold uppercase">
                Secs Auto-Stop
              </span>
            </div>

            <button
              onClick={stopAd}
              className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold uppercase transition-colors"
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

            <label className="border-2 border-dashed border-purple-800/60 hover:border-purple-400 rounded-xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors mb-4 block">
              <span className="text-2xl">🎵</span>
              <span className="text-xs font-semibold text-slate-300">
                Click to upload Papare tracks (.mp3, .wav)
              </span>
              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={(e) => handleFileUpload(e, 'music')}
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
                      className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors"
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
                className="rounded accent-purple-500"
              />
              Loop music continuously until stopped
            </label>

            <button
              onClick={stopMusic}
              className={`w-full py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-colors ${
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
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-purple-600/20"
          >
            🎺 Quick Papare Loop
          </button>

          <button
            onClick={stopMusic}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700"
          >
            🔇 Mute Music
          </button>

          <button
            onClick={stopAd}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700"
          >
            ⏹ Hide Current Ad
          </button>

          <button
            onClick={() => sendCommand('CLEAR_RESULT')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700"
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
            className="text-[10px] text-slate-500 hover:text-slate-300 uppercase font-bold"
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
    </main>
  );
}
