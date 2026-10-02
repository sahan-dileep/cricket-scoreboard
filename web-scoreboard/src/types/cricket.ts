export interface Batsman {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate?: number;
  onStrike: boolean;
}

export interface Bowler {
  name: string;
  overs: string | number;
  runs: number;
  wickets: number;
  economy?: string | number;
}

export interface BallDisplay {
  label: string; // '0', '1', '2', '3', '4', '6', 'W', 'WD', 'NB', etc.
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
  team1: string;
  team2: string;
  status: 'NOT_STARTED' | 'INNINGS_1' | 'INNINGS_2' | 'COMPLETED' | string;
  result?: {
    title: string;
    detail: string;
  } | string | null;
  innings1?: {
    score: number;
    wickets: number;
    overs: string;
  };
}

export interface CurrentInnings {
  battingTeam: string;
  score: number;
  wickets: number;
  overs: string;
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
  action: AdminActionType;
  src?: string;
  loop?: boolean;
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
