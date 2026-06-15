import type { Customer } from "../types";

export const mockCustomers: Customer[] = [
  {
    id: "cus-wang",
    name: "王女士",
    memberLevel: "金刚",
    memberCardNo: "ST80001234",
    memberPhone: "13812346728",
    city: "上海",
    family: "夫妻 + 1个8岁孩子 + 父母",
    gmv: "268,000",
    lastTrip: "2024年 香格里拉环线",
    lastMaintenanceAt: "2026-06-10 15:30",
    status: "暑期亲子需求已露出",
    tags: ["高净值家庭", "亲子", "喜欢慢节奏", "重视酒店体验", "关注餐饮", "怕高反", "复购潜力高"],
    profileChecklist: {
      identity: [
        { label: "会员等级", value: "金刚会员" },
        { label: "客户类型", value: "高价值家庭型客户" },
        { label: "推荐人", value: "待补充" },
        { label: "升级状态", value: "升级潜力高" },
      ],
      household: [
        { label: "同行关系", value: "夫妻同行" },
        { label: "儿童信息", value: "1个8岁孩子" },
        { label: "长辈同行", value: "父母同行" },
        { label: "组合预判", value: "三代家庭出行" },
      ],
      consumption: [
        { label: "历史消费", value: "￥268,000" },
        { label: "消费频次", value: "近3年3次松赞相关消费" },
        { label: "预算档位", value: "多在8万以上" },
        { label: "历史偏好", value: "香格里拉与梅里方向" },
      ],
      onlineBehavior: [
        { label: "近期浏览", value: "梅里亲子线" },
        { label: "关注酒店", value: "香格里拉林卡" },
        { label: "内容兴趣", value: "暑期自然教育" },
        { label: "历史咨询", value: "老人孩子是否频繁换酒店" },
      ],
      interactionRisk: [
        { label: "高原顾虑", value: "怕高反" },
        { label: "产品禁忌", value: "不宜推荐高强度徒步" },
        { label: "转场风险", value: "不宜连续长车程" },
        { label: "服务偏好", value: "关注餐饮和酒店服务" },
      ],
      residence: [
        { label: "常驻城市", value: "上海" },
        { label: "区域客群", value: "华东家庭客群" },
        { label: "出行窗口", value: "暑期明显" },
      ],
    },
    summary:
      "王女士属于高价值家庭型客户，过去对松赞酒店体验反馈较好，偏好慢节奏、舒适型产品。由于客户家庭中有老人和孩子，不建议推荐高强度徒步和连续长车程产品。建议优先推荐梅里轻奢慢行、香格里拉深度体验、亲子自然教育主题产品。",
    orders: [
      { year: "2024", tripDate: "2024/07/12 - 2024/07/17", product: "香格里拉环线 6天5晚", amount: "¥118,000", feedback: "酒店景观和管家服务评价高" },
      { year: "2023", tripDate: "2023/08/06 - 2023/08/09", product: "松赞林卡假期 4天3晚", amount: "¥86,000", feedback: "偏好慢节奏和亲子活动" },
      { year: "2022", tripDate: "2022/11/18", product: "会员私享活动", amount: "¥64,000", feedback: "关注餐饮和文化体验" },
    ],
  },
  {
    id: "cus-zhang",
    name: "张总",
    memberLevel: "金刚",
    memberCardNo: "ST80004519",
    memberPhone: "13957282186",
    city: "杭州",
    family: "夫妻同行，偶尔企业家朋友小团",
    gmv: "486,000",
    lastTrip: "2023年 梅里雪山私享线",
    lastMaintenanceAt: "2026-04-27 11:20",
    status: "45天未维护，6月出行倾向强",
    tags: ["高净值企业家", "深度文化", "重视私密性", "偏好定制", "复购稳定", "关注司导水平"],
    profileChecklist: {
      identity: [
        { label: "会员等级", value: "金刚会员" },
        { label: "客户类型", value: "高净值企业家" },
        { label: "复购状态", value: "稳定复购客户" },
        { label: "转介绍潜力", value: "企业家圈层" },
      ],
      household: [
        { label: "同行关系", value: "夫妻同行" },
        { label: "小团场景", value: "企业家朋友小团" },
        { label: "同行敏感点", value: "客群质量" },
      ],
      consumption: [
        { label: "历史消费", value: "￥486,000" },
        { label: "消费频次", value: "过去3年均有高客单出行" },
        { label: "产品偏好", value: "私享定制" },
        { label: "价格接受度", value: "接受长线高端方案" },
      ],
      onlineBehavior: [
        { label: "触达内容", value: "梅里夏季内容" },
        { label: "历史关注", value: "滇藏线" },
        { label: "内容风险", value: "大众化清单反应弱" },
      ],
      interactionRisk: [
        { label: "维护风险", value: "45天未维护" },
        { label: "服务关注", value: "私密性" },
        { label: "协同关注", value: "司导水平" },
        { label: "行程禁忌", value: "不喜欢赶路" },
      ],
      residence: [
        { label: "常驻城市", value: "杭州" },
        { label: "区域客群", value: "华东高净值商务客群" },
        { label: "出行窗口", value: "6月倾向强" },
      ],
    },
    summary:
      "张总是高净值企业家型复购客户，对松赞品牌和司导服务信任度较高，更看重私密性、文化深度和行程掌控感。过去3年均在6月前后出行，近期适合以梅里雪山夏季内容或滇藏线高端定制做轻触达，不宜发送过于大众化的产品清单。",
    orders: [
      { year: "2023", tripDate: "2023/06/15 - 2023/06/20", product: "梅里雪山私享线 6天5晚", amount: "¥168,000", feedback: "对司导专业度和私密安排评价高" },
      { year: "2022", tripDate: "2022/09/20 - 2022/09/28", product: "滇藏线高端定制 9天8晚", amount: "¥218,000", feedback: "喜欢深度文化内容，不喜欢赶路" },
      { year: "2021", tripDate: "2021/06/10 - 2021/06/14", product: "香格里拉企业家小团", amount: "¥100,000", feedback: "对同行客群质量敏感" },
    ],
  },
  {
    id: "cus-chen",
    name: "陈先生",
    memberLevel: "雪莲",
    memberCardNo: "ST80007862",
    memberPhone: "18621869035",
    city: "深圳",
    family: "夫妻 + 摄影朋友2人",
    gmv: "156,000",
    lastTrip: "2024年 林芝波密春季线",
    lastMaintenanceAt: "2026-06-08 18:10",
    status: "国庆滇藏定制已咨询，等待报价",
    tags: ["摄影", "户外轻度", "关注景观", "时间敏感", "高转化", "可接受长线"],
    profileChecklist: {
      identity: [
        { label: "会员等级", value: "雪莲会员" },
        { label: "客户类型", value: "景观摄影驱动客户" },
        { label: "转化状态", value: "高转化咨询客户" },
      ],
      household: [
        { label: "同行关系", value: "夫妻同行" },
        { label: "同行人员", value: "摄影朋友2人" },
        { label: "组合预判", value: "朋友小团出行" },
      ],
      consumption: [
        { label: "历史消费", value: "￥156,000" },
        { label: "消费频次", value: "近2年2次松赞出行" },
        { label: "体验反馈", value: "摄影点位和时间安排满意" },
        { label: "当前状态", value: "等待国庆报价" },
      ],
      onlineBehavior: [
        { label: "近期咨询", value: "国庆滇藏定制" },
        { label: "内容兴趣", value: "林芝波密季节景观" },
        { label: "配置关注", value: "车辆与司导" },
      ],
      interactionRisk: [
        { label: "时间风险", value: "时间敏感" },
        { label: "档期风险", value: "国庆档期紧张" },
        { label: "体力接受度", value: "可接受轻户外" },
        { label: "沟通重点", value: "每日拍摄窗口" },
      ],
      residence: [
        { label: "常驻城市", value: "深圳" },
        { label: "区域客群", value: "华南摄影客群" },
        { label: "出行窗口", value: "长假明显" },
      ],
    },
    summary:
      "陈先生属于景观和摄影驱动型客户，对雪山、峡谷、林芝波密季节性景观兴趣强，可接受一定车程和轻户外，但对国庆档期和车辆安排敏感。当前应尽快补充滇藏线高端定制报价，并明确酒店库存、司导配置和每日拍摄窗口。",
    orders: [
      { year: "2024", tripDate: "2024/03/24 - 2024/03/30", product: "林芝波密春季线 7天6晚", amount: "¥96,000", feedback: "对摄影点位和时间安排满意" },
      { year: "2023", tripDate: "2023/10/02 - 2023/10/06", product: "香格里拉深度体验 5天4晚", amount: "¥60,000", feedback: "希望下一次行程更深度" },
    ],
  },
];

export const followUpCustomers = [
  { name: "张总", reason: "45天未维护，过去3年均在6月出行", level: "金刚", action: "发送梅里雪山夏季私享内容" },
  { name: "王女士", reason: "孩子暑假时间已确认，近期浏览梅里产品", level: "金刚", action: "推荐亲子自然探索方案" },
  { name: "陈先生", reason: "国庆滇藏定制咨询后未报价", level: "雪莲", action: "补充车辆与司导方案" },
];
