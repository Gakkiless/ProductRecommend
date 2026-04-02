# 松赞产品推荐工具

一个本地可直接打开的单页工具，用于根据客户需求快速推荐更合适的松赞产品方向。

## 打开方式

直接打开 [`index.html`](/Users/gakki/Documents/New project/index.html) 即可使用。

## 真 AI 版本

仓库里现在额外提供了一个需要后端和 OpenAI API 的版本。

1. 配置环境变量
   使用 [`/.env.example`](/Users/gakki/Documents/New project/.env.example) 中的变量，至少设置 `OPENAI_API_KEY`
2. 启动服务
   运行 `npm start`
3. 打开地址
   访问 `http://localhost:3000/ai`

这个版本不是纯关键词匹配，而是：

- 先调用 OpenAI 模型理解自然语言需求
- 再结合本地产品知识和价格规则做 grounded ranking
- 最后再生成更像销售助手的自然语言回复

## 当前能力

- 覆盖拉萨、梅里、香格里拉、冰川、昆明普洱、亲子、桃花节、杜鹃季、低空、主题产品等主要方向
- 区分 `自由行`、`私享管家`、`主题团`
- 结合晚数、月份、同行结构、旅行偏好、预算倾向、定制程度做可解释推荐
- 输出匹配分、推荐理由、注意事项、沟通建议

## 主要文件

- [`index.html`](/Users/gakki/Documents/New project/index.html)：界面
- [`styles.css`](/Users/gakki/Documents/New project/styles.css)：样式
- [`products.js`](/Users/gakki/Documents/New project/products.js)：产品数据
- [`app.js`](/Users/gakki/Documents/New project/app.js)：推荐规则和交互逻辑

## 当前假设

- 这是一个“顾问推荐辅助工具”，不是正式核价工具
- 价格政策、儿童政策、车司管规则目前用于辅助推荐和风险提示，没有做精确报价
- 产品数据先以我当前学习到的主产品结构进行抽象，后续可以继续补更多产品、元素和季节版本

## 下一步可升级

- 接入更完整的产品库索引，从本地文件自动生成产品数据
- 增加“推荐元素/活动”维度，而不只是推荐整条产品
- 增加“为什么不推荐”的反向解释
- 增加简版报价预判和定制/标品判断
