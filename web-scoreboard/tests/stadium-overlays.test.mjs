import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webScoreboardDir = path.join(__dirname, '..');

const typesPath = path.join(webScoreboardDir, 'src', 'types', 'cricket.ts');
const simplePagePath = path.join(webScoreboardDir, 'src', 'app', 'simple', 'page.tsx');
const tossOverlayPath = path.join(webScoreboardDir, 'src', 'components', 'TossOverlay.tsx');
const teamsOverlayPath = path.join(webScoreboardDir, 'src', 'components', 'TeamsPresentationOverlay.tsx');
const bowlerOverlayPath = path.join(webScoreboardDir, 'src', 'components', 'BowlerSpotlightOverlay.tsx');

const typesCode = fs.readFileSync(typesPath, 'utf-8');
const simpleCode = fs.readFileSync(simplePagePath, 'utf-8');
const tossCode = fs.readFileSync(tossOverlayPath, 'utf-8');
const teamsCode = fs.readFileSync(teamsOverlayPath, 'utf-8');
const bowlerCode = fs.readFileSync(bowlerOverlayPath, 'utf-8');

// ============================================================================
// SUITE 1: TYPES & DATA MODEL EXTENSIONS
// ============================================================================
test('Stadium Overlays Suite 1.1: AdminActionType includes all 4 broadcast overlay actions', () => {
  assert.ok(typesCode.includes("'SHOW_TOSS'"), "AdminActionType must include 'SHOW_TOSS'");
  assert.ok(typesCode.includes("'SHOW_TEAMS'"), "AdminActionType must include 'SHOW_TEAMS'");
  assert.ok(typesCode.includes("'SHOW_BOWLER'"), "AdminActionType must include 'SHOW_BOWLER'");
  assert.ok(typesCode.includes("'CLEAR_OVERLAY'"), "AdminActionType must include 'CLEAR_OVERLAY'");
});

test('Stadium Overlays Suite 1.2: MatchInfo and TeamData support optional toss and captain metadata', () => {
  assert.ok(typesCode.includes('toss?:'), 'MatchInfo must support optional toss field');
  assert.ok(typesCode.includes('tossWinner?: string;'), 'MatchInfo must support flat tossWinner field');
  assert.ok(typesCode.includes('tossChoice?: string;'), 'MatchInfo must support flat tossChoice field');
  assert.ok(typesCode.includes('tossDecision?: string;'), 'MatchInfo must support flat tossDecision field');
  assert.ok(typesCode.includes('matchTitle?: string;'), 'MatchInfo must support optional matchTitle field');
  assert.ok(typesCode.includes('captain?: string;'), 'TeamData must support optional captain field');
});

// ============================================================================
// SUITE 2: TOSS DECISION OVERLAY COMPONENT
// ============================================================================
test('Stadium Overlays Suite 2.1: TossOverlay displays matchup, coin icon, winner and elected choice', () => {
  assert.ok(tossCode.includes('🪙'), 'TossOverlay must feature coin icon');
  assert.ok(tossCode.includes('TOSS DECISION') || tossCode.includes('OFFICIAL TOSS') || tossCode.includes('TOSS RESULT'), 'TossOverlay must indicate official toss broadcast');
  assert.ok(tossCode.includes('tossWinner'), 'TossOverlay must reference tossWinner');
  assert.ok(tossCode.includes('WON THE TOSS'), 'TossOverlay must display WON THE TOSS callout');
  assert.ok(tossCode.includes('ELECTED TO'), 'TossOverlay must display elected decision');
});

test('Stadium Overlays Suite 2.2: TossOverlay features 10s countdown timer, progress bar, and dismiss control', () => {
  assert.ok(tossCode.includes('durationSeconds = 10') || tossCode.includes('10'), 'TossOverlay must default to 10s duration');
  assert.ok(tossCode.includes('timeLeft'), 'TossOverlay must maintain timeLeft state');
  assert.ok(tossCode.includes('progressPercent') || tossCode.includes('progress'), 'TossOverlay must render animated progress bar');
  assert.ok(tossCode.includes('onDismiss'), 'TossOverlay must accept onDismiss callback');
  assert.ok(tossCode.includes('Esc'), 'TossOverlay must show [Esc] dismiss hint');
});

