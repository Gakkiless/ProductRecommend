import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleDot,
  ListChecks,
  Lock,
  Mic,
  Plus,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button, Card, DatePicker, Picker, Popup, Selector, Tabs, Tag, TextArea, Toast } from "antd-mobile";
import type { PickerValue } from "antd-mobile/es/components/picker";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { mockProducts } from "../data/mockProducts";
import type { Customer, Product } from "../types";

type StageKey = "pre" | "during" | "confirm" | "follow";
type FollowPlan = { time: Date | null; method: string; content: string };
type PredictionDimension = {
  key: string;
  title: string;
  summary: string;
  options: Array<{ label: string; value: string }>;
};
type TagDictionaryDimension = {
  key: string;
  title: string;
  summary: string;
  options: string[];
};
type TagChange = {
  dimension: string;
  from: string[];
  to: string[];
};
type ProductConversionOrder = {
  orderTime: Date;
  orderId: string;
  productName: string;
  orderType: string;
  productTags: string[];
  amount: string;
};
type CommunicationMapAnswers = Record<string, string>;
type CustomerCommunicationStatus = "关系维护型" | "需求培育型" | "成交推进型";
type CommunicationQuestionNode = {
  key: string;
  title: string;
  questions: string[];
};
type CommunicationPurpose = {
  key: string;
  label: string;
  hint: string;
  getScript: (customer: Customer, tags: string[]) => string;
};

type SalesJourneyFlowProps = {
  customer: Customer;
  onClose: () => void;
};

const stageItems: Array<{ key: StageKey; title: string }> = [
  { key: "pre", title: "沟通前" },
  { key: "during", title: "沟通中" },
  { key: "confirm", title: "需求确认" },
  { key: "follow", title: "跟进管理" },
];

const preActivities = [
  { time: "2026-05-18 14:00", title: "松赞影像展上海站", detail: "上海 · 西岸艺术中心下午场" },
  { time: "2025-11-22 19:30", title: "梅里雪山摄影分享会", detail: "上海 · 静安会员中心晚场" },
  { time: "2025-08-10 15:00", title: "亲子自然教育沙龙", detail: "杭州 · 良渚文化艺术中心周末场" },
];

const tagDictionaryDimensions: TagDictionaryDimension[] = [
  {
    key: "emotion",
    title: "A. 情感需求",
    summary: "判断这次旅行背后的关系和情绪动机",
    options: ["逃离与疗愈", "亲子陪伴与成长", "探索与成长", "仪式与纪念", "亲友高质量陪伴", "社交与联结", "被照顾", "专属尊享"],
  },
  {
    key: "timing",
    title: "B. 旅行节点",
    summary: "结合自然月、节假日和主题季节判断客户出行窗口",
    options: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月", "春节", "五一", "端午", "中秋", "国庆", "寒假", "暑假", "萨嘎达瓦", "桃花节", "杜鹃季", "彩林季", "雪山季"],
  },
  {
    key: "companions",
    title: "C. 出行组合（单选）",
    summary: "根据家庭结构、同行记录和咨询内容预判",
    options: ["自己", "夫妻/情侣", "带朋友", "带孩子", "带父母", "家庭出行", "银发族", "企业/团建"],
  },
  {
    key: "budget",
    title: "D. 预算",
    summary: "由历史消费、会员等级和咨询价格敏感度预判",
    options: ["1-2万/人", "2-3万/人", "3万+/人", "无明确预算"],
  },
  {
    key: "days",
    title: "E. 出行天数",
    summary: "由过往出行天数和假期窗口预判",
    options: ["4晚及以内", "5-7晚", "8-11晚", "12晚以上"],
  },
  {
    key: "preference",
    title: "F. 出行偏好",
    summary: "从浏览、反馈和历史评价里提取偏好",
    options: ["亲子研学", "亲子度假", "度假休闲", "疗愈", "银发出行/低海拔", "自然博物", "深度文化体验", "美食美酒/寻找珍贵风物", "高原花季", "自然景观", "深度户外", "轻户外", "摄影爱好", "马背上的松赞", "低空旅行"],
  },
  {
    key: "destination",
    title: "G. 意向目的地",
    summary: "把历史目的地、浏览方向和咨询意向转为目的地标签",
    options: ["滇西北", "亚丁", "怒江", "拉萨", "藏东", "昆明", "普洱", "滇藏线"],
  },
  {
    key: "altitude",
    title: "H. 高原经验（单选）",
    summary: "提前标出客户对高原的经验和心理顾虑",
    options: ["无高原经验", "有高原经验", "高反恐惧"],
  },
];

const predictionDimensions: PredictionDimension[] = tagDictionaryDimensions.map((dimension) => ({
  ...dimension,
  options: dimension.options.map((option) => ({ label: option, value: option })),
}));

const requiredPredictionDimensionKeys = ["emotion", "timing", "companions", "preference"];

const tagGroups: Record<string, string[]> = {
  情感需求: ["逃离与疗愈", "亲子陪伴与成长", "探索与成长", "仪式与纪念", "亲友高质量陪伴", "社交与联结", "被照顾", "专属尊享", "放松疗愈", "亲子陪伴", "纪念日", "待探测", "放松度假", "高客单"],
  旅行时间: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月", "春节", "五一", "端午", "中秋", "国庆", "寒假", "暑假", "萨嘎达瓦", "桃花节", "杜鹃季", "彩林季", "雪山季", "暑期", "寒假春节", "十一假期", "春秋错峰", "时间未定", "咨询暑期", "时间敏感"],
  出行人员: ["自己", "夫妻/情侣", "带朋友", "带孩子", "带父母", "家庭出行", "银发族", "企业/团建", "独自出行", "独行", "夫妻同行", "亲子家庭", "亲子", "三代同游", "带老人", "朋友结伴", "朋友同行", "企业小团", "企业家"],
  预算: ["1-2万/人", "2-3万/人", "3万+/人", "无明确预算", "1-2万", "2-3万", "3-5万", "5万以上", "预算待确认", "预算明确"],
  天数: ["4晚及以内", "5-7晚", "8-11晚", "12晚以上", "3-4天", "5-6天", "7-8天", "9天以上", "天数待确认"],
  出行偏好: ["亲子研学", "亲子度假", "度假休闲", "疗愈", "银发出行/低海拔", "自然博物", "深度文化体验", "美食美酒/寻找珍贵风物", "高原花季", "自然景观", "深度户外", "轻户外", "摄影爱好", "马背上的松赞", "低空旅行", "慢节奏", "酒店偏好", "雪山景观", "藏文化", "深度文化", "自然教育", "轻徒步", "摄影户外", "深度体验"],
  目的地: ["滇西北", "亚丁", "怒江", "拉萨", "藏东", "昆明", "普洱", "滇藏线", "香格里拉", "梅里雪山", "林芝波密", "目的地待确认", "近期浏览梅里"],
  高原风险: ["无高原经验", "有高原经验", "高反恐惧", "怕高反", "带老人", "低龄儿童", "不接受长车程", "首次高原", "高原经验", "需要教育", "可接受长车程", "不想换酒店"],
  行为信号: ["复购潜力", "等待报价", "高转化", "等待方案", "家庭决策"],
};

const communicationMethods = ["企业微信", "电话沟通", "线下面谈", "到店沟通", "会员活动", "家庭群沟通", "其他"];

const followMethods = ["企业微信", "电话回访", "线下面谈", "发送方案", "会员活动邀约", "管家协同"];

const profileToDemandRules: Array<{ sources: string[]; demands: string[] }> = [
  { sources: ["高净值家庭", "亲子", "孩子", "三代", "父母"], demands: ["亲子陪伴", "亲子家庭", "三代同游", "自然教育", "慢节奏"] },
  { sources: ["怕高反", "老人", "不宜推荐高强度徒步", "不宜连续长车程"], demands: ["怕高反", "带老人", "酒店偏好", "不接受长车程"] },
  { sources: ["暑期", "寒假", "春节", "十一", "长假"], demands: ["暑期", "寒假春节", "十一假期", "5-6天"] },
  { sources: ["香格里拉", "梅里", "雪山"], demands: ["香格里拉", "梅里雪山", "雪山景观"] },
  { sources: ["酒店", "慢节奏", "舒适"], demands: ["放松疗愈", "慢节奏", "酒店偏好"] },
  { sources: ["高净值企业家", "私密", "定制", "司导", "企业家"], demands: ["专属尊享", "企业小团", "私密定制", "深度文化", "5万以上"] },
  { sources: ["深度文化", "藏文化", "文化"], demands: ["文化向往", "深度文化", "复购深化"] },
  { sources: ["摄影", "景观", "户外", "轻度"], demands: ["摄影户外", "轻徒步", "雪山景观", "朋友结伴"] },
  { sources: ["等待报价", "高转化", "时间敏感"], demands: ["预算明确", "时间敏感", "高转化"] },
  { sources: ["可接受长线", "滇藏", "长线"], demands: ["滇藏线", "可接受长车程", "9天以上"] },
];

