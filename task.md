# 从0到1做实用好玩的个人博客 — 项目任务规划

## 项目概述

- **项目名称**: 从0到1做实用好玩的个人博客
- **博客站点名**: HapLotes405's Wiki
- **技术栈**: React + Next.js + TypeScript + CSS（前端）, Node.js + TypeScript（后端）, Docker 部署
- **开发策略**: 前端优先（Phase 1-3 已完成），后端 Node.js + TypeScript（Phase 4 已完成），Docker 容器化与部署（Phase 5 后续）

---

## Phase 1: 项目初始化与前端架构搭建 ✅

### 1.1 项目脚手架
- [x] 使用 `create-next-app` 初始化 Next.js + TypeScript 项目
- [x] 配置项目目录结构（components, styles, services, types, data）
- [x] 配置 ESLint（create-next-app 自带）
- [x] 创建全局 CSS 变量和基础样式

### 1.2 布局与导航
- [x] 创建 Layout 组件（root layout 集成 Header + Footer）
- [x] 创建 Header 组件（Logo、导航链接、登录按钮）
- [x] 创建 Footer 组件
- [x] 实现响应式导航（移动端汉堡菜单）

### 1.3 主题与样式系统
- [x] 设计色彩系统（CSS 变量：primary, secondary, accent, bg, text 等）
- [x] 设计排版系统（字体、字号、行高）
- [x] 通用组件样式规范（按钮、卡片、输入框等）

---

## Phase 2: 核心页面开发（静态/模拟数据） ✅

### 2.1 首页 — 个人主页
- [x] 个人介绍区域（头像、姓名、简介、社交链接）— `HeroSection`
- [x] 个人经历时间线（教育、工作经验）— `Timeline`
- [x] 兴趣爱好展示区 — `InterestsSection`
- [x] 最新博文列表（预览）— `BlogCard` 组件

### 2.2 博客列表页
- [x] 博客卡片组件（标题、摘要、日期、标签、阅读量）
- [x] 分类/标签筛选
- [x] 响应式网格布局

### 2.3 博客详情页
- [x] Markdown 内容渲染（自定义解析器）
- [x] 代码块展示
- [x] 评论区 UI（发表、回复、点赞）
- [x] 点赞 / 收藏按钮 UI（带交互状态切换）

### 2.4 Games 页面
- [x] Games 占位页面（留白，待后续完善）

### 2.5 登录 / 注册页面
- [x] 登录表单 UI + 前端验证
- [x] 注册表单 UI + 前端验证（含确认密码）

### 2.6 站内搜索
- [x] 搜索框组件（SearchBar）
- [x] 支持标题、摘要、正文、标签关键词搜索
- [x] 搜索结果下拉展示（含高亮、键盘导航）
- [x] 首页和博客列表页集成搜索

---

## Phase 3: 交互功能与状态管理 ✅

### 3.1 状态管理
- [x] 评论、点赞、收藏交互逻辑（本地状态模拟）
- [x] 标签筛选状态管理

### 3.2 API 服务层
- [x] 定义 API 接口类型（TypeScript interfaces）— `types/index.ts`
- [x] 创建 API 服务抽象层（auth, blog, comment, interaction, profile）
- [x] 当前使用 mock 数据（`data/mock.ts`）

### 3.3 评论系统前端
- [x] 评论输入框与发布按钮
- [x] 评论列表渲染
- [x] 回复评论功能
- [x] 评论点赞

### 3.4 博主认证与博客管理 ⭐
- [x] AuthContext 博主身份模拟（admin@hapLotes405.wiki / blog405admin）
- [x] 博客数据 localStorage 持久化存储
- [x] 博客编辑器（Markdown 编辑 + 实时预览双栏）
- [x] 新建博客页面（/blog/new）
- [x] 编辑已有博客（/blog/[slug]/edit）
- [x] 博客下载/导出为 .md 文件
- [x] 博主端 Header 显示「写文章」按钮和用户名
- [x] 博客详情页博主端显示「编辑」「删除」按钮
- [x] 登录页对接 AuthContext

---

## Phase 4: 后端开发 — Node.js + TypeScript ✅