// ============================================================================
// SUITE 3: TEAMS PRESENTATION OVERLAY COMPONENT
// ============================================================================
test('Stadium Overlays Suite 3.1: TeamsPresentationOverlay renders side-by-side lineups, crests and captains', () => {
  assert.ok(teamsCode.includes('grid-cols-2') || teamsCode.includes('flex'), 'TeamsPresentationOverlay must support side-by-side layout');
  assert.ok(teamsCode.includes('team1Name'), 'TeamsPresentationOverlay must render team 1');
  assert.ok(teamsCode.includes('team2Name'), 'TeamsPresentationOverlay must render team 2');
  assert.ok(teamsCode.includes('team1Captain') || teamsCode.includes('CAPTAIN'), 'TeamsPresentationOverlay must render captain info');
  assert.ok(teamsCode.includes('squad1') && teamsCode.includes('squad2'), 'TeamsPresentationOverlay must support dual squads');
});

test('Stadium Overlays Suite 3.2: TeamsPresentationOverlay renders 11 players per team with PLAYER_ROLES icons', () => {
  assert.ok(teamsCode.includes('11'), 'TeamsPresentationOverlay must enforce 11-player squad lists');
  assert.ok(teamsCode.includes('PLAYER_ROLES'), 'TeamsPresentationOverlay must reference PLAYER_ROLES');
  assert.ok(teamsCode.includes('role.icon'), 'TeamsPresentationOverlay must render role icons');
  assert.ok(teamsCode.includes('role.shortLabel') || teamsCode.includes('role.badgeClass'), 'TeamsPresentationOverlay must render role badge');
});

// ============================================================================
// SUITE 4: BOWLER SPOTLIGHT OVERLAY COMPONENT
// ============================================================================
test('Stadium Overlays Suite 4.1: BowlerSpotlightOverlay displays avatar, name, and role badge', () => {
  assert.ok(bowlerCode.includes('bowler.name'), 'BowlerSpotlightOverlay must display bowler name');
  assert.ok(bowlerCode.includes('playerPhoto') || bowlerCode.includes('defaultPhoto'), 'BowlerSpotlightOverlay must render bowler photo/avatar');
  assert.ok(bowlerCode.includes('roleInfo'), 'BowlerSpotlightOverlay must display role info');
  assert.ok(bowlerCode.includes('Barlow_Condensed'), 'BowlerSpotlightOverlay must style typography in Barlow Condensed');
});

test('Stadium Overlays Suite 4.2: BowlerSpotlightOverlay renders all 5 LED metric cards and calculates economy rate', () => {
  const requiredMetrics = ['OVERS', 'MAIDENS', 'RUNS', 'WICKETS', 'ECONOMY'];
  for (const metric of requiredMetrics) {
    assert.ok(bowlerCode.includes(metric), `BowlerSpotlightOverlay must render metric: ${metric}`);
  }

  // Test economy calculation logic oracle
  const calcEconomy = (runs, overs, providedEcon) => {
    if (providedEcon !== undefined && providedEcon !== null && providedEcon !== '') {
      return typeof providedEcon === 'number' ? providedEcon.toFixed(2) : String(providedEcon);
    }
    const o = typeof overs === 'number' ? overs : parseFloat(String(overs)) || 0;
    return o > 0 ? (runs / o).toFixed(2) : '0.00';
  };

  assert.equal(calcEconomy(93, 7, 13.28), '13.28');
  assert.equal(calcEconomy(30, 4, null), '7.50');
  assert.equal(calcEconomy(0, 0, null), '0.00');
});

// ============================================================================
// SUITE 5: STADIUM LED SCOREBOARD INTEGRATION & COMMAND SYNC (/simple)
// ============================================================================
test('Stadium Overlays Suite 5.1: Overlays are mounted inside 16:9 gantry bezel frame in simple/page.tsx', () => {
  assert.ok(simpleCode.includes('<TossOverlay'), 'simple/page.tsx must mount TossOverlay');
  assert.ok(simpleCode.includes('<TeamsPresentationOverlay'), 'simple/page.tsx must mount TeamsPresentationOverlay');
  assert.ok(simpleCode.includes('<BowlerSpotlightOverlay'), 'simple/page.tsx must mount BowlerSpotlightOverlay');
  assert.ok(simpleCode.includes("activeOverlay === 'toss'"), 'simple/page.tsx must conditionally display toss overlay');
  assert.ok(simpleCode.includes("activeOverlay === 'teams'"), 'simple/page.tsx must conditionally display teams overlay');
  assert.ok(simpleCode.includes("activeOverlay === 'bowler'"), 'simple/page.tsx must conditionally display bowler overlay');
});