const demandToProductRules: Record<string, string[]> = {
  逃离与疗愈: ["放松疗愈", "慢节奏", "酒店偏好"],
  亲子陪伴与成长: ["亲子陪伴", "亲子家庭", "自然教育"],
  探索与成长: ["探索成长", "轻徒步", "深度文化"],
  仪式与纪念: ["夫妻同行", "私密定制", "专属尊享"],
  亲友高质量陪伴: ["三代同游", "亲子家庭", "慢节奏"],
  被照顾: ["酒店偏好", "酒店连住", "慢节奏"],
  放松疗愈: ["放松疗愈", "慢节奏", "酒店偏好"],
  亲子陪伴: ["亲子陪伴", "亲子家庭", "自然教育"],
  纪念日: ["夫妻同行", "私密定制", "专属尊享"],
  专属尊享: ["私密定制", "5万以上", "复购深化"],
  探索成长: ["探索成长", "轻徒步", "深度文化"],
  春节: ["节假日", "寒暑假"],
  寒假: ["节假日", "寒暑假"],
  暑假: ["暑期", "亲子陪伴", "自然教育"],
  国庆: ["节假日", "滇藏线"],
  桃花节: ["林芝波密", "摄影户外", "自然教育"],
  杜鹃季: ["香格里拉", "摄影户外", "自然教育"],
  彩林季: ["摄影户外", "深度文化"],
  雪山季: ["梅里雪山", "雪山景观"],
  暑期: ["暑期", "亲子陪伴", "自然教育"],
  寒假春节: ["节假日", "寒暑假"],
  十一假期: ["节假日", "滇藏线"],
  春秋错峰: ["摄影户外", "深度文化"],
  自己: ["放松疗愈", "慢节奏"],
  "夫妻/情侣": ["夫妻同行", "私密定制"],
  带朋友: ["朋友结伴", "轻徒步"],
  带孩子: ["亲子家庭", "亲子陪伴", "自然教育"],
  带父母: ["三代同游", "带老人", "慢节奏"],
  家庭出行: ["亲子家庭", "三代同游"],
  银发族: ["带老人", "慢节奏", "酒店偏好"],
  "企业/团建": ["企业小团", "私密定制"],
  亲子家庭: ["亲子家庭", "低龄儿童友好"],
  三代同游: ["三代同游", "慢节奏", "怕高反可控"],
  企业小团: ["企业小团", "私密定制"],
  "1-2万/人": ["1-2万"],
  "2-3万/人": ["2-3万"],
  "3万+/人": ["3-5万", "5万以上"],
  "4晚及以内": ["3-4天"],
  "5-7晚": ["5-6天", "7-8天"],
  "8-11晚": ["9天以上"],
  "12晚以上": ["9天以上"],
  亲子研学: ["亲子陪伴", "亲子家庭", "自然教育"],
  亲子度假: ["亲子陪伴", "亲子家庭", "慢节奏"],
  度假休闲: ["放松疗愈", "慢节奏", "酒店偏好"],
  疗愈: ["放松疗愈", "慢节奏"],
  "银发出行/低海拔": ["带老人", "怕高反可控", "慢节奏"],
  自然博物: ["自然教育", "深度文化"],
  深度文化体验: ["深度文化", "文化向往"],
  "美食美酒/寻找珍贵风物": ["深度文化", "私密定制"],
  高原花季: ["摄影户外", "自然教育"],
  自然景观: ["雪山景观", "自然教育"],
  深度户外: ["探索成长", "轻徒步", "高原经验"],
  轻户外: ["轻徒步", "雪山景观"],
  摄影爱好: ["摄影户外", "雪山景观"],
  酒店偏好: ["酒店偏好", "酒店连住"],
  深度文化: ["深度文化", "文化向往"],
  滇西北: ["香格里拉", "梅里雪山", "雪山景观"],
  怒江: ["滇藏线", "深度文化"],
  拉萨: ["滇藏线", "深度文化"],
  藏东: ["滇藏线", "深度文化"],
  昆明: ["慢节奏", "酒店偏好"],
  普洱: ["慢节奏", "深度文化"],
  梅里雪山: ["梅里雪山", "雪山景观"],
  无高原经验: ["首次高原", "怕高反可控", "慢节奏"],
  有高原经验: ["高原经验", "轻徒步"],
  高反恐惧: ["怕高反", "怕高反可控", "酒店连住"],
  怕高反: ["怕高反可控", "酒店连住", "慢节奏"],
  带老人: ["慢节奏", "酒店偏好", "怕高反可控"],
  低龄儿童: ["低龄儿童友好", "亲子家庭"],
};

const communicationPurposes: CommunicationPurpose[] = [
  {
    key: "referral",
    label: "转介绍客户",
    hint: "借推荐人建立信任，再轻问近期旅行想法",
    getScript: (customer) =>
      `${customer.name}您好，我是松赞旅行顾问，收到朋友的推荐，想先和您简单认识一下。听说您近期可能在考虑旅行，我想先了解下您的想法。`,
  },
  {
    key: "repeat",
    label: "老客回访",
    hint: "先回到上次体验，再自然打开新需求",
    getScript: (customer) =>
      `${customer.name}您好，还记得您之前在松赞的旅程，不知道那段旅行体验怎么样？最近有没有计划再出门走走？`,
  },
  {
    key: "family",
    label: "亲子家庭客",
    hint: "围绕寒暑假和家庭陪伴切入",
    getScript: (customer) =>
      `${customer.name}您好，眼看假期快到了，很多家庭都在提前安排亲子出行，不知道您有没有打算带家人出去放松一下？`,
  },
  {
    key: "holiday",
    label: "节假日定向回访",
    hint: "用假期窗口触发计划讨论",
    getScript: (customer) =>
      `${customer.name}您好，马上就到假期了，难得有一段完整时间，您和家人有没有想好去哪里走走？`,
  },
  {
    key: "gift",
    label: "礼品回访",
    hint: "借礼品问候降低销售感",
    getScript: (customer) =>
      `${customer.name}您好，之前给您寄送的小礼物收到了吗？借这个机会也问候一下，最近生活工作还顺利吗，有没有出行计划？`,
  },
  {
    key: "preference",
    label: "偏好定向切入",
    hint: "根据客户标签选择户外、人文或纪念日内容",
    getScript: (customer, tags) => {
      const preference = tags.includes("摄影户外") || tags.includes("轻徒步")
        ? "户外和景观"
        : tags.includes("深度文化") || tags.includes("文化向往")
          ? "人文体验"
          : tags.includes("纪念日")
            ? "纪念日旅行"
            : "您之前关注过的旅行偏好";
      return `${customer.name}您好，我看到您之前比较关注${preference}，最近我们正好有一些更匹配的旅行内容，想和您聊聊近期有没有出行想法。`;
    },
  },
];

const salesTagDimensions = tagDictionaryDimensions;

const surveyQuestions = [
  {
    id: "companions",
    category: "现状探索",
    title: "您会计划和谁一起来松赞？",
    options: [
      { label: "独自一人", tags: ["独行", "放松度假"], intent: "独处放松需求" },
      { label: "夫妻同行", tags: ["夫妻同行", "慢节奏"], intent: "双人度假需求" },
      { label: "家人同行", tags: ["亲子", "三代同游", "带老人"], intent: "家庭旅行需求" },
      { label: "朋友结伴", tags: ["朋友同行", "轻徒步"], intent: "结伴体验需求" },
    ],
  },
  {
    id: "plateau",
    category: "现状探索",
    title: "您之前有没有来过高原地区？或者去过松赞？",
    options: [
      { label: "第一次高原", tags: ["首次高原", "怕高反"], intent: "海拔适应优先" },
      { label: "去过高原", tags: ["高原经验", "轻徒步"], intent: "可接受标准体验" },
      { label: "去过松赞", tags: ["复购潜力", "藏文化"], intent: "复购深化体验" },
      { label: "不确定", tags: ["需要教育", "怕高反"], intent: "需要高反说明" },
    ],
  },
  {
    id: "reason",
    category: "痛点挖掘",
    title: "您最近是因为什么原因想出来走走了？",
    options: [
      { label: "工作压力大", tags: ["放松度假", "酒店偏好", "慢节奏"], intent: "身心放松需求" },
      { label: "想换环境", tags: ["雪山景观", "自然教育"], intent: "景观疗愈需求" },
      { label: "陪伴家人", tags: ["亲子", "三代同游"], intent: "家庭陪伴需求" },
      { label: "纪念日旅行", tags: ["夫妻同行", "高客单"], intent: "仪式感定制需求" },
    ],
  },
  {
    id: "ideal",
    category: "痛点挖掘",
    title: "您理想中的旅行是什么样的？",
    options: [
      { label: "轻松度假", tags: ["慢节奏", "酒店偏好"], intent: "舒适酒店路线" },
      { label: "深度体验", tags: ["藏文化", "深度体验"], intent: "文化深度路线" },
      { label: "自然教育", tags: ["亲子", "自然教育"], intent: "亲子自然教育路线" },
      { label: "看雪山", tags: ["雪山景观", "怕高反"], intent: "梅里雪山方向" },
    ],
  },
  {
    id: "impact",
    category: "影响放大",
    title: "您觉得一次真正让您印象深刻的旅行，会对您接下来有什么影响？",
    options: [
      { label: "重新充电", tags: ["放松度假", "慢节奏"], intent: "疗愈恢复价值" },
      { label: "增进亲子关系", tags: ["亲子", "自然教育"], intent: "家庭关系价值" },
      { label: "打开孩子眼界", tags: ["自然教育", "藏文化"], intent: "教育成长价值" },
      { label: "留下家庭记忆", tags: ["三代同游", "雪山景观"], intent: "家庭纪念价值" },
    ],
  },
  {
    id: "value",
    category: "价值引导",
    title: "如果有一个行程既有文化深度又能放松身心，您觉得怎么样？",
    options: [
      { label: "很适合", tags: ["藏文化", "慢节奏", "高转化"], intent: "可推进具体方案" },
      { label: "想了解", tags: ["等待方案", "深度体验"], intent: "需要内容种草" },
      { label: "看预算", tags: ["预算待确认"], intent: "需要价格锚定" },
      { label: "家人确认", tags: ["家庭决策"], intent: "需要辅助决策材料" },
    ],
  },
];

