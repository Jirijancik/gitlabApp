"use server";

import { z } from "zod";
import type { AuditResult, GitLabMember } from "../types";
import {
  getGroup,
  getDescendantGroups,
  getGroupProjects,
  getGroupMembers,
  getProjectMembers,
} from "../gitlab";
import { withConcurrency } from "../utils";
import { aggregateByUser } from "../aggregate";

const groupIdSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Group ID must be a numeric value")
  .transform(Number);

function emptyResult(errors: string[]): AuditResult {
  return { users: [], errors };
}

type MemberResult = {
  id: number;
  members: GitLabMember[];
  error?: string;
};

export async function auditGroup(groupId: string): Promise<AuditResult> {
  const parsed = groupIdSchema.safeParse(groupId);
  if (!parsed.success) {
    return emptyResult([parsed.error.issues[0].message]);
  }
  const id = parsed.data;

  let rootGroup;
  try {
    rootGroup = await getGroup(id);
  } catch {
    return emptyResult([`Group ${id} not found or access denied`]);
  }

  let descendantGroups, projects;
  try {
    [descendantGroups, projects] = await Promise.all([
      getDescendantGroups(id),
      getGroupProjects(id),
    ]);
  } catch {
    return emptyResult([
      `Failed to fetch subgroups or projects for group ${id}`,
    ]);
  }
  const allGroups = [rootGroup, ...descendantGroups];

  const groupMemberTasks = allGroups.map(
    (group) => async (): Promise<MemberResult> => {
      try {
        const members = await getGroupMembers(group.id);
        return { id: group.id, members };
      } catch {
        return {
          id: group.id,
          members: [],
          error: `Failed to fetch members for group "${group.full_path}"`,
        };
      }
    },
  );

  const projectMemberTasks = projects.map(
    (project) => async (): Promise<MemberResult> => {
      try {
        const members = await getProjectMembers(project.id);
        return { id: project.id, members };
      } catch {
        return {
          id: project.id,
          members: [],
          error: `Failed to fetch members for project "${project.full_path}"`,
        };
      }
    },
  );

  const [groupMemberResults, projectMemberResults] = await Promise.all([
    withConcurrency(groupMemberTasks),
    withConcurrency(projectMemberTasks),
  ]);

  const errors: string[] = [];
  const groupMembers = new Map<number, GitLabMember[]>();
  for (const result of groupMemberResults) {
    groupMembers.set(result.id, result.members);
    if (result.error) errors.push(result.error);
  }

  const projectMembers = new Map<number, GitLabMember[]>();
  for (const result of projectMemberResults) {
    projectMembers.set(result.id, result.members);
    if (result.error) errors.push(result.error);
  }

  const aggregated = aggregateByUser({
    groups: allGroups,
    projects,
    groupMembers,
    projectMembers,
  });

  return {
    users: aggregated.users,
    errors: [...aggregated.errors, ...errors],
  };
}
