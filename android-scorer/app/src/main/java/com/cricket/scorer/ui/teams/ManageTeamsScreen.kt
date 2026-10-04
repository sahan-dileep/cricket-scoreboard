package com.cricket.scorer.ui.teams

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cricket.scorer.data.model.TeamWithPlayers
import com.cricket.scorer.data.repository.CricketRepository
import com.cricket.scorer.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManageTeamsScreen(
    repository: CricketRepository,
    onNavigateBack: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    var teams by remember { mutableStateOf<List<TeamWithPlayers>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    // Dialog state
    var showDialog by remember { mutableStateOf(false) }
    var editingTeamId by remember { mutableStateOf<Int?>(null) }
    var teamNameInput by remember { mutableStateOf("") }
    var playersInput by remember { mutableStateOf("") }

    // Delete confirmation state
    var teamToDelete by remember { mutableStateOf<TeamWithPlayers?>(null) }

    fun refreshTeams() {
        coroutineScope.launch {
            isLoading = true
            teams = repository.getAllTeamsWithPlayers()
            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        refreshTeams()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Manage Teams & Rosters", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                },
                actions = {
                    IconButton(onClick = {
                        editingTeamId = null
                        teamNameInput = ""
                        playersInput = ""
                        showDialog = true
                    }) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Add Team",
                            tint = PitchAmber
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DarkNavyLight,
                    titleContentColor = Color.White
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    editingTeamId = null
                    teamNameInput = ""
                    playersInput = ""
                    showDialog = true
                },
                containerColor = PitchAmber,
                contentColor = DarkNavy
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Team")
            }
        },
        containerColor = DarkNavy
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = PitchAmber
                )
            } else if (teams.isEmpty()) {
                Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = SlateGray,
                        modifier = Modifier.size(64.dp)
                    )
                    Text(
                        text = "No teams saved yet",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Add your tournament teams and player rosters to quickly select them when starting a match.",
                        color = SlateGray,
                        fontSize = 14.sp
                    )
                    Button(
                        onClick = {
                            editingTeamId = null
                            teamNameInput = ""
                            playersInput = ""
                            showDialog = true
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = CricketGreen)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Add First Team")
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(teams, key = { it.id }) { team ->
                        TeamCard(
                            team = team,
                            onEdit = {
                                editingTeamId = team.id
                                teamNameInput = team.name
                                playersInput = team.players.joinToString("\n")
                                showDialog = true
                            },
                            onDelete = {
                                teamToDelete = team
                            }
                        )
                    }
                    item {
                        Spacer(modifier = Modifier.height(72.dp))
                    }
                }
            }
        }
    }

    // Add / Edit Dialog
    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = {
                Text(
                    text = if (editingTeamId == null) "Create New Team" else "Edit Team & Roster",
                    fontWeight = FontWeight.Bold,
                    color = PitchAmber
                )
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = teamNameInput,
                        onValueChange = { teamNameInput = it },
                        label = { Text("Team Name") },
                        placeholder = { Text("e.g. Finance Fighters") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PitchAmber,
                            focusedLabelColor = PitchAmber,
                            unfocusedTextColor = Color.White,
                            focusedTextColor = Color.White
                        )
                    )

                    OutlinedTextField(
                        value = playersInput,
                        onValueChange = { playersInput = it },
                        label = { Text("Players (one per line)") },
                        placeholder = { Text("Player 1\nPlayer 2\nPlayer 3...") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PitchAmber,
                            focusedLabelColor = PitchAmber,
                            unfocusedTextColor = Color.White,
                            focusedTextColor = Color.White
                        )
                    )

                    val count = playersInput.lines().filter { it.isNotBlank() }.size
                    Text(
                        text = "$count player(s) listed",
                        fontSize = 12.sp,
                        color = if (count in 10..15) CricketGreen else PitchAmberLight
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val name = teamNameInput.trim()
                        if (name.isNotEmpty()) {
                            val playerList = playersInput.lines()
                                .map { it.trim() }
                                .filter { it.isNotBlank() }
                            coroutineScope.launch {
                                repository.saveTeamWithPlayers(
                                    teamId = editingTeamId,
                                    name = name,
                                    playerNames = playerList
                                )
                                showDialog = false
                                refreshTeams()
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CricketGreen)
                ) {
                    Text("Save Team", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDialog = false }) {
                    Text("Cancel", color = SlateGray)
                }
            },
            containerColor = DarkNavyLight,
            shape = RoundedCornerShape(16.dp)
        )
    }

    // Delete Confirmation Dialog
    teamToDelete?.let { team ->
        AlertDialog(
            onDismissRequest = { teamToDelete = null },
            title = { Text("Delete Team?", color = CricketRed, fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    "Are you sure you want to delete \"${team.name}\" and all ${team.players.size} player(s)?",
                    color = Color.White
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        coroutineScope.launch {
                            repository.deleteTeam(team.id)
                            teamToDelete = null
                            refreshTeams()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CricketRed)
                ) {
                    Text("Delete", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { teamToDelete = null }) {
                    Text("Cancel", color = SlateGray)
                }
            },
            containerColor = DarkNavyLight,
            shape = RoundedCornerShape(16.dp)
        )
    }
}

@Composable
private fun TeamCard(
    team: TeamWithPlayers,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = DarkNavyLight),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = team.name,
                        color = PitchAmber,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                    Text(
                        text = "${team.players.size} players in roster",
                        color = SlateGray,
                        fontSize = 12.sp
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(onClick = onEdit) {
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = "Edit Team",
                            tint = Color.White
                        )
                    }
                    IconButton(onClick = onDelete) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "Delete Team",
                            tint = CricketRed
                        )
                    }
                }
            }

            if (team.players.isNotEmpty()) {
                HorizontalDivider(
                    color = SlateGray.copy(alpha = 0.2f),
                    modifier = Modifier.padding(vertical = 4.dp)
                )
                Text(
                    text = team.players.joinToString("  •  "),
                    color = Color.White.copy(alpha = 0.85f),
                    fontSize = 13.sp,
                    lineHeight = 18.sp
                )
            }
        }
    }
}