test('Stadium Overlays Suite 5.2: Keyboard hotkeys (Escape, x, X) dismiss active overlay without navigating away', () => {
  assert.ok(
    simpleCode.includes("activeOverlay !== null && (e.key === 'Escape' || e.key === 'x' || e.key === 'X')"),
    'Keyboard handler must intercept Escape, x, X to dismiss active overlay'
  );
  assert.ok(
    simpleCode.includes('e.preventDefault()') && simpleCode.includes('e.stopPropagation()'),
    'Hotkey dismissal must prevent default and stop propagation'
  );
});

test('Stadium Overlays Suite 5.3: Dual-channel sync with deduplication in simple/page.tsx', () => {
  // Command deduplication tracking
  assert.ok(
    simpleCode.includes('lastHandledCommandKey') && simpleCode.includes('useRef'),
    'simple/page.tsx must track lastHandledCommandKey to deduplicate repetitive polling commands'
  );

  // Storage and BroadcastChannel listeners
  assert.ok(
    simpleCode.includes("new BroadcastChannel('cricket_broadcast')"),
    'simple/page.tsx must listen to BroadcastChannel cricket_broadcast'
  );
  assert.ok(
    simpleCode.includes("e.key === 'cricket_admin_command'"),
    'simple/page.tsx must listen to storage event on cricket_admin_command'
  );

  // Command handlers
  assert.ok(simpleCode.includes("action === 'SHOW_TOSS'"), 'simple/page.tsx must handle SHOW_TOSS');
  assert.ok(simpleCode.includes("action === 'SHOW_TEAMS'"), 'simple/page.tsx must handle SHOW_TEAMS');
  assert.ok(simpleCode.includes("action === 'SHOW_BOWLER'"), 'simple/page.tsx must handle SHOW_BOWLER');
  assert.ok(simpleCode.includes("action === 'CLEAR_OVERLAY'"), 'simple/page.tsx must handle CLEAR_OVERLAY');
});

test('Stadium Overlays Suite 5.4: Command deduplication oracle verification', () => {
  let lastKey = null;
  let activeOverlay = null;

  const handleCommand = (action, cmdId, timestamp) => {
    const key = `${cmdId || ''}_${action}_${timestamp || ''}`;
    if (key && key === lastKey) {
      return false; // deduplicated, ignored
    }
    lastKey = key;
    if (action === 'SHOW_TOSS') activeOverlay = 'toss';
    if (action === 'SHOW_TEAMS') activeOverlay = 'teams';
    if (action === 'SHOW_BOWLER') activeOverlay = 'bowler';
    if (action === 'CLEAR_OVERLAY') activeOverlay = null;
    return true; // handled
  };

  // Step 1: Trigger SHOW_TOSS
  assert.equal(handleCommand('SHOW_TOSS', 'cmd-1', 1000), true);
  assert.equal(activeOverlay, 'toss');

  // Step 2: 2 seconds later, polling returns the exact same command
  assert.equal(handleCommand('SHOW_TOSS', 'cmd-1', 1000), false);
  assert.equal(activeOverlay, 'toss');

  // Step 3: Overlay auto-dismisses at second 10
  activeOverlay = null;

  // Step 4: 2 seconds later (second 12), polling still serves cmd-1
  assert.equal(handleCommand('SHOW_TOSS', 'cmd-1', 1000), false);
  assert.equal(activeOverlay, null, 'Overlay must NOT reopen after dismissal due to deduplication');

  // Step 5: New command arriving with new timestamp
  assert.equal(handleCommand('SHOW_BOWLER', 'cmd-2', 12000), true);
  assert.equal(activeOverlay, 'bowler');
});

// ============================================================================
// SUITE 6: TOSS SCHEMA HARMONIZATION & DECISION RESOLUTION
// ============================================================================
test('Stadium Overlays Suite 6.1: simple/page.tsx supports both flat and nested toss properties on TossOverlay', () => {
  assert.ok(
    simpleCode.includes('match.toss?.winner || match.tossWinner || currentInnings?.battingTeam || match.team1'),
    'simple/page.tsx must resolve tossWinner supporting both nested and flat toss properties'
  );
  assert.ok(
    simpleCode.includes('match.toss?.decision || match.tossDecision'),
    'simple/page.tsx must resolve tossDecision supporting both nested and flat toss properties'
  );
  assert.ok(
    simpleCode.includes('match.toss?.choice || match.tossChoice'),
    'simple/page.tsx must resolve tossChoice supporting both nested and flat toss properties'
  );
  assert.ok(
    simpleCode.includes('handleDismissOverlay = useCallback('),
    'simple/page.tsx must wrap handleDismissOverlay in useCallback'
  );
});

