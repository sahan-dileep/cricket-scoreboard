package com.cricket.scorer.ui.scorecard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cricket.scorer.data.model.InningsSummary
import com.cricket.scorer.data.model.MatchState
import com.cricket.scorer.data.repository.CricketRepository

fun getRcPlayerRoleIcon(playerName: String): String {
    val lower = playerName.lowercase()
    return when {
        lower.contains("perera") || (lower.contains("mendis") && lower.contains("k.")) ||
        lower.contains("samarawickrama") || lower.contains("carey") || lower.contains("pant") ||
        lower.contains("dhoni") || lower.contains("buttler") -> "🧤" // Wicket Keeper
        lower.contains("chameera") || lower.contains("theekshana") || lower.contains("kumara") ||
        lower.contains("rajitha") || lower.contains("pathirana") || lower.contains("pradeep") ||
        lower.contains("zampa") || lower.contains("starc") || lower.contains("cummins") ||
        lower.contains("bumrah") || lower.contains("shami") || lower.contains("boult") -> "🎳" // Baller / Bowler
        lower.contains("asalanka") || lower.contains("hasaranga") || lower.contains("shanaka") ||
        lower.contains("karunaratne") || lower.contains("mathews") || lower.contains("de silva") ||
        lower.contains("stoinis") || lower.contains("green") || lower.contains("agar") ||
        lower.contains("pandya") || lower.contains("jadeja") || lower.contains("stokes") -> "⚡" // All Rounder
        else -> "🏏" // Batting / Batsman
    }
}

