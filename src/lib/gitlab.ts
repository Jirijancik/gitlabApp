import type { GitLabGroup, GitLabProject, GitLabMember } from "./types";

const MAX_RETRIES = 3;
const PER_PAGE = 100;

let cachedBaseUrl: string | undefined;
let cachedToken: string | undefined;

function getBaseUrl(): string {
  if (!cachedBaseUrl) {
    cachedBaseUrl = process.env.GITLAB_URL || "https://gitlab.com";
  }
  return cachedBaseUrl;
}

function getToken(): string {
  if (!cachedToken) {
    const token = process.env.GITLAB_TOKEN;
    if (!token) {
      throw new Error("GITLAB_TOKEN environment variable is not set");
    }
    cachedToken = token;
  }
  return cachedToken;
}

async function gitlabFetch(path: string): Promise<Response> {
  const url = `${getBaseUrl()}/api/v4${path}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "PRIVATE-TOKEN": getToken() },
        cache: "no-store",
      });
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw new Error(
          `Network error after ${MAX_RETRIES} retries: ${path} — ${error instanceof Error ? error.message : error}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      continue;
    }

    if (response.status === 429) {
      if (attempt === MAX_RETRIES) {
        throw new Error(`Rate limited after ${MAX_RETRIES} retries: ${path}`);
      }
      const retryAfter = Number(response.headers.get("Retry-After")) || 1;
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    if (!response.ok) {
      throw new Error(`GitLab API error ${response.status}: ${path}`);
    }

    return response;
  }

  throw new Error(`Unreachable: exhausted retries for ${path}`);
}

async function fetchAllPages<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;

  while (true) {
    const query = new URLSearchParams({
      per_page: String(PER_PAGE),
      page: String(page),
      ...params,
    });
    const response = await gitlabFetch(`${path}?${query}`);
    const data: T[] = await response.json();
    items.push(...data);

    const nextPage = response.headers.get("x-next-page");
    if (!nextPage) break;
    page = Number(nextPage);
  }

  return items;
}

// --- Exported API functions ---

export async function getGroup(id: number): Promise<GitLabGroup> {
  const response = await gitlabFetch(`/groups/${id}`);
  return response.json();
}

export async function getDescendantGroups(
  id: number,
): Promise<GitLabGroup[]> {
  return fetchAllPages<GitLabGroup>(`/groups/${id}/descendant_groups`);
}

export async function getGroupProjects(
  id: number,
): Promise<GitLabProject[]> {
  return fetchAllPages<GitLabProject>(`/groups/${id}/projects`, {
    include_subgroups: "true",
  });
}

export async function getGroupMembers(
  id: number,
): Promise<GitLabMember[]> {
  return fetchAllPages<GitLabMember>(`/groups/${id}/members`);
}

export async function getProjectMembers(
  id: number,
): Promise<GitLabMember[]> {
  return fetchAllPages<GitLabMember>(`/projects/${id}/members`);
}