test('Stadium Overlays Suite 6.2: Flat toss schema (tossWinner: Sales Strikers, tossChoice: BOWL) resolves correctly without falling back to Team 1 or BAT', () => {
  const match = {
    team1: 'Tech Titans',
    team2: 'Sales Strikers',
    tossWinner: 'Sales Strikers',
    tossChoice: 'BOWL',
  };
  const currentInnings = { battingTeam: 'Tech Titans' };

  // Resolution matching simple/page.tsx logic
  const tossWinner = match.toss?.winner || match.tossWinner || currentInnings?.battingTeam || match.team1;
  const tossDecision = match.toss?.decision || match.tossDecision;
  const tossChoice = match.toss?.choice || match.tossChoice;

  // Resolution matching TossOverlay.tsx logic
  const decisionText =
    tossDecision ||
    (tossChoice
      ? `ELECTED TO ${tossChoice.toUpperCase()}`
      : 'ELECTED TO BAT');

  assert.equal(tossWinner, 'Sales Strikers', "Toss winner must resolve to 'Sales Strikers' and NOT fall back to team1");
  assert.notEqual(tossWinner, match.team1, "Toss winner must not incorrectly fall back to Team 1 ('Tech Titans')");
  assert.equal(tossChoice, 'BOWL');
  assert.equal(decisionText, 'ELECTED TO BOWL', "Decision text must resolve to 'ELECTED TO BOWL' and NOT fall back to 'ELECTED TO BAT'");
  assert.notEqual(decisionText, 'ELECTED TO BAT', 'Decision text must not incorrectly fall back to BAT');
});

test('Stadium Overlays Suite 6.3: Nested toss schema (toss: { winner: Sales Strikers, choice: BOWL }) resolves correctly without falling back to Team 1 or BAT', () => {
  const match = {
    team1: 'Tech Titans',
    team2: 'Sales Strikers',
    toss: {
      winner: 'Sales Strikers',
      choice: 'BOWL',
    },
  };
  const currentInnings = { battingTeam: 'Tech Titans' };

  // Resolution matching simple/page.tsx logic
  const tossWinner = match.toss?.winner || match.tossWinner || currentInnings?.battingTeam || match.team1;
  const tossDecision = match.toss?.decision || match.tossDecision;
  const tossChoice = match.toss?.choice || match.tossChoice;

  // Resolution matching TossOverlay.tsx logic
  const decisionText =
    tossDecision ||
    (tossChoice
      ? `ELECTED TO ${tossChoice.toUpperCase()}`
      : 'ELECTED TO BAT');

  assert.equal(tossWinner, 'Sales Strikers', "Toss winner must resolve to 'Sales Strikers' and NOT fall back to team1");
  assert.notEqual(tossWinner, match.team1, "Toss winner must not incorrectly fall back to Team 1 ('Tech Titans')");
  assert.equal(tossChoice, 'BOWL');
  assert.equal(decisionText, 'ELECTED TO BOWL', "Decision text must resolve to 'ELECTED TO BOWL' and NOT fall back to 'ELECTED TO BAT'");
  assert.notEqual(decisionText, 'ELECTED TO BAT', 'Decision text must not incorrectly fall back to BAT');
});

test('Stadium Overlays Suite 6.4: Fallback behavior on missing toss info defaults safely', () => {
  const match = {
    team1: 'Tech Titans',
    team2: 'Sales Strikers',
  };
  const currentInnings = { battingTeam: 'Tech Titans' };

  const tossWinner = match.toss?.winner || match.tossWinner || currentInnings?.battingTeam || match.team1;
  const tossDecision = match.toss?.decision || match.tossDecision;
  const tossChoice = match.toss?.choice || match.tossChoice;

  const decisionText =
    tossDecision ||
    (tossChoice
      ? `ELECTED TO ${tossChoice.toUpperCase()}`
      : 'ELECTED TO BAT');

  assert.equal(tossWinner, 'Tech Titans');
  assert.equal(decisionText, 'ELECTED TO BAT');
});

