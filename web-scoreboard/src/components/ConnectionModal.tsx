'use strict';
import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  initialIp: string;
  onConnect: (ip: string) => void;
}

export const ConnectionModal: React.FC<Props> = ({ isOpen, initialIp, onConnect }) => {
  const [ip, setIp] = useState(initialIp);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ip.trim()) {
      onConnect(ip.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl text-center">
        <div className="text-5xl mb-4">🏏</div>
        <h2 className="text-2xl font-black text-amber-400 tracking-wide mb-2">
          Cricket Scoreboard
        </h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Enter the IP address of the Android scorer device.<br />
          Both devices must be on the same local Wi-Fi network.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="e.g. 192.168.1.45"
            className="w-full px-5 py-3.5 bg-slate-800 border border-slate-700 rounded-xl text-center text-lg font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            autoFocus
          />

          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-amber-400 text-slate-950 font-black text-base uppercase tracking-wider hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20"
          >
            Connect &amp; Start
          </button>
        </form>

        <p className="text-xs text-slate-500 mt-5">
          Find the device IP displayed at the top of the Android Scorer app.
        </p>
      </div>
    </div>
  );
};
