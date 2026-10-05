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
// CHALLENGER SUITE 1: Image Ad Auto-Stop Duration Boundary Values
// ============================================================================

test('Challenger 1.1: Static guard invariants for imageDuration auto-stop', () => {
  assert.ok(
    adminCode.includes('duration <= 0') || adminCode.includes('imageDuration <= 0'),
    'admin/page.tsx must guard against zero or negative auto-stop duration'
  );
  assert.ok(
    adminCode.includes('clearTimeout(autoStopTimeoutRef.current)'),
    'admin/page.tsx must clear existing autoStop timeout before scheduling or on stop'
  );
  assert.ok(
    adminCode.includes('autoStopTimeoutRef.current = setTimeout'),
    'admin/page.tsx must schedule autoStop with setTimeout'
  );
});

test('Challenger 1.2: Image duration boundary value execution logic', async () => {
  // Oracle simulating admin/page.tsx playImageAd & stopAd logic
  let activeMediaName = null;
  let sentCommands = [];
  let logs = [];
  let autoStopTimer = null;

  const sendCommand = (action, extra = {}) => {
    sentCommands.push({ action, ...extra });
  };

  const addLog = (msg, type) => {
    logs.push({ msg, type });
  };

  const playImageAd = (item, imageDuration) => {
    activeMediaName = item.name;
    sendCommand('PLAY_IMAGE_AD', { src: item.url });

    if (autoStopTimer) clearTimeout(autoStopTimer);
    const duration = Number(imageDuration);
    if (duration <= 0) {
      sendCommand('STOP_AD');
      activeMediaName = null;
      addLog(`Image ad [${item.name}] auto-stopped immediately (duration was <= 0s)`, 'info');
    } else {
      autoStopTimer = setTimeout(() => {
        sendCommand('STOP_AD');
        activeMediaName = null;
        addLog(`Image ad [${item.name}] auto-stopped after ${duration}s`, 'info');
      }, duration * 1000);
    }
  };

  const stopAd = () => {
    if (autoStopTimer) clearTimeout(autoStopTimer);
    activeMediaName = null;
    sendCommand('STOP_AD');
    addLog('Active ad stopped', 'cmd');
  };

  // Case A: Zero duration -> immediate stop
  playImageAd({ name: 'Sponsor Zero', url: 'blob:zero' }, 0);
  assert.equal(activeMediaName, null, 'Active media must be cleared immediately when duration is 0');
  assert.equal(sentCommands.length, 2, 'Must send PLAY_IMAGE_AD followed immediately by STOP_AD');
  assert.equal(sentCommands[0].action, 'PLAY_IMAGE_AD');
  assert.equal(sentCommands[1].action, 'STOP_AD');
  assert.equal(autoStopTimer, null, 'No setTimeout scheduled for duration 0');

  // Case B: Negative duration -> immediate stop
  sentCommands = [];
  playImageAd({ name: 'Sponsor Negative', url: 'blob:neg' }, -10);
  assert.equal(activeMediaName, null, 'Active media must be cleared immediately when duration is negative');
  assert.equal(sentCommands.length, 2);
  assert.equal(sentCommands[0].action, 'PLAY_IMAGE_AD');
  assert.equal(sentCommands[1].action, 'STOP_AD');

  // Case C: Short positive duration (50ms) -> timer fires
  sentCommands = [];
  playImageAd({ name: 'Sponsor Fast', url: 'blob:fast' }, 0.05);
  assert.equal(activeMediaName, 'Sponsor Fast');
  assert.equal(sentCommands.length, 1);
  assert.equal(sentCommands[0].action, 'PLAY_IMAGE_AD');

  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(activeMediaName, null, 'Timer must fire and clear activeMediaName');
  assert.equal(sentCommands.length, 2);
  assert.equal(sentCommands[1].action, 'STOP_AD');

  // Case D: Large duration (86400s) with manual stopAd() interruption
  sentCommands = [];
  playImageAd({ name: 'Sponsor Long', url: 'blob:long' }, 86400);
  assert.equal(activeMediaName, 'Sponsor Long');
  assert.ok(autoStopTimer !== null);
  stopAd();
  assert.equal(activeMediaName, null);
  assert.equal(sentCommands.length, 2);
  assert.equal(sentCommands[1].action, 'STOP_AD');

  // Case E: Rapid ad replacement (Ad 1 replaced by Ad 2 before timer expires)
  sentCommands = [];
  playImageAd({ name: 'Ad One', url: 'blob:1' }, 10);
  const firstTimer = autoStopTimer;
  playImageAd({ name: 'Ad Two', url: 'blob:2' }, 10);
  assert.notEqual(autoStopTimer, firstTimer, 'New timer instance created');
  assert.equal(activeMediaName, 'Ad Two');
  stopAd();
});

