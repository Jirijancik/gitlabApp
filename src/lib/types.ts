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

export type GitLabMemberState = "active" | "blocked" | "deactivated";

export interface GitLabMember {
  id: number;
  name: string;
  username: string;
  state: GitLabMemberState;
  access_level: number;
}

// Aggregated output types

export interface MembershipEntry {
  fullPath: string;
  accessLevel: string;
  archived: boolean;
}

export interface UserAuditEntry {
  name: string;
  username: string;
  state: GitLabMemberState;
  groups: MembershipEntry[];
  projects: MembershipEntry[];
}

export interface AuditResult {
  users: UserAuditEntry[];
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

export function resolveAccessLevel(level: number): string {
  return ACCESS_LEVELS[level] ?? `Unknown (${level})`;
}