const communicationStatusQuestions = [
  {
    id: "travelPlan",
    title: "客户近期是否有出行计划？",
    options: ["有", "没有", "不确定"],
  },
  {
    id: "travelTiming",
    title: "客户是否提到具体时间？",
    options: ["已确定", "大概有计划", "未提及"],
  },
  {
    id: "productInquiry",
    title: "客户是否主动咨询产品？",
    options: ["是", "否"],
  },
  {
    id: "productComparing",
    title: "客户是否正在比较产品？",
    options: ["是", "否", "不清楚"],
  },
];

const communicationPathConfig: Record<CustomerCommunicationStatus, { goal: string; actions: string[]; explanation: string }> = {
  关系维护型: {
    goal: "建立信任关系",
    actions: ["了解工作", "了解家庭", "了解兴趣", "建立客户标签"],
    explanation: "当前判断客户暂无明确出行计划，建议优先建立关系与完善客户画像。",
  },
  需求培育型: {
    goal: "明确需求",
    actions: ["出行时间", "出行人数", "预算范围", "出行偏好"],
    explanation: "当前判断客户已有出行可能，但时间或需求仍不清晰，建议先把关键需求问完整。",
  },
  成交推进型: {
    goal: "推动成交",
    actions: ["产品匹配", "行程推荐", "预算确认", "成交推进"],
    explanation: "当前判断客户计划和时间较明确，建议进入产品匹配、预算确认和成交推进。",
  },
};

const communicationQuestionNodes: Record<string, CommunicationQuestionNode> = {
  了解工作: {
    key: "work",
    title: "了解工作",
    questions: [
      "您最近是因为什么原因想出来走走了？",
      "如果是工作压力大，是不是更希望轻松度假、慢节奏安排？",
      "您觉得一次真正让您印象深刻的旅行，会对您接下来有什么影响？",
    ],
  },
  了解家庭: {
    key: "family",
    title: "了解家庭",
    questions: [
      "您会计划和谁一起来松赞？",
      "是一位出行、夫妻同行、家人同行还是朋友结伴？",
      "这次旅行更希望增进亲子关系，还是留下家庭记忆？",
    ],
  },
  了解兴趣: {
    key: "interest",
    title: "了解兴趣",
    questions: [
      "您理想中的旅行是什么样的？",
      "更偏轻松度假、深度体验、自然教育，还是看雪山？",
      "如果有一个行程既有文化深度又能放松身心，您觉得怎么样？",
    ],
  },
  建立客户标签: {
    key: "profile-tags",
    title: "建立客户标签",
    questions: [
      "您之前有没有来过高原地区？或者去过松赞？",
      "这次更像是独处放松、双人度假、家庭旅行，还是结伴体验？",
      "我先把您提到的偏好记录下来，后面方便给您匹配更合适的方案，可以吗？",
    ],
  },
  出行时间: {
    key: "time",
    title: "出行时间",
    questions: [
      "计划什么季节出发？",
      "是否有假期安排？",
      "是否有节假日计划？",
    ],
  },
  出行人数: {
    key: "people",
    title: "出行人数",
    questions: [
      "一个人还是家庭出行？",
      "是否带老人？",
      "是否带儿童？",
      "您会计划和谁一起来松赞？",
    ],
  },
  预算范围: {
    key: "budget",
    title: "预算范围",
    questions: [
      "希望控制在什么区间？",
      "更关注体验还是价格？",
      "如果有一个行程既有文化深度又能放松身心，您觉得怎么样？预算上是先看整体体验，还是需要我帮您做价格锚定？",
    ],
  },
  出行偏好: {
    key: "preference",
    title: "出行偏好",
    questions: [
      "您理想中的旅行是什么样的？",
      "更偏轻松度假、深度体验、自然教育，还是看雪山？",
      "您最近是因为什么原因想出来走走了？",
    ],
  },
  产品匹配: {
    key: "product-match",
    title: "产品匹配",
    questions: [
      "如果有一个行程既有文化深度又能放松身心，您觉得怎么样？",
      "您之前有没有来过高原地区？或者去过松赞？",
      "我根据您刚才提到的同行人、节奏和偏好，先帮您匹配两个方向可以吗？",
    ],
  },
  行程推荐: {
    key: "itinerary",
    title: "行程推荐",
    questions: [
      "您理想中的旅行是什么样的？",
      "如果是家庭出行，是更看重孩子体验、老人舒适，还是整体节奏？",
      "看雪山、深度体验、自然教育这些方向里，您更偏哪一个？",
    ],
  },
  预算确认: {
    key: "budget-confirm",
    title: "预算确认",
    questions: [
      "这次出行的预算大概在什么范围？",
      "更希望我按体验优先推荐，还是按预算区间筛选？",
      "如果方案合适，预算是否需要和家人一起确认？",
    ],
  },
  成交推进: {
    key: "deal",
    title: "成交推进",
    questions: [
      "如果这个方向合适，我可以先帮您做一个具体方案。",
      "需要我把行程亮点、酒店安排和预算一起发给您确认吗？",
      "如果家人也要确认，我可以整理一版方便您转发的内容。",
    ],
  },
};

const communicationConclusionActions: Record<string, string[]> = {
  暂无出行意向: ["建立维护记录", "设置下次提醒"],
  培育中: ["补充需求标签", "设置提醒日期"],
  强意向客户: ["推荐产品", "生成产品匹配结果"],
};

