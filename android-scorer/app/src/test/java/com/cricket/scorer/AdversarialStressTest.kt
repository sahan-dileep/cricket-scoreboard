package com.cricket.scorer

import com.cricket.scorer.data.db.*
import com.cricket.scorer.data.model.*
import com.cricket.scorer.data.repository.CricketRepository
import com.cricket.scorer.server.CricketHttpServer
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.net.HttpURLConnection
import java.net.URL

/**
 * Adversarial and empirical stress test suite covering:
 * 1. Edge-case cricket scenarios (all-out before quota, mid-over target chase, last ball chase, tie, maidens, hat-tricks)
 * 2. Extreme undo scenarios (over boundaries, match-ending winning ball, fall of wickets & batsman restoration)
 * 3. NRR boundary testing (zero overs, all-out team full quota rule, negative NRR sorting, tie match)
 * 4. Embedded HTTP server stress test (concurrent hits, CORS preflights, admin command caching & reflection)
 * 5. Documented bug reproductions (active batsman dismissal state bug, undo single ball innings 2 revert bug)
 */
class AdversarialStressTest {

    private lateinit var repository: CricketRepository
    private lateinit var fakeTournamentDao: FakeTournamentDao
    private lateinit var fakeTeamDao: FakeTeamDao
    private lateinit var fakePlayerDao: FakePlayerDao
    private lateinit var fakeMatchDao: FakeMatchDao
    private lateinit var fakeBallDao: FakeBallEventDao

    private val gson: Gson = GsonBuilder().create()
    private var httpServer: CricketHttpServer? = null
    private val testPort = 18080

    @Before
    fun setUp() {
        fakeTournamentDao = FakeTournamentDao()
        fakeTeamDao = FakeTeamDao()
        fakePlayerDao = FakePlayerDao()
        fakeMatchDao = FakeMatchDao()
        fakeBallDao = FakeBallEventDao()

        repository = CricketRepository(
            tournamentDao = fakeTournamentDao,
            teamDao = fakeTeamDao,
            playerDao = fakePlayerDao,
            matchDao = fakeMatchDao,
            ballDao = fakeBallDao
        )
    }

    @After
    fun tearDown() {
        httpServer?.stop()
        httpServer = null
    }

    // ════════════════════════════════════════════════════════════════
    //  1. Edge-Case Cricket Scenarios
    // ════════════════════════════════════════════════════════════════

    @Test
    fun testAllOutBeforeQuotaInnings1TransitionsToInnings2() = runBlocking {
        val tId = repository.createTournament("AllOut Cup", overs = 10, playersPerSide = 11)
        val team1Id = repository.addTeam(tId, "Lions")
        val team2Id = repository.addTeam(tId, "Tigers")
        val batsmanIds = (1..11).map { repository.addPlayer(team1Id, "Lion Bat $it", it) }
        val bowlerId = repository.addPlayer(team2Id, "Tiger Bowler 1", 1)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)

        for (i in 0 until 10) {
            val strikerId = batsmanIds[i]
            val nonStrikerId = batsmanIds[i + 1]
            repository.addBall(
                BallEvent(
                    matchId = mId,
                    innings = 1,
                    overNumber = i / 6,
                    ballNumber = i % 6,
                    runs = 1,
                    isWicket = true,
                    wicketType = WicketType.BOWLED,
                    batsmanId = strikerId,
                    bowlerId = bowlerId,
                    nonStrikerId = nonStrikerId
                )
            )
        }

        val match = repository.getMatch(mId)!!
        assertEquals("Match should transition to INNINGS_2 upon 10th wicket dismissal", MatchStatus.INNINGS_2, match.status)

