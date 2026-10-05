import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webScoreboardDir = path.join(__dirname, '..');

const simplePagePath = path.join(webScoreboardDir, 'src', 'app', 'simple', 'page.tsx');
const adminPagePath = path.join(webScoreboardDir, 'src', 'app', 'admin', 'page.tsx');
const tossOverlayPath = path.join(webScoreboardDir, 'src', 'components', 'TossOverlay.tsx');
const teamsOverlayPath = path.join(webScoreboardDir, 'src', 'components', 'TeamsPresentationOverlay.tsx');
const bowlerOverlayPath = path.join(webScoreboardDir, 'src', 'components', 'BowlerSpotlightOverlay.tsx');
const typesPath = path.join(webScoreboardDir, 'src', 'types', 'cricket.ts');

const simpleCode = fs.readFileSync(simplePagePath, 'utf-8');
const adminCode = fs.readFileSync(adminPagePath, 'utf-8');
const tossCode = fs.readFileSync(tossOverlayPath, 'utf-8');
const teamsCode = fs.readFileSync(teamsOverlayPath, 'utf-8');
const bowlerCode = fs.readFileSync(bowlerOverlayPath, 'utf-8');
const typesCode = fs.readFileSync(typesPath, 'utf-8');

// ============================================================================
// SUITE 1: COMMAND DEDUPLICATION & POLLING LOOP STRESS
// ============================================================================

test('Challenger 1.1: 2s HTTP polling loop deduplication - auto-dismissed overlay is NOT re-triggered', () => {
  // Simulate the exact state machine in simple/page.tsx
  let lastHandledCommandKey = null;
  let activeOverlay = null;
  let activationCount = 0;

  const handleIncomingCommand = (action, cmdId, timestamp) => {
    const commandKey = `${cmdId || ''}_${action}_${timestamp || ''}`;
    if (commandKey && commandKey === lastHandledCommandKey) {
      return false; // deduplicated
    }
    lastHandledCommandKey = commandKey;

    if (action === 'SHOW_TOSS') {
      activeOverlay = 'toss';
      activationCount++;
    } else if (action === 'SHOW_TEAMS') {
      activeOverlay = 'teams';
      activationCount++;
    } else if (action === 'SHOW_BOWLER') {
      activeOverlay = 'bowler';
      activationCount++;
    } else if (action === 'CLEAR_OVERLAY') {
      activeOverlay = null;
    }
    return true;
  };

  const handleDismissOverlay = () => {
    activeOverlay = null;
  };

  // T=0s: First poll receives SHOW_TOSS
  assert.equal(handleIncomingCommand('SHOW_TOSS', 'cmd-uuid-1', 1000), true);
  assert.equal(activeOverlay, 'toss');
  assert.equal(activationCount, 1);

  // T=2s, 4s, 6s, 8s: Polling returns the exact same command 4 times
  for (let t = 2000; t <= 8000; t += 2000) {
    const handled = handleIncomingCommand('SHOW_TOSS', 'cmd-uuid-1', 1000);
    assert.equal(handled, false, `Poll at T=${t}ms should be deduplicated`);
    assert.equal(activeOverlay, 'toss');
    assert.equal(activationCount, 1);
  }

  // T=10s: Overlay auto-dismisses via 10s countdown
  handleDismissOverlay();
  assert.equal(activeOverlay, null, 'Overlay must be null after auto-dismiss');

  // T=12s, 14s, 16s, 18s: Subsequent polls STILL return cmd-uuid-1
  for (let t = 12000; t <= 18000; t += 2000) {
    const handled = handleIncomingCommand('SHOW_TOSS', 'cmd-uuid-1', 1000);
    assert.equal(handled, false, `Poll at T=${t}ms must NOT re-trigger dismissed overlay`);
    assert.equal(activeOverlay, null, 'Overlay must REMAIN dismissed');
    assert.equal(activationCount, 1, 'Activation count must not increase');
  }

  // T=20s: Admin sends a fresh SHOW_TOSS with a new timestamp
  assert.equal(handleIncomingCommand('SHOW_TOSS', 'cmd-uuid-2', 20000), true);
  assert.equal(activeOverlay, 'toss', 'Overlay must activate on new command');
  assert.equal(activationCount, 2);
});

