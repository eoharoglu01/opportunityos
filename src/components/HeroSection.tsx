import { FeatureCard } from "./FeatureCard";
import { SearchBar } from "./SearchBar";

type HeroSectionProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
};

const features = [
  {
    title: "Anlık fiyat takibi",
    description: "İhtiyacınız olan ürünleri hızlıca karşılaştırın.",
    icon: "⚡",
  },
  {
    title: "Akıllı öneriler",
    description: "En iyi fırsatları otomatik olarak keşfedin.",
    icon: "🧠",
  },
  {
    title: "Güvenli alışveriş",
    description: "Güvenilir mağazaları tek ekranda görün.",
    icon: "🛡️",
  },
];

export function HeroSection({
  searchValue,
  onSearchChange,
  onSearchSubmit,
}: HeroSectionProps) {
  return (
    <section className="mx-auto flex max-w-6xl items-center justify-center px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
      <div className="w-full overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/80 shadow-[0_25px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:p-12">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-300">
              Yeni nesil fırsat keşfi
            </div>

            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              🚀 OpportunityOS
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Türkiye&apos;nin en akıllı fiyat karşılaştırma platformu
            </p>

            <div className="mt-8">
              <SearchBar
                value={searchValue}
                onChange={onSearchChange}
                onSubmit={onSearchSubmit}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                En iyi fiyatlar
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                Anlık karşılaştırma
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                Akıllı öneriler
              </span>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 p-6">
            <div className="grid gap-3">
              {features.map((feature) => (
                <FeatureCard
                  key={feature.title}
                  title={feature.title}
                  description={feature.description}
                  icon={feature.icon}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
