package com.cricket.scorer.ui.setup

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cricket.scorer.data.model.TossChoice
import com.cricket.scorer.data.repository.CricketRepository
import com.cricket.scorer.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SetupScreen(
    repository: CricketRepository,
    onNavigateBack: () -> Unit,
    onMatchStarted: (Int) -> Unit,
    onNavigateToManageTeams: () -> Unit = {}
) {
    val coroutineScope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    var tournamentName by remember { mutableStateOf("Annual Cricket Cup") }
    var oversText by remember { mutableStateOf("10") }
    var team1Name by remember { mutableStateOf("Tech Titans") }
    var team2Name by remember { mutableStateOf("Sales Strikers") }

    // Roster players default
    var team1PlayersText by remember {
        mutableStateOf(
            "D. Mendis\nS. Fernando\nK. Perera\nC. Asalanka\nB. Rajapaksa\nD. Shanaka\nW. Hasaranga\nC. Karunaratne\nD. Chameera\nM. Theekshana\nL. Kumara"
        )
    }
    var team2PlayersText by remember {
        mutableStateOf(
            "P. Nissanka\nK. Mendis\nS. Samarawickrama\nC. Silva\nA. Mathews\nD. de Silva\nK. Rajitha\nM. Pathirana\nP. Jayawickrama\nN. Pradeep\nB. Fernando"
        )
    }

    var savedTeams by remember { mutableStateOf<List<com.cricket.scorer.data.model.TeamWithPlayers>>(emptyList()) }

    LaunchedEffect(Unit) {
        val loaded = repository.getAllTeamsWithPlayers()
        savedTeams = loaded
        if (loaded.isNotEmpty()) {
            team1Name = loaded[0].name
            team1PlayersText = loaded[0].players.joinToString("\n")
            if (loaded.size > 1) {
                team2Name = loaded[1].name
                team2PlayersText = loaded[1].players.joinToString("\n")
            }
        }
    }

    var tossWinnerTeam by remember { mutableStateOf(1) } // 1 for Team 1, 2 for Team 2
    var tossChoice by remember { mutableStateOf(TossChoice.BAT) }

    var isSubmitting by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tournament & Match Setup", fontWeight = FontWeight.Bold) },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(scrollState)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Tournament Info Card
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Tournament Details", color = PitchAmber, fontWeight = FontWeight.Bold, fontSize = 16.sp)

                    OutlinedTextField(
                        value = tournamentName,
                        onValueChange = { tournamentName = it },
                        label = { Text("Tournament Name") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PitchAmber,
                            focusedLabelColor = PitchAmber,
                            unfocusedTextColor = Color.White,
                            focusedTextColor = Color.White
                        )
                    )

                    // Manual Overs Input with Stepper & Quick Presets
                    val parsedOvers = oversText.toIntOrNull()
                    val isValidOvers = parsedOvers != null && parsedOvers in 1..100
                    val currentOvers = parsedOvers?.coerceIn(1, 100) ?: 10

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Overs Per Side: $currentOvers ov",
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 15.sp
                            )
                            Text(
                                text = "${currentOvers * 6} balls / innings",
                                color = PitchAmber,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }

                        // Stepper row with direct manual number input
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            FilledTonalIconButton(
                                onClick = {
                                    val next = (currentOvers - 1).coerceAtLeast(1)
                                    oversText = next.toString()
                                },
                                modifier = Modifier.size(52.dp),
                                colors = IconButtonDefaults.filledTonalIconButtonColors(
                                    containerColor = Color(0xFF334155),
                                    contentColor = Color.White
                                )
                            ) {
                                Text("-", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
                            }

                            OutlinedTextField(
                                value = oversText,
                                onValueChange = { input ->
                                    val digitsOnly = input.filter { it.isDigit() }
                                    if (digitsOnly.length <= 3) {
                                        oversText = digitsOnly
                                    }
                                },
                                label = { Text("Manual Overs (1 - 100)") },
                                placeholder = { Text("e.g. 5, 8, 10, 15, 20") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                isError = !isValidOvers && oversText.isNotEmpty(),
                                supportingText = {
                                    if (!isValidOvers && oversText.isNotEmpty()) {
                                        Text("Please enter valid overs (1 to 100)", color = CricketRed)
                                    } else {
                                        Text("Type manually or select a preset below", color = SlateGray)
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = PitchAmber,
                                    focusedLabelColor = PitchAmber,
                                    unfocusedTextColor = Color.White,
                                    focusedTextColor = Color.White,
                                    errorBorderColor = CricketRed
                                )
                            )

                            FilledTonalIconButton(
                                onClick = {
                                    val next = (currentOvers + 1).coerceAtMost(100)
                                    oversText = next.toString()
                                },
                                modifier = Modifier.size(52.dp),
                                colors = IconButtonDefaults.filledTonalIconButtonColors(
                                    containerColor = Color(0xFF334155),
                                    contentColor = Color.White
                                )
                            ) {
                                Text("+", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
                            }
                        }

                        // Quick Preset Chips (Common Match Formats)
                        Text("Quick Presets:", color = SlateGray, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            listOf(5, 6, 8, 10, 12, 15, 20).forEach { ov ->
                                FilterChip(
                                    selected = currentOvers == ov && isValidOvers,
                                    onClick = { oversText = ov.toString() },
                                    label = { Text("${ov} ov", fontSize = 11.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = CricketGreen,
                                        selectedLabelColor = Color.White,
                                        containerColor = Color(0xFF1E293B),
                                        labelColor = Color.White.copy(alpha = 0.8f)
                                    )
                                )
                            }
                        }
                    }
                }
            }

            // Teams Card
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Teams & Rosters", color = PitchAmber, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        TextButton(onClick = onNavigateToManageTeams) {
                            Icon(Icons.Default.Person, contentDescription = null, tint = PitchAmberLight, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Manage Teams", color = PitchAmberLight, fontSize = 12.sp)
                        }
                    }

                    if (savedTeams.isNotEmpty()) {
                        Text("Pick Saved Team 1:", color = SlateGray, fontSize = 12.sp)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            savedTeams.forEach { st ->
                                FilterChip(
                                    selected = team1Name == st.name,
                                    onClick = {
                                        team1Name = st.name
                                        team1PlayersText = st.players.joinToString("\n")
                                    },
                                    label = { Text(st.name) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = CricketGreen,
                                        selectedLabelColor = Color.White
                                    )
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = team1Name,
                        onValueChange = { team1Name = it },
                        label = { Text("Team 1 Name") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PitchAmber,
                            focusedLabelColor = PitchAmber,
                            unfocusedTextColor = Color.White,
                            focusedTextColor = Color.White
                        )
                    )

                    OutlinedTextField(
                        value = team1PlayersText,
                        onValueChange = { team1PlayersText = it },
                        label = { Text("Team 1 Players (one per line)") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PitchAmber,
                            focusedLabelColor = PitchAmber,
                            unfocusedTextColor = Color.White,
                            focusedTextColor = Color.White
                        )
                    )

                    HorizontalDivider(color = SlateGray.copy(alpha = 0.3f), modifier = Modifier.padding(vertical = 4.dp))

                    if (savedTeams.isNotEmpty()) {
                        Text("Pick Saved Team 2:", color = SlateGray, fontSize = 12.sp)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            savedTeams.forEach { st ->
                                FilterChip(
                                    selected = team2Name == st.name,
                                    onClick = {
                                        team2Name = st.name
                                        team2PlayersText = st.players.joinToString("\n")
                                    },
                                    label = { Text(st.name) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = CricketGreen,
                                        selectedLabelColor = Color.White
                                    )
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = team2Name,
                        onValueChange = { team2Name = it },
                        label = { Text("Team 2 Name") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PitchAmber,
                            focusedLabelColor = PitchAmber,
                            unfocusedTextColor = Color.White,
                            focusedTextColor = Color.White
                        )
                    )

                    OutlinedTextField(
                        value = team2PlayersText,
                        onValueChange = { team2PlayersText = it },
                        label = { Text("Team 2 Players (one per line)") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PitchAmber,
                            focusedLabelColor = PitchAmber,
                            unfocusedTextColor = Color.White,
                            focusedTextColor = Color.White
                        )
                    )
                }
            }

            // Toss Card
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Toss Setup", color = PitchAmber, fontWeight = FontWeight.Bold, fontSize = 16.sp)

                    Text("Toss Won By:", color = Color.White, fontSize = 14.sp)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        FilterChip(
                            selected = tossWinnerTeam == 1,
                            onClick = { tossWinnerTeam = 1 },
                            label = { Text(team1Name.ifEmpty { "Team 1" }) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = CricketGreen,
                                selectedLabelColor = Color.White
                            )
                        )
                        FilterChip(
                            selected = tossWinnerTeam == 2,
                            onClick = { tossWinnerTeam = 2 },
                            label = { Text(team2Name.ifEmpty { "Team 2" }) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = CricketGreen,
                                selectedLabelColor = Color.White
                            )
                        )
                    }

                    Text("Elected To:", color = Color.White, fontSize = 14.sp)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        FilterChip(
                            selected = tossChoice == TossChoice.BAT,
                            onClick = { tossChoice = TossChoice.BAT },
                            label = { Text("Bat First") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = PitchAmber,
                                selectedLabelColor = DarkNavy
                            )
                        )
                        FilterChip(
                            selected = tossChoice == TossChoice.BOWL,
                            onClick = { tossChoice = TossChoice.BOWL },
                            label = { Text("Bowl First") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = PitchAmber,
                                selectedLabelColor = DarkNavy
                            )
                        )
                    }
                }
            }

            Button(
                onClick = {
                    if (isSubmitting) return@Button
                    isSubmitting = true
                    val parsedOversValue = oversText.toIntOrNull()?.coerceIn(1, 100) ?: 10
                    coroutineScope.launch {
                        try {
                            val tId = repository.createTournament(
                                name = tournamentName.ifEmpty { "Cricket Tournament" },
                                overs = parsedOversValue,
                                playersPerSide = 11
                            )

                            val t1Id = repository.addTeam(tId, team1Name.ifEmpty { "Team 1" })
                            val t2Id = repository.addTeam(tId, team2Name.ifEmpty { "Team 2" })

                            // Add players
                            val p1List = team1PlayersText.lines().map { it.trim() }.filter { it.isNotEmpty() }
                            p1List.forEachIndexed { idx, pName ->
                                repository.addPlayer(t1Id, pName, idx + 1)
                            }

                            val p2List = team2PlayersText.lines().map { it.trim() }.filter { it.isNotEmpty() }
                            p2List.forEachIndexed { idx, pName ->
                                repository.addPlayer(t2Id, pName, idx + 1)
                            }

                            val matchId = repository.createMatch(tId, t1Id, t2Id)
                            val winnerId = if (tossWinnerTeam == 1) t1Id else t2Id
                            repository.setToss(matchId, winnerId, tossChoice)

                            onMatchStarted(matchId)
                        } catch (e: Exception) {
                            e.printStackTrace()
                            isSubmitting = false
                        }
                    }
                },
                enabled = !isSubmitting && (oversText.toIntOrNull() != null && oversText.toIntOrNull()!! in 1..100),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = CricketGreen),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text(
                    text = if (isSubmitting) "Creating Match..." else "Start Match & Begin Scoring",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }
        }
    }
}
