'use client';

import React, { useEffect, useState } from 'react';

interface AnalogWatchProps {
  className?: string;
  size?: number; // optional custom diameter in px, defaults to responsive
}

export default function AnalogWatch({
  className = '',
}: AnalogWatchProps) {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    formatted: string;
  }>({
    hours: 11,
    minutes: 0,
    seconds: 26,
    formatted: '11:00:26 AM',
  });

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hr12 = hours % 12 || 12;
      const minPad = minutes < 10 ? `0${minutes}` : `${minutes}`;
      const secPad = seconds < 10 ? `0${seconds}` : `${seconds}`;

      setTime({
        hours,
        minutes,
        seconds,
        formatted: `${hr12}:${minPad}:${secPad} ${ampm}`,
      });
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute rotation angles in degrees
  const secAngle = (time.seconds / 60) * 360;
  const minAngle = ((time.minutes + time.seconds / 60) / 60) * 360;
  const hrAngle = (((time.hours % 12) + time.minutes / 60 + time.seconds / 3600) / 12) * 360;

  // 60 tick marks around the perimeter matching the reference photo
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const angle = i * 6; // 6 degrees per minute
    const rad = (angle - 90) * (Math.PI / 180);
    const isHour = i % 5 === 0;

    // Outer and inner radii
    const rOuter = 46.5;
    const rInner = isHour ? 39.5 : 43.2;

    const x1 = Math.round((50 + rInner * Math.cos(rad)) * 100) / 100;
    const y1 = Math.round((50 + rInner * Math.sin(rad)) * 100) / 100;
    const x2 = Math.round((50 + rOuter * Math.cos(rad)) * 100) / 100;
    const y2 = Math.round((50 + rOuter * Math.sin(rad)) * 100) / 100;

    return {
      index: i,
      x1,
      y1,
      x2,
      y2,
      isHour,
    };
  });

  // 12 hour numbers (1 to 12) matching the reference photo
  const hourNumbers = Array.from({ length: 12 }, (_, i) => {
    const num = i + 1;
    const angle = num * 30; // 30 degrees per hour
    const rad = (angle - 90) * (Math.PI / 180);
    const rNum = 30.5;

    const x = Math.round((50 + rNum * Math.cos(rad)) * 100) / 100;
    const y = Math.round((50 + rNum * Math.sin(rad)) * 100) / 100;

    return { num, x, y };
  });

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      title={mounted ? time.formatted : 'Clock'}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full filter drop-shadow-lg overflow-visible"
      >
        <defs>
          {/* Subtle soft gradient for dial face */}
          <radialGradient id="clockDialGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="85%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#edf2f7" />
          </radialGradient>
        </defs>

        {/* ── Outer Clock Face ── */}
        <circle
          cx="50"
          cy="50"
          r="48.5"
          fill="url(#clockDialGrad)"
          stroke="#cbd5e1"
          strokeWidth="0.8"
        />

        {/* ── 60 Minute & Hour Tick Marks ── */}
        {ticks.map((t) => (
          <line
            key={`tick-${t.index}`}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="#0f172a"
            strokeWidth={t.isHour ? '2.4' : '0.9'}
            strokeLinecap="round"
          />
        ))}

        {/* ── 12 Hour Numbers (1 - 12) ── */}
        {hourNumbers.map(({ num, x, y }) => (
          <text
            key={`num-${num}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#0f172a"
            fontSize="7.8"
            fontWeight="600"
            className="font-sans select-none pointer-events-none"
          >
            {num}
          </text>
        ))}

        {/* (No brand or watermark text as requested) */}

        {/* ── HOUR HAND (Bold Black Baton) ── */}
        <g
          transform={`rotate(${hrAngle} 50 50)`}
          className="transition-transform duration-300 ease-out"
        >
          <rect
            x="47.75"
            y="23"
            width="4.5"
            height="32"
            rx="2.25"
            fill="#0f172a"
          />
        </g>

        {/* ── MINUTE HAND (Longer Black Baton) ── */}
        <g
          transform={`rotate(${minAngle} 50 50)`}
          className="transition-transform duration-300 ease-out"
        >
          <rect
            x="48.7"
            y="10.5"
            width="2.6"
            height="45"
            rx="1.3"
            fill="#0f172a"
          />
        </g>

        {/* ── SECOND HAND (Amber / Orange Needle) ── */}
        <g
          transform={`rotate(${secAngle} 50 50)`}
          className="transition-transform duration-100 ease-linear"
        >
          {/* Needle extending to outer perimeter with counterweight tail */}
          <line
            x1="50"
            y1="59"
            x2="50"
            y2="7.5"
            stroke="#f59e0b"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        </g>

        {/* ── CENTER HUB (Orange Button Cap) ── */}
        <circle cx="50" cy="50" r="3.8" fill="#f59e0b" />
        <circle cx="50" cy="50" r="1.1" fill="#d97706" />
      </svg>
    </div>
  );
}
