type BadgeProps = {
  children: React.ReactNode;
  tone?: "default" | "success";
};

export function Badge({ children, tone = "default" }: BadgeProps) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/15 text-emerald-300"
      : "bg-white/10 text-slate-300";

  return <span className={`rounded-full px-3 py-1 text-sm ${toneClass}`}>{children}</span>;
}
