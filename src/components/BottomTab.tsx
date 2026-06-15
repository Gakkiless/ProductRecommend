import { Home, MessageCircle, PackageSearch, ReceiptText, UserRound } from "lucide-react";
import type { ComponentType } from "react";
import type { TabKey } from "../types";

const tabs: Array<{ key: TabKey; label: string; icon: ComponentType<{ size?: number }> }> = [
  { key: "home", label: "首页", icon: Home },
  { key: "customer", label: "客户", icon: MessageCircle },
  { key: "products", label: "产品", icon: PackageSearch },
  { key: "quote", label: "报价", icon: ReceiptText },
  { key: "mine", label: "我的", icon: UserRound },
];

export default function BottomTab({ current, onChange }: { current: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-5 border-t border-snow bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 shadow-[0_-16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = current === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex flex-col items-center gap-1 rounded-[20px] py-2 text-[11px] transition ${
              active ? "bg-copper text-white" : "text-clay"
            }`}
            aria-label={tab.label}
          >
            <Icon size={18} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
