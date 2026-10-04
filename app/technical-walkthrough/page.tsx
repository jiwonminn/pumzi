"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Database,
  Languages,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  WifiOff,
} from "lucide-react";

const TOTAL_SLIDES = 4;
const REVEAL_STEPS = [3, 4, 4, 6];

const slideMeta = [
  { eyebrow: "01 / INPUT", title: "Patients speak naturally." },
  { eyebrow: "02 / AI PIPELINE", title: "Language Becomes Structured Clinical Facts" },
  { eyebrow: "03 / SAFETY", title: "AI Understands. Rules Decide." },
  { eyebrow: "04 / HANDOFF", title: "Offline-First Clinical Handoff" },
];

function FlowArrow({ vertical = false }: { vertical?: boolean }) {
  return vertical ? (
    <ChevronDown aria-hidden="true" className="h-5 w-5 text-sky-400" />
  ) : (
    <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-sky-400" />
  );
}

function IconBox({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "cyan" | "green" | "amber" }) {
  const tones = {
    blue: "border-blue-400/25 bg-blue-400/10 text-blue-200",
    cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-200",
    green: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
    amber: "border-amber-300/25 bg-amber-300/10 text-amber-200",
  };
  return <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${tones[tone]}`}>{children}</div>;
}

function RevealStep({ visible, children, className = "" }: { visible: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`transition-all duration-300 ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"} ${className}`}>
      {children}
    </div>
  );
}

function TechStrip({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
      {items.map((item) => <span key={item} className="rounded-full border border-white/10 px-3 py-1.5">{item}</span>)}
    </div>
  );
}

function SlideOne({ reveal }: { reveal: number }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
      <div className="max-w-md">

        <p className="font-semibold text-white text-xl">Problem Statement:</p>
        <p className="text-lg leading-8 text-slate-300">“We bridge the gap between what caregivers say and what clinics need to act on using local AI to understand patients and an offline care handoff to keep information moving.”<br></br><br></br>Caregivers describe symptoms naturally instead of filling rigid clinical forms.</p>
        <TechStrip items={["Next.js interface"]} />
      </div>
      <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 sm:p-8">
        <div className="flex flex-col items-center">
          <RevealStep visible={reveal >= 0} className="w-full max-w-xl">
            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <IconBox tone="cyan"><Stethoscope aria-hidden="true" className="h-5 w-5" /></IconBox>
            <div>
              <p className="font-semibold text-white">Caregiver</p>
              <p className="mt-1 text-sm text-slate-400">A story, not a form</p>
            </div>
            </div>
          </RevealStep>
          <RevealStep visible={reveal >= 1}><FlowArrow vertical /></RevealStep>
          <RevealStep visible={reveal >= 1} className="w-full max-w-xl">
            <div className="rounded-2xl border border-sky-300/25 bg-sky-300/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">Natural-language description</p>
              <p className="mt-3 text-lg leading-8 text-sky-50 sm:text-xl">“Mtoto wangu ana homa na hawezi kunywa tangu jana.”</p>
            </div>
          </RevealStep>
          <RevealStep visible={reveal >= 2}><FlowArrow vertical /></RevealStep>
          <RevealStep visible={reveal >= 2} className="w-full max-w-xl">
            <div className="flex items-center gap-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
              <IconBox tone="green"><Sparkles aria-hidden="true" className="h-5 w-5" /></IconBox>
              <div>
                <p className="font-semibold text-white">AI pipeline</p>
                <p className="mt-1 text-sm text-slate-400">Language becomes reviewable care data</p>
              </div>
            </div>
          </RevealStep>
        </div>
      </div>
    </div>
  );
}

