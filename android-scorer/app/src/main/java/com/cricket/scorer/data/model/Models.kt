package com.cricket.scorer.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

// ════════════════════════════════════════
//  Room Database Entities
// ════════════════════════════════════════

@Entity(tableName = "tournaments")
data class Tournament(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val name: String,
    val overs: Int = 10,           // Overs per side (10-15)
    val playersPerSide: Int = 11,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "teams")
data class Team(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val tournamentId: Int,
    val name: String
)

data class TeamWithPlayers(
    val id: Int = 0,
    val name: String,
    val tournamentId: Int = 0,
    val players: List<String> = emptyList()
)

@Entity(tableName = "players")
data class Player(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val teamId: Int,
    val name: String,
    val battingOrder: Int = 0
)

@Entity(tableName = "matches")
data class Match(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val tournamentId: Int,
    val team1Id: Int,
    val team2Id: Int,
    val status: MatchStatus = MatchStatus.NOT_STARTED,
    val tossWinnerId: Int? = null,
    val tossChoice: TossChoice? = null,  // BAT or BOWL
    val result: String? = null           // e.g. "Team A won by 5 runs"
)

enum class MatchStatus { NOT_STARTED, INNINGS_1, INNINGS_2, COMPLETED }
enum class TossChoice  { BAT, BOWL }

@Entity(tableName = "ball_events")
data class BallEvent(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val matchId: Int,
    val innings: Int,          // 1 or 2
    val overNumber: Int,       // 0-indexed
    val ballNumber: Int,       // 0-indexed (legal balls only)
    val runs: Int = 0,
    val extraType: ExtraType? = null,
    val extraRuns: Int = 0,
    val isWicket: Boolean = false,
    val wicketType: WicketType? = null,
    val batsmanId: Int,
    val bowlerId: Int,
    val nonStrikerId: Int,
    val fielderId: Int? = null    // For caught/run-out
)

enum class ExtraType { WIDE, NO_BALL, BYE, LEG_BYE }
enum class WicketType { BOWLED, CAUGHT, RUN_OUT, LBW, STUMPED, HIT_WICKET, RETIRED }

// ════════════════════════════════════════
//  Computed / Scorecard Data Models
// ════════════════════════════════════════

data class BatsmanScore(
    val playerId: Int = 0,
    val id: Int = playerId,
    val playerName: String,
    val name: String = playerName,
    val runs: Int = 0,
    val balls: Int = 0,
    val fours: Int = 0,
    val sixes: Int = 0,
    val isOut: Boolean = false,
    val dismissalInfo: String = "",
    val onStrike: Boolean = false,
    val isStriker: Boolean = onStrike,
    val strikeRate: Double = if (balls > 0) Math.round((runs.toDouble() / balls * 100) * 10.0) / 10.0 else 0.0
)

data class BowlerFigure(
    val playerId: Int = 0,
    val id: Int = playerId,
    val playerName: String,
    val name: String = playerName,
    val legalBalls: Int = 0,
    val overs: String = "${legalBalls / 6}.${legalBalls % 6}",
    val maidens: Int = 0,
    val runs: Int = 0,
    val wickets: Int = 0,
    val economy: Double = if (legalBalls > 0) Math.round((runs.toDouble() / (legalBalls / 6.0)) * 100.0) / 100.0 else 0.0
)

data class FallOfWicket(
    val wicketNumber: Int,
    val score: Int,
    val batsman: String,
    val overs: String
)

data class Partnership(
    val runs: Int = 0,
    val balls: Int = 0
)

data class BallDisplay(
    val label: String,   // "0","1","2","3","4","6","W","WD","NB","B","LB"
    val text: String = label,
    val runs: Int = 0,
    val isWicket: Boolean = false,
    val isExtra: Boolean = false,
    val color: String = "grey",
    val isNew: Boolean = false
)

data class OverBalls(
    val overNumber: Int,
    val balls: List<BallDisplay>
)

data class InningsSummary(
    val innings: Int,
    val battingTeamId: Int,
    val battingTeamName: String,
    val battingTeam: String = battingTeamName,
    val bowlingTeam: String = "",
    val score: Int = 0,
    val totalRuns: Int = score,
    val wickets: Int = 0,
    val totalWickets: Int = wickets,
    val legalBalls: Int = 0,
    val totalBalls: Int = legalBalls,
    val currentOverBalls: Int = legalBalls % 6,
    val totalOvers: Int,
    val overs: String = "${legalBalls / 6}.${legalBalls % 6}",
    val oversString: String = overs,
    val extras: Int = 0,
    val runRate: Double = if (legalBalls > 0) Math.round((score.toDouble() / (legalBalls / 6.0)) * 100.0) / 100.0 else 0.0,
    val lastWicket: String? = null,
    val requiredRuns: Int? = null,
    val requiredOvers: Double? = null,
    val requiredRunRate: Double? = null,
    val batsmen: List<BatsmanScore> = emptyList(),
    val bowlers: List<BowlerFigure> = emptyList(),
    val currentBowler: BowlerFigure? = null,
    val fallOfWickets: List<FallOfWicket> = emptyList(),
    val recentBalls: List<OverBalls> = emptyList(),
    val partnership: Partnership = Partnership()
)

data class AdminCommand(
    val id: String = UUID.randomUUID().toString(),
    val action: String,
    val type: String = action,
    val command: String = action,
    val src: String? = null,
    val loop: Boolean = false,
    val payload: Map<String, Any?>? = null,
    val timestamp: Long = System.currentTimeMillis()
)

data class MatchDto(
    val id: Int,
    val team1: String,
    val team2: String,
    val totalOvers: Int,
    val currentInnings: Int,
    val isCompleted: Boolean,
    val status: String,
    val result: String? = null,
    val innings1: Innings1Dto? = null,
    val innings2: Innings1Dto? = null
)

data class Innings1Dto(
    val score: Int,
    val wickets: Int,
    val overs: String
)

data class ChaseDto(
    val targetRuns: Int,
    val runsNeeded: Int,
    val ballsRemaining: Int,
    val requiredRunRate: Double
)

data class ScoreResponse(
    val match: MatchDto,
    val currentInnings: InningsSummary,
    val batting: List<BatsmanScore> = currentInnings.batsmen,
    val bowler: BowlerFigure? = currentInnings.currentBowler,
    val partnership: Partnership = currentInnings.partnership,
    val recentBalls: List<OverBalls> = currentInnings.recentBalls,
    val chase: ChaseDto? = null,
    val adminCommand: AdminCommand? = null
)

data class TournamentStanding(
    val team: Team,
    val played: Int = 0,
    val won: Int = 0,
    val lost: Int = 0,
    val tied: Int = 0,
    val noResult: Int = 0,
    val points: Int = 0,
    val nrr: Double = 0.0
)

data class TournamentStandingDto(
    val teamName: String,
    val played: Int,
    val won: Int,
    val lost: Int,
    val tied: Int,
    val points: Int,
    val nrr: Double
)

data class TournamentResponse(
    val tournamentId: Int,
    val name: String,
    val overs: Int,
    val teams: List<String>,
    val standings: List<TournamentStandingDto>
)

data class MatchState(
    val match: Match,
    val team1: Team,
    val team2: Team,
    val players1: List<Player>,
    val players2: List<Player>,
    val innings1: InningsSummary? = null,
    val innings2: InningsSummary? = null,
    val currentInnings: InningsSummary? = null,
    val adminCommand: AdminCommand? = null
)