### 4.1 后端项目初始化
- [x] 初始化 Node.js + TypeScript 项目（package.json, tsconfig.json）
- [x] 安装依赖（Express, TypeScript, sql.js, JWT, bcrypt, multer 等）
- [x] 配置目录结构（routes, middleware, config, db, types, utils）
- [x] 创建 .env 配置文件（JWT_SECRET, PORT, DB_PATH 等）
- [x] 配置开发脚本（dev, build, start）

### 4.2 数据库设计与实现
- [x] 设计数据库表结构（users, blogs, comments, likes, favorites, personal_info）
- [x] 使用 PostgreSQL + node-postgres (pg) — 生产级关系型数据库，JSONB 支持
- [x] 创建数据库迁移/初始化脚本
- [x] 实现数据库操作层（queryAll, queryOne, execute — 全异步）

### 4.3 用户认证系统
- [x] 用户注册 API（POST /api/auth/register）— 密码 bcrypt 加密
- [x] 用户登录 API（POST /api/auth/login）— JWT Token 签发
- [x] JWT 认证中间件（authMiddleware）+ 博主权限中间件（bloggerOnly）
- [x] 获取当前用户信息 API（GET /api/auth/me）
- [x] 博主初始账号自动创建（admin@hapLotes405.wiki / blog405admin）

### 4.4 博客 CRUD API
- [x] 获取博客列表 API（GET /api/posts）— 支持分页、标签筛选
- [x] 获取单篇博客 API（GET /api/posts/:slug）— 自动增加阅读量
- [x] 新建博客 API（POST /api/posts）— 需要博主权限
- [x] 更新博客 API（PUT /api/posts/:id）— 需要博主权限
- [x] 删除博客 API（DELETE /api/posts/:id）— 需要博主权限
- [x] 博客标签列表 API（GET /api/posts/tags）

### 4.5 评论系统 API
- [x] 获取博客评论列表 API（GET /api/posts/:slug/comments）
- [x] 创建评论 API（POST /api/posts/:slug/comments）— 需要登录
- [x] 删除评论 API（DELETE /api/comments/:id）— 需要博主或评论者权限
- [x] 回复评论 API（支持 parentId 参数嵌套回复）

### 4.6 互动系统 API（点赞 & 收藏）
- [x] 点赞/取消点赞（toggle）API（POST/DELETE /api/posts/:slug/like）— 需要登录
- [x] 收藏/取消收藏（toggle）API（POST/DELETE /api/posts/:slug/favorite）— 需要登录
- [x] 获取用户收藏列表 API（GET /api/user/favorites）— 需要登录
- [x] 获取用户点赞列表 API（GET /api/user/likes）— 需要登录

### 4.7 个人资料 API
- [x] 获取博主公开资料 API（GET /api/profile）
- [x] 更新个人资料 API（PUT /api/profile）— 需要博主权限

### 4.8 文件上传
- [x] 图片上传 API（POST /api/upload）— 需要博主权限，支持 jpg/png/gif/webp/svg
- [x] 静态文件服务（通过 Express 托管 /uploads 目录）

### 4.9 前端 API 对接
- [x] 更新前端 API 服务层，对接真实后端接口（含 token 管理、上传 API）
- [x] 更新 AuthContext 对接真实 JWT 认证（login/register/logout + token 自动验证）
- [x] 更新评论系统对接后端 API（CommentSection 组件完整重写）
- [x] 更新博客管理（新建/编辑/删除）对接后端 API（BlogEditor 完整重写）
- [x] 更新点赞/收藏功能对接后端 API（blog detail page）
- [x] 更新博客列表/详情页对接后端 API（Home + BlogContent + BlogDetail）
- [x] 更新登录/注册页对接真实认证 API
- [x] 移除 SearchBar 对 mock 数据的依赖
- [x] 前端 TypeScript 编译通过 + Next.js 生产构建成功

### 4.10 后端验证
- [x] 后端全量 API 测试通过（health, auth, blog CRUD, comments, likes, favorites）
- [x] 前后端联调验证成功（登录 → 创建文章 → 查看列表 → 评论 → 点赞收藏）

---

## Phase 5: Docker 容器化与部署 ✅ 完成（2026-06-09）

