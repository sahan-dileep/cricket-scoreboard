package com.cricket.scorer.data.repository

import com.cricket.scorer.data.db.*
import com.cricket.scorer.data.model.*

/**
 * Central repository — all score business logic lives here.
 * Computes live innings summaries from raw BallEvents.
 */
class CricketRepository(
    private val tournamentDao: TournamentDao,
    private val teamDao: TeamDao,
    private val playerDao: PlayerDao,
    private val matchDao: MatchDao,
    private val ballDao: BallEventDao
) {

    // ── Tournament ──────────────────────────────────────────────
    suspend fun createTournament(name: String, overs: Int, playersPerSide: Int): Int {
        return tournamentDao.insert(Tournament(name = name, overs = overs, playersPerSide = playersPerSide)).toInt()
    }
    suspend fun getTournaments() = tournamentDao.getAll()
    suspend fun getTournament(id: Int) = tournamentDao.getById(id)

    // ── Teams & Players ─────────────────────────────────────────
    suspend fun addTeam(tournamentId: Int, name: String): Int =
        teamDao.insert(Team(tournamentId = tournamentId, name = name)).toInt()

    suspend fun addPlayer(teamId: Int, name: String, order: Int): Int =
        playerDao.insert(Player(teamId = teamId, name = name, battingOrder = order)).toInt()

    suspend fun getTeams(tournamentId: Int) = teamDao.getByTournament(tournamentId)
    suspend fun getPlayers(teamId: Int)     = playerDao.getByTeam(teamId)

    // ── Match ───────────────────────────────────────────────────
    suspend fun createMatch(tournamentId: Int, team1Id: Int, team2Id: Int): Int =
        matchDao.insert(Match(tournamentId = tournamentId, team1Id = team1Id, team2Id = team2Id)).toInt()

    suspend fun setToss(matchId: Int, winnerId: Int, choice: TossChoice) {
        val match = matchDao.getById(matchId) ?: return
        matchDao.update(match.copy(tossWinnerId = winnerId, tossChoice = choice,
            status = MatchStatus.INNINGS_1))
    }

    suspend fun getMatch(matchId: Int) = matchDao.getById(matchId)
    suspend fun getMatches(tournamentId: Int) = matchDao.getByTournament(tournamentId)

    // ── Ball Entry ──────────────────────────────────────────────
    suspend fun addBall(event: BallEvent) {
        ballDao.insert(event)
        // Check if innings is complete
        val match = matchDao.getById(event.matchId) ?: return
        val tournament = tournamentDao.getById(match.tournamentId) ?: return
        val balls = ballDao.getByInnings(event.matchId, event.innings)
        val summary = computeInnings(balls, event.innings, tournament.overs,
            getTeamName(if (event.innings == 1) match.team1Id else match.team2Id), tournament.overs)

        // Auto-close innings on all-out or overs complete
        val legalBalls = balls.count { it.extraType != ExtraType.WIDE && it.extraType != ExtraType.NO_BALL }
        val maxBalls = tournament.overs * 6
        if (summary.wickets >= tournament.playersPerSide - 1 || legalBalls >= maxBalls) {
            advanceInnings(event.matchId, event.innings, match)
        }
    }

    suspend fun undoLastBall(matchId: Int) {
        ballDao.deleteLastBall(matchId)
    }

    private suspend fun advanceInnings(matchId: Int, currentInnings: Int, match: Match) {
        when (currentInnings) {
            1 -> matchDao.update(match.copy(status = MatchStatus.INNINGS_2))
            2 -> {
                // Determine result
                val result = computeResult(matchId, match)
                matchDao.update(match.copy(status = MatchStatus.COMPLETED, result = result))
            }
        }
    }

    private suspend fun computeResult(matchId: Int, match: Match): String {
        val t = tournamentDao.getById(match.tournamentId) ?: return "Match complete"
        val b1 = ballDao.getByInnings(matchId, 1)
        val b2 = ballDao.getByInnings(matchId, 2)
        val s1 = computeInnings(b1, 1, t.overs, "", t.overs)
        val s2 = computeInnings(b2, 2, t.overs, "", t.overs)
        val team1 = teamDao.getById(match.team1Id)?.name ?: "Team 1"
        val team2 = teamDao.getById(match.team2Id)?.name ?: "Team 2"

        // Determine who batted first
        val (bat1Name, bat1Score, bat2Name, bat2Score) = if (determineBattingFirst(match) == match.team1Id) {
            listOf(team1, s1.score, team2, s2.score)
        } else {
            listOf(team2, s1.score, team1, s2.score)
        }

        return when {
            bat2Score > bat1Score -> {
                val wktsLeft = t.playersPerSide - 1 - s2.wickets
                "$bat2Name won by $wktsLeft wicket${if (wktsLeft != 1) "s" else ""}"
            }
            bat1Score > bat2Score -> "$bat1Name won by ${bat1Score - bat2Score} run${if (bat1Score - bat2Score != 1) "s" else ""}"
            else -> "Match tied!"
        }
    }

    private fun determineBattingFirst(match: Match): Int {
        return if (match.tossChoice == TossChoice.BAT) match.tossWinnerId ?: match.team1Id
        else if (match.tossWinnerId == match.team1Id) match.team2Id else match.team1Id
    }

    // ── Innings Computation ─────────────────────────────────────
    suspend fun computeInnings(
        balls: List<BallEvent>,
        inningsNum: Int,
        maxOvers: Int,
        teamName: String,
        totalOvers: Int
    ): InningsSummary {
        var score = 0; var wickets = 0; var extras = 0; var legalBalls = 0

        val batsmanMap   = mutableMapOf<Int, BatsmanScore>()
        val bowlerMap    = mutableMapOf<Int, BowlerFigure>()
        val fow          = mutableListOf<FallOfWicket>()
        var partRuns     = 0; var partBalls = 0
        var currentPair  = Pair(-1, -1)

        balls.forEach { b ->
            val isExtra = b.extraType != null
            val ballRuns = b.runs + b.extraRuns
            score += ballRuns

            // Legal ball counting (no wide/no-ball for over count)
            val isLegal = b.extraType != ExtraType.WIDE && b.extraType != ExtraType.NO_BALL
            if (isLegal) legalBalls++

            if (isExtra) extras += b.extraRuns

            // Batsman stats (only credit runs to batsman for non-bye/leg-bye)
            val batsmanRuns = when (b.extraType) {
                ExtraType.BYE, ExtraType.LEG_BYE -> 0
                ExtraType.WIDE -> 0
                else -> b.runs
            }
            val bat = batsmanMap.getOrDefault(b.batsmanId,
                BatsmanScore(b.batsmanId, playerName(b.batsmanId), onStrike = true))
            batsmanMap[b.batsmanId] = bat.copy(
                runs  = bat.runs + batsmanRuns,
                balls = bat.balls + (if (isLegal) 1 else 0),
                fours = bat.fours + (if (b.runs == 4 && b.extraType == null) 1 else 0),
                sixes = bat.sixes + (if (b.runs == 6 && b.extraType == null) 1 else 0),
                isOut = bat.isOut || b.isWicket
            )

            // Bowler stats
            val bowl = bowlerMap.getOrDefault(b.bowlerId,
                BowlerFigure(b.bowlerId, playerName(b.bowlerId)))
            val conceded = b.runs + (if (b.extraType == ExtraType.WIDE || b.extraType == ExtraType.NO_BALL) b.extraRuns else 0)
            bowlerMap[b.bowlerId] = bowl.copy(
                legalBalls = bowl.legalBalls + (if (isLegal) 1 else 0),
                runs       = bowl.runs + conceded,
                wickets    = bowl.wickets + if (b.isWicket && b.wicketType != WicketType.RUN_OUT) 1 else 0
            )

            // Wicket
            if (b.isWicket) {
                wickets++
                val overStr = "${legalBalls/6}.${legalBalls%6}"
                fow.add(FallOfWicket(wickets, score, playerName(b.batsmanId), overStr))
                partRuns = 0; partBalls = 0
            } else {
                partRuns  += ballRuns
                partBalls += if (isLegal) 1 else 0
            }
        }

        // Identify current batsmen (last 2 not out)
        val activeBatsmen = balls.map { it.batsmanId }.distinct().takeLast(2)
            .mapNotNull { id -> batsmanMap[id]?.takeIf { !it.isOut } }
            .mapIndexed { i, b -> b.copy(onStrike = i == 0) }

        // Recent balls (last 3 overs)
        val recentBalls = computeRecentBalls(balls, maxOvers)

        return InningsSummary(
            innings        = inningsNum,
            battingTeamId  = 0, // set by caller
            battingTeamName= teamName,
            score          = score,
            wickets        = wickets,
            legalBalls     = legalBalls,
            totalOvers     = totalOvers,
            extras         = extras,
            batsmen        = activeBatsmen,
            bowlers        = bowlerMap.values.toList(),
            fallOfWickets  = fow,
            recentBalls    = recentBalls,
            partnership    = Partnership(partRuns, partBalls)
        )
    }

    private fun computeRecentBalls(balls: List<BallEvent>, maxOvers: Int): List<OverBalls> {
        val byOver = balls.groupBy { it.overNumber }
        val allOvers = byOver.keys.sorted()
        val recentOvers = allOvers.takeLast(3)
        return recentOvers.map { ov ->
            val bs = byOver[ov] ?: emptyList()
            val isLastOver = ov == allOvers.lastOrNull()
            OverBalls(ov, bs.mapIndexed { i, b ->
                BallDisplay(
                    label = when {
                        b.isWicket -> "W"
                        b.extraType == ExtraType.WIDE   -> "WD"
                        b.extraType == ExtraType.NO_BALL -> "NB"
                        b.runs == 4 -> "4"
                        b.runs == 6 -> "6"
                        b.runs == 0 -> "0"
                        else -> b.runs.toString()
                    },
                    isNew = isLastOver && i == bs.lastIndex
                )
            })
        }
    }

    suspend fun getMatchState(matchId: Int, adminCommand: AdminCommand? = null): MatchState? {
        val match = matchDao.getById(matchId) ?: return null
        val tournament = tournamentDao.getById(match.tournamentId) ?: return null
        val team1 = teamDao.getById(match.team1Id) ?: return null
        val team2 = teamDao.getById(match.team2Id) ?: return null
        val players1 = playerDao.getByTeam(match.team1Id)
        val players2 = playerDao.getByTeam(match.team2Id)

        val battingFirstId = determineBattingFirst(match)
        val battingSecondId = if (battingFirstId == match.team1Id) match.team2Id else match.team1Id

        val balls1 = ballDao.getByInnings(matchId, 1)
        val innings1 = if (balls1.isNotEmpty() || match.status != MatchStatus.NOT_STARTED) {
            val name = teamDao.getById(battingFirstId)?.name ?: ""
            computeInnings(balls1, 1, tournament.overs, name, tournament.overs)
                .copy(battingTeamId = battingFirstId, battingTeamName = name)
        } else null

        val balls2 = ballDao.getByInnings(matchId, 2)
        val innings2 = if (balls2.isNotEmpty() || match.status == MatchStatus.INNINGS_2 || match.status == MatchStatus.COMPLETED) {
            val name = teamDao.getById(battingSecondId)?.name ?: ""
            val s = computeInnings(balls2, 2, tournament.overs, name, tournament.overs)
            val target = innings1?.score?.plus(1)
            s.copy(battingTeamId = battingSecondId, battingTeamName = name)
        } else null

        val currentInnings = when (match.status) {
            MatchStatus.INNINGS_1   -> innings1
            MatchStatus.INNINGS_2   -> innings2
            MatchStatus.COMPLETED   -> innings2 ?: innings1
            else -> null
        }

        return MatchState(
            match = match, team1 = team1, team2 = team2,
            players1 = players1, players2 = players2,
            innings1 = innings1, innings2 = innings2,
            currentInnings = currentInnings,
            adminCommand = adminCommand
        )
    }

    // ── Tournament Standings ────────────────────────────────────
    suspend fun computeStandings(tournamentId: Int): List<TournamentStanding> {
        val teams   = teamDao.getByTournament(tournamentId)
        val matches = matchDao.getByTournament(tournamentId).filter { it.status == MatchStatus.COMPLETED }
        val t       = tournamentDao.getById(tournamentId) ?: return emptyList()

        val standMap = teams.associate { team -> team.id to TournamentStanding(team) }.toMutableMap()

        matches.forEach { m ->
            val result = m.result ?: return@forEach
            val batFirstId = determineBattingFirst(m)
            val batSecondId = if (batFirstId == m.team1Id) m.team2Id else m.team1Id
            val b1 = ballDao.getByInnings(m.id, 1)
            val b2 = ballDao.getByInnings(m.id, 2)
            val s1 = computeInnings(b1, 1, t.overs, "", t.overs)
            val s2 = computeInnings(b2, 2, t.overs, "", t.overs)

            val (winner, loser, winnerScore, loserScore, winnerBalls, loserBalls) =
                if (s2.score > s1.score)
                    listOf(batSecondId, batFirstId, s2.score, s1.score, s2.legalBalls, s1.legalBalls)
                else if (s1.score > s2.score)
                    listOf(batFirstId, batSecondId, s1.score, s2.score, s1.legalBalls, s2.legalBalls)
                else listOf(-1, -1, 0, 0, 0, 0) // tie

            val maxBalls = t.overs * 6.0

            if (winner == -1) {
                // Tie
                standMap[m.team1Id]  = standMap[m.team1Id]!!.let { it.copy(played = it.played+1, tied=it.tied+1, points=it.points+1) }
                standMap[m.team2Id]  = standMap[m.team2Id]!!.let { it.copy(played = it.played+1, tied=it.tied+1, points=it.points+1) }
            } else {
                val nrrAdd = (winnerScore as Int / (winnerBalls as Int / maxBalls)) - (loserScore as Int / (loserBalls as Int / maxBalls))
                standMap[winner as Int] = standMap[winner]!!.let { it.copy(played=it.played+1, won=it.won+1, points=it.points+2, nrr=it.nrr+nrrAdd) }
                standMap[loser as Int]  = standMap[loser]!!.let  { it.copy(played=it.played+1, lost=it.lost+1, nrr=it.nrr-nrrAdd) }
            }
        }

        return standMap.values.sortedWith(compareByDescending<TournamentStanding> { it.points }.thenByDescending { it.nrr })
    }

    // Helper: get player name (fast local lookup via cache ideally, simplified here)
    private val nameCache = mutableMapOf<Int, String>()
    private suspend fun playerName(id: Int): String =
        nameCache.getOrPut(id) { playerDao.getById(id)?.name ?: "Player $id" }
}