test('Challenger 1.3: Image duration input sanitization logic', () => {
  // Input handler in JSX: (e) => setImageDuration(Math.max(0, Number(e.target.value) || 0))
  const sanitize = (rawInput) => Math.max(0, Number(rawInput) || 0);

  assert.equal(sanitize('0'), 0);
  assert.equal(sanitize('-5'), 0);
  assert.equal(sanitize('-999'), 0);
  assert.equal(sanitize(''), 0);
  assert.equal(sanitize('abc'), 0);
  assert.equal(sanitize('undefined'), 0);
  assert.equal(sanitize('15'), 15);
  assert.equal(sanitize('60'), 60);
  assert.equal(sanitize('86400'), 86400);
});

// ============================================================================
// CHALLENGER SUITE 2: Video/Image/Music Drag-and-Drop Handlers
// ============================================================================

test('Challenger 2.1: Native drag-and-drop wireup across all 3 media types', () => {
  assert.ok(adminCode.includes("handleDragOver(e, 'video')"), 'Video dropzone must wire handleDragOver');
  assert.ok(adminCode.includes("handleDragLeave(e, 'video')"), 'Video dropzone must wire handleDragLeave');
  assert.ok(adminCode.includes("handleDrop(e, 'video')"), 'Video dropzone must wire handleDrop');

  assert.ok(adminCode.includes("handleDragOver(e, 'image')"), 'Image dropzone must wire handleDragOver');
  assert.ok(adminCode.includes("handleDragLeave(e, 'image')"), 'Image dropzone must wire handleDragLeave');
  assert.ok(adminCode.includes("handleDrop(e, 'image')"), 'Image dropzone must wire handleDrop');

  assert.ok(adminCode.includes("handleDragOver(e, 'music')"), 'Music dropzone must wire handleDragOver');
  assert.ok(adminCode.includes("handleDragLeave(e, 'music')"), 'Music dropzone must wire handleDragLeave');
  assert.ok(adminCode.includes("handleDrop(e, 'music')"), 'Music dropzone must wire handleDrop');
});

