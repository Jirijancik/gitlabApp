import type {
  GitLabGroup,
  GitLabProject,
  GitLabMember,
  UserAuditEntry,
  AuditResult,
} from "./types";
import { resolveAccessLevel } from "./types";

interface AggregateInput {
  groups: GitLabGroup[];
  projects: GitLabProject[];
  groupMembers: Map<number, GitLabMember[]>;
  projectMembers: Map<number, GitLabMember[]>;
}

export function aggregateByUser({
  groups,
  projects,
  groupMembers,
  projectMembers,
}: AggregateInput): AuditResult {
  const userMap = new Map<number, UserAuditEntry>();

  function getOrCreateUser(member: GitLabMember): UserAuditEntry {
    let entry = userMap.get(member.id);
    if (!entry) {
      entry = {
        name: member.name,
        username: member.username,
        state: member.state,
        groups: [],
        projects: [],
      };
      userMap.set(member.id, entry);
    }
    return entry;
  }

  for (const group of groups) {
    const members = groupMembers.get(group.id) ?? [];
    for (const member of members) {
      const user = getOrCreateUser(member);
      user.groups.push({
        fullPath: group.full_path,
        accessLevel: resolveAccessLevel(member.access_level),
        archived: false,
      });
    }
  }

  for (const project of projects) {
    const members = projectMembers.get(project.id) ?? [];
    for (const member of members) {
      const user = getOrCreateUser(member);
      user.projects.push({
        fullPath: project.full_path,
        accessLevel: resolveAccessLevel(member.access_level),
        archived: project.archived,
      });
    }
  }

  const users = Array.from(userMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return { users, errors: [] };
}
