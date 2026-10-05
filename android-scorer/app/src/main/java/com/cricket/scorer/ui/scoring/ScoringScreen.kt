package com.cricket.scorer.ui.scoring

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cricket.scorer.data.model.*
import com.cricket.scorer.data.repository.CricketRepository
import com.cricket.scorer.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScoringScreen(
    matchId: Int,
    repository: CricketRepository,
    onNavigateBack: () -> Unit,
    onNavigateToScorecard: (Int) -> Unit,
    onNavigateToTournament: (Int) -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    var matchState by remember { mutableStateOf<MatchState?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    // Dialog States
    var showWicketDialog by remember { mutableStateOf(false) }
    var showExtrasDialog by remember { mutableStateOf(false) }
    var showNoBallDialog by remember { mutableStateOf(false) }
    var selectedExtraType by remember { mutableStateOf(ExtraType.WIDE) }
    var showBowlerDialog by remember { mutableStateOf(false) }

    // Wicket Dialog Fields
    var wicketType by remember { mutableStateOf(WicketType.BOWLED) }
    var selectedOutBatsmanId by remember { mutableStateOf<Int?>(null) }
    var selectedNextBatsmanId by remember { mutableStateOf<Int?>(null) }
    var selectedFielderId by remember { mutableStateOf<Int?>(null) }

    // Current Bowler Selection
    var currentBowlerId by remember { mutableStateOf<Int?>(null) }

    // Refresh Match State
    fun refreshState() {
        coroutineScope.launch {
            val state = repository.getMatchState(matchId)
            matchState = state
            if (currentBowlerId == null) {
                currentBowlerId = state?.currentInnings?.currentBowler?.playerId
            }
            isLoading = false
        }
    }

    LaunchedEffect(matchId) {
        refreshState()
    }

    if (isLoading || matchState == null) {
        Box(
            modifier = Modifier.fillMaxSize().background(DarkNavy),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = PitchAmber)
        }
        return
    }

    val state = matchState!!
    val match = state.match
    val currInnings = state.currentInnings
    val inningsNum = if (match.status == MatchStatus.INNINGS_2) 2 else 1
    val isCompleted = match.status == MatchStatus.COMPLETED

    // Active Batting & Bowling Teams
    val batFirstId = repository.determineBattingFirst(match)
    val batSecondId = if (batFirstId == match.team1Id) match.team2Id else match.team1Id
    val battingTeamId = if (inningsNum == 1) batFirstId else batSecondId
    val bowlingTeamId = if (battingTeamId == match.team1Id) match.team2Id else match.team1Id

    val battingPlayers = if (battingTeamId == match.team1Id) state.players1 else state.players2
    val bowlingPlayers = if (bowlingTeamId == match.team1Id) state.players1 else state.players2

    val activeBatsmen = currInnings?.batsmen ?: emptyList()
    val notOutBatsmen = activeBatsmen.filter { !it.isOut }
    val alreadyOutIds = activeBatsmen.filter { it.isOut }.map { it.playerId }.toSet()

    val striker = notOutBatsmen.find { it.onStrike } ?: notOutBatsmen.firstOrNull()
        ?: battingPlayers.firstOrNull { !alreadyOutIds.contains(it.id) }?.let { BatsmanScore(it.id, playerName = it.name, onStrike = true) }
    val nonStriker = notOutBatsmen.find { !it.onStrike } ?: notOutBatsmen.getOrNull(1)
        ?: battingPlayers.filter { !alreadyOutIds.contains(it.id) && it.id != (striker?.playerId ?: 0) }.firstOrNull()?.let { BatsmanScore(it.id, playerName = it.name, onStrike = false) }

    val bowler = currInnings?.currentBowler ?: bowlingPlayers.firstOrNull()?.let {
        BowlerFigure(it.id, playerName = it.name)
    }

    val strikerId = striker?.playerId ?: (battingPlayers.firstOrNull { !alreadyOutIds.contains(it.id) }?.id ?: 0)
    val nonStrikerId = nonStriker?.playerId ?: (battingPlayers.filter { !alreadyOutIds.contains(it.id) && it.id != strikerId }.firstOrNull()?.id ?: 0)
    val activeBowlerId = currentBowlerId ?: (bowler?.playerId ?: (bowlingPlayers.firstOrNull()?.id ?: 0))

    // Record Ball Helper
    fun recordBall(
        runs: Int,
        extraType: ExtraType? = null,
        extraRuns: Int = 0,
        isWicket: Boolean = false,
        wType: WicketType? = null,
        outBatsmanId: Int = strikerId,
        fielderId: Int? = null
    ) {
        coroutineScope.launch {
            val currentOver = (currInnings?.legalBalls ?: 0) / 6
            val currentBall = (currInnings?.legalBalls ?: 0) % 6

            val facingBatsmanId = if (isWicket) outBatsmanId else strikerId
            val nonFacingBatsmanId = if (facingBatsmanId == strikerId) nonStrikerId else strikerId

            val event = BallEvent(
                matchId = matchId,
                innings = inningsNum,
                overNumber = currentOver,
                ballNumber = currentBall,
                runs = runs,
                extraType = extraType,
                extraRuns = extraRuns,
                isWicket = isWicket,
                wicketType = wType,
                batsmanId = facingBatsmanId,
                bowlerId = activeBowlerId,
                nonStrikerId = nonFacingBatsmanId,
                fielderId = fielderId
            )
            repository.addBall(event)
            refreshState()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "${currInnings?.battingTeam ?: "Cricket"} - Innings $inningsNum",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                actions = {
                    IconButton(onClick = { onNavigateToScorecard(matchId) }) {
                        Icon(Icons.Default.Assessment, contentDescription = "Scorecard", tint = Color.White)
                    }
                    IconButton(onClick = { onNavigateToTournament(match.tournamentId) }) {
                        Icon(Icons.Default.Leaderboard, contentDescription = "Standings", tint = PitchAmber)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DarkNavyLight,
                    titleContentColor = Color.White
                )
            )
        },
        containerColor = DarkNavy
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(scrollState)
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Match Status / Result Banner
            if (isCompleted) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = CricketGreenDark),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("MATCH FINISHED", color = PitchAmber, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = match.result ?: "Match Complete",
                            color = Color.White,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 18.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            // Live Score Board Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = currInnings?.battingTeam ?: "Batting Team",
                                color = PitchAmberLight,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp
                            )
                            Row(verticalAlignment = Alignment.Bottom) {
                                Text(
                                    text = "${currInnings?.score ?: 0}/${currInnings?.wickets ?: 0}",
                                    color = Color.White,
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 34.sp
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = "(${currInnings?.oversString ?: "0.0"} / ${currInnings?.totalOvers ?: 10} ov)",
                                    color = SlateGray,
                                    fontSize = 16.sp,
                                    modifier = Modifier.padding(bottom = 4.dp)
                                )
                            }
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "CRR: ${currInnings?.runRate ?: 0.0}",
                                color = CricketGreen,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                            Text(
                                text = "Extras: ${currInnings?.extras ?: 0}",
                                color = SlateGray,
                                fontSize = 12.sp
                            )
                        }
                    }

                    // 2nd Innings Target & Chase Panel
                    if (inningsNum == 2 && currInnings?.requiredRuns != null) {
                        HorizontalDivider(color = SlateGray.copy(alpha = 0.3f), modifier = Modifier.padding(vertical = 8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Need ${currInnings.requiredRuns} runs in ${((currInnings.totalOvers * 6) - (currInnings.legalBalls)).coerceAtLeast(0)} balls",
                                color = PitchAmber,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                            Text(
                                text = "RRR: ${currInnings.requiredRunRate ?: 0.0}",
                                color = CricketRed,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }

            // Active Batsmen Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
                shape = RoundedCornerShape(10.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "BATSMEN",
                        color = SlateGray,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    // Striker Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "★",
                                color = PitchAmber,
                                fontSize = 14.sp,
                                modifier = Modifier.padding(end = 6.dp)
                            )
                            Text(
                                text = striker?.playerName ?: "Striker",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                        }
                        Text(
                            text = "${striker?.runs ?: 0} (${striker?.balls ?: 0})  4s: ${striker?.fours ?: 0}  6s: ${striker?.sixes ?: 0}  SR: ${striker?.strikeRate ?: 0.0}",
                            color = Color.White.copy(alpha = 0.9f),
                            fontSize = 13.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Non-Striker Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "   ${nonStriker?.playerName ?: "Non-Striker"}",
                            color = Color.White.copy(alpha = 0.7f),
                            fontSize = 14.sp
                        )
                        Text(
                            text = "${nonStriker?.runs ?: 0} (${nonStriker?.balls ?: 0})  4s: ${nonStriker?.fours ?: 0}  6s: ${nonStriker?.sixes ?: 0}  SR: ${nonStriker?.strikeRate ?: 0.0}",
                            color = Color.White.copy(alpha = 0.7f),
                            fontSize = 13.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Partnership: ${currInnings?.partnership?.runs ?: 0} runs (${currInnings?.partnership?.balls ?: 0} balls)",
                        color = PitchAmberLight,
                        fontSize = 12.sp
                    )
                }
            }

            // Current Bowler Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
                shape = RoundedCornerShape(10.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "BOWLER",
                            color = SlateGray,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            letterSpacing = 1.sp
                        )
                        TextButton(
                            onClick = { showBowlerDialog = true },
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Text("Change Bowler", color = PitchAmber, fontSize = 12.sp)
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = bowler?.playerName ?: "Current Bowler",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
                        Text(
                            text = "${bowler?.overs ?: "0.0"} ov - ${bowler?.maidens ?: 0}M - ${bowler?.runs ?: 0}R - ${bowler?.wickets ?: 0}W (Econ: ${bowler?.economy ?: 0.0})",
                            color = Color.White.copy(alpha = 0.9f),
                            fontSize = 13.sp
                        )
                    }
                }
            }

            // Recent Balls (This Over)
            val currentOverBalls = currInnings?.recentBalls?.lastOrNull()?.balls ?: emptyList()
            if (currentOverBalls.isNotEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Column(modifier = Modifier.padding(10.dp)) {
                        Text(
                            text = "THIS OVER",
                            color = SlateGray,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(currentOverBalls) { b ->
                                val pillBg = when (b.color) {
                                    "red" -> WicketRed
                                    "green" -> FourGreen
                                    "orange" -> SixOrange
                                    "purple" -> ExtraPurple
                                    "cyan" -> Color(0xFF06B6D4)
                                    "grey" -> Color(0xFF475569)
                                    else -> Color(0xFF2563EB)
                                }
                                Box(
                                    modifier = Modifier
                                        .size(34.dp)
                                        .background(pillBg, CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = b.label,
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // ── Scoring Keypad & Controls ─────────────────────────
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Regular Runs 0, 1, 2, 3, 4, 6
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf(0, 1, 2, 3).forEach { r ->
                            Button(
                                onClick = { recordBall(runs = r) },
                                modifier = Modifier.weight(1f).height(50.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (r == 0) Color(0xFF334155) else Color(0xFF1E3A8A)
                                ),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("$r", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = { recordBall(runs = 4) },
                            modifier = Modifier.weight(1f).height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = FourGreen),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("4 RUNS", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        Button(
                            onClick = { recordBall(runs = 6) },
                            modifier = Modifier.weight(1f).height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = SixOrange),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("6 RUNS", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }

                    // Extras (Wide, No Ball, Bye, Leg Bye)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        OutlinedButton(
                            onClick = {
                                selectedExtraType = ExtraType.WIDE
                                showExtrasDialog = true
                            },
                            modifier = Modifier.weight(1f).height(44.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = ExtraPurple),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(2.dp)
                        ) {
                            Text("WIDE", fontSize = 11.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                        }

                        Button(
                            onClick = {
                                showNoBallDialog = true
                            },
                            modifier = Modifier.weight(1.25f).height(44.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = PitchAmber),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(2.dp)
                        ) {
                            Text("NO BALL", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = DarkNavy, textAlign = TextAlign.Center)
                        }

                        OutlinedButton(
                            onClick = {
                                selectedExtraType = ExtraType.BYE
                                showExtrasDialog = true
                            },
                            modifier = Modifier.weight(1f).height(44.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = ExtraPurple),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(2.dp)
                        ) {
                            Text("BYE", fontSize = 11.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                        }

                        OutlinedButton(
                            onClick = {
                                selectedExtraType = ExtraType.LEG_BYE
                                showExtrasDialog = true
                            },
                            modifier = Modifier.weight(1f).height(44.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = ExtraPurple),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(2.dp)
                        ) {
                            Text("LEG BYE", fontSize = 11.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                        }
                    }

                    // Wicket & Undo Buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                selectedOutBatsmanId = strikerId
                                showWicketDialog = true
                            },
                            modifier = Modifier.weight(1.3f).height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = WicketRed),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(Icons.Default.Cancel, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("WICKET", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        Button(
                            onClick = {
                                coroutineScope.launch {
                                    repository.undoLastBall(matchId)
                                    refreshState()
                                }
                            },
                            modifier = Modifier.weight(1f).height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF475569)),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(Icons.AutoMirrored.Filled.Undo, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("UNDO", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }
        }
    }

    // ── Dialog: Wicket Details ─────────────────────────────────
    if (showWicketDialog) {
        val currentOutBatsmanId = selectedOutBatsmanId ?: strikerId
        val survivingBatsmanId = if (currentOutBatsmanId == strikerId) nonStrikerId else strikerId
        val alreadyOutPlayerIds = currInnings?.batsmen?.filter { it.isOut }?.map { it.playerId }?.toSet() ?: emptySet()
        val availableNextBatsmen = battingPlayers.filter { p ->
            p.id != currentOutBatsmanId && p.id != survivingBatsmanId && !alreadyOutPlayerIds.contains(p.id)
        }

        AlertDialog(
            onDismissRequest = { showWicketDialog = false },
            title = { Text("Fall of Wicket", fontWeight = FontWeight.Bold, color = WicketRed) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text("Dismissal Type:", color = Color.White, fontWeight = FontWeight.Medium)
                    val dismissalTypes = listOf(
                        WicketType.BOWLED,
                        WicketType.CAUGHT,
                        WicketType.RUN_OUT,
                        WicketType.LBW,
                        WicketType.STUMPED,
                        WicketType.HIT_WICKET
                    )
                    Column {
                        dismissalTypes.chunked(3).forEach { rowTypes ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                rowTypes.forEach { wt ->
                                    FilterChip(
                                        selected = wicketType == wt,
                                        onClick = { wicketType = wt },
                                        label = { Text(wt.name.replace('_', ' '), fontSize = 11.sp) },
                                        modifier = Modifier.weight(1f),
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = WicketRed,
                                            selectedLabelColor = Color.White
                                        )
                                    )
                                }
                            }
                        }
                    }

                    Text("Batsman Out:", color = Color.White, fontWeight = FontWeight.Medium)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = currentOutBatsmanId == strikerId,
                            onClick = { selectedOutBatsmanId = strikerId },
                            label = { Text(striker?.playerName ?: "Striker") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = PitchAmber,
                                selectedLabelColor = DarkNavy
                            )
                        )
                        FilterChip(
                            selected = currentOutBatsmanId == nonStrikerId,
                            onClick = { selectedOutBatsmanId = nonStrikerId },
                            label = { Text(nonStriker?.playerName ?: "Non-Striker") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = PitchAmber,
                                selectedLabelColor = DarkNavy
                            )
                        )
                    }

                    if (availableNextBatsmen.isNotEmpty()) {
                        Text("Incoming Batsman:", color = Color.White, fontWeight = FontWeight.Medium)
                        LazyRow(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(availableNextBatsmen) { p ->
                                val isChosen = (selectedNextBatsmanId ?: availableNextBatsmen.first().id) == p.id
                                FilterChip(
                                    selected = isChosen,
                                    onClick = { selectedNextBatsmanId = p.id },
                                    label = { Text(p.name) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = CricketGreen,
                                        selectedLabelColor = Color.White
                                    )
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val nextPlayerId = selectedNextBatsmanId ?: availableNextBatsmen.firstOrNull()?.id
                        if (nextPlayerId != null) {
                            repository.setIncomingBatsman(matchId, nextPlayerId)
                        }
                        val outId = selectedOutBatsmanId ?: strikerId
                        recordBall(
                            runs = 0,
                            isWicket = true,
                            wType = wicketType,
                            outBatsmanId = outId,
                            fielderId = selectedFielderId
                        )
                        selectedOutBatsmanId = null
                        selectedNextBatsmanId = null
                        selectedFielderId = null
                        showWicketDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = WicketRed)
                ) {
                    Text("Confirm Wicket", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showWicketDialog = false }) {
                    Text("Cancel", color = SlateGray)
                }
            },
            containerColor = DarkNavyLight
        )
    }

    // ── Dialog: Extras Selection (Wide, Bye, Leg Bye) ──────────
    if (showExtrasDialog) {
        var runsWithExtra by remember { mutableStateOf(0) }
        AlertDialog(
            onDismissRequest = { showExtrasDialog = false },
            title = { Text("Extra: ${selectedExtraType.name}", fontWeight = FontWeight.Bold, color = ExtraPurple) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        when (selectedExtraType) {
                            ExtraType.WIDE -> "Wide delivers 1 penalty run + optional runs taken"
                            ExtraType.BYE -> "Byes are legal balls with runs scored without bat contact"
                            ExtraType.LEG_BYE -> "Leg Byes are legal balls with runs off pad"
                            else -> "Extras"
                        },
                        color = SlateGray,
                        fontSize = 12.sp
                    )
                    Text("Additional Runs Taken:", color = Color.White)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf(0, 1, 2, 3, 4).forEach { r ->
                            FilterChip(
                                selected = runsWithExtra == r,
                                onClick = { runsWithExtra = r },
                                label = { Text("+$r") },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = ExtraPurple,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showExtrasDialog = false
                        val extraRuns = when (selectedExtraType) {
                            ExtraType.WIDE -> 1 + runsWithExtra
                            ExtraType.BYE, ExtraType.LEG_BYE -> if (runsWithExtra == 0) 1 else runsWithExtra
                            else -> 1
                        }
                        recordBall(
                            runs = 0,
                            extraType = selectedExtraType,
                            extraRuns = extraRuns
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = ExtraPurple)
                ) {
                    Text("Record Extra", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showExtrasDialog = false }) {
                    Text("Cancel", color = SlateGray)
                }
            },
            containerColor = DarkNavyLight
        )
    }

    // ── Dialog: Dedicated No Ball Selection ───────────────────
    if (showNoBallDialog) {
        var isRunOutSelected by remember { mutableStateOf(false) }
        var selectedNoBallOutBatsmanId by remember { mutableStateOf<Int?>(strikerId) }
        var selectedNoBallNextBatsmanId by remember { mutableStateOf<Int?>(null) }
        var completedRunsOnRunOut by remember { mutableStateOf(0) }

        val currentOutBatsmanId = selectedNoBallOutBatsmanId ?: strikerId
        val survivingBatsmanId = if (currentOutBatsmanId == strikerId) nonStrikerId else strikerId
        val alreadyOutPlayerIds = currInnings?.batsmen?.filter { it.isOut }?.map { it.playerId }?.toSet() ?: emptySet()
        val availableNextBatsmen = battingPlayers.filter { p ->
            p.id != currentOutBatsmanId && p.id != survivingBatsmanId && !alreadyOutPlayerIds.contains(p.id)
        }

        AlertDialog(
            onDismissRequest = {
                showNoBallDialog = false
                isRunOutSelected = false
            },
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("NO BALL", fontWeight = FontWeight.ExtraBold, color = PitchAmber, fontSize = 20.sp)
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = PitchAmber.copy(alpha = 0.2f)
                    ) {
                        Text(
                            "+1 Mark Auto",
                            color = PitchAmber,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                        )
                    }
                }
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "1 mark added automatically. Select additional runs scored off the bat, or Run Out:",
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 13.sp
                    )

                    if (!isRunOutSelected) {
                        Text("Runs Scored off Bat:", color = SlateGray, fontWeight = FontWeight.Bold, fontSize = 12.sp)

                        // Row 1: 0, 1, 2
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = {
                                    recordBall(
                                        runs = 0,
                                        extraType = ExtraType.NO_BALL,
                                        extraRuns = 1
                                    )
                                    showNoBallDialog = false
                                },
                                modifier = Modifier.weight(1f).height(62.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("0", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                                    Text("+1 total", fontSize = 10.sp, color = SlateGray)
                                }
                            }

                            Button(
                                onClick = {
                                    recordBall(
                                        runs = 1,
                                        extraType = ExtraType.NO_BALL,
                                        extraRuns = 1
                                    )
                                    showNoBallDialog = false
                                },
                                modifier = Modifier.weight(1f).height(62.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3A8A)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("1", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                                    Text("+2 total", fontSize = 10.sp, color = PitchAmberLight)
                                }
                            }

                            Button(
                                onClick = {
                                    recordBall(
                                        runs = 2,
                                        extraType = ExtraType.NO_BALL,
                                        extraRuns = 1
                                    )
                                    showNoBallDialog = false
                                },
                                modifier = Modifier.weight(1f).height(62.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3A8A)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("2", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                                    Text("+3 total", fontSize = 10.sp, color = PitchAmberLight)
                                }
                            }
                        }

                        // Row 2: 3, 4, 6
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = {
                                    recordBall(
                                        runs = 3,
                                        extraType = ExtraType.NO_BALL,
                                        extraRuns = 1
                                    )
                                    showNoBallDialog = false
                                },
                                modifier = Modifier.weight(1f).height(62.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3A8A)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("3", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                                    Text("+4 total", fontSize = 10.sp, color = PitchAmberLight)
                                }
                            }

                            Button(
                                onClick = {
                                    recordBall(
                                        runs = 4,
                                        extraType = ExtraType.NO_BALL,
                                        extraRuns = 1
                                    )
                                    showNoBallDialog = false
                                },
                                modifier = Modifier.weight(1f).height(62.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = FourGreen),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("4", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                                    Text("+5 total", fontSize = 10.sp, color = Color.White.copy(alpha = 0.85f))
                                }
                            }

                            Button(
                                onClick = {
                                    recordBall(
                                        runs = 6,
                                        extraType = ExtraType.NO_BALL,
                                        extraRuns = 1
                                    )
                                    showNoBallDialog = false
                                },
                                modifier = Modifier.weight(1f).height(62.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = SixOrange),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("6", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                                    Text("+7 total", fontSize = 10.sp, color = Color.White.copy(alpha = 0.85f))
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        // Run Out Button
                        Button(
                            onClick = { isRunOutSelected = true },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = WicketRed),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.DirectionsRun, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("RUN OUT (Wicket on No Ball)", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.White)
                        }
                    } else {
                        // Run Out configuration sub-panel
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = WicketRed.copy(alpha = 0.15f)),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("RUN OUT DETAILS", color = WicketRed, fontWeight = FontWeight.Bold, fontSize = 12.sp)

                                Text("Batsman Run Out:", color = Color.White, fontWeight = FontWeight.Medium, fontSize = 12.sp)
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    FilterChip(
                                        selected = currentOutBatsmanId == strikerId,
                                        onClick = { selectedNoBallOutBatsmanId = strikerId },
                                        label = { Text("Striker: ${striker?.playerName ?: "Striker"}") },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = WicketRed,
                                            selectedLabelColor = Color.White
                                        )
                                    )
                                    FilterChip(
                                        selected = currentOutBatsmanId == nonStrikerId,
                                        onClick = { selectedNoBallOutBatsmanId = nonStrikerId },
                                        label = { Text("Non-Striker: ${nonStriker?.playerName ?: "Non-Striker"}") },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = WicketRed,
                                            selectedLabelColor = Color.White
                                        )
                                    )
                                }

                                Text("Completed Runs before Run Out:", color = Color.White, fontWeight = FontWeight.Medium, fontSize = 12.sp)
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    listOf(0, 1, 2, 3).forEach { r ->
                                        FilterChip(
                                            selected = completedRunsOnRunOut == r,
                                            onClick = { completedRunsOnRunOut = r },
                                            label = { Text("+$r (Total ${1 + r})") },
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = PitchAmber,
                                                selectedLabelColor = DarkNavy
                                            )
                                        )
                                    }
                                }

                                if (availableNextBatsmen.isNotEmpty()) {
                                    Text("Incoming Batsman:", color = Color.White, fontWeight = FontWeight.Medium, fontSize = 12.sp)
                                    LazyRow(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        items(availableNextBatsmen) { p ->
                                            val isChosen = (selectedNoBallNextBatsmanId ?: availableNextBatsmen.first().id) == p.id
                                            FilterChip(
                                                selected = isChosen,
                                                onClick = { selectedNoBallNextBatsmanId = p.id },
                                                label = { Text(p.name, fontSize = 12.sp) },
                                                colors = FilterChipDefaults.filterChipColors(
                                                    selectedContainerColor = CricketGreen,
                                                    selectedLabelColor = Color.White
                                                )
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = { isRunOutSelected = false },
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Back to Runs", color = SlateGray)
                            }

                            Button(
                                onClick = {
                                    val nextPlayerId = selectedNoBallNextBatsmanId ?: availableNextBatsmen.firstOrNull()?.id
                                    if (nextPlayerId != null) {
                                        repository.setIncomingBatsman(matchId, nextPlayerId)
                                    }
                                    val outId = selectedNoBallOutBatsmanId ?: strikerId
                                    recordBall(
                                        runs = completedRunsOnRunOut,
                                        extraType = ExtraType.NO_BALL,
                                        extraRuns = 1,
                                        isWicket = true,
                                        wType = WicketType.RUN_OUT,
                                        outBatsmanId = outId
                                    )
                                    showNoBallDialog = false
                                    isRunOutSelected = false
                                },
                                modifier = Modifier.weight(1.4f),
                                colors = ButtonDefaults.buttonColors(containerColor = WicketRed)
                            ) {
                                Text("Confirm Run Out", fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = {
                    showNoBallDialog = false
                    isRunOutSelected = false
                }) {
                    Text("Cancel", color = SlateGray)
                }
            },
            containerColor = DarkNavyLight
        )
    }

    // ── Dialog: Bowler Selection ───────────────────────────────
    if (showBowlerDialog) {
        AlertDialog(
            onDismissRequest = { showBowlerDialog = false },
            title = { Text("Select Bowler", fontWeight = FontWeight.Bold, color = PitchAmber) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    bowlingPlayers.forEach { p ->
                        Button(
                            onClick = {
                                currentBowlerId = p.id
                                showBowlerDialog = false
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (currentBowlerId == p.id) CricketGreen else Color(0xFF334155)
                            )
                        ) {
                            Text(p.name, fontWeight = FontWeight.Medium)
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showBowlerDialog = false }) {
                    Text("Close", color = SlateGray)
                }
            },
            containerColor = DarkNavyLight
        )
    }
}
