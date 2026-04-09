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
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const data = await auditGroup(groupId);
      setResult(data);
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4">
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

      {result && <AuditResults result={result} />}
    </div>
  );
}
