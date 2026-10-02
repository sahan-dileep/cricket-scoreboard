'use strict';
import React, { useEffect, useRef } from 'react';

interface Props {
  isPlaying: boolean;
  audioSrc?: string | null;
  loop?: boolean;
}

export const MusicBar: React.FC<Props> = ({ isPlaying, audioSrc, loop = true }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying && audioSrc) {
      audioRef.current.src = audioSrc;
      audioRef.current.loop = loop;
      audioRef.current.play().catch((err) => {
        console.warn('Audio auto-play was prevented by browser policy:', err);
      });
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [isPlaying, audioSrc, loop]);

  if (!isPlaying) return <audio ref={audioRef} preload="auto" />;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-950/95 via-indigo-950/95 to-purple-950/95 border-t border-purple-500/40 px-6 py-2.5 flex items-center justify-between shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-3">
        <span className="text-2xl animate-bounce">🎺</span>
        <div>
          <div className="text-sm font-black text-purple-200 uppercase tracking-wider">
            Papare Music Playing
          </div>
          <div className="text-[10px] text-purple-400 font-medium">
            Sri Lankan Brass Band Vibes · Loop Mode Active
          </div>
        </div>
      </div>

      {/* Animated Waveform */}
      <div className="flex items-end gap-1.5 h-6">
        <span className="w-1.5 bg-purple-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3" />
        <span className="w-1.5 bg-purple-300 rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.1s] h-5" />
        <span className="w-1.5 bg-purple-200 rounded-full animate-[pulse_0.7s_ease-in-out_infinite_0.2s] h-6" />
        <span className="w-1.5 bg-purple-400 rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.15s] h-4" />
        <span className="w-1.5 bg-purple-300 rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.25s] h-5" />
      </div>

      <audio ref={audioRef} preload="auto" />
    </div>
  );
};
