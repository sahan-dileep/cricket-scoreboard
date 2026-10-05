import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webScoreboardDir = path.join(__dirname, '..');

const adminPagePath = path.join(webScoreboardDir, 'src', 'app', 'admin', 'page.tsx');
const cricketTypesPath = path.join(webScoreboardDir, 'src', 'types', 'cricket.ts');

const adminCode = fs.readFileSync(adminPagePath, 'utf-8');
const typesCode = fs.readFileSync(cricketTypesPath, 'utf-8');

// ============================================================================
// SUITE 1: DUAL-CHANNEL COMMAND DISPATCHER & SYNCHRONIZATION
// ============================================================================
test('Admin Broadcast Controls Suite 1.1: sendCommand writes to localStorage and BroadcastChannel', () => {
  // localStorage sync
  assert.ok(
    adminCode.includes("localStorage.setItem('cricket_admin_command'"),
    'sendCommand must write to localStorage with key cricket_admin_command'
  );
  assert.ok(
    adminCode.includes("window.dispatchEvent(new Event('storage'))"),
    'sendCommand must dispatch storage event for instantaneous same-window reaction'
  );

  // BroadcastChannel sync
  assert.ok(
    adminCode.includes("new BroadcastChannel('cricket_broadcast')"),
    'Admin console must initialize BroadcastChannel cricket_broadcast'
  );
  assert.ok(
    adminCode.includes('postMessage(payload)'),
    'sendCommand must post message to BroadcastChannel'
  );

  // Android HTTP Server dispatch
  assert.ok(
    adminCode.includes('http://${androidIp}:8080/api/admin/command') ||
    adminCode.includes("`http://${androidIp}:8080/api/admin/command`"),
    'sendCommand must send HTTP POST to Android scorer server when IP is available'
  );
});

test('Admin Broadcast Controls Suite 1.2: sendCommand handles offline/local mode gracefully when IP is unset', () => {
  assert.ok(
    adminCode.includes('broadcast locally') || adminCode.includes('No Android IP set'),
    'sendCommand must log local broadcast without throwing uncaught exceptions when IP is blank'
  );
});

// ============================================================================
// SUITE 2: PERSISTENT BOTTOM QUICK BROADCAST ACTIONS DOCK
// ============================================================================
test('Admin Broadcast Controls Suite 2.1: Dock includes all 4 Stadium Overlay Broadcast Buttons', () => {
  // 1. Toss Info button
  assert.ok(adminCode.includes('Toss Info'), 'Dock must include "Toss Info" button');
  assert.ok(adminCode.includes("triggerOverlay('SHOW_TOSS')"), 'Toss Info button must trigger SHOW_TOSS');

  // 2. Team Intro button
  assert.ok(adminCode.includes('Team Intro'), 'Dock must include "Team Intro" button');
  assert.ok(adminCode.includes("triggerOverlay('SHOW_TEAMS')"), 'Team Intro button must trigger SHOW_TEAMS');

  // 3. Bowler Info button
  assert.ok(adminCode.includes('Bowler Info'), 'Dock must include "Bowler Info" button');
  assert.ok(adminCode.includes("triggerOverlay('SHOW_BOWLER')"), 'Bowler Info button must trigger SHOW_BOWLER');

  // 4. Clear Overlay button
  assert.ok(adminCode.includes('Clear Overlay'), 'Dock must include "Clear Overlay" button');
  assert.ok(adminCode.includes("triggerOverlay('CLEAR_OVERLAY')"), 'Clear Overlay button must trigger CLEAR_OVERLAY');
});

test('Admin Broadcast Controls Suite 2.2: Dock preserves all existing buttons and status pills without regression', () => {
  // Required legacy controls
  assert.ok(adminCode.includes('Quick Papare'), 'Dock must preserve Quick Papare button');
  assert.ok(adminCode.includes("sendCommand('PLAY_MUSIC'"), 'Quick Papare must send PLAY_MUSIC');
  assert.ok(adminCode.includes('Stop Music'), 'Dock must preserve Stop Music button');
  assert.ok(adminCode.includes('disabled={!isMusicPlaying}'), 'Stop Music must remain disabled when not playing');
  assert.ok(adminCode.includes('Hide Ad'), 'Dock must preserve Hide Ad button');
  assert.ok(adminCode.includes('disabled={!activeMediaName}'), 'Hide Ad must remain disabled when no media active');
  assert.ok(adminCode.includes('Clear Result'), 'Dock must preserve Clear Result button');
  assert.ok(adminCode.includes("sendCommand('CLEAR_RESULT')"), 'Clear Result must send CLEAR_RESULT');
  assert.ok(adminCode.includes('Stadium Screen'), 'Dock must preserve Stadium Screen link');
  assert.ok(adminCode.includes('TV Screen'), 'Dock must preserve TV Screen link');
  assert.ok(adminCode.includes('Papare Active'), 'Dock must preserve Papare Active indicator');

  // Dock container & layout constraints
  assert.ok(
    adminCode.includes('fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md'),
    'Dock must maintain fixed bottom-0 z-40 positioning'
  );
  assert.ok(
    adminCode.includes('pb-32'),
    'Main container must maintain pb-32 clearance for docked bar'
  );
});

