package com.cricket.scorer.server

import com.cricket.scorer.data.model.*
import com.cricket.scorer.data.repository.CricketRepository
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonParser
import fi.iki.elonen.NanoHTTPD
import kotlinx.coroutines.runBlocking
import java.util.HashMap

/**
 * Embedded NanoHTTPD server exposing cricket scoring REST APIs on port 8080.
 * Endpoints:
 * - GET /api/score
 * - POST /api/admin/command
 * - GET /api/tournament
 * Full CORS enabled for web scoreboard polling.
 */
class CricketHttpServer(
    port: Int = 8080,
    private val repository: CricketRepository
) : NanoHTTPD(port) {

    private val gson: Gson = GsonBuilder().setPrettyPrinting().create()

    @Volatile
    var currentAdminCommand: AdminCommand? = null

    override fun serve(session: IHTTPSession): Response {
        val method = session.method
        val uri = session.uri

        // Handle CORS preflight
        if (method == Method.OPTIONS) {
            val response = newFixedLengthResponse(Response.Status.OK, "application/json", "{}")
            addCorsHeaders(response)
            return response
        }

        val response = try {
            when {
                method == Method.GET && (uri == "/api/score" || uri == "/api/score/") -> {
                    handleGetScore(session)
                }
                method == Method.POST && (uri == "/api/admin/command" || uri == "/api/admin/command/") -> {
                    handlePostAdminCommand(session)
                }
                method == Method.GET && (uri == "/api/tournament" || uri == "/api/tournament/") -> {
                    handleGetTournament(session)
                }
                else -> {
                    newFixedLengthResponse(
                        Response.Status.NOT_FOUND,
                        "application/json",
                        "{\"error\":\"Endpoint not found\"}"
                    )
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "application/json",
                "{\"error\":\"${e.message}\"}"
            )
        }

        addCorsHeaders(response)
        return response
    }

    private fun handleGetScore(session: IHTTPSession): Response {
        val matchIdStr = session.parameters["matchId"]?.firstOrNull()
        val scoreResponse = runBlocking {
            val matchId = matchIdStr?.toIntOrNull()
            if (matchId != null) {
                repository.buildScoreResponse(matchId, currentAdminCommand)
            } else {
                val latest = repository.getLatestMatch()
                if (latest != null) {
                    repository.buildScoreResponse(latest.id, currentAdminCommand)
                } else {
                    buildFallbackScoreResponse()
                }
            }
        } ?: buildFallbackScoreResponse()

        return newFixedLengthResponse(
            Response.Status.OK,
            "application/json",
            gson.toJson(scoreResponse)
        )
    }

    private fun handlePostAdminCommand(session: IHTTPSession): Response {
        val files = HashMap<String, String>()
        session.parseBody(files)
        val body = files["postData"] ?: ""

        var action = "UNKNOWN"
        var src: String? = null
        var loop = false

        if (body.isNotBlank()) {
            try {
                val jsonObject = JsonParser.parseString(body).asJsonObject
                if (jsonObject.has("action")) {
                    action = jsonObject.get("action").asString
                } else if (jsonObject.has("command")) {
                    action = jsonObject.get("command").asString
                }
                if (jsonObject.has("src") && !jsonObject.get("src").isJsonNull) {
                    src = jsonObject.get("src").asString
                }
                if (jsonObject.has("loop") && !jsonObject.get("loop").isJsonNull) {
                    loop = jsonObject.get("loop").asBoolean
                }
            } catch (e: Exception) {
                action = body.trim()
            }
        }

        val command = AdminCommand(
            action = action,
            type = action,
            command = action,
            src = src,
            loop = loop
        )

        currentAdminCommand = command

        val resultJson = "{\"status\":\"ok\",\"received\":\"$action\"}"
        return newFixedLengthResponse(Response.Status.OK, "application/json", resultJson)
    }

    private fun handleGetTournament(session: IHTTPSession): Response {
        val tournamentIdStr = session.parameters["tournamentId"]?.firstOrNull()
        val tournamentResponse = runBlocking {
            val id = tournamentIdStr?.toIntOrNull()
            if (id != null) {
                repository.buildTournamentResponse(id)
            } else {
                val latest = repository.getLatestTournament()
                if (latest != null) {
                    repository.buildTournamentResponse(latest.id)
                } else {
                    buildFallbackTournamentResponse()
                }
            }
        } ?: buildFallbackTournamentResponse()

        return newFixedLengthResponse(
            Response.Status.OK,
            "application/json",
            gson.toJson(tournamentResponse)
        )
    }

    private fun buildFallbackScoreResponse(): ScoreResponse {
        return ScoreResponse(
            match = MatchDto(
                id = 0,
                team1 = "Tech Titans",
                team2 = "Sales Strikers",
                totalOvers = 10,
                currentInnings = 1,
                isCompleted = false,
                status = "NOT_STARTED",
                result = null
            ),
            currentInnings = InningsSummary(
                innings = 1,
                battingTeamId = 0,
                battingTeamName = "Tech Titans",
                battingTeam = "Tech Titans",
                bowlingTeam = "Sales Strikers",
                totalOvers = 10
            ),
            adminCommand = currentAdminCommand
        )
    }

    private fun buildFallbackTournamentResponse(): TournamentResponse {
        return TournamentResponse(
            tournamentId = 0,
            name = "Cricket Championship",
            overs = 10,
            teams = listOf("Tech Titans", "Sales Strikers"),
            standings = listOf(
                TournamentStandingDto("Tech Titans", 0, 0, 0, 0, 0, 0.0),
                TournamentStandingDto("Sales Strikers", 0, 0, 0, 0, 0, 0.0)
            )
        )
    }

    private fun addCorsHeaders(response: Response) {
        response.addHeader("Access-Control-Allow-Origin", "*")
        response.addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        response.addHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
    }
}
