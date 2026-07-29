type OpportunityCardProps = {
  productName: string;
  store: string;
  price: string;
  savings: string;
  badge: string;
  description: string;
};

export function OpportunityCard({
  productName,
  store,
  price,
  savings,
  badge,
  description,
}: OpportunityCardProps) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-blue-300">{badge}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{productName}</h3>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
          {savings}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>

      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Mağaza</p>
          <p className="mt-1 font-medium text-slate-200">{store}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Fiyat</p>
          <p className="mt-1 font-semibold text-white">{price}</p>
        </div>
      </div>
    </article>
  );
}
