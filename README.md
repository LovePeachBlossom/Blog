# Love Peach Blossom

个人博客，记录 Java 学习笔记，基于 Hexo + Butterfly 主题搭建，部署在 Cloudflare Pages。

**在线访问**：[blog.wf0904.cn](https://blog.wf0904.cn)

## 项目结构

```
My_Blog/
├── blog/                     # Hexo 博客
│   ├── source/_posts/        # 文章（Markdown）
│   ├── source/css/           # 自定义样式
│   ├── source/img/           # 图片资源
│   ├── scripts/              # Hexo 插件脚本
│   ├── _config.yml           # Hexo 配置
│   └── _config.butterfly.yml # 主题配置（仅差异项）
└── hexo-theme-butterfly/     # Butterfly 主题 v5.5.4
```

## 本地开发

需要 Node.js 18+，推荐在 Linux / WSL2 环境下开发。

```bash
# 安装依赖
cd blog && npm install

# 创建主题软链接（首次）
ln -s ../../hexo-theme-butterfly themes/butterfly

# 预览
npx hexo clean && npx hexo s
```

## 部署

推送到 `main` 分支后 Cloudflare Pages 自动构建。

构建命令：
```
cp -r hexo-theme-butterfly blog/themes/butterfly && cd blog && npm install && npx hexo clean && npx hexo generate
```

输出目录：`blog/public`

## 主题特性

- 粉色系二次元配色
- 霞鹜文楷 + Fira Code 字体
- 全站背景图 + 渐变背景（亮/暗色适配）
- 彩色标签（6色循环）
- 本地搜索、字数统计、图片懒加载
- Sitemap + 结构化数据

## License

博客内容版权归作者所有，主题遵循 [Butterfly 原始协议](hexo-theme-butterfly/LICENSE)。