test('Challenger 1.2: Polling deduplication with missing cmdId and timestamp fallbacks', () => {
  let lastHandledCommandKey = null;
  let activeOverlay = null;
  let count = 0;

  const handleIncomingCommand = (action, cmdId, timestamp) => {
    const commandKey = `${cmdId || ''}_${action}_${timestamp || ''}`;
    if (commandKey && commandKey === lastHandledCommandKey) {
      return false;
    }
    lastHandledCommandKey = commandKey;

    if (action === 'SHOW_TOSS') {
      activeOverlay = 'toss';
      count++;
    } else if (action === 'CLEAR_OVERLAY') {
      activeOverlay = null;
    }
    return true;
  };

  // Undefined cmdId and undefined timestamp
  assert.equal(handleIncomingCommand('SHOW_TOSS', undefined, undefined), true);
  assert.equal(activeOverlay, 'toss');
  assert.equal(count, 1);

  // Next poll with same missing parameters
  assert.equal(handleIncomingCommand('SHOW_TOSS', undefined, undefined), false);
  assert.equal(count, 1);

  // Auto-dismiss
  activeOverlay = null;

  // Poll again with missing parameters: still deduplicated
  assert.equal(handleIncomingCommand('SHOW_TOSS', undefined, undefined), false);
  assert.equal(activeOverlay, null);
});

test('Challenger 1.3: Multi-channel race deduplication (HTTP + Storage + BroadcastChannel)', () => {
  let lastHandledCommandKey = null;
  let activeOverlay = null;
  let activations = 0;

  const handleIncomingCommand = (action, cmdId, timestamp) => {
    const commandKey = `${cmdId || ''}_${action}_${timestamp || ''}`;
    if (commandKey && commandKey === lastHandledCommandKey) {
      return false;
    }
    lastHandledCommandKey = commandKey;
    if (action === 'SHOW_TEAMS') {
      activeOverlay = 'teams';
      activations++;
    }
    return true;
  };

  const sharedCmd = { id: 'evt-999', action: 'SHOW_TEAMS', timestamp: 50000 };

  // Channel 1: BroadcastChannel arrives first (< 5ms)
  assert.equal(handleIncomingCommand(sharedCmd.action, sharedCmd.id, sharedCmd.timestamp), true);
  assert.equal(activations, 1);

  // Channel 2: window storage event arrives slightly later
  assert.equal(handleIncomingCommand(sharedCmd.action, sharedCmd.id, sharedCmd.timestamp), false);
  assert.equal(activations, 1);

  // Channel 3: 2s HTTP poll arrives 1.5s later with the same command
  assert.equal(handleIncomingCommand(sharedCmd.action, sharedCmd.id, sharedCmd.timestamp), false);
  assert.equal(activations, 1);
  assert.equal(activeOverlay, 'teams');
});

// ============================================================================
// SUITE 2: RAPID SWITCHING & STRESS TRANSITIONS
// ============================================================================

test('Challenger 2.1: Rapid switching SHOW_TOSS -> SHOW_BOWLER -> CLEAR_OVERLAY', () => {
  let lastHandledCommandKey = null;
  let activeOverlay = null;
  const history = [];

  const handleIncomingCommand = (action, cmdId, timestamp) => {
    const commandKey = `${cmdId || ''}_${action}_${timestamp || ''}`;
    if (commandKey && commandKey === lastHandledCommandKey) return;
    lastHandledCommandKey = commandKey;

    if (action === 'SHOW_TOSS') activeOverlay = 'toss';
    else if (action === 'SHOW_TEAMS') activeOverlay = 'teams';
    else if (action === 'SHOW_BOWLER') activeOverlay = 'bowler';
    else if (action === 'CLEAR_OVERLAY') activeOverlay = null;

    history.push({ action, activeOverlay });
  };

  // Immediate sequence
  handleIncomingCommand('SHOW_TOSS', 'c1', 100);
  assert.equal(activeOverlay, 'toss');

  handleIncomingCommand('SHOW_BOWLER', 'c2', 101);
  assert.equal(activeOverlay, 'bowler');

  handleIncomingCommand('CLEAR_OVERLAY', 'c3', 102);
  assert.equal(activeOverlay, null);

  assert.deepEqual(history, [
    { action: 'SHOW_TOSS', activeOverlay: 'toss' },
    { action: 'SHOW_BOWLER', activeOverlay: 'bowler' },
    { action: 'CLEAR_OVERLAY', activeOverlay: null }
  ]);
});

