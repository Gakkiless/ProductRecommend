import { FileText, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { mockProducts } from "../data/mockProducts";
import WorkflowSteps from "./WorkflowSteps";

const options = {
  customer: ["亲子", "夫妻", "企业家", "银发", "摄影", "户外"],
  month: ["5月", "6月", "7月", "8月", "国庆"],
  people: ["2", "4", "6", "8"],
  budget: ["5万", "8万", "10万", "15万+"],
  pace: ["轻松", "标准", "深度"],
};

export default function QuoteBuilder() {
  const [form, setForm] = useState({ customer: "亲子", month: "7月", people: "4", budget: "10万", pace: "轻松" });
  const [generated, setGenerated] = useState(false);
  const product = useMemo(() => (form.customer === "户外" ? mockProducts[3] : form.customer === "企业家" ? mockProducts[2] : mockProducts[0]), [form.customer]);
  const steps = ["AI 识别客户需求", "查询酒店库存", "匹配松赞车队", "匹配在地活动", "生成每日行程", "生成报价单"];

  return (
    <div className="space-y-4">
      <section className="rounded-[20px] border border-snow bg-white p-4 shadow-soft">
        <h2 className="text-lg font-semibold text-cedar">AI 报价生成</h2>
        <p className="mt-1 text-sm leading-relaxed text-clay/70">按客户类型和节奏生成可演示的报价草案，后续可接入真实库存、订单和PDF服务。</p>
        <div className="mt-4 space-y-4">
          <Picker label="客户类型" value={form.customer} values={options.customer} onChange={(value) => setForm({ ...form, customer: value })} />
          <Picker label="出行时间" value={form.month} values={options.month} onChange={(value) => setForm({ ...form, month: value })} />
          <Picker label="人数" value={form.people} values={options.people} onChange={(value) => setForm({ ...form, people: value })} />
          <Picker label="预算" value={form.budget} values={options.budget} onChange={(value) => setForm({ ...form, budget: value })} />
          <Picker label="节奏" value={form.pace} values={options.pace} onChange={(value) => setForm({ ...form, pace: value })} />
        </div>
        <button
          type="button"
          onClick={() => setGenerated(true)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-[14px] bg-copper px-4 py-3 font-semibold text-white shadow-soft"
        >
          <Wand2 size={18} />生成报价
        </button>
      </section>

      {generated && (
        <section className="space-y-4 rounded-[20px] border border-snow bg-white p-4 shadow-soft">
          <WorkflowSteps steps={steps} />
          <div className="rounded-[18px] border border-snow bg-linen p-4">
            <p className="text-xs text-copper">推荐产品</p>
            <h3 className="mt-1 text-xl font-semibold text-cedar">{product.name}</h3>
            <p className="mt-2 text-sm text-clay/75">{form.month}出行 · {form.people}人 · {form.pace}节奏 · 预算{form.budget}</p>
            <div className="mt-4 space-y-3 text-sm text-clay/80">
              <p><strong className="text-cedar">每日行程：</strong>香格里拉适应 → 奔子栏峡谷 → 梅里雪山 → 藏文化体验 → 轻徒步/自然教育 → 返回香格里拉。</p>
              <p><strong className="text-cedar">酒店安排：</strong>{product.hotels}</p>
              <p><strong className="text-cedar">车辆安排：</strong>{product.vehicle}</p>
              <p><strong className="text-cedar">活动安排：</strong>{product.activities.join("、")}</p>
              <p><strong className="text-cedar">预估价格：</strong>{form.budget === "15万+" ? "¥150,000 起" : `约 ¥${Number.parseInt(form.budget) * 10000 - 8000} - ¥${Number.parseInt(form.budget) * 10000}`}</p>
              <p className="rounded-[14px] bg-slate-100 px-3 py-2 text-cedar"><strong>风险提示：</strong>{product.altitudeRisk}</p>
            </div>
            <button type="button" className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] border border-snow bg-white px-4 py-3 font-semibold text-copper">
              <FileText size={18} />生成 PDF
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Picker({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-cedar">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`rounded-[12px] px-3 py-2 text-sm transition ${value === item ? "bg-copper text-white" : "bg-linen text-clay"}`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
