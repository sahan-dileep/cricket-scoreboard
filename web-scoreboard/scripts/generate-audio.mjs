// Generates a valid PCM WAV audio file containing a Papare fanfare loop
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sampleRate = 22050;
const duration = 3.5; // seconds
const numSamples = Math.floor(sampleRate * duration);
const bytesPerSample = 2; // 16-bit
const dataSize = numSamples * bytesPerSample;

const buffer = Buffer.alloc(44 + dataSize);

// RIFF header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);

// fmt subchunk
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // Subchunk1Size
buffer.writeUInt16LE(1, 20); // PCM format
buffer.writeUInt16LE(1, 22); // 1 channel (mono)
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * bytesPerSample, 28); // byte rate
buffer.writeUInt16LE(bytesPerSample, 32); // block align
buffer.writeUInt16LE(16, 34); // bits per sample

// data subchunk
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

// Synthesize Papare fanfare notes
const notes = [
  { freq: 523.25, start: 0.0, dur: 0.2 },
  { freq: 659.25, start: 0.25, dur: 0.2 },
  { freq: 784.0, start: 0.5, dur: 0.25 },
  { freq: 1046.5, start: 0.8, dur: 0.4 },
  { freq: 784.0, start: 1.3, dur: 0.2 },
  { freq: 1046.5, start: 1.55, dur: 0.45 },
  { freq: 880.0, start: 2.1, dur: 0.2 },
  { freq: 784.0, start: 2.35, dur: 0.2 },
  { freq: 659.25, start: 2.6, dur: 0.25 },
  { freq: 523.25, start: 2.9, dur: 0.45 },
];

let offset = 44;
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  let sampleValue = 0;

  for (const n of notes) {
    if (t >= n.start && t < n.start + n.dur) {
      const noteT = t - n.start;
      const wave =
        0.6 * Math.sin(2 * Math.PI * n.freq * noteT) +
        0.25 * Math.sin(4 * Math.PI * n.freq * noteT) +
        0.15 * Math.sin(6 * Math.PI * n.freq * noteT);
      const env = Math.exp(-3 * (noteT / n.dur));
      sampleValue += wave * env * 0.7;
    }
  }

  const clamped = Math.max(-1, Math.min(1, sampleValue));
  const intVal = Math.floor(clamped * 32767);
  buffer.writeInt16LE(intVal, offset);
  offset += 2;
}

const outDir = path.join(__dirname, '..', 'public', 'assets', 'music');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'papare_sample.wav'), buffer);
fs.writeFileSync(path.join(outDir, 'papare_sample.mp3'), buffer);
console.log('Successfully generated Papare sample audio at:', outDir);