### 5.1 Docker 配置
- [x] 前端 Dockerfile — `frontend/Dockerfile`（多阶段构建，Next.js standalone 输出）
- [x] 后端 Dockerfile — `backend/Dockerfile`（多阶段构建，tsc → Alpine 生产镜像）
- [x] docker-compose.yml — 3 服务编排（db + backend + frontend，含健康检查 + 数据卷）
- [x] docker-compose.prod.yml — 生产环境 compose（从 GHCR 拉预构建镜像）
- [x] `.env.docker` — Docker 环境变量模板（密码改为 `changeme` 占位符，公开安全）
- [x] `.dockerignore` — 排除 node_modules / .next / dist / Janus 等
- [x] `frontend/.env.production` — 前端生产环境变量
- [x] 代码适配修复：
  - [x] `frontend/next.config.ts` — 启用 `output: 'standalone'`
  - [x] `frontend/src/components/blog/editor/BlogEditor.tsx:198` — 修复硬编码 localhost:8000
  - [x] `backend/src/index.ts:29` — CORS origin 改为从 `CORS_ORIGIN` 环境变量读取
- [x] Nginx 反向代理（nginx/nginx.conf + nginx/conf.d/default.conf + SSL 模板）
- [x] 后端健康检查（healthcheck: Node.js HTTP GET /api/health）
- [x] 所有容器日志轮转（json-file 10MB × 3）
- [x] 数据库自动备份服务（每日凌晨3点，保留7天）+ backup/ 脚本
- [x] Docker 镜像优化（单次 npm install + prune，前端 250MB→225MB）

### 5.2 环境安装
- [x] Docker Desktop v29.5.3 安装
- [x] WSL 2 v2.7.3 安装
- [x] Docker Desktop 首次启动设置（完成）
- [x] Docker 镜像加速配置（daemon.json registry-mirrors）

### 5.3 构建与验证 ✅ 通过
- [x] `docker compose build` — 前后端镜像构建成功
- [x] `docker compose up -d` — 全部服务启动（db:healthy + backend:8000 + frontend:3000）
- [x] 后端健康检查 `GET /api/health` → `{"status":"ok"}`
- [x] 前端页面可访问验证 → HTTP 200
- [x] 完整功能联调（注册 → 登录 → 发文章 → 评论）

### 5.4 CI/CD ✅ 已配置
- [x] `.github/workflows/ci.yml` — GitHub Actions 流水线
  - Verify: 后端 tsc + 前端 next build（PR + master）
  - Docker: 构建镜像并推送到 GHCR（仅 master）
  - 镜像: `ghcr.io/haplotes405/myblog-backend` + `ghcr.io/haplotes405/myblog-frontend`
- [x] `scripts/deploy.sh` / `stop.sh` / `reset.sh` — 运维脚本

### 5.5 安全加固 ✅ 2026-06-09
- [x] `.env.docker` 密码改为占位符（`changeme`），不再含真实密码
- [x] `.env` 使用 `openssl rand -hex` 生成随机密码
- [x] Docker 容器 + 数据库已重建，使用全新密码
- [x] frontend 子模块修复：移除嵌套 `.git`，直接归属主仓库

### 5.6 服务器部署（下一步）
- [ ] 阿里云 ACR 开通（容器镜像仓库）
- [ ] 阿里云 ECS 购买/配置
- [ ] CI/CD 对接 ACR + ECS 自动部署
- [ ] 域名 + HTTPS 配置

---

## Phase 6: 进阶功能（支线）

### 6.1 缓存与 CDN
- [ ] Redis 缓存层
- [ ] CDN 静态资源加速

### 6.2 数据埋点与统计
- [ ] 页面访问统计（PV/UV）
- [ ] 文章阅读统计
- [ ] 用户行为数据分析

### 6.3 用户数据分析与推荐
- [ ] 用户行为分析
- [ ] 个性化文章推荐

### 6.4 搜索增强
- [ ] 关键词搜索（已有基础）
- [ ] 语义搜索（向量数据库 / 嵌入）

### 6.5 MCP 暴露
- [ ] 全功能 MCP Server 暴露
- [ ] Claude Code 接入管理博客（Agent 管理博客）

### 6.6 AI 自动化
- [ ] 每日新闻/大会摘要
- [ ] GitHub Trending 自动解读
- [ ] AI 技术论文 Digest