export default function SalesJourneyFlow({ customer, onClose }: SalesJourneyFlowProps) {
  const [activeStage, setActiveStage] = useState<StageKey>("pre");
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [communicationPurpose, setCommunicationPurpose] = useState("");
  const [communicationMethod, setCommunicationMethod] = useState("");
  const [salesTags, setSalesTags] = useState<Record<string, string[]>>(
    () => Object.fromEntries(salesTagDimensions.map((dimension) => [dimension.key, []])),
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [communicationMapAnswers, setCommunicationMapAnswers] = useState<CommunicationMapAnswers>({});
  const [customerQuote, setCustomerQuote] = useState("");
  const [competitorMention, setCompetitorMention] = useState("");
  const [dealLikelihood, setDealLikelihood] = useState("");
  const [finalRequirement, setFinalRequirement] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [methodPickerOpen, setMethodPickerOpen] = useState(false);
  const [followPlan, setFollowPlan] = useState<FollowPlan>({
    time: null,
    method: "",
    content: "",
  });

  const answerTags = useMemo(() => {
    const tags = surveyQuestions.flatMap((question) => {
      const selected = question.options.find((option) => option.label === answers[question.id]);
      return selected?.tags ?? [];
    });
    return Array.from(new Set(tags));
  }, [answers]);

  const removedTags = useMemo(() => getRemovedTags(manualTags, answerTags), [answerTags, manualTags]);
  const salesTagChanges = useMemo(() => getSalesTagChanges(manualTags, salesTags), [manualTags, salesTags]);
  const mergedTags = useMemo(
    () => Array.from(new Set([...manualTags.filter((tag) => !removedTags.includes(tag)), ...answerTags])),
    [answerTags, manualTags, removedTags],
  );
  const dynamicProducts = useMemo(() => rankProducts(mergedTags), [mergedTags]);
  const selectedProducts = useMemo(
    () => mockProducts.filter((product) => selectedProductIds.includes(product.id)),
    [selectedProductIds],
  );
  const allSalesTagDimensionsSelected = salesTagDimensions.every((dimension) => (salesTags[dimension.key] ?? []).length > 0);
  const predictionRequiredComplete = requiredPredictionDimensionKeys.every((key) => {
    const dimension = predictionDimensions.find((item) => item.key === key);
    return Boolean(dimension && hasPredictionSelection(manualTags, dimension));
  });
  const preTasks = [
    { label: "标签预判", done: predictionRequiredComplete },
    { label: "首推产品", done: selectedProductIds.length > 0 },
  ];
  const communicationMapComplete =
    communicationStatusQuestions.every((question) => Boolean(communicationMapAnswers[question.id])) &&
    Boolean(communicationMapAnswers.conclusion);
  const duringTasks = [
    { label: "选择沟通目的", done: Boolean(communicationPurpose) },
    { label: "选择沟通方式", done: Boolean(communicationMethod) },
    { label: "补充销售标签", done: allSalesTagDimensionsSelected },
    { label: "完成需求沟通地图", done: communicationMapComplete },
    { label: "选择推荐产品", done: selectedProductIds.length > 0 },
    { label: "记录客户反馈", done: customerQuote.trim().length > 0 },
    { label: "竞品对比", done: competitorMention.trim().length > 0 },
    { label: "判断成交可能", done: Boolean(dealLikelihood) },
  ];
  const confirmTasks = [
    { label: "最终描述", done: finalRequirement.trim().length > 0 },
    { label: "确认标签", done: allSalesTagDimensionsSelected },
    { label: "推荐产品", done: selectedProducts.length > 0 },
    { label: "跟进计划", done: Boolean(followPlan.time && followPlan.method && followPlan.content.trim()) },
  ];
  const isPreComplete = preTasks.every((item) => item.done);
  const isDuringComplete = duringTasks.every((item) => item.done);
  const isConfirmComplete = confirmTasks.every((item) => item.done);
  const canEnterStage: Record<StageKey, boolean> = {
    pre: true,
    during: isPreComplete,
    confirm: isPreComplete && isDuringComplete,
    follow: isPreComplete && isDuringComplete && isConfirmComplete,
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [activeStage]);

  function handleStageChange(stage: StageKey) {
    if (!canEnterStage[stage]) {
      Toast.show({ content: "请先完成当前阶段任务", position: "bottom" });
      return;
    }
    setActiveStage(stage);
  }

  function updateManualTagsForDimension(optionValues: string[], values: string[]) {
    setManualTags((current) => Array.from(new Set([...current.filter((tag) => !optionValues.includes(tag)), ...values])));
  }

  function toggleProduct(productId: string) {
    setSelectedProductIds((current) => (current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]));
  }

  function saveCurrentStage(message: string) {
    Toast.show({ content: message, position: "bottom" });
  }

  return (
    <section className="songtsam-ai songtsam-page-bg min-h-screen pb-28 text-cedar">
      <header className="sticky top-0 z-30 bg-copper px-5 pb-4 pt-4 text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
        <div className="flex items-center gap-3">
          <Button fill="none" className="!h-10 !w-10 !rounded-full !bg-white/10 !p-0 !text-white" onClick={onClose}>
            <ArrowLeft size={19} />
          </Button>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-white/10 text-lg font-semibold text-white ring-1 ring-white/10">
            {customer.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold leading-6 text-white">{customer.name} · {customer.memberLevel}</h1>
            </div>
            <p className="text-xs leading-[18px] text-white/65">
              {customer.memberCardNo} · {customer.memberLevel} · {customer.memberPhone}
            </p>
            <p className="text-xs leading-[18px] text-white/55">
              近期维护 {customer.lastMaintenanceAt}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-[18px] bg-white px-2 py-1 shadow-soft">
          <Tabs activeKey={activeStage} onChange={(key) => handleStageChange(key as StageKey)}>
            {stageItems.map((stage) => (
              <Tabs.Tab
                key={stage.key}
                title={
                  canEnterStage[stage.key] ? (
                    stage.title
                  ) : (
                    <span className="inline-flex items-center justify-center gap-1 text-clay/45">
                      {stage.title}
                      <Lock size={11} />
                    </span>
                  )
                }
              />
            ))}
          </Tabs>
        </div>
      </header>

      <motion.main
        className="space-y-5 px-5 py-5 min-[700px]:px-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        {activeStage === "pre" && (
          <PreBriefStage
            customer={customer}
            manualTags={manualTags}
            updateManualTagsForDimension={updateManualTagsForDimension}
            dynamicProducts={dynamicProducts}
            selectedProductIds={selectedProductIds}
            toggleProduct={toggleProduct}
            taskItems={preTasks}
          />
        )}
        {activeStage === "during" && (
          <DuringStage
            customer={customer}
            communicationPurpose={communicationPurpose}
            setCommunicationPurpose={setCommunicationPurpose}
            communicationMethod={communicationMethod}
            setCommunicationMethod={setCommunicationMethod}
            salesTags={salesTags}
            setSalesTags={setSalesTags}
            answers={answers}
            communicationMapAnswers={communicationMapAnswers}
            setCommunicationMapAnswers={setCommunicationMapAnswers}
            salesTagChanges={salesTagChanges}
            mergedTags={mergedTags}
            customerQuote={customerQuote}
            setCustomerQuote={setCustomerQuote}
            competitorMention={competitorMention}
            setCompetitorMention={setCompetitorMention}
            dealLikelihood={dealLikelihood}
            setDealLikelihood={setDealLikelihood}
            dynamicProducts={dynamicProducts}
            selectedProductIds={selectedProductIds}
            toggleProduct={toggleProduct}
            taskItems={duringTasks}
          />
        )}
        {activeStage === "confirm" && (
          <ConfirmStage
            selectedProducts={selectedProducts.length ? selectedProducts : dynamicProducts.slice(0, 2)}
            followPlan={followPlan}
            setFollowPlan={setFollowPlan}
            salesTagChanges={salesTagChanges}
            finalRequirement={finalRequirement}
            setFinalRequirement={setFinalRequirement}
            datePickerOpen={datePickerOpen}
            setDatePickerOpen={setDatePickerOpen}
            methodPickerOpen={methodPickerOpen}
            setMethodPickerOpen={setMethodPickerOpen}
            taskItems={confirmTasks}
          />
        )}
        {activeStage === "follow" && (
          <FollowStage
            customer={customer}
            tags={mergedTags}
            answers={answers}
            selectedProducts={selectedProducts.length ? selectedProducts : dynamicProducts.slice(0, 2)}
            customerQuote={customerQuote}
            followPlan={followPlan}
            communicationMethod={communicationMethod}
            communicationPurpose={communicationPurpose}
          />
        )}
      </motion.main>

      <JourneyActionBar
        activeStage={activeStage}
        setActiveStage={setActiveStage}
        canProceed={activeStage === "pre" ? isPreComplete : activeStage === "during" ? isDuringComplete : isConfirmComplete}
        onSave={() => saveCurrentStage(activeStage === "pre" ? "已保存沟通前信息" : "已保存本次沟通")}
      />
    </section>
  );
}

function PreBriefStage({
  customer,
  manualTags,
  updateManualTagsForDimension,
  dynamicProducts,
  selectedProductIds,
  toggleProduct,
  taskItems,
}: {
  customer: Customer;
  manualTags: string[];
  updateManualTagsForDimension: (optionValues: string[], values: string[]) => void;
  dynamicProducts: Product[];
  selectedProductIds: string[];
  toggleProduct: (id: string) => void;
  taskItems: Array<{ label: string; done: boolean }>;
}) {
  return (
    <>
      <ProfileChecklistCard customer={customer} />

      <ActivityFeed title="近期参与的线下活动" items={preActivities} />

      <Card className="songtsam-mobile-card">
        <SectionTitle eyebrow="沟通前" title="标签预判" />
        <PredictionStepper
          manualTags={manualTags}
          updateManualTagsForDimension={updateManualTagsForDimension}
        />
      </Card>

      <section>
        <SectionTitle eyebrow="初步产品筛选" title="按已选需求标签匹配产品标签" />
        <p className="mt-1 text-xs leading-[18px] text-clay/60">推荐顺序会随8维预判标签实时变化。</p>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {dynamicProducts.slice(0, 4).map((product) => (
            <SelectableProductCard
              key={product.id}
              product={product}
              tags={manualTags}
              selected={selectedProductIds.includes(product.id)}
              onClick={() => toggleProduct(product.id)}
            />
          ))}
        </div>
      </section>

      <TaskCard title="沟通前任务" items={taskItems} />
    </>
  );
}

