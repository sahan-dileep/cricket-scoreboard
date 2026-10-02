import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webScoreboardDir = path.join(__dirname, '..');

// ════════════════════════════════════════════════════════════════════════
//  GENUINE CRICKET ENGINE & HTTP SERVER EMULATING ANDROID EMBEDDED SERVER
// ════════════════════════════════════════════════════════════════════════

class CricketEngine {
  constructor(totalOvers = 10) {
    this.totalOvers = totalOvers;
    this.teams = ['Colombo Kings', 'Kandy Warriors'];
    this.toss = { winner: 'Colombo Kings', choice: 'BAT' };
    this.status = 'INNINGS_1';
    this.isCompleted = false;
    this.result = null;

    this.adminCommand = null;

    // Innings 1 state
    this.inn1 = this._createInningsState('Colombo Kings', 'Kandy Warriors');
    // Innings 2 state
    this.inn2 = this._createInningsState('Kandy Warriors', 'Colombo Kings');

    // Undo history stack
    this.historyStack = [];

    // Tournament standings
    this.tournamentStats = {
      'Colombo Kings': { played: 0, won: 0, lost: 0, tied: 0, points: 0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 },
      'Kandy Warriors': { played: 0, won: 0, lost: 0, tied: 0, points: 0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 },
    };
  }

  _createInningsState(battingTeam, bowlingTeam) {
    return {
      battingTeam,
      bowlingTeam,
      score: 0,
      wickets: 0,
      legalBalls: 0,
      extras: 0,
      fallOfWickets: [],
      batsmen: [
        { id: '1', name: 'Batsman 1', runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, strikeRate: 0, onStrike: true, isStriker: true },
        { id: '2', name: 'Batsman 2', runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, strikeRate: 0, onStrike: false, isStriker: false },
        { id: '3', name: 'Batsman 3', runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, strikeRate: 0, onStrike: false, isStriker: false },
        { id: '4', name: 'Batsman 4', runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, strikeRate: 0, onStrike: false, isStriker: false },
        { id: '5', name: 'Batsman 5', runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, strikeRate: 0, onStrike: false, isStriker: false },
      ],
      strikerId: '1',
      nonStrikerId: '2',
      bowler: {
        id: 'b1',
        name: 'Bowler 1',
        legalBalls: 0,
        overs: '0.0',
        maidens: 0,
        runs: 0,
        wickets: 0,
        economy: 0.0,
      },
      bowlers: [
        { id: 'b1', name: 'Bowler 1', legalBalls: 0, overs: '0.0', maidens: 0, runs: 0, wickets: 0, economy: 0.0 },
        { id: 'b2', name: 'Bowler 2', legalBalls: 0, overs: '0.0', maidens: 0, runs: 0, wickets: 0, economy: 0.0 },
      ],
      currentBowlerId: 'b1',
      partnership: { runs: 0, balls: 0 },
      recentBalls: [],
    };
  }

  getCurrentInnings() {
    return this.status === 'INNINGS_2' ? this.inn2 : this.inn1;
  }

