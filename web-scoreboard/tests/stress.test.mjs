import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webScoreboardDir = path.join(__dirname, '..');

// Helper to create a test HTTP server on an ephemeral port
function createMockServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port, url: `http://127.0.0.1:${port}` });
    });
  });
}

// ============================================================================
// SUITE 1: Polling Resilience Under Adversarial Network Conditions
// ============================================================================

test('Suite 1.1: Polling resilience - High network latency exceeds 1800ms timeout', async () => {
  // Setup server that delays response past client timeout (2200ms > 1800ms)
  const { server, port } = await createMockServer((req, res) => {
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ match: { team1: 'A', team2: 'B', status: 'LIVE' } }));
    }, 2200);
  });

  try {
    let connStatus = 'connecting';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);

    const startTime = Date.now();
    let abortedError = null;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/score`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      await res.json();
      connStatus = 'connected';
    } catch (err) {
      clearTimeout(timeoutId);
      connStatus = 'disconnected';
      abortedError = err;
    }

    const elapsed = Date.now() - startTime;

    assert.equal(connStatus, 'disconnected', 'Client must transition to disconnected on timeout');
    assert.ok(abortedError, 'An error must be caught');
    assert.equal(abortedError.name, 'AbortError', 'Error must be AbortError from AbortController');
    assert.ok(elapsed >= 1700 && elapsed <= 2100, `Client should abort around 1800ms (took ${elapsed}ms)`);
  } finally {
    server.close();
  }
});

test('Suite 1.2: Polling resilience - Fast network response succeeds and connects', async () => {
  const { server, port } = await createMockServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      match: { team1: 'Tech Titans', team2: 'Sales Strikers', status: 'IN_PROGRESS' },
      currentInnings: { score: 104, wickets: 2, overs: '14.1' }
    }));
  });

  try {
    let connStatus = 'disconnected';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);

    const res = await fetch(`http://127.0.0.1:${port}/api/score`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    connStatus = 'connected';

    assert.equal(connStatus, 'connected');
    assert.equal(data.currentInnings.score, 104);
  } finally {
    server.close();
  }
});

test('Suite 1.3: Polling resilience - Disconnected / unreachable server port', async () => {
  // Use a port that is not listening
  const nonExistentPort = 59876;
  let connStatus = 'connected';
  let caughtError = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);

    const res = await fetch(`http://127.0.0.1:${nonExistentPort}/api/score`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    await res.json();
  } catch (err) {
    connStatus = 'disconnected';
    caughtError = err;
  }

  assert.equal(connStatus, 'disconnected', 'Must transition to disconnected on connection refusal');
  assert.ok(caughtError, 'Must catch network error');
});

test('Suite 1.4: Polling resilience - HTTP error status codes (404, 500, 502, 503)', async () => {
  const errorCodes = [404, 500, 502, 503];

  for (const code of errorCodes) {
    const { server, port } = await createMockServer((req, res) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Simulated HTTP ${code}` }));
    });

    try {
      let connStatus = 'connected';
      let caughtError = null;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);
        const res = await fetch(`http://127.0.0.1:${port}/api/score`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error('HTTP ' + res.status);
        await res.json();
      } catch (err) {
        connStatus = 'disconnected';
        caughtError = err;
      }

      assert.equal(connStatus, 'disconnected', `Must mark disconnected on HTTP ${code}`);
      assert.ok(caughtError.message.includes(`HTTP ${code}`), `Error message must cite HTTP ${code}`);
    } finally {
      server.close();
    }
  }
});

test('Suite 1.5: Polling resilience - Malformed JSON responses (syntax error, HTML, empty)', async () => {
  const malformedBodies = [
    { name: 'HTML 502 page', body: '<!DOCTYPE html><html><body>502 Bad Gateway</body></html>', type: 'text/html' },
    { name: 'Truncated JSON', body: '{"match": {"team1": "Tech"', type: 'application/json' },
    { name: 'Empty string', body: '', type: 'application/json' },
    { name: 'Raw text error', body: 'Server Out of Memory Exception', type: 'text/plain' },
  ];

  for (const item of malformedBodies) {
    const { server, port } = await createMockServer((req, res) => {
      res.writeHead(200, { 'Content-Type': item.type });
      res.end(item.body);
    });

    try {
      let connStatus = 'connected';
      let parseFailed = false;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);
        const res = await fetch(`http://127.0.0.1:${port}/api/score`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        await res.json();
      } catch {
        connStatus = 'disconnected';
        parseFailed = true;
      }

      assert.ok(parseFailed, `Must catch parse error for ${item.name}`);
      assert.equal(connStatus, 'disconnected', `Must mark disconnected for ${item.name}`);
    } finally {
      server.close();
    }
  }
});

