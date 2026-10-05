package com.cricket.scorer

import com.cricket.scorer.data.db.*
import com.cricket.scorer.data.model.*
import com.cricket.scorer.data.repository.CricketRepository
import com.cricket.scorer.server.CricketHttpServer
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/**
 * Unit tests verifying cricket scoring engine, extras, dismissals, undo,
 * NRR calculation, and HTTP response serialization.
 */
class CricketScoringTest {

    private lateinit var repository: CricketRepository
    private lateinit var fakeTournamentDao: FakeTournamentDao
    private lateinit var fakeTeamDao: FakeTeamDao
    private lateinit var fakePlayerDao: FakePlayerDao
    private lateinit var fakeMatchDao: FakeMatchDao
    private lateinit var fakeBallDao: FakeBallEventDao

    private val gson: Gson = GsonBuilder().create()

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

    @Test
    fun testBasicRunsAndBallsScoring() = runBlocking {
        val tId = repository.createTournament("Test Cup", overs = 10, playersPerSide = 11)
        val team1Id = repository.addTeam(tId, "Team A")
        val team2Id = repository.addTeam(tId, "Team B")
        val p1 = repository.addPlayer(team1Id, "Batsman 1", 1)
        val p2 = repository.addPlayer(team1Id, "Batsman 2", 2)
        val b1 = repository.addPlayer(team2Id, "Bowler 1", 1)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)

