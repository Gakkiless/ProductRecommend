import { AlertTriangle, Bell, Bot, CalendarClock, ChevronDown, MessageSquareText, Mic, Send, UserRound, X } from "lucide-react";
import { Button } from "antd-mobile";
import { useEffect, useRef, useState } from "react";
import { mockCustomers } from "../data/mockCustomers";
import { classifyIntent } from "../utils/aiRouter";
import ProductCard from "./ProductCard";
import SalesJourneyFlow from "./SalesJourneyFlow";
import type { Customer, Product, RouterResult } from "../types";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  result?: RouterResult;
  activeSteps?: number;
};

type ChatSession = {
  id: string;
  customer: Customer;
  title: string;
  messages: Message[];
  latestResult?: RouterResult;
};

const commandGroups = [
  { label: "看客户画像", prompt: "帮我看下这个客户的画像、标签和历史订单" },
  { label: "查产品库存", prompt: "查6月梅里雪山产品团期库存和价格" },
  { label: "查酒店库存", prompt: "查松赞梅里山居6月18日雪山景观大床房库存和价格" },
  { label: "生成报价", prompt: "帮我做一个暑期亲子版本报价" },
];

function createWelcomeMessage(customer: Customer): Message {
  return {
    id: `welcome-${customer.id}`,
    role: "assistant",
    text: `已进入${customer.name}的客户会话。当前上下文只读取这位客户的画像、订单、维护记录和报价记录，避免和其他客户混用。`,
  };
}