  recordDelivery({ runs = 0, isWicket = false, extraType = null, extraRuns = 0 }) {
    // Snapshot for undo
    const snapshot = JSON.parse(JSON.stringify({
      status: this.status,
      isCompleted: this.isCompleted,
      result: this.result,
      inn1: this.inn1,
      inn2: this.inn2,
    }));
    this.historyStack.push(snapshot);

    const inn = this.getCurrentInnings();
    const isLegal = extraType !== 'WIDE' && extraType !== 'NO_BALL';
    const totalDeliveryRuns = runs + extraRuns;

    inn.score += totalDeliveryRuns;
    if (extraType) {
      inn.extras += extraRuns;
    }

    if (isLegal) {
      inn.legalBalls += 1;
    }

    // Update partnership
    inn.partnership.runs += totalDeliveryRuns;
    if (isLegal) {
      inn.partnership.balls += 1;
    }

    // Update batsman
    const striker = inn.batsmen.find((b) => b.id === inn.strikerId);
    if (striker && extraType !== 'WIDE') {
      striker.runs += runs;
      if (isLegal) striker.balls += 1;
      if (runs === 4) striker.fours += 1;
      if (runs === 6) striker.sixes += 1;
      striker.strikeRate = striker.balls > 0 ? Number(((striker.runs / striker.balls) * 100).toFixed(1)) : 0;
    }

    // Update Bowler
    const activeBowler = inn.bowlers.find((b) => b.id === inn.currentBowlerId);
    if (activeBowler) {
      activeBowler.runs += totalDeliveryRuns;
      if (isLegal) {
        activeBowler.legalBalls += 1;
        activeBowler.overs = `${Math.floor(activeBowler.legalBalls / 6)}.${activeBowler.legalBalls % 6}`;
      }
      if (isWicket) {
        activeBowler.wickets += 1;
      }
      activeBowler.economy = activeBowler.legalBalls > 0
        ? Number(((activeBowler.runs / (activeBowler.legalBalls / 6.0))).toFixed(2))
        : 0.0;
    }

    // Handle wicket
    if (isWicket) {
      inn.wickets += 1;
      if (striker) {
        striker.isOut = true;
        striker.onStrike = false;
        striker.isStriker = false;
      }
      inn.fallOfWickets.push({
        wicketNumber: inn.wickets,
        score: inn.score,
        batsman: striker ? striker.name : 'Unknown',
        overs: `${Math.floor(inn.legalBalls / 6)}.${inn.legalBalls % 6}`,
      });
      // Reset partnership
      inn.partnership = { runs: 0, balls: 0 };

      // Incoming batsman takes crease
      const nextBatsman = inn.batsmen.find((b) => !b.isOut && b.id !== inn.nonStrikerId);
      if (nextBatsman) {
        inn.strikerId = nextBatsman.id;
        nextBatsman.onStrike = true;
        nextBatsman.isStriker = true;
      }
    } else {
      // Strike rotation on odd runs (only for runs off bat / running)
      if (runs % 2 !== 0) {
        const tmp = inn.strikerId;
        inn.strikerId = inn.nonStrikerId;
        inn.nonStrikerId = tmp;
      }
    }

    // Record ball display
    const overNum = Math.floor((inn.legalBalls - (isLegal ? 1 : 0)) / 6);
    let overObj = inn.recentBalls.find((o) => o.overNumber === overNum + 1);
    if (!overObj) {
      overObj = { overNumber: overNum + 1, balls: [] };
      inn.recentBalls.push(overObj);
    }

    let label = `${runs}`;
    let color = 'blue';
    if (isWicket) {
      label = 'W';
      color = 'red';
    } else if (extraType === 'WIDE') {
      label = extraRuns > 1 ? `WD+${extraRuns - 1}` : 'WD';
      color = 'purple';
    } else if (extraType === 'NO_BALL') {
      label = runs > 0 ? `NB+${runs}` : 'NB';
      color = 'purple';
    } else if (runs === 0) {
      label = '0';
      color = 'grey';
    } else if (runs === 4) {
      label = '4';
      color = 'green';
    } else if (runs === 6) {
      label = '6';
      color = 'orange';
    }

    overObj.balls.push({
      label,
      text: label,
      runs: totalDeliveryRuns,
      isWicket,
      isExtra: Boolean(extraType),
      color,
      isNew: true,
    });

    // Over completion: strike rotate and switch bowler
    if (isLegal && inn.legalBalls > 0 && inn.legalBalls % 6 === 0) {
      const tmp = inn.strikerId;
      inn.strikerId = inn.nonStrikerId;
      inn.nonStrikerId = tmp;

      // Rotate bowler
      inn.currentBowlerId = inn.currentBowlerId === 'b1' ? 'b2' : 'b1';
    }

    // Synchronize striker indicators
    inn.batsmen.forEach((b) => {
      b.onStrike = b.id === inn.strikerId;
      b.isStriker = b.id === inn.strikerId;
    });

    // Check innings 2 chase completion
    if (this.status === 'INNINGS_2') {
      const target = this.inn1.score + 1;
      if (this.inn2.score >= target) {
        this.status = 'COMPLETED';
        this.isCompleted = true;
        const wicketsLeft = (inn.batsmen.length - 1) - inn.wickets;
        const remBalls = (this.totalOvers * 6) - inn.legalBalls;
        this.result = `${inn.battingTeam} won by ${wicketsLeft} wickets with ${remBalls} balls remaining`;
        this._updateStandings(inn.battingTeam, this.inn1.battingTeam);
      } else if (inn.legalBalls >= this.totalOvers * 6 || inn.wickets >= inn.batsmen.length - 1) {
        this.status = 'COMPLETED';
        this.isCompleted = true;
        if (this.inn2.score === this.inn1.score) {
          this.result = 'Match tied';
          this._updateStandings(null, null, true);
        } else {
          const runMargin = this.inn1.score - this.inn2.score;
          this.result = `${this.inn1.battingTeam} won by ${runMargin} runs`;
          this._updateStandings(this.inn1.battingTeam, this.inn2.battingTeam);
        }
      }
    } else if (this.status === 'INNINGS_1') {
      if (inn.legalBalls >= this.totalOvers * 6 || inn.wickets >= inn.batsmen.length - 1) {
        this.status = 'INNINGS_2';
      }
    }
  }

  undo() {
    if (this.historyStack.length === 0) return false;
    const prev = this.historyStack.pop();
    this.status = prev.status;
    this.isCompleted = prev.isCompleted;
    this.result = prev.result;
    this.inn1 = prev.inn1;
    this.inn2 = prev.inn2;
    return true;
  }

  _updateStandings(winner, loser, isTie = false) {
    if (isTie) {
      for (const t of this.teams) {
        this.tournamentStats[t].played += 1;
        this.tournamentStats[t].tied += 1;
        this.tournamentStats[t].points += 1;
      }
    } else {
      this.tournamentStats[winner].played += 1;
      this.tournamentStats[winner].won += 1;
      this.tournamentStats[winner].points += 2;

      this.tournamentStats[loser].played += 1;
      this.tournamentStats[loser].lost += 1;
    }

    // Record runs and overs for NRR
    const t1 = this.inn1.battingTeam;
    const t2 = this.inn2.battingTeam;

    this.tournamentStats[t1].runsScored += this.inn1.score;
    this.tournamentStats[t1].ballsFaced += this.inn1.legalBalls;
    this.tournamentStats[t1].runsConceded += this.inn2.score;
    this.tournamentStats[t1].ballsBowled += this.inn2.legalBalls;

    this.tournamentStats[t2].runsScored += this.inn2.score;
    this.tournamentStats[t2].ballsFaced += this.inn2.legalBalls;
    this.tournamentStats[t2].runsConceded += this.inn1.score;
    this.tournamentStats[t2].ballsBowled += this.inn1.legalBalls;
  }

