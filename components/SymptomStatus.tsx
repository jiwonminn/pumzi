type SymptomStatusProps = {
  label: string;
  value: boolean | null;
};

export function SymptomStatus({ label, value }: SymptomStatusProps) {
  const status =
    value === true
      ? {
          text: "Present",
          className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
          dotClassName: "bg-emerald-500",
        }
      : value === false
        ? {
            text: "Absent",
            className: "bg-slate-50 text-slate-600 ring-slate-200",
            dotClassName: "bg-slate-400",
          }
        : {
            text: "Needs clarification",
            className: "bg-amber-50 text-amber-700 ring-amber-200",
            dotClassName: "bg-amber-500",
          };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span
        className={`inline-flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status.className}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`} />
        {status.text}
      </span>
    </div>
  );
}