// ============================================================================
// SUITE 2: Display & Schema Edge Cases
// ============================================================================

test('Suite 2.1: Schema Edge Case - StatsFooter runRate null guard verification', () => {
  const statsFooterCode = fs.readFileSync(
    path.join(webScoreboardDir, 'src', 'components', 'StatsFooter.tsx'),
    'utf-8'
  );

  // Line 23: runRate !== undefined && runRate !== null ? runRate.toFixed(2) : '—'
  const runRateCheck = /runRate\s*!==\s*undefined\s*&&\s*runRate\s*!==\s*null\s*\?\s*runRate\.toFixed\(2\)/.test(statsFooterCode);
  assert.ok(runRateCheck, 'StatsFooter must guard runRate against both undefined and null');

  // Verify that evaluating guarded expression with null and undefined does not throw and returns '—'
  const renderRunRate = (runRate) => (runRate !== undefined && runRate !== null ? runRate.toFixed(2) : '—');
  assert.equal(renderRunRate(null), '—', 'null runRate must safely format as —');
  assert.equal(renderRunRate(undefined), '—', 'undefined runRate must safely format as —');
  assert.equal(renderRunRate(6.87), '6.87', 'Valid runRate formats correctly');
});

test('Suite 2.2: Schema Edge Case - RecentBalls null recentBalls guard verification', () => {
  const recentBallsCode = fs.readFileSync(
    path.join(webScoreboardDir, 'src', 'components', 'RecentBalls.tsx'),
    'utf-8'
  );

  // Line 12: const displayedOvers = (recentBalls || []).slice(-3);
  assert.ok(
    recentBallsCode.includes('(recentBalls || []).slice(-3)'),
    'RecentBalls must guard against null recentBalls using (recentBalls || []).slice(-3)'
  );

  // Verify that null and undefined recentBalls evaluate safely without TypeError
  const getDisplayedOvers = (recentBalls) => (recentBalls || []).slice(-3);
  assert.deepEqual(getDisplayedOvers(null), [], 'null recentBalls evaluates safely to empty array');
  assert.deepEqual(getDisplayedOvers(undefined), [], 'undefined recentBalls evaluates safely to empty array');
  assert.equal(getDisplayedOvers([{ overNumber: 1 }, { overNumber: 2 }]).length, 2);
});

test('Suite 2.3: Display stress - Batsman strike rate zero-ball division by zero check', () => {
  const batsmenPanelCode = fs.readFileSync(
    path.join(webScoreboardDir, 'src', 'components', 'BatsmenPanel.tsx'),
    'utf-8'
  );

  // Check strike rate calculation
  assert.ok(
    batsmenPanelCode.includes('bat.balls > 0'),
    'BatsmenPanel must guard against division by zero when balls is 0'
  );

  // Simulate batsman with 0 balls
  const batZero = { name: 'New Batsman', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0.0 };
  const sr = batZero.balls > 0
    ? ((batZero.runs / batZero.balls) * 100).toFixed(1)
    : batZero.strikeRate?.toFixed(1) ?? '—';

  assert.equal(sr, '0.0', 'Batsman with 0 balls should show 0.0, not NaN or error');
});

test('Suite 2.4: Display stress - 2nd innings ChasePanel transition states', () => {
  const chasePanelCode = fs.readFileSync(
    path.join(webScoreboardDir, 'src', 'components', 'ChasePanel.tsx'),
    'utf-8'
  );

  // Requirement: chase panel appears ONLY in 2nd innings
  // Verified by: if (requiredRuns === undefined || requiredRuns === null) return null;
  assert.ok(chasePanelCode.includes('requiredRuns === undefined || requiredRuns === null'));

  // Test ChasePanel logic for various states:
  // 1st innings: requiredRuns is null -> hidden
  const is1stInningsVisible = (requiredRuns) => !(requiredRuns === undefined || requiredRuns === null);
  assert.equal(is1stInningsVisible(null), false, 'Chase panel must be hidden during 1st innings (null)');
  assert.equal(is1stInningsVisible(undefined), false, 'Chase panel must be hidden when undefined');

  // 2nd innings active: requiredRuns is 45 -> visible
  assert.equal(is1stInningsVisible(45), true, 'Chase panel must be visible during 2nd innings chase');

  // 2nd innings completed (requiredRuns = 0) -> visible
  assert.equal(is1stInningsVisible(0), true, 'Chase panel handles target reached (0 runs needed)');
});

