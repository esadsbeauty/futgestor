import type { PlayerBillingType } from "@/types/billing";

export type PlayerAccessToken = {
  id: string;
  organization_id: string;
  player_id: string;
  token: string;
  active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlayerPortal = {
  organization_name: string | null;
  player_name: string | null;
  player_status: string | null;
  billing_type: PlayerBillingType | null;
  monthly_fee: number | null;
  due_day: number | null;
  participant_since: string | null;
  available: boolean;
};

export type PlayerPortalGame = {
  game_id: string;
  title: string;
  game_date: string;
  start_time: string | null;
  location: string | null;
  player_price: number;
  status: string;
};
