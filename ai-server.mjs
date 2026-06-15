import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { constants, createHash, publicEncrypt } from "node:crypto";
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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function maskToken(token) {
  if (!token) return "";
  if (token.length <= 12) return "***";
  return `${token.slice(0, 6)}...${token.slice(-6)}`;
}

function summarizePayloadShape(payload) {
  const data = payload?.data;
  const retVal = payload?.data?.retVal ?? payload?.retVal ?? payload?.result?.retVal;
  const result = payload?.result;
  return {
    topLevelKeys: payload && typeof payload === "object" ? Object.keys(payload) : [],
    code: payload?.code ?? payload?.retCode ?? payload?.status,
    message: payload?.message ?? payload?.msg ?? payload?.retMsg,
    dataKeys: data && typeof data === "object" ? Object.keys(data) : [],
    resultType: Array.isArray(result) ? "array" : typeof result,
    resultKeys: result && typeof result === "object" ? Object.keys(result) : [],
    retValType: Array.isArray(retVal) ? "array" : typeof retVal,
    retValKeys: retVal && typeof retVal === "object" ? Object.keys(retVal) : []
  };
}

function findAccessToken(value) {
  if (!value || typeof value !== "object") return "";

  const preferredKeys = ["access_token", "accessToken", "token", "jwtToken", "idToken"];
  for (const key of preferredKeys) {
    const token = value[key];
    if (typeof token === "string" && token.length > 20) return token;
  }

  for (const [key, child] of Object.entries(value)) {
    if (/refresh|password/i.test(key)) continue;
    const token = findAccessToken(child);
    if (token) return token;
  }

  return "";
}

