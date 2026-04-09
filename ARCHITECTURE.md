# GitLab Access Audit Tool — Architecture & Business Model

## 1. Purpose

A web-based tool for auditing user access across GitLab groups and projects. Given a top-level group ID, the tool recursively discovers all subgroups and projects, collects direct membership data, and presents a user-centric view of who has access to what — and at which permission level.

The primary use case is security/compliance: ensuring no unauthorized users have access to internal GitLab resources.

## 2. Business Requirements

### Input

- A top-level GitLab group ID, entered via a web form in the browser

### Output

- A list of all users who are **direct members** of any group or project within the hierarchy
- For each user:
  - Display name (civil name)
  - Username (e.g. `@jan.konas`)
  - List of groups they belong to, with full path and access level
  - List of projects they belong to, with full path and access level
- Total user count at the end

### Example Output

```
Jan Konáš (@jan.konas)
Groups:    [apploud-external/testovaci-zadani (Owner)]
Projects:  []

Martin Špicar (@martin.spicar)
Groups:    []
Projects:  [apploud-external/testovaci-zadani/uloha-1 (Developer), apploud-external/testovaci-zadani/skupina-3/projekt-2 (Guest)]

Total Users: 5
```

### Token Management

- The GitLab access token is **not** passed as a CLI/URL argument
- It is stored in `.env.local` and read server-side only — never exposed to the browser
- Easy to swap: edit the file and restart the dev server

### Scale

- Must handle production environments: ~500 projects, ~30 groups, ~50 users
- Test environment: 5 users, 5 groups, 4 projects (group ID `10975505`)

## 3. GitLab Domain Model

- **Groups** can be nested to arbitrary depth (subgroups within subgroups)
- **Projects** always belong to exactly one group; there are no sub-projects
- **Users** can be direct members of both groups and projects independently
- **Access levels**: Guest (10), Reporter (20), Developer (30), Maintainer (40), Owner (50)
- **Inherited vs direct membership**: Users can inherit access from parent groups, but this tool reports only **direct** (explicitly granted) memberships to show where access was actually configured

## 4. Tech Stack

| Layer         | Technology                        | Notes                                            |
| ------------- | --------------------------------- | ------------------------------------------------ |
| Framework     | **Next.js 15** (App Router) | Routing only; business logic lives in `lib/`   |
| Language      | **TypeScript**              |                                                  |
| Runtime       | **Node.js 22+**             | Native `fetch` — no axios needed              |
| Styling       | **Tailwind CSS**            | Bundled with create-next-app                     |
| UI Components | **shadcn/ui**               | Primitives installed into `src/components/ui/` |
| HTTP Client   | Native `fetch`                  | Zero additional runtime dependencies             |
| Token Storage | `.env.local`                    | Server-side only                                 |

### Dependency Philosophy

No additional npm packages beyond what `create-next-app` and `shadcn` provide. Pagination, retry logic, and concurrency control are implemented manually (~10–20 lines each).

## 5. Architecture

### Layers

```
┌─────────────────────────────────────────────┐
│  UI Layer (src/app/, src/components/)        │
│  - App Router pages (routing only)           │
│  - Wrapper components (AppButton, AppCard…)  │
│  - Feature components (AuditForm, Results)   │
└──────────────────┬──────────────────────────┘
                   │ Server Action call
┌──────────────────▼──────────────────────────┐
│  Action Layer (src/lib/actions/)             │
│  - Server Action orchestrates the pipeline   │
│  - Validates input, calls services, returns  │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Service Layer (src/lib/)                    │
│  - gitlab.ts: API client, pagination, retry  │
│  - aggregate.ts: user-centric aggregation    │
│  - types.ts: shared interfaces               │
└─────────────────────────────────────────────┘
```

### Data Flow

```
User enters group ID in form
  → Server Action: auditGroup(groupId)
    → getGroup(id)                              [validate group exists, get full_path]
    → getDescendantGroups(id)  ┐
    → getGroupProjects(id)     ┘ in parallel    [paginated, all nested]
    → for each group:   getGroupMembers(id)  ┐
    → for each project: getProjectMembers(id)┘  concurrency pool of 5
    → aggregateByUser()                         [Map<userId, UserAuditEntry>]
    → sort alphabetically by name
  → Client renders result
```

### Why Server Actions (not API Routes)

- The task is a form submission → fetch → display cycle, which is the primary use case for Server Actions
- Type-safe: the action function signature is the contract between client and server
- Built-in CSRF protection
- No need to define REST endpoints for an internal tool
- Keeps routing layer thin (App Router best practice)

## 6. GitLab REST API Usage

**Base URL**: configurable via `GITLAB_URL` env var (default: `https://gitlab.com`)

**Authentication**: `PRIVATE-TOKEN` header with value from `GITLAB_TOKEN` env var

### Endpoints Used

| Purpose                   | Endpoint                                     | Key Params                                   |
| ------------------------- | -------------------------------------------- | -------------------------------------------- |
| Get group info            | `GET /api/v4/groups/:id`                   | —                                           |
| All descendant subgroups  | `GET /api/v4/groups/:id/descendant_groups` | `per_page=100`                             |
| All projects in hierarchy | `GET /api/v4/groups/:id/projects`          | `include_subgroups=true`, `per_page=100` |
| Direct group members      | `GET /api/v4/groups/:id/members`           | `per_page=100`                             |
| Direct project members    | `GET /api/v4/projects/:id/members`         | `per_page=100`                             |

