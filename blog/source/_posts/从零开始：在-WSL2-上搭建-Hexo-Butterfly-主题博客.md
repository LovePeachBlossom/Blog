---
title: 自主搭建博客 | Hexo + Butterfly 部署到 Cloudflare
date: 2026-02-18 19:31:55
updated: 2026-02-19 03:30:00
tags: [博客搭建, Hexo, Butterfly, Cloudflare]
categories: 博客日常
cover: /img/bg.jpg
---

## 为什么要搭博客

最近在进一步强化对AI的了解和使用，Notion 里记了不少笔记，但总觉得缺点什么。想来想去，还是想有个自己的小窝，把学习过程记录下来，顺便练练手。

要搭建一个博客，首先当然是要先选择一个合适的框架，我通过询问Claude和查阅资料，最终锁定了 Hexo 和 Hugo 两个选项。了解到 Hugo 是 Go 语言编写的，其性能和便携性优势很大，而 Hexo 是个老牌的静态博客生成器，国内社区活跃，插件丰富，有很多精美的主题，并且对新手很友好，考虑到个人搭建，就决定搭建一个主题精美的框架，选择了 Hexo 。

最后在不断的挑选下，选择了 Butterfly 的主题，主要是看中 Butterfly 的颜值，卡片式设计很适合打造二次元风格的博客。部署到 Cloudflare Pages 也完全免费，还自带 CDN 加速和 HTTPS，简直完美。

<!-- more -->

## 本地搭建调试

我使用的是 Windows + WSL2 环境。首先要确认一下有没有装 Node.js，终端里跑一下 `node --version` 看看。没有的话用 nvm 装一个就行。

**重要提示**：项目必须放在 Linux 文件系统里（比如 `~/projects/`），别放 Windows 盘符下（`/mnt/d/`）。我一开始放错了位置，终端一直提示性能警告，后来搬到 `~/projects/` 速度快了好多。

```bash
mkdir -p ~/projects && cd ~/projects
npx hexo init my-blog && cd my-blog
```

等它跑完就有一个基础的 Hexo 博客框架了。接下来装 Butterfly 主题：

```bash
git clone -b master https://github.com/jerryc127/hexo-theme-butterfly.git themes/butterfly
npm install hexo-renderer-pug hexo-renderer-stylus --save
```

根据文档编辑博客根目录的 `_config.yml`，把 `theme` 改成 `butterfly`，然后本地预览：

```bash
npx hexo clean && npx hexo generate && npx hexo server
```

通常默认端口是 4000
浏览器打开 `http://localhost:4000`，看到 Butterfly 主题就成功了。

> 但是使用 WSL2 时要注意：如果 `localhost:4000` 打不开，用 `hostname -I` 查看 WSL2 的 IP 地址，然后用 `http://IP:4000` 访问。启动时加 `-i 0.0.0.0` 参数监听所有网卡。

## 推送到 GitHub

Cloudflare Pages 需要从 Git 仓库拉代码。就我来说，我是新建了一个My_Blog的新仓库，然后把博客和主题远程上传到这个仓库：

```
My_Blog/
├── blog/           # Hexo 博客
└── hexo-theme-butterfly/ # Butterfly 主题
```

在 GitHub 创建新仓库后：

```bash
cd ~/projects/My_Blog
git init && git branch -M main
git add . && git commit -m "Initial commit"
git remote add origin git@github.com:你的用户名/My_Blog.git
git push -u origin main
```

**注意**：本地开发时我使用的是软链接引用主题（`themes/butterfly -> ../../hexo-theme-butterfly`），但软链接不要提交到 Git，CF 构建时用 `cp -r` 复制主题目录。

## 部署到 Cloudflare Pages

去 [Cloudflare](https://dash.cloudflare.com/) 注册账号，进入 Workers 和 Pages → 创建 → 连接到 Git，选择仓库。

**构建配置**：
- 框架预设：`None`
- 构建命令：`cp -r hexo-theme-butterfly blog/themes/butterfly && cd blog && npm install && npx hexo clean && npx hexo generate`
- 构建输出目录：`blog/public`
- 环境变量：`NODE_VERSION` = `22`// 选择 Node.js 版本，建议用最新的稳定版本

构建命令的关键是 `cp -r` 那一步——把主题复制到博客的 `themes/` 目录下，因为 Git 里没有软链接。

**踩过的坑**：
- 软链接在 CF 构建环境会产生循环引用（`ELOOP` 错误），必须用 `cp -r` 代替
- 主题依赖的 `moment-timezone` 需要在博客的 `package.json` 里显式声明，否则构建报 `Cannot find module`

构建成功后会得到 `XXX.pages.dev` 域名，(XXX表示部署是的命名)。我使用的是我的是自定义的域名 [blog.wf0904.cn](https://blog.wf0904.cn)。以后每次 `git push` 都会自动部署。

## 主题定制

Butterfly 的配置推荐在博客根目录创建 `_config.butterfly.yml`，只写你改过的配置项，不要复制整个默认配置。如果想要二次元风格的，可以尝试一下的配置:

**字体**：使用霞鹜文楷（LXGW WenKai），手写风格更有动漫感：
```yaml
font:
  font_family: "'LXGW WenKai', 'Noto Sans SC', sans-serif"
  code_font_family: "'Fira Code', Consolas, monospace"

blog_title_font:
  font_link: https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.1.0/style.css
```

**粉色主题色**：整套粉色系配色，从主色到滚动条统一风格：
```yaml
theme_color:
  enable: true
  main: "#FF69B4"
  link_color: "#FF69B4"
  scrollbar_color: "#FF69B4"
```

**彩色标签**：标签页用 6 种颜色循环显示，创建 `source/css/custom-font-tags.css` 并在配置中注入。

**性能优化**：
- 背景图压缩到 400KB 以下（原图 2.1MB）
- 开启图片懒加载和链接预加载
- 用 `cleanup.js` 脚本自动删除未使用的生成文件（algolia.js、tw_cn.js）
- Sitemap + 结构化数据提升 SEO

## 写在最后

博客搭建完成，已经成功部署到 [blog.wf0904.cn](https://blog.wf0904.cn)，目前已实现：

- 霞鹜文楷 + Fira Code 字体
- 粉色主题色 + 彩色标签
- 全站背景图 + 渐变背景
- 图片懒加载 + 链接预加载
- 本地搜索 + 字数统计
- Sitemap + 结构化数据
- Git push 自动部署

如果你也想搭建博客，记住几个关键点：
1. WSL2 项目放 Linux 文件系统，别放 `/mnt/` 下
2. `_config.butterfly.yml` 只写改过的配置，别复制整个默认文件
3. CF Pages 构建用 `cp -r` 复制主题，别用软链接

---

**参考链接：**
- [Hexo 官方文档](https://hexo.io/zh-cn/docs/)
- [Butterfly 主题文档](https://butterfly.js.org/)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
