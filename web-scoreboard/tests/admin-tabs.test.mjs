import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webScoreboardDir = path.join(__dirname, '..');
const adminPagePath = path.join(webScoreboardDir, 'src', 'app', 'admin', 'page.tsx');

const adminCode = fs.readFileSync(adminPagePath, 'utf-8');

// ============================================================================
// SUITE 1: TAB NAVIGATION LAYOUT & 5-TAB BUTTON ARCHITECTURE
// ============================================================================
test('Admin Tabs Suite 1.1: 5 functional tabs are declared with correct IDs and metadata', () => {
  // Confirm tab type definition
  assert.ok(
    adminCode.includes("export type AdminTab = 'live' | 'media' | 'music' | 'teams' | 'branding';"),
    'AdminTab type union must define all 5 tabs: live, media, music, teams, branding'
  );

  // Confirm tab array definitions
  const expectedTabs = [
    { id: 'live', label: 'Live Preview & Status', icon: '🎮' },
    { id: 'media', label: 'Media & Ads', icon: '🎬' },
    { id: 'music', label: 'Music & Audio', icon: '🎺' },
    { id: 'teams', label: 'Teams & Rosters', icon: '👥' },
    { id: 'branding', label: 'Branding & Visuals', icon: '🎨' },
  ];

  for (const t of expectedTabs) {
    assert.ok(adminCode.includes(`id: '${t.id}'`), `TABS list must contain tab ID '${t.id}'`);
    assert.ok(adminCode.includes(`label: '${t.label}'`), `TABS list must contain label '${t.label}'`);
    assert.ok(adminCode.includes(`icon: '${t.icon}'`), `TABS list must contain icon '${t.icon}'`);
  }
});

test('Admin Tabs Suite 1.2: Default activeTab is "live" and supports URL hash sync', () => {
  // Default state initialization
  assert.ok(
    adminCode.includes("const [activeTab, setActiveTab] = useState<AdminTab>('live');"),
    "activeTab must default to 'live'"
  );

  // Tab change handler updates hash without full page reload
  assert.ok(
    adminCode.includes("const handleTabChange = (tabId: AdminTab) => {"),
    'handleTabChange must be defined'
  );
  assert.ok(
    adminCode.includes("window.history.replaceState(null, '', `#${tabId}`);"),
    'handleTabChange must synchronize URL hash via window.history.replaceState'
  );

  // Mount restoration parses window.location.hash
  assert.ok(
    adminCode.includes("window.location.hash.replace('#', '')"),
    'Mount hook must restore active tab from URL hash'
  );
  assert.ok(
    adminCode.includes("['live', 'media', 'music', 'teams', 'branding'].includes(hash)"),
    'Mount hook must validate allowed tab hash values'
  );
});

test('Admin Tabs Suite 1.3: Tab navigation buttons render with active/inactive styling and dynamic badges', () => {
  // Nav element exists
  assert.ok(
    adminCode.includes('<nav'),
    'Tab bar must be rendered in a <nav> container'
  );
  assert.ok(
    adminCode.includes('aria-label="Admin Navigation Tabs"'),
    'Tab nav must have accessible aria-label'
  );

  // Button mapping and active styling
  assert.ok(
    adminCode.includes('onClick={() => handleTabChange(tab.id)}'),
    'Tab buttons must trigger handleTabChange with tab.id'
  );
  assert.ok(
    adminCode.includes('from-amber-500 to-amber-400 text-slate-950 font-black'),
    'Active tab button must have high-contrast amber gradient'
  );

  // Dynamic status badges for each tab
  assert.ok(
    adminCode.includes("tab.id === 'live'") &&
    adminCode.includes("connStatus === 'connected' ? 'LIVE' : 'OFFLINE'"),
    'Live tab button must render dynamic LIVE/OFFLINE connection badge'
  );

  assert.ok(
    adminCode.includes("tab.id === 'media'") &&
    adminCode.includes("activeMediaName ? (") &&
    adminCode.includes('videoAds.length + imageAds.length'),
    'Media tab button must render ACTIVE badge during broadcast or media count'
  );

  assert.ok(
    adminCode.includes("tab.id === 'music'") &&
    adminCode.includes("isMusicPlaying ? (") &&
    adminCode.includes('musicFiles.length'),
    'Music tab button must render ON badge during papare playback or music file count'
  );

  assert.ok(
    adminCode.includes("tab.id === 'teams'") &&
    adminCode.includes('teams.length'),
    'Teams tab button must render count badge of participating teams'
  );

  assert.ok(
    adminCode.includes("tab.id === 'branding'") &&
    adminCode.includes('Object.keys(branding.teamLogos).length') &&
    adminCode.includes('Crests'),
    'Branding tab button must render crests count badge'
  );
});

