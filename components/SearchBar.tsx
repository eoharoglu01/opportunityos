type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function SearchBar({ value, onChange, onSubmit }: SearchBarProps) {
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="flex-1">
        <span className="sr-only">Ürün ara</span>
        <input
          className="w-full rounded-2xl border border-white/10 bg-slate-800/90 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-blue-500"
          placeholder="Ürün ara..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <button
        type="submit"
        className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
      >
        Fırsatları Keşfet
      </button>
    </form>
  );
}
