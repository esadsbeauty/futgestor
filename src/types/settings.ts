import type { Organization } from "@/types/participants";

export type CurrentProfile = {
  id: string;
  name: string;
  email: string | null;
  default_position: import("@/types/games").GuestPosition | null;
  default_futsal_position: import("@/types/games").GuestPosition | null;
  default_field_position: import("@/types/games").GuestPosition | null;
};

export type OrganizationAdmin = {
  member_id: string;
  user_id: string;
  name: string;
  email: string | null;
  role: "owner" | "admin";
};

export type AdminInvite = {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  created_at: string;
};

export type SettingsData = {
  organization: Organization;
  profile: CurrentProfile;
  currentRole: "owner" | "admin" | "member";
  admins: OrganizationAdmin[];
  adminInvites: AdminInvite[];
  appUrl: string;
};
