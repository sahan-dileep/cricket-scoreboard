package com.cricket.scorer.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = PitchAmber,
    onPrimary = DarkNavy,
    primaryContainer = CricketGreenDark,
    onPrimaryContainer = Color.White,
    secondary = CricketGreen,
    onSecondary = Color.White,
    background = DarkNavy,
    onBackground = OnDarkSurface,
    surface = DarkNavyLight,
    onSurface = OnDarkSurface,
    error = CricketRed,
    onError = Color.White
)

@Composable
fun CricketScorerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