### 6.7 小游戏
- [ ] 带排名的小游戏

---

## 当前进度

- **Phase 1**: ✅ 完成（2026-05-29）
- **Phase 2**: ✅ 完成（2026-05-29）
- **Phase 3**: ✅ 完成（2026-05-29）
- **Phase 4**: ✅ 完成（2026-06-01）— Node.js + TypeScript 后端开发 + 前后端对接
- **Phase 5**: ✅ 完成（2026-06-09）— Docker 容器化部署 + CI/CD 流水线 + 安全加固
- **Phase 6**: ⏳ 待开始 — 进阶功能

---

## 备份 & 数据库信息
- **数据库用户密码表结构**
  - 表名：users
  - 字段：username, email, nickname, password_hash, role, bio, avatar
  - 密码加密：bcrypt

## Docker 新增文件清单（2026-06-09）

```
/
├── docker-compose.yml           # 本地开发 compose（build 本地镜像）
├── docker-compose.prod.yml      # 生产 compose（从 GHCR 拉预构建镜像）
├── .dockerignore                # 排除 node_modules / .next / dist / Janus 等
├── .env.docker                  # 环境变量模板（密码为 changeme 占位符，公开安全）
├── .env                         # 实际 .env（gitignored，含真实密码）
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions 流水线
├── backend/
│   └── Dockerfile               # 后端多阶段构建（tsc → Alpine）
├── frontend/
│   ├── Dockerfile               # 前端多阶段构建（Next.js standalone）
│   └── .env.production          # NEXT_PUBLIC_API_URL
├── nginx/
│   ├── nginx.conf                # 主配置（gzip、安全头、upstream）
│   ├── conf.d/
│   │   ├── default.conf          # HTTP 站点（/api→backend, /→frontend）
│   │   └── ssl.conf.example     # HTTPS 模板（TLS 1.2/1.3）
│   └── ssl/
│       └── generate-certs.sh     # 自签名证书生成
├── backup/
│   ├── backup.sh                 # 容器内备份
│   ├── restore.sh                # 容器内恢复
│   └── docker-backup.sh          # 宿主机一键备份
└── scripts/
    ├── deploy.sh                # 一键构建部署
    ├── stop.sh                  # 停止服务（保留数据）
    └── reset.sh                 # 停止并删除数据卷
```

### Docker 部署速查

```bash
# 首次部署
cp .env.docker .env              # ⚠️ 编辑 .env 修改密码为随机值
docker compose up -d              # 启动全部服务
docker compose exec backend node dist/db/seed.js  # 初始化博主账号

# 日常操作
docker compose up -d              # 启动
docker compose down               # 停止（保留数据）
docker compose down -v            # 停止并清除数据卷（重新开始）
docker compose build --no-cache   # 强制重建镜像
docker compose logs -f            # 查看日志

# 生产部署（从 GHCR 拉取预构建镜像）
cp .env.docker .env && vim .env
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose exec backend node dist/db/seed.js
```

### CI/CD 速查

```
Push/PR to master
  ├─ Verify: backend tsc + frontend build
  └─ Docker: build → push ghcr.io/haplotes405/myblog-*

镜像:
  ghcr.io/haplotes405/myblog-backend:latest
  ghcr.io/haplotes405/myblog-frontend:latest
```

### 下一步：阿里云部署

1. 开通阿里云 ACR（容器镜像仓库）
2. 开通/准备 ECS 服务器
3. 在 GitHub Secrets 配置 ACR 凭据 + ECS SSH Key
4. 更新 CI/CD 流水线：推送到 ACR + 自动部署到 ECS

---

## 项目结构

