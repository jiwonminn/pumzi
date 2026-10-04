import { IntakeForm } from "@/components/IntakeForm";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-lg font-semibold tracking-tight">Pumzi</p>
            <p className="text-sm text-muted-foreground">Clinic intake</p>
          </div>
          <Badge variant="secondary">On this phone</Badge>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">New case</h1>
        <p className="mt-2 max-w-xl text-base leading-6 text-muted-foreground">
          Write what the caregiver says. You confirm every sign before the chart decides.
        </p>
        <div className="mt-6">
          <IntakeForm />
        </div>
      </main>
    </div>
  );
}
