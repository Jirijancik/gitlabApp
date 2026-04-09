import { AuditPanel } from "@/components/AuditPanel";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center py-12">
      <h1 className="mb-8 text-3xl font-semibold">GitLab Access Audit</h1>
      <AuditPanel />
    </main>
  );
}