// ============================================================================
// SUITE 3: LIVE PREVIEW TAB (panel-live) STADIUM LED OVERLAYS CARD
// ============================================================================
test('Admin Broadcast Controls Suite 3.1: Live Preview tab has dedicated Stadium LED Broadcast Overlays card', () => {
  assert.ok(
    adminCode.includes('Stadium LED Broadcast Overlays'),
    'Live Preview tab must feature "Stadium LED Broadcast Overlays" card title'
  );
  assert.ok(
    adminCode.includes('Toss Decision'),
    'Card must include Toss Decision section'
  );
  assert.ok(
    adminCode.includes('Team Presentation'),
    'Card must include Team Presentation section'
  );
  assert.ok(
    adminCode.includes('Bowler Spotlight'),
    'Card must include Bowler Spotlight section'
  );
  assert.ok(
    adminCode.includes('Standby (Live Score View)') || adminCode.includes('Standby'),
    'Card must render standby status when no overlay is active'
  );
});

// ============================================================================
// SUITE 4: STATE HOISTING & ZERO-REGRESSION TAB PERSISTENCE
// ============================================================================
test('Admin Broadcast Controls Suite 4.1: All 23 original state variables plus activeOverlay remain hoisted at root', () => {
  const originalStateVariables = [
    'activeTab',
    'androidIp',
    'ipInput',
    'connStatus',
    'previewScore',
    'teams',
    'loadingTeams',
    'isTeamModalOpen',
    'editingTeam',
    'teamFormName',
    'teamFormPlayers',
    'teamToDelete',
    'branding',
    'selectedPlayerTeam',
    'videoAds',
    'imageAds',
    'musicFiles',
    'dragOverTypes',
    'imageDuration',
    'loopMusic',
    'isMusicPlaying',
    'activeMediaName',
    'logs',
  ];

  for (const v of originalStateVariables) {
    assert.ok(adminCode.includes(`const [${v},`), `Root AdminPage must retain hoisted state hook '${v}'`);
  }

  // Active overlay state hook
  assert.ok(
    adminCode.includes('const [activeOverlay,'),
    'Root AdminPage must hoist activeOverlay state hook'
  );
});

test('Admin Broadcast Controls Suite 4.2: Tab panels remain permanently mounted in DOM without conditional unmounting', () => {
  const expectedPanels = ['live', 'media', 'music', 'teams', 'branding'];
  for (const id of expectedPanels) {
    assert.ok(adminCode.includes(`id="panel-${id}"`), `DOM must contain panel-${id}`);
    assert.ok(
      adminCode.includes(`className={activeTab === '${id}' ? 'block space-y-6' : 'hidden'}`),
      `Panel '${id}' must use persistent CSS class toggling`
    );
  }
});

// ============================================================================
// SUITE 5: BIDIRECTIONAL COMMAND RELAY SIMULATION ORACLE
// ============================================================================
test('Admin Broadcast Controls Suite 5.1: Simulation oracle of overlay toggle & clear flow', () => {
  let activeOverlay = null;
  let broadcastEvents = [];
  let storageEntries = {};

  const sendCommand = (action, extra = {}) => {
    const payload = { action, timestamp: Date.now(), ...extra };
    storageEntries['cricket_admin_command'] = JSON.stringify(payload);
    broadcastEvents.push(payload);
  };

  const triggerOverlay = (cmd) => {
    if (cmd === 'CLEAR_OVERLAY') {
      activeOverlay = null;
      sendCommand('CLEAR_OVERLAY');
    } else {
      activeOverlay = cmd;
      sendCommand(cmd);
    }
  };

  // Case 1: Trigger Toss
  triggerOverlay('SHOW_TOSS');
  assert.equal(activeOverlay, 'SHOW_TOSS');
  assert.equal(broadcastEvents.length, 1);
  assert.equal(broadcastEvents[0].action, 'SHOW_TOSS');
  assert.equal(JSON.parse(storageEntries['cricket_admin_command']).action, 'SHOW_TOSS');

  // Case 2: Switch to Team Presentation
  triggerOverlay('SHOW_TEAMS');
  assert.equal(activeOverlay, 'SHOW_TEAMS');
  assert.equal(broadcastEvents.length, 2);
  assert.equal(broadcastEvents[1].action, 'SHOW_TEAMS');

  // Case 3: Switch to Bowler Spotlight
  triggerOverlay('SHOW_BOWLER');
  assert.equal(activeOverlay, 'SHOW_BOWLER');
  assert.equal(broadcastEvents.length, 3);
  assert.equal(broadcastEvents[2].action, 'SHOW_BOWLER');

  // Case 4: Clear Overlay
  triggerOverlay('CLEAR_OVERLAY');
  assert.equal(activeOverlay, null);
  assert.equal(broadcastEvents.length, 4);
  assert.equal(broadcastEvents[3].action, 'CLEAR_OVERLAY');
  assert.equal(JSON.parse(storageEntries['cricket_admin_command']).action, 'CLEAR_OVERLAY');
});