        // 5 legal balls: 1, 2, 0, 4, 6
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 1, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 1, runs = 2, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 2, runs = 0, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 3, runs = 4, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 4, runs = 6, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))

        val state = repository.getMatchState(mId)
        assertNotNull(state)
        val inn = state!!.innings1
        assertNotNull(inn)

        assertEquals(13, inn!!.score)
        assertEquals(0, inn.wickets)
        assertEquals(5, inn.legalBalls)
        assertEquals("0.5", inn.oversString)

        val batsman = inn.batsmen.find { it.playerId == p1 }
        assertNotNull(batsman)
        assertEquals(13, batsman!!.runs)
        assertEquals(5, batsman.balls)
        assertEquals(1, batsman.fours)
        assertEquals(1, batsman.sixes)
        assertEquals(260.0, batsman.strikeRate, 0.01)

        val bowlerFig = inn.bowlers.find { it.playerId == b1 }
        assertNotNull(bowlerFig)
        assertEquals(13, bowlerFig!!.runs)
        assertEquals(5, bowlerFig.legalBalls)
        assertEquals(0, bowlerFig.wickets)
    }

    @Test
    fun testExtrasScoring() = runBlocking {
        val tId = repository.createTournament("Extras Cup", overs = 10, playersPerSide = 11)
        val team1Id = repository.addTeam(tId, "Team A")
        val team2Id = repository.addTeam(tId, "Team B")
        val p1 = repository.addPlayer(team1Id, "Batsman 1", 1)
        val p2 = repository.addPlayer(team1Id, "Batsman 2", 2)
        val b1 = repository.addPlayer(team2Id, "Bowler 1", 1)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)

        // Wide: extraRuns = 1, illegal ball (does not increment legal balls)
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 0, extraType = ExtraType.WIDE, extraRuns = 1, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        // No-Ball: runs = 2 (off bat), extraRuns = 1 (penalty)
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 2, extraType = ExtraType.NO_BALL, extraRuns = 1, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        // Bye: runs = 0, extraRuns = 2, legal ball
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 0, extraType = ExtraType.BYE, extraRuns = 2, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))

        val inn = repository.getMatchState(mId)!!.innings1!!
        // Total score: 1 (WD) + 3 (NB) + 2 (Bye) = 6 runs
        assertEquals(6, inn.score)
        // Legal balls: only the Bye is legal (1 ball)
        assertEquals(1, inn.legalBalls)
        assertEquals(4, inn.extras) // 1 wide + 1 nb + 2 bye = 4

        // Batsman should only get credit for runs off the bat (2 runs from NO_BALL)
        val bat = inn.batsmen.find { it.playerId == p1 }
        assertNotNull(bat)
        assertEquals(2, bat!!.runs)
    }

    @Test
    fun testNoBallScoringAndRunOut() = runBlocking {
        val tId = repository.createTournament("NoBall Cup", overs = 10, playersPerSide = 11)
        val team1Id = repository.addTeam(tId, "Team A")
        val team2Id = repository.addTeam(tId, "Team B")
        val p1 = repository.addPlayer(team1Id, "Batsman 1", 1)
        val p2 = repository.addPlayer(team1Id, "Batsman 2", 2)
        val p3 = repository.addPlayer(team1Id, "Batsman 3", 3)
        val b1 = repository.addPlayer(team2Id, "Bowler 1", 1)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)

        // 1. No Ball with 0 runs: 1 mark auto penalty, 0 legal balls
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 0, extraType = ExtraType.NO_BALL, extraRuns = 1, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        var inn = repository.getMatchState(mId)!!.innings1!!
        assertEquals(1, inn.score)
        assertEquals(0, inn.legalBalls)
        assertEquals(1, inn.extras)

        // 2. No Ball with 4 runs: 1 mark auto + 4 runs = 5 runs added (total 6), 4 credited to batsman
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 4, extraType = ExtraType.NO_BALL, extraRuns = 1, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        inn = repository.getMatchState(mId)!!.innings1!!
        assertEquals(6, inn.score)
        assertEquals(0, inn.legalBalls)
        val bat1 = inn.batsmen.find { it.playerId == p1 }!!
        assertEquals(4, bat1.runs)
        assertEquals(1, bat1.fours)

        // 3. No Ball with 6 runs: 1 mark auto + 6 runs = 7 runs added (total 13), 6 credited to batsman
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 6, extraType = ExtraType.NO_BALL, extraRuns = 1, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        inn = repository.getMatchState(mId)!!.innings1!!
        assertEquals(13, inn.score)
        assertEquals(0, inn.legalBalls)
        val bat2 = inn.batsmen.find { it.playerId == p1 }!!
        assertEquals(10, bat2.runs)
        assertEquals(1, bat2.sixes)

        // 4. No Ball with Run Out: 1 mark auto + 1 run completed = 2 runs (total 15), 1 wicket down
        repository.setIncomingBatsman(mId, p3)
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 1, extraType = ExtraType.NO_BALL, extraRuns = 1, isWicket = true, wicketType = WicketType.RUN_OUT, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        inn = repository.getMatchState(mId)!!.innings1!!
        assertEquals(15, inn.score)
        assertEquals(0, inn.legalBalls)
        assertEquals(1, inn.wickets)

        // Bowler should NOT be credited with a wicket for Run Out
        val bowler = inn.bowlers.find { it.playerId == b1 }!!
        assertEquals(0, bowler.wickets)
        assertEquals(15, bowler.runs)
    }

    @Test
    fun testWicketAndFallOfWickets() = runBlocking {
        val tId = repository.createTournament("Wicket Cup", overs = 10, playersPerSide = 11)
        val team1Id = repository.addTeam(tId, "Team A")
        val team2Id = repository.addTeam(tId, "Team B")
        val p1 = repository.addPlayer(team1Id, "Batsman 1", 1)
        val p2 = repository.addPlayer(team1Id, "Batsman 2", 2)
        val b1 = repository.addPlayer(team2Id, "Bowler 1", 1)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)

        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 4, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        // Wicket
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 1, runs = 0, isWicket = true, wicketType = WicketType.BOWLED, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))

        val inn = repository.getMatchState(mId)!!.innings1!!
        assertEquals(1, inn.wickets)
        assertEquals(4, inn.score)
        assertEquals(1, inn.fallOfWickets.size)

        val fow = inn.fallOfWickets[0]
        assertEquals(1, fow.wicketNumber)
        assertEquals(4, fow.score)
        assertEquals("Batsman 1", fow.batsman)

        val bowler = inn.bowlers.find { it.playerId == b1 }!!
        assertEquals(1, bowler.wickets)
    }

    @Test
    fun testUndoLastBall() = runBlocking {
        val tId = repository.createTournament("Undo Cup", overs = 10, playersPerSide = 11)
        val team1Id = repository.addTeam(tId, "Team A")
        val team2Id = repository.addTeam(tId, "Team B")
        val p1 = repository.addPlayer(team1Id, "Batsman 1", 1)
        val p2 = repository.addPlayer(team1Id, "Batsman 2", 2)
        val b1 = repository.addPlayer(team2Id, "Bowler 1", 1)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)

        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 4, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 1, runs = 6, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))

        var inn = repository.getMatchState(mId)!!.innings1!!
        assertEquals(10, inn.score)
        assertEquals(2, inn.legalBalls)

        // Undo the 6
        repository.undoLastBall(mId)

        inn = repository.getMatchState(mId)!!.innings1!!
        assertEquals(4, inn.score)
        assertEquals(1, inn.legalBalls)
    }

    @Test
    fun testChasingTargetEndsMatch() = runBlocking {
        val tId = repository.createTournament("Chase Cup", overs = 1, playersPerSide = 3)
        val team1Id = repository.addTeam(tId, "Team A")
        val team2Id = repository.addTeam(tId, "Team B")
        val p1 = repository.addPlayer(team1Id, "A1", 1)
        val p2 = repository.addPlayer(team1Id, "A2", 2)
        val b1 = repository.addPlayer(team2Id, "B1", 1)
        val b2 = repository.addPlayer(team2Id, "B2", 2)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)

        // Innings 1: 5 runs in 6 balls (overs complete)
        for (i in 0 until 6) {
            val r = if (i == 0) 5 else 0
            repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = i, runs = r, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        }

        var match = repository.getMatch(mId)!!
        assertEquals(MatchStatus.INNINGS_2, match.status)

        // Innings 2: Team B chases target of 6 runs. Scores a 6 on ball 1!
        repository.addBall(BallEvent(matchId = mId, innings = 2, overNumber = 0, ballNumber = 0, runs = 6, batsmanId = b1, bowlerId = p1, nonStrikerId = b2))

        match = repository.getMatch(mId)!!
        assertEquals(MatchStatus.COMPLETED, match.status)
        assertNotNull(match.result)
        assertTrue(match.result!!.contains("Team B won by 2 wickets"))
    }

    @Test
    fun testPointsTableAndNRRCalculation() = runBlocking {
        val tId = repository.createTournament("NRR Cup", overs = 10, playersPerSide = 11)
        val team1Id = repository.addTeam(tId, "Team A")
        val team2Id = repository.addTeam(tId, "Team B")
        val p1 = repository.addPlayer(team1Id, "A1", 1)
        val p2 = repository.addPlayer(team1Id, "A2", 2)
        val b1 = repository.addPlayer(team2Id, "B1", 1)
        val b2 = repository.addPlayer(team2Id, "B2", 2)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)

        // Team A scores 120 runs in 10 overs (60 balls)
        for (i in 0 until 60) {
            repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = i / 6, ballNumber = i % 6, runs = 2, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))
        }

        // Team B scores 100 runs in 10 overs (60 balls)
        for (i in 0 until 60) {
            val r = if (i < 50) 2 else 0
            repository.addBall(BallEvent(matchId = mId, innings = 2, overNumber = i / 6, ballNumber = i % 6, runs = r, batsmanId = b1, bowlerId = p1, nonStrikerId = b2))
        }

        val standings = repository.computeStandings(tId)
        assertEquals(2, standings.size)

        val winner = standings[0]
        val loser = standings[1]

        assertEquals("Team A", winner.team.name)
        assertEquals(1, winner.played)
        assertEquals(1, winner.won)
        assertEquals(0, winner.lost)
        assertEquals(2, winner.points)
        // Team A NRR: (120/10) - (100/10) = 12.0 - 10.0 = +2.000
        assertEquals(2.0, winner.nrr, 0.001)

        assertEquals("Team B", loser.team.name)
        assertEquals(1, loser.played)
        assertEquals(0, loser.won)
        assertEquals(1, loser.lost)
        assertEquals(0, loser.points)
        // Team B NRR: (100/10) - (120/10) = -2.000
        assertEquals(-2.0, loser.nrr, 0.001)
    }

    @Test
    fun testHttpResponseSerialization() = runBlocking {
        val tId = repository.createTournament("Serialization Cup", overs = 10, playersPerSide = 11)
        val team1Id = repository.addTeam(tId, "Team A")
        val team2Id = repository.addTeam(tId, "Team B")
        val p1 = repository.addPlayer(team1Id, "A1", 1)
        val p2 = repository.addPlayer(team1Id, "A2", 2)
        val b1 = repository.addPlayer(team2Id, "B1", 1)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 4, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))

        val adminCmd = AdminCommand(action = "PLAY_VIDEO_AD", src = "/ad.mp4", loop = false)
        val scoreResponse = repository.buildScoreResponse(mId, adminCmd)
        assertNotNull(scoreResponse)

        val json = gson.toJson(scoreResponse)
        val jsonObject = JsonParser.parseString(json).asJsonObject

        // Verify required contract keys
        assertTrue(jsonObject.has("match"))
        assertTrue(jsonObject.has("currentInnings"))
        assertTrue(jsonObject.has("batting"))
        assertTrue(jsonObject.has("bowler"))
        assertTrue(jsonObject.has("partnership"))
        assertTrue(jsonObject.has("recentBalls"))
        assertTrue(jsonObject.has("adminCommand"))

        val currentInn = jsonObject.getAsJsonObject("currentInnings")
        assertEquals(4, currentInn.get("score").asInt)
        assertEquals("Team A", currentInn.get("battingTeam").asString)

        val cmd = jsonObject.getAsJsonObject("adminCommand")
        assertEquals("PLAY_VIDEO_AD", cmd.get("action").asString)

        // Test tournament response serialization
        val tourResponse = repository.buildTournamentResponse(tId)
        assertNotNull(tourResponse)
        val tourJson = gson.toJson(tourResponse)
        val tourObj = JsonParser.parseString(tourJson).asJsonObject
        assertTrue(tourObj.has("tournamentId"))
        assertTrue(tourObj.has("name"))
        assertTrue(tourObj.has("standings"))
    }

    @Test
    fun testAdminCommandSynchronizationAndConstants() = runBlocking {
        // 1. Verify all AdminCommandTypes constants
        assertEquals("SHOW_TOSS", AdminCommandTypes.SHOW_TOSS)
        assertEquals("SHOW_TEAMS", AdminCommandTypes.SHOW_TEAMS)
        assertEquals("SHOW_BOWLER", AdminCommandTypes.SHOW_BOWLER)
        assertEquals("CLEAR_OVERLAY", AdminCommandTypes.CLEAR_OVERLAY)
        assertEquals("PLAY_VIDEO_AD", AdminCommandTypes.PLAY_VIDEO_AD)
        assertEquals("PLAY_IMAGE_AD", AdminCommandTypes.PLAY_IMAGE_AD)
        assertEquals("STOP_AD", AdminCommandTypes.STOP_AD)
        assertEquals("PLAY_MUSIC", AdminCommandTypes.PLAY_MUSIC)
        assertEquals("STOP_MUSIC", AdminCommandTypes.STOP_MUSIC)
        assertEquals("CLEAR_RESULT", AdminCommandTypes.CLEAR_RESULT)

        val tId = repository.createTournament("Sync Cup", overs = 10, playersPerSide = 11)
        val t1 = repository.addTeam(tId, "Team Alpha")
        val t2 = repository.addTeam(tId, "Team Beta")
        val mId = repository.createMatch(tId, t1, t2)
        repository.setToss(mId, t1, TossChoice.BAT)

        // 2. Initially currentAdminCommand is null
        assertNull(repository.currentAdminCommand)
        var resp = repository.buildScoreResponse(mId)
        assertNotNull(resp)
        assertNull(resp!!.adminCommand)

        // 3. Set command via setAdminCommand and verify default reflection in buildScoreResponse
        val tossCmd = AdminCommand(action = AdminCommandTypes.SHOW_TOSS)
        repository.setAdminCommand(tossCmd)
        assertEquals(tossCmd, repository.currentAdminCommand)

        resp = repository.buildScoreResponse(mId)
        assertNotNull(resp)
        assertNotNull(resp!!.adminCommand)
        assertEquals(AdminCommandTypes.SHOW_TOSS, resp.adminCommand!!.action)

        // 4. Overriding adminCommand parameter in buildScoreResponse takes precedence
        val bowlerCmd = AdminCommand(action = AdminCommandTypes.SHOW_BOWLER)
        resp = repository.buildScoreResponse(mId, bowlerCmd)
        assertNotNull(resp)
        assertEquals(AdminCommandTypes.SHOW_BOWLER, resp!!.adminCommand!!.action)

        // 5. CLEAR_OVERLAY dispatches and reflects properly
        val clearCmd = AdminCommand(action = AdminCommandTypes.CLEAR_OVERLAY)
        repository.setAdminCommand(clearCmd)
        assertEquals(clearCmd, repository.currentAdminCommand)
        resp = repository.buildScoreResponse(mId)
        assertEquals(AdminCommandTypes.CLEAR_OVERLAY, resp!!.adminCommand!!.action)
    }

    @Test
    fun testTossSerializationInMatchDto() = runBlocking {
        val tId = repository.createTournament("Toss Cup", overs = 10, playersPerSide = 11)
        val team1Id = repository.addTeam(tId, "Royal Strikers")
        val team2Id = repository.addTeam(tId, "Super Kings")
        val p1 = repository.addPlayer(team1Id, "RS 1", 1)
        val p2 = repository.addPlayer(team1Id, "RS 2", 2)
        val b1 = repository.addPlayer(team2Id, "SK 1", 1)

        val mId = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId, team1Id, TossChoice.BAT)
        repository.addBall(BallEvent(matchId = mId, innings = 1, overNumber = 0, ballNumber = 0, runs = 1, batsmanId = p1, bowlerId = b1, nonStrikerId = p2))

        val scoreResponse = repository.buildScoreResponse(mId)
        assertNotNull(scoreResponse)
        val matchDto = scoreResponse!!.match

        // Verify DTO fields (both flat and nested TossDto)
        assertEquals("Royal Strikers", matchDto.tossWinner)
        assertEquals("BAT", matchDto.tossChoice)
        assertEquals("Royal Strikers elected to bat first", matchDto.tossDecision)
        assertNotNull(matchDto.toss)
        assertEquals("Royal Strikers", matchDto.toss?.winner)
        assertEquals("BAT", matchDto.toss?.choice)
        assertEquals("Royal Strikers elected to bat first", matchDto.toss?.decision)

        // Verify JSON serialization format
        val json = gson.toJson(scoreResponse)
        val jsonObject = JsonParser.parseString(json).asJsonObject
        val matchJson = jsonObject.getAsJsonObject("match")
        assertTrue(matchJson.has("tossWinner"))
        assertTrue(matchJson.has("tossChoice"))
        assertTrue(matchJson.has("tossDecision"))
        assertEquals("Royal Strikers", matchJson.get("tossWinner").asString)
        assertEquals("BAT", matchJson.get("tossChoice").asString)
        assertEquals("Royal Strikers elected to bat first", matchJson.get("tossDecision").asString)

        assertTrue(matchJson.has("toss"))
        assertFalse(matchJson.get("toss").isJsonNull)
        val tossJson = matchJson.getAsJsonObject("toss")
        assertEquals("Royal Strikers", tossJson.get("winner").asString)
        assertEquals("BAT", tossJson.get("choice").asString)
        assertEquals("Royal Strikers elected to bat first", tossJson.get("decision").asString)

        // Test BOWL decision on a second match (bowling team wins toss and elects to bowl)
        val mId2 = repository.createMatch(tId, team1Id, team2Id)
        repository.setToss(mId2, team2Id, TossChoice.BOWL)
        val resp2 = repository.buildScoreResponse(mId2)
        assertNotNull(resp2)
        assertEquals("Super Kings", resp2!!.match.tossWinner)
        assertEquals("BOWL", resp2.match.tossChoice)
        assertEquals("Super Kings elected to bowl first", resp2.match.tossDecision)
        assertNotNull(resp2.match.toss)
        assertEquals("Super Kings", resp2.match.toss?.winner)
        assertEquals("BOWL", resp2.match.toss?.choice)
        assertEquals("Super Kings elected to bowl first", resp2.match.toss?.decision)

        val json2 = gson.toJson(resp2)
        val jsonObject2 = JsonParser.parseString(json2).asJsonObject
        val matchJson2 = jsonObject2.getAsJsonObject("match")
        assertTrue(matchJson2.has("toss"))
        val tossJson2 = matchJson2.getAsJsonObject("toss")
        assertEquals("Super Kings", tossJson2.get("winner").asString)
        assertEquals("BOWL", tossJson2.get("choice").asString)
        assertEquals("Super Kings elected to bowl first", tossJson2.get("decision").asString)
        assertEquals("Super Kings", matchJson2.get("tossWinner").asString)
        assertEquals("BOWL", matchJson2.get("tossChoice").asString)
        assertEquals("Super Kings elected to bowl first", matchJson2.get("tossDecision").asString)

        // Test unrecorded toss on a third match
        val mId3 = repository.createMatch(tId, team1Id, team2Id)
        val resp3 = repository.buildScoreResponse(mId3)
        assertNotNull(resp3)
        assertNull(resp3!!.match.toss)
        assertNull(resp3.match.tossWinner)
        assertNull(resp3.match.tossChoice)
        assertNull(resp3.match.tossDecision)
    }

    @Test
    fun testHttpServerDelegatesAdminCommandToRepository() {
        val httpServer = CricketHttpServer(port = 18081, repository = repository)

        // 1. Initial state
        assertNull(httpServer.currentAdminCommand)
        assertNull(repository.currentAdminCommand)

        // 2. Setting command on repository directly updates httpServer.currentAdminCommand
        val teamsCmd = AdminCommand(action = AdminCommandTypes.SHOW_TEAMS)
        repository.setAdminCommand(teamsCmd)
        assertEquals(AdminCommandTypes.SHOW_TEAMS, httpServer.currentAdminCommand?.action)

        // 3. Setting command on httpServer delegates directly to repository.currentAdminCommand
        val bowlerCmd = AdminCommand(action = AdminCommandTypes.SHOW_BOWLER)
        httpServer.currentAdminCommand = bowlerCmd
        assertEquals(AdminCommandTypes.SHOW_BOWLER, repository.currentAdminCommand?.action)

        // 4. Clear command sync
        val clearCmd = AdminCommand(action = AdminCommandTypes.CLEAR_OVERLAY)
        httpServer.currentAdminCommand = clearCmd
        assertEquals(AdminCommandTypes.CLEAR_OVERLAY, repository.currentAdminCommand?.action)
        assertEquals(AdminCommandTypes.CLEAR_OVERLAY, httpServer.currentAdminCommand?.action)
    }
}

