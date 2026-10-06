import type { Organization } from "@/types/participants";

export type CurrentProfile = {
  id: string;
  name: string;
  email: string | null;
};

export type SettingsData = {
  organization: Organization;
  profile: CurrentProfile;
};