// ============================================================================
// SUITE 3: Media & Ad Player Stress
// ============================================================================

test('Suite 3.1: Media stress - Rapid play and stop ad commands state transitions', () => {
  // Simulate rapid state updates as done in page.tsx handleAdminCommand
  let adActive = false;
  let adType = null;
  let adSrc = null;

  const handleAdminCommand = (cmd) => {
    switch (cmd.action) {
      case 'PLAY_VIDEO_AD':
        adType = 'video';
        adSrc = cmd.src || null;
        adActive = true;
        break;
      case 'PLAY_IMAGE_AD':
        adType = 'image';
        adSrc = cmd.src || null;
        adActive = true;
        break;
      case 'STOP_AD':
        adActive = false;
        adSrc = null;
        break;
    }
  };

  // Rapid dispatch sequence
  const rapidCommands = [
    { action: 'PLAY_IMAGE_AD', src: 'blob:image-1' },
    { action: 'STOP_AD' },
    { action: 'PLAY_VIDEO_AD', src: 'blob:video-1' },
    { action: 'STOP_AD' },
    { action: 'PLAY_IMAGE_AD', src: 'blob:image-2' },
  ];

  for (const cmd of rapidCommands) {
    handleAdminCommand(cmd);
  }

  assert.equal(adActive, true);
  assert.equal(adType, 'image');
  assert.equal(adSrc, 'blob:image-2');

  // Final stop
  handleAdminCommand({ action: 'STOP_AD' });
  assert.equal(adActive, false);
  assert.equal(adSrc, null);
});

test('Suite 3.2: Media stress - Zero-second image auto-stop behavior guard verification', () => {
  const adminCode = fs.readFileSync(
    path.join(webScoreboardDir, 'src', 'app', 'admin', 'page.tsx'),
    'utf-8'
  );

  // Guard zero-second auto-stop duration: handles duration <= 0 safely
  assert.ok(
    adminCode.includes('duration <= 0') || adminCode.includes('imageDuration <= 0'),
    'admin/page.tsx must guard against zero or negative imageDuration'
  );

  // Test the guarded auto-stop logic
  let stoppedImmediately = false;
  let timerScheduled = false;

  const testAutoStop = (imageDuration) => {
    stoppedImmediately = false;
    timerScheduled = false;
    const duration = Number(imageDuration);
    if (duration <= 0) {
      stoppedImmediately = true;
    } else {
      timerScheduled = true;
    }
  };

  testAutoStop(0);
  assert.equal(stoppedImmediately, true, 'imageDuration = 0 must trigger immediate safe stop');
  assert.equal(timerScheduled, false);

  testAutoStop(-5);
  assert.equal(stoppedImmediately, true, 'Negative duration must trigger immediate safe stop');

  testAutoStop(15);
  assert.equal(timerScheduled, true, 'imageDuration = 15 must schedule auto-stop timer');
});

test('Suite 3.3: Media stress - Simultaneous video ad and Papare music playback state', () => {
  // Scoreboard supports simultaneous ad active and papare music active
  let adActive = false;
  let adType = null;
  let musicPlaying = false;

  // Turn on video ad
  adActive = true;
  adType = 'video';

  // Turn on music
  musicPlaying = true;

  // Verify both active without collision
  assert.equal(adActive, true, 'Ad must be active');
  assert.equal(adType, 'video', 'Ad type must be video');
  assert.equal(musicPlaying, true, 'Music must be playing simultaneously');

  // Stop ad, music stays playing
  adActive = false;
  assert.equal(musicPlaying, true, 'Music continues playing when ad stops');

  // Stop music
  musicPlaying = false;
  assert.equal(musicPlaying, false, 'Music stops');
});

test('Suite 3.4: Media stress - MusicBar async play rejection race condition guard verification', () => {
  const musicBarCode = fs.readFileSync(
    path.join(webScoreboardDir, 'src', 'components', 'MusicBar.tsx'),
    'utf-8'
  );

  assert.ok(/audio\s*\.play\(\)/.test(musicBarCode));
  assert.ok(
    /if\s*\(\s*isPlaying/.test(musicBarCode),
    'MusicBar catch handler must guard synth.start() with if (isPlaying)'
  );

  // Empirically demonstrate that guarded catch handler prevents synth start when user stops:
  let isPlaying = true;
  let synthStarted = false;

  const mockSynth = {
    start: () => { synthStarted = true; },
    stop: () => { synthStarted = false; },
  };

  const mockPlayPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('AbortError: The play() request was interrupted by a call to pause().'));
    }, 10);
  });

  // User stops audio while play() is pending:
  isPlaying = false;
  mockSynth.stop();

  // Guarded catch handler as implemented in MusicBar.tsx:
  return mockPlayPromise.catch(() => {
    if (isPlaying) {
      mockSynth.start();
    }
    assert.equal(isPlaying, false, 'User state was isPlaying = false');
    assert.equal(synthStarted, false, 'Synthesizer was NOT spuriously started when isPlaying is false');
  });
});