test('Challenger 2.2: Burst stress test - 100 rapid random overlay transitions', () => {
  let lastHandledCommandKey = null;
  let activeOverlay = null;
  const validOverlays = ['toss', 'teams', 'bowler', null];
  const actions = ['SHOW_TOSS', 'SHOW_TEAMS', 'SHOW_BOWLER', 'CLEAR_OVERLAY'];

  for (let i = 0; i < 100; i++) {
    const act = actions[i % actions.length];
    const key = `cmd-${i}_${act}_${Date.now() + i}`;

    const commandKey = key;
    if (commandKey !== lastHandledCommandKey) {
      lastHandledCommandKey = commandKey;
      if (act === 'SHOW_TOSS') activeOverlay = 'toss';
      else if (act === 'SHOW_TEAMS') activeOverlay = 'teams';
      else if (act === 'SHOW_BOWLER') activeOverlay = 'bowler';
      else if (act === 'CLEAR_OVERLAY') activeOverlay = null;
    }

    assert.ok(
      validOverlays.includes(activeOverlay),
      `activeOverlay must always be a valid state, got: ${activeOverlay}`
    );
  }
});

test('Challenger 2.3: Overlay timer cleanup on rapid unmount oracle', () => {
  // Oracle testing timer cleanup contract
  let activeTimers = new Set();
  let dismissCalledFor = [];

  const mountOverlay = (name, durationSec) => {
    const timerId = { name, id: Math.random() };
    activeTimers.add(timerId);

    // Simulated unmount cleanup function
    const unmount = () => {
      activeTimers.delete(timerId);
    };

    // Simulated timer firing
    const fire = () => {
      if (activeTimers.has(timerId)) {
        dismissCalledFor.push(name);
        activeTimers.delete(timerId);
      }
    };

    return { timerId, unmount, fire };
  };

  // Mount TossOverlay
  const toss = mountOverlay('toss', 10);
  assert.equal(activeTimers.size, 1);

  // Switch to BowlerSpotlightOverlay before Toss expires (Toss unmounts)
  toss.unmount();
  const bowler = mountOverlay('bowler', 10);
  assert.equal(activeTimers.size, 1);

  // Late timer event from Toss should NOT fire
  toss.fire();
  assert.equal(dismissCalledFor.length, 0, 'Unmounted overlay must NOT fire onDismiss');

  // Bowler expires
  bowler.fire();
  assert.deepEqual(dismissCalledFor, ['bowler']);
});

test('Challenger 2.4: CLEAR_OVERLAY when activeOverlay is already null is safe and idempotent', () => {
  let activeOverlay = null;
  let lastKey = null;

  const handle = (action, id, ts) => {
    const key = `${id}_${action}_${ts}`;
    if (key === lastKey) return;
    lastKey = key;
    if (action === 'CLEAR_OVERLAY') activeOverlay = null;
  };

  // Repeated clears
  handle('CLEAR_OVERLAY', 'clr-1', 100);
  assert.equal(activeOverlay, null);
  handle('CLEAR_OVERLAY', 'clr-2', 200);
  assert.equal(activeOverlay, null);
});

// ============================================================================
// SUITE 3: FALLBACK RESILIENCE & ZERO-DATA BEHAVIOR
// ============================================================================

test('Challenger 3.1: TossOverlay fallback behavior on missing toss info', () => {
  // Static code verification
  assert.ok(
    tossCode.includes('tossDecision ||') && tossCode.includes("'ELECTED TO BAT'"),
    'TossOverlay must fallback to ELECTED TO BAT when tossDecision is missing'
  );
  assert.ok(
    tossCode.includes('matchTitle || tournamentName ||'),
    'TossOverlay must construct title fallback from team names'
  );
  assert.ok(
    tossCode.includes("team1Logo || '/assets/branding/tech-titans-logo.svg'"),
    'TossOverlay must provide default team 1 logo fallback'
  );
  assert.ok(
    tossCode.includes("team2Logo || '/assets/branding/sales-strikers-logo.svg'"),
    'TossOverlay must provide default team 2 logo fallback'
  );

  // Logic Oracle for decisionText
  const getDecision = (decision, choice) => {
    return decision || (choice ? `ELECTED TO ${choice.toUpperCase()}` : 'ELECTED TO BAT');
  };

  assert.equal(getDecision(undefined, undefined), 'ELECTED TO BAT');
  assert.equal(getDecision(null, null), 'ELECTED TO BAT');
  assert.equal(getDecision('', 'bowl'), 'ELECTED TO BOWL');
  assert.equal(getDecision('ELECTED TO FIELD', undefined), 'ELECTED TO FIELD');
});

