# AgentUp

架构与 AI 落地笔记。纯静态站点，无框架依赖。

## 写作

在 `posts/` 新建 `.md` 文件，文件名建议 `YYYY-MM-DD-英文短标题.md`：

```markdown
---
title: "文章标题"
date: 2026-11-12
tags: [AI Agent, 架构]
summary: "一句话摘要，显示在列表和分享卡片里。"
---

正文……
```

`date` 决定排序，文件名日期前缀会被去掉，剩余部分作为 URL slug（`/posts/<slug>/`）。

## 本地预览

```bash
npm install
npm run dev      # 构建并启动 http://localhost:4321
```

只想构建：

```bash
npm run build    # 输出到 dist/
```

## 发布

推送到 `main` 即触发 `.github/workflows/deploy.yml`，自动构建并部署到 GitHub Pages。

首次使用需在仓库 **Settings → Pages → Build and deployment** 里把 Source 设为 **GitHub Actions**。

## 结构

```
posts/                文章源文件（Markdown + frontmatter）
assets/style.css      全站样式（跟随系统深色模式）
build.mjs             构建脚本：解析 frontmatter、渲染 Markdown、生成首页/RSS/404
server.mjs            本地预览服务器
dist/                 构建产物，不入库
```
