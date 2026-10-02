package com.cricket.scorer.data.db

import androidx.room.*
import com.cricket.scorer.data.model.*

// ── Type Converters ─────────────────────
class Converters {
    @TypeConverter fun fromMatchStatus(v: MatchStatus): String = v.name
    @TypeConverter fun toMatchStatus(v: String): MatchStatus = MatchStatus.valueOf(v)
    @TypeConverter fun fromTossChoice(v: TossChoice?): String? = v?.name
    @TypeConverter fun toTossChoice(v: String?): TossChoice? = v?.let { TossChoice.valueOf(it) }
    @TypeConverter fun fromExtraType(v: ExtraType?): String? = v?.name
    @TypeConverter fun toExtraType(v: String?): ExtraType? = v?.let { ExtraType.valueOf(it) }
    @TypeConverter fun fromWicketType(v: WicketType?): String? = v?.name
    @TypeConverter fun toWicketType(v: String?): WicketType? = v?.let { WicketType.valueOf(it) }
}

// ── DAOs ───────────────────────────────

@Dao
interface TournamentDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(tournament: Tournament): Long

    @Update suspend fun update(tournament: Tournament)

    @Query("SELECT * FROM tournaments ORDER BY createdAt DESC")
    suspend fun getAll(): List<Tournament>

    @Query("SELECT * FROM tournaments WHERE id = :id")
    suspend fun getById(id: Int): Tournament?
}

@Dao
interface TeamDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(team: Team): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(teams: List<Team>)

    @Update suspend fun update(team: Team)

    @Query("SELECT * FROM teams WHERE tournamentId = :tournamentId")
    suspend fun getByTournament(tournamentId: Int): List<Team>

    @Query("SELECT * FROM teams WHERE id = :id")
    suspend fun getById(id: Int): Team?
}

@Dao
interface PlayerDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(player: Player): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(players: List<Player>)

    @Update suspend fun update(player: Player)
    @Delete suspend fun delete(player: Player)

    @Query("SELECT * FROM players WHERE teamId = :teamId ORDER BY battingOrder")
    suspend fun getByTeam(teamId: Int): List<Player>

    @Query("SELECT * FROM players WHERE id = :id")
    suspend fun getById(id: Int): Player?
}

@Dao
interface MatchDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(match: Match): Long

    @Update suspend fun update(match: Match)

    @Query("SELECT * FROM matches WHERE tournamentId = :tournamentId")
    suspend fun getByTournament(tournamentId: Int): List<Match>

    @Query("SELECT * FROM matches WHERE id = :id")
    suspend fun getById(id: Int): Match?
}

@Dao
interface BallEventDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(event: BallEvent): Long

    @Delete suspend fun delete(event: BallEvent)

    @Query("SELECT * FROM ball_events WHERE matchId = :matchId AND innings = :innings ORDER BY id")
    suspend fun getByInnings(matchId: Int, innings: Int): List<BallEvent>

    @Query("SELECT * FROM ball_events WHERE matchId = :matchId ORDER BY id DESC LIMIT 1")
    suspend fun getLastBall(matchId: Int): BallEvent?

    @Query("DELETE FROM ball_events WHERE id = (SELECT MAX(id) FROM ball_events WHERE matchId = :matchId)")
    suspend fun deleteLastBall(matchId: Int)
}

// ── Database ───────────────────────────

@Database(
    entities = [Tournament::class, Team::class, Player::class, Match::class, BallEvent::class],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class CricketDatabase : RoomDatabase() {
    abstract fun tournamentDao(): TournamentDao
    abstract fun teamDao(): TeamDao
    abstract fun playerDao(): PlayerDao
    abstract fun matchDao(): MatchDao
    abstract fun ballEventDao(): BallEventDao

    companion object {
        @Volatile private var INSTANCE: CricketDatabase? = null

        fun getInstance(context: android.content.Context): CricketDatabase =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    CricketDatabase::class.java,
                    "cricket_scorer.db"
                ).build().also { INSTANCE = it }
            }
    }
}
