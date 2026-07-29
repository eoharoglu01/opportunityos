type EmptyStateProps = {
  message: string;
};

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-center text-slate-300">
      {message}
    </div>
  );
}
