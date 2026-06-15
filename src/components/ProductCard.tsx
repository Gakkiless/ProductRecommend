import { ChevronRight, Mountain, ShieldAlert, Sparkles } from "lucide-react";
import type { Product } from "../types";

export default function ProductCard({ product, compact = false, onClick }: { product: Product; compact?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[20px] border border-snow bg-white p-4 text-left shadow-soft transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-copper">{product.route}</p>
          <h3 className="mt-1 text-[17px] font-semibold leading-snug text-cedar">{product.name}</h3>
          <p className="mt-1 text-sm text-clay/70">{product.duration} · {product.priceRange}</p>
        </div>
        <div className="grid h-12 min-w-12 place-items-center rounded-[16px] bg-slate-100 text-copper">
          <span className="text-sm font-semibold">{product.score}%</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {product.audience.map((item) => (
          <span key={item} className="rounded-full bg-sage/12 px-2.5 py-1 text-xs text-sage">{item}</span>
        ))}
      </div>

      {!compact && (
        <div className="mt-4 space-y-2 text-sm text-clay/80">
          <p className="flex gap-2"><Mountain className="mt-0.5 shrink-0 text-copper" size={16} />{product.hotels}</p>
          <p className="flex gap-2"><Sparkles className="mt-0.5 shrink-0 text-copper" size={16} />{product.activities.join("、")}</p>
          <p className="flex gap-2"><ShieldAlert className="mt-0.5 shrink-0 text-copper" size={16} />{product.altitudeRisk}</p>
          <p className="rounded-[14px] border border-snow bg-linen px-3 py-2 text-cedar">{product.reason}</p>
          <p className="text-xs text-clay/60">不适合：{product.notFor.join("、")}</p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-sm text-copper">
        <span>{product.vehicle}</span>
        <ChevronRight size={17} />
      </div>
    </button>
  );
}