### Important: `/members` vs `/members/all`

We use `/members` (direct only), **not** `/members/all` (which includes inherited). This ensures the output shows where access was **explicitly granted**, which is what an auditor needs.

### Pagination Strategy

GitLab uses offset-based pagination. The client:

1. Sets `per_page=100` (maximum)
2. Reads the `x-next-page` response header
3. Continues fetching until `x-next-page` is empty
4. Accumulates all items into a flat array

This works correctly even beyond 10,000 items (where GitLab drops `x-total` headers).

### Rate Limiting & Retry

- On HTTP 429: read `Retry-After` header, wait, retry (up to 3 attempts)
- Concurrency pool of 5 for member fetches — stays well within GitLab.com's 200 req/min limit
- Estimated time for production scale (~530 entities): ~22 seconds

## 7. Component Architecture

### shadcn/ui Wrapper Pattern

Every shadcn primitive gets a thin wrapper in `src/components/`. Feature components **only** import from wrappers, never from `ui/` directly. This makes swapping the underlying component library a single-file change per component.

```
src/components/
├── ui/                     # shadcn/ui primitives (auto-generated, do not edit)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── badge.tsx
├── AppButton.tsx           # Wrapper → re-exports shadcn Button
├── AppInput.tsx            # Wrapper → re-exports shadcn Input
├── AppCard.tsx             # Wrapper → re-exports shadcn Card + CardHeader + CardContent
├── AppBadge.tsx            # Wrapper → re-exports shadcn Badge
├── AuditForm.tsx           # "use client" — form with group ID input, loading state
└── AuditResults.tsx        # Renders user list with membership details
```

### shadcn Components Used

| Component  | Purpose                                         |
| ---------- | ----------------------------------------------- |
| `button` | Form submit                                     |
| `input`  | Group ID text input                             |
| `card`   | User result cards                               |
| `badge`  | Access level labels (Owner, Developer, Guest…) |

## 8. File Structure

```
gitlabApp/
├── .env.local                          # GITLAB_TOKEN, GITLAB_URL (gitignored)
├── .gitignore
├── package.json
├── next.config.ts
├── tsconfig.json
├── ARCHITECTURE.md                     # This file
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout
│   │   └── page.tsx                    # Page composition (thin)
│   ├── components/
│   │   ├── ui/                         # shadcn/ui primitives
│   │   ├── AppButton.tsx
│   │   ├── AppInput.tsx
│   │   ├── AppCard.tsx
│   │   ├── AppBadge.tsx
│   │   ├── AuditForm.tsx               # "use client" — interactive form
│   │   └── AuditResults.tsx            # User list rendering
│   └── lib/
│       ├── actions/
│       │   └── audit.ts                # Server Action: "use server"
│       ├── gitlab.ts                   # API client (pagination, retry, concurrency)
│       ├── aggregate.ts                # User-centric data aggregation
│       ├── types.ts                    # Shared TypeScript interfaces
│       └── utils.ts                    # cn() helper (shadcn convention)
```

## 9. Type Definitions

```typescript
// GitLab API response shapes
interface GitLabGroup { id: number; name: string; full_path: string }
interface GitLabProject { id: number; name: string; full_path: string; archived: boolean }
interface GitLabMember { id: number; name: string; username: string; state: string; access_level: number }

// Aggregated output
interface MembershipEntry { fullPath: string; accessLevel: string }  // e.g. "apploud-external/foo", "Developer"
interface UserAuditEntry { name: string; username: string; groups: MembershipEntry[]; projects: MembershipEntry[] }
interface AuditResult { users: UserAuditEntry[]; totalCount: number; errors: string[] }

// Access level mapping
const ACCESS_LEVELS: Record<number, string> = {
  10: "Guest", 20: "Reporter", 30: "Developer", 40: "Maintainer", 50: "Owner"
}
```

## 10. Edge Cases

| Case                                   | Handling                                            |
| -------------------------------------- | --------------------------------------------------- |
| Blocked users (`state !== "active"`) | Include in output with "(blocked)" indicator        |
| Archived projects                      | Include with "(archived)" label                     |
| 403 on specific group/project          | Skip and collect in `errors` array — don't abort |
| Rate limiting (HTTP 429)               | Retry with `Retry-After` header, up to 3 attempts |
| Pagination beyond defaults             | Follow `x-next-page` header until empty           |
| Invalid group ID                       | Return validation error before any member fetching  |
| Empty group (no members)               | Show "No members found"                             |

## 11. Environment Configuration

```env
# .env.local
GITLAB_TOKEN=YOUR_TOKEN
GITLAB_URL=https://gitlab.com
```

| Variable         | Required | Default                | Description                              |
| ---------------- | -------- | ---------------------- | ---------------------------------------- |
| `GITLAB_TOKEN` | Yes      | —                     | GitLab personal access token (read-only) |
| `GITLAB_URL`   | No       | `https://gitlab.com` | GitLab instance base URL                 |

## 12. Test Data

- **Group ID**: `10975505` (apploud-external/testovaci-zadani)
- **Expected users**: 5
- **Expected groups**: 5 (including top-level)
- **Expected projects**: 4
- **Token**: read-only access to test environment
