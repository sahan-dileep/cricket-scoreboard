'use client';

import React, { useEffect, useRef } from 'react';

interface Props {
  isPlaying: boolean;
  audioSrc?: string | null;
  loop?: boolean;
}

class WebAudioPapareSynthesizer {
  private ctx: AudioContext | null = null;
  private isRunning = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  start() {
    if (this.isRunning) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.isRunning = true;
      this.playLoop();
    } catch (e) {
      console.warn('Web Audio synthesis failed to start:', e);
    }
  }

  private playTone(freq: number, startTime: number, duration: number) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Brass-like sawtooth tone
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, startTime);

      // Attack & decay envelope
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch {
      // Audio context might be closing
    }
  }

  private playLoop = () => {
    if (!this.isRunning || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime + 0.05;
    // Classic upbeat Sri Lankan Papare brass fanfare pattern:
    const notes = [
      { freq: 523.25, dur: 0.18, offset: 0.0 }, // C5
      { freq: 659.25, dur: 0.18, offset: 0.2 }, // E5
      { freq: 784.0, dur: 0.22, offset: 0.4 }, // G5
      { freq: 1046.5, dur: 0.38, offset: 0.65 }, // C6
      { freq: 784.0, dur: 0.18, offset: 1.1 }, // G5
      { freq: 1046.5, dur: 0.42, offset: 1.32 }, // C6
      { freq: 880.0, dur: 0.18, offset: 1.85 }, // A5
      { freq: 784.0, dur: 0.18, offset: 2.05 }, // G5
      { freq: 659.25, dur: 0.22, offset: 2.25 }, // E5
      { freq: 523.25, dur: 0.38, offset: 2.5 }, // C5
    ];

    notes.forEach((n) => {
      this.playTone(n.freq, now + n.offset, n.dur);
    });

    this.timer = setTimeout(this.playLoop, 3200);
  };

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        this.ctx.close().catch(() => {});
      } catch {}
      this.ctx = null;
    }
  }
}

export const MusicBar: React.FC<Props> = ({ isPlaying, audioSrc, loop = true }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<WebAudioPapareSynthesizer | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!synthRef.current) {
      synthRef.current = new WebAudioPapareSynthesizer();
    }

    const synth = synthRef.current;
    const audio = audioRef.current;

    if (isPlaying) {
      const src = audioSrc || '/assets/music/papare_sample.mp3';
      if (audio) {
        audio.src = src;
        audio.loop = loop;
        audio
          .play()
          .then(() => {
            if (cancelled) return;
            // Audio played successfully, stop any synthetic fallback
            synth.stop();
          })
          .catch((err) => {
            if (isPlaying && !cancelled) {
              console.warn('Audio element play failed, falling back to Web Audio API:', err);
              synth.start();
            }
          });
      } else {
        if (isPlaying && !cancelled) {
          synth.start();
        }
      }
    } else {
      // Stopped on STOP_MUSIC command
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      synth.stop();
    }

    return () => {
      cancelled = true;
      if (audio) {
        audio.pause();
      }
      synth.stop();
    };
  }, [isPlaying, audioSrc, loop]);

  if (!isPlaying) {
    return <audio ref={audioRef} preload="auto" className="hidden" />;
  }

  return (
    <div
      data-testid="music-bar"
      className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-950/95 via-indigo-950/95 to-purple-950/95 border-t border-purple-500/40 px-6 py-2.5 flex items-center justify-between shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-300"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl animate-bounce select-none">🎺</span>
        <div>
          <div className="text-sm font-black text-purple-200 uppercase tracking-wider">
            Papare Music Playing
          </div>
          <div className="text-[10px] text-purple-400 font-medium">
            Sri Lankan Brass Band Vibes · Loop Mode Active
          </div>
        </div>
      </div>

      {/* Animated Waveform Equalizer Bars */}
      <div className="flex items-end gap-1.5 h-6">
        <span className="w-1.5 bg-purple-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3" />
        <span className="w-1.5 bg-purple-300 rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.1s] h-5" />
        <span className="w-1.5 bg-purple-200 rounded-full animate-[pulse_0.7s_ease-in-out_infinite_0.2s] h-6" />
        <span className="w-1.5 bg-purple-400 rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.15s] h-4" />
        <span className="w-1.5 bg-purple-300 rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.25s] h-5" />
      </div>

      <audio
        ref={audioRef}
        loop={loop}
        preload="auto"
        onError={() => {
          if (isPlaying) {
            synthRef.current?.start();
          }
        }}
        className="hidden"
      />
    </div>
  );
};