test('Challenger 2.2: Drag and drop event logic and state isolation', () => {
  let dragOverTypes = {};
  let defaultPrevented = false;
  let propagationStopped = false;

  const createMockDragEvent = (files = null) => ({
    preventDefault: () => { defaultPrevented = true; },
    stopPropagation: () => { propagationStopped = true; },
    dataTransfer: files !== null ? { files } : null,
  });

  const handleDragOver = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    dragOverTypes = { ...dragOverTypes, [type]: true };
  };

  const handleDragLeave = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    dragOverTypes = { ...dragOverTypes, [type]: false };
  };

  // Test drag over & leave for video
  defaultPrevented = false;
  propagationStopped = false;
  handleDragOver(createMockDragEvent(), 'video');
  assert.equal(defaultPrevented, true);
  assert.equal(propagationStopped, true);
  assert.equal(dragOverTypes['video'], true);
  assert.equal(dragOverTypes['image'], undefined);

  handleDragLeave(createMockDragEvent(), 'video');
  assert.equal(dragOverTypes['video'], false);

  // Test drop with null dataTransfer (should not throw)
  let videoAds = [];
  let imageAds = [];
  let musicFiles = [];

  const processFiles = (files, type) => {
    if (!files || files.length === 0) return;
    const items = Array.from(files).map((f) => ({
      id: 'test-id',
      name: f.name,
      url: `blob:${f.name}`,
      type,
    }));
    if (type === 'video') videoAds.push(...items);
    if (type === 'image') imageAds.push(...items);
    if (type === 'music') musicFiles.push(...items);
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    dragOverTypes = { ...dragOverTypes, [type]: false };
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files, type);
    }
  };

  // Drop with null dataTransfer
  handleDrop(createMockDragEvent(null), 'video');
  assert.equal(videoAds.length, 0);

  // Drop with empty files list
  handleDrop(createMockDragEvent([]), 'video');
  assert.equal(videoAds.length, 0);

  // Drop with multiple video files
  handleDrop(createMockDragEvent([{ name: 'ad1.mp4' }, { name: 'ad2.mp4' }]), 'video');
  assert.equal(videoAds.length, 2);
  assert.equal(videoAds[0].name, 'ad1.mp4');
  assert.equal(videoAds[0].type, 'video');

  // Drop image file
  handleDrop(createMockDragEvent([{ name: 'banner.png' }]), 'image');
  assert.equal(imageAds.length, 1);
  assert.equal(imageAds[0].name, 'banner.png');
  assert.equal(imageAds[0].type, 'image');

  // Drop music file
  handleDrop(createMockDragEvent([{ name: 'papare.mp3' }]), 'music');
  assert.equal(musicFiles.length, 1);
  assert.equal(musicFiles[0].name, 'papare.mp3');
  assert.equal(musicFiles[0].type, 'music');
});

// ============================================================================
// CHALLENGER SUITE 3: Audio Looping and Play/Stop Toggling
// ============================================================================

test('Challenger 3.1: Music looping and control wireup', () => {
  assert.ok(adminCode.includes('loopMusic'), 'Admin must have loopMusic state');
  assert.ok(adminCode.includes('setLoopMusic'), 'Admin must have setLoopMusic setter');
  assert.ok(adminCode.includes("loop: loopMusic"), 'playMusic must pass loop: loopMusic payload');
  assert.ok(adminCode.includes("sendCommand('STOP_MUSIC')"), 'stopMusic must send STOP_MUSIC');
  assert.ok(adminCode.includes('Quick Papare'), 'Quick Papare action must exist in broadcast bar');
  assert.ok(adminCode.includes('Stop Music'), 'Stop Music action must exist in broadcast bar');
});

test('Challenger 3.2: Audio loop toggle and concurrent playback oracle', () => {
  let isMusicPlaying = false;
  let loopMusic = true;
  let activeMediaName = null;
  let sentCommands = [];

  const sendCommand = (action, extra = {}) => {
    sentCommands.push({ action, ...extra });
  };

  const playMusic = (item) => {
    isMusicPlaying = true;
    sendCommand('PLAY_MUSIC', { src: item.url, loop: loopMusic });
  };

  const stopMusic = () => {
    isMusicPlaying = false;
    sendCommand('STOP_MUSIC');
  };

  const playVideoAd = (item) => {
    activeMediaName = item.name;
    sendCommand('PLAY_VIDEO_AD', { src: item.url });
  };

  const stopAd = () => {
    activeMediaName = null;
    sendCommand('STOP_AD');
  };

  // Case A: Play with default loop = true
  playMusic({ name: 'Track 1', url: 'blob:track1' });
  assert.equal(isMusicPlaying, true);
  assert.equal(sentCommands[0].action, 'PLAY_MUSIC');
  assert.equal(sentCommands[0].loop, true);

  // Case B: Stop music
  stopMusic();
  assert.equal(isMusicPlaying, false);
  assert.equal(sentCommands[1].action, 'STOP_MUSIC');

  // Case C: Toggle loop to false, play again
  loopMusic = false;
  playMusic({ name: 'Track 2', url: 'blob:track2' });
  assert.equal(isMusicPlaying, true);
  assert.equal(sentCommands[2].loop, false);

  // Case D: Concurrent Video Ad + Music playback
  playVideoAd({ name: 'Commercial 1', url: 'blob:comm1' });
  assert.equal(activeMediaName, 'Commercial 1');
  assert.equal(isMusicPlaying, true, 'Music remains playing while ad starts');

  // Stop ad -> music still playing
  stopAd();
  assert.equal(activeMediaName, null);
  assert.equal(isMusicPlaying, true, 'Music remains playing when ad stops');

  // Stop music -> both idle
  stopMusic();
  assert.equal(activeMediaName, null);
  assert.equal(isMusicPlaying, false);
});