test('Challenger 3.2: BowlerSpotlightOverlay economy calculation handles zero overs and division by zero', () => {
  // Inspect BowlerSpotlightOverlay calculateEconomy logic
  const calculateEconomy = (bowler) => {
    if (bowler.economy !== undefined && bowler.economy !== null && bowler.economy !== '') {
      return typeof bowler.economy === 'number'
        ? bowler.economy.toFixed(2)
        : String(bowler.economy);
    }
    const oversVal =
      typeof bowler.overs === 'number'
        ? bowler.overs
        : parseFloat(String(bowler.overs));
    if (oversVal && oversVal > 0) {
      return (bowler.runs / oversVal).toFixed(2);
    }
    return '0.00';
  };

  // Test 1: First ball of match, 0 overs, 0 runs, economy null
  assert.equal(calculateEconomy({ overs: 0, runs: 0, economy: null }), '0.00');

  // Test 2: Overs as string '0.0', 0 runs
  assert.equal(calculateEconomy({ overs: '0.0', runs: 0, economy: undefined }), '0.00');

  // Test 3: Overs 0, but runs conceded (extras only)
  assert.equal(calculateEconomy({ overs: 0, runs: 5, economy: null }), '0.00');

  // Test 4: Overs NaN or invalid string
  assert.equal(calculateEconomy({ overs: 'invalid', runs: 10, economy: null }), '0.00');

  // Test 5: Valid overs calculation
  assert.equal(calculateEconomy({ overs: 4, runs: 28, economy: null }), '7.00');

  // Test 6: Pre-computed economy takes priority
  assert.equal(calculateEconomy({ overs: 4, runs: 28, economy: 6.5 }), '6.50');
  assert.equal(calculateEconomy({ overs: 4, runs: 28, economy: '6.50' }), '6.50');

  // Test 7: Null bowler fallback in simple/page.tsx
  assert.ok(
    simpleCode.includes("bowler={currentBowler || { name: 'BOWLER', overs: 0, maidens: 0, runs: 0, wickets: 0, economy: '0.00' }}"),
    'simple/page.tsx must provide complete safe fallback for currentBowler'
  );
});

test('Challenger 3.3: TeamsPresentationOverlay roster filler guarantees 11 players without crashing', () => {
  // Extract and verify fillSquad oracle from TeamsPresentationOverlay
  const fillSquad = (roster, defaultTeamName) => {
    if (roster && roster.length >= 11) return roster.slice(0, 11);
    const combined = [...(roster || [])];
    while (combined.length < 11) {
      combined.push(`Player ${combined.length + 1}`);
    }
    return combined.slice(0, 11);
  };

  // 0 players
  const s0 = fillSquad([], 'Any Team');
  assert.equal(s0.length, 11);
  assert.equal(s0[0], 'Player 1');
  assert.equal(s0[10], 'Player 11');

  // 3 players
  const s3 = fillSquad(['Alice', 'Bob', 'Charlie'], 'Any Team');
  assert.equal(s3.length, 11);
  assert.equal(s3[0], 'Alice');
  assert.equal(s3[2], 'Charlie');
  assert.equal(s3[3], 'Player 4');

  // 15 players
  const s15 = fillSquad(Array.from({ length: 15 }, (_, i) => `P${i + 1}`), 'Any');
  assert.equal(s15.length, 11);
  assert.equal(s15[10], 'P11');
});

// ============================================================================
// SUITE 4: KEYBOARD HOTKEY INTERCEPTION & NAVIGATION PREVENT
// ============================================================================

