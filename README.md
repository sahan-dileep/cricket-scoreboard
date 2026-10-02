# 🏏 Cricket Tournament Management System

A complete solution for organizing cricket tournaments, featuring:
1. **Android Scorer App** (`android-scorer/`): A native Android app (Kotlin + Jetpack Compose) for ball-by-ball scoring with an embedded HTTP server (port 8080).
2. **Next.js Web Scoreboard** (`web-scoreboard/`): A modern Next.js 16 + React + Tailwind CSS TV display with live score polling, split-screen video/image ad playback, looping Papare brass band music, and an Admin control console.

---

## 🏗️ Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │          Local Wi-Fi Network LAN             │
                  └──────────────────────┬───────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
     📱 Android Scorer App                         🌐 Next.js Web App
  • Kotlin + Jetpack Compose                    • TV Scoreboard (`/`)
  • Ball-by-ball entry                          • Admin Console (`/admin`)
  • Embedded NanoHTTPD (port 8080)              • Split-Screen Ads
  • Endpoints:                                  • Papare Music Loop
    - GET /api/score                            • 2-second live polling
    - POST /api/admin/command
    - GET /api/tournament
```

---

## 📱 1. Android Scorer App (`android-scorer/`)

### Key Features
- **Tournament Setup**: Configure overs per side (10–15 overs) and teams with player rosters.
- **Match Flow**: Coin toss, batting order, and two-innings scoring.
- **Ball-by-Ball Logging**:
  - Runs (0, 1, 2, 3, 4, 6)
  - Extras (Wide, No-Ball, Bye, Leg-Bye)
  - Dismissals (Bowled, Caught, Run-Out, LBW, Stumped, Hit-Wicket)
  - Undo last ball functionality.
- **Full Scorecard**: Individual batsman stats (R, B, 4s, 6s, Strike Rate), bowler figures (Overs, Runs, Wickets, Economy), fall of wickets, partnerships, and required run rates.
- **Points Table**: Automatic standings calculation with Net Run Rate (NRR).
- **Embedded HTTP Server**: Exposes REST endpoints on port `8080`.
- **Screen Wake Lock**: Prevents the screen from turning off during live matches.
- **Wi-Fi IP Display**: Shows the Android device's local IP address prominently on the home screen.

### Building & Running
```bash
cd android-scorer
./gradlew assembleDebug
```
The debug APK will be generated at `android-scorer/app/build/outputs/apk/debug/app-debug.apk`.

---

## 🌐 2. Next.js Web Scoreboard (`web-scoreboard/`)

### Key Features
- **TV Scoreboard (`/`)**:
  - Designed for 1080p projectors and big screens (landscape).
  - 2-second automatic polling of the Android device over local Wi-Fi.
  - Flash animations on score updates.
  - Batsmen at crease with on-strike indicators (★).
  - Current bowler figures and partnership stats.
  - Colour-coded recent ball history (0, 1-3, 4, 6, W, Extras).
  - Target chase panel for the 2nd innings.
  - **Split-Screen Ad Display**: Plays video or image ads alongside the scoreboard without hiding the live score.
  - **Papare Music Bar**: Animated waveform bar with looping brass band music.
- **Admin Control Console (`/admin`)**:
  - Connect to the Android Scorer device by IP.
  - Drag-and-drop or browse to upload video ads, image ads, and music files.
  - Play / Stop controls for each media item.
  - Configurable auto-stop timer for image ads.
  - Continuous loop toggle for Papare music.
  - Quick broadcast action buttons.
  - Live event audit log.

### Running the Web App
```bash
cd web-scoreboard
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for the TV Scoreboard, and [http://localhost:3000/admin](http://localhost:3000/admin) for the Admin Console.

To create an optimized production build:
```bash
npm run build
npm start
```

---

## 📡 3. Local Wi-Fi Setup Guide

1. Connect both the **Android phone** and the **laptop/PC** (running the scoreboard) to the **same Wi-Fi network**.
2. Open the **Cricket Scorer app** on Android and note the IP address shown at the top (e.g., `192.168.1.45`).
3. Open the **TV Scoreboard** in any web browser and enter the IP address when prompted.
4. Open the **Admin Console** at `/admin` to upload your company ads and Papare tracks!
