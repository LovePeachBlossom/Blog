---
title: 自主搭建博客 | Hexo + Butterfly 部署到 Cloudflare
date: 2026-02-18 19:31:55
updated: 2026-02-19 03:30:00
tags: [博客搭建, Hexo, Butterfly, Cloudflare]
categories: 博客日常
cover: /img/bg.webp
description: 从零开始用 Hexo + Butterfly 搭建粉色二次元博客，部署到 Cloudflare Pages 的完整记录
keywords: [Hexo, Butterfly, Cloudflare Pages, WSL2, 博客搭建]
---

## 为什么要搭博客

Notion 里记了不少笔记，但总觉得缺点什么——还是想有个属于自己的小窝，把学习过程记录下来 (´｡• ᵕ •｡`)

对比了 Hexo 和 Hugo 之后，选择了 **Hexo**：社区活跃、主题丰富、对新手友好。主题选了 **Butterfly**，卡片式设计很适合打造二次元风格的博客。部署到 Cloudflare Pages 完全免费，还自带 CDN + HTTPS，简直完美 (*￣▽￣*)

<!-- more -->

## 本地搭建

环境：Windows + WSL2，需要先装好 Node.js（推荐用 nvm）。

```bash
# 初始化 Hexo
mkdir -p ~/projects && cd ~/projects
npx hexo init my-blog && cd my-blog

# 安装 Butterfly 主题
git clone -b master https://github.com/jerryc127/hexo-theme-butterfly.git themes/butterfly
npm install hexo-renderer-pug hexo-renderer-stylus --save
```

编辑 `_config.yml` 把 `theme` 改成 `butterfly`，然后预览：

```bash
npx hexo clean && npx hexo s
```

打开 `http://localhost:4000` 看到页面就成功了 φ(≧ω≦*)♪

> WSL2 小贴士：如果 localhost 打不开，试试 `hostname -I` 查看 IP，用 `http://IP:4000` 访问。

## 部署到 Cloudflare Pages

我的仓库结构长这样：

```
Blog/
├── blog/                     # Hexo 博客
└── hexo-theme-butterfly/     # Butterfly 主题
```

本地开发用软链接引用主题，但**软链接不要提交到 Git**，CF 构建时会用复制命令代替。

去 [Cloudflare](https://dash.cloudflare.com/) 创建 Pages 项目，连接 GitHub 仓库，填写构建配置：

- 框架预设：`None`
- 输出目录：`blog/public`
- 环境变量：`NODE_VERSION` = `20`
- 构建命令：

```bash
rm -rf blog/themes/butterfly \
  && mkdir -p blog/themes \
  && cp -R hexo-theme-butterfly blog/themes/butterfly \
  && npm --prefix blog ci \
  && npm --prefix blog run clean \
  && npm --prefix blog run build
```

> 用 `npm ci` 而不是 `npm install`，保证每次构建依赖版本一致。

构建成功后会得到 `xxx.pages.dev` 域名，也可以绑定自定义域名。以后每次 `git push` 就会自动部署 ヽ(✿ﾟ▽ﾟ)ノ

**踩过的坑** (>_<)：
- WSL2 项目一定要放在 Linux 文件系统里（`~/projects/`），别放 `/mnt/d/` 下，不然会很慢
- 软链接在 CF 会报 `ELOOP` 错误，必须用 `cp -R` 复制
- `moment-timezone` 需要在 `package.json` 里显式声明

## 主题定制

推荐在博客根目录创建 `_config.butterfly.yml`，**只写改过的配置**，别复制整个默认文件 (..•˘_˘•..)

我的二次元风格配置要点：

- **字体**：霞鹜文楷 + Fira Code，手写风格很有感觉
- **配色**：整套粉色系 + 渐变背景（亮/暗色适配），加深色值满足无障碍对比度标准
- **彩色标签**：6 种颜色循环，通过自定义 CSS 注入
- **性能**：图片转 WebP 压缩、Pjax 无刷新跳转、懒加载、链接预加载、缓存策略
- **功能**：本地搜索、字数统计、Sitemap、结构化数据、安全响应头

## 写在最后

博客已经部署到 [blog.fovoen.moe](https://blog.fovoen.moe)，如果你也想搭博客，记住三个关键点 (๑•̀ㅂ•́)و✧

1. WSL2 项目放 Linux 文件系统
2. 主题配置只写差异项
3. CF Pages 用复制命令代替软链接

---

**参考链接：**
- [Hexo 官方文档](https://hexo.io/zh-cn/docs/)
- [Butterfly 主题文档](https://butterfly.js.org/)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
