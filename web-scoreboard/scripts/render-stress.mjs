import React from 'react';
import { renderToString } from 'react-dom/server';
import { ScoreboardHeader } from '../src/components/ScoreboardHeader.tsx';
import { BatsmenPanel } from '../src/components/BatsmenPanel.tsx';
import { BowlerPanel } from '../src/components/BowlerPanel.tsx';
import { PartnershipPanel } from '../src/components/PartnershipPanel.tsx';
import { ChasePanel } from '../src/components/ChasePanel.tsx';
import { RecentBalls } from '../src/components/RecentBalls.tsx';
import { StatsFooter } from '../src/components/StatsFooter.tsx';
import { SplitAdPanel } from '../src/components/SplitAdPanel.tsx';
import { ResultBanner } from '../src/components/ResultBanner.tsx';
import { ConnectionModal } from '../src/components/ConnectionModal.tsx';

console.log('--- STARTING REACT SERVER RENDERING ADVERSARIAL STRESS ---');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    failed++;
  } else {
    passed++;
  }
}

// 1. ScoreboardHeader Stress
try {
  const html = renderToString(
    React.createElement(ScoreboardHeader, {
      match: {
        team1: 'Sri Lankan Royal Colombo Athletic Wanderers Championship Club Limited Over Tournament Team',
        team2: 'Kandy Hill Country Central Sports Alliance Cricket Board XI 1920 Association Club',
        status: 'INNINGS_2',
        isCompleted: false,
        innings1: { score: 285, wickets: 6, overs: '20.0' },
      },
      currentInnings: {
        battingTeam: 'Kandy Hill Country Central Sports Alliance Cricket Board XI 1920 Association Club',
        score: 9999,
        wickets: 9,
        overs: '19.5',
      },
      scoreFlash: true,
    })
  );
  assert(html.includes('9999/9'), 'ScoreboardHeader rendered extreme score 9999/9');
  assert(html.includes('Sri Lankan Royal Colombo'), 'ScoreboardHeader rendered long team 1 name');
  console.log('✓ ScoreboardHeader extreme strings & scores passed');
} catch (e) {
  assert(false, 'ScoreboardHeader threw: ' + e.message);
}

// 2. BatsmenPanel Stress
try {
  const html = renderToString(
    React.createElement(BatsmenPanel, {
      batsmen: [
        {
          name: 'Warnakulasuriya Patabendige Ushantha Joseph Chaminda Vaas The Legend Extraordinnaire',
          runs: 999,
          balls: 500,
          fours: 150,
          sixes: 50,
          strikeRate: 199.8,
          onStrike: true,
        },
        {
          name: 'Pinnaduwage Aravinda de Silva World Cup Winner 1996 Man of the Match Hero',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0.0,
          onStrike: false,
        },
      ],
    })
  );
  assert(html.includes('Warnakulasuriya'), 'BatsmenPanel rendered 100-char name');
  assert(html.includes('999'), 'BatsmenPanel rendered 999 runs');
  assert(html.includes('199.8'), 'BatsmenPanel calculated/displayed strike rate');
  assert(html.includes('0.0'), 'BatsmenPanel rendered 0.0 SR for 0 balls');
  console.log('✓ BatsmenPanel extreme strings & boundary stats passed');
} catch (e) {
  assert(false, 'BatsmenPanel threw: ' + e.message);
}

// 3. BowlerPanel Stress
try {
  const html = renderToString(
    React.createElement(BowlerPanel, {
      bowler: {
        name: 'Muttiah Muralitharan The Spin Wizard of Kandy Record Holder 800 International Test Wickets',
        overs: '10.0',
        maidens: 4,
        runs: 250,
        wickets: 10,
        economy: 25.0,
      },
    })
  );
  assert(html.includes('Muttiah Muralitharan'), 'BowlerPanel rendered long bowler name');
  assert(html.includes('250'), 'BowlerPanel rendered 250 runs');
  assert(html.includes('10'), 'BowlerPanel rendered 10 wickets');
  console.log('✓ BowlerPanel extreme stats passed');
} catch (e) {
  assert(false, 'BowlerPanel threw: ' + e.message);
}

// 4. BowlerPanel with undefined
try {
  const html = renderToString(React.createElement(BowlerPanel, {}));
  assert(html.includes('Bowler'), 'BowlerPanel handled undefined bowler fallback');
  console.log('✓ BowlerPanel undefined bowler passed');
} catch (e) {
  assert(false, 'BowlerPanel undefined threw: ' + e.message);
}

