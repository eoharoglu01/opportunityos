export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
      <a href="#" className="text-lg font-semibold tracking-tight text-white">
        OpportunityOS
      </a>

      <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
        <a href="#fırsatlar" className="transition hover:text-white">
          Fırsatlar
        </a>
        <a href="#özellikler" className="transition hover:text-white">
          Özellikler
        </a>
        <a href="#hakkında" className="transition hover:text-white">
          Hakkında
        </a>
      </nav>
    </header>
  );
}
