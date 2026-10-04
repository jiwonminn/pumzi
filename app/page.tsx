import { IntakeForm } from "@/components/IntakeForm";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="/" className="group">
            <p className="text-lg font-semibold tracking-tight group-hover:text-primary">Pumzi</p>
            <p className="text-sm text-muted-foreground">Offline-first clinic intake</p>
          </a>
          <a
            href="#intake"
            className="hidden text-sm font-semibold text-primary underline-offset-4 hover:underline sm:block"
          >
            Start an intake
          </a>
          <Badge variant="secondary" className="sm:hidden">On this device</Badge>
          <Badge variant="secondary" className="hidden sm:inline-flex">On this device</Badge>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="grid items-center gap-10 rounded-3xl border border-border bg-card px-6 py-8 shadow-sm sm:px-10 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              Built for care teams
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-[1.08]">
              A clearer starting point for every child&apos;s visit.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              Pumzi helps a health worker capture a caregiver&apos;s story, translate it when needed,
              and turn it into structured facts ready for review.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#intake"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                Start a new intake
              </a>
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-5 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                See how it works
              </a>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Runs on this device • Supports English and Swahili • You stay in control
            </p>
          </div>

          <div id="how-it-works" className="rounded-2xl border border-border bg-muted/50 p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">How it works</p>
            <div className="mt-5 space-y-5">
              {[
                ["01", "Listen", "Capture the caregiver’s description in their own words."],
                ["02", "Clarify", "Translate Swahili locally and review the extracted facts."],
                ["03", "Confirm", "Answer follow-up questions before moving to assessment."],
              ].map(([number, title, description]) => (
                <div key={number} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {number}
                  </span>
                  <div>
                    <h2 className="font-semibold">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
              <span className="font-semibold text-foreground">Private by design.</span>{" "}
              Translation and extraction are designed to run locally, without sending the intake to a cloud AI service.
            </div>
          </div>
        </section>

        <section id="intake" className="mt-14 scroll-mt-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Begin here</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Start a new case</h2>
          <p className="mt-2 max-w-xl text-base leading-6 text-muted-foreground">
            Write what the caregiver says. You confirm every sign before the chart decides.
          </p>
        </section>
        <div className="mt-6">
          <IntakeForm />
        </div>
      </main>
    </div>
  );
}