// 5. PartnershipPanel Stress
try {
  const html = renderToString(
    React.createElement(PartnershipPanel, {
      partnership: { runs: 999, balls: 500 },
    })
  );
  assert(html.includes('999'), 'PartnershipPanel rendered 999 runs');
  assert(html.includes('500'), 'PartnershipPanel rendered 500 balls');
  console.log('✓ PartnershipPanel extreme stats passed');
} catch (e) {
  assert(false, 'PartnershipPanel threw: ' + e.message);
}

// 6. ChasePanel Stress (1st innings null, 2nd innings active, completed, negative)
try {
  // 1st innings -> null
  const html1 = renderToString(React.createElement(ChasePanel, { requiredRuns: null }));
  assert(html1 === '', 'ChasePanel renders empty string during 1st innings (null requiredRuns)');

  // 2nd innings active
  const html2 = renderToString(
    React.createElement(ChasePanel, {
      requiredRuns: 185,
      requiredOvers: 12.0,
      requiredRunRate: 15.42,
    })
  );
  assert(html2.includes('185'), 'ChasePanel rendered 185 required runs');
  assert(html2.includes('15.42'), 'ChasePanel rendered required RR');

  // Negative required runs (overshot target)
  const html3 = renderToString(
    React.createElement(ChasePanel, {
      requiredRuns: -4,
      requiredOvers: 2.1,
      requiredRunRate: 0.0,
    })
  );
  assert(html3.includes('-4'), 'ChasePanel rendered negative required runs without crashing');
  console.log('✓ ChasePanel innings transitions & edge states passed');
} catch (e) {
  assert(false, 'ChasePanel threw: ' + e.message);
}

// 7. RecentBalls 3-Over Clamp Stress
try {
  // 6 overs passed in
  const html = renderToString(
    React.createElement(RecentBalls, {
      recentBalls: [
        { overNumber: 1, balls: [{ label: '1' }] },
        { overNumber: 2, balls: [{ label: '2' }] },
        { overNumber: 3, balls: [{ label: '3' }] },
        { overNumber: 4, balls: [{ label: '4' }] },
        { overNumber: 5, balls: [{ label: 'W', isWicket: true }] },
        { overNumber: 6, balls: [{ label: '6' }, { label: 'WD', isExtra: true }] },
      ],
    })
  );
  console.log('Full RecentBalls HTML:', html);
  // Must contain overs 4, 5, 6
  assert(/Ov\s*<!--\s*-->\s*4\s*<!--\s*-->\s*:/.test(html), 'RecentBalls must contain Ov 4');
  assert(/Ov\s*<!--\s*-->\s*5\s*<!--\s*-->\s*:/.test(html), 'RecentBalls must contain Ov 5');
  assert(/Ov\s*<!--\s*-->\s*6\s*<!--\s*-->\s*:/.test(html), 'RecentBalls must contain Ov 6');
  // Must NOT contain overs 1, 2, 3
  assert(!/Ov\s*<!--\s*-->\s*1\s*<!--\s*-->\s*:/.test(html), 'RecentBalls must clamp out Ov 1');
  assert(!/Ov\s*<!--\s*-->\s*2\s*<!--\s*-->\s*:/.test(html), 'RecentBalls must clamp out Ov 2');
  assert(!/Ov\s*<!--\s*-->\s*3\s*<!--\s*-->\s*:/.test(html), 'RecentBalls must clamp out Ov 3');
  console.log('✓ RecentBalls strict 3-over clamp passed');
} catch (e) {
  assert(false, 'RecentBalls threw: ' + e.message);
}

// 8. SplitAdPanel Stress (Video, Image, Inactive)
try {
  const htmlInactive = renderToString(
    React.createElement(SplitAdPanel, {
      isActive: false,
      type: 'video',
      src: 'https://test/ad.mp4',
      onClose: () => {},
    })
  );
  assert(htmlInactive === '', 'SplitAdPanel inactive renders null');

  const htmlVideo = renderToString(
    React.createElement(SplitAdPanel, {
      isActive: true,
      type: 'video',
      src: 'https://test/ad.mp4',
      onClose: () => {},
    })
  );
  assert(htmlVideo.includes('<video'), 'SplitAdPanel rendered video element');

  const htmlImage = renderToString(
    React.createElement(SplitAdPanel, {
      isActive: true,
      type: 'image',
      src: 'https://test/ad.png',
      onClose: () => {},
    })
  );
  assert(htmlImage.includes('<img'), 'SplitAdPanel rendered img element');
  console.log('✓ SplitAdPanel states passed');
} catch (e) {
  assert(false, 'SplitAdPanel threw: ' + e.message);
}