function extractBearerToken(value) {
  const match = String(value || "").match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

const SONGTSAM_LOGIN_PUBLIC_KEY = [
  "-----BEGIN PUBLIC KEY-----",
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAgKd5XMG4BjBvL9wOG3OtwgYDrQmexZJs+ZEhWDuAsL2AXH59WbkPnGLLbaoLA0nKIr5ouNQiD8OKgIT0SY+xh8PKCASs43aKF6ka/tosRsLViN9YN8F3RMQIEergDmJ3+dB5zzQ1oaw3MHWRBO9zu3mHyulnUiS8gkU4dn1HPOctjXWP6FXNv7pYfz0uDS5zQTaSf3L8Qq9Zc1oadKiC8b45dUhAkvgXCvyuy2kGU8Iqgw/n9mgv6pJunty/EN6CSgPFqoH9SrNyw+uuFO/W+7AHaQRGPYBNw+lc3Ht5lOFeDKhthqb5ITfbKgk0zEuPhpDpPeuTzGGtGmx2mTertQIDAQAB",
  "-----END PUBLIC KEY-----"
].join("\n");

function isProbablyEncryptedPassword(password) {
  return /^[A-Za-z0-9+/=]{300,}$/.test(password);
}

function encryptSongtsamPassword(rawPassword) {
  const md5Password = createHash("md5").update(rawPassword).digest("hex");
  return publicEncrypt(
    {
      key: SONGTSAM_LOGIN_PUBLIC_KEY,
      padding: constants.RSA_PKCS1_PADDING
    },
    Buffer.from(md5Password, "utf8")
  ).toString("base64");
}

function normalizeSongtsamLoginPassword(password) {
  const mode = String(SONGTSAM_PASSWORD_MODE || "auto").toLowerCase();
  if (mode === "encrypted") return password;
  if (mode === "plain") return encryptSongtsamPassword(password);
  return isProbablyEncryptedPassword(password) ? password : encryptSongtsamPassword(password);
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

function extractChatCompletionText(response) {
  return response?.choices?.[0]?.message?.content?.trim?.() || "";
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[|｜\-_/]/g, "");
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function parseDateRange(needs) {
  const now = new Date();
  const year = now.getFullYear();

  const explicitDate = String(needs.date_text || "").trim();
  if (explicitDate) {
    const isoMatch = explicitDate.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
    if (isoMatch) {
      const begin = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
      const end = new Date(begin);
      end.setDate(end.getDate() + 14);
      return { beginDate: formatDateOnly(begin), endDate: formatDateOnly(end) };
    }

    const monthDayMatch = explicitDate.match(/(\d{1,2})\s*[月/-]\s*(\d{1,2})/);
    if (monthDayMatch) {
      const begin = new Date(year, Number(monthDayMatch[1]) - 1, Number(monthDayMatch[2]));
      const end = new Date(begin);
      end.setDate(end.getDate() + 14);
      return { beginDate: formatDateOnly(begin), endDate: formatDateOnly(end) };
    }

    const shortDayMatch = explicitDate.match(/(\d{1,2})日/);
    if (shortDayMatch && needs.month) {
      const begin = new Date(year, Number(needs.month) - 1, Number(shortDayMatch[1]));
      const end = new Date(begin);
      end.setDate(end.getDate() + 14);
      return { beginDate: formatDateOnly(begin), endDate: formatDateOnly(end) };
    }
  }

  if (needs.month) {
    const begin = new Date(year, Number(needs.month) - 1, 1);
    const end = new Date(year, Number(needs.month), 0);
    return { beginDate: formatDateOnly(begin), endDate: formatDateOnly(end) };
  }

  const begin = new Date(now);
  const end = new Date(now);
  end.setDate(end.getDate() + 60);
  return { beginDate: formatDateOnly(begin), endDate: formatDateOnly(end) };
}

async function callModelAPI({ instructions, input, jsonMode = false }) {
  if (MODEL_PROVIDER === "zhipu") {
    const messages = [];
    if (instructions) {
      messages.push({ role: "system", content: instructions });
    }
    for (const item of input) {
      const content = typeof item.content === "string"
        ? item.content
        : Array.isArray(item.content)
          ? item.content.map((part) => part.text || "").join("\n")
          : String(item.content || "");
      messages.push({ role: item.role, content });
    }

    const response = await fetch(`${MODEL_BASE_URL.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.2,
        response_format: jsonMode ? { type: "json_object" } : undefined
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Model API error ${response.status}: ${errorText}`);
    }

    const payload = await response.json();
    return extractChatCompletionText(payload);
  }

  const response = await fetch(`${MODEL_BASE_URL.replace(/\/+$/, "")}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      instructions,
      input,
      ...(jsonMode ? { text: { format: { type: "json_object" } } } : {})
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Model API error ${response.status}: ${errorText}`);
  }

  const payload = await response.json();
  return extractOutputText(payload);
}

