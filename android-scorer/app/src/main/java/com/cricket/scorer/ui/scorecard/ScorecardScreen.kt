package com.cricket.scorer.ui.scorecard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cricket.scorer.data.model.InningsSummary
import com.cricket.scorer.data.model.MatchState
import com.cricket.scorer.data.repository.CricketRepository
import com.cricket.scorer.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScorecardScreen(
    matchId: Int,
    repository: CricketRepository,
    onNavigateBack: () -> Unit
) {
    var matchState by remember { mutableStateOf<MatchState?>(null) }
    var selectedInningsTab by remember { mutableStateOf(1) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(matchId) {
        matchState = repository.getMatchState(matchId)
        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Full Match Scorecard", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
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
        if (isLoading || matchState == null) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = PitchAmber)
            }
            return@Scaffold
        }

        val state = matchState!!
        val innings1 = state.innings1
        val innings2 = state.innings2
        val activeInnings: InningsSummary? = if (selectedInningsTab == 1) innings1 else innings2

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Innings Tabs
            TabRow(
                selectedTabIndex = selectedInningsTab - 1,
                containerColor = DarkNavyLight,
                contentColor = PitchAmber
            ) {
                Tab(
                    selected = selectedInningsTab == 1,
                    onClick = { selectedInningsTab = 1 },
                    text = { Text("1st Innings: ${innings1?.battingTeam ?: state.team1.name}") }
                )
                Tab(
                    selected = selectedInningsTab == 2,
                    onClick = { selectedInningsTab = 2 },
                    text = { Text("2nd Innings: ${innings2?.battingTeam ?: state.team2.name}") }
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                if (activeInnings == null) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = DarkNavyLight)
                    ) {
                        Box(modifier = Modifier.padding(24.dp), contentAlignment = Alignment.Center) {
                            Text("Innings not started yet", color = SlateGray, fontSize = 16.sp)
                        }
                    }
                } else {
                    // Innings Total Banner
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = activeInnings.battingTeam,
                                    color = PitchAmberLight,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                                Text(
                                    text = "${activeInnings.score}/${activeInnings.wickets} (${activeInnings.oversString} ov)",
                                    color = Color.White,
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 26.sp
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "Run Rate: ${activeInnings.runRate}",
                                    color = CricketGreen,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = "Extras: ${activeInnings.extras}",
                                    color = SlateGray,
                                    fontSize = 13.sp
                                )
                            }
                        }
                    }

                    // Batting Table
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "BATTING",
                                color = PitchAmber,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )

                            // Table Header
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Batsman", modifier = Modifier.weight(2f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("R", modifier = Modifier.weight(0.6f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("B", modifier = Modifier.weight(0.6f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("4s", modifier = Modifier.weight(0.5f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("6s", modifier = Modifier.weight(0.5f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("SR", modifier = Modifier.weight(0.8f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                            HorizontalDivider(color = SlateGray.copy(alpha = 0.2f))

                            activeInnings.batsmen.forEach { b ->
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(2f)) {
                                        Text(b.playerName, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                        Text(
                                            if (b.isOut) b.dismissalInfo.ifEmpty { "out" } else "not out",
                                            color = if (b.isOut) SlateGray else CricketGreen,
                                            fontSize = 10.sp
                                        )
                                    }
                                    Text("${b.runs}", modifier = Modifier.weight(0.6f), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    Text("${b.balls}", modifier = Modifier.weight(0.6f), color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp)
                                    Text("${b.fours}", modifier = Modifier.weight(0.5f), color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp)
                                    Text("${b.sixes}", modifier = Modifier.weight(0.5f), color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp)
                                    Text("${b.strikeRate}", modifier = Modifier.weight(0.8f), color = PitchAmberLight, fontSize = 12.sp)
                                }
                                HorizontalDivider(color = SlateGray.copy(alpha = 0.1f))
                            }
                        }
                    }

                    // Bowling Table
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "BOWLING",
                                color = PitchAmber,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )

                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Bowler", modifier = Modifier.weight(2f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("O", modifier = Modifier.weight(0.6f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("M", modifier = Modifier.weight(0.5f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("R", modifier = Modifier.weight(0.6f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("W", modifier = Modifier.weight(0.6f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("Econ", modifier = Modifier.weight(0.8f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                            HorizontalDivider(color = SlateGray.copy(alpha = 0.2f))

                            activeInnings.bowlers.forEach { bw ->
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(bw.playerName, modifier = Modifier.weight(2f), color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                    Text(bw.overs, modifier = Modifier.weight(0.6f), color = Color.White, fontSize = 13.sp)
                                    Text("${bw.maidens}", modifier = Modifier.weight(0.5f), color = Color.White, fontSize = 13.sp)
                                    Text("${bw.runs}", modifier = Modifier.weight(0.6f), color = Color.White, fontSize = 13.sp)
                                    Text("${bw.wickets}", modifier = Modifier.weight(0.6f), color = CricketGreen, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    Text("${bw.economy}", modifier = Modifier.weight(0.8f), color = PitchAmberLight, fontSize = 12.sp)
                                }
                                HorizontalDivider(color = SlateGray.copy(alpha = 0.1f))
                            }
                        }
                    }

                    // Fall of Wickets
                    if (activeInnings.fallOfWickets.isNotEmpty()) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    text = "FALL OF WICKETS",
                                    color = PitchAmber,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    modifier = Modifier.padding(bottom = 6.dp)
                                )
                                activeInnings.fallOfWickets.forEach { fow ->
                                    Text(
                                        text = "${fow.score}/${fow.wicketNumber} (${fow.batsman}, ${fow.overs} ov)",
                                        color = Color.White.copy(alpha = 0.85f),
                                        fontSize = 12.sp,
                                        modifier = Modifier.padding(vertical = 2.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