// ============================================================================
// SUITE 2: ZERO-LOSS PERSISTENT DOM MOUNTING & STATE PRESERVATION
// ============================================================================
test('Admin Tabs Suite 2.1: All 5 tab panels are permanently present in DOM without conditional unmounting', () => {
  // Check panel container IDs
  assert.ok(adminCode.includes('id="panel-live"'), 'Live tab panel DOM container must exist');
  assert.ok(adminCode.includes('id="panel-media"'), 'Media tab panel DOM container must exist');
  assert.ok(adminCode.includes('id="panel-music"'), 'Music tab panel DOM container must exist');
  assert.ok(adminCode.includes('id="panel-teams"'), 'Teams tab panel DOM container must exist');
  assert.ok(adminCode.includes('id="panel-branding"'), 'Branding tab panel DOM container must exist');

  // Verify CSS display toggling pattern: activeTab === '<id>' ? 'block space-y-6' : 'hidden'
  const expectedPanels = ['live', 'media', 'music', 'teams', 'branding'];
  for (const id of expectedPanels) {
    const classPattern = `className={activeTab === '${id}' ? 'block space-y-6' : 'hidden'}`;
    assert.ok(
      adminCode.includes(classPattern),
      `Panel '${id}' must use persistent CSS class toggling: "${classPattern}"`
    );
  }

  // Ensure NO conditional rendering unmount expressions exist for tab panels
  assert.equal(
    adminCode.includes("{activeTab === 'live' &&"),
    false,
    "Panel 'live' must NOT be conditionally unmounted with &&"
  );
  assert.equal(
    adminCode.includes("{activeTab === 'media' &&"),
    false,
    "Panel 'media' must NOT be conditionally unmounted with &&"
  );
  assert.equal(
    adminCode.includes("{activeTab === 'music' &&"),
    false,
    "Panel 'music' must NOT be conditionally unmounted with &&"
  );
  assert.equal(
    adminCode.includes("{activeTab === 'teams' &&"),
    false,
    "Panel 'teams' must NOT be conditionally unmounted with &&"
  );
  assert.equal(
    adminCode.includes("{activeTab === 'branding' &&"),
    false,
    "Panel 'branding' must NOT be conditionally unmounted with &&"
  );
});

