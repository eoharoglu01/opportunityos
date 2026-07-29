type InputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function Input({ value, onChange, placeholder }: InputProps) {
  return (
    <input
      className="w-full rounded-2xl border border-white/10 bg-slate-800/90 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-blue-500"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