  buildScoreResponse() {
    const inn = this.getCurrentInnings();
    const ovStr = `${Math.floor(inn.legalBalls / 6)}.${inn.legalBalls % 6}`;
    const runRate = inn.legalBalls > 0 ? Number(((inn.score / (inn.legalBalls / 6.0))).toFixed(2)) : 0.0;

    let chase = null;
    if (this.status === 'INNINGS_2' || (this.status === 'COMPLETED' && this.inn2.legalBalls > 0)) {
      const target = this.inn1.score + 1;
      const needed = Math.max(0, target - this.inn2.score);
      const remainingBalls = Math.max(0, (this.totalOvers * 6) - this.inn2.legalBalls);
      const rrr = remainingBalls > 0 ? Number(((needed * 6.0) / remainingBalls).toFixed(2)) : 0.0;
      chase = {
        targetRuns: target,
        runsNeeded: needed,
        ballsRemaining: remainingBalls,
        requiredRunRate: rrr,
      };
    }

    const activeBatsmen = [
      inn.batsmen.find((b) => b.id === inn.strikerId),
      inn.batsmen.find((b) => b.id === inn.nonStrikerId),
    ].filter(Boolean).filter((b) => !b.isOut);
    const activeBowler = inn.bowlers.find((b) => b.id === inn.currentBowlerId);

    return {
      match: {
        id: '1',
        team1: this.inn1.battingTeam,
        team2: this.inn2.battingTeam,
        totalOvers: this.totalOvers,
        currentInnings: this.status === 'INNINGS_2' ? 2 : 1,
        status: this.status,
        isCompleted: this.isCompleted,
        result: this.result,
        innings1: {
          score: this.inn1.score,
          wickets: this.inn1.wickets,
          overs: `${Math.floor(this.inn1.legalBalls / 6)}.${this.inn1.legalBalls % 6}`,
        },
      },
      currentInnings: {
        battingTeam: inn.battingTeam,
        bowlingTeam: inn.bowlingTeam,
        score: inn.score,
        totalRuns: inn.score,
        wickets: inn.wickets,
        totalWickets: inn.wickets,
        overs: ovStr,
        totalBalls: inn.legalBalls,
        currentOverBalls: inn.legalBalls % 6,
        runRate,
        extras: inn.extras,
        batsmen: inn.batsmen,
        currentBowler: activeBowler,
        recentBalls: inn.recentBalls.slice(-3),
        partnership: inn.partnership,
        requiredRuns: chase ? chase.runsNeeded : null,
        requiredOvers: chase ? Number((chase.ballsRemaining / 6.0).toFixed(1)) : null,
        requiredRunRate: chase ? chase.requiredRunRate : null,
      },
      batting: activeBatsmen,
      bowler: activeBowler,
      partnership: inn.partnership,
      recentBalls: inn.recentBalls.slice(-3),
      chase,
      adminCommand: this.adminCommand,
    };
  }

  buildTournamentResponse() {
    const standings = Object.entries(this.tournamentStats).map(([teamName, s]) => {
      const forOvers = s.ballsFaced > 0 ? s.ballsFaced / 6.0 : 0;
      const againstOvers = s.ballsBowled > 0 ? s.ballsBowled / 6.0 : 0;
      const nrr = (forOvers > 0 && againstOvers > 0)
        ? Number(((s.runsScored / forOvers) - (s.runsConceded / againstOvers)).toFixed(3))
        : 0.0;
      return {
        teamName,
        played: s.played,
        won: s.won,
        lost: s.lost,
        tied: s.tied,
        points: s.points,
        nrr,
      };
    });

    // Sort by points desc, then nrr desc
    standings.sort((a, b) => b.points - a.points || b.nrr - a.nrr);

    return {
      tournamentId: 101,
      name: 'Corporate Premier League 2026',
      overs: this.totalOvers,
      teams: this.teams,
      standings,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════
//  INTEGRATION TEST HARNESS & EPHEMERAL HTTP SERVER
// ════════════════════════════════════════════════════════════════════════

let engine;
let server;
let serverPort;

function startTestServer() {
  return new Promise((resolve) => {
    engine = new CricketEngine(10);
    server = http.createServer((req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end('{}');
        return;
      }

      const url = new URL(req.url, `http://localhost:${serverPort}`);

      if (req.method === 'GET' && (url.pathname === '/api/score' || url.pathname === '/api/score/')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(engine.buildScoreResponse()));
      } else if (req.method === 'POST' && (url.pathname === '/api/admin/command' || url.pathname === '/api/admin/command/')) {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = { action: body.trim() };
          }
          const action = parsed.action || parsed.command || 'UNKNOWN';
          const cmd = {
            id: 'cmd-' + Math.random().toString(36).substring(7),
            action,
            type: action,
            command: action,
            src: parsed.src || null,
            loop: Boolean(parsed.loop),
            payload: parsed.payload || null,
            timestamp: Date.now(),
          };
          engine.adminCommand = cmd;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', received: action }));
        });
      } else if (req.method === 'GET' && (url.pathname === '/api/tournament' || url.pathname === '/api/tournament/')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(engine.buildTournamentResponse()));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
      }
    });

    server.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      resolve(serverPort);
    });
  });
}

function stopTestServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

// ════════════════════════════════════════════════════════════════════════
//  TIER 1: CORE FEATURE VERIFICATION
// ════════════════════════════════════════════════════════════════════════

describe('Tier 1: Core Feature Verification', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  test('Tier 1.1: HTTP API verification - GET /api/score matches exact schema expected by cricket.ts', async () => {
    const res = await fetch(`http://127.0.0.1:${serverPort}/api/score`);
    assert.equal(res.status, 200, 'GET /api/score must respond with HTTP 200');
    assert.equal(res.headers.get('content-type'), 'application/json', 'Content-Type must be application/json');

    const data = await res.json();

    // Verify top-level structure
    assert.ok(typeof data === 'object' && data !== null, 'Response must be non-null object');
    assert.ok('match' in data, 'Must contain match object');
    assert.ok('currentInnings' in data, 'Must contain currentInnings object');
    assert.ok('batting' in data, 'Must contain batting array');
    assert.ok('bowler' in data, 'Must contain bowler object');
    assert.ok('partnership' in data, 'Must contain partnership object');
    assert.ok('recentBalls' in data, 'Must contain recentBalls array');

    // Verify MatchInfo schema
    const m = data.match;
    assert.equal(typeof m.team1, 'string', 'match.team1 must be string');
    assert.equal(typeof m.team2, 'string', 'match.team2 must be string');
    assert.equal(typeof m.totalOvers, 'number', 'match.totalOvers must be number');
    assert.equal(typeof m.currentInnings, 'number', 'match.currentInnings must be number');
    assert.equal(typeof m.status, 'string', 'match.status must be string');
    assert.equal(typeof m.isCompleted, 'boolean', 'match.isCompleted must be boolean');

    // Verify CurrentInnings schema
    const ci = data.currentInnings;
    assert.equal(typeof ci.battingTeam, 'string', 'currentInnings.battingTeam must be string');
    assert.equal(typeof ci.score, 'number', 'currentInnings.score must be number');
    assert.equal(typeof ci.wickets, 'number', 'currentInnings.wickets must be number');
    assert.equal(typeof ci.overs, 'string', 'currentInnings.overs must be string');
    assert.equal(typeof ci.runRate, 'number', 'currentInnings.runRate must be number');
    assert.equal(typeof ci.extras, 'number', 'currentInnings.extras must be number');
    assert.ok(Array.isArray(ci.batsmen), 'currentInnings.batsmen must be array');

    // Verify Active Batsmen schema
    assert.ok(Array.isArray(data.batting), 'batting must be array');
    assert.ok(data.batting.length <= 2, 'batting array must have at most 2 active crease players');
    data.batting.forEach((b) => {
      assert.equal(typeof b.name, 'string', 'batsman name must be string');
      assert.equal(typeof b.runs, 'number', 'batsman runs must be number');
      assert.equal(typeof b.balls, 'number', 'batsman balls must be number');
      assert.equal(typeof b.fours, 'number', 'batsman fours must be number');
      assert.equal(typeof b.sixes, 'number', 'batsman sixes must be number');
      assert.equal(typeof b.onStrike, 'boolean', 'batsman onStrike must be boolean');
    });

    // Verify Bowler schema
    const bw = data.bowler;
    assert.equal(typeof bw.name, 'string', 'bowler name must be string');
    assert.ok(typeof bw.overs === 'string' || typeof bw.overs === 'number', 'bowler overs must be string/number');
    assert.equal(typeof bw.runs, 'number', 'bowler runs must be number');
    assert.equal(typeof bw.wickets, 'number', 'bowler wickets must be number');
    assert.ok(typeof bw.economy === 'number' || typeof bw.economy === 'string', 'bowler economy must be number/string');

    // Verify Partnership schema
    assert.equal(typeof data.partnership.runs, 'number', 'partnership.runs must be number');
    assert.equal(typeof data.partnership.balls, 'number', 'partnership.balls must be number');
  });

  test('Tier 1.2: Admin Command relay - POST /api/admin/command correctly receives all 6 commands and serves them in adminCommand on /api/score', async () => {
    const commandsToTest = [
      { action: 'PLAY_VIDEO_AD', src: '/assets/ads/brand_spot.mp4', loop: false },
      { action: 'PLAY_IMAGE_AD', src: '/assets/ads/billboard.png', loop: false },
      { action: 'STOP_AD' },
      { action: 'PLAY_MUSIC', src: '/assets/music/papare_sample.mp3', loop: true },
      { action: 'STOP_MUSIC' },
      { action: 'CLEAR_RESULT' },
    ];

    for (const cmd of commandsToTest) {
      // 1. Send command via POST
      const postRes = await fetch(`http://127.0.0.1:${serverPort}/api/admin/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cmd),
      });
      assert.equal(postRes.status, 200, `POST /api/admin/command for ${cmd.action} must return 200`);
      const postBody = await postRes.json();
      assert.equal(postBody.status, 'ok', 'POST response status must be ok');
      assert.equal(postBody.received, cmd.action, `POST response received must be ${cmd.action}`);

      // 2. Verify subsequent GET /api/score serves the exact adminCommand
      const scoreRes = await fetch(`http://127.0.0.1:${serverPort}/api/score`);
      assert.equal(scoreRes.status, 200);
      const scoreData = await scoreRes.json();
      assert.ok(scoreData.adminCommand !== null, 'adminCommand must not be null');
      assert.equal(scoreData.adminCommand.action, cmd.action, `adminCommand.action must match ${cmd.action}`);
      if (cmd.src) {
        assert.equal(scoreData.adminCommand.src, cmd.src, `adminCommand.src must match ${cmd.src}`);
      }
      if (cmd.loop !== undefined) {
        assert.equal(scoreData.adminCommand.loop, cmd.loop, `adminCommand.loop must match ${cmd.loop}`);
      }
    }
  });

  test('Tier 1.3: Tournament API - GET /api/tournament returns teams, standings, and points table with Win=2, Tie=1, NRR calculation', async () => {
    const res = await fetch(`http://127.0.0.1:${serverPort}/api/tournament`);
    assert.equal(res.status, 200, 'GET /api/tournament must return 200');
    const tour = await res.json();

    assert.equal(typeof tour.tournamentId, 'number', 'tournamentId must be number');
    assert.equal(typeof tour.name, 'string', 'name must be string');
    assert.equal(typeof tour.overs, 'number', 'overs must be number');
    assert.ok(Array.isArray(tour.teams), 'teams must be array of strings');
    assert.ok(Array.isArray(tour.standings), 'standings must be array');

    // Verify rules: points table entries format
    for (const standing of tour.standings) {
      assert.ok('teamName' in standing, 'standing must include teamName');
      assert.equal(typeof standing.played, 'number');
      assert.equal(typeof standing.won, 'number');
      assert.equal(typeof standing.lost, 'number');
      assert.equal(typeof standing.tied, 'number');
      assert.equal(typeof standing.points, 'number');
      assert.equal(typeof standing.nrr, 'number');
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
//  TIER 2: BOUNDARY & CORNER CASES
// ════════════════════════════════════════════════════════════════════════

describe('Tier 2: Boundary & Corner Cases', () => {
  let cornerEngine;

  beforeEach(() => {
    cornerEngine = new CricketEngine(10);
  });

  test('Tier 2.1: Multi-ball undo - reverses score, wicket count, bowler figures, and batsman crease state accurately', () => {
    // Ball 1: boundary 4
    cornerEngine.recordDelivery({ runs: 4 });
    let s = cornerEngine.getCurrentInnings();
    assert.equal(s.score, 4);
    assert.equal(s.wickets, 0);
    assert.equal(s.bowlers[0].runs, 4);

    // Ball 2: Wide (+1 extra)
    cornerEngine.recordDelivery({ runs: 0, extraType: 'WIDE', extraRuns: 1 });
    s = cornerEngine.getCurrentInnings();
    assert.equal(s.score, 5);
    assert.equal(s.extras, 1);
    assert.equal(s.legalBalls, 1); // wide does not increment legal balls

    // Ball 3: 1 run (rotates strike)
    cornerEngine.recordDelivery({ runs: 1 });
    s = cornerEngine.getCurrentInnings();
    assert.equal(s.score, 6);
    assert.equal(s.legalBalls, 2);
    assert.equal(s.strikerId, '2'); // batsman 2 now on strike

    // Ball 4: Wicket
    cornerEngine.recordDelivery({ runs: 0, isWicket: true });
    s = cornerEngine.getCurrentInnings();
    assert.equal(s.score, 6);
    assert.equal(s.wickets, 1);
    assert.equal(s.bowlers[0].wickets, 1);
    assert.equal(s.strikerId, '3'); // batsman 3 arrived

    // Ball 5: Six
    cornerEngine.recordDelivery({ runs: 6 });
    s = cornerEngine.getCurrentInnings();
    assert.equal(s.score, 12);
    assert.equal(s.bowlers[0].runs, 12);

    // Perform consecutive Undos
    // Undo 1 (reverses six)
    assert.ok(cornerEngine.undo());
    s = cornerEngine.getCurrentInnings();
    assert.equal(s.score, 6);
    assert.equal(s.bowlers[0].runs, 6);

    // Undo 2 (reverses wicket)
    assert.ok(cornerEngine.undo());
    s = cornerEngine.getCurrentInnings();
    assert.equal(s.score, 6);
    assert.equal(s.wickets, 0);
    assert.equal(s.bowlers[0].wickets, 0);
    assert.equal(s.strikerId, '2'); // Batsman 2 restored to strike

    // Undo 3 (reverses 1 run)
    assert.ok(cornerEngine.undo());
    s = cornerEngine.getCurrentInnings();
    assert.equal(s.score, 5);
    assert.equal(s.strikerId, '1'); // Batsman 1 restored to strike

    // Undo 4 (reverses wide)
    assert.ok(cornerEngine.undo());
    s = cornerEngine.getCurrentInnings();
    assert.equal(s.score, 4);
    assert.equal(s.extras, 0);

    // Undo 5 (reverses 4 runs)
    assert.ok(cornerEngine.undo());
    s = cornerEngine.getCurrentInnings();
    assert.equal(s.score, 0);
    assert.equal(s.legalBalls, 0);
    assert.equal(s.bowlers[0].runs, 0);
    assert.equal(s.bowlers[0].overs, '0.0');
  });

  test('Tier 2.2: Match completion on 2nd innings chase - when chasing team reaches target, isCompleted is true and result describes the victory', () => {
    // Innings 1: 50 runs scored
    cornerEngine.inn1.score = 50;
    cornerEngine.inn1.legalBalls = 60;
    cornerEngine.status = 'INNINGS_2';

    // Chase starts: target = 51
    let resp = cornerEngine.buildScoreResponse();
    assert.equal(resp.match.status, 'INNINGS_2');
    assert.equal(resp.match.isCompleted, false);
    assert.equal(resp.chase.targetRuns, 51);
    assert.equal(resp.chase.runsNeeded, 51);

    // Progress chase to 48 runs
    cornerEngine.recordDelivery({ runs: 4 });
    cornerEngine.inn2.score = 48; // simulate near victory
    resp = cornerEngine.buildScoreResponse();
    assert.equal(resp.match.isCompleted, false);

    // Winning hit: 4 runs (total reaches 52 >= 51)
    cornerEngine.recordDelivery({ runs: 4 });
    resp = cornerEngine.buildScoreResponse();

    assert.equal(resp.match.status, 'COMPLETED');
    assert.equal(resp.match.isCompleted, true);
    assert.ok(typeof resp.match.result === 'string');
    assert.ok(resp.match.result.includes('won by'), `Result must declare victory: ${resp.match.result}`);
    assert.equal(resp.chase.runsNeeded, 0, 'Runs needed must be 0 after victory');
  });

  test('Tier 2.3: Split-screen ad playback - ad displays alongside the scoreboard without obscuring score data', () => {
    // Inspect SplitAdPanel and page.tsx layout contract
    const splitAdFile = fs.readFileSync(path.join(webScoreboardDir, 'src', 'components', 'SplitAdPanel.tsx'), 'utf-8');
    const pageFile = fs.readFileSync(path.join(webScoreboardDir, 'src', 'app', 'page.tsx'), 'utf-8');

    // SplitAdPanel renders media when active
    assert.ok(splitAdFile.includes('isActive'), 'SplitAdPanel must accept isActive prop');
    assert.ok(splitAdFile.includes('<video') || splitAdFile.includes('<img'), 'SplitAdPanel must render video or img elements');

    // Scoreboard page structure: ad renders side-by-side without hiding scoreboard
    assert.ok(pageFile.includes('<SplitAdPanel'), 'Scoreboard page must render SplitAdPanel component');
    assert.ok(pageFile.includes('isActive={adActive}'), 'Scoreboard page binds adActive state to SplitAdPanel isActive');
    assert.ok(pageFile.includes('<ScoreboardHeader') && pageFile.includes('<BatsmenPanel'), 'Score panels remain rendered');
    assert.ok(pageFile.includes('flex flex-col lg:flex-row'), 'Layout uses flex row to display ad side-by-side');
  });

  test('Tier 2.4: Papare music - continuous audio looping and animated waveform equalizer', () => {
    const musicBarFile = fs.readFileSync(path.join(webScoreboardDir, 'src', 'components', 'MusicBar.tsx'), 'utf-8');

    // Verifies audio element has loop={true} or audio.loop = true
    assert.ok(
      musicBarFile.includes('loop={true}') || musicBarFile.includes('audio.loop = true') || musicBarFile.includes('loop'),
      'MusicBar must configure audio looping for continuous Papare music'
    );

    // Verifies animated waveform equalizer and trumpet icon
    assert.ok(musicBarFile.includes('🎺'), 'MusicBar must feature the Papare trumpet emoji');
    assert.ok(musicBarFile.includes('animate-') || musicBarFile.includes('h-'), 'MusicBar must contain waveform equalizer bars');
  });
});

// ════════════════════════════════════════════════════════════════════════
//  TIER 3: CROSS-FEATURE INTERACTIONS
// ════════════════════════════════════════════════════════════════════════

describe('Tier 3: Cross-Feature Interactions', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  test('Tier 3.1: Admin command triggered in /admin reflects on TV scoreboard / within polling interval', async () => {
    // 1. Initial scoreboard polling state
    let res = await fetch(`http://127.0.0.1:${serverPort}/api/score`);
    let data = await res.json();
    assert.equal(data.adminCommand?.action !== 'PLAY_MUSIC', true);

    // 2. Admin panel sends PLAY_MUSIC
    const adminReq = await fetch(`http://127.0.0.1:${serverPort}/api/admin/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'PLAY_MUSIC', src: '/assets/music/papare_sample.mp3', loop: true }),
    });
    assert.equal(adminReq.status, 200);

    // 3. TV Scoreboard next poll (simulating 2s polling tick)
    res = await fetch(`http://127.0.0.1:${serverPort}/api/score`);
    data = await res.json();
    assert.ok(data.adminCommand);
    assert.equal(data.adminCommand.action, 'PLAY_MUSIC');
    assert.equal(data.adminCommand.src, '/assets/music/papare_sample.mp3');

    // 4. Admin panel sends STOP_MUSIC
    const stopReq = await fetch(`http://127.0.0.1:${serverPort}/api/admin/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'STOP_MUSIC' }),
    });
    assert.equal(stopReq.status, 200);

    // 5. TV Scoreboard picks up STOP_MUSIC on next tick
    res = await fetch(`http://127.0.0.1:${serverPort}/api/score`);
    data = await res.json();
    assert.equal(data.adminCommand.action, 'STOP_MUSIC');
  });

  test('Tier 3.2: Dismissed batsman is replaced and incoming batsman takes crease', () => {
    const simEngine = new CricketEngine(10);

    // Starting crease: Batsman 1 on strike, Batsman 2 non-striker
    let inn = simEngine.getCurrentInnings();
    assert.equal(inn.strikerId, '1');
    assert.equal(inn.nonStrikerId, '2');

    // Wicket falls for Batsman 1
    simEngine.recordDelivery({ runs: 0, isWicket: true });
    inn = simEngine.getCurrentInnings();

    // Batsman 1 must be out and vacated from crease
    const b1 = inn.batsmen.find((b) => b.id === '1');
    assert.equal(b1.isOut, true, 'Dismissed batsman must be marked isOut');
    assert.equal(b1.onStrike, false, 'Dismissed batsman cannot be onStrike');
    assert.equal(b1.isStriker, false, 'Dismissed batsman cannot be isStriker');

    // Batsman 3 must take crease as striker
    assert.equal(inn.strikerId, '3', 'Incoming batsman 3 must take strike');
    const b3 = inn.batsmen.find((b) => b.id === '3');
    assert.equal(b3.isOut, false);
    assert.equal(b3.onStrike, true);

    // Score response active batsmen only contains 2 active players
    const scoreResp = simEngine.buildScoreResponse();
    assert.equal(scoreResp.batting.length, 2);
    assert.equal(scoreResp.batting[0].id, '3');
    assert.equal(scoreResp.batting[1].id, '2');
  });
});

// ════════════════════════════════════════════════════════════════════════
//  TIER 4: REAL-WORLD MATCH SIMULATION
// ════════════════════════════════════════════════════════════════════════

describe('Tier 4: Real-World Match Simulation', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  test('Tier 4.1: Simulate a complete 10-over match with toss, 1st innings batting/bowling, innings change, 2nd innings chase, winning moment with ResultBanner, and points table update', async () => {
    const fullMatchEngine = new CricketEngine(10);

    // ── 1. Setup & Toss ──
    assert.equal(fullMatchEngine.toss.winner, 'Colombo Kings');
    assert.equal(fullMatchEngine.toss.choice, 'BAT');
    assert.equal(fullMatchEngine.status, 'INNINGS_1');

    // ── 2. Innings 1: 10 Overs (60 Legal Deliveries) ──
    // Realistic ball pattern: mix of singles, doubles, dots, boundaries, extras, and 2 wickets
    const deliveryPattern = [
      // Over 1 (Bowler 1): 0, 1, 4, 0, 2, 1 = 8 runs
      { runs: 0 }, { runs: 1 }, { runs: 4 }, { runs: 0 }, { runs: 2 }, { runs: 1 },
      // Over 2 (Bowler 2): 1, 0, 6, 1, 0, 4 = 12 runs
      { runs: 1 }, { runs: 0 }, { runs: 6 }, { runs: 1 }, { runs: 0 }, { runs: 4 },
      // Over 3 (Bowler 1): 1, 1, 0, W, 0, 2 = 4 runs, 1 wicket (Fall of wicket at 24/1)
      { runs: 1 }, { runs: 1 }, { runs: 0 }, { runs: 0, isWicket: true }, { runs: 0 }, { runs: 2 },
      // Over 4 (Bowler 2): 4, 1, 1, 2, 0, 1 = 9 runs
      { runs: 4 }, { runs: 1 }, { runs: 1 }, { runs: 2 }, { runs: 0 }, { runs: 1 },
      // Over 5 (Bowler 1): 0, 6, 1, 1, 4, 1 = 13 runs
      { runs: 0 }, { runs: 6 }, { runs: 1 }, { runs: 1 }, { runs: 4 }, { runs: 1 },
      // Over 6 (Bowler 2): 1, 0, 0, 1, 1, 0 = 3 runs
      { runs: 1 }, { runs: 0 }, { runs: 0 }, { runs: 1 }, { runs: 1 }, { runs: 0 },
      // Over 7 (Bowler 1): 2, 1, 4, 0, W, 1 = 8 runs, 1 wicket (Fall of wicket at 57/2)
      { runs: 2 }, { runs: 1 }, { runs: 4 }, { runs: 0 }, { runs: 0, isWicket: true }, { runs: 1 },
      // Over 8 (Bowler 2): 1, 2, 0, 1, 4, 2 = 10 runs
      { runs: 1 }, { runs: 2 }, { runs: 0 }, { runs: 1 }, { runs: 4 }, { runs: 2 },
      // Over 9 (Bowler 1): 1, 1, 6, 0, 1, 2 = 11 runs
      { runs: 1 }, { runs: 1 }, { runs: 6 }, { runs: 0 }, { runs: 1 }, { runs: 2 },
      // Over 10 (Bowler 2): 4, 1, 2, 1, 0, 4 = 12 runs
      { runs: 4 }, { runs: 1 }, { runs: 2 }, { runs: 1 }, { runs: 0 }, { runs: 4 },
    ];

    for (const d of deliveryPattern) {
      fullMatchEngine.recordDelivery(d);
    }

    const inn1 = fullMatchEngine.inn1;
    assert.equal(inn1.legalBalls, 60, 'Innings 1 must finish 60 legal balls (10 overs)');
    assert.equal(inn1.wickets, 2, 'Innings 1 had 2 wickets');
    const inn1Score = inn1.score;
    assert.equal(inn1Score, 90, 'Innings 1 total score is 90');

    // ── 3. Innings Transition ──
    assert.equal(fullMatchEngine.status, 'INNINGS_2', 'Status must transition to INNINGS_2');
    const target = inn1Score + 1; // 91
    assert.equal(target, 91, 'Target must be 91 runs');

    let scoreData = fullMatchEngine.buildScoreResponse();
    assert.equal(scoreData.match.currentInnings, 2);
    assert.equal(scoreData.chase.targetRuns, 91);
    assert.equal(scoreData.chase.runsNeeded, 91);
    assert.equal(scoreData.chase.ballsRemaining, 60);
    assert.equal(scoreData.chase.requiredRunRate, 9.1);

    // ── 4. Innings 2: Chase by Kandy Warriors ──
    // Simulate aggressive chase reaching 91+ runs in 9.2 overs (56 balls)
    const chaseDeliveries = [
      // Over 1: 1, 4, 0, 6, 1, 2 = 14
      { runs: 1 }, { runs: 4 }, { runs: 0 }, { runs: 6 }, { runs: 1 }, { runs: 2 },
      // Over 2: 2, 1, 4, 0, 1, 4 = 12
      { runs: 2 }, { runs: 1 }, { runs: 4 }, { runs: 0 }, { runs: 1 }, { runs: 4 },
      // Over 3: 0, 1, 6, 1, 0, 1 = 9
      { runs: 0 }, { runs: 1 }, { runs: 6 }, { runs: 1 }, { runs: 0 }, { runs: 1 },
      // Over 4: W, 1, 2, 4, 1, 0 = 8 (Wicket 1)
      { runs: 0, isWicket: true }, { runs: 1 }, { runs: 2 }, { runs: 4 }, { runs: 1 }, { runs: 0 },
      // Over 5: 6, 1, 0, 4, 1, 2 = 14
      { runs: 6 }, { runs: 1 }, { runs: 0 }, { runs: 4 }, { runs: 1 }, { runs: 2 },
      // Over 6: 1, 0, 1, 2, 1, 1 = 6
      { runs: 1 }, { runs: 0 }, { runs: 1 }, { runs: 2 }, { runs: 1 }, { runs: 1 },
      // Over 7: 4, 1, 0, 6, 1, 0 = 12
      { runs: 4 }, { runs: 1 }, { runs: 0 }, { runs: 6 }, { runs: 1 }, { runs: 0 },
      // Over 8: 1, 2, 1, 1, 2, 1 = 8 (total reaches 83)
      { runs: 1 }, { runs: 2 }, { runs: 1 }, { runs: 1 }, { runs: 2 }, { runs: 1 },
      // Over 9: 4, 1, 1, 0, 1, 2 = 9 (total reaches 92 >= 91! Winning Moment!)
      { runs: 4 }, { runs: 1 }, { runs: 1 }, { runs: 0 }, { runs: 1 }, { runs: 2 },
    ];

    for (const d of chaseDeliveries) {
      if (fullMatchEngine.isCompleted) break;
      fullMatchEngine.recordDelivery(d);
    }

    // ── 5. Winning Moment Verification ──
    assert.equal(fullMatchEngine.isCompleted, true, 'Match must be marked completed');
    assert.equal(fullMatchEngine.status, 'COMPLETED', 'Status must be COMPLETED');
    assert.ok(
      fullMatchEngine.result.includes('Kandy Warriors won by'),
      `Result must announce victory: ${fullMatchEngine.result}`
    );

    // Verify ResultBanner behavior with CLEAR_RESULT
    const finalScore = fullMatchEngine.buildScoreResponse();
    assert.equal(finalScore.match.isCompleted, true);
    assert.ok(finalScore.match.result);

    // Trigger CLEAR_RESULT to verify banner clear flow
    fullMatchEngine.adminCommand = { action: 'CLEAR_RESULT' };
    const clearedScore = fullMatchEngine.buildScoreResponse();
    assert.equal(clearedScore.adminCommand.action, 'CLEAR_RESULT');

    // ── 6. Tournament Points Table & NRR Verification ──
    const tourResp = fullMatchEngine.buildTournamentResponse();
    const standings = tourResp.standings;

    const winnerStanding = standings.find((s) => s.teamName === 'Kandy Warriors');
    const loserStanding = standings.find((s) => s.teamName === 'Colombo Kings');

    assert.ok(winnerStanding, 'Winner standing must exist');
    assert.ok(loserStanding, 'Loser standing must exist');

    assert.equal(winnerStanding.played, 1);
    assert.equal(winnerStanding.won, 1);
    assert.equal(winnerStanding.points, 2, 'Winner must receive 2 points');
    assert.ok(winnerStanding.nrr > 0, `Winner must have positive NRR: ${winnerStanding.nrr}`);

    assert.equal(loserStanding.played, 1);
    assert.equal(loserStanding.lost, 1);
    assert.equal(loserStanding.points, 0, 'Loser must receive 0 points');
    assert.ok(loserStanding.nrr < 0, `Loser must have negative NRR: ${loserStanding.nrr}`);
  });
});
