"use server";

import type { AuditResult, GitLabMember } from "../types";
import {
  getGroup,
  getDescendantGroups,
  getGroupProjects,
  getGroupMembers,
  getProjectMembers,
  withConcurrency,
} from "../gitlab";
import { aggregateByUser } from "../aggregate";

function emptyResult(errors: string[]): AuditResult {
  return { users: [], totalCount: 0, errors };
}

export async function auditGroup(groupId: string): Promise<AuditResult> {
  // 1. Input validation
  const trimmed = groupId.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) {
    return emptyResult(["Invalid group ID: must be a numeric value"]);
  }
  const id = Number(trimmed);

  // 2. Verify group exists
  let rootGroup;
  try {
    rootGroup = await getGroup(id);
  } catch {
    return emptyResult([
      `Group ${id} not found or access denied`,
    ]);
  }

  // 3. Fetch descendants + projects in parallel
  const [descendantGroups, projects] = await Promise.all([
    getDescendantGroups(id),
    getGroupProjects(id),
  ]);
  const allGroups = [rootGroup, ...descendantGroups];

  // 4. Fetch all members with concurrency pool
  const errors: string[] = [];

  const groupMemberTasks = allGroups.map((group) => async () => {
    try {
      const members = await getGroupMembers(group.id);
      return [group.id, members] as [number, GitLabMember[]];
    } catch {
      errors.push(`Failed to fetch members for group "${group.full_path}"`);
      return [group.id, []] as [number, GitLabMember[]];
    }
  });

  const projectMemberTasks = projects.map((project) => async () => {
    try {
      const members = await getProjectMembers(project.id);
      return [project.id, members] as [number, GitLabMember[]];
    } catch {
      errors.push(`Failed to fetch members for project "${project.full_path}"`);
      return [project.id, []] as [number, GitLabMember[]];
    }
  });

  const [groupMemberResults, projectMemberResults] = await Promise.all([
    withConcurrency(groupMemberTasks),
    withConcurrency(projectMemberTasks),
  ]);

  const groupMembers = new Map<number, GitLabMember[]>(groupMemberResults);
  const projectMembers = new Map<number, GitLabMember[]>(projectMemberResults);

  // 5. Aggregate
  const result = aggregateByUser(allGroups, projects, groupMembers, projectMembers);

  // Merge collected errors
  result.errors.push(...errors);

  return result;
}