@Composable
fun ScorecardScreen(
    matchId: Int,
    repository: CricketRepository,
    onNavigateBack: () -> Unit
) {
    var matchState by remember { mutableStateOf<MatchState?>(null) }
    var selectedInningsTab by remember { mutableStateOf(1) }
    var activeScorecardTab by remember { mutableStateOf("BATTING") } // "BATTING" or "BOWLING"
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(matchId) {
        matchState = repository.getMatchState(matchId)
        isLoading = false
    }

    // Stadium Night Floodlights Atmosphere Gradient
    val stadiumBackground = Brush.verticalGradient(
        colors = listOf(
            Color(0xFF040A17), // Deep night sky
            Color(0xFF0B1F3B), // Atmospheric blue stadium lighting
            Color(0xFF091E2A), // Outfield turf illumination
            Color(0xFF040D14)  // Dark turf base
        )
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(stadiumBackground)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        if (isLoading || matchState == null) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Color(0xFF00E676))
            }
            return@Box
        }

        val state = matchState!!
        val innings1 = state.innings1
        val innings2 = state.innings2
        val activeInnings: InningsSummary? = if (selectedInningsTab == 1) innings1 else innings2

        val battingTeamName = activeInnings?.battingTeam ?: if (selectedInningsTab == 1) state.team1.name else state.team2.name
        val bowlingTeamName = if (battingTeamName == state.team1.name) state.team2.name else state.team1.name

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // ── TOP BAR: Real Cricket 20 Tabs & Tournament Badge ──
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Scorecard Switcher Tabs
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    // Batting Scorecard Tab
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
                            .background(
                                if (activeScorecardTab == "BATTING") Color(0xFF00E676)
                                else Color(0xCC0F1D33)
                            )
                            .border(
                                width = 1.dp,
                                color = if (activeScorecardTab == "BATTING") Color(0xFF00E676) else Color(0x66334155),
                                shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)
                            )
                            .clickable { activeScorecardTab = "BATTING" }
                            .padding(horizontal = 14.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = "BATTING SCORECARD",
                            color = if (activeScorecardTab == "BATTING") Color(0xFF040D1A) else Color.White,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 12.sp,
                            letterSpacing = 0.8.sp
                        )
                    }

                    // Bowling Scorecard Tab
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
                            .background(
                                if (activeScorecardTab == "BOWLING") Color(0xFF00E676)
                                else Color(0xCC0F1D33)
                            )
                            .border(
                                width = 1.dp,
                                color = if (activeScorecardTab == "BOWLING") Color(0xFF00E676) else Color(0x66334155),
                                shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)
                            )
                            .clickable { activeScorecardTab = "BOWLING" }
                            .padding(horizontal = 14.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = "BOWLING SCORECARD",
                            color = if (activeScorecardTab == "BOWLING") Color(0xFF040D1A) else Color.White,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 12.sp,
                            letterSpacing = 0.8.sp
                        )
                    }
                }

                // Match Badge Ribbon
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xDD0F172A))
                        .border(1.dp, Color(0xFF38BDF8).copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "★ RC 20 LIVE",
                        color = Color(0xFF38BDF8),
                        fontWeight = FontWeight.Black,
                        fontSize = 11.sp,
                        letterSpacing = 1.sp
                    )
                }
            }

            // ── MAIN SCORECARD CONTAINER ──
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xD90A1424))
                    .border(1.dp, Color(0x4D38BDF8), RoundedCornerShape(12.dp))
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Team Ribbon Header
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                Brush.horizontalGradient(
                                    colors = listOf(
                                        Color(0xFF132B4F),
                                        Color(0xFF1E3A5F),
                                        Color(0xFF132B4F)
                                    )
                                )
                            )
                            .border(width = 0.5.dp, color = Color(0x3338BDF8))
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Team Flag/Crest & Name
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text("🏏", fontSize = 16.sp)
                            Text(
                                text = battingTeamName.uppercase(),
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 16.sp,
                                letterSpacing = 1.sp
                            )
                        }

                        // Stepper: < BATTING SCORECARD >
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = "◀",
                                color = if (selectedInningsTab == 1) Color(0x44FFFFFF) else Color(0xFF38BDF8),
                                fontSize = 13.sp,
                                modifier = Modifier
                                    .clickable(enabled = selectedInningsTab > 1) { selectedInningsTab = 1 }
                                    .padding(4.dp)
                            )
                            Text(
                                text = "${if (activeScorecardTab == "BATTING") "BATTING" else "BOWLING"} (INN $selectedInningsTab)",
                                color = Color(0xFF38BDF8),
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 12.sp,
                                letterSpacing = 1.sp
                            )
                            Text(
                                text = "▶",
                                color = if (selectedInningsTab == 2) Color(0x44FFFFFF) else Color(0xFF38BDF8),
                                fontSize = 13.sp,
                                modifier = Modifier
                                    .clickable(enabled = selectedInningsTab < 2) { selectedInningsTab = 2 }
                                    .padding(4.dp)
                            )
                        }
                    }

                    // Content Rows
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState())
                    ) {
                        if (activeScorecardTab == "BATTING") {
                            // Batting Players List
                            val batsmenList = activeInnings?.batsmen ?: emptyList()
                            if (batsmenList.isEmpty()) {
                                Box(
                                    modifier = Modifier.fillMaxWidth().padding(32.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("Yet to bat", color = Color(0x88FFFFFF), fontSize = 14.sp)
                                }
                            } else {
                                batsmenList.forEachIndexed { idx, b ->
                                    val roleIcon = getRcPlayerRoleIcon(b.playerName)
                                    val rowBg = if (idx % 2 == 0) Color(0x4408101E) else Color(0x2213233B)

                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .background(rowBg)
                                            .padding(horizontal = 14.dp, vertical = 7.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        // Left: Role Icon + Name
                                        Row(
                                            modifier = Modifier.weight(1.8f),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Text(roleIcon, fontSize = 13.sp)
                                            Text(
                                                text = b.playerName.uppercase(),
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 13.sp,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }

                                        // Status
                                        Text(
                                            text = if (b.isOut) b.dismissalInfo.ifEmpty { "OUT" }.uppercase() else "NOT OUT",
                                            color = if (b.isOut) Color(0xFF94A3B8) else Color(0xFFE2E8F0),
                                            fontWeight = if (b.isOut) FontWeight.Normal else FontWeight.Bold,
                                            fontSize = 11.sp,
                                            modifier = Modifier.weight(1.2f),
                                            textAlign = TextAlign.End
                                        )

                                        // Runs
                                        Text(
                                            text = "${b.runs}",
                                            color = Color.White,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 14.sp,
                                            modifier = Modifier.width(42.dp),
                                            textAlign = TextAlign.End
                                        )

                                        // Balls
                                        Text(
                                            text = "${b.balls}",
                                            color = Color(0xFFCBD5E1),
                                            fontWeight = FontWeight.Medium,
                                            fontSize = 13.sp,
                                            modifier = Modifier.width(36.dp),
                                            textAlign = TextAlign.End
                                        )
                                    }
                                }
                            }
                        } else {
                            // Bowling Scorecard Header
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0x660F172A))
                                    .padding(horizontal = 14.dp, vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("BOWLER", modifier = Modifier.weight(2f), color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("O", modifier = Modifier.width(36.dp), color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.End)
                                Text("M", modifier = Modifier.width(32.dp), color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.End)
                                Text("R", modifier = Modifier.width(36.dp), color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.End)
                                Text("W", modifier = Modifier.width(32.dp), color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.End)
                                Text("ECON", modifier = Modifier.width(46.dp), color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.End)
                            }

                            val bowlersList = activeInnings?.bowlers ?: emptyList()
                            if (bowlersList.isEmpty()) {
                                Box(
                                    modifier = Modifier.fillMaxWidth().padding(32.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("No bowling figures recorded", color = Color(0x88FFFFFF), fontSize = 14.sp)
                                }
                            } else {
                                bowlersList.forEachIndexed { idx, bw ->
                                    val roleIcon = getRcPlayerRoleIcon(bw.playerName)
                                    val rowBg = if (idx % 2 == 0) Color(0x4408101E) else Color(0x2213233B)

                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .background(rowBg)
                                            .padding(horizontal = 14.dp, vertical = 7.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(
                                            modifier = Modifier.weight(2f),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            Text(roleIcon, fontSize = 13.sp)
                                            Text(
                                                text = bw.playerName.uppercase(),
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 13.sp,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }

                                        Text(bw.overs, color = Color.White, fontSize = 13.sp, modifier = Modifier.width(36.dp), textAlign = TextAlign.End)
                                        Text("${bw.maidens}", color = Color(0xFF94A3B8), fontSize = 13.sp, modifier = Modifier.width(32.dp), textAlign = TextAlign.End)
                                        Text("${bw.runs}", color = Color.White, fontSize = 13.sp, modifier = Modifier.width(36.dp), textAlign = TextAlign.End)
                                        Text("${bw.wickets}", color = Color(0xFF00E676), fontWeight = FontWeight.Black, fontSize = 14.sp, modifier = Modifier.width(32.dp), textAlign = TextAlign.End)
                                        Text("${bw.economy}", color = Color(0xFF38BDF8), fontSize = 12.sp, modifier = Modifier.width(46.dp), textAlign = TextAlign.End)
                                    }
                                }
                            }
                        }
                    }

                    // ── REAL CRICKET BOTTOM STATS BAR ──
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFF0B1728))
                            .border(width = 0.5.dp, color = Color(0x3338BDF8))
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "EXTRAS: ${activeInnings?.extras ?: 0}",
                            color = Color(0xFF94A3B8),
                            fontWeight = FontWeight.Black,
                            fontSize = 13.sp,
                            letterSpacing = 1.sp
                        )

                        Text(
                            text = "OVERS: ${activeInnings?.oversString ?: "0.0"}",
                            color = Color(0xFF94A3B8),
                            fontWeight = FontWeight.Black,
                            fontSize = 13.sp,
                            letterSpacing = 1.sp
                        )

                        // Real Cricket Blue Highlight Box
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(
                                    Brush.horizontalGradient(
                                        listOf(Color(0xFF0369A1), Color(0xFF0284C7))
                                    )
                                )
                                .padding(horizontal = 14.dp, vertical = 5.dp)
                        ) {
                            Text(
                                text = "TOTAL: ${activeInnings?.score ?: 0}-${activeInnings?.wickets ?: 0}",
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 14.sp,
                                letterSpacing = 1.2.sp
                            )
                        }
                    }
                }
            }

            // ── BOTTOM CIRCULAR BACK BUTTON (⮌) ──
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .clip(CircleShape)
                        .background(Color(0xCC0F1D33))
                        .border(1.dp, Color(0x6638BDF8), CircleShape)
                        .clickable(onClick = onNavigateBack),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "⮌",
                        color = Color.White,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Text(
                    text = "REAL CRICKET 20 BROADCAST SCORECARD",
                    color = Color(0x6694A3B8),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.5.sp
                )
            }
        }
    }
}
