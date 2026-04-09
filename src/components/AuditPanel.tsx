"use client";

import { useState, useTransition } from "react";
import type { AuditResult } from "@/lib/types";
import { auditGroup } from "@/lib/actions/audit";
import { AppButton } from "./AppButton";
import { AppInput } from "./AppInput";
import { AuditResults } from "./AuditResults";

export function AuditPanel() {
  const [groupId, setGroupId] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const data = await auditGroup(groupId);
        setResult(data);
      } catch {
        setResult(null);
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <AppInput
          type="text"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          placeholder="Enter GitLab Group ID"
          className="flex-1"
        />
        <AppButton type="submit" disabled={isPending || !groupId.trim()}>
          {isPending ? "Auditing..." : "Audit"}
        </AppButton>
      </form>

      {error && (
        <p className="rounded bg-red-900/50 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {result && <AuditResults result={result} />}
    </div>
  );
}