// ============================================================================
// CHALLENGER SUITE 4: Branding JSON Schema and Player Role Mappings
// ============================================================================

test('Challenger 4.1: PLAYER_ROLES definitions and completeness', () => {
  // Types file must define all 4 roles
  const roles = ['batting', 'baller', 'all_rounder', 'wicket_keeper'];
  roles.forEach((r) => {
    assert.ok(typesCode.includes(`id: '${r}'`), `Role ${r} must be defined in PLAYER_ROLES`);
  });

  assert.ok(typesCode.includes("icon: '🏏'"), 'Batting role must have 🏏 icon');
  assert.ok(typesCode.includes("icon: '🎳'"), 'Baller role must have 🎳 icon');
  assert.ok(typesCode.includes("icon: '⚡'"), 'All rounder role must have ⚡ icon');
  assert.ok(typesCode.includes("icon: '🧤'"), 'Wicket keeper role must have 🧤 icon');
});

test('Challenger 4.2: Branding JSON Export & Import schema validation', () => {
  const sampleBranding = {
    companyName: 'Acme Corp',
    companyLogo: '/assets/branding/company-logo-default.svg',
    tournamentName: 'Trophy 2026',
    tournamentLogo: '/assets/branding/tournament-logo-default.svg',
    teamLogos: { 'Tech Titans': 'data:image/svg+xml;base64,123' },
    playerPhotos: { 'D. Mendis': 'data:image/webp;base64,abc' },
    playerRoles: {
      'D. Mendis': 'batting',
      'S. Fernando': 'all_rounder',
      'K. Perera': 'wicket_keeper',
      'D. Chameera': 'baller',
    },
  };

  // Export roundtrip test
  const exportedString = JSON.stringify(sampleBranding, null, 2);
  const reimported = JSON.parse(exportedString);
  assert.deepEqual(reimported, sampleBranding, 'Branding JSON export must preserve exact schema and values');

  // Import handler resilience oracle (matching importBrandingJson in page.tsx)
  const defaultBranding = {
    companyName: 'Default Company',
    companyLogo: '/default-logo.svg',
    tournamentName: 'Default Tournament',
    tournamentLogo: '/default-tourn.svg',
    teamLogos: {},
    playerPhotos: {},
    playerRoles: { 'A. Player': 'batting' },
  };

  const runImport = (jsonStr) => {
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === 'object') {
      return {
        companyName: parsed.companyName || defaultBranding.companyName,
        companyLogo: parsed.companyLogo || defaultBranding.companyLogo,
        tournamentName: parsed.tournamentName || defaultBranding.tournamentName,
        tournamentLogo: parsed.tournamentLogo || defaultBranding.tournamentLogo,
        teamLogos: parsed.teamLogos || {},
        playerPhotos: parsed.playerPhotos || {},
        playerRoles: parsed.playerRoles || {},
      };
    }
    throw new Error('Invalid format');
  };

  // Test 1: Full valid import
  const result1 = runImport(JSON.stringify(sampleBranding));
  assert.equal(result1.companyName, 'Acme Corp');
  assert.equal(result1.playerRoles['D. Mendis'], 'batting');

  // Test 2: Partial import with missing playerRoles
  const partial = { companyName: 'New Corp' };
  const result2 = runImport(JSON.stringify(partial));
  assert.equal(result2.companyName, 'New Corp');
  assert.equal(result2.tournamentName, 'Default Tournament', 'Must fallback to default tournamentName');
  assert.deepEqual(result2.playerRoles, {}, 'Must fallback to empty object without crashing');

  // Test 3: Malformed JSON throws catchable error
  assert.throws(() => runImport('{ invalid json content'), /SyntaxError|Unexpected/);
});

