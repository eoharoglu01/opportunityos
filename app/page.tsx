"use client";

import { Header } from "../src/components/Header";
import { HeroSection } from "../src/components/HeroSection";
import { OpportunityCard } from "../src/components/OpportunityCard";
import { EmptyState } from "../src/components/ui/EmptyState";
import { Loader } from "../src/components/ui/Loader";
import { useSearch } from "../src/hooks/useSearch";

export default function Home() {
  const { searchValue, setSearchValue, setSubmittedQuery, opportunities, isLoading, error } =
    useSearch();

  return (
    <main className="min-h-screen bg-[#111827] text-white">
      <Header />

      <HeroSection
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearchSubmit={() => setSubmittedQuery(searchValue)}
      />

      <section id="fırsatlar" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-300">Öne çıkan fırsatlar</p>
            <h2 className="text-2xl font-semibold text-white">Sonuçlar</h2>
          </div>
          <p className="text-sm text-slate-400">{opportunities.length} fırsat gösteriliyor</p>
        </div>

        {isLoading ? <Loader /> : null}

        {!isLoading && error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-300">
            {error}
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {opportunities.map((opportunity) => (
                <OpportunityCard key={opportunity.id} {...opportunity} />
              ))}
            </div>

            {opportunities.length === 0 ? (
              <div className="mt-6">
                <EmptyState message="Aramanıza uygun fırsat bulunamadı. Farklı bir ürün adı deneyin." />
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}