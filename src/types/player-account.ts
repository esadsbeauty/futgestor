import type { GameAttendanceStatus } from "@/types/player-portal";
import type { PlayerBillingType } from "@/types/billing";

export type PlayerAccountPortal = {
  organization_id: string;
  player_id: string;
  organization_name: string;
  player_name: string;
  player_status: string;
  billing_type: PlayerBillingType;
  monthly_fee: number | null;
  due_day: number | null;
  participant_since: string;
  show_cash_balance: boolean;
  show_receivables: boolean;
  show_payables: boolean;
  show_pending_players: boolean;
  show_individual_values: boolean;
  available: boolean;
};

export type PlayerAccountGame = {
  game_id: string;
  title: string;
  game_date: string;
  start_time: string | null;
  location: string | null;
  player_price: number;
  status: string;
  attendance_status: GameAttendanceStatus;
};

export type PlayerAccountFinance = {
  cash_balance: number | null;
  receivables: number | null;
  payables: number | null;
};

export type PlayerPendingAmount = {
  player_name: string;
  amount: number | null;
};

export type PlayerRecentGameEvent = {
  game_id: string;
  game_title: string;
  game_date: string;
  player_name: string;
  event_type: "goal" | "yellow_card" | "red_card";
  quantity: number;
};

export type PlayerAccountData = {
  portal: PlayerAccountPortal;
  games: PlayerAccountGame[];
  finance: PlayerAccountFinance | null;
  pendingPlayers: PlayerPendingAmount[];
  recentEvents: PlayerRecentGameEvent[];
};