async function callSongtsamTravelGroupAPI(body) {
  const url = `${SONGTSAM_GDS_BASE_URL}/product-journey/bks/travelGroupProvider/listTravelGroupForOrder?firstResult=0&pageSize=100&unitCode=${encodeURIComponent(SONGTSAM_UNIT_CODE)}`;
  const authorization = await getSongtsamAuthorizationHeader();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authorization
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Songtsam GDS error ${response.status}: ${errorText}`);
  }

  return response.json();
}

function normalizeTokenTtl(retVal) {
  const rawSeconds = Number(retVal?.expires_in || retVal?.expiresIn || retVal?.expire_in);
  if (Number.isFinite(rawSeconds) && rawSeconds > 0) return Math.max(60_000, (rawSeconds - 60) * 1000);

  const absoluteTime = retVal?.expireTime || retVal?.expiresAt || retVal?.expire_at;
  if (absoluteTime) {
    const delta = new Date(absoluteTime).getTime() - Date.now() - 60_000;
    if (Number.isFinite(delta) && delta > 0) return delta;
  }

  return SONGTSAM_TOKEN_TTL_MS;
}

async function loginSongtsamSSO() {
  if (!SONGTSAM_USER_CODE || !SONGTSAM_PASSWORD) {
    throw new Error("Missing SONGTSAM_USER_CODE or SONGTSAM_PASSWORD for loginSSO.");
  }

  const response = await fetch(`${SONGTSAM_UC_BASE_URL.replace(/\/+$/, "")}/uc-web/v2/password/loginSSO`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      orgCode: SONGTSAM_ORG_CODE,
      userCode: SONGTSAM_USER_CODE,
      password: normalizeSongtsamLoginPassword(SONGTSAM_PASSWORD)
    })
  });

  const payload = await response.json().catch(async () => ({ errorText: await response.text() }));
  if (!response.ok) {
    throw new Error(`Songtsam loginSSO error ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`);
  }

  const retVal = payload?.data?.retVal ?? payload?.retVal ?? payload?.result?.retVal;
  const authorizationToken = extractBearerToken(response.headers.get("authorization"));
  const accessToken =
    authorizationToken ||
    (typeof retVal === "string" ? retVal : "") ||
    retVal?.access_token ||
    retVal?.accessToken ||
    retVal?.token ||
    payload?.data?.access_token ||
    payload?.data?.accessToken ||
    payload?.result?.access_token ||
    payload?.result?.accessToken ||
    payload?.result?.token ||
    payload?.result?.tokenInfo?.access_token ||
    payload?.result?.tokenInfo?.accessToken ||
    payload?.access_token ||
    payload?.accessToken ||
    findAccessToken(payload);
  if (!accessToken) {
    throw new Error(`Songtsam loginSSO response missing access token: ${JSON.stringify(summarizePayloadShape(payload))}`);
  }

  return {
    accessToken,
    source: "loginSSO",
    expiresAt: Date.now() + normalizeTokenTtl(retVal)
  };
}

let songtsamTokenCache = null;

async function getSongtsamAccessToken({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && songtsamTokenCache?.accessToken && songtsamTokenCache.expiresAt > now) {
    return songtsamTokenCache;
  }

  if (SONGTSAM_USER_CODE && SONGTSAM_PASSWORD) {
    songtsamTokenCache = await loginSongtsamSSO();
    return songtsamTokenCache;
  }

  if (SONGTSAM_AUTH_TOKEN) {
    const accessToken = SONGTSAM_AUTH_TOKEN.replace(/^Bearer\s+/i, "");
    songtsamTokenCache = {
      accessToken,
      source: "SONGTSAM_AUTH_TOKEN",
      expiresAt: now + SONGTSAM_TOKEN_TTL_MS
    };
    return songtsamTokenCache;
  }

  throw new Error("Missing Songtsam auth config. Set SONGTSAM_USER_CODE and SONGTSAM_PASSWORD, or SONGTSAM_AUTH_TOKEN.");
}

async function getSongtsamAuthorizationHeader(options) {
  const token = await getSongtsamAccessToken(options);
  return `Bearer ${token.accessToken}`;
}

function hasSongtsamAuthConfig() {
  return Boolean((SONGTSAM_USER_CODE && SONGTSAM_PASSWORD) || SONGTSAM_AUTH_TOKEN);
}

async function parseUserNeeds(messages) {
  const conversationText = messages
    .map((message) => `${message.role === "assistant" ? "助手" : "销售"}: ${message.content}`)
    .join("\n");

  const text = await callModelAPI({
    instructions: [
      "你是一个中文旅行销售需求提取助手。",
      "请从对话里提取需求，并且只输出 JSON。",
      "如果不确定，就把字段设为 null，不要猜测过度。",
      "JSON keys: destination, month, date_text, nights, days, travelers, adults, children, elders, foreign_guests, product_form, preference, budget, customization, customer_summary."
    ].join(" "),
    input: [
      { role: "user", content: `请从下面对话中提取需求并返回 JSON。\n${conversationText}` }
    ],
    jsonMode: true
  });
  return normalizeNeeds(JSON.parse(text), messages);
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeNeeds(needs, messages) {
  const normalized = { ...needs };
  const allText = messages.map((message) => message.content || "").join("\n");

  const destinationText = String(needs.destination || "");
  const destinationMap = [
    { key: "glacier", words: ["glacier", "林芝", "冰川", "波密", "南迦巴瓦", "来古", "墨脱"] },
    { key: "lhasa", words: ["lhasa", "拉萨", "巴松措", "布达拉", "日喀则"] },
    { key: "meili", words: ["meili", "梅里", "三江", "丙中洛", "茨中", "奔子栏"] },
    { key: "shangri-la", words: ["shangri-la", "香格里拉", "亚丁", "丽江", "塔城"] },
    { key: "puer", words: ["puer", "普洱", "昆明", "景迈", "滇南"] }
  ];
  const destinationHit = destinationMap.find((item) =>
    item.words.some((word) => destinationText.includes(word) || allText.includes(word))
  );
  if (destinationHit) normalized.destination = destinationHit.key;

  normalized.month = normalizeNumber(needs.month);
  normalized.nights = normalizeNumber(needs.nights);
  normalized.days = normalizeNumber(needs.days);
  normalized.travelers = normalizeNumber(needs.travelers);
  normalized.adults = normalizeNumber(needs.adults);
  normalized.children = normalizeNumber(needs.children);

  if (!normalized.nights && normalized.days && normalized.days > 1) {
    normalized.nights = normalized.days - 1;
  }
  if (!normalized.days && normalized.nights) {
    normalized.days = normalized.nights + 1;
  }
  if (!normalized.travelers && normalized.adults) {
    normalized.travelers = normalized.adults + (normalized.children || 0);
  }

  const formText = String(needs.product_form || "");
  if (/自由行/.test(formText)) normalized.product_form = "自由行";
  if (/私享/.test(formText)) normalized.product_form = "私享管家";
  if (/主题团|拼团|跟团/.test(formText)) normalized.product_form = "主题团";

  const customizationText = `${needs.customization || ""}\n${needs.preference || ""}\n${allText}`;
  if (/接受轻微变形|接受标品变形|可以变形|可变形|轻微变形|标品变形/.test(customizationText)) {
    normalized.customization = "接受轻微变形";
  } else if (/定制/.test(customizationText)) {
    normalized.customization = "深度定制";
  }

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "";
  const priorAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant")?.content || "";
  if (/^(接受|可以|行|好的|好)$/.test(String(latestUserMessage).trim()) && /轻微变形|标品变形/.test(priorAssistantMessage)) {
    normalized.customization = "接受轻微变形";
  }

  return normalized;
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
    const acceptsVariation = needs.customization === "接受轻微变形";
    if (gap === 0) {
      score += 14;
      reasons.push("晚数匹配。");
    } else if (gap === 1) {
      score += acceptsVariation ? 10 : 6;
      reasons.push(acceptsVariation ? "客户接受标品变形，晚数可做轻微调整。" : "晚数接近。");
    } else if (acceptsVariation && gap === 2) {
      score += 4;
      reasons.push("客户接受标品变形，这条可作为相近晚数方案。");
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
  const exact = PRODUCT_CATALOG
    .map((product) => scoreProduct(product, needs))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((product) => ({
      ...product,
      estimate: estimatePrice(product, needs)
    }));

  if (exact.length) return exact;

  if (!needs.destination) return exact;

  return PRODUCT_CATALOG
    .filter((product) => product.destination === needs.destination)
    .sort((a, b) => {
      const nightGapA = needs.nights ? Math.abs(a.nights - needs.nights) : 0;
      const nightGapB = needs.nights ? Math.abs(b.nights - needs.nights) : 0;
      if (nightGapA !== nightGapB) return nightGapA - nightGapB;
      if ((a.destinationPriority || "") !== (b.destinationPriority || "")) {
        return a.destinationPriority === "core" ? -1 : 1;
      }
      return a.nights - b.nights;
    })
    .slice(0, 3)
    .map((product) => ({
      ...product,
      score: 58,
      reasons: ["同目的地下更接近客户晚数，可作为相近方案。"],
      risks: [...product.cautions],
      estimate: estimatePrice(product, needs)
    }));
}

function buildTravelGroupQuery(needs, title) {
  const { beginDate, endDate } = parseDateRange(needs);
  const begin = new Date(`${beginDate}T00:00:00+08:00`);
  const end = new Date(`${endDate}T00:00:00+08:00`);

  return {
    firstResult: 0,
    pageSize: 100,
    ota: "DIRECT",
    otaChannel: "CRS",
    category: "",
    categorySub: "",
    companyCode: "",
    companyLevel: "",
    gcLevel: "001",
    itineraryDay: needs.days || null,
    rendezvous: "",
    title,
    travelGroupCode: "",
    travelType: "",
    stas: "I",
    findAll: false,
    beginAndEndDate: [begin.toISOString(), end.toISOString()],
    beginDate,
    endDate
  };
}

function mapLiveGroup(row) {
  return {
    travelGroupCode: row.travelGroupCode,
    travelType: row.travelType,
    travelTypeDesc: row.travelTypeDesc,
    itineraryDesc: row.itineraryDesc,
    categorySubDesc: row.categorySubDesc,
    businessType: row.categorySubDesc || row.categoryDesc || "",
    groupBeginDate: row.groupBeginDate,
    groupEndDate: row.groupEndDate,
    priceModelDesc: row.priceModelDesc,
    startingPrice: Number(row.startingPrice || 0),
    productNum: Number(row.productNum || 0),
    soldNum: Number(row.soldNum || 0),
    saleNum: Number(row.saleNum || 0)
  };
}

function buildLiveQueryTerms(product) {
  const directTerms = uniq([
    ...(product.liveMatchKeywords || []),
    product.name
  ]);

  const fallbackTerms = uniq([
    product.line,
    ...(product.destinations || []).slice(0, 2)
  ]);

  return { directTerms, fallbackTerms };
}

function groupMatchesProduct(group, product, needs) {
  const rawText = `${group.travelTypeDesc || ""} ${group.itineraryDesc || ""} ${group.businessType || ""}`;
  const normalized = normalizeText(rawText);
  const directKeywords = uniq([...(product.liveMatchKeywords || []), product.name]).map(normalizeText);
  const fallbackKeywords = uniq([product.line, ...(product.destinations || [])]).map(normalizeText);

  const keywordHit = directKeywords.some((keyword) => normalized.includes(keyword));
  const fallbackHit = fallbackKeywords.some((keyword) => normalized.includes(keyword));
  if (!keywordHit && !fallbackHit) return false;

  if (needs.product_form) {
    const formText = `${group.businessType} ${group.travelTypeDesc}`.replace(/\s+/g, "");
    if (!formText.includes(needs.product_form)) {
      return false;
    }
  }

  if (needs.nights) {
    const days = needs.days || needs.nights + 1;
    const nightText = `${needs.nights}晚${days}天`;
    const compact = rawText.replace(/\s+/g, "");
    if (!compact.includes(nightText) && !compact.includes(`${needs.nights}晚`) && !compact.includes(`${days}天`)) {
      return false;
    }
  }

  return true;
}

async function queryTravelGroupsByTitle({ title, needs }) {
  const payload = await callSongtsamTravelGroupAPI(buildTravelGroupQuery(needs, title));
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows.map(mapLiveGroup);
}

async function attachLiveGroups(products, needs) {
  if (!hasSongtsamAuthConfig()) {
    return products.map((product) => ({
      ...product,
      liveGroups: [],
      liveQueryEnabled: false
    }));
  }

  const enriched = [];
  for (const product of products) {
    const { directTerms, fallbackTerms } = buildLiveQueryTerms(product);
    const directResults = await Promise.all(
      directTerms.map((keyword) => queryTravelGroupsByTitle({ title: keyword, needs }))
    );

    const merged = new Map();
    directResults.flat().forEach((group) => {
      if (!groupMatchesProduct(group, product, needs)) return;
      if (group.saleNum <= 0) return;
      merged.set(group.travelGroupCode, group);
    });

    if (merged.size === 0 && fallbackTerms.length) {
      const fallbackResults = await Promise.all(
        fallbackTerms.map((keyword) => queryTravelGroupsByTitle({ title: keyword, needs }))
      );

      fallbackResults.flat().forEach((group) => {
        if (!groupMatchesProduct(group, product, needs)) return;
        if (group.saleNum <= 0) return;
        merged.set(group.travelGroupCode, group);
      });
    }

    const liveGroups = [...merged.values()].sort((a, b) => {
      if (a.groupBeginDate === b.groupBeginDate) {
        return a.travelGroupCode.localeCompare(b.travelGroupCode, "zh-CN");
      }
      return String(a.groupBeginDate).localeCompare(String(b.groupBeginDate), "zh-CN");
    }).slice(0, 8);

    enriched.push({
      ...product,
      liveGroups,
      liveQueryEnabled: true
    });
  }

  return enriched;
}

function formatMoney(value) {
  return `¥${Number(value || 0).toLocaleString("zh-CN")}`;
}

function formatRange(min, max) {
  return min === max ? formatMoney(min) : `${formatMoney(min)} - ${formatMoney(max)}`;
}

function summarizeNeeds(needs) {
  const destinationMap = {
    glacier: "林芝 / 冰川",
    lhasa: "拉萨 / 藏文化",
    meili: "梅里 / 三江",
    "shangri-la": "香格里拉 / 亚丁",
    puer: "昆明 / 普洱"
  };
  const parts = [];
  if (needs.date_text) parts.push(`出发：${needs.date_text}`);
  else if (needs.month) parts.push(`出发：${needs.month}月`);
  if (needs.destination) parts.push(`目的地：${destinationMap[needs.destination] || needs.destination}`);
  if (needs.nights) parts.push(`行程：${needs.nights}晚${needs.days || needs.nights + 1}天`);
  if (needs.adults || needs.travelers) {
    const adults = needs.adults || needs.travelers || 0;
    const children = needs.children || 0;
    const elders = needs.elders ? "，含老人" : "";
    parts.push(`人数：${adults}位成人${children ? `，${children}位儿童` : ""}${elders}`);
  }
  if (needs.product_form) parts.push(`形态：${needs.product_form}`);
  if (needs.preference) parts.push(`偏好：${needs.preference}`);
  return parts.join("；");
}

function buildProductBlock(product, index, needs) {
  const lines = [];
  lines.push(`${index + 1}. ${product.name}｜${product.line}｜${product.nights}晚｜${product.estimate.form}`);
  lines.push(`推荐理由：${(product.reasons.length ? product.reasons : ["与当前需求整体匹配度较高。"]).join(" ")}`);
  lines.push(`预估价格：${formatRange(product.estimate.totalMin, product.estimate.totalMax)}（${product.estimate.seasonLabel}）`);
  lines.push(`成人客单参考：${formatMoney(product.estimate.unitPrice)} / 人`);

  if (product.liveQueryEnabled && product.liveGroups.length) {
    lines.push("真实可下单团期：");
    const sortedGroups = [...product.liveGroups].sort((a, b) => compareGroupToRequestedDate(a, b, needs));
    sortedGroups.slice(0, 3).forEach((group) => {
      lines.push(`- ${group.travelGroupCode}｜${group.travelTypeDesc}｜${String(group.groupBeginDate || "").slice(0, 10)} 出发｜剩余 ${group.saleNum}｜售价 ${group.startingPrice ? formatMoney(group.startingPrice) : "待确认"}`);
    });
  } else if (product.liveQueryEnabled) {
    lines.push("真实可下单团期：当前日期范围内未匹配到可下单团期。");
  } else {
    lines.push("真实可下单团期：当前未配置中台 token。");
  }

  if (product.risks.length) {
    lines.push(`提醒：${product.risks.join(" ")}`);
  }

  return lines.join("\n");
}

function compareGroupToRequestedDate(a, b, needs) {
  const { beginDate } = parseDateRange(needs);
  const target = beginDate ? new Date(`${beginDate}T00:00:00+08:00`).getTime() : null;
  if (!target) return String(a.groupBeginDate || "").localeCompare(String(b.groupBeginDate || ""), "zh-CN");
  const deltaA = Math.abs(new Date(String(a.groupBeginDate).slice(0, 10)).getTime() - target);
  const deltaB = Math.abs(new Date(String(b.groupBeginDate).slice(0, 10)).getTime() - target);
  if (deltaA !== deltaB) return deltaA - deltaB;
  return String(a.groupBeginDate || "").localeCompare(String(b.groupBeginDate || ""), "zh-CN");
}

function draftReply(needs, rankedProducts) {
  const requiredMissing = [];
  if (!needs.destination) requiredMissing.push("目的地");
  if (!needs.nights) requiredMissing.push("晚数");
  if (!needs.travelers && !needs.adults) requiredMissing.push("人数");

  if (requiredMissing.length) {
    return `我还差关键信息：${requiredMissing.join("、")}。\n\n目前已识别：${summarizeNeeds(needs) || "暂未识别到完整需求"}。\n\n你继续补一句就行，例如：“6月4日出发，2位成人，想自由行”。`;
  }

  if (!rankedProducts.length) {
    return `已识别需求：${summarizeNeeds(needs)}。\n\n当前没有匹配度足够高的标品，建议先确认是否接受轻微变形，或者改走定制。`;
  }

  const intro = [
    `已识别需求：${summarizeNeeds(needs)}。`,
    "下面先给你直接可用的推荐结果："
  ];

  const blocks = rankedProducts.map((product, index) => buildProductBlock(product, index, needs));
  const closing = "以上价格为预估，最终仍需以正式核价、实际房型、资源和儿童年龄为准。";
  return [...intro, ...blocks, closing].join("\n\n");
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
      const rankedProducts = await attachLiveGroups(rankProducts(needs), needs);
      const reply = draftReply(needs, rankedProducts);

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
const HOST = process.env.HOST || "127.0.0.1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL_PROVIDER = process.env.MODEL_PROVIDER || "openai";
const MODEL_BASE_URL = process.env.MODEL_BASE_URL || (MODEL_PROVIDER === "zhipu"
  ? "https://open.bigmodel.cn/api/paas/v4"
  : "https://api.openai.com/v1");
const MODEL = process.env.OPENAI_MODEL || (MODEL_PROVIDER === "zhipu" ? "glm-4-flash-250414" : "gpt-4o-mini");
const SONGTSAM_GDS_BASE_URL = process.env.SONGTSAM_GDS_BASE_URL || "https://gds.songtsam.com";
const SONGTSAM_UNIT_CODE = process.env.SONGTSAM_UNIT_CODE || "SONGTSAM";
const SONGTSAM_AUTH_TOKEN = process.env.SONGTSAM_AUTH_TOKEN || "";
const SONGTSAM_UC_BASE_URL = process.env.SONGTSAM_UC_BASE_URL || "https://i.songtsam.com";
const SONGTSAM_ORG_CODE = process.env.SONGTSAM_ORG_CODE || "SONGTSAM";
const SONGTSAM_USER_CODE = process.env.SONGTSAM_USER_CODE || "";
const SONGTSAM_PASSWORD = process.env.SONGTSAM_PASSWORD || "";
const SONGTSAM_PASSWORD_MODE = process.env.SONGTSAM_PASSWORD_MODE || "auto";
const SONGTSAM_TOKEN_TTL_MS = Number(process.env.SONGTSAM_TOKEN_TTL_MS || 50 * 60 * 1000);

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "POST" && url.pathname === "/api/ai-chat") {
    return handleChat(req, res);
  }

  if (req.method === "GET") {
    try {
      return await serveFile(res, url.pathname);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
  }

  res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Method not allowed");
});

server.on("error", (error) => {
  const tips = {
    EADDRINUSE: `Port ${PORT} is already in use. Try setting PORT to another value.`,
    EPERM: `Permission denied while binding ${HOST}:${PORT}. Try a different PORT, or run this directly in your local terminal outside the sandbox.`
  };
  console.error(tips[error.code] || error.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const displayHost = HOST === "0.0.0.0" ? "localhost" : HOST;
  console.log(`AI server running at http://${displayHost}:${PORT}`);
});
