type FollowUpQuestionProps = {
  onAnswer: (answer: boolean) => void;
};

export function FollowUpQuestion({ onAnswer }: FollowUpQuestionProps) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-7">
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <path d="M12 8v4m0 4h.01M10.3 3.6 2.8 17a2 2 0 0 0 1.75 3h14.9a2 2 0 0 0 1.75-3l-7.5-13.4a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
            One detail needed
          </p>
          <h2 className="text-lg font-bold text-slate-900">
            Is the child unusually sleepy or difficult to wake?
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Ask the caregiver and record their answer below.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onAnswer(true)}
              className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-amber-50"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => onAnswer(false)}
              className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-amber-50"
            >
              No
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
