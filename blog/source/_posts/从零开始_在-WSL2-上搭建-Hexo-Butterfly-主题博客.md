---
title: 自主搭建博客 | Hexo + Butterfly 部署到 Cloudflare
date: 2026-02-18 19:31:55
updated: 2026-02-19 03:30:00
tags: [博客搭建, Hexo, Butterfly, Cloudflare]
categories: 博客日常
cover: /img/bg.webp
description: 从零开始用 Hexo + Butterfly 搭建粉色二次元博客，部署到 Cloudflare Pages 的完整踩坑记录
keywords: [Hexo, Butterfly, Cloudflare Pages, WSL2, 博客搭建]
---

## 为什么突然想搭博客

说起来有点好笑，起因是某天凌晨两点我在 Notion 里翻笔记，翻着翻着突然觉得——这些东西只有我自己能看到，好像少了点什么 (´•̥ ω •̥`)

其实这个念头挺早就有了。高中用过博客园，大学开始转 Notion，笔记是越记越多，但每次想分享点什么，都得截图、压缩、发群里，这套流程走完人都累了，还不如不发。后来刷到几个大佬的个人博客，那种"打开就是我的地盘"的感觉，说实话有点馋 ✧

想来想去，还是想要一个真正属于自己的地方。不是平台，不是账号，就是那种打开域名、"哦这是我的"的感觉。能自己改样式、自己写页脚、自己决定什么能显示什么不能——这种掌控感，Notion 给不了。

对比 Hexo 和 Hugo 纠结了挺久。Hugo 确实快，构建速度快得离谱，但中文资料少，遇到问题搜半天搜不到那种感觉真的很痛苦。最后选了 **Hexo**，社区活跃，中文教程多，新手友好，出问题基本都能搜到答案。

主题一眼就相中了 **Butterfly**——卡片式布局，首页那个排版看着就很舒服，配色自由度也高，改成粉色二次元风格完全没障碍 (σ≧▽≦)σ。部署选 Cloudflare Pages，免费 + CDN + HTTPS + 自动部署，穷学生最爱，简直是慈善。

<!-- more -->

---

## 环境准备

我的开发环境是 Windows 11 + WSL2（Ubuntu 22.04），Node.js 用 nvm 管理版本。

没装 nvm 的先跑这一条：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v  # 确认一下版本
```

> 💡 为什么用 nvm？因为以后维护多个项目时 Node 版本可能不一样，nvm 切版本就一行命令，比直接装省心太多了。

Git 也记得配好，WSL2 和 Windows 混用很容易出换行符的问题：

```bash
git config --global core.autocrlf input
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

---

## 本地跑起来

有一件事要先说清楚：**项目一定要建在 Linux 文件系统里**，就是 `~/` 下面，别放 `/mnt/d/` 那种挂载目录。

我最开始就犯了这个错误，`hexo g` 跑了将近三分钟，以为是电脑的问题，后来挪到 `~/projects/` 下面，同样的命令五秒跑完。WSL2 访问 Windows 文件系统有跨层 IO 损耗，慢是正常的，但在里面跑 Hexo 真的是折磨自己 (；д；)

```bash
mkdir -p ~/projects && cd ~/projects
npx hexo init my-blog && cd my-blog
```

`hexo init` 会把基础目录结构都建好，大概长这样：

```
my-blog/
├── _config.yml        # 博客全局配置
├── package.json
├── source/
│   └── _posts/        # 文章放这里
├── themes/            # 主题目录
└── public/            # 构建产物（加进 .gitignore）
```

装 Butterfly 主题：

```bash
git clone -b master https://github.com/jerryc127/hexo-theme-butterfly.git themes/butterfly
npm install hexo-renderer-pug hexo-renderer-stylus --save
```

> Butterfly 用 Pug 写模板、Stylus 写样式，这两个渲染器必须装，少一个页面直接白屏报错。

编辑根目录的 `_config.yml`，找到 `theme` 那行改掉：

```yaml
theme: butterfly
```

跑起来预览一下：

```bash
npx hexo clean && npx hexo s
```

打开 `http://localhost:4000`，看到页面的那一刻真的有点小激动 φ(≧ω≦*)♪

> ⚠️ WSL2 用户注意：localhost 打不开的话，跑 `hostname -I` 拿到 IP，用 `http://你的IP:4000` 访问。我第一次就卡这里，对着空白页发呆了十分钟 (ˉ▽ˉ；)

---

## 推到 Cloudflare Pages

### 仓库结构设计

我把主题和博客源码放在同一个 Git 仓库，结构是这样的：

```
Blog/                              # Git 仓库根目录
├── blog/                          # Hexo 博客主体
│   ├── _config.yml
│   ├── _config.butterfly.yml      # 主题差异配置
│   ├── package.json
│   ├── package-lock.json
│   └── source/
│       ├── _posts/                # 文章
│       ├── img/                   # 图片资源（WebP 格式）
│       └── css/
│           └── custom.css         # 自定义样式注入
├── hexo-theme-butterfly/          # Butterfly 主题源码
└── _headers                       # CF Pages 响应头配置
```

本地开发我在 `blog/themes/butterfly` 建了软链接指向外面的主题目录，改主题文件很方便，能实时热更新看效果。但——软链接**绝对不能提交到 Git**，这是血泪教训。

第一次部署，CF 构建日志满屏 `ELOOP: too many levels of symbolic links`，排查了将近一个小时，最后才发现是软链接的问题。CF 的构建容器里根本找不到软链接的目标路径，当然就报错了 (╯°□°）╯︵ ┻━┻

`.gitignore` 记得加上：

```
blog/public/
blog/node_modules/
blog/themes/butterfly/
```

### Cloudflare Pages 配置

登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，进 Workers & Pages，新建 Pages 项目，连上 GitHub 仓库。

构建配置填这些：

| 配置项 | 值 |
|--------|-----|
| 框架预设 | `None` |
| 输出目录 | `blog/public` |
| 环境变量 | `NODE_VERSION` = `20` |

构建命令（核心是用 `cp -R` 替代软链接）：

```bash
rm -rf blog/themes/butterfly \
  && mkdir -p blog/themes \
  && cp -R hexo-theme-butterfly blog/themes/butterfly \
  && npm --prefix blog ci \
  && npm --prefix blog run clean \
  && npm --prefix blog run build
```

逐行解释：
1. 清掉可能残留的旧主题文件
2. 确保 `themes/` 目录存在
3. 把主题整个复制进来，替代软链接
4. `npm ci` 严格按 `package-lock.json` 装依赖，锁版本，避免"本地好好的 CF 挂了"的玄学问题
5. 清缓存 + 生成静态文件

构建成功后会得到 `xxx.pages.dev` 的域名，有自己域名的话在 Custom Domains 里绑一下，CF 自动签 SSL 证书，全程不用手动操作。之后每次 `git push` 自动触发构建，一两分钟部署完 ヽ(✿ﾟ▽ﾟ)ノ

### 踩坑汇总 (>_<)

- **`/mnt/` 下 IO 奇慢**：项目必须放 `~/` 下，这条比什么都重要
- **软链接报 ELOOP**：用 `cp -R` 代替，不要侥幸
- **时区错误导致文章日期偏移**：在 `package.json` 显式加 `moment-timezone` 依赖
- **构建偶发 OOM**：文章多了以后可能内存不够，构建命令里加 `NODE_OPTIONS=--max-old-space-size=512`
- **首次构建卡住**：CF 免费版有并发限制，等一会儿重试就好

---

## 主题折腾记录

### 配置文件的正确打开方式

在博客根目录建 `_config.butterfly.yml`，**只写你改过的那些**，主题默认值会自动继承，不需要复制整个默认配置文件。

好处很直接：以后主题更新了直接 `git pull` 拉新版，你的自定义配置完全不受影响。我有个朋友把整个默认配置复制进去了，主题更新加了新配置项，他的覆盖文件里没有，功能死活开不了，最后手动 diff 了半个小时 (..•˘_˘•..)

### 字体方案

```yaml
# _config.butterfly.yml
font:
  global-font-size: 16px
  code-font-size: 14px
  font-family: "'霞鹜文楷', 'Noto Serif SC', serif"
  code-font-family: "'Fira Code', 'JetBrains Mono', monospace"
```

霞鹜文楷是免费开源的中文字体，有点手写感，配上 Fira Code 的连字特性，代码块和正文都挺好看的。字体建议通过 CDN 引入或者自己托管，别只写字体名期望系统字体——用户机器上大概率没装 (＞﹏＜)

### 配色方案

这是我折腾最久的部分，大概改了三四版才满意。

```yaml
theme_color:
  enable: true
  main: "#f9a8d4"              # 主色调：樱花粉
  paginator: "#f472b6"
  button_hover: "#ec4899"
  text_selection: "#fce7f3"
  link_color: "#db2777"
  meta_color: "#f9a8d4"
  hr_color: "#fbcfe8"
  code-blocks-color: "#fdf2f8"
  scrollbar_color: "#f9a8d4"
  header_background_color: "rgba(249,168,212,0.85)"
```

暗色模式单独配了一套，主色换成深玫瑰 `#be185d`，保证和暗色背景的对比度能过 WCAG AA 标准（对比度 ≥ 4.5:1）。这个细节很多配色教程都不提，但对可访问性很重要，调色的时候顺手用 [Colour Contrast Checker](https://colourcontrast.cc/) 验一下就好了。

### 彩色标签

默认标签样式比较单调，用自定义 CSS 做了 6 色循环：

```css
/* 注入到 custom.css 或 inject.bottom */
#tag-cloud-list .tag-cloud-list-item:nth-child(6n+1) a { background: #fce7f3; color: #be185d; }
#tag-cloud-list .tag-cloud-list-item:nth-child(6n+2) a { background: #ede9fe; color: #6d28d9; }
#tag-cloud-list .tag-cloud-list-item:nth-child(6n+3) a { background: #dbeafe; color: #1d4ed8; }
#tag-cloud-list .tag-cloud-list-item:nth-child(6n+4) a { background: #dcfce7; color: #15803d; }
#tag-cloud-list .tag-cloud-list-item:nth-child(6n+5) a { background: #fef9c3; color: #a16207; }
#tag-cloud-list .tag-cloud-list-item:nth-child(6n+6) a { background: #ffedd5; color: #c2410c; }
```

翻标签页的时候一堆彩色标签真的很好看，强烈安利 (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧

### 性能优化

```yaml
# 图片懒加载
lazyload:
  enable: true
  field: post

# Pjax 无刷新跳转（页面切换不重新加载，背景音乐不会中断 ♪）
pjax: true

# 链接预加载（鼠标 hover 的时候就开始预加载）
instantpage: true

# 本地搜索（不需要第三方服务，离线也能用）
local_search:
  enable: true
  preload: false
```

图片我全部手动转成 WebP 再上传，体积能压到原来的 30%~50%。用 `cwebp` 批量转换：

```bash
for f in *.png *.jpg; do cwebp "$f" -o "${f%.*}.webp"; done
```

### 字数统计和 SEO

```yaml
# 字数统计 + 预计阅读时间
wordcount:
  enable: true
  post_wordcount: true
  min2read: true

# 结构化数据（有助于 Google 索引）
structured_data: true
```

安全响应头通过仓库根目录的 `_headers` 文件配置（CF Pages 原生支持）：

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
```

---

## 最后说两句

博客目前部署在 [blog.fovoen.moe](https://blog.fovoen.moe)，欢迎来玩 ♡

整个折腾下来，踩的坑其实不算太多，最坑的就是那个软链接问题，排查 + 修复将近两个小时。现在回头看都是小问题，但当时对着构建日志发呆真的很崩溃 (ノ_<。) 写这篇就是希望后来的人能少走一点弯路。

如果你也想搭，记住这几条核心原则：

1. **WSL2 项目放 Linux 文件系统**，`~/projects/` 而不是 `/mnt/d/`
2. **主题配置只写差异项**，用 `_config.butterfly.yml` 覆盖默认值
3. **CF Pages 用 `cp -R` 替代软链接**，别抱侥幸心理
4. **用 `npm ci` 而不是 `npm install`**，锁版本保证构建稳定
5. **图片转 WebP**，体积和加载速度都会好看很多

希望能帮到同样在折腾博客的你 (๑•̀ㅂ•́)و✧～

---

**参考链接：**
- [Hexo 官方文档](https://hexo.io/zh-cn/docs/)
- [Butterfly 主题文档](https://butterfly.js.org/)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [霞鹜文楷字体](https://github.com/lxgw/LxgwWenKai)
- [nvm 安装文档](https://github.com/nvm-sh/nvm)
- [Colour Contrast Checker](https://colourcontrast.cc/)
