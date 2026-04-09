# GitLab Access Audit Tool

A web tool that audits user access across GitLab groups and projects. Given a top-level group ID, it recursively discovers all subgroups and projects, collects direct memberships, and presents a user-centric view of who has access to what.

**Use case:** Security & compliance — verify no unauthorized users have access to internal GitLab resources.

## Tech Stack

Next.js 15 (App Router) | TypeScript | Tailwind CSS | shadcn/ui

Zero additional dependencies beyond `create-next-app` + `shadcn`.

## Setup

1. Clone the repo
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local`:
   ```env
   GITLAB_TOKEN=your_personal_access_token
   GITLAB_URL=https://gitlab.com          # optional, defaults to gitlab.com
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)

## How It Works

1. Enter a top-level GitLab group ID in the form
2. The server action recursively fetches all descendant groups and projects
3. Collects **direct** members (not inherited) for each group/project
4. Aggregates by user and displays: name, username, groups with access levels, projects with access levels

Uses `/members` (not `/members/all`) to show where access was **explicitly granted**.

## Project Structure

```
src/
├── app/                    # Next.js App Router (thin routing layer)
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── App*.tsx            # Wrapper components around shadcn
│   ├── AuditForm.tsx       # Client form component
│   └── AuditResults.tsx    # Results display
└── lib/
    ├── actions/audit.ts    # Server Action (orchestration)
    ├── gitlab.ts           # GitLab API client (pagination, retry, concurrency)
    ├── aggregate.ts        # User-centric data aggregation
    └── types.ts            # Shared TypeScript interfaces
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full details on data flow, API usage, pagination strategy, rate limiting, edge cases, and design decisions.