// ════════════════════════════════════════════════════════════════
//  In-Memory Test Fakes for Room DAOs
// ════════════════════════════════════════════════════════════════

class FakeTournamentDao : TournamentDao {
    private val items = mutableListOf<Tournament>()
    override suspend fun insert(tournament: Tournament): Long {
        val id = items.size + 1
        items.add(tournament.copy(id = id))
        return id.toLong()
    }
    override suspend fun update(tournament: Tournament) {
        val idx = items.indexOfFirst { it.id == tournament.id }
        if (idx >= 0) items[idx] = tournament
    }
    override suspend fun getAll(): List<Tournament> = items.toList()
    override suspend fun getById(id: Int): Tournament? = items.find { it.id == id }
}

class FakeTeamDao : TeamDao {
    private val items = mutableListOf<Team>()
    override suspend fun insert(team: Team): Long {
        val id = items.size + 1
        items.add(team.copy(id = id))
        return id.toLong()
    }
    override suspend fun insertAll(teams: List<Team>) {
        teams.forEach { insert(it) }
    }
    override suspend fun update(team: Team) {
        val idx = items.indexOfFirst { it.id == team.id }
        if (idx >= 0) items[idx] = team
    }
    override suspend fun delete(team: Team) {
        items.removeAll { it.id == team.id }
    }
    override suspend fun getAll(): List<Team> = items.toList()
    override suspend fun deleteById(id: Int) {
        items.removeAll { it.id == id }
    }
    override suspend fun getByTournament(tournamentId: Int): List<Team> =
        items.filter { it.tournamentId == tournamentId }
    override suspend fun getById(id: Int): Team? = items.find { it.id == id }
}