// 9. ResultBanner Stress (Completed string, Completed object, In progress)
try {
  const htmlNotDone = renderToString(
    React.createElement(ResultBanner, {
      isCompleted: false,
      result: 'Tech Titans won by 5 wickets',
    })
  );
  assert(htmlNotDone === '', 'ResultBanner not completed renders null');

  const htmlString = renderToString(
    React.createElement(ResultBanner, {
      isCompleted: true,
      result: 'Tech Titans won by 5 wickets',
      onDismiss: () => {},
    })
  );
  assert(htmlString.includes('Tech Titans won by 5 wickets'), 'ResultBanner rendered string title');
  assert(htmlString.includes('Dismiss Banner'), 'ResultBanner rendered dismiss button');

  const htmlObj = renderToString(
    React.createElement(ResultBanner, {
      isCompleted: true,
      result: {
        title: 'Sales Strikers Champions 2026',
        detail: 'Defeated Tech Titans by 2 runs in a thrilling final over finish',
      },
      onDismiss: () => {},
    })
  );
  assert(htmlObj.includes('Sales Strikers Champions 2026'), 'ResultBanner rendered object title');
  assert(htmlObj.includes('Defeated Tech Titans by 2 runs'), 'ResultBanner rendered object detail');
  console.log('✓ ResultBanner completed & dismiss states passed');
} catch (e) {
  assert(false, 'ResultBanner threw: ' + e.message);
}

// 10. StatsFooter Stress (null runRate, undefined runRate, valid runRate & requiredRunRate)
try {
  // Test with null runRate and null requiredRunRate (regression check)
  const htmlNull = renderToString(
    React.createElement(StatsFooter, {
      runRate: null,
      requiredRunRate: null,
      overs: '0.0',
      extras: null,
      lastWicket: null,
    })
  );
  assert(htmlNull.includes('—'), 'StatsFooter with null runRate rendered dash without throwing');
  assert(htmlNull.includes('0.0'), 'StatsFooter rendered overs fallback');

  // Test with active stats
  const htmlActive = renderToString(
    React.createElement(StatsFooter, {
      runRate: 7.25,
      requiredRunRate: 8.5,
      overs: '14.2',
      extras: 6,
      lastWicket: 'K. Perera b Cummins 45 (32)',
    })
  );
  assert(htmlActive.includes('7.25'), 'StatsFooter rendered active run rate');
  assert(htmlActive.includes('8.50'), 'StatsFooter rendered required run rate');
  assert(htmlActive.includes('14.2'), 'StatsFooter rendered overs');
  assert(htmlActive.includes('6'), 'StatsFooter rendered extras');
  assert(htmlActive.includes('K. Perera'), 'StatsFooter rendered last wicket');
  console.log('✓ StatsFooter null guards & active stats passed');
} catch (e) {
  assert(false, 'StatsFooter threw: ' + e.message);
}

// 11. RecentBalls Null Resilience Stress
try {
  const htmlNullBalls = renderToString(
    React.createElement(RecentBalls, {
      recentBalls: null,
    })
  );
  assert(htmlNullBalls.includes('Waiting for first ball...'), 'RecentBalls with null recentBalls safely renders placeholder');
  console.log('✓ RecentBalls null resilience passed');
} catch (e) {
  assert(false, 'RecentBalls null resilience threw: ' + e.message);
}

// 12. ConnectionModal Stress
try {
  const htmlModal = renderToString(
    React.createElement(ConnectionModal, {
      isOpen: true,
      initialIp: '192.168.1.150',
      onConnect: () => {},
    })
  );
  assert(htmlModal.includes('Cricket Scoreboard'), 'ConnectionModal rendered title');
  assert(htmlModal.includes('192.168.1.150'), 'ConnectionModal rendered IP address');
  console.log('✓ ConnectionModal passed');
} catch (e) {
  assert(false, 'ConnectionModal threw: ' + e.message);
}

console.log(`\n--- ALL CHECKS COMPLETED: ${passed} assertions passed, ${failed} failed ---`);
if (failed > 0) process.exit(1);