function PredictionStepper({
  manualTags,
  updateManualTagsForDimension,
}: {
  manualTags: string[];
  updateManualTagsForDimension: (optionValues: string[], values: string[]) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const activeDimension = predictionDimensions[activeIndex];
  const optionValues = activeDimension.options.map((option) => option.value);
  const selectedValue = manualTags.find((tag) => optionValues.includes(tag)) ?? "";

  function goToStep(index: number) {
    if (index < 0 || index >= predictionDimensions.length) return;
    setSlideDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  }

  function handleSelect(values: (string | number)[]) {
    const nextValue = String(values[0] ?? "");
    updateManualTagsForDimension(optionValues, nextValue ? [nextValue] : []);

    if (nextValue && activeIndex < predictionDimensions.length - 1) {
      window.setTimeout(() => {
        setSlideDirection(1);
        setActiveIndex((current) => Math.min(current + 1, predictionDimensions.length - 1));
      }, 180);
    }
  }

  return (
    <div className="mt-3">
      <div className="overflow-hidden rounded-[18px] border border-snow bg-white p-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeDimension.key}
            initial={{ opacity: 0, x: slideDirection > 0 ? 44 : -44 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDirection > 0 ? -44 : 44 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] leading-4 text-copper">
                  {activeIndex + 1}/{predictionDimensions.length}
                </p>
                <h3 className="mt-1 text-base font-medium leading-6">{activeDimension.title}</h3>
                <p className="mt-1 text-xs leading-[18px] text-clay/55">{activeDimension.summary}</p>
              </div>
              <span className={selectedValue ? "shrink-0 rounded-full bg-sage/12 px-2.5 py-1 text-[11px] text-sage" : "shrink-0 rounded-full bg-linen px-2.5 py-1 text-[11px] text-clay/55"}>
                {selectedValue || "待选"}
              </span>
            </div>
            <Selector
              showCheckMark={false}
              value={selectedValue ? [selectedValue] : []}
              options={activeDimension.options}
              onChange={handleSelect}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          disabled={activeIndex === 0}
          onClick={() => goToStep(activeIndex - 1)}
          className="!h-11 !rounded-[14px] !border-snow !bg-white !text-cedar"
        >
          上一个
        </Button>
        <Button
          disabled={activeIndex === predictionDimensions.length - 1}
          onClick={() => goToStep(activeIndex + 1)}
          className="!h-11 !rounded-[14px] !border-0 !bg-copper !text-white"
        >
          下一个
        </Button>
      </div>
    </div>
  );
}

function DuringStage({
  customer,
  communicationPurpose,
  setCommunicationPurpose,
  communicationMethod,
  setCommunicationMethod,
  salesTags,
  setSalesTags,
  answers,
  communicationMapAnswers,
  setCommunicationMapAnswers,
  salesTagChanges,
  mergedTags,
  customerQuote,
  setCustomerQuote,
  competitorMention,
  setCompetitorMention,
  dealLikelihood,
  setDealLikelihood,
  dynamicProducts,
  selectedProductIds,
  toggleProduct,
  taskItems,
}: {
  customer: Customer;
  communicationPurpose: string;
  setCommunicationPurpose: (purpose: string) => void;
  communicationMethod: string;
  setCommunicationMethod: (method: string) => void;
  salesTags: Record<string, string[]>;
  setSalesTags: (tags: Record<string, string[]>) => void;
  answers: Record<string, string>;
  communicationMapAnswers: CommunicationMapAnswers;
  setCommunicationMapAnswers: (answers: CommunicationMapAnswers) => void;
  salesTagChanges: TagChange[];
  mergedTags: string[];
  customerQuote: string;
  setCustomerQuote: (value: string) => void;
  competitorMention: string;
  setCompetitorMention: (value: string) => void;
  dealLikelihood: string;
  setDealLikelihood: (value: string) => void;
  dynamicProducts: Product[];
  selectedProductIds: string[];
  toggleProduct: (id: string) => void;
  taskItems: Array<{ label: string; done: boolean }>;
}) {
  const [communicationPickerOpen, setCommunicationPickerOpen] = useState(false);
  const [expandedQuestionNode, setExpandedQuestionNode] = useState("");
  const selectedPurpose = communicationPurposes.find((purpose) => purpose.key === communicationPurpose);
  const openingScript = selectedPurpose?.getScript(customer, mergedTags) ?? "请选择本次沟通目的，系统会推荐一句开场白。";
  const communicationStatus = getCommunicationStatus(communicationMapAnswers);
  const communicationPath = communicationPathConfig[communicationStatus];

  return (
    <>
      <Card className="songtsam-mobile-card">
        <SectionTitle eyebrow="破冰开场" title="选择本次沟通目的" />
        <div className="mt-3">
          <Selector
            showCheckMark={false}
            value={communicationPurpose ? [communicationPurpose] : []}
            options={communicationPurposes.map((purpose) => ({ label: purpose.label, value: purpose.key }))}
            onChange={(values) => setCommunicationPurpose(String(values[0] ?? ""))}
          />
        </div>
        <div className="mt-3 rounded-[16px] border border-snow bg-linen p-3">
          <div className="mb-2 flex items-center gap-2 text-xs text-copper">
            <Sparkles size={14} />
            {selectedPurpose?.hint ?? "根据沟通目的生成开场白"}
          </div>
          <p className="text-sm leading-[23px] text-clay/85">{openingScript}</p>
        </div>
      </Card>

      <Card className="songtsam-mobile-card">
        <SectionTitle eyebrow="沟通方式" title="销售手动选择本次触达方式" />
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setCommunicationPickerOpen(true)}
            className="flex w-full items-center justify-between rounded-[16px] border border-snow bg-linen px-4 py-4 text-left"
          >
            <span className="text-sm">本次沟通方式</span>
            <span className="inline-flex items-center gap-1 text-sm text-copper">
              {communicationMethod}
              <ChevronDown size={15} />
            </span>
          </button>
        </div>
        <Picker
          visible={communicationPickerOpen}
          columns={[communicationMethods.map((method) => ({ label: method, value: method }))]}
          value={[communicationMethod]}
          onClose={() => setCommunicationPickerOpen(false)}
          onConfirm={(value: PickerValue[]) => setCommunicationMethod(String(value[0] ?? communicationMethod))}
        />
      </Card>

      <Card className="songtsam-mobile-card">
        <SectionTitle eyebrow="销售标签" title="本次沟通手动确认的信息" />
        <div className="mt-3 space-y-4">
          {salesTagDimensions.map((dimension) => (
            <TagSelectorGroup
              key={dimension.key}
              title={dimension.title}
              options={dimension.options}
              value={salesTags[dimension.key] ?? []}
              onChange={(values) => setSalesTags({ ...salesTags, [dimension.key]: values })}
            />
          ))}
        </div>
      </Card>

      <Card className="songtsam-mobile-card">
        <SectionTitle eyebrow="需求沟通地图" title="根据客户状态推荐销售话术" />

        <section className="mt-3 rounded-[18px] border border-snow bg-linen p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs leading-[18px] text-copper">客户状态快速判断</p>
              <h3 className="mt-1 text-sm font-semibold leading-5 text-cedar">{communicationStatus}</h3>
            </div>
            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] leading-4 text-clay ring-1 ring-snow">
              可随时修改
            </span>
          </div>
          <p className="mt-2 text-xs leading-[18px] text-clay/70">{communicationPath.explanation}</p>
          <div className="mt-3 space-y-3">
            {communicationStatusQuestions.map((question) => (
              <div key={question.id}>
                <p className="mb-2 text-xs font-medium leading-[18px] text-cedar">{question.title}</p>
                <Selector
                  showCheckMark={false}
                  value={communicationMapAnswers[question.id] ? [communicationMapAnswers[question.id]] : []}
                  options={question.options.map((option) => ({ label: option, value: option }))}
                  onChange={(value) => setCommunicationMapAnswers({ ...communicationMapAnswers, [question.id]: String(value[0] ?? "") })}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-3 rounded-[18px] border border-snow bg-white p-3">
          <p className="text-xs leading-[18px] text-copper">推荐沟通路径</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold leading-5 text-cedar">目标：{communicationPath.goal}</h3>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {communicationPath.actions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => setExpandedQuestionNode((current) => (current === action ? "" : action))}
                className={`rounded-[14px] px-3 py-2 text-left text-xs font-semibold leading-5 transition ${
                  expandedQuestionNode === action ? "bg-copper text-white" : "bg-linen text-clay ring-1 ring-snow"
                }`}
              >
                {action}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-3 rounded-[18px] border border-snow bg-white p-3">
          <p className="text-xs leading-[18px] text-copper">沟通问题树</p>
          <div className="mt-2 space-y-2">
            {communicationPath.actions.map((action) => {
              const node = communicationQuestionNodes[action];
              const expanded = expandedQuestionNode === action;
              return (
                <div key={action} className="rounded-[14px] border border-snow bg-linen">
                  <button
                    type="button"
                    onClick={() => setExpandedQuestionNode((current) => (current === action ? "" : action))}
                    className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                  >
                    <span className="text-sm font-medium leading-5 text-cedar">{node.title}</span>
                    <ChevronDown size={15} className={`shrink-0 text-clay/55 transition ${expanded ? "rotate-180" : ""}`} />
                  </button>
                  {expanded && (
                    <div className="border-t border-snow bg-white px-3 py-3">
                      <div className="space-y-2">
                        {node.questions.map((question) => (
                          <p key={`${node.key}-${question}`} className="rounded-[12px] bg-linen px-3 py-2 text-xs leading-[18px] text-clay/80">
                            {question}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-3 rounded-[18px] border border-snow bg-linen p-3">
          <p className="text-xs leading-[18px] text-copper">沟通结论</p>
          <div className="mt-3">
            <Selector
              showCheckMark={false}
              value={communicationMapAnswers.conclusion ? [communicationMapAnswers.conclusion] : []}
              options={Object.keys(communicationConclusionActions).map((option) => ({ label: option, value: option }))}
              onChange={(value) => setCommunicationMapAnswers({ ...communicationMapAnswers, conclusion: String(value[0] ?? "") })}
            />
          </div>
          {communicationMapAnswers.conclusion && (
            <div className="mt-3 rounded-[14px] border border-snow bg-white p-3">
              <p className="text-xs font-medium leading-[18px] text-cedar">建议</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {communicationConclusionActions[communicationMapAnswers.conclusion].map((action) => (
                  <span key={action} className="rounded-full bg-sage/12 px-3 py-1.5 text-xs leading-5 text-sage">
                    {action}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </Card>

      <Card className="songtsam-mobile-card">
        <h2 className="text-lg font-medium leading-7">本轮沟通标签变化</h2>
        <TagChangeList changes={salesTagChanges} />
      </Card>

      <FloatingRecommendationPanel
        products={dynamicProducts.slice(0, 3)}
        tags={mergedTags}
        selectedProductIds={selectedProductIds}
        onToggleProduct={toggleProduct}
      />

      <Card className="songtsam-mobile-card">
        <SectionTitle eyebrow="客户真实原话" title="客户反馈" />
        <div className="mt-3 rounded-[18px] border border-snow bg-linen p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs text-[#808080]">可语音转文字后整理</span>
            <Mic size={16} className="text-copper" />
          </div>
          <TextArea
            value={customerQuote}
            onChange={setCustomerQuote}
            rows={4}
            placeholder="记录客户原话，例如：客户明确表示不喜欢连续换酒店。"
          />
        </div>
        <div className="mt-3 rounded-[18px] border border-snow bg-linen p-3">
          <p className="mb-2 px-1 text-xs text-[#808080]">竞品对比：客户主动提到哪些竞品</p>
          <TextArea
            value={competitorMention}
            onChange={setCompetitorMention}
            rows={3}
            placeholder="例如：客户提到安缦、柏联、私家团，关注酒店景观和服务私密性。"
          />
        </div>
        <div className="mt-3 rounded-[18px] border border-snow bg-linen p-3">
          <p className="mb-2 px-1 text-xs text-[#808080]">成交可能性</p>
          <Selector
            showCheckMark={false}
            value={dealLikelihood ? [dealLikelihood] : []}
            options={["高", "中", "低"].map((item) => ({ label: item, value: item }))}
            onChange={(value) => setDealLikelihood(String(value[0] ?? ""))}
          />
        </div>
      </Card>

      <TaskCard title="沟通中任务" items={taskItems} />
    </>
  );
}

function ConfirmStage({
  selectedProducts,
  followPlan,
  setFollowPlan,
  salesTagChanges,
  finalRequirement,
  setFinalRequirement,
  datePickerOpen,
  setDatePickerOpen,
  methodPickerOpen,
  setMethodPickerOpen,
  taskItems,
}: {
  selectedProducts: Product[];
  followPlan: FollowPlan;
  setFollowPlan: (plan: FollowPlan) => void;
  salesTagChanges: TagChange[];
  finalRequirement: string;
  setFinalRequirement: (value: string) => void;
  datePickerOpen: boolean;
  setDatePickerOpen: (open: boolean) => void;
  methodPickerOpen: boolean;
  setMethodPickerOpen: (open: boolean) => void;
  taskItems: Array<{ label: string; done: boolean }>;
}) {
  return (
    <>
      <Card className="songtsam-mobile-card">
        <h2 className="text-lg font-medium leading-7">本次沟通标签变化确认</h2>
        <TagChangeList changes={salesTagChanges} />
      </Card>

      <Card className="songtsam-mobile-card">
        <SectionTitle eyebrow="最终推荐产品" title="沟通中已推荐的产品" />
        <div className="mt-3 space-y-2">
          {selectedProducts.map((product, index) => (
            <div key={product.id} className="flex gap-3 rounded-[16px] border border-snow bg-linen p-3">
              <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-[18px]">
                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-copper text-xs font-medium text-white">{index + 1}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium leading-5">{product.name}</h3>
                <p className="mt-1 text-xs leading-[18px] text-[#808080]">{product.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="songtsam-mobile-card">
        <SectionTitle eyebrow="最终需求描述" title="销售确认客户本次真实需求" />
        <div className="mt-3 rounded-[18px] border border-snow bg-linen p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-[#808080]">可语音补充后再确认</span>
            <button type="button" aria-label="语音输入" className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] bg-white text-copper">
              <Mic size={14} />
            </button>
          </div>
          <div className="rounded-[18px] bg-white/82 p-3">
            <TextArea
              value={finalRequirement}
              onChange={setFinalRequirement}
              rows={4}
              placeholder="填写最终确认的需求，例如：暑期三代同游，行程要轻松，优先梅里雪山和酒店体验。"
            />
          </div>
        </div>
      </Card>

      <Card className="songtsam-mobile-card">
        <SectionTitle eyebrow="下次跟进计划" title="设置提醒时间与内容" />
        <div className="mt-3 space-y-3">
          <button type="button" onClick={() => setDatePickerOpen(true)} className="flex w-full items-center justify-between rounded-[16px] border border-snow bg-linen px-4 py-4 text-left">
            <span className="text-sm">跟进时间</span>
            <span className={followPlan.time ? "text-sm text-copper" : "text-sm text-[#999]"}>
              {followPlan.time ? formatDateTime(followPlan.time) : "请选择跟进时间"}
            </span>
          </button>
          <button type="button" onClick={() => setMethodPickerOpen(true)} className="flex w-full items-center justify-between rounded-[16px] border border-snow bg-linen px-4 py-4 text-left">
            <span className="text-sm">跟进方式</span>
            <span className="inline-flex items-center gap-1 text-sm text-copper">
              {followPlan.method}
              <ChevronDown size={15} />
            </span>
          </button>
          <div className="rounded-[18px] border border-snow bg-linen p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium leading-5">跟进内容</p>
              <button type="button" aria-label="语音输入" className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] bg-white text-copper">
                <Mic size={14} />
              </button>
            </div>
            <div className="rounded-[14px] border border-snow bg-white p-3">
              <TextArea
                value={followPlan.content}
                onChange={(value) => setFollowPlan({ ...followPlan, content: value })}
                rows={4}
                placeholder="例如：发送梅里轻奢慢行方案，并确认老人和孩子对高反的顾虑"
              />
            </div>
          </div>
        </div>
      </Card>

      <DatePicker
        visible={datePickerOpen}
        value={followPlan.time}
        precision="minute"
        onClose={() => setDatePickerOpen(false)}
        onConfirm={(value) => setFollowPlan({ ...followPlan, time: value })}
      />
      <Picker
        visible={methodPickerOpen}
        columns={[followMethods.map((method) => ({ label: method, value: method }))]}
        value={[followPlan.method]}
        onClose={() => setMethodPickerOpen(false)}
        onConfirm={(value: PickerValue[]) => setFollowPlan({ ...followPlan, method: String(value[0] ?? followPlan.method) })}
      />

      <TaskCard title="需求确认任务" items={taskItems} />
    </>
  );
}

function FollowStage({
  customer,
  tags,
  answers,
  selectedProducts,
  customerQuote,
  followPlan,
  communicationMethod,
  communicationPurpose,
}: {
  customer: Customer;
  tags: string[];
  answers: Record<string, string>;
  selectedProducts: Product[];
  customerQuote: string;
  followPlan: FollowPlan;
  communicationMethod: string;
  communicationPurpose: string;
}) {
  const currentFollowTime = followPlan.time ?? makeRelativeDate(0, 15, 30);
  const communicationPurposeLabel = communicationPurposes.find((purpose) => purpose.key === communicationPurpose)?.label ?? "未选择沟通目的";
  const conversionOrders: ProductConversionOrder[] = [
    {
      orderTime: makeRelativeDate(5, 11, 15),
      orderId: "SO20260608-027",
      productName: "初探亚丁三神山",
      orderType: "主题团",
      productTags: ["亚丁", "雪山季", "轻户外", "自然景观", "高原经验"],
      amount: "￥52,600",
    },
  ];
  const followRecords = [
    {
      time: currentFollowTime,
      items: [
        { title: "本次沟通", detail: `${communicationMethod} · ${communicationPurposeLabel}，围绕${Object.values(answers).filter(Boolean).join("、")}完成需求确认。` },
        { title: "标签变化", detail: tags.join("、") },
        { title: "AI分析结果", detail: `${customer.name}适合慢节奏、酒店体验强、自然教育友好的家庭路线；需要规避高强度徒步和连续长车程。` },
        { title: "推荐产品", detail: selectedProducts.map((product) => product.name).join("；") },
        { title: "订单结果", detail: "暂无新增订单。当前跟进仍处于需求确认阶段，待销售发送方案后继续观察转化。" },
        { title: "客户原话", detail: customerQuote || "未记录客户原话" },
        {
          title: "下次待办",
          detail: `${followPlan.time ? formatDateTime(followPlan.time) : "未设置跟进时间"} · ${followPlan.method} · ${followPlan.content}`,
        },
      ],
    },
    {
      time: makeRelativeDate(3, 10, 12),
      items: [
        { title: "沟通方式", detail: "企业微信" },
        { title: "客户反馈", detail: "客户对梅里雪山方向有兴趣，但担心老人高反，希望先了解海拔和酒店连续入住安排。" },
        { title: "标签变化", detail: "新增：怕高反、带老人、酒店偏好" },
        { title: "推荐产品", detail: "香格里拉 - 梅里雪山 6天5晚；香格里拉亲子自然探索 5天4晚" },
        { title: "订单结果", detail: "已生成报价单 Q20260524-018，推荐产品为香格里拉 - 梅里雪山 6天5晚，预估金额￥86,800，客户待家人确认。" },
        { title: "下次待办", detail: "补充梅里轻奢慢行方案，并说明德钦段海拔适应建议。" },
      ],
    },
    {
      time: makeRelativeDate(7, 19, 20),
      items: [
        { title: "沟通方式", detail: "电话沟通" },
        { title: "客户反馈", detail: "客户确认暑期有6天左右时间，预算约8万，家庭成员为夫妻、孩子和父母。" },
        { title: "标签变化", detail: "新增：亲子、三代同游、预算明确、咨询暑期" },
        { title: "AI分析结果", detail: "客户决策链较长，需要兼顾老人舒适度与孩子体验，适合先用轻松方案建立信任。" },
        { title: "订单结果", detail: "产生咨询单 C20260520-062，关联推荐方向为梅里轻奢慢行，尚未进入报价。" },
        { title: "下次待办", detail: "等待客户家庭成员确认具体出行日期。" },
      ],
    },
    {
      time: makeRelativeDate(16, 14, 8),
      items: [
        { title: "沟通方式", detail: "会员活动" },
        { title: "客户反馈", detail: "客户参加松赞会员分享后，对雪山、在地文化和酒店景观产生兴趣。" },
        { title: "标签变化", detail: "新增：雪山景观、藏文化、复购潜力" },
        { title: "推荐产品", detail: "梅里轻奢慢行方向；香格里拉深度体验方向" },
        { title: "订单结果", detail: "活动后7天内无新增订单，但客户浏览梅里相关内容3次，推荐方向被验证为有效兴趣。" },
        { title: "下次待办", detail: "活动后一周内通过企微发送梅里内容，观察客户反馈。" },
      ],
    },
  ];

  return (
    <>
      {conversionOrders.map((order) => (
        <Card key={order.orderId} className="songtsam-mobile-card">
          <h2 className="text-lg font-medium leading-7">{formatConversionOrderTitle(order.orderTime)}</h2>
          <div className="mt-4 space-y-4">
            <TimelineItem title="订单ID" detail={order.orderId} />
            <TimelineItem title="产品名称" detail={order.productName} />
            <TimelineItem title="订单类型" detail={order.orderType} />
            <TimelineItem title="产品标签" detail={order.productTags.join("、")} />
            <TimelineItem title="订单金额" detail={order.amount} />
          </div>
        </Card>
      ))}

      {followRecords.map((record) => (
        <Card key={record.time.toISOString()} className="songtsam-mobile-card">
          <h2 className="text-lg font-medium leading-7">{formatFollowRecordTime(record.time)}跟进</h2>
          <div className="mt-4 space-y-4">
            {record.items.map((item) => (
              <TimelineItem key={`${record.time.toISOString()}-${item.title}`} title={item.title} detail={item.detail} />
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}

function JourneyActionBar({
  activeStage,
  setActiveStage,
  canProceed,
  onSave,
}: {
  activeStage: StageKey;
  setActiveStage: (stage: StageKey) => void;
  canProceed: boolean;
  onSave: () => void;
}) {
  if (activeStage === "follow") {
    return null;
  }

  const config = {
    pre: { primary: "开始沟通", secondary: "保存", next: "during" as StageKey },
    during: { primary: "结束沟通", secondary: "保存", next: "confirm" as StageKey },
    confirm: { primary: "确认需求", secondary: "", next: "follow" as StageKey },
  }[activeStage];

  return (
    <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-snow bg-white/95 px-5 pb-5 pt-3 shadow-[0_-16px_40px_rgba(15,23,42,0.10)] backdrop-blur">
      <div className={activeStage === "confirm" ? "grid grid-cols-1" : "grid grid-cols-[1fr_1.4fr] gap-2"}>
        {activeStage !== "confirm" && (
          <Button onClick={onSave} className="!h-12 !rounded-[14px] !border-snow !bg-white !text-cedar">
            {config.secondary}
          </Button>
        )}
        <Button
          color="primary"
          disabled={!canProceed}
          onClick={() => {
            if (!canProceed) {
              Toast.show({ content: "请先完成本阶段任务", position: "bottom" });
              return;
            }
            setActiveStage(config.next);
          }}
          className="!h-12 !rounded-[14px]"
        >
          {config.primary}
        </Button>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs leading-[18px] text-copper">{eyebrow}</p>
      <h2 className="mt-1 text-lg font-medium leading-7">{title}</h2>
    </div>
  );
}

function TaskCard({ title, items }: { title: string; items: Array<{ label: string; done: boolean }> }) {
  const doneCount = items.filter((item) => item.done).length;
  return (
    <Card className="songtsam-mobile-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListChecks size={18} className="text-copper" />
          <h2 className="text-base font-medium leading-6">{title}</h2>
        </div>
        <span className="rounded-full bg-linen px-3 py-1 text-xs text-clay">{doneCount}/{items.length}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 min-[620px]:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 rounded-[14px] border border-snow bg-linen px-3 py-2.5">
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${item.done ? "bg-sage text-white" : "bg-white text-clay/40"}`}>
              {item.done ? <Check size={12} /> : <CircleDot size={11} />}
            </span>
            <span className="truncate text-xs leading-5 text-clay/80">{item.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ActivityFeed({ title, items }: { title: string; items: Array<{ time: string; title: string; detail: string }> }) {
  return (
    <Card className="songtsam-mobile-card">
      <SectionTitle eyebrow="线下活动" title={title} />
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={`${item.time}-${item.title}`} className="relative border-l border-copper/20 pl-4">
            <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-copper" />
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium leading-5">{item.title}</h3>
              <span className="shrink-0 text-[11px] text-clay/50">{item.time}</span>
            </div>
            <p className="mt-1 text-xs leading-[18px] text-clay/70">{item.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ProfileChecklistCard({ customer }: { customer: Customer }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileLabelGroups = [
    { title: "详细信息", items: [...customer.profileChecklist.identity, ...customer.profileChecklist.residence] },
    {
      title: "个人标签",
      items: [
        ...customer.tags.map((tag) => ({ label: "标签", value: tag })),
        ...customer.profileChecklist.interactionRisk,
      ],
    },
    { title: "家庭标签", items: customer.profileChecklist.household },
  ];
  const behaviorLabelGroups = [
    { title: "历史消费和出行", items: customer.profileChecklist.consumption },
    { title: "线上行为", items: customer.profileChecklist.onlineBehavior },
  ];

  return (
    <>
      <Card className="songtsam-mobile-card">
        <div className="flex items-start justify-between gap-3">
          <SectionTitle eyebrow="沟通前" title="客户摘要" />
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="shrink-0 rounded-[12px] bg-copper px-3 py-2 text-xs font-semibold text-white"
          >
            查看客户画像
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ReadOnlyMetric label="会员姓名" value={customer.name} />
          <ReadOnlyMetric label="会员等级" value={customer.memberLevel} />
          <ReadOnlyMetric label="会员卡号" value={customer.memberCardNo} />
          <ReadOnlyMetric label="手机" value={customer.memberPhone} />
          <ReadOnlyMetric label="近期维护时间" value={customer.lastMaintenanceAt} wide />
        </div>
      </Card>

      <Popup
        visible={profileOpen}
        onMaskClick={() => setProfileOpen(false)}
        bodyStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" }}
      >
        <section className="max-h-[82vh] overflow-y-auto bg-linen pb-[calc(env(safe-area-inset-bottom)+20px)]">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-snow bg-linen/95 px-5 py-5 backdrop-blur">
            <div>
              <p className="text-xs leading-[18px] text-copper">客户画像</p>
              <h2 className="mt-1 text-xl font-semibold leading-7 text-cedar">{customer.name} · {customer.memberLevel}</h2>
              <p className="mt-1 text-xs leading-[18px] text-clay">{customer.memberCardNo} · {customer.memberPhone}</p>
            </div>
            <button
              type="button"
              onClick={() => setProfileOpen(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-white text-clay ring-1 ring-snow"
              aria-label="关闭客户画像"
            >
              ×
            </button>
          </div>
          <div className="px-5">
            <ProfileDetailSection title="画像标签" groups={profileLabelGroups} />
            <ProfileDetailSection title="行为标签" groups={behaviorLabelGroups} />
          </div>
        </section>
      </Popup>
    </>
  );
}

function ProfileDetailSection({
  title,
  groups,
}: {
  title: string;
  groups: Array<{ title: string; items: Array<{ label: string; value: string }> }>;
}) {
  return (
    <div className="mt-5">
      <h3 className="text-base font-semibold leading-6 text-cedar">{title}</h3>
      <div className="mt-3 space-y-3">
        {groups.map((group) => (
          <div key={group.title} className="rounded-[18px] border border-snow bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold leading-5 text-cedar">{group.title}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {group.items.map((item, index) => (
                <ReadOnlyMetric key={`${group.title}-${item.label}-${item.value}-${index}`} label={item.label} value={item.value} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadOnlyMetric({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-[14px] border border-snow bg-white p-3 ${wide ? "col-span-2 min-[620px]:col-span-1" : ""}`}>
      <p className="text-[11px] leading-4 text-clay">{label}</p>
      <p className="mt-1 text-xs font-semibold leading-[18px] text-cedar">{value}</p>
    </div>
  );
}

function FloatingRecommendationPanel({
  products,
  tags,
  selectedProductIds,
  onToggleProduct,
}: {
  products: Product[];
  tags: string[];
  selectedProductIds: string[];
  onToggleProduct: (id: string) => void;
}) {
  const topProduct = products[0];
  return (
    <Card className="songtsam-mobile-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs text-copper">
            <TrendingUp size={14} />
            Floating Recommendation
          </p>
          <h2 className="mt-1 truncate text-base font-medium">{topProduct.name}</h2>
        </div>
        <Tag color="primary" className="!rounded-[4px]">{recommendScore(topProduct, tags)}%</Tag>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <StatusMetric label="匹配度" value={`${recommendScore(topProduct, tags)}%`} tone="warm" />
        <StatusMetric label="风险" value={tags.includes("怕高反") ? "中" : "低"} tone="gray" />
        <StatusMetric label="推荐" value={`${selectedProductIds.length}`} tone="green" />
      </div>
      <p className="mt-3 text-xs leading-[18px] text-clay/70">推荐依据：{tags.length ? tags.slice(0, 5).join("、") : "暂无标签"}</p>
      <div className="mt-4 space-y-3">
        {products.map((product) => {
          const selected = selectedProductIds.includes(product.id);
          const matchedTags = getProductMatchedTags(product, tags);
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onToggleProduct(product.id)}
              className={`flex w-full items-center gap-3 rounded-[18px] border p-2 text-left transition ${
                selected ? "border-copper bg-slate-50" : "border-snow bg-linen"
              }`}
            >
              <img src={product.imageUrl} alt={product.name} className="h-16 w-20 shrink-0 rounded-[14px] object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium leading-5">{product.name}</span>
                <span className="mt-1 block text-xs text-clay/70">{product.duration} · {recommendScore(product, tags)}% 匹配</span>
                <span className="mt-1 block truncate text-[11px] text-copper">
                  {matchedTags.length ? `命中：${matchedTags.slice(0, 3).join("、")}` : "等待标签命中"}
                </span>
              </span>
              <span className={`grid h-6 w-6 place-items-center rounded-full ${selected ? "bg-copper text-white" : "bg-white text-clay ring-1 ring-snow"}`}>
                {selected ? <Check size={13} /> : <Plus size={13} />}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function StatusMetric({ label, value, tone }: { label: string; value: string; tone: "warm" | "green" | "gray" }) {
  const toneClass = {
    warm: "bg-slate-100 text-copper",
    green: "bg-sage/15 text-sage",
    gray: "bg-linen text-clay",
  }[tone];
  return (
    <div className={`rounded-[14px] px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] leading-4 opacity-75">{label}</p>
      <p className="mt-1 text-sm font-medium leading-5">{value}</p>
    </div>
  );
}

function TagChangeList({ changes }: { changes: TagChange[] }) {
  return (
    <div className="mt-3 space-y-2">
      {changes.length ? (
        changes.map((change) => (
          <div key={change.dimension} className="rounded-[14px] border border-snow bg-linen px-3 py-2.5 text-xs leading-[18px] text-clay/80">
            <span className="text-[#808080]">{change.dimension}：</span>
            <span>{formatTagValues(change.from)}</span>
            <span className="px-1.5 text-copper">→</span>
            <span className="font-medium text-copper">{formatTagValues(change.to)}</span>
          </div>
        ))
      ) : (
        <span className="text-xs leading-[22px] text-[#999]">暂无标签替换</span>
      )}
    </div>
  );
}

function TagSelectorGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const multiple = !title.includes("单选");

  return (
    <div>
      <p className="mb-2 text-xs text-[#808080]">{title}</p>
      <Selector
        multiple={multiple}
        showCheckMark={false}
        value={value}
        options={options.map((option) => ({ label: option, value: option }))}
        onChange={(values) => onChange(multiple ? values.map(String) : values.slice(-1).map(String))}
      />
    </div>
  );
}

function SelectableProductCard({
  product,
  tags = [],
  selected,
  onClick,
}: {
  product: Product;
  tags?: string[];
  selected: boolean;
  onClick: () => void;
}) {
  const matchedTags = getProductMatchedTags(product, tags);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.985 }}
      className={`min-w-[312px] overflow-hidden rounded-[20px] border bg-parchment text-left shadow-soft transition min-[620px]:min-w-[342px] ${
        selected ? "border-copper ring-2 ring-copper/10" : "border-snow"
      }`}
    >
      <div className="relative h-36">
        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <span className={`absolute right-3 top-3 grid h-8 w-8 shrink-0 place-items-center rounded-full backdrop-blur ${
          selected ? "bg-copper text-white" : "bg-white/90 text-copper"
        }`}>
          {selected ? <Check size={16} /> : <Plus size={16} />}
        </span>
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h3 className="text-base font-medium leading-6">{product.name}</h3>
          <p className="mt-1 text-xs opacity-85">{product.duration} · {recommendScore(product, tags)}% 匹配</p>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(matchedTags.length ? matchedTags.slice(0, 4) : product.productTags.slice(0, 3)).map((tag) => (
            <span key={tag} className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] leading-4 text-emerald-700">
              {matchedTags.includes(tag) ? `命中 ${tag}` : tag}
            </span>
          ))}
        </div>
        <p className="text-xs leading-[20px] text-clay/80">{product.reason}</p>
        <p className="mt-3 rounded-[12px] bg-slate-100 px-3 py-2 text-[11px] leading-4 text-copper">{product.altitudeRisk}</p>
      </div>
    </motion.button>
  );
}

function TimelineItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="relative border-l border-copper/20 pl-4">
      <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-copper" />
      <h3 className="text-sm font-medium leading-5">{title}</h3>
      <p className="mt-1 text-xs leading-[18px] text-clay/70">{detail}</p>
    </div>
  );
}

function getCommunicationStatus(answers: CommunicationMapAnswers): CustomerCommunicationStatus {
  if (answers.travelPlan === "没有") return "关系维护型";
  if (answers.travelPlan === "有" && answers.travelTiming === "已确定") return "成交推进型";
  return "需求培育型";
}

function hasPredictionSelection(tags: string[], dimension: PredictionDimension) {
  const optionValues = dimension.options.map((option) => option.value);
  return tags.some((tag) => optionValues.includes(tag));
}

function deriveProfileDemandTags(customer: Customer) {
  const checklistValues = Object.values(customer.profileChecklist)
    .flat()
    .flatMap((field) => [field.label, field.value]);
  const haystack = [
    customer.memberLevel,
    customer.city,
    customer.family,
    customer.gmv,
    customer.lastTrip,
    customer.status,
    customer.summary,
    ...customer.tags,
    ...checklistValues,
    ...customer.orders.flatMap((order) => [order.product, order.feedback, order.amount, order.tripDate]),
  ].join(" ");
  const tags = new Set<string>();

  profileToDemandRules.forEach((rule) => {
    if (rule.sources.some((source) => haystack.includes(source))) {
      rule.demands.forEach((tag) => tags.add(tag));
    }
  });

  if (customer.memberLevel === "金刚") {
    tags.add("3-5万");
  }
  if (!Array.from(tags).some((tag) => ["暑期", "寒假春节", "十一假期", "春秋错峰", "时间未定"].includes(tag))) {
    tags.add("时间未定");
  }
  if (!Array.from(tags).some((tag) => ["3-4天", "5-6天", "7-8天", "9天以上", "天数待确认"].includes(tag))) {
    tags.add("天数待确认");
  }

  return Array.from(tags);
}

function expandDemandTags(tags: string[]) {
  return Array.from(new Set(tags.flatMap((tag) => [tag, ...(demandToProductRules[tag] ?? [])])));
}

function getProductMatchedTags(product: Product, tags: string[]) {
  const expandedTags = expandDemandTags(tags);
  return product.productTags.filter((tag) => expandedTags.includes(tag));
}

function rankProducts(tags: string[]) {
  return [...mockProducts].sort((a, b) => recommendScore(b, tags) - recommendScore(a, tags));
}

function recommendScore(product: Product, tags: string[]) {
  let score = product.score;
  const expandedTags = expandDemandTags(tags);
  const matchedProductTags = product.productTags.filter((tag) => expandedTags.includes(tag));
  score += matchedProductTags.length * 5;
  const joined = `${product.name}${product.audience.join("")}${product.reason}${product.notFor.join("")}`;
  if ((tags.includes("亲子") || tags.includes("亲子家庭") || tags.includes("亲子陪伴")) && joined.includes("亲子")) score += 8;
  if (tags.includes("自然教育") && joined.includes("自然")) score += 6;
  if (tags.includes("慢节奏") && joined.includes("节奏")) score += 7;
  if (tags.includes("酒店偏好") && joined.includes("酒店")) score += 5;
  if (tags.includes("雪山景观") && joined.includes("梅里")) score += 5;
  if (tags.includes("怕高反") && product.notFor.includes("怕高反")) score -= 18;
  if (tags.includes("带老人") && product.notFor.includes("银发客群")) score -= 14;
  if (tags.includes("低龄儿童") && product.notFor.includes("低龄儿童")) score -= 16;
  if (tags.includes("不接受长车程") && product.id === "tibet-custom") score -= 14;
  if ((tags.includes("怕高反") || tags.includes("带老人")) && product.id === "yubeng-hike") score -= 12;
  if (tags.includes("可接受长车程") && product.id === "tibet-custom") score += 7;
  return Math.max(42, Math.min(98, score));
}

function getRemovedTags(preTags: string[], answerTags: string[]) {
  return preTags.filter((tag) => {
    const group = getTagGroup(tag);
    if (!group) return false;
    const hasAnswerInSameGroup = answerTags.some((answerTag) => getTagGroup(answerTag) === group);
    return hasAnswerInSameGroup && !answerTags.includes(tag);
  });
}

function getSalesTagChanges(preTags: string[], salesTags: Record<string, string[]>): TagChange[] {
  return salesTagDimensions
    .map((dimension) => {
      const from = preTags.filter((tag) => dimension.options.includes(tag));
      const to = salesTags[dimension.key] ?? [];
      return { dimension: dimension.title, from, to };
    })
    .filter((change) => change.to.length > 0 && !isSameTagSet(change.from, change.to));
}

function isSameTagSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  return right.every((item) => leftSet.has(item));
}

function formatTagValues(tags: string[]) {
  return tags.length ? tags.join("、") : "未选择";
}

function getTagGroup(tag: string) {
  return Object.entries(tagGroups).find(([, tags]) => tags.includes(tag))?.[0];
}

function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function makeRelativeDate(daysAgo: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function formatFollowRecordTime(date: Date) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.max(0, Math.floor((startOfToday - startOfTarget) / 86400000));
  const pad = (value: number) => String(value).padStart(2, "0");
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  if (diffDays === 0) return `今天 ${time}`;
  if (diffDays <= 10) return `${diffDays}天前`;
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${time}`;
}

function formatConversionOrderTitle(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}月${pad(date.getDate())}日完成转化`;
}