export default function ChatPanel({ initialPrompt }: { initialPrompt?: string }) {
  const [input, setInput] = useState("");
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [sessionSwitcherOpen, setSessionSwitcherOpen] = useState(false);
  const [salesFlowOpen, setSalesFlowOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(mockCustomers[0].id);
  const [sessions, setSessions] = useState<ChatSession[]>(() =>
    mockCustomers.map((customer) => ({
      id: customer.id,
      customer,
      title: `${customer.name}会话`,
      messages: [createWelcomeMessage(customer)],
    })),
  );
  const [loading, setLoading] = useState(false);
  const lastPrompt = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentSession = sessions.find((session) => session.id === currentSessionId) ?? sessions[0];
  const currentCustomer = currentSession.customer;
  const messages = currentSession.messages;
  const latestResult = currentSession.latestResult;

  useEffect(() => {
    if (initialPrompt && initialPrompt !== lastPrompt.current) {
      lastPrompt.current = initialPrompt;
      void submit(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function updateSession(sessionId: string, updater: (session: ChatSession) => ChatSession) {
    setSessions((current) => current.map((session) => (session.id === sessionId ? updater(session) : session)));
  }

  function appendMessage(sessionId: string, message: Message) {
    updateSession(sessionId, (session) => ({ ...session, messages: [...session.messages, message] }));
  }

  function switchSession(sessionId: string) {
    setCurrentSessionId(sessionId);
  }

  async function submit(value = input, targetSessionId = currentSessionId) {
    const text = value.trim();
    if (!text || loading) return;
    setInput("");

    const switchedCustomer = findCustomerInText(text);
    if (switchedCustomer && /切换|换到|换成|当前客户|会话客户/.test(text)) {
      switchSession(switchedCustomer.id);
      return;
    }

    const sessionId = targetSessionId;
    const customer = sessions.find((session) => session.id === sessionId)?.customer ?? currentCustomer;
    appendMessage(sessionId, { id: crypto.randomUUID(), role: "user", text });
    setLoading(true);

    await delay(520);
    const result = classifyIntent(text, customer);
    updateSession(sessionId, (session) => ({ ...session, latestResult: result }));
    const assistantId = crypto.randomUUID();
    appendMessage(sessionId, { id: assistantId, role: "assistant", text: "", result, activeSteps: 1 });
    setLoading(false);

    for (let i = 1; i <= result.response.length; i += 5) {
      await delay(24);
      updateSession(sessionId, (session) => ({
        ...session,
        messages: session.messages.map((message) =>
          message.id === assistantId ? { ...message, text: result.response.slice(0, i) } : message,
        ),
      }));
    }
    updateSession(sessionId, (session) => ({
      ...session,
      messages: session.messages.map((message) =>
        message.id === assistantId ? { ...message, text: result.response } : message,
      ),
    }));

    for (let i = 2; i <= result.workflowSteps.length; i += 1) {
      await delay(260);
      updateSession(sessionId, (session) => ({
        ...session,
        messages: session.messages.map((message) =>
          message.id === assistantId ? { ...message, activeSteps: i } : message,
        ),
      }));
    }
  }

  if (salesFlowOpen) {
    return <SalesJourneyFlow customer={currentCustomer} onClose={() => setSalesFlowOpen(false)} />;
  }

  return (
    <section className="songtsam-ai flex min-h-screen flex-col bg-linen">
      <div className="sticky top-0 z-10 bg-copper px-5 py-4 text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSessionSwitcherOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-[4px] text-left"
            aria-label="切换客户会话"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[4px] bg-white/10 text-white ring-1 ring-white/10">
              <MessageSquareText size={17} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-base font-semibold leading-6 text-white">
                  {currentCustomer.name} · {currentCustomer.memberLevel}
                </h1>
                <ChevronDown size={15} className="shrink-0 text-white/55" />
              </div>
              <p className="truncate text-xs leading-[18px] text-white/65">
                {currentCustomer.memberCardNo} · {currentCustomer.memberPhone}
              </p>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setRemindersOpen(true)}
              className="relative grid h-10 w-10 place-items-center rounded-[4px] border border-white/10 bg-white/10 text-white"
              aria-label="消息提醒"
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-sage" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 border-b border-snow bg-white px-5 py-4 shadow-sm">
        <Button
          color="primary"
          onClick={() => setSalesFlowOpen(true)}
          className="col-span-2 !min-h-10 !rounded-[12px] !border-copper !bg-copper !px-2 !py-1 !text-xs !font-semibold !leading-[18px]"
        >
          开始沟通
        </Button>
        {commandGroups.map((item) => (
          <Button
            key={item.label}
            onClick={() => submit(item.prompt)}
            className="!min-h-10 !rounded-[12px] !border-snow !bg-linen !px-1 !py-1 !text-xs !font-medium !leading-[18px] !text-clay"
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="flex-1 space-y-3 px-5 pb-4 pt-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} onAsk={submit} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-clay/70">
            <Bot size={18} className="text-copper" />
            AI 正在识别意图并查询 Mock 数据...
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="sticky bottom-0 z-20 border-t border-snow bg-white p-4 shadow-[0_-16px_40px_rgba(15,23,42,0.08)]"
      >
        <div className="flex items-end gap-2">
          <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-linen text-copper" aria-label="语音输入">
            <Mic size={18} />
          </button>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="描述客户需求、查询产品、生成报价..."
            rows={2}
            className="min-h-10 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-[22px] text-cedar outline-none placeholder:text-clay/45"
          />
          <button type="submit" className="songtsam-primary grid h-10 w-10 shrink-0 place-items-center">
            <Send size={18} />
          </button>
        </div>
      </form>
      {remindersOpen && <ReminderPanel currentCustomer={currentCustomer} onClose={() => setRemindersOpen(false)} onAsk={submit} />}
      {sessionSwitcherOpen && (
        <SessionSwitcher
          sessions={sessions}
          currentSessionId={currentSessionId}
          onClose={() => setSessionSwitcherOpen(false)}
          onSwitch={(sessionId) => {
            setSessionSwitcherOpen(false);
            switchSession(sessionId);
          }}
          onAnalyze={(sessionId) => {
            setSessionSwitcherOpen(false);
            switchSession(sessionId);
            window.setTimeout(() => {
              void submit("帮我看下这个客户的画像、标签和历史订单", sessionId);
            }, 80);
          }}
        />
      )}
      <IntentAnnotation result={latestResult} />
    </section>
  );
}

function SessionSwitcher({
  sessions,
  currentSessionId,
  onClose,
  onSwitch,
  onAnalyze,
}: {
  sessions: ChatSession[];
  currentSessionId: string;
  onClose: () => void;
  onSwitch: (sessionId: string) => void;
  onAnalyze: (sessionId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-cedar/45 px-4 pb-4 pt-16 backdrop-blur-sm">
      <section className="mx-auto w-full max-w-[430px] rounded-[20px] bg-white p-4 shadow-songtsam">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs leading-[18px] text-copper">客户会话</p>
            <h2 className="mt-1 text-xl font-medium leading-7 text-cedar">切换会话</h2>
            <p className="mt-1 text-sm leading-[22px] text-[#808080]">每个客户独立上下文，维护记录不会串到其他客户。</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-linen text-clay" aria-label="关闭切换客户">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 min-[620px]:grid-cols-2">
        {sessions.map((session) => {
          const item = session.customer;
          const lastMessage = session.messages[session.messages.length - 1];
          return (
          <article key={item.id} className={`rounded-[16px] border p-3 ${item.id === currentSessionId ? "border-copper bg-slate-50" : "border-snow bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-medium leading-6 text-cedar">{item.name} · {item.memberLevel}</h3>
                <p className="mt-1 text-xs leading-[18px] text-[#808080]">
                  {item.memberCardNo} · {item.memberPhone}
                </p>
                <p className="mt-0.5 text-xs leading-[18px] text-[#808080]">{item.family}</p>
              </div>
              {item.id === currentSessionId && <span className="shrink-0 rounded-[10px] bg-copper px-2 py-1 text-[11px] leading-4 text-white">当前</span>}
            </div>
            <p className="mt-2 line-clamp-2 rounded-[12px] bg-linen px-2 py-1.5 text-xs leading-[18px] text-slate-600">
              {lastMessage?.role === "user" ? "销售：" : "AI："}{lastMessage?.text ?? "暂无消息"}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="songtsam-tag-green rounded-[4px] px-2 py-1 text-[11px] leading-4">{tag}</span>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onSwitch(item.id)} className="songtsam-primary h-9 px-3 text-xs">
                进入会话
              </button>
              <button type="button" onClick={() => onAnalyze(item.id)} className="songtsam-outline h-9 px-3 text-xs">
                分析客户
              </button>
            </div>
          </article>
        );
        })}
        </div>
      </section>
    </div>
  );
}

function ReminderPanel({
  currentCustomer,
  onClose,
  onAsk,
}: {
  currentCustomer: Customer;
  onClose: () => void;
  onAsk: (prompt: string) => void;
}) {
  const reminders = [
    {
      type: "客户维护",
      title: `${currentCustomer.name}需要跟进`,
      detail: currentCustomer.status,
      action: `生成${currentCustomer.name}的跟进话术`,
      tone: "bg-copper/10 text-copper",
      icon: CalendarClock,
    },
    {
      type: "出行风险",
      title: "梅里方向未来3天有降雪概率",
      detail: "建议提前给6月梅里意向客户说明路况和高反准备。",
      action: "生成梅里风险提醒话术",
      tone: "bg-red-50 text-red-700",
      icon: AlertTriangle,
    },
    {
      type: "VIP到店",
      title: "金刚会员今日抵达松赞梅里山居",
      detail: "建议同步管家准备欢迎卡、晚餐偏好和次日观景时间。",
      action: "生成管家交接要点",
      tone: "bg-sage/12 text-sage",
      icon: Bell,
    },
    {
      type: "业绩完成",
      title: "本月成交¥386,000，完成率72%",
      detail: "距离月目标还差¥150,000，建议优先推进高转化客户报价和复购客户维护。",
      action: "生成本周业绩冲刺清单",
      tone: "bg-copper/10 text-copper",
      icon: CalendarClock,
    },
    {
      type: "集团线索",
      title: "集团分配2条高净值新线索",
      detail: "1条来自会员活动报名，1条来自梅里雪山定制咨询，建议15分钟内完成首次触达。",
      action: "查看集团线索并生成首触话术",
      tone: "bg-linen text-clay",
      icon: UserRound,
    },
  ];

  return (
    <div className="fixed inset-0 z-40 bg-cedar/45 px-4 pb-4 pt-24 backdrop-blur-sm">
      <section className="mx-auto max-h-[78vh] w-full max-w-[430px] overflow-auto rounded-[20px] bg-white p-4 shadow-songtsam">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-copper">Reminder Agent</p>
            <h2 className="mt-1 text-xl font-semibold text-cedar">提醒中心</h2>
            <p className="mt-1 text-sm text-clay/65">点击任一动作，会回到对话里生成可发送内容。</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-linen text-clay" aria-label="关闭提醒">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 min-[620px]:grid-cols-2">
          {reminders.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-[18px] border border-snow bg-white p-3 shadow-sm">
                <div className="flex gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-[16px] ${item.tone}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="rounded-full bg-linen px-2 py-1 text-[11px] text-clay">{item.type}</span>
                    <h3 className="mt-2 font-semibold leading-snug text-cedar">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-clay/70">{item.detail}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAsk(item.action);
                  }}
                  className="mt-3 w-full rounded-[14px] bg-copper px-3 py-2 text-sm font-semibold text-white"
                >
                  {item.action}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MessageBubble({ message, onAsk }: { message: Message; onAsk: (prompt: string) => void }) {
  const isUser = message.role === "user";
  return (
    <article className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <Avatar icon="bot" />}
      <div className={`max-w-[88%] rounded-[18px] border px-3 py-2 shadow-sm ${
        isUser ? "border-copper bg-copper text-white" : "border-snow bg-white text-cedar"
      }`}>
        <p className="whitespace-pre-wrap text-sm leading-[22px]">{message.text}</p>
        {message.result && message.text === message.result.response && (
          <div className="mt-4 space-y-3">
            <CompactWorkflow steps={message.result.workflowSteps} activeCount={message.activeSteps} />
            <ResultCards result={message.result} onAsk={onAsk} />
          </div>
        )}
      </div>
      {isUser && <Avatar icon="user" />}
    </article>
  );
}

function Avatar({ icon }: { icon: "bot" | "user" }) {
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[12px] bg-white text-copper ring-1 ring-snow">
      {icon === "bot" ? <Bot size={17} /> : <UserRound size={17} />}
    </div>
  );
}

function IntentAnnotation({ result }: { result?: RouterResult }) {
  if (!result) return null;
  return (
    <aside className="pointer-events-none fixed left-[calc(50%+236px)] top-28 hidden w-56 rounded-[18px] border border-snow bg-white/95 p-3 text-xs text-clay shadow-soft min-[900px]:block">
      <p className="font-semibold text-copper">AI意图标注</p>
      <p className="mt-2 text-cedar">{result.intent}</p>
      <p className="mt-1 text-clay/65">{result.subIntent}</p>
    </aside>
  );
}

function CompactWorkflow({ steps, activeCount }: { steps: string[]; activeCount?: number }) {
  const [open, setOpen] = useState(false);
  const visibleCount = activeCount ?? steps.length;
  const complete = visibleCount >= steps.length;
  return (
    <div className="rounded-[14px] border border-snow bg-linen px-2.5 py-1.5">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="text-xs leading-[18px] text-clay/55">
          {complete ? `AI已完成 ${steps.length} 步思考` : `AI正在处理 ${visibleCount}/${steps.length}`}
        </span>
        <span className="text-[11px] leading-4 text-copper">{open ? "收起" : "查看"}</span>
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {steps.slice(0, visibleCount).map((step, index) => (
            <span key={step} className="rounded-[4px] bg-white px-2 py-1 text-[11px] text-clay/55">
              {index + 1}. {step}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCards({ result, onAsk }: { result: RouterResult; onAsk: (prompt: string) => void }) {
  if (!result.cards.length) return null;
  if (result.intent === "问客户" || result.intent === "切换客户") {
    return <CustomerInsightCard customer={result.cards[0] as unknown as Customer} onAsk={onAsk} />;
  }
  if (result.intent === "报价生成") {
    return <QuoteResultCard card={result.cards[0]} onAsk={onAsk} />;
  }
  if (result.intent === "产品库存查询") {
    return <ProductInventoryCard card={result.cards[0]} onAsk={onAsk} />;
  }
  if (result.intent === "酒店库存查询") {
    return <HotelInventoryCard card={result.cards[0]} onAsk={onAsk} />;
  }
  if (result.intent === "维护记录写入") {
    return <MaintenanceRecordCard card={result.cards[0]} onAsk={onAsk} />;
  }
  if (
    [
      "跟进话术生成",
      "集团线索推送",
      "业绩完成提醒",
      "VIP到店交接",
      "出行风险提醒",
      "PDF生成",
      "话术模板保存",
      "发送客户内容",
      "提醒创建",
      "协同任务",
    ].includes(result.intent)
  ) {
    return <ActionResultCard card={result.cards[0]} onAsk={onAsk} />;
  }
  if (result.intent === "跟进提醒") {
    return (
      <div className="space-y-2">
        {result.cards.map((card) => (
          <div key={String(card.name)} className="rounded-[18px] border border-snow bg-white p-3 text-sm text-clay/80 shadow-sm">
            <div className="flex items-center justify-between">
              <strong className="text-cedar">{String(card.name)}</strong>
              <span className="rounded-full bg-copper/15 px-2 py-1 text-xs text-copper">{String(card.level)}</span>
            </div>
            <p className="mt-2">{String(card.reason)}</p>
            <p className="mt-1 text-copper">{String(card.action)}</p>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {(result.cards as unknown as Product[]).map((product) => (
        <ProductCard key={product.id} product={product} compact />
      ))}
    </div>
  );
}

function MaintenanceRecordCard({ card, onAsk }: { card: Record<string, unknown>; onAsk: (prompt: string) => void }) {
  const risks = card.risks as string[];
  const tags = card.tags as string[];
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="space-y-3 rounded-[18px] border border-snow bg-white p-3 text-sm shadow-sm">
      <div className="rounded-[18px] border border-emerald-100 bg-emerald-50 p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1f8bff] text-lg font-semibold text-white">
            {String(card.customerName).slice(0, 1)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-cedar">{String(card.customerName)}</h3>
            <p className="text-xs text-clay/60">
              {String(card.customerCode)} · {String(card.memberPhone)} · {String(card.memberLevel)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-copper">AI抽取维护表单</p>
          <h3 className="mt-1 text-lg font-semibold text-cedar">请确认后写入客户维护记录</h3>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs ${confirmed ? "bg-sage/12 text-sage" : "bg-copper/15 text-copper"}`}>
          {confirmed ? "已写入" : "待确认"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FormField label="维护日期" required value={String(card.maintenanceDate)} />
        <FormField label="维护行为" required value={String(card.maintenanceBehavior)} />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-cedar">客户反馈 <span className="text-red-500">*</span></p>
        <div className="min-h-24 rounded-[16px] border border-snow bg-linen px-3 py-3 text-sm leading-relaxed text-cedar">
          {String(card.customerFeedback)}
        </div>
      </div>

      <div className="border-t border-dashed border-snow pt-3">
        <p className="mb-3 text-sm font-semibold text-cedar">出行需求信息</p>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="出行时节" value={String(card.travelSeason)} />
          <FormField label="出行组合" value={String(card.travelCombo)} />
          <FormField label="人均预算" value={String(card.perBudget)} />
          <FormField label="出行天数" value={String(card.travelDays)} />
        </div>
        <div className="mt-2">
          <FormField label="出行偏好" value={String(card.travelPreference)} />
        </div>
      </div>

      {risks.length > 0 && (
        <div className="rounded-[16px] bg-copper/10 px-3 py-2">
          <p className="text-xs font-medium text-copper">风险点</p>
          <div className="mt-2 space-y-1">
            {risks.map((risk) => (
              <p key={risk} className="text-xs leading-relaxed text-cedar">{risk}</p>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full bg-sage/12 px-2.5 py-1 text-xs text-sage">{tag}</span>
        ))}
      </div>

      <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-3">
        <p className="mb-3 text-sm font-semibold text-cedar">提醒事项</p>
        <FormField label="提醒日期" required value={String(card.reminderDate)} />
        <div className="mt-2">
          <p className="mb-2 text-xs text-clay/60">提醒事项 <span className="text-red-500">*</span></p>
          <div className="min-h-16 rounded-[14px] border border-amber-200 bg-white px-3 py-2 text-sm leading-relaxed text-cedar">
            {String(card.reminderItem)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setConfirmed(true)}
          className="rounded-[14px] bg-copper px-3 py-2 text-xs font-semibold text-white"
        >
          {confirmed ? "已维护到客户记录" : "确认维护到客户记录"}
        </button>
        <button
          type="button"
          onClick={() => onAsk(`基于这条维护记录，为${String(card.customerName)}生成下一次跟进话术`)}
          className="rounded-[14px] border border-snow px-3 py-2 text-xs font-semibold text-copper"
        >
          生成跟进话术
        </button>
      </div>
    </div>
  );
}

function FormField({ label, value, required = false }: { label: string; value: string; required?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-xs text-clay/60">{label} {required && <span className="text-red-500">*</span>}</p>
      <div className="rounded-[14px] border border-snow bg-linen px-3 py-2 text-sm font-medium text-cedar">
        {value}
      </div>
    </div>
  );
}

function ActionResultCard({ card, onAsk }: { card: Record<string, unknown>; onAsk: (prompt: string) => void }) {
  const type = String(card.type);
  return (
    <div className="space-y-3 rounded-[18px] border border-snow bg-white p-3 text-sm shadow-sm">
      <div>
        <p className="text-xs text-copper">AI动作卡</p>
        <h3 className="mt-1 text-lg font-semibold text-cedar">{String(card.title)}</h3>
      </div>

      {"script" in card && (
      <div className="rounded-[14px] border border-snow bg-linen px-3 py-3 text-sm leading-relaxed text-cedar">
          {String(card.script)}
        </div>
      )}

      {"metrics" in card && (
        <div className="grid grid-cols-2 gap-2">
          {(card.metrics as string[]).map((metric) => (
            <div key={metric} className="rounded-[14px] border border-snow bg-linen px-3 py-2 text-xs font-medium text-cedar">{metric}</div>
          ))}
        </div>
      )}

      {"items" in card && (
        <div className="space-y-2">
          {(card.items as Array<string | Record<string, string>>).map((item, index) => (
            <div key={typeof item === "string" ? item : `${type}-${index}`} className="rounded-[14px] border border-snow bg-linen px-3 py-2 text-xs leading-relaxed text-cedar">
              {typeof item === "string" ? item : (
                <div>
                  <p className="font-semibold">{item.name} · {item.priority}</p>
                  <p className="mt-1 text-clay/70">{item.source}｜{item.intent}</p>
                  <p className="mt-1 text-copper">{item.action}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {"actions" in card && (
        <div className="space-y-2">
          {(card.actions as string[]).map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => onAsk(action)}
              className="w-full rounded-[14px] border border-snow px-3 py-2 text-left text-xs font-semibold text-copper"
            >
              {action}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductInventoryCard({ card, onAsk }: { card: Record<string, unknown>; onAsk: (prompt: string) => void }) {
  const items = card.items as Array<{
    productName: string;
    date: string;
    season: string;
    status: string;
    remaining: number;
    price: string;
    roomSummary: string;
  }>;

  return (
    <div className="space-y-3 rounded-[18px] border border-snow bg-white p-3 text-sm shadow-sm">
      <div>
        <p className="text-xs text-copper">产品团期库存</p>
        <h3 className="mt-1 text-lg font-semibold text-cedar">不同出行日期的团期余位与价格</h3>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={`${item.productName}-${item.date}`} className="rounded-[16px] border border-snow bg-linen px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold leading-snug text-cedar">{item.productName}</p>
                <p className="mt-1 text-xs text-clay/65">{item.date} · {item.season}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${item.remaining > 3 ? "bg-sage/12 text-sage" : item.remaining > 0 ? "bg-copper/15 text-copper" : "bg-red-50 text-red-700"}`}>
                {item.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-[14px] border border-snow bg-white px-3 py-2">
                <p className="text-clay/55">团期库存</p>
                <p className="mt-1 font-semibold text-cedar">{item.remaining > 0 ? `${item.remaining}席` : "候补"}</p>
              </div>
              <div className="rounded-[14px] border border-snow bg-white px-3 py-2">
                <p className="text-clay/55">团期价格</p>
                <p className="mt-1 font-semibold text-cedar">{item.price}</p>
              </div>
            </div>
            <p className="mt-2 rounded-[14px] bg-slate-100 px-3 py-2 text-xs leading-relaxed text-cedar">{item.roomSummary}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onAsk("基于6月18日梅里雪山产品团期生成报价方案")}
        className="w-full rounded-[14px] bg-copper px-3 py-2 text-xs font-semibold text-white"
      >
        用推荐团期生成报价
      </button>
    </div>
  );
}

function HotelInventoryCard({ card, onAsk }: { card: Record<string, unknown>; onAsk: (prompt: string) => void }) {
  const items = card.items as Array<{
    hotelName: string;
    date: string;
    roomType: string;
    status: string;
    remaining: number;
    price: string;
    policy: string;
  }>;

  return (
    <div className="space-y-3 rounded-[18px] border border-snow bg-white p-3 text-sm shadow-sm">
      <div>
        <p className="text-xs text-copper">酒店房型库存</p>
        <h3 className="mt-1 text-lg font-semibold text-cedar">单店单日房型库存与房价</h3>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={`${item.hotelName}-${item.date}-${item.roomType}`} className="rounded-[16px] border border-snow bg-linen px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold leading-snug text-cedar">{item.hotelName}</p>
                <p className="mt-1 text-xs text-clay/65">{item.date} · {item.roomType}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${item.remaining > 3 ? "bg-sage/12 text-sage" : item.remaining > 0 ? "bg-copper/15 text-copper" : "bg-red-50 text-red-700"}`}>
                {item.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-[14px] border border-snow bg-white px-3 py-2">
                <p className="text-clay/55">可售房量</p>
                <p className="mt-1 font-semibold text-cedar">{item.remaining > 0 ? `${item.remaining}间` : "候补"}</p>
              </div>
              <div className="rounded-[14px] border border-snow bg-white px-3 py-2">
                <p className="text-clay/55">房价</p>
                <p className="mt-1 font-semibold text-cedar">{item.price}</p>
              </div>
            </div>
            <p className="mt-2 rounded-[14px] bg-slate-100 px-3 py-2 text-xs leading-relaxed text-cedar">{item.policy}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onAsk("把松赞梅里山居6月18日雪山景观大床房加入报价并生成方案")}
        className="w-full rounded-[14px] bg-copper px-3 py-2 text-xs font-semibold text-white"
      >
        锁定房态并加入报价
      </button>
    </div>
  );
}

function CustomerInsightCard({ customer, onAsk }: { customer: Customer; onAsk: (prompt: string) => void }) {
  return (
    <div className="space-y-3 rounded-[18px] border border-snow bg-white p-3 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-copper">客户作战卡</p>
          <h3 className="mt-1 text-lg font-semibold text-cedar">{customer.name}</h3>
          <p className="text-clay/65">{customer.city} · {customer.family}</p>
          <p className="mt-1 text-xs text-clay/55">
            会员卡号：{customer.memberCardNo} · 会员手机号：{customer.memberPhone}
          </p>
        </div>
        <div className="shrink-0 rounded-[8px] bg-copper/10 px-2.5 py-2 text-right">
          <p className="text-[10px] leading-4 text-clay/55">历史消费</p>
          <p className="whitespace-nowrap text-sm font-medium leading-5 text-copper">￥{customer.gmv}</p>
        </div>
      </div>
      <p className="leading-relaxed text-clay/80">{customer.summary}</p>
      <div className="flex flex-wrap gap-2">
        {customer.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-sage/12 px-2.5 py-1 text-xs text-sage">{tag}</span>
        ))}
      </div>
      <div className="space-y-2">
        {customer.orders.slice(0, 2).map((order) => (
          <div key={order.product} className="rounded-[16px] border border-snow bg-linen px-3 py-2">
            <div className="flex justify-between gap-2 text-xs">
              <strong>{order.year} · {order.product}</strong>
              <span className="text-copper">{order.amount}</span>
            </div>
            <p className="mt-1 text-xs text-clay/55">出行时间：{order.tripDate}</p>
            <p className="mt-1 text-xs text-clay/65">{order.feedback}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onAsk(`为${customer.name}生成一段适合企微发送的跟进话术`)}
          className="rounded-[14px] bg-copper px-3 py-2 text-xs font-semibold text-white"
        >
          生成跟进话术
        </button>
        <button
          type="button"
          onClick={() => onAsk(`帮${customer.name}做一个亲子版本报价`)}
          className="rounded-[14px] border border-snow px-3 py-2 text-xs font-semibold text-copper"
        >
          做亲子报价
        </button>
      </div>
    </div>
  );
}

function QuoteResultCard({ card, onAsk }: { card: Record<string, unknown>; onAsk: (prompt: string) => void }) {
  const product = card.product as Product;
  const days = card.days as string[];
  return (
    <div className="space-y-3 rounded-[18px] border border-snow bg-white p-3 text-sm shadow-sm">
      <div>
        <p className="text-xs text-copper">报价草案</p>
        <h3 className="mt-1 text-lg font-semibold leading-snug text-cedar">{product.name}</h3>
        <p className="mt-1 text-clay/70">预估价格：{String(card.price)} · {product.duration}</p>
      </div>
      <div className="space-y-2">
        {days.map((day, index) => (
          <div key={day} className="flex gap-2 rounded-[16px] border border-snow bg-linen px-3 py-2">
            <span className="text-xs font-semibold text-copper">D{index + 1}</span>
            <span className="text-xs leading-relaxed text-clay/80">{day}</span>
          </div>
        ))}
      </div>
      <p className="rounded-[14px] bg-slate-100 px-3 py-2 text-xs leading-relaxed text-cedar">风险提示：{product.altitudeRisk}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onAsk("把当前报价生成PDF行程单")}
          className="rounded-[14px] bg-copper px-3 py-2 text-xs font-semibold text-white"
        >
          生成PDF
        </button>
        <button
          type="button"
          onClick={() => onAsk("生成一段发送当前报价给客户的企微话术")}
          className="rounded-[14px] border border-snow px-3 py-2 text-xs font-semibold text-copper"
        >
          发给客户
        </button>
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function findCustomerInText(text: string) {
  return mockCustomers.find((customer) => text.includes(customer.name) || text.includes(customer.name.replace(/先生|女士|总/g, "")));
}
