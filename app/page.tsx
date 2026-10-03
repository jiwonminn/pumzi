import { IntakeForm } from "@/components/IntakeForm";

export default function Home() {
  return (
    <div className="min-h-full bg-[#f4f8f8] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path d="M12 20V4m-8 8h16M7.5 6.5h9M7.5 17.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-slate-900">Pumzi Care</p>
              <p className="text-xs text-slate-500">Pediatric intake</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Saved on this device
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 max-w-2xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-teal-700">New patient case</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Understand the story first.</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">Capture symptoms in the caregiver&apos;s own words, then review the extracted details before assessment.</p>
        </div>
        <IntakeForm />
      </main>
    </div>
  );
}
