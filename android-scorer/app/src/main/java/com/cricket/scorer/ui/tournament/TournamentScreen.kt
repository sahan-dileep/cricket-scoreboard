package com.cricket.scorer.ui.tournament

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
import com.cricket.scorer.data.model.Tournament
import com.cricket.scorer.data.model.TournamentStanding
import com.cricket.scorer.data.repository.CricketRepository
import com.cricket.scorer.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TournamentScreen(
    tournamentId: Int,
    repository: CricketRepository,
    onNavigateBack: () -> Unit
) {
    var tournament by remember { mutableStateOf<Tournament?>(null) }
    var standings by remember { mutableStateOf<List<TournamentStanding>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(tournamentId) {
        tournament = repository.getTournament(tournamentId)
        standings = repository.computeStandings(tournamentId)
        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(tournament?.name ?: "Points Table", fontWeight = FontWeight.Bold) },
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
        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = PitchAmber)
            }
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "STANDINGS & NET RUN RATE",
                        color = PitchAmber,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(bottom = 10.dp)
                    )

                    // Table Header
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Team", modifier = Modifier.weight(2f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("P", modifier = Modifier.weight(0.5f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("W", modifier = Modifier.weight(0.5f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("L", modifier = Modifier.weight(0.5f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("T", modifier = Modifier.weight(0.5f), color = SlateGray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("PTS", modifier = Modifier.weight(0.7f), color = PitchAmber, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("NRR", modifier = Modifier.weight(0.9f), color = CricketGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    HorizontalDivider(color = SlateGray.copy(alpha = 0.3f))

                    standings.forEachIndexed { index, st ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "${index + 1}. ${st.team.name}",
                                modifier = Modifier.weight(2f),
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.sp
                            )
                            Text("${st.played}", modifier = Modifier.weight(0.5f), color = Color.White, fontSize = 13.sp)
                            Text("${st.won}", modifier = Modifier.weight(0.5f), color = CricketGreen, fontSize = 13.sp)
                            Text("${st.lost}", modifier = Modifier.weight(0.5f), color = CricketRed, fontSize = 13.sp)
                            Text("${st.tied}", modifier = Modifier.weight(0.5f), color = Color.White.copy(alpha = 0.7f), fontSize = 13.sp)
                            Text("${st.points}", modifier = Modifier.weight(0.7f), color = PitchAmber, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(
                                text = (if (st.nrr > 0) "+${st.nrr}" else "${st.nrr}"),
                                modifier = Modifier.weight(0.9f),
                                color = if (st.nrr >= 0) CricketGreen else CricketRed,
                                fontWeight = FontWeight.Medium,
                                fontSize = 13.sp
                            )
                        }
                        HorizontalDivider(color = SlateGray.copy(alpha = 0.1f))
                    }
                }
            }

            // Rules explanation footer
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
                shape = RoundedCornerShape(10.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("Points System:", color = PitchAmberLight, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    Text("• Win: 2 points", color = Color.White.copy(alpha = 0.8f), fontSize = 11.sp)
                    Text("• Tie: 1 point", color = Color.White.copy(alpha = 0.8f), fontSize = 11.sp)
                    Text("• Loss: 0 points", color = Color.White.copy(alpha = 0.8f), fontSize = 11.sp)
                    Text("• Net Run Rate (NRR) = (Total Runs Scored / Overs Faced) - (Total Runs Conceded / Overs Bowled)", color = Color.White.copy(alpha = 0.8f), fontSize = 11.sp)
                }
            }
        }
    }
}
