function monthInSeason(month, seasons) {
  if (!month) {
    return true;
  }
  return seasons.includes(month);
}

function getPreferenceTags(preference) {
  const map = {
    balanced: ["自然", "人文", "经典", "轻松"],
    culture: ["人文", "文化", "寺院"],
    nature: ["自然", "雪山", "风景", "摄影"],
    hiking: ["徒步", "户外", "自然"],
    food: ["美食", "咖啡", "茶文化", "生活方式"],
    relax: ["轻松", "度假", "慢节奏"],
  };
  return map[preference] || [];
}

function buildSummary(input, topResults) {
  if (!topResults.length) {
    return {
      title: "暂时没有高匹配产品",
      body: "当前条件比较严格，建议放宽目的地、产品形态或晚数限制，或者改为按“轻微变形/定制”继续沟通。",
    };
  }

  const first = topResults[0];
  const destinationNames = {
    lhasa: "拉萨 / 藏文化",
    meili: "梅里 / 三江",
    "shangri-la": "香格里拉 / 亚丁",
    glacier: "林芝 / 冰川",
    puer: "昆明 / 普洱",
    all: "多目的地",
  };

  const travelerTone = input.withChildren
    ? "当前客群带儿童，需要优先考虑轻松度、房型安排和儿童计费规则。"
    : input.withElders
      ? "当前客群带老人，需要优先考虑节奏、海拔适应和转场舒适度。"
      : "当前客群以标准成人客群为主，可以更看重产品调性和风景浓度。";

  return {
    title: `首推方向：${first.name}`,
    body: `从已知条件看，这批需求更适合往“${destinationNames[first.destination]}”方向推荐，优先考虑 ${first.forms.join(" / ")}。${travelerTone} 目前最匹配的是 ${first.name}，同时可以把后面 1-2 个备选作为同层对比方案，方便顾问顺着客户反馈继续收敛。`,
  };
}

function scoreProduct(product, input) {
  let score = 50;
  const reasons = [];
  const risks = [...product.cautions];

  if (input.destination !== "all") {
    if (product.destination === input.destination) {
      score += 18;
      reasons.push("目的地方向高度匹配。");
    } else {
      score -= 14;
    }
  }

  if (input.productForm !== "all") {
    if (product.forms.includes(input.productForm)) {
      score += 16;
      reasons.push(`符合客户希望的${input.productForm}形态。`);
    } else {
      score -= 18;
      risks.push(`当前产品主形态不属于${input.productForm}。`);
    }
  }

  if (input.nights > 0) {
    const gap = Math.abs(product.nights - input.nights);
    if (gap === 0) {
      score += 14;
      reasons.push("晚数与客户需求一致。");
    } else if (gap === 1) {
      score += 7;
      reasons.push("晚数接近，可作为轻微变形或顺位备选。");
    } else if (gap >= 3) {
      score -= 12;
      risks.push("晚数差距较大，若推进需明显调整行程。");
    } else {
      score -= 4;
    }
  }

  if (monthInSeason(input.month, product.seasons)) {
    score += input.month ? 12 : 0;
    if (input.month) {
      reasons.push("季节窗口合适。");
    }
  } else if (input.month) {
    score -= 24;
    risks.push("该产品与客户出行月份不完全匹配，可能已过季或未到最佳窗口。");
  }

  const preferredTags = getPreferenceTags(input.preference);
  const tagHits = product.tags.filter((tag) => preferredTags.includes(tag)).length;
  score += Math.min(tagHits * 5, 15);
  if (tagHits >= 2) {
    reasons.push("旅行偏好和产品调性比较契合。");
  }

  if (input.withChildren) {
    if (product.familyFriendly) {
      score += 12;
      reasons.push("对儿童同行更友好。");
    } else {
      score -= 14;
      risks.push("儿童同行体验可能不够理想，需要谨慎推荐。");
    }
  }

  if (input.withElders) {
    if (product.elderFriendly) {
      score += 12;
      reasons.push("老人同行的适配度更高。");
    } else {
      score -= 14;
      risks.push("老人同行可能受海拔、徒步或转场影响。");
    }
  }

  if (input.partyType === "parent-child" && product.tags.includes("亲子")) {
    score += 16;
    reasons.push("亲子属性非常强，更容易直接命中需求。");
  }

  if (input.preference === "food" && ["puer"].includes(product.destination)) {
    score += 8;
    reasons.push("美食、咖啡、茶文化方向更容易满足客户期待。");
  }

  if (input.preference === "culture" && ["lhasa", "meili"].includes(product.destination)) {
    score += 8;
    reasons.push("人文和宗教文化浓度较高。");
  }

  if (input.preference === "nature" && ["glacier", "meili", "shangri-la"].includes(product.destination)) {
    score += 8;
    reasons.push("自然景观张力更强。");
  }

  if (input.preference === "relax" && product.intensity === "light") {
    score += 10;
    reasons.push("节奏更轻松，容易成交。");
  }

  if (input.preference === "hiking" && product.intensity === "high") {
    score += 10;
    reasons.push("更适合明确想要徒步或户外体验的客人。");
  }

  if (input.customization === "standard") {
    score += 4;
  }

  if (input.customization === "deep" && !product.tags.includes("经典")) {
    score += 6;
    reasons.push("可作为定制型沟通起点。");
  }

  if (input.budget === "value" && (product.tags.includes("低空") || product.tags.includes("高端"))) {
    score -= 18;
    risks.push("客户价格敏感，当前产品可能承接难度较高。");
  }

  if (input.foreignGuests) {
    if (product.foreignerNotes) {
      reasons.push("有外籍客人时，需要同步证照和执行资质要求。");
    } else {
      risks.push("若有外籍客人，仍需单独核验是否涉及额外执行限制。");
      score -= 3;
    }
  }

  if (input.travelers >= 4 && product.forms.includes("自由行")) {
    reasons.push("多人出行时，自由行可结合多人同行规则继续测算。");
  }

  if (input.travelers === 1 && product.forms.includes("私享管家")) {
    risks.push("单人私享需关注按套价或比例收费的承接方式。");
  }

  score = Math.max(0, Math.min(100, score));

  const salesNote = buildSalesNote(product, input, reasons, risks);

  return {
    ...product,
    score,
    reasons: dedupe(reasons).slice(0, 5),
    risks: dedupe(risks).slice(0, 5),
    salesNote,
  };
}