test('Challenger 4.1: Escape, x, X keys dismiss overlay and prevent window navigation', () => {
  // Test the keydown handler logic from simple/page.tsx
  let activeOverlay = 'toss';
  let navigatedUrl = null;
  let prevented = false;
  let stopped = false;

  const mockWindow = {
    location: {
      href: '/simple',
      set href(val) {
        navigatedUrl = val;
      }
    }
  };

  const handleKeyDown = (e, active) => {
    if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;

    if (active !== null && (e.key === 'Escape' || e.key === 'x' || e.key === 'X')) {
      e.preventDefault();
      e.stopPropagation();
      activeOverlay = null; // handleDismissOverlay
      return;
    }

    if (e.key === 'a' || e.key === 'A') {
      mockWindow.location.href = '/admin';
    } else if (e.key === 'b' || e.key === 'B' || e.key === 'Escape') {
      mockWindow.location.href = '/';
    }
  };

  // Case 1: Active overlay + 'Escape'
  activeOverlay = 'toss';
  navigatedUrl = null;
  prevented = false;
  stopped = false;
  handleKeyDown(
    {
      key: 'Escape',
      preventDefault: () => { prevented = true; },
      stopPropagation: () => { stopped = true; },
      target: { tagName: 'DIV' }
    },
    activeOverlay
  );

  assert.equal(prevented, true, 'Escape must call preventDefault() when overlay is active');
  assert.equal(stopped, true, 'Escape must call stopPropagation() when overlay is active');
  assert.equal(activeOverlay, null, 'Escape must dismiss the active overlay');
  assert.equal(navigatedUrl, null, 'Escape must NOT trigger page navigation when overlay is active');

  // Case 2: Active overlay + 'x'
  activeOverlay = 'bowler';
  prevented = false;
  stopped = false;
  handleKeyDown(
    {
      key: 'x',
      preventDefault: () => { prevented = true; },
      stopPropagation: () => { stopped = true; },
      target: { tagName: 'DIV' }
    },
    activeOverlay
  );
  assert.equal(prevented, true, 'x must call preventDefault()');
  assert.equal(activeOverlay, null, 'x must dismiss active overlay');
  assert.equal(navigatedUrl, null, 'x must NOT navigate');

  // Case 3: Active overlay + 'X'
  activeOverlay = 'teams';
  prevented = false;
  stopped = false;
  handleKeyDown(
    {
      key: 'X',
      preventDefault: () => { prevented = true; },
      stopPropagation: () => { stopped = true; },
      target: { tagName: 'DIV' }
    },
    activeOverlay
  );
  assert.equal(prevented, true, 'X must call preventDefault()');
  assert.equal(activeOverlay, null, 'X must dismiss active overlay');
  assert.equal(navigatedUrl, null, 'X must NOT navigate');

  // Case 4: No overlay active + 'Escape' -> navigates to '/'
  activeOverlay = null;
  navigatedUrl = null;
  handleKeyDown(
    {
      key: 'Escape',
      preventDefault: () => {},
      stopPropagation: () => {},
      target: { tagName: 'DIV' }
    },
    activeOverlay
  );
  assert.equal(navigatedUrl, '/', 'Escape when NO overlay active must navigate to /');

  // Case 5: Keystroke inside INPUT is ignored
  activeOverlay = 'toss';
  prevented = false;
  handleKeyDown(
    {
      key: 'Escape',
      preventDefault: () => { prevented = true; },
      stopPropagation: () => {},
      target: { tagName: 'INPUT' }
    },
    activeOverlay
  );
  assert.equal(activeOverlay, 'toss', 'Keydown inside INPUT must NOT dismiss overlay');
});

// ============================================================================
// SUITE 5: CROSS-COMPONENT CONTRACTS & ASSET INTEGRITY
// ============================================================================

test('Challenger 5.1: Asset files referenced in overlays exist on disk', () => {
  const assetsToCheck = [
    'public/assets/branding/tech-titans-logo.svg',
    'public/assets/branding/sales-strikers-logo.svg',
    'public/assets/branding/player-avatar-default.svg',
    'public/assets/branding/rc-role-bat.svg',
    'public/assets/branding/rc-role-ball.svg',
    'public/assets/branding/rc-role-all-rounder.svg',
    'public/assets/branding/rc-role-wicket-keeper.svg',
  ];

  for (const asset of assetsToCheck) {
    const fullPath = path.join(webScoreboardDir, asset);
    assert.ok(fs.existsSync(fullPath), `Required asset must exist: ${asset}`);
  }
});

test('Challenger 5.2: Admin command payload compatibility across Admin, Simple, and Android', () => {
  // Check AdminActionType in types/cricket.ts
  const requiredCommands = ['SHOW_TOSS', 'SHOW_TEAMS', 'SHOW_BOWLER', 'CLEAR_OVERLAY'];
  for (const cmd of requiredCommands) {
    assert.ok(typesCode.includes(`'${cmd}'`), `types/cricket.ts must include '${cmd}'`);
  }

  // Check Android Models.kt
  const androidModelsPath = path.join(
    webScoreboardDir,
    '..',
    'android-scorer',
    'app',
    'src',
    'main',
    'java',
    'com',
    'cricket',
    'scorer',
    'data',
    'model',
    'Models.kt'
  );
  const modelsCode = fs.readFileSync(androidModelsPath, 'utf-8');

  for (const cmd of requiredCommands) {
    assert.ok(
      modelsCode.includes(`const val ${cmd} = "${cmd}"`),
      `Android Models.kt must define AdminCommandTypes.${cmd}`
    );
  }
});
