// GitLab API response shapes

export interface GitLabGroup {
  id: number;
  name: string;
  full_path: string;
}

export interface GitLabProject {
  id: number;
  name: string;
  full_path: string;
  archived: boolean;
}

export interface GitLabMember {
  id: number;
  name: string;
  username: string;
  state: string;
  access_level: number;
}

// Aggregated output types

export interface MembershipEntry {
  fullPath: string;
  accessLevel: string;
}

export interface UserAuditEntry {
  name: string;
  username: string;
  groups: MembershipEntry[];
  projects: MembershipEntry[];
}

export interface AuditResult {
  users: UserAuditEntry[];
  totalCount: number;
  errors: string[];
}

// Access level mapping

export const ACCESS_LEVELS: Record<number, string> = {
  10: "Guest",
  20: "Reporter",
  30: "Developer",
  40: "Maintainer",
  50: "Owner",
};
