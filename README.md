# 🏏 Cricket Tournament Management System

A production-quality, local Wi-Fi synchronized cricket tournament solution featuring a native **Android Scorer App** (Kotlin + Jetpack Compose) with an embedded HTTP REST server, and a modern **Next.js Web Scoreboard & Admin Console** (React 19 + TypeScript + Tailwind CSS) designed for 1080p landscape TV displays and live tournament administration.

---

## 📋 Table of Contents
1. [System Overview](#-system-overview)
2. [Architecture & Data Flow](#-architecture--data-flow)
3. [Android Scorer App (`android-scorer/`)](#-1-android-scorer-app-android-scorer)
   - [Features](#android-features)
   - [Prerequisites](#android-prerequisites)
   - [Build & Run](#android-build--run)
   - [Testing](#android-testing)
   - [HTTP REST Endpoints (Port 8080)](#http-rest-endpoints-port-8080)
4. [Web Scoreboard & Admin Console (`web-scoreboard/`)](#-2-web-scoreboard--admin-console-web-scoreboard)
   - [Features](#web-features)
   - [Prerequisites](#web-prerequisites)
   - [Installation & Execution](#web-installation--execution)
   - [Testing & Quality Verification](#web-testing--quality-verification)
   - [Route Guide](#web-route-guide)
5. [Local Wi-Fi Connection & Setup Guide](#-3-local-wi-fi-connection--setup-guide)
6. [Repository Structure](#-4-repository-structure)

---

## 🌟 System Overview

The **Cricket Tournament System** enables live scoring of multi-team cricket tournaments directly from an umpire's or scorer's mobile device, seamlessly broadcasting real-time match state, color-coded ball histories, chase statistics, sponsor advertisements, and festive Papare music to a stadium or pavilion big-screen TV over standard local Wi-Fi — with zero cloud or internet connectivity required.

- **📱 Android Scorer**: Native mobile app delivering ball-by-ball entry, toss and innings management, multi-ball undo, automated bowler figures and batsman statistics, points table calculation with Net Run Rate (NRR), device wake lock, and an embedded NanoHTTPD REST server on port 8080.
- **📺 Web TV Scoreboard (`/`)**: 1080p landscape broadcast graphics engine polling the Android device every 2 seconds, displaying live scores, current batsmen with strike indicators, bowler economy, 3-over color-coded ball history, 2nd-innings chase panel, score flash animation, split-screen video/image ad panel, looping Papare brass band music with animated waveform equalizer, and victory banners.
- **🎛️ Web Admin Console (`/admin`)**: Real-time management console for stadium media coordinators, featuring live mini score preview (3s polling), drag-and-drop / file-picker media library for sponsor ads and audio tracks, play/stop triggers, auto-stop duration timers for image ads, music looping controls, quick command shortcuts, and timestamped event audit logs.

---

## 🏗️ Architecture & Data Flow

```
                           ┌────────────────────────────────────────────────────────┐
                           │            Local Wi-Fi Network / Hotspot               │
                           └───────────────┬────────────────────────┬───────────────┘
                                           │                        │
                                           ▼                        ▼
               ┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
               │    📱 Android Scorer Device          │  │       🌐 Next.js Web Server          │
               │    (e.g., 192.168.1.45:8080)         │  │       (http://localhost:3000)        │
               ├──────────────────────────────────────┤  ├──────────────────────────────────────┤
               │ • Kotlin + Jetpack Compose UI        │  │ • TV Scoreboard Route (/)            │
               │ • CricketRepository State Engine     │  │   - 2-second polling of GET /score   │
               │ • WAKE_LOCK (Screen Always On)       │  │   - Split-screen video/image ads     │
               │ • Embedded NanoHTTPD REST Server     │  │   - Looping Papare music + waveform  │
               │   - GET  /api/score                  │  │ • Admin Console Route (/admin)       │
               │   - POST /api/admin/command          │  │   - Media library & upload           │
               │   - GET  /api/tournament             │  │   - POST commands to Android device  │
               └──────────────────────────────────────┘  └──────────────────────────────────────┘
```

---

## 📱 1. Android Scorer App (`android-scorer/`)

### Android Features
- **Tournament Setup**: Configurable overs per side (10–15 overs) and custom team rosters.
- **Match Setup & Toss**: Team selection, coin toss winner, decision (Bat/Bowl), and opening batsmen and bowler assignment.
- **Ball-by-Ball Engine**:
  - Runs scoring: `0`, `1`, `2`, `3`, `4`, `6`.
  - Extras: Wide (`WD`), No-Ball (`NB`), Bye (`B`), Leg-Bye (`LB`).
  - Dismissals (6 types): Bowled, Caught, Run-Out, LBW, Stumped, Hit-Wicket with incoming batsman selection.
  - Multi-ball undo: Reverses score, legal deliveries, bowler stats, batsman figures, and dismissals safely.
- **Full Scorecard & In-depth Analytics**: Real-time batsman figures (R, B, 4s, 6s, SR), bowler spells (O, M, R, W, Econ), fall-of-wickets history, current run rate (CRR), and required run rate (RRR).
- **Tournament Points Table**: Win = 2 pts, Tie = 1 pt, Loss = 0 pts, with ICC-compliant Net Run Rate (NRR) calculation.
- **Embedded HTTP REST Server**: Powered by NanoHTTPD on port `8080` with full CORS support (`*`) and JSON serialization.
- **Screen Always On**: Utilizes Android `WAKE_LOCK` to ensure uninterrupted match scoring.
- **Wi-Fi IP Visibility**: Local IP address (`192.168.x.x` / `10.x.x.x`) prominently displayed on the Home screen.

### Android Prerequisites
- **JDK**: Java Development Kit 21 (`JDK 21`)
- **Android SDK**: API Level 35 (Build-Tools 35.0.0, compileSdk 35, targetSdk 35, minSdk 26)
- **Gradle Wrapper**: Pre-configured Gradle 8.11.1 (`gradlew.bat` / `gradlew`)

### Android Build & Run
To compile and generate the debug APK from PowerShell:
```powershell
cd d:\cricket\android-scorer
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
.\gradlew.bat assembleDebug
```
The debug APK will be generated at:
```
android-scorer/app/build/outputs/apk/debug/app-debug.apk
```

To install directly to a connected Android device or emulator via ADB:
```powershell
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Android Testing
The Android test suite validates ball-by-ball mechanics, extras, strike rotation, wicket handling, multi-ball undo, NRR calculation, and HTTP endpoint serialization across 24 unit tests:
```powershell
cd d:\cricket\android-scorer
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
.\gradlew.bat testDebugUnitTest --no-daemon
```
*Output: 24 tests completed with 0 failures.*

### HTTP REST Endpoints (Port 8080)
The Android embedded server exposes the following REST APIs:

#### 1. `GET /api/score`
Returns the complete live match state.
- **Response Format**:
  ```json
  {
    "match": {
      "id": "match-1",
      "team1": "Colombo Kings",
      "team2": "Kandy Warriors",
      "totalOvers": 10,
      "currentInnings": 1,
      "isCompleted": false,
      "result": null
    },
    "currentInnings": {
      "battingTeam": "Colombo Kings",
      "bowlingTeam": "Kandy Warriors",
      "totalRuns": 54,
      "totalWickets": 2,
      "totalBalls": 34,
      "currentOverBalls": 4
    },
    "batting": [
      {
        "id": "p1",
        "name": "K. Mendis",
        "runs": 28,
        "balls": 18,
        "fours": 3,
        "sixes": 1,
        "strikeRate": 155.56,
        "isStriker": true
      },
      {
        "id": "p2",
        "name": "P. Nissanka",
        "runs": 16,
        "balls": 12,
        "fours": 2,
        "sixes": 0,
        "strikeRate": 133.33,
        "isStriker": false
      }
    ],
    "bowler": {
      "id": "p7",
      "name": "W. Hasaranga",
      "overs": "2.4",
      "maidens": 0,
      "runs": 18,
      "wickets": 1,
      "economy": 6.75
    },
    "partnership": { "runs": 32, "balls": 21 },
    "recentBalls": [
      {
        "overNumber": 6,
        "balls": [
          { "text": "1", "color": "blue", "runs": 1, "isWicket": false, "isExtra": false },
          { "text": "4", "color": "green", "runs": 4, "isWicket": false, "isExtra": false },
          { "text": "W", "color": "red", "runs": 0, "isWicket": true, "isExtra": false },
          { "text": "•", "color": "grey", "runs": 0, "isWicket": false, "isExtra": false }
        ]
      }
    ],
    "chase": null,
    "adminCommand": null
  }
  ```

#### 2. `POST /api/admin/command`
Receives admin actions from `/admin` and stages them for the web scoreboard poll.
- **Request Body**:
  ```json
  {
    "command": "PLAY_MUSIC",
    "payload": { "audioUrl": "blob:..." }
  }
  ```
- **Supported Command Types**:
  - `PLAY_VIDEO_AD`: Starts split-screen video advertisement.
  - `PLAY_IMAGE_AD`: Starts split-screen image ad with duration timeout.
  - `STOP_AD`: Hides the ad panel.
  - `PLAY_MUSIC`: Starts Papare brass band music loop.
  - `STOP_MUSIC`: Stops Papare music.
  - `CLEAR_RESULT`: Clears the post-match victory overlay.
- **Response**: `{"status": "ok", "received": "PLAY_MUSIC"}`

#### 3. `GET /api/tournament`
Returns the tournament details and standings table with calculated Net Run Rates.
- **Response Format**:
  ```json
  {
    "tournamentId": "tourney-1",
    "name": "Corporate Premier League 2026",
    "overs": 10,
    "teams": ["Colombo Kings", "Kandy Warriors", "Galle Titans"],
    "standings": [
      {
        "teamName": "Colombo Kings",
        "played": 2,
        "won": 2,
        "lost": 0,
        "tied": 0,
        "points": 4,
        "nrr": 1.450
      }
    ]
  }
  ```

---

## 🌐 2. Web Scoreboard & Admin Console (`web-scoreboard/`)

### Web Features
- **TV Scoreboard (`/`)**:
  - Engineered for 1080p landscape display (monitors, projectors, stadium displays).
  - 2-second automatic polling of `GET /api/score` over local Wi-Fi.
  - Dual batsman display with live runs, balls, boundaries, strike rate, and strike star (`★`).
  - Current bowler card with overs, maidens, runs, wickets, and economy rate.
  - Strictly color-coded 3-over recent delivery history:
    - Dot (`•`): Slate/Grey (`bg-slate-700`)
    - 1–3 Runs: Blue (`bg-blue-600`)
    - 4 Runs: Emerald/Green (`bg-emerald-600`)
    - 6 Runs: Amber/Orange (`bg-amber-600`)
    - Wickets (`W`): Rose/Red (`bg-rose-600`)
    - Extras (`WD`, `NB`, `B`, `LB`): Purple (`bg-purple-600`)
  - 2nd Innings Target Chase Panel: target runs, runs needed, balls remaining, and required run rate (RRR).
  - Score flash animations when the total runs change.
  - Live Wi-Fi connection indicator badge with IP configuration modal.
  - **Split-Screen Ad Player**: Automatically slides in video or image sponsor ads side-by-side with the scoreboard, keeping the live cricket match score in view at all times.
  - **Papare Music Bar**: Looping brass band audio with animated waveform equalizer (`🎺`), controllable from the admin panel.
  - **Match Result Banner**: Victory alert banner celebrating the winner, clearable via quick command.
- **Admin Control Console (`/admin`)**:
  - Live mini scoreboard preview (polls every 3 seconds).
  - Drag-and-drop & file-picker media library for videos, images, and audio tracks.
  - Independent play and stop triggers with auto-stop image timers.
  - Continuous loop toggle for Papare music tracks.
  - Quick command shortcuts (`🎺 Play Papare`, `⏹ Stop Music`, `⏹ Stop Ad`, `🏆 Clear Result Banner`).
  - Real-time timestamped event log for tournament media audit trails.

### Web Prerequisites
- **Node.js**: Version 18.0.0 or later (tested on Node.js 22)
- **npm**: Version 9.0.0 or later

### Web Installation & Execution
```powershell
cd d:\cricket\web-scoreboard
npm install
```

#### Development Mode (Port 3000)
```powershell
npm run dev
```
Access the application at:
- TV Scoreboard: `http://localhost:3000`
- Admin Console: `http://localhost:3000/admin`

#### Production Build & Start
```powershell
npm run build
npm start
```
*Generates optimized standalone Next.js production server running on port 3000.*

### Web Testing & Quality Verification
The web application includes comprehensive end-to-end integration tests, React SSR stress harnesses, and TypeScript verification:
```powershell
cd d:\cricket\web-scoreboard

# Run the 32-test E2E and tier verification suite
npm test

# Run the 40-assertion React component stress harness
npx tsx scripts/render-stress.mjs

# Run code style and TypeScript type checking
npm run lint
npx tsc --noEmit
```
*All 32 tests across Tiers 1–4 and 40 stress assertions pass with 0 errors.*

### Web Route Guide
| Route | Purpose | Target Display | Polling Interval |
|:---|:---|:---|:---|
| `/` | TV Scoreboard broadcast view | 1080p Landscape Projector / TV | 2 seconds |
| `/admin` | Admin Control & Media Console | Laptop / Tablet Media Operator | 3 seconds |

---

## 📡 3. Local Wi-Fi Connection & Setup Guide

The Cricket Tournament System communicates seamlessly over a local area network without requiring an active internet connection.

### Step 1: Network Connection
1. Connect both the **Android Scorer device** and the **laptop / PC** hosting the Web Scoreboard to the **same Wi-Fi router** or **mobile hotspot**.
2. *Tip: A portable Wi-Fi router or phone mobile hotspot works perfectly on cricket grounds.*

### Step 2: Note the Android Device IP
1. Launch the **Cricket Scorer app** on the Android device.
2. The device's local IP address (e.g., `192.168.1.45` or `192.168.43.102`) is prominently displayed on the Home screen header.

### Step 3: Connect the Web Scoreboard
1. On the PC/laptop connected to the projector/TV, open Chrome or Edge and navigate to `http://localhost:3000`.
2. On first launch, a setup modal will prompt you for the **Scorer IP Address**.
3. Enter the Android device IP address (e.g., `192.168.1.45`) and click **Connect**.
4. The scoreboard will establish communication, and the connection badge in the top-right corner will switch to **🟢 LIVE**.
5. The IP is saved to browser `localStorage` for automatic reconnection.

### Step 4: Admin Console & Media Broadcast
1. Open `http://localhost:3000/admin` on an operator laptop.
2. Verify the connected IP matches the Android device.
3. Drag and drop company video ads (`.mp4`), sponsor graphic banners (`.png`, `.jpg`), or festive Papare brass band songs (`.mp3`).
4. Click **Play** on any media item to trigger split-screen ads or music on the TV scoreboard!

### ⚠️ Firewall Notes (Port 8080)
- The Android Scorer app hosts its REST server on **Port 8080**.
- In standard Wi-Fi router setups, communication between devices on port 8080 is enabled by default.
- If running the Android app inside an emulator or through a Windows hotspot, ensure that incoming traffic on port 8080 is allowed in Windows Defender Firewall:
  ```powershell
  New-NetFirewallRule -DisplayName "Cricket Scorer HTTP 8080" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
  ```
- If connecting an Android Emulator on the same machine running the web app, you can map the port via ADB:
  ```powershell
  adb forward tcp:8080 tcp:8080
  ```
  Then enter `localhost` as the IP address in the web scoreboard.

---

## 📁 4. Repository Structure

```
d:\cricket\
├── README.md                      # Comprehensive system documentation & setup guide
├── TEST_READY.md                  # Verification attestation & automated test runner guide
├── .gitignore                     # Git ignore rules for Android, Next.js, and dependencies
├── android-scorer/                # Android Jetpack Compose native application
│   ├── build.gradle.kts           # Root Gradle build configuration
│   ├── settings.gradle.kts        # Project settings & repositories
│   ├── gradle.properties          # JVM memory & AndroidX flags
│   ├── gradlew, gradlew.bat       # Gradle wrapper executables
│   ├── gradle/wrapper/            # Gradle 8.11.1 wrapper JAR & properties
│   └── app/
│       ├── build.gradle.kts       # App module build dependencies (Compose, NanoHTTPD)
│       ├── proguard-rules.pro     # R8/ProGuard configuration
│       └── src/
│           ├── main/
│           │   ├── AndroidManifest.xml # Permissions: INTERNET, ACCESS_NETWORK_STATE, WAKE_LOCK
│           │   ├── java/com/cricket/scorer/
│           │   │   ├── MainActivity.kt # Navigation & Compose entry point
│           │   │   ├── data/
│           │   │   │   ├── model/Models.kt         # Cricket data models & JSON helpers
│           │   │   │   └── repository/CricketRepository.kt # Match & Tournament domain engine
│           │   │   ├── server/CricketHttpServer.kt # Port 8080 NanoHTTPD REST server
│           │   │   ├── util/NetworkUtils.kt        # Wi-Fi IP detection & formatting
│           │   │   └── ui/
│           │   │       ├── home/HomeScreen.kt      # IP display & menu navigation
│           │   │       ├── setup/SetupScreen.kt    # Teams, toss, and overs setup
│           │   │       ├── scoring/ScoringScreen.kt# Live ball-by-ball scoring screen
│           │   │       ├── scorecard/ScorecardScreen.kt # In-depth scorecard
│           │   │       └── tournament/TournamentScreen.kt # Points table & NRR
│           │   └── res/values/strings.xml, colors.xml, themes.xml
│           └── test/java/com/cricket/scorer/
│               ├── CricketScoringTest.kt    # 13 core scoring & NRR unit tests
│               └── AdversarialStressTest.kt # 11 adversarial boundary & undo tests
└── web-scoreboard/                # Modern Next.js 16 Web Scoreboard & Admin Console
    ├── package.json               # Dependencies & test scripts
    ├── tsconfig.json              # TypeScript strict configuration
    ├── next.config.ts             # Next.js build configuration
    ├── public/assets/             # Static audio & fallback media assets
    ├── scripts/render-stress.mjs  # React SSR adversarial stress harness (40 checks)
    ├── tests/
    │   ├── e2e-integration.test.mjs # 10 Tier 1-4 end-to-end integration tests
    │   ├── api-score.test.mjs       # HTTP schema compliance tests
    │   ├── ball-history.test.mjs    # Ball color coding & 3-over clamp tests
    │   ├── papare-music.test.mjs    # Looping audio & waveform tests
    │   └── split-screen-ad.test.mjs # Ad panel isolation tests
    └── src/
        ├── types/cricket.ts       # Shared TypeScript schemas & command types
        ├── components/
        │   ├── MusicBar.tsx       # Looping Papare audio player & waveform bar
        │   ├── RecentBalls.tsx    # Color-coded 3-over delivery badges
        │   ├── ResultBanner.tsx   # Match winner celebration overlay
        │   ├── SplitAdPanel.tsx   # Split-screen video/image sponsor player
        │   └── StatsFooter.tsx    # Run rate, extras, and chase statistics
        └── app/
            ├── layout.tsx         # Root HTML layout & fonts
            ├── globals.css        # Tailwind styling & scoreboard animations
            ├── page.tsx           # TV-Style 1080p landscape scoreboard
            └── admin/page.tsx     # Admin Control Console & media manager
```
