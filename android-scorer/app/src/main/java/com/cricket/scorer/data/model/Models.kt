package com.cricket.scorer.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import com.cricket.scorer.data.db.Converters

// ════════════════════════════════════════
//  Domain Models
// ════════════════════════════════════════

@Entity(tableName = "tournaments")
data class Tournament(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val name: String,
    val overs: Int = 10,           // Overs per side
    val playersPerSide: Int = 11,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "teams")
data class Team(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val tournamentId: Int,
    val name: String
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
    val ballNumber: Int,       // 0-indexed (legal balls only for counting)
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
//  Computed / Aggregate Models (not stored)
// ════════════════════════════════════════

data class BatsmanScore(
    val playerId: Int,
    val playerName: String,
    val runs: Int = 0,
    val balls: Int = 0,
    val fours: Int = 0,
    val sixes: Int = 0,
    val isOut: Boolean = false,
    val dismissalInfo: String = "",
    val onStrike: Boolean = false
) {
    val strikeRate: Double get() = if (balls > 0) (runs.toDouble() / balls) * 100 else 0.0
}

data class BowlerFigure(
    val playerId: Int,
    val playerName: String,
    val legalBalls: Int = 0,
    val runs: Int = 0,
    val wickets: Int = 0,
    val maidens: Int = 0
) {
    val overs: String get() {
        val ov = legalBalls / 6
        val bl = legalBalls % 6
        return "$ov.$bl"
    }
    val economy: Double get() {
        val ov = legalBalls / 6.0
        return if (ov > 0) runs / ov else 0.0
    }
}

data class InningsSummary(
    val innings: Int,
    val battingTeamId: Int,
    val battingTeamName: String,
    val score: Int = 0,
    val wickets: Int = 0,
    val legalBalls: Int = 0,
    val totalOvers: Int,
    val extras: Int = 0,
    val batsmen: List<BatsmanScore> = emptyList(),
    val bowlers: List<BowlerFigure> = emptyList(),
    val fallOfWickets: List<FallOfWicket> = emptyList(),
    val recentBalls: List<OverBalls> = emptyList(),
    val partnership: Partnership = Partnership()
) {
    val oversString: String get() {
        val ov = legalBalls / 6
        val bl = legalBalls % 6
        return "$ov.$bl"
    }
    val runRate: Double get() {
        val ov = legalBalls / 6.0
        return if (ov > 0) score / ov else 0.0
    }
}

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

data class OverBalls(
    val overNumber: Int,
    val balls: List<BallDisplay>
)

data class BallDisplay(
    val label: String,   // "0","1","2","3","4","6","W","WD","NB"
    val isNew: Boolean = false
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

data class AdminCommand(
    val action: String,    // PLAY_VIDEO_AD, PLAY_IMAGE_AD, STOP_AD, PLAY_MUSIC, STOP_MUSIC
    val src: String? = null,
    val loop: Boolean = false
)

data class TournamentStanding(
    val team: Team,
    val played: Int = 0,
    val won: Int = 0,
    val lost: Int = 0,
    val tied: Int = 0,
    val noResult: Int = 0,
    val points: Int = 0,
    val nrr: Double = 0.0   // Net Run Rate
)
