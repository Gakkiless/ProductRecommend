import { followUpCustomers } from "../data/mockCustomers";
import { mockCustomers } from "../data/mockCustomers";
import { hotelInventories, productDepartures } from "../data/mockInventory";
import { mockProducts } from "../data/mockProducts";
import type { Customer, RouterResult } from "../types";

const apiPlaceholders = {
  chat: "/api/ai/chat",
  customer: "/api/crm/customer",
  products: "/api/products/search",
  quote: "/api/quote/generate",
  wecom: "/api/wecom/context",
};

export function getApiPlaceholders() {
  return apiPlaceholders;
}

function includesAny(input: string, words: string[]) {
  return words.some((word) => input.includes(word));
}

function extractEntities(input: string): Record<string, string | number | boolean | string[]> {
  const budgetMatch = input.match(/(\d+)\s*万/);
  return {
    出行人群: includesAny(input, ["父母", "孩子", "亲子", "家庭"]) ? "家庭" : "未明确",
    老人: includesAny(input, ["父母", "老人", "银发"]),
    孩子: includesAny(input, ["孩子", "亲子", "儿童"]),
    预算: budgetMatch ? Number(budgetMatch[1]) * 10000 : "未明确",
    偏好: [
      includesAny(input, ["不累", "轻松", "慢"]) ? "慢节奏" : "",
      input.includes("舒适") ? "舒适" : "",
      input.includes("怕高反") ? "怕高反" : "",
    ].filter(Boolean),
    时间: includesAny(input, ["暑期", "7月", "8月"]) ? "暑期" : input.includes("6月") ? "6月" : "未明确",
    库存类型: includesAny(input, ["酒店", "房型", "房间", "山居", "林卡", "房价"]) ? "酒店库存" : input.includes("库存") ? "产品团期库存" : "未明确",
  };
}

function buildMaintenanceRecord(input: string, currentCustomer: Customer) {
  const wantsMeili = includesAny(input, ["梅里", "雪山", "日照金山"]);
  const wantsFamily = includesAny(input, ["孩子", "亲子", "父母", "老人", "家庭"]);
  const hasAltitudeConcern = includesAny(input, ["高反", "海拔", "怕累", "不累"]);
  const budgetMatch = input.match(/(\d+)\s*万/);
  const nextFollowUp = input.match(/(明天|后天|周[一二三四五六日天]|下周|三天内|3天内)/)?.[1] ?? "3天内";

  return {
    type: "maintenanceRecord",
    customerName: currentCustomer.name,
    customerCode: currentCustomer.memberCardNo,
    memberPhone: currentCustomer.memberPhone,
    memberLevel: currentCustomer.memberLevel,
    recordType: "客户维护",
    maintenanceDate: "2026/05/07",
    maintenanceBehavior: input.includes("电话") ? "电话沟通" : "微信沟通",
    sourceText: input,
    customerFeedback: input.replace(/^记录[:：]?|^维护记录[:：]?/, "").trim(),
    summary: input.replace(/^记录[:：]?|^维护记录[:：]?/, "").trim(),
    intention: wantsMeili ? "梅里雪山 / 香格里拉方向意向" : wantsFamily ? "亲子家庭旅行意向" : "藏地高端定制咨询",
    travelSeason: includesAny(input, ["暑期", "7月", "8月"]) ? "暑期" : input.includes("6月") ? "6月" : input.includes("国庆") ? "国庆" : "待确认",
    travelCombo: wantsFamily ? "亲子 / 家庭" : input.includes("夫妻") ? "夫妻" : "待确认",
    perBudget: budgetMatch ? `${budgetMatch[1]}万左右` : "待确认",
    travelDays: input.match(/(\d+)\s*天/)?.[0] ?? "待确认",
    travelPreference: [
      wantsMeili ? "梅里雪山" : "",
      wantsFamily ? "亲子体验" : "",
      hasAltitudeConcern ? "轻松低强度" : "",
    ].filter(Boolean).join("、") || "待确认",
    risks: [
      hasAltitudeConcern ? "需说明高反与海拔适应" : "",
      wantsFamily ? "老人/孩子同行，避免高强度徒步和连续长车程" : "",
      input.includes("犹豫") || input.includes("考虑") ? "客户仍在比较，需要补充信任材料" : "",
    ].filter(Boolean),
    nextAction: wantsMeili
      ? "发送梅里雪山轻奢慢行方案与酒店景观内容"
      : wantsFamily
        ? "补充亲子自然教育活动和轻松节奏报价"
        : "补充产品亮点、房态和初版报价",
    nextFollowUp,
    reminderDate: nextFollowUp,
    reminderItem: wantsMeili ? "发送梅里轻松方案并确认客户对高反的顾虑" : "确认客户是否预定，并跟进报价反馈",
    tags: [
      wantsFamily ? "亲子/家庭" : "",
      wantsMeili ? "梅里意向" : "",
      hasAltitudeConcern ? "怕高反" : "",
      budgetMatch ? "预算明确" : "",
      "需跟进",
    ].filter(Boolean),
  };
}

