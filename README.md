# 松赞用户关系助手

内部销售辅助工具，用于客户维护记录、客户画像、产品推荐、报价草稿和跟进话术等场景的前端 demo。

## 运行

```bash
npm install
npm run dev
```

访问 Vite 输出的本地地址，通常是 `http://127.0.0.1:5173/`。

如需启动本地 AI/BFF 服务：

```bash
npm run server
```

## 目录

- `src/`：用户关系助手 React 前端
- `assets/`：用户关系助手视觉资源
- `little-dorje/`：小多吉相关项目
- `ai-server.mjs`：可选的本地 AI/BFF 服务
- `knowledge-base.mjs`：本地产品知识库
