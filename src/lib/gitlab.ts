import type { GitLabGroup, GitLabProject, GitLabMember } from "./types";

const MAX_RETRIES = 3;
const PER_PAGE = 100;
const CONCURRENCY_LIMIT = 5;

function getBaseUrl(): string {
  return process.env.GITLAB_URL || "https://gitlab.com";
}

function getToken(): string {
  const token = process.env.GITLAB_TOKEN;
  if (!token) {
    throw new Error("GITLAB_TOKEN environment variable is not set");
  }
  return token;
}

async function gitlabFetch(path: string): Promise<Response> {
  const url = `${getBaseUrl()}/api/v4${path}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      headers: { "PRIVATE-TOKEN": getToken() },
    });

    if (response.status === 429) {
      if (attempt === MAX_RETRIES) {
        throw new Error(`Rate limited after ${MAX_RETRIES} retries: ${path}`);
      }
      const retryAfter = Number(response.headers.get("Retry-After")) || 1;
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    if (!response.ok) {
      throw new Error(
        `GitLab API error ${response.status}: ${path}`
      );
    }

    return response;
  }

  throw new Error(`Unreachable: exhausted retries for ${path}`);
}

async function fetchAllPages<T>(path: string): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?";
  let currentPath = `${path}${separator}per_page=${PER_PAGE}`;
  const items: T[] = [];

  while (currentPath) {
    const response = await gitlabFetch(currentPath);
    const data: T[] = await response.json();
    items.push(...data);

    const nextPage = response.headers.get("x-next-page");
    if (nextPage) {
      const pageParam = currentPath.includes("page=")
        ? currentPath.replace(/\bpage=\d+/, `page=${nextPage}`)
        : `${currentPath}&page=${nextPage}`;
      currentPath = pageParam;
    } else {
      currentPath = "";
    }
  }

  return items;
}

export async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number = CONCURRENCY_LIMIT
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]();
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

// --- Exported API functions ---

export async function getGroup(id: number): Promise<GitLabGroup> {
  const response = await gitlabFetch(`/groups/${id}`);
  return response.json();
}

export async function getDescendantGroups(
  id: number
): Promise<GitLabGroup[]> {
  return fetchAllPages<GitLabGroup>(`/groups/${id}/descendant_groups`);
}

export async function getGroupProjects(
  id: number
): Promise<GitLabProject[]> {
  return fetchAllPages<GitLabProject>(
    `/groups/${id}/projects?include_subgroups=true`
  );
}

export async function getGroupMembers(
  id: number
): Promise<GitLabMember[]> {
  return fetchAllPages<GitLabMember>(`/groups/${id}/members`);
}

export async function getProjectMembers(
  id: number
): Promise<GitLabMember[]> {
  return fetchAllPages<GitLabMember>(`/projects/${id}/members`);
}
