'use client';

import React, { useEffect, useState } from 'react';

interface AnalogWatchProps {
  className?: string;
  size?: number; // optional custom diameter in px, defaults to responsive
  showDate?: boolean;
}

export default function AnalogWatch({
  className = '',
  showDate = true,
}: AnalogWatchProps) {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    dayOfMonth: number;
    dayOfWeek: string;
    formatted: string;
  }>({
    hours: 10,
    minutes: 10,
    seconds: 0,
    dayOfMonth: 1,
    dayOfWeek: 'SAT',
    formatted: '10:10 AM',
  });

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const dayOfMonth = now.getDate();
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const dayOfWeek = days[now.getDay()];

      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hr12 = hours % 12 || 12;
      const minPad = minutes < 10 ? `0${minutes}` : `${minutes}`;
      const secPad = seconds < 10 ? `0${seconds}` : `${seconds}`;

      setTime({
        hours,
        minutes,
        seconds,
        dayOfMonth,
        dayOfWeek,
        formatted: `${hr12}:${minPad}:${secPad} ${ampm}`,
      });
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute angles in degrees
  const secAngle = (time.seconds / 60) * 360;
  const minAngle = ((time.minutes + time.seconds / 60) / 60) * 360;
  const hrAngle = (((time.hours % 12) + time.minutes / 60 + time.seconds / 3600) / 12) * 360;

  // 12 hour ticks
  const hourTicks = Array.from({ length: 12 }, (_, i) => {
    const angle = i * 30; // 30 deg per hour
    const rad = (angle - 90) * (Math.PI / 180);
    const isMajor = i % 3 === 0; // 12, 3, 6, 9
    const rOuter = 44;
    const rInner = isMajor ? 36 : 39;
    const x1 = 50 + rInner * Math.cos(rad);
    const y1 = 50 + rInner * Math.sin(rad);
    const x2 = 50 + rOuter * Math.cos(rad);
    const y2 = 50 + rOuter * Math.sin(rad);

    // Label position
    const rLabel = 30;
    const lx = 50 + rLabel * Math.cos(rad);
    const ly = 50 + rLabel * Math.sin(rad);
    const num = i === 0 ? 12 : i;

    return {
      index: i,
      x1,
      y1,
      x2,
      y2,
      isMajor,
      showNumber: isMajor,
      number: num,
      lx,
      ly,
    };
  });

  // 60 minute ticks (minor dots/ticks)
  const minuteTicks = Array.from({ length: 60 }, (_, i) => {
    if (i % 5 === 0) return null; // Skip where hour ticks exist
    const angle = i * 6;
    const rad = (angle - 90) * (Math.PI / 180);
    const rOuter = 44;
    const rInner = 41.5;
    const x1 = 50 + rInner * Math.cos(rad);
    const y1 = 50 + rInner * Math.sin(rad);
    const x2 = 50 + rOuter * Math.cos(rad);
    const y2 = 50 + rOuter * Math.sin(rad);
    return { x1, y1, x2, y2, index: i };
  }).filter(Boolean);

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none group ${className}`}
      title={mounted ? time.formatted : 'Stadium Clock'}
    >
      <svg
        viewBox="0 0 106 100"
        className="w-full h-full filter drop-shadow-md overflow-visible"
      >
        <defs>
          {/* Bezel Metallic Rim Gradient */}
          <linearGradient id="watchBezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a47" />
            <stop offset="50%" stopColor="#0a2530" />
            <stop offset="100%" stopColor="#165a6b" />
          </linearGradient>

          {/* Dial Face Radial Gradient */}
          <radialGradient id="watchDialGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#042633" />
            <stop offset="70%" stopColor="#021720" />
            <stop offset="100%" stopColor="#010e14" />
          </radialGradient>

          {/* Lume Glow for Hands */}
          <filter id="watchLume" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="#38bdf8" floodOpacity="0.6" />
          </filter>

          {/* Second Hand Neon Glow */}
          <filter id="secondLume" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.9" floodColor="#d4fc04" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* ── Watch Crown (at 3 o'clock on outer right) ── */}
        <path
          d="M 97 45.5 L 102 46.5 L 102 53.5 L 97 54.5 Z"
          fill="#165a6b"
          stroke="#38bdf8"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        {/* Crown ridges */}
        <line x1="99" y1="47" x2="99" y2="53" stroke="#031f29" strokeWidth="0.8" />
        <line x1="100.5" y1="47.2" x2="100.5" y2="52.8" stroke="#031f29" strokeWidth="0.8" />

        {/* ── Outer Watch Case / Bezel ── */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="url(#watchBezelGrad)"
          stroke="#165a6b"
          strokeWidth="1.8"
        />

        {/* Inset Inner Bezel Ring */}
        <circle
          cx="50"
          cy="50"
          r="45.5"
          fill="none"
          stroke="#093844"
          strokeWidth="0.9"
        />

        {/* ── Dial Face ── */}
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="url(#watchDialGrad)"
        />

        {/* Subtle Dial Track Circle */}
        <circle
          cx="50"
          cy="50"
          r="37"
          fill="none"
          stroke="#0f4554"
          strokeWidth="0.5"
          strokeDasharray="1.5 2"
        />

        {/* Minor Minute Ticks */}
        {minuteTicks.map((t) => (
          <line
            key={`m-${t!.index}`}
            x1={t!.x1}
            y1={t!.y1}
            x2={t!.x2}
            y2={t!.y2}
            stroke="#476d7c"
            strokeWidth="0.6"
            strokeLinecap="round"
          />
        ))}

        {/* Major Hour Ticks */}
        {hourTicks.map((t) => (
          <line
            key={`h-${t.index}`}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.isMajor ? '#38bdf8' : '#e2e8f0'}
            strokeWidth={t.isMajor ? '2' : '1.2'}
            strokeLinecap="round"
          />
        ))}

        {/* Hour Numerals (12, 3, 6, 9) */}
        {hourTicks
          .filter((t) => t.showNumber)
          .map((t) => (
            <text
              key={`num-${t.index}`}
              x={t.lx}
              y={t.ly + 2.5}
              textAnchor="middle"
              dominantBaseline="middle"
              className="font-['Barlow_Condensed',sans-serif] font-black"
              fill={t.number === 12 ? '#d4fc04' : '#f8fafc'}
              fontSize="8.5"
              letterSpacing="-0.3"
            >
              {t.number}
            </text>
          ))}

        {/* Brand / Subtitle Watermark under 12 */}
        <text
          x="50"
          y="38"
          textAnchor="middle"
          fill="#38bdf8"
          fontSize="3"
          letterSpacing="0.8"
          className="font-['Barlow_Condensed',sans-serif] font-bold uppercase opacity-80"
        >
          LIVE
        </text>

        {/* Date Window at 3 o'clock (Chronograph Style) */}
        {showDate && (
          <g transform="translate(64, 46)">
            <rect
              x="0"
              y="0"
              width="13"
              height="8"
              rx="1.5"
              fill="#031820"
              stroke="#165a6b"
              strokeWidth="0.8"
            />
            <text
              x="6.5"
              y="5.5"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#38bdf8"
              fontSize="4.5"
              className="font-['Barlow_Condensed',sans-serif] font-bold tabular-nums"
            >
              {mounted ? time.dayOfMonth : '05'}
            </text>
          </g>
        )}

        {/* Subdial / Second Indicator Track at 6 o'clock */}
        <circle
          cx="50"
          cy="64"
          r="8"
          fill="#02141a"
          stroke="#0e4857"
          strokeWidth="0.6"
        />
        <text
          x="50"
          y="65.5"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#64748b"
          fontSize="3.2"
          className="font-['Barlow_Condensed',sans-serif] font-black tracking-widest uppercase"
        >
          SEC
        </text>

        {/* ── HOUR HAND ── */}
        <g
          transform={`rotate(${hrAngle} 50 50)`}
          className="transition-transform duration-300 ease-out"
        >
          {/* Hour hand body */}
          <polygon
            points="48.2,50 49,27 50,23 51,27 51.8,50 51,55 49,55"
            fill="#f8fafc"
            stroke="#093844"
            strokeWidth="0.6"
          />
          {/* Lume insert */}
          <line
            x1="50"
            y1="46"
            x2="50"
            y2="28"
            stroke="#38bdf8"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        </g>

        {/* ── MINUTE HAND ── */}
        <g
          transform={`rotate(${minAngle} 50 50)`}
          className="transition-transform duration-300 ease-out"
        >
          {/* Minute hand body */}
          <polygon
            points="48.5,50 49.3,16 50,12 50.7,16 51.5,50 51,57 49,57"
            fill="#e2e8f0"
            stroke="#093844"
            strokeWidth="0.6"
          />
          {/* Lume insert */}
          <line
            x1="50"
            y1="46"
            x2="50"
            y2="18"
            stroke="#38bdf8"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>

        {/* ── SECOND HAND ── */}
        <g
          transform={`rotate(${secAngle} 50 50)`}
          className="transition-transform duration-100 ease-linear"
        >
          {/* Counterweight tail */}
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="62"
            stroke="#d4fc04"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
          <circle cx="50" cy="58" r="1.8" fill="#d4fc04" />
          {/* Needle to tick edge */}
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="10"
            stroke="#d4fc04"
            strokeWidth="0.9"
            strokeLinecap="round"
            filter="url(#secondLume)"
          />
          {/* Arrow tip or accent dot */}
          <polygon points="49.2,16 50,11 50.8,16" fill="#d4fc04" />
        </g>

        {/* ── CENTER PIN / PIVOT CAP ── */}
        <circle cx="50" cy="50" r="3.2" fill="#0f4554" stroke="#165a6b" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="1.8" fill="#d4fc04" />
        <circle cx="50" cy="50" r="0.6" fill="#031820" />
      </svg>
    </div>
  );
}