export function classifyIntent(input: string, currentCustomer: Customer = mockCustomers[0]): RouterResult {
  const normalized = input.trim();
  const entities = extractEntities(normalized);

  if (
    includesAny(normalized, ["维护记录", "跟进记录", "记录一下", "记一下", "写入记录"]) ||
    (includesAny(normalized, ["今天", "刚刚", "电话", "微信", "聊了", "沟通"]) && includesAny(normalized, ["客户", "她", "他", currentCustomer.name]))
  ) {
    const record = buildMaintenanceRecord(normalized, currentCustomer);
    return {
      intent: "维护记录写入",
      subIntent: "自然语言转维护表单",
      entities: {
        客户: currentCustomer.name,
        维护日期: record.maintenanceDate,
        维护行为: record.maintenanceBehavior,
        出行时节: record.travelSeason,
        出行组合: record.travelCombo,
        人均预算: record.perBudget,
        出行天数: record.travelDays,
        出行偏好: record.travelPreference,
        提醒日期: record.reminderDate,
      },
      response:
        `我已从自然语言中抽取出${currentCustomer.name}的维护记录草稿。请确认维护日期、维护行为、客户反馈、出行需求和提醒事项，确认后写入该客户的维护记录。`,
      workflowSteps: ["识别维护记录", "抽取客户反馈", "抽取出行需求信息", "生成提醒事项", "等待销售确认写入"],
      cards: [record],
    };
  }

  if (includesAny(normalized, ["跟进话术", "企微发送", "下一次跟进话术"])) {
    return {
      intent: "跟进话术生成",
      subIntent: "企微客户维护话术",
      entities: { 客户: currentCustomer.name, 渠道: "企业微信", 目标: "推进下一步沟通" },
      response:
        `我已为${currentCustomer.name}生成一段适合企微发送的跟进话术，语气保持克制、私人化，不直接强推产品。`,
      workflowSteps: ["读取当前客户画像", "结合最近维护记录", "选择沟通语气", "生成企微话术", "等待销售编辑发送"],
      cards: [
        {
          type: "script",
          title: `${currentCustomer.name}跟进话术`,
          script:
            `${currentCustomer.name}您好，今天想和您同步一下梅里方向更轻松的安排思路。考虑到您比较关注舒适度和高原适应，我们会优先把车程拆得更松，并选择松赞酒店连住，减少频繁移动。若您方便，我可以先发一版亲子/家庭友好的轻松方案，您看完后我们再根据家人状态微调。`,
          nextActions: ["发送给客户", "保存为话术模板", "3天后提醒跟进"],
        },
      ],
    };
  }

  if (includesAny(normalized, ["生成PDF", "PDF行程单", "报价生成PDF"])) {
    return {
      intent: "PDF生成",
      subIntent: "报价单/行程单PDF",
      entities: { 输出类型: "PDF", 内容: ["行程", "酒店", "价格", "风险提示"], 品牌风格: "松赞克制东方美学" },
      response:
        "我已根据当前报价生成PDF行程单草稿，内容包含每日安排、酒店资源、活动说明、车辆管家、价格说明和高原风险提示。",
      workflowSteps: ["读取报价草案", "生成行程说明", "套用松赞品牌模板", "生成PDF预览", "等待销售发送"],
      cards: [
        {
          type: "pdf",
          title: "PDF行程单草稿",
          items: ["封面：香格里拉 - 梅里雪山 6天5晚", "每日行程与酒店图文", "价格说明与退改政策", "高反与路况风险提示"],
          actions: ["发送给客户", "返回修改报价", "保存到客户档案"],
        },
      ],
    };
  }

  if (includesAny(normalized, ["保存为话术模板", "保存模板"])) {
    return {
      intent: "话术模板保存",
      subIntent: "销售经验沉淀",
      entities: { 模板类型: "客户维护话术", 适用客群: currentCustomer.tags.slice(0, 3) },
      response:
        "已把这段话术保存为可复用模板，并关联到当前客户标签。后续遇到类似亲子、怕高反、慢节奏客户时可以优先调用。",
      workflowSteps: ["提取话术主题", "关联客户标签", "保存到销售SOP", "开放团队复用"],
      cards: [{ type: "template", title: "已保存话术模板", items: ["适用：亲子家庭", "适用：怕高反客户", "语气：克制、私人化、非强推"] }],
    };
  }

  if (includesAny(normalized, ["发送给客户", "发送当前报价", "发送客户"])) {
    return {
      intent: "发送客户内容",
      subIntent: "企微发送前确认",
      entities: { 渠道: "企业微信", 客户: currentCustomer.name, 内容类型: normalized.includes("报价") ? "报价" : "销售内容" },
      response:
        `我已生成发送给${currentCustomer.name}的企微文案。发送前建议销售再确认称呼、日期和价格口径。`,
      workflowSteps: ["读取发送内容", "生成企微文案", "检查敏感价格口径", "等待销售确认发送"],
      cards: [
        {
          type: "send",
          title: "企微发送文案",
          script:
            `${currentCustomer.name}您好，我把刚才提到的松赞梅里轻松方案整理好了。整体会优先考虑舒适度、酒店体验和高原适应，价格与房态也放在方案里，您可以先看方向是否符合家人的节奏。`,
          actions: ["确认发送", "改得更简短", "创建发送后跟进提醒"],
        },
      ],
    };
  }

  if (includesAny(normalized, ["创建提醒", "3天后提醒", "发送后跟进提醒", "创建出行前提醒"])) {
    return {
      intent: "提醒创建",
      subIntent: "客户跟进提醒",
      entities: { 客户: currentCustomer.name, 提醒时间: normalized.includes("3天") ? "3天后" : "出行前", 提醒事项: normalized },
      response:
        `已为${currentCustomer.name}创建提醒草稿，提醒事项会进入客户维护队列，并在提醒中心展示。`,
      workflowSteps: ["识别提醒时间", "生成提醒事项", "绑定当前客户", "写入提醒队列"],
      cards: [{ type: "reminder", title: "提醒创建成功", items: [`客户：${currentCustomer.name}`, `时间：${normalized.includes("3天") ? "3天后" : "出行前"}`, "事项：跟进客户反馈并确认是否推进报价"] }],
    };
  }

  if (includesAny(normalized, ["同步司导", "同步管家", "确认发送"])) {
    return {
      intent: "协同任务",
      subIntent: "内部协同确认",
      entities: { 协同对象: normalized.includes("司导") ? "司导" : "管家/销售", 客户: currentCustomer.name },
      response:
        "已生成内部协同任务草稿。真实系统中会同步到企业微信待办或对应服务群，这里先用卡片展示任务内容。",
      workflowSteps: ["识别协同对象", "生成任务内容", "绑定客户和订单", "推送企业微信待办"],
      cards: [{ type: "task", title: "内部协同任务", items: ["同步客户偏好", "确认服务风险", "反馈处理进展"] }],
    };
  }

  if (includesAny(normalized, ["集团线索", "新线索", "首触"])) {
    return {
      intent: "集团线索推送",
      subIntent: "高净值线索首触",
      entities: { 线索数量: 2, 来源: ["会员活动报名", "梅里雪山定制咨询"], SLA: "15分钟内首触" },
      response:
        "集团推送了2条高净值新线索，我已按来源、意向和首触优先级整理。建议先触达梅里雪山定制咨询线索，再处理会员活动报名线索。",
      workflowSteps: ["接收集团线索", "识别来源和意向", "匹配销售动作", "生成首触话术", "创建跟进任务"],
      cards: [
        {
          type: "lead",
          title: "集团高净值线索",
          items: [
            { name: "刘女士", source: "梅里雪山定制咨询", intent: "6月雪山景观与高端酒店", priority: "高", action: "15分钟内首触" },
            { name: "赵先生", source: "会员活动报名", intent: "企业家小团 / 文化体验", priority: "中高", action: "今天内完成首次沟通" },
          ],
        },
      ],
    };
  }

  if (includesAny(normalized, ["业绩", "完成率", "冲刺清单", "月目标"])) {
    return {
      intent: "业绩完成提醒",
      subIntent: "销售目标差距与冲刺动作",
      entities: { 本月成交: "¥386,000", 完成率: "72%", 目标差额: "¥150,000", 高潜客户: 8 },
      response:
        "本月业绩完成率为72%，距离目标还差约¥150,000。建议优先推进已咨询未报价客户、复购VIP和集团新线索，避免把时间放在低意向泛咨询上。",
      workflowSteps: ["读取销售业绩", "计算目标差额", "识别高潜客户", "拆解本周动作", "生成冲刺清单"],
      cards: [
        {
          type: "performance",
          title: "本周业绩冲刺清单",
          metrics: ["本月成交 ¥386,000", "完成率 72%", "差额 ¥150,000", "高潜客户 8人"],
          actions: ["今天补齐陈先生国庆滇藏报价", "48小时内跟进王女士暑期亲子方案", "优先首触集团推送的梅里定制线索"],
        },
      ],
    };
  }

  if (includesAny(normalized, ["管家交接", "交接要点", "到店"])) {
    return {
      intent: "VIP到店交接",
      subIntent: "管家服务交接",
      entities: { 客户等级: "金刚", 到店酒店: "松赞梅里山居", 服务重点: ["欢迎卡", "晚餐偏好", "观景时间"] },
      response:
        "我已整理VIP到店管家交接要点，重点是偏好同步、抵达体验和次日活动节奏，避免客户重复表达需求。",
      workflowSteps: ["读取VIP到店提醒", "汇总客户偏好", "生成管家交接项", "同步服务风险", "等待销售确认转交"],
      cards: [
        {
          type: "handoff",
          title: "管家交接要点",
          items: ["准备手写欢迎卡和房间水果", "晚餐偏清淡，提前确认忌口", "次日如天气允许优先安排日照金山观景", "提醒管家主动说明高海拔睡眠和饮水建议"],
        },
      ],
    };
  }

  if (includesAny(normalized, ["风险提醒", "降雪", "路况", "高反准备"])) {
    return {
      intent: "出行风险提醒",
      subIntent: "梅里天气与高原风险",
      entities: { 区域: "梅里方向", 风险: ["降雪概率", "路况延迟", "高反适应"], 建议: "提前告知客户" },
      response:
        "梅里方向未来3天存在降雪和路况延迟风险。建议提前给客户发送克制、专业的风险提示，并提供备选安排，降低临行焦虑。",
      workflowSteps: ["读取天气/路况Mock", "识别受影响客户", "生成风险说明", "给出备选安排", "创建提醒"],
      cards: [
        {
          type: "risk",
          title: "梅里出行风险提示",
          script:
            "您好，想提前和您同步一下梅里方向近几天可能有降雪，山区路况存在一定不确定性。我们会持续关注天气和道路情况，并预留更稳妥的时间安排。如果当天不适合长距离移动，会优先保证酒店体验和轻量文化活动。",
          actions: ["发送客户", "同步司导", "创建出行前提醒"],
        },
      ],
    };
  }

  if (includesAny(normalized, ["报价", "PDF", "方案", "行程单"])) {
    return {
      intent: "报价生成",
      subIntent: includesAny(normalized, ["亲子", "孩子", "暑期"]) ? "暑期亲子报价" : "定制报价",
      entities,
      response:
        "我会先按客户类型、时间、人数、预算和节奏生成一个可调整的报价草案。当前更适合从香格里拉亲子自然探索或梅里轻奢慢行线开始，再根据库存和活动资源组合每日安排。",
      workflowSteps: ["AI识别客户需求", "查询酒店库存", "匹配松赞车队", "匹配在地活动", "生成每日行程", "生成报价单"],
      cards: [
        {
          type: "quote",
          product: mockProducts[0],
          price: "¥78,000 - ¥96,000",
          days: ["香格里拉抵达与高原适应", "纳帕海自然观察与亲子活动", "奔子栏峡谷慢行", "梅里雪山日照金山", "藏文化体验与轻徒步", "返回香格里拉"],
        },
      ],
    };
  }

  if (includesAny(normalized, ["提醒", "跟进", "哪些客户", "维护", "话术", "首触", "冲刺清单", "交接要点"])) {
    return {
      intent: "跟进提醒",
      subIntent: "高价值客户维护",
      entities,
      response:
        "今天建议优先维护三类客户：长期未联系但有季节性出行规律的VIP、近期浏览梅里或亲子产品的高潜客户、以及已经咨询但还未收到报价的客户。",
      workflowSteps: ["读取企微客户上下文", "查询CRM维护记录", "计算复购和转化信号", "生成跟进优先级", "输出销售动作"],
      cards: followUpCustomers,
    };
  }

  if (includesAny(normalized, ["推荐", "适合", "怕高反", "带孩子", "带父母"])) {
    return {
      intent: "产品推荐",
      subIntent: includesAny(normalized, ["父母", "孩子", "不累", "慢"]) ? "家庭慢节奏高端线路" : "产品适配推荐",
      entities: {
        ...entities,
        风险: includesAny(normalized, ["父母", "孩子", "怕高反"])
          ? "老人和孩子不适合高强度高海拔长线"
          : "需结合客户体力和高原经验确认",
      },
      response:
        `${currentCustomer.name}当前需求下，优先推荐「香格里拉 - 梅里轻奢慢行线」。如果客户带老人和孩子，或明确不想太累，不建议直接推荐雨崩徒步或长距离滇藏深度线，应优先保证酒店舒适度、车程节奏和海拔适应。`,
      workflowSteps: ["识别家庭结构与预算", "读取客户标签", "过滤高强度线路", "匹配松赞酒店与在地活动", "生成推荐理由"],
      cards: [mockProducts[0]],
    };
  }

  if (includesAny(normalized, ["客户", "会员", "标签", "历史"])) {
    return {
      intent: "问客户",
      subIntent: "客户画像与历史订单",
      entities,
      response:
        `${currentCustomer.name}是${currentCustomer.memberLevel}会员，历史消费金额￥${currentCustomer.gmv}。${currentCustomer.summary}`,
      workflowSteps: ["读取当前会话客户", "查询CRM画像", "汇总历史订单", "分析聊天关注点", "输出下一步动作"],
      cards: [{ type: "customer", ...currentCustomer }],
    };
  }

  if (includesAny(normalized, ["库存", "价格", "酒店", "行程", "退改", "政策"])) {
    if (includesAny(normalized, ["酒店", "房型", "房间", "山居", "林卡", "房价"])) {
      return {
        intent: "酒店库存查询",
        subIntent: "单店单日房型库存与价格",
        entities: {
          ...entities,
          酒店: normalized.includes("香格里拉") ? "松赞香格里拉林卡" : normalized.includes("林芝") ? "松赞林芝林卡" : "松赞梅里山居",
          房型: normalized.includes("亲子") ? "亲子套房" : normalized.includes("双床") ? "庭院双床房" : "雪山景观大床房",
        },
        response:
          "我按酒店库存逻辑查询：需要锁定某家酒店、入住日期和房型，再返回可售间夜、价格和退改政策。下面是当前Mock房态，适合销售在报价前快速判断能否锁房。",
        workflowSteps: ["识别酒店/日期/房型", "查询酒店房态", "读取房价和退改政策", "判断是否建议锁房", "输出销售提醒"],
        cards: [{ type: "hotelInventory", items: hotelInventories }],
      };
    }

    if (normalized.includes("库存")) {
      return {
        intent: "产品库存查询",
        subIntent: "产品团期库存与价格",
        entities: {
          ...entities,
          产品: normalized.includes("亲子") ? "香格里拉亲子自然探索" : normalized.includes("滇藏") ? "滇藏线高端定制" : "香格里拉 - 梅里雪山",
        },
        response:
          "我按产品库存逻辑查询：同一产品在不同出行日期会对应不同团期，团期库存、价格和关键酒店房态会变化。下面列出可售团期和价格，方便你直接判断推荐哪个日期。",
        workflowSteps: ["识别产品和出行时间", "查询产品团期", "读取团期余位", "同步关键酒店房态", "输出价格和销售建议"],
        cards: [{ type: "productInventory", items: productDepartures }],
      };
    }

    return {
      intent: "问产品",
      subIntent: normalized.includes("库存") ? "酒店与线路库存" : "产品知识查询",
      entities,
      response:
        "6月梅里方向仍有少量高价值房态可组合，建议优先锁定松赞梅里山居景观房，并避开端午前后紧张日期。若客户带老人孩子，可把车程拆得更松，减少连续移动。",
      workflowSteps: ["解析产品问题", "查询产品知识库", "查询酒店库存", "校验退改与政策", "生成销售可用答复"],
      cards: [mockProducts[0]],
    };
  }

  return {
    intent: "智能问答",
    subIntent: "销售咨询",
    entities,
    response: "我可以帮你问产品、看客户画像、做推荐、生成报价或安排跟进。请直接描述客户情况或要查询的线路。",
    workflowSteps: ["理解问题", "选择业务Agent", "读取Mock数据", "生成答复"],
    cards: [],
  };
}