test('Challenger 4.3: Player role assignment mutation and state immutability', () => {
  let branding = {
    companyName: 'Company Cricket League',
    companyLogo: '',
    tournamentName: 'Tournament',
    tournamentLogo: '',
    teamLogos: {},
    playerPhotos: {},
    playerRoles: {
      'D. Mendis': 'batting',
      'S. Fernando': 'all_rounder',
    },
  };

  const handleSetPlayerRole = (playerName, role) => {
    const updatedRoles = {
      ...(branding.playerRoles || {}),
      [playerName]: role,
    };
    branding = {
      ...branding,
      playerRoles: updatedRoles,
    };
  };

  // Change D. Mendis to wicket_keeper
  handleSetPlayerRole('D. Mendis', 'wicket_keeper');
  assert.equal(branding.playerRoles['D. Mendis'], 'wicket_keeper');
  assert.equal(branding.playerRoles['S. Fernando'], 'all_rounder', 'Other players roles must not be mutated');

  // Add role for new player
  handleSetPlayerRole('New Star', 'baller');
  assert.equal(branding.playerRoles['New Star'], 'baller');
  assert.equal(Object.keys(branding.playerRoles).length, 3);
});

// ============================================================================
// CHALLENGER SUITE 5: 5-Tab Layout Invariants and Zero-Loss Architecture
// ============================================================================

test('Challenger 5.1: Verify all 5 tab panel elements exist with persistent DOM mounting', () => {
  // Check tab definitions
  assert.ok(adminCode.includes("id: 'live'"), "Tab 'live' must be defined");
  assert.ok(adminCode.includes("id: 'media'"), "Tab 'media' must be defined");
  assert.ok(adminCode.includes("id: 'music'"), "Tab 'music' must be defined");
  assert.ok(adminCode.includes("id: 'teams'"), "Tab 'teams' must be defined");
  assert.ok(adminCode.includes("id: 'branding'"), "Tab 'branding' must be defined");

  // Check persistent DOM panel wrappers (hidden/block classes)
  assert.ok(
    adminCode.includes("activeTab === 'live' ? 'block space-y-6' : 'hidden'"),
    'Tab panel live must use persistent DOM mounting (hidden class)'
  );
  assert.ok(
    adminCode.includes("activeTab === 'media' ? 'block space-y-6' : 'hidden'"),
    'Tab panel media must use persistent DOM mounting (hidden class)'
  );
  assert.ok(
    adminCode.includes("activeTab === 'music' ? 'block space-y-6' : 'hidden'"),
    'Tab panel music must use persistent DOM mounting (hidden class)'
  );
  assert.ok(
    adminCode.includes("activeTab === 'teams' ? 'block space-y-6' : 'hidden'"),
    'Tab panel teams must use persistent DOM mounting (hidden class)'
  );
  assert.ok(
    adminCode.includes("activeTab === 'branding' ? 'block space-y-6' : 'hidden'"),
    'Tab panel branding must use persistent DOM mounting (hidden class)'
  );
});

test('Challenger 5.2: Docked bottom broadcast actions bar permanently mounted', () => {
  assert.ok(
    adminCode.includes('fixed bottom-0 left-0 right-0 z-40'),
    'Sticky broadcast bar must be fixed at bottom'
  );
  assert.ok(
    adminCode.includes('Quick Broadcast Actions'),
    'Broadcast bar must have Quick Broadcast Actions header'
  );
  assert.ok(
    adminCode.includes('pb-32'),
    'Page container must have pb-32 bottom padding to prevent content clipping'
  );
});
