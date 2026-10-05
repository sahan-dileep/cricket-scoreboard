export interface Batsman {
  id?: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate?: number;
  onStrike: boolean;
  isStriker?: boolean;
}

export interface Bowler {
  id?: string;
  name: string;
  overs: string | number;
  maidens?: number;
  runs: number;
  wickets: number;
  economy?: string | number;
}

export interface BallDisplay {
  label?: string; // '0', '1', '2', '3', '4', '6', 'W', 'WD', 'NB', etc.
  text?: string;
  color?: string;
  runs?: number;
  isWicket?: boolean;
  isExtra?: boolean;
  isNew?: boolean;
}

export interface OverBalls {
  overNumber: number;
  balls: BallDisplay[];
}

export interface Partnership {
  runs: number;
  balls: number;
}

export interface MatchInfo {
  id?: string;
  team1: string;
  team2: string;
  totalOvers?: number;
  currentInnings?: number;
  status: 'NOT_STARTED' | 'INNINGS_1' | 'INNINGS_2' | 'COMPLETED' | string;
  isCompleted?: boolean;
  result?: {
    title: string;
    detail: string;
  } | string | null;
  innings1?: {
    score: number;
    wickets: number;
    overs: string;
  };
  innings2?: {
    score: number;
    wickets: number;
    overs: string;
  };
}

export interface CurrentInnings {
  innings?: number;
  battingTeam: string;
  bowlingTeam?: string;
  score: number;
  wickets: number;
  overs: string;
  totalRuns?: number;
  totalWickets?: number;
  totalBalls?: number;
  currentOverBalls?: number;
  runRate?: number;
  extras?: number;
  lastWicket?: string;
  requiredRuns?: number | null;
  requiredOvers?: number | null;
  requiredRunRate?: number | null;
  batsmen?: Batsman[];
  currentBowler?: Bowler;
  recentBalls?: OverBalls[];
  partnership?: Partnership;
}

export type AdminActionType =
  | 'PLAY_VIDEO_AD'
  | 'PLAY_IMAGE_AD'
  | 'STOP_AD'
  | 'PLAY_MUSIC'
  | 'STOP_MUSIC'
  | 'CLEAR_RESULT';

export interface AdminCommand {
  id?: string;
  type?: AdminActionType;
  action: AdminActionType;
  src?: string;
  loop?: boolean;
  payload?: Record<string, unknown>;
  timestamp?: number;
}

export interface ScoreData {
  match: MatchInfo;
  currentInnings: CurrentInnings;
  adminCommand?: AdminCommand | null;
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  type: 'video' | 'image' | 'music';
}

export interface TeamData {
  id?: number;
  name: string;
  tournamentId?: number;
  players: string[];
}

export type PlayerRole = 'all_rounder' | 'batting' | 'baller' | 'wicket_keeper';

export interface PlayerRoleInfo {
  id: PlayerRole;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  badgeClass: string;
}

export const PLAYER_ROLES: Record<PlayerRole, PlayerRoleInfo> = {
  batting: {
    id: 'batting',
    label: 'Batting',
    shortLabel: 'Bat',
    icon: '🏏',
    color: '#38bdf8',
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
  baller: {
    id: 'baller',
    label: 'Baller',
    shortLabel: 'Bowl',
    icon: '🎳',
    color: '#34d399',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  all_rounder: {
    id: 'all_rounder',
    label: 'All Rounder',
    shortLabel: 'All-R',
    icon: '⚡',
    color: '#fbbf24',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  wicket_keeper: {
    id: 'wicket_keeper',
    label: 'Wicket Keeper',
    shortLabel: 'WK',
    icon: '🧤',
    color: '#c084fc',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
};

export interface BrandingConfig {
  companyName: string;
  companyLogo: string;
  tournamentName: string;
  tournamentLogo: string;
  teamLogos: Record<string, string>;
  playerPhotos: Record<string, string>;
  playerRoles?: Record<string, PlayerRole>;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  companyName: 'Company Cricket League',
  companyLogo: '/assets/branding/company-logo-default.svg',
  tournamentName: 'Annual Cricket Tournament',
  tournamentLogo: '/assets/branding/tournament-logo-default.svg',
  teamLogos: {
    'Tech Titans': '/assets/branding/tech-titans-logo.svg',
    'Sales Strikers': '/assets/branding/sales-strikers-logo.svg',
  },
  playerPhotos: {},
  playerRoles: {
    // Tech Titans
    'D. Mendis': 'batting',
    'S. Fernando': 'all_rounder',
    'K. Perera': 'wicket_keeper',
    'C. Asalanka': 'all_rounder',
    'B. Rajapaksa': 'batting',
    'D. Shanaka': 'all_rounder',
    'W. Hasaranga': 'all_rounder',
    'C. Karunaratne': 'all_rounder',
    'D. Chameera': 'baller',
    'M. Theekshana': 'baller',
    'L. Kumara': 'baller',
    // Sales Strikers
    'P. Nissanka': 'batting',
    'K. Mendis': 'wicket_keeper',
    'S. Samarawickrama': 'wicket_keeper',
    'C. Silva': 'batting',
    'A. Mathews': 'all_rounder',
    'D. de Silva': 'all_rounder',
    'K. Rajitha': 'baller',
    'M. Pathirana': 'baller',
    'P. Jayawickrama': 'baller',
    'N. Pradeep': 'baller',
    'B. Fernando': 'baller',
  },
};

