export type GameStatus = "scheduled" | "completed" | "canceled";
export type GameFormat = "court" | "field";
export type GuestSportType = "futsal" | "football";
export type GuestAttendanceStatus = "confirmed" | "declined";
export type GuestPosition =
  | "goalkeeper"
  | "fixed"
  | "winger"
  | "pivot"
  | "full_back"
  | "center_back"
  | "defensive_mid"
  | "midfielder"
  | "striker"
  | "other";

export type GameAttendanceStatus =
  | "pending"
  | "confirmed"
  | "declined";

export type Game = {
  id: string;
  organization_id: string;
  title: string;
  game_date: string;
  start_time: string | null;
  location: string | null;
  player_price: number;
  notes: string | null;
  status: GameStatus;
  game_format: GameFormat;
  public_invite_token: string;
  public_invite_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type GameCharge = {
  id: string;
  organization_id: string;
  game_id: string;
  player_id: string;
  amount: number;
  status: "pending" | "paid";
  paid_at: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
  playerName?: string;
};

export type GameExpense = {
  id: string;
  organization_id: string;
  game_id: string;
  description: string;
  category: "rental" | "referee" | "water" | "other";
  amount: number;
  status: "pending" | "paid";
  paid_at: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
};

export type GameAttendancePlayer = {
  player_id: string;
  player_name: string;
  status: GameAttendanceStatus;
  responded_at: string | null;
};

export type GameAttendanceSummary = {
  confirmed: number;
  pending: number;
  declined: number;
  players: GameAttendancePlayer[];
};

export type GameFinancialSummary = {
  expected: number;
  received: number;
  open: number;
  totalExpenses: number;
  paidExpenses: number;
  receivedResult: number;
  expectedResult: number;
};

export type GameWithSummary = Game & {
  summary: GameFinancialSummary;
};

export type GameEventType = "goal" | "yellow_card" | "red_card";

export type GameEvent = {
  id: string;
  organization_id: string;
  game_id: string;
  player_id: string | null;
  guest_confirmation_id: string | null;
  event_type: GameEventType;
  quantity: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  playerName?: string;
};

export type GameGuestConfirmation = {
  id: string;
  organization_id: string;
  game_id: string;
  name: string;
  attendance_status: GuestAttendanceStatus;
  sport_type: GuestSportType | null;
  position: GuestPosition | null;
  team_number: number | null;
  player_id: string | null;
  payment_status: "pending" | "paid";
  paid_at: string | null;
  payment_transaction_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicGameInviteResponse = {
  name: string;
  attendance_status: GuestAttendanceStatus;
  sport_type: GuestSportType | null;
  position: GuestPosition | null;
  created_at: string;
};
