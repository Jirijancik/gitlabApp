# GitLab Access Audit Tool — Chunked Implementation Plan

## Context

Build a greenfield Next.js 15 web app from ARCHITECTURE.md. The tool audits user access across GitLab groups/projects by recursively discovering all subgroups and projects under a given group ID, collecting direct membership data, and presenting a user-centric view. Runtime: **Bun** (not Node.js).

The project directory currently contains only `ARCHITECTURE.md`. Each chunk below is designed to be independently implementable with a clear scope and deliverable.

---

## Chunk 1: Project Scaffolding & Configuration

**Goal:** Initialize a working Next.js 15 project with Bun, Tailwind CSS, and TypeScript.

**Scope:**
- Run `bunx create-next-app@latest` with App Router, TypeScript, Tailwind CSS, src/ directory, no import alias customization
- Verify `bun dev` starts successfully
- Create `.env.local` with `GITLAB_TOKEN` and `GITLAB_URL` variables
- Update `.gitignore` to ensure `.env.local` is excluded
- Clean up default boilerplate (remove default page content, keep layout skeleton)

**Deliverable:** A running Next.js 15 app at `localhost:3000` with Tailwind, TypeScript, and env vars configured.

**Key files:**
- `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`
- `.env.local`, `.gitignore`
- `src/app/layout.tsx`, `src/app/page.tsx` (cleaned up)

---

## Chunk 2: shadcn/ui Setup & Wrapper Components

**Goal:** Install shadcn/ui and create the wrapper component pattern defined in the architecture.

**Scope:**
- Initialize shadcn/ui (`bunx shadcn@latest init`)
- Install required primitives: `button`, `input`, `card`, `badge`
- Create wrapper components that re-export shadcn primitives:
  - `src/components/AppButton.tsx` — wraps `Button`
  - `src/components/AppInput.tsx` — wraps `Input`
  - `src/components/AppCard.tsx` — wraps `Card`, `CardHeader`, `CardContent`
  - `src/components/AppBadge.tsx` — wraps `Badge`

**Deliverable:** All 4 wrapper components importable and rendering correctly. shadcn primitives in `src/components/ui/`.

**Key files:**
- `src/components/ui/button.tsx`, `input.tsx`, `card.tsx`, `badge.tsx`
- `src/components/AppButton.tsx`, `AppInput.tsx`, `AppCard.tsx`, `AppBadge.tsx`
- `components.json` (shadcn config)

---

## Chunk 3: Type Definitions & Utilities

**Goal:** Define all shared TypeScript interfaces and utility functions.

**Scope:**
- Create `src/lib/types.ts` with all interfaces:
  - `GitLabGroup`, `GitLabProject`, `GitLabMember` (API response shapes)
  - `MembershipEntry`, `UserAuditEntry`, `AuditResult` (aggregated output)
  - `ACCESS_LEVELS` constant mapping (10→Guest, 20→Reporter, etc.)
- Create `src/lib/utils.ts` with the `cn()` helper (shadcn convention using `clsx` + `tailwind-merge`)

**Deliverable:** All types and utilities importable, no runtime code yet.

**Key files:**
- `src/lib/types.ts`
- `src/lib/utils.ts`

---

## Chunk 4: GitLab API Client

**Goal:** Implement the full GitLab REST API client with pagination, retry, and concurrency control.

**Scope:**
- Create `src/lib/gitlab.ts` with:
  - Base fetch helper with `PRIVATE-TOKEN` header, error handling, 429 retry (up to 3 attempts with `Retry-After`)
  - `getGroup(id)` — validate group exists, return group info
  - `getDescendantGroups(id)` — paginated fetch of all descendant subgroups
  - `getGroupProjects(id)` — paginated fetch with `include_subgroups=true`
  - `getGroupMembers(id)` — paginated direct members
  - `getProjectMembers(id)` — paginated direct members
  - Pagination logic: `per_page=100`, follow `x-next-page` header until empty
  - Concurrency pool of 5 for member fetches
- Edge cases: 403 → skip and collect error, blocked users included, archived projects included

**Deliverable:** All 5 GitLab API functions working and tested against the test group (`10975505`).

**Key files:**
- `src/lib/gitlab.ts`

