const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendEl = document.getElementById("send");
const needsEl = document.getElementById("needs");
const rankedEl = document.getElementById("ranked");

const history = [
  {
    role: "assistant",
    content: "把客户需求直接发给我。我会先用模型理解需求，再结合本地产品知识和价格规则给你一版更像销售助手的回答。"
  }
];

function addMessage(role, content) {
  const node = document.createElement("div");
  node.className = `msg ${role}`;
  node.textContent = content;
  messagesEl.appendChild(node);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderNeeds(needs) {
  needsEl.innerHTML = "";
  const rows = [
    ["目的地", needs.destination || "未识别"],
    ["月份", needs.month || "未识别"],
    ["日期", needs.date_text || "未识别"],
    ["晚数", needs.nights || "未识别"],
    ["人数", needs.travelers || "未识别"],
    ["成人", needs.adults || 0],
    ["儿童", needs.children || 0],
    ["产品形态", needs.product_form || "未识别"],
    ["偏好", needs.preference || "未识别"],
    ["预算", needs.budget || "未识别"]
  ];

  rows.forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "meta-card";
    card.innerHTML = `<div class="meta-label">${label}</div><div>${value}</div>`;
    needsEl.appendChild(card);
  });
}

function renderRanked(products) {
  rankedEl.innerHTML = `<p class="eyebrow" style="margin-top:16px;">Grounded Picks</p><h2>规则层候选</h2>`;
  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "meta-card product-card";
    const price = product.estimate.totalMin === product.estimate.totalMax
      ? `¥${product.estimate.totalMin.toLocaleString("zh-CN")}`
      : `¥${product.estimate.totalMin.toLocaleString("zh-CN")} - ¥${product.estimate.totalMax.toLocaleString("zh-CN")}`;
    card.innerHTML = `
      <div class="meta-label">${product.line}</div>
      <div><strong>${product.name}</strong> · ${product.score}分</div>
      <div class="muted">${product.route} · ${product.nights}晚 · ${product.estimate.form}</div>
      <div class="muted" style="margin-top:6px;">预估价：${price}（${product.estimate.seasonLabel}）</div>
      <div>${product.tags.slice(0,5).map((tag) => `<span class="pill">${tag}</span>`).join("")}</div>
    `;
    rankedEl.appendChild(card);
  });
}

async function sendMessage() {
  const content = inputEl.value.trim();
  if (!content) return;

  history.push({ role: "user", content });
  addMessage("user", content);
  inputEl.value = "";
  sendEl.disabled = true;
  sendEl.textContent = "处理中...";

  try {
    const response = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "请求失败");
    }

    history.push({ role: "assistant", content: data.reply });
    addMessage("assistant", data.reply);
    renderNeeds(data.needs);
    renderRanked(data.rankedProducts || []);
  } catch (error) {
    addMessage("assistant", `请求失败：${error.message}`);
  } finally {
    sendEl.disabled = false;
    sendEl.textContent = "发送";
  }
}

sendEl.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    sendMessage();
  }
});

history.forEach((message) => addMessage(message.role, message.content));