function buildSalesNote(product, input, reasons, risks) {
  if (input.customization === "deep") {
    return `建议先用 ${product.name} 作为母版去沟通，再确认客户要调整的是首尾酒店、房型、餐饮、活动还是车司管；如果改动明显超过标品变形范围，就顺势转定制报价。`;
  }

  if (input.withChildren) {
    return `建议先强调 ${product.name} 的体验氛围和节奏，再补充儿童房型、占床/加床和是否分摊车司管的规则，避免客户在后面阶段才对价格结构产生疑问。`;
  }

  if (input.budget === "value") {
    return `建议先推这条作为“标品优先”的方案，强调成熟、报价快、资源更稳定；如果客户继续压价格，再考虑是否切换更短线或更轻量的产品。`;
  }

  return `建议把 ${product.name} 放在第一顺位，同时准备 1 个相近替代方案，围绕“景观强度、节奏轻重、产品形态”做对比，会比直接讲价格更容易推进。`;
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}

function renderSummary(summary) {
  const root = document.getElementById("summary");
  root.innerHTML = "";

  const title = document.createElement("h3");
  title.className = "summary-title";
  title.textContent = summary.title;

  const body = document.createElement("p");
  body.textContent = summary.body;

  root.append(title, body);
}

function renderResults(results) {
  const container = document.getElementById("results");
  const template = document.getElementById("result-card-template");
  container.innerHTML = "";

  if (!results.length) {
    const empty = document.createElement("div");
    empty.className = "result-card";
    empty.innerHTML = "<h3>没有找到合适结果</h3><p class='result-description'>可以放宽目的地、产品形态或晚数后重新尝试。</p>";
    container.appendChild(empty);
    return;
  }

  results.forEach((result) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".result-line").textContent = result.line;
    node.querySelector(".result-title").textContent = result.name;
    node.querySelector(".score-badge").textContent = `${result.score} 分`;
    node.querySelector(".result-meta").textContent = `${result.routeCode} · ${result.nights}晚 · ${result.forms.join(" / ")}`;
    node.querySelector(".result-description").textContent = result.description;
    node.querySelector(".sales-note").textContent = result.salesNote;

    const chips = node.querySelector(".chips");
    result.tags.slice(0, 6).forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = tag;
      chips.appendChild(chip);
    });

    const reasonList = node.querySelector(".reason-list");
    result.reasons.forEach((reason) => {
      const li = document.createElement("li");
      li.textContent = reason;
      reasonList.appendChild(li);
    });

    const riskList = node.querySelector(".risk-list");
    result.risks.forEach((risk) => {
      const li = document.createElement("li");
      li.textContent = risk;
      riskList.appendChild(li);
    });

    container.appendChild(node);
  });
}

function readForm() {
  const form = document.getElementById("recommendation-form");
  const data = new FormData(form);

  return {
    destination: data.get("destination"),
    month: Number(data.get("month")),
    nights: Number(data.get("nights")),
    productForm: data.get("productForm"),
    travelers: Number(data.get("travelers")),
    partyType: data.get("partyType"),
    withChildren: data.get("withChildren") === "on",
    withElders: data.get("withElders") === "on",
    foreignGuests: data.get("foreignGuests") === "on",
    preference: data.get("preference"),
    customization: data.get("customization"),
    budget: data.get("budget"),
  };
}

function generateRecommendations() {
  const input = readForm();
  const scored = PRODUCT_CATALOG
    .map((product) => scoreProduct(product, input))
    .sort((a, b) => b.score - a.score);

  const filtered = scored.filter((item) => item.score >= 45).slice(0, 5);
  const summary = buildSummary(input, filtered);
  renderSummary(summary);
  renderResults(filtered);
}

if (typeof document !== "undefined") {
  document.getElementById("recommendation-form").addEventListener("submit", (event) => {
    event.preventDefault();
    generateRecommendations();
  });

  generateRecommendations();
}