class FakePlayerDao : PlayerDao {
    private val items = mutableListOf<Player>()
    override suspend fun insert(player: Player): Long {
        val id = items.size + 1
        items.add(player.copy(id = id))
        return id.toLong()
    }
    override suspend fun insertAll(players: List<Player>) {
        players.forEach { insert(it) }
    }
    override suspend fun update(player: Player) {
        val idx = items.indexOfFirst { it.id == player.id }
        if (idx >= 0) items[idx] = player
    }
    override suspend fun delete(player: Player) {
        items.removeAll { it.id == player.id }
    }
    override suspend fun deleteByTeam(teamId: Int) {
        items.removeAll { it.teamId == teamId }
    }
    override suspend fun getAll(): List<Player> = items.toList()
    override suspend fun getByTeam(teamId: Int): List<Player> =
        items.filter { it.teamId == teamId }.sortedBy { it.battingOrder }
    override suspend fun getById(id: Int): Player? = items.find { it.id == id }
}

class FakeMatchDao : MatchDao {
    private val items = mutableListOf<Match>()
    override suspend fun insert(match: Match): Long {
        val id = items.size + 1
        items.add(match.copy(id = id))
        return id.toLong()
    }
    override suspend fun update(match: Match) {
        val idx = items.indexOfFirst { it.id == match.id }
        if (idx >= 0) items[idx] = match
    }
    override suspend fun getByTournament(tournamentId: Int): List<Match> =
        items.filter { it.tournamentId == tournamentId }
    override suspend fun getById(id: Int): Match? = items.find { it.id == id }
}

class FakeBallEventDao : BallEventDao {
    private val items = mutableListOf<BallEvent>()
    override suspend fun insert(event: BallEvent): Long {
        val id = items.size + 1
        items.add(event.copy(id = id))
        return id.toLong()
    }
    override suspend fun delete(event: BallEvent) {
        items.removeAll { it.id == event.id }
    }
    override suspend fun getByInnings(matchId: Int, innings: Int): List<BallEvent> =
        items.filter { it.matchId == matchId && it.innings == innings }
    override suspend fun getLastBall(matchId: Int): BallEvent? =
        items.filter { it.matchId == matchId }.maxByOrNull { it.id }
    override suspend fun deleteLastBall(matchId: Int) {
        val last = items.filter { it.matchId == matchId }.maxByOrNull { it.id }
        if (last != null) items.remove(last)
    }
}
