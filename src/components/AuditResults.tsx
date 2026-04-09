"use client";

import type { AuditResult, MembershipEntry } from "@/lib/types";
import {
  AppTable,
  AppTableHeader,
  AppTableBody,
  AppTableHead,
  AppTableRow,
  AppTableCell,
  AppTableCaption,
} from "./AppTable";
import { AppBadge } from "./AppBadge";

function MembershipCellContent({
  entries,
}: {
  entries: MembershipEntry[];
}) {
  if (entries.length === 0) {
    return <span className="text-muted-foreground">&mdash;</span>;
  }

  return (
    <ul className="space-y-1">
      {entries.map((entry) => (
        <li key={entry.fullPath} className="flex items-center gap-2">
          <span className="text-sm">{entry.fullPath}</span>
          {entry.archived && (
            <AppBadge variant="outline">archived</AppBadge>
          )}
          <AppBadge variant="secondary">{entry.accessLevel}</AppBadge>
        </li>
      ))}
    </ul>
  );
}

export function AuditResults({ result }: { result: AuditResult }) {
  return (
    <div className="w-full space-y-4">
      {result.errors.length > 0 && (
        <div className="rounded-md border border-yellow-500 bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          <p className="font-medium">Warnings:</p>
          <ul className="mt-1 list-inside list-disc">
            {result.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {result.users.length === 0 ? (
        <p className="text-center text-muted-foreground">No members found</p>
      ) : (
        <AppTable>
          <AppTableHeader>
            <AppTableRow>
              <AppTableHead className="w-[200px]">User</AppTableHead>
              <AppTableHead>Groups</AppTableHead>
              <AppTableHead>Projects</AppTableHead>
            </AppTableRow>
          </AppTableHeader>
          <AppTableBody>
            {result.users.map((user) => (
              <AppTableRow key={user.username}>
                <AppTableCell className="font-medium">
                  <div>
                    <div className="flex items-center gap-2">
                      {user.name}
                      {user.state !== "active" && (
                        <AppBadge variant="destructive">{user.state}</AppBadge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      @{user.username}
                    </div>
                  </div>
                </AppTableCell>
                <AppTableCell>
                  <MembershipCellContent entries={user.groups} />
                </AppTableCell>
                <AppTableCell>
                  <MembershipCellContent entries={user.projects} />
                </AppTableCell>
              </AppTableRow>
            ))}
          </AppTableBody>
          <AppTableCaption>Total Users: {result.users.length}</AppTableCaption>
        </AppTable>
      )}
    </div>
  );
}
