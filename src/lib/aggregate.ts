import type {
  GitLabGroup,
  GitLabProject,
  GitLabMember,
  UserAuditEntry,
  AuditResult,
} from "./types";
import { ACCESS_LEVELS } from "./types";

export function aggregateByUser(
  groups: GitLabGroup[],
  projects: GitLabProject[],
  groupMembers: Map<number, GitLabMember[]>,
  projectMembers: Map<number, GitLabMember[]>,
): AuditResult {
  const userMap = new Map<number, UserAuditEntry>();

  function getOrCreateUser(member: GitLabMember): UserAuditEntry {
    let entry = userMap.get(member.id);
    if (!entry) {
      const name =
        member.state !== "active"
          ? `${member.name} (blocked)`
          : member.name;
      entry = { name, username: member.username, groups: [], projects: [] };
      userMap.set(member.id, entry);
    }
    return entry;
  }

  function resolveAccessLevel(level: number): string {
    return ACCESS_LEVELS[level] ?? `Unknown (${level})`;
  }

  // Process group memberships
  for (const group of groups) {
    const members = groupMembers.get(group.id) ?? [];
    for (const member of members) {
      const user = getOrCreateUser(member);
      user.groups.push({
        fullPath: group.full_path,
        accessLevel: resolveAccessLevel(member.access_level),
      });
    }
  }

  // Process project memberships
  for (const project of projects) {
    const members = projectMembers.get(project.id) ?? [];
    for (const member of members) {
      const user = getOrCreateUser(member);
      const fullPath = project.archived
        ? `${project.full_path} (archived)`
        : project.full_path;
      user.projects.push({
        fullPath,
        accessLevel: resolveAccessLevel(member.access_level),
      });
    }
  }

  const users = Array.from(userMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return { users, totalCount: users.length, errors: [] };
}
