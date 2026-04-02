import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCT_CATALOG, SALES_POLICY_SUMMARY } from "./knowledge-base.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

async function loadEnvFile() {
  try {
    const text = await readFile(join(__dirname, ".env"), "utf8");
    text.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) return;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch {
    // .env is optional
  }
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function jsonResponse(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function extractOutputText(response) {
  if (!response?.output) return "";
  const chunks = [];
  for (const item of response.output) {
    if (item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

async function callResponsesAPI(body) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

async function parseUserNeeds(messages) {
  const conversationText = messages
    .map((message) => `${message.role === "assistant" ? "助手" : "销售"}: ${message.content}`)
    .join("\n");

  const response = await callResponsesAPI({
    model: MODEL,
    instructions: [
      "你是一个中文旅行销售需求提取助手。",
      "请从对话里提取需求，并且只输出 JSON。",
      "如果不确定，就把字段设为 null，不要猜测过度。",
      "JSON keys: destination, month, date_text, nights, days, travelers, adults, children, elders, foreign_guests, product_form, preference, budget, customization, customer_summary."
    ].join(" "),
    input: [
      { role: "user", content: `请从下面对话中提取需求并返回 JSON。\n${conversationText}` }
    ],
    text: {
      format: { type: "json_object" }
    }
  });

  const text = extractOutputText(response);
  return JSON.parse(text);
}

function seasonContext(destination, month, dateText) {
  const holidayText = dateText || "";
  if (/春节|新年|过年|元旦|跨年|五一|劳动节|国庆|十一|黄金周|中秋/.test(holidayText)) {
    return { label: "节日", multiplier: 1.12 };
  }
  if (destination === "glacier" && [3, 4].includes(month)) return { label: "旺季", multiplier: 1.08 };
  if (destination === "glacier" && [11, 12, 1, 2].includes(month)) return { label: "淡季", multiplier: 0.95 };
  if (destination === "lhasa" && [4, 5, 6, 7, 8, 9, 10].includes(month)) return { label: "旺季", multiplier: 1.05 };
  if (destination === "lhasa" && [11, 12, 1, 2].includes(month)) return { label: "淡季", multiplier: 0.96 };
  if (destination === "meili" && [1, 2, 10, 11].includes(month)) return { label: "旺季", multiplier: 1.03 };
  if (destination === "puer" && [6, 7, 8].includes(month)) return { label: "淡季", multiplier: 0.96 };
  if (destination === "puer" && [10, 11, 12, 1, 2].includes(month)) return { label: "旺季", multiplier: 1.03 };
  if (destination === "shangri-la" && [7, 8, 10].includes(month)) return { label: "旺季", multiplier: 1.04 };
  return { label: "平季", multiplier: 1 };
}

function scoreProduct(product, needs) {
  let score = 60;
  const reasons = [];
  const risks = [...product.cautions];

  if (needs.destination) {
    if (product.destination !== needs.destination) return null;
    score += 20;
    reasons.push("目的地方向吻合。");
    if (product.destinationPriority === "core") {
      score += 6;
      reasons.push("属于该目的地下更核心的推荐线。");
    } else {
      score -= 6;
      risks.push("这条更偏边界相关线，适合作为备选。");
    }
  }

  if (needs.product_form) {
    if (!product.forms.includes(needs.product_form)) return null;
    score += 12;
    reasons.push(`产品形态符合客户想要的${needs.product_form}。`);
  }

  if (needs.nights) {
    const gap = Math.abs(product.nights - needs.nights);
    if (gap === 0) {
      score += 14;
      reasons.push("晚数匹配。");
    } else if (gap === 1) {
      score += 6;
      reasons.push("晚数接近。");
    } else if (gap >= 3) {
      score -= 12;
      risks.push("晚数差距较大，通常需要变形或定制。");
    }
  }

  if (needs.month && !product.seasonMonths.includes(needs.month)) {
    score -= 14;
    risks.push("客户出行月份不是这条线的强窗口。");
  }

  if (needs.preference === "轻松度假" && product.intensity === "light") score += 10;
  if (needs.preference === "自然风景" && product.tags.includes("自然")) score += 8;
  if (needs.preference === "人文寺院" && product.tags.includes("人文")) score += 8;
  if (needs.preference === "美食茶咖" && (product.tags.includes("咖啡") || product.tags.includes("茶文化") || product.tags.includes("美食"))) score += 10;

  if (needs.children) {
    if (product.familyFriendly) {
      score += 8;
      reasons.push("对儿童同行更友好。");
    } else {
      score -= 12;
      risks.push("儿童同行体验可能不够理想。");
    }
  }

  if (needs.elders) {
    if (product.elderFriendly) {
      score += 8;
      reasons.push("老人同行更容易承接。");
    } else {
      score -= 12;
      risks.push("老人同行可能受强度和高海拔影响。");
    }
  }

  return {
    ...product,
    score: Math.max(0, Math.min(100, score)),
    reasons: [...new Set(reasons)].slice(0, 4),
    risks: [...new Set(risks)].slice(0, 4)
  };
}

function estimatePrice(product, needs) {
  const form = needs.product_form && product.forms.includes(needs.product_form)
    ? needs.product_form
    : product.forms[0];
  const adultUnit = product.pricing[form];
  const season = seasonContext(product.destination, needs.month, needs.date_text);
  const adjustedAdult = Math.round(adultUnit * season.multiplier);
  const adults = needs.adults || needs.travelers || 2;
  const children = needs.children || 0;

  let totalMin = adjustedAdult * adults;
  let totalMax = totalMin;
  let note = `${season.label}预估。`;

  if (form === "自由行" && adults === 1 && children === 0) {
    totalMin = adjustedAdult * 2;
    totalMax = totalMin;
    note += " 自由行单人通常按 1 套承接。";
  }

  if (form === "自由行" && adults >= 4 && children === 0) {
    totalMin = Math.round(adjustedAdult * adults * 0.9);
    totalMax = totalMin;
    note += " 已按多人同行折扣简化估算。";
  }

  if (form === "私享管家" && adults === 1 && children === 0) {
    totalMin = Math.round(adjustedAdult * 2 * 0.8);
    totalMax = totalMin;
    note += " 单人私享按 0.8 套简化估算。";
  }

  if (form === "私享管家" && adults === 3 && children === 0) {
    totalMin = Math.round(adjustedAdult * 2 * 1.5);
    totalMax = Math.round(adjustedAdult * 2 * 1.8);
    note += " 3 位成人私享会因资源使用方式不同形成价格区间。";
  }

  if (children > 0) {
    const low = form === "主题团" ? 0.5 : 0.4;
    const high = form === "私享管家" ? 0.8 : 0.7;
    totalMin += Math.round(adjustedAdult * children * low);
    totalMax += Math.round(adjustedAdult * children * high);
    note += " 儿童年龄未明确，按常见儿童折扣区间估算。";
  }

  return {
    form,
    seasonLabel: season.label,
    unitPrice: adjustedAdult,
    totalMin,
    totalMax,
    note
  };
}

function rankProducts(needs) {
  return PRODUCT_CATALOG
    .map((product) => scoreProduct(product, needs))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((product) => ({
      ...product,
      estimate: estimatePrice(product, needs)
    }));
}

async function draftReply(messages, needs, rankedProducts) {
  const payload = {
    customer_summary: needs.customer_summary || "",
    parsed_needs: needs,
    ranked_products: rankedProducts.map((product) => ({
      name: product.name,
      line: product.line,
      route: product.route,
      nights: product.nights,
      forms: product.forms,
      score: product.score,
      description: product.description,
      itinerary: product.itinerary,
      reasons: product.reasons,
      risks: product.risks,
      estimate: product.estimate
    })),
    policy_summary: SALES_POLICY_SUMMARY
  };

  const requiredMissing = [];
  if (!needs.destination) requiredMissing.push("目的地");
  if (!needs.nights) requiredMissing.push("晚数");
  if (!needs.travelers && !needs.adults) requiredMissing.push("人数");

  const response = await callResponsesAPI({
    model: MODEL,
    instructions: [
      "你是松赞销售 AI 助手，用中文回复。",
      "你要基于提供的结构化事实来回答，不要编造不存在的产品。",
      "如果关键信息缺失，只做简洁追问，不要直接乱推荐。",
      "如果信息足够，请给出销售可直接使用的自然语言回复。",
      "回复要包含：需求理解、推荐顺序、每条产品的简短理由、价格说明、需要继续确认的点。",
      "价格必须明确写明是预估价，最终要以正式核价为准。"
    ].join(" "),
    input: [
      {
        role: "user",
        content: `请根据以下 JSON 生成给销售看的回复。缺失关键信息：${requiredMissing.join("、") || "无"}。\nJSON:\n${JSON.stringify(payload, null, 2)}`
      }
    ]
  });

  return extractOutputText(response);
}

async function handleChat(req, res) {
  if (!OPENAI_API_KEY) {
    return jsonResponse(res, 500, {
      error: "Missing OPENAI_API_KEY. Please set it before starting the AI server."
    });
  }

  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
  });

  req.on("end", async () => {
    try {
      const { messages } = JSON.parse(raw || "{}");
      if (!Array.isArray(messages) || messages.length === 0) {
        return jsonResponse(res, 400, { error: "messages is required" });
      }

      const needs = await parseUserNeeds(messages);
      const rankedProducts = rankProducts(needs);
      const reply = await draftReply(messages, needs, rankedProducts);

      return jsonResponse(res, 200, {
        reply,
        needs,
        rankedProducts
      });
    } catch (error) {
      return jsonResponse(res, 500, { error: error.message });
    }
  });
}

async function serveFile(res, pathname) {
  const target = pathname === "/" ? "/index.html" : pathname;
  const filePath = join(__dirname, target.replace(/^\/+/, ""));
  const data = await readFile(filePath);
  const contentType = MIME_TYPES[extname(filePath)] || "text/plain; charset=utf-8";
  res.writeHead(200, { "Content-Type": contentType });
  res.end(data);
}

await loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "POST" && url.pathname === "/api/ai-chat") {
    return handleChat(req, res);
  }

  if (req.method === "GET" && url.pathname === "/ai") {
    return serveFile(res, "/ai.html");
  }

  if (req.method === "GET") {
    try {
      return await serveFile(res, url.pathname);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
    }
  }

  res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`AI server running at http://localhost:${PORT}/ai`);
});