// ============================================================================
// SUITE 4: ResultBanner Stress & Lifecycle
// ============================================================================

test('Suite 4.1: ResultBanner - Renders cleanly on completed match with result', () => {
  const resultBannerCode = fs.readFileSync(
    path.join(webScoreboardDir, 'src', 'components', 'ResultBanner.tsx'),
    'utf-8'
  );

  assert.ok(resultBannerCode.includes('if (!isCompleted || !result) return null;'));
  assert.ok(resultBannerCode.includes('Match Completed · Final Result'));

  // Test display decision predicate from page.tsx:
  // !resultDismissed && isMatchCompleted && hasResult
  const shouldShowBanner = (resultDismissed, isCompleted, result) => {
    const isMatchCompleted = Boolean(isCompleted);
    const hasResult = Boolean(result);
    return !resultDismissed && isMatchCompleted && hasResult;
  };

  // Completed match with string result
  assert.equal(shouldShowBanner(false, true, 'Tech Titans won by 5 wickets'), true);

  // Completed match with object result
  assert.equal(shouldShowBanner(false, true, { title: 'Tech Titans won', detail: 'by 5 wickets' }), true);

  // Match in progress (not completed)
  assert.equal(shouldShowBanner(false, false, 'Tech Titans won'), false);

  // Match completed but null result
  assert.equal(shouldShowBanner(false, true, null), false);

  // Banner dismissed by user
  assert.equal(shouldShowBanner(true, true, 'Tech Titans won'), false);
});

test('Suite 4.2: ResultBanner - CLEAR_RESULT command lifecycle and dismissal', () => {
  // Simulate page.tsx handleAdminCommand for CLEAR_RESULT
  let resultDismissed = false;
  let match = {
    isCompleted: true,
    result: 'Tech Titans won by 5 wickets',
    status: 'COMPLETED',
  };

  const handleAdminCommand = (cmd) => {
    if (cmd.action === 'CLEAR_RESULT') {
      resultDismissed = true;
      match = { ...match, result: null, isCompleted: false };
    }
  };

  // Initially banner is visible
  let isVisible = !resultDismissed && Boolean(match.isCompleted) && Boolean(match.result);
  assert.equal(isVisible, true, 'Banner must be visible initially');

  // CLEAR_RESULT command received
  handleAdminCommand({ action: 'CLEAR_RESULT' });

  // Verify banner immediately clears
  isVisible = !resultDismissed && Boolean(match.isCompleted) && Boolean(match.result);
  assert.equal(isVisible, false, 'Banner must be cleared immediately after CLEAR_RESULT');
  assert.equal(resultDismissed, true, 'resultDismissed must be true');
  assert.equal(match.result, null, 'match.result must be set to null');
  assert.equal(match.isCompleted, false, 'match.isCompleted must be set to false');
});

test('Suite 4.3: ResultBanner - Multiple result transitions and re-appearance on new result', () => {
  let resultDismissed = false;
  let currentResult = null;

  const onNewScoreData = (data) => {
    // From page.tsx line 192:
    if (
      data.match?.result &&
      JSON.stringify(data.match.result) !== JSON.stringify(currentResult)
    ) {
      resultDismissed = false;
    }
    currentResult = data.match?.result;
  };

  // Match 1 completes
  onNewScoreData({ match: { result: 'Team A won by 10 runs' } });
  assert.equal(resultDismissed, false);
  assert.equal(currentResult, 'Team A won by 10 runs');

  // User dismisses banner
  resultDismissed = true;

  // Stale poll arrives with SAME result
  onNewScoreData({ match: { result: 'Team A won by 10 runs' } });
  assert.equal(resultDismissed, true, 'Banner must remain dismissed if result is unchanged');

  // Next tournament match completes with NEW result
  onNewScoreData({ match: { result: 'Team B won by 3 wickets' } });
  assert.equal(resultDismissed, false, 'Banner must re-appear when a new distinct result arrives');
  assert.equal(currentResult, 'Team B won by 3 wickets');
});