        val state = repository.getMatchState(mId)!!
        val inn1 = state.innings1!!
        assertEquals(10, inn1.wickets)
        assertEquals(10, inn1.score)
        assertEquals(10, inn1.legalBalls)
        assertEquals("1.4", inn1.oversString)
        assertEquals(10, inn1.fallOfWickets.size)
    }

    @Test
    fun testAllOutInnings2FinishesMatchWithWinByRuns() = runBlocking {
        val tId = repository.createTournament("Innings2AllOut Cup", overs = 10, playersPerSide = 11)
        val team1Id = repository.addTeam(tId, "Eagles")
        val team2Id = repository.addTeam(tId, "Hawks")
        val b1 = repository.addPlayer(team1Id, "E1", 1)
        val b2 = repository.addPlayer(team1Id, "E2", 2)
        val hBatsmen = (1..11).map { repository.addPlayer(team2Id, "H$it", it) }

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)

        for (i in 0 until 60) {
            repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = i / 6, ballNumber = i % 6, runs = if (i < 25) 2 else 0, batsmanId = b1, bowlerId = hBatsmen[0], nonStrikerId = b2))
        }

        val matchInnings2 = repository.getMatch(mId)!!
        assertEquals(MatchStatus.INNINGS_2, matchInnings2.status)

        for (i in 0 until 10) {
            val strikerId = hBatsmen[i]
            val nonStrikerId = hBatsmen[i + 1]
            val r = if (i < 5) 6 else 0
            repository.addBall(
                BallEvent(
                    matchId = mId,
                    innings = 2,
                    overNumber = i / 6,
                    ballNumber = i % 6,
                    runs = r,
                    isWicket = true,
                    wicketType = WicketType.CAUGHT,
                    batsmanId = strikerId,
                    bowlerId = b1,
                    nonStrikerId = nonStrikerId
                )
            )
        }

        val completedMatch = repository.getMatch(mId)!!
        assertEquals("Match must complete when chasing team is bowled out", MatchStatus.COMPLETED, completedMatch.status)
        assertNotNull(completedMatch.result)
        assertEquals("Eagles won by 20 runs", completedMatch.result)
    }

    @Test
    fun testTargetChaseReachedMidOverEndsMatchImmediately() = runBlocking {
        val tId = repository.createTournament("MidOverChase Cup", overs = 5, playersPerSide = 6)
        val team1Id = repository.addTeam(tId, "Warriors")
        val team2Id = repository.addTeam(tId, "Knights")
        val w1 = repository.addPlayer(team1Id, "W1", 1)
        val w2 = repository.addPlayer(team1Id, "W2", 2)
        val k1 = repository.addPlayer(team2Id, "K1", 1)
        val k2 = repository.addPlayer(team2Id, "K2", 2)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)

        for (i in 0 until 30) {
            val r = if (i == 0) 10 else 0
            repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = i / 6, ballNumber = i % 6, runs = r, batsmanId = w1, bowlerId = k1, nonStrikerId = w2))
        }

        assertEquals(MatchStatus.INNINGS_2, repository.getMatch(mId)!!.status)

        repository.addBall(BallEvent(matchId = mId, innings = 2, overNumber = 0, ballNumber = 0, runs = 4, batsmanId = k1, bowlerId = w1, nonStrikerId = k2))
        assertEquals(MatchStatus.INNINGS_2, repository.getMatch(mId)!!.status)

        repository.addBall(BallEvent(matchId = mId, innings = 2, overNumber = 0, ballNumber = 1, runs = 4, batsmanId = k1, bowlerId = w1, nonStrikerId = k2))
        assertEquals(MatchStatus.INNINGS_2, repository.getMatch(mId)!!.status)

        repository.addBall(BallEvent(matchId = mId, innings = 2, overNumber = 0, ballNumber = 2, runs = 4, batsmanId = k1, bowlerId = w1, nonStrikerId = k2))

        val match = repository.getMatch(mId)!!
        assertEquals("Match must complete mid-over when target reached", MatchStatus.COMPLETED, match.status)
        assertEquals("Knights won by 5 wickets", match.result)

        val state = repository.getMatchState(mId)!!
        val inn2 = state.innings2!!
        assertEquals(12, inn2.score)
        assertEquals(3, inn2.legalBalls)
        assertEquals("0.3", inn2.oversString)
    }

    @Test
    fun testTieMatchResultAndStandings() = runBlocking {
        val tId = repository.createTournament("Tie Cup", overs = 1, playersPerSide = 3)
        val team1Id = repository.addTeam(tId, "Alpha")
        val team2Id = repository.addTeam(tId, "Beta")
        val a1 = repository.addPlayer(team1Id, "A1", 1)
        val a2 = repository.addPlayer(team1Id, "A2", 2)
        val b1 = repository.addPlayer(team2Id, "B1", 1)
        val b2 = repository.addPlayer(team2Id, "B2", 2)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)

        for (i in 0 until 6) {
            repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = i, runs = 1, batsmanId = a1, bowlerId = b1, nonStrikerId = a2))
        }

        for (i in 0 until 6) {
            repository.addBall(BallEvent(matchId = mId, innings = 2, overNumber = 0, ballNumber = i, runs = 1, batsmanId = b1, bowlerId = a1, nonStrikerId = b2))
        }

        val match = repository.getMatch(mId)!!
        assertEquals(MatchStatus.COMPLETED, match.status)
        assertEquals("Match tied!", match.result)

        val standings = repository.computeStandings(tId)
        assertEquals(2, standings.size)
        assertEquals(1, standings[0].tied)
        assertEquals(1, standings[1].tied)
        assertEquals(1, standings[0].points)
        assertEquals(1, standings[1].points)
        assertEquals(0.0, standings[0].nrr, 0.001)
        assertEquals(0.0, standings[1].nrr, 0.001)
    }

    @Test
    fun testMaidenOversAndBowlerDebits() = runBlocking {
        val tId = repository.createTournament("Maiden Cup", overs = 3, playersPerSide = 5)
        val team1Id = repository.addTeam(tId, "Batters")
        val team2Id = repository.addTeam(tId, "Bowlers")
        val p1 = repository.addPlayer(team1Id, "P1", 1)
        val p2 = repository.addPlayer(team1Id, "P2", 2)
        val b1 = repository.addPlayer(team2Id, "B1", 1)
        val b2 = repository.addPlayer(team2Id, "B2", 2)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)

        // Over 0: Bowler 1 bowls 6 dots -> MAIDEN = 1
        for (i in 0 until 6) {
            repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = i, runs = 0, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        }

        // Over 1: Bowler 2 bowls 5 dots, 1 wide (+1 run) -> MAIDEN = 0
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 1, ballNumber = 0, runs = 0, extraType = ExtraType.WIDE, extraRuns = 1, batsmanId = p2, bowlerId = b2, nonStrikerId = p1))
        for (i in 0 until 6) {
            repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 1, ballNumber = i, runs = 0, batsmanId = p2, bowlerId = b2, nonStrikerId = p1))
        }

        // Over 2: Bowler 1 bowls 6 dots with 2 BYES (Byes are not debited to bowler!) -> MAIDEN = 2 for Bowler 1
        for (i in 0 until 6) {
            val extraT = if (i == 0) ExtraType.BYE else null
            val extraR = if (i == 0) 2 else 0
            repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 2, ballNumber = i, runs = 0, extraType = extraT, extraRuns = extraR, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        }

        val state = repository.getMatchState(mId)!!
        val inn = state.innings1!!
        val bowler1Fig = inn.bowlers.find { it.playerId == b1 }!!
        val bowler2Fig = inn.bowlers.find { it.playerId == b2 }!!

        assertEquals(2, bowler1Fig.maidens)
        assertEquals(0, bowler1Fig.runs) // Byes not debited to bowler!
        assertEquals("2.0", bowler1Fig.overs)

        assertEquals(0, bowler2Fig.maidens) // Conceded 1 wide run
        assertEquals(1, bowler2Fig.runs)
        assertEquals("1.0", bowler2Fig.overs)
    }

    @Test
    fun testHatTrickThreeConsecutiveWickets() = runBlocking {
        val tId = repository.createTournament("HatTrick Cup", overs = 5, playersPerSide = 11)
        val team1Id = repository.addTeam(tId, "Team A")
        val team2Id = repository.addTeam(tId, "Team B")
        val bats = (1..6).map { repository.addPlayer(team1Id, "Bat $it", it) }
        val bowl = repository.addPlayer(team2Id, "Star Bowler", 1)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)

        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 0, isWicket = true, wicketType = WicketType.BOWLED, batsmanId = bats[0], bowlerId = bowl, nonStrikerId = bats[1]))
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 1, runs = 0, isWicket = true, wicketType = WicketType.CAUGHT, batsmanId = bats[1], bowlerId = bowl, nonStrikerId = bats[2]))
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 2, runs = 0, isWicket = true, wicketType = WicketType.LBW, batsmanId = bats[2], bowlerId = bowl, nonStrikerId = bats[3]))

        val state = repository.getMatchState(mId)!!
        val inn = state.innings1!!
        assertEquals(3, inn.wickets)
        assertEquals(3, inn.fallOfWickets.size)

        assertEquals("Bat 1", inn.fallOfWickets[0].batsman)
        assertEquals("Bat 2", inn.fallOfWickets[1].batsman)
        assertEquals("Bat 3", inn.fallOfWickets[2].batsman)

        val bowlerFig = inn.bowlers.find { it.playerId == bowl }!!
        assertEquals(3, bowlerFig.wickets)
        assertEquals(0, inn.partnership.runs)
        assertEquals(0, inn.partnership.balls)
    }

    // ════════════════════════════════════════════════════════════════
    //  2. Extreme Undo Scenarios
    // ════════════════════════════════════════════════════════════════

    @Test
    fun testUndoAtOverBoundary() = runBlocking {
        val tId = repository.createTournament("UndoBoundary Cup", overs = 5, playersPerSide = 5)
        val team1Id = repository.addTeam(tId, "Team A")
        val team2Id = repository.addTeam(tId, "Team B")
        val p1 = repository.addPlayer(team1Id, "P1", 1)
        val p2 = repository.addPlayer(team1Id, "P2", 2)
        val b1 = repository.addPlayer(team2Id, "B1", 1)
        val b2 = repository.addPlayer(team2Id, "B2", 2)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)

        for (i in 0 until 6) {
            repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = i, runs = 1, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        }

        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 1, ballNumber = 0, runs = 4, batsmanId = p2, bowlerId = b2, nonStrikerId = p1))

        var inn = repository.getMatchState(mId)!!.innings1!!
        assertEquals(7, inn.legalBalls)
        assertEquals("1.1", inn.oversString)
        assertEquals(b2, inn.currentBowler?.playerId)

        repository.undoLastBall(mId)
        inn = repository.getMatchState(mId)!!.innings1!!
        assertEquals(6, inn.legalBalls)
        assertEquals("1.0", inn.oversString)
        assertEquals(b1, inn.currentBowler?.playerId)
        assertEquals(6, inn.score)

        repository.undoLastBall(mId)
        inn = repository.getMatchState(mId)!!.innings1!!
        assertEquals(5, inn.legalBalls)
        assertEquals("0.5", inn.oversString)
        assertEquals(5, inn.score)
    }

    @Test
    fun testUndoMatchEndingWinningBallMultiBall() = runBlocking {
        // Multi-ball Innings 2: Ball 1 scores 1 run, Ball 2 scores 6 runs (wins match)
        val tId = repository.createTournament("UndoWinnerCup2", overs = 2, playersPerSide = 4)
        val team1Id = repository.addTeam(tId, "Team 1")
        val team2Id = repository.addTeam(tId, "Team 2")
        val a1 = repository.addPlayer(team1Id, "A1", 1)
        val a2 = repository.addPlayer(team1Id, "A2", 2)
        val b1 = repository.addPlayer(team2Id, "B1", 1)
        val b2 = repository.addPlayer(team2Id, "B2", 2)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)

        for (i in 0 until 12) {
            repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = i / 6, ballNumber = i % 6, runs = if (i == 0) 5 else 0, batsmanId = a1, bowlerId = b1, nonStrikerId = a2))
        }

        // Innings 2: Target is 6 runs.
        // Ball 0: 1 run (total 1)
        repository.addBall(BallEvent(matchId = mId, innings = 2, overNumber = 0, ballNumber = 0, runs = 1, batsmanId = b1, bowlerId = a1, nonStrikerId = b2))
        // Ball 1: 6 runs (total 7 -> WINS MATCH!)
        repository.addBall(BallEvent(matchId = mId, innings = 2, overNumber = 0, ballNumber = 1, runs = 6, batsmanId = b1, bowlerId = a1, nonStrikerId = b2))

        var match = repository.getMatch(mId)!!
        assertEquals(MatchStatus.COMPLETED, match.status)
        assertNotNull(match.result)

        // Undo ball 1 (the winning ball)
        repository.undoLastBall(mId)

        match = repository.getMatch(mId)!!
        assertEquals("Match status must revert from COMPLETED to INNINGS_2 when earlier balls exist in innings 2", MatchStatus.INNINGS_2, match.status)
        assertNull("Match result must be cleared upon undo", match.result)

        val state = repository.getMatchState(mId)!!
        val inn2 = state.innings2!!
        assertEquals(1, inn2.score)
        assertEquals(1, inn2.legalBalls)
    }

    @Test
    fun testUndoFallOfWicketsRestoresBatsmanAndPartnership() = runBlocking {
        val tId = repository.createTournament("UndoWicket Cup", overs = 5, playersPerSide = 5)
        val team1Id = repository.addTeam(tId, "Team A")
        val team2Id = repository.addTeam(tId, "Team B")
        val p1 = repository.addPlayer(team1Id, "Striker", 1)
        val p2 = repository.addPlayer(team1Id, "NonStriker", 2)
        val b1 = repository.addPlayer(team2Id, "Bowler", 1)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)

        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 4, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 1, runs = 2, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))

        var inn = repository.getMatchState(mId)!!.innings1!!
        assertEquals(6, inn.partnership.runs)
        assertEquals(2, inn.partnership.balls)

        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 2, runs = 0, isWicket = true, wicketType = WicketType.BOWLED, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))

        inn = repository.getMatchState(mId)!!.innings1!!
        assertEquals(1, inn.wickets)
        assertEquals(1, inn.fallOfWickets.size)
        assertEquals(0, inn.partnership.runs)
        assertEquals(0, inn.partnership.balls)

        repository.undoLastBall(mId)

        inn = repository.getMatchState(mId)!!.innings1!!
        assertEquals("Wickets count must decrement to 0 after undo", 0, inn.wickets)
        assertEquals("FOW entry must be removed after undo", 0, inn.fallOfWickets.size)
        assertEquals("Partnership runs must be restored", 6, inn.partnership.runs)
        assertEquals("Partnership balls must be restored", 2, inn.partnership.balls)

        val restoredBatsman = inn.batsmen.find { it.playerId == p1 }!!
        assertFalse("Batsman must no longer be marked out", restoredBatsman.isOut)
        assertEquals(6, restoredBatsman.runs)
        assertEquals(2, restoredBatsman.balls)
    }

    // ════════════════════════════════════════════════════════════════
    //  3. NRR Boundary Testing
    // ════════════════════════════════════════════════════════════════

    @Test
    fun testZeroOversBowledNrrSafe() = runBlocking {
        val tId = repository.createTournament("ZeroNrr Cup", overs = 10, playersPerSide = 11)
        repository.addTeam(tId, "Alpha")
        repository.addTeam(tId, "Beta")

        val standings = repository.computeStandings(tId)
        assertEquals(2, standings.size)
        standings.forEach {
            assertEquals(0, it.played)
            assertEquals(0, it.won)
            assertEquals(0, it.lost)
            assertEquals(0, it.tied)
            assertEquals(0, it.points)
            assertEquals(0.0, it.nrr, 0.001)
            assertFalse(it.nrr.isNaN())
            assertFalse(it.nrr.isInfinite())
        }
    }

    @Test
    fun testAllOutTeamFullQuotaNrrRule() = runBlocking {
        val tId = repository.createTournament("FullQuotaNrr Cup", overs = 10, playersPerSide = 5)
        val teamA = repository.addTeam(tId, "Team A")
        val teamB = repository.addTeam(tId, "Team B")
        val aBats = (1..5).map { repository.addPlayer(teamA, "A$it", it) }
        val bBats = (1..5).map { repository.addPlayer(teamB, "B$it", it) }

        val mId = repository.createMatch(tId, teamA, teamB)
        repository.setToss(mId, teamA, TossChoice.BAT)

        for (i in 0 until 4) {
            repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = i / 6, ballNumber = i % 6, runs = if (i == 0) 30 else 0, isWicket = true, wicketType = WicketType.BOWLED, batsmanId = aBats[i], bowlerId = bBats[0], nonStrikerId = aBats[i + 1]))
        }

        for (i in 0 until 12) {
            val r = if (i < 4) 8 else 0
            repository.addBall(BallEvent(matchId = mId, innings = 2, overNumber = i / 6, ballNumber = i % 6, runs = r, batsmanId = bBats[0], bowlerId = aBats[0], nonStrikerId = bBats[1]))
        }

        val standings = repository.computeStandings(tId)
        assertEquals(2, standings.size)

        val winnerB = standings[0]
        val loserA = standings[1]

        assertEquals("Team B", winnerB.team.name)
        assertEquals("Team A", loserA.team.name)
        assertEquals(-13.0, loserA.nrr, 0.001)
        assertEquals(13.0, winnerB.nrr, 0.001)
    }

    @Test
    fun testNegativeNrrSorting() = runBlocking {
        val tId = repository.createTournament("SortNrr Cup", overs = 10, playersPerSide = 11)
        val team1 = repository.addTeam(tId, "Team 1")
        val team2 = repository.addTeam(tId, "Team 2")
        val team3 = repository.addTeam(tId, "Team 3")
        val p1 = repository.addPlayer(team1, "P1", 1)
        val p2 = repository.addPlayer(team2, "P2", 1)
        val p3 = repository.addPlayer(team3, "P3", 1)
        val p1_2 = repository.addPlayer(team1, "P1_2", 2)
        val p2_2 = repository.addPlayer(team2, "P2_2", 2)
        val p3_2 = repository.addPlayer(team3, "P3_2", 2)

        val m1 = repository.createMatch(tId, team1, team2)
        repository.setToss(m1, team1, TossChoice.BAT)
        for (i in 0 until 60) repository.addBall(BallEvent(matchId = m1, innings = 1, overNumber = i / 6, ballNumber = i % 6, runs = 2, batsmanId = p1, bowlerId = p2, nonStrikerId = p1_2))
        for (i in 0 until 60) repository.addBall(BallEvent(matchId = m1, innings = 2, overNumber = i / 6, ballNumber = i % 6, runs = if (i < 50) 2 else 0, batsmanId = p2, bowlerId = p1, nonStrikerId = p2_2))

        val m2 = repository.createMatch(tId, team1, team3)
        repository.setToss(m2, team1, TossChoice.BAT)
        for (i in 0 until 60) repository.addBall(BallEvent(matchId = m2, innings = 1, overNumber = i / 6, ballNumber = i % 6, runs = 2, batsmanId = p1, bowlerId = p3, nonStrikerId = p1_2))
        for (i in 0 until 60) repository.addBall(BallEvent(matchId = m2, innings = 2, overNumber = i / 6, ballNumber = i % 6, runs = if (i < 35) 2 else 0, batsmanId = p3, bowlerId = p1, nonStrikerId = p3_2))

        val standings = repository.computeStandings(tId)
        assertEquals(3, standings.size)

        assertEquals("Team 1", standings[0].team.name)
        assertEquals(4, standings[0].points)

        assertEquals("Team 2", standings[1].team.name)
        assertEquals(-2.0, standings[1].nrr, 0.001)

        assertEquals("Team 3", standings[2].team.name)
        assertEquals(-5.0, standings[2].nrr, 0.001)
    }

    // ════════════════════════════════════════════════════════════════
    //  4. Embedded HTTP Server Stress & Concurrency Testing
    // ════════════════════════════════════════════════════════════════

    private fun httpGet(urlStr: String): Pair<Int, String> {
        val conn = URL(urlStr).openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = 5000
        conn.readTimeout = 5000
        val code = conn.responseCode
        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
        val body = stream?.bufferedReader()?.use { it.readText() } ?: ""
        conn.disconnect()
        return Pair(code, body)
    }

    private fun httpPost(urlStr: String, jsonBody: String): Pair<Int, String> {
        val conn = URL(urlStr).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true
        conn.connectTimeout = 5000
        conn.readTimeout = 5000
        conn.outputStream.use { it.write(jsonBody.toByteArray(Charsets.UTF_8)) }
        val code = conn.responseCode
        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
        val body = stream?.bufferedReader()?.use { it.readText() } ?: ""
        conn.disconnect()
        return Pair(code, body)
    }

    private fun httpOptions(urlStr: String): Pair<Int, Map<String, List<String>>> {
        val conn = URL(urlStr).openConnection() as HttpURLConnection
        conn.requestMethod = "OPTIONS"
        conn.setRequestProperty("Origin", "http://localhost:3000")
        conn.setRequestProperty("Access-Control-Request-Method", "POST")
        conn.connectTimeout = 5000
        conn.readTimeout = 5000
        val code = conn.responseCode
        val headers = conn.headerFields
        conn.disconnect()
        return Pair(code, headers)
    }

    @Test
    fun testHttpServerConcurrentHitsAndCors() {
        runBlocking {
            val tId = repository.createTournament("Http Cup", overs = 10, playersPerSide = 11)
            val t1 = repository.addTeam(tId, "Team A")
            val t2 = repository.addTeam(tId, "Team B")
            val p1 = repository.addPlayer(t1, "A1", 1)
            val p2 = repository.addPlayer(t1, "A2", 2)
            val b1 = repository.addPlayer(t2, "B1", 1)
            val mId = repository.createMatch(tId, t1, t2)
            repository.setToss(mId, t1, TossChoice.BAT)
            repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 4, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        }

        httpServer = CricketHttpServer(port = testPort, repository = repository)
        httpServer!!.start()

        // 1. Test CORS preflight (OPTIONS)
        val endpoints = listOf("/api/score", "/api/admin/command", "/api/tournament")
        for (ep in endpoints) {
            val (code, headers) = httpOptions("http://127.0.0.1:$testPort$ep")
            assertEquals("OPTIONS on $ep must return 200", 200, code)
            val corsOrigin = headers["Access-Control-Allow-Origin"]?.firstOrNull() ?: ""
            assertEquals("*", corsOrigin)
            val corsMethods = headers["Access-Control-Allow-Methods"]?.firstOrNull() ?: ""
            assertTrue("Expected OPTIONS in CORS methods", corsMethods.contains("OPTIONS"))
        }

        // 2. Test Admin command POST and subsequent GET /api/score reflection for all 6 commands
        val adminCommandsToTest = listOf(
            Triple("{\"action\":\"PLAY_VIDEO_AD\",\"src\":\"/ads/sponsor.mp4\",\"loop\":true}", "PLAY_VIDEO_AD", "/ads/sponsor.mp4"),
            Triple("{\"action\":\"PLAY_IMAGE_AD\",\"src\":\"/ads/banner.png\"}", "PLAY_IMAGE_AD", "/ads/banner.png"),
            Triple("{\"action\":\"STOP_AD\"}", "STOP_AD", null),
            Triple("{\"action\":\"PLAY_MUSIC\",\"src\":\"/music/papare.mp3\",\"loop\":true}", "PLAY_MUSIC", "/music/papare.mp3"),
            Triple("{\"action\":\"STOP_MUSIC\"}", "STOP_MUSIC", null),
            Triple("{\"action\":\"CLEAR_RESULT\"}", "CLEAR_RESULT", null)
        )

        for ((payload, expectedAction, expectedSrc) in adminCommandsToTest) {
            val (postCode, postBody) = httpPost("http://127.0.0.1:$testPort/api/admin/command", payload)
            assertEquals("POST /api/admin/command for $expectedAction must return 200", 200, postCode)
            val postJson = JsonParser.parseString(postBody).asJsonObject
            assertEquals("ok", postJson.get("status").asString)
            assertEquals(expectedAction, postJson.get("received").asString)

            // GET /api/score must now reflect this command
            val (scoreCode, scoreBody) = httpGet("http://127.0.0.1:$testPort/api/score")
            assertEquals("GET /api/score must return 200", 200, scoreCode)
            val scoreJson = JsonParser.parseString(scoreBody).asJsonObject
            assertTrue("Score response must contain adminCommand", scoreJson.has("adminCommand"))
            val adminCmd = scoreJson.getAsJsonObject("adminCommand")
            assertEquals(expectedAction, adminCmd.get("action").asString)
            if (expectedSrc != null) {
                assertEquals(expectedSrc, adminCmd.get("src").asString)
            }
        }

        // 3. Concurrent Hits Stress Test: 50 concurrent requests across score & tournament endpoints
        runBlocking(Dispatchers.IO) {
            val deferreds = (1..50).map { i ->
                async {
                    val url = if (i % 2 == 0) "http://127.0.0.1:$testPort/api/score" else "http://127.0.0.1:$testPort/api/tournament"
                    val (code, body) = httpGet(url)
                    assertEquals(200, code)
                    assertTrue(body.length > 10)
                }
            }
            deferreds.awaitAll()
        }
    }

    // ════════════════════════════════════════════════════════════════
    //  5. Defect Verification & Bug Pinpointing Tests
    // ════════════════════════════════════════════════════════════════

    /**
     * BUG INVESTIGATION 1:
     * When Innings 2 starts and only 1 ball has been bowled, undoing that ball
     * causes the repository to check `match.status == INNINGS_2 && b2.isEmpty() && b1.isNotEmpty()`.
     * This incorrectly reverts the match back to `INNINGS_1`!
     * Even though Innings 1 was already completed with its full quota of overs!
     * As a result, subsequent ball entries are erroneously registered into Innings 1,
     * violating innings boundaries and over limits.
     */
    @Test
    fun testEmpiricalBug_UndoingFirstBallOfInnings2RevertsMatchToInnings1() = runBlocking {
        val tId = repository.createTournament("InningsRevertBug Cup", overs = 1, playersPerSide = 3)
        val t1 = repository.addTeam(tId, "Team 1")
        val t2 = repository.addTeam(tId, "Team 2")
        val a1 = repository.addPlayer(t1, "A1", 1)
        val a2 = repository.addPlayer(t1, "A2", 2)
        val b1 = repository.addPlayer(t2, "B1", 1)
        val b2 = repository.addPlayer(t2, "B2", 2)

        val mId = repository.createMatch(tId, t1, t2)
        repository.setToss(mId, t1, TossChoice.BAT)

        // Innings 1 completes with 6 balls (1 over)
        for (i in 0 until 6) {
            repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = i, runs = 1, batsmanId = a1, bowlerId = b1, nonStrikerId = a2))
        }

        var match = repository.getMatch(mId)!!
        assertEquals("After 6 balls, match must advance to INNINGS_2", MatchStatus.INNINGS_2, match.status)

        // Innings 2: Ball 1 is bowled (scores 2 runs)
        repository.addBall(BallEvent(matchId = mId, innings = 2, overNumber = 0, ballNumber = 0, runs = 2, batsmanId = b1, bowlerId = a1, nonStrikerId = b2))

        // Scorer clicks UNDO on ball 1 of Innings 2
        repository.undoLastBall(mId)

        match = repository.getMatch(mId)!!
        val actualStatus = match.status
        assertEquals(
            "Match status must remain INNINGS_2 when balls in innings 2 are undone",
            MatchStatus.INNINGS_2,
            actualStatus
        )

        // Verify Innings 2 state is 0/0 (0 balls) and chasing team remains batting team
        val state = repository.getMatchState(mId)!!
        val inn2 = state.innings2!!
        assertEquals("Innings 2 score must be 0", 0, inn2.score)
        assertEquals("Innings 2 legal balls must be 0", 0, inn2.legalBalls)
        assertEquals("Innings 2 wickets must be 0", 0, inn2.wickets)
        assertEquals("Batting team must remain Team 2 (chasing team)", t2, inn2.battingTeamId)

        // Verify Innings 1 is untouched and cannot receive more balls
        val inn1 = state.innings1!!
        assertEquals("Innings 1 legal balls must remain 6", 6, inn1.legalBalls)
        assertEquals("Innings 1 score must remain 6", 6, inn1.score)
    }

    /**
     * BUG INVESTIGATION 2:
     * When a wicket falls, the dismissed batsman is marked isOut = true, onStrike = false, isStriker = false.
     * The incoming batsman is introduced at the crease on strike (or surviving batsman if over ended).
     * The HTTP server /api/score returns the 2 active batsmen at the crease.
     */
    @Test
    fun testEmpiricalBug_DismissedBatsmanRetainedInActiveCreaseAsStriker() = runBlocking {
        val tId = repository.createTournament("DismissalCreaseBug Cup", overs = 2, playersPerSide = 5)
        val t1 = repository.addTeam(tId, "Team 1")
        val t2 = repository.addTeam(tId, "Team 2")
        val a1 = repository.addPlayer(t1, "Batsman 1", 1)
        val a2 = repository.addPlayer(t1, "Batsman 2", 2)
        val a3 = repository.addPlayer(t1, "Batsman 3", 3)
        val b1 = repository.addPlayer(t2, "Bowler 1", 1)

        val mId = repository.createMatch(tId, t1, t2)
        repository.setToss(mId, t1, TossChoice.BAT)

        // Ball 0: Batsman 1 is Bowled out!
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 0, isWicket = true, wicketType = WicketType.BOWLED, batsmanId = a1, bowlerId = b1, nonStrikerId = a2))

        val state = repository.getMatchState(mId)!!
        val inn = state.innings1!!
        val activeBatsmen = inn.batsmen

        // 1. Verify dismissed batsman (a1) is marked out and not on strike
        val dismissed = activeBatsmen.find { it.playerId == a1 }
        assertNotNull("Dismissed batsman is recorded in batsmen list", dismissed)
        assertTrue("Dismissed batsman is marked out", dismissed!!.isOut)
        assertFalse("Dismissed batsman must NOT be on strike", dismissed.onStrike)
        assertFalse("Dismissed batsman must NOT be striker", dismissed.isStriker)

        // 2. Verify incoming batsman (a3) is introduced at the crease on strike
        val striker = activeBatsmen.find { it.isStriker }
        assertNotNull("Incoming batsman is at crease as striker", striker)
        assertEquals("Incoming batsman is Batsman 3", a3, striker!!.playerId)
        assertFalse("Incoming striker must NOT be marked out", striker.isOut)
        assertTrue("Incoming striker is on strike", striker.onStrike)

        // 3. Verify surviving batsman (a2) is at the crease as non-striker
        val nonStriker = activeBatsmen.find { it.playerId == a2 }
        assertNotNull("Surviving batsman is at crease", nonStriker)
        assertFalse("Surviving batsman must NOT be marked out", nonStriker!!.isOut)
        assertFalse("Surviving batsman is non-striker", nonStriker.onStrike)

        // 4. Verify ScoreResponse (/api/score) returns the 2 active batsmen at crease
        val scoreResp = repository.buildScoreResponse(mId)
        assertNotNull(scoreResp)
        assertEquals(2, scoreResp!!.batting.size)
        assertTrue("No active batsman in response is out", scoreResp.batting.none { it.isOut })
        assertEquals(a3, scoreResp.batting[0].playerId)
        assertTrue(scoreResp.batting[0].onStrike)
        assertEquals(a2, scoreResp.batting[1].playerId)
        assertFalse(scoreResp.batting[1].onStrike)
    }

    @Test
    fun testUndoSingleWinningBallInInnings2KeepsStatusInnings2() = runBlocking {
        val tId = repository.createTournament("SingleBallWinUndo Cup", overs = 1, playersPerSide = 3)
        val t1 = repository.addTeam(tId, "Team 1")
        val t2 = repository.addTeam(tId, "Team 2")
        val a1 = repository.addPlayer(t1, "A1", 1)
        val a2 = repository.addPlayer(t1, "A2", 2)
        val b1 = repository.addPlayer(t2, "B1", 1)
        val b2 = repository.addPlayer(t2, "B2", 2)

        val mId = repository.createMatch(tId, t1, t2)
        repository.setToss(mId, t1, TossChoice.BAT)

        // Innings 1 completes with 6 balls (1 over) scoring 1 run total
        for (i in 0 until 6) {
            repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = i, runs = if (i == 0) 1 else 0, batsmanId = a1, bowlerId = b1, nonStrikerId = a2))
        }

        var match = repository.getMatch(mId)!!
        assertEquals(MatchStatus.INNINGS_2, match.status)

        // Innings 2: Ball 0 scores 4 runs -> wins match on the very first ball!
        repository.addBall(BallEvent(matchId = mId, innings = 2, overNumber = 0, ballNumber = 0, runs = 4, batsmanId = b1, bowlerId = a1, nonStrikerId = b2))

        match = repository.getMatch(mId)!!
        assertEquals(MatchStatus.COMPLETED, match.status)
        assertNotNull(match.result)

        // Undo the winning ball (which was ball 0 of Innings 2)
        repository.undoLastBall(mId)

        match = repository.getMatch(mId)!!
        assertEquals("Match status must revert from COMPLETED to INNINGS_2 even when b2 becomes empty", MatchStatus.INNINGS_2, match.status)
        assertNull("Match result must be cleared", match.result)

        val state = repository.getMatchState(mId)!!
        val inn2 = state.innings2!!
        assertEquals("Innings 2 score must be 0", 0, inn2.score)
        assertEquals("Innings 2 legal balls must be 0", 0, inn2.legalBalls)

        // Attempting another undo when 0 balls exist in Innings 2 must NOT roll back into Innings 1
        repository.undoLastBall(mId)
        match = repository.getMatch(mId)!!
        assertEquals("Status must remain INNINGS_2 and never revert to INNINGS_1", MatchStatus.INNINGS_2, match.status)
        val stateAfterSecondUndo = repository.getMatchState(mId)!!
        assertEquals("Innings 1 balls must remain exactly 6", 6, stateAfterSecondUndo.innings1!!.legalBalls)

        // Subsequent ball must be recorded in Innings 2
        repository.addBall(BallEvent(matchId = mId, innings = 2, overNumber = 0, ballNumber = 0, runs = 1, batsmanId = b1, bowlerId = a1, nonStrikerId = b2))
        val stateAfterNewBall = repository.getMatchState(mId)!!
        assertEquals("New ball scored must be in Innings 2", 1, stateAfterNewBall.innings2!!.score)
        assertEquals(1, stateAfterNewBall.innings2!!.legalBalls)
    }

    @Test
    fun testManualIncomingBatsmanSelectionAndConsecutiveDismissals() = runBlocking {
        val tId = repository.createTournament("ManualBatsman Cup", overs = 5, playersPerSide = 5)
        val t1 = repository.addTeam(tId, "Team 1")
        val t2 = repository.addTeam(tId, "Team 2")
        val a1 = repository.addPlayer(t1, "Batsman 1", 1)
        val a2 = repository.addPlayer(t1, "Batsman 2", 2)
        val a3 = repository.addPlayer(t1, "Batsman 3", 3)
        val a4 = repository.addPlayer(t1, "Batsman 4", 4)
        val a5 = repository.addPlayer(t1, "Batsman 5", 5)
        val b1 = repository.addPlayer(t2, "Bowler 1", 1)

        val mId = repository.createMatch(tId, t1, t2)
        repository.setToss(mId, t1, TossChoice.BAT)

        // Wicket 1: Batsman 1 is out on ball 0. Scorer chooses Batsman 4 to skip order!
        repository.setIncomingBatsman(mId, a4)
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 0, isWicket = true, wicketType = WicketType.BOWLED, batsmanId = a1, bowlerId = b1, nonStrikerId = a2))

        var state = repository.getMatchState(mId)!!
        var inn = state.innings1!!
        var striker = inn.batsmen.find { it.isStriker }!!
        assertEquals("Manually selected Batsman 4 must be on strike", a4, striker.playerId)
        assertTrue(striker.onStrike)
        assertFalse(striker.isOut)

        // Ball 1: Batsman 4 faces ball and scores 2 runs
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 1, runs = 2, batsmanId = a4, bowlerId = b1, nonStrikerId = a2))

        // Ball 2: Batsman 4 is caught out!
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 2, runs = 0, isWicket = true, wicketType = WicketType.CAUGHT, batsmanId = a4, bowlerId = b1, nonStrikerId = a2))

        state = repository.getMatchState(mId)!!
        inn = state.innings1!!

        // Batsman 4 must now be marked out
        val outBat4 = inn.batsmen.find { it.playerId == a4 }!!
        assertTrue(outBat4.isOut)
        assertFalse(outBat4.onStrike)
        assertFalse(outBat4.isStriker)

        // Next available unbatted batsman is Batsman 3 (since Batsman 1 and 4 are out, Batsman 2 is at crease)
        striker = inn.batsmen.find { it.isStriker }!!
        assertEquals("Next unbatted player Batsman 3 must take strike", a3, striker.playerId)
        assertTrue(striker.onStrike)
        assertFalse(striker.isOut)

        // Crease response check
        val scoreResp = repository.buildScoreResponse(mId)!!
        assertEquals(2, scoreResp.batting.size)
        assertTrue("No batsman at crease is out", scoreResp.batting.none { it.isOut })
        assertEquals(a3, scoreResp.batting[0].playerId)
        assertEquals(a2, scoreResp.batting[1].playerId)
    }
}
