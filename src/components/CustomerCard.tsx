import { CalendarClock, CreditCard, Gem, MapPin, Phone, TrendingUp } from "lucide-react";
import type { ComponentType } from "react";
import type { Customer } from "../types";

export default function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <section className="rounded-[20px] border border-snow bg-white p-5 shadow-songtsam">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-copper">当前客户</p>
          <h2 className="mt-1 text-2xl font-semibold text-cedar">{customer.name}</h2>
          <p className="mt-1 text-sm text-clay/70">{customer.status}</p>
        </div>
        <span className="rounded-full bg-copper/15 px-3 py-1 text-xs font-medium text-copper">{customer.memberLevel}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Info icon={CreditCard} label="会员卡号" value={customer.memberCardNo} />
        <Info icon={Phone} label="会员手机号" value={customer.memberPhone} />
        <Info icon={MapPin} label="城市" value={customer.city} />
        <Info icon={TrendingUp} label="历史消费金额" value={`￥${customer.gmv}`} />
        <Info icon={Gem} label="家庭结构" value={customer.family} wide />
        <Info icon={CalendarClock} label="最近出行" value={customer.lastTrip} wide />
      </div>
    </section>
  );
}

function Info({
  icon: Icon,
  label,
  value,
  wide,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-[14px] border border-snow bg-linen p-3 ${wide ? "col-span-2" : ""}`}>
      <div className="mb-1 flex items-center gap-1.5 text-xs text-copper"><Icon size={14} />{label}</div>
      <p className="text-sm font-medium leading-relaxed text-cedar">{value}</p>
    </div>
  );
}
