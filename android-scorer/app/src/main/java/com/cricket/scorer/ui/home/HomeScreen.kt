package com.cricket.scorer.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cricket.scorer.data.model.Match
import com.cricket.scorer.data.model.Tournament
import com.cricket.scorer.data.repository.CricketRepository
import com.cricket.scorer.ui.theme.*
import com.cricket.scorer.util.NetworkUtils
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    repository: CricketRepository,
    onNavigateToSetup: () -> Unit,
    onNavigateToScoring: (Int) -> Unit,
    onNavigateToScorecard: (Int) -> Unit,
    onNavigateToTournament: (Int) -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val localIp = remember { NetworkUtils.getLocalIpAddress(context) }

    var latestTournament by remember { mutableStateOf<Tournament?>(null) }
    var latestMatch by remember { mutableStateOf<Match?>(null) }
    var team1Name by remember { mutableStateOf("") }
    var team2Name by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        val t = repository.getLatestTournament()
        latestTournament = t
        if (t != null) {
            val m = repository.getLatestMatch()
            latestMatch = m
            if (m != null) {
                team1Name = repository.getTeamName(m.team1Id)
                team2Name = repository.getTeamName(m.team2Id)
            }
        }
        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.SportsCricket,
                            contentDescription = "Cricket Logo",
                            tint = PitchAmber,
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("Cricket Scorer", fontWeight = FontWeight.Bold)
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
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Wi-Fi Server IP Banner (Prominent for Web Scoreboard connection)
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Wifi,
                            contentDescription = "Wi-Fi",
                            tint = CricketGreen,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "LIVE HTTP SERVER ACTIVE",
                            color = CricketGreen,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Web Scoreboard URL:",
                        color = SlateGray,
                        fontSize = 12.sp
                    )
                    Text(
                        text = "http://$localIp:8080",
                        color = PitchAmber,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 22.sp,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Enter this IP address on the TV Scoreboard or Admin panel",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 11.sp,
                        textAlign = TextAlign.Center
                    )
                }
            }

            // Current Match / Tournament Info Card
            if (latestTournament != null && latestMatch != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = latestTournament?.name ?: "Tournament",
                                color = PitchAmberLight,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Badge(containerColor = CricketGreenDark) {
                                Text(
                                    text = latestMatch?.status?.name ?: "",
                                    color = Color.White,
                                    fontSize = 10.sp,
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "$team1Name vs $team2Name",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        if (latestMatch?.result != null) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = latestMatch?.result ?: "",
                                color = PitchAmber,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Action Buttons
            Button(
                onClick = onNavigateToSetup,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = CricketGreen),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Default.AddCircle, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("New Tournament / Match", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }

            if (latestMatch != null) {
                Button(
                    onClick = { latestMatch?.let { onNavigateToScoring(it.id) } },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PitchAmber),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null, tint = DarkNavy)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Live Scoring", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = DarkNavy)
                }

                OutlinedButton(
                    onClick = { latestMatch?.let { onNavigateToScorecard(it.id) } },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.Assessment, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("View Full Scorecard", fontSize = 15.sp)
                }
            }

            if (latestTournament != null) {
                OutlinedButton(
                    onClick = { latestTournament?.let { onNavigateToTournament(it.id) } },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = PitchAmber),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.Leaderboard, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Points Table & Standings", fontSize = 15.sp)
                }
            }
        }
    }
}