**Dependencies:** Chunk 3 (types)

---

## Chunk 5: User Aggregation Logic

**Goal:** Implement the user-centric data aggregation that transforms raw membership data into the output format.

**Scope:**
- Create `src/lib/aggregate.ts` with:
  - `aggregateByUser()` function that takes arrays of groups, projects, and their members
  - Builds a `Map<userId, UserAuditEntry>` merging group and project memberships per user
  - Maps numeric access levels to human-readable strings using `ACCESS_LEVELS`
  - Adds "(blocked)" indicator for `state !== "active"` users
  - Adds "(archived)" label for archived projects
  - Returns sorted array (alphabetical by name) with total count

**Deliverable:** Pure function that transforms API data into `AuditResult`.

**Key files:**
- `src/lib/aggregate.ts`

**Dependencies:** Chunk 3 (types)

---

## Chunk 6: Server Action (Orchestration)

**Goal:** Create the server action that orchestrates the full audit pipeline.

**Scope:**
- Create `src/lib/actions/audit.ts` with `"use server"` directive
  - `auditGroup(groupId: string)` function:
    1. Validate input (non-empty, numeric)
    2. Call `getGroup(id)` to verify group exists
    3. In parallel: `getDescendantGroups(id)` + `getGroupProjects(id)`
    4. For each group + project: fetch members using concurrency pool
    5. Call `aggregateByUser()` to build result
    6. Return `AuditResult` (users, totalCount, errors)
  - Error handling: catch and return user-friendly messages

**Deliverable:** Server action callable from client components, returns full audit data.

**Key files:**
- `src/lib/actions/audit.ts`

**Dependencies:** Chunk 4 (gitlab client), Chunk 5 (aggregation)

---

## Chunk 7: UI Components (Form & Results)

**Goal:** Build the interactive form and results display components.

**Scope:**
- Create `src/components/AuditForm.tsx` (`"use client"`):
  - Text input for group ID (using `AppInput`)
  - Submit button (using `AppButton`) with loading state
  - Calls the `auditGroup` server action on submit
  - Passes result to `AuditResults` or displays inline
- Create `src/components/AuditResults.tsx`:
  - Renders each user in an `AppCard` with:
    - Name + username header
    - Groups list with `AppBadge` for access levels
    - Projects list with `AppBadge` for access levels
  - Displays total user count at the bottom
  - Displays errors array if any (non-fatal warnings)
  - Handles empty state ("No members found")

**Deliverable:** Fully interactive form → results flow using wrapper components.

**Key files:**
- `src/components/AuditForm.tsx`
- `src/components/AuditResults.tsx`

**Dependencies:** Chunk 2 (wrappers), Chunk 6 (server action)

---

## Chunk 8: Page Composition & Final Integration

**Goal:** Wire everything together in the App Router pages and verify end-to-end.

**Scope:**
- Update `src/app/page.tsx` — thin page that composes `AuditForm` (and conditionally `AuditResults`)
- Update `src/app/layout.tsx` — root layout with appropriate metadata, base styling
- End-to-end test: enter group ID `10975505`, verify 5 users returned with correct memberships
- Verify edge cases: invalid group ID shows error, loading state works, errors display

**Deliverable:** Fully working application matching the ARCHITECTURE.md specification.

**Key files:**
- `src/app/page.tsx`
- `src/app/layout.tsx`

**Dependencies:** All previous chunks

---

## Dependency Graph

```
Chunk 1 (Scaffolding)
  └─→ Chunk 2 (shadcn/ui + Wrappers)
  └─→ Chunk 3 (Types & Utils)
        ├─→ Chunk 4 (GitLab API Client)
        └─→ Chunk 5 (Aggregation)
              └─→ Chunk 6 (Server Action) ←── Chunk 4
                    └─→ Chunk 7 (UI Components) ←── Chunk 2
                          └─→ Chunk 8 (Page Composition & Integration)
```

## Verification

After Chunk 8, test end-to-end:
1. `bun dev` → app loads at localhost:3000
2. Enter group ID `10975505` → loading state shows
3. Results display: 5 users, 5 groups, 4 projects with correct access levels
4. Invalid group ID → validation error
5. Token stored server-side only (check network tab — no token in browser requests)