```
/
├── frontend/                   # Next.js 前端项目
│   ├── src/
│   │   ├── app/                # Next.js App Router 页面
│   │   │   ├── layout.tsx      # 根布局（Header + Footer）
│   │   │   ├── page.tsx        # 首页（已对接后端 API）
│   │   │   ├── globals.css     # 全局样式 + CSS 变量
│   │   │   ├── blog/
│   │   │   │   ├── page.tsx    # 博客列表页
│   │   │   │   ├── BlogContent.tsx # 博客列表客户端组件（已对接后端 API）
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx    # 新建博客编辑器
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx    # 博客详情页（已对接后端 API）
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx # 编辑博客（已对接后端 API）
│   │   │   ├── games/
│   │   │   │   └── page.tsx    # Games 占位页面
│   │   │   ├── login/
│   │   │   │   └── page.tsx    # 登录页（已对接后端 JWT）
│   │   │   └── register/
│   │   │       └── page.tsx    # 注册页（已对接后端 API）
│   │   ├── components/
│   │   │   ├── layout/         # Header, Footer
│   │   │   ├── blog/           # BlogCard, CommentSection（已对接后端）, SearchBar
│   │   │   │   └── editor/     # BlogEditor（已对接后端 API + 图片上传）
│   │   │   └── home/           # HeroSection, Timeline, InterestsSection
│   │   ├── context/
│   │   │   ├── AuthContext.tsx  # JWT 认证 Context（已对接后端）
│   │   │   └── Providers.tsx    # 客户端 Providers 包装
│   │   ├── store/
│   │   │   └── blogStore.ts    # [遗留] localStorage 博客存储（前端现已直连后端 API）
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript 类型定义（新增 role 字段）
│   │   ├── services/
│   │   │   └── api.ts          # API 服务层（完整对接后端，含 token 管理/上传）
│   │   └── data/
│   │       └── mock.ts         # [遗留] 模拟数据
│   ├── public/                 # 静态资源
│   ├── package.json
│   └── tsconfig.json
│
└── backend/                    # Node.js + TypeScript 后端项目（Phase 4 完成）
    ├── src/
    │   ├── index.ts            # 入口文件（Express 服务器）
    │   ├── config/
    │   │   └── index.ts        # 配置（环境变量加载）
    │   ├── db/
    │   │   ├── index.ts        # sql.js WASM 数据库初始化 + 操作封装
    │   │   └── migrate.ts      # 数据库迁移/建表脚本
    │   ├── middleware/
    │   │   ├── auth.ts         # JWT 认证 + 博主权限中间件
    │   │   └── errorHandler.ts # 全局错误处理
    │   ├── routes/
    │   │   ├── auth.ts         # 认证路由（/api/auth/*）
    │   │   ├── blog.ts         # 博客路由（/api/posts/*）
    │   │   ├── comment.ts      # 评论路由（/api/posts/:slug/comments, /api/comments/:id）
    │   │   ├── interaction.ts  # 互动路由（like, favorite, user lists）
    │   │   ├── profile.ts      # 个人资料路由（/api/profile）
    │   │   └── upload.ts       # 文件上传路由（/api/upload）
    │   ├── types/
    │   │   └── index.ts        # 共享类型 + 数据库行类型
    │   └── utils/
    │       └── index.ts        # 数据转换工具函数
    ├── uploads/                # 上传文件目录
    ├── data/                   # SQLite 数据库文件（自动生成）
    ├── package.json
    ├── tsconfig.json
    ├── .env
    └── .gitignore
```

---

*最后更新: 2026-06-09 —— Phase 5 Docker 部署 + CI/CD ✅ 完成。安全加固 ✅。下一步：阿里云 ACR + ECS 部署*

---

## 环境变量 & 账号

| 配置项 | 值 | 安全 |
|--------|-----|------|
| DB_USER | postgres | 公开 |
| DB_PASSWORD | (随机 SHA256) | `.env` 保护 |
| JWT_SECRET | (随机 SHA256) | `.env` 保护 |
| BLOGGER_EMAIL | 3250104093@zju.edu.cn | 公开 |
| BLOGGER_PASSWORD | syx11561156 | `.env` 保护 |
| CORS_ORIGIN | http://localhost | 公开 |

### Docker 部署速查（更新）

```bash
# 首次部署
cp .env.docker .env              # ⚠️ 编辑 .env 修改密码为随机值
docker compose up -d              # 启动全部服务（含 nginx）
docker compose exec backend node dist/db/seed.js  # 初始化博主账号

# 日常操作
docker compose up -d              # 启动
docker compose down               # 停止（保留数据）
docker compose logs -f backend    # 查看后端日志
sh backup/docker-backup.sh        # 手动备份数据库

# 生产部署（从 GHCR 拉取预构建镜像）
cp .env.docker .env && vim .env
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose exec backend node dist/db/seed.js
```
