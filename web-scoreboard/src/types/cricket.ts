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

