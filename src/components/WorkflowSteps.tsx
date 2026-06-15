import { Check, Loader2 } from "lucide-react";

export default function WorkflowSteps({ steps, activeCount }: { steps: string[]; activeCount?: number }) {
  const visibleCount = activeCount ?? steps.length;
  return (
    <div className="space-y-2">
      {steps.slice(0, visibleCount).map((step, index) => {
        const done = index < visibleCount - 1 || visibleCount === steps.length;
        return (
          <div key={step} className="flex items-center gap-3 rounded-[16px] border border-snow bg-white px-3 py-2 shadow-sm">
            <span className={`grid h-7 w-7 place-items-center rounded-full ${done ? "bg-sage text-white" : "bg-copper/15 text-copper"}`}>
              {done ? <Check size={15} /> : <Loader2 className="animate-spin" size={15} />}
            </span>
            <span className="text-sm text-cedar">{step}</span>
          </div>
        );
      })}
    </div>
  );
}
