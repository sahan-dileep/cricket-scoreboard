import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webScoreboardDir = path.join(__dirname, '..');

test('Audio assets exist and have valid audio content', () => {
  const mp3Path = path.join(webScoreboardDir, 'public', 'assets', 'music', 'papare_sample.mp3');
  const wavPath = path.join(webScoreboardDir, 'public', 'assets', 'music', 'papare_sample.wav');

  assert.ok(fs.existsSync(mp3Path), 'papare_sample.mp3 should exist');
  assert.ok(fs.existsSync(wavPath), 'papare_sample.wav should exist');

  const mp3Stats = fs.statSync(mp3Path);
  const wavStats = fs.statSync(wavPath);

  assert.ok(mp3Stats.size > 10000, 'mp3 audio file should be non-trivial size');
  assert.ok(wavStats.size > 10000, 'wav audio file should be non-trivial size');
});

test('RecentBalls implements 3-over clamp and exact color coding', () => {
  const recentBallsCode = fs.readFileSync(
    path.join(webScoreboardDir, 'src', 'components', 'RecentBalls.tsx'),
    'utf-8'
  );

  // Requirement: strictly clamp to last 3 overs
  assert.ok(
    recentBallsCode.includes('.slice(-3)'),
    'RecentBalls must slice(-3) to strictly display the last 3 overs'
  );

  // Color coding specifications:
  // dot: grey
  assert.ok(recentBallsCode.includes('bg-slate-700 text-slate-300'), 'dot must be grey');
  // 1-3: blue
  assert.ok(recentBallsCode.includes('bg-blue-600 text-white'), '1-3 runs must be blue');
  // 4: green
  assert.ok(recentBallsCode.includes('bg-emerald-600 text-white'), '4s must be green');
  // 6: orange
  assert.ok(recentBallsCode.includes('bg-orange-500 text-white'), '6s must be orange');
  // W: red
  assert.ok(recentBallsCode.includes('bg-red-600 text-white'), 'Wickets must be red');
  // wide/nb: purple
  assert.ok(recentBallsCode.includes('bg-purple-600 text-white'), 'Wide and No-ball must be purple');
});

test('ResultBanner component exists and supports CLEAR_RESULT flow', () => {
  const bannerCode = fs.readFileSync(
    path.join(webScoreboardDir, 'src', 'components', 'ResultBanner.tsx'),
    'utf-8'
  );
  const pageCode = fs.readFileSync(
    path.join(webScoreboardDir, 'src', 'app', 'page.tsx'),
    'utf-8'
  );

  assert.ok(bannerCode.includes('ResultBanner'), 'ResultBanner component must be exported');
  assert.ok(bannerCode.includes('result-banner'), 'ResultBanner should have data-testid');
  assert.ok(bannerCode.includes('onDismiss'), 'ResultBanner must support dismiss');

  assert.ok(pageCode.includes('<ResultBanner'), 'page.tsx must mount ResultBanner');
  assert.ok(pageCode.includes('CLEAR_RESULT'), 'page.tsx must handle CLEAR_RESULT');
  assert.ok(pageCode.includes('resultDismissed'), 'page.tsx must track dismissal state');
});

test('Admin page wires native drag-and-drop event handlers', () => {
  const adminCode = fs.readFileSync(
    path.join(webScoreboardDir, 'src', 'app', 'admin', 'page.tsx'),
    'utf-8'
  );

  assert.ok(adminCode.includes('onDragOver'), 'Admin must have onDragOver handler');
  assert.ok(adminCode.includes('onDragLeave'), 'Admin must have onDragLeave handler');
  assert.ok(adminCode.includes('onDrop'), 'Admin must have onDrop handler');
  assert.ok(adminCode.includes('e.dataTransfer.files'), 'Admin onDrop must extract dataTransfer files');
});

test('MusicBar has continuous looping audio and Web Audio fallback', () => {
  const musicCode = fs.readFileSync(
    path.join(webScoreboardDir, 'src', 'components', 'MusicBar.tsx'),
    'utf-8'
  );

  assert.ok(musicCode.includes('WebAudioPapareSynthesizer'), 'Must include Web Audio fallback synthesizer');
  assert.ok(musicCode.includes('audio.loop = loop'), 'Audio element must loop');
  assert.ok(musicCode.includes('audio.pause()'), 'Audio must pause on STOP_MUSIC');
  assert.ok(musicCode.includes('music-bar'), 'Must have music-bar data-testid');
  assert.ok(musicCode.includes('🎺'), 'Must include animated trumpet emoji');
  assert.ok(musicCode.includes('animate-[pulse_'), 'Must include waveform pulse bars');
});

test('Layout metadata is properly set', () => {
  const layoutCode = fs.readFileSync(
    path.join(webScoreboardDir, 'src', 'app', 'layout.tsx'),
    'utf-8'
  );

  assert.ok(
    layoutCode.includes('Cricket Live Broadcast Scoreboard'),
    'layout.tsx must contain title "Cricket Live Broadcast Scoreboard"'
  );
});
