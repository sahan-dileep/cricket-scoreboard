package com.cricket.scorer.data.repository

import com.cricket.scorer.data.db.*
import com.cricket.scorer.data.model.*
import java.math.BigDecimal
import java.math.RoundingMode

/**
 * Central repository — all cricket scoring business logic, NRR calculations,
 * and live match state management.
 */
class CricketRepository(
    private val tournamentDao: TournamentDao,
    private val teamDao: TeamDao,
    private val playerDao: PlayerDao,
    private val matchDao: MatchDao,
    private val ballDao: BallEventDao
) {
    private val nameCache = mutableMapOf<Int, String>()
    private val nextBatsmanMap = mutableMapOf<Int, Int>()

    fun setIncomingBatsman(matchId: Int, playerId: Int) {
        nextBatsmanMap[matchId] = playerId
    }

    fun getIncomingBatsman(matchId: Int): Int? = nextBatsmanMap[matchId]

    fun clearIncomingBatsman(matchId: Int) {
        nextBatsmanMap.remove(matchId)
    }

    suspend fun getTeamName(teamId: Int): String {
        return teamDao.getById(teamId)?.name ?: "Team $teamId"
    }

    suspend fun playerName(id: Int): String =
        nameCache.getOrPut(id) { playerDao.getById(id)?.name ?: "Player $id" }

    // ── Tournament ──────────────────────────────────────────────
    suspend fun createTournament(name: String, overs: Int, playersPerSide: Int): Int {
        return tournamentDao.insert(
            Tournament(name = name, overs = overs, playersPerSide = playersPerSide)
        ).toInt()
    }

    suspend fun getTournaments(): List<Tournament> = tournamentDao.getAll()
    suspend fun getTournament(id: Int): Tournament? = tournamentDao.getById(id)

    suspend fun getLatestTournament(): Tournament? {
        val all = tournamentDao.getAll()
        return all.firstOrNull()
    }

    // ── Teams & Players ─────────────────────────────────────────
    suspend fun addTeam(tournamentId: Int, name: String): Int =
        teamDao.insert(Team(tournamentId = tournamentId, name = name)).toInt()

    suspend fun addPlayer(teamId: Int, name: String, order: Int): Int =
        playerDao.insert(Player(teamId = teamId, name = name, battingOrder = order)).toInt()

    suspend fun getTeams(tournamentId: Int): List<Team> = teamDao.getByTournament(tournamentId)
    suspend fun getPlayers(teamId: Int): List<Player> = playerDao.getByTeam(teamId)

    // ── Match ───────────────────────────────────────────────────
    suspend fun createMatch(tournamentId: Int, team1Id: Int, team2Id: Int): Int =
        matchDao.insert(Match(tournamentId = tournamentId, team1Id = team1Id, team2Id = team2Id)).toInt()

    suspend fun setToss(matchId: Int, winnerId: Int, choice: TossChoice) {
        val match = matchDao.getById(matchId) ?: return
        matchDao.update(
            match.copy(
                tossWinnerId = winnerId,
                tossChoice = choice,
                status = MatchStatus.INNINGS_1
            )
        )
    }

    suspend fun getMatch(matchId: Int): Match? = matchDao.getById(matchId)
    suspend fun getMatches(tournamentId: Int): List<Match> = matchDao.getByTournament(tournamentId)

    suspend fun getLatestMatch(): Match? {
        val latestTournament = getLatestTournament() ?: return null
        val matches = matchDao.getByTournament(latestTournament.id)
        return matches.lastOrNull()
    }

    fun determineBattingFirst(match: Match): Int {
        val tossWinner = match.tossWinnerId ?: match.team1Id
        val choice = match.tossChoice ?: TossChoice.BAT
        return if (choice == TossChoice.BAT) {
            tossWinner
        } else {
            if (tossWinner == match.team1Id) match.team2Id else match.team1Id
        }
    }

    // ── Ball Entry & Undo ───────────────────────────────────────
    suspend fun addBall(event: BallEvent) {
        ballDao.insert(event)

        val match = matchDao.getById(event.matchId) ?: return
        val tournament = tournamentDao.getById(match.tournamentId) ?: return
        val balls = ballDao.getByInnings(event.matchId, event.innings)

        val battingTeamId = if (event.innings == 1) {
            determineBattingFirst(match)
        } else {
            val bat1 = determineBattingFirst(match)
            if (bat1 == match.team1Id) match.team2Id else match.team1Id
        }
        val teamName = getTeamName(battingTeamId)
        val battingPlayers = playerDao.getByTeam(battingTeamId)
        val summary = computeInnings(
            balls = balls,
            inningsNum = event.innings,
            maxOvers = tournament.overs,
            teamName = teamName,
            totalOvers = tournament.overs,
            matchId = event.matchId,
            battingPlayers = battingPlayers
        )

        // Clear next batsman override once that player enters action
        if (nextBatsmanMap[event.matchId] == event.batsmanId) {
            nextBatsmanMap.remove(event.matchId)
        }

        val legalBalls = summary.legalBalls
        val maxBalls = tournament.overs * 6

        if (event.innings == 1) {
            if (summary.wickets >= tournament.playersPerSide - 1 || legalBalls >= maxBalls) {
                advanceInnings(event.matchId, 1, match)
            }
        } else if (event.innings == 2) {
            val b1 = ballDao.getByInnings(event.matchId, 1)
            val s1 = computeInnings(b1, 1, tournament.overs, "", tournament.overs, matchId = event.matchId)
            val target = s1.score + 1

            if (summary.score >= target || summary.wickets >= tournament.playersPerSide - 1 || legalBalls >= maxBalls) {
                advanceInnings(event.matchId, 2, match)
            }
        }
    }

    suspend fun undoLastBall(matchId: Int) {
        val lastBall = ballDao.getLastBall(matchId) ?: return
        val match = matchDao.getById(matchId) ?: return

        // Under no circumstances should undoing an Innings 2 ball revert the match status to INNINGS_1,
        // or allow additional balls to be scored in Innings 1 once Innings 1 has ended.
        if (match.status == MatchStatus.INNINGS_2 && lastBall.innings == 1) {
            return
        }

        ballDao.deleteLastBall(matchId)
        nextBatsmanMap.remove(matchId)

        val b2 = ballDao.getByInnings(matchId, 2)
        val b1 = ballDao.getByInnings(matchId, 1)

        if (match.status == MatchStatus.COMPLETED) {
            if (lastBall.innings == 2) {
                matchDao.update(match.copy(status = MatchStatus.INNINGS_2, result = null))
            } else if (b1.isNotEmpty() && b2.isEmpty()) {
                matchDao.update(match.copy(status = MatchStatus.INNINGS_1, result = null))
            }
        } else if (match.status == MatchStatus.INNINGS_2) {
            // Undoing balls in Innings 2 must KEEP match status at INNINGS_2,
            // even if all balls in Innings 2 are undone (b2.isEmpty()).
            if (match.result != null) {
                matchDao.update(match.copy(result = null))
            }
        } else if (match.status == MatchStatus.INNINGS_1) {
            if (match.result != null) {
                matchDao.update(match.copy(result = null))
            }
        }
    }

    private suspend fun advanceInnings(matchId: Int, currentInnings: Int, match: Match) {
        when (currentInnings) {
            1 -> matchDao.update(match.copy(status = MatchStatus.INNINGS_2))
            2 -> {
                val result = computeResult(matchId, match)
                matchDao.update(match.copy(status = MatchStatus.COMPLETED, result = result))
            }
        }
    }

    suspend fun computeResult(matchId: Int, match: Match): String {
        val t = tournamentDao.getById(match.tournamentId) ?: return "Match complete"
        val b1 = ballDao.getByInnings(matchId, 1)
        val b2 = ballDao.getByInnings(matchId, 2)
        val s1 = computeInnings(b1, 1, t.overs, "", t.overs, matchId = matchId)
        val s2 = computeInnings(b2, 2, t.overs, "", t.overs, matchId = matchId)

        val batFirstId = determineBattingFirst(match)
        val batSecondId = if (batFirstId == match.team1Id) match.team2Id else match.team1Id
        val bat1Name = getTeamName(batFirstId)
        val bat2Name = getTeamName(batSecondId)

        val bat1Score = s1.score
        val bat2Score = s2.score

        return when {
            bat2Score > bat1Score -> {
                val wktsLeft = (t.playersPerSide - 1) - s2.wickets
                "$bat2Name won by $wktsLeft wicket${if (wktsLeft != 1) "s" else ""}"
            }
            bat1Score > bat2Score -> {
                val runDiff = bat1Score - bat2Score
                "$bat1Name won by $runDiff run${if (runDiff != 1) "s" else ""}"
            }
            else -> "Match tied!"
        }
    }

    // ── Innings Computation ─────────────────────────────────────
    suspend fun computeInnings(
        balls: List<BallEvent>,
        inningsNum: Int,
        maxOvers: Int,
        teamName: String,
        totalOvers: Int,
        defaultStrikerId: Int? = null,
        defaultNonStrikerId: Int? = null,
        defaultBowlerId: Int? = null,
        matchId: Int? = null,
        battingPlayers: List<Player>? = null
    ): InningsSummary {
        var score = 0
        var wickets = 0
        var extras = 0
        var legalBalls = 0

        val batsmanMap = mutableMapOf<Int, BatsmanScore>()
        val bowlerMap = mutableMapOf<Int, BowlerFigure>()
        val fow = mutableListOf<FallOfWicket>()
        var partRuns = 0
        var partBalls = 0
        var lastOutDesc = ""

        // Track bowler runs conceded per over to calculate maidens
        val bowlerOverRuns = mutableMapOf<Pair<Int, Int>, Int>()
        val bowlerOverLegalBalls = mutableMapOf<Pair<Int, Int>, Int>()

        val resolvedMatchId = matchId ?: balls.firstOrNull()?.matchId
        val matchObj = resolvedMatchId?.let { matchDao.getById(it) }
        val tournamentObj = matchObj?.let { tournamentDao.getById(it.tournamentId) }
        val totalPlayers = tournamentObj?.playersPerSide ?: 11

        val resolvedBattingPlayers: List<Player> = if (battingPlayers != null && battingPlayers.isNotEmpty()) {
            battingPlayers
        } else if (matchObj != null) {
            val batFirst = determineBattingFirst(matchObj)
            val batTeamId = if (inningsNum == 1) batFirst else (if (batFirst == matchObj.team1Id) matchObj.team2Id else matchObj.team1Id)
            playerDao.getByTeam(batTeamId)
        } else {
            emptyList()
        }

        var currentStrikerId = defaultStrikerId ?: resolvedBattingPlayers.firstOrNull()?.id ?: -1
        var currentNonStrikerId = defaultNonStrikerId ?: resolvedBattingPlayers.getOrNull(1)?.id ?: -1
        var currentBowlerId = defaultBowlerId ?: -1

        balls.forEach { b ->
            val isExtra = b.extraType != null
            val isWide = b.extraType == ExtraType.WIDE
            val isNoBall = b.extraType == ExtraType.NO_BALL
            val isLegal = !isWide && !isNoBall

            val totalBallRuns = b.runs + b.extraRuns
            score += totalBallRuns

            if (isLegal) legalBalls++
            if (isExtra) extras += b.extraRuns

            // Batsman runs: runs off bat (not for bye/leg-bye or wide penalty)
            val batsmanRuns = when (b.extraType) {
                ExtraType.BYE, ExtraType.LEG_BYE, ExtraType.WIDE -> 0
                else -> b.runs
            }

            val batName = playerName(b.batsmanId)
            val bat = batsmanMap.getOrDefault(b.batsmanId, BatsmanScore(b.batsmanId, playerName = batName))
            val newBatRuns = bat.runs + batsmanRuns
            val newBatBalls = bat.balls + if (isLegal) 1 else 0
            val newSr = if (newBatBalls > 0) {
                BigDecimal((newBatRuns.toDouble() / newBatBalls) * 100.0)
                    .setScale(1, RoundingMode.HALF_UP)
                    .toDouble()
            } else 0.0

            batsmanMap[b.batsmanId] = bat.copy(
                runs = newBatRuns,
                balls = newBatBalls,
                fours = bat.fours + if (b.runs == 4 && !isExtra) 1 else 0,
                sixes = bat.sixes + if (b.runs == 6 && !isExtra) 1 else 0,
                isOut = bat.isOut || b.isWicket,
                onStrike = if (bat.isOut || b.isWicket) false else bat.onStrike,
                isStriker = if (bat.isOut || b.isWicket) false else bat.isStriker,
                strikeRate = newSr,
                dismissalInfo = if (b.isWicket) {
                    val wType = b.wicketType?.name?.replace('_', ' ') ?: "OUT"
                    val bName = playerName(b.bowlerId)
                    val fName = b.fielderId?.let { playerName(it) }
                    when (b.wicketType) {
                        WicketType.CAUGHT -> if (fName != null) "c $fName b $bName" else "c & b $bName"
                        WicketType.BOWLED -> "b $bName"
                        WicketType.LBW -> "lbw b $bName"
                        WicketType.STUMPED -> if (fName != null) "st $fName b $bName" else "st b $bName"
                        WicketType.RUN_OUT -> if (fName != null) "run out ($fName)" else "run out"
                        WicketType.HIT_WICKET -> "hit wicket b $bName"
                        else -> wType
                    }
                } else bat.dismissalInfo
            )

            // Bowler figures
            // Byes and leg-byes are not debited against the bowler
            val bowlerDebitedRuns = when (b.extraType) {
                ExtraType.BYE, ExtraType.LEG_BYE -> 0
                else -> totalBallRuns
            }

            val bowlName = playerName(b.bowlerId)
            val bowl = bowlerMap.getOrDefault(b.bowlerId, BowlerFigure(b.bowlerId, playerName = bowlName))
            val isBowlerWicket = b.isWicket && b.wicketType != WicketType.RUN_OUT && b.wicketType != WicketType.RETIRED
            val newBowlBalls = bowl.legalBalls + if (isLegal) 1 else 0
            val newBowlRuns = bowl.runs + bowlerDebitedRuns
            val newBowlOvers = "${newBowlBalls / 6}.${newBowlBalls % 6}"
            val newBowlEcon = if (newBowlBalls > 0) {
                BigDecimal(newBowlRuns.toDouble() / (newBowlBalls / 6.0))
                    .setScale(2, RoundingMode.HALF_UP)
                    .toDouble()
            } else 0.0

            bowlerMap[b.bowlerId] = bowl.copy(
                legalBalls = newBowlBalls,
                overs = newBowlOvers,
                runs = newBowlRuns,
                wickets = bowl.wickets + if (isBowlerWicket) 1 else 0,
                economy = newBowlEcon
            )

            // Over-level stats for maidens
            val overKey = Pair(b.bowlerId, b.overNumber)
            bowlerOverRuns[overKey] = (bowlerOverRuns[overKey] ?: 0) + bowlerDebitedRuns
            bowlerOverLegalBalls[overKey] = (bowlerOverLegalBalls[overKey] ?: 0) + (if (isLegal) 1 else 0)

            // Wicket vs partnership
            if (b.isWicket) {
                wickets++
                val overStr = "${legalBalls / 6}.${legalBalls % 6}"
                fow.add(FallOfWicket(wickets, score, batName, overStr))
                lastOutDesc = "$batName ${batsmanMap[b.batsmanId]?.runs ?: 0} (${batsmanMap[b.batsmanId]?.balls ?: 0})"
                partRuns = 0
                partBalls = 0
            } else {
                partRuns += totalBallRuns
                partBalls += if (isLegal) 1 else 0
            }

            // Track active striker, non-striker, bowler
            currentBowlerId = b.bowlerId

            if (b.isWicket) {
                val dismissedId = b.batsmanId
                val survivingId = b.nonStrikerId
                val overEnded = isLegal && legalBalls > 0 && legalBalls % 6 == 0

                val isAllOut = wickets >= (totalPlayers - 1)
                if (isAllOut) {
                    currentStrikerId = -1
                    currentNonStrikerId = -1
                } else {
                    val manualNextId = nextBatsmanMap[resolvedMatchId]
                    val incomingBatsmanId = if (manualNextId != null && manualNextId > 0 &&
                        manualNextId != dismissedId && manualNextId != survivingId &&
                        batsmanMap[manualNextId]?.isOut != true &&
                        resolvedBattingPlayers.any { it.id == manualNextId }) {
                        manualNextId
                    } else {
                        resolvedBattingPlayers.firstOrNull { p ->
                            p.id != dismissedId && p.id != survivingId && batsmanMap[p.id]?.isOut != true
                        }?.id ?: -1
                    }

                    if (overEnded) {
                        currentStrikerId = survivingId
                        currentNonStrikerId = incomingBatsmanId
                    } else {
                        currentStrikerId = incomingBatsmanId
                        currentNonStrikerId = survivingId
                    }
                }
            } else {
                currentStrikerId = b.batsmanId
                currentNonStrikerId = b.nonStrikerId

                // Strike rotation on runs:
                // 1, 3 runs swap batsmen
                val runningRuns = when (b.extraType) {
                    ExtraType.WIDE -> 0
                    else -> b.runs
                }
                if (runningRuns % 2 != 0) {
                    val temp = currentStrikerId
                    currentStrikerId = currentNonStrikerId
                    currentNonStrikerId = temp
                }

                // End of over: strike rotates
                if (isLegal && legalBalls > 0 && legalBalls % 6 == 0) {
                    val temp = currentStrikerId
                    currentStrikerId = currentNonStrikerId
                    currentNonStrikerId = temp
                }
            }
        }

        // Compute maidens for each bowler
        val updatedBowlers = bowlerMap.values.map { bf ->
            val maidens = bowlerOverLegalBalls.entries.count { (key, balls) ->
                key.first == bf.playerId && balls >= 6 && (bowlerOverRuns[key] ?: 0) == 0
            }
            bf.copy(maidens = maidens)
        }

        // Identify current 2 active batsmen at crease
        val activeBatsmen: List<BatsmanScore> = if (balls.isNotEmpty()) {
            val list = mutableListOf<BatsmanScore>()
            if (currentStrikerId > 0) {
                val striker = batsmanMap[currentStrikerId] ?: BatsmanScore(
                    playerId = currentStrikerId,
                    playerName = playerName(currentStrikerId)
                )
                if (!striker.isOut) {
                    list.add(striker.copy(onStrike = true, isStriker = true))
                }
            }
            if (currentNonStrikerId > 0 && currentNonStrikerId != currentStrikerId) {
                val nonStriker = batsmanMap[currentNonStrikerId] ?: BatsmanScore(
                    playerId = currentNonStrikerId,
                    playerName = playerName(currentNonStrikerId)
                )
                if (!nonStriker.isOut) {
                    list.add(nonStriker.copy(onStrike = false, isStriker = false))
                }
            }
            list
        } else if (defaultStrikerId != null && defaultNonStrikerId != null) {
            listOf(
                BatsmanScore(defaultStrikerId, playerName = playerName(defaultStrikerId), onStrike = true, isStriker = true),
                BatsmanScore(defaultNonStrikerId, playerName = playerName(defaultNonStrikerId), onStrike = false, isStriker = false)
            )
        } else if (resolvedBattingPlayers.isNotEmpty()) {
            val sId = resolvedBattingPlayers[0].id
            val nsId = resolvedBattingPlayers.getOrNull(1)?.id
            val list = mutableListOf<BatsmanScore>()
            list.add(BatsmanScore(sId, playerName = playerName(sId), onStrike = true, isStriker = true))
            if (nsId != null && nsId != sId) {
                list.add(BatsmanScore(nsId, playerName = playerName(nsId), onStrike = false, isStriker = false))
            }
            list
        } else {
            emptyList()
        }

        val allBattedBatsmen = batsmanMap.values.map {
            if (it.isOut) it.copy(onStrike = false, isStriker = false) else it
        }
        val combinedBatsmen = if (activeBatsmen.isNotEmpty()) {
            (activeBatsmen + allBattedBatsmen.filter { it.isOut }).distinctBy { it.playerId }
        } else {
            allBattedBatsmen
        }

        val activeBowler = if (currentBowlerId > 0) {
            updatedBowlers.find { it.playerId == currentBowlerId } ?: BowlerFigure(
                playerId = currentBowlerId,
                playerName = playerName(currentBowlerId)
            )
        } else null

        val recentBalls = computeRecentBalls(balls)

        val ovStr = "${legalBalls / 6}.${legalBalls % 6}"
        val runRate = if (legalBalls > 0) {
            BigDecimal(score.toDouble() / (legalBalls / 6.0))
                .setScale(2, RoundingMode.HALF_UP)
                .toDouble()
        } else 0.0

        return InningsSummary(
            innings = inningsNum,
            battingTeamId = 0,
            battingTeamName = teamName,
            battingTeam = teamName,
            bowlingTeam = "",
            score = score,
            totalRuns = score,
            wickets = wickets,
            totalWickets = wickets,
            legalBalls = legalBalls,
            totalBalls = legalBalls,
            currentOverBalls = legalBalls % 6,
            totalOvers = totalOvers,
            overs = ovStr,
            oversString = ovStr,
            extras = extras,
            runRate = runRate,
            lastWicket = if (lastOutDesc.isNotEmpty()) lastOutDesc else null,
            batsmen = combinedBatsmen,
            bowlers = updatedBowlers,
            currentBowler = activeBowler,
            fallOfWickets = fow,
            recentBalls = recentBalls,
            partnership = Partnership(partRuns, partBalls)
        )
    }

    private fun computeRecentBalls(balls: List<BallEvent>): List<OverBalls> {
        val byOver = balls.groupBy { it.overNumber }
        val allOvers = byOver.keys.sorted()
        val recentOvers = allOvers.takeLast(3)

        return recentOvers.map { ov ->
            val bs = byOver[ov] ?: emptyList()
            val isLastOver = ov == allOvers.lastOrNull()

            OverBalls(
                overNumber = ov + 1, // 1-indexed for display
                balls = bs.mapIndexed { i, b ->
                    val isExtra = b.extraType != null
                    val isWicket = b.isWicket
                    val label = when {
                        isWicket -> "W"
                        b.extraType == ExtraType.WIDE -> if (b.extraRuns > 1) "WD+${b.extraRuns - 1}" else "WD"
                        b.extraType == ExtraType.NO_BALL -> if (b.runs > 0) "NB+${b.runs}" else "NB"
                        b.extraType == ExtraType.BYE -> "B${b.extraRuns}"
                        b.extraType == ExtraType.LEG_BYE -> "LB${b.extraRuns}"
                        b.runs == 0 -> "0"
                        b.runs == 4 -> "4"
                        b.runs == 6 -> "6"
                        else -> b.runs.toString()
                    }

                    val color = when {
                        isWicket -> "red"
                        b.extraType == ExtraType.WIDE || b.extraType == ExtraType.NO_BALL -> "purple"
                        b.extraType == ExtraType.BYE || b.extraType == ExtraType.LEG_BYE -> "cyan"
                        b.runs == 4 -> "green"
                        b.runs == 6 -> "orange"
                        b.runs == 0 -> "grey"
                        else -> "blue"
                    }

                    BallDisplay(
                        label = label,
                        text = label,
                        runs = b.runs + b.extraRuns,
                        isWicket = isWicket,
                        isExtra = isExtra,
                        color = color,
                        isNew = isLastOver && i == bs.lastIndex
                    )
                }
            )
        }
    }

    // ── Match State & DTO Construction ──────────────────────────
    suspend fun getMatchState(matchId: Int, adminCommand: AdminCommand? = null): MatchState? {
        val match = matchDao.getById(matchId) ?: return null
        val tournament = tournamentDao.getById(match.tournamentId) ?: return null
        val team1 = teamDao.getById(match.team1Id) ?: return null
        val team2 = teamDao.getById(match.team2Id) ?: return null
        val players1 = playerDao.getByTeam(match.team1Id)
        val players2 = playerDao.getByTeam(match.team2Id)

        val batFirstId = determineBattingFirst(match)
        val batSecondId = if (batFirstId == match.team1Id) match.team2Id else match.team1Id

        val balls1 = ballDao.getByInnings(matchId, 1)
        val innings1 = if (balls1.isNotEmpty() || match.status != MatchStatus.NOT_STARTED) {
            val name = getTeamName(batFirstId)
            val bowlName = getTeamName(batSecondId)
            computeInnings(
                balls = balls1,
                inningsNum = 1,
                maxOvers = tournament.overs,
                teamName = name,
                totalOvers = tournament.overs,
                matchId = matchId,
                battingPlayers = if (batFirstId == match.team1Id) players1 else players2
            ).copy(battingTeamId = batFirstId, battingTeamName = name, bowlingTeam = bowlName)
        } else null

        val balls2 = ballDao.getByInnings(matchId, 2)
        val innings2 = if (balls2.isNotEmpty() || match.status == MatchStatus.INNINGS_2 || match.status == MatchStatus.COMPLETED) {
            val name = getTeamName(batSecondId)
            val bowlName = getTeamName(batFirstId)
            val s = computeInnings(
                balls = balls2,
                inningsNum = 2,
                maxOvers = tournament.overs,
                teamName = name,
                totalOvers = tournament.overs,
                matchId = matchId,
                battingPlayers = if (batSecondId == match.team1Id) players1 else players2
            )
            val target = (innings1?.score ?: 0) + 1
            val needed = (target - s.score).coerceAtLeast(0)
            val remainingBalls = ((tournament.overs * 6) - s.legalBalls).coerceAtLeast(0)
            val rrr = if (remainingBalls > 0) {
                BigDecimal((needed.toDouble() * 6.0) / remainingBalls)
                    .setScale(2, RoundingMode.HALF_UP)
                    .toDouble()
            } else 0.0

            s.copy(
                battingTeamId = batSecondId,
                battingTeamName = name,
                bowlingTeam = bowlName,
                requiredRuns = needed,
                requiredOvers = BigDecimal(remainingBalls / 6.0).setScale(1, RoundingMode.HALF_UP).toDouble(),
                requiredRunRate = rrr
            )
        } else null

        val currentInnings = when (match.status) {
            MatchStatus.INNINGS_1 -> innings1
            MatchStatus.INNINGS_2 -> innings2
            MatchStatus.COMPLETED -> innings2 ?: innings1
            else -> innings1
        }

        return MatchState(
            match = match,
            team1 = team1,
            team2 = team2,
            players1 = players1,
            players2 = players2,
            innings1 = innings1,
            innings2 = innings2,
            currentInnings = currentInnings,
            adminCommand = adminCommand
        )
    }

    suspend fun buildScoreResponse(matchId: Int, adminCommand: AdminCommand? = null): ScoreResponse? {
        val state = getMatchState(matchId, adminCommand) ?: return null
        val match = state.match
        val tournament = tournamentDao.getById(match.tournamentId) ?: return null

        val batFirstId = determineBattingFirst(match)
        val batSecondId = if (batFirstId == match.team1Id) match.team2Id else match.team1Id
        val team1Name = getTeamName(batFirstId)
        val team2Name = getTeamName(batSecondId)

        val currentInnings = state.currentInnings ?: InningsSummary(
            innings = if (match.status == MatchStatus.INNINGS_2) 2 else 1,
            battingTeamId = batFirstId,
            battingTeamName = team1Name,
            totalOvers = tournament.overs
        )

        val innings1Dto = state.innings1?.let {
            Innings1Dto(score = it.score, wickets = it.wickets, overs = it.oversString)
        }

        val matchDto = MatchDto(
            id = match.id,
            team1 = team1Name,
            team2 = team2Name,
            totalOvers = tournament.overs,
            currentInnings = if (match.status == MatchStatus.INNINGS_2) 2 else 1,
            isCompleted = match.status == MatchStatus.COMPLETED,
            status = match.status.name,
            result = match.result,
            innings1 = innings1Dto
        )

        val chaseDto = if (match.status == MatchStatus.INNINGS_2 || (match.status == MatchStatus.COMPLETED && state.innings2 != null)) {
            val target = (state.innings1?.score ?: 0) + 1
            val needed = (target - (state.innings2?.score ?: 0)).coerceAtLeast(0)
            val remBalls = ((tournament.overs * 6) - (state.innings2?.legalBalls ?: 0)).coerceAtLeast(0)
            val rrr = if (remBalls > 0) {
                BigDecimal((needed.toDouble() * 6.0) / remBalls).setScale(2, RoundingMode.HALF_UP).toDouble()
            } else 0.0
            ChaseDto(targetRuns = target, runsNeeded = needed, ballsRemaining = remBalls, requiredRunRate = rrr)
        } else null

        val activeBatsmen = currentInnings.batsmen.filter { !it.isOut }.take(2)

        return ScoreResponse(
            match = matchDto,
            currentInnings = currentInnings,
            batting = activeBatsmen.ifEmpty { currentInnings.batsmen.take(2) },
            bowler = currentInnings.currentBowler,
            partnership = currentInnings.partnership,
            recentBalls = currentInnings.recentBalls,
            chase = chaseDto,
            adminCommand = adminCommand
        )
    }

    // ── Tournament Standings & Net Run Rate (NRR) ────────────────
    suspend fun computeStandings(tournamentId: Int): List<TournamentStanding> {
        val teams = teamDao.getByTournament(tournamentId)
        val matches = matchDao.getByTournament(tournamentId).filter { it.status == MatchStatus.COMPLETED }
        val tournament = tournamentDao.getById(tournamentId) ?: return emptyList()

        val fullQuotaBalls = tournament.overs * 6.0

        // Team stats accumulation
        data class TeamAccumulator(
            var played: Int = 0,
            var won: Int = 0,
            var lost: Int = 0,
            var tied: Int = 0,
            var points: Int = 0,
            var runsScored: Int = 0,
            var ballsFaced: Double = 0.0,
            var runsConceded: Int = 0,
            var ballsBowled: Double = 0.0
        )

        val accMap = teams.associate { it.id to TeamAccumulator() }.toMutableMap()

        matches.forEach { m ->
            val b1 = ballDao.getByInnings(m.id, 1)
            val b2 = ballDao.getByInnings(m.id, 2)
            val s1 = computeInnings(b1, 1, tournament.overs, "", tournament.overs, matchId = m.id)
            val s2 = computeInnings(b2, 2, tournament.overs, "", tournament.overs, matchId = m.id)

            val batFirstId = determineBattingFirst(m)
            val batSecondId = if (batFirstId == m.team1Id) m.team2Id else m.team1Id

            val acc1 = accMap[batFirstId] ?: return@forEach
            val acc2 = accMap[batSecondId] ?: return@forEach

            acc1.played++
            acc2.played++

            // Match points (Win = 2, Tie = 1, Loss = 0)
            when {
                s1.score > s2.score -> {
                    acc1.won++
                    acc1.points += 2
                    acc2.lost++
                }
                s2.score > s1.score -> {
                    acc2.won++
                    acc2.points += 2
                    acc1.lost++
                }
                else -> {
                    acc1.tied++
                    acc1.points += 1
                    acc2.tied++
                    acc2.points += 1
                }
            }

            // NRR overs rule: if a team is bowled out, overs faced is treated as the full quota
            val team1BallsFaced = if (s1.wickets >= tournament.playersPerSide - 1) {
                fullQuotaBalls
            } else {
                s1.legalBalls.toDouble()
            }

            val team2BallsFaced = if (s2.wickets >= tournament.playersPerSide - 1) {
                fullQuotaBalls
            } else {
                s2.legalBalls.toDouble()
            }

            acc1.runsScored += s1.score
            acc1.ballsFaced += team1BallsFaced
            acc1.runsConceded += s2.score
            acc1.ballsBowled += team2BallsFaced

            acc2.runsScored += s2.score
            acc2.ballsFaced += team2BallsFaced
            acc2.runsConceded += s1.score
            acc2.ballsBowled += team1BallsFaced
        }

        return teams.map { team ->
            val acc = accMap[team.id] ?: TeamAccumulator()
            val oversFaced = acc.ballsFaced / 6.0
            val oversBowled = acc.ballsBowled / 6.0

            val forRate = if (oversFaced > 0.0) acc.runsScored / oversFaced else 0.0
            val againstRate = if (oversBowled > 0.0) acc.runsConceded / oversBowled else 0.0

            val rawNrr = forRate - againstRate
            val roundedNrr = BigDecimal(rawNrr).setScale(3, RoundingMode.HALF_UP).toDouble()

            TournamentStanding(
                team = team,
                played = acc.played,
                won = acc.won,
                lost = acc.lost,
                tied = acc.tied,
                points = acc.points,
                nrr = roundedNrr
            )
        }.sortedWith(
            compareByDescending<TournamentStanding> { it.points }
                .thenByDescending { it.nrr }
        )
    }

    suspend fun buildTournamentResponse(tournamentId: Int): TournamentResponse? {
        val t = tournamentDao.getById(tournamentId) ?: return null
        val teams = teamDao.getByTournament(tournamentId)
        val standings = computeStandings(tournamentId)

        return TournamentResponse(
            tournamentId = t.id,
            name = t.name,
            overs = t.overs,
            teams = teams.map { it.name },
            standings = standings.map {
                TournamentStandingDto(
                    teamName = it.team.name,
                    played = it.played,
                    won = it.won,
                    lost = it.lost,
                    tied = it.tied,
                    points = it.points,
                    nrr = it.nrr
                )
            }
        )
    }
}