function SlideTwo({ reveal }: { reveal: number }) {
  return (
    <div className="grid gap-6">
      <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1.1fr]">
        <RevealStep visible={reveal >= 0} className="rounded-2xl border border-sky-300/25 bg-sky-300/10 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">Swahili input</p>
          <p className="mt-3 text-base leading-7 text-sky-50">“Mtoto wangu ana homa na hawezi kunywa tangu jana.”</p>
        </RevealStep>
        <RevealStep visible={reveal >= 1}><FlowArrow /></RevealStep>
        <RevealStep visible={reveal >= 1} className="rounded-2xl border border-blue-300/25 bg-blue-300/10 p-5 text-center">
          <Languages className="mx-auto h-6 w-6 text-blue-200" />
          <p className="mt-2 font-semibold text-white">NLLB-200</p>
          <p className="mt-1 text-xs text-slate-400">Swahili → English</p>
        </RevealStep>
        <RevealStep visible={reveal >= 1}><FlowArrow /></RevealStep>
        <RevealStep visible={reveal >= 1} className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">English</p>
          <p className="mt-3 text-base leading-7 text-slate-200">“My child has a fever and cannot drink since yesterday.”</p>
        </RevealStep>
      </div>
      <RevealStep visible={reveal >= 2} className="grid gap-5 lg:grid-cols-[auto_1fr] lg:items-center">
        <div className="flex items-center justify-center gap-3 lg:flex-col"><FlowArrow vertical /><BrainCircuit className="h-7 w-7 text-cyan-200" /></div>
        <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold text-white">Qwen2.5 1.5B</p><span className="text-xs uppercase tracking-[0.16em] text-cyan-200">Clinical extraction</span></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {["✓  Fever     PRESENT", "✓  Cannot drink     PRESENT", "?  Lethargy     UNKNOWN"].map((item, index) => <div key={item} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${index === 2 ? "border-amber-300/25 bg-amber-300/10 text-amber-100" : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"}`}>{item}</div>)}
          </div>
        </div>
      </RevealStep>
      <RevealStep visible={reveal >= 3} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-5 py-4">
        <p className="text-lg font-semibold text-amber-100">UNKNOWN ≠ NO</p><p className="text-sm text-amber-50/70">Unmentioned information stays unknown.</p>
      </RevealStep>
      <TechStrip items={["NLLB", "Qwen2.5 1.5B", "llama.cpp", "FastAPI"]} />
    </div>
  );
}

function SlideThree({ reveal }: { reveal: number }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
      <RevealStep visible={reveal >= 0} className="rounded-3xl border border-sky-300/20 bg-sky-300/[0.08] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <IconBox tone="blue"><BrainCircuit aria-hidden="true" className="h-5 w-5" /></IconBox>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">Layer 01</p>
            <h3 className="mt-1 text-xl font-semibold text-white">AI Layer</h3>
          </div>
        </div>
        <ul className="mt-7 grid gap-3 text-sm text-slate-300">
          {["Translation", "Fact extraction", "Unknown detection"].map((item) => (
            <li key={item} className="flex items-center gap-3"><Check aria-hidden="true" className="h-4 w-4 text-sky-300" />{item}</li>
          ))}
        </ul>
      </RevealStep>
      <RevealStep visible={reveal >= 1} className="grid place-items-center"><ArrowRight className="hidden h-8 w-8 text-sky-300 lg:block" /><ChevronDown className="h-7 w-7 text-sky-300 lg:hidden" /></RevealStep>
      <RevealStep visible={reveal >= 1} className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.08] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <IconBox tone="green"><Database aria-hidden="true" className="h-5 w-5" /></IconBox>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Layer 02</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Verified clinical data</h3>
          </div>
        </div>
        <ul className="mt-7 grid gap-3 text-sm text-slate-300">
          {["Schema validated", "Health-worker confirmed"].map((item) => (
            <li key={item} className="flex items-center gap-3"><Check aria-hidden="true" className="h-4 w-4 text-emerald-300" />{item}</li>
          ))}
        </ul>
      </RevealStep>
      <RevealStep visible={reveal >= 2} className="grid place-items-center"><ArrowRight className="hidden h-8 w-8 text-emerald-300 lg:block" /><ChevronDown className="h-7 w-7 text-emerald-300 lg:hidden" /></RevealStep>
      <RevealStep visible={reveal >= 2} className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.08] p-6 sm:p-8">
        <div className="flex items-center gap-3"><IconBox tone="green"><ShieldCheck className="h-5 w-5" /></IconBox><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Layer 03</p><h3 className="mt-1 text-xl font-semibold text-white">Deterministic rules</h3></div></div>
        <ul className="mt-7 grid gap-3 text-sm text-slate-300">{["Referral decision", "Explainable logic", "No AI diagnosis"].map((item) => <li key={item} className="flex items-center gap-3"><Check className="h-4 w-4 text-emerald-300" />{item}</li>)}</ul>
      </RevealStep>
      </div>
      <RevealStep visible={reveal >= 3} className="rounded-2xl border border-amber-300/25 bg-amber-300/[0.08] px-5 py-5 text-center sm:px-8"><p className="text-xl font-semibold text-amber-100 sm:text-2xl">AI interprets language. It does not diagnose.</p></RevealStep>
    </div>
  );
}

function SlideFour({ reveal }: { reveal: number }) {
  const nodes = [
    ["Patient", "Natural description", Stethoscope, "cyan"], ["Intake", "Next.js", Code2, "blue"], ["Local AI", "NLLB → Qwen", BrainCircuit, "cyan"], ["Verified data", "Schema + confirmation", Database, "green"], ["Clinical logic", "Rules engine", ShieldCheck, "green"], ["Handoff", "Referral + Care Card + QR", QrCode, "amber"],
  ] as const;
  return (
    <div>
      <div className="grid gap-3 lg:grid-cols-6 lg:items-stretch">
        {nodes.map(([label, detail, Icon, tone], index) => (
          <RevealStep key={label} visible={reveal >= index} className="flex items-center gap-3 lg:block">
            <div className={`h-full rounded-2xl border p-4 ${tone === "green" ? "border-emerald-300/20 bg-emerald-300/[0.08]" : tone === "amber" ? "border-amber-300/25 bg-amber-300/[0.08]" : "border-sky-300/20 bg-sky-300/[0.08]"}`}>
              <div className="flex items-center gap-3 lg:block"><div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-sky-200"><Icon aria-hidden="true" className="h-5 w-5" /></div><div className="mt-0 lg:mt-3"><p className="font-semibold text-white">{label}</p><p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p></div></div>
            </div>
            {index < nodes.length - 1 && <FlowArrow />}
          </RevealStep>
        ))}
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {[[<WifiOff key="wifi" className="h-4 w-4" />, "Local inference"], [<ShieldCheck key="shield" className="h-4 w-4" />, "Explainable decisions"], [<QrCode key="qr" className="h-4 w-4" />, "Core workflow can run offline"]].map(([icon, label]) => <div key={String(label)} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-3 text-sm font-semibold text-emerald-100">{icon}{label}</div>)}
      </div>
      <TechStrip items={["Next.js", "FastAPI", "NLLB", "Qwen", "llama.cpp"]} />
      <p className="mt-6 text-center text-sm text-slate-500">Designed for low-connectivity environments</p>
    </div>
  );
}

export default function TechnicalWalkthrough() {
  const [slide, setSlide] = useState(0);
  const [reveal, setReveal] = useState(0);

  const goTo = (next: number) => {
    setSlide(Math.max(0, Math.min(TOTAL_SLIDES - 1, next)));
    setReveal(0);
  };

  const next = () => {
    if (reveal < REVEAL_STEPS[slide] - 1) setReveal((current) => current + 1);
    else goTo(slide + 1);
  };

  const back = () => {
    if (reveal > 0) setReveal((current) => current - 1);
    else {
      const previous = Math.max(0, slide - 1);
      setSlide(previous);
      setReveal(REVEAL_STEPS[previous] - 1);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        if (reveal < REVEAL_STEPS[slide] - 1) setReveal((current) => current + 1);
        else {
          setSlide((current) => Math.min(TOTAL_SLIDES - 1, current + 1));
          setReveal(0);
        }
      }
      if (event.key === "ArrowLeft") {
        if (reveal > 0) setReveal((current) => current - 1);
        else {
          const previous = Math.max(0, slide - 1);
          setSlide(previous);
          setReveal(REVEAL_STEPS[previous] - 1);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [slide, reveal]);

  const content = [<SlideOne key="input" reveal={reveal} />, <SlideTwo key="ai" reveal={reveal} />, <SlideThree key="safety" reveal={reveal} />, <SlideFour key="handoff" reveal={reveal} />][slide];
  const isLast = slide === TOTAL_SLIDES - 1;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#071426] text-slate-100 selection:bg-sky-300/30 lg:h-screen lg:overflow-hidden">
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:linear-gradient(rgba(125,180,220,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(125,180,220,0.045)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 sm:py-7 lg:h-full lg:min-h-0 lg:px-12">
        <header className="flex items-center justify-between gap-5 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-sky-300/20 bg-sky-300/10 text-sky-200"><Stethoscope aria-hidden="true" className="h-4 w-4" /></div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">Pumzi</p>
              <p className="text-xs text-slate-500">Technical walkthrough</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span className="hidden sm:inline">Architecture / 60 sec</span>
            <span className="text-sky-200">{slide + 1} / {TOTAL_SLIDES}</span>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-10 sm:py-14 lg:min-h-0 lg:overflow-hidden lg:py-8">
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">{slideMeta[slide].eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">{slideMeta[slide].title}</h1>
          </div>
          <div key={slide} className="animate-in fade-in slide-in-from-right-2 duration-300">{content}</div>
        </section>

        <footer className="flex flex-col gap-5 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2" aria-label={`Slide ${slide + 1} of ${TOTAL_SLIDES}`}>
            {slideMeta.map((item, index) => (
              <button key={item.eyebrow} type="button" onClick={() => goTo(index)} aria-label={`Go to slide ${index + 1}`} aria-current={slide === index ? "step" : undefined} className={`h-1.5 rounded-full transition-all ${slide === index ? "w-10 bg-sky-300" : "w-5 bg-white/20 hover:bg-white/40"}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {isLast ? (
              <button type="button" onClick={() => { setSlide(0); setReveal(0); }} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"><RotateCcw aria-hidden="true" className="h-4 w-4" />Restart</button>
            ) : null}
            <button type="button" onClick={back} disabled={slide === 0 && reveal === 0} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back</button>
            <button type="button" onClick={next} disabled={isLast && reveal === REVEAL_STEPS[slide] - 1} className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/70">Next<ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
          </div>
        </footer>
      </div>
    </main>
  );
}