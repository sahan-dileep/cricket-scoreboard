package com.cricket.scorer

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.cricket.scorer.data.db.CricketDatabase
import com.cricket.scorer.data.repository.CricketRepository
import com.cricket.scorer.server.CricketHttpServer
import com.cricket.scorer.ui.home.HomeScreen
import com.cricket.scorer.ui.teams.ManageTeamsScreen
import com.cricket.scorer.ui.scorecard.ScorecardScreen
import com.cricket.scorer.ui.scoring.ScoringScreen
import com.cricket.scorer.ui.setup.SetupScreen
import com.cricket.scorer.ui.theme.CricketScorerTheme
import com.cricket.scorer.ui.theme.DarkNavy
import com.cricket.scorer.ui.tournament.TournamentScreen

class MainActivity : ComponentActivity() {

    private lateinit var database: CricketDatabase
    private lateinit var repository: CricketRepository
    private var httpServer: CricketHttpServer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep screen on during live match scoring
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Initialize Database & Repository
        database = CricketDatabase.getInstance(this)
        repository = CricketRepository(
            tournamentDao = database.tournamentDao(),
            teamDao = database.teamDao(),
            playerDao = database.playerDao(),
            matchDao = database.matchDao(),
            ballDao = database.ballEventDao()
        )

        // Start embedded HTTP server on port 8080
        try {
            httpServer = CricketHttpServer(8080, repository).apply {
                start()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        setContent {
            CricketScorerTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = DarkNavy
                ) {
                    CricketScorerApp(repository = repository)
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            httpServer?.stop()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

@Composable
fun CricketScorerApp(repository: CricketRepository) {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "home"
    ) {
        composable("home") {
            HomeScreen(
                repository = repository,
                onNavigateToSetup = { navController.navigate("setup") },
                onNavigateToScoring = { matchId -> navController.navigate("scoring/$matchId") },
                onNavigateToScorecard = { matchId -> navController.navigate("scorecard/$matchId") },
                onNavigateToTournament = { tId -> navController.navigate("tournament/$tId") },
                onNavigateToManageTeams = { navController.navigate("manage_teams") }
            )
        }

        composable("setup") {
            SetupScreen(
                repository = repository,
                onNavigateBack = { navController.popBackStack() },
                onMatchStarted = { matchId ->
                    navController.navigate("scoring/$matchId") {
                        popUpTo("home")
                    }
                },
                onNavigateToManageTeams = { navController.navigate("manage_teams") }
            )
        }

        composable("manage_teams") {
            ManageTeamsScreen(
                repository = repository,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = "scoring/{matchId}",
            arguments = listOf(navArgument("matchId") { type = NavType.IntType })
        ) { backStackEntry ->
            val matchId = backStackEntry.arguments?.getInt("matchId") ?: 0
            ScoringScreen(
                matchId = matchId,
                repository = repository,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToScorecard = { mId -> navController.navigate("scorecard/$mId") },
                onNavigateToTournament = { tId -> navController.navigate("tournament/$tId") }
            )
        }

        composable(
            route = "scorecard/{matchId}",
            arguments = listOf(navArgument("matchId") { type = NavType.IntType })
        ) { backStackEntry ->
            val matchId = backStackEntry.arguments?.getInt("matchId") ?: 0
            ScorecardScreen(
                matchId = matchId,
                repository = repository,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = "tournament/{tournamentId}",
            arguments = listOf(navArgument("tournamentId") { type = NavType.IntType })
        ) { backStackEntry ->
            val tournamentId = backStackEntry.arguments?.getInt("tournamentId") ?: 0
            TournamentScreen(
                tournamentId = tournamentId,
                repository = repository,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