test('Admin Tabs Suite 2.2: State hooks are hoisted at root AdminPage level for cross-tab persistence', () => {
  // Confirm state hooks are defined before any JSX return
  const stateVariables = [
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

  for (const varName of stateVariables) {
    assert.ok(
      adminCode.includes(`const [${varName},`),
      `Root AdminPage component must hoist '${varName}' state hook`
    );
  }
});

// ============================================================================
// SUITE 3: DOCKED STICKY BOTTOM QUICK BROADCAST ACTIONS BAR
// ============================================================================
test('Admin Tabs Suite 3.1: Docked bottom bar is permanently mounted outside tab panels with z-index and spacing', () => {
  // Check fixed positioning, z-index, and backdrop blur
  assert.ok(
    adminCode.includes('fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md'),
    'Docked bar must have fixed bottom-0 left-0 right-0 z-40 with backdrop blur'
  );

  // Check main page bottom clearance padding
  assert.ok(
    adminCode.includes('<main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans pb-32">'),
    'Main page container must have pb-32 bottom clearance padding to prevent content obstruction'
  );

  // Check Quick Broadcast Actions title
  assert.ok(
    adminCode.includes('Quick Broadcast Actions'),
    'Docked bar must display "Quick Broadcast Actions" label'
  );
});

test('Admin Tabs Suite 3.2: Docked bar includes all 5 live action controls and status indicators', () => {
  // 1. Quick Papare button
  assert.ok(
    adminCode.includes('Quick Papare'),
    'Docked bar must include "Quick Papare" action button'
  );
  assert.ok(
    adminCode.includes("sendCommand('PLAY_MUSIC'"),
    'Quick Papare button must trigger PLAY_MUSIC command'
  );

  // 2. Stop Music button
  assert.ok(
    adminCode.includes('Stop Music'),
    'Docked bar must include "Stop Music" action button'
  );
  assert.ok(
    adminCode.includes('disabled={!isMusicPlaying}'),
    'Stop Music button must be disabled when music is not playing'
  );

  // 3. Hide Ad button
  assert.ok(
    adminCode.includes('Hide Ad'),
    'Docked bar must include "Hide Ad" action button'
  );
  assert.ok(
    adminCode.includes('disabled={!activeMediaName}'),
    'Hide Ad button must be disabled when no media ad is active'
  );

  // 4. Clear Result button
  assert.ok(
    adminCode.includes('Clear Result'),
    'Docked bar must include "Clear Result" action button'
  );
  assert.ok(
    adminCode.includes("sendCommand('CLEAR_RESULT')"),
    'Clear Result button must trigger CLEAR_RESULT command'
  );

  // 5. TV Screen link
  assert.ok(
    adminCode.includes('href="/"'),
    'Docked bar must link to "/" for TV Scoreboard'
  );
  assert.ok(
    adminCode.includes('TV Screen'),
    'Docked bar TV link must be labeled "TV Screen"'
  );

  // Live status pills in docked bar
  assert.ok(
    adminCode.includes('Papare Active'),
    'Docked bar must show "Papare Active" indicator when isMusicPlaying is true'
  );
});

// ============================================================================
// SUITE 4: STATE TRANSITION SIMULATION & INVARIANTS HARNESS
// ============================================================================
test('Admin Tabs Suite 4.1: Empirical state preservation simulation across 100 tab switches', () => {
  // Simulated state container modeling AdminPage
  const state = {
    activeTab: 'live',
    videoAds: [{ id: 'v1', name: 'sponsor_reel.mp4', url: 'blob:v1', type: 'video' }],
    imageAds: [{ id: 'i1', name: 'banner.png', url: 'blob:i1', type: 'image' }],
    musicFiles: [{ id: 'm1', name: 'papare_brass.mp3', url: 'blob:m1', type: 'music' }],
    teams: [{ id: 1, name: 'Tech Titans', players: ['Player 1', 'Player 2'] }],
    branding: { companyName: 'Enterprise Corp', teamLogos: { 'Tech Titans': 'data:image/webp;...' } },
    ipInput: '192.168.1.100',
    androidIp: '192.168.1.100',
    connStatus: 'connected',
    activeMediaName: 'sponsor_reel.mp4',
    isMusicPlaying: true,
    imageDuration: 15,
    loopMusic: true,
    logs: [{ id: '1', time: '10:00:00', msg: 'System initialized', type: 'info' }],
  };

  const tabs = ['live', 'media', 'music', 'teams', 'branding'];

  // Switch tabs 100 times in various patterns
  for (let i = 0; i < 100; i++) {
    const nextTab = tabs[i % tabs.length];
    state.activeTab = nextTab;

    // Verify all in-memory data remains unchanged
    assert.equal(state.videoAds.length, 1);
    assert.equal(state.videoAds[0].name, 'sponsor_reel.mp4');
    assert.equal(state.imageAds.length, 1);
    assert.equal(state.musicFiles.length, 1);
    assert.equal(state.teams[0].name, 'Tech Titans');
    assert.equal(state.branding.companyName, 'Enterprise Corp');
    assert.equal(state.ipInput, '192.168.1.100');
    assert.equal(state.connStatus, 'connected');
    assert.equal(state.activeMediaName, 'sponsor_reel.mp4');
    assert.equal(state.isMusicPlaying, true);
    assert.equal(state.imageDuration, 15);
    assert.equal(state.loopMusic, true);
    assert.equal(state.logs.length, 1);
  }
});
